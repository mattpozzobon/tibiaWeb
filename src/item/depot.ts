"use strict";

import { getGameServer } from "../helper/appContext";
import BaseContainer from "./base-container";
import Item from "./item";
import Container from "./container/container";

class DepotContainer {
  public container: BaseContainer;
  public position: any | null;
  private mailContainer: Container;
  private depotContainer: Container;
  private static readonly MAIL_SLOT_INDEX: number = 0;
  private static readonly DEPOT_SLOT_INDEX: number = 1;
  public static readonly MAIL_CONTAINER_ID: number = 14404;
  public static readonly DEPOT_CONTAINER_ID: number = 2594;
  private static readonly DEFAULT_DEPOT_SIZE: number = 100;
  public static readonly MAIL_CONTAINER_SIZE: number = 5;

  constructor(cid: number, depotItems: any[], inboxItems: any[]) {
    this.container = new BaseContainer(cid, 2);  // The parent of the depot container is updated based on what particular depot box is being opened
    this.position = null;

    this.mailContainer = new Container(DepotContainer.MAIL_CONTAINER_ID, DepotContainer.MAIL_CONTAINER_SIZE);
    this.mailContainer.setUniqueId(0x10000000); 
    this.container.addThing(this.mailContainer, DepotContainer.MAIL_SLOT_INDEX);
    this.mailContainer.setParent(this as any); 
 
    const depotSize = Math.max(DepotContainer.DEFAULT_DEPOT_SIZE, depotItems.length);
    this.depotContainer = new Container(DepotContainer.DEPOT_CONTAINER_ID, depotSize);
    this.depotContainer.setUniqueId(0x10000001); 
    this.container.addThing(this.depotContainer, DepotContainer.DEPOT_SLOT_INDEX);
    this.depotContainer.setParent(this as any);
    this.__addDepotItems(depotItems);
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

  toJSON(inbox?: any): { mail: any[], depot: any[] } {
    /*
     * Function DepotContainer.toJSON
     * Returns serialized mail and depot items for database storage
     * 
     * NOTE: Mail items come from inbox.__items queue (single source of truth)
     * Container slots are just a view of the first 5 items in the queue
     * 
     * @param inbox - Inbox instance to get all mail items from __items queue
     */
    const mailItems: any[] = [];
    const depotItems: any[] = [];

    // Get all mail items from inbox queue (single source of truth)
    // The queue contains all items - container only displays first 5
    if (inbox && inbox.toJSON) {
      const inboxItems = inbox.toJSON();
      if (Array.isArray(inboxItems)) {
        mailItems.push(...inboxItems);
      }
    }

    // Serialize depot items
    if (this.depotContainer) {
      this.depotContainer.container.slots.forEach((item: any) => {
        if (item !== null) {
          depotItems.push(item.toJSON());
        }
      });
    }

    return { mail: mailItems, depot: depotItems };
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
     * Depot only has 2 slots (Mail and Depot containers), cannot add items directly
     */
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
     * Cannot remove the Mail or Depot containers - they are fixed and have unique IDs
     * Items in depot are stored in the inner depotContainer, not directly in DepotContainer
     * So this should only be called for the Mail/Depot containers themselves, which we prevent
     */
    const thing = this.container.peekIndex(index);
    if (thing && thing.hasUniqueId && thing.hasUniqueId()) {
      // Prevent removing the Mail or Depot containers (they have unique IDs)
      return null;
    }
    // DepotContainer only contains Mail and Depot containers, no regular items
    // Regular items go into depotContainer, so this path shouldn't be reached
    return null;
  }

  deleteThing(thing: any): number {
    /*
     * Function DepotContainer.deleteThing
     * Cannot delete the Mail or Depot containers - they are fixed
     */
    if (thing && thing.hasUniqueId && thing.hasUniqueId()) {
      return -1;
    }
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
     * Cannot add items directly to depot - use addToDepot or addToMail instead
     */
    return false;
  }

  addFirstEmpty(thing: any): void {
    /*
     * Function DepotContainer.addFirstEmpty
     * Adds a thing to the depot container (slot 1)
     */
    if (this.depotContainer) {
      this.depotContainer.addFirstEmpty(thing);
    }
  }

  canAddFirstEmpty(thing: any): boolean {
    /*
     * Function DepotContainer.canAddFirstEmpty
     * Checks if a thing can be added to the depot container
     */
    if (!thing || !thing.isPickupable()) {
      return false;
    }

    if (this.depotContainer && !this.depotContainer.container.isFull()) {
      return true;
    }

    return false;
  }

  addToMail(thing: any): void {
    /*
     * Function DepotContainer.addToMail
     * Adds an item to the mail container
     */
    if (this.mailContainer) {
      this.mailContainer.addFirstEmpty(thing);
    }
  }

  addToDepot(thing: any): void {
    /*
     * Function DepotContainer.addToDepot
     * Adds an item to the depot container
     */
    if (this.depotContainer) {
      this.depotContainer.addFirstEmpty(thing);
    }
  }

  getMailContainer(): Container {
    return this.mailContainer;
  }

  getDepotContainer(): Container {
    return this.depotContainer;
  }

  getSlots(): Array<any> {
    /*
     * Function DepotContainer.getSlots
     * Returns all slots in the depot container
     */
    return this.container.getSlots();
  }

  hasExclusiveSlots(): boolean {
    /*
     * Function DepotContainer.hasExclusiveSlots
     * Depots don't have exclusive slots, always returns false
     */
    return false;
  }

  getAllSlotTypesForPacket(): number[] {
    /*
     * Function DepotContainer.getAllSlotTypesForPacket
     * Returns slot types for the 2 slots (Mail and Depot containers) - all normal slots = 0
     */
    return [0, 0];
  }

  private __addMailItems(items: any[]): void {
    /*
     * Function DepotContainer.__addMailItems
     * Adds mail items to the mail container
     */
    items.forEach((item) => {
      if (item !== null) {
        const thing = getGameServer().database.parseThing(item);
        if (thing && this.mailContainer) {
          this.mailContainer.addFirstEmpty(thing);
        }
      }
    });
  }

  private __addDepotItems(items: any[]): void {
    /*
     * Function DepotContainer.__addDepotItems
     * Adds depot items to the depot container
     */
    items.forEach((item) => {
      if (item !== null) {
        const thing = getGameServer().database.parseThing(item);
        if (thing && this.depotContainer) {
          this.depotContainer.addFirstEmpty(thing);
        }
      }
    });
  }
}

export default DepotContainer;
