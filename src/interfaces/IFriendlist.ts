export interface IFriendlist {
  remove(name: string, player?: any): void;
  add(name: string, player?: any): void;
  toJSON(): { friends: string[], requests: string[] };
  getFriendStatuses(player: any): any[];
  notifyFriendsOfLogin(player: any): void;
  notifyFriendsOfLogout(player: any): void;
  acceptFriendRequest(player: any, requesterName: string): void;
  declineFriendRequest(player: any, requesterName: string): void;
  getFriendRequests(): string[];
  getFriendRequestsAsync(player: any, callback: (requests: string[]) => void): void;
  addFriendRequest(requesterName: string): void;
  removeFriendRequest(requesterName: string): void;
  updateFriendRequests(friendRequests: string[]): void;
  sendFriendUpdate(player: any): void;
}
