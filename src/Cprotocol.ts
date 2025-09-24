
import { getEncodedLength } from "./utils/functions";
import { PacketWriter } from "./Cpacket-writer";
import { Position } from "./Cposition";
import { CONFIG, CONST, getGameServer } from "./helper/appContext";
import { IPlayer } from "interfaces/IPlayer";
import { IThing } from "interfaces/IThing";
import Creature from "Ccreature";

export class CreaturePropertyPacket extends PacketWriter {
  constructor(id: number, property: number, value: number) {
    super(CONST.PROTOCOL.SERVER.CREATURE_PROPERTY, 9);
    this.writeUInt32(id);
    this.writeUInt8(property);
    this.writeUInt32(value);
  }
}

export class StringCreaturePropertyPacket extends PacketWriter {
  constructor(id: number, property: number, string: string) {
    const stringEncoded = PacketWriter.encodeString(string);
    super(CONST.PROTOCOL.SERVER.CREATURE_PROPERTY, getEncodedLength(stringEncoded) + 5);
    
    this.writeUInt32(id);
    this.writeUInt8(property);
    this.writeBuffer(stringEncoded);
  }
}

export class OutfitPacket extends PacketWriter {
  constructor(guid: number, outfit: any) {
    super(CONST.PROTOCOL.SERVER.OUTFIT, 29);
    this.writeUInt32(guid);
    this.writeOutfit(outfit);
  }
}

export class EmotePacket extends PacketWriter {
  constructor(creature: any, message: string, color: number) {
    const stringEncoded = PacketWriter.encodeString(message);
    super(CONST.PROTOCOL.SERVER.EMOTE, 6 + getEncodedLength(stringEncoded));
    this.writeUInt32(creature.getId());
    this.writeUInt8(creature.type);
    this.writeBuffer(stringEncoded);
    this.writeUInt8(color);
  }
}

export class ChannelDefaultPacket extends PacketWriter {
  constructor(creature: any, message: string, color: number) {
    const stringEncoded = PacketWriter.encodeString(message);
    super(CONST.PROTOCOL.SERVER.CREATURE_SAY, 6 + getEncodedLength(stringEncoded));
    this.writeUInt32(creature.getId());
    this.writeUInt8(creature.type);
    this.writeBuffer(stringEncoded);
    this.writeUInt8(color);
  }
}

export class EffectMagicPacket extends PacketWriter {
  constructor(position: Position, type: number) {
    super(CONST.PROTOCOL.SERVER.MAGIC_EFFECT, 7);
    this.writePosition(position);
    this.writeUInt8(type);
  }
}

export class EffectDistancePacket extends PacketWriter {
  constructor(positionFrom: Position, positionTo: Position, type: number) {
    super(CONST.PROTOCOL.SERVER.DISTANCE_EFFECT, 13);
    this.writePosition(positionFrom);
    this.writePosition(positionTo);
    this.writeUInt8(type);
  }
}

export class PlayerLoginPacket extends PacketWriter {
  constructor(name: string) {
    const stringEncoded = PacketWriter.encodeString(name);
    super(CONST.PROTOCOL.SERVER.PLAYER_LOGIN, getEncodedLength(stringEncoded));
    this.writeBuffer(stringEncoded); // writeBuffer writes 2-byte length + bytes
  }
}

export class PlayerLogoutPacket extends PacketWriter {
  constructor(name: string) {
    const stringEncoded = PacketWriter.encodeString(name);
    super(CONST.PROTOCOL.SERVER.PLAYER_LOGOUT, getEncodedLength(stringEncoded));
    this.writeBuffer(stringEncoded);
  }
}

export class CreatureMovePacket extends PacketWriter {
  constructor(guid: number, position: Position, duration: number) {
    super(CONST.PROTOCOL.SERVER.CREATURE_MOVE, 12);
    this.writeUInt32(guid);
    this.writePosition(position);
    this.writeUInt16(duration);
  }
}

export class CreatureTeleportPacket extends PacketWriter {
  constructor(guid: number, position: Position) {
    super(CONST.PROTOCOL.SERVER.CREATURE_TELEPORT, 10);
    this.writeUInt32(guid);
    this.writePosition(position);
  }
}

export class ServerMessagePacket extends PacketWriter {
  constructor(message: string) {
    const stringEncoded = PacketWriter.encodeString(message);
    super(CONST.PROTOCOL.SERVER.MESSAGE_SERVER, getEncodedLength(stringEncoded));
    this.writeBuffer(stringEncoded);
  }
}

