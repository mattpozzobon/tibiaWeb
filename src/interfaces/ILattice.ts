import { IChunk } from "./IChunk";
import IPathfinder, { PathfinderTile } from "./IPathfinder";
import { IPosition } from "./IPosition";


export interface ILattice {
  width: number;
  height: number;
  depth: number;

  pathfinder: IPathfinder;
  nChunksWidth: number;
  nChunksHeight: number;
  nChunksDepth: number;

  findPath(creature: any, fromPosition: IPosition, toPosition: IPosition, mode: number): PathfinderTile[];
  getSpectatingChunks(position: IPosition): IChunk[];
  getActiveChunks(onlinePlayers: Map<string, any>): Set<IChunk>;
  findAvailableTile(creature: any, position: IPosition): any | null;
  findDestination(creature: any, tile: any): any | null;
  getChunkFromWorldPosition(position: IPosition): IChunk | null;
  getTileFromWorldPosition(position: IPosition): any | null;
  createChunk(position: IPosition): IChunk;
  enablePathfinding(tile: any, refreshNeighbours: boolean): void;
  setReferences(): void;
  withinBounds(position: IPosition): boolean;
}
