import Outfit from "../../../../game-object/outfit";
import Creature from "../../../../creature/creature";
import { CONST, getGameServer } from "../../../../helper/appContext";

let defaultOutfit: Outfit | null = null;

export function onStart(creature: Creature, properties: number): void {
  defaultOutfit = creature.getOutfit();

  const gameServer = getGameServer();
  gameServer.world.sendMagicEffect(creature.position, CONST.EFFECT.MAGIC.TELEPORT);
  creature.changeOutfit(new Outfit({ id: properties }));
}

export function onExpire(creature: Creature): void {
  /*
   * Function onExpire
   * Callback fired on condition expire
   */

  const gameServer = getGameServer();
  gameServer.world.sendMagicEffect(creature.position, CONST.EFFECT.MAGIC.TELEPORT);

  if (defaultOutfit) {
    creature.changeOutfit(defaultOutfit);
  }
}

export function onTick(creature: Creature): void {
  
}
