import { IPlayer } from "interfaces/IPlayer";
import Outfit from "./Coutfit";
import Packet from "./Cpacket";
import { Position } from "./Cposition";
import { getGameServer } from "./helper/appContext";
import ITile from "interfaces/ITile";
import { IContainer } from "interfaces/IThing";
import Equipment from "Cequipment";


export interface MoveItemEvent {
  fromWhere: ITile | IContainer | Equipment; // Replace `any` with the actual type when available
  fromIndex: number;
  toWhere: ITile | IContainer | Equipment; // Replace `any` with the actual type when available
  toIndex: number;
  count: number;
}

export interface PositionAndIndex {
  which: any; // Replace `any` with the actual type when available
  index: number;
}

export interface ClientMessage {
  id: number;
  loudness: number;
  message: string;
}

export class PacketReader extends Packet {
  buffer: Buffer;
  index: number;

  constructor(buffer: Buffer) {
    /*
     * Class PacketReader
     * Wrapper for a buffer to make it a binary buffer easily readable (used in networking protocol)
     */
    super();
    this.buffer = buffer;
    this.index = 0;
  }

  readBuyOffer(): { id: number; index: number; count: number } {
    /*
     * Reads a buy buffer that was made by the player
     */
    return {
      id: this.readUInt32(),
      index: this.readUInt8(),
      count: this.readUInt8(),
    };
  }


  readMoveItem(player: any): MoveItemEvent {
    /*
    * Reads a complete move item event from the packet
    */


    
    const fromWhere = this.readMoveEvent(player);

    
    const fromIndex = this.readUInt8();

    
    const toWhere = this.readMoveEvent(player);

    
    const toIndex = this.readUInt8();

    
    const count = this.readUInt8();

    const t = {
      fromWhere,
      fromIndex,
      toWhere,
      toIndex,
      count,
    }

    return t;
  } 

  readAccountDetails(): { account: string; password: string } {
    /*
     * Reads the account details (name, password) from the packet
     */
    return {
      account: this.readString(),
      password: this.readString(),
    };
  }

  readClientMessage(): ClientMessage {
    /*
     * Reads a message sent by the client
     */
    return {
      id: this.readUInt8(),
      loudness: this.readUInt8(),
      message: this.readString(),
    };
  }

  readPrivateMessage(): { name: string; message: string } {
    /*
     * Reads a private message from the packet
     */
    return {
      name: this.readString(),
      message: this.readString(),
    };
  }

  readItemUseWith(player: any): {
    fromWhere: any;
    fromIndex: number;
    toWhere: any;
    toIndex: number;
  } {
    /*
     * Reads a packet for a use-with event
     */
    return {
      fromWhere: this.readMoveEvent(player),
      fromIndex: this.readUInt8(),
      toWhere: this.readMoveEvent(player),
      toIndex: this.readUInt8(),
    };
  }

  isReadable(): boolean {
    /*
     * Returns whether the packet is still readable
     */
    return this.index < this.buffer.length;
  }

  seek(offset: number): void {
    /*
     * Goes to a particular offset in the packet (use with care)
     */
    this.index = offset;
  }

  readPositionAndIndex(player: IPlayer): PositionAndIndex {
    /*
     * Reads a position (tile or container) and an index
     */
    return {
      which: this.readMoveEvent(player),
      index: this.readUInt8(),
    };
  }

  
  readMoveEvent(player: IPlayer): any {
    /*
     * Reads an item movement event (from tile, container, equipment)
     */
    const eventType = this.readUInt8();
    switch (eventType) {
      case 0:
        this.readUInt16();
        return player.containerManager.getContainerFromId(this.readUInt32());
      case 1:
        return getGameServer().world.getTileFromWorldPosition(this.readWorldPosition());
      default:
        return null;
    }
  }

  readString16(): string {
    /*
     * Reads a string from the packet of max length 2^16
     */
    const length = this.readUInt16();
    const string = this.buffer.subarray(this.index, this.index + length).toString();
    this.advance(length);
    return string;
  }

  readString(): string {
    /*
     * Reads a string from the packet of max length 2^8
     */
    const length = this.readUInt8();
    const string = this.buffer.subarray(this.index, this.index + length).toString();
    this.advance(length);
    return string;
  }

  readUInt8(): number {
    /*
     * Reads a single byte unsigned integer from the packet
     */
    // const result = this.buffer.readUInt8(this.index);
    // this.advance(1);
    return this.buffer[this.index++];;
  }

  readUInt16(): number {
    /*
     * Reads a 2-byte unsigned integer from the packet
     */
    // const result = this.buffer.readUInt16LE(this.index);
    // this.advance(2);
    return this.buffer[this.index++] + (this.buffer[this.index++] << 8);
  }

  readUInt32(): number {
    /*
     * Reads a 4-byte unsigned integer (usually identifiers) from the packet
     */
    // const result = this.buffer.readUInt32LE(this.index);
    // this.advance(4);
    return this.buffer[this.index++] + (this.buffer[this.index++] << 8) + (this.buffer[this.index++] << 16) + (this.buffer[this.index++] << 24);
  }

  readBoolean(): boolean {
    /*
     * Reads a boolean packet
     */
    return this.readUInt8() === 1;
  }

  readOutfit(player?: any): Outfit {
    const updatedOutfit =  player.getOutfit();

    updatedOutfit.equipment.hair = this.readUInt16();
    updatedOutfit.details.head = this.readUInt8();
    updatedOutfit.renderHelmet = this.readBoolean();
    return updatedOutfit;
  }

  readWorldPosition(): Position {
    /*
     * Reads a world position from the packet
     */
    return new Position(this.readUInt16(), this.readUInt16(), this.readUInt16());
  }

  advance(amount: number): void {
    /*
     * Advances the current reading index
     */
    this.index += amount;
  }
}
