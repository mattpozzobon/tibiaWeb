import Creature from "Ccreature";
import { IDamageMap } from "./IDamage-map";
import { ILootHandler } from "./IMonster-loot-handler";
import ICorpse from "./ICorpse";
import { IPlayer } from "./IPlayer";
import ITile from "./ITile";

export interface IMonster extends Creature {
  cid: number;
  corpse: number;
  fluidType: number;
  experience: number;
  damageMap: IDamageMap;
  lootHandler: ILootHandler;
  behaviourHandler: IMonsterBehaviour;

  setTarget(target: any): void;
  cleanup(): void;
  isTileOccupied(tile: any): boolean;
  createCorpse(): ICorpse | null;
  getPrototype(): any;
  getTarget(): any;
  push(position: any): void;
  hasTarget(): boolean;
  think(): void;
  isDistanceWeaponEquipped(): boolean;
  decreaseHealth(source: any, amount: number): void;
}

export interface IMonsterBehaviour {
  monster: IMonster;
  actions: any;
  openDoors: boolean;
  sayings?: { texts: string[]; slowness: number };
  state: number;
  GLOBAL_COOLDOWN: number;

  handleActionTarget(): void;
  handleActionSpeak(): void;
  isBesidesTarget(): boolean;
  handleActionAttack(): void;
  handleActionMove(): void;
  getTarget(): IPlayer | null;
  hasTarget(): boolean;
  canSeeTarget(): boolean;
  setTarget(target: IPlayer | null): void;
  setBehaviour(state: number): void;
  is(behaviour: number): boolean;
  requiresTarget(): boolean;
  getPathToTarget(): ITile | null;
  getNextMoveTile(): ITile | null;
  wander(): ITile | null;
  handleDamage(attacker: IPlayer): void;
}