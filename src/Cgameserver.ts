import Database from "./Cdatabase";
import { Config } from "./types/config";
import GameLoop from "./Cgameloop";
import { CONFIG, CONST } from "./helper/appContext";
import HTTPServer from "./Chttp-server";
import { IPCSocket } from "./Cipcsocket";
import { IDatabase } from "interfaces/IDatabase";
import { IWorld } from "interfaces/IWorld";
import { IGameServer } from "interfaces/IGameserver";
import { AccountDatabaseGrouped } from "./Caccount-database-grouped";


class GameServer implements IGameServer{
  database: IDatabase;
  accountDatabase: AccountDatabaseGrouped;
  world!: IWorld;
  gameLoop: GameLoop;
  server: HTTPServer;
  IPCSocket: IPCSocket;
  private __serverStatus: string | null;
  private __initialized: number | null;
  private __shutdownTimeout: NodeJS.Timeout | null = null;

  private SERVER: Config["SERVER"];
  private STATUS: Config["SERVER"]["STATUS"];
  
  constructor(config: Config) {
    this.SERVER = config.SERVER;
    this.STATUS = config.SERVER.STATUS;
  
    process.on("SIGINT", this.scheduleShutdown.bind(this, this.SERVER.MS_SHUTDOWN_SCHEDULE));
    process.on("SIGTERM", this.scheduleShutdown.bind(this, this.SERVER.MS_SHUTDOWN_SCHEDULE));
  
    // Main world DB
    this.database = new Database();
  
    // Account / character DB (Fly volume-safe)
    this.accountDatabase = new AccountDatabaseGrouped(process.env.ACCOUNT_DATABASE || CONFIG.DATABASE.ACCOUNT_DATABASE);
  
    // Game loop
    this.gameLoop = new GameLoop(config.SERVER.MS_TICK_INTERVAL, this.__loop.bind(this));
  
    // Public TCP/WebSocket game server
    this.server = new HTTPServer(config.SERVER.HOST, config.SERVER.PORT);
  
    // IPC socket
    this.IPCSocket = new IPCSocket();
  
    this.__serverStatus = null;
    this.__initialized = null;
  }
  

  isShutdown(): boolean {
    return this.__serverStatus === this.SERVER.STATUS.CLOSING;
  }

  initialize(): void {
    this.__serverStatus = this.STATUS.OPEN;
    this.__initialized = Date.now();

    this.database.initialize();
    this.gameLoop.initialize();
    this.server.listen();
  }

  setServerStatus(serverStatus: string): void {
    this.__serverStatus = serverStatus;
  }

  shutdown(): void {
    console.log('The game server is shutting down.');
    
    // Clear any pending shutdown timeout
    if (this.__shutdownTimeout) {
      clearTimeout(this.__shutdownTimeout);
      this.__shutdownTimeout = null;
    }
    
    this.setServerStatus(this.STATUS.CLOSED);

    this.server.close();
    this.IPCSocket.close();
  }

  isFeatureEnabled(): boolean {
    return parseInt(this.SERVER.CLIENT_VERSION, 10) > 1000;
  }

  scheduleShutdown(seconds: number): void {
    if (this.__serverStatus === this.STATUS.CLOSING) {
      return console.log('Shutdown command refused because the server is already shutting down.');
    }

    // Cancel any existing shutdown timeout
    if (this.__shutdownTimeout) {
      clearTimeout(this.__shutdownTimeout);
      this.__shutdownTimeout = null;
    }

    this.setServerStatus(this.STATUS.CLOSING);
    this.world.broadcastMessage(
      `The gameserver is closing in ${Math.floor(seconds / 1000)} seconds. Please log out in a safe place.`
    );

    this.__shutdownTimeout = setTimeout(this.shutdown.bind(this), seconds);
  }

  cancelShutdown(): void {
    if (this.__serverStatus !== this.STATUS.CLOSING) {
      return;
    }

    if (this.__shutdownTimeout) {
      clearTimeout(this.__shutdownTimeout);
      this.__shutdownTimeout = null;
    }

    this.setServerStatus(this.STATUS.OPEN);
    this.server.listen(); // Re-open the HTTP server
    this.world.broadcastMessage("The gameserver is now open for connections.");
  }

