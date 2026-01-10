import BaseContainer from "../base-container";
import { ContainerClosePacket, ContainerOpenPacket, BeltPotionQuantitiesPacket } from "../../network/protocol";
import { CONFIG, CONST, getGameServer } from "../../helper/appContext";
import { IContainer, IItem, IThing } from "interfaces/IThing";
import { IPlayer } from "interfaces/IPlayer";
import Item from "../item";
import exclusiveSlotsManager from "../../utils/exclusive-slots";
import DepotContainer from "../depot";

class Container extends Item implements IContainer{
  private __childWeight: number = 0;
  public container: BaseContainer;
  public static MAXIMUM_DEPTH: number = 2;
  private __containerSizePotions: number = 0;

  constructor(id: number, size: number) {
    super(id);

    // Check if containerSizePotions is defined in properties (for belts)
    const proto = this.getPrototype();
    this.__containerSizePotions = proto.properties?.containerSizePotions || 0;
    
    // Get exclusive slots from definitions.json (single source of truth)
    const slotsFromProperties = proto.properties?.exclusiveSlots || [];
    let exclusiveSlots = slotsFromProperties.length > 0 ? slotsFromProperties : exclusiveSlotsManager.getContainerSlots(id);
    
    // Filter out potion slots if containerSizePotions is defined
    let filteredExclusiveSlots = exclusiveSlots;
    if (this.__containerSizePotions > 0) {
      filteredExclusiveSlots = exclusiveSlots.filter((slot: any) => {
        const isPotionSlot = slot.allowedItemTypes?.includes("potion") || slot.name === "Potion Slot";
        return !isPotionSlot;
      });
    }
    
    // Exclusive slots are ADDED to the container size (not replacing slots)
    // So if containerSize is 20 and there are 2 exclusive slots, total is 22
    // Exclusive slots are placed at the end: indices 20, 21, etc.
    const exclusiveSlotsCount = filteredExclusiveSlots.length;
    
    // Total size = base size + potion slots + exclusive slots
    const totalSize = size + this.__containerSizePotions + exclusiveSlotsCount;

    this.container = new BaseContainer(getGameServer().world.creatureHandler.assignUID(), totalSize);
  }

  private __getExclusiveSlotsFromProperties(): any[] {
    /*
     * Function Container.__getExclusiveSlotsFromProperties
     * Returns exclusive slots defined in definitions.json properties, or empty array if not defined
     */
    const proto = this.getPrototype();
    return proto.properties?.exclusiveSlots || [];
  }

  private __getExclusiveSlotsCount(): number {
    /*
     * Function Container.__getExclusiveSlotsCount
     * Returns the count of exclusive slots from config, excluding potion slots if containerSizePotions is defined
     */
    // Get exclusive slots from definitions.json properties (single source of truth)
    const slotsFromProperties = this.__getExclusiveSlotsFromProperties();
    if (slotsFromProperties.length > 0) {
      // If we have containerSizePotions, don't count potion slots
      if (this.__containerSizePotions > 0) {
        const potionSlotsInProperties = slotsFromProperties.filter((slot: any) => 
          slot.allowedItemTypes?.includes("potion") || slot.name === "Potion Slot"
        );
        return slotsFromProperties.length - potionSlotsInProperties.length;
      }
      return slotsFromProperties.length;
    }
    
    // No exclusive slots defined in properties
    return 0;
  }

  private __getExclusiveSlots(): any[] {
    /*
     * Function Container.__getExclusiveSlots
     * Returns all exclusive slots from definitions.json (single source of truth)
     * Filters out potion slots if containerSizePotions is defined
     */
    // Get exclusive slots from definitions.json properties
    const slotsFromProperties = this.__getExclusiveSlotsFromProperties();
    let exclusiveSlots = slotsFromProperties;
    
    // Filter out potion slots if containerSizePotions is defined
    if (this.__containerSizePotions > 0) {
      exclusiveSlots = exclusiveSlots.filter((slot: any) => {
        const isPotionSlot = slot.allowedItemTypes?.includes("potion") || slot.name === "Potion Slot";
        return !isPotionSlot;
      });
    }
    
    return exclusiveSlots;
  }

