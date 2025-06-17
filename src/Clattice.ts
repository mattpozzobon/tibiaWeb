import Pathfinder from "./Cpathfinder";
import Chunk from "./Cchunk";
import { Position } from "./Cposition";
import { ILattice } from "interfaces/ILattice";
import { PathfinderTile } from "interfaces/IPathfinder";
import ITile from "interfaces/ITile";
import Tile from "Ctile";


class Lattice implements ILattice{
  width: number;
  height: number;
  depth: number;

  nChunksWidth: number;
  nChunksHeight: number;
  nChunksDepth: number;

  pathfinder: Pathfinder;
  private __chunksPositive: Map<string, Chunk>;
  private __chunksNegative: Map<string, Chunk>;

  constructor(size: { x: number; y: number; z: number }) {
    /*
     * Class Lattice
     * Container for the chunk lattice that blocks all chunks together
     */
    this.width = size.x;
    this.height = size.y;
    this.depth = size.z;

    this.nChunksWidth = this.width / Chunk.WIDTH;
    this.nChunksHeight = this.height / Chunk.HEIGHT;
    this.nChunksDepth = this.depth / Chunk.DEPTH;

    this.pathfinder = new Pathfinder();

    this.__chunksPositive = new Map();
    this.__chunksNegative = new Map();
  }

  public findPath(creature: any, fromPosition: Position, toPosition: Position, mode: number): PathfinderTile[] {
    if (!fromPosition || !toPosition || fromPosition.equals(toPosition) || !fromPosition.isSameFloor(toPosition)) {
      return [];
    }

    if (mode === Pathfinder.ADJACENT && fromPosition.besides(toPosition)) {
      return [];
    }

    const fromTile = this.getTileFromWorldPosition(fromPosition);
    const toTile = this.getTileFromWorldPosition(toPosition);

    if (!fromTile || !toTile || (mode === Pathfinder.EXACT && creature.isTileOccupied(toTile))) {
      return [];
    }

    if (toTile.neighbours?.every((x: any) => creature.isTileOccupied(x))) {
      return [];
    }

    return this.pathfinder.search(creature, fromTile, toTile, mode);
  }

  public getSpectatingChunks(position: Position): Chunk[] {
    const chunk = this.getChunkFromWorldPosition(position);
    return chunk ? chunk.neighbours : [];
  }

  public getActiveChunks(onlinePlayers: Map<string, any>): Set<Chunk> {
    const activeChunks = new Set<Chunk>();

    onlinePlayers.forEach((player) => {
      this.getSpectatingChunks(player.position).forEach((chunk) => activeChunks.add(chunk));
    });

    return activeChunks;
  }

  public findAvailableTile(creature: any, position: Position): any | null {
    const tile = this.getTileFromWorldPosition(position);
    if (!tile?.neighbours) {
      return null;
    }

    for (const neighbour of tile.neighbours) {
      if (creature.isPlayer() && neighbour.isNoLogoutZone()) continue;
      if (creature.isTileOccupied(neighbour)) continue;

      return neighbour;
    }

    return null;
  }

  public findDestination(creature: any, tile: ITile): any | null {
    if (!tile) return null;
    if (!tile.hasDestination()) return tile;
    
    let hops = 8;

    while (tile.hasDestination()) {
      if (--hops === 0) return null;

      const position = tile.getDestination();
      console.log('position',position);
      if (!position || tile.position.equals(position)) return null;

      tile = this.getTileFromWorldPosition(position);
      if (!tile) return null;
    }

    return this.findAvailableTile(creature, tile.position);
  }

  public getChunkFromWorldPosition(position: Position): Chunk | null {
    if (!position) return null;

    const chunkPosition = this.__getChunkPositionFromWorldPosition(position);
    if (!this.__isValidChunkPosition(chunkPosition)) return null;

    const map = chunkPosition.z === 0 ? this.__chunksPositive : this.__chunksNegative;

    return map.get(chunkPosition.xy.toString()) || null;
  }

