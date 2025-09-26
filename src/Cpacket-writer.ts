import { Packet } from "./Cpacket";
import { Outfit } from "./Coutfit";
import { Position } from "./Cposition";
import { CONST, getGameServer } from "./helper/appContext";

export class PacketWriter extends Packet {
  private inBounds: boolean;
  public buffer: Buffer;
  public index: number;

  static readonly MAX_PACKET_SIZE = 65536;

  constructor(opcode: number, length: number = 0) {
    /*
     * Wrapper for a packet buffer to write packets to the clients
     */
    super();
    this.inBounds = true;
    this.index = 0;
    this.buffer = Buffer.allocUnsafe(1 + length);
    this.writeUInt8(opcode);
  }

  canWrite(bytes: number): boolean {
    /*
     * Returns true if there is available space in the packet
     */
    return (this.inBounds = this.index + bytes <= this.buffer.length);
  }

  advance(amount: number): void {
    /*
     * Advances the index in the buffer by a given amount
     */
    this.index += amount;
  }

  writeUInt8(value: number): void {
    /*
     * Writes an unsigned byte to the packet
     */
    // if (!this.canWrite(1)) return;
    // this.buffer.writeUInt8(value, this.index);
    // this.advance(1);
    this.buffer[this.index++] = value;
  }

  writeUInt16(value: number): void {
    /*
     * Writes two unsigned bytes to the packet
     */
    // if (!this.canWrite(2)) return;
    // this.buffer.writeUInt16LE(value, this.index);
    // this.advance(2);
    this.buffer[this.index++] = value;
    this.buffer[this.index++] = value >> 8;
  }

  writeUInt32(value: number): void {
    /*
     * Writes four unsigned bytes to the packet
     */
    // if (!this.canWrite(4)) return;
    // this.buffer.writeUInt32LE(value, this.index);
    // this.advance(4);
    this.buffer[this.index++] = value;
    this.buffer[this.index++] = value >> 8;
    this.buffer[this.index++] = value >> 16;
    this.buffer[this.index++] = value >> 24;
  }

  writeNull(amount: number): void {
    /*
     * Writes a number of null values to the buffer
     */
    if (!this.canWrite(amount)) return;

    const mod1 = Math.floor(amount / 4);
    const mod2 = amount % 4;

    for (let i = 0; i < mod1; i++) {
      this.writeUInt32(0);
    }

    for (let i = 0; i < mod2; i++) {
      this.writeUInt8(0);
    }
  }
  
  private set(data: Uint8Array): void {
    // Make sure we can actually write 'data.length' more bytes
    if (!this.canWrite(data.length)) {
      return;
    }
  
    // Convert the Uint8Array into a Node Buffer
    const tempBuf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    // Now copy that into this.buffer at the current index
    tempBuf.copy(this.buffer, this.index);
  
    this.index += data.length;
  }
  

  writeBuffer(buffer: Uint8Array<ArrayBufferLike>): void {
    // Truncate if buffer is too large
    if (buffer.length >= 0xFFFF) {
      buffer = buffer.subarray(0, 0xFFFF);
    }

    // Check if there's enough space for the 2-byte length + actual data
    if (!this.canWrite(2 + buffer.length)) {
      return;
    }

    // Write the 2-byte message length
    this.writeUInt16(buffer.length);

    // Now write the actual data bytes
    this.set(buffer);
  }

  writeClientId(id: number): void {
    /*
     * Writes the client ID by converting server ID to client ID
     */
    this.writeUInt16(getGameServer().database.getClientId(id));
  }

  getBuffer(): Buffer {
    //console.log(`📦 getBuffer() - Opcode in Buffer[0]: ${this.buffer[0]}, Full Buffer:`, this.buffer);
    
    if (this.index === this.buffer.length) {
        return this.buffer; // Return the full buffer if it's completely written
    }
    
    return this.buffer.subarray(0, this.index);
  }

  writeCreatureType(creature: any): void {
    /*
     * Writes the identifier for creature types to the client
     */
    switch (creature.constructor.name) {
      case "Player":
        this.writeUInt8(CONST.TYPES.PLAYER);
        break;
      case "Monster":
        this.writeUInt8(CONST.TYPES.MONSTER);
        break;
      case "NPC":
        this.writeUInt8(CONST.TYPES.NPC);
        break;
    }
  }

  writeMounts(ids: Set<number>): void {
    /*
     * Writes the available mount identifiers and names to the packet
     */
    ids = ids ?? new Set(); 

    const mounts = Array.from(ids).filter((id) => Outfit.MOUNTS.hasOwnProperty(id));
    this.writeUInt8(mounts.length);

    mounts.forEach((id) => {
      this.writeUInt16(id);
      const stringEncoded = PacketWriter.encodeString(Outfit.getMountName(id));
      this.writeBuffer(stringEncoded);
    });
  }

