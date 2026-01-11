import Database from "../database/database";
import GameLoop from "./gameloop";
import { CONFIG, CONST } from "../helper/appContext";
import HTTPServer from "./http-server";
import { IPCSocket } from "../network/ipcsocket";
import { World } from "../world/world";
import { AccountDatabaseGrouped } from "../database/account-database-grouped";
import { ServerStatusManager } from "./server-status-manager";
import { ShutdownManager } from "./shutdown-Manager";

class GameServer {
  database: Database;
  accountDatabase: AccountDatabaseGrouped;
  world!: World;
  gameLoop: GameLoop;
  server: HTTPServer;
  IPCSocket: IPCSocket;

  public readonly statusManager: ServerStatusManager;
  public readonly shutdownManager: ShutdownManager;
  private __initialized: number | null;

  constructor() {
    this.statusManager = new ServerStatusManager();

    // Initialize core components
    this.database = new Database();
    this.accountDatabase = new AccountDatabaseGrouped(process.env.ACCOUNT_DATABASE || CONFIG.DATABASE.ACCOUNT_DATABASE);
    this.gameLoop = new GameLoop(CONFIG.SERVER.MS_TICK_INTERVAL, this.__loop.bind(this));
    this.server = new HTTPServer(CONFIG.SERVER.HOST, CONFIG.SERVER.PORT);
    this.IPCSocket = new IPCSocket();

    // Initialize shutdown manager (this also sets up signal handlers)
    this.shutdownManager = new ShutdownManager(this);
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

    // Start scheduled shutdown if enabled
    if (CONFIG.SERVER.SCHEDULED_SHUTDOWN.ENABLED) {
      this.shutdownManager.startScheduledShutdown();
    }
  }

  // ============================================================================
  // Server Status Management
  // ============================================================================

  getStatusInfo(): {
    status: string;
    playersOnline: number;
    uptime: number | null;
    worldTime: string;
    scheduledShutdownTime: string | null;
  } {
    const playersOnline = this.world.creatureHandler.getConnectedPlayers().size;
    const uptime = this.__initialized ? Date.now() - this.__initialized : null;
    const worldTime = this.world.clock.getTimeString();
    
    // Calculate the next scheduled shutdown datetime in ISO 8601 format
    let scheduledShutdownTime: string | null = null;
    if (CONFIG.SERVER.SCHEDULED_SHUTDOWN.ENABLED) {
      const [shutdownHour, shutdownMinute] = CONFIG.SERVER.SCHEDULED_SHUTDOWN.TIME.split(":").map(Number);
      const now = new Date();
      const shutdownDate = new Date();
      shutdownDate.setHours(shutdownHour, shutdownMinute, 0, 0);
      
      // If the shutdown time has already passed today, set it for tomorrow
      if (shutdownDate <= now) {
        shutdownDate.setDate(shutdownDate.getDate() + 1);
      }
      
      // Return as ISO 8601 string for easy frontend conversion to local time
      scheduledShutdownTime = shutdownDate.toISOString();
    }

    return {
      status: this.statusManager.getStatus() || CONFIG.SERVER.STATUS.CLOSED,
      playersOnline,
      uptime,
      worldTime,
      scheduledShutdownTime,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private __loop(): void {
    this.server.websocketServer.socketHandler.flushSocketBuffers();
    this.world.tick();
  }
}

export default GameServer;
