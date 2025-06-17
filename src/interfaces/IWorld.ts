import CreatureHandler from "Cworld-creature-handler";
import { ICreature } from "./ICreature";
import { IEventQueue } from "./IEventqueue";
import { ILattice } from "./ILattice";
import { IChannelManager } from "./IPlayer";
import { IPosition } from "./IPosition";
import { IWorldClock } from "./IWorldclock";
import { ICombatHandler } from "./IWorld-combat-handler";

export interface IWorld {
  channelManager: IChannelManager;
  lattice: ILattice;
  eventQueue: IEventQueue;
  clock: IWorldClock;
  creatureHandler: CreatureHandler;
  combatHandler: ICombatHandler;

  tick(): void;
  addTopThing(position: IPosition, thing: any): void;
  addThing(position: IPosition, item: any, index: number): void;
  broadcastPosition(position: IPosition, packet: any): void;
  addSplash(id: number, position: IPosition, type: any): void;
  sendDistanceEffect(from: IPosition, to: IPosition, type: any): void;
  sendMagicEffect(position: IPosition, type: any): void;
  broadcastMessage(message: string): void;
  broadcastPacket(packet: any): void;
  writePlayerLogout(name: string): void;
  getDataDetails(): { activeMonsters: number; time: string };

  // Delegated methods
  getSpectatingChunks(position: IPosition): any;
  findAvailableTile(creature: ICreature, position: IPosition): any;
  getTileFromWorldPosition(position: IPosition): any;
  withinBounds(position: IPosition): boolean;
  getChunkFromWorldPosition(position: IPosition): any;
  findPath(creature: ICreature, start: IPosition, end: IPosition, mode: number): any;
}
