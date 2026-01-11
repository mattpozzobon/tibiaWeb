import { IPlayer } from "interfaces/IPlayer";
import { IContainer, IItem } from "interfaces/IThing";
import ITile from "interfaces/ITile";
import Equipment from "../item/equipment";
import { ContainerAddPacket } from "../network/protocol";
import { getGameServer } from "../helper/appContext";
import { MailboxHandler } from "./mailbox-handler";
import DepotContainer from "../item/depot";
import { getContainerFromIContainer } from "../game/items/container-helpers";
import { IItemHolder } from "../game/items/item-location";
import { resolveHolder } from "../game/items/item-holder-resolver";

export class ItemMoveHandler {
  private static mailboxHandler: MailboxHandler = new MailboxHandler();

  private static isMovableItem(item: IItem): boolean {
    return item.isMoveable() && !item.hasUniqueId();
  }

  private static wholeCount(item: IItem): number {
    return item.isStackable() ? item.count : 1;
  }

  private static clampMoveCount(item: IItem, requested: number): number {
    const available = item.isStackable() ? item.count : 1;
    const clamped = Math.min(requested, available);
    return item.isStackable() ? clamped : Math.max(1, clamped);
  }

  private static isTileHolder(h: IItemHolder): boolean {
    return h.kind === "tile";
  }

  private static getAsTile(h: IItemHolder): ITile | null {
    if (!this.isTileHolder(h)) return null;
    return h.getUnderlying() as ITile;
  }

  /** Main entry */
  public static validateAndMoveItem(
    player: IPlayer,
    fromWhere: Equipment | IContainer | ITile | DepotContainer,
    fromIndex: number,
    toWhere: Equipment | IContainer | ITile | DepotContainer,
    toIndex: number,
    count: number
  ): void {
    if (!fromWhere || !toWhere) return;

    // Resolve holders early (everything after this should use holders)
    let from = resolveHolder(fromWhere as any);
    let to = resolveHolder(toWhere as any);

    // --- Tile-only distance/LoS rules ---
    const fromTile = this.getAsTile(from);
    const toTile = this.getAsTile(to);

    if (fromTile && !player.position.besides((fromTile as any).position)) {
      player.sendCancelMessage("You are not close enough.");
      return;
    }

    if (toTile && !player.position.inLineOfSight((toTile as any).position)) {
      player.sendCancelMessage("You cannot throw this item here.");
      return;
    }

    // Prevent moving into mail container (container-only rule)
    // Keep your legacy detection (id/uid) but access underlying container safely.
    if (to.kind === "container") {
      const c = to.getUnderlying() as any;
      const isMailContainer =
        c?.id === DepotContainer.MAIL_CONTAINER_ID ||
        (typeof c?.hasUniqueId === "function" && c.hasUniqueId() && c.uid === 0x10000000);

      if (isMailContainer) {
        player.sendCancelMessage("You cannot move items into the mail container.");
        return;
      }
    }

    const fromItem = from.getItem(fromIndex);
    if (!fromItem) return;

    const finalCount = this.clampMoveCount(fromItem, count);
    if (finalCount <= 0) return;

    if (!this.isMovableItem(fromItem)) {
      player.sendCancelMessage("You cannot move this item.");
      return;
    }

    // --- Tile destination rules: mailbox / destination lattice / trashholder / solids ---
    if (toTile) {
      const toTileAny = toTile as any;

      // mailbox send
      if (toTileAny.hasItems?.() && toTileAny.itemStack?.isMailbox?.() && this.mailboxHandler.canMailItem(fromItem)) {
        this.mailboxHandler.sendThing(fromWhere as any, toWhere as any, player, fromItem);
        return;
      }

      const toWhere2 = getGameServer().world.lattice.findDestination(player, toTile as any);
      if (!toWhere2) {
        player.sendCancelMessage("You cannot add this item here.");
        return;
      }

      // redirect "to" to lattice destination tile
      to = resolveHolder(toWhere2);

      const destTile = this.getAsTile(to) as any;
      if (destTile?.isTrashholder?.()) {
        getGameServer().world.sendMagicEffect(destTile.position, destTile.getTrashEffect());

        // remove from source (respect stack rules)
        const removalCount = fromItem.isStackable() ? finalCount : 1;
        fromItem.cleanup();
        from.removeItemAt(fromIndex, removalCount);
        return;
      }

      if (destTile?.hasItems?.() && destTile.itemStack?.isItemSolid?.()) {
        player.sendCancelMessage("You cannot add this item here.");
        return;
      }

      if (destTile?.isBlockSolid?.() && destTile?.isOccupiedAny?.()) {
        player.sendCancelMessage("You cannot add this item here.");
        return;
      }
    }

    // --- Capacity rule ---
    if (to.getTopParent() === player && !player.hasSufficientCapacity(fromItem)) {
      // preserve your depot logic
      const fromTop = from.getTopParent();
      const toTop = to.getTopParent();
      const fromIsDepot = (from.getUnderlying() as any)?.constructor?.name === "DepotContainer";

      if (fromIsDepot || toTop !== fromTop) {
        player.sendCancelMessage("Your capacity is insufficient to carry this item.");
        return;
      }
    }

    // --- Optional redirect: dropping onto a container-item should go inside it ---
    const redirected = this.redirectIntoTargetContainerIfNeeded(player, fromItem, to, toIndex);
    if (redirected) {
      to = redirected.to;
      toIndex = redirected.toIndex;
    }

    // No-op check after redirection
    if (from.getUnderlying() === to.getUnderlying() && fromIndex === toIndex) return;

    // Execute move (swap / equip replace / normal)
    const ok = this.moveItem(player, from, fromIndex, to, toIndex, finalCount);
    if (!ok) {
      // You currently don’t always send cancel on failure; up to you:
      // player.sendCancelMessage("You cannot move this item there.");
    }
  }

