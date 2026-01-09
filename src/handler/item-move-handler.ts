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
 * ItemMoveHandler - Handles all item movement logic including validation, swaps, and standard moves
 */
export class ItemMoveHandler {
  private static mailboxHandler: MailboxHandler = new MailboxHandler();

  /** Validates and moves an item from one location to another - main entry point */
  public static validateAndMoveItem(player: IPlayer, fromWhere: Equipment | IContainer | ITile, fromIndex: number, toWhere: Equipment | IContainer | ITile, toIndex: number, count: number): void {
    console.log('[ItemMoveHandler.validateAndMoveItem] START', { fromWhere: fromWhere.constructor.name, fromIndex, toWhere: toWhere.constructor.name, toIndex, count });
    
    if (!fromWhere || !toWhere) {
      console.log('[ItemMoveHandler.validateAndMoveItem] Invalid locations');
      return;
    }

    if (fromWhere instanceof Tile && !player.position.besides(fromWhere.position)) {
      console.log('[ItemMoveHandler.validateAndMoveItem] Too far from tile');
      return player.sendCancelMessage("You are not close enough.");
    }

    if (toWhere instanceof Tile && !player.position.inLineOfSight(toWhere.position)) {
      console.log('[ItemMoveHandler.validateAndMoveItem] No line of sight');
      return player.sendCancelMessage("You cannot throw this item here.");
    }

    // For tiles, use peekIndex with TOP_INDEX to get top item only
    // This ensures we only get one item from the stack, not multiple
    const actualFromIndex = fromWhere instanceof Tile ? ItemStack.TOP_INDEX : fromIndex;
    const fromItemThing = fromWhere.peekIndex(actualFromIndex);
    const fromItem: IItem | null = fromItemThing as IItem | null;
    console.log('[ItemMoveHandler.validateAndMoveItem] fromItem', { 
      id: fromItem?.id, 
      count: fromItem?.count, 
      isStackable: fromItem?.isStackable(),
      fromIndex: actualFromIndex,
      isTile: fromWhere instanceof Tile
    });
    
    if (!fromItem) {
      console.log('[ItemMoveHandler.validateAndMoveItem] No item at source');
      return;
    }
    
    // For non-stackable items, getCount() returns 0, but we need count 1
    // For stackable items, use actual count from the item
    // Use getCount() which handles non-stackable correctly, or fall back to count property
    const effectiveFromCount = fromItem.getCount() > 0 ? fromItem.getCount() : (fromItem.isStackable() ? fromItem.count : 1);
    const actualCount = fromWhere instanceof Tile ? Math.min(count, effectiveFromCount) : count;
    
    // Ensure we never move with count 0 - for non-stackable items, always use 1
    const finalCount = fromItem.isStackable() ? actualCount : Math.max(1, actualCount);
    
    if (finalCount !== count || finalCount !== actualCount) {
      console.log('[ItemMoveHandler.validateAndMoveItem] Adjusted count', { 
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
      console.log('[ItemMoveHandler.validateAndMoveItem] Cannot move with count 0 - aborting');
      return;
    }

    if (!fromItem.isMoveable() || fromItem.hasUniqueId()) {
      return player.sendCancelMessage("You cannot move this item.");
    }
    if (toWhere instanceof Tile) {
      if (toWhere.hasItems() && toWhere.itemStack!.isMailbox() && this.mailboxHandler.canMailItem(fromItem)) {
        return this.mailboxHandler.sendThing(fromWhere, toWhere, player, fromItem);
      }
      
      const toWhere2 = getGameServer().world.lattice.findDestination(player, toWhere);
      if (!toWhere2) return player.sendCancelMessage("You cannot add this item here.");
      
      if (toWhere2.isTrashholder()) {
        console.log('[ItemMoveHandler.validateAndMoveItem] Trashholder detected - deleting item');
        getGameServer().world.sendMagicEffect(toWhere2.position, toWhere2.getTrashEffect());
        fromItem.cleanup();
        fromWhere.removeIndex(actualFromIndex, actualCount);
        return;
      }
      
      if (toWhere2.hasItems() && toWhere2.itemStack.isItemSolid()) {
        return player.sendCancelMessage("You cannot add this item here.");
      }
      
      if (toWhere2.isBlockSolid() && toWhere2.isOccupiedAny()) {
        return player.sendCancelMessage("You cannot add this item here.");
      }
    }

    if (toWhere.getTopParent() === player && !player.hasSufficientCapacity(fromItem)) {
      if (fromWhere.constructor.name === "DepotContainer" || toWhere.getTopParent() !== fromWhere.getTopParent()) {
        return player.sendCancelMessage("Your capacity is insufficient to carry this item.");
      }
    }

    // For tiles, always use TOP_INDEX to get the top item
    const actualToIndex = toWhere instanceof Tile ? ItemStack.TOP_INDEX : toIndex;
    const existingItemThing = toWhere.peekIndex(actualToIndex);
    const existingItem: IItem | null = existingItemThing as IItem | null;
    const existingItemCount = existingItem?.isStackable() ? existingItem.count : (existingItem ? 1 : 0);
    console.log('[ItemMoveHandler.validateAndMoveItem] existingItem at destination', { 
      id: existingItem?.id, 
      count: existingItem?.count,
      effectiveCount: existingItemCount,
      isStackable: existingItem?.isStackable(),
      toIndex: actualToIndex,
      isTile: toWhere instanceof Tile
    });
    
    const isSameContainer = this.isSameContainer(fromWhere, toWhere);
    
    // Check for merge scenario: same stackable item (same ID and stackable)
    // Merging should happen via standard move, not swap
    const isMergeScenario = existingItem !== null && 
                            fromItem.id === existingItem.id && 
                            fromItem.isStackable() && 
                            existingItem.isStackable();
    
    if (isMergeScenario) {
      console.log('[ItemMoveHandler.validateAndMoveItem] MERGE scenario detected - same stackable item', { 
        itemId: fromItem.id, 
        fromCount: fromItem.count, 
        existingCount: existingItem.count 
      });
      // Skip swap logic - let standard move handle merging via addThing's stacking logic
      if (actualFromIndex === actualToIndex && isSameContainer) {
        console.log('[ItemMoveHandler.validateAndMoveItem] Same slot merge - no move needed');
        return; // Already in the same slot, no move needed
      }
      // Different index but same item - will merge via standard move
      // Fall through to standard move below
    }
    
    // Swaps ONLY happen inside containers (same container), NOT tile-to-tile
    // For tile-to-tile moves, we just move the top item from stack to top of destination stack (standard move)
    const isTileToTile = fromWhere instanceof Tile && toWhere instanceof Tile && fromWhere !== toWhere;
    
    // Only check for swaps if NOT tile-to-tile and same container
    const shouldSwap = !isTileToTile && // NO swaps for tile-to-tile!
                       existingItem !== null && 
                       fromItem.id !== existingItem.id && // Different items
                       existingItem.isMoveable() && !existingItem.hasUniqueId() &&
                       fromItem.isMoveable() && !fromItem.hasUniqueId() &&
                       isSameContainer && // ONLY swaps within same container
                       actualFromIndex !== actualToIndex; // Different positions
    
    if (shouldSwap && !isMergeScenario) {
      console.log('[ItemMoveHandler.validateAndMoveItem] SWAP scenario detected (same container only, NOT tile-to-tile)', { 
        existingItem: existingItem.id, 
        movedItem: fromItem.id
      });
      if (this.moveItem(player, fromWhere, actualFromIndex, toWhere, actualToIndex, finalCount)) {
        console.log('[ItemMoveHandler.validateAndMoveItem] Swap successful');
        return;
      }
      console.log('[ItemMoveHandler.validateAndMoveItem] Swap failed, falling through to standard move');
    }
    
    const maxCount = toWhere.getMaximumAddCount(player, fromItem, actualToIndex);
    console.log('[ItemMoveHandler.validateAndMoveItem] Standard move', { maxCount, requestedCount: finalCount, toIndex: actualToIndex });
    if (maxCount === 0) {
      console.log('[ItemMoveHandler.validateAndMoveItem] Cannot add item - maxCount is 0');
      return player.sendCancelMessage("You cannot add this item here.");
    }
    const realCount = Math.min(finalCount, maxCount);
    if (realCount === 0) {
      console.log('[ItemMoveHandler.validateAndMoveItem] Real count is 0 after validation');
      return;
    }
    console.log('[ItemMoveHandler.validateAndMoveItem] Executing standard move', { realCount, fromIndex: actualFromIndex, toIndex: actualToIndex });
    this.moveItem(player, fromWhere, actualFromIndex, toWhere, actualToIndex, realCount);
  }
  
  /** Moves an item from one location to another - handles both swap scenarios and standard moves */
  public static moveItem(player: IPlayer, fromWhere: Equipment | IContainer | ITile, fromIndex: number, toWhere: Equipment | IContainer | ITile, toIndex: number, count: number): boolean {
    console.log('[ItemMoveHandler.moveItem] START', { fromIndex, toIndex, count, fromType: fromWhere.constructor.name, toType: toWhere.constructor.name });
    
    if (count === 0) {
      console.log('[ItemMoveHandler.moveItem] Count is 0, aborting');
      return false;
    }
    
    // Swaps ONLY happen inside the same container, NOT tile-to-tile
    const isSameContainer = this.isSameContainer(fromWhere, toWhere);
    const isTileToTile = fromWhere instanceof Tile && toWhere instanceof Tile && fromWhere !== toWhere;
    
    // For same container swaps (NOT tiles), check if we should swap
    if (isSameContainer && !isTileToTile && fromIndex !== toIndex) {
      const existingItemThing = toWhere.peekIndex(toIndex);
      const movedItemThing = fromWhere.peekIndex(fromIndex);
      const existingItem = existingItemThing as IItem | null;
      const movedItem = movedItemThing as IItem | null;
      console.log('[ItemMoveHandler.moveItem] Swap check (same container)', { 
        existingItem: existingItem?.id, 
        movedItem: movedItem?.id,
        existingCount: existingItem?.count,
        movedCount: movedItem?.count
      });

      if (existingItem !== null && movedItem !== null &&
          existingItem.id !== movedItem.id && // Different items - swap
          existingItem.isMoveable() && !existingItem.hasUniqueId() &&
          movedItem.isMoveable() && !movedItem.hasUniqueId()) {
        console.log('[ItemMoveHandler.moveItem] Executing swap (same container)');
        return this.executeSwap(player, fromWhere, fromIndex, toWhere, toIndex, count, existingItem, movedItem);
      }
    }

    // For tile-to-tile moves, always do standard move (just move top item from stack)
    console.log('[ItemMoveHandler.moveItem] Executing standard move', { isTileToTile, isSameContainer });
    return this.executeStandardMove(player, fromWhere, fromIndex, toWhere, toIndex, count);
  }

  /** Checks if two locations refer to the same container */
  public static isSameContainer(fromWhere: Equipment | IContainer | ITile, toWhere: Equipment | IContainer | ITile): boolean {
    if (fromWhere === toWhere) {
      return true;
    }

    if (fromWhere.constructor.name === "Container" && toWhere.constructor.name === "Container") {
      return (fromWhere as IContainer).container.guid === (toWhere as IContainer).container.guid;
    }

    if (fromWhere.constructor.name === "Equipment" && toWhere.constructor.name === "Equipment") {
      return fromWhere === toWhere;
    }

    return false;
  }

  /** Executes a swap between two items in the same container */
  private static executeSwap(player: IPlayer, fromWhere: Equipment | IContainer | ITile, fromIndex: number, toWhere: Equipment | IContainer | ITile, toIndex: number, count: number, existingItem: IItem, movedItem: IItem): boolean {
    console.log('[ItemMoveHandler.executeSwap] START', { 
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
  
    // For stackable items with partial count, we should merge instead of swap
    // But if count matches the full stack, we can swap
    if (movedItem.isStackable() && count !== movedItem.count) {
      console.log('[ItemMoveHandler.executeSwap] Partial stackable move - should use standard move for merging', { count, fullCount: movedItem.count });
      return false; // Partial stackable moves should go through standard move to handle merging
    }
    
    // For non-stackable items, count should typically be 1, but allow swap regardless
    console.log('[ItemMoveHandler.executeSwap] Proceeding with swap validation');
  
    if (fromWhere.constructor.name === "Container" && toWhere.constructor.name === "Container") {
      const fromC = fromWhere as IContainer;
      const toC = toWhere as IContainer;
  
      if (fromC.container.guid !== toC.container.guid) {
        return false;
      }
  
      const base = fromC.container as any;

      const a = base.peekIndex(fromIndex);
      const b = base.peekIndex(toIndex);

      if (!a || !b) return false;
      if (a !== movedItem || b !== existingItem) return false;

      // For swaps within the same container, temporarily clear slots to validate restrictions
      const tempA = base.slots[fromIndex];
      const tempB = base.slots[toIndex];
      
      base.__setItem(null, fromIndex);
      base.__setItem(null, toIndex);
      
      // Validate slot restrictions (slots are now empty, so getMaximumAddCount checks restrictions only)
      const canPlaceBAtFromIndex = fromC.getMaximumAddCount(player, b, fromIndex) > 0;
      const canPlaceAAtToIndex = fromC.getMaximumAddCount(player, a, toIndex) > 0;
      
      if (!canPlaceBAtFromIndex || !canPlaceAAtToIndex) {
        // Restore items if validation fails
        base.__setItem(tempA, fromIndex);
        base.__setItem(tempB, toIndex);
        return false;
      }

      // Swap items (slots are already cleared)
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
  
    if (sameRef) {
      return false;
    }
  
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

  /** Executes a standard move - for tiles, always moves the top item from stack to top of destination stack */
  private static executeStandardMove(player: IPlayer, fromWhere: Equipment | IContainer | ITile, fromIndex: number, toWhere: Equipment | IContainer | ITile, toIndex: number, count: number): boolean {
    console.log('[ItemMoveHandler.executeStandardMove] START', { fromIndex, toIndex, count, fromType: fromWhere.constructor.name, toType: toWhere.constructor.name });
    
    if (count === 0) {
      console.log('[ItemMoveHandler.executeStandardMove] Count is 0, aborting');
      return false;
    }
    
    // For tiles, always use TOP_INDEX to remove the top item from the stack (only one item, not the whole stack)
    const actualFromIndex = fromWhere instanceof Tile ? ItemStack.TOP_INDEX : fromIndex;
    
    // For non-stackable items, always remove with count 1 (they report count 0 but we need to move 1)
    // For stackable items, use the requested count
    const itemAtSource = fromWhere.peekIndex(actualFromIndex) as IItem | null;
    const removalCount = itemAtSource && !itemAtSource.isStackable() ? 1 : count;
    
    console.log('[ItemMoveHandler.executeStandardMove] Removing item', { 
      fromIndex: actualFromIndex, 
      removalCount,
      requestedCount: count,
      isTile: fromWhere instanceof Tile,
      itemIsStackable: itemAtSource?.isStackable(),
      itemCount: itemAtSource?.count
    });
    
    const movedItemThing = fromWhere.removeIndex(actualFromIndex, removalCount);
    const movedItem = movedItemThing as IItem | null;
    console.log('[ItemMoveHandler.executeStandardMove] Removed item', { 
      id: movedItem?.id, 
      count: movedItem?.count, 
      removed: !!movedItem,
      requestedCount: removalCount
    });
    
    if (!movedItem) {
      console.log('[ItemMoveHandler.executeStandardMove] Failed to remove item');
      return false;
    }

    // For tiles, always use TOP_INDEX to add to top of stack (will merge if same stackable item, otherwise adds on top)
    const actualToIndex = toWhere instanceof Tile ? ItemStack.TOP_INDEX : toIndex;
    let existthing = null;
    if (toWhere instanceof Tile) {
      existthing = toWhere.getTopItem();
      console.log('[ItemMoveHandler.executeStandardMove] Tile destination - existing top item', { 
        existingItem: existthing?.id, 
        existingCount: (existthing as IItem)?.count,
        willMerge: existthing && existthing.id === movedItem.id && movedItem.isStackable()
      });
    }

    console.log('[ItemMoveHandler.executeStandardMove] Adding item to destination (will merge if same stackable, otherwise adds to top)', { 
      toIndex: actualToIndex, 
      itemId: movedItem.id, 
      itemCount: movedItem.count,
      isTile: toWhere instanceof Tile
    });
    // addThing handles merging automatically if same stackable item, otherwise adds to top of stack
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
