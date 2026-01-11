import { CONST, getGameServer } from "../../../../helper/appContext";
import Player from "creature/player/player";
import Tile from "thing/tile";

export function enterCryptTile(tile: Tile, player: Player): boolean {
  if (player.hasCondition(CONST.CONDITION.INVISIBLE)) {
    getGameServer().world.sendMagicEffect(tile.position, CONST.EFFECT.MAGIC.MAGIC_GREEN);
    return true;
  }

  player.sendCancelMessage("A magical barrier is holding you back.");
  getGameServer().world.creatureHandler.teleportCreature(player, tile.position.north());
  getGameServer().world.sendMagicEffect(tile.position, CONST.EFFECT.MAGIC.ENERGYHIT);

  return false;
}
