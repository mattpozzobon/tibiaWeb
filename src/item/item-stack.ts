"use strict";
import Creature from "../creature/creature";
import { CONST } from "../helper/appContext";
import Item from "./item";

class ItemStack {
  private __items: any[] = [];
  static MAX_CAPACITY: number = 10;
  static TOP_INDEX: number = 0xff;

  isFull(): boolean {
    return this.hasMagicDoor() || this.__items.length >= ItemStack.MAX_CAPACITY;
  }

  isMailbox(): boolean {
    if(this.getTopItem()?.isMailbox() && this.__items.length > 0)
      return true
    return false
  }

  hasMagicDoor(): boolean {
    if (this.__items.length === 0) {
      return false;
    }
    const topItem = this.__items[0];
    return (
      topItem.isDoor() &&
      (topItem.getAttribute("expertise") ||
        topItem.getAttribute("unwanted") ||
        topItem.isHouseDoor())
    );
  }

  getItems(): any[] {
    return this.__items;
  }

  getFloorChange(): string | null {
    for (const item of this.__items) {
      const floor = item.getAttribute("floorchange");
      if (floor !== null) {
        return floor;
      }
    }
    return null;
  }

  addThing(index: number, thing: any): void {
    if (index === ItemStack.TOP_INDEX) {
      this.__items.push(thing);
    } else {
      this.__items.splice(index, 0, thing);
    }
  }

  isBlockNPC(): boolean {
    for (const item of this.__items) {
      if (item.isDoor() && !item.isLocked()) {
        continue;
      }
      if (item.isMoveable()) {
        continue;
      }
      if (item.isBlockSolid()) {
        return true;
      }
    }
    return false;
  }

  isItemSolid(): boolean {
    for (const item of this.__items) {
      if (item.isBlockSolid() && !item.hasHeight()) {
        return true;
      }
    }
    return false;
  }

  isBlockSolid(ignoreDoors = false): boolean {
    for (const item of this.__items) {
      if (ignoreDoors && item.isDoor() && !item.isLocked()) {
        continue;
      }
      if (item.isBlockSolid()) {
        return true;
      }
    }
    return false;
  }

  isBlockProjectile(): boolean {
    return this.__items.some((item) => item.isBlockProjectile());
  }

  hasElevation(): boolean {
    let elevation = 0;
    for (const item of this.__items) {
      if (item.hasHeight()) {
        elevation++;
      }
    }
    return elevation >= 3;
  }

  getTeleporterDestination(): any {
    for (const item of this.__items) {
      // Check if item is a teleporter by checking if it has getDestination method
      // This avoids circular dependency with Teleporter import
      if (item && typeof item.getDestination === "function") {
        return item.getDestination();
      }
    }
    return null;
  }

  isTrashholder(): boolean {
    return this.__items.some((item) => item.isTrashholder());
  }

  deleteThing(index: number): any | null {
    if (index === ItemStack.TOP_INDEX) {
      return this.__items.pop();
    }
    return this.__items.splice(index, 1)[0] || null;
  }

  isEmpty(): boolean {
    return this.__items.length === 0;
  }

  getTopItem(): Item | null {
    return this.isEmpty() ? null : this.__items[this.__items.length - 1];
  }

  peekIndex(index: number): Item | null {
    if (!this.isValidIndex(index)) {
      return null;
    }
    return index === ItemStack.TOP_INDEX ? this.getTopItem() : this.__items[index];
  }

  isValidIndex(index: number): boolean {
    return (
      index === ItemStack.TOP_INDEX || (index >= 0 && index <= this.__items.length)
    );
  }

  applyFieldDamage(creature: any): void {
    for (let i = this.__items.length - 1; i >= 0; i--) {
      const proto = this.__items[i].getPrototype();
      if (!proto.isField()) {
        continue;
      }
      this.__applyFieldCondition(proto.properties.field, creature);
      break;
    }
  }

  private __applyFieldCondition(field: string, creature: Creature): void {
    switch (field) {
      case "energy":
        creature.addCondition(CONST.CONDITION.ELECTRIFIED, 1, 3, null);
        break;
      case "fire":
        creature.addCondition(CONST.CONDITION.BURNING, 0.5, 2.5, null);
        break;
      case "poison":
        creature.addCondition(CONST.CONDITION.POISONED, 0.1, 2, null);
        break;
    }
  }
}

export default ItemStack;
