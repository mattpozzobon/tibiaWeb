import { CONST } from "../../../../helper/appContext";
import Player from "creature/player/player";
import Tile from "thing/tile";
import Item from "item/item";


export function useTrunk(player: Player, tile: Tile, index: number, item: Item): boolean {
  // Only allowed when not moving
  if (player.isMoving()) {
    return true;
  }

  player.addCondition(CONST.CONDITION.MAGIC_FLAME, 1, 250, null);

  return true;
}
