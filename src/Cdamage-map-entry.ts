class DamageMapEntry {
  public damage: number;
  public aggro: number;

  constructor() {
    this.damage = 0;
    this.aggro = 0;
  }

  public addDamage(amount: number): void {
    this.damage += amount;
  }
}

export default DamageMapEntry;