export class ItemAddPacket extends PacketWriter {
  constructor(position: Position, thing: any, index: number) {
    super(CONST.PROTOCOL.SERVER.ITEM_ADD, 10);
    this.writeClientId(thing.id);
    this.writeUInt8(thing.count);
    this.writePosition(position);
    this.writeUInt8(index);
  }
}

export class ItemRemovePacket extends PacketWriter {
  constructor(position: Position, index: number, count: number) {
    super(CONST.PROTOCOL.SERVER.ITEM_REMOVE, 8);
    this.writePosition(position);
    this.writeUInt8(index);
    this.writeUInt8(count);
  }
}

export class ContainerAddPacket extends PacketWriter {
  constructor(guid: number, index: number, item: any) {
    super(CONST.PROTOCOL.SERVER.CONTAINER_ADD, 8);
    this.writeUInt32(guid);
    this.writeUInt8(index);
    this.writeItem(item);
  }
}

export class ContainerRemovePacket extends PacketWriter {
  constructor(guid: number, index: number, count: number) {
    super(CONST.PROTOCOL.SERVER.CONTAINER_REMOVE, 6);
    this.writeUInt32(guid);
    this.writeUInt8(index);
    this.writeUInt8(count);
  }
}

export class ChunkPacket extends PacketWriter {
  constructor(chunk: any) {
    super(CONST.PROTOCOL.SERVER.CHUNK, PacketWriter.MAX_PACKET_SIZE);
    this.writeUInt32(chunk.id);
    this.writePosition(chunk.position);

    chunk.layers.forEach((layer: any) => {
      if (layer === null) {
        this.writeUInt8(0);
        return;
      }

      this.writeUInt8(layer.length);
      layer.forEach(this.writeTile.bind(this));
    });
  }
}

export class CreatureStatePacket extends PacketWriter {
  constructor(creature: Creature) {

    const stringEncoded = PacketWriter.encodeString(creature.getProperty(CONST.PROPERTIES.NAME));
    super(CONST.PROTOCOL.SERVER.CREATURE_STATE, 48 + 2 + stringEncoded.length);

    this.writeUInt32(creature.getId());
    this.writeCreatureType(creature);
    this.writePosition(creature.getPosition());
    this.writeUInt8(creature.getProperty(CONST.PROPERTIES.DIRECTION));
    this.writeOutfit(creature.getOutfit());
    this.writeUInt32(creature.getProperty(CONST.PROPERTIES.HEALTH));
    this.writeUInt32(creature.getProperty(CONST.PROPERTIES.HEALTH_MAX));
    this.writeUInt16(creature.getProperty(CONST.PROPERTIES.SPEED));
    this.writeBuffer(stringEncoded); 
    this.writeUInt8(0);                   
  }
}

export class CancelMessagePacket extends PacketWriter {
  constructor(message: string) {
    const stringEncoded = PacketWriter.encodeString(message);
    super(CONST.PROTOCOL.SERVER.MESSAGE_CANCEL, getEncodedLength(stringEncoded));
    this.writeBuffer(stringEncoded);
  }
}

export class ToggleConditionPacket extends PacketWriter {
  constructor(toggle: boolean, cid: number, id: number) {
    super(CONST.PROTOCOL.SERVER.TOGGLE_CONDITION, 7);
    this.writeUInt32(cid);
    this.writeBoolean(toggle);
    this.writeUInt16(id);
  }
}

export class ServerStatePacket extends PacketWriter {
  constructor() {
    const stringEncoded = PacketWriter.encodeString(CONFIG.SERVER.VERSION);
    super(CONST.PROTOCOL.SERVER.STATE_SERVER, getEncodedLength(stringEncoded) + 13);

    const server = getGameServer();

    this.writeUInt16(server.world.lattice.width);
    this.writeUInt16(server.world.lattice.height);
    this.writeUInt8(server.world.lattice.depth);

    this.writeUInt8(CONFIG.WORLD.CHUNK.WIDTH);
    this.writeUInt8(CONFIG.WORLD.CHUNK.HEIGHT);
    this.writeUInt8(CONFIG.WORLD.CHUNK.DEPTH);

    this.writeUInt8(CONFIG.SERVER.MS_TICK_INTERVAL);
    this.writeUInt16(CONFIG.WORLD.CLOCK.SPEED);
    this.writeBuffer(stringEncoded);
    this.writeUInt16(Number(CONFIG.SERVER.CLIENT_VERSION));
  }
}

