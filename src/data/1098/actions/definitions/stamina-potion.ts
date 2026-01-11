// @ts-nocheck
/*
 * Function staminaPotion
 * Handles using a stamina potion (ID 237)
 * Applies energy healing condition and removes the potion
 */

module.exports = function staminaPotion(player, thing, index, item) {
  /*
   * Function staminaPotion
   * Applies energy healing condition when a stamina potion is used
   */

  // Add energy healing condition: 5 ticks, 10 seconds duration, heals 10 EP per tick
  // CONST.CONDITION.ENERGY_HEALING = 18
  player.addCondition(18, 500, 1000, null);

  // Remove one potion from the container
  thing.removeIndex(index, 1);
}
