import { IPosition } from "./IPosition";

export interface ICreatureHandler {
  sceneNPCs: Set<any>;
  __numberActiveMonsters: number;

  assignUID(): number;
  getCreatureFromId(id: number): any | null;
  isCreatureActive(creature: any): boolean;
  removeCreature(creature: any): void;
  addCreaturePosition(creature: any, position: IPosition): boolean;
  addPlayer(player: any, position: IPosition): boolean;
  tick(): void;
  getConnectedPlayers(): Map<string, any>;
  createNewPlayer(gameSocket: any, data: any): void;
  exists(creature: any): boolean;
  removePlayer(player: any): void;
  removePlayerFromWorld(gameSocket: any): void;
  getPlayerByName(name: string): any | null;
  isPlayerOnline(player: any): boolean;
  dieCreature(creature: any): void;
  spawnCreature(cid: number, position: IPosition): void;
  handleChunkChange(creature: any, oldChunk: any | null, newChunk: any | null): void;
  updateCreaturePosition(creature: any, position: IPosition): void;
  teleportCreature(creature: any, position: IPosition): boolean;
  moveCreature(creature: any, position: IPosition): boolean;
  addCreatureSpawn(creature: any, literal: any): void;
}