export class WorldTimePacket extends PacketWriter {
  constructor(timeOffset: number) {
    super(CONST.PROTOCOL.SERVER.WORLD_TIME, 4);
    this.writeUInt32(timeOffset);
  }
}

export class CreatureForgetPacket extends PacketWriter {
  constructor(cid: number) {
    super(CONST.PROTOCOL.SERVER.CREATURE_REMOVE, 4);
    this.writeUInt32(cid);
  }
}

export class ContainerOpenPacket extends PacketWriter {
  constructor(cid: number, name: string, container: any) {
    const stringEncoded = PacketWriter.encodeString(name);
    super(CONST.PROTOCOL.SERVER.CONTAINER_OPEN, getEncodedLength(stringEncoded) + 7 + container.getPacketSize());

    this.writeUInt32(container.guid);
    this.writeClientId(cid);
    this.writeBuffer(stringEncoded);
    this.writeUInt8(container.size);
    container.getSlots().forEach(this.writeItem.bind(this));
  }
}

export class ContainerClosePacket extends PacketWriter {
  constructor(cid: number) {
    super(CONST.PROTOCOL.SERVER.CONTAINER_CLOSE, 4);
    this.writeUInt32(cid);
  }
}

export class ChannelJoinPacket extends PacketWriter {
  constructor(channel: any) {
    const stringEncoded = PacketWriter.encodeString(channel.name);
    super(CONST.PROTOCOL.SERVER.CHANNEL_JOIN, 4 + getEncodedLength(stringEncoded));
    this.writeUInt32(channel.id);
    this.writeBuffer(stringEncoded);
  }
}

export class ChannelWritePacket extends PacketWriter {
  constructor(cid: number, name: string, message: string, color: number) {
    const encodedName = PacketWriter.encodeString(name);
    const encodedMessage = PacketWriter.encodeString(message);

    super(
      CONST.PROTOCOL.SERVER.CREATURE_MESSAGE,
      4 + getEncodedLength(encodedName) + getEncodedLength(encodedMessage) + 1
    );

    this.writeUInt32(cid);
    this.writeBuffer(encodedName);
    this.writeBuffer(encodedMessage);
    this.writeUInt8(color);
  }
}

export class TilePacket extends PacketWriter {
  constructor(position: any, id: number) {
    super(CONST.PROTOCOL.SERVER.ITEM_TRANSFORM, 10);
    this.writePosition(position);
    this.writeClientId(id);
  }
}

export class ServerErrorPacket extends PacketWriter {
  constructor(message: string) {
    const stringEncoded = PacketWriter.encodeString(message);

    super(CONST.PROTOCOL.SERVER.SERVER_ERROR, getEncodedLength(stringEncoded));
    this.writeBuffer(stringEncoded);
  }
}

export class LatencyPacket extends PacketWriter {
  constructor() {
    super(CONST.PROTOCOL.SERVER.LATENCY, 0);
  }
}

export class TargetPacket extends PacketWriter {
  constructor(cid: number) {
    super(CONST.PROTOCOL.SERVER.TARGET, 4);
    this.writeUInt32(cid);
  }
}

export class SpellAddPacket extends PacketWriter {
  constructor(sid: number) {
    super(CONST.PROTOCOL.SERVER.SPELL_ADD, 2);
    this.writeUInt16(sid);
  }
}

export class SpellCastPacket extends PacketWriter {
  constructor(sid: number, duration: number) {
    super(CONST.PROTOCOL.SERVER.SPELL_CAST, 5);
    this.writeUInt16(sid);
    this.writeUInt32(duration);
  }
}

export class CreatureInformationPacket extends PacketWriter {
  constructor(creature: any) {
    const stringEncoded = PacketWriter.encodeString(creature.getProperty(CONST.PROPERTIES.NAME));
    super(CONST.PROTOCOL.SERVER.CREATURE_INFORMATION, getEncodedLength(stringEncoded) + 3);

    this.writeBuffer(stringEncoded);

    if (creature.isPlayer()) {
      this.writeUInt16(creature.skills.getSkillLevel(CONST.PROPERTIES.EXPERIENCE));
      this.writeUInt8(creature.getProperty(CONST.PROPERTIES.SEX));
    } else {
      this.writeUInt16(0);
      this.writeUInt8(0);
    }
  }
}

