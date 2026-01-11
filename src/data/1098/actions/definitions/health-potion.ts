// @ts-nocheck
/*
 * Function healthPotion
 * Handles using a health potion (ID 7618)
 * Applies healing condition and removes the potion
 */

module.exports = function healthPotion(player, thing, index, item) {
  /*
   * Function healthPotion
   * Applies healing condition when a health potion is used
   */

  // Add healing condition: 5 ticks, 10 seconds duration, heals 10 HP per tick
  // CONST.CONDITION.HEALTH_HEALING = 16
  player.addCondition(16, 500, 1000, null);

  // Remove one potion from the container
  thing.removeIndex(index, 1);
}
