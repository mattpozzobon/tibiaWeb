"use strict";

import DepotContainer from "./depot";
import Equipment from "./equipment";
import Inbox from "./inbox";
import Keyring from "../game-object/item/keyring";
import { CONST } from "../helper/appContext";
import Container from "./container/container";
import { getContainerFromIContainer } from "../game/items/container-helpers";
import Player from "creature/player/player";

class ContainerManager {
  private __player: Player;
  private __openedContainers: Map<number, any>;
  readonly depot: DepotContainer;
  readonly equipment: Equipment;
  readonly keyring: Keyring;
  readonly inbox: Inbox;
  readonly MAXIMUM_OPENED_CONTAINERS: number = 5;

  constructor(player: Player, containers: any) {
    this.__player = player;

    this.__openedContainers = new Map<number, any>();

    const depotData = containers.depot || {};
    const depotItems = Array.isArray(depotData) ? depotData : (depotData.depot || []);
    const inboxItems = containers.inbox || [];

    this.depot = new DepotContainer(CONST.CONTAINER.DEPOT, depotItems, inboxItems);
    this.equipment = new Equipment(CONST.CONTAINER.EQUIPMENT, player, containers.equipment);
    this.keyring = new Keyring(CONST.CONTAINER.KEYRING, player, containers.keyring);
    this.inbox = new Inbox(player, inboxItems);
    
    // Now that everything is initialized, sync the mail container with the inbox queue
    // Pass 'this' as parameter since player.containerManager might not be set yet
    // This ensures items loaded from database are displayed in the mail container
    if (this.inbox && this.depot) {
      this.inbox.syncContainer(this);
    }
  }

