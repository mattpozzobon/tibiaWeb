import { IDamageMap } from "interfaces/IDamage-map";
import DamageMapEntry from "./damage-map-entry";
import { EmotePacket } from "./protocol";
import { CONST } from "./helper/appContext";


class DamageMap implements IDamageMap{
  private __map: Map<any, DamageMapEntry>;
  private __monster: any;

  constructor(monster: any) {
    /*
     * Class DamageMap
     * Contains and records the damage caused to a creature
     */
    this.__map = new Map();
    this.__monster = monster;
  }

  public getDividedExperience(experience: number): number {
    /*
     * Function DamageMap.getDividedExperience
     * Equally divides the total experience over the number of characters in the map
     */
    return Math.floor(experience / this.__map.size);
  }

  public update(attacker: any, amount: number): void {
    /*
     * Function DamageMap.update
     * Adds incoming damage from an attacker to the damage map
     */
    if (!attacker) {
      return;
    }

    if (!this.__map.has(attacker)) {
      this.__map.set(attacker, new DamageMapEntry());
    }

    this.__map.get(attacker)?.addDamage(amount);
  }

  public distributeExperience(): void {
    /*
     * Function DamageMap.distributeExperience
     * Distributes the experience over all players in the damage map
     */
    const sharedExperience = this.getDividedExperience(this.__monster.experience);

    this.__map.forEach((map, attacker) => {
      if (!attacker.isPlayer() || !attacker.isOnline()) {
        return;
      }

      if (sharedExperience > 0) {
        attacker.incrementProperty(CONST.PROPERTIES.EXPERIENCE, sharedExperience);
        attacker.write(new EmotePacket(attacker, String(sharedExperience), CONST.COLOR.WHITE));
      }
    });
  }

  private __createLootText(thing: any): string {
    /*
     * Function DamageMap.__createLootText
     * Creates loot text entry
     */
    if (thing.isStackable()) {
      return `${thing.getCount()} ${thing.getName()}`;
    }

    return `${thing.getArticle()} ${thing.getName()}`;
  }
}

export default DamageMap;