export class ItemInformationPacket extends PacketWriter {
  constructor(thing: IThing, includeDetails: boolean, player: IPlayer) {
    const distance = PacketWriter.encodeString(thing.hasContent() ? thing.getContent() : null);
    const article = PacketWriter.encodeString(thing.getArticle());
    const name = PacketWriter.encodeString(thing.getName());
    const description = PacketWriter.encodeString(includeDetails ? thing.getDescription() : null);

    const length = getEncodedLength(distance) + getEncodedLength(article) + getEncodedLength(name) + getEncodedLength(description);

    super(CONST.PROTOCOL.SERVER.ITEM_INFORMATION, length + 15);
    
    this.writeUInt16(thing.id);
    this.writeClientId(thing.id);
    this.writeUInt32(includeDetails && thing.isPickupable() ? thing.getWeight() : 0);
    this.writeUInt8(includeDetails && thing.getAttribute("attack") ? thing.getAttribute("attack") : 0);
    this.writeUInt8(includeDetails && thing.getAttribute("armor") ? thing.getAttribute("armor") : 0);
    this.writeBuffer(distance);
    this.writeBuffer(article);
    this.writeBuffer(name);
    this.writeBuffer(description);
    this.writeUInt8(thing.count);

    if(player.isGod() && thing.getPosition())
      this.writePosition(thing.getPosition());
  }
}

export class ReadTextPacket extends PacketWriter {
  constructor(item: any) {
    const content = PacketWriter.encodeString(item.getContent());
    const name = PacketWriter.encodeString(item.getName());

    super(CONST.PROTOCOL.SERVER.ITEM_TEXT, getEncodedLength(content) + getEncodedLength(name) + 1);

    this.writeBoolean(false);
    this.writeBuffer(content);
    this.writeBuffer(name);
  }
}

export class CombatLockPacket extends PacketWriter {
  constructor(lock: boolean) {
    super(CONST.PROTOCOL.SERVER.COMBAT_LOCK, 1);
    this.writeBoolean(lock);
  }
}

export class ChannelPrivatePacket extends PacketWriter {
  constructor(name: string, message: string) {
    const encodedName = PacketWriter.encodeString(name);     // includes 2-byte length when written
    const encodedMessage = PacketWriter.encodeString(message);

    //  name(2+N) + message(2+M)
    super(
      CONST.PROTOCOL.SERVER.MESSAGE_PRIVATE,
      getEncodedLength(encodedName) + getEncodedLength(encodedMessage)
    );

    this.writeBuffer(encodedName);
    this.writeBuffer(encodedMessage);
  }
}

export class NPCTradePacket extends PacketWriter {
  constructor(cid: number, offers: any[]) {
    super(CONST.PROTOCOL.SERVER.TRADE_OFFER, PacketWriter.MAX_PACKET_SIZE);

    this.writeUInt32(cid);
    this.writeUInt8(offers.length);

    offers.forEach((offer) => {
      const stringEncoded = PacketWriter.encodeString(offer.name);

      this.writeClientId(offer.id);
      this.writeBuffer(stringEncoded);
      this.writeUInt32(offer.price);
      this.writeBoolean(offer.sell);
    });
  }
}

