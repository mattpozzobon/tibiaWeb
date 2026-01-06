import Player from "./player";
import { CONST } from "./helper/appContext";

export class SocketHandler {
  private player: Player;
  private __controllingSocket: any | null; // Replace `any` with the specific type for sockets if known
  private __spectators: Set<any>; // Replace `any` with the specific type for sockets if known
  private __logoutCallback: any | null; // Replace `any` with the specific callback type if known

  constructor(player: Player) {
    /*
     * Class SocketHandler
     * Wrapper for sockets connected to the player: these are 1) controller and N) spectators
     */
    this.player = player;
    this.__controllingSocket = null;
    this.__spectators = new Set();
    this.__logoutCallback = null;
  }

  setLogoutEvent(logoutEvent: any): void {
    // Replace `any` with the specific type for the logout event if known
    this.__logoutCallback = logoutEvent;
  }

  write(buffer: Buffer): void {
    /*
     * Function SocketHandler.write
     * Writes a message to all the connected sockets
     */
    this.__spectators.forEach((gameSocket) => gameSocket.write(buffer));
  }

  attachController(gameSocket: any): void {
    /*
     * Function SocketHandler.attachController
     * Attaches a controlling socket to the player
     */

    // Replace: remove the currently connected game socket
    if (this.__controllingSocket !== null) {
      this.__controllingSocket.close();
    }

    // Cancel a potential scheduled logout callback
    if (this.__logoutCallback) {
      this.__logoutCallback.cancel();
    }

    // Reference the new controlling socket
    this.__controllingSocket = gameSocket;

    // A controller is automatically a spectator too
    this.addSpectator(gameSocket);
  }

  disconnect(): void {
    /*
     * Function SocketHandler.disconnect
     * All spectators must be disconnected
     */
    this.__spectators.forEach((gameSocket) => gameSocket.close());
  }

  getController(): any | null {
    /*
     * Function SocketHandler.getController
     * Returns the controlling game socket of the player
     */
    return this.__controllingSocket;
  }

  getLastPacketReceived(): number | null {
    /*
     * Function SocketHandler.getLastPacketReceived
     * Returns the timestamp of when the latest packet was received
     */
    const controller = this.getController();
    return controller ? controller.getLastPackedReceived() : null;
  }

  addSpectator(gameSocket: any): void {
    /*
     * Function SocketHandler.addSpectator
     * Adds a new spectator to the player and writes the world state
     */
    this.__spectators.add(gameSocket);

    // Reference the player in the game socket
    gameSocket.player = this.player;

    // Call to write the initial spectator packets
    gameSocket.writeWorldState(this.player);
  }
}
