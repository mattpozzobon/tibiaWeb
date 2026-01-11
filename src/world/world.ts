

import Lattice from "../game-object/world/lattice";
import ChannelManager from "../channel/channel-manager";
import { Position } from "../utils/position";
import { EffectDistancePacket, EffectMagicPacket, PlayerLogoutPacket, ServerMessagePacket } from "../network/protocol";
import { CONFIG, getGameServer } from "../helper/appContext";
import Player from "../creature/player/player";
import Creature from "../creature/creature";
import Item from "../item/item";
import EventQueue from "../event/eventqueue";
import WorldClock from "./worldclock";
import CreatureHandler from "./world-creature-handler";
import CombatHandler from "./world-combat-handler";

export class World {
  channelManager: ChannelManager;
  lattice: Lattice;
  eventQueue: EventQueue;
  clock: WorldClock;
  creatureHandler: CreatureHandler;
  combatHandler: CombatHandler;

  constructor(worldSize: Position) {
    /*
     * Class World
     * Container for the entire game world
     */
    
    this.channelManager = new ChannelManager();

    this.lattice = new Lattice(worldSize);
    
    this.eventQueue = new EventQueue();
    this.clock = new WorldClock();
    this.creatureHandler = new CreatureHandler();
    this.combatHandler = new CombatHandler();

    // Delegate and expose lattice functions
    this.getSpectatingChunks = this.lattice.getSpectatingChunks.bind(this.lattice);
    this.findAvailableTile = this.lattice.findAvailableTile.bind(this.lattice);
    this.getTileFromWorldPosition = this.lattice.getTileFromWorldPosition.bind(this.lattice);
    this.withinBounds = this.lattice.withinBounds.bind(this.lattice);
    this.getChunkFromWorldPosition = this.lattice.getChunkFromWorldPosition.bind(this.lattice);
    this.findPath = this.lattice.findPath.bind(this.lattice);
  }

  tick(): void {
    /*
     * Called every server frame
     */
    this.clock.tick();
    this.eventQueue.tick();
    this.creatureHandler.tick();
  }

  addTopThing(position: Position, thing: any): void {
    /*
     * Adds an item to the top of the item stack
     */
    const tile = this.getTileFromWorldPosition(position);
    if (!tile) return;
    tile.addTopThing(thing);
  }

  addThing(position: Position, item: any, index: number): void {
    /*
     * Adds an item to a specific position at a stack index
     */
    const tile = this.getTileFromWorldPosition(position);
    if (!tile) return;
    tile.addThing(item, index);
  }

  broadcastPosition(position: Position, packet: any): void {
    /*
     * Broadcasts a packet to all observers at the given position
     */
    const chunk = this.getChunkFromWorldPosition(position);
    if (!chunk) return;
    chunk.broadcast(packet);
  }

  addSplash(id: number, position: Position, type: any): void {
    /*
     * Creates a splash item at the bottom
     */
    const splash = getGameServer().database.createThing(id);
    if (splash instanceof Item) 
      splash?.setFluidType(type);
    this.addThing(position, splash, 0);
  }

  sendDistanceEffect(from: Position, to: Position, type: any): void {
    /*
     * Sends a distance magic effect from one position to another
     */
    if (!this.withinBounds(from) || !this.withinBounds(to)) return;
    if (!from.isSameFloor(to)) return;

    const packet = new EffectDistancePacket(from, to, type);
    this.broadcastPosition(to, packet);
    this.broadcastPosition(from, packet);
  }

  sendMagicEffect(position: Position, type: any): void {
    /*
     * Sends a magic effect to the world at a position
     */
    if (!this.withinBounds(position)) return;
    this.broadcastPosition(position, new EffectMagicPacket(position, type));
  }

  broadcastMessage(message: string): void {
    /*
     * Broadcasts a message to all the connected players
     */
    this.broadcastPacket(new ServerMessagePacket(message));
  }

  broadcastPacket(packet: any): void {
    /*
     * Broadcasts a packet to all the connected players
     */
    this.creatureHandler.getConnectedPlayers().forEach((player: Player) => player.write(packet));
  }

  writePlayerLogout(name: string): void {
    /*
     * Writes logout action of a player to all connected gamesockets
     */
    this.broadcastPacket(new PlayerLogoutPacket(name));
  }

  getDataDetails(): { activeMonsters: number; time: string } {
    /*
     * Returns statistics of the world
     */
    return {
      activeMonsters: this.creatureHandler.__numberActiveMonsters,
      time: this.clock.getTimeString(),
    };
  }

  // Delegated methods
  getSpectatingChunks: (position: Position) => any;
  findAvailableTile: (creature: Creature, position: Position) => any;
  getTileFromWorldPosition: (position: Position) => any;
  withinBounds: (position: Position) => boolean;
  getChunkFromWorldPosition: (position: Position) => any;
  findPath: (creature: Creature, start: Position, end: Position, mode: number) => any;
}

export default World;
