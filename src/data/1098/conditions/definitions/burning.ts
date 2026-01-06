import Creature from "../../../../creature/creature";
import Player from "../../../../creature/player/player";
import { CONST, getGameServer } from "../../../../helper/appContext";

export function onStart(creature: Creature): void {
  if (creature instanceof Player) {
    creature.sendCancelMessage("You are burning!");
  }
}

export function onExpire(creature: Creature): void {
  if (creature instanceof Player) {
    creature.sendCancelMessage("You feel better again.");
  }
}

export function onTick(creature: Creature): void {

  // Damage depends on whether this is the first tick
  const damage = this.isFirstTick() ? 2 : 1;

  const gameServer = getGameServer();
  gameServer.world.applyEnvironmentalDamage(creature, damage, CONST.COLOR.ORANGE);
  gameServer.world.sendMagicEffect(creature.position, CONST.EFFECT.MAGIC.HITBYFIRE);
}
