import Channel from "Cchannel";

export interface IGlobalChannel extends Channel{
  has(player: any): boolean;
  join(player: any): void;
  leave(player: any): void;
  send(player: any, clientPacket: { message: string }): void;
}
