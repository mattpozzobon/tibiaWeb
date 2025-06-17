import { IGameServer } from "interfaces/IGameserver";
import { PacketWriter } from "./Cpacket-writer";
import { IIPCPacket } from "interfaces/IIpcpacket";


export class IPCPacket extends PacketWriter implements IIPCPacket{
  /*
   * Class IPCPacket
   * Wrapper for a single length-prefixed packet that is sent over the IPC channel
   */

  public static PACKETS = {
    // Client
    SHUTDOWN: { code: 0x00, length: 3 },
    BROADCAST_MESSAGE: { code: 0x01, length: 255 },
    SERVER_DATA: { code: 0x02, length: 1 },
    CHANGE_TIME: { code: 0x03, length: 255 },

    // Server
    OK: { code: 0x00, length: 1 },
    SERVER_RESULT: { code: 0x01, length: 3 },
    CHANGE_STATUS: { code: 0x04, length: 255 },
  };

  constructor(packet: number, length: number) {
    /*
     * Wrapper for a single length-prefixed packet
     */
    super(packet, length);
  }

  writeChangeTime(time: string): Buffer {
    /*
     * Writes a packet to change the server time
     */
    //this.writeString(time);
    return this.serializeBufferSlice();
  }

  writeChangeStatus(status: string): Buffer {
    /*
     * Writes a packet to change the server status
     */
    //this.writeString(status);
    return this.serializeBufferSlice();
  }

  writeServerData(gameServer: IGameServer): Buffer {
    /*
     * Writes the requested server data over the channel
     */
    this.writeUInt16(gameServer.server.websocketServer.socketHandler.connectedSockets.size);
    return this.serializeBuffer();
  }

  writeBroadcastMessage(message: string): Buffer {
    /*
     * Writes the packet that defines a message to be broadcasted
     */
    //this.writeString(message);
    return this.serializeBufferSlice();
  }

  writeShutdown(seconds: number): Buffer {
    /*
     * Writes a shutdown command to the server
     */
    this.writeUInt16(seconds);
    return this.serializeBuffer();
  }

  private serializeBufferSlice(): Buffer {
    /*
     * Serializes the written buffer with an a-priori unknown length
     */
    const slice = this.slicePacket();
    return Buffer.concat([Buffer.from([slice.length]), slice]);
  }

  private slicePacket(): Buffer {
    /*
     * Extracts the portion of the buffer that contains written data
     */
    return this.buffer.slice(0, this.index);
  }

  public serializeBuffer(): Buffer {
    /*
     * Serializes the IPC packet by prepending the length of the packet
     */
    return Buffer.concat([Buffer.from([this.buffer.length]), this.buffer]);
  }
}
