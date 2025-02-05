export interface IDataValidator {
  validateMonster(name: string, monster: object): void;
  validateNPC(filename: string, npc: object): void;
}