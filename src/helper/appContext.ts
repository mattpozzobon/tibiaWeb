import path from 'path';
import config from '../config/config.json';
import constants from '../config/constants.json';
import items from "../config/itemToSprite.json"; 
import { Config } from 'types/config';
import { Constants } from 'types/constants';
import { IGameServer } from 'interfaces/IGameserver';


// Configuration and constants
export const CONFIG: Config = config;
export const CONST: Constants = constants;

export const ITEM_TO_SPRITE: Record<number, number> = items.items.reduce((acc, item) => {
  acc[item.id] = item.sprite_id;
  return acc;
}, {} as Record<number, number>);

// Utility function to get data file paths
export const getDataFile = (...args: string[]): string => {
  return path.join(__dirname, '..', 'data', CONFIG.SERVER.CLIENT_VERSION, ...args);
};

export const requireModule = (...args: string[]): any => {
  const resolvedPath = path.join(__dirname, '..', 'src', ...args);
  return require(resolvedPath);
};

export function getSpriteIdForItem(itemId: number): number | null {
  return ITEM_TO_SPRITE[itemId] || null;
}


// GameServer instance management
let gameServerInstance: IGameServer | null = null;

export const initializeGameServer = (server: IGameServer): IGameServer => {
  if (!gameServerInstance) {
    gameServerInstance = server;
  }
  return gameServerInstance;
};

export const getGameServer = (): IGameServer => {
  if (!gameServerInstance) {
    throw new Error('GameServer is not initialized. Call initializeGameServer() first.');
  }
  return gameServerInstance;
};


const print = true;

export class Print {
  constructor() {}

  static line(): void {
    console.log('--------------------------------------------------------------------');
  }

  static savePlayer(character: any): void {
    if(print){
      const parsed = JSON.parse(character);
      console.log("JSON saved successful:\n", JSON.stringify(parsed, null, 2));
    }
  }

  static packet(buffer: any, packet: any): void{
    const message = packet.index > packet.buffer.length? "🔴": packet.index === packet.buffer.length? "🟡": "🟢"; 
    const formattedOpcode = buffer[0].toString().padStart(2, '0');                                               
    console.log(`📤  opcode: ${formattedOpcode} ${message} - ${this.getProtocolServer(buffer[0])}`);
  }
  
  static packetIn(opcode: any): void {
    const formattedOpcode = opcode.toString().padStart(2, '0');
    console.log(`📨  opcode: ${formattedOpcode} ⚫ - ${this.getProtocolClient(opcode)}`);
  }

  static getProtocolServer(value: number): string {
    const entries = Object.entries(CONST.PROTOCOL.SERVER);
    const found = entries.find(([key, num]) => num === value);
    return found ? found[0] : "undefined";
  }

  static getProtocolClient(value: number): string {
    const entries = Object.entries(CONST.PROTOCOL.CLIENT);
    const found = entries.find(([key, num]) => num === value);
    return found ? found[0] : "undefined";
  }
  
}