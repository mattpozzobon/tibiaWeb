class LootEntry {
  private id: number;
  private probability: number;
  private min: number;
  private max: number;

  constructor(loot: { id: number; probability: number; min: number; max: number }) {
    /*
     * Class LootEntry
     * Wrapper for a single loot entry
     */
    this.id = loot.id;
    this.probability = loot.probability;
    this.min = loot.min;
    this.max = loot.max;
  }

  public getId(): number {
    return this.id;
  }

  public roll(): boolean {
    /*
     * Function LootEntry.roll
     * Rolls whether a loot item should be added to the creature
     */
    return Math.random() <= this.probability;
  }

  public rollCount(): number {
    /*
     * Function LootEntry.rollCount
     * Roll for a random count for stackable items bounded by min/max
     */
    return Math.floor(Math.random() * (this.max - this.min + 1)) + this.min;
  }

  public hasCount(): boolean {
    /*
     * Function LootEntry.hasCount
     * Returns true if the count should be set on the item
     */
    return this.min >= 1 && this.max >= 2;
  }
}

export default LootEntry;