  public getTileFromWorldPosition(position: Position): any | null {
    if (!position || !this.withinBounds(position)) return null;

    const chunk = this.getChunkFromWorldPosition(position);

    // if (chunk && position.x > 0 && position.x < 20 && position.y === 7){
    //   console.log('chunk: ', chunk);
    //   console.log('position: ', position.x, " ", position.y, " ", position.z);
    // }
      

    return chunk?.getTileFromWorldPosition(position) || null;
  }

  public createChunk(position: Position): Chunk {
    const chunkPosition = this.__getChunkPositionFromWorldPosition(position);
    const index = this.__getChunkIndex(chunkPosition);
    const chunk = new Chunk(index, chunkPosition);

    if (chunkPosition.z === 0) {
      this.__chunksPositive.set(chunkPosition.xy.toString(), chunk);
    } else {
      this.__chunksNegative.set(chunkPosition.xy.toString(), chunk);
    }

    return chunk;
  }

  public enablePathfinding(tile: any, refreshNeighbours: boolean): void {
    const things = [
      tile.position,
      tile.position.west(),
      tile.position.north(),
      tile.position.east(),
      tile.position.south(),
      tile.position.northwest(),
      tile.position.southwest(),
      tile.position.northeast(),
      tile.position.southeast(),
    ];

    tile.neighbours = things
      .map(this.getTileFromWorldPosition.bind(this))
      .filter((x: any) => x && !x.isBlockSolid());

    if (refreshNeighbours) {
      tile.neighbours.forEach((tile: any) => this.enablePathfinding(tile, false));
    }
  }

  public setReferences(): void {
    this.__setReferences(this.__chunksPositive);
    this.__setReferences(this.__chunksNegative);
  }

  private __setReferences(chunks: Map<string, Chunk>): void {
    chunks.forEach((chunk) => {
      this.__referenceNeighbours(chunk, this.__getChunkFromChunkPosition.bind(this));

      chunk.layers.forEach((layer: any) => {
        layer?.forEach((tile: Tile) => {

          if (!tile) return;
          if (tile.isBlockSolid()) return;
          
          this.enablePathfinding(tile, false);
        });
      });
    });
  }

  private __referenceNeighbours(thing: any, callback: (position: Position) => any): void {
    const things = [
      thing.position,
      thing.position.west(),
      thing.position.north(),
      thing.position.east(),
      thing.position.south(),
      thing.position.northwest(),
      thing.position.southwest(),
      thing.position.northeast(),
      thing.position.southeast(),
    ];

    thing.neighbours = things.map(callback).filter((x) => x);
  }

  private __isValidChunkPosition(position: Position): boolean {
    return (
      position.x >= 0 &&
      position.x < this.nChunksWidth &&
      position.y >= 0 &&
      position.y < this.nChunksHeight &&
      position.z >= 0 &&
      position.z < this.nChunksDepth
    );
  }

  private __getChunkIndex(position: Position): number {
    return position.x + position.y * this.nChunksWidth + position.z * this.nChunksWidth * this.nChunksHeight;
  }

  private __getChunkFromChunkPosition(position: Position): Chunk | null {
    if (!this.__isValidChunkPosition(position)) return null;

    const map = position.z === 0 ? this.__chunksPositive : this.__chunksNegative;
    return map.get((position.xy).toString()) || null;
  }

  public withinBounds(position: Position): boolean {
    return (
      position.x >= 0 &&
      position.x < this.width &&
      position.y >= 0 &&
      position.y < this.height &&
      position.z >= 0 &&
      position.z < this.depth
    );
  }

  private __getChunkPositionFromWorldPosition(position: Position): Position {
    const x = position.x - (position.z % Chunk.DEPTH);
    const y = position.y - (position.z % Chunk.DEPTH);

    const sx = Math.floor(x / Chunk.WIDTH);
    const sy = Math.floor(y / Chunk.HEIGHT);
    const sz = Math.floor(position.z / Chunk.DEPTH);

    return new Position(sx, sy, sz);
  }
}

export default Lattice;
