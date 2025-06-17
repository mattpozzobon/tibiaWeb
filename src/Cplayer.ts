import Creature from "./Ccreature";
import ChannelManager from "./Cchannel-manager";
import ContainerManager from "./Ccontainer-manager";
import Corpse from "./Ccorpse";
import { Friendlist } from "./Cfriendlist";
import ActionHandler from "./Cplayer-action-handler";
import CombatLock from "./Cplayer-combat-lock";
import { PlayerIdleHandler } from "./Cplayer-idle-handler";
import PlayerMovementHandler from "./Cplayer-movement-handler";
import { SocketHandler } from "./Cplayer-socket-handler";
import UseHandler from "./Cplayer-use-handler";
import { Position } from "./Cposition";
import { CancelMessagePacket, ContainerClosePacket, ContainerOpenPacket, CreaturePropertyPacket, CreatureStatePacket, EmotePacket } from "./Cprotocol";

import { CONST, getGameServer } from "./helper/appContext";
import { IChannelManager, IPlayer } from "./interfaces/IPlayer";
import { IActionHandler } from "./interfaces/IPlayer-action-handler";
import { IPlayerMovementHandler } from "./interfaces/IPlayer-movement-handler";
import { IPlayerIdleHandler } from "./interfaces/IPlayer-idle-handler";
import { IUseHandler } from "./interfaces/IPlayer-use-handler";
import { ICombatLock } from "./interfaces/IPlayer-combat-lock";
import { ISpellbook } from "./interfaces/ISpellbook";
import { IContainerManager } from "./interfaces/IContainer-manager";
import { IFriendlist } from "./interfaces/IFriendlist";
import { ISkills } from "./interfaces/ISkils";
import { IPosition } from "./interfaces/IPosition";
import { ISocketHandler } from "./interfaces/IPlayer-socket-handler";
import { Spellbook } from "./Cspellbook";
import { Skills } from "./Cskills";


export default class Player extends Creature implements IPlayer{
  public templePosition: IPosition;
  public skills: ISkills;
  public socketHandler: ISocketHandler;
  public friendlist: IFriendlist;
  public containerManager: IContainerManager;
  public spellbook: ISpellbook;
  public idleHandler: IPlayerIdleHandler;
  public movementHandler: IPlayerMovementHandler;
  public channelManager: IChannelManager;
  public actionHandler: IActionHandler;
  public combatLock: ICombatLock;
  public useHandler: IUseHandler;
  public lastVisit: number;
  public attackMode: number;

  constructor(data: any) {
    super(data.properties);

    this.templePosition = Position.fromLiteral(data.templePosition);
    this.addPlayerProperties(data.properties);
    this.socketHandler = new SocketHandler(this);
    this.skills = new Skills(this, data.skills);
    this.friendlist = new Friendlist(data.friends);
    this.containerManager = new ContainerManager(this, data.containers);
    this.spellbook = new Spellbook(this, data.spellbook);
    this.idleHandler = new PlayerIdleHandler(this);
    this.movementHandler = new PlayerMovementHandler(this);
    this.channelManager = new ChannelManager();
    this.actionHandler = new ActionHandler(this);
    this.combatLock = new CombatLock(this);
    this.useHandler = new UseHandler(this);
    this.attackMode = 0;
    this.lastVisit = data.lastVisit;
  }

  private addPlayerProperties(properties: any): void {
    this.properties.add(CONST.PROPERTIES.MOUNTS, properties.availableMounts);
    this.properties.add(CONST.PROPERTIES.OUTFITS, properties.availableOutfits);
    this.properties.add(CONST.PROPERTIES.SEX, properties.sex);
    this.properties.add(CONST.PROPERTIES.ROLE, properties.role);
    this.properties.add(CONST.PROPERTIES.VOCATION, properties.vocation);
    this.properties.add(CONST.PROPERTIES.ENERGY, properties.energy);
    this.properties.add(CONST.PROPERTIES.ENERGY_MAX, properties.maxEnergy);
    this.properties.add(CONST.PROPERTIES.CAPACITY, properties.maxCapacity);
    this.properties.add(CONST.PROPERTIES.CAPACITY_MAX, properties.maxCapacity);
    this.properties.add(CONST.PROPERTIES.MANA, properties.mana);
    this.properties.add(CONST.PROPERTIES.MANA_MAX, properties.maxMana);
    this.properties.add(CONST.PROPERTIES.HEALTH, properties.health);
    this.properties.add(CONST.PROPERTIES.HEALTH_MAX, properties.maxHealth);
  }

  isGod(): boolean {
    return this.getProperty(CONST.PROPERTIES.ROLE) === CONST.ROLES.GOD
  }

  getTarget(): any {
    return this.actionHandler.targetHandler.getTarget();
  }

