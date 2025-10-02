import { IBaseContainer } from "interfaces/IBase-container";
import BaseContainer from "./Cbase-container";
import { ContainerClosePacket, ContainerOpenPacket } from "./Cprotocol";
import { CONFIG, getGameServer } from "./helper/appContext";
import { IContainer, IItem, IThing } from "interfaces/IThing";
import { IPlayer } from "interfaces/IPlayer";
import Item from "./Citem";
import exclusiveSlotsManager from "./utils/exclusive-slots";

class Container extends Item implements IContainer{
  private __childWeight: number = 0;
  public container: BaseContainer;
  public static MAXIMUM_DEPTH: number = 2;

  constructor(id: number, size: number) {
    super(id);

    // Add extra slots for exclusive slots
    const exclusiveSlots = exclusiveSlotsManager.getContainerSlots(id);
    const extraSlots = exclusiveSlots.length;
    const totalSize = size + extraSlots;

    this.container = new BaseContainer(
      getGameServer().world.creatureHandler.assignUID(),
      totalSize
    );
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
          canPlace = exclusiveSlotsManager.canPlaceItem(this.id, exclusiveSlotIndex, thing.id);
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
      if (!exclusiveSlotsManager.canPlaceItem(this.id, exclusiveSlotIndex, thing.id)) {
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
      'Tool Slot': 6
    };
    return slotTypeMap[slotName] || 0; // 0 = normal slot
  }
}

export default Container;
