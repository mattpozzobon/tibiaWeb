import { getDataFile } from "./helper/appContext";

export interface OutfitDetails {
  head: number;
  body: number;
  legs: number;
  feet: number;
}

export interface EquipmentDetails extends OutfitDetails {
  hair: number;
  lefthand: number;
  righthand: number;
  backpack: number;
  belt: number;
}

export interface OutfitConfig {
  id: number;
  details?: OutfitDetails | null;
  equipment?: EquipmentDetails | null;
  mount?: number | null;
  mounted?: boolean;
  addonOne?: boolean;
  addonTwo?: boolean;
}

export class Outfit {
  id: number;
  details: OutfitDetails | null;
  equipment: EquipmentDetails | null;
  mount: number | null;
  mounted: boolean;
  addonOne: boolean;
  addonTwo: boolean;

  static MOUNTS: Record<number, { name: string }> = require(getDataFile("mounts", "mounts"));
  static OUTFITS: Record<number, { name: string }> = require(getDataFile("outfits", "outfits"));

  constructor(outfit: OutfitConfig) {
    /*
     * Class Outfit
     * Container for a creature outfit (player, NPC, monster)
     *
     * API:
     *
     * Outfit.getMountName(id) - returns the mount name that belongs to a mount identifier
     * Outfit.getName(id) - returns the name that belongs to an outfit identifier
     */
    this.id = outfit.id ?? 1;
    this.details = outfit.details ?? null;
    this.equipment = outfit.equipment ?? {hair: 904, head: 0, body: 0, legs: 0, feet: 0, lefthand: 0, righthand: 0, backpack: 0, belt: 0};
    this.mount = outfit.mount ?? null;
    this.mounted = outfit.mounted ?? false;
    this.addonOne = outfit.addonOne ?? false;
    this.addonTwo = outfit.addonTwo ?? false;
  }

  static getMountName(id: number): string | null {
    /*
     * Returns the name of a mount with a particular identifier
     */
    return Outfit.MOUNTS[id]?.name ?? null;
  }

  static getName(id: number): string | null {
    /*
     * Returns the name of an outfit with a particular identifier
     */
    return Outfit.OUTFITS[id]?.name ?? null;
  }

  toJSON(): OutfitConfig {
    /*
     * Serializes the outfit class to JSON to be stored in a database or file
     */
    return {
      id: this.id,
      details: this.details,
      equipment: this.equipment,
      mount: this.mount,
      mounted: this.mounted,
      addonOne: this.addonOne,
      addonTwo: this.addonTwo,
    };
  }

  copy(): Outfit {
    /*
     * Returns a memory copy of the outfit
     */
    return new Outfit(this.toJSON());
  }

  isValid(): boolean {
    /*
     * The outfit colors must be between 0 and 132
     */
    if (this.details === null) {
      return true;
    }

    return (
      this.details.head >= 0 &&
      this.details.head < 133 &&
      this.details.body >= 0 &&
      this.details.body < 133 &&
      this.details.legs >= 0 &&
      this.details.legs < 133 &&
      this.details.feet >= 0 &&
      this.details.feet < 133
    );
  }
}

export default Outfit;
