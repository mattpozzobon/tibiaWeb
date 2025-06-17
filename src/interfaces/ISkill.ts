export interface ISkill {
  increment(value: number): void;
  get(): number;
  set(points: number): void;
  getRequiredSkillPoints(x: number, vocation: number): number;
  getSkillLevel(vocation: number): number;
  toJSON(): number;
}

export interface ISkillStatic {
  EXPERIENCE_TABLE: number[];
  getExperience(x: number): number;
}
