import { CreatureForgetPacket, CreatureMovePacket, CreatureTeleportPacket, EffectMagicPacket, PlayerLoginPacket } from "./protocol";
import { FriendStatusPacket } from "./friendlist";
import { CONST, getGameServer } from "./helper/appContext";
import { Position } from "./position";
import Player from "./player";
import Corpse from "./corpse";
import Monster from "./monster";

class CreatureHandler {
  private __creatureMap: Map<number, any>;
  private __playerMap: Map<string, any>;
  public sceneNPCs: Set<any>;
  public __numberActiveMonsters: number;
  private __UIDCounter: number;

  constructor() {
    this.__creatureMap = new Map();
    this.__playerMap = new Map();
    this.sceneNPCs = new Set();
    this.__numberActiveMonsters = 0;
    this.__UIDCounter = 0xffff; // Initial unique identifier
  }

  private __key(name: string): string {
    // Normalize all player-name keys to UPPERCASE for consistent Map usage
    return (name ?? "").toString().toUpperCase();
  }

  assignUID(): number {
    return this.__UIDCounter++;
  }

  getCreatureFromId(id: number): any | null {
    return this.__creatureMap.get(id) || null;
  }

  isCreatureActive(creature: any): boolean {
    return this.__creatureMap.has(creature.getId());
  }

  removeCreature(creature: any): void {
    if (!this.exists(creature)) return;

    this.__creatureMap.delete(creature.getId());
    creature.cleanup();
    creature.broadcast(new CreatureForgetPacket(creature.getId()));

    const chunk = creature.getChunk();
    const tile = creature.getTile();

    if (!chunk || !tile) return;

    chunk.removeCreature(creature);
    tile.removeCreature(creature);
    tile.emit("exit", tile, creature);
  }

  addCreaturePosition(creature: any, position: Position): boolean {
    if (this.exists(creature)) return false;

    const chunk = getGameServer().world.getChunkFromWorldPosition(position);
    const tile = getGameServer().world.getTileFromWorldPosition(position);

    if (!chunk || !tile) return false;

    this.__creatureMap.set(creature.getId(), creature);
    creature.setPosition(position);

    chunk.addCreature(creature);
    tile.addCreature(creature);

    tile.emit("enter", tile, creature);
    this.handleChunkChange(creature, null, chunk);

    return true;
  }

  addPlayer(player: any, position: Position): boolean {
    if (!this.addCreaturePosition(player, position)) return false;

    // IMPORTANT: reference the player first using normalized key
    this.__referencePlayer(player);

    getGameServer().world.broadcastPacket(
      new PlayerLoginPacket(player.getProperty(CONST.PROPERTIES.NAME))
    );

    player.broadcast(new EffectMagicPacket(player.position, CONST.EFFECT.MAGIC.TELEPORT));

    player.spellbook.applyCooldowns();

    if (player.lastVisit) {
      player.sendCancelMessage(
        `Welcome back! Your last visit was at ${new Date(
          player.lastVisit
        ).toISOString()}.`
      );
    }

    // Send friend status updates to online friends
    // player.friendlist.notifyFriendsOfLogin(player);

    return true;
  }

  tick(): void {
    this.__numberActiveMonsters = 0;

    this.sceneNPCs.forEach((npc) => npc.cutsceneHandler.think());

    const connected = this.getConnectedPlayers();
    const activeChunks = getGameServer().world.lattice.getActiveChunks(connected);

    activeChunks.forEach((chunk) => {
      this.__numberActiveMonsters += chunk.monsters.size;

      chunk.players.forEach((player: any) => player.think());
      chunk.npcs.forEach((npc: any) => npc.think());
      chunk.monsters.forEach((monster: any) => monster.think());
    });
  }

  getConnectedPlayers(): Map<string, any> {
    return this.__playerMap;
  }

  private __deferencePlayer(name: string): boolean {
    return this.__playerMap.delete(this.__key(name));
  }

  private __referencePlayer(player: any): void {
    const key = this.__key(player.getProperty(CONST.PROPERTIES.NAME));
    this.__playerMap.set(key, player);
  }

  createNewPlayer(gameSocket: any, data: any): void {
    console.log('DATA', data);
    const player = new Player(data);
    const position = Position.fromLiteral(data.position);

    let tile = getGameServer().world.findAvailableTile(player, position);

    if (!tile) {
      tile = getGameServer().world.getTileFromWorldPosition(player.templePosition);
    }

    if (!tile) {
      return gameSocket.closeError(`The character temple position is invalid: ${player.templePosition.toString()}.`);
    }

    if (!this.addPlayer(player, tile.position)) {
      return gameSocket.closeError("An unexpected error occurred.");
    }

    player.socketHandler.attachController(gameSocket);
  }

  exists(creature: any): boolean {
    return this.__creatureMap.has(creature.getId());
  }

  removePlayer(player: any): void {
    // Notify friends of logout before cleanup
    // player.friendlist.notifyFriendsOfLogout(player);
    
    this.__deferencePlayer(player.getProperty(CONST.PROPERTIES.NAME));
    player.cleanup();
    this.removeCreature(player);
  }

