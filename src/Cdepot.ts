"use strict";

import { getGameServer } from "./helper/appContext";
import BaseContainer from "./Cbase-container";
import Item from "./Citem";


class DepotContainer {
  public container: BaseContainer;
  public position: any | null;

  constructor(cid: number, things: any[]) {
    /*
     * Class DepotContainer
     * Container for the player depot that can contain items. Each player has an individual depot stored at player.depot
     */

    // Should include a base container to handle the items
    this.container = new BaseContainer(cid, things.length);

    // The parent of the depot container is updated based on what particular depot box is being opened
    this.position = null;

    // Add the depot items
    this.__addDepotItems(things);
  }

  getTopParent(): this {
    return this;
  }

  isClosed(): boolean {
    /*
     * Function DepotContainer.isClosed
     * Returns true if the depot is closed and has a null position
     */
    return this.position === null;
  }

  toJSON(): any[] {
    /*
     * Function DepotContainer.toJSON
     * Implements the toJSON API to serialize the depot when the player is saved
     */
    return this.container.slots;
  }

  getPosition(): any | null {
    /*
     * Function DepotContainer.getPosition
     * Returns the parent tile of the depot on which it is being opened
     */
    return this.position;
  }

  openAtPosition(position: any): void {
    /*
     * Function DepotContainer.openAtPosition
     * Sets the parent tile of the depot on which it is being opened
     */
    this.position = position;
  }

  getMaximumAddCount(player: any, item: Item, index: number): number {
    /*
     * Function DepotContainer.getMaximumAddCount
     * Implements the API that returns the maximum addable count of a thing at a particular slot
     */

    if (!this.container.isValidIndex(index)) {
      return 0;
    }

    const thing = this.container.peekIndex(index);

    if (thing === null) {
      return Item.MAXIMUM_STACK_COUNT;
    }

    if (thing.id === item.id && thing.isStackable()) {
      if (this.container.isFull()) {
        return Item.MAXIMUM_STACK_COUNT - thing.count;
      }
      return Item.MAXIMUM_STACK_COUNT;
    }

    return 0;
  }

  peekIndex(index: number): any | null {
    /*
     * Function DepotContainer.peekIndex
     * Returns a reference to the item at the requested index
     */
    return this.container.peekIndex(index);
  }

  removeIndex(index: number, amount: number): any {
    /*
     * Function DepotContainer.removeIndex
     * Removes an item count from the requested index
     */
    const thing = this.container.removeIndex(index, amount);
    thing.setParent(null);
    return thing;
  }

  deleteThing(thing: any): number {
    /*
     * Function DepotContainer.deleteThing
     * Removes an item from the container by its reference
     */
    const index = this.container.deleteThing(thing);

    if (index === -1) {
      return -1;
    }

    thing.setParent(null);
    return index;
  }

  addThing(thing: any, index: number): boolean {
    /*
     * Function DepotContainer.addThing
     * Function to add an item to the container
     */
    if (!thing.isPickupable() && thing.id !== 2594 && thing.id !== 2593) {
      return false;
    }

    this.container.addThing(thing, index);
    thing.setParent(this);
    return true;
  }

  addFirstEmpty(thing: any): void {
    /*
     * Function DepotContainer.addFirstEmpty
     * Adds a thing to the first available empty slot
     */
    thing.setParent(this);
    this.container.addFirstEmpty(thing);
  }

  canAddFirstEmpty(thing: any): boolean {
    /*
     * Function DepotContainer.canAddFirstEmpty
     * Determines if a thing can be added to the first available empty slot
     */
    if (!thing.isPickupable()) {
      return false;
    }

    if (this.container.isFull()) {
      return false;
    }

    return true;
  }

  private __addDepotItems(things: any[]): void {
    /*
     * Function DepotContainer.__addDepotItems
     * Adds equipment in serialized form from the database
     */
    things.forEach((thing, index) => {
      if (thing !== null) {
        this.addThing(getGameServer().database.parseThing(thing), index);
      }
    });
  }
}

export default DepotContainer;
