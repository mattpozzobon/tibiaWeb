// @ts-nocheck
const { getGameServer } = require("../../../../helper/appContext");

module.exports = {
  useWith(player: Player, item: Item, tile: Tile, toIndex: number, fromIndex: number, fromWhere: string) {
    if (player.isMoving()) {
      return true;
    }

    if (!player.isBesidesThing(tile)) {
      return false;
    }

    const thing = tile.getTopItem();

    if (!thing) {
      return false;
    }

    const thingId = thing.id;

    if (thingId === 2739 || thingId === 2738) {
      const cutWheat = getGameServer().database.createThing(2737);
      if (cutWheat) {
        thing.replace(cutWheat);
      }
    }

    if (thingId === 2739) {
      const wheat = getGameServer().database.createThing(2694);
      if (wheat) {
        wheat.setCount(1);
        tile.addTopThing(wheat);
      }
    }

    return true;
  },
};