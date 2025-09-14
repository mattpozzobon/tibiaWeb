export class Friendlist {
  private friends: Set<string>;

  constructor(friends: string[]) {
    this.friends = new Set(friends); 
    this.add("Matheus, Teteu")
  }

  remove(name: string): void {
    if (!this.friends.has(name)) {
      return;
    }
    this.friends.delete(name);
  }

  add(name: string): void {
    if (this.friends.has(name)) {
      return;
    }
    this.friends.add(name);
  }

  toJSON(): string[] {
    return Array.from(this.friends);
  }
}
