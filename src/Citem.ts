"use strict";

import { IItem } from "interfaces/IThing";
import { BitFlag, OTBBitFlag } from "./Cbitflag";
import Thing from "./Cthing";
import { getGameServer } from "./helper/appContext";


class Item extends Thing implements IItem{
  static MAXIMUM_STACK_COUNT: number = 100;

  constructor(id: number) {
    /*
     * Class Item
     * Container for an item
     *
     * API
     * Item.isMoveable - return true if the item is moveable
     * Item.isStackable - returns true if the item is stackable
     * Item.stringify - returns a serialized string of the class
     */
    super(id);
  }

  getMaxStackCount(): number {
    return Item.MAXIMUM_STACK_COUNT;
  }

  split(count: number): Item {
    /*
     * Function Item.split
     * Splits an existing item by decrementing its own count and creating a new item with the remaining count
     */
    if (!this.getPrototype().isStackable()) {
      return this;
    }

    // Clamp count to valid range
    count = Math.max(0, Math.min(count, this.count));

    if (count === 0) {
      return this;
    }

    this.setCount(this.count - count);

    const item = getGameServer().database.createThing(this.id) as Item;
    item.setCount(count);

    return item;
  }

  setWeight(weight: number): void {
    /*
     * Function Item.setWeight
     * Sets the weight of the item
     */
    this.weight = weight;
  }

  setFluidType(count: number): void {
    /*
     * Function Item.setFluidType
     * Sets the fluid type by delegating an update to the count
     */
    this.setCount(count);
  }

  hasHeight(): boolean {
    /*
     * Function Item.hasHeight
     * Returns true if the item prototype has a height
     */
    return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_HAS_HEIGHT);
  }

  isBlockSolid(): boolean {
    /*
     * Function Item.isBlockSolid
     * Returns true when the item blocks solid objects
     */
    return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_BLOCK_SOLID);
  }

  isBlockProjectile(): boolean {
    /*
     * Function Item.isBlockProjectile
     * Returns true when the item blocks a projectile
     */
    return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_BLOCK_PROJECTILE);
  }

  supportsHangable(): boolean {
    /*
     * Function Item.supportsHangable
     * Returns true if the item supports a hangable (e.g., wall)
     */
    return this.hasFlag(
      OTBBitFlag.prototype.flags.FLAG_HORIZONTAL | OTBBitFlag.prototype.flags.FLAG_VERTICAL
    );
  }

  isHorizontal(): boolean {
    /*
     * Function Item.isHorizontal
     * Returns true if the item is horizontal (for hangables)
     */
    return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_HORIZONTAL);
  }

  isVertical(): boolean {
    /*
     * Function Item.isVertical
     * Returns true if the item is vertical (for hangables)
     */
    return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_VERTICAL);
  }

  isHangable(): boolean {
    /*
     * Function Item.isHangable
     * Returns true if the item is hangable
     */
    return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_HANGABLE);
  }

  isPickupable(): boolean {
    /*
     * Function Item.isPickupable
     * Returns true when the item is pickupable
     */
    return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_PICKUPABLE);
  }

  isMoveable(): boolean {
    /*
     * Function Item.isMoveable
     * Returns true when the item is moveable
     */
    return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_MOVEABLE);
  }

  toJSON(): object {
    /*
     * Function Item.toJSON
     * Serializes an item
     */
    this.cleanup();

    return {
      id: this.id,
      count: this.count,
      actionId: this.actionId,
      duration: this.duration,
    };
  }
}

export default Item;