  getTextColor(): number {
    return this.getProperty(CONST.PROPERTIES.ROLE) === CONST.ROLES.GOD
      ? CONST.COLOR.RED
      : CONST.COLOR.YELLOW;
  }

  getLevel(): number {
    return this.skills.getSkillLevel(CONST.PROPERTIES.EXPERIENCE);
  }

  // TODO
  // setLevel(level: number): void {
  //   this.characterStatistics.skills.setSkillLevel(CONST.SKILL.EXPERIENCE, level);
  // }

  // getExperiencePoints(): number {
  //   return this.characterStatistics.skills.getSkillPoints(CONST.SKILL.EXPERIENCE);
  // }

  think(): void {
    this.actionHandler.actions.handleActions(this.actionHandler);
  }

  getVocation(): number {
    return this.getProperty(CONST.PROPERTIES.VOCATION);
  }

  getHealth(): number {
    return this.getProperty(CONST.PROPERTIES.HEALTH);
  }

  extendCondition(id: number, ticks: number, duration?: number): void {
    const condition = this.conditions.getCondition(id);
    if (condition) {
      condition.numberTicks += ticks;
  
      // Optionally update the duration if a new value is provided
      if (duration && duration > condition.tickDuration) {
        condition.tickDuration = duration;
      }
    } 
  }

  isSated(ticks: number): boolean {
    const condition = this.conditions.getCondition(CONST.CONDITION.SATED);

    if (condition){
      return this.hasCondition(CONST.CONDITION.SATED) && ticks + condition.numberTicks > 100
    }
    return false;
  }

  isInvisible(): boolean {
    return this.hasCondition(CONST.CONDITION.INVISIBLE);
  }

  enterNewChunks(newChunks: any[]): void {
    newChunks.forEach((chunk) => chunk.serialize(this));
    newChunks.forEach((chunk) =>
      chunk.internalBroadcast(new CreatureStatePacket(this))
    );
  }

  isInNoLogoutZone(): boolean {
    return getGameServer().world
      .getTileFromWorldPosition(this.position)
      .isNoLogoutZone();
  }

  isInProtectionZone(): boolean {
    return getGameServer().world
      .getTileFromWorldPosition(this.position)
      .isProtectionZone();
  }

  ownsHouseTile(tile: any): boolean {
    var name = this.getProperty(CONST.PROPERTIES.NAME);
    return (
      tile.house.owner === name || tile.house.invited.includes(name)
    );
  }

  isTileOccupied(tile: any): boolean {
    if (tile.isBlockSolid()) {
      return true;
    }

    if (tile.isHouseTile() && !this.ownsHouseTile(tile)) {
      this.sendCancelMessage("You do not own this house.");
      return true;
    }

    if (tile.hasItems() && tile.itemStack.isBlockSolid()) {
      return true;
    }

    if (tile.isOccupiedCharacters()) {
      return true;
    }

    return false;
  }

  openContainer(id: number, name: string, baseContainer: any): void {
    baseContainer.addSpectator(this);
    this.write(new ContainerOpenPacket(id, name, baseContainer));
  }

  closeContainer(baseContainer: any): void {
    baseContainer.removeSpectator(this);
    this.write(new ContainerClosePacket(baseContainer.guid));
  }

  isInCombat(): boolean {
    return this.combatLock.isLocked();
  }

  isOnline(): boolean {
    return getGameServer().world.creatureHandler.isPlayerOnline(this);
  }

  isMoving(): boolean {
    return this.movementHandler.isMoving();
  }

  canUseHangable(thing: any): boolean {
    return (
      (thing.isHorizontal() && this.position.y >= thing.getPosition().y) ||
      (thing.isVertical() && this.position.x >= thing.getPosition().x)
    );
  }

  decreaseHealth(amount: number): void {
    this.combatLock.activate();
    const currentHealth = this.getProperty(CONST.PROPERTIES.HEALTH);

    if (currentHealth >= amount) {
      this.incrementProperty(CONST.PROPERTIES.HEALTH, -amount);
    } else {
      this.incrementProperty(CONST.PROPERTIES.HEALTH, -currentHealth);
    }

    this.broadcast(new EmotePacket(this, "-" + String(amount), CONST.COLOR.RED));

    if (this.isZeroHealth()) {
      this.handleDeath();
    }
  }

  decreaseMana(amount: number): void {
    this.combatLock.activate();
    const currentMana = this.getProperty(CONST.PROPERTIES.MANA);

    if (currentMana >= amount) {
      this.incrementProperty(CONST.PROPERTIES.MANA, -amount);
    } else {
      this.incrementProperty(CONST.PROPERTIES.MANA, -currentMana);
    }

    this.broadcast(new EmotePacket(this, "-" + String(amount), CONST.COLOR.BLUE));
  }

