// BitFlag.ts
"use strict";

export interface IBitFlag {
  flag: number;
  get(flag: number): boolean;
  set(flag: number): void;
  unset(flag: string): void;
  print(): void;
}

export interface IBitFlagConstructor {
  new (flag?: number): IBitFlag;
  prototype: IBitFlag & { flags: Record<string, number> };
}

/**
 * Factory function that creates a BitFlag constructor with its own flags mapping.
 * This is a direct conversion of the original JS version.
 */
export function BitFlag(...args: string[]): IBitFlagConstructor {
  if (args.length > 31) {
    throw new Error("Cannot construct a bit flag with more than 31 bits.");
  }

  // Internal class generator – this will be our BitFlag constructor.
  const __BitFlag = function (this: any, flag: number = 0) {
    this.flag = flag;
  } as unknown as IBitFlagConstructor;

  // Set up the prototype chain: inherit from BitFlag.prototype (which we define below)
  __BitFlag.prototype = Object.create(BitFlagPrototype);
  __BitFlag.prototype.constructor = __BitFlag;

  // Create a 'flags' property on the prototype
  (__BitFlag.prototype as any).flags = {};

  // Populate the flags mapping based on the arguments
  args.forEach((flag, i) => {
    (__BitFlag.prototype as any).flags[flag] = 1 << i;
  });

  return __BitFlag;
}

// Define the base prototype for BitFlag instances.
// This mirrors the BitFlag.prototype from the JS version.
const BitFlagPrototype = {
  get(this: IBitFlag, flag: number): boolean {
    // Returns true if the bit is set
    return !!(this.flag & flag);
  },
  set(this: IBitFlag, flag: number): void {
    this.flag |= flag;
  },
  unset(this: IBitFlag, flag: string): void {
    // Note: 'this.flags' will come from the prototype.
    this.flag &= ~(this as any).flags[flag];
  },
  print(this: IBitFlag): void {
    Object.keys((this as any).flags).forEach( (flag: string) => {
      if (this.get((this as any).flags[flag])) {
        console.log(flag);
      }
    }, this);
  },
};

// Export our BitFlag class as a function, and then use it to create specific flag sets.
export const OTBBitFlag = BitFlag(
  "FLAG_BLOCK_SOLID",       // 1
  "FLAG_BLOCK_PROJECTILE",  // 2
  "FLAG_BLOCK_PATHFIND",    // 4
  "FLAG_HAS_HEIGHT",        // 8
  "FLAG_USEABLE",           // 16
  "FLAG_PICKUPABLE",        // 32
  "FLAG_MOVEABLE",          // 64
  "FLAG_STACKABLE",         // 128
  "FLAG_FLOORCHANGEDOWN",   // 256
  "FLAG_FLOORCHANGENORTH",  // 512
  "FLAG_FLOORCHANGEEAST",   // 1024
  "FLAG_FLOORCHANGESOUTH",  // 2048
  "FLAG_FLOORCHANGEWEST",   // 4096
  "FLAG_ALWAYSONTOP",       // 8192
  "FLAG_READABLE",          // 16384
  "FLAG_ROTATABLE",         // 32768
  "FLAG_HANGABLE",          // 65536
  "FLAG_VERTICAL",          // 131072
  "FLAG_HORIZONTAL",        // 262144
  "FLAG_CANNOTDECAY",       // 524288
  "FLAG_ALLOWDISTREAD",     // 1048576
  "FLAG_UNUSED",            // 2097152
  "FLAG_CLIENTCHARGES",     // 4194304
  "FLAG_LOOKTHROUGH",       // 8388608
  "FLAG_ANIMATION",         // 16777216
  "FLAG_FULLTILE",          // 33554432
  "FLAG_FORCEUSE"           // 67108864
);

export const TileFlag = BitFlag(
  "TILESTATE_PROTECTIONZONE",
  "TILESTATE_DEPRECATED",
  "TILESTATE_NOPVP",
  "TILESTATE_NOLOGOUT",
  "TILESTATE_PVPZONE",
  "TILESTATE_REFRESH"
);
