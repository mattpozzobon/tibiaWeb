import { IPlayer } from "interfaces/IPlayer";
import { IContainer, IItem, IThing } from "interfaces/IThing";
import ITile from "interfaces/ITile";
import Equipment from "../item/equipment";
import Tile from "../thing/tile";
import { ContainerAddPacket } from "../network/protocol";
import { getGameServer } from "../helper/appContext";
import { MailboxHandler } from "./mailbox-handler";
import ItemStack from "../item/item-stack";
import DepotContainer from "../item/depot";

export class ItemMoveHandler {
  private static mailboxHandler: MailboxHandler = new MailboxHandler();

  private static isEquipment(where: any): where is Equipment { return where instanceof Equipment || where?.constructor?.name === "Equipment"; }
  private static isContainer(where: any): where is IContainer { return where?.constructor?.name === "Container"; }
  private static isTile(where: any): where is Tile { return where instanceof Tile || where?.constructor?.name === "Tile"; }

  private static getIndexForRead(where: Equipment | IContainer | ITile, index: number): number { return where instanceof Tile ? ItemStack.TOP_INDEX : index; }
  private static getIndexForWrite(where: Equipment | IContainer | ITile, index: number): number { return where instanceof Tile ? ItemStack.TOP_INDEX : index; }

  private static isMovableItem(item: IItem): boolean { return item.isMoveable() && !item.hasUniqueId(); }
  private static getWholeItemCount(item: IItem): number { return item.isStackable() ? item.count : 1; }

  private static clampMoveCount(where: Equipment | IContainer | ITile, item: IItem, requested: number): number {
    const available = item.getCount() > 0 ? item.getCount() : item.isStackable() ? item.count : 1;
    const clampedToSource = where instanceof Tile ? Math.min(requested, available) : requested;
    return item.isStackable() ? clampedToSource : Math.max(1, clampedToSource);
  }

  private static getRemovalCount(fromWhere: Equipment | IContainer | ITile, toWhere: Equipment | IContainer | ITile, itemAtSource: IItem | null, count: number): number {
    const isTileToTile = fromWhere instanceof Tile && toWhere instanceof Tile && fromWhere !== toWhere;
    if (isTileToTile) return itemAtSource && itemAtSource.isStackable() ? count : 1;
    return itemAtSource && !itemAtSource.isStackable() ? 1 : count;
  }