  decreaseEnergy(amount: number): void {
    this.combatLock.activate();
    const currentEnergy = this.getProperty(CONST.PROPERTIES.ENERGY);

    if (currentEnergy >= amount) {
      this.incrementProperty(CONST.PROPERTIES.ENERGY, -amount);
    } else {
      this.incrementProperty(CONST.PROPERTIES.ENERGY, -currentEnergy);
    }

    this.broadcast(new EmotePacket(this, "-" + String(amount), CONST.COLOR.YELLOW));
  }

  increaseHealth(amount: number): void {
    const currentHealth = this.getProperty(CONST.PROPERTIES.HEALTH);
    const maxHealth = this.getProperty(CONST.PROPERTIES.HEALTH_MAX);
  
    const newHealth = Math.min(currentHealth + amount, maxHealth);
    const actualIncrease = newHealth - currentHealth;
  
    if (actualIncrease > 0) {
      this.incrementProperty(CONST.PROPERTIES.HEALTH, actualIncrease);
      this.broadcast(new EmotePacket(this, "+" + String(actualIncrease), CONST.COLOR.LIGHTGREEN));
    }
  }
  
  increaseMana(amount: number): void {
    const currentMana = this.getProperty(CONST.PROPERTIES.MANA);
    const maxMana = this.getProperty(CONST.PROPERTIES.MANA_MAX);
  
    const newMana = Math.min(currentMana + amount, maxMana);
    const actualIncrease = newMana - currentMana;
  
    if (actualIncrease > 0) {
      this.incrementProperty(CONST.PROPERTIES.MANA, actualIncrease);
      this.broadcast(new EmotePacket(this, "+" + String(actualIncrease), CONST.COLOR.BLUE));
    }
  }
  
  increaseEnergy(amount: number): void {
    const currentEnergy = this.getProperty(CONST.PROPERTIES.ENERGY);
    const maxEnergy = this.getProperty(CONST.PROPERTIES.ENERGY_MAX);
  
    const newEnergy = Math.min(currentEnergy + amount, maxEnergy);
    const actualIncrease = newEnergy - currentEnergy;
  
    if (actualIncrease > 0) {
      this.incrementProperty(CONST.PROPERTIES.ENERGY, actualIncrease);
      this.broadcast(new EmotePacket(this, "+" + String(actualIncrease), CONST.COLOR.YELLOW));
    }
  }  

  getCorpse(): number {
    const CORPSE_MALE = 3058;
    const CORPSE_FEMALE = 3065;
    return this.getProperty(CONST.PROPERTIES.SEX) === CONST.SEX.MALE
      ? CORPSE_MALE
      : CORPSE_FEMALE;
  }

  handleDeath(): void {
    this.setFull(CONST.PROPERTIES.HEALTH);
    this.setFull(CONST.PROPERTIES.MANA);

    const gameServer = getGameServer();
    const corpse = gameServer.database.createThing(this.getCorpse()) as Corpse;
    gameServer.world.addTopThing(this.getPosition(), corpse);
    gameServer.world.addSplash(2016, this.getPosition(), corpse.getFluidType());
    gameServer.world.creatureHandler.teleportCreature(this, this.templePosition);
    this.socketHandler.disconnect();
  }

  consumeAmmunition(): boolean {
    const removedItem = this.containerManager.equipment.removeIndex(CONST.EQUIPMENT.QUIVER, 1);
    return removedItem !== null;
  }

  isAmmunitionEquipped(): boolean {
    return this.containerManager.equipment.isAmmunitionEquipped();
  }

  isDistanceWeaponEquipped(): boolean {
    return this.containerManager.equipment.isDistanceWeaponEquipped();
  }

  sendCancelMessage(message: string): void {
    this.write(new CancelMessagePacket(message));
  }

  cleanup(): void {
    // TODO: check this
    //this.channelManager.cleanup();
    this.containerManager.cleanup();
    this.conditions.cleanup();
    this.combatLock.cleanup();
    this.idleHandler.cleanup();
    this.socketHandler.disconnect();
    this.actionHandler.cleanup();
    this.emit("logout");
  }

  toJSON(): Record<string, any> {
    return {
      position: this.position,
      //achievements: this.achievementManager,
      skills: this.skills,
      properties: this.properties,
      lastVisit: Date.now(),
      containers: this.containerManager,
      //characterStatistics: this.characterStatistics,
      spellbook: this.spellbook,
      friends: this.friendlist,
      templePosition: this.templePosition,
    };
  }

  disconnect(): void {
    this.socketHandler.disconnect();
  }

  write(packet: any): void {
    this.socketHandler.write(packet);
  }

  getEquipmentAttribute(attribute: string): any {
    return this.containerManager.equipment.getAttributeState(attribute);
  }

