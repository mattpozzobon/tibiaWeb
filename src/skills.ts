import { IPlayer } from "interfaces/IPlayer";
import { Skill } from "./skill";
import { CONST } from "./helper/appContext";

export class Skills {
  private __player: IPlayer;

  constructor(player: IPlayer, points: Record<string, number>) {
    /*
     * Class Skills
     * Wrapper for the player skills
     */
    this.__player = player;

    this.__addSkillProperty(CONST.PROPERTIES.MAGIC, points.magic);
    this.__addSkillProperty(CONST.PROPERTIES.FIST, points.fist);
    this.__addSkillProperty(CONST.PROPERTIES.CLUB, points.club);
    this.__addSkillProperty(CONST.PROPERTIES.SWORD, points.sword);
    this.__addSkillProperty(CONST.PROPERTIES.AXE, points.axe);
    this.__addSkillProperty(CONST.PROPERTIES.DISTANCE, points.distance);
    this.__addSkillProperty(CONST.PROPERTIES.SHIELDING, points.shielding);
    this.__addSkillProperty(CONST.PROPERTIES.FISHING, points.fishing);
    this.__addSkillProperty(CONST.PROPERTIES.EXPERIENCE, points.experience);

    //this.setMaximumProperties();
  }

  private __setMaximumPropertiesConstants(vocation: number, level: number): {
    health: number;
    mana: number;
    capacity: number;
  } {
    /*
     * Function Skills.__setMaximumPropertiesConstants
     * Calculates maximum properties based on player level and vocation
     */
    switch (vocation) {
      case CONST.VOCATION.NONE:
        return {
          health: 5 * (level + 29),
          mana: 5 * (level + 10),
          capacity: 10 * (level + 39),
        };
      case CONST.VOCATION.KNIGHT:
      case CONST.VOCATION.ELITE_KNIGHT:
        return {
          health: 5 * (3 * level + 13),
          mana: 5 * (level + 10),
          capacity: 5 * (5 * level + 54),
        };
      case CONST.VOCATION.PALADIN:
      case CONST.VOCATION.ROYAL_PALADIN:
        return {
          health: 5 * (2 * level + 21),
          mana: 5 * (3 * level - 6),
          capacity: 10 * (2 * level + 31),
        };
      case CONST.VOCATION.SORCERER:
      case CONST.VOCATION.MASTER_SORCERER:
      case CONST.VOCATION.DRUID:
      case CONST.VOCATION.ELDER_DRUID:
        return {
          health: 5 * (level + 29),
          mana: 5 * (6 * level - 30),
          capacity: 10 * (level + 39),
        };
      default:
        throw new Error("Unknown vocation");
    }
  }

  setMaximumProperties(): void {
    /*
     * Function Skills.setMaximumProperties
     * Updates maximum properties based on level and vocation
     */
    const level = this.getSkillLevel(CONST.PROPERTIES.EXPERIENCE) || 0;
    const vocation = this.__player.getProperty(CONST.PROPERTIES.VOCATION);

    // const { health, mana, capacity } = this.__setMaximumPropertiesConstants(vocation,level);

    // this.__player.properties.add(CONST.PROPERTIES.HEALTH_MAX, health);
    // this.__player.properties.add(CONST.PROPERTIES.MANA_MAX, mana);
    //this.__player.properties.add(CONST.PROPERTIES.CAPACITY_MAX, capacity);
  }

  getSkillValue(type: number): number | null {
    /*
     * Function Skills.getSkillValue
     * Returns the current value of a skill
     */
    const skill = this.__getSkill(type);
    return skill ? skill.toJSON() : null;
  }

  getSkillLevel(type: number): number {
    /*
     * Function Skills.getSkillLevel
     * Returns the level of a particular skill
     */
    const skill = this.__getSkill(type);
    return skill.getSkillLevel(this.__player.getVocation());
  }

  setSkillLevel(type: number, level: number): void {
    /*
     * Function Skills.setSkillLevel
     * Sets the skill level to a specific value
     */
    const skill = this.__getSkill(type);
    if (!skill) return;

    const points = skill.getRequiredSkillPoints(level, this.__player.getVocation());
    this.__player.setProperty(type, points);
  }

  toJSON(): Record<string, any> {
    /*
     * Function Skills.toJSON
     * Serializes the skills
     */
    return {
      magic: this.__getSkill(CONST.PROPERTIES.MAGIC),
      fist: this.__getSkill(CONST.PROPERTIES.FIST),
      club: this.__getSkill(CONST.PROPERTIES.CLUB),
      sword: this.__getSkill(CONST.PROPERTIES.SWORD),
      axe: this.__getSkill(CONST.PROPERTIES.AXE),
      distance: this.__getSkill(CONST.PROPERTIES.DISTANCE),
      shielding: this.__getSkill(CONST.PROPERTIES.SHIELDING),
      fishing: this.__getSkill(CONST.PROPERTIES.FISHING),
      experience: this.__getSkill(CONST.PROPERTIES.EXPERIENCE),
    };
  }

  private __getSkill(type: number): Skill {
    /*
     * Function Skills.__getSkill
     * Retrieves a skill by type
     */
    const skill = this.__player.getProperty(type);
    return skill;
  }

  private __addSkillProperty(type: number, points: number): void {
    /*
     * Function Skills.__addSkillProperty
     * Adds a skill property to the player
     */
    this.__player.properties.add(type, new Skill(type, points));
  }
}
