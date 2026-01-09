import { FriendUpdatePacket } from "../../network/protocol";
import { CONST, getGameServer } from "../../helper/appContext";

export class Friendlist {
  private friends: Set<string>;
  private friendRequests: string[];

  constructor(friends: string[] = [], friendRequests: string[] = []) {
    this.friends = new Set(friends); 
    this.friendRequests = friendRequests;
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

  // Send friend request to another player OR accept pending request
  sendFriendRequest(player: any, targetName: string): void {
    const requesterName = player.getProperty(CONST.PROPERTIES.NAME);
    
    // Can't add yourself
    if (targetName.toLowerCase() === requesterName.toLowerCase()) {
      player.sendCancelMessage("You cannot add yourself as a friend.");
      return;
    }

    // Check if already friends
    if (this.friends.has(targetName)) {
      player.sendCancelMessage(`${targetName} is already your friend.`);
      return;
    }

    // Check if there's a pending request from this player
    if (this.friendRequests.includes(targetName)) {
      // Accept the pending request
      this.acceptFriendRequest(player, targetName);
      return;
    }

    const gameServer = getGameServer();
    
    // Check if target player exists in database
    gameServer.accountDatabase.getCharacterByName(targetName, (error: Error | null, character: any) => {
      if (error || !character) {
        player.sendCancelMessage(`${targetName} does not exist.`);
        return;
      }

      // Always send a friend request first (both online and offline players)
      gameServer.accountDatabase.addFriendRequest(targetName, requesterName, (err: Error | null) => {
        if (err) {
          if (err.message === 'Friend request already exists') {
            player.sendCancelMessage(`You have already sent a friend request to ${targetName}.`);
          } else {
            player.sendCancelMessage(`Error sending friend request to ${targetName}.`);
            console.error('Error adding friend request:', err);
          }
          return;
        }
        
        // Check if target player is online to notify them immediately
        const targetPlayer = gameServer.world.creatureHandler.getPlayerByName(targetName);
        if (targetPlayer) {
          // Add the request to their local friend requests list
          targetPlayer.friendlist.addFriendRequest(requesterName);
          
          // Send notification to target player
          targetPlayer.sendCancelMessage(`${requesterName} sent you a friend request.`);
          
          // Send friend list update to target player
          targetPlayer.friendlist.sendFriendUpdate(targetPlayer);
        }
        
        player.sendCancelMessage(`Friend request sent to ${targetName}.`);
      });
    });
  }

  // Remove a friend
  removeFriend(player: any, friendName: string): void {
    // Check if it's a pending friend request to decline
    if (this.friendRequests.includes(friendName)) {
      this.declineFriendRequest(player, friendName);
      return;
    }

    // Check if it's an actual friend to remove
    if (!this.friends.has(friendName)) {
      player.sendCancelMessage(`${friendName} is not your friend.`);
      return;
    }

    const playerName = player.getProperty(CONST.PROPERTIES.NAME);
    const gameServer = getGameServer();

    // Remove from friends list
    this.friends.delete(friendName);

    // Try to find the other player to update their friend list
    const friendPlayer = gameServer.world.creatureHandler.getPlayerByName(friendName);
    if (friendPlayer) {
      // Other player is online, remove from their friends list too
      friendPlayer.friendlist.friends.delete(playerName);
      
      // Send friend status updates to both players
      player.friendlist.sendFriendUpdate(player);
      friendPlayer.friendlist.sendFriendUpdate(friendPlayer);
      
      friendPlayer.sendCancelMessage(`${playerName} removed you from their friends list.`);
    } else {
      // Send update to player even if friend is offline
      player.friendlist.sendFriendUpdate(player);
    }

    // Remove from database for both players (even if one is offline)
    gameServer.accountDatabase.removeFriendFromBothPlayers(playerName, friendName, (err: Error | null) => {
      if (err) {
        console.error(`Failed to remove friend from database: ${playerName} <-> ${friendName}`, err);
      }
    });

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

  // Accept a friend request
  acceptFriendRequest(player: any, requesterName: string): void {
    const gameServer = getGameServer();
    
    // Remove the request from database
    gameServer.accountDatabase.removeFriendRequest(player.getProperty(CONST.PROPERTIES.NAME), requesterName, (err: Error | null) => {
      if (err) {
        player.sendCancelMessage(`Error accepting friend request from ${requesterName}.`);
        console.error('Error removing friend request:', err);
        return;
      }
      
      // Add both players as friends
      gameServer.accountDatabase.addFriendToBothPlayers(player.getProperty(CONST.PROPERTIES.NAME), requesterName, (err: Error | null) => {
        if (err) {
          player.sendCancelMessage(`Error adding ${requesterName} as friend.`);
          console.error('Error adding friend:', err);
          return;
        }
        
        // Update local friend lists
        this.friends.add(requesterName);
        this.removeFriendRequest(requesterName);
        
        // Check if requester is online and update their friend list
        const requesterPlayer = gameServer.world.creatureHandler.getPlayerByName(requesterName);
        if (requesterPlayer) {
          requesterPlayer.friendlist.friends.add(player.getProperty(CONST.PROPERTIES.NAME));
          
          // Send notifications to both players
          player.sendCancelMessage(`${requesterName} has been added to your friends list.`);
          requesterPlayer.sendCancelMessage(`${player.getProperty(CONST.PROPERTIES.NAME)} accepted your friend request.`);
          
          // Send friend list updates to both players
          player.friendlist.sendFriendUpdate(player);
          requesterPlayer.friendlist.sendFriendUpdate(requesterPlayer);
        } else {
          player.sendCancelMessage(`${requesterName} has been added to your friends list.`);
          player.friendlist.sendFriendUpdate(player);
        }
      });
    });
  }

  // Decline a friend request
  declineFriendRequest(player: any, requesterName: string): void {
    const gameServer = getGameServer();
    
    // Remove the request from database
    gameServer.accountDatabase.removeFriendRequest(player.getProperty(CONST.PROPERTIES.NAME), requesterName, (err: Error | null) => {
      if (err) {
        player.sendCancelMessage(`Error declining friend request from ${requesterName}.`);
        console.error('Error removing friend request:', err);
        return;
      }
      
      this.removeFriendRequest(requesterName);
      player.sendCancelMessage(`Friend request from ${requesterName} has been declined.`);
      
      // Send friend update to player
      this.sendFriendUpdate(player);
    });
  }

  // Get pending friend requests (synchronous version for PlayerStatePacket)
  getFriendRequests(): string[] {
    return this.friendRequests;
  }

  // Get pending friend requests (asynchronous version for database operations)
  getFriendRequestsAsync(player: any, callback: (requests: string[]) => void): void {
    const gameServer = getGameServer();
    
    gameServer.accountDatabase.getCharacterByName(player.getProperty(CONST.PROPERTIES.NAME), (error: Error | null, character: any) => {
      if (error || !character) {
        callback([]);
        return;
      }
      
      const friendsData = JSON.parse(character.friends || '{"friends": [], "requests": []}');
      callback(friendsData.requests || []);
    });
  }

  // Add a friend request to the local list
  addFriendRequest(requesterName: string): void {
    if (!this.friendRequests.includes(requesterName)) {
      this.friendRequests.push(requesterName);
    }
  }

  // Remove a friend request from the local list
  removeFriendRequest(requesterName: string): void {
    const index = this.friendRequests.indexOf(requesterName);
    if (index !== -1) {
      this.friendRequests.splice(index, 1);
    }
  }

  // Update friend requests from database data
  updateFriendRequests(friendRequests: string[]): void {
    this.friendRequests = friendRequests;
  }

  // Send friend update packet to player
  sendFriendUpdate(player: any): void {
    const friends = this.getFriendStatuses(player);
    const friendRequests = this.getFriendRequests();
    
    // Import FriendUpdatePacket dynamically to avoid circular imports

    player.write(new FriendUpdatePacket(friends, friendRequests));
  }

  toJSON(): { friends: string[], requests: string[] } {
    return {
      friends: Array.from(this.friends),
      requests: this.friendRequests
    };
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
