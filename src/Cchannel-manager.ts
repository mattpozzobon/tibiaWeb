// src/Cchannel-manager.ts  (only comment tweak shown for clarity)
import { IDefaultChannel, IPlayer } from "interfaces/IPlayer";
import DefaultChannel from "./Cchannel-default";
import GlobalChannel from "./Cchannel-global";
import { ChannelPrivatePacket } from "./Cprotocol";
import { CONST, getGameServer } from "./helper/appContext";
import { IGlobalChannel } from "interfaces/IChannel-global";

export class ChannelManager {
  private __channels: Map<number, IDefaultChannel | IGlobalChannel>;

  constructor() {
    this.__channels = new Map();
    this.__channels.set(CONST.CHANNEL.DEFAULT, new DefaultChannel(CONST.CHANNEL.DEFAULT, "Default"));
    this.__channels.set(CONST.CHANNEL.WORLD, new GlobalChannel(CONST.CHANNEL.WORLD, "World"));
    this.__channels.set(CONST.CHANNEL.TRADE, new GlobalChannel(CONST.CHANNEL.TRADE, "Trade"));
    this.__channels.set(CONST.CHANNEL.HELP, new GlobalChannel(CONST.CHANNEL.HELP, "Help"));
  }

  getChannel(cid: number): IDefaultChannel | IGlobalChannel | null {
    return this.__channels.get(cid) || null;
  }

  leaveChannel(player: IPlayer, cid: number): void {
    const channel = this.getChannel(cid);
    if (!channel) return player.sendCancelMessage("This channel does not exist.");

    // Only global channels can be left
    if (channel instanceof DefaultChannel) return;

    if (channel instanceof GlobalChannel) {
      channel.leave(player);
    }
  }

  joinChannel(player: IPlayer, id: number): void {
    const channel = this.getChannel(id);
    if (!channel) return player.sendCancelMessage("This channel does not exist.");

    // Only global channels can be joined
    if (channel instanceof DefaultChannel) return;

    if (channel instanceof GlobalChannel) {
      // Join the player to the channel
      channel.join(player);
    }
  }

  handleSendPrivateMessage(player: IPlayer, packet: { name: string; message: string }): void {
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
