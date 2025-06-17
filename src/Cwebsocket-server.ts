import { Server, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { CONFIG, CONST, getGameServer } from "./helper/appContext";
import { AccountDatabase } from "./Caccount-database";
import { WebsocketSocketHandler } from "./Cwebsocket-server-socket-handler";
import GameSocket from "./Cgamesocket";

class WebsocketServer {
  websocket: Server;
  accountDatabase: AccountDatabase;
  socketHandler: WebsocketSocketHandler;

  constructor() {
    /*
     * Class WebsocketServer
     * Handles the websocket server and upgrades HTTP connections to websocket connections.
     */

    this.websocket = new Server({
      noServer: true,
      perMessageDeflate: this.__getCompressionConfiguration(),
    });

    // Use the same database file as login server (CONFIG.DATABASE.ACCOUNT_DATABASE)
    this.accountDatabase = new AccountDatabase(CONFIG.DATABASE.ACCOUNT_DATABASE);

    this.socketHandler = new WebsocketSocketHandler();

    this.websocket.on("connection", this.__handleConnection.bind(this));
    this.websocket.on("close", this.__handleClose.bind(this));
  }

  public getDataDetails(): { sockets: number } {
    /*
     * Returns data details of the websocket server
     */
    return {
      sockets: this.socketHandler.getTotalConnectedSockets(),
    };
  }

  /**
   * Called from HTTPServer.__handleUpgrade after verifying HMAC token:
   *   this.websocketServer.upgrade(request, socket, head, firebaseUid);
   */
  public upgrade(
    request: IncomingMessage,
    socket: any,
    head: Buffer,
    accountName: string  // here accountName is actually the Firebase UID
  ): void {
    console.log(`Attempting to upgrade request from ${socket.id} to WS.`);

    this.websocket.handleUpgrade(
      request,
      socket,
      head,
      (websocket: WebSocket) => {
        console.log(`Upgrade successful for socket with id ${socket.id}.`);
        // Pass accountName (UID) to connection handler:
        this.websocket.emit("connection", websocket, request, accountName);
      }
    );
  }

  public close(): void {
    /*
     * Closes the websocket server
     */
    console.log("The websocket server has started to close.");

    this.socketHandler.disconnectClients();
    this.websocket.close();
  }

  private __handleClose(): void {
    /*
     * Callback fired when the websocket server is closed
     */
    console.log("The websocket server has closed.");
    this.accountDatabase.close();
  }

  /**
   * On a successful WebSocket upgrade, this is called:
   *   websocket.on("connection", (socket, request, accountName) => ...)
   */
  private __handleConnection(
    socket: WebSocket,
    request: IncomingMessage,
    accountName: string  // Firebase UID from login handshake
  ): void {
    /*
     * Handles an incoming websocket connection
     */
    const gameSocket = new GameSocket(socket, accountName);

    if (this.socketHandler.isOverpopulated()) {
      return gameSocket.closeError(
        "The server is currently overpopulated. Please try again later."
      );
    }

    if (getGameServer().isShutdown()) {
      return gameSocket.closeError(
        "The server is going offline. Please try again later."
      );
    }

    this.__acceptConnection(gameSocket, accountName);
  }

  private __acceptConnection(gameSocket: GameSocket, accountName: string): void {
    /*
     * Accepts the connection of the websocket
     */
    const { address } = gameSocket.getAddress();
    console.log(`A client joined the server: ${address}.`);

    gameSocket.socket.on(
      "close",
      this.__handleSocketClose.bind(this, gameSocket)
    );

    this.__handleLoginRequest(gameSocket, accountName);
  }

  private __handleLoginRequest(gameSocket: GameSocket, accountName: string): void {
    /*
     * Handles a login request from a socket:
     * Now: lookup character JSON by Firebase UID
     */
    this.accountDatabase.getCharacterForUid(accountName, (error, result) => {
      if (error) {
        console.error("DB error fetching character for UID:", error);
        return gameSocket.terminate();
      }
      if (!result || !result.character) {
        console.warn("No character found for UID, this should not happen if login created it.");
        return gameSocket.closeError("Character data missing.");
      }

      let character;
      try {
        character = JSON.parse(result.character);
      } catch (e) {
        console.error("Failed to parse character JSON:", e);
        return gameSocket.closeError("Character data corrupted.");
      }

      this.__acceptCharacterConnection(gameSocket, character);
    });
  }

  private __getCompressionConfiguration(): boolean | object {
    /*
     * Returns the compression options for zlib used in ws
     */
    if (!CONFIG.SERVER.COMPRESSION.ENABLED) {
      return false;
    }

    return {
      clientNoContextTakeover: true,
      serverNoContextTakeover: true,
      threshold: CONFIG.SERVER.COMPRESSION.THRESHOLD,
      zlibDeflateOptions: {
        level: CONFIG.SERVER.COMPRESSION.LEVEL,
      },
    };
  }

  private __acceptCharacterConnection(
    gameSocket: GameSocket,
    data: any
  ): void {
    /*
     * Accepts the connection of a character
     */
    this.socketHandler.referenceSocket(gameSocket);

    const existingPlayer = getGameServer().world.creatureHandler.getPlayerByName(
      data.properties.name
    );

    if (existingPlayer === null) {
      return getGameServer().world.creatureHandler.createNewPlayer(gameSocket, data);
    }

    switch (CONFIG.SERVER.ON_ALREADY_ONLINE) {
      case "replace":
        return existingPlayer.socketHandler.attachController(gameSocket);
      case "spectate":
        return existingPlayer.socketHandler.addSpectator(gameSocket);
    }

    gameSocket.closeError("This character is already online.");
  }

  private __handleSocketClose(gameSocket: GameSocket): void {
    /*
     * Handles closing of a game socket
     */
    console.log(`A client has left the server: ${gameSocket.__address}.`);

    this.socketHandler.dereferenceSocket(gameSocket);

    if (!gameSocket.player) {
      return;
    }

    if (!gameSocket.player.isInCombat() || getGameServer().isClosed()) {
      return this.__removePlayer(gameSocket);
    }

    const logoutEvent = getGameServer().world.eventQueue.addEvent(
      this.__removePlayer.bind(this, gameSocket),
      gameSocket.player.combatLock.remainingFrames()
    );

    gameSocket.player.socketHandler.setLogoutEvent(logoutEvent);
  }

  private __removePlayer(gameSocket: GameSocket): void {
    /*
     * Removes a player from the game world and stores their information in the database
     */
    const playerName = gameSocket.player?.getProperty(CONST.PROPERTIES.NAME);
    getGameServer().world.creatureHandler.removePlayerFromWorld(gameSocket);

    // Save updated character data under the Firebase UID (accountName)
    const uid = gameSocket.account;  // assuming GameSocket stored this
    // Extract the character object from gameSocket.player; adjust as needed
    const characterObj = JSON.stringify(gameSocket.player);
    // or however you obtain the current character state as a JS object
    if (!characterObj) {
      console.warn("No character object to save for", playerName);
      return;
    }
    this.accountDatabase.saveCharacterForUid(uid, characterObj, (error: Error | null) => {
      if (error) {
        return console.log(`Error storing player information for ${playerName}:`, error);
      }
      console.log(`Stored player information for ${playerName}`);
    });
  }
}

export default WebsocketServer;
