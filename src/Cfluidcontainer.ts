import Item from "./Citem";
import { CONST, getGameServer } from "./helper/appContext";

class FluidContainer extends Item {
  count: number;

  /*
   * Class FluidContainer
   * Container for items that can contain a fluid
   */

  constructor(id: number) {
    super(id);

    // Count means the fluid type for fluid containers
    this.count = 0;
  }

  handleUseWith(player: any, item: any, tile: any, index: number): void {
    /*
     * Function FluidContainer.handleUseWith
     * Callback fired when the fluid container is used with something
     */

    if (this.isEmpty()) {
      this.__handleFill(player, item, tile, index);
      return;
    }

    if (tile.getCreature() === player) {
      player.speechHandler.internalCreatureSay(this.__getDrinkText(), CONST.COLOR.YELLOW);

      if (this.isAlcohol()) {
        player.addCondition(CONST.CONDITION.DRUNK, 1, 500, null);
      }

      if (this.isSlime()) {
        player.addCondition(CONST.CONDITION.POISONED, 10, 20, null);
      }

      if (this.isLava()) {
        player.addCondition(CONST.CONDITION.BURNING, 5, 50, null);
      }

      this.__empty();
      return;
    }

    if (!player.isBesidesThing(tile)) {
      player.sendCancelMessage("You have to move closer.");
      return;
    }

    const useWithItem = tile.peekIndex(0xff);
    if (useWithItem !== null && useWithItem instanceof FluidContainer) {
      if (useWithItem.isEmpty()) {
        this.__swapLiquid(useWithItem);
      } else {
        player.sendCancelMessage("This container is already full.");
      }
      return;
    }

    if (tile.isOccupied()) {
      player.sendCancelMessage("You cannot empty this fluid container here.");
      return;
    }

    this.__createSplash(tile);
    this.__empty();
  }

  isOil(): boolean {
    return this.count === CONST.FLUID.OIL;
  }

  isLava(): boolean {
    return this.count === CONST.FLUID.LAVA;
  }

  isSlime(): boolean {
    return this.count === CONST.FLUID.SLIME;
  }

  isAlcohol(): boolean {
    return (
      this.count === CONST.FLUID.BEER ||
      this.count === CONST.FLUID.WINE ||
      this.count === CONST.FLUID.RUM
    );
  }

  private __empty(): void {
    this.setFluidType(CONST.FLUID.NONE);
    const thing = getGameServer().database.createThing(this.id);
    if (thing)
      this.replace(thing);
  }

  isEmpty(): boolean {
    return this.count === CONST.FLUID.NONE;
  }

  private __handleFill(player: any, item: any, tile: any, index: number): void {
    let useWithItem = tile.getTopItem();

    if (useWithItem === null) {
      if (!tile.getPrototype().properties.fluidSource) {
        player.sendCancelMessage("You cannot use this item here.");
        return;
      }
      useWithItem = tile;
    }

    if (useWithItem instanceof FluidContainer && !useWithItem.isEmpty()) {
      useWithItem.__swapLiquid(this);
      return;
    }

    const fluidSource = useWithItem.getAttribute("fluidSource");
    if (fluidSource === null) {
      return;
    }

    const thing = getGameServer().database.createThing(this.id);
    if (thing instanceof Item ){
      thing?.setFluidType(this.__mapString(fluidSource));
      this.replace(thing);
    }
  }

  private __swapLiquid(item: FluidContainer): void {
    const other = getGameServer().database.createThing(item.id);
    if (other instanceof Item) {
      other.setFluidType(this.count); // No need for optional chaining on `other` here
      item.replace(other);
    }
  
    const itself = getGameServer().database.createThing(this.id);
    if (itself instanceof Item) {
      itself.setFluidType(CONST.FLUID.NONE); // No need for optional chaining on `itself` here
      this.replace(itself);
    }
  }

  private __createSplash(tile: any): void {
    const splash = getGameServer().database.createThing(2016);
    if (splash instanceof Item)
      splash?.setFluidType(this.count);
    splash?.scheduleDecay();
    tile.addThing(splash, 0);
  }

  private __mapString(string: string): number {
    switch (string) {
      case "blood":
        return CONST.FLUID.BLOOD;
      case "water":
        return CONST.FLUID.WATER;
      case "slime":
        return CONST.FLUID.SLIME;
      default:
        return CONST.FLUID.NONE;
    }
  }

  private __getDrinkText(): string {
    switch (this.count) {
      case CONST.FLUID.WATER:
        return "Gulp..";
      case CONST.FLUID.SLIME:
        return "Ugh!";
      default:
        return "Ahhh..";
    }
  }
}

export default FluidContainer;
