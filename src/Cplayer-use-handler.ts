"use strict";

import { IPlayer } from "interfaces/IPlayer";
import GenericLock from "./Cgeneric-lock";
import { ReadTextPacket } from "./Cprotocol";

class UseHandler {
  private __player: IPlayer;
  private __useWithLock: GenericLock;
  readonly GLOBAL_USE_COOLDOWN: number = 20;

  constructor(player: any) {
    /*
     * Class UseHandler
     * Wrapper for the logic that handles using items
     */

    // Always reference the parent player
    this.__player = player;

    // The lock that prevents things being used too quickly
    this.__useWithLock = new GenericLock();
  }

  handleActionUseWith(packet: any): void {
    /*
     * Function UseHandler.handleActionUseWith
     * Called when a client request is made to use an item with another item
     */

    // This function is not available
    if (this.__useWithLock.isLocked()) {
      this.__player.sendCancelMessage("You cannot use this object yet.");
      return;
    }

    // Both must be present in the packet
    if (packet.fromWhere === null || packet.toWhere === null) {
      return;
    }

    // Must be beside the `from` (using) item
    if (!this.__player.isBesidesThing(packet.fromWhere)) {
      this.__player.sendCancelMessage("You have to move closer to use this item.");
      return;
    }

    // Fetch the item
    const item = packet.fromWhere.peekIndex(packet.fromIndex);

    // If there is no item, there is nothing to do
    if (item === null) {
      return;
    }

    // Emit the event for the prototype listeners
    item.emit("useWith", this.__player, item, packet.toWhere, packet.toIndex);

    // Explicitly handle key uses
    if (item.constructor.name === "Key") {
      item.handleKeyUse(this.__player, packet.toWhere);
    }

    if (item.constructor.name === "FluidContainer") {
      item.handleUseWith(this.__player, item, packet.toWhere, packet.toIndex);
    }

    // Lock the action for the coming global cooldown
    this.__useWithLock.lock(this.GLOBAL_USE_COOLDOWN);
  }

  handleItemUse(packet: any): void {
    /*
     * Function UseHandler.handleItemUse
     * Handles a use event for the tile
     */

    // An invalid tile or container was requested
    if (packet.which === null) {
      return;
    }

    let item: any;
    // Delegate to the appropriate handler
    if (packet.which.constructor.name === "Tile") {
      item = this.handleTileUse(packet.which);
    } else if (
      packet.which.constructor.name === "Equipment" ||
      packet.which.constructor.name === "DepotContainer" ||
      packet.which.isContainer()
    ) {
      item = packet.which.peekIndex(packet.index);
    }

    if (item === null) {
      return;
    }

    // Emitter
    item.emit("use", this.__player, packet.which, packet.index, item);

    if (item.isDoor()) {
      item.toggle(this.__player);
    }

    if (item.isMailbox()) {
      this.__player.containerManager.inbox.pop(item.getPosition());
      return;
    }

    if (item.hasUniqueId()) {
      return;
    }

    // If the item clicked is a container: toggle it
    if (item.isContainer() || item.isDepot()) {
      this.__player.containerManager.toggleContainer(item);
      return;
    }

    // Rotate the item
    if (item.isRotateable()) {
      item.rotate();
      return;
    }

    // Readable
    if (item.isReadable()) {
      if (item.isHangable() && !this.__player.canUseHangable(item)) {
        this.__player.sendCancelMessage("You have to move to the other side.");
        return;
      }

      this.__player.write(new ReadTextPacket(item));
    }
  }

  handleTileUse(tile: any): any | null {
    /*
     * Function UseHandler.handleTileUse
     * Handles the tile use event
     */

    // For the rest of the actions, the player must be beside the tile
    if (!this.__player.position.besides(tile.position)) {
      return null;
    }

    return tile.getTopItem();
  }
}

export default UseHandler;