  private __getExclusiveSlotIndexFromConfig(containerSlotIndex: number): number | null {
    /*
     * Function Container.__getExclusiveSlotIndexFromConfig
     * Returns the slotIndex to use when calling exclusiveSlotsManager methods
     * Exclusive slots are placed at the end of the container, after base size and potion slots
     */
    const baseSize = this.__getBaseSize();
    const exclusiveSlotsStartIndex = baseSize + this.__containerSizePotions;
    
    // Check if this is an exclusive slot (it should be after base size + potion slots)
    if (containerSlotIndex < exclusiveSlotsStartIndex) {
      return null;
    }
    
    // Get all exclusive slots from definitions.json (single source of truth)
    const exclusiveSlots = this.__getExclusiveSlots();
    
    // Filter out potion slots if containerSizePotions is defined
    let filteredExclusiveSlots = exclusiveSlots;
    if (this.__containerSizePotions > 0) {
      filteredExclusiveSlots = exclusiveSlots.filter((slot: any) => {
        const isPotionSlot = slot.allowedItemTypes?.includes("potion") || slot.name === "Potion Slot";
        return !isPotionSlot;
      });
    }
    
    // Calculate which exclusive slot this is (0-based index within exclusive slots)
    const exclusiveSlotIndex = containerSlotIndex - exclusiveSlotsStartIndex;
    
    // Find the config slot at this position
    if (exclusiveSlotIndex >= 0 && exclusiveSlotIndex < filteredExclusiveSlots.length) {
      const configSlot = filteredExclusiveSlots[exclusiveSlotIndex];
      // Return the slotIndex from the config (for item type resolution)
      return configSlot.slotIndex;
    }
    
    return null;
  }

  private __getBaseSize(): number {
    /*
     * Function Container.__getBaseSize
     * Returns the base container size from definitions.json (containerSize property)
     * This is the size before adding potion slots or exclusive slots
     */
    const proto = this.getPrototype();
    return proto.properties?.containerSize || 0;
  }

  private __isPotionSlot(slotIndex: number): boolean {
    /*
     * Function Container.__isPotionSlot
     * Checks if a slot index is a potion slot
     */
    const baseSize = this.__getBaseSize();
    return slotIndex >= baseSize && slotIndex < baseSize + this.__containerSizePotions;
  }

  private __isPotion(item: IThing): boolean {
    /*
     * Function Container.__isPotion
     * Checks if an item is a potion (health, mana, or energy)
     */
    if (!item) return false;
    const clientId = getGameServer().database.getClientId(item.id);
    return clientId === 266 || clientId === 268 || clientId === 237;
  }

  getNumberItems(): number {
    return this.getSlots().filter((x) => x !== null).length;
  }

