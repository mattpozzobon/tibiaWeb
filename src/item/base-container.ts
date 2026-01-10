"use strict";

import { IBaseContainer } from "../interfaces/IBase-container";
import { ContainerAddPacket, ContainerRemovePacket } from "../network/protocol";
import { IItem } from "interfaces/IThing";


class BaseContainer implements IBaseContainer{
  public guid: number;
  public size: number;
  public slots: Array<any>;
  public spectators: Set<any>;

  constructor(guid: number, size: number) {
    /*
     * Class BaseContainer
     * Represents the base of a container for multiple items: may be a depot, backpack, or even equipment
     */

    // Assign a global unique identifier to each container that is persistent
    this.guid = guid;

    // Each base container has particular size
    this.size = size;

    // The slots that keep references to the items in the container
    this.slots = new Array(size).fill(null);

    // The spectators that are presently viewing the base container and keep track of container updates
    this.spectators = new Set<any>();
  }

  getPacketSize(): number {
    /*
     * Function BaseContainer.getPacketSize
     * Returns the size of a container in bytes based on the total number of slots
     */
    return 3 * this.slots.length;
  }

  addSpectator(player: any): void {
    /*
     * Function BaseContainer.addSpectator
     * Adds a player spectator to the container
     */
    this.spectators.add(player);
  }

  removeSpectator(player: any): void {
    /*
     * Function BaseContainer.removeSpectator
     * Removes a player spectator from the container
     */
    this.spectators.delete(player);
  }

  isFull(): boolean {
    /*
     * Function BaseContainer.isFull
     * Returns true if the container is full and no empty slots exist within it
     */
    return !this.slots.includes(null);
  }

  copyContents(container: BaseContainer, cloneItems: boolean = false): void {
    /*
     * Function BaseContainer.copyContents
     * Copies over the contents from one container to another
     * @param container - Source container to copy FROM
     * @param cloneItems - If true, creates new instances of items (deep copy) instead of copying references
     *                     This prevents items from being lost when the source container is deleted
     * 
     * Copies items from source container slots to matching indices in this (destination) container.
     * Only copies to valid indices - if destination is smaller, items beyond its size are skipped.
     */
    container.slots.forEach((thing, index) => {
      if (thing !== null && this.isValidIndex(index)) {
        if (cloneItems) {
          // Serialize and re-parse to create new instances (deep copy)
          // This ensures items aren't lost when the source container is deleted
          try {
            const { getGameServer } = require("../helper/appContext");
            const serialized = typeof thing.toJSON === 'function' ? thing.toJSON() : null;
            if (serialized) {
              const clonedItem = getGameServer().database.parseThing(serialized);
              if (clonedItem !== null) {
                this.__setItem(clonedItem, index);
              } else {
                // Fallback: copy reference if cloning fails
                this.__setItem(thing, index);
              }
            } else {
              // Fallback: copy reference if serialization fails
              this.__setItem(thing, index);
            }
          } catch (error) {
            console.error(`[BaseContainer.copyContents] Error cloning item at index ${index}:`, error);
            // Fallback: copy reference if cloning fails
            this.__setItem(thing, index);
          }
        } else {
          // Original behavior: copy reference (for backwards compatibility)
          this.__setItem(thing, index);
        }
      }
    });
  }

  isValidIndex(index: number): boolean {
    /*
     * Function BaseContainer.isValidIndex
     * Returns true only if the index is within the container bounds
     */
    return index >= 0 && index < this.size;
  }

  getSlots(): Array<any> {
    /*
     * Function BaseContainer.getSlots
     * Returns a reference to all slots in the container (includes empty slots)
     */
    return this.slots;
  }

  peekIndex(slotIndex: number): any | null {
    /*
     * Function BaseContainer.peekIndex
     * Returns an item from the container
     */
    if (!this.isValidIndex(slotIndex)) {
      return null;
    }
    return this.slots[slotIndex];
  }

