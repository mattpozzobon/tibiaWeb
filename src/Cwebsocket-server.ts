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
    this.websocket = new Server({ noServer: true, perMessageDeflate: this.__getCompressionConfiguration()});
    this.accountDatabase = new AccountDatabase(CONFIG.DATABASE.ACCOUNT_DATABASE);
    this.socketHandler = new WebsocketSocketHandler();
    this.websocket.on("connection", (socket: WebSocket, request: IncomingMessage, characterId: number) => {
      this.__handleConnection(socket, request, characterId);
    });
    this.websocket.on("close", this.__handleClose.bind(this));
  }

  public getDataDetails(): { sockets: number } {
    return {
      sockets: this.socketHandler.getTotalConnectedSockets(),
    };
  }

  public upgrade(request: IncomingMessage, socket: any, head: Buffer, characterId: number): void {
    console.log(`Attempting to upgrade request from ${socket.id} to WS.`);
    this.websocket.handleUpgrade(request, socket, head, (websocket: WebSocket) => {
      console.log(`Upgrade successful for socket with id ${socket.id}.`);
      this.websocket.emit("connection", websocket, request, characterId);
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
    characterId: number
  ): void {
    const gameSocket = new GameSocket(socket, ""); // account UID is not needed here
    gameSocket.characterId = characterId;

    if (this.socketHandler.isOverpopulated()) {
      return gameSocket.closeError("The server is currently overpopulated. Please try again later.");
    }

    if (getGameServer().isShutdown()) {
      return gameSocket.closeError("The server is going offline. Please try again later.");
    }

    this.__acceptConnection(gameSocket, characterId);
  }

  private __acceptConnection(gameSocket: GameSocket, characterId: number): void {
    const { address } = gameSocket.getAddress();
    console.log(`A client joined the server: ${address}.`);

    gameSocket.socket.on("close", this.__handleSocketClose.bind(this, gameSocket));
    this.__handleLoginRequest(gameSocket, characterId);
  }

  private __handleLoginRequest(gameSocket: GameSocket, characterId: number): void {
    this.accountDatabase.getCharacterById(characterId, (error, result) => {
      if (error) {
        console.error("DB error fetching character:", error);
        return gameSocket.terminate();
      }

      if (!result || !result.data) {
        console.warn("No character found for ID, or missing data.");
        return gameSocket.closeError("Character data missing.");
      }

      let character = result.data;

      if (typeof character === "string") {
        try {
          character = JSON.parse(character);
        } catch (e) {
          console.error("❌ Failed to parse character JSON:", e);
          return gameSocket.closeError("Character data corrupted.");
        }
      }

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