  addFirstEmpty(thing: IThing): boolean {
    if (this.frozen) return false;

    if (!thing.isPickupable() || this.container.isFull()) {
      return false;
    }

    const baseSize = this.__getBaseSize();

    // Find first empty slot that allows this item
    for (let i = 0; i < this.container.size; i++) {
      if (this.container.peekIndex(i) === null) {
        // Check if this slot allows the item
        let canPlace = true;
        
        if (this.__isPotionSlot(i)) {
          // This is a potion slot, only allow potions
          canPlace = this.__isPotion(thing);
        } else {
          // Check if this is an exclusive slot from config (at any position)
          const configSlotIndex = this.__getExclusiveSlotIndexFromConfig(i);
          if (configSlotIndex !== null) {
            // This is an exclusive slot from config, check if the item is allowed
            const clientId = getGameServer().database.getClientId(thing.id);
            canPlace = this.__canPlaceItemInSlot(i, clientId);
          }
          // If not an exclusive slot, canPlace remains true (normal slot)
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
    this.container.spectators.forEach((player) => {
      if (player && player.containerManager) {
        player.containerManager.checkContainer(this);
      }
    });

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
    if (thing === null) return null;
    
    this.__updateParentWeightRecursion(-thing.getWeight());
    thing.setParent(null);

    // Update belt outfit and potion quantities when potion is removed from belt container
    // Check if the container's parent is equipment and specifically a belt container
    const parent = this.getParent();
    if (parent && parent.constructor.name === "Equipment") {
      // This container belongs to equipment, check if it's the belt slot
      const equipment = parent as any;
      const beltItem = equipment.peekIndex(CONST.EQUIPMENT.BELT);
      if (beltItem === this) {
        // This container is the equipped belt, update outfit and quantities
        this.__updateBeltOutfit(null); // Pass null to indicate item was removed
        this.__updateBeltPotionQuantities(equipment);
      }
    }

    // If this is the mail container, notify inbox to handle removal (unless we're skipping the hook during sync)
    if (!(this as any).__skipRemovalHook && (this.id === DepotContainer.MAIL_CONTAINER_ID || (this.hasUniqueId() && this.uid === 0x10000000))) {
      this.__handleMailContainerItemRemoved(thing);
    }

    return thing;
  }

  private __handleMailContainerItemRemoved(removedItem: IItem): void {
    /*
     * Function Container.__handleMailContainerItemRemoved
     * Called when an item is removed from the mail container (via UI drag/drop)
     * Removes the item from inbox queue and refills container from queue
     */
    // Try to get player from container spectators (players viewing this container)
    // When mail container is opened, players are added as spectators
    const spectators = Array.from(this.container.spectators);
    
    for (const spectator of spectators) {
      if (spectator && spectator.containerManager && spectator.containerManager.inbox) {
        // Found a player with inbox
        const inbox = spectator.containerManager.inbox;
        
        // Remove the item from queue using removeItemFromQueue (which handles property-based matching)
        if (inbox.removeItemFromQueue) {
          inbox.removeItemFromQueue(removedItem);
        }
        break; // Only need to call once
      }
    }
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

    // Allow items to be added to Mail container during sync operations
    // (when __skipRemovalHook flag is set, we're syncing from queue)
    const isMailContainer = this.id === DepotContainer.MAIL_CONTAINER_ID || (this.hasUniqueId() && this.uid === 0x10000000);
    const isSyncing = (this as any).__skipRemovalHook === true;
    
    if (isSyncing && isMailContainer) {
      // During sync, allow adding to mail container if slot is empty
      const currentItem = this.container.peekIndex(index);
      if (currentItem !== null) {
        return false; // Slot is not empty, can't add here
      }
      // Slot is empty, proceed with adding (skip getMaximumAddCount check)
    } else {
      // Normal validation: check getMaximumAddCount for all other cases
      const maximum = this.getMaximumAddCount(null, thing, index);
      if (maximum === 0 || maximum < thing.count) {
        return false;
      }
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
        // Send updated belt potion quantities to UI
        this.__updateBeltPotionQuantities(equipment);
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

    // Prevent items from being added to Mail container (unique ID 0x10000000 or ID 14404)
    if (this.id === DepotContainer.MAIL_CONTAINER_ID || (this.hasUniqueId() && this.uid === 0x10000000)) {
      return 0;
    }

    // Check slot restrictions
    const baseSize = this.__getBaseSize();
    
    if (this.__isPotionSlot(index)) {
      // This is a potion slot, only allow potions
      if (!this.__isPotion(thing)) {
        return 0;
      }
    } else {
      // Check if this is an exclusive slot from config (at any position)
      const configSlotIndex = this.__getExclusiveSlotIndexFromConfig(index);
      if (configSlotIndex !== null) {
        // This is an exclusive slot from config, check if the item is allowed
        const clientId = getGameServer().database.getClientId(thing.id);
        if (!this.__canPlaceItemInSlot(index, clientId)) {
          return 0;
        }
      }
      // If not an exclusive slot, allow normal placement
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
    let current: any = this;
    while (!this.isTopParent(current)) {
      if (current && typeof current.__updateWeight === "function") {
        current.__updateWeight(weight);
      }
      current = current.getParent();
      if (!current) break;
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
    // Check if this container is inside a DepotContainer (special case)
    if ((this as any).__depotParent) {
      return (this as any).__depotParent;
    }
    
    let current: any = this;
    while (!this.isTopParent(current)) {
      current = current.getParent();
      if (!current) break;
    }
    return current;
  }

  // Exclusive slot methods
  isExclusiveSlot(slotIndex: number): boolean {
    // Potion slots and config exclusive slots are considered exclusive
    if (this.__isPotionSlot(slotIndex)) {
      return true;
    }
    // Check if this is an exclusive slot (exclusive slots are at the end)
    const baseSize = this.__getBaseSize();
    const exclusiveSlotsStartIndex = baseSize + this.__containerSizePotions;
    return slotIndex >= exclusiveSlotsStartIndex;
  }

  private __canPlaceItemInSlot(slotIndex: number, itemId: number): boolean {
    /*
     * Function Container.__canPlaceItemInSlot
     * Checks if an item can be placed in a specific slot, checking definitions.json first
     */
    const baseSize = this.__getBaseSize();
    const exclusiveSlotsStartIndex = baseSize + this.__containerSizePotions;
    
    // Check if this is an exclusive slot (exclusive slots are at the end)
    if (slotIndex >= exclusiveSlotsStartIndex) {
      // This is an exclusive slot, find which one
      const exclusiveSlots = this.__getExclusiveSlots();
      const exclusiveSlotIndex = slotIndex - exclusiveSlotsStartIndex;
      
      if (exclusiveSlotIndex >= 0 && exclusiveSlotIndex < exclusiveSlots.length) {
        const configSlot = exclusiveSlots[exclusiveSlotIndex];
        
        // Check if item ID is explicitly allowed
        if (configSlot.allowedItemIds && configSlot.allowedItemIds.includes(itemId)) {
          return true;
        }

        // Check if item type is allowed (use exclusiveSlotsManager to resolve item types)
        if (configSlot.allowedItemTypes) {
          return configSlot.allowedItemTypes.some((typeName: string) => {
            const itemType = exclusiveSlotsManager.getItemType(typeName);
            if (!itemType) {
              console.log(`[Container] Item type "${typeName}" not found in itemTypes map`);
              return false;
            }
            const isAllowed = itemType.itemIds.includes(itemId);
            if (!isAllowed) {
              console.log(`[Container] Item ID ${itemId} not in itemType "${typeName}" itemIds:`, itemType.itemIds);
            }
            return isAllowed;
          });
        }

        return false; // Exclusive slot but item doesn't match restrictions
      }
    }
    
    return true; // No restrictions for this slot (normal slot)
  }

  getAllowedItemTypes(slotIndex: number): string[] {
    if (this.__isPotionSlot(slotIndex)) {
      return ["potion"];
    }
    // Check if this is an exclusive slot (exclusive slots are at the end)
    const baseSize = this.__getBaseSize();
    const exclusiveSlotsStartIndex = baseSize + this.__containerSizePotions;
    
    if (slotIndex >= exclusiveSlotsStartIndex) {
      // This is an exclusive slot, find which one
      const exclusiveSlots = this.__getExclusiveSlots();
      const exclusiveSlotIndex = slotIndex - exclusiveSlotsStartIndex;
      
      if (exclusiveSlotIndex >= 0 && exclusiveSlotIndex < exclusiveSlots.length) {
        const configSlot = exclusiveSlots[exclusiveSlotIndex];
        return configSlot.allowedItemTypes || [];
      }
    }
    return [];
  }

  getAllowedItemIds(slotIndex: number): number[] {
    if (this.__isPotionSlot(slotIndex)) {
      // Return potion client IDs: 266 (health), 268 (mana), 237 (energy)
      return [266, 268, 237];
    }
    // Check if this is an exclusive slot (exclusive slots are at the end)
    const baseSize = this.__getBaseSize();
    const exclusiveSlotsStartIndex = baseSize + this.__containerSizePotions;
    
    if (slotIndex >= exclusiveSlotsStartIndex) {
      // This is an exclusive slot, find which one
      const exclusiveSlots = this.__getExclusiveSlots();
      const exclusiveSlotIndex = slotIndex - exclusiveSlotsStartIndex;
      
      if (exclusiveSlotIndex >= 0 && exclusiveSlotIndex < exclusiveSlots.length) {
        const configSlot = exclusiveSlots[exclusiveSlotIndex];
        return configSlot.allowedItemIds || [];
      }
    }
    return [];
  }

  getSlotName(slotIndex: number): string | null {
    if (this.__isPotionSlot(slotIndex)) {
      return "Potion Slot";
    }
    // Check if this is an exclusive slot (exclusive slots are at the end)
    const baseSize = this.__getBaseSize();
    const exclusiveSlotsStartIndex = baseSize + this.__containerSizePotions;
    
    if (slotIndex >= exclusiveSlotsStartIndex) {
      // This is an exclusive slot, find which one
      const exclusiveSlots = this.__getExclusiveSlots();
      const exclusiveSlotIndex = slotIndex - exclusiveSlotsStartIndex;
      
      if (exclusiveSlotIndex >= 0 && exclusiveSlotIndex < exclusiveSlots.length) {
        const configSlot = exclusiveSlots[exclusiveSlotIndex];
        return configSlot.name || null;
      }
    }
    return null;
  }

  // Slot type information for packets
  hasExclusiveSlots(): boolean {
    // Check if we have potion slots
    if (this.__containerSizePotions > 0) {
      return true;
    }
    // Check if we have exclusive slots from definitions.json
    const exclusiveSlots = this.__getExclusiveSlots();
    return exclusiveSlots.length > 0;
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

  private __updateBeltPotionQuantities(equipment: any): void {
    /*
     * Function Container.__updateBeltPotionQuantities
     * Sends updated belt potion quantities to the player
     */
    const player = this.__findPlayerOwner();
    if (player) {
      player.write(new BeltPotionQuantitiesPacket(equipment));
    }
  }

}

export default Container;
