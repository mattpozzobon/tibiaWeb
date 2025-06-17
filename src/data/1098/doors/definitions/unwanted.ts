import Player from "../../../../src/Cplayer";
import { CONST } from "../../../../src/helper/appContext";

export default function useTrunk(player: Player): boolean {
  return player.hasCondition(CONST.CONDITION.MAGIC_FLAME);
}