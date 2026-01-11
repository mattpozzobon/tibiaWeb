import fs from "fs";
import { CONFIG, CONST, getDataFile, getGameServer } from "../helper/appContext";
import DataValidator from "../utils/validator";
import ThingPrototype from "../thing/thing-prototype";
import Thing from "../thing/thing";
import Door from "../item/door";
import Key from "../item/key";
import Container from "../item/container/container";
import Item from "../item/item";
import Corpse from "../item/container/corpse";
import Teleporter from "../item/teleporter";
import Readable from "../item/readable";
import Rune from "../item/rune";
import FluidContainer from "../item/fluidcontainer";
import House, { HouseEntry } from "../game-object/world/house";
import ActionLoader from "./database-action-loader";
import NPC from "../creature/npc/npc";
import { Position } from "../utils/position";
import OTBMParser from "../parser/otbm-parser";
import { ConditionModule } from "../interfaces/base";
// Type definitions
type ThingData = { id: number; count?: number; actionId?: number; duration?: number; content?: any; items?: any[] };
type HouseDefinition = { position: Position; item: ThingData };


export default class Database {
  public validator: DataValidator;
  public actionLoader: ActionLoader;
  public worldParser: OTBMParser;
  private houses: Map<number, House> = new Map();
  private items: Record<string, ThingPrototype> = {};
  private spells: Record<number, any> = {};
  private runes: Record<string, any> = {};
  private doors: Record<string, any> = {};
  private conditions: Record<string, any> = {};
  private monsters: Record<string, any> = {};
  private npcs: Record<string, any> = {};

  constructor() {
    this.validator = new DataValidator();
    this.actionLoader = new ActionLoader();
    this.worldParser = new OTBMParser();
  }

  initialize(): void {
    // Set up globals for condition definitions and scripts
    if (!(global as any).CONST) {
      (global as any).CONST = CONST;
    }
    if (!(process as any).gameServer) {
      (process as any).gameServer = getGameServer();
    }
    
    this.items = this.loadItemDefinitions("items");
    this.spells = this.loadDefinitions("spells");
    this.runes = this.loadDefinitions("runes");
    this.doors = this.loadDefinitions("doors");
    this.conditions = this.loadDefinitions("conditions");
    this.monsters = this.loadDefinitions("monsters");
    this.houses = this.loadHouses("houses");
    this.actionLoader.initialize();

    this.actionLoader.attachClockEvents("clock");

    // Load the gameworld itself
    this.worldParser.load(CONFIG.WORLD.WORLD_FILE);

    this.loadHouseItems();

    Object.entries(this.monsters).forEach(([key, value]) => {
      this.validator.validateMonster(key, value);
    });

    if (CONFIG.WORLD.NPCS.ENABLED) {
      this.npcs = this.loadNPCDefinitions("npcs");
    }

    if (CONFIG.WORLD.SPAWNS.ENABLED) {
      this.loadSpawnDefinitions("spawns");
    }
  }

