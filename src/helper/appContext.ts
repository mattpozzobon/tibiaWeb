import path from "path";
import baseConfig from "../config/config.json";
import constants from "../config/constants.json";
import items from "../config/itemToSprite.json";
import { Config } from "types/config";
import { Constants } from "types/constants";

/* ----------------------------------------------------
   Helpers
---------------------------------------------------- */

function envStr(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length ? v : undefined;
}

function envInt(name: string): number | undefined {
  const v = process.env[name];
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/* ----------------------------------------------------
   Build CONFIG with env overrides
---------------------------------------------------- */

function buildConfig(): Config {
  const cfg: Config = JSON.parse(JSON.stringify(baseConfig));

  /* Login server */
  cfg.LOGIN.HOST = envStr("LOGIN_HOST") ?? cfg.LOGIN.HOST;
  cfg.LOGIN.PORT = envInt("LOGIN_PORT") ?? cfg.LOGIN.PORT;

  /* Game server */
  cfg.SERVER.HOST = envStr("SERVER_HOST") ?? cfg.SERVER.HOST;
  cfg.SERVER.PORT = envInt("SERVER_PORT") ?? cfg.SERVER.PORT;
  cfg.SERVER.EXTERNAL_HOST = envStr("EXTERNAL_HOST") ?? cfg.SERVER.EXTERNAL_HOST;

  /* Database */
  cfg.DATABASE.ACCOUNT_DATABASE =
    envStr("ACCOUNT_DATABASE") ?? cfg.DATABASE.ACCOUNT_DATABASE;

  /* Crypto */
  cfg.HMAC.SHARED_SECRET =
    envStr("HMAC_SHARED_SECRET") ?? cfg.HMAC.SHARED_SECRET;

  return cfg;
}

/* ----------------------------------------------------
   Exports
---------------------------------------------------- */

export const CONFIG: Config = buildConfig();
export const CONST: Constants = constants;

/* ----------------------------------------------------
   Item → sprite lookup
---------------------------------------------------- */

export const ITEM_TO_SPRITE: Record<number, number> = items.items.reduce(
  (acc, item) => {
    acc[item.id] = item.sprite_id;
    return acc;
  },
  {} as Record<number, number>
);

type Hand = "left" | "right";
type HandSpriteMapping = { left?: number; right?: number; default?: number };

export function getSpriteIdForItem(itemId: number, hand?: Hand): number | null {
  // Prefer hand-aware mapping if available
  const handMap = ITEM_TO_SPRITE_BY_HAND[itemId];
  if (handMap) {
    if (hand === "left" && typeof handMap.left === "number") return handMap.left;
    if (hand === "right" && typeof handMap.right === "number") return handMap.right;
    if (typeof handMap.default === "number") return handMap.default;
  }

  // Fallback to generic mapping
  return ITEM_TO_SPRITE[itemId] || null;
}
export const ITEM_TO_SPRITE_BY_HAND: Record<number, HandSpriteMapping> =
  items.items.reduce((acc: Record<number, HandSpriteMapping>, item) => {
    const name = (item.name || "").toLowerCase();
    const mapping = acc[item.id] || {};

    const isLeft =
      name.includes("left-hand") ||
      name.includes("lefthand") ||
      name.includes("left hand");

    const isRight =
      name.includes("right-hand") ||
      name.includes("righthand") ||
      name.includes("right hand");

    if (isLeft) mapping.left = item.sprite_id;
    else if (isRight) mapping.right = item.sprite_id;
    else mapping.default = item.sprite_id;

    acc[item.id] = mapping;
    return acc;
  }, {} as Record<number, HandSpriteMapping>);

/* ----------------------------------------------------
   Utilities
---------------------------------------------------- */

export const getDataFile = (...args: string[]): string => {
  return path.join(__dirname, "..", "data", CONFIG.SERVER.CLIENT_VERSION, ...args);
};

export const requireModule = (...args: string[]): any => {
  return require(path.join(__dirname, "..", "src", ...args));
};

/* ----------------------------------------------------
   GameServer instance registry
---------------------------------------------------- */

import { IGameServer } from "interfaces/IGameserver";

let gameServerInstance: IGameServer | null = null;

export const initializeGameServer = (server: IGameServer): IGameServer => {
  if (!gameServerInstance) gameServerInstance = server;
  return gameServerInstance;
};

export const getGameServer = (): IGameServer => {
  if (!gameServerInstance) throw new Error("GameServer not initialized");
  return gameServerInstance;
};

/* ----------------------------------------------------
   Debug printer
---------------------------------------------------- */

export class Print {
  static line(): void {
    console.log("----------------------------------------------------");
  }

  static savePlayer(character: any): void {
    const parsed = JSON.parse(character);
    console.log("JSON saved:\n", JSON.stringify(parsed, null, 2));
  }

  static packet(buffer: any, packet: any): void {
    const msg =
      packet.index > packet.buffer.length
        ? "🔴"
        : packet.index === packet.buffer.length
        ? "🟡"
        : "🟢";
    const opcode = buffer[0].toString().padStart(2, "0");
    console.log(`📤 opcode ${opcode} ${msg}`);
  }

  static packetIn(opcode: number): void {
    console.log(`📨 opcode ${opcode.toString().padStart(2, "0")} ⚫`);
  }
}
