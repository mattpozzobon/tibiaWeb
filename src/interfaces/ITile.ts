import { IBitFlag } from "./IBitflag";
import IItemStack from "./IItem-stack";
import IPathfinderNode from "./IPathfinder-node";
import { IPosition } from "./IPosition";
import { IItem, IThing } from "./IThing";

interface ITile extends IThing {
  position: IPosition;
  itemStack?: IItemStack;
  creatures?: Set<any>;
  neighbours?: ITile[];
  tilezoneFlags?: IBitFlag;
  pathfinderNode?: IPathfinderNode;

  getFriction(): number;
  broadcastNeighbours(packet: any): void;
  distanceManhattan(other: ITile): number;
  writePlayers(packet: any): void;
  isHouseTile(): boolean;
  addCreature(creature: any): void;
  eliminateItem(thing: IThing): void;
  addThing(thing: IThing, index: number): void;
  addTopThing(thing: IThing): void;
  hasElevation(): boolean;
  hasDestination(): boolean;
  replaceTile(id: number): void;
  getItems(): IThing[];
  getScore(): number;
  getTileWeight(current: ITile): number;
  getNumberCharacters(): number;
  enablePathfinding(): void;
  disablePathfinding(): void;
  setZoneFlags(flags: number): void;
  isNoLogoutZone(): boolean;
  isProtectionZone(): boolean;
  isBlockSolid(): boolean;
  deleteIndex(index: number): IThing | null;
  deleteThing(thing: IThing, count: number): number;
  removeIndex(index: number, amount: number): IThing | null;
  isBlockProjectile(): boolean;
  hasItems(): boolean;
  isOccupied(): boolean;
  isOccupiedAny(): boolean;
  isOccupiedCharacters(): boolean;
  getTopItem(): IThing | null;
  getMaximumAddCount(player: any, item: IThing, index: number): number;
  getCreature(): any;
  peekIndex(index: number): IItem | null;
  scheduleDecay(): void;
  getTileDecayProperties(): { decayTo: number; duration: number };
  getDestination(): any;
  broadcast(packet: any): void;
  getChunk(): any;
  removeCreature(creature: any): void;
  isTrashholder(): boolean;
  isFull(): boolean;
}

export default ITile;
