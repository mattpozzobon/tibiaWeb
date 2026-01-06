import { getGameServer } from "../../helper/appContext";
import Corpse from "../../item/container/corpse";
import LootEntry from "./monster-loot-entry";
import { ILootHandler } from "../../interfaces/IMonster-loot-handler";


class LootHandler implements ILootHandler{
  private loots: LootEntry[];

  constructor(loot: any[]) {
    /*
     * Class LootHandler
     * Handler for loot for monsters
     */
    this.loots = loot.map((x) => new LootEntry(x));
  }

  public addLoot(corpse: Corpse): void {
    /*
     * Function LootHandler.addLoot
     * Adds loot to the corpse container
     */

    // Invalid: too much loot for the container size
    if (this.loots.length > corpse.getSize()) {
      console.warn("Corpse loot exceeds the corpse size");
      return;
    }

    // Add each entry in the loot table
    this.loots.forEach((loot) => {
      // Check the probability
      if (!loot.roll()) {
        return;
      }

      // Create the thing
      const item = getGameServer().database.createThing(loot.getId());

      if(item){
        // Cannot be picked up
        if (!item.isPickupable()) {
          return;
        }

        // Set the random between minimum and maximum
        if (loot.hasCount() && item.isStackable()) {
          item.setCount(loot.rollCount());
        }

        // Push the loot to the container
        corpse.addFirstEmpty(item);
      }
    });
  }
}

export default LootHandler;
