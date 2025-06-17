import { Position } from "../../../../Cposition";
import { CONST, getGameServer } from "../../../../helper/appContext";
import { IPlayer } from "../../../../interfaces/IPlayer";
import { IItem, IThing } from "../../../../interfaces/IThing";
import ITile from "../../../../interfaces/ITile";

export function useTrunk(player: IPlayer, tile: ITile, index: number, item: IItem): boolean {
    let done = false;

    // Only allowed when not moving
    if (player.isMoving()) {
      return true;
    }
  
    const middle: ITile | null = getGameServer().world.getTileFromWorldPosition(new Position( 65, 110, 8 ));
    const right: ITile | null = getGameServer().world.getTileFromWorldPosition(new Position(66, 110, 8 ));
  
    if (!middle || !right) {
      player.sendCancelMessage("The specified tiles do not exist.");
      return false;
    }
  
    if (!done) {
      if (right.isOccupiedAny()) {
        player.sendCancelMessage("Somehow the light does not dim.");
        return false;
      }
  
      const thing: IThing | null = middle.removeIndex(0xff, 1);
      if (thing) {
        const item = getGameServer().database.createThing(1718);
        if (item){
            const newThing = thing.replace(item);
            right.addTopThing(newThing);
        }
      }
    } else {
      const thing: IThing | null = right.removeIndex(0xff, 1);
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
  