  toJSON(): object {
    /*
     * Class ContainerManager.toJSON
     * Serializes all containers for database storage
     * 
     * NOTE: Inbox.__items is the single source of truth for mail items (queue)
     * No need to sync - just save the queue directly
     */
    const depotJSON = this.depot.toJSON(this.inbox);
    return {
      depot: depotJSON.depot,
      equipment: this.equipment,
      keyring: this.keyring,
      inbox: depotJSON.mail, // This comes from inbox.toJSON() which returns __items queue
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

  toggleContainer(container: Container | any): void {
    if (!container) {
      console.log("[ContainerManager.toggleContainer] No container provided");
      return;
    }

    if (container.isDepot()) {
      console.log("[ContainerManager.toggleContainer] Depot detected, isOpen:", this.__openedContainers.has(CONST.CONTAINER.DEPOT));
      if (this.__openedContainers.has(CONST.CONTAINER.DEPOT)) {
        this.closeContainer(this.depot);
      } else {
        this.__openContainer(container);
      }
      return;
    }

    const baseContainer = getContainerFromIContainer(container);
    if (!baseContainer || baseContainer.guid === undefined) {
      return;
    }

    if (this.__openedContainers.has(baseContainer.guid)) {
      this.closeContainer(container);
    } else {
      this.__openContainer(container as any);
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

    if (!parentThing) {
      // If parent is null, container might be in transit - close it to be safe
      this.closeContainer(container);
      return;
    }

    if (parentThing === this.__player) {
      return;
    }

    if (parentThing === this.depot && this.depot.isClosed()) {
      this.closeContainer(container);
    } else if (parentThing.getPosition && !this.__player.isBesidesThing(parentThing)) {
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
    if (!container) {
      return;
    }

    // Handle closing the main depot container
    const containerBase = getContainerFromIContainer(container);
    const depotBase = this.depot.container;
    if (container === this.depot || (containerBase && containerBase.guid === depotBase.guid)) {
      if (!this.__openedContainers.has(CONST.CONTAINER.DEPOT)) {
        return;
      }
      this.__openedContainers.delete(CONST.CONTAINER.DEPOT);
      this.depot.openAtPosition(null);
      this.__player.closeContainer(depotBase);
      return;
    }

    // Handle closing Mail or Depot sub-containers
    const mailContainer = this.depot.getMailContainer();
    const depotContainer = this.depot.getDepotContainer();
    
    if (mailContainer && containerBase) {
      const mailBase = getContainerFromIContainer(mailContainer);
      if (containerBase.guid === mailBase.guid) {
        if (!this.__openedContainers.has(mailBase.guid)) {
          return;
        }
        this.__openedContainers.delete(mailBase.guid);
        this.__player.closeContainer(mailBase);
        return;
      }
    }

    if (depotContainer && containerBase) {
      const depotSubBase = getContainerFromIContainer(depotContainer);
      if (containerBase.guid === depotSubBase.guid) {
        if (!this.__openedContainers.has(depotSubBase.guid)) {
          return;
        }
        this.__openedContainers.delete(depotSubBase.guid);
        this.__player.closeContainer(depotSubBase);
        return;
      }
    }

    if (!containerBase || containerBase.guid === undefined) {
      return;
    }

    if (!this.__openedContainers.has(containerBase.guid)) {
      return;
    }

    this.__openedContainers.delete(containerBase.guid);
    this.__player.closeContainer(containerBase);
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

  private __openContainer(container: Container | any): void {
    if (!container) {
      return;
    }

    if (container.isDepot()) {
      console.log("[ContainerManager.__openContainer] Opening depot", {
        depotIsClosed: this.depot.isClosed(),
        containerId: container.id,
        depotPosition: container.getPosition(),
        openedContainers: this.__openedContainers.size,
        depotContainerGuid: this.depot.container.guid
      });

      if (this.__openedContainers.has(CONST.CONTAINER.DEPOT)) {
        console.log("[ContainerManager.__openContainer] Depot already open");
        return;
      }

      if (this.__openedContainers.size >= this.MAXIMUM_OPENED_CONTAINERS) {
        console.log("[ContainerManager.__openContainer] Too many containers open");
        this.__player.sendCancelMessage("You cannot open any more containers.");
        return;
      }

      if (!this.depot.isClosed()) {
        console.log("[ContainerManager.__openContainer] Depot not closed");
        this.__player.sendCancelMessage("You already have another depot opened.");
        return;
      }

      this.__openedContainers.set(CONST.CONTAINER.DEPOT, this.depot);
      this.depot.openAtPosition(container.getPosition());
      console.log("[ContainerManager.__openContainer] Calling player.openContainer", {
        id: container.id,
        name: "Depot",
        baseContainerGuid: this.depot.container.guid,
        containerSize: this.depot.container.size
      });
      this.__player.openContainer(container.id, "Depot", this.depot.container, this.depot);
      return;
    }

    // Check if this is the Mail container (ID 14404 or unique ID 0x10000000)
    const isMailContainer = container.id === DepotContainer.MAIL_CONTAINER_ID || (container.hasUniqueId && container.hasUniqueId() && container.uid === 0x10000000);
    // Check if this is the Depot container (DEPOT_CONTAINER_ID or unique ID 0x10000001)  
    const isDepotContainer = container.id === DepotContainer.DEPOT_CONTAINER_ID || (container.hasUniqueId && container.hasUniqueId() && container.uid === 0x10000001);

    if (isMailContainer) {
      // Open the Mail container (which contains inbox items)
      const mailContainer = this.depot.getMailContainer();
      if (!mailContainer) {
        return;
      }

      const mailBase = getContainerFromIContainer(mailContainer);
      if (this.__openedContainers.has(mailBase.guid)) {
        this.closeContainer(mailContainer);
        return;
      }

      if (this.__openedContainers.size >= this.MAXIMUM_OPENED_CONTAINERS) {
        this.__player.sendCancelMessage("You cannot open any more containers.");
        return;
      }

      // Before opening, sync container to ensure first 5 items from queue are visible
      // This ensures all available mail items (up to 5) are visible when the container is opened
      this.inbox.syncContainer();

      this.__openedContainers.set(mailBase.guid, mailContainer);
      this.__player.openContainer(mailContainer.id, "Mail", mailBase, mailContainer);
      return;
    }

    if (isDepotContainer) {
      // Open the Depot container (which contains depot items)
      const depotContainer = this.depot.getDepotContainer();
      if (!depotContainer) {
        return;
      }

      const depotSubBase = getContainerFromIContainer(depotContainer);
      if (this.__openedContainers.has(depotSubBase.guid)) {
        this.closeContainer(depotContainer);
        return;
      }

      if (this.__openedContainers.size >= this.MAXIMUM_OPENED_CONTAINERS) {
        this.__player.sendCancelMessage("You cannot open any more containers.");
        return;
      }

      this.__openedContainers.set(depotSubBase.guid, depotContainer);
      this.__player.openContainer(depotContainer.id, "Depot", depotSubBase, depotContainer);
      return;
    }

    if (this.__openedContainers.has(container.id)) {
      return;
    }

    if (this.__openedContainers.size >= this.MAXIMUM_OPENED_CONTAINERS) {
      this.__player.sendCancelMessage("You cannot open any more containers.");
      return;
    }

    const containerBase = getContainerFromIContainer(container);
    if (!containerBase || containerBase.guid === undefined) {
      return;
    }

    this.__openedContainers.set(containerBase.guid, container);
    this.__player.openContainer(container.id, container.getName(), containerBase, container);
  }
}

export default ContainerManager;
