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

function onTick(creature, properties) {

  /*
   * Function onTick
   * Callback fired every condition tick
   */

  if(creature.isFull(CONST.PROPERTIES.MANA)) {
    return;
  }

  const healAmount = properties && typeof properties.healAmount === 'number' ? properties.healAmount : 10;

  creature.increaseMana(healAmount);
  process.gameServer.world.sendMagicEffect(creature.position, CONST.EFFECT.MAGIC.MAGIC_BLUE);

}

module.exports.onStart = onStart;
module.exports.onExpire = onExpire;
module.exports.onTick = onTick;
