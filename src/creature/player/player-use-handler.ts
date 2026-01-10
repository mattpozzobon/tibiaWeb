"use strict";

import { IPlayer } from "../../interfaces/IPlayer";
import GenericLock from "../../utils/generic-lock";
import { ReadTextPacket, BeltPotionQuantitiesPacket } from "../../network/protocol";
import { getGameServer, CONST } from "../../helper/appContext";

class UseHandler {
  private __player: IPlayer;
  private __useWithLock: GenericLock;
  readonly GLOBAL_USE_COOLDOWN: number = 50;

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
    } else if (packet.which.constructor.name === "Equipment" || packet.which.constructor.name === "DepotContainer" || packet.which.isContainer()) {
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

    // If the item clicked is a container: toggle it (allow Mail/Depot containers even with unique IDs)
    if (item.isContainer() || item.isDepot()) {
      this.__player.containerManager.toggleContainer(item);
      return;
    }

    // Check for unique ID items that are not containers (prevent interaction)
    if (item.hasUniqueId()) {
      return;
    }

    // Rotate the item
    if (item.isRotateable()) {
      item.rotate();
      return;
    }

    // Readable (but not distance-readable - those only show content when looked at, not when used)
    if (item.isReadable() && !item.isDistanceReadable()) {
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

  handleUseBeltPotion(index: number): void {
    /*
     * Function UseHandler.handleUseBeltPotion
     * Handles the use of a belt potion
     * Index 0 = Health, Index 1 = Mana, Index 2 = Energy
     */
    
    // Check if the action is locked
    if (this.__useWithLock.isLocked()) {
      this.__player.sendCancelMessage("You cannot use this object yet.");
      return;
    }

    // Get the belt container from equipment
    const beltItem = this.__player.containerManager.equipment.peekIndex(CONST.EQUIPMENT.BELT);
    if (!beltItem || !beltItem.isContainer()) {
      this.__player.sendCancelMessage("You don't have a belt equipped.");
      return;
    }

    // Find the appropriate potion in the belt container based on index
    let potion = null;
    let potionSlot = -1;
    let expectedClientId = 0;
    
    // Determine which potion type we're looking for based on index
    if (index === 0) {
      expectedClientId = 266; // Health potion
    } else if (index === 1) {
      expectedClientId = 268; // Mana potion
    } else if (index === 2) {
      expectedClientId = 237; // Energy potion
    } else {
      this.__player.sendCancelMessage("Invalid potion slot.");
      return;
    }
    
    // Search through the belt container to find the matching potion
    for (let i = 0; i < beltItem.container.size; i++) {
      const item = beltItem.peekIndex(i);
      if (item) {
        const clientId = getGameServer().database.getClientId(item.id);
        if (clientId === expectedClientId) {
          potion = item;
          potionSlot = i;
          break;
        }
      }
    }
    
    if (!potion) {
      const potionType = index === 0 ? 'health' : index === 1 ? 'mana' : 'energy';
      this.__player.sendCancelMessage(`You don't have a ${potionType} potion in your belt.`);
      return;
    }
    
    // Apply the appropriate effect based on potion type
    let effectApplied = false;
    
    if (index === 0) { // Health potion
      // Add healing condition: 5 ticks, 10 seconds duration, heals 10 HP per tick
      this.__player.addCondition(CONST.CONDITION.HEALTH_HEALING, 500, 1000, null);
      effectApplied = true;
    } else if (index === 1) { // Mana potion
      // Add mana healing condition: 5 ticks, 10 seconds duration, heals 10 MP per tick
      this.__player.addCondition(CONST.CONDITION.MANA_HEALING, 500, 1000, null);
      effectApplied = true;
    } else if (index === 2) { // Energy potion
      // Add energy healing condition: 5 ticks, 10 seconds duration, heals 10 EP per tick
      this.__player.addCondition(CONST.CONDITION.ENERGY_HEALING, 500, 1000, null);
      effectApplied = true;
    }

    if (effectApplied) {
      // Remove the potion from the belt
      beltItem.removeIndex(potionSlot, 1);
      
      // Send updated belt potion quantities to UI
      this.__player.write(new BeltPotionQuantitiesPacket(this.__player.containerManager.equipment));
      
      // Lock the action for cooldown
      this.__useWithLock.lock(this.GLOBAL_USE_COOLDOWN);
      
      console.log(`Used ${index === 0 ? 'health' : index === 1 ? 'mana' : 'energy'} potion from belt slot ${potionSlot}`);
    } else {
      this.__player.sendCancelMessage("You cannot use that potion in this slot.");
    }
  }
}

export default UseHandler;
