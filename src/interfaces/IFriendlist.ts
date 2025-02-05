export interface IFriendlist {
  remove(name: string): void;
  add(name: string): void;
  toJSON(): string[];
}