  /** Core move with universal holders */
  public static moveItem(
    player: IPlayer,
    from: IItemHolder,
    fromIndex: number,
    to: IItemHolder,
    toIndex: number,
    count: number
  ): boolean {
    if (count <= 0) return false;

    // Equip replace (special because equipment swaps have gameplay meaning)
    if (to.kind === "equipment") {
      const existing = to.getItem(toIndex);
      if (existing && fromIndex !== toIndex) {
        return this.executeEquipReplace(player, from, fromIndex, to, toIndex, count);
      }
    }

    // Container-to-container swap (your legacy behavior)
    const isContainerToContainer = from.kind === "container" && to.kind === "container";
    if (isContainerToContainer) {
      const existingItem = to.getItem(toIndex);
      const movedItem = from.getItem(fromIndex);

      if (
        existingItem &&
        movedItem &&
        existingItem.id !== movedItem.id &&
        this.isMovableItem(existingItem) &&
        this.isMovableItem(movedItem)
      ) {
        return this.executeSwap(player, from, fromIndex, to, toIndex, count, existingItem, movedItem);
      }
    }

    return this.executeStandardMove(player, from, fromIndex, to, toIndex, count);
  }

  private static redirectIntoTargetContainerIfNeeded(
    player: IPlayer,
    movingItem: IItem,
    to: IItemHolder,
    toIndex: number
  ): { to: IItemHolder; toIndex: number } | null {
    // only redirect when dropping onto an item that is itself a container
    if (to.kind === "tile") return null;

    const target = to.getItem(toIndex) as any;
    if (!target) return null;
    if (target === movingItem) return null;

    const targetIsContainerItem =
      (typeof target.isContainer === "function" && target.isContainer()) ||
      target?.constructor?.name === "Container";

    if (!targetIsContainerItem) return null;

    // prevent container-in-itself recursion
    if (typeof target.__includesSelf === "function" && target.__includesSelf(movingItem)) return null;

    if (typeof (movingItem as any).isContainer === "function" && (movingItem as any).isContainer()) {
      const mi: any = movingItem as any;
      if (typeof mi.__includesSelf === "function" && mi.__includesSelf(target)) return null;
    }

    const innerContainer = target as IContainer;
    const innerIndex = this.findFirstValidIndexInContainer(player, innerContainer, movingItem);
    if (innerIndex === null) return null;

    return { to: resolveHolder(innerContainer as any), toIndex: innerIndex };
  }

