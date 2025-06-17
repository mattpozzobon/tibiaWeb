import { CONST, getGameServer } from "../../../../helper/appContext";
import { IPlayer } from "../../../../interfaces/IPlayer";
import ITile from "../../../../interfaces/ITile";

export function enterCryptTile(tile: ITile, player: IPlayer): boolean {
  if (player.hasCondition(CONST.CONDITION.INVISIBLE)) {
    getGameServer().world.sendMagicEffect(tile.position, CONST.EFFECT.MAGIC.MAGIC_GREEN);
    return true;
  }

  player.sendCancelMessage("A magical barrier is holding you back.");
  getGameServer().world.creatureHandler.teleportCreature(player, tile.position.north());
  getGameServer().world.sendMagicEffect(tile.position, CONST.EFFECT.MAGIC.ENERGYHIT);

  return false;
}
