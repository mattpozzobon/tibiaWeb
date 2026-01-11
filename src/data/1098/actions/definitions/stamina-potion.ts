// @ts-nocheck
const { CONST } = require("../../../../helper/appContext");
/*
 * Function staminaPotion
 * Handles using a stamina potion (ID 237)
 * Applies energy healing condition and removes the potion
 */

module.exports = {
  use(player, thing, index, item) {
    /*
     * Applies energy healing condition when a stamina potion is used
     */

    // Add energy healing condition: 5 ticks, 10 seconds duration, heals 10 EP per tick
    player.addCondition(CONST.CONDITION.ENERGY_HEALING, 500, 1000, null);

    // Remove one potion from the container
    thing.removeIndex(index, 1);
  },

  useWith(player, item, tile, toIndex, fromIndex, fromWhere) {
    /*
     * Applies energy healing condition when a stamina potion is used with a target
     */

    const target = tile.getCreature();

    if (target === player) {
      player.addCondition(CONST.CONDITION.ENERGY_HEALING, 500, 1000, null);
      item.removeCount(1);
      return true;
    }

    return false;
  },
};
