// @ts-nocheck
/*
 * Function manaPotionUseWith
 * Handles using a mana potion (ID 268) with a target
 * Applies mana healing condition when used on the player
 */

module.exports = function manaPotionUseWith(player, item, tile, toIndex, fromIndex, fromWhere) {
  /*
   * Function manaPotionUseWith
   * Applies mana healing condition when a mana potion is used with a target
   * fromIndex: index of the item in its container (if in container)
   * fromWhere: the container/tile the item is in (if in container)
   */

  // Get the target creature (could be player themselves or another creature)
  const target = tile.getCreature();
  
  // If used on the player themselves
  if (target === player) {
    // Add mana healing condition: 5 ticks, 10 seconds duration, heals 10 MP per tick
    // CONST.CONDITION.MANA_HEALING = 17
    player.addCondition(17, 500, 1000, null);
    
    // Remove one potion from inventory or floor
    item.removeCount(1);
    return true;
  }
  
  // If used on another creature or tile, do nothing
  return false;
}
