import BaseContainer from "../base-container";
import { ContainerClosePacket, ContainerOpenPacket } from "../../network/protocol";
import { CONFIG, CONST, getGameServer } from "../../helper/appContext";
import { IContainer, IItem, IThing } from "interfaces/IThing";
import { IPlayer } from "interfaces/IPlayer";
import Item from "../item";
import exclusiveSlotsManager from "../../utils/exclusive-slots";

class Container extends Item implements IContainer{
  private __childWeight: number = 0;
  public container: BaseContainer;
  public static MAXIMUM_DEPTH: number = 2;

  constructor(id: number, size: number) {
    super(id);

    const exclusiveSlots = exclusiveSlotsManager.getContainerSlots(id);
    const extraSlots = exclusiveSlots.length;
    const totalSize = size + extraSlots;

    this.container = new BaseContainer(getGameServer().world.creatureHandler.assignUID(), totalSize);
  }

  getNumberItems(): number {
    return this.getSlots().filter((x) => x !== null).length;
  }

  addFirstEmpty(thing: IThing): boolean {
    if (this.frozen) return false;

    if (!thing.isPickupable() || this.container.isFull()) {
      return false;
    }

    const exclusiveSlots = exclusiveSlotsManager.getContainerSlots(this.id);
    const originalSize = this.container.size - exclusiveSlots.length;

    // Find first empty slot that allows this item
    for (let i = 0; i < this.container.size; i++) {
      if (this.container.peekIndex(i) === null) {
        // Check if this slot allows the item
        let canPlace = true;
        
        if (i >= originalSize) {
          // This is an exclusive slot, check if the item is allowed
          const exclusiveSlotIndex = i - originalSize;
          const clientId = getGameServer().database.getClientId(thing.id);
          canPlace = exclusiveSlotsManager.canPlaceItem(this.id, exclusiveSlotIndex, clientId);
        }
        
        if (canPlace) {
          this.container.addThing(thing, i);
          thing.setParent(this);
          this.__updateParentWeightRecursion(thing.getWeight());
          return true;
        }
      }
    }

    return false;
  }

  hasIdentifier(cid: number): boolean {
    return this.container.guid === cid;
  }

  checkPlayersAdjacency(): void {
    this.container.spectators.forEach((player) =>
      player.containerManager.checkContainer(this)
    );

    this.container.getSlots().forEach((IItem) => {
      if (IItem instanceof Container) {
        IItem.checkPlayersAdjacency();
      }
    });
  }

  peekIndex(index: number): IItem | null {
    return this.container.peekIndex(index);
  }

  removeIndex(index: number, amount: number): IItem | null {
    if (this.frozen || !this.container.isValidIndex(index)) {
      return null;
    }

    const thing = this.container.removeIndex(index, amount);
    this.__updateParentWeightRecursion(-thing.getWeight());
    thing.setParent(null);

    // Update belt outfit when potion is removed from belt container
    // Check if the container's parent is equipment and specifically a belt container
    const parent = this.getParent();
    if (parent && parent.constructor.name === "Equipment") {
      // This container belongs to equipment, check if it's the belt slot
      const equipment = parent as any;
      const beltItem = equipment.peekIndex(CONST.EQUIPMENT.BELT);
      if (beltItem === this) {
        // This container is the equipped belt, update outfit
        this.__updateBeltOutfit(null); // Pass null to indicate item was removed
      }
    }

    return thing;
  }

  deleteThing(thing: IItem): number {
    if (this.frozen) return -1;

    const index = this.container.deleteThing(thing);
    if (index === -1) return -1;

    this.__updateParentWeightRecursion(-thing.getWeight());
    thing.setParent(null);

    return index;
  }

  addThing(thing: IThing, index: number): boolean {
    if (
      this.frozen ||
      !thing.isPickupable() ||
      !this.container.isValidIndex(index)
    ) {
      return false;
    }

    const maximum = this.getMaximumAddCount(null, thing, index);
    if (maximum === 0 || maximum < thing.count) {
      return false;
    }

    this.container.addThing(thing, index);
    thing.setParent(this);
    this.__updateParentWeightRecursion(thing.getWeight());

    // Update belt outfit when potion is added to belt container
    // Check if the container's parent is equipment and specifically a belt container
    const parent = this.getParent();
    if (parent && parent.constructor.name === "Equipment") {
      // This container belongs to equipment, check if it's the belt slot
      const equipment = parent as any;
      const beltItem = equipment.peekIndex(CONST.EQUIPMENT.BELT);
      if (beltItem === this) {
        // This container is the equipped belt, update outfit
        this.__updateBeltOutfit(thing);
      }
    }

    return true;
  }

  openBy(player: any): void {
    this.container.addSpectator(player);
    player.write(new ContainerOpenPacket(this.id, this.getName(), this.container));
  }

  closeBy(player: any): void {
    this.container.removeSpectator(player);
    player.write(new ContainerClosePacket(this.container.guid));
  }

  getSlots(): (IItem | null)[] {
    return this.container.getSlots();
  }

