// @ts-nocheck
const { CONST, getGameServer } = require("../../../../helper/appContext");
/*
 * Function healthPotion
 * Handles using a health potion (ID 7618)
 * Applies healing condition and removes the potion
 */

module.exports = {
  use(player, thing, index, item) {
    /*
     * Applies healing condition when a health potion is used
     */

    // Add healing condition: 5 ticks, 10 seconds duration, heals 10 HP per tick
    // CONST.CONDITION.HEALTH_HEALING = 16
    player.addCondition(CONST.CONDITION.HEALTH_HEALING, 500, 1000, null);
    getGameServer().world.sendMagicEffect(player.getPosition(), CONST.EFFECT.MAGIC.MAGIC_GREEN);

    // Remove one potion from the container
    thing.removeIndex(index, 1);
  },

  useWith(player, item, tile, toIndex, fromIndex, fromWhere) {
    /*
     * Applies healing condition when a health potion is used with a target
     * fromIndex: index of the item in its container (if in container)
     * fromWhere: the container/tile the item is in (if in container)
     */

    // Get the target creature (could be player themselves or another creature)
    const target = tile.getCreature();

    // If used on the player themselves
    if (target === player) {
      player.addCondition(CONST.CONDITION.HEALTH_HEALING, 500, 1000, null);
      getGameServer().world.sendMagicEffect(player.getPosition(), CONST.EFFECT.MAGIC.MAGIC_GREEN);

      // Remove one potion from inventory or floor
      item.removeCount(1);
      return true;
    }

    // If used on another creature or tile, do nothing
    return false;
  },
};