  loadHouseItems(): void {
    const gameServer = getGameServer();
    this.houses.forEach((house) => {
      const fileName = `${house.id}.json`;
      const filePath = getDataFile("houses", "definitions", fileName);
      const json: HouseDefinition[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      json.forEach((entry) => { 
        const tile = gameServer.world.getTileFromWorldPosition(entry.position);
        const thing = this.parseThing(entry.item);
        tile.addTopThing(thing);
      });
    });
  }

  saveHouses(): void {
    this.houses.forEach((house) => {
      const things: Array<{ position: Position; item: Thing }> = [];
      house.tiles.forEach((tile) => {
        if (!tile.itemStack) return;

        tile.itemStack.__items.forEach((item: any) => {
          if (!item.isPickupable() && !item.isMoveable()) return;
          things.push({ position: tile.position, item });
        });
      });

      const filePath = getDataFile("houses", "definitions", `house.${house.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(things));
    });

    const allHouses = JSON.stringify(Object.fromEntries(this.houses), null, 2);
    fs.writeFileSync(getDataFile("houses", "definitions.json"), allHouses);
  }

  parseThing(item: ThingData | any): Thing | null {
    /*
     * Function Database.parseThing
     * Parses a serialized item back into a Thing instance
     * Handles nested containers (parcels with items inside)
     */
    const thing = this.createThing(item.id);
    if (!thing) return null;

    if (item.count !== undefined) thing.setCount(item.count);
    if (item.actionId) thing.setActionId(item.actionId);
    if (item.duration) {
      thing.setDuration(item.duration);
      if (thing.isDecaying()) {
        thing.scheduleDecay();
      }
    }
    if (item.content !== undefined && item.content !== null) {
      thing.setContent(item.content);
    }

    // If it's a container with nested items (e.g., parcel with items inside), parse them
    if (item.items && Array.isArray(item.items) && thing.isContainer && thing.isContainer()) {
      const container = thing as any;
      item.items.forEach((nestedItem: any, index: number) => {
        if (nestedItem !== null) {
          const parsedItem = this.parseThing(nestedItem);
          if (parsedItem !== null && container.addThing) {
            // Use Container.addThing() which sets parent correctly
            container.addThing(parsedItem, index);
          }
        }
      });
    }

    return thing;
  }

  createThing(id: number): Thing | null {
    
    if(!this.items.hasOwnProperty(id)) {
      return null;
    }

    let thing = this.createClassFromId(id);

    if(thing.isPickupable()) {
      thing.setWeight(thing.getPrototype().properties.weight);
    }
  
    // Schedule the decay event
    if(thing.isDecaying()) {
      thing.scheduleDecay();
    }
  
    return thing;
  }

  createClassFromId(id: number) {
    let proto = this.getThingPrototype(id);
  
    if(proto.properties === null) {
      return new Item(id);
    }
  
    switch (proto.properties?.type) {
      case "corpse":
        return new Corpse(id, proto.properties.containerSize || 5);
      case "container":
        return new Container(id, proto.properties.containerSize || 0);
      case "fluidContainer":
        return new FluidContainer(id);
      case "rune":
        return new Rune(id);
      case "key":
        return new Key(id);
      case "door":
        return new Door(id);
      case "readable":
        return new Readable(id);
      case "teleport":
        return new Teleporter(id);
      default:
        return new Item(id);
    }
  
  }

  getThingPrototype(id: number): ThingPrototype {
    return this.items[id];
  }

  getMonster(id: string): any | null {
    return this.monsters[id] || null;
  }

  getRune(id: string): any | null {
    return this.runes[id] || null;
  }

  getSpell(id: number): any | null {
    return this.spells[id] || null;
  }

  getDoorEvent(aid: string): any | null {
    return this.doors[aid] || null;
  }

  parseItems(container: Container, things: ThingData[]): void {
    things.forEach((thing, index) => {
      const newThing = this.parseThing(thing);
      if (thing !== null && newThing !== null) container.addThing(newThing, index);
    });
  }
  
  getCondition(name: string): ConditionModule | null {
    const filename = this.conditions[name];
    if (!filename) return null;
    
    // If it's already a module (loaded), return it
    if (typeof filename === 'object' && filename !== null) {
      return filename;
    }
    
    // Otherwise, load the module
    try {
      const modulePath = getDataFile("conditions", "definitions", filename);
      const module = require(modulePath);
      
      // Cache the loaded module
      this.conditions[name] = module;
      return module;
    } catch (error) {
      console.error(`[Database] Failed to load condition ${name} from ${filename}:`, error);
      return null;
    }
  }

  getClientId(id: number): number {
    const proto = this.getThingPrototype(id);
    return proto ? proto.id : 0;
  }

  loadNPCDefinitions(definition: string): Record<string, NPC> {
    const reference: Record<string, NPC> = {};

    Object.entries(this.readDataDefinition(definition)).forEach(([key, value]) => {
      const npc = this.readNPCDefinition(value);
      if (npc)
        reference[key] = npc;
    });

    console.log(`Loaded [[ ${Object.keys(reference).length} ]] ${definition} definitions.`);
    return reference;
  }

  readNPCDefinition(name: { definition: string; enabled: boolean; position: Position }): NPC | null {
    const data = require(getDataFile("npcs", "definitions", name.definition));
    console.log('data: ', data);
    this.validator.validateNPC(name.definition, data);

    if (name.enabled) {
      const npc = new NPC(data);
      getGameServer().world.creatureHandler.addCreatureSpawn(npc, name.position);
      return npc;
    }

    return null;
  }

  loadSpawnDefinitions(definition: string): void {
    console.log(`Loading spawn definitions for: ${definition}`);
  }

  loadHouses(definition: string): Map<number, House> {
    const filePath = getDataFile(definition, "definitions.json");
    const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const houses = new Map<number, House>();

    Object.entries(json).forEach(([id, entry]) => {
      const houseEntry = entry as HouseEntry;
      houses.set(Number(id), new House(Number(id), houseEntry));
    });

    return houses;
  }

  loadItemDefinitions(definition: string): Record<string, ThingPrototype> {
    const reference: Record<string, ThingPrototype> = {};
    Object.entries(this.readDataDefinition(definition)).forEach(([key, value]) => {
      reference[key] = new ThingPrototype(value);
    });
    return reference;
  }

  loadDefinitions(definition: string): Record<string, any> {
    const reference: Record<string, any> = {};
    Object.entries(this.readDataDefinition(definition)).forEach(([key, value]) => {
      reference[key] = value;
    });
    console.log('Loaded: ',definition);
    return reference;
  }

  readDataDefinition(definition: string): Record<string, any> {
    const filePath = getDataFile(definition, "definitions.json");
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
}
