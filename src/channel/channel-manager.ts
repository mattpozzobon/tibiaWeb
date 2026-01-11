import DefaultChannel from "./channel-default";
import GlobalChannel from "./channel-global";
import { ChannelPrivatePacket } from "../network/protocol";
import { CONST, getGameServer } from "../helper/appContext";
import Player from "creature/player/player";

export class ChannelManager {
  private __channels: Map<number, DefaultChannel | GlobalChannel>;

  constructor() {
    this.__channels = new Map();
    this.__channels.set(CONST.CHANNEL.DEFAULT, new DefaultChannel(CONST.CHANNEL.DEFAULT, "Default"));
    this.__channels.set(CONST.CHANNEL.WORLD, new GlobalChannel(CONST.CHANNEL.WORLD, "World"));
    this.__channels.set(CONST.CHANNEL.TRADE, new GlobalChannel(CONST.CHANNEL.TRADE, "Trade"));
    this.__channels.set(CONST.CHANNEL.HELP, new GlobalChannel(CONST.CHANNEL.HELP, "Help"));
  }

  getChannel(cid: number): DefaultChannel | GlobalChannel | null {
    return this.__channels.get(cid) || null;
  }

  leaveChannel(player: Player, cid: number): void {
    const channel = this.getChannel(cid);
    if (!channel) return player.sendCancelMessage("This channel does not exist.");

    // Only global channels can be left
    if (channel instanceof DefaultChannel) return;

    if (channel instanceof GlobalChannel) {
      channel.leave(player);
    }
  }

  joinChannel(player: Player, id: number): void {
    const channel = this.getChannel(id);
    if (!channel) return player.sendCancelMessage("This channel does not exist.");

    // Only global channels can be joined
    if (channel instanceof DefaultChannel) return;

    if (channel instanceof GlobalChannel) {
      // Join the player to the channel
      channel.join(player);
    }
  }

  handleSendPrivateMessage(player: Player, packet: { name: string; message: string }): void {
    if (packet.name === player.getProperty(CONST.PROPERTIES.NAME)) {
      player.sendCancelMessage("You cannot send messages to yourself.");
      return;
    }

    const targetPlayer = getGameServer().world.creatureHandler.getPlayerByName(packet.name);
    if (!targetPlayer) return player.sendCancelMessage("A player with this name is not online.");

    targetPlayer.write(new ChannelPrivatePacket(player.getProperty(CONST.PROPERTIES.NAME), packet.message));
  }
}

export default ChannelManager;
