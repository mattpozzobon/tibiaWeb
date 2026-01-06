import { OTBM_HEADERS } from "./otbm-headers";
import OTBMNode from "./otbm-node";
import { Position } from "./position";
import Teleporter from "./teleporter";
import fs from "fs";
import { CONFIG, getDataFile } from "./helper/appContext";
import { getGameServer } from "./helper/appContext";
import World from "./world";

class OTBMParser {
  worldSize: any;
  version: number;
  majorVersion: number;
  minorVersion: number;

  constructor() {
    /*
     * Class OTBMParser
     * Parser for OTBM files that emits all tile/item nodes
     */
    this.version = 0;
    this.majorVersion = 0;
    this.minorVersion = 0;
  }

  private __getItemVersion(version: string): [number, number] {
    /*
     * Maps the server version to the major and minor item version
     */
    switch (version) {
      case "740":
      case "750":
        return [1, 1];
      case "755":
        return [1, 2];
      case "760":
      case "770":
        return [1, 3];
      case "780":
        return [1, 4];
      case "790":
        return [1, 5];
      case "792":
        return [1, 6];
      case "1098":
        return [3, 57];
      case "10100":
        return [3, 58];
      default:
        return [0, 0];
    }
  }

  load(filename: string): void {
    /*
     * Loads the OTBM file and sets it to the game world
     */
    const start = performance.now();
    
    const filepath = getDataFile("world", filename);

    console.log(`Reading OTBM file ${filepath}.`);

    this.read(filepath);

    getGameServer().world.lattice.setReferences();

    console.log(
      `Completed loading world in ${Math.round(performance.now() - start)} milliseconds.`
    );
  }

  read(file: string): void {
    /*
     * Reads an OTBM file
     */
    const data = fs.readFileSync(file);

    // Get some magic bytes 
    const identifier = data.readUInt32LE(0);
    this.version = data.readUInt32LE(6);

    // Determine the minor and major item versions
    [this.majorVersion, this.minorVersion] = this.__getItemVersion(CONFIG.SERVER.CLIENT_VERSION);

    // Confirm OTBM format by reading magic bytes (NULL or "OTBM")
    if (identifier !== 0x00000000 && identifier !== Buffer.from("OTBM").readUInt32LE()) {
      throw new Error("Unknown OTBM format: unexpected magic bytes.");
    }

    // Begin recursive reading of the OTBM tree
    this.readNode(null, data.subarray(4));
  }

  private __parseItem(item: any): any {


    /*
     * Parses a RME item definition that is present on the map
     */
    if(item.properties.id === 2666 || item.properties.id === 1429){
      // console.log('node',item);
      // console.log('node',item.properties.attributes);
    }
    const thing = getGameServer().database.createThing(item.properties.id);
    
    item.properties.attributes.forEach((value: any, attribute: any) => {
      if (thing){
        switch (attribute) {
          case OTBM_HEADERS.OTBM_ATTR_TEXT:
            thing.setContent(value);
            break;
          case OTBM_HEADERS.OTBM_ATTR_TELE_DEST:
            if (thing instanceof Teleporter) {
              thing.setDestination(value);
            }
            break;
          case OTBM_HEADERS.OTBM_ATTR_COUNT:
            thing.setCount(value);
            break;
          case OTBM_HEADERS.OTBM_ATTR_ACTION_ID:
            thing.setActionId(value);
            break;
          case OTBM_HEADERS.OTBM_ATTR_UNIQUE_ID:
            thing.setUniqueId(value);
            break;
      }}
    });

    return thing;
  }

  private emitNode(node: any): void {
    /*
     * Called for every node that is emitted from OTBM format
     */
    switch (node.type) {
      case OTBM_HEADERS.OTBM_MAP_HEADER:
        console.log("Map Width: " + node.properties.mapWidth);
        console.log("Map Height: " + node.properties.mapHeight);
        console.log("Items Version: " + node.properties.itemsMajorVersion + "." + node.properties.itemsMinorVersion);
        this.__createWorldNode(node);
        break;
      case OTBM_HEADERS.OTBM_MAP_DATA:
        console.log(
          `Map description: ${node.properties.attributes.get(OTBM_HEADERS.OTBM_ATTR_DESCRIPTION)}`
        );
        break;
      case OTBM_HEADERS.OTBM_TILE:
      case OTBM_HEADERS.OTBM_HOUSETILE:
        this.__createWorldTileNode(node);
        break;
      case OTBM_HEADERS.OTBM_ITEM:
        this.__createWorldItemNode(node);
        break;
    }
  }

