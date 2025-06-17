export interface ISkills {
  setMaximumProperties(): void;
  getSkillValue(type: number): number | null;
  getSkillLevel(type: number): number;
  setSkillLevel(type: number, level: number): void;
  toJSON(): Record<string, any>;
}
