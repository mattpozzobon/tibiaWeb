import { getDataFile } from "../../helper/appContext";

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

export interface AddonDetails {
  healthPotion: number;
  manaPotion: number;
  energyPotion: number;
  bag: number;
}

export interface OutfitConfig {
  id: number;
  renderHelmet?: boolean;
  details?: OutfitDetails;
  equipment?: EquipmentDetails;
  addons?: AddonDetails;
}

export class Outfit {
  id: number;
  renderHelmet: boolean;
  details: OutfitDetails;
  equipment: EquipmentDetails;
  addons: AddonDetails;

  static HAIRS: Record<number, { name: string }> = require(getDataFile("outfits", "hairs"));

  constructor(outfit: OutfitConfig) {
    this.id = outfit.id ?? 128;
    this.renderHelmet = outfit.renderHelmet ?? true;
    this.details = outfit.details ?? { head: 0, body: 0, legs: 0, feet: 0 };
    this.equipment = outfit.equipment ?? { hair: 904, head: 0, body: 0, legs: 0, feet: 0, lefthand: 0, righthand: 0, backpack: 0, belt: 0 };
    this.addons = outfit.addons ?? { healthPotion: 0, manaPotion: 0, energyPotion: 0, bag: 0 };
  }

  static getHairName(id: number): string | null {
    return Outfit.HAIRS[id]?.name ?? null;
  }

  toJSON(): OutfitConfig {
    return {
      id: this.id,
      renderHelmet: this.renderHelmet,
      details: this.details,
      equipment: this.equipment,
      addons: this.addons,
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
