import Equipment from "../../item/equipment";
import DepotContainer from "item/depot";


export type ItemLocation =
  | { kind: "tile"; tile: any }
  | { kind: "container"; container: any }
  | { kind: "equipment"; equipment: Equipment }
  | { kind: "depot"; depot: DepotContainer };

export interface IItemHolder {
  readonly kind: "tile" | "container" | "equipment" | "depot";

  getItem(index: number): any | null;
  removeItemAt(index: number, count?: number): any | null;
  insertItemAt(index: number, item: any): boolean;

  getMaximumAddCount(player: any, item: any, index: number): number;
  capacity(): number;

  canInsert(player: any, item: any, index: number): { ok: boolean; reason?: string };

  getTopParent(): any;
  getUnderlying(): any | any | Equipment | DepotContainer;
}
