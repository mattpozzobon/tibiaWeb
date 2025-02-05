"use strict";

import { IThing } from "interfaces/IThing";
import BaseContainer from "./Cbase-container";
import Item from "./Citem";
import { CONST, getGameServer } from "./helper/appContext";
import { IPlayer } from "interfaces/IPlayer";


class Equipment {
  private IPlayer: IPlayer;
  private container: BaseContainer;

  constructor(cid: number, IPlayer: IPlayer, equipment: any[]) {
    /*
     * Class Equipment
     * Container for IPlayer equipment that can contain items and keep state of all equipped attributes
     */
    this.IPlayer = IPlayer;
    this.container = new BaseContainer(cid, 10);

    // Add the equipment from the database
    this.__addEquipment(equipment);

    // Self spectate changes to the equipment always
    this.container.spectators.add(IPlayer);
  }

  getTopParent(): any {
    /*
     * Function Equipment.getTopParent
     * Returns the top parent of the equipment which is the IPlayer
     */
    return this.IPlayer;
  }

  getParent(): any {
    /*
     * Function Equipment.getParent
     * The parent of the container is always the IPlayer
     */
    return this.IPlayer;
  }

  toJSON(): object {
    /*
     * Function Equipment.toJSON
     * Implements the JSON.Stringify interface that is called when the IPlayer is serialized
     */
    return this.container.slots
      .map((item: Item | null, index: number) => {
        if (item === null) return null;

        return {
          slot: index,
          item,
        };
      })
      .filter((entry) => entry !== null);
  }

  handleChangeOnEquip(IThing: IThing, change: any): IThing {
    const newThing = getGameServer().database.createThing(change) as IThing;
    IThing.copyProperties(newThing);
    IThing.cleanup();
    return newThing;
  }

  handleChangeThing(IThing: IThing, change: any): IThing {
    /*
     * Function Equipment.handleChangeThing
     * Handles changing an item on equip event
     */
    const newThing = getGameServer().database.createThing(change) as IThing;

    // Copy over the properties
    IThing.copyProperties(newThing);

    // Clean up the item
    IThing.cleanup();

    return newThing;
  }

  removeIndex(index: number, count: number): IThing {
    /*
     * Function Equipment.removeIndex
     * Implements the removeIndex API that handles removal of an item by the index and amount
     */
    const IThing = this.container.removeIndex(index, count);
    this.__updateWeight(-IThing.getWeight());
    IThing.setParent(null);

    if (IThing.getAttribute("invisible")) {
      this.IPlayer.removeCondition(CONST.CONDITION.INVISIBLE);
    }

    if (IThing.getAttribute("suppressDrunk")) {
      this.IPlayer.removeCondition(CONST.CONDITION.SUPPRESS_DRUNK);
    }

    if (IThing.getAttribute("manashield")) {
      this.IPlayer.removeCondition(CONST.CONDITION.MAGIC_SHIELD);
    }

    const change = IThing.getChangeOnUnequip();

    if (change !== null) {
      return this.handleChangeThing(IThing, change);
    }

    return IThing;
  }

  deleteThing(IThing: IThing): number {
    /*
     * Function Equipment.deleteThing
     * Implements the deleteThing API that handles removal of an item by its reference
     */
    const index = this.container.deleteThing(IThing);

    if (index === -1) return -1;

    this.__updateWeight(-IThing.getWeight());
    IThing.setParent(null);

    if (IThing.getAttribute("invisible")) {
      this.IPlayer.removeCondition(CONST.CONDITION.INVISIBLE);
    }

    if (IThing.getAttribute("suppressDrunk")) {
      this.IPlayer.removeCondition(CONST.CONDITION.SUPPRESS_DRUNK);
    }

    if (IThing.getAttribute("manashield")) {
      this.IPlayer.removeCondition(CONST.CONDITION.MAGIC_SHIELD);
    }

    return index;
  }

  peekIndex(index: number): IThing | null {
    /*
     * Function Equipment.peekIndex
     * Peeks at the item at the specified slot index
     */
    return this.container.peekIndex(index);
  }

  getWeaponType(): any {
    return CONST.PROPERTIES.CLUB;
  }

  addThing(IThing: IThing, index: number): boolean {
    /*
     * Function Equipment.addThing
     * Adds an item to the passed slot index
     */
    if (!IThing.isPickupable()) return false;

    const change = IThing.getChangeOnEquip();

    if (change !== null) {
      IThing = this.handleChangeThing(IThing, change);
    }

    if (IThing.getAttribute("invisible")) {
      this.IPlayer.addCondition(CONST.CONDITION.INVISIBLE, -1, -1, null);
    }

    if (IThing.getAttribute("suppressDrunk")) {
      this.IPlayer.addCondition(CONST.CONDITION.SUPPRESS_DRUNK, -1, -1, null);
    }

    if (IThing.getAttribute("manashield")) {
      this.IPlayer.addCondition(CONST.CONDITION.MAGIC_SHIELD, -1, -1, null);
    }

    this.container.addThing(IThing, index);
    IThing.setParent(this);
    return this.__updateWeight(IThing.getWeight());
  }

