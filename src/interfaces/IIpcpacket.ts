import { IGameServer } from "./IGameserver";

export interface IIPCPacket {
  writeChangeTime(time: string): Buffer;
  writeChangeStatus(status: string): Buffer;
  writeServerData(gameServer: IGameServer): Buffer;
  writeBroadcastMessage(message: string): Buffer;
  writeShutdown(seconds: number): Buffer;
  //serializeBufferSlice(): Buffer;
  serializeBuffer(): Buffer;
}