  addThing(thing: any, index: number): void {
    /*
     * Function BaseContainer.addThing
     * Adds a particular item to the specified index
     */
    const currentThing = this.peekIndex(index);

    if (currentThing !== null && thing.isStackable()) {
      this.__addStackable(index, currentThing, thing);
    } else {
      this.__informSpectators(new ContainerAddPacket(this.guid, index, thing));
      this.__setItem(thing, index);
    }
  }

  removeIndex(index: number, count: number): any | null {
    /*
     * Function BaseContainer.removeIndex
     * Removes a number (count) of items from the specified slot and returns the removed item
     */
    const thing = this.peekIndex(index);

    if (thing === null) {
      return null;
    }

    if (!thing.isStackable()) {
      this.__remove(index);
      return thing;
    }

    return this.__removeStackableItem(index, thing, count);
  }

  deleteThing(thing: any): number {
    /*
     * Function BaseContainer.deleteThing
     * Removes an item from the base container by its reference and returns the index it was removed from
     */
    const index = this.slots.indexOf(thing);

    if (index === -1) {
      return -1;
    }

    return this.__remove(index);
  }

  addFirstEmpty(thing: any): void {
    /*
     * Function BaseContainer.addFirstEmpty
     * Adds a thing to the first available empty slot
     */
    for (let i = 0; i < this.slots.length; i++) {
      if (this.peekIndex(i) === null) {
        this.addThing(thing, i);
        return;
      }
    }
  }

  private __remove(index: number): number {
    /*
     * Function BaseContainer.__remove
     * Internal function to remove an item from the stack
     */
    this.__informSpectators(new ContainerRemovePacket(this.guid, index, 0));
    this.__setItem(null, index);
    return index;
  }

  private __addStackable(index: number, currentItem: IItem, item: IItem): void {
    /*
     * Function BaseContainer.__addStackable
     * Adds a stackable item to another stackable item of the same type
     */
    const overflow = currentItem.count + item.count - item.getMaxStackCount();

    if (overflow > 0) {
      this.__overflowStack(index, currentItem, overflow);
    } else {
      this.__replaceFungibleItem(index, currentItem, currentItem.count + item.count);
    }
  }

  private __overflowStack(index: number, currentItem: IItem, overflow: number): void {
    /*
     * Function BaseContainer.__overflowStack
     * Handles overflow for stackable items
     */
    this.__replaceFungibleItem(index, currentItem, currentItem.getMaxStackCount());
    this.addFirstEmpty(currentItem.createFungibleThing(overflow));
  }

  private __replaceFungibleItem(index: number, item: any, count: number): void {
    /*
     * Function BaseContainer.__replaceFungibleItem
     * Replaces a stackable item with a specific count
     */
    this.deleteThing(item);
    this.addThing(item.createFungibleThing(count), index);
  }

  private __removeStackableItem(index: number, currentItem: any, count: number): any | null {
    /*
     * Function BaseContainer.__removeStackableItem
     * Removes an item by identifier and amount
     */
    if (count > currentItem.count) {
      return null;
    }

    if (count === currentItem.count) {
      this.__remove(index);
      return currentItem;
    }

    return this.__handleSplitStack(index, currentItem, count);
  }

  private __handleSplitStack(index: number, currentItem: any, count: number): any {
    /*
     * Function BaseContainer.__handleSplitStack
     * Handles splitting of an existing stack
     */
    this.__replaceFungibleItem(index, currentItem, currentItem.count - count);
    return currentItem.createFungibleThing(count);
  }

  private __informSpectators(packet: any): void {
    /*
     * Function BaseContainer.__informSpectators
     * Broadcasts a packet to all observers of the container
     */
    this.spectators.forEach(player => player.write(packet));
  }

  private __setItem(thing: any, index: number): void {
    /*
     * Function BaseContainer.__setItem
     * Sets a thing in a container at a particular index
     */
    this.slots[index] = thing;
  }
}

export default BaseContainer;
