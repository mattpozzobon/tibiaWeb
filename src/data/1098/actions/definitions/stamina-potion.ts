// @ts-nocheck
const { CONST, sendMagicEffect } = require("../../../../helper/appContext");

module.exports = {
  use(player, thing, index, item) {
    const name = (item.getName?.() || "").toLowerCase();
    const amount = name === "small stamina potion" ? 10 : 50;
    player.increaseEnergy(amount);
    player.addCondition(CONST.CONDITION.ENERGY_HEALING, 1, 30, { healAmount: amount });
    sendMagicEffect(player.getPosition(), CONST.EFFECT.MAGIC.MAGIC_GREEN);
    item.removeCount(1);
  },

  useWith(player, item, tile, toIndex, fromIndex, fromWhere) {
    const target = tile.getCreature();

    if (target === player) {
      const name = (item.getName?.() || "").toLowerCase();
      const amount = name === "small stamina potion" ? 10 : 50;
      player.increaseEnergy(amount);
      player.addCondition(CONST.CONDITION.ENERGY_HEALING, 1, 30, { healAmount: amount });
      sendMagicEffect(player.getPosition(), CONST.EFFECT.MAGIC.MAGIC_GREEN);
      item.removeCount(1);
      return true;
    }

    return false;
  },
};