  private static findFirstValidIndexInContainer(player: IPlayer, container: IContainer, movingItem: IItem): number | null {
    const base: any = (container as any)?.container;
    if (!base || typeof base.isValidIndex !== "function") return null;

    // prefer merge if stackable
    if (movingItem.isStackable()) {
      for (let i = 0; base.isValidIndex(i); i++) {
        const t = container.peekIndex(i) as IItem | null;
        if (t && t.id === movingItem.id && t.isStackable()) {
          if (container.getMaximumAddCount(player, movingItem, i) > 0) return i;
        }
      }
    }

    for (let i = 0; base.isValidIndex(i); i++) {
      if (container.getMaximumAddCount(player, movingItem, i) > 0) return i;
    }

    return null;
  }

  private static executeSwap(
    player: IPlayer,
    from: IItemHolder,
    fromIndex: number,
    to: IItemHolder,
    toIndex: number,
    count: number,
    existingItem: IItem,
    movedItem: IItem
  ): boolean {
    // preserve your rule: cannot swap partial stacks
    if (movedItem.isStackable() && count !== movedItem.count) return false;
    if (from.kind !== "container" || to.kind !== "container") return false;

    // Keep your same-container GUID fast-path
    const fromC = from.getUnderlying() as IContainer;
    const toC = to.getUnderlying() as IContainer;

    const fromContainer = getContainerFromIContainer(fromC);
    const toContainer = getContainerFromIContainer(toC);
    const sameGuid = fromContainer.guid === toContainer.guid;

    if (sameGuid) {
      const base = fromContainer as any;

      const a = base.peekIndex(fromIndex);
      const b = base.peekIndex(toIndex);

      if (!a || !b) return false;
      if (a !== movedItem || b !== existingItem) return false;

      const tempA = base.slots[fromIndex];
      const tempB = base.slots[toIndex];

      base.__setItem(null, fromIndex);
      base.__setItem(null, toIndex);

      const canPlaceBAtFromIndex = fromC.getMaximumAddCount(player, b, fromIndex) > 0;
      const canPlaceAAtToIndex = fromC.getMaximumAddCount(player, a, toIndex) > 0;

      if (!canPlaceBAtFromIndex || !canPlaceAAtToIndex) {
        base.__setItem(tempA, fromIndex);
        base.__setItem(tempB, toIndex);
        return false;
      }

      base.__setItem(b, fromIndex);
      base.__setItem(a, toIndex);

      base.__informSpectators(new ContainerAddPacket(fromContainer.guid, fromIndex, b));
      base.__informSpectators(new ContainerAddPacket(fromContainer.guid, toIndex, a));

      a.setParent(fromC);
      b.setParent(fromC);

      a.emit("move", player, toC, a);
      b.emit("move", player, fromC, b);

      return true;
    }

    const movedRemoveCount = movedItem.isStackable() ? count : 1;
    const existingRemoveCount = this.wholeCount(existingItem);

    const removedMoved = from.removeItemAt(fromIndex, movedRemoveCount);
    const removedSwapped = to.removeItemAt(toIndex, existingRemoveCount);

    if (!removedMoved || !removedSwapped) {
      if (removedMoved) from.insertItemAt(fromIndex, removedMoved);
      if (removedSwapped) to.insertItemAt(toIndex, removedSwapped);
      return false;
    }

    const canPlaceMovedAtDest = to.getMaximumAddCount(player, removedMoved, toIndex) > 0;
    const canPlaceSwappedAtSource = from.getMaximumAddCount(player, removedSwapped, fromIndex) > 0;

    if (!canPlaceMovedAtDest || !canPlaceSwappedAtSource) {
      from.insertItemAt(fromIndex, removedMoved);
      to.insertItemAt(toIndex, removedSwapped);
      return false;
    }

    from.insertItemAt(fromIndex, removedSwapped);
    to.insertItemAt(toIndex, removedMoved);

    removedMoved.emit("move", player, toC, removedMoved);
    removedSwapped.emit("move", player, fromC, removedSwapped);

    return true;
  }

