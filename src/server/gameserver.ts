import Database from "../database/database";
import GameLoop from "./gameloop";
import { CONFIG, CONST } from "../helper/appContext";
import HTTPServer from "./http-server";
import { IPCSocket } from "../network/ipcsocket";
import { IDatabase } from "../interfaces/IDatabase";
import { IWorld } from "../interfaces/IWorld";
import { IGameServer } from "../interfaces/IGameserver";
import { AccountDatabaseGrouped } from "../database/account-database-grouped";
import { ServerStatusManager } from "./server-status-manager";
import { ScheduledShutdown } from "./scheduled-shutdown";

class GameServer implements IGameServer {
  database: IDatabase;
  accountDatabase: AccountDatabaseGrouped;
  world!: IWorld;
  gameLoop: GameLoop;
  server: HTTPServer;
  IPCSocket: IPCSocket;

  public readonly statusManager: ServerStatusManager;
  private __initialized: number | null;
  private __shutdownTimeout: NodeJS.Timeout | null = null;
  private __scheduledShutdown: ScheduledShutdown | null = null;

  constructor() {
    this.statusManager = new ServerStatusManager();

    // Setup signal handlers for graceful shutdown
    process.on("SIGINT", this.scheduleShutdown.bind(this, CONFIG.SERVER.MS_SHUTDOWN_SCHEDULE));
    process.on("SIGTERM", this.scheduleShutdown.bind(this, CONFIG.SERVER.MS_SHUTDOWN_SCHEDULE));

    // Initialize core components
    this.database = new Database();
    this.accountDatabase = new AccountDatabaseGrouped(process.env.ACCOUNT_DATABASE || CONFIG.DATABASE.ACCOUNT_DATABASE);
    this.gameLoop = new GameLoop(CONFIG.SERVER.MS_TICK_INTERVAL, this.__loop.bind(this));
    this.server = new HTTPServer(CONFIG.SERVER.HOST, CONFIG.SERVER.PORT);
    this.IPCSocket = new IPCSocket();

    this.__initialized = null;
  }

  // ============================================================================
  // Initialization & Lifecycle
  // ============================================================================

  initialize(): void {
    this.statusManager.setOpen();
    this.__initialized = Date.now();

    this.database.initialize();
    this.gameLoop.initialize();
    this.server.listen();

    // Initialize scheduled shutdown if enabled
    if (CONFIG.SERVER.SCHEDULED_SHUTDOWN.ENABLED) {
      this.__scheduledShutdown = new ScheduledShutdown(this);
      this.__scheduledShutdown.start();
    }
  }

  shutdown(): void {
    console.log("The game server is shutting down.");

    // Stop scheduled shutdown if running
    if (this.__scheduledShutdown) {
      this.__scheduledShutdown.stop();
    }

    this.__cancelShutdownTimeout();
    this.statusManager.setClosed();

    this.server.close();
    this.IPCSocket.close();
  }

  // ============================================================================
  // Server Status Management
  // ============================================================================

  getStatusInfo(): {
    status: string;
    playersOnline: number;
    uptime: number | null;
    worldTime: string;
  } {
    const playersOnline = this.world.creatureHandler.getConnectedPlayers().size;
    const uptime = this.__initialized ? Date.now() - this.__initialized : null;
    const worldTime = this.world.clock.getTimeString();

    return {
      status: this.statusManager.getStatus() || CONFIG.SERVER.STATUS.CLOSED,
      playersOnline,
      uptime,
      worldTime,
    };
  }

  // ============================================================================
  // Shutdown & Maintenance Management
  // ============================================================================

  scheduleShutdown(seconds: number): void {
    if (!this.statusManager.canShutdown()) {
      return console.log("Shutdown command refused because the server is already shutting down.");
    }

    this.__cancelShutdownTimeout();
    this.statusManager.setClosing();
    this.world.broadcastMessage(
      `The gameserver is closing in ${Math.floor(seconds / 1000)} seconds. Please log out in a safe place.`
    );

    this.__shutdownTimeout = setTimeout(this.shutdown.bind(this), seconds);
  }

  cancelShutdown(): void {
    if (!this.statusManager.isClosing()) {
      return;
    }

    this.__cancelShutdownTimeout();
    this.statusManager.setOpen();
    this.server.listen();
    this.world.broadcastMessage("The gameserver is now open for connections.");
  }

  reopen(): void {
    if (!this.statusManager.canReopen()) {
      return;
    }

    this.statusManager.setOpen();
    this.server.listen();
    this.world.broadcastMessage("The gameserver is now open for connections.");
    console.log("Server reopened and is now accepting connections.");
  }

  logoutNonAdminPlayers(seconds: number = 0): void {
    if (!this.statusManager.canEnterMaintenance()) {
      return console.log(
        "Close command refused because the server is already closed, closing, or in maintenance."
      );
    }

    this.__cancelShutdownTimeout();

    const logoutPlayers = () => {
      const connectedSockets = this.server.websocketServer.socketHandler.getConnectedSockets();
      const socketsToCheck = Array.from(connectedSockets);
      let loggedOut = 0;

      socketsToCheck.forEach((gameSocket) => {
        if (!gameSocket.player) return;

        const role = gameSocket.player.getProperty(CONST.PROPERTIES.ROLE);

        // Logout players with role <= 1 (keep only role > 1: senior tutors, gamemasters, gods)
        const shouldLogout = role === undefined || role === null || role <= 1;

        if (shouldLogout) {
          // Force immediate removal - bypass combat checks
          if (gameSocket.isController()) {
            this.world.creatureHandler.removePlayerFromWorld(gameSocket);
          } else {
            this.world.creatureHandler.removePlayer(gameSocket.player);
          }

          gameSocket.close();
          loggedOut++;
        }
      });

      this.statusManager.setMaintenance();

      const message =
        loggedOut > 0
          ? `Server is now in maintenance. ${loggedOut} player(s) have been logged out.`
          : "Server is now in maintenance.";

      console.log(
        loggedOut > 0
          ? `Logged out ${loggedOut} player(s). Server is now in maintenance. Players with role > 1 remain connected.`
          : "No players to logout. Server is now in maintenance."
      );
      this.world.broadcastMessage(message);
    };

    if (seconds > 0) {
      this.statusManager.setClosing();
      this.world.broadcastMessage(
        `The gameserver will enter maintenance mode in ${Math.floor(seconds / 1000)} seconds. Players with role > 1 will remain connected.`
      );
      this.__shutdownTimeout = setTimeout(logoutPlayers, seconds);
    } else {
      logoutPlayers();
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private __loop(): void {
    this.server.websocketServer.socketHandler.flushSocketBuffers();
    this.world.tick();
  }

  private __cancelShutdownTimeout(): void {
    if (this.__shutdownTimeout) {
      clearTimeout(this.__shutdownTimeout);
      this.__shutdownTimeout = null;
    }
  }
}

export default GameServer;
