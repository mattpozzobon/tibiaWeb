import { CONST, getGameServer } from "./helper/appContext";

export class Friendlist {
  private friends: Set<string>;

  constructor(friends: string[] = []) {
    this.friends = new Set(friends);
  }

  // Legacy add method - now sends friend request
  add(name: string, player?: any): void {
    if (player) {
      this.sendFriendRequest(player, name);
    } else {
      // Direct add for backward compatibility
      if (!this.friends.has(name)) {
        this.friends.add(name);
      }
    }
  }

  // Legacy remove method - now removes friend
  remove(name: string, player?: any): void {
    if (player) {
      this.removeFriend(player, name);
    } else {
      // Direct remove for backward compatibility
      if (this.friends.has(name)) {
        this.friends.delete(name);
      }
    }
  }

  // Send friend request to another player
  sendFriendRequest(player: any, targetName: string): void {
    // Can't add yourself
    if (targetName.toLowerCase() === player.getProperty(CONST.PROPERTIES.NAME).toLowerCase()) {
      player.sendCancelMessage("You cannot add yourself as a friend.");
      return;
    }

    // Check if already friends
    if (this.friends.has(targetName)) {
      player.sendCancelMessage(`${targetName} is already your friend.`);
      return;
    }

    // Try to find the target player
    const targetPlayer = getGameServer().world.creatureHandler.getPlayerByName(targetName);
    if (targetPlayer) {
      // Player is online, add them directly (auto-accept)
      this.friends.add(targetName);
      targetPlayer.friendlist.friends.add(player.getProperty(CONST.PROPERTIES.NAME));
      
      // Send friend status updates to both players
      player.sendCancelMessage(`${targetName} has been added to your friends list.`);
      targetPlayer.sendCancelMessage(`${player.getProperty(CONST.PROPERTIES.NAME)} has added you as a friend.`);
      
      // Send friend list updates to both players
      player.write(new FriendListPacket(player.friendlist.getFriendStatuses(player)));
      targetPlayer.write(new FriendListPacket(targetPlayer.friendlist.getFriendStatuses(targetPlayer)));
    } else {
      // Player is offline, just add them
      this.friends.add(targetName);
      player.sendCancelMessage(`${targetName} has been added to your friends list.`);
      player.write(new FriendListPacket(player.friendlist.getFriendStatuses(player)));
    }
  }

  // Remove a friend
  removeFriend(player: any, friendName: string): void {
    if (!this.friends.has(friendName)) {
      player.sendCancelMessage(`${friendName} is not your friend.`);
      return;
    }

    // Remove from friends list
    this.friends.delete(friendName);

    // Try to find the other player to update their friend list
    const friendPlayer = getGameServer().world.creatureHandler.getPlayerByName(friendName);
    if (friendPlayer) {
      // Other player is online, remove from their friends list too
      friendPlayer.friendlist.friends.delete(player.getProperty(CONST.PROPERTIES.NAME));
      
      // Send friend status updates to both players
      player.write(new FriendListPacket(player.friendlist.getFriendStatuses(player)));
      friendPlayer.write(new FriendListPacket(friendPlayer.friendlist.getFriendStatuses(friendPlayer)));
      
      friendPlayer.sendCancelMessage(`${player.getProperty(CONST.PROPERTIES.NAME)} removed you from their friends list.`);
    }

    player.sendCancelMessage(`${friendName} has been removed from your friends list.`);
  }

  // Get friend statuses (online/offline)
  getFriendStatuses(player: any): any[] {
    const statuses: any[] = [];
    
    for (const friendName of Array.from(this.friends)) {
      const friendPlayer = getGameServer().world.creatureHandler.getPlayerByName(friendName);
      statuses.push({
        name: friendName,
        online: friendPlayer ? true : false
      });
    }
    
    return statuses;
  }

  // Notify friends when a player logs in
  notifyFriendsOfLogin(player: any): void {
    const friends = Array.from(this.friends);
    for (const friendName of friends) {
      const friendPlayer = getGameServer().world.creatureHandler.getPlayerByName(friendName);
      if (friendPlayer) {
        // Send friend status update to the friend
        friendPlayer.write(new FriendStatusPacket(player.getProperty(CONST.PROPERTIES.NAME), true));
      }
    }
  }

  // Notify friends when a player logs out
  notifyFriendsOfLogout(player: any): void {
    const friends = Array.from(this.friends);
    for (const friendName of friends) {
      const friendPlayer = getGameServer().world.creatureHandler.getPlayerByName(friendName);
      if (friendPlayer) {
        // Send friend status update to the friend
        friendPlayer.write(new FriendStatusPacket(player.getProperty(CONST.PROPERTIES.NAME), false));
      }
    }
  }

  toJSON(): string[] {
    return Array.from(this.friends);
  }
}

// Simple friend list packet
export class FriendListPacket {
  private buffer: Buffer;

  constructor(friends: any[]) {
    const nameBuffer = Buffer.alloc(0);
    let totalLength = 2; // opcode + count

    for (const friend of friends) {
      const friendNameBuffer = Buffer.from(friend.name, 'utf8');
      totalLength += 1 + friendNameBuffer.length + 1; // name length + name + online status
    }

    this.buffer = Buffer.alloc(totalLength);
    let offset = 0;
    
    this.buffer.writeUInt8(52, offset++); // FRIEND_LIST opcode
    this.buffer.writeUInt8(friends.length, offset++);

    for (const friend of friends) {
      const friendNameBuffer = Buffer.from(friend.name, 'utf8');
      this.buffer.writeUInt8(friendNameBuffer.length, offset++);
      friendNameBuffer.copy(this.buffer, offset);
      offset += friendNameBuffer.length;
      this.buffer.writeUInt8(friend.online ? 1 : 0, offset++);
    }
  }

  getBuffer(): Buffer {
    return this.buffer;
  }
}

// Simple friend status packet
export class FriendStatusPacket {
  private buffer: Buffer;

  constructor(friendName: string, isOnline: boolean) {
    const nameBuffer = Buffer.from(friendName, 'utf8');
    this.buffer = Buffer.alloc(3 + nameBuffer.length);
    let offset = 0;
    
    this.buffer.writeUInt8(53, offset++); // FRIEND_STATUS opcode
    this.buffer.writeUInt8(nameBuffer.length, offset++);
    nameBuffer.copy(this.buffer, offset);
    offset += nameBuffer.length;
    this.buffer.writeUInt8(isOnline ? 1 : 0, offset);
  }

  getBuffer(): Buffer {
    return this.buffer;
  }
}
