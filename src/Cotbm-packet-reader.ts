import { OTBM_HEADERS } from "./Cotbm-headers";
import { PacketReader } from "./Cpacket-reader";
import { Position } from "./Cposition";

export class OTBMPacketReader extends PacketReader {
  constructor(buffer: Buffer) {
    /*
     * Class OTBMPacketReader
     * Wrapper for a readable OTBM node packet
     */
    super(buffer);
  }

  private __escapeString(buffer: Buffer): Buffer {
    /*
     * Removes the escape character 0xFD from the buffer before parsing
     */

    let iEsc = 0;
    let index: number;

    while (true) {
      index = buffer.subarray(iEsc++).indexOf(OTBM_HEADERS.OTBM_NODE_ESC);

      if (index === -1) {
        return buffer;
      }

      iEsc += index;

      buffer = Buffer.concat([
        buffer.subarray(0, iEsc),
        buffer.subarray(iEsc + 1),
      ]);
    }
  }

  readOTBMHeader(): Record<string, number> {
    /*
     * Reads the properties of the OTBM header node
     */
    return {
      version: this.__readUInt32(),
      mapWidth: this.__readUInt16(),
      mapHeight: this.__readUInt16(),
      itemsMajorVersion: this.__readUInt32(),
      itemsMinorVersion: this.__readUInt32(),
    };
  }

  private __readPositionInv(): Position {
    /*
     * Reads an inverted OTBM position
     */
    return new Position(
      this.__readUInt16(),
      this.__readUInt16(),
      15 - this.__readUInt8()
    );
  }

  private __readPosition(): Position {
    /*
     * Reads an OTBM position
     */
    return new Position(this.__readUInt16(), this.__readUInt16(), this.__readUInt8());
  }

  readOTBMTown(): Record<string, any> {
    /*
     * Reads the properties of an OTBM town node
     */
    return {
      id: this.__readUInt32(),
      name: this.__readString16(),
      position: this.__readPosition(),
    };
  }

  readOTBMWaypoint(): Record<string, any> {
    /*
     * Reads the properties of an OTBM Waypoint node
     */
    return {
      name: this.__readString16(),
      position: this.__readPosition(),
    };
  }

  private __readUInt32(): number {
    /*
     * Reads an escaped 32-bit unsigned integer
     */
    return this.__readUInt16() + (this.__readUInt16() << 16);
  }

  private __readUInt16(): number {
    /*
     * Reads an escaped 16-bit unsigned integer
     */
    return this.__readUInt8() + (this.__readUInt8() << 8);
  }

  private __readUInt8(): number {
    /*
     * Reads an escaped 8-bit unsigned integer
     */
    const value = this.readUInt8();

    if (value !== OTBM_HEADERS.OTBM_NODE_ESC) {
      return value;
    }

    return this.readUInt8();
  }

  readOTBMHouseTile(): Record<string, any> {
    /*
     * Reads the properties of an OTBM house tile node
     */
    return {
      x: this.__readUInt8(),
      y: this.__readUInt8(),
      id: this.__readUInt32(),
      attributes: this.readAttributes(),
    };
  }

  readOTBMItem(): Record<string, any> {
    /*
     * Reads the properties of an OTBM item
     */
    return {
      id: this.__readUInt16(),
      attributes: this.readAttributes(),
    };
  }

  readOTBMTileArea(): Record<string, any> {
    /*
     * Reads the properties of an OTBM tile area
     */
    return {
      position: this.__readPosition(),
    };
  }

  readOTBMData(): Record<string, any> {
    /*
     * Reads the properties of the OTBM metadata
     */
    return {
      attributes: this.readAttributes(),
    };
  }

  readOTBMTile(): Record<string, any> {
    /*
     * Reads the properties of an OTBM tile
     */
    return {
      x: this.__readUInt8(),
      y: this.__readUInt8(),
      attributes: this.readAttributes(),
    };
  }

  private __readString16(): string {
    /*
     * Reads and escapes a string of max length 2^15
     */
    const length = this.__readUInt16();
    const slice = this.buffer.subarray(this.index, this.index + length);
    const string = this.__escapeString(slice).toString();
    this.index += length;
    return string;
  }

  readAttributes(): Map<number, any> {
    /*
     * Parses the attributes of a node
     */
    const attributes = new Map<number, any>();

    while (this.isReadable()) {
      this.__setAttribute(attributes, this.__readUInt8());
    }

    return attributes;
  }

  private __setAttribute(attributes: Map<number, any>, type: number): void {
    /*
     * Parses the attributes of a node
     */
    switch (type) {
      case OTBM_HEADERS.OTBM_ATTR_HOUSEDOORID:
      case OTBM_HEADERS.OTBM_ATTR_COUNT:
        attributes.set(type, this.__readUInt8());
        break;
      case OTBM_HEADERS.OTBM_ATTR_DEPOT_ID:
      case OTBM_HEADERS.OTBM_ATTR_RUNE_CHARGES:
      case OTBM_HEADERS.OTBM_ATTR_ITEM:
      case OTBM_HEADERS.OTBM_ATTR_ACTION_ID:
      case OTBM_HEADERS.OTBM_ATTR_UNIQUE_ID:
      case OTBM_HEADERS.OTBM_ATTR_CHARGES:
        attributes.set(type, this.__readUInt16());
        break;
      case OTBM_HEADERS.OTBM_ATTR_TILE_FLAGS:
        attributes.set(type, this.__readUInt32());
        break;
      case OTBM_HEADERS.OTBM_ATTR_TEXT:
      case OTBM_HEADERS.OTBM_ATTR_EXT_SPAWN_FILE:
      case OTBM_HEADERS.OTBM_ATTR_EXT_HOUSE_FILE:
      case OTBM_HEADERS.OTBM_ATTR_DESCRIPTION:
      case OTBM_HEADERS.OTBM_ATTR_DESC:
        attributes.set(type, this.__readString16());
        break;
      case OTBM_HEADERS.OTBM_ATTR_TELE_DEST:
        attributes.set(type, this.__readPositionInv());
        break;
    }
  }
}

export default OTBMPacketReader;