  public static validateAndMoveItem(player: IPlayer, fromWhere: Equipment | IContainer | ITile, fromIndex: number, toWhere: Equipment | IContainer | ITile, toIndex: number, count: number): void {
    if (!fromWhere || !toWhere) return;

    if (fromWhere instanceof Tile && !player.position.besides(fromWhere.position)) { player.sendCancelMessage("You are not close enough."); return; }
    if (toWhere instanceof Tile && !player.position.inLineOfSight(toWhere.position)) { player.sendCancelMessage("You cannot throw this item here."); return; }

    // Check if trying to move items into the Mail container (prevented)
    if (this.isContainer(toWhere)) {
      const container = toWhere as IContainer;
      const isMailContainer = container.id === DepotContainer.MAIL_CONTAINER_ID || (container.hasUniqueId && container.hasUniqueId() && container.uid === 0x10000000);
      if (isMailContainer) {
        player.sendCancelMessage("You cannot move items into the mail container.");
        return;
      }
    }

    const actualFromIndex = this.getIndexForRead(fromWhere, fromIndex);
    const fromItem = fromWhere.peekIndex(actualFromIndex) as IItem | null;
    if (!fromItem) return;

    const finalCount = this.clampMoveCount(fromWhere, fromItem, count);
    if (finalCount === 0) return;

    if (!this.isMovableItem(fromItem)) { player.sendCancelMessage("You cannot move this item."); return; }

    if (toWhere instanceof Tile) {
      if (toWhere.hasItems() && toWhere.itemStack!.isMailbox() && this.mailboxHandler.canMailItem(fromItem)) { this.mailboxHandler.sendThing(fromWhere, toWhere, player, fromItem); return; }

      const toWhere2 = getGameServer().world.lattice.findDestination(player, toWhere);
      if (!toWhere2) { player.sendCancelMessage("You cannot add this item here."); return; }

      if (toWhere2.isTrashholder()) {
        getGameServer().world.sendMagicEffect(toWhere2.position, toWhere2.getTrashEffect());
        fromItem.cleanup();
        const trashRemoveCount = this.getRemovalCount(fromWhere, toWhere, fromItem, finalCount);
        fromWhere.removeIndex(this.getIndexForWrite(fromWhere, fromIndex), trashRemoveCount);
        return;
      }

      if (toWhere2.hasItems() && toWhere2.itemStack.isItemSolid()) { player.sendCancelMessage("You cannot add this item here."); return; }
      if (toWhere2.isBlockSolid() && toWhere2.isOccupiedAny()) { player.sendCancelMessage("You cannot add this item here."); return; }
    }

    if (toWhere.getTopParent() === player && !player.hasSufficientCapacity(fromItem)) {
      if (fromWhere.constructor.name === "DepotContainer" || toWhere.getTopParent() !== fromWhere.getTopParent()) { player.sendCancelMessage("Your capacity is insufficient to carry this item."); return; }
    }

    let actualToIndex = this.getIndexForRead(toWhere, toIndex);

    const redirect = this.redirectIntoTargetContainerIfNeeded(player, fromItem, toWhere, actualToIndex);
    if (redirect) { toWhere = redirect.toWhere; actualToIndex = redirect.toIndex; }

    if (fromWhere === toWhere && actualFromIndex === actualToIndex) return;

    if (this.isEquipment(toWhere)) {
      const existingEquip = (toWhere as Equipment).peekIndex(actualToIndex) as IItem | null;
      if (existingEquip !== null && actualFromIndex !== actualToIndex) {
        const replaced = this.executeEquipReplace(player, fromWhere, actualFromIndex, toWhere as Equipment, actualToIndex, finalCount);
        if (replaced) return;
      }
    }

    const existingItem = toWhere.peekIndex(actualToIndex) as IItem | null;
    const isTileToTile = fromWhere instanceof Tile && toWhere instanceof Tile && fromWhere !== toWhere;

    if (this.shouldAttemptContainerSwap(fromWhere, toWhere, isTileToTile, actualFromIndex, actualToIndex, fromItem, existingItem)) {
      if (this.moveItem(player, fromWhere, actualFromIndex, toWhere, actualToIndex, finalCount)) return;
    }

    const maxCount = toWhere.getMaximumAddCount(player, fromItem, actualToIndex);
    if (maxCount === 0) { player.sendCancelMessage("You cannot add this item here."); return; }

    let realCount = Math.min(finalCount, maxCount);
    if (realCount === 0) return;

    if (isTileToTile) realCount = fromItem.isStackable() ? realCount : 1;

    this.moveItem(player, fromWhere, actualFromIndex, toWhere, actualToIndex, realCount);
  }

  public static moveItem(player: IPlayer, fromWhere: Equipment | IContainer | ITile, fromIndex: number, toWhere: Equipment | IContainer | ITile, toIndex: number, count: number): boolean {
    if (count === 0) return false;

    if (this.isEquipment(toWhere)) {
      const existing = (toWhere as Equipment).peekIndex(toIndex) as IItem | null;
      if (existing !== null && fromIndex !== toIndex) return this.executeEquipReplace(player, fromWhere, fromIndex, toWhere as Equipment, toIndex, count);
    }

    const isTileToTile = fromWhere instanceof Tile && toWhere instanceof Tile && fromWhere !== toWhere;

    if (!isTileToTile && this.isContainer(fromWhere) && this.isContainer(toWhere)) {
      const existingItem = toWhere.peekIndex(toIndex) as IItem | null;
      const movedItem = fromWhere.peekIndex(fromIndex) as IItem | null;

      if (
        existingItem !== null &&
        movedItem !== null &&
        existingItem.id !== movedItem.id &&
        this.isMovableItem(existingItem) &&
        this.isMovableItem(movedItem)
      ) {
        return this.executeSwap(player, fromWhere, fromIndex, toWhere, toIndex, count, existingItem, movedItem);
      }
    }

    return this.executeStandardMove(player, fromWhere, fromIndex, toWhere, toIndex, count);
  }

