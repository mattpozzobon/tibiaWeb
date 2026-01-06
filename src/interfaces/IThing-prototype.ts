import { EventEmitter } from "../event/eventemitter";
import { IBitFlag } from "./IBitflag";


export interface IThingPrototype extends EventEmitter{
  id: number;
  flags: IBitFlag;
  group: number;
  properties: Record<string, any>;

  isStackable(): boolean;
  hasContent(): boolean;
  isWeapon(): boolean;
  isEquipment(): boolean;
  isDoor(): boolean;
  isDestroyable(): boolean;
  isRotateable(): boolean;
  isDistanceReadable(): boolean;
  isMailbox(): boolean;
  isReadable(): boolean;
  isTeleporter(): boolean;
  isDepot(): boolean;
  isField(): boolean;
  isMagicField(): boolean;
  isTrashholder(): boolean;
  isPickupable(): boolean;
  isFluidContainer(): boolean;
  isSplash(): boolean;
  isContainer(): boolean;

  // From EventEmitter
  on(which: string, callback: (...args: any[]) => any): (...args: any[]) => any;

  // Internal helpers (can be excluded if not needed externally)
  //__isType(type: string): boolean;
  //__has(type: string): boolean;
}
