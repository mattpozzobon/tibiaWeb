import Player from "creature/player/player";
import Tile from "thing/tile";
import Item from "item/item";

export function useTrunk(player: Player, tile: Tile, index: number, item: Item): boolean {
  player.sendCancelMessage("You find treasure!");

  return true;
}