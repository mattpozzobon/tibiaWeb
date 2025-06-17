import IPathfinderNode from "./IPathfinder-node";
import { IPosition } from "./IPosition";

export interface PathfinderTile {
  pathfinderNode: IPathfinderNode;
  neighbours: PathfinderTile[];
  getPosition(): IPosition;
  getWeight(tile: PathfinderTile): number;
  distanceManhattan(to: PathfinderTile): number;
  enablePathfinding(): void;
  disablePathfinding(): void;
  getScore(): number;
}

interface IPathfinder {
  search(
    creature: { isTileOccupied(tile: PathfinderTile): boolean },
    from: PathfinderTile,
    to: PathfinderTile,
    mode: number
  ): PathfinderTile[];

  getDataDetails(): { iterations: number; requests: number };
}

export default IPathfinder;
