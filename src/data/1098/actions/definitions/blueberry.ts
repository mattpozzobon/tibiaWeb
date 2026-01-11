// @ts-nocheck
const { getGameServer } = require("../../../../helper/appContext");

module.exports = {
  use(player: Player, thing: Thing, index: number, item: Item) {
    const bush = getGameServer().database.createThing(2786);
    const amount = randomExp(2, 10, 3);
    const berries = getGameServer().database.createThing(2677)?.setCount(amount);

    if (bush && berries) {
      bush.scheduleDecay();
      item.replace(bush);
      thing.addTopThing(berries);
    }
  },
};

function randomExp(min: number, max: number, exp: number): number {
    return Math.floor(Math.pow(Math.random(), exp) * (max - min + 1)) + min;
}
