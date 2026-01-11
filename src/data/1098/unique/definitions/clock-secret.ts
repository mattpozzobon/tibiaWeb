import { Position } from "../../../../utils/position";
import { CONST, getGameServer } from "../../../../helper/appContext";
import Thing from "thing/thing";
import Player from "creature/player/player";
import Tile from "thing/tile";
import Item from "item/item";

export function useTrunk(player: Player, tile: Tile, index: number, item: Item): boolean {
    let done = false;

    // Only allowed when not moving
    if (player.isMoving()) {
      return true;
    }
  
    const middle: Tile | null = getGameServer().world.getTileFromWorldPosition(new Position( 65, 110, 8 ));
    const right: Tile | null = getGameServer().world.getTileFromWorldPosition(new Position(66, 110, 8 ));
  
    if (!middle || !right) {
      player.sendCancelMessage("The specified tiles do not exist.");
      return false;
    }
  
    if (!done) {
      if (right.isOccupiedAny()) {
        player.sendCancelMessage("Somehow the light does not dim.");
        return false;
      }
  
      const thing: Thing | null = middle.removeIndex(0xff, 1);
      if (thing) {
        const item = getGameServer().database.createThing(1718);
        if (item){
            const newThing = thing.replace(item);
            right.addTopThing(newThing);
        }
      }
    } else {
      const thing: Thing | null = right.removeIndex(0xff, 1);
      if (thing) {
        const item = getGameServer().database.createThing(1719)
        if(item){
            const newThing = thing.replace(item);
            middle.addTopThing(newThing);
        }
      }
    }
  
    done = !done;
    getGameServer().world.sendMagicEffect(middle.position, CONST.EFFECT.MAGIC.POFF);
  
    return true;
  }
  