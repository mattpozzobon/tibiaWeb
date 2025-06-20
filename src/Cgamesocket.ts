import WebSocket from "ws";
import {
  LatencyPacket,
  ServerErrorPacket,
  PlayerLoginPacket,
  WorldTimePacket,
  PlayerStatePacket,
  ServerStatePacket,
} from "./Cprotocol"
import { CONST, getGameServer, Print } from "./helper/appContext";
import PacketBuffer from "./Cpacket-buffer";
import { IPlayer } from "./interfaces/IPlayer";

class GameSocket {
  public socket: WebSocket;
  public account: string;
  public characterId!: number;
  public player: IPlayer | undefined;
  public __controller: boolean = false;
  public __address: string;
  public __connected: number;
  public __alive: boolean = true;
  public incomingBuffer: PacketBuffer;
  public outgoingBuffer: PacketBuffer;

  constructor(socket: WebSocket, account: string) {
    /*
     * Class GameSocket
     * Wrapper for a websocket that is connected to the gameserver
     */

    this.socket = socket;
    this.account = account;
    this.__address = this.getAddress().address;
    this.__connected = Date.now();

    this.incomingBuffer = new PacketBuffer();
    this.outgoingBuffer = new PacketBuffer();

    this.socket.on("message", this.__handleSocketData.bind(this));
    this.socket.on("error", this.__handleSocketError.bind(this));
    this.socket.on("pong", this.__handlePong.bind(this));
  }

  public getBytesWritten(): number {
    return (this.socket as any)._socket.bytesWritten;
  }

  public getBytesRead(): number {
    return (this.socket as any)._socket.bytesRead;
  }

  private __handleSocketError(): void {
    this.close();
  }

  private __handlePong(): void {
    this.__alive = true;
  }

  public isController(): boolean {
    return this.player !== null && this === this.player?.socketHandler.getController();
  }

  public getLastPacketReceived(): number {
    return this.incomingBuffer.__lastPacketReceived;
  }

  public writeLatencyPacket(): void {
    this.socket.send(new LatencyPacket().getBuffer());
  }

  public isAlive(): boolean {
    return this.__alive;
  }

  public ping(): void {
    if (!this.isAlive()) {
      this.terminate();
      return;
    }

    this.__alive = false;
    this.socket.ping();
  }

  public id(): string {
    return (this.socket as any)._socket.id;
  }

  public getAddress(): { address: string; family: string; port: number } {
    return (this.socket as any)._socket.address();
  }

  public serializeWorld(chunk: any): void {
    chunk.neighbours.forEach((neighbor: any) => neighbor.serialize(this));
  }

  public writeWorldState(player: any): void {
    this.write(new ServerStatePacket());
    this.serializeWorld(player.getChunk());
    this.write(new PlayerStatePacket(player));
    this.write(new WorldTimePacket(getGameServer().world.clock.getTime()));
    getGameServer().world.broadcastPacket(new PlayerLoginPacket(player.getProperty(CONST.PROPERTIES.NAME)));
  }

  public attachPlayerController(player: any): void {
    this.__controller = true;
    player.attachController(this);
  }

  private __isLatencyRequest(buffer: Buffer): boolean {
    return buffer.length === 1 && buffer[0] === CONST.PROTOCOL.CLIENT.LATENCY;
  }

  private __handleSocketData(buffer: Buffer): void {
    Print.packetIn(buffer[0])

    if (!Buffer.isBuffer(buffer)) {
      this.close();
      return;
    }

    if (this.__isLatencyRequest(buffer)) {
      this.writeLatencyPacket();
      return;
    }

    if (!this.isController()) {
      return;
    }
  
    this.incomingBuffer.add(buffer);
  }

  public closeError(message: string): void {
    this.socket.send(new ServerErrorPacket(message).getBuffer());
    this.close();
  }

  public write(packet: any): void {
    const buffer = packet.getBuffer();
    Print.packet(buffer, packet);
    this.outgoingBuffer.add(buffer);
  }

  public terminate(): void {
    this.socket.terminate();
  }

  public close(): void {
    this.socket.close();
  }
}

export default GameSocket;
