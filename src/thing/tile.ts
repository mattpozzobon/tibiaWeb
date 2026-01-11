import { BitFlag, OTBBitFlag, TileFlag } from "../utils/bitflag";

import ItemStack from "../item/item-stack";
import PathfinderNode from "../pathfinder/pathfinder-node";
import { TilePacket, ItemAddPacket, ItemRemovePacket } from "../network/protocol";
import { getGameServer, CONST, CONFIG } from "../helper/appContext";
import Thing from "../thing/thing";
import Door from "item/door";

class Tile extends Thing {
  position: any;
  itemStack?: ItemStack;
  creatures?: Set<any>;
  neighbours?: Tile[];
  tilezoneFlags?: InstanceType<typeof TileFlag>;;
  pathfinderNode?: PathfinderNode;

  constructor(id: number, position: any) {
    super(id);
    this.position = position;
  }

  getFriction(): number {
    return this.getAttribute("friction") || 100;
  }

  broadcastNeighbours(packet: any): void {
    this.neighbours?.forEach((tile) => tile.writePlayers(packet));
  }

  distanceManhattan(other: Tile): number {
    return this.position.manhattanDistance(other.position);
  }

  writePlayers(packet: any): void {
    this.neighbours?.forEach(tile => tile.writePlayers(packet));
  }

  isHouseTile(): boolean {
    return this.hasOwnProperty("house");
  }

  addCreature(creature: any): void {
    creature.position = this.position;
    if (creature.isPlayer() && this.isProtectionZone()) {
      if (creature.isInCombat()) {
        creature.combatLock.unlock();
      }
      creature.actionHandler.targetHandler.setTarget(null);
    }
    this.creatures = this.creatures ?? new Set();
    this.creatures.add(creature);
  }

  eliminateItem(thing: Thing): void {
    getGameServer().world.sendMagicEffect(this.position, CONST.EFFECT.MAGIC.POFF);
    thing.cleanup();
  }

  addThing(thing: Thing, index: number): void {
    if(!this.hasOwnProperty("itemStack")) {
      this.itemStack = new ItemStack();
    }

    if(!this.itemStack?.isValidIndex(index)) {
      return;
    }
    // Guard: tile is full
    if(this.isFull()) {
      return this.eliminateItem(thing);
    }
    // Do not allow items to be added on expertise doors
    if(this.itemStack.hasMagicDoor()) {
      return;
    }

    if (this.itemStack.hasMagicDoor()) return;

    if (thing.isMagicDoor()) {
      const door = thing as Door;
      if (door.isOpened()) {
        this.once("exit", door.close.bind(door));
      }
    }

    thing.setParent(this);
    const currentThing = this.peekIndex(index);
    if (currentThing && thing.isStackable() && currentThing.id === thing.id && (currentThing.count + thing.count <= CONFIG.WORLD.MAXIMUM_STACK_COUNT)) {
      return this.__addStackable(index, currentThing, thing);
    }
    
    if(!this.hasOwnProperty("itemStack")) {
      this.itemStack = new ItemStack();
    }

    this.itemStack.addThing(index, thing);
    this.broadcast(new ItemAddPacket(this.position, thing, index));
  }

  addTopThing(thing: Thing): void {
    this.addThing(thing, ItemStack.TOP_INDEX);
  }

  hasElevation(): boolean {
    return this.itemStack?.hasElevation() ?? false;
  }

  hasDestination(): boolean {
    if(this.__getFloorChange() !== null) {
      return true;
    }
    
    if(!this.hasItems()) {
      return false;
    }
    
    return this.itemStack?.getTeleporterDestination() !== null;
  }

  replaceTile(id: number): void {
    this.id = id;
    if (this.isDecaying()) this.scheduleDecay();
    this.broadcast(new TilePacket(this.position, id));
  }

  getItems(): Thing[] {
    return this.itemStack?.getItems() ?? [];
  }

  getScore(): number {
    return this.pathfinderNode?.getScore() ?? 0;
  }

  getTileWeight(current: Thing): number {
    if(this.getPosition().isDiagonal(current.getPosition())) {
      return 3 * this.getFriction();
    }
  
    return this.getFriction(); 
  }

  getNumberCharacters(): number {
    return this.creatures?.size ?? 0;
  }

  __getFloorChange(): string | null {
    const floorChange = this.getAttribute("floorchange");
    return floorChange ?? this.itemStack?.getFloorChange() ?? null;
  }

  enablePathfinding(): void {
    this.pathfinderNode = new PathfinderNode();
  }

  disablePathfinding(): void {
    delete this.pathfinderNode;
  }

  setZoneFlags(flags: number): void {
    this.tilezoneFlags = new TileFlag(flags);
  }

  isNoLogoutZone(): boolean {
    return this.tilezoneFlags?.get(TileFlag.prototype.flags.TILESTATE_NOLOGOUT) ?? false;
  }

  isProtectionZone(): boolean {
    return this.tilezoneFlags?.get(TileFlag.prototype.flags.TILESTATE_PROTECTIONZONE) ?? false;
  }

