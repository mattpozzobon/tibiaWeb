"use strict";

import { IContainer, IThing } from "../interfaces/IThing";
import { TileFlag } from "../utils/bitflag";
import ThingEmitter from "./thing-emitter";
import { CONFIG, CONST, getGameServer } from "../helper/appContext";
import { IThingPrototype } from "interfaces/IThing-prototype";
import { IPosition } from "interfaces/IPosition";
import ITile from "interfaces/ITile";
import BaseContainer from "../item/base-container";

class Thing extends ThingEmitter implements IThing{
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
  private parent?: ITile | BaseContainer | null;
  scheduledDecayEvent?: any;
  private prototypeCache: IThingPrototype;

  constructor(id: number) {
    /*
     * Class Thing
     * Base container for things (items, containers, corpses)
     */
    super();
    this.id = id;
    this.prototypeCache = getGameServer().database.getThingPrototype(this.id);
  }

  copyProperties(thing: IThing): void {
    if (!thing.duration) {
      thing.setDuration(this.getRemainingDuration());
    }
    if (this.uid) {
      thing.setUniqueId(this.uid);
    }
    if (this.isContainer() && thing.isContainer() && this.size === thing.size) {
      thing.container.copyContents(this.container);
    }
  }

  createFungibleThing(count: number): IThing | undefined{
    const test = getGameServer().database.createThing(this.id);
    if (test) return test.setCount(count);
  }

  setCount(count: number): IThing {
    this.count = Math.max(0, Math.min(count, CONFIG.WORLD.MAXIMUM_STACK_COUNT));
    return this;
  }

  getPrototype(): IThingPrototype {
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
    if (!this.duration) {
      this.setDuration(this.__getDecayProperties().duration);
    } else
      this.__scheduleDecay(this.duration);
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

  setParent(parent: ITile | BaseContainer | null): void {
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

  getPosition(): IPosition {
    return this.getTopParent().position;
  }

  getTopParent(): any {
    let current: any = this;
    while (!this.isTopParent(current)) {
      current = current.getParent();
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

  replace(thing: IThing): IThing {
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
    } else {
      this.parent?.deleteThing(this, count);
    }
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
    return `\n ${this.content}`;
  }

  isBlockPathfind(): boolean {
    return this.hasFlag(TileFlag.prototype.flags.FLAG_BLOCK_PATHFIND);
  }

  isBlockSolid(): boolean {
    return this.hasFlag(TileFlag.prototype.flags.FLAG_BLOCK_SOLID);
  }

  isDistanceReadable(): boolean {
    return this.hasFlag(TileFlag.prototype.flags.FLAG_ALLOWDISTREAD);
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
  
  isContainer(): this is IContainer {
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