  __isRightType(item: IThing, slot: number): boolean {
    /*
     * Function Equipment.__isRightType
     * Returns true if the item matches the slot type
     */
    const proto = item.getPrototype();

    switch (slot) {
      case CONST.EQUIPMENT.HELMET:
        return proto.properties.slotType === "head";
      case CONST.EQUIPMENT.ARMOR:
        return proto.properties.slotType === "body";
      case CONST.EQUIPMENT.LEGS:
        return proto.properties.slotType === "legs";
      case CONST.EQUIPMENT.BOOTS:
        return proto.properties.slotType === "feet";
      case CONST.EQUIPMENT.RIGHT:
        return proto.properties.weaponType === "shield";
      case CONST.EQUIPMENT.LEFT:
        return proto.properties.weaponType === "sword" || proto.properties.weaponType === "distance";
      case CONST.EQUIPMENT.BACKPACK:
        return proto.properties.slotType === "backpack";
      case CONST.EQUIPMENT.NECKLACE:
        return proto.properties.slotType === "necklace";
      case CONST.EQUIPMENT.RING:
        return proto.properties.slotType === "ring";
      case CONST.EQUIPMENT.QUIVER:
        return proto.properties.weaponType === "ammunition";
      default:
        return false;
    }
  }

  __updateWeight(weight: number): boolean {
    /*
     * Function Equipment.__updateWeight
     * Updates the capacity of the parent IPlayer
     */
    this.IPlayer.changeCapacity(-weight);
    return true;
  }

  __addEquipment(equipment: any[]): void {
    /*
     * Function Equipment.__addEquipment
     * Adds equipment in serialized form from the database
     */
    equipment.forEach((entry) => {
      const IThing = getGameServer().database.parseThing(entry.item);
      if(IThing){
        this.addThing(IThing, entry.slot);

        if (IThing.getAttribute("invisible")) {
          this.IPlayer.addCondition(CONST.CONDITION.INVISIBLE, -1, -1, null);
        }
      }
    });
  }

  hasSufficientResources(resource: number, amount: number): boolean {
    /*
     * Function Equipment.hasSufficientResources
     * Returns true if the IPlayer has a number of sufficient resources (e.g., gold)
     */
    const backpack = this.peekIndex(CONST.EQUIPMENT.BACKPACK);
  
    if (backpack === null) {
      return false;
    }
  
    let remainingAmount = amount;
  
    for (const slot of backpack.container.__slots) {
      if (slot === null) {
        continue;
      }
  
      if (slot.id === resource) {
        if (slot.count >= remainingAmount) {
          return true;
        }
        remainingAmount = Math.max(0, remainingAmount - slot.count);
      }
  
      if (remainingAmount === 0) {
        return true;
      }
    }
  
    return false;
  }
  
  payWithResource(resource: number, amount: number): boolean {
    /*
     * Function Equipment.payWithResource
     * Pays with a number of resources from the IPlayer's equipped backpack
     */
    const backpack = this.peekIndex(CONST.EQUIPMENT.BACKPACK);
  
    if (backpack === null) {
      return false;
    }
  
    if (!this.hasSufficientResources(resource, amount)) {
      return false;
    }
  
    let remainingAmount = amount;
  
    for (let i = 0; i < backpack.container.__slots.length; i++) {
      const slot = backpack.container.__slots[i];
  
      if (slot === null) {
        continue;
      }
  
      if (slot.id === resource && backpack.isContainer()) {
        if (slot.count >= remainingAmount) {
          backpack.removeIndex(i, remainingAmount);
          return true;
        }
  
        backpack.removeIndex(i, slot.count);
        remainingAmount -= slot.count;
      }
    }
  
    return false;
  }
  
  canPushItem(IThing: IThing): boolean {
    /*
     * Function Equipment.canPushItem
     * Return true if a IThing can be pushed to the IPlayer's inventory
     */
    const backpack = this.peekIndex(CONST.EQUIPMENT.BACKPACK);
  
    if (backpack === null) {
      return false;
    }
  
    if (IThing.isContainer() && IThing.exceedsMaximumChildCount()) {
      return false;
    }
  
    if (backpack.container.isFull() || !this.IPlayer.hasSufficientCapacity(IThing)) {
      return false;
    }
  
    return true;
  }
  
  pushItem(IThing: IThing): void {
    /*
     * Function Equipment.pushItem
     * Pushes an item into the backpack of the IPlayer or on the ground
     */
    const backpack = this.peekIndex(CONST.EQUIPMENT.BACKPACK);
  
    if (backpack === null) {
      return;
    }
    
    if(backpack.isContainer()){
      backpack.addFirstEmpty(IThing);
    }
  }
  
  isAmmunitionEquipped(): boolean {
    /*
     * Public Function Equipment.isAmmunitionEquipped
     * Returns true if the IPlayer has ammunition equipped
     */
    const ammunition = this.peekIndex(CONST.EQUIPMENT.QUIVER);
  
    if (ammunition === null) {
      return false;
    }
  
    const weapon = this.peekIndex(CONST.EQUIPMENT.LEFT);
  
    if (!weapon || !weapon.isRightAmmunition(ammunition)) {
      return false;
    }
  
    return true;
  }
  
  isDistanceWeaponEquipped(): boolean {
    /*
     * Public Function Equipment.isDistanceWeaponEquipped
     * Returns true if a distance weapon is equipped
     */
    const IThing = this.peekIndex(CONST.EQUIPMENT.LEFT);
  
    if (IThing === null) {
      return false;
    }
  
    return IThing.isDistanceWeapon();
  }
  
  getAttributeState(attribute: string): number {
    /*
     * Function Equipment.getAttributeState
     * Returns the state of the IPlayer equipment by summing individual contributions
     */
    let sum = 0;
  
    this.container.slots.forEach((IThing: IThing | null) => {
      if (IThing === null) {
        return;
      }
  
      const value = IThing.getAttribute(attribute);
      if (value !== null) {
        sum += value;
      }
    });
  
    return sum;
  }
  
}

export default Equipment;
