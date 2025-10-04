"use strict";

import { IItem, IThing } from "interfaces/IThing";
import BaseContainer from "./Cbase-container";
import Item from "./Citem";
import { CONST, getGameServer, getSpriteIdForItem } from "./helper/appContext";
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
    this.container = new BaseContainer(cid, 15);

    // Add the equipment from the database
    //console.log('equipment',equipment);
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

    if (this.__isTrackedEquipmentSlot(false, index)) {
      console.log(`removeIndex to slot ${index}: Thing ID = ${IThing.id}`);
    }

    // Reset belt addons when belt is unequipped
    if (index === CONST.EQUIPMENT.BELT) {
      this.__resetBeltAddons();
    }

    return IThing;
  }

  private __isTrackedEquipmentSlot(isAdd: boolean, index: number, itemID?: number): boolean {
    switch (index) {
      case CONST.EQUIPMENT.HELMET:
        isAdd && itemID? this.IPlayer.properties.updateOutfitEquipment("head", getSpriteIdForItem(itemID) || 0) : this.IPlayer.properties.updateOutfitEquipment("head", 0);
        break;
      case CONST.EQUIPMENT.ARMOR:
        isAdd && itemID ? this.IPlayer.properties.updateOutfitEquipment("body", getSpriteIdForItem(itemID) || 0) : this.IPlayer.properties.updateOutfitEquipment("body", 0);
        break;
      case CONST.EQUIPMENT.LEGS:
        isAdd && itemID ? this.IPlayer.properties.updateOutfitEquipment("legs", getSpriteIdForItem(itemID) || 0) : this.IPlayer.properties.updateOutfitEquipment("legs", 0);
        break;
      case CONST.EQUIPMENT.BOOTS:
        isAdd && itemID ? this.IPlayer.properties.updateOutfitEquipment("feet", getSpriteIdForItem(itemID) || 0) : this.IPlayer.properties.updateOutfitEquipment("feet", 0);
        break;
      case CONST.EQUIPMENT.RIGHT:
        isAdd && itemID ? this.IPlayer.properties.updateOutfitEquipment("righthand", getSpriteIdForItem(itemID, "right") || 0) : this.IPlayer.properties.updateOutfitEquipment("righthand", 0);
        break;
      case CONST.EQUIPMENT.LEFT:
        isAdd && itemID ? this.IPlayer.properties.updateOutfitEquipment("lefthand", getSpriteIdForItem(itemID, "left") || 0) : this.IPlayer.properties.updateOutfitEquipment("lefthand", 0);
        break;
      case CONST.EQUIPMENT.BACKPACK:
        isAdd && itemID ? this.IPlayer.properties.updateOutfitEquipment("backpack", getSpriteIdForItem(itemID) || 0) : this.IPlayer.properties.updateOutfitEquipment("backpack", 0);
        break;
      case CONST.EQUIPMENT.BELT:
        isAdd && itemID ? this.IPlayer.properties.updateOutfitEquipment("belt", getSpriteIdForItem(itemID) || 0) : this.IPlayer.properties.updateOutfitEquipment("belt", 0);
        break;
      default:
        return false;
    }
    return true;
  }
  

  public getMaximumAddCount(player: IPlayer, thing: IThing, index: number): number {
    /*
     * Returns the count of the item that can be added to a tile/slot.
     */

    // Check whether the item type matches that of the slot
    if (!this.__isRightType(thing, index)) {
      return 0;
    }

    if (this.__isHandType(index) && this.getValidHandSlotForWeapon(thing) === null) {
      return 0;
    }

    // Take a look at the item in the slot
    const currentItem = this.peekIndex(index);

    // The slot is currently empty, accept the maximum count
    if (currentItem === null) {
      return Item.MAXIMUM_STACK_COUNT;
    }

    // Not empty but the identifiers match and the item is stackable:
    // return the maximum minus what is already there.
    if (currentItem.id === thing.id && thing.isStackable()) {
      return Item.MAXIMUM_STACK_COUNT - currentItem.count;
    }

    // Not able to add: another item is occupying the slot
    return 0;
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

    if (this.__isTrackedEquipmentSlot(false, index)) {
      console.log(`deleteThing to slot ${index}: Thing ID = ${IThing.id}`);
    }

    return index;
  }

  peekIndex(index: number): IItem | null {
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
    console.log('INDEX', index);
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

    this.__isTrackedEquipmentSlot(true, index, IThing.id);

    // Update addons based on existing potions in the belt when equipping
    if (index === CONST.EQUIPMENT.BELT) {
      this.__updateBeltAddonsFromContainer(IThing);
    }

    this.container.addThing(IThing, index);
    IThing.setParent(this);
    return this.__updateWeight(IThing.getWeight());
  }

  hasTwoHandedEquipped(): boolean {
    const leftWeapon = this.peekIndex(CONST.EQUIPMENT.LEFT);
    const rightWeapon = this.peekIndex(CONST.EQUIPMENT.RIGHT);

    console.log('TEST');
    console.log(leftWeapon !== null && leftWeapon.getPrototype().properties.slotType === "two-handed");

    return (
      (leftWeapon !== null && leftWeapon.getPrototype().properties.slotType === "two-handed") ||
      (rightWeapon !== null && rightWeapon.getPrototype().properties.slotType === "two-handed")
    );
  }

  getValidHandSlotForWeapon(item: IThing): number | null {
    const proto = item.getPrototype();
    const isTwoHanded = proto.properties.slotType === "two-handed";

    if (this.hasTwoHandedEquipped()) {
      return null;
    }
  
    // Get current weapons in both hands.
    const leftWeapon = this.peekIndex(CONST.EQUIPMENT.LEFT);
    const rightWeapon = this.peekIndex(CONST.EQUIPMENT.RIGHT);
  
    // If any already equipped weapon is two-handed, no additional weapon may be added.
    if (leftWeapon && leftWeapon.getPrototype().properties.slotType === "two-handed") {
      return null;
    }
    if (rightWeapon && rightWeapon.getPrototype().properties.slotType === "two-handed") {
      return null;
    }
  
    if (isTwoHanded) {
      // For a two-handed weapon both hands must be free.
      if (leftWeapon !== null || rightWeapon !== null) {
        return null;
      }
      // You can choose either hand; here we choose LEFT.
      return CONST.EQUIPMENT.LEFT;
    } else {
      // For one-handed weapons, try to use a free hand.
      if (leftWeapon === null) {
        return CONST.EQUIPMENT.LEFT;
      } else if (rightWeapon === null) {
        return CONST.EQUIPMENT.RIGHT;
      }
      // Both hands are occupied.
      return null;
    }
  }

  __isHandType(slot: number): boolean {
    /*
     * Function Equipment.__isHandType
     * Returns true if the item is a hand type
     */
    if (slot === CONST.EQUIPMENT.LEFT || slot === CONST.EQUIPMENT.RIGHT) {
      return true;
    }
    return false;
  }

  __isRightType(item: IThing, slot: number): boolean {
    /*
     * Function Equipment.__isRightType
     * Returns true if the item matches the slot type
     */
    const proto = item.getPrototype();

    //console.log('proto',proto);

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
        return ["shield", "wand"].includes(proto.properties.weaponType);
      case CONST.EQUIPMENT.LEFT:
        return ["sword", "club", "axe", "distance", "wand"].includes(proto.properties.weaponType);
      case CONST.EQUIPMENT.BACKPACK:
        return proto.properties.slotType === "backpack";
      case CONST.EQUIPMENT.NECKLACE:
        return proto.properties.slotType === "necklace";
      case CONST.EQUIPMENT.RING:
      case CONST.EQUIPMENT.RING2:
      case CONST.EQUIPMENT.RING3:
      case CONST.EQUIPMENT.RING4:
      case CONST.EQUIPMENT.RING5:
        return proto.properties.slotType === "ring";
      case CONST.EQUIPMENT.QUIVER:
        return proto.properties.weaponType === "ammunition";
      case CONST.EQUIPMENT.BELT:
        return proto.properties.slotType === "belt";
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
    equipment.forEach((entry) => {
      // Skip null entries
      if (!entry) {
        return;
      }

      const IThing = getGameServer().database.parseThing(entry.item);
      if (IThing) {
        // Add the main equipment item into its slot.
        this.addThing(IThing, entry.slot);

        if (IThing.getAttribute("invisible")) {
          this.IPlayer.addCondition(CONST.CONDITION.INVISIBLE, -1, -1, null);
        }

        // If the item is a container and has serialized sub-items, recursively add them.
        if (typeof IThing.isContainer === "function" && IThing.isContainer() && entry.item.items) {
          this.addSubItems(IThing, entry.item);
        }
      }
    });
  }

  private addSubItems(container: IThing, serializedData: any): void {
    if (
      typeof container.isContainer === "function" &&
      container.isContainer() &&
      Array.isArray(serializedData.items)
    ) {
      serializedData.items.forEach((subItemData: any, subIndex: number) => {
        if (subItemData !== null) {
          // Parse the sub-item from its serialized data.
          const subItem = getGameServer().database.parseThing(subItemData);
          if (subItem) {
            // Add the sub-item into the container at the appropriate index.
            container.addThing(subItem, subIndex);

            // Recursively add any items contained in the sub-item if it is a container.
            if (
              typeof subItem.isContainer === "function" &&
              subItem.isContainer()
            ) {
              // Pass the serialized representation of the sub-container.
              this.addSubItems(subItem, subItemData);
            }
          }
        }
      });
    }
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

  private __updateBeltAddonsFromContainer(beltContainer: IThing): void {
    /*
     * Function Equipment.__updateBeltAddonsFromContainer
     * Updates belt addons based on existing potions in the container when equipped
     */
    if (!beltContainer || typeof (beltContainer as any).isContainer !== "function" || !(beltContainer as any).isContainer()) {
      return;
    }

    const container = (beltContainer as any).container as BaseContainer;
    if (!container) return;

    // Check existing potions in the belt
    const existingHealthPotions = container.getSlots().filter(slot => {
      if (!slot) return false;
      const clientId = getGameServer().database.getClientId(slot.id);
      return clientId === 266; // Health potion
    });

    const existingManaPotions = container.getSlots().filter(slot => {
      if (!slot) return false;
      const clientId = getGameServer().database.getClientId(slot.id);
      return clientId === 268; // Mana potion
    });

    const existingEnergyPotions = container.getSlots().filter(slot => {
      if (!slot) return false;
      const clientId = getGameServer().database.getClientId(slot.id);
      return clientId === 237; // Energy potion
    });

    console.log(`Belt equipped - Health: ${existingHealthPotions.length}, Mana: ${existingManaPotions.length}, Energy: ${existingEnergyPotions.length}`);

    // Update addons based on existing potions
    this.IPlayer.properties.updateOutfitAddon('healthPotion', existingHealthPotions.length > 0 ? 1 : 0);
    this.IPlayer.properties.updateOutfitAddon('manaPotion', existingManaPotions.length > 0 ? 1 : 0);
    this.IPlayer.properties.updateOutfitAddon('energyPotion', existingEnergyPotions.length > 0 ? 1 : 0);

    console.log('Belt addons updated on equip');
  }

  private __resetBeltAddons(): void {
    /*
     * Function Equipment.__resetBeltAddons
     * Resets all belt addons to 0 when belt is unequipped
     */
    this.IPlayer.properties.updateOutfitAddon('healthPotion', 0);
    this.IPlayer.properties.updateOutfitAddon('manaPotion', 0);
    this.IPlayer.properties.updateOutfitAddon('energyPotion', 0);
    
    console.log('Belt addons reset to 0 on unequip');
  }
  
}

export default Equipment;
