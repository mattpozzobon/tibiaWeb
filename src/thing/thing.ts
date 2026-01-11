"use strict";

import { TileFlag } from "../utils/bitflag";
import ThingEmitter from "./thing-emitter";
import { CONFIG, CONST, getGameServer } from "../helper/appContext";
import BaseContainer from "../item/base-container";
import { resolveHolder } from "../game/items/item-holder-resolver";
import Equipment from "../item/equipment";

class Thing extends ThingEmitter {
  id: number;
  uid?: number;
  frozen?: boolean;
  weight?: number;
  count: number = 0;
  actionId?: number;
  duration?: number;
  content?: any;
  container?: any;
  size?: any;
  private parent?: any | BaseContainer | null;
  scheduledDecayEvent?: any;
  private prototypeCache: any;

  constructor(id: number) {
    /*
     * Class Thing
     * Base container for things (items, containers, corpses)
     */
    super();
    this.id = id;
    this.prototypeCache = getGameServer().database.getThingPrototype(this.id);
  }

  copyProperties(thing: any): void {
    if (!thing.duration) {
      thing.setDuration(this.getRemainingDuration());
    }
    if (this.uid) {
      thing.setUniqueId(this.uid);
    }
    // Copy content if source has content
    if (this.content !== undefined && this.content !== null) {
      if (typeof thing.setContent === 'function') {
        thing.setContent(this.content);
      } else if ((thing as any).content !== undefined) {
        (thing as any).content = this.content;
      }
    }
    if (this.isContainer() && thing.isContainer()) {
      // Clone items when copying container contents to prevent items from being lost
      // when the source container is deleted (important for mail/parcel system)
      // Note: We don't check size equality - we copy items to matching indices,
      // and if destination is smaller, we only copy what fits
      thing.container.copyContents(this.container, true);
    }
  }

  createFungibleThing(count: number): any | undefined{
    const test = getGameServer().database.createThing(this.id);
    if (test) return test.setCount(count);
  }

  setCount(count: number): any {
    this.count = Math.max(0, Math.min(count, CONFIG.WORLD.MAXIMUM_STACK_COUNT));
    return this;
  }

  getPrototype(): any {
    if (!this.prototypeCache) {
      return getGameServer().database.getThingPrototype(this.id);
    }
    return this.prototypeCache;
  }

  unfreeze(): void {
    this.frozen = false;
  }

  freeze(): void {
    delete this.frozen;
  }

  hasUniqueId(): boolean {
    return !!this.uid;
  }

  isRightAmmunition(ammunition: Thing): boolean {
    return this.getAttribute("ammoType") === ammunition.getAttribute("ammoType");
  }

  getWeight(): number {
    if (!this.isPickupable()) {
      return 0;
    }

    var t = this.getPrototype().isStackable() ? this.weight! * this.count : this.weight!
    return t;
  }

  scheduleDecay(): void {
    if (!this.isDecaying()) return;
    
    // Cancel any existing decay event before scheduling a new one
    if (this.scheduledDecayEvent) {
      this.scheduledDecayEvent.cancel();
      this.scheduledDecayEvent = null;
    }
    
    // Use existing duration if set, otherwise get from prototype
    if (!this.duration) {
      this.setDuration(this.__getDecayProperties().duration);
    }
    
    // Schedule the decay with the duration (should always be set at this point)
    if (this.duration) {
      this.__scheduleDecay(this.duration);
    }
  }

  setActionId(actionId: number): void {
    this.actionId = actionId;
  }

  public setUniqueId(uid: number): void {
    /*
     * Function Thing.setUniqueId
     * Sets the unique identifier of a thing
     */

    // Update the identifier
    this.uid = uid;

    // Fetch unique actions for this identifier
    const uniqueActions: any = getGameServer().database.actionLoader.getUniqueActions(uid);

    // If there are no unique actions, return early
    if (!uniqueActions) {
      return;
    }

    // Add all configured listeners to the thing
    uniqueActions.forEach((action: { on: string; callback: (...args: any[]) => any; }) => this.on(action.on, action.callback));
  }

  setDuration(duration: number): void {
    this.duration = duration;
  }

  setParent(parent: any | BaseContainer | null): void {
    this.parent = parent;
  }

  setContent(content: any): void {
    this.content = content;
  }

