import { IDefaultChannel, IPlayer } from "interfaces/IPlayer";
import DefaultChannel from "./Cchannel-default";
import GlobalChannel from "./Cchannel-global";
import { ChannelPrivatePacket } from "./Cprotocol";
import { CONST, getGameServer } from "./helper/appContext";
import { IGlobalChannel } from "interfaces/IChannel-global";


export class ChannelManager {
  private __channels: Map<number, IDefaultChannel | IGlobalChannel>;

  constructor() {
    /*
     * Class ChannelManager
     * Container for all channels in the world
     */

    this.__channels = new Map();

    // Initialize configured channels
    this.__channels.set(CONST.CHANNEL.DEFAULT, new DefaultChannel(CONST.CHANNEL.DEFAULT, "Default"));
    this.__channels.set(CONST.CHANNEL.WORLD, new GlobalChannel(CONST.CHANNEL.WORLD, "World"));
    this.__channels.set(CONST.CHANNEL.TRADE, new GlobalChannel(CONST.CHANNEL.TRADE, "Trade"));
    this.__channels.set(CONST.CHANNEL.HELP, new GlobalChannel(CONST.CHANNEL.HELP, "Help"));
  }

  getChannel(cid: number): IDefaultChannel | IGlobalChannel | null {
    /*
     * Returns a channel from the configured list of channels
     */
    return this.__channels.get(cid) || null;
  }

  leaveChannel(player: IPlayer, cid: number): void {
    /*
     * Allows a player to leave a general channel with identifier ID
     */
    const channel = this.getChannel(cid);

    if (!channel) {
      player.sendCancelMessage("This channel does not exist.");
      return;
    }

    // Only global channels can be left: the default channel must always exist
    if (channel instanceof DefaultChannel) {
      return;
    }

    if (channel instanceof GlobalChannel) 
      // Remove the player from the channel
      channel.leave(player);
  }

  joinChannel(player: IPlayer, id: number): void {
    /*
     * Joins a player to a global channel with identifier id
     */
    const channel = this.getChannel(id);

    if (!channel) {
      player.sendCancelMessage("This channel does not exist.");
      return;
    }

    // Only global channels can be joined
    if (channel instanceof DefaultChannel) {
      return;
    }

    if (channel instanceof GlobalChannel) 
      // Remove the player from the channel
      channel.join(player);
  }

  handleSendPrivateMessage(player: IPlayer, packet: { name: string; message: string }): void {
    /*
     * Sends a private message to the target gameSocket (referenced by name)
     */
    if (packet.name === player.getProperty(CONST.PROPERTIES.NAME)) {
      player.sendCancelMessage("You cannot send messages to yourself.");
      return;
    }

    // Get a reference to the game socket from the player name
    const targetPlayer = getGameServer().world.creatureHandler.getPlayerByName(packet.name);

    if (!targetPlayer) {
      player.sendCancelMessage("A player with this name is not online.");
      return;
    }

    targetPlayer.write(new ChannelPrivatePacket(player.getProperty(CONST.PROPERTIES.NAME), packet.message));
  }
}

export default ChannelManager;
