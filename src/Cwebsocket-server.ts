import { Server, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { CONFIG, CONST, getGameServer } from "./helper/appContext";
import { AccountDatabaseGrouped } from "./Caccount-database-grouped";
import { WebsocketSocketHandler } from "./Cwebsocket-server-socket-handler";
import GameSocket from "./Cgamesocket";

class WebsocketServer {
  websocket: Server;
  accountDatabase: AccountDatabaseGrouped;
  socketHandler: WebsocketSocketHandler;

  constructor() {
    this.websocket = new Server({ noServer: true, perMessageDeflate: this.__getCompressionConfiguration()});
    this.accountDatabase = new AccountDatabaseGrouped(CONFIG.DATABASE.ACCOUNT_DATABASE);
    this.socketHandler = new WebsocketSocketHandler();
    this.websocket.on("connection", (socket: WebSocket, request: IncomingMessage, characterId: number, uid: string) => {
      this.__handleConnection(socket, request, characterId, uid);
    });
    this.websocket.on("close", this.__handleClose.bind(this));
  }

  public getDataDetails(): { sockets: number } {
    return {
      sockets: this.socketHandler.getTotalConnectedSockets(),
    };
  }

  public upgrade(request: IncomingMessage, socket: any, head: Buffer, characterId: number, uid: string): void {
    console.log(`Attempting to upgrade request from ${socket.id} to WS.`);
    this.websocket.handleUpgrade(request, socket, head, (websocket: WebSocket) => {
      console.log(`Upgrade successful for socket with id ${socket.id}.`);
      this.websocket.emit("connection", websocket, request, characterId, uid);
    });
  }

  public close(): void {
    console.log("The websocket server has started to close.");
    this.socketHandler.disconnectClients();
    this.websocket.close();
  }

  private __handleClose(): void {
    console.log("The websocket server has closed.");
    this.accountDatabase.close();
  }

  private __handleConnection(
    socket: WebSocket,
    request: IncomingMessage,
    characterId: number,
    uid: string
  ): void {
    const gameSocket = new GameSocket(socket, uid); // Pass the authenticated UID
    gameSocket.characterId = characterId;

    if (this.socketHandler.isOverpopulated()) {
      return gameSocket.closeError("The server is currently overpopulated. Please try again later.");
    }

    if (getGameServer().isShutdown()) {
      return gameSocket.closeError("The server is going offline. Please try again later.");
    }

    this.__acceptConnection(gameSocket, characterId, uid);
  }

  private __acceptConnection(gameSocket: GameSocket, characterId: number, uid: string): void {
    const { address } = gameSocket.getAddress();
    console.log(`A client joined the server: ${address}.`);

    gameSocket.socket.on("close", this.__handleSocketClose.bind(this, gameSocket));
    this.__handleLoginRequest(gameSocket, characterId, uid);
  }

  private __handleLoginRequest(gameSocket: GameSocket, characterId: number, uid: string): void {
    // ✅ SECURITY FIX: Validate that the character belongs to the authenticated user
    this.accountDatabase.getCharacterByIdForUser(characterId, uid, (error, result) => {
      if (error) {
        console.error("DB error fetching character:", error);
        return gameSocket.terminate();
      }

      if (!result) {
        console.warn(`Character ${characterId} not found or does not belong to user ${uid}.`);
        return gameSocket.closeError("Character not found or access denied.");
      }

      // Convert the grouped database format to legacy format for compatibility
      const character = this.accountDatabase.characterDataToLegacyFormat(result);

      this.__acceptCharacterConnection(gameSocket, character);
    });
  }

  private __getCompressionConfiguration(): boolean | object {
    if (!CONFIG.SERVER.COMPRESSION.ENABLED) return false;

    return {
      clientNoContextTakeover: true,
      serverNoContextTakeover: true,
      threshold: CONFIG.SERVER.COMPRESSION.THRESHOLD,
      zlibDeflateOptions: {
        level: CONFIG.SERVER.COMPRESSION.LEVEL,
      },
    };
  }

  private __acceptCharacterConnection(gameSocket: GameSocket, data: any): void {
    this.socketHandler.referenceSocket(gameSocket);

    if (!data?.properties?.name) {
      console.error("❌ Character data missing or malformed:", data);
      return gameSocket.closeError("Invalid character data.");
    }

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
    console.log(`A client has left the server: ${gameSocket.__address}.`);

    this.socketHandler.dereferenceSocket(gameSocket);

    if (!gameSocket.player) return;

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
    const playerName = gameSocket.player?.getProperty(CONST.PROPERTIES.NAME);
    getGameServer().world.creatureHandler.removePlayerFromWorld(gameSocket);

    const characterId = gameSocket.characterId;
    if (!characterId) {
      console.warn("Missing characterId on disconnect for", playerName);
      return;
    }

    const characterObj = JSON.stringify(gameSocket.player);
    if (!characterObj) {
      console.warn("No character object to save for", playerName);
      return;
    }

    this.accountDatabase.updateCharacterData(characterId, characterObj, (error: Error | null) => {
      if (error) {
        return console.log(`Error storing player information for ${playerName}:`, error);
      }
      console.log(`Stored player information for ${playerName}`);
    });
  }
}

export default WebsocketServer;
