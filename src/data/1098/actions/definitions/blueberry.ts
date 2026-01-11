import { getGameServer } from "../../../../helper/appContext";
import Player from "creature/player/player";
import Tile from "thing/tile";
import Item from "item/item";

export interface BlueberryBushAction {
  execute(player: Player, tile: Tile, index: number, item: Item): void;
}

export class BlueberryBush {
  execute(player: Player, tile: Tile, index: number, item: Item): void {
    /*
     * Function blueberryBush
     * Picks blueberries from a blueberry bush
     */

    const bush = getGameServer().database.createThing(2786);
    const amount = this.randomExp(3, 10, 3);
    const berries = getGameServer().database.createThing(2677)?.setCount(amount)

    if(bush && berries){
      bush.scheduleDecay();
      item.replace(bush);
      tile.addTopThing(berries);
    }
  }

  private randomExp(min: number, max: number, exp: number): number {
    return Math.floor(Math.pow(Math.random(), exp) * (max - min + 1)) + min;
  }
}
