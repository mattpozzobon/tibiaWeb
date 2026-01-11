import ITile from "interfaces/ITile";
import { IContainer, IItem } from "interfaces/IThing";
import { IPlayer } from "interfaces/IPlayer";
import Equipment from "../../item/equipment";
import DepotContainer from "item/depot";


export type ItemLocation =
  | { kind: "tile"; tile: ITile }
  | { kind: "container"; container: IContainer }
  | { kind: "equipment"; equipment: Equipment }
  | { kind: "depot"; depot: DepotContainer };

export interface IItemHolder {
  readonly kind: "tile" | "container" | "equipment" | "depot";

  getItem(index: number): IItem | null;
  removeItemAt(index: number, count?: number): IItem | null;
  insertItemAt(index: number, item: IItem): boolean;

  getMaximumAddCount(player: any, item: IItem, index: number): number;
  capacity(): number;

  canInsert(player: IPlayer, item: IItem, index: number): { ok: boolean; reason?: string };

  getTopParent(): any;
  getUnderlying(): ITile | IContainer | Equipment | DepotContainer;
}
