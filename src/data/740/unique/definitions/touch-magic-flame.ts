import { CONST } from "../../../../helper/appContext";
import { IPlayer } from "../../../../interfaces/IPlayer";
import { IItem } from "../../../../interfaces/IThing";
import ITile from "../../../../interfaces/ITile";


export function useTrunk(player: IPlayer, tile: ITile, index: number, item: IItem): boolean {
  // Only allowed when not moving
  if (player.isMoving()) {
    return true;
  }

  player.addCondition(CONST.CONDITION.MAGIC_FLAME, 1, 250, null);

  return true;
}
