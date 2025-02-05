export interface ISpellbook {
  readonly GLOBAL_COOLDOWN: number;
  readonly GLOBAL_COOLDOWN_DURATION: number;

  getAvailableSpells(): Set<number>;
  toJSON(): { availableSpells: number[]; cooldowns: { sid: number; cooldown: number }[] };
  addAvailableSpell(sid: number): void;
  handleSpell(sid: number): void;
  applyCooldowns(): void;
  writeSpells(gameSocket: any): void;
}
