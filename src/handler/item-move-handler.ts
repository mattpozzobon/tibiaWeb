import { IPlayer } from "interfaces/IPlayer";
import { IContainer, IItem, IThing } from "interfaces/IThing";
import ITile from "interfaces/ITile";
import Equipment from "../item/equipment";
import Tile from "../thing/tile";
import { ContainerAddPacket } from "../network/protocol";
import { getGameServer } from "../helper/appContext";
import { MailboxHandler } from "./mailbox-handler";
import ItemStack from "../item/item-stack";

/**
 * ItemMoveHandler - Handles all item movement logic including validation, swaps, equip-replace, and standard moves
 */
export class ItemMoveHandler {
  private static mailboxHandler: MailboxHandler = new MailboxHandler();

  private static isEquipment(where: any): where is Equipment {
    return where instanceof Equipment || where?.constructor?.name === "Equipment";
  }

  /** Validates and moves an item from one location to another - main entry point */
  public static validateAndMoveItem(
    player: IPlayer,
    fromWhere: Equipment | IContainer | ITile,
    fromIndex: number,
    toWhere: Equipment | IContainer | ITile,
    toIndex: number,
    count: number
  ): void {
    console.log("[ItemMoveHandler.validateAndMoveItem] START", {
      fromWhere: fromWhere.constructor.name,
      fromIndex,
      toWhere: toWhere.constructor.name,
      toIndex,
      count
    });

    if (!fromWhere || !toWhere) {
      console.log("[ItemMoveHandler.validateAndMoveItem] Invalid locations");
      return;
    }

    if (fromWhere instanceof Tile && !player.position.besides(fromWhere.position)) {
      console.log("[ItemMoveHandler.validateAndMoveItem] Too far from tile");
      player.sendCancelMessage("You are not close enough.");
      return;
    }

    if (toWhere instanceof Tile && !player.position.inLineOfSight(toWhere.position)) {
      console.log("[ItemMoveHandler.validateAndMoveItem] No line of sight");
      player.sendCancelMessage("You cannot throw this item here.");
      return;
    }

    // For tiles, always pick the TOP item only
    const actualFromIndex = fromWhere instanceof Tile ? ItemStack.TOP_INDEX : fromIndex;

    const fromItemThing = fromWhere.peekIndex(actualFromIndex);
    const fromItem: IItem | null = fromItemThing as IItem | null;

    console.log("[ItemMoveHandler.validateAndMoveItem] fromItem", {
      id: fromItem?.id,
      count: fromItem?.count,
      isStackable: fromItem?.isStackable(),
      fromIndex: actualFromIndex,
      isTile: fromWhere instanceof Tile
    });

    if (!fromItem) {
      console.log("[ItemMoveHandler.validateAndMoveItem] No item at source");
      return;
    }

    // Determine the effective available count at the source
    const effectiveFromCount =
      fromItem.getCount() > 0 ? fromItem.getCount() : fromItem.isStackable() ? fromItem.count : 1;

    const actualCount = fromWhere instanceof Tile ? Math.min(count, effectiveFromCount) : count;

    // Ensure non-stackables always move at least 1
    const finalCount = fromItem.isStackable() ? actualCount : Math.max(1, actualCount);

    if (finalCount !== count || finalCount !== actualCount) {
      console.log("[ItemMoveHandler.validateAndMoveItem] Adjusted count", {
        original: count,
        actual: actualCount,
        final: finalCount,
        effectiveFromCount,
        getCount: fromItem.getCount(),
        directCount: fromItem.count,
        isStackable: fromItem.isStackable()
      });
    }

    if (finalCount === 0) {
      console.log("[ItemMoveHandler.validateAndMoveItem] Cannot move with count 0 - aborting");
      return;
    }

    if (!fromItem.isMoveable() || fromItem.hasUniqueId()) {
      player.sendCancelMessage("You cannot move this item.");
      return;
    }

    // Tile destination validations / special destinations
    if (toWhere instanceof Tile) {
      if (toWhere.hasItems() && toWhere.itemStack!.isMailbox() && this.mailboxHandler.canMailItem(fromItem)) {
        this.mailboxHandler.sendThing(fromWhere, toWhere, player, fromItem);
        return;
      }

      const toWhere2 = getGameServer().world.lattice.findDestination(player, toWhere);
      if (!toWhere2) {
        player.sendCancelMessage("You cannot add this item here.");
        return;
      }

      if (toWhere2.isTrashholder()) {
        console.log("[ItemMoveHandler.validateAndMoveItem] Trashholder detected - deleting item");
        getGameServer().world.sendMagicEffect(toWhere2.position, toWhere2.getTrashEffect());
        fromItem.cleanup();
        fromWhere.removeIndex(actualFromIndex, finalCount);
        return;
      }

      if (toWhere2.hasItems() && toWhere2.itemStack.isItemSolid()) {
        player.sendCancelMessage("You cannot add this item here.");
        return;
      }

      if (toWhere2.isBlockSolid() && toWhere2.isOccupiedAny()) {
        player.sendCancelMessage("You cannot add this item here.");
        return;
      }
    }

    // Capacity check when moving into player's top parent
    if (toWhere.getTopParent() === player && !player.hasSufficientCapacity(fromItem)) {
      if (fromWhere.constructor.name === "DepotContainer" || toWhere.getTopParent() !== fromWhere.getTopParent()) {
        player.sendCancelMessage("Your capacity is insufficient to carry this item.");
        return;
      }
    }

    // For tiles, destination index is TOP
    const actualToIndex = toWhere instanceof Tile ? ItemStack.TOP_INDEX : toIndex;

    const existingItemThing = toWhere.peekIndex(actualToIndex);
    const existingItem: IItem | null = existingItemThing as IItem | null;
    const existingItemCount = existingItem?.isStackable() ? existingItem.count : existingItem ? 1 : 0;

    console.log("[ItemMoveHandler.validateAndMoveItem] existingItem at destination", {
      id: existingItem?.id,
      count: existingItem?.count,
      effectiveCount: existingItemCount,
      isStackable: existingItem?.isStackable(),
      toIndex: actualToIndex,
      isTile: toWhere instanceof Tile
    });

    const isSameContainer = this.isSameContainer(fromWhere, toWhere);

    // Merge scenario (same stackable id)
    const isMergeScenario =
      existingItem !== null &&
      fromItem.id === existingItem.id &&
      fromItem.isStackable() &&
      existingItem.isStackable();

    if (isMergeScenario) {
      console.log("[ItemMoveHandler.validateAndMoveItem] MERGE scenario detected", {
        itemId: fromItem.id,
        fromCount: fromItem.count,
        existingCount: existingItem.count
      });

      if (actualFromIndex === actualToIndex && isSameContainer) {
        console.log("[ItemMoveHandler.validateAndMoveItem] Same slot merge - no move needed");
        return;
      }
      // Fall through to standard move for merge
    }

    // No swaps for tile-to-tile
    const isTileToTile = fromWhere instanceof Tile && toWhere instanceof Tile && fromWhere !== toWhere;

    // Equipment replace path: container/tile -> equipment where the slot is occupied
    const isEquipDestination = this.isEquipment(toWhere);
    if (isEquipDestination) {
      const existing = (toWhere as Equipment).peekIndex(actualToIndex) as IItem | null;
      if (existing !== null && actualFromIndex !== actualToIndex) {
        console.log("[ItemMoveHandler.validateAndMoveItem] EQUIP REPLACE scenario detected", {
          movedItem: fromItem.id,
          equippedItem: existing.id,
          toIndex: actualToIndex
        });

        const replaced = this.executeEquipReplace(
          player,
          fromWhere,
          actualFromIndex,
          toWhere as Equipment,
          actualToIndex,
          finalCount
        );

        if (replaced) return;

        console.log("[ItemMoveHandler.validateAndMoveItem] Equip replace failed, falling through");
      }
    }

    // Regular swap: ONLY same container and NOT tile-to-tile and not merge
    const shouldSwap =
      !isTileToTile &&
      existingItem !== null &&
      fromItem.id !== existingItem.id &&
      existingItem.isMoveable() &&
      !existingItem.hasUniqueId() &&
      fromItem.isMoveable() &&
      !fromItem.hasUniqueId() &&
      isSameContainer &&
      actualFromIndex !== actualToIndex;

    if (shouldSwap && !isMergeScenario) {
      console.log("[ItemMoveHandler.validateAndMoveItem] SWAP scenario detected (same container only)", {
        existingItem: existingItem.id,
        movedItem: fromItem.id
      });

      if (this.moveItem(player, fromWhere, actualFromIndex, toWhere, actualToIndex, finalCount)) {
        console.log("[ItemMoveHandler.validateAndMoveItem] Swap successful");
        return;
      }

      console.log("[ItemMoveHandler.validateAndMoveItem] Swap failed, falling through to standard move");
    }

    const maxCount = toWhere.getMaximumAddCount(player, fromItem, actualToIndex);

    console.log("[ItemMoveHandler.validateAndMoveItem] Standard move", {
      maxCount,
      requestedCount: finalCount,
      toIndex: actualToIndex
    });

    if (maxCount === 0) {
      console.log("[ItemMoveHandler.validateAndMoveItem] Cannot add item - maxCount is 0");
      player.sendCancelMessage("You cannot add this item here.");
      return;
    }

    const realCount = Math.min(finalCount, maxCount);

    if (realCount === 0) {
      console.log("[ItemMoveHandler.validateAndMoveItem] Real count is 0 after validation");
      return;
    }

    console.log("[ItemMoveHandler.validateAndMoveItem] Executing standard move", {
      realCount,
      fromIndex: actualFromIndex,
      toIndex: actualToIndex
    });

    this.moveItem(player, fromWhere, actualFromIndex, toWhere, actualToIndex, realCount);
  }

