export class Friendlist {
  private friends: Set<string>;

  constructor(friends: string[]) {
    /*
     * Class Friendlist
     * Wrapper for a character's friendlist
     */
    this.friends = new Set(friends); // Initialize the friendlist with provided names
  }

  remove(name: string): void {
    /*
     * Function Friendlist.remove
     * Removes a character from the friendlist
     */
    if (!this.friends.has(name)) {
      return;
    }
    this.friends.delete(name);
  }

  add(name: string): void {
    /*
     * Function Friendlist.add
     * Adds a character to the existing friendlist
     */
    if (this.friends.has(name)) {
      return;
    }
    this.friends.add(name);
  }

  toJSON(): string[] {
    /*
     * Function Friendlist.toJSON
     * Serializes the friendlist to be saved to JSON
     */
    return Array.from(this.friends);
  }
}
