import { PacketHandler } from "./Cpacket-handler";
import { PacketReader } from "./Cpacket-reader";
import { createWriteStream, WriteStream } from "fs";
import { CONFIG, CONST, getGameServer } from "./helper/appContext";

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

  writeOutgoingBuffer(gameSocket: any): void {
    /*
     * Function writeOutgoingBuffer
     * Flushes the outgoing network buffer to the client
     */
    if (gameSocket.socket.destroyed) return;
    if (gameSocket.outgoingBuffer.isEmpty()) return;

    const message = gameSocket.outgoingBuffer.flush();
    gameSocket.socket.send(message);
  }

  handleIO(gameSocket: any): void {
    /*
     * Function handleIO
     * Handles buffered input and output for a game socket
     */
    this.readIncomingBuffer(gameSocket);
    this.writeOutgoingBuffer(gameSocket);
  }

  readIncomingBuffer(gameSocket: any): void {
    /*
     * Function readIncomingBuffer
     * Flushes the incoming network message buffer
     */
    const buffer = gameSocket.incomingBuffer.flush();
    this.packetStream.write(buffer);

    if (buffer.length > CONFIG.SERVER.MAX_PACKET_SIZE) {
      gameSocket.close();
      return;
    }

    const packet = new PacketReader(buffer);

    if (packet.isReadable()) {
      gameSocket.player.idleHandler.extend();
    }

    while (packet.isReadable()) {
      if (gameSocket.socket.destroyed) return;
      try {
        this.__readPacket(gameSocket, packet);
      } catch (exception) {
        console.trace(exception);
        gameSocket.close();
        return;
      }
    }
  }

  private __readPacket(gameSocket: any, packet: PacketReader): void {
    /*
     * Function __readPacket
     * Reads a single packet from the passed buffer
     */
    const opcode = packet.readUInt8();

    switch (opcode) {
      case CONST.PROTOCOL.CLIENT.BUY_OFFER:
        return gameSocket.player.handleBuyOffer(packet.readBuyOffer());
      case CONST.PROTOCOL.CLIENT.TARGET_CANCEL:
        return gameSocket.player.setTarget(null);
      case CONST.PROTOCOL.CLIENT.FRIEND_ADD:
        return gameSocket.player.friendlist.add(packet.readString());
      case CONST.PROTOCOL.CLIENT.FRIEND_REMOVE:
        return gameSocket.player.friendlist.remove(packet.readString());
      case CONST.PROTOCOL.CLIENT.THING_LOOK:
        return this.packetHandler.handleItemLook(gameSocket.player, packet.readPositionAndIndex(gameSocket.player));
      case CONST.PROTOCOL.CLIENT.THING_USE:
        return gameSocket.player.useHandler.handleItemUse(packet.readPositionAndIndex(gameSocket.player));
      case CONST.PROTOCOL.CLIENT.THING_USE_WITH:
        return gameSocket.player.useHandler.handleActionUseWith(packet.readItemUseWith(gameSocket.player));
      case CONST.PROTOCOL.CLIENT.OUTFIT:
        return gameSocket.player.changeOutfit(packet.readOutfit());
      case CONST.PROTOCOL.CLIENT.CHANNEL_LEAVE:
        return getGameServer().world.channelManager.leaveChannel(gameSocket.player, packet.readUInt8());
      case CONST.PROTOCOL.CLIENT.CHANNEL_JOIN:
        return getGameServer().world.channelManager.joinChannel(gameSocket.player, packet.readUInt8());
      case CONST.PROTOCOL.CLIENT.CAST_SPELL:
        return gameSocket.player.spellbook.handleSpell(packet.readUInt16());
      case CONST.PROTOCOL.CLIENT.THING_MOVE:
        return this.packetHandler.moveItem(gameSocket.player, packet.readMoveItem(gameSocket.player));
      case CONST.PROTOCOL.CLIENT.TURN:
        return gameSocket.player.setDirection(packet.readUInt8());
      case CONST.PROTOCOL.CLIENT.CONTAINER_CLOSE:
        return this.packetHandler.handleContainerClose(gameSocket.player, packet.readUInt32());
      case CONST.PROTOCOL.CLIENT.OPEN_KEYRING:
        return gameSocket.player.containerManager.openKeyring();
      case CONST.PROTOCOL.CLIENT.TARGET:
        return this.packetHandler.handleTargetCreature(gameSocket.player, packet.readUInt32());
      
      // TODO: 
      // case CONST.PROTOCOL.CLIENT.CLIENT_USE_TILE:
      //   return this.packetHandler.handleTileUse(gameSocket.player, packet.readWorldPosition());
      case CONST.PROTOCOL.CLIENT.CHANNEL_MESSAGE:
        return this.packetHandler.handlePlayerSay(gameSocket.player, packet.readClientMessage());
      case CONST.PROTOCOL.CLIENT.LOGOUT:
        return this.packetHandler.handleLogout(gameSocket);
      case CONST.PROTOCOL.CLIENT.CHANNEL_PRIVATE_MESSAGE:
        return getGameServer().world.channelManager.handleSendPrivateMessage(gameSocket.player, packet.readPrivateMessage());
      case CONST.PROTOCOL.CLIENT.MOVE:
        return gameSocket.player.movementHandler.handleMovement(packet.readUInt8());
      default:
        gameSocket.close();
    }
  }
}
