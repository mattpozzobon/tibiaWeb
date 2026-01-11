import Tile from "../thing/tile";
import Creature from "../creature/creature";
import Player from "../creature/player/player";
import { ChannelDefaultPacket, EmotePacket } from "../network/protocol";
import { getGameServer } from "../helper/appContext";


class SpeechHandler {
  private __creature: Creature;

  /**
   * Class SpeechHandler
   * Handler for creature speaking abilities
   */
  constructor(creature: Creature) {
    this.__creature = creature;
  }

  public emote(emote: string, color: number): void {
    /*
     * Function SpeechHandler.emote
     * Makes the creature say an emote with a particular color
     */
    this.__creature.broadcastFloor(new EmotePacket(this.__creature, emote, color));
  }

  public internalCreatureYell(message: string, color: number): void {
    /*
     * Function SpeechHandler.internalCreatureYell
     * Yells a message to faraway characters
     */
    return this.__creature.broadcast(new ChannelDefaultPacket(this.__creature, message.toUpperCase(), color));
  }

  public internalCreatureWhisper(message: string, color: number): void {
    /*
     * Function SpeechHandler.internalCreatureWhisper
     * Whispers to nearby creatures on the adjacent tiles
     */

    // Get the tile from the creature position
    const pos = this.__creature.getPosition();
    if (pos){
      const tile: Tile | null = getGameServer().world.getTileFromWorldPosition(pos);
      if (tile) {
        tile.broadcastNeighbours(new ChannelDefaultPacket(this.__creature, message.toLowerCase(), color));
      }
    }
  }

  public internalCreatureSay(message: string, color: number): void {
    /*
     * Function SpeechHandler.internalCreatureSay
     * Writes a creature message to all spectators
     */
    return this.__creature.broadcastFloor(new ChannelDefaultPacket(this.__creature, message, color));
  }

  public privateSay(player: Player, message: string, color: number): void {
    /*
     * Function SpeechHandler.privateSay
     * Writes a message that only a particular player can hear
     */
    return player.write(new ChannelDefaultPacket(this.__creature, message, color));
  }
}

export default SpeechHandler;