  private static shouldAttemptContainerSwap(fromWhere: Equipment | IContainer | ITile, toWhere: Equipment | IContainer | ITile, isTileToTile: boolean, fromIndex: number, toIndex: number, fromItem: IItem, existingItem: IItem | null): boolean {
    if (isTileToTile) return false;
    if (!this.isContainer(fromWhere) || !this.isContainer(toWhere)) return false;
    if (!existingItem) return false;
    if (existingItem.id === fromItem.id) return false;
    if (!this.isMovableItem(existingItem) || !this.isMovableItem(fromItem)) return false;

    const sameGuid = (fromWhere as IContainer).container.guid === (toWhere as IContainer).container.guid;
    if (sameGuid && fromIndex === toIndex) return false;

    return true;
  }

  private static redirectIntoTargetContainerIfNeeded(player: IPlayer, movingItem: IItem, toWhere: Equipment | IContainer | ITile, toIndex: number): { toWhere: IContainer; toIndex: number } | null {
    if (this.isTile(toWhere)) return null;

    const target = toWhere.peekIndex(toIndex) as any;
    if (!target) return null;
    if (movingItem === target) return null;

    const targetIsContainerItem =
      (typeof target.isContainer === "function" && target.isContainer()) ||
      target?.constructor?.name === "Container";

    if (!targetIsContainerItem) return null;

    if (typeof target.__includesSelf === "function" && target.__includesSelf(movingItem)) return null;

    if (typeof movingItem.isContainer === "function" && movingItem.isContainer()) {
      const mi: any = movingItem as any;
      if (typeof mi.__includesSelf === "function" && mi.__includesSelf(target)) return null;
    }

    const inner = target as unknown as IContainer;
    const innerIndex = this.findFirstValidIndexInContainer(player, inner, movingItem);
    if (innerIndex === null) return null;

    return { toWhere: inner, toIndex: innerIndex };
  }