  writeOutfits(ids: Set<number>): void {
    /*
     * Writes the available outfits to the client
     */
    const outfits = Array.from(ids).filter((id) => Outfit.OUTFITS.hasOwnProperty(id));
    this.writeUInt8(outfits.length);

    outfits.forEach((id) => {
      this.writeUInt16(id);
      const stringEncoded = PacketWriter.encodeString(Outfit.getName(id));
      this.writeBuffer(stringEncoded);
    });
  }

  writeFriends(friends: any[]): void {
    /*
     * Writes the friend list to the client
     */
    const count = Math.min(255, friends.length);
    this.writeUInt8(count);

    for (let i = 0; i < count; i++) {
      const f = friends[i];
      const nameBytes = Buffer.from(f.name || '', 'utf8');
      const n = Math.min(255, nameBytes.length);

      this.writeUInt8(n);                 // 1-byte length
      for (let j = 0; j < n; j++) {       // raw bytes, NO writeBuffer here
        this.writeUInt8(nameBytes[j]);
      }
      this.writeUInt8(f.online ? 1 : 0);  // status byte
    }
  }

  writeFriendRequests(requests: string[]): void {
    /*
     * Writes the friend requests list to the client
     */
    const count = Math.min(255, requests.length);
    this.writeUInt8(count);

    for (let i = 0; i < count; i++) {
      const requesterName = requests[i];
      const nameBytes = Buffer.from(requesterName || '', 'utf8');
      const n = Math.min(255, nameBytes.length);

      this.writeUInt8(n);                 // 1-byte length
      for (let j = 0; j < n; j++) {       // raw bytes, NO writeBuffer here
        this.writeUInt8(nameBytes[j]);
      }
    }
  }

  writeEquipment(equipment: any): void {
    /*
     * Writes all equipment to a packet
     */
    equipment.container.getSlots().forEach((item: any) => {
      this.writeItem(item);
    });
  }

  writeItem(item: any): void {
    /*
     * Writes an item (id and count) to the packet
     */
    if (!item) {
      this.writeUInt16(0);
      this.writeUInt8(0);
      return;
    }

    this.writeClientId(item.id);
    this.writeUInt8(item.count);
  }

  writeTile(tile: any): void {
    /*
     * Serializes a single tile with its client-side identifier
     */
    if (!tile) {
      this.writeNull(4);
      return;
    }

    this.writeClientId(tile.id);
    this.writeUInt8(tile.tilezoneFlags?.flag || 0);

    const items = tile.getItems();
    this.writeUInt8(items.length);
    items.forEach((item: any) => this.writeItem(item));
  }

  writePosition(position: Position): void {
    /*
     * Writes x, y, z position to the packet
     */
    this.writeUInt16(position.x);
    this.writeUInt16(position.y);
    this.writeUInt16(position.z);
  }

  writeWorldTime(worldTime: number) {
    /*
     * Function PacketWriter.writeWorldTime
     * Writes the world time to the packet
     */
    this.writeUInt32(worldTime); // Assuming world time is a 32-bit integer
    return this; // Enable method chaining
  };

  writeOutfit(outfit: any): void {
    /*
     * Writes outfit details to the packet
     */
    this.writeUInt16(outfit.id);

    if (outfit.details) {
      this.writeUInt8(outfit.details.head);
      this.writeUInt8(outfit.details.body);
      this.writeUInt8(outfit.details.legs);
      this.writeUInt8(outfit.details.feet);
    } else {
      this.writeNull(4);
    }

    if (outfit.equipment) {
      this.writeUInt16(outfit.equipment.hair);
      this.writeUInt16(outfit.equipment.head);
      this.writeUInt16(outfit.equipment.body);
      this.writeUInt16(outfit.equipment.legs);
      this.writeUInt16(outfit.equipment.feet);
      this.writeUInt16(outfit.equipment.lefthand);
      this.writeUInt16(outfit.equipment.righthand);
      this.writeUInt16(outfit.equipment.backpack);
      this.writeUInt16(outfit.equipment.belt);
    } else {
      this.writeNull(9); 
    }
  
    if (getGameServer().isFeatureEnabled()) {
      this.writeUInt16(outfit.mount);
      this.writeBoolean(outfit.mounted);
      this.writeBoolean(outfit.addonOne);
      this.writeBoolean(outfit.addonTwo);
    } else {
      this.writeNull(5);
    }
  }

  writeBoolean(value: boolean): void {
    /*
     * Writes a boolean value to the packet
     */
    this.writeUInt8(value ? 1 : 0);
  }

  // A helper function to replicate `message.escapeHTML()` in TS.
  private static escapeHTML(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Inside your PacketWriter (or similar) class:
  static encodeString(message: string | null): Uint8Array {
    if (message === null) {
      return new Uint8Array();
    }

    // Escape HTML before encoding, matching the old JS behavior
    const escaped = PacketWriter.escapeHTML(message);

    // Encode as UTF-8 and return a Uint8Array (similar to JS)
    return new TextEncoder().encode(escaped);
  }
  
  writeString(value: string): void {
    const encoded = new TextEncoder().encode(value);
    this.writeUInt16(encoded.length);
    this.writeBuffer(encoded);
  }
}
