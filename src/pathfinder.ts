import PathfinderNode from "./pathfinder-node";
import BinaryHeap from "./binary-heap";
import { CONST, getGameServer } from "./helper/appContext";
import IPathfinder, { PathfinderTile } from "interfaces/IPathfinder";
import IPathfinderNode from "interfaces/IPathfinder-node";


class Pathfinder implements IPathfinder{
  private __enabledTiles: PathfinderTile[];
  private __iterations: number;
  private __requests: number;

  static ADJACENT = 0x00;
  static EXACT = 0x01;

  constructor() {
    /*
     * Class Pathfinder
     * A* algorithm using a binary heap to find monster pathing
     */
    this.__enabledTiles = [];
    this.__iterations = 0;
    this.__requests = 0;
  }

  private enableTile(tile: PathfinderTile, to: PathfinderTile): void {
    /*
     * Enables a tile for pathfinding during search
     */
    const AVERAGE_FRICTION = 130;

    this.__enabledTiles.push(tile);
    tile.enablePathfinding();

    if (!tile.pathfinderNode) {
      tile.pathfinderNode = new PathfinderNode();
    }

    tile.pathfinderNode.setHeuristic(
      AVERAGE_FRICTION * tile.distanceManhattan(to)
    );
  }

  search(
    creature: { isTileOccupied(tile: PathfinderTile): boolean },
    from: PathfinderTile,
    to: PathfinderTile,
    mode: number
  ): PathfinderTile[] {
    /*
     * Searches connection from one tile (from) to tile (to) using a specific mode
     */
    this.__requests++;

    const openHeap = new BinaryHeap<PathfinderTile>();
    this.enableTile(from, to);
    openHeap.push(from);

    while (!openHeap.isEmpty()) {
      this.__iterations++;

      const currentTile = openHeap.pop() as PathfinderTile;
      const currentNode = currentTile.pathfinderNode;

      if (mode === Pathfinder.ADJACENT) {
        if (to.neighbours.includes(currentTile)) {
          return this.pathTo(currentTile);
        }
      } else if (mode === Pathfinder.EXACT) {
        if (currentTile === to) {
          return this.pathTo(currentTile);
        }
      }

      currentNode.setClosed();

      currentTile.neighbours.forEach((neighbourTile: PathfinderTile) => {
        if (neighbourTile === currentTile) return;

        if (!neighbourTile.pathfinderNode) {
          this.enableTile(neighbourTile, to);
        }

        const neighbourNode = neighbourTile.pathfinderNode;

        if (neighbourNode.isClosed()) return;

        if (
          !neighbourTile
            .getPosition()
            .isVisible(from.getPosition(), 11, 8) ||
          !neighbourTile
            .getPosition()
            .isVisible(to.getPosition(), 11, 8)
        ) {
          return neighbourNode.setClosed();
        }

        if (creature.isTileOccupied(neighbourTile)) {
          return neighbourNode.setClosed();
        }

        getGameServer().world.sendMagicEffect(
          neighbourTile.getPosition(),
          CONST.EFFECT.MAGIC.SOUND_WHITE
        );

        const gScore =
          currentNode.getCost() + neighbourTile.getWeight(currentTile);
        const isVisited = neighbourNode.isVisited();

        if (isVisited && gScore >= neighbourNode.getCost()) return;

        neighbourNode.setVisited();
        neighbourNode.setParent(currentTile.pathfinderNode);
        neighbourNode.setCost(gScore);
        neighbourNode.setScore(gScore + neighbourNode.getHeuristic());

        if (!isVisited) {
          openHeap.push(neighbourTile);
        } else {
          openHeap.rescoreElement(neighbourTile);
        }
      });
    }

    this.__cleanup();
    return [];
  }

  private __cleanup(): void {
    /*
     * Disables all tiles used for pathfinding
     */
    this.__enabledTiles.forEach((tile) => tile.disablePathfinding());
    this.__enabledTiles = [];
  }

  getDataDetails(): { iterations: number; requests: number } {
    /*
     * Gets usage statistics for the pathfinder
     */
    const totalIterations = this.__iterations;
    const totalRequests = this.__requests;

    this.__iterations = 0;
    this.__requests = 0;

    return {
      iterations: totalIterations,
      requests: totalRequests,
    };
  }

  private findTileByNode(node: IPathfinderNode): PathfinderTile | null {
    /*
     * Finds the PathfinderTile associated with a given PathfinderNode.
     */
    return this.__enabledTiles.find(
      (tile) => tile.pathfinderNode === node
    ) || null;
  }

  private pathTo(tile: PathfinderTile): PathfinderTile[] {
    /*
     * Returns the path to a node following an A* path
     */
    const resolvedPath: PathfinderTile[] = [];
  
    while (true) {
      resolvedPath.push(tile);
      getGameServer().world.sendMagicEffect(
        tile.getPosition(),
        CONST.EFFECT.MAGIC.SOUND_BLUE
      );
  
      const parentNode = tile.pathfinderNode.getParent();
      if (!parentNode) {
        break; // Stop when no parent exists
      }
  
      // Map from PathfinderNode back to PathfinderTile
      const parentTile = this.findTileByNode(parentNode);
      if (!parentTile) {
        console.error("Parent tile not found for pathfinder node.");
        break; // Exit loop if parent tile is not found
      }
  
      tile = parentTile;
    }
  
    this.__cleanup();
    return resolvedPath;
  }  
  
}

export default Pathfinder;