  reopen(): void {
    if (this.__serverStatus !== this.STATUS.CLOSED && this.__serverStatus !== this.STATUS.MAINTENANCE) {
      return;
    }

    this.setServerStatus(this.STATUS.OPEN);
    this.server.listen(); // Re-open the HTTP server
    this.world.broadcastMessage("The gameserver is now open for connections.");
    console.log('Server reopened and is now accepting connections.');
  }

  logoutNonAdminPlayers(seconds: number = 0): void {
    if (this.__serverStatus === this.STATUS.CLOSING || this.__serverStatus === this.STATUS.CLOSED || this.__serverStatus === this.STATUS.MAINTENANCE) {
      return console.log('Close command refused because the server is already closed, closing, or in maintenance.');
    }

    // Cancel any existing shutdown timeout
    if (this.__shutdownTimeout) {
      clearTimeout(this.__shutdownTimeout);
      this.__shutdownTimeout = null;
    }
    
    const logoutPlayers = () => {
      const connectedSockets = this.server.websocketServer.socketHandler.getConnectedSockets();
      let loggedOut = 0;
      
      // Create a copy of the set to avoid modification during iteration
      const socketsToCheck = Array.from(connectedSockets);
      
      socketsToCheck.forEach((gameSocket) => {
        if (gameSocket.player) {
          const role = gameSocket.player.getProperty(CONST.PROPERTIES.ROLE);
          const name = gameSocket.player.getProperty(CONST.PROPERTIES.NAME);
          console.log(`Checking player: ${name}, role: ${role} (type: ${typeof role})`);
          
          // Logout players with role <= 1 (keep only senior tutors, gamemasters, and gods - role > 1)
          // Handle undefined/null roles as regular players (role 0)
          if (role === undefined || role === null || role <= 1) {
            console.log(`Logging out player: ${name} (role: ${role})`);
            
            // Force immediate removal - bypass combat checks
            if (gameSocket.player) {
              // Remove player from world immediately (bypasses combat lock)
              if (gameSocket.isController()) {
                this.world.creatureHandler.removePlayerFromWorld(gameSocket);
              } else {
                // If not controller, remove player directly
                this.world.creatureHandler.removePlayer(gameSocket.player);
              }
            }
            
            // Close the socket
            gameSocket.close();
            loggedOut++;
          } else {
            console.log(`Keeping player: ${name} (role: ${role})`);
          }
        }
      });
      
      // Set status to MAINTENANCE after kicking players (allows role > 1 to stay)
      this.setServerStatus(this.STATUS.MAINTENANCE);
      
      if (loggedOut > 0) {
        console.log(`Logged out ${loggedOut} player(s). Server is now in maintenance. Players with role > 1 remain connected.`);
        this.world.broadcastMessage(`Server is now in maintenance. ${loggedOut} player(s) have been logged out.`);
      } else {
        console.log('No players to logout. Server is now in maintenance.');
        this.world.broadcastMessage('Server is now in maintenance.');
      }
    };

    if (seconds > 0) {
      this.setServerStatus(this.STATUS.CLOSING);
      this.world.broadcastMessage(
        `The gameserver will enter maintenance mode in ${Math.floor(seconds / 1000)} seconds. Players with role > 1 will remain connected.`
      );
      this.__shutdownTimeout = setTimeout(logoutPlayers, seconds);
    } else {
      logoutPlayers();
    }
  }

  private __loop(): void {
    this.server.websocketServer.socketHandler.flushSocketBuffers();
    this.world.tick();
  }

  isClosed(): boolean {
    return this.__serverStatus === this.STATUS.CLOSED;
  }

  isMaintenance(): boolean {
    return this.__serverStatus === this.STATUS.MAINTENANCE;
  }

  getStatusInfo(): {
    status: string;
    playersOnline: number;
    uptime: number | null;
    activeMonsters: number;
    worldTime: string;
  } {
    const playersOnline = this.world.creatureHandler.getConnectedPlayers().size;
    const worldData = this.world.getDataDetails();
    const uptime = this.__initialized ? Date.now() - this.__initialized : null;
    // Get time directly from clock to ensure it's always current (especially after /time command)
    const worldTime = this.world.clock.getTimeString();

    return {
      status: this.__serverStatus || this.STATUS.CLOSED,
      playersOnline,
      uptime,
      activeMonsters: worldData.activeMonsters,
      worldTime,
    };
  }

  private __handleUncaughtException(error: Error, origin: string): void {
    console.error(`Uncaught Exception at ${origin}:`, error);
    this.shutdown();
  }
}

export default GameServer;
