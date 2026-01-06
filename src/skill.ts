import { CONST } from "./helper/appContext";

export class Skill {
  private __points: number;
  private __type: number;

  static EXPERIENCE_TABLE: number[] = Array.from({ length: 1000 }, (_, i) =>
    Skill.getExperience(i + 1)
  );

  constructor(type: number, points: number) {
    /*
     * Class Skill
     * Wrapper for the character skills that can be trained
     */
    this.__type = type;
    this.__points = points;
  }

  private __getVocationConstant(vocation: number): number {
    /*
     * Function Skill.__getVocationConstant
     * Returns the vocation skill constant for each skill
     */
    switch (vocation) {
      case CONST.VOCATION.NONE:
        return this.__getSkillConstantByType({
          MAGIC: 3.0,
          CLUB: 2.0,
          SWORD: 2.0,
          AXE: 2.0,
          DISTANCE: 2.0,
          FIST: 1.5,
          SHIELDING: 1.5,
          FISHING: 1.1,
        });
      case CONST.VOCATION.KNIGHT:
        return this.__getSkillConstantByType({
          MAGIC: 3.0,
          CLUB: 1.1,
          SWORD: 1.1,
          AXE: 1.1,
          FIST: 1.1,
          SHIELDING: 1.1,
          FISHING: 1.1,
          DISTANCE: 1.4,
        });
      case CONST.VOCATION.PALADIN:
        return this.__getSkillConstantByType({
          MAGIC: 1.4,
          CLUB: 1.2,
          SWORD: 1.2,
          AXE: 1.2,
          FIST: 1.2,
          DISTANCE: 1.1,
          SHIELDING: 1.1,
          FISHING: 1.1,
        });
      case CONST.VOCATION.SORCERER:
      case CONST.VOCATION.DRUID:
        return this.__getSkillConstantByType({
          MAGIC: 1.1,
          CLUB: 2.0,
          SWORD: 2.0,
          AXE: 2.0,
          DISTANCE: 2.0,
          FIST: 1.5,
          SHIELDING: 1.5,
          FISHING: 1.1,
        });
      default:
        return NaN;
    }
  }

  private __getSkillConstantByType(constants: Record<string, number>): number {
    const propertyKey = CONST.PROPERTIES[this.__type as unknown as keyof typeof CONST.PROPERTIES];
    return constants[propertyKey] ?? NaN;
  }

  increment(value: number): void {
    /*
     * Function Skill.increment
     * Increments the skill with a number of spent points
     */
    this.__points += value;
  }

  get(): number {
    /*
     * Function Skill.get
     * Returns the current number of skill points
     */
    return this.__points;
  }

  set(points: number): void {
    /*
     * Function Skill.set
     * Sets the number of skill points
     */
    this.__points = points;
  }

  private __getSkillConstant(): number {
    /*
     * Function Skill.__getSkillConstant
     * Returns the constant for each skill
     */
    switch (this.__type) {
      case CONST.PROPERTIES.MAGIC:
        return 1600;
      case CONST.PROPERTIES.FIST:
      case CONST.PROPERTIES.CLUB:
      case CONST.PROPERTIES.SWORD:
      case CONST.PROPERTIES.AXE:
        return 50;
      case CONST.PROPERTIES.DISTANCE:
        return 25;
      case CONST.PROPERTIES.SHIELDING:
        return 100;
      case CONST.PROPERTIES.FISHING:
        return 20;
      default:
        return NaN;
    }
  }

  static getExperience(x: number): number {
    /*
     * Function Skill.getExperience
     * Returns the required experience for a particular level
     */
    return Math.round(
      (50 / 3) * (Math.pow(x, 3) - 6 * Math.pow(x, 2) + 17 * x - 12)
    );
  }

  getRequiredSkillPoints(x: number, vocation: number): number {
    /*
     * Function Skill.getRequiredSkillPoints
     * Returns the number of required skill points
     */
    if (this.__type === CONST.PROPERTIES.EXPERIENCE) {
      return Skill.getExperience(x);
    }

    const { skillOffset, A, B } = this.__getSkillConstants(vocation);

    return A * ((Math.pow(B, x - skillOffset) - 1) / (B - 1));
  }

  private __getSkillConstants(
    vocation: number
  ): { skillOffset: number; A: number; B: number } {
    /*
     * Function Skill.__getSkillConstants
     * Returns the skill constants
     */
    const skillOffset =
      this.__type === CONST.PROPERTIES.MAGIC ? 0 : 10;
    const A = this.__getSkillConstant();
    const B = this.__getVocationConstant(vocation);

    return { skillOffset, A, B };
  }

  getSkillLevel(vocation: number): number {
    /*
     * Function Skill.getSkillLevel
     * Returns the skill level based on current points
     */
    if (this.__type === CONST.PROPERTIES.EXPERIENCE) {
      return this.binarySearchSkillLevel(this.__points);
    }

    const { skillOffset, A, B } = this.__getSkillConstants(vocation);

    return Math.floor(
      skillOffset +
        Math.log(this.__points * ((B - 1) / A) + 1) / Math.log(B)
    );
  }

  private binarySearchSkillLevel(points: number): number {
    /*
     * Uses binary search to find the closest skill level based on experience points
     */
    const table = Skill.EXPERIENCE_TABLE;
    let low = 0,
      high = table.length - 1;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (table[mid] <= points) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    return high;
  }

  toJSON(): number {
    /*
     * Function Skill.toJSON
     * Serializes the skill to JSON
     */
    return this.__points;
  }
}