  removePlayerFromWorld(gameSocket: any): void {
    if (!gameSocket.isController()) return;

    getGameServer().world.sendMagicEffect(
      gameSocket.player.position,
      CONST.EFFECT.MAGIC.POFF
    );
    getGameServer().world.writePlayerLogout(
      gameSocket.player.getProperty(CONST.PROPERTIES.NAME)
    );
    this.removePlayer(gameSocket.player);

    gameSocket.player.gameSocket = null;
  }

  getPlayerByName(name: string): any | null {
    return this.__playerMap.get(this.__key(name)) || null;
  }

  isPlayerOnline(player: any): boolean {
    return this.getPlayerByName(player.getProperty(CONST.PROPERTIES.NAME)) === player;
  }

  dieCreature(creature: any): void {
    const corpse = creature.createCorpse();

    getGameServer().world.addTopThing(creature.getPosition(), corpse);

    if (corpse instanceof Corpse) {
      getGameServer().world.addSplash(
        2016,
        creature.getPosition(),
        corpse.getFluidType()
      );
    }

    this.removeCreature(creature);
  }

  spawnCreature(cid: number, position: Position): void {
    const data = getGameServer().database.getMonster(cid.toString());

    if (!data) return;

    const monster = new Monster(cid, data);

    const tile = getGameServer().world.findAvailableTile(monster, position);

    if (!tile) return;

    this.addCreaturePosition(monster, tile.position);
    getGameServer().world.sendMagicEffect(
      tile.position,
      CONST.EFFECT.MAGIC.TELEPORT
    );
  }

  handleChunkChange(
    creature: any,
    oldChunk: any | null,
    newChunk: any | null
  ): void {
    if (oldChunk === newChunk) return;

    if (!newChunk) {
      return creature.leaveOldChunks(oldChunk.neighbours);
    }

    if (!oldChunk) {
      return creature.enterNewChunks(newChunk.neighbours);
    }

    creature.enterNewChunks(oldChunk.difference(newChunk));
    creature.leaveOldChunks(newChunk.difference(oldChunk));
  }

  updateCreaturePosition(creature: any, position: Position): void {
    const oldChunk = getGameServer().world.getChunkFromWorldPosition(
      creature.position
    );
    const newChunk = getGameServer().world.getChunkFromWorldPosition(position);

    this.handleChunkChange(creature, oldChunk, newChunk);

    const oldTile = getGameServer().world.getTileFromWorldPosition(
      creature.position
    );
    oldTile.removeCreature(creature);
    oldChunk.removeCreature(creature);

    creature.position = position;

    const newTile = getGameServer().world.getTileFromWorldPosition(position);
    newChunk.addCreature(creature);
    newTile.addCreature(creature);

    if (creature.is("Player")) {
      this.__alertNPCEnter(creature);
      creature.containerManager.checkContainers();
    }
  }

  private __alertNPCEnter(creature: any): void {
    const chunks = getGameServer().world.getSpectatingChunks(creature);

    chunks.forEach((chunk: { npcs: any[]; }) => {
      chunk.npcs.forEach((npc: any) => {
        if (npc.cutsceneHandler.isInScene() || npc === creature) return;

        if (npc.isWithinRangeOf(creature, 5)) {
          npc.conversationHandler.enterAlert(creature);
        }
      });
    });
  }

  teleportCreature(creature: any, position: Position): boolean {
    const tile = getGameServer().world.getTileFromWorldPosition(position);

    if (!tile) return false;

    const destination =
      getGameServer().world.lattice.findDestination(creature, tile) || creature;

    this.updateCreaturePosition(creature, destination.position);

    destination.broadcast(
      new CreatureTeleportPacket(creature.getId(), destination.getPosition())
    );

    return true;
  }

  moveCreature(creature: any, position: Position): boolean {
    const tile = getGameServer().world.getTileFromWorldPosition(position);

    // Handle elevation moving up & down
    if (creature.isPlayer()) {
      if (tile === null) {
        let dtile = getGameServer().world.getTileFromWorldPosition(position.down());
        if (dtile.hasElevation() && !creature.position.isDiagonal(position)) {
          return this.teleportCreature(creature, position.down());
        }
        return false;
      }

      // Elevation up
      if (getGameServer().world.getTileFromWorldPosition(creature.position).hasElevation() && tile.isOccupied() && !creature.position.isDiagonal(position)) {
        if (getGameServer().world.getTileFromWorldPosition(creature.position.up().south().east()) === null) {
          return this.teleportCreature(creature, position.up());
        }
      }
    }

    // Get the destination tile: this may be different from the requested position
    if (tile.hasDestination()) {
      return this.teleportCreature(creature, position);
    }

    if (!tile || tile.id === 0 || creature.isTileOccupied(tile)) return false;

    const oldTile = getGameServer().world.getTileFromWorldPosition(
      creature.position
    );

    let stepDuration = creature.getStepDuration(tile.getFriction());

    this.updateCreaturePosition(creature, position);

    creature.broadcast(
      new CreatureMovePacket(creature.getId(), position, stepDuration)
    );

    return true;
  }

  addCreatureSpawn(creature: any, literal: any): void {
    const position = Position.fromLiteral(literal);
    creature.position = creature.spawnPosition = position;
    this.addCreaturePosition(creature, position);
  }
}

export default CreatureHandler;
