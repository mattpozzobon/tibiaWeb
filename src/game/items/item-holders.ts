import Tile from "../../thing/tile";
import Item from "../../item/item";
import Container from "../../item/container/container";
import Player from "../../creature/player/player";
import Equipment from "../../item/equipment";
import ItemStack from "../../item/item-stack";
import DepotContainer from "item/depot";

function wholeCount(item: Item): number {
  return item.isStackable() ? item.count : 1;
}

/**
 * Tile adapter
 */
export class TileHolder {
  readonly kind = "tile" as const;

  constructor(private tile: Tile) {}

  getItem(index: number): any | null {
    if (index === ItemStack.TOP_INDEX) return (this.tile.getTopItem() as any) ?? null;
    return (this.tile.peekIndex(index) as any) ?? null;
  }

  insertItemAt(index: number, item: any): boolean {
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

  getMaximumAddCount(player: Player, item: Item, index: number): number {
    return this.tile.getMaximumAddCount(player, item, index);
  }

  capacity(): number {
    return ItemStack.MAX_CAPACITY;
  }

  canInsert(player: Player, item: Item, index: number): { ok: boolean; reason?: string } {
    const maxCount = this.getMaximumAddCount(player, item, index);
    return maxCount > 0 ? { ok: true } : { ok: false, reason: "Cannot add item to this tile" };
  }

  getTopParent(): any {
    return this.tile.getTopParent();
  }

  getUnderlying(): Tile {
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
  
  removeItemAt(index: number, count?: number): Item | null {
    const item = this.getItem(index);
    if (!item) return null;
  
    const removalCount = count ?? wholeCount(item);
  
    const realIndex = this.resolveIndex(index);
    if (realIndex === null) return null;
  
    return (this.tile.removeIndex(realIndex, removalCount) as Item) ?? null;
  }
}

/**
 * Container adapter
 */
export class ContainerHolder {
  readonly kind = "container" as const;

  constructor(private container: Container) {}

  getItem(index: number): Item | null {
    return (this.container.peekIndex(index) as Item) ?? null;
  }

  removeItemAt(index: number, count?: number): Item | null {
    const item = this.getItem(index);
    if (!item) return null;

    const removalCount = count ?? wholeCount(item);
    return (this.container.removeIndex(index, removalCount) as Item) ?? null;
  }

  insertItemAt(index: number, item: Item): boolean {
    return !!this.container.addThing(item, index);
  }

  getMaximumAddCount(player: Player, item: Item, index: number): number {
    return this.container.getMaximumAddCount(player, item, index);
  }

  capacity(): number {
    return this.container.getSize();
  }

  canInsert(player: Player, item: Item, index: number): { ok: boolean; reason?: string } {
    const maxCount = this.getMaximumAddCount(player, item, index);
    return maxCount > 0 ? { ok: true } : { ok: false, reason: "Cannot add item to this container slot" };
  }

  getTopParent(): any {
    return this.container.getTopParent();
  }

  getUnderlying(): Container {
    return this.container;
  }
}

/**
 * Equipment adapter
 */
export class EquipmentHolder {
  readonly kind = "equipment" as const;

  constructor(private equipment: Equipment) {}

  getItem(index: number): Item | null {
    return (this.equipment.peekIndex(index) as Item) ?? null;
  }

  removeItemAt(index: number, count?: number): Item | null {
    const item = this.getItem(index);
    if (!item) return null;

    const removalCount = count ?? wholeCount(item);
    return (this.equipment.removeIndex(index, removalCount) as Item) ?? null;
  }

  insertItemAt(index: number, item: Item): boolean {
    return !!this.equipment.addThing(item, index);
  }

  getMaximumAddCount(player: Player, item: Item, index: number): number {
    return this.equipment.getMaximumAddCount(player, item, index);
  }

  capacity(): number {
    return 15;
  }

  canInsert(player: Player, item: Item, index: number): { ok: boolean; reason?: string } {
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


export class DepotHolder {
    readonly kind = "depot" as const;
    private depot: DepotContainer;
  
    constructor(depot: DepotContainer) {
      this.depot = depot;
    }
  
    getItem(index: number): Item | null {
      return (this.depot.peekIndex(index) as Item) ?? null;
    }

    removeItemAt(index: number, _count?: number): Item | null {
      // DepotContainer should not allow removing its fixed inner containers
      return null;
    }

    insertItemAt(_index: number, _item: Item): boolean {
      // DepotContainer forbids adding directly (must redirect into inner container)
      return false;
    }

    getMaximumAddCount(_player: Player, _item: Item, _index: number): number {
      return 0;
    }

    capacity(): number {
      return 2; // mail + depot
    }

    canInsert(_player: Player, _item: Item, _index: number): { ok: boolean; reason?: string } {
      return { ok: false, reason: "Cannot add items to DepotContainer directly" };
    }
  
    getTopParent(): any {
      return this.depot.getTopParent();
    }
  
    getUnderlying(): DepotContainer {
      return this.depot;
    }
  }