  getShootType(): any {
    switch (this.getAttribute("shootType")) {
      case "spear":
        return CONST.EFFECT.PROJECTILE.SPEAR;
      case "bolt":
        return CONST.EFFECT.PROJECTILE.BOLT;
      case "arrow":
        return CONST.EFFECT.PROJECTILE.ARROW;
      case "fire":
        return CONST.EFFECT.PROJECTILE.FIRE;
      case "energy":
        return CONST.EFFECT.PROJECTILE.ENERGY;
      case "poisonarrow":
        return CONST.EFFECT.PROJECTILE.POISONARROW;
      case "burstarrow":
        return CONST.EFFECT.PROJECTILE.BURSTARROW;
      case "throwingstar":
        return CONST.EFFECT.PROJECTILE.THROWINGSTAR;
      case "throwingknife":
        return CONST.EFFECT.PROJECTILE.THROWINGKNIFE;
      case "smallstone":
        return CONST.EFFECT.PROJECTILE.SMALLSTONE;
      case "death":
        return CONST.EFFECT.PROJECTILE.DEATH;
      case "largerock":
        return CONST.EFFECT.PROJECTILE.LARGEROCK;
      case "snowball":
        return CONST.EFFECT.PROJECTILE.SNOWBALL;
      case "powerbolt":
        return CONST.EFFECT.PROJECTILE.POWERBOLT;
      case "poison":
        return CONST.EFFECT.PROJECTILE.POISON;
      default:
        return CONST.EFFECT.PROJECTILE.SPEAR;
    }
  }

  getArticle(): string | null {
    return this.getAttribute("article");
  }

  getPosition(): any {
    const topParent = this.getTopParent();
    if (!topParent) return null;
    
    // If we ARE the top parent (this === topParent), return our position directly to avoid recursion
    // This happens when getPosition() is called on a Tile, Player, or DepotContainer directly
    if (topParent === this) {
      return (this as any).position || null;
    }
    
    // DepotContainer has its own getPosition() method - call it directly
    if (topParent.constructor.name === "DepotContainer" && typeof topParent.getPosition === 'function') {
      return topParent.getPosition();
    }
    
    // For all other top parents (Tile, Player, etc.), access position property directly
    // Don't call getPosition() to avoid infinite recursion (Tile/Player.getPosition() calls getTopParent() again)
    return (topParent as any).position || null;
  }

  getTopParent(): any {
    /*
     * Function Thing.getTopParent
     * Returns the top-level parent of this thing
     * Walks up the parent chain until a top parent (DepotContainer, Tile, or Player) is found
     */
    let current: any = this;
    while (!this.isTopParent(current)) {
      const parent = current.getParent();
      if (!parent) break;
      current = parent;
    }
    return current;
  }

  getAttribute(attribute: string): any {
    const properties = this.getPrototype().properties;
    if (!properties || !properties.hasOwnProperty(attribute)) {
      return null;
    }
    return properties[attribute];
  }

  getName(player?: any): string {
    if (this.constructor.name === "Key" && this.actionId) {
      return `${this.getAttribute("name")} (#${this.actionId})`;
    }
    return this.getAttribute("name");
  }

  getRemainingDuration(): number {
    if (!this.isDecaying()) {
      return this.duration!;
    }
    return Math.floor(
      1e-3 * CONFIG.SERVER.MS_TICK_INTERVAL * this.scheduledDecayEvent.remainingFrames()
    );
  }

  getType(): any {
    return Object.getPrototypeOf(this);
  }

  getDescription(): string {
    if (this.getAttribute("showduration")) {
      return this.duration ? this.getDurationString() : "It is brand-new.";
    } 

    return this.getAttribute("description");
  }