  private __createWorldNode(node: any): void {
    /*
     * Creates the wrapper for the game world
     */
    if (
      this.majorVersion !== node.properties.itemsMajorVersion ||
      this.minorVersion !== node.properties.itemsMinorVersion
    ) {
      console.log(
        `Item minor or major version (${this.minorVersion}, ${this.majorVersion}) does match the server version (${CONFIG.SERVER.CLIENT_VERSION}).`
      );
    }

    const width = CONFIG.WORLD.CHUNK.WIDTH * Math.ceil(node.properties.mapWidth / CONFIG.WORLD.CHUNK.WIDTH);
    const height = CONFIG.WORLD.CHUNK.HEIGHT * Math.ceil(node.properties.mapHeight / CONFIG.WORLD.CHUNK.HEIGHT);


    this.worldSize = new Position(width, height, 16);
    // Create the empty world
    getGameServer().world = new World(this.worldSize);
  }

  private __createWorldItemNode(node: any): void {
    /*
     * Creates an item node in the game world
     */
    const tile = getGameServer().world.lattice.getTileFromWorldPosition(node.getPosition());

    if (!tile) return;

    if (
      tile.id === 0 &&
      (node.hasAttribute(OTBM_HEADERS.OTBM_ATTR_ACTION_ID) ||
        node.hasAttribute(OTBM_HEADERS.OTBM_ATTR_UNIQUE_ID))
    ) {
      tile.id = node.properties.id;

      if (node.hasAttribute(OTBM_HEADERS.OTBM_ATTR_ACTION_ID)) {
        tile.setActionId(node.getAttribute(OTBM_HEADERS.OTBM_ATTR_ACTION_ID));
      }

      if (node.hasAttribute(OTBM_HEADERS.OTBM_ATTR_UNIQUE_ID)) {
        tile.setUniqueId(node.getAttribute(OTBM_HEADERS.OTBM_ATTR_UNIQUE_ID));
      }
    }

    const thing = this.__parseItem(node);

    if (node.parentNode.type !== OTBM_HEADERS.OTBM_ITEM) {
      tile.addTopThing(thing);
      return;
    }

    let container = tile.getTopItem();
    let current = node.parentNode;

    while (current.parentNode.type === OTBM_HEADERS.OTBM_ITEM) {
      container = container.peekIndex(container.getNumberItems() - 1);
      current = current.parentNode;
    }

    container.addFirstEmpty(thing);
  }

  private __createWorldTileNode(node: any): void {
    
    /*
     * Creates a tile node in the game world
     */
    const worldPosition = node.getPosition();

    let chunk = getGameServer().world.lattice.getChunkFromWorldPosition(worldPosition);
  
    if (!chunk) {
      chunk = getGameServer().world.lattice.createChunk(worldPosition);
    }

    const tile = chunk.createTile(worldPosition,node.properties.attributes.get(OTBM_HEADERS.OTBM_ATTR_ITEM) || 0);

    if (node.properties.attributes.has(OTBM_HEADERS.OTBM_ATTR_TILE_FLAGS)) {
      tile.setZoneFlags(node.properties.attributes.get(OTBM_HEADERS.OTBM_ATTR_TILE_FLAGS));
    }
  }

  private readNode(parentNode: any, data: Buffer): number {

    
    /*
     * Reads a single OTBM node from the data array
     */
    let i = 1;
    let currentNode: any = null;

    while (i < data.length) {
      const cByte = data.readUInt8(i);

      if (
        currentNode === null &&
        (cByte === OTBM_HEADERS.OTBM_NODE_INIT || cByte === OTBM_HEADERS.OTBM_NODE_TERM)
      ) {
        currentNode = new OTBMNode(parentNode, data.subarray(1, i));
        this.emitNode(currentNode);
      }

      switch (cByte) {
        case OTBM_HEADERS.OTBM_NODE_TERM:
          return i;
        case OTBM_HEADERS.OTBM_NODE_ESC:
          i++;
          break;
        case OTBM_HEADERS.OTBM_NODE_INIT:
          i = i + this.readNode(currentNode, data.subarray(i));
          break;
      }

      i++;
    }

    return i;
  }
}

export default OTBMParser;
