import { getGameServer } from "../helper/appContext";
import Tile from "../thing/tile";
import { CreatureInformationPacket, ItemInformationPacket } from "./protocol";
import Monster from "../creature/monster/monster";
import { ClientMessage, MoveItemEvent, PositionAndIndex } from "./packet-reader";
import { MailboxHandler } from "../handler/mailbox-handler";
import { IPlayer } from "interfaces/IPlayer";
import { IContainer } from "interfaces/IThing";
import { IItem } from "interfaces/IThing";
import ITile from "interfaces/ITile";
import Equipment from "../item/equipment";

export class PacketHandler {
  private mailboxHandler: MailboxHandler;

  constructor() {
    /*
     * Class PacketHandler
     * Handles incoming packets
     */
    this.mailboxHandler = new MailboxHandler();
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

  //Todo: Inspect this toWhere2
  moveItem(player: IPlayer, packet: MoveItemEvent): void {
    /*
     * Function PacketHandler.moveItem
     * Internal private function that moves one object from one place to another
     */
    const { fromWhere, fromIndex, toWhere, toIndex, count } = packet;

    console.log('=== MOVE ITEM DEBUG ===');
    console.log('fromWhere.constructor.name', fromWhere.constructor.name);
    console.log('toWhere.constructor.name', toWhere.constructor.name);
    console.log('fromIndex',fromIndex);
    console.log('toIndex',toIndex);
    console.log('count',count);

    if (!fromWhere || !toWhere) return;


    if (fromWhere instanceof Tile && !player.position.besides(fromWhere.position)) {
      return player.sendCancelMessage("You are not close enough.");
    }

    if (toWhere instanceof Tile && !player.position.inLineOfSight(toWhere.position)) {
      return player.sendCancelMessage("You cannot throw this item here.");
    }

    const fromItem: IItem | null = fromWhere.peekIndex(fromIndex);

    if (!fromItem) return;

    if (!fromItem.isMoveable() || fromItem.hasUniqueId()) {
      return player.sendCancelMessage("You cannot move this item.");
    }

    if (toWhere instanceof Tile) {
      if (toWhere.hasItems() && toWhere.itemStack!.isMailbox() && this.mailboxHandler.canMailItem(fromItem)) {
        return this.mailboxHandler.sendThing(fromWhere, toWhere, player, fromItem);
      }
      const toWhere2 = getGameServer().world.lattice.findDestination(player, toWhere);
      if (!toWhere2) return player.sendCancelMessage("You cannot add this item here.");
      if (toWhere2.isTrashholder()) {return this.__addThingToTrashholder(fromItem, fromWhere, fromIndex, toWhere, count);}
      if (toWhere2.hasItems() && toWhere2.itemStack.isItemSolid()) {return player.sendCancelMessage("You cannot add this item here.");}
      if (toWhere2.isBlockSolid() && toWhere2.isOccupiedAny()) {return player.sendCancelMessage("You cannot add this item here.");}
    }

    if (toWhere.getTopParent() === player && !player.hasSufficientCapacity(fromItem)) {
      if (fromWhere.constructor.name === "DepotContainer" || toWhere.getTopParent() !== fromWhere.getTopParent()) {
        return player.sendCancelMessage("Your capacity is insufficient to carry this item.");
      }
    }

    const maxCount = toWhere.getMaximumAddCount(player, fromItem, toIndex);
    console.log('maxCount:', maxCount, 'fromItem.id:', fromItem.id, 'toIndex:', toIndex);
    if (maxCount === 0) {
      console.log('Item rejected - cannot add here');
      return player.sendCancelMessage("You cannot add this item here.");
    }
    const realCount = Math.min(count, maxCount);
    console.log('Moving item, realCount:', realCount);
    this.__moveItem(player, fromWhere, fromIndex, toWhere, toIndex, realCount);
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

  private __moveItem(player: IPlayer, fromWhere: Equipment | IContainer | ITile, fromIndex: number, toWhere: Equipment | IContainer | ITile, toIndex: number, count: number): void {
    /*
     * Function PacketHandler.__moveItem
     * Internal private function that moves one object from one place to another
     */
    const movedItem = fromWhere.removeIndex(fromIndex, count);
    if (!movedItem) return;

    let existthing = null;
    if (toWhere instanceof Tile) {
      existthing = toWhere.getTopItem();
    }

    toWhere.addThing(movedItem, toIndex);

    if (toWhere instanceof Tile) {
      if (existthing === null) {
        toWhere.emit("add", player, movedItem);
      } else {
        existthing.emit("add", player, movedItem);
      }
    }

    if (movedItem.constructor.name === "Container" && fromWhere.getTopParent() !== toWhere.getTopParent()) {
      (movedItem as IContainer).checkPlayersAdjacency();
    }

    movedItem.emit("move", player, toWhere, movedItem);
  }

  private __addThingToTrashholder(fromItem: any, fromWhere: any, fromIndex: number, toWhere: any, count: number): void {
    /*
     * Function PacketHandler.addThingToTrashholder
     * Adds an item to the trashholder and completely deletes it
     */
    getGameServer().world.sendMagicEffect(toWhere.position, toWhere.getTrashEffect());
    fromItem.cleanup();
    fromWhere.removeIndex(fromIndex, count);
  }
}