export class PlayerStatePacket extends PacketWriter {
  constructor(player: IPlayer) {
    const stringEncoded = PacketWriter.encodeString(player.getProperty(CONST.PROPERTIES.NAME));
    super(CONST.PROTOCOL.SERVER.STATE_PLAYER, PacketWriter.MAX_PACKET_SIZE);

    // === MATCH CLIENT ORDER ===

    // 1. id
    this.writeUInt32(player.getId());
    // 2. skills (custom function, already matches)
    this.writeUInt32(player.skills.getSkillValue(CONST.PROPERTIES.MAGIC) || 0);
    this.writeUInt32(player.skills.getSkillValue(CONST.PROPERTIES.FIST) || 0);
    this.writeUInt32(player.skills.getSkillValue(CONST.PROPERTIES.CLUB) || 0);
    this.writeUInt32(player.skills.getSkillValue(CONST.PROPERTIES.SWORD) || 0);
    this.writeUInt32(player.skills.getSkillValue(CONST.PROPERTIES.AXE) || 0);
    this.writeUInt32(player.skills.getSkillValue(CONST.PROPERTIES.DISTANCE) || 0);
    this.writeUInt32(player.skills.getSkillValue(CONST.PROPERTIES.SHIELDING) || 0);
    this.writeUInt32(player.skills.getSkillValue(CONST.PROPERTIES.FISHING) || 0);
    this.writeUInt32(player.skills.getSkillValue(CONST.PROPERTIES.EXPERIENCE) || 0);

    // 3. attack
    this.writeUInt8(player.getProperty(CONST.PROPERTIES.ATTACK));

    // 4. equipment
    this.writeEquipment(player.containerManager.equipment);

    // 5. mounts
    this.writeMounts(player.getProperty(CONST.PROPERTIES.MOUNTS));

    // 6. outfits
    this.writeOutfits(player.getProperty(CONST.PROPERTIES.OUTFITS));

    // 7. spellbook (placeholder)
    this.writeUInt8(0); // TODO: send real spells

    // 8. friendlist
    const friends = player.friendlist.getFriendStatuses(player) || [];
    this.writeFriends(friends);
    
    // 8.5. friend requests
    const friendRequests = player.friendlist.getFriendRequests();
    this.writeFriendRequests(friendRequests);

    // 9. outfit
    this.writeOutfit(player.getProperty(CONST.PROPERTIES.OUTFIT));

    // 10. vitals
    this.writeBuffer(stringEncoded); // name
    this.writePosition(player.getPosition());
    this.writeUInt8(player.getProperty(CONST.PROPERTIES.DIRECTION));
    this.writeUInt16(player.getProperty(CONST.PROPERTIES.HEALTH)); 
    this.writeUInt16(player.getProperty(CONST.PROPERTIES.HEALTH_MAX)); 
    this.writeUInt16(player.getProperty(CONST.PROPERTIES.MANA));
    this.writeUInt16(player.getProperty(CONST.PROPERTIES.MANA_MAX));
    this.writeUInt16(player.getProperty(CONST.PROPERTIES.ENERGY));
    this.writeUInt16(player.getProperty(CONST.PROPERTIES.ENERGY_MAX));
    this.writeUInt32(player.getProperty(CONST.PROPERTIES.CAPACITY));
    this.writeUInt32(player.getProperty(CONST.PROPERTIES.CAPACITY_MAX));
    this.writeUInt16(player.getProperty(CONST.PROPERTIES.SPEED));
    this.writeUInt8(player.getProperty(CONST.PROPERTIES.ATTACK_SPEED)); // aka attackSlowness

    // 11. conditions
    this.writeUInt8(0); // Placeholder
  }
}

export class FriendUpdatePacket extends PacketWriter {
  constructor(friends: any[], friendRequests: string[]) {
    super(CONST.PROTOCOL.SERVER.FRIEND_UPDATE, PacketWriter.MAX_PACKET_SIZE);
    
    // Write friends list
    this.writeFriends(friends);
    
    // Write friend requests list
    this.writeFriendRequests(friendRequests);
  }
}

export const Packets = {
  CreaturePropertyPacket,
  StringCreaturePropertyPacket,
  OutfitPacket,
  EmotePacket,
  ChannelDefaultPacket,
  EffectMagicPacket,
  EffectDistancePacket,
  PlayerLoginPacket,
  PlayerLogoutPacket,
  CreatureMovePacket,
  CreatureTeleportPacket,
  ServerMessagePacket,
  ItemAddPacket,
  ItemRemovePacket,
  ContainerAddPacket,
  ContainerRemovePacket,
  ChunkPacket,
  CreatureStatePacket,
  CancelMessagePacket,
  ToggleConditionPacket,
  ServerStatePacket,
  WorldTimePacket,
  CreatureForgetPacket,
  ContainerOpenPacket,
  ContainerClosePacket,
  ChannelJoinPacket,
  ChannelWritePacket,
  TilePacket,
  ServerErrorPacket,
  LatencyPacket,
  TargetPacket,
  SpellAddPacket,
  SpellCastPacket,
  CreatureInformationPacket,
  ItemInformationPacket,
  ReadTextPacket,
  CombatLockPacket,
  ChannelPrivatePacket,
  NPCTradePacket,
  PlayerStatePacket,
  FriendUpdatePacket,
};