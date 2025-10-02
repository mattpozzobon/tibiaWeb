import { IBaseContainer } from "interfaces/IBase-container";
import BaseContainer from "./Cbase-container";
import { ContainerClosePacket, ContainerOpenPacket } from "./Cprotocol";
import { CONFIG, getGameServer } from "./helper/appContext";
import { IContainer, IItem, IThing } from "interfaces/IThing";
import { IPlayer } from "interfaces/IPlayer";
import Item from "./Citem";

class Container extends Item implements IContainer{
  private __childWeight: number = 0;
  public container: BaseContainer;
  public static MAXIMUM_DEPTH: number = 2;

  constructor(id: number, size: number) {
    super(id);

    this.container = new BaseContainer(
      getGameServer().world.creatureHandler.assignUID(),
      size
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

    thing.setParent(this);
    this.container.addFirstEmpty(thing);
    return true;
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
  
}

export default Container;
