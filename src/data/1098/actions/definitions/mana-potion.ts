// @ts-nocheck
/*
 * Function manaPotion
 * Handles using a mana potion (ID 268)
 * Applies mana healing condition and removes the potion
 */

module.exports = function manaPotion(player, thing, index, item) {
  /*
   * Function manaPotion
   * Applies mana healing condition when a mana potion is used
   */

  // Add mana healing condition: 5 ticks, 10 seconds duration, heals 10 MP per tick
  // CONST.CONDITION.MANA_HEALING = 17
  player.addCondition(17, 500, 1000, null);

  // Remove one potion from the container
  thing.removeIndex(index, 1);
}
