import { IPlayer } from "interfaces/IPlayer";
import { IItem } from "interfaces/IThing";
import ITile from "interfaces/ITile";

export function useTrunk(player: IPlayer, tile: ITile, index: number, item: IItem): boolean {
  player.sendCancelMessage("You find treasure!");

  return true;
}