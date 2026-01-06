
import * as net from "net";
import * as path from "path";

import { CONFIG, getGameServer } from "../helper/appContext";
import { PacketReader } from "./packet-reader";
import { IPCPacket } from "./ipcpacket";

export class IPCSocket {
  /*
   * Class IPCSocket
   * Socket for interprocess communication
   */

  private clients: Set<net.Socket>;
  private socket: net.Server;

  constructor() {
    this.clients = new Set();

    // Open a local socket for incoming connections
    this.socket = net.createServer();
    this.socket.listen(this.getSocketPath());

    this.socket.on("connection", this.handleConnection.bind(this));
    this.socket.on("error", this.handleSocketError.bind(this));
    this.socket.on("close", this.handleSocketClose.bind(this));
  }

  private getSocketPath(): string {
    /*
     * Determines the socket path based on the platform
     */
    if (process.platform === "win32") {
      return path.join("\\\\?\\pipe", CONFIG.IPC.SOCKET);
    }
    return CONFIG.IPC.SOCKET;
  }

  private handleSocketClose(): void {
    /*
     * Handles the closing event of the IPC socket
     */
    console.log(`The IPC Socket at ${this.getSocketPath()} has been closed.`);
  }

  private handleSocketError(error: NodeJS.ErrnoException): void {
    /*
     * Handles an error on the IPC socket
     */
    if (error.code === "EADDRINUSE") {
      console.log("Could not start the IPC server: the address or port is already in use.");
    }
  }

  private handleSocketData(socket: any, data: Buffer): void {
    /*
     * Implements a simple length-prefix protocol to determine when a packet is complete and emits it
     */
    const ref = socket.__dataBuffer as DataBuffer;

    if (ref.buffers.length === 0) {
      ref.length = data[0];
    }

    ref.size += data.length;
    ref.buffers.push(data);

    while (ref.size > ref.length) {
      const buf = Buffer.concat(ref.buffers);

      this.handlePacket(socket, buf.slice(1, ref.length + 1));

      if (ref.length + 1 === ref.size) {
        ref.length = 0;
        ref.size = 0;
        ref.buffers = [];
        return;
      }

      const remaining = buf.slice(ref.length + 1);
      ref.buffers = [remaining];
      ref.size = remaining.length;
      ref.length = remaining[0];
    }
  }

  private internalHandlePacket(packet: PacketReader): Buffer {
    /*
     * Internal function to handle an incoming packet
     */
    switch (packet.readUInt8()) {
      case 0x00:
        getGameServer().scheduleShutdown(packet.readUInt16());
        break;
      case 0x01:
        throw new Error("Unhandled case");
        //getGameServer().broadcast(packet.readString16());
        break;
      case 0x02:
        return new IPCPacket(IPCPacket.PACKETS.SERVER_RESULT.code, IPCPacket.PACKETS.SERVER_RESULT.length).writeServerData(getGameServer());
      case 0x03:
        getGameServer().world.clock.changeTime(packet.readString16());
        break;
      case 0x04:
        const status = packet.readString16();
        if (status === "listen") {
          getGameServer().server.listen();
        } else if (status === "closed") {
          getGameServer().server.close();
        }
        break;
    }
    return new IPCPacket(IPCPacket.PACKETS.OK.code, IPCPacket.PACKETS.OK.length).serializeBuffer();
  }

  private handlePacket(socket: net.Socket, buffer: Buffer): void {
    /*
     * Handles a complete incoming buffer
     */
    socket.write(this.internalHandlePacket(new PacketReader(buffer)));
  }

  private handleConnection(socket: any): void {
    /*
     * Handles an incoming socket connection
     */
    this.clients.add(socket);

    socket.__dataBuffer = {
      buffers: [],
      length: 0,
      size: 0,
    };

    socket.on("data", (data: Buffer<ArrayBufferLike>) => this.handleSocketData(socket, data));
    socket.on("close", () => this.closeSocket(socket));
  }

  private closeSocket(socket: net.Socket): void {
    /*
     * Closes a particular socket by deleting it from the list of references
     */
    this.clients.delete(socket);
  }

  public close(): void {
    /*
     * Closes the IPC socket by destroying the remaining clients (if any)
     */
    this.clients.forEach((socket) => socket.destroy());
    this.socket.close();
  }
}

interface DataBuffer {
  buffers: Buffer[];
  length: number;
  size: number;
}
