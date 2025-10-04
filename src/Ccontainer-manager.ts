"use strict";

import { IPlayer } from "interfaces/IPlayer";
import DepotContainer from "./Cdepot";
import Equipment from "./Cequipment";
import Inbox from "./Cinbox";
import Keyring from "./Ckeyring";
import { CONST } from "./helper/appContext";
import { IContainer } from "interfaces/IThing";

class ContainerManager {
  private __player: IPlayer;
  private __openedContainers: Map<number, any>;
  readonly depot: DepotContainer;
  readonly equipment: Equipment;
  readonly keyring: Keyring;
  readonly inbox: Inbox;
  readonly MAXIMUM_OPENED_CONTAINERS: number = 5;

  constructor(player: IPlayer, containers: any) {
    this.__player = player;

    this.__openedContainers = new Map<number, any>();

    this.depot = new DepotContainer(CONST.CONTAINER.DEPOT, containers.depot);
    this.equipment = new Equipment(CONST.CONTAINER.EQUIPMENT, player, containers.equipment);
    this.keyring = new Keyring(CONST.CONTAINER.KEYRING, player, containers.keyring);
    this.inbox = new Inbox(player, containers.inbox);
  }

  toJSON(): object {
    return {
      depot: this.depot,
      equipment: this.equipment,
      keyring: this.keyring,
      inbox: this.inbox,
    };
  }

  getContainerFromId(cid: number): any | null {
    /*
     * Function Player.getContainerFromId
     * Returns the container that is referenced by a unique identifiers
     */
    switch (cid) {
      case CONST.CONTAINER.DEPOT:
        return this.depot.isClosed() ? null : this.depot;
      case CONST.CONTAINER.EQUIPMENT:
        return this.equipment;
      case CONST.CONTAINER.KEYRING:
        return this.keyring;
      default:
        return this.__getContainer(cid);
    }
  }

  toggleContainer(container: IContainer): void {
    if (this.__openedContainers.has(container.container.guid)) {
      this.closeContainer(container);
    } else if (container.isDepot() && this.__openedContainers.has(CONST.CONTAINER.DEPOT)) {
      this.closeContainer(this.depot);
    } else {
      this.__openContainer(container);
    }
  }

  cleanup(): void {
    /*
     * Function ContainerManager.cleanup
     * Closes all the containers that are opened by the player
     */
    this.__openedContainers.forEach(container => this.closeContainer(container));
  }

  checkContainer(container: any): void {
    /*
     * Function ContainerManager.checkContainer
     * Confirms whether a player can still see a container and keep it open
     */
    const parentThing = container.getTopParent();

    if (parentThing === this.__player) {
      return;
    }

    if (parentThing === this.depot && this.depot.isClosed()) {
      this.closeContainer(container);
    } else if (!this.__player.isBesidesThing(parentThing)) {
      this.closeContainer(container);
    }
  }

  checkContainers(): void {
    /*
     * Function ContainerManager.checkContainers
     * Goes over all the containers to check whether they can still be opened by the character
     */
    this.__openedContainers.forEach(this.checkContainer, this);
  }

  closeContainer(container: any): void {
    /*
     * Function ContainerManager.closeContainer
     * Closes a container and writes it to disk
     */

    if (!this.__openedContainers.has(container.container.guid)) {
      return;
    }

    this.__openedContainers.delete(container.container.guid);

    if (container === this.depot) {
      this.depot.openAtPosition(null);
      this.__player.closeContainer(this.depot.container);
    } else {
      this.__player.closeContainer(container.container);
    }
  }

  private __getContainer(cid: number): any | null {
    /*
     * Function ContainerManager.__getContainer
     * Finds a container by completing a linear search in all opened containers
     */
    return this.__openedContainers.get(cid) || null;
  }

  openKeyring(): void {
    /*
     * Function ContainerManager.openKeyring
     * Opens the keyring for the player
     */
    if (this.__openedContainers.has(CONST.CONTAINER.KEYRING)) {
      this.__openedContainers.delete(CONST.CONTAINER.KEYRING);
      this.__player.closeContainer(this.keyring.container);
    } else {
      this.__openedContainers.set(CONST.CONTAINER.KEYRING, this.keyring);
      this.__player.openContainer(1987, "Keyring", this.keyring.container, this.keyring);
    }
  }

  private __openContainer(container: any): void {
    /*
     * Function ContainerManager.__openContainer
     * Writes packet to open a container
     */
    if (this.__openedContainers.has(container.id)) {
      return;
    }

    if (this.__openedContainers.size >= this.MAXIMUM_OPENED_CONTAINERS) {
      this.__player.sendCancelMessage("You cannot open any more containers.");
      return;
    }

    if (container.isDepot() && !this.depot.isClosed()) {
      this.__player.sendCancelMessage("You already have another depot opened.");
      return;
    }

    if (!container.isDepot()) {
      this.__openedContainers.set(container.container.guid, container);
      this.__player.openContainer(container.id, container.getName(), container.container, container);
    } else {
      this.__openedContainers.set(CONST.CONTAINER.DEPOT, this.depot);
      this.depot.openAtPosition(container.getPosition());
      this.__player.openContainer(container.id, "Depot", this.depot.container);
    }
  }
}

export default ContainerManager;