  isBlockSolid(): boolean {
    return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_BLOCK_SOLID);
  }

  deleteIndex(index: number): Thing | null {
    const thing = this.peekIndex(index);
    if (thing === null) {
      return null;
    }
    this.__deleteThing(thing, index);
    thing.cleanup();
    return thing;
  }
  
  deleteThing(thing: Thing, count: number): number {
    if (!this.hasItems()) {
      return -1;
    }

    const index = this.itemStack?.getItems().indexOf(thing) ?? -1;
    if (index === -1) {
      return -1;
    }
    
    this.__deleteThing(thing, index);
    return index;
  }
  
  removeIndex(index: number, amount: number): Thing | null {
    const thing = this.peekIndex(index);
  
    if (thing === null) {
      return null;
    }
  
    if (!thing.isStackable()) {
      this.__deleteThing(thing, index);
      return thing;
    }
  
    return this.__deleteThingStackableItem(index, thing, amount);
  }
  
  __deleteThingStackableItem(index: number, currentItem: Thing, count: number): Thing | null {
    if (count > currentItem.count) {
      return null;
    }
  
    if (count === currentItem.count) {
      this.__deleteThing(currentItem, index);
      return currentItem;
    }
  
    return this.__handleSplitStack(index, currentItem, count);
  }
  
  __handleSplitStack(index: number, currentItem: Thing, count: number): Thing | null{
    this.__replaceFungibleItem(index, currentItem, currentItem.count - count);
    const item = currentItem.createFungibleThing(count);
    if (item)
      return item;
    return null
  }
  
  __addStackable(index: number, currentItem: Thing, thing: Thing): void {
    const overflow = currentItem.count + thing.count - CONFIG.WORLD.MAXIMUM_STACK_COUNT;
  
    if (overflow > 0) {
      this.__splitStack(index, currentItem, overflow);
    } else {
      this.__replaceFungibleItem(index, currentItem, currentItem.count + thing.count);
    }
  }
  
  __splitStack(index: number, currentItem: Thing, overflow: number): void {
    this.__replaceFungibleItem(index, currentItem, CONFIG.WORLD.MAXIMUM_STACK_COUNT);
    const item = currentItem.createFungibleThing(overflow)
    if (item)
      this.addTopThing(item);
  }
  
  __replaceFungibleItem(index: number, thing: Thing, count: number): void {
    this.__deleteThing(thing, index);

    const item = thing.createFungibleThing(count)
    if (item)
      this.addTopThing(item);
  }
  
  isBlockProjectile(): boolean {
    return this.itemStack?.isBlockProjectile() ?? false;
  }
  
  __deleteThing(thing: Thing, index: number): void {
    if (!this.hasItems()) {
      return;
    }
  
    this.itemStack?.deleteThing(index);
    this.broadcast(new ItemRemovePacket(this.position, index, thing.getCount()));
  }

  hasItems(): boolean {
    return !!this.itemStack;
  }

  isOccupied(): boolean {
    if (this.isBlockSolid()) {
      return true;
    }
    return this.hasItems() && this.itemStack!.isBlockSolid();
  }
  
  isOccupiedAny(): boolean {
    return this.isOccupied() || this.isOccupiedCharacters();
  }
  
  isOccupiedCharacters(): boolean {
    if (this.creatures && this.creatures?.size > 0)
      return true;
    return false;
  }
  
  getTopItem(): Thing | null {
    return this.hasItems() ? this.itemStack!.getTopItem() : null;
  }
  
    getMaximumAddCount(player: any, item: Thing, index: number): number {
    if (!this.hasItems()) {
      return CONFIG.WORLD.MAXIMUM_STACK_COUNT;
    }

    if (!this.itemStack!.isValidIndex(index)) {
      return 0;
    }

    if (this.isHouseTile() && !player.ownsHouseTile(this)) {
      return 0;
    }

    if (this.isTrashholder()) {
      return CONFIG.WORLD.MAXIMUM_STACK_COUNT;
    }

    if (this.isFull()) {
      return 0;
    }

    if (this.itemStack!.hasMagicDoor()) {
      return 0;
    }
  
    const thing = this.peekIndex(index);
    if (!thing) {
      return CONFIG.WORLD.MAXIMUM_STACK_COUNT;
    }

    if (thing.id === item.id && thing.isStackable()) {
      return this.isFull() ? CONFIG.WORLD.MAXIMUM_STACK_COUNT - thing.count : CONFIG.WORLD.MAXIMUM_STACK_COUNT;
    }

    return CONFIG.WORLD.MAXIMUM_STACK_COUNT
  }

  getAddCount(): number {
    const number = this.itemStack?.getItems().length
    return number ? ItemStack.MAX_CAPACITY - number : 0;
  }
  
  getCreature(): any {
    if (!this.hasOwnProperty("creatures") || !this.creatures) {
      return null;
    }
    
    return this.creatures.values().next().value;
  } 

  peekIndex(index: number): Thing | null {
    /*
     * Function Tile.peekIndex
     * Peeks at the item at the specified index
     */
    if (!this.hasItems()) {
      return null;
    }
  
    return this.itemStack!.peekIndex(index);
  }
  
  scheduleDecay(): void {
    /*
     * Function Tile.scheduleDecay
     * Schedules a decay event for the tile
     */
    const properties = this.getTileDecayProperties();
  
    getGameServer().world.eventQueue.addEvent(
      this.replaceTile.bind(this, properties.decayTo),
      properties.duration
    );
  }
  
  getTileDecayProperties(): { decayTo: number; duration: number } {
    /*
     * Function Tile.getTileDecayProperties
     * Retrieves the properties for decaying tiles
     */
    // Example implementation: Replace with the actual logic if it differs
    return {
      decayTo: this.getAttribute("decayTo"),
      duration: this.getAttribute("decayDuration"),
    };
  }
  
  getDestination(): any {
    /*
     * Function Tile.getDestination
     * Handles a floor change event by stepping on a floor change tile
     */
    let destination = this.itemStack?.getTeleporterDestination();
  
    if (destination) {
      return destination;
    }
  
    const floorChange = this.__getFloorChange();
    if (!floorChange) {
      return null;
    }
  
    switch (floorChange) {
      case "north":
        return this.position.north().up();
      case "west":
        return this.position.west().up();
      case "east":
        return this.position.east().up();
      case "south":
        return this.position.south().up();
      case "down":
        return this.__getInverseFloorChange();
      default:
        return null;
    }
  }
  
  __getInverseFloorChange(): any {
    /*
     * Function Tile.__getInverseFloorChange
     * When a tile is specified to move you down, this function determines the corresponding upward movement
     */
    const tileBelow = getGameServer().world.getTileFromWorldPosition(
      this.position.down()
    );
  
    if (!tileBelow) {
      return null;
    }
  
    const floorChange = tileBelow.__getFloorChange();
    switch (floorChange) {
      case "north":
        return tileBelow.position.south();
      case "west":
        return tileBelow.position.east();
      case "east":
        return tileBelow.position.west();
      case "south":
        return tileBelow.position.north();
      default:
        return tileBelow.position;
    }
  }

  broadcast(packet: any): void {
    /*
     * Function Tile.broadcast
     * Sends a message to the parent chunk or spectators
     */
    this.getChunk().broadcast(packet);
  }
  
  getChunk(): any {
    /*
     * Function Tile.getChunk
     * Retrieves the chunk where the tile resides
     */
    return getGameServer().world.getChunkFromWorldPosition(this.position);
  }
  
  removeCreature(creature: any): void {
    /*
     * Function Tile.removeCreature
     * Removes a creature's reference from the tile
     */
    this.creatures?.delete(creature);
    this.emit("exit", creature);
    if (this.creatures?.size === 0) {
      delete this.creatures;
    }
  }
  
  isTrashholder(): boolean {
    /*
     * Function Tile.isTrashholder
     * Checks if the tile is a trash holder
     */
    if (this.id === 0) {
      return false;
    }
  
    if (this.getPrototype().isTrashholder()) {
      return true;
    }
  
    return this.hasItems() && this.itemStack!.isTrashholder();
  }
  
  deleteThingStackableItem(index: number, currentItem: Thing, count: number): Thing | null {
    /*
     * Function Tile.deleteThingStackableItem
     * Removes a stackable item based on count
     */
    if (count > currentItem.count) {
      return null;
    }
  
    if (count === currentItem.count) {
      this.__deleteThing(currentItem, index);
      return currentItem;
    }
  
    return this.handleSplitStack(index, currentItem, count);
  }
  
  handleSplitStack(index: number, currentItem: Thing, count: number): Thing | null{
    /*
     * Function Tile.handleSplitStack
     * Handles splitting a stack of items
     */
    this.replaceFungibleItem(index, currentItem, currentItem.count - count);
    const item = currentItem.createFungibleThing(count);
    if (item)
      return item;
    return null
  }
  
  splitStack(index: number, currentItem: Thing, overflow: number): void {
    /*
     * Function Tile.splitStack
     * Splits stackable items when overflow occurs
     */
    this.replaceFungibleItem(index, currentItem, CONFIG.WORLD.MAXIMUM_STACK_COUNT);
    const item = currentItem.createFungibleThing(overflow);
    if (item)
      this.addTopThing(item);
  }
  
  replaceFungibleItem(index: number, thing: Thing, count: number): void {
    /*
     * Function Tile.replaceFungibleItem
     * Replaces stackable items with a modified count
     */
    this.__deleteThing(thing, index);
    const item = thing.createFungibleThing(count)
    if (item)
      this.addTopThing(item);
  }
  
  isFull(): boolean {
    /*
     * Function Tile.isFull
     * Checks if the tile’s item stack is full
     */
    return this.itemStack?.isFull() ?? false;
  }  
  
}

export default Tile;
