import { CONST, getGameServer } from "../../../../helper/appContext";
import Player from "creature/player/player";
import Tile from "thing/tile";
import Item from "item/item";
import { Position } from "utils/position";

export function useTrunk(player: Player, tile: Tile, index: number, item: Item): boolean {
  // Only allowed when not moving
  if (player.isMoving()) {
    return true;
  }

  // Teleport the player
  const destination: Position = tile.position.down();
  getGameServer().world.creatureHandler.teleportCreature(player, destination);

  // TODO:
  //player.getSlowness()
  player.movementHandler.lock(0);

  getGameServer().world.sendMagicEffect(destination, CONST.EFFECT.MAGIC.YELLOW_RINGS);

  return true;
}
