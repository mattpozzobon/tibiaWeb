// @ts-nocheck
/*
 * Function staminaPotionUseWith
 * Handles using a stamina potion (ID 237) with a target
 * Applies energy healing condition when used on the player
 */

module.exports = function staminaPotionUseWith(player, item, tile, toIndex, fromIndex, fromWhere) {
  /*
   * Function staminaPotionUseWith
   * Applies energy healing condition when a stamina potion is used with a target
   * fromIndex: index of the item in its container (if in container)
   * fromWhere: the container/tile the item is in (if in container)
   */

  // Get the target creature (could be player themselves or another creature)
  const target = tile.getCreature();
  
  // If used on the player themselves
  if (target === player) {
    // Add energy healing condition: 5 ticks, 10 seconds duration, heals 10 EP per tick
    // CONST.CONDITION.ENERGY_HEALING = 18
    player.addCondition(18, 500, 1000, null);
    
    // Remove one potion from inventory or floor
    item.removeCount(1);
    return true;
  }
  
  // If used on another creature or tile, do nothing
  return false;
}
