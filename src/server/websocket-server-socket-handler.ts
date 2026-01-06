import { NetworkManager } from "./network-manager";
import GameSocket from "./gamesocket";
import { CONFIG } from "../helper/appContext";


export class WebsocketSocketHandler {
  public connectedSockets: Set<GameSocket>;
  private networkManager: NetworkManager;

  constructor() {
    /*
     * Class WebsocketSocketHandler
     * The handler for all connected websockets
     */

    // Keep track of all connected sockets
    this.connectedSockets = new Set<GameSocket>();

    // Manager for socket I/O
    this.networkManager = new NetworkManager();
  }

  public getConnectedSockets(): Set<GameSocket> {
    /*
     * Function WebsocketSocketHandler.getConnectedSockets
     * Returns the set of all connected sockets
     */
    return this.connectedSockets;
  }

  public isOverpopulated(): boolean {
    /*
     * Function WebsocketSocketHandler.isOverpopulated
     * Returns true if the server has equal or more sockets connected than the configured maximum
     */
    return this.getTotalConnectedSockets() >= CONFIG.SERVER.ALLOW_MAXIMUM_CONNECTIONS;
  }

  public getTotalConnectedSockets(): number {
    /*
     * Function WebsocketSocketHandler.getTotalConnectedSockets
     * Returns the number of connected sockets
     */
    return this.getConnectedSockets().size;
  }

  public disconnectClients(): void {
    /*
     * Function WebsocketSocketHandler.disconnectClients
     * Disconnects all clients connected to the websocket server
     */
    this.getConnectedSockets().forEach((gameSocket) => gameSocket.close());
  }

  public ping(): void {
    /*
     * Function WebsocketSocketHandler.ping
     * Pings all clients over the websocket protocol to disconnect stale connections
     */
    this.connectedSockets.forEach((gameSocket) => gameSocket.ping());
  }

  public flushSocketBuffers(): void {
    /*
     * Function WebsocketSocketHandler.flushSocketBuffers
     * Flushes the incoming and outgoing websocket buffers
     */
    this.connectedSockets.forEach((gameSocket) => this.networkManager.handleIO(gameSocket));
  }

  public referenceSocket(gameSocket: GameSocket): void {
    /*
     * WebsocketSocketHandler.referenceSocket
     * Saves a reference to the gamesocket
     */
    this.connectedSockets.add(gameSocket);
  }

  public dereferenceSocket(gameSocket: GameSocket): void {
    /*
     * WebsocketSocketHandler.dereferenceSocket
     * Deletes a reference to the gamesocket
     */
    this.connectedSockets.delete(gameSocket);
  }
}
