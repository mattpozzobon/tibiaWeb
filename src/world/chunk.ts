import Monster from "../creature/monster/monster";
import NPC from "../creature/npc/npc";
import Player from "../creature/player/player";
import { ChunkPacket, CreatureStatePacket } from "../network/protocol";
import Tile from "../thing/tile";
import { CONFIG } from "../helper/appContext";

interface ChunkPosition {
  x: number;
  y: number;
  z: number;
}

class Chunk {
  id: number;
  position: ChunkPosition;

  monsters: Set<Monster>;
  players: Set<Player>;
  npcs: Set<NPC>;

  neighbours: Chunk[];
  layers: (Tile[] | null)[];

  static WIDTH = CONFIG.WORLD.CHUNK.WIDTH;
  static HEIGHT = CONFIG.WORLD.CHUNK.HEIGHT;
  static DEPTH = CONFIG.WORLD.CHUNK.DEPTH;

  constructor(id: number, chunkPosition: ChunkPosition) {
    this.id = id;
    this.position = chunkPosition;

    this.monsters = new Set();
    this.players = new Set();
    this.npcs = new Set();

    this.neighbours = [];
    this.layers = new Array(Chunk.DEPTH).fill(null);
  }

  public difference(chunk: Chunk): Set<Chunk> {
    const complement = new Set(chunk.neighbours);
    this.neighbours.forEach((x) => complement.delete(x));
    return complement;
  }

  public createTile(position: ChunkPosition, id: number): Tile {
    const layer = position.z % Chunk.DEPTH;

    if (this.layers[layer] === null) {
      this.layers[layer] = new Array(Chunk.WIDTH * Chunk.HEIGHT).fill(null);
    }

    const index = this.__getTileIndex(position);
    const tile = new Tile(id, position);
    this.layers[layer]![index] = tile;
    return tile;
  }

  public getTileFromWorldPosition(position: ChunkPosition): Tile | null {
    const layer = position.z % Chunk.DEPTH;
    if (this.layers[layer] === null) {
      return null;
    }

    const tileIndex = this.__getTileIndex(position);
    return this.layers[layer]![tileIndex] || null;
  }

  public serialize(targetSocket: any): void {
    targetSocket.write(new ChunkPacket(this));

    for (const chunkPlayer of this.players) {
      if (targetSocket.player === chunkPlayer) {
        continue;
      }
      targetSocket.write(new CreatureStatePacket(chunkPlayer));
    }

    for (const npc of this.npcs) {
      targetSocket.write(new CreatureStatePacket(npc));
    }

    for (const monster of this.monsters) {
      targetSocket.write(new CreatureStatePacket(monster));
    }
  }

  public broadcast(packet: any): void {
    this.neighbours.forEach((chunk) => chunk.internalBroadcast(packet));
  }

  public broadcastFloor(floor: number, packet: any): void {
    this.neighbours.forEach((chunk) => chunk.__internalBroadcastFloor(floor, packet));
  }

  public removeCreature(creature: Player | Monster | NPC): boolean {
    if (creature instanceof Player) {
      return this.players.delete(creature);
    } else if (creature instanceof Monster) {
      return this.monsters.delete(creature);
    } else if (creature instanceof NPC) {
      return this.npcs.delete(creature);
    }
    return false;
  }

  public addCreature(creature: Player | Monster | NPC): void {
    if (creature instanceof Player) {
      this.players.add(creature);
    } else if (creature instanceof Monster) {
      this.monsters.add(creature);
    } else if (creature instanceof NPC) {
      this.npcs.add(creature);
    }
  }

  private __getTileIndex(worldPosition: ChunkPosition): number {
    const z = worldPosition.z % Chunk.DEPTH;
    const x = (worldPosition.x - z) % Chunk.WIDTH;
    const y = (worldPosition.y - z) % Chunk.HEIGHT;

    return x + y * Chunk.WIDTH;
  }

  private internalBroadcast(packet: any): void {
    this.players.forEach((player) => player.write(packet));
  }

  private __internalBroadcastFloor(floor: number, packet: any): void {
    this.players.forEach((player) => {
      if (player.position.z === floor) {
        player.write(packet);
      }
    });
  }
}

export default Chunk;