  getSize(): number {
    return this.container.size;
  }

  getWeight(): number {
    if (this.weight)
      return this.weight + this.__childWeight;
    else
      return 0;
  }

  getPosition(): any {
    return this.getTopParent().position;
  }

  exceedsMaximumChildCount(): boolean {
    return this.__getChildCount() > Container.MAXIMUM_DEPTH;
  }

  getMaximumAddCount(
    player: IPlayer | null,
    thing: IThing,
    index: number
  ): number {
    if (!this.container.isValidIndex(index)) return 0;

    // Check exclusive slot restrictions
    const exclusiveSlots = exclusiveSlotsManager.getContainerSlots(this.id);
    const originalSize = this.container.size - exclusiveSlots.length;
    
    if (index >= originalSize) {
      // This is an exclusive slot, check if the item is allowed
      const exclusiveSlotIndex = index - originalSize;
      const clientId = getGameServer().database.getClientId(thing.id);
      if (!exclusiveSlotsManager.canPlaceItem(this.id, exclusiveSlotIndex, clientId)) {
        return 0;
      }
    }

    if (thing.isContainer()) {
      if (this.__includesSelf(thing) || thing.exceedsMaximumChildCount()) {
        return 0;
      }
    }

    const currentThing = this.container.peekIndex(index);
    if (currentThing === null) {
      return CONFIG.WORLD.MAXIMUM_STACK_COUNT;
    }

    if (
      thing.id === currentThing.id &&
      thing.getPrototype().isStackable() &&
      !this.container.isFull()
    ) {
      return CONFIG.WORLD.MAXIMUM_STACK_COUNT - currentThing.count;
    }

    return 0;
  }

  private __getChildCount(): number {
    let counts: number[] = [];
    this.container.getSlots().forEach((IItem) => {
      if (IItem instanceof Container) {
        counts.push(1 + IItem.__getChildCount());
      }
    });
    return counts.length === 0 ? 1 : Math.max(...counts);
  }

  closeAllSpectators(): boolean {
    this.container.spectators.forEach((player) =>
      player.containerManager.toggleContainer(this)
    );

    this.container.getSlots().forEach((IItem) => {
      if (IItem instanceof Container) {
        IItem.closeAllSpectators();
      }
    });

    return true;
  }

  cleanup(): void {
    this.closeAllSpectators();
    if (this.scheduledDecayEvent) {
      this.scheduledDecayEvent.cancel();
    }
  }

  private __updateParentWeightRecursion(weight: number): void {
    let current: IContainer = this;
    while (!this.isTopParent(current)) {
      current.__updateWeight(weight);
      current = current.getParent();
    }
  }

  __updateWeight(weight: number): void {
    this.__childWeight += weight;
  }

  private __includesSelf(container: IContainer): boolean {
    let current: IContainer = this;
    while (!this.isTopParent(current)) {
      if (current === container) {
        return true;
      }
      current = current.getParent();
    }
    return false;
  }

  private __getParentCount(): number {
    let count = 1;
    let current: any = this.getParent();
    while (!this.isTopParent(current)) {
      count++;
      current = current.getParent();
    }
    return count;
  }

  toJSON(): object {
    this.cleanup();
    return {
      id: this.id,
      actionId: this.actionId,
      duration: this.duration,
      items: this.container.getSlots(),
    };
  }

  getTopParent(): any {
    /*
     * Function Container.getTopParent
     * Returns the top-level parent of the container
     */
    let current: any = this;
    while (!this.isTopParent(current)) {
      current = current.getParent();
    }
    return current;
  }

  // Exclusive slot methods
  isExclusiveSlot(slotIndex: number): boolean {
    const exclusiveSlots = exclusiveSlotsManager.getContainerSlots(this.id);
    const originalSize = this.container.size - exclusiveSlots.length;
    
    // Exclusive slots are at the end of the container
    if (slotIndex >= originalSize) {
      return true;
    }
    return false;
  }

  getAllowedItemTypes(slotIndex: number): string[] {
    const exclusiveSlots = exclusiveSlotsManager.getContainerSlots(this.id);
    const originalSize = this.container.size - exclusiveSlots.length;
    
    if (slotIndex >= originalSize) {
      const exclusiveSlotIndex = slotIndex - originalSize;
      return exclusiveSlotsManager.getAllowedItemTypes(this.id, exclusiveSlotIndex);
    }
    return [];
  }

  getAllowedItemIds(slotIndex: number): number[] {
    const exclusiveSlots = exclusiveSlotsManager.getContainerSlots(this.id);
    const originalSize = this.container.size - exclusiveSlots.length;
    
    if (slotIndex >= originalSize) {
      const exclusiveSlotIndex = slotIndex - originalSize;
      return exclusiveSlotsManager.getAllowedItemIds(this.id, exclusiveSlotIndex);
    }
    return [];
  }

