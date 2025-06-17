import { CONST, getGameServer } from "../../../../helper/appContext";
import { IPlayer } from "../../../../interfaces/IPlayer";
import { IPosition } from "../../../../interfaces/IPosition";
import { IItem } from "../../../../interfaces/IThing";
import ITile from "../../../../interfaces/ITile";

export function useTrunk(player: IPlayer, tile: ITile, index: number, item: IItem): boolean {
  // Only allowed when not moving
  if (player.isMoving()) {
    return true;
  }

  // Teleport the player
  const destination: IPosition = tile.position.down();
  getGameServer().world.creatureHandler.teleportCreature(player, destination);

  // TODO:
  //player.getSlowness()
  player.movementHandler.lock(0);

  getGameServer().world.sendMagicEffect(destination, CONST.EFFECT.MAGIC.YELLOW_RINGS);

  return true;
}
