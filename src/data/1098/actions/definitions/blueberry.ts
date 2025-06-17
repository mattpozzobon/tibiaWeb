import { getGameServer } from "../../../../helper/appContext";
import { IPlayer } from "../../../../interfaces/IPlayer";
import { IItem } from "../../../../interfaces/IThing";
import ITile from "../../../../interfaces/ITile";

export interface BlueberryBushAction {
  execute(player: IPlayer, tile: ITile, index: number, item: IItem): void;
}

export class BlueberryBush implements BlueberryBushAction {
  execute(player: IPlayer, tile: ITile, index: number, item: IItem): void {
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
