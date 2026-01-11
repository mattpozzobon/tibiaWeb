// @ts-nocheck
/*
 * Function healthPotionUseWith
 * Handles using a health potion (ID 7618) with a target
 * Applies healing condition when used on the player
 */

module.exports = function healthPotionUseWith(player, item, tile, toIndex, fromIndex, fromWhere) {
  /*
   * Function healthPotionUseWith
   * Applies healing condition when a health potion is used with a target
   * fromIndex: index of the item in its container (if in container)
   * fromWhere: the container/tile the item is in (if in container)
   */

  // Get the target creature (could be player themselves or another creature)
  const target = tile.getCreature();
  
  // If used on the player themselves
  if (target === player) {
    // Add healing condition: 5 ticks, 10 seconds duration, heals 10 HP per tick
    // CONST.CONDITION.HEALTH_HEALING = 16
    player.addCondition(16, 500, 1000, null);
    
    // Remove one potion from inventory or floor
    item.removeCount(1);
    return true;
  }
  
  // If used on another creature or tile, do nothing
  return false;
}
