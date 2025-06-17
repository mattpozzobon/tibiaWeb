import { IMonster } from "./IMonster";
import { INPC } from "./INpc";
import { IPlayer } from "./IPlayer";
import ITile from "./ITile";

export interface IChunk {
  id: number;
  position: { x: number; y: number; z: number };

  monsters: Set<IMonster>;
  players: Set<IPlayer>;
  npcs: Set<INPC>;

  neighbours: IChunk[];
  layers: (ITile[] | null)[];

  difference(chunk: IChunk): Set<IChunk>;
  createTile(position: { x: number; y: number; z: number }, id: number): ITile;
  getTileFromWorldPosition(position: { x: number; y: number; z: number }): ITile | null;
  serialize(targetSocket: any): void;
  broadcast(packet: any): void;
  broadcastFloor(floor: number, packet: any): void;
  removeCreature(creature: IPlayer | IMonster | INPC): boolean;
  addCreature(creature: IPlayer | IMonster | INPC): void;
}
