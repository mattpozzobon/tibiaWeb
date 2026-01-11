import { IPlayer } from "interfaces/IPlayer";
import { IContainer, IItem } from "../../interfaces/IThing";
import ITile from "../../interfaces/ITile";
import Equipment from "../../item/equipment";
import ItemStack from "../../item/item-stack";
import { IItemHolder } from "./item-location";
import DepotContainer from "item/depot";

function wholeCount(item: IItem): number {
  return item.isStackable() ? item.count : 1;
}

/**
 * Tile adapter
 */
export class TileHolder implements IItemHolder {
  readonly kind = "tile" as const;

  constructor(private tile: ITile) {}

  getItem(index: number): IItem | null {
    if (index === ItemStack.TOP_INDEX) return (this.tile.getTopItem() as IItem) ?? null;
    return (this.tile.peekIndex(index) as IItem) ?? null;
  }

  insertItemAt(index: number, item: IItem): boolean {
    if (index === ItemStack.TOP_INDEX) {
      // Prefer addTopThing if it exists, else fallback to addThing
      const t: any = this.tile as any;
      if (typeof t.addTopThing === "function") t.addTopThing(item);
      else this.tile.addThing(item, ItemStack.TOP_INDEX);
      return true;
    }

    this.tile.addThing(item, index);
    return true;
  }

  getMaximumAddCount(player: IPlayer, item: IItem, index: number): number {
    return this.tile.getMaximumAddCount(player, item, index);
  }

  capacity(): number {
    return ItemStack.MAX_CAPACITY;
  }

  canInsert(player: IPlayer, item: IItem, index: number): { ok: boolean; reason?: string } {
    const maxCount = this.getMaximumAddCount(player, item, index);
    return maxCount > 0 ? { ok: true } : { ok: false, reason: "Cannot add item to this tile" };
  }

  getTopParent(): any {
    return this.tile.getTopParent();
  }

  getUnderlying(): ITile {
    return this.tile;
  }

  private resolveIndex(index: number): number | null {
    if (index !== ItemStack.TOP_INDEX) return index;
  
    const t: any = this.tile as any;
    const top = t.getTopItem?.() ?? null;
    const items = t.itemStack?.getItems?.() ?? null;
  
    if (!top || !items) return null;
  
    const realIndex = items.indexOf(top);
    return realIndex >= 0 ? realIndex : null;
  }
  
  removeItemAt(index: number, count?: number): IItem | null {
    const item = this.getItem(index);
    if (!item) return null;
  
    const removalCount = count ?? wholeCount(item);
  
    const realIndex = this.resolveIndex(index);
    if (realIndex === null) return null;
  
    return (this.tile.removeIndex(realIndex, removalCount) as IItem) ?? null;
  }
}

/**
 * Container adapter
 */
export class ContainerHolder implements IItemHolder {
  readonly kind = "container" as const;

  constructor(private container: IContainer) {}

  getItem(index: number): IItem | null {
    return (this.container.peekIndex(index) as IItem) ?? null;
  }

  removeItemAt(index: number, count?: number): IItem | null {
    const item = this.getItem(index);
    if (!item) return null;

    const removalCount = count ?? wholeCount(item);
    return (this.container.removeIndex(index, removalCount) as IItem) ?? null;
  }

  insertItemAt(index: number, item: IItem): boolean {
    return !!this.container.addThing(item, index);
  }

  getMaximumAddCount(player: IPlayer, item: IItem, index: number): number {
    return this.container.getMaximumAddCount(player, item, index);
  }

  capacity(): number {
    return this.container.getSize();
  }

  canInsert(player: IPlayer, item: IItem, index: number): { ok: boolean; reason?: string } {
    const maxCount = this.getMaximumAddCount(player, item, index);
    return maxCount > 0 ? { ok: true } : { ok: false, reason: "Cannot add item to this container slot" };
  }

  getTopParent(): any {
    return this.container.getTopParent();
  }

  getUnderlying(): IContainer {
    return this.container;
  }
}

/**
 * Equipment adapter
 */
export class EquipmentHolder implements IItemHolder {
  readonly kind = "equipment" as const;

  constructor(private equipment: Equipment) {}

  getItem(index: number): IItem | null {
    return (this.equipment.peekIndex(index) as IItem) ?? null;
  }

  removeItemAt(index: number, count?: number): IItem | null {
    const item = this.getItem(index);
    if (!item) return null;

    const removalCount = count ?? wholeCount(item);
    return (this.equipment.removeIndex(index, removalCount) as IItem) ?? null;
  }

  insertItemAt(index: number, item: IItem): boolean {
    return !!this.equipment.addThing(item, index);
  }

  getMaximumAddCount(player: IPlayer, item: IItem, index: number): number {
    return this.equipment.getMaximumAddCount(player, item, index);
  }

  capacity(): number {
    return 15;
  }

  canInsert(player: IPlayer, item: IItem, index: number): { ok: boolean; reason?: string } {
    const maxCount = this.getMaximumAddCount(player, item, index);
    return maxCount > 0 ? { ok: true } : { ok: false, reason: "Cannot equip this item in this slot" };
  }

  getTopParent(): any {
    return this.equipment.getTopParent();
  }

  getUnderlying(): Equipment {
    return this.equipment;
  }
}


export class DepotHolder implements IItemHolder {
    readonly kind = "depot" as const;
    private depot: DepotContainer;
  
    constructor(depot: DepotContainer) {
      this.depot = depot;
    }
  
    getItem(index: number): IItem | null {
      return (this.depot.peekIndex(index) as any) ?? null;
    }
  
    removeItemAt(index: number, _count?: number): IItem | null {
      // DepotContainer should not allow removing its fixed inner containers
      return null;
    }
  
    insertItemAt(_index: number, _item: IItem): boolean {
      // DepotContainer forbids adding directly (must redirect into inner container)
      return false;
    }
  
    getMaximumAddCount(_player: any, _item: IItem, _index: number): number {
      return 0;
    }
  
    capacity(): number {
      return 2; // mail + depot
    }
  
    canInsert(_player: IPlayer, _item: IItem, _index: number): { ok: boolean; reason?: string } {
      return { ok: false, reason: "Cannot add items to DepotContainer directly" };
    }
  
    getTopParent(): any {
      return this.depot.getTopParent();
    }
  
    getUnderlying(): DepotContainer {
      return this.depot;
    }
  }
