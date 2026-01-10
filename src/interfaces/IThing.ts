import { IBaseContainer } from "./IBase-container";
import { IPlayer } from "./IPlayer";
import { IPosition } from "./IPosition";
import { IThingEmitter } from "./IThing-emitter";
import { IThingPrototype } from "./IThing-prototype";

export interface IThing extends IThingEmitter{
  id: number;
  uid?: number;
  frozen?: boolean;
  weight?: number;
  count: number;
  actionId?: number;
  duration?: number;
  content?: any;
  container?: any;
  size?: any;

  copyProperties(thing: IThing): void;
  createFungibleThing(count: number): IThing | undefined;
  setCount(count: number): IThing;
  getContent(): any;
  getPrototype(): IThingPrototype;
  hasContent(): boolean;
  unfreeze(): void;
  freeze(): void;
  hasUniqueId(): boolean;
  isRightAmmunition(ammunition: IThing): boolean;
  getWeight(): number;
  scheduleDecay(): void;
  setActionId(actionId: number): void;
  setUniqueId(uid: number): void;
  setDuration(duration: number): void;
  forceReplace(n:number): void;
  setParent(parent: any): void;
  setContent(content: any): void;
  getShootType(): any;
  getArticle(): string | null;
  getPosition(): any;
  getTopParent(): any;
  getAttribute(attribute: string): any;
  getName(player?: any): string;
  getRemainingDuration(): number;
  getDescription(): string;
  getDurationString(): string;
  getCount(): number;
  hasActionId(): boolean;
  delete(): void;
  remove(): any;
  replace(thing: IThing): IThing;
  rotate(): void;
  removeCount(count: number): void;
  getParent(): any;
  isMagicDoor(): boolean;
  isDoor(): boolean;
  isItem(): boolean;
  getTrashEffect(): any;
  getChangeOnUnequip(): any;
  getChangeOnEquip(): any;
  isBlockPathfind(): boolean;
  isBlockSolid(): boolean;
  isDistanceReadable(): boolean;
  isTrashholder(): boolean;
  isRotateable(): boolean;
  isHangable(): boolean;
  isHorizontal(): boolean;
  isVertical(): boolean;
  isBlockProjectile(): boolean;
  isDecaying(): boolean;
  isPickupable(): boolean;
  isReadable(): boolean;
  isWriteable(): boolean;
  isDistanceWeapon(): boolean;
  isDepot(): boolean;
  isContainer(): this is IContainer;
  isTeleporter(): boolean;
  isMailbox(): boolean;
  isMagicField(): boolean;
  isSplash(): boolean;
  isStackable(): boolean;
  isFluidContainer(): boolean;
  hasFlag(flag: number): boolean;
  cleanup(): void;
}

export interface IItem extends IThing {
  weight?: number;

  split(count: number): IItem;
  setWeight(weight: number): void;
  setFluidType(count: number): void;

  hasHeight(): boolean;
  isBlockSolid(): boolean;
  isBlockProjectile(): boolean;
  
  getMaxStackCount(): number;

  supportsHangable(): boolean;
  isHorizontal(): boolean;
  isVertical(): boolean;
  isHangable(): boolean;

  isPickupable(): boolean;
  isMoveable(): boolean;

  toJSON(): object;
}


export interface IContainer extends IItem {
  container: IBaseContainer;

  getNumberItems(): number;
  addFirstEmpty(thing: IThing): boolean;
  hasIdentifier(cid: number): boolean;
  checkPlayersAdjacency(): void;
  peekIndex(index: number): IItem | null;
  removeIndex(index: number, amount: number): IItem | null;
  deleteThing(thing: IItem): number;
  addThing(thing: IThing, index: number): boolean;
  openBy(player: IPlayer): void;
  closeBy(player: IPlayer): void;
  getSlots(): (IItem | null)[];
  getSize(): number;
  getWeight(): number;
  getPosition(): any;
  exceedsMaximumChildCount(): boolean;
  getMaximumAddCount(player: IPlayer | null, thing: IThing, index: number): number;
  closeAllSpectators(): boolean;
  cleanup(): void;
  toJSON(): object;
  getTopParent(): any;
  __updateWeight(weight: number): void;
  
  // Exclusive slot methods
  isExclusiveSlot(slotIndex: number): boolean;
  getAllowedItemTypes(slotIndex: number): string[];
  getAllowedItemIds(slotIndex: number): number[];
  getSlotName(slotIndex: number): string | null;
}