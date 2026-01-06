// src/Cchannel-global.ts
import Channel from "./channel";
import { ChannelWritePacket, ChannelJoinPacket /*, ChannelClosePacket */ } from "./protocol";
import { CONST } from "./helper/appContext";
import { IPlayer } from "interfaces/IPlayer";

export default class GlobalChannel extends Channel {
  private __players: Set<IPlayer>;

  constructor(id: number, name: string) {
    super(id, name);
    this.__players = new Set<IPlayer>();
  }

  has(player: IPlayer): boolean {
    return this.__players.has(player);
  }

  join(player: IPlayer): void {
    if (this.__players.has(player)) return;

    this.__players.add(player);

    // Notify the joining player so the client can open the tab / mark membership
    player.write(new ChannelJoinPacket(this));

    // (optional) broadcast system message to others, if you support it
    // this.broadcastSystem(`${player.getProperty(CONST.PROPERTIES.NAME)} joined ${this.name}`, player);
  }

  leave(player: IPlayer): void {
    if (!this.__players.has(player)) return;

    this.__players.delete(player);

    // (optional) tell the client to close the tab
    // player.write(new ChannelClosePacket(this.id));
    // this.broadcastSystem(`${player.getProperty(CONST.PROPERTIES.NAME)} left ${this.name}`, player);
  }

  send(player: IPlayer, clientPacket: { message: string }): void {
    console.log('message on global channel:', clientPacket.message);

    const packet = new ChannelWritePacket(
      this.id,
      player.getProperty(CONST.PROPERTIES.NAME),
      clientPacket.message,
      player.getTextColor()
    );

    this.__players.forEach((subscriber) => subscriber.write(packet));
  }

  // (optional) helper
  // private broadcastSystem(text: string, except?: IPlayer) { ... }
}
