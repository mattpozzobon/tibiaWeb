"use strict";

function onStart(creature) {

  /*
   * Function onStart
   * Callback fired on condition start
   */

}

function onExpire(creature) {

  /*
   * Function onExpire
   * Callback fired on condition expire
   */

}

function onTick(creature) {

  /*
   * Function onTick
   * Callback fired every condition tick
   */

  if(creature.isFull(CONST.PROPERTIES.ENERGY)) {
    return;
  }

  let energyHealing = 10;

  // Apply energy healing to the player
  creature.increaseEnergy(energyHealing);
  process.gameServer.world.sendMagicEffect(creature.position, CONST.EFFECT.MAGIC.MAGIC_BLUE);

}

module.exports.onStart = onStart;
module.exports.onExpire = onExpire;
module.exports.onTick = onTick;