  getSpeed(): number {
    let base = this.getProperty(CONST.PROPERTIES.SPEED);

    if (this.hasCondition(CONST.CONDITION.HASTE)) {
      base *= 1.3;
    }

    return base;
  }

  getBaseDamage(): number {
    const level = this.skills.getSkillLevel(CONST.PROPERTIES.EXPERIENCE);
    return Math.floor(level / 5);
  }

  getAttack(): number {
    const OFFENSIVE = 0;
    const BALANCED = 1;
    const DEFENSIVE = 2;
  
    const B = this.getBaseDamage();
    const W = 20;
    const weaponType = this.containerManager.equipment.getWeaponType();
    const S = this.skills.getSkillLevel(weaponType);
  
    switch (this.attackMode) {
      case OFFENSIVE:
        return B + Math.floor(Math.floor(W * (6 / 5)) * ((S + 4) / 28));
      case BALANCED:
        return B + Math.floor(W * ((S + 4) / 28));
      case DEFENSIVE:
        return B + Math.floor(Math.ceil(W * (3 / 5)) * ((S + 4) / 28));
      default:
        return 0;
    }
  }
  

  getDefense(): number {
    return this.getProperty(CONST.PROPERTIES.DEFENSE);
  }

  purchase(offer: any, count: number): boolean {
    const thing = getGameServer().database.createThing(offer.id);

    if (thing){
      if (thing.isStackable() && count) {
        thing.setCount(count);
      } else if (thing.isFluidContainer() && offer.count) {
        thing.setCount(offer.count);
      }
    

    if (!this.containerManager.equipment.canPushItem(thing)) {
      this.sendCancelMessage("You do not have enough available space or capacity.");
      return false;
    }

    if (!this.payWithResource(2148, offer.price * count)) {
      this.sendCancelMessage("You do not have enough gold.");
      return false;
    }

    this.containerManager.equipment.pushItem(thing);
    return true;
    }
    return false;
  }

  getCapacity(): number {
    return this.getProperty(CONST.PROPERTIES.CAPACITY);
  }

  hasSufficientCapacity(thing: any): boolean {
    return this.getCapacity() >= thing.getWeight();
  }

  payWithResource(currencyId: number, price: number): boolean {
    return this.containerManager.equipment.payWithResource(currencyId, price);
  }

  handleBuyOffer(packet: any): void {
    const creature = getGameServer().world.creatureHandler.getCreatureFromId(packet.id);

    if (!creature || creature.constructor.name !== "NPC" || !creature.isWithinHearingRange(this)) {
      return;
    }

    const offer = creature.conversationHandler.tradeHandler.getTradeItem(packet.index);

    if (this.purchase(offer, packet.count)) {
      creature.speechHandler.internalCreatureSay("Here you go!", CONST.COLOR.YELLOW);
    }
  }

  getFluidType(): number {
    return CONST.FLUID.BLOOD;
  }

  __handleCreatureKill(creature: any): void {
    // Placeholder for kill handling logic (e.g., quests)
  }

  changeCapacity(value: number): void {
    this.setProperty(CONST.PROPERTIES.CAPACITY, this.getProperty(CONST.PROPERTIES.CAPACITY) + value);
    if (this.containerManager) {
      // TODO:
      //this.containerManager.handleCapacityChange();
    }
  }

  changeSlowness(speed: number): void {
    const newSpeed = this.getProperty(CONST.PROPERTIES.SPEED) + speed
    this.write(new CreaturePropertyPacket(this.getId(), CONST.PROPERTIES.SPEED, newSpeed));
  }
  
  setFull(property: number): void {
    switch (property) {
      case CONST.PROPERTIES.MANA:
        this.setProperty(property, this.getProperty(CONST.PROPERTIES.MANA_MAX));
        break;
  
      case CONST.PROPERTIES.HEALTH:
        this.setProperty(property, this.getProperty(CONST.PROPERTIES.HEALTH_MAX));
        break;
  
      default:
        throw new Error(`Invalid property: ${property}`);
    }
  }
  
  emit(which: string, ...args: any[]): boolean {
    console.log(`Event emitted: ${which}`, ...args);
  
    // Call the base class's `emit` method (if applicable)
    return super.emit(which, ...args);
  }
  
  incrementProperty(property: number, value: number): void {
    this.setProperty(property, this.getProperty(property) + value);
  }
  
  hasCondition(conditionId: number): boolean {
    return this.conditions.has(conditionId);
  }
  
  setProperty(property: number, value: any): void {
    this.properties.setProperty(property, value);
  }
  
  getProperty(property: number): any {
    return this.properties.getProperty(property);
  }
  
  isZeroHealth(): boolean {
    return this.getProperty(CONST.PROPERTIES.HEALTH) <= 0;
  }

}
