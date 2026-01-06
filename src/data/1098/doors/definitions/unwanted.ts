import Player from "../../../../creature/player/player";
import { CONST } from "../../../../helper/appContext";

export default function useTrunk(player: Player): boolean {
  return player.hasCondition(CONST.CONDITION.MAGIC_FLAME);
}