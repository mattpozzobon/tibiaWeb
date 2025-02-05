interface IItemStack {
  isFull(): boolean;
  isMailbox(): boolean;
  hasMagicDoor(): boolean;
  getItems(): any[];
  getFloorChange(): string | null;
  addThing(index: number, thing: any): void;
  isBlockNPC(): boolean;
  isItemSolid(): boolean;
  isBlockSolid(ignoreDoors?: boolean): boolean;
  isBlockProjectile(): boolean;
  hasElevation(): boolean;
  getTeleporterDestination(): any;
  isTrashholder(): boolean;
  deleteThing(index: number): any | null;
  isEmpty(): boolean;
  getTopItem(): any | null;
  peekIndex(index: number): any | null;
  isValidIndex(index: number): boolean;
  applyFieldDamage(creature: any): void;
}

export default IItemStack;