  getSlotName(slotIndex: number): string | null {
    const exclusiveSlots = exclusiveSlotsManager.getContainerSlots(this.id);
    const originalSize = this.container.size - exclusiveSlots.length;
    
    if (slotIndex >= originalSize) {
      const exclusiveSlotIndex = slotIndex - originalSize;
      return exclusiveSlotsManager.getSlotName(this.id, exclusiveSlotIndex);
    }
    return null;
  }

  // Slot type information for packets
  hasExclusiveSlots(): boolean {
    return exclusiveSlotsManager.getContainerSlots(this.id).length > 0;
  }

  getSlotTypeForPacket(slotIndex: number): number {
    const slotName = this.getSlotName(slotIndex);
    return this.getSlotTypeFromName(slotName);
  }

  getAllSlotTypesForPacket(): number[] {
    const slotTypes: number[] = [];
    for (let i = 0; i < this.container.size; i++) {
      slotTypes.push(this.getSlotTypeForPacket(i));
    }
    return slotTypes;
  }

  getPacketSizeWithSlotTypes(): number {
    let size = this.container.getPacketSize();
    if (this.hasExclusiveSlots()) {
      size += this.container.size; // One byte per slot for slot type
    }
    return size;
  }

  private getSlotTypeFromName(slotName: string | null): number {
    if (!slotName) return 0; // Normal slot
    
    const slotTypeMap: { [key: string]: number } = {
      'Rope Slot': 1,
      'Shovel Slot': 2,
      'Pick Slot': 3,
      'Knife Slot': 4,
      'Fishing Rod Slot': 5,
      'Potion Slot': 6,
      'Tool Slot': 7
    };
    return slotTypeMap[slotName] || 0; // 0 = normal slot
  }

  private __updateBeltOutfit(addedItem: IThing | null): void {
    /*
     * Function Container.__updateBeltOutfit
     * Updates the belt outfit when potions are added/removed
     */
    // Find the player who owns this belt container
    const player = this.__findPlayerOwner();
    if (!player) return;

    // Check existing potions in the belt
    const existingHealthPotions = this.container.getSlots().filter(slot => {
      if (!slot) return false;
      const clientId = getGameServer().database.getClientId(slot.id);
      return clientId === 266; // Health potion
    });

    const existingManaPotions = this.container.getSlots().filter(slot => {
      if (!slot) return false;
      const clientId = getGameServer().database.getClientId(slot.id);
      return clientId === 268; // Mana potion
    });

    const existingEnergyPotions = this.container.getSlots().filter(slot => {
      if (!slot) return false;
      const clientId = getGameServer().database.getClientId(slot.id);
      return clientId === 237; // Energy potion
    });

    console.log(`Belt potions - Health: ${existingHealthPotions.length}, Mana: ${existingManaPotions.length}, Energy: ${existingEnergyPotions.length}`);

    // Check if the added item is a potion
    if (addedItem) {
      const addedItemClientId = getGameServer().database.getClientId(addedItem.id);
      console.log(`Adding item with client ID: ${addedItemClientId}`);
      
      if (addedItemClientId === 266) { // Health potion
        // If this is the first health potion, update outfit
        if (existingHealthPotions.length <= 1) {
          player.properties.updateOutfitAddon('healthPotion', 1);
          console.log('Health potion addon set to true');
        } else {
          console.log('Belt already has health potion, skipping outfit update');
        }
      } else if (addedItemClientId === 268) { // Mana potion
        // If this is the first mana potion, update outfit
        if (existingManaPotions.length <= 1) {
          player.properties.updateOutfitAddon('manaPotion', 1);
          console.log('Mana potion addon set to true');
        } else {
          console.log('Belt already has mana potion, skipping outfit update');
        }
      } else if (addedItemClientId === 237) { // Energy potion
        // If this is the first energy potion, update outfit
        if (existingEnergyPotions.length <= 1) {
          player.properties.updateOutfitAddon('energyPotion', 1);
          console.log('Energy potion addon set to true');
        } else {
          console.log('Belt already has energy potion, skipping outfit update');
        }
      }
    } else {
      console.log('Item was removed from belt');
      // Item was removed - check each potion type and update addons accordingly
      
      // Check health potions
      if (existingHealthPotions.length === 0) {
        player.properties.updateOutfitAddon('healthPotion', 0);
        console.log('Health potion addon set to false');
      }
      
      // Check mana potions  
      if (existingManaPotions.length === 0) {
        player.properties.updateOutfitAddon('manaPotion', 0);
        console.log('Mana potion addon set to false');
      }
      
      // Check energy potions
      if (existingEnergyPotions.length === 0) {
        player.properties.updateOutfitAddon('energyPotion', 0);
        console.log('Energy potion addon set to false');
      }
    }
  }

  private __findPlayerOwner(): IPlayer | null {
    /*
     * Function Container.__findPlayerOwner
     * Finds the player who owns this container by traversing up the parent chain
     */
    let current = this.getParent();
    while (current) {
      if (current.constructor.name === "Player") {
        return current as IPlayer;
      }
      current = current.getParent ? current.getParent() : null;
    }
    return null;
  }

}

export default Container;
