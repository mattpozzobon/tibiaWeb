import { Server, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { CONFIG, CONST, getGameServer } from "./helper/appContext";
import { AccountDatabaseGrouped } from "./Caccount-database-grouped";
import { WebsocketSocketHandler } from "./Cwebsocket-server-socket-handler";
import GameSocket from "./Cgamesocket";
import { Duplex } from "stream";
import { Socket } from "net";

class WebsocketServer {
  private __pingInterval: NodeJS.Timeout | null = null;

  websocket: Server;
  accountDatabase: AccountDatabaseGrouped;
  socketHandler: WebsocketSocketHandler;

  constructor() {
    console.log("WebsocketServer constructed", { pid: process.pid, time: Date.now() });

    this.websocket = new Server({
      noServer: true,
      perMessageDeflate: this.__getCompressionConfiguration(),
    });

    // ---- Standard heartbeat implementation ----
    this.websocket.on("connection", (ws: any) => {
      ws.isAlive = true;
      ws.on("pong", () => (ws.isAlive = true));
    });

    if (this.__pingInterval) clearInterval(this.__pingInterval);
    this.__pingInterval = setInterval(() => {
      for (const ws of this.websocket.clients as any) {
        if (ws.isAlive === false) {
          ws.terminate();
          continue;
        }
        ws.isAlive = false;
        ws.ping();
      }
    }, 20000);

    this.accountDatabase = new AccountDatabaseGrouped(CONFIG.DATABASE.ACCOUNT_DATABASE);
    this.socketHandler = new WebsocketSocketHandler();

    this.websocket.on("connection", (socket: WebSocket, request: IncomingMessage, characterId: number, uid: string) => {
      this.__handleConnection(socket, request, characterId, uid);
    });

    this.websocket.on("close", this.__handleClose.bind(this));
  }

  public getDataDetails() {
    return { sockets: this.socketHandler.getTotalConnectedSockets() };
  }

  public upgrade(req: IncomingMessage,socket: Socket, head: Buffer,characterId: number,uid: string) {
    socket.setTimeout(0);
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 15000);
  
    this.websocket.handleUpgrade(req, socket, head, (ws: any) => {
  
      // 🔥 IMPORTANT: ws creates its own socket — keep THAT alive too
      const s = ws._socket;
      s.setTimeout(0);
      s.setNoDelay(true);
      s.setKeepAlive(true, 15000);
  
      this.websocket.emit("connection", ws, req, characterId, uid);
    });
  }

  public close() {
    if (this.__pingInterval) clearInterval(this.__pingInterval);
    this.__pingInterval = null;

    this.socketHandler.disconnectClients();
    this.websocket.close();
  }

  private __handleClose() {
    this.accountDatabase.close();
  }

  private __handleConnection(socket: WebSocket, request: IncomingMessage, characterId: number, uid: string) {
    const gameSocket = new GameSocket(socket, uid);
    gameSocket.characterId = characterId;

    if (this.socketHandler.isOverpopulated()) return gameSocket.closeError("Server is full.");
  
    this.__acceptConnection(gameSocket, characterId, uid);
  }

  private __acceptConnection(gameSocket: GameSocket, characterId: number, uid: string) {
    gameSocket.socket.once("close", () => this.__handleSocketClose(gameSocket));
    this.__handleLoginRequest(gameSocket, characterId, uid);
  }

  private __handleLoginRequest(gameSocket: GameSocket, characterId: number, uid: string) {
    this.accountDatabase.getCharacterByIdForUser(characterId, uid, (error, result) => {
      if (error || !result) return gameSocket.closeError("Character not found.");

      const character = this.accountDatabase.characterDataToLegacyFormat(result);
      this.__acceptCharacterConnection(gameSocket, character);
    });
  }

  private __acceptCharacterConnection(gameSocket: GameSocket, data: any) {
    // Check server status now that we have character data (allows role > 1 to bypass)
    const gameServer = getGameServer();
    const isShutdown = gameServer.isShutdown();
    const isClosed = gameServer.isClosed();
    const isMaintenance = gameServer.isMaintenance();
    
    // Only check if server is actually closed, shutting down, or in maintenance
    // When server is OPEN, all are false, so this block is skipped
    if (isShutdown || isClosed || isMaintenance) {
      // Check if player has role > 1 (senior tutors, gamemasters, gods) - allow them to connect
      const role = data.properties?.role;
      const hasHighRole = role !== undefined && role !== null && role > 1;
      
      console.log(`[Connection] Server status check - isShutdown: ${isShutdown}, isClosed: ${isClosed}, isMaintenance: ${isMaintenance}, role: ${role}, hasHighRole: ${hasHighRole}`);
      
      if (!hasHighRole) {
        if (isShutdown) {
          return gameSocket.closeError("Server is shutting down.");
        }
        if (isClosed) {
          return gameSocket.closeError("Server is closed.");
        }
        if (isMaintenance) {
          return gameSocket.closeError("Server is in maintenance mode.");
        }
      }
      // Player with role > 1 - allow connection even when server is closed/maintenance
    }
    
    // Server is OPEN (or player with role > 1 when closed/maintenance) - proceed with connection

    this.socketHandler.referenceSocket(gameSocket);

    const existing = getGameServer().world.creatureHandler.getPlayerByName(data.properties.name);
    if (!existing) return getGameServer().world.creatureHandler.createNewPlayer(gameSocket, data);

    if (CONFIG.SERVER.ON_ALREADY_ONLINE === "replace") return existing.socketHandler.attachController(gameSocket);
    if (CONFIG.SERVER.ON_ALREADY_ONLINE === "spectate") return existing.socketHandler.addSpectator(gameSocket);

    gameSocket.closeError("Already online.");
  }

  private __handleSocketClose(gameSocket: GameSocket) {
    this.socketHandler.dereferenceSocket(gameSocket);
    if (!gameSocket.player) return;

    if (!gameSocket.player.isInCombat() || getGameServer().isClosed() || getGameServer().isMaintenance()) {
      return this.__removePlayer(gameSocket);
    }

    const event = getGameServer().world.eventQueue.addEvent(
      this.__removePlayer.bind(this, gameSocket),
      gameSocket.player.combatLock.remainingFrames()
    );

    gameSocket.player.socketHandler.setLogoutEvent(event);
  }

  private __removePlayer(gameSocket: GameSocket) {
    const id = gameSocket.characterId;
    if (!id) return;

    getGameServer().world.creatureHandler.removePlayerFromWorld(gameSocket);

    // Don't save player data if server is closing, closed, or in maintenance (except for role > 1 players who need to manage the server)
    const gameServer = getGameServer();
    const role = gameSocket.player?.getProperty(CONST.PROPERTIES.ROLE);
    const hasHighRole = role !== undefined && role !== null && role > 1;
    
    if ((gameServer.isShutdown() || gameServer.isClosed() || gameServer.isMaintenance()) && !hasHighRole) {
      console.log(`Player ${gameSocket.player?.getProperty(CONST.PROPERTIES.NAME)} disconnected during server shutdown/maintenance - data not saved.`);
      return;
    }

    this.accountDatabase.updateCharacterData(id, JSON.stringify(gameSocket.player), () => {});
  }

  private __getCompressionConfiguration(): boolean | object {
    if (!CONFIG.SERVER.COMPRESSION.ENABLED) return false;
    return {
      clientNoContextTakeover: true,
      serverNoContextTakeover: true,
      threshold: CONFIG.SERVER.COMPRESSION.THRESHOLD,
      zlibDeflateOptions: { level: CONFIG.SERVER.COMPRESSION.LEVEL },
    };
  }
}

export default WebsocketServer;
