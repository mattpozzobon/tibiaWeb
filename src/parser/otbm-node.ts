import { OTBM_HEADERS } from "./otbm-headers";
import OTBMPacketReader from "./otbm-packet-reader";
import { Position } from "../utils/position";


export class OTBMNode {
  parentNode: OTBMNode | null;
  type: number;
  properties: any;

  constructor(parentNode: OTBMNode | null, buffer: Buffer) {
    /*
     * Class OTBMNode
     * Wrapper for a single node in an OTBM file
     */

    this.parentNode = parentNode;

    // Create a reader
    const packet = new OTBMPacketReader(buffer);

    // Set the type (first byte)
    this.type = packet.readUInt8();

    // And the properties
    this.properties = this.__readProperties(packet);
  }

  getAttribute(attribute: number): any | null {
    /*
     * Function OTBMNode.getAttribute
     * Returns the attribute of a node
     */

    if (!this.hasAttribute(attribute)) {
      return null;
    }

    return this.properties.attributes.get(attribute);
  }

  hasAttribute(attribute: number): boolean {
    /*
     * Function OTBMNode.hasAttribute
     * Returns true if the node has a particular attribute
     */

    return this.properties.attributes.has(attribute);
  }

  getPosition(): Position | null {
    /*
     * Function OTBMNode.getPosition
     * Wrapper that returns the world position of the OTBM node (item or tile)
     */

    // An item refers to the parent tile
    if (this.type === OTBM_HEADERS.OTBM_ITEM) {
      return this.parentNode?.getPosition() || null;
    }

    // A tile takes its position from the parent tile area
    if (
      this.type === OTBM_HEADERS.OTBM_TILE ||
      this.type === OTBM_HEADERS.OTBM_HOUSETILE
    ) {
      return new Position(
        this.properties.x + this.parentNode!.properties.position.x,
        this.properties.y + this.parentNode!.properties.position.y,
        this.parentNode!.properties.position.z // Z-Down: Z=0 is sky, Z=7 is ground, Z=15 is deepest
      );
    }

    return null;
  }

  private __readProperties(packet: OTBMPacketReader): any | null {
    /*
     * Function OTBMNode.__readProperties
     * Reads the properties of the OTBMNode
     */

    // Map to handler
    switch (this.type) {
      case OTBM_HEADERS.OTBM_MAP_HEADER:
        return packet.readOTBMHeader();
      case OTBM_HEADERS.OTBM_MAP_DATA:
        return packet.readOTBMData();
      case OTBM_HEADERS.OTBM_TILE_AREA:
        return packet.readOTBMTileArea();
      case OTBM_HEADERS.OTBM_TILE:
        return packet.readOTBMTile();
      case OTBM_HEADERS.OTBM_ITEM:
        return packet.readOTBMItem();
      case OTBM_HEADERS.OTBM_HOUSETILE:
        return packet.readOTBMHouseTile();
      case OTBM_HEADERS.OTBM_WAYPOINT:
        return packet.readOTBMWaypoint();
      case OTBM_HEADERS.OTBM_TOWN:
        return packet.readOTBMTown();
      default:
        return null;
    }
  }
}

export default OTBMNode;
