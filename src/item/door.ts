"use strict";
import { IDoor } from "interfaces/IDoor";
import { getGameServer } from "../helper/appContext";
import { IThing } from "interfaces/IThing";
import { IPlayer } from "interfaces/IPlayer";
import Item from "./item";
import { ICreature } from "interfaces/ICreature";

class Door extends Item implements IDoor {
  constructor(id: number) {
    super(id);
  }

  getHouseName(): string {
    return this.getParent().house.name;
  }

  getHouseOwner(): string | number {
    return this.getParent().house.owner;
  }

  open(): void {
    if (this.isOpened()) {
      return;
    }
    this.__change(1);
  }

  close(): void {
    /*
     * Function Door.close
     * Closes the door by decrementing the item identifier
     */
    if (!this.isOpened()) {
      return;
    }
    this.__change(-1);
  }

  handleEnterUnwantedDoor(player: IPlayer): void {
    /*
     * Function Door.handleEnterExpertiseDoor
     * Handling of unwanted doors
     */
    if (!this.hasOwnProperty("actionId")) {
      player.sendCancelMessage("Only the worthy may pass!");
      return;
    }

    // TODO: investigate this.actionId
    let action;
    if (this.actionId){
      action = getGameServer().database.getDoorEvent(this.actionId.toString());
    }
    const tile = this.getParent();

    if (!action || !action.call(this, player)) {
      player.sendCancelMessage("Only the worthy may pass!");
      return;
    }

    this.open();
    player.sendCancelMessage("The gate pulls you in.");
    player.movementHandler.lock(player.getStepDuration(tile.getFriction()));
    getGameServer().world.creatureHandler.moveCreature(player, tile.position);
  }

  handleEnterExpertiseDoor(player: IPlayer): void {
    /*
     * Function Door.handleEnterExpertiseDoor
     * Handling of expertise doors
     */
    if (!this.hasOwnProperty("actionId")) {
      player.sendCancelMessage("Only the worthy may pass!");
      return;
    }

    if (this.actionId){
      if (player.getLevel() < this.actionId - 100) {
        player.sendCancelMessage("Only the worthy may pass!");
        return;
      }
    }

    this.open();
    const tile = this.getParent();
    player.sendCancelMessage("The gate of expertise pulls you in.");
    player.movementHandler.lock(player.getStepDuration(tile.getFriction()));
    getGameServer().world.creatureHandler.moveCreature(player, tile.position);
    
    tile.once("exit", () => {
      this.forceReplace();
    })
  }

  isHouseDoor(): boolean {
    return this.getParent().isHouseTile();
  }

  handleHouseDoor(player: any): void {
    if (!player.ownsHouseTile(this.getParent())) {
      player.sendCancelMessage("You do not own this house.");
      return;
    }

    if (!this.isOpened()) {
      this.open();
    } else {
      this.close();
    }
  }

  getDescription(): string {
    if (this.isHouseDoor()) {
      return `It belongs to ${this.getHouseName()} and is owned by ${this.getHouseOwner()}.`;
    } 
    else if (this.getAttribute("expertise")) {
      return `Only adventurers of level ${this.actionId! - 100} may pass.`;
    }
    return "";
    
  }

  toggle(player: any): void {
    /*
     * Function Door.toggle
     * Toggles the open/closed state of the door
     */
    if (player.isPlayer()) {
      if (this.isHouseDoor()) {
        this.handleHouseDoor(player);
        return;
      } else if (this.getAttribute("expertise")) {
        this.handleEnterExpertiseDoor(player);
        return;
      } else if (this.getAttribute("unwanted")) {
        this.handleEnterUnwantedDoor(player);
        return;
      }
    }

    if (!this.isOpened()) {
      if (this.isLocked()) {
        if (!player.containerManager.keyring.hasKey(this.actionId)) {
          player.sendCancelMessage("This door is locked.");
          return;
        }
        player.sendCancelMessage("You open the door with your keyring.");
      }
      this.open();
    } else {
      if (this.getParent().isOccupiedAny()) {
        player.sendCancelMessage("Something is blocking the door from closing.");
        return;
      }
      this.close();
    }
  }

  isLocked(): boolean {
    /*
     * Function Door.isLocked
     * Returns true if the door is locked
     */
    return this.hasOwnProperty("actionId");
  }

  isOpened(): boolean {
    /*
     * Function Door.isOpened
     * Returns true if the door is opened by checking whether it blocks projectiles
     */
    return !this.isBlockSolid();
  }

  private __change(direction: number): IThing | null {
    const thing = getGameServer().database.createThing(this.id + direction);
    if (thing) {
      if (this.actionId) {
        thing.setActionId(this.actionId);
      }
      this.replace(thing);
      console.log(`Door now has id ${this.id}`);
    }
    return thing;
  }

}

export default Door;