  private static findFirstValidIndexInContainer(player: IPlayer, container: IContainer, movingItem: IItem): number | null {
    const base: any = container?.container;
    if (!base || typeof base.isValidIndex !== "function") return null;

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

  private static executeSwap(player: IPlayer, fromWhere: Equipment | IContainer | ITile, fromIndex: number, toWhere: Equipment | IContainer | ITile, toIndex: number, count: number, existingItem: IItem, movedItem: IItem): boolean {
    if (movedItem.isStackable() && count !== movedItem.count) return false;
    if (!this.isContainer(fromWhere) || !this.isContainer(toWhere)) return false;

    const fromC = fromWhere as IContainer;
    const toC = toWhere as IContainer;

    const sameGuid = fromC.container.guid === toC.container.guid;

    if (sameGuid) {
      const base = fromC.container as any;

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

      base.__informSpectators(new ContainerAddPacket(fromC.container.guid, fromIndex, b));
      base.__informSpectators(new ContainerAddPacket(fromC.container.guid, toIndex, a));

      a.setParent(fromC);
      b.setParent(fromC);

      a.emit("move", player, toWhere, a);
      b.emit("move", player, fromWhere, b);

      return true;
    }

    const movedRemoveCount = movedItem.isStackable() ? count : 1;
    const existingRemoveCount = this.getWholeItemCount(existingItem);

    const removedMovedItem = fromWhere.removeIndex(fromIndex, movedRemoveCount) as IItem | null;
    const removedSwappedItem = toWhere.removeIndex(toIndex, existingRemoveCount) as IItem | null;

    if (!removedMovedItem || !removedSwappedItem) {
      if (removedMovedItem) fromWhere.addThing(removedMovedItem, fromIndex);
      if (removedSwappedItem) toWhere.addThing(removedSwappedItem, toIndex);
      return false;
    }

    const canPlaceMovedAtDest = toWhere.getMaximumAddCount(player, removedMovedItem, toIndex) > 0;
    const canPlaceSwappedAtSource = fromWhere.getMaximumAddCount(player, removedSwappedItem, fromIndex) > 0;

    if (!canPlaceMovedAtDest || !canPlaceSwappedAtSource) {
      fromWhere.addThing(removedMovedItem, fromIndex);
      toWhere.addThing(removedSwappedItem, toIndex);
      return false;
    }

    this.placeItemInContainer(toWhere, removedMovedItem, toIndex);
    this.placeItemInContainer(fromWhere, removedSwappedItem, fromIndex);

    removedMovedItem.emit("move", player, toWhere, removedMovedItem);
    removedSwappedItem.emit("move", player, fromWhere, removedSwappedItem);

    return true;
  }

  private static executeEquipReplace(player: IPlayer, fromWhere: Equipment | IContainer | ITile, fromIndex: number, toEquipment: Equipment, toIndex: number, count: number): boolean {
    const movedItem = fromWhere.peekIndex(fromIndex) as IItem | null;
    const equippedItem = toEquipment.peekIndex(toIndex) as IItem | null;

    if (!movedItem || !equippedItem) return false;
    if (!this.isMovableItem(movedItem) || !this.isMovableItem(equippedItem)) return false;
    if (movedItem.isStackable() && count !== movedItem.count) return false;

    const returnIndex = fromWhere instanceof Tile ? ItemStack.TOP_INDEX : fromIndex;

    const movedRemovalCount = movedItem.isStackable() ? count : 1;
    const equippedRemovalCount = this.getWholeItemCount(equippedItem);

    const removedEquipped = toEquipment.removeIndex(toIndex, equippedRemovalCount) as IItem | null;
    if (!removedEquipped) return false;

    const canPlaceMovedInEquip = toEquipment.getMaximumAddCount(player, movedItem, toIndex) > 0;
    if (!canPlaceMovedInEquip) { toEquipment.addThing(removedEquipped, toIndex); return false; }

    const removedMoved = fromWhere.removeIndex(fromIndex, movedRemovalCount) as IItem | null;
    if (!removedMoved) { toEquipment.addThing(removedEquipped, toIndex); return false; }

    const canReturnEquippedToSource = fromWhere.getMaximumAddCount(player, removedEquipped, returnIndex) > 0;
    if (!canReturnEquippedToSource) { fromWhere.addThing(removedMoved, returnIndex); toEquipment.addThing(removedEquipped, toIndex); return false; }

    toEquipment.addThing(removedMoved, toIndex);
    fromWhere.addThing(removedEquipped, returnIndex);

    if (fromWhere instanceof Tile) {
      const top = fromWhere.getTopItem();
      if (top) top.emit("add", player, removedEquipped);
    }

    removedMoved.emit("move", player, toEquipment, removedMoved);
    removedEquipped.emit("move", player, fromWhere, removedEquipped);

    return true;
  }

  private static executeStandardMove(player: IPlayer, fromWhere: Equipment | IContainer | ITile, fromIndex: number, toWhere: Equipment | IContainer | ITile, toIndex: number, count: number): boolean {
    if (count === 0) return false;

    const actualFromIndex = this.getIndexForWrite(fromWhere, fromIndex);
    const itemAtSource = fromWhere.peekIndex(actualFromIndex) as IItem | null;

    const removalCount = this.getRemovalCount(fromWhere, toWhere, itemAtSource, count);
    const movedItem = fromWhere.removeIndex(actualFromIndex, removalCount) as IItem | null;
    if (!movedItem) return false;

    const actualToIndex = this.getIndexForWrite(toWhere, toIndex);

    let existthing: any = null;
    if (toWhere instanceof Tile) existthing = toWhere.getTopItem();

    toWhere.addThing(movedItem, actualToIndex);

    if (toWhere instanceof Tile) {
      if (existthing === null) toWhere.emit("add", player, movedItem);
      else existthing.emit("add", player, movedItem);
    }

    if (movedItem.constructor.name === "Container" && fromWhere.getTopParent() !== toWhere.getTopParent()) {
      (movedItem as IContainer).checkPlayersAdjacency();
    }

    movedItem.emit("move", player, toWhere, movedItem);
    return true;
  }

  private static placeItemInContainer(container: Equipment | IContainer | ITile, item: IItem, index: number): void {
    if (container.constructor.name === "Container") {
      const containerInstance = container as IContainer;
      (containerInstance.container as any).__setItem(item, index);
      (containerInstance.container as any).__informSpectators(new ContainerAddPacket(containerInstance.container.guid, index, item));
      item.setParent(containerInstance);
      this.updateParentWeight(containerInstance, item.getWeight());
    } else {
      container.addThing(item, index);
    }
  }

  private static updateParentWeight(container: IContainer, weight: number): void {
    let current: any = container;
    while (current && current.getParent && current.getParent() !== current) {
      if (current.__updateWeight) current.__updateWeight(weight);
      current = current.getParent();
    }
  }
}