  getDurationString(): string {
    const remainingSeconds = this.getRemainingDuration();
    const minutes = Math.ceil(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    if (remainingSeconds > 60) {
      return this.isDecaying()
        ? `It will decay in ${minutes} minutes and ${seconds} seconds.`
        : `It has ${minutes} minutes and ${seconds} seconds remaining.`;
    }
    return this.isDecaying()
      ? `It will decay in ${remainingSeconds} seconds.`
      : `It has ${remainingSeconds} seconds remaining.`;
  }

  getCount(): number {
    if (this.isFluidContainer() || this.getPrototype().isStackable() || this.isSplash()) {
      return this.count;
    }
    return 0;
  }

  hasActionId(): boolean {
    return this.hasOwnProperty("actionId");
  }

  delete(): void {
    this.remove();
    this.cleanup();
  }

  remove(): number {
    return this.parent!.deleteThing(this, 0);
  }

  replace(thing: any): any {
    this.copyProperties(thing);
    this.parent?.addThing(thing, this.remove());
    this.cleanup();
    return thing;
  }

  // Expertise Door
  forceReplace(): void {
    const newThing = getGameServer().database.createThing(this.id); 
    const c = this.parent!.peekIndex(0)
    if (this.actionId && newThing) {
      newThing.setActionId(this.actionId);
    }
    if (newThing) {
      c.remove();
      this.parent?.addThing(newThing, 0);
    }
  }

  rotate(): void {
    if (!this.isRotateable()) return;
    const t = getGameServer().database.createThing(this.getAttribute("rotateTo"))
    if (t)
      this.replace(t);
    else
      console.log('Error in Rotate');
  }

  removeCount(count: number): void {
    if (!this.prototypeCache.isStackable()) {
      this.remove();
      return;
    }

    // Try to use this.parent (should work now since we keep parent set during stack splits)
    const itemParent = this.parent;
    if (!itemParent) {
      return;
    }

    // Resolve parent to IItemHolder and find item index
    try {
      const holder = resolveHolder(itemParent as any | any | Equipment);
      let index: number | null = null;

      // Find the item's index efficiently based on holder type
      if (holder.kind === "tile") {
        // For tiles, use itemStack.getItems() directly for efficient lookup
        const tile = itemParent as any;
        const items = tile.itemStack?.getItems();
        if (items) {
          index = items.indexOf(this);
        }
      } else if (holder.kind === "container") {
        // For containers, use container.slots directly
        const container = itemParent as any;
        const slots = container.container?.slots;
        if (slots) {
          index = slots.indexOf(this);
        }
      } else if (holder.kind === "equipment") {
        // For equipment, use container.slots directly
        const equipment = itemParent as any;
        const slots = equipment.container?.slots;
        if (slots) {
          index = slots.indexOf(this);
        }
      }

      // If we found the index, use holder to remove the item
      if (index !== null && index >= 0) {
        holder.removeItemAt(index, count);
        return;
      }

      // Fallback: search through slots if direct index lookup failed
      for (let i = 0; i < holder.capacity(); i++) {
        const item = holder.getItem(i);
        if (item === (this as any)) {
          holder.removeItemAt(i, count);
          return;
        }
      }
    } catch (error) {
      // If resolveHolder fails (e.g., parent is not a supported type), fall back to old logic
      if ((itemParent as any).removeIndex && (itemParent as any).itemStack) {
        const items = (itemParent as any).itemStack.getItems();
        const index = items.findIndex((item: any) => item === this || (item && item.id === this.id));
        if (index !== -1) {
          (itemParent as any).removeIndex(index, count);
          return;
        }
      }
    }
    
    // Last resort: remove the entire item
    this.remove();
  }

  private __scheduleDecay(duration: number): void {
    const properties = this.__getDecayProperties();
    if (properties.decayTo === 0) {
      this.scheduledDecayEvent = getGameServer().world.eventQueue.addEventSeconds(
        this.remove.bind(this),
        duration
      );
    } else {
      this.scheduledDecayEvent = getGameServer().world.eventQueue.addEventSeconds(
        this.__decayCallback.bind(this, properties.decayTo),
        duration
      );
    }
  }

  private __decayCallback(id: number): void {
    const thing = getGameServer().database.createThing(id);
    if (thing){
      if (this.isSplash()) {
        thing.setCount(this.count);
      }
      if (this.isDecaying()) {
        thing.setDuration(this.__getDecayProperties().duration);
      }
      this.replace(thing);
    }
  }

  isTopParent(thing: any): boolean {
    return (
      !thing ||
      thing.constructor.name === "DepotContainer" ||
      thing.constructor.name === "Tile" ||
      thing.constructor.name === "Player"
    );
  }

  private __getDecayProperties(): { decayTo: number; duration: number } {
    const proto = this.getPrototype();
    return {
      decayTo: Number(proto.properties.decayTo),
      duration: Number(proto.properties.duration),
    };
  }

  getParent(): any {
    return this.parent;
  }

  isMagicDoor(): boolean {
    return this.prototypeCache.isDoor() && (!!this.getAttribute("expertise") || !!this.getAttribute("unwanted"));
  }

  isDoor(): boolean {
    return this instanceof (require('../item/door').default);
  }

  isItem(): boolean {
    return this instanceof (require('../item/item').default);
  }

  getTrashEffect(): any {
    switch (this.getAttribute("effect")) {
      case "fire":
        return CONST.EFFECT.MAGIC.HITBYFIRE;
      case "bluebubble":
        return CONST.EFFECT.MAGIC.LOSEENERGY;
      default:
        return CONST.EFFECT.MAGIC.POFF;
    }
  }

  getChangeOnUnequip(): any {
    return this.getAttribute("transformDeEquipTo");
  }

  getChangeOnEquip(): any {
    return this.getAttribute("transformEquipTo");
  }

  hasContent(): boolean {
    return typeof this.content === "string";
  }

  getContent(): any {
    if (this.content === undefined || this.content === null) {
      return "";
    }
    return `${this.content}`;
  }

  isBlockPathfind(): boolean {
    return this.hasFlag(TileFlag.prototype.flags.FLAG_BLOCK_PATHFIND);
  }

  isBlockSolid(): boolean {
    return this.hasFlag(TileFlag.prototype.flags.FLAG_BLOCK_SOLID);
  }

  isDistanceReadable(): boolean {
    return this.getPrototype().isDistanceReadable();
  }

  isTrashholder(): boolean {
    return this.getPrototype().isTrashholder();
  }

  isRotateable(): boolean {
    return this.getPrototype().isRotateable();
  }

  isHangable(): boolean {
    return this.hasFlag(TileFlag.prototype.flags.FLAG_HANGABLE);
  }

  isHorizontal(): boolean {
    return this.isHangable() && this.hasFlag(TileFlag.prototype.flags.FLAG_HORIZONTAL);
  }

  isVertical(): boolean {
    return this.isHangable() && this.hasFlag(TileFlag.prototype.flags.FLAG_VERTICAL);
  }

  isBlockProjectile(): boolean {
    return this.hasFlag(TileFlag.prototype.flags.FLAG_BLOCK_PROJECTILE);
  }

  isDecaying(): boolean {
    return this.getAttribute("decayTo") !== null;
  }

  isPickupable(): boolean {
    /*
     * Function Thing.isPickupable
     * Returns true if the item can be picked up
     */
    return this.getPrototype().isPickupable();
  }
  
  isReadable(): boolean {
    /*
     * Function Thing.isReadable
     * Returns true if the thing is readable
     */
    return this.getPrototype().isReadable();
  }

  isWriteable(): boolean {
    /*
     * Function Thing.isWriteable
     * Returns true if the thing is writeable
     */
    return this.getAttribute("writeable") === true;
  }
  
  isDistanceWeapon(): boolean {
    /*
     * Function Thing.isDistanceWeapon
     * Returns true if the thing is a distance weapon
     */
    return this.getAttribute("weaponType") === "distance";
  }
  
  isDepot(): boolean {
    /*
     * Function Thing.isDepot
     * Returns true if the thing is a depot
     */
    return this.getPrototype().isDepot();
  }
  
  isContainer(): this is any {
    /*
     * Function Thing.isContainer
     * Returns true if the thing is a container and narrows the type to Container
     */
    return this.getPrototype().isContainer();
  }
  
  isTeleporter(): boolean {
    /*
     * Function Thing.isTeleporter
     * Returns true if the thing is a teleporter
     */
    return this.getPrototype().isTeleporter();
  }
  
  isMailbox(): boolean {
    /*
     * Function Thing.isMailbox
     * Returns true if the thing is a mailbox
     */
    return this.getPrototype().isMailbox();
  }
  
  isMagicField(): boolean {
    /*
     * Function Thing.isMagicField
     * Returns true if the thing is a magic field
     */
    return this.getPrototype().isMagicField();
  }
  
  isSplash(): boolean {
    /*
     * Function Thing.isSplash
     * Returns true if the thing is a splash
     */
    return this.getPrototype().isSplash();
  }

  isStackable(): boolean {
    /*
     * Function Thing.isSplash
     * Returns true if the thing is a splash
     */
    return this.getPrototype().isStackable();
  }
  
  isFluidContainer(): boolean {
    /*
     * Function Thing.isFluidContainer
     * Returns true if the thing is a fluid container
     */
    return this.getPrototype().isFluidContainer();
  }
  
  hasFlag(flag: number): boolean{
    /*
     * Function Thing.hasFlag
     * Returns true if the flag in the prototype is set
     */
    try {
      return this.getPrototype().flags.get(flag);
    } catch (e) {   
      return false;
    }
  }
  
  cleanup(): void {
    /*
     * Function Thing.cleanup
     * Cleans up a thing, e.g., cancels scheduled events
     */
    if (this.scheduledDecayEvent) {
      this.scheduledDecayEvent.cancel();
    }
  }

}

export default Thing;
