import Creature from "../creature/creature";
import { IContainerManager } from "./IContainer-manager";
import { IActionHandler } from "./IPlayer-action-handler";
import { ISocketHandler } from "./IPlayer-socket-handler";
import { IPosition } from "./IPosition";
import { ISkills } from "./ISkils";
import { IFriendlist } from "./IFriendlist";
import { ISpellbook } from "./ISpellbook";
import { IPlayerIdleHandler } from "./IPlayer-idle-handler";
import { IPlayerMovementHandler } from "./IPlayer-movement-handler";
import { ICombatLock } from "./IPlayer-combat-lock";
import { IUseHandler } from "./IPlayer-use-handler";
import { IGlobalChannel } from "./IChannel-global";
import Channel from "../channel/channel";


export interface IPlayer extends Creature {
  isGod(): unknown;
  templePosition: IPosition;
  skills: ISkills;
  socketHandler: ISocketHandler;
  friendlist: IFriendlist;
  containerManager: IContainerManager;
  spellbook: ISpellbook;
  idleHandler: IPlayerIdleHandler;
  movementHandler: IPlayerMovementHandler;
  channelManager: IChannelManager;
  actionHandler: IActionHandler;
  combatLock: ICombatLock;
  useHandler: IUseHandler;
  lastVisit: number;
  attackMode: number;

  // Movement / step duration is defined on Creature and used by doors, monsters, NPCs, etc.
  // Expose it here so IPlayer matches the concrete Player implementation.
  getStepDuration(friction: number): number;

  getTarget(): any;
  getTextColor(): number;
  getLevel(): number;
  think(): void;
  getVocation(): number;
  getHealth(): number;
  extendCondition(id: number, ticks: number, duration?: number): void;
  isSated(ticks: number): boolean;
  isInvisible(): boolean;
  enterNewChunks(newChunks: any[]): void;
  isInNoLogoutZone(): boolean;
  isInProtectionZone(): boolean;
  ownsHouseTile(tile: any): boolean;
  isTileOccupied(tile: any): boolean;
  openContainer(id: number, name: string, baseContainer: any, containerItem?: any): void;
  closeContainer(baseContainer: any): void;
  isInCombat(): boolean;
  isOnline(): boolean;
  isMoving(): boolean;
  canUseHangable(thing: any): boolean;
  increaseHealth(amount: number): void;
  decreaseMana(amount: number): void;
  decreaseEnergy(amount: number): void;
  decreaseHealth(amount: number): void;
  increaseMana(amount: number): void;
  increaseEnergy(amount: number): void;
  getCorpse(): number;
  handleDeath(): void;
  consumeAmmunition(): boolean;
  isAmmunitionEquipped(): boolean;
  isDistanceWeaponEquipped(): boolean;
  sendCancelMessage(message: string): void;
  cleanup(): void;
  toJSON(): Record<string, any>;
  disconnect(): void;
  write(packet: any): void;
  getEquipmentAttribute(attribute: string): any;
  getSpeed(): number;
  getBaseDamage(): number;
  getAttack(): number;
  getDefense(): number;
  purchase(offer: any, count: number): boolean;
  getCapacity(): number;
  hasSufficientCapacity(thing: any): boolean;
  payWithResource(currencyId: number, price: number): boolean;
  handleBuyOffer(packet: any): void;
  getFluidType(): number;
  __handleCreatureKill(creature: any): void;
  changeCapacity(value: number): void;
  changeSlowness(speed: number): void;
  setFull(property: number): void;
  emit(which: string, ...args: any[]): boolean;
  incrementProperty(property: number, value: number): void;
  hasCondition(conditionId: number): boolean;
  setProperty(property: number, value: any): void;
  getProperty(property: number): any;
  isZeroHealth(): boolean;
}

export interface IChannelManager {
  getChannel(cid: number): IDefaultChannel | IGlobalChannel | null;
  leaveChannel(player: IPlayer, cid: number): void;
  joinChannel(player: IPlayer, id: number): void;
  handleSendPrivateMessage(player: IPlayer, packet: { name: string; message: string }): void;
}

export interface IDefaultChannel extends Channel{
  send(player: IPlayer, packet: { message: string; loudness: number }): void;
}