  /** Moves an item from one location to another - handles swap and standard moves */
  public static moveItem(
    player: IPlayer,
    fromWhere: Equipment | IContainer | ITile,
    fromIndex: number,
    toWhere: Equipment | IContainer | ITile,
    toIndex: number,
    count: number
  ): boolean {
    console.log("[ItemMoveHandler.moveItem] START", {
      fromIndex,
      toIndex,
      count,
      fromType: fromWhere.constructor.name,
      toType: toWhere.constructor.name
    });

    if (count === 0) {
      console.log("[ItemMoveHandler.moveItem] Count is 0, aborting");
      return false;
    }

    const isSameContainer = this.isSameContainer(fromWhere, toWhere);
    const isTileToTile = fromWhere instanceof Tile && toWhere instanceof Tile && fromWhere !== toWhere;

    // Equip replace can also be triggered here
    if (this.isEquipment(toWhere)) {
      const existing = (toWhere as Equipment).peekIndex(toIndex) as IItem | null;
      if (existing !== null && fromIndex !== toIndex) {
        return this.executeEquipReplace(player, fromWhere, fromIndex, toWhere as Equipment, toIndex, count);
      }
    }

    // Swap inside same container only (not tiles)
    if (isSameContainer && !isTileToTile && fromIndex !== toIndex) {
      const existingItemThing = toWhere.peekIndex(toIndex);
      const movedItemThing = fromWhere.peekIndex(fromIndex);

      const existingItem = existingItemThing as IItem | null;
      const movedItem = movedItemThing as IItem | null;

      console.log("[ItemMoveHandler.moveItem] Swap check (same container)", {
        existingItem: existingItem?.id,
        movedItem: movedItem?.id,
        existingCount: existingItem?.count,
        movedCount: movedItem?.count
      });

      if (
        existingItem !== null &&
        movedItem !== null &&
        existingItem.id !== movedItem.id &&
        existingItem.isMoveable() &&
        !existingItem.hasUniqueId() &&
        movedItem.isMoveable() &&
        !movedItem.hasUniqueId()
      ) {
        console.log("[ItemMoveHandler.moveItem] Executing swap (same container)");
        return this.executeSwap(player, fromWhere, fromIndex, toWhere, toIndex, count, existingItem, movedItem);
      }
    }

    console.log("[ItemMoveHandler.moveItem] Executing standard move", { isTileToTile, isSameContainer });
    return this.executeStandardMove(player, fromWhere, fromIndex, toWhere, toIndex, count);
  }

