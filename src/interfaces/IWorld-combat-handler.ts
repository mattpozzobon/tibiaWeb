export interface ICombatHandler {
  handleCombat(source: any): void;
  handleDistanceCombat(source: any, target: any): void;
  applyEnvironmentalDamage(target: any, amount: number, color: number): void;
}
