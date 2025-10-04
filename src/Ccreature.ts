import SpeechHandler from "./Cspeech-handler";
import { ConditionManager } from "./Ccondition-manager";
import { CreatureProperties } from "./Ccreature-properties";
import { EventEmitter } from "./Ceventemitter";
import Outfit from "./Coutfit";
import { CreatureForgetPacket, CreatureStatePacket } from "./Cprotocol";
import { CONFIG, CONST, getGameServer } from "./helper/appContext";
import { getRandomInt } from "./utils/functions";
import { ICreature } from "./interfaces/ICreature";


export default class Creature extends EventEmitter implements ICreature{
  position: any | null;
  properties: CreatureProperties;
  conditions: ConditionManager;
  speechHandler: SpeechHandler;
  public nextMoveTime: number = 0;

  constructor(properties: any) {
    super();

    this.position = null; 
    this.properties = new CreatureProperties(this, properties); 
    this.conditions = new ConditionManager(this); 
    this.speechHandler = new SpeechHandler(this); 
  }

  setProperty(type: number, value: any): void {
    this.properties.setProperty(type, value);
  }

  isFull(type: number): boolean {
    switch (type) {
      case CONST.PROPERTIES.HEALTH:
        return (
          this.getProperty(CONST.PROPERTIES.HEALTH) ===
          this.getProperty(CONST.PROPERTIES.HEALTH_MAX)
        );
      case CONST.PROPERTIES.MANA:
        return (
          this.getProperty(CONST.PROPERTIES.MANA) ===
          this.getProperty(CONST.PROPERTIES.MANA_MAX)
        );
      default:
        return false;
    }
  }

  setFull(type: number): void {
    switch (type) {
      case CONST.PROPERTIES.HEALTH:
        this.setProperty(
          CONST.PROPERTIES.HEALTH,
          this.getProperty(CONST.PROPERTIES.HEALTH_MAX)
        );
        break;
      case CONST.PROPERTIES.MANA:
        this.setProperty(
          CONST.PROPERTIES.MANA,
          this.getProperty(CONST.PROPERTIES.MANA_MAX)
        );
        break;
    }
  }

  getProperty(type: number): any {
    return this.properties.getProperty(type);
  }

  getId(): number {
    return this.properties.getId();
  }

  isDrunk(): boolean {
    return this.conditions.isDrunk();
  }

  faceCreature(creature: Creature): void {
    if (!creature) return;
    this.setDirection(
      this.getPosition().getFacingDirection(creature.getPosition())
    );
  }

  getStepDuration(friction: number): number {
    return this.properties.getStepDuration(friction);
  }

  hasCondition(id: number): boolean {
    return this.conditions.has(id);
  }

  removeCondition(id: number): void {
    this.conditions.remove(id);
  }

  addCondition(id: number, ticks: number, duration: number, properties: number | null): void {
    this.conditions.addCondition(id, ticks, duration, properties);
  }

  // TODO: CHECK THIS
  // getFluidType(): string {
  //   switch (this.getPrototype().fluidType) {
  //     case CONST.BLOODTYPE.BLOOD:
  //       return CONST.FLUID.BLOOD;
  //     case CONST.BLOODTYPE.POISON:
  //       return CONST.FLUID.SLIME;
  //     default:
  //       return CONST.FLUID.BLOOD;
  //   }
  // }

  getTile(): any {
    return getGameServer().world.getTileFromWorldPosition(this.getPosition());
  }

  getChunk(): any {
    return getGameServer().world.getChunkFromWorldPosition(this.getPosition());
  }

  changeOutfit(outfit: Outfit): void {
    if (!outfit.isValid()) return;

    const current = this.properties.getProperty(CONST.PROPERTIES.OUTFIT) as Outfit;
    if (!current) return;

    const updated = current.copy();
    if (updated.equipment && typeof outfit.equipment?.hair === "number") {
        updated.equipment.hair = outfit.equipment.hair;
    }
    updated.details = outfit.details; 

    this.properties.setProperty(CONST.PROPERTIES.OUTFIT, updated);
  }

  getOutfit(): any {
    return this.getProperty(CONST.PROPERTIES.OUTFIT);
  }

  calculateDefense(): number {
    return getRandomInt(0, this.getDefense())
  }

  getDefense(): number {
    return this.getProperty(CONST.PROPERTIES.DEFENSE);
  }

  getAttackSpeed(): number {
    return this.getProperty(CONST.PROPERTIES.ATTACK_SPEED);
  }

  getAttack(): number {
    return this.getProperty(CONST.PROPERTIES.ATTACK);
  }

  calculateDamage(): number {
    return getRandomInt(0, this.getAttack());
  }

  getPosition(): any {
    return this.position;
  }

  leaveOldChunks(oldChunks: any[]): void {
    oldChunks.forEach((chunk) =>
      chunk.internalBroadcast(new CreatureForgetPacket(this.getId()))
    );
  }

  enterNewChunks(newChunks: any[]): void {
    newChunks.forEach((chunk) =>
      chunk.internalBroadcast(new CreatureStatePacket(this))
    );
  }

  canSee(position: any): boolean {
    return position.isVisible(this.getPosition(), 8, 6);
  }

  setPosition(position: any): void {
    this.position = position;
  }

  setDirection(direction: number): void {
    this.properties.setProperty(CONST.PROPERTIES.DIRECTION, direction);
  }

  isWithinRangeOf(creature: Creature, range: number): boolean {
    if (creature.position && this.position)
      return this.position.isWithinRangeOf(creature.position, range);
    return false
  }

  is(name: string): boolean {
    return this.constructor.name === name;
  }

  isWithinChunk(chunk: any): boolean {
    return this.getChunk() === chunk;
  }

  isBesidesThing(thing: any): boolean {
    if (this.position)
      return this.position.besides(thing.getPosition());
    return false;
  }

  isMounted(): boolean {
    // Mount functionality removed - always return false
    return false;
  }

  isZeroHealth(): boolean {
    const health = this.getProperty(CONST.PROPERTIES.HEALTH);
    return health === 0 || health == null;
  }

  isPlayer(): boolean {
    // Use lazy loading to check if the instance is a Player
    const Player = require("./Cplayer").default;
    return this instanceof Player;
  }

  incrementProperty(type: number, amount: number): void {
    this.properties.incrementProperty(type, amount);
  }

  broadcast(packet: any): void {
    const chunk = this.getChunk();
    if (chunk) {
      chunk.broadcast(packet);
    } else {
      console.warn(
        "Cannot broadcast: Chunk is null for creature",
        this.getId()
      );
    }
  }

  broadcastFloor(packet: any): void {
    if (!this.position) return;
    this.getChunk().broadcastFloor(this.position.z, packet);
  }

  isInLineOfSight(other: Creature): boolean {
    if (!other || !this.position) return false;
    return this.position.inLineOfSight(other.getPosition());
  }
}
