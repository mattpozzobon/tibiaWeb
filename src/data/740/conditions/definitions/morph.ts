import Outfit from "../../../../src/Coutfit"; // Adjust the import path as needed
import Creature from "../../../../src/Ccreature"; // Adjust the import path as needed
import { CONST, getGameServer } from "../../../../src/helper/appContext";

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
