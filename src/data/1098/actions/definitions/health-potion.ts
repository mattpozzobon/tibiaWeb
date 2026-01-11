// @ts-nocheck
const { CONST, sendMagicEffect } = require("../../../../helper/appContext");

module.exports = {
  
  use(player: Player, thing: Thing, index: number, item: Item) {
    const name = (item.getName?.() || "").toLowerCase();
    const healAmount = name === "small health potion" ? 10 : 50;

    player.addCondition(CONST.CONDITION.HEALTH_HEALING, 1, 10, { healAmount });
    sendMagicEffect(player.getPosition(), CONST.EFFECT.MAGIC.MAGIC_GREEN);
    item.removeCount(1);
  },

  useWith(player: Player, item: Item, tile: Tile, toIndex: number, fromIndex: number, fromWhere: string) {
    const target = tile.getCreature();

    if (target === player) {
      const name = (item.getName?.() || "").toLowerCase();
      const healAmount = name === "small health potion" ? 10 : 50;

      player.addCondition(CONST.CONDITION.HEALTH_HEALING, 1, 30, { healAmount });
      sendMagicEffect(player.getPosition(), CONST.EFFECT.MAGIC.MAGIC_GREEN);
      item.removeCount(1);
      return true;
    }

    return false;
  },
};
