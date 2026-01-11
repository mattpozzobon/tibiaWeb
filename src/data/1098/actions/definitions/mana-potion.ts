// @ts-nocheck
const { CONST } = require("../../../../helper/appContext");
/*
 * Function manaPotion
 * Handles using a mana potion (ID 268)
 * Applies mana healing condition and removes the potion
 */

module.exports = {
  use(player, thing, index, item) {
    /*
     * Applies mana healing condition when a mana potion is used
     */

    // Add mana healing condition: 5 ticks, 10 seconds duration, heals 10 MP per tick
    player.addCondition(CONST.CONDITION.MANA_HEALING, 500, 1000, null);

    // Remove one potion from the container
    thing.removeIndex(index, 1);
  },

  useWith(player, item, tile, toIndex, fromIndex, fromWhere) {
    /*
     * Applies mana healing condition when a mana potion is used with a target
     */

    const target = tile.getCreature();

    if (target === player) {
      player.addCondition(CONST.CONDITION.MANA_HEALING, 500, 1000, null);
      item.removeCount(1);
      return true;
    }

    return false;
  },
};
