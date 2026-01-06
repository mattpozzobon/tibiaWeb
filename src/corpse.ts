import Container from "./container";
import { CONST } from "./helper/appContext";

class Corpse extends Container {
  constructor(id: number, size: number) {
    /*
     * Class Corpse
     * Wrapper for monster corpses that contain loot
     *
     * API:
     *
     * Corpse.getFluidType - returns the blood type of the corpse
     * Corpse.addLoot(loot) - adds loot entries to the corpse
     *
     */
    super(id, size);
  }

  getFluidType(): string {
    /*
     * Function Corpse.getFluidType
     * Returns the fluid type of the corpse
     */

    // Add mappings here
    switch (this.getAttribute("corpseType")) {
      case "blood":
        return CONST.FLUID.BLOOD.toString();
      case "venom":
        return CONST.FLUID.SLIME.toString();
      case "undead":
      case "fire":
        return CONST.FLUID.NONE.toString();
      default:
        return CONST.FLUID.BLOOD.toString();
    }
  }
}

export default Corpse;
