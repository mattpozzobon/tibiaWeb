import { PacketHandler } from "./packet-handler";
import { PacketReader } from "./packet-reader";
import { createWriteStream, WriteStream } from "fs";
import { CONFIG, CONST, getGameServer } from "./helper/appContext";
import GameSocket from "gamesocket";

export class NetworkManager {
  private packetHandler: PacketHandler;
  private packetStream: WriteStream;

  constructor() {
    /*
     * Class NetworkManager
     * Accepts all the incoming network messages and delegates to the appropriate handlers
     *
     * API:
     * 
     * - writeOutgoingBuffer(socket): Writes the outgoing buffered messages to the socket.
     * - readIncomingBuffer(socket): Reads the incoming buffered messages from the socket.
     * - getDataDetails(): Returns the number of bytes written/read by the server.
     */

    this.packetHandler = new PacketHandler();
    this.packetStream = createWriteStream("packets.wal");
  }

  writeOutgoingBuffer(gameSocket: GameSocket): void {
    /*
     * Function writeOutgoingBuffer
     * Flushes the outgoing network buffer to the client
     */
    if (gameSocket.socket.readyState !== (gameSocket.socket.constructor as typeof WebSocket).OPEN) return;
    if (gameSocket.outgoingBuffer.isEmpty()) return;

    const message = gameSocket.outgoingBuffer.flush();
    gameSocket.socket.send(message);
  }

  handleIO(gameSocket: GameSocket): void {
    /*
     * Function handleIO
     * Handles buffered input and output for a game socket
     */
    this.readIncomingBuffer(gameSocket);
    this.writeOutgoingBuffer(gameSocket);
  }

  readIncomingBuffer(gameSocket: GameSocket): void {
    /*
     * Function readIncomingBuffer
     * Flushes the incoming network message buffer
     */
    
    // Check for socket timeout - only for logged-in players
    if (gameSocket.player) {
      const lastPacketReceived = gameSocket.getLastPacketReceived();
      const timeSinceLastPacket = Date.now() - lastPacketReceived;
      const timeoutMs = CONFIG.SERVER.SOCKET_TIMEOUT_MS || 120000; // Default 120 seconds
      
      if (timeSinceLastPacket > timeoutMs) {
        // Socket has been idle too long - disconnect
        console.log(`Disconnecting socket due to timeout: ${timeSinceLastPacket}ms since last packet`);
        gameSocket.close();
        return;
      }
    }
    
    const buffer = gameSocket.incomingBuffer.flush();
    this.packetStream.write(buffer);

    if (buffer.length > CONFIG.SERVER.MAX_PACKET_SIZE) {
      gameSocket.close();
      return;
    }

    const packet = new PacketReader(buffer);

    if (packet.isReadable()) {
      gameSocket.player?.idleHandler.extend();
    }

    while (packet.isReadable()) {
      if (gameSocket.socket.readyState !== (gameSocket.socket.constructor as typeof WebSocket).OPEN) return;
      try {
        this.__readPacket(gameSocket, packet);
      } catch (exception) {
        console.trace(exception);
        gameSocket.close();
        return;
      }
    }
  }

  private __readPacket(gameSocket: GameSocket, packet: PacketReader): void {
    /*
     * Reads a single packet from the passed buffer using a lookup table.
     */
    const opcode = packet.readUInt8();
  
    // Early return if there is no player.
    if (!gameSocket.player) {
      return;
    }
  
    const handlers: Record<number, (gs: GameSocket, p: PacketReader) => void> = {

      [CONST.PROTOCOL.CLIENT.BUY_OFFER]:                (gs, p) => gs.player!.handleBuyOffer(p.readBuyOffer()),
      // TODO
      //[CONST.PROTOCOL.CLIENT.TARGET_CANCEL]:            (gs, p) => gs.player!.setTarget(null),

      [CONST.PROTOCOL.CLIENT.MOVE]:                     (gs, p) => gs.player!.movementHandler.handleMovement(p.readUInt8()),
  
      [CONST.PROTOCOL.CLIENT.FRIEND_ADD]:               (gs, p) => gs.player!.friendlist.add(p.readString(), gs.player!),

      [CONST.PROTOCOL.CLIENT.FRIEND_REMOVE]:            (gs, p) => gs.player!.friendlist.remove(p.readString(), gs.player!),
  
      [CONST.PROTOCOL.CLIENT.THING_USE]:                (gs, p) => gs.player!.useHandler.handleItemUse(p.readPositionAndIndex(gs.player!)),
  
      [CONST.PROTOCOL.CLIENT.THING_USE_WITH]:           (gs, p) => gs.player!.useHandler.handleActionUseWith(p.readItemUseWith(gs.player!)),
  
      [CONST.PROTOCOL.CLIENT.OUTFIT]:                   (gs, p) => gs.player!.changeOutfit(p.readOutfit(gs.player!)),
  
      [CONST.PROTOCOL.CLIENT.CAST_SPELL]:               (gs, p) => gs.player!.spellbook.handleSpell(p.readUInt16()),
  
      [CONST.PROTOCOL.CLIENT.TURN]:                     (gs, p) => gs.player!.setDirection(p.readUInt8()),
  
      [CONST.PROTOCOL.CLIENT.OPEN_KEYRING]:             (gs, p) => gs.player!.containerManager.openKeyring(),

      [CONST.PROTOCOL.CLIENT.USE_BELT_POTION]:          (gs, p) => gs.player!.useHandler.handleUseBeltPotion(p.readUInt8()),
  
      [CONST.PROTOCOL.CLIENT.TARGET]:                   (gs, p) => this.packetHandler.handleTargetCreature(gs.player!, p.readUInt32()),
  
      [CONST.PROTOCOL.CLIENT.CHANNEL_MESSAGE]:          (gs, p) => this.packetHandler.handlePlayerSay(gs.player!, p.readClientMessage()),
  
      [CONST.PROTOCOL.CLIENT.LOGOUT]:                   (gs, p) => this.packetHandler.handleLogout(gs),

      [CONST.PROTOCOL.CLIENT.THING_LOOK]:               (gs, p) => this.packetHandler.handleItemLook(gs.player!, p.readPositionAndIndex(gs.player!)),
      
      [CONST.PROTOCOL.CLIENT.THING_MOVE]:               (gs, p) => this.packetHandler.moveItem(gs.player!, p.readMoveItem(gs.player!)),

      [CONST.PROTOCOL.CLIENT.CONTAINER_CLOSE]:          (gs, p) => this.packetHandler.handleContainerClose(gs.player!, p.readUInt32()),

  
      [CONST.PROTOCOL.CLIENT.CHANNEL_PRIVATE_MESSAGE]:  (gs, p) => getGameServer().world.channelManager.handleSendPrivateMessage(gs.player!, p.readPrivateMessage()),

      [CONST.PROTOCOL.CLIENT.CHANNEL_LEAVE]:            (gs, p) => getGameServer().world.channelManager.leaveChannel(gs.player!, p.readUInt8()),
  
      [CONST.PROTOCOL.CLIENT.CHANNEL_JOIN]:             (gs, p) => getGameServer().world.channelManager.joinChannel(gs.player!, p.readUInt8()),
  
    };
  
    const handler = handlers[opcode];
    if (handler) {
      return handler(gameSocket, packet);
    } else {
      gameSocket.close();
    }
  }
    
}
