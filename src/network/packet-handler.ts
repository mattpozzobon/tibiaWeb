import { getGameServer } from "../helper/appContext";
import Tile from "../thing/tile";
import { CreatureInformationPacket, ItemInformationPacket } from "./protocol";
import Monster from "../creature/monster/monster";
import { ClientMessage, MoveItemEvent, PositionAndIndex } from "./packet-reader";
import { ItemMoveHandler } from "../handler/item-move-handler";
import Player from "creature/player/player";

export class PacketHandler {
  constructor() {
  }

  handleTileUse(player: Player, tile: Tile): any {
    /*
     * Function PacketHandler.handleTileUse
     * Handles the tile use event
     */
    if (!player.position.besides(tile.position)) {
      return null;
    }
    return tile.getTopItem();
  }

  handleLogout(gameSocket: any): void {
    /*
     * Function PacketHandler.handleLogout
     * Handles a logout request from the player
     */
    if (gameSocket.player.isInCombat()) {
      return gameSocket.player.sendCancelMessage("You cannot logout while in combat.");
    }

    if (gameSocket.player.isInNoLogoutZone()) {
      return gameSocket.player.sendCancelMessage("You may not logout here.");
    }

    gameSocket.close();
  }

  private __handlePushCreature(creature: any, position: any): void {
    /*
     * Function PacketHandler.__handlePushCreature
     * Handles pushing of a monster to an adjacent tile
     */
    if (creature.isMoving()) return;
    if (!position.besides(creature.position)) return;

    getGameServer().world.eventQueue.addEvent(() => creature.push(position), 20);
  }

  moveItem(player: Player, packet: MoveItemEvent): void {
    /*
     * Function PacketHandler.moveItem
     * Delegates item movement to ItemMoveHandler
     */
    const { fromWhere, fromIndex, toWhere, toIndex, count } = packet;
    ItemMoveHandler.validateAndMoveItem(player, fromWhere, fromIndex, toWhere, toIndex, count);
  }

  handleItemLook(player: Player, packet: PositionAndIndex): void {
    /*
     * Function PacketHandler.handleItemLook
     * Handles a look event at an item or creature or tile
     */
    if (!packet.which) return;

    if (packet.which.constructor.name === "Tile" && packet.which.getCreature()) {
      return player.write(new CreatureInformationPacket(packet.which.getCreature()));
    }

    let thing = packet.which.peekIndex(packet.index);
    if (!thing) {
      thing = packet.which;
    }

    //const includeDetails = !thing.hasUniqueId() && (packet.which.constructor.name !== "Tile" || player.isBesidesThing(packet.which));

    return player.write(new ItemInformationPacket(thing, true, player));
  }

  handleContainerClose(player: Player, containerId: number): void {
    /*
     * Function PacketHandler.handleContainerClose
     * Handles an incoming request to close a container
     */
    const container = player.containerManager.getContainerFromId(containerId);
    if (container) {
      player.containerManager.closeContainer(container);
    }
  }

  handleTargetCreature(player: Player, id: number): void {
    /*
     * Function PacketHandler.handleTargetCreature
     * Handles an incoming creature target packet
     */
    if (id === 0) {
      return player.actionHandler.targetHandler.setTarget(null);
    }

    const creature = getGameServer().world.creatureHandler.getCreatureFromId(id);
    if (!creature) return;

    if (!(creature instanceof Monster)) {
      return player.sendCancelMessage("You may not attack this creature.");
    }

    if (player.canSee(creature.position)) {
      player.actionHandler.targetHandler.setTarget(creature);
    }
  }

  handlePlayerSay(player: Player, packet: ClientMessage): void {
    /*
     * Function PacketHandler.handlePlayerSay
     * When player says a message handle it
     */
    const channel = getGameServer().world.channelManager.getChannel(packet.id);
    if (channel) {
      channel.send(player, packet);
    }
  }

  handleItemTextWrite(player: Player, packet: { which: any; index: number; text: string }): void {
    /*
     * Function PacketHandler.handleItemTextWrite
     * Handles writing text to a writeable item (like blank paper, letter)
     */
    if (!packet.which) return;

    let item: any;
    if (packet.which.constructor.name === "Tile") {
      item = packet.which.peekIndex(packet.index);
    } else if (packet.which.constructor.name === "Equipment" || packet.which.constructor.name === "DepotContainer" || packet.which.isContainer()) {
      item = packet.which.peekIndex(packet.index);
    }

    if (!item) return;

    // Check if item is writeable
    if (!item.isWriteable()) {
      player.sendCancelMessage("You cannot write on this item.");
      return;
    }

    // Validate text length - check item's maxTextLen attribute, or use default
    const maxTextLen = item.getAttribute("maxTextLen");
    const maxLength = maxTextLen && maxTextLen > 0 ? maxTextLen : 2000;
    if (packet.text.length > maxLength) {
      player.sendCancelMessage(`The text is too long. Maximum length is ${maxLength} characters.`);
      return;
    }

    // Check if item should transform after writing (e.g., blank paper -> letter)
    const writeOnceItemId = item.getAttribute("writeOnceItemId");
    if (writeOnceItemId) {
      // Transform item (e.g., blank paper becomes letter when written on)
      const newItem = getGameServer().database.createThing(writeOnceItemId);
      if (newItem) {
        newItem.setContent(packet.text);
        // Replace the old item with the transformed one
        packet.which.removeIndex(packet.index, 1);
        packet.which.addThing(newItem, packet.index);
        return;
      }
    }

    // Set the content on the item (for items that don't transform)
    item.setContent(packet.text);
  }


}