  /** Checks if two locations refer to the same container */
  public static isSameContainer(fromWhere: Equipment | IContainer | ITile, toWhere: Equipment | IContainer | ITile): boolean {
    if (fromWhere === toWhere) return true;

    if (fromWhere.constructor.name === "Container" && toWhere.constructor.name === "Container") {
      return (fromWhere as IContainer).container.guid === (toWhere as IContainer).container.guid;
    }

    if (fromWhere.constructor.name === "Equipment" && toWhere.constructor.name === "Equipment") {
      return fromWhere === toWhere;
    }

    return false;
  }

  /** Executes a swap between two items in the same container */
  private static executeSwap(
    player: IPlayer,
    fromWhere: Equipment | IContainer | ITile,
    fromIndex: number,
    toWhere: Equipment | IContainer | ITile,
    toIndex: number,
    count: number,
    existingItem: IItem,
    movedItem: IItem
  ): boolean {
    console.log("[ItemMoveHandler.executeSwap] START", {
      fromIndex,
      toIndex,
      count,
      movedItemCount: movedItem.count,
      existingItemCount: existingItem.count,
      movedItemId: movedItem.id,
      existingItemId: existingItem.id,
      movedIsStackable: movedItem.isStackable(),
      existingIsStackable: existingItem.isStackable()
    });

    const sameRef = fromWhere === toWhere;

    // Partial stackable move should not swap (use standard move/merge logic)
    if (movedItem.isStackable() && count !== movedItem.count) {
      console.log("[ItemMoveHandler.executeSwap] Partial stackable move - should use standard move");
      return false;
    }

    if (fromWhere.constructor.name === "Container" && toWhere.constructor.name === "Container") {
      const fromC = fromWhere as IContainer;
      const toC = toWhere as IContainer;

      if (fromC.container.guid !== toC.container.guid) return false;

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

    if (sameRef) return false;

    const removedMovedItem = fromWhere.removeIndex(fromIndex, count);
    const removedSwappedItem = toWhere.removeIndex(toIndex, existingItem.count);

    if (!removedMovedItem || !removedSwappedItem) {
      if (removedMovedItem) fromWhere.addThing(removedMovedItem, fromIndex);
      if (removedSwappedItem) toWhere.addThing(removedSwappedItem, toIndex);
      return false;
    }

    const canPlaceMovedAtDest = toWhere.getMaximumAddCount(player, removedMovedItem as IItem, toIndex) > 0;
    const canPlaceSwappedAtSource = fromWhere.getMaximumAddCount(player, removedSwappedItem as IItem, fromIndex) > 0;

    if (!canPlaceMovedAtDest || !canPlaceSwappedAtSource) {
      fromWhere.addThing(removedMovedItem, fromIndex);
      toWhere.addThing(removedSwappedItem, toIndex);
      return false;
    }

    this.placeItemInContainer(toWhere, removedMovedItem as IItem, toIndex);
    this.placeItemInContainer(fromWhere, removedSwappedItem as IItem, fromIndex);

    removedMovedItem.emit("move", player, toWhere, removedMovedItem);
    removedSwappedItem.emit("move", player, fromWhere, removedSwappedItem);

    return true;
  }

  /**
   * Equip Replace (tile/container -> equipment):
   * - remove currently equipped item
   * - validate moved item fits (Equipment.getMaximumAddCount now works because slot is empty)
   * - remove moved item from source
   * - validate equipped item can return to source
   * - place moved into equip slot, return equipped to source
   * - rollback on any failure
   */
  private static executeEquipReplace(
    player: IPlayer,
    fromWhere: Equipment | IContainer | ITile,
    fromIndex: number,
    toEquipment: Equipment,
    toIndex: number,
    count: number
  ): boolean {
    console.log("[ItemMoveHandler.executeEquipReplace] START", {
      fromType: fromWhere.constructor.name,
      toType: toEquipment.constructor.name,
      fromIndex,
      toIndex,
      count
    });

    const movedItem = fromWhere.peekIndex(fromIndex) as IItem | null;
    const equippedItem = toEquipment.peekIndex(toIndex) as IItem | null;

    if (!movedItem || !equippedItem) return false;

    if (!movedItem.isMoveable() || movedItem.hasUniqueId()) return false;
    if (!equippedItem.isMoveable() || equippedItem.hasUniqueId()) return false;

    if (movedItem.isStackable() && count !== movedItem.count) {
      console.log("[ItemMoveHandler.executeEquipReplace] Partial stack equip blocked", {
        count,
        full: movedItem.count
      });
      return false;
    }

    const returnIndex = fromWhere instanceof Tile ? ItemStack.TOP_INDEX : fromIndex;

    const movedRemovalCount = movedItem.isStackable() ? count : 1;
    const equippedRemovalCount = equippedItem.isStackable() ? equippedItem.count : 1;

    // 1) remove equipped item (to make slot empty for validation)
    const removedEquipped = toEquipment.removeIndex(toIndex, equippedRemovalCount) as IItem | null;
    if (!removedEquipped) return false;

    // 2) validate moved item can be equipped now that slot is empty
    const canPlaceMovedInEquip = toEquipment.getMaximumAddCount(player, movedItem, toIndex) > 0;
    if (!canPlaceMovedInEquip) {
      toEquipment.addThing(removedEquipped, toIndex);
      console.log("[ItemMoveHandler.executeEquipReplace] Cannot place moved item in equipment slot");
      return false;
    }

    // 3) remove moved item from source
    const removedMoved = fromWhere.removeIndex(fromIndex, movedRemovalCount) as IItem | null;
    if (!removedMoved) {
      toEquipment.addThing(removedEquipped, toIndex);
      console.log("[ItemMoveHandler.executeEquipReplace] Failed removing moved item - rolled back equip removal");
      return false;
    }

    // 4) validate equipped item can return to source
    const canReturnEquippedToSource = fromWhere.getMaximumAddCount(player, removedEquipped, returnIndex) > 0;
    if (!canReturnEquippedToSource) {
      fromWhere.addThing(removedMoved, returnIndex);
      toEquipment.addThing(removedEquipped, toIndex);
      console.log("[ItemMoveHandler.executeEquipReplace] Cannot return equipped item to source - rolled back");
      return false;
    }

    // 5) place moved item into equip, return equipped back to source
    toEquipment.addThing(removedMoved, toIndex);
    fromWhere.addThing(removedEquipped, returnIndex);

    // Keep your tile "add" semantics
    if (fromWhere instanceof Tile) {
      const top = fromWhere.getTopItem();
      if (top) top.emit("add", player, removedEquipped);
    }

    removedMoved.emit("move", player, toEquipment, removedMoved);
    removedEquipped.emit("move", player, fromWhere, removedEquipped);

    console.log("[ItemMoveHandler.executeEquipReplace] DONE", {
      equippedNow: removedMoved.id,
      returnedToSource: removedEquipped.id
    });

    return true;
  }

  /** Executes a standard move - for tiles, always moves the top item from stack to top of destination stack */
  private static executeStandardMove(
    player: IPlayer,
    fromWhere: Equipment | IContainer | ITile,
    fromIndex: number,
    toWhere: Equipment | IContainer | ITile,
    toIndex: number,
    count: number
  ): boolean {
    console.log("[ItemMoveHandler.executeStandardMove] START", {
      fromIndex,
      toIndex,
      count,
      fromType: fromWhere.constructor.name,
      toType: toWhere.constructor.name
    });

    if (count === 0) {
      console.log("[ItemMoveHandler.executeStandardMove] Count is 0, aborting");
      return false;
    }

    const actualFromIndex = fromWhere instanceof Tile ? ItemStack.TOP_INDEX : fromIndex;

    const itemAtSource = fromWhere.peekIndex(actualFromIndex) as IItem | null;
    const removalCount = itemAtSource && !itemAtSource.isStackable() ? 1 : count;

    console.log("[ItemMoveHandler.executeStandardMove] Removing item", {
      fromIndex: actualFromIndex,
      removalCount,
      requestedCount: count,
      isTile: fromWhere instanceof Tile,
      itemIsStackable: itemAtSource?.isStackable(),
      itemCount: itemAtSource?.count
    });

    const movedItemThing = fromWhere.removeIndex(actualFromIndex, removalCount);
    const movedItem = movedItemThing as IItem | null;

    console.log("[ItemMoveHandler.executeStandardMove] Removed item", {
      id: movedItem?.id,
      count: movedItem?.count,
      removed: !!movedItem,
      requestedCount: removalCount
    });

    if (!movedItem) {
      console.log("[ItemMoveHandler.executeStandardMove] Failed to remove item");
      return false;
    }

    const actualToIndex = toWhere instanceof Tile ? ItemStack.TOP_INDEX : toIndex;

    let existthing: any = null;
    if (toWhere instanceof Tile) {
      existthing = toWhere.getTopItem();
      console.log("[ItemMoveHandler.executeStandardMove] Tile destination - existing top item", {
        existingItem: existthing?.id,
        existingCount: (existthing as IItem)?.count,
        willMerge: existthing && existthing.id === movedItem.id && movedItem.isStackable()
      });
    }

    console.log("[ItemMoveHandler.executeStandardMove] Adding item to destination", {
      toIndex: actualToIndex,
      itemId: movedItem.id,
      itemCount: movedItem.count,
      isTile: toWhere instanceof Tile
    });

    toWhere.addThing(movedItem, actualToIndex);

    if (toWhere instanceof Tile) {
      if (existthing === null) {
        toWhere.emit("add", player, movedItem);
      } else {
        existthing.emit("add", player, movedItem);
      }
    }

    if (movedItem.constructor.name === "Container" && fromWhere.getTopParent() !== toWhere.getTopParent()) {
      (movedItem as IContainer).checkPlayersAdjacency();
    }

    movedItem.emit("move", player, toWhere, movedItem);

    return true;
  }

  /** Places an item in a container using direct BaseContainer methods - bypasses Container.addThing validation */
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

  /** Updates parent weight recursively */
  private static updateParentWeight(container: IContainer, weight: number): void {
    let current: any = container;
    while (current && current.getParent && current.getParent() !== current) {
      if (current.__updateWeight) {
        current.__updateWeight(weight);
      }
      current = current.getParent();
    }
  }
}
