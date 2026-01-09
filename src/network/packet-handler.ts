import { getGameServer } from "../helper/appContext";
import Tile from "../thing/tile";
import { CreatureInformationPacket, ItemInformationPacket } from "./protocol";
import Monster from "../creature/monster/monster";
import { ClientMessage, MoveItemEvent, PositionAndIndex } from "./packet-reader";
import { ItemMoveHandler } from "../handler/item-move-handler";
import { IPlayer } from "interfaces/IPlayer";

export class PacketHandler {
  constructor() {
  }

  handleTileUse(player: IPlayer, tile: Tile): any {
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

  moveItem(player: IPlayer, packet: MoveItemEvent): void {
    /*
     * Function PacketHandler.moveItem
     * Delegates item movement to ItemMoveHandler
     */
    const { fromWhere, fromIndex, toWhere, toIndex, count } = packet;
    ItemMoveHandler.validateAndMoveItem(player, fromWhere, fromIndex, toWhere, toIndex, count);
  }

  handleItemLook(player: IPlayer, packet: PositionAndIndex): void {
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

  handleContainerClose(player: IPlayer, containerId: number): void {
    /*
     * Function PacketHandler.handleContainerClose
     * Handles an incoming request to close a container
     */
    const container = player.containerManager.getContainerFromId(containerId);
    if (container) {
      player.containerManager.closeContainer(container);
    }
  }

  handleTargetCreature(player: IPlayer, id: number): void {
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

  handlePlayerSay(player: IPlayer, packet: ClientMessage): void {
    /*
     * Function PacketHandler.handlePlayerSay
     * When player says a message handle it
     */
    const channel = getGameServer().world.channelManager.getChannel(packet.id);
    if (channel) {
      channel.send(player, packet);
    }
  }


}
