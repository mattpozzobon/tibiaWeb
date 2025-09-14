export interface IFriendlist {
  remove(name: string, player?: any): void;
  add(name: string, player?: any): void;
  toJSON(): string[];
  getFriendStatuses(player: any): any[];
  notifyFriendsOfLogin(player: any): void;
  notifyFriendsOfLogout(player: any): void;
}