  private static executeEquipReplace(
    player: IPlayer,
    from: IItemHolder,
    fromIndex: number,
    to: IItemHolder,
    toIndex: number,
    count: number
  ): boolean {
    if (to.kind !== "equipment") return false;

    const movedItem = from.getItem(fromIndex);
    const equippedItem = to.getItem(toIndex);

    if (!movedItem || !equippedItem) return false;
    if (!this.isMovableItem(movedItem) || !this.isMovableItem(equippedItem)) return false;
    if (movedItem.isStackable() && count !== movedItem.count) return false;

    const movedRemovalCount = movedItem.isStackable() ? count : 1;
    const equippedRemovalCount = this.wholeCount(equippedItem);

    const removedEquipped = to.removeItemAt(toIndex, equippedRemovalCount);
    if (!removedEquipped) return false;

    const canPlaceMovedInEquip = to.getMaximumAddCount(player, movedItem, toIndex) > 0;
    if (!canPlaceMovedInEquip) {
      to.insertItemAt(toIndex, removedEquipped);
      return false;
    }

    const removedMoved = from.removeItemAt(fromIndex, movedRemovalCount);
    if (!removedMoved) {
      to.insertItemAt(toIndex, removedEquipped);
      return false;
    }

    // return equipped to source
    const canReturnEquippedToSource = from.getMaximumAddCount(player, removedEquipped, fromIndex) > 0;
    if (!canReturnEquippedToSource) {
      from.insertItemAt(fromIndex, removedMoved);
      to.insertItemAt(toIndex, removedEquipped);
      return false;
    }

    to.insertItemAt(toIndex, removedMoved);
    from.insertItemAt(fromIndex, removedEquipped);

    // Tile "add" event semantics (keep your behavior)
    if (from.kind === "tile") {
      const t = from.getUnderlying() as any;
      const top = t.getTopItem?.();
      if (top) top.emit("add", player, removedEquipped);
    }

    removedMoved.emit("move", player, to.getUnderlying(), removedMoved);
    removedEquipped.emit("move", player, from.getUnderlying(), removedEquipped);

    return true;
  }

  private static executeStandardMove(
    player: IPlayer,
    from: IItemHolder,
    fromIndex: number,
    to: IItemHolder,
    toIndex: number,
    count: number
  ): boolean {
    if (count <= 0) return false;

    const itemAtSource = from.getItem(fromIndex);
    if (!itemAtSource) return false;

    // Validate destination
    const maxCount = to.getMaximumAddCount(player, itemAtSource, toIndex);
    if (maxCount <= 0) return false;

    const realCount = itemAtSource.isStackable() ? Math.min(count, maxCount) : 1;

    const removed = from.removeItemAt(fromIndex, realCount);
    if (!removed) return false;

    // DepotContainer redirect (legacy)
    let finalTo = to;
    let finalIndex = toIndex;

    const toUnderlying: any = to.getUnderlying() as any;
    if (toUnderlying?.constructor?.name === "DepotContainer") {
      const depotContainer = toUnderlying.getDepotContainer?.();
      if (depotContainer) {
        finalTo = resolveHolder(depotContainer);
        finalIndex = depotContainer.getNumberItems?.() ?? toIndex;
      }
    }

    // Capture tile top for "add" event semantics
    let existthing: any = null;
    if (finalTo.kind === "tile") {
      existthing = (finalTo.getUnderlying() as any).getTopItem?.() ?? null;
    }

    const ok = finalTo.insertItemAt(finalIndex, removed);
    if (!ok) {
      // rollback
      from.insertItemAt(fromIndex, removed);
      return false;
    }

    // Tile "add" semantics
    if (finalTo.kind === "tile") {
      const t: any = finalTo.getUnderlying();
      if (existthing === null) t.emit?.("add", player, removed);
      else existthing.emit?.("add", player, removed);
    }

    // Container adjacency after parent set
    if ((removed as any)?.constructor?.name === "Container") {
      const fromParent = from.getTopParent();
      const toParent = finalTo.getTopParent();
      if (fromParent !== toParent) {
        (removed as any as IContainer).checkPlayersAdjacency?.();
      }
    }

    removed.emit("move", player, finalTo.getUnderlying(), removed);
    return true;
  }
}
