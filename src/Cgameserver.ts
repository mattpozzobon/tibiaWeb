import Database from "./Cdatabase";
import { Config } from "./types/config";
import GameLoop from "./Cgameloop";
import { CONFIG } from "./helper/appContext";
import HTTPServer from "./Chttp-server";
import { IPCSocket } from "./Cipcsocket";
import { IDatabase } from "interfaces/IDatabase";
import { IWorld } from "interfaces/IWorld";
import { IGameServer } from "interfaces/IGameserver";


class GameServer implements IGameServer{
  database: IDatabase;
  world!: IWorld;
  gameLoop: GameLoop;
  server: HTTPServer;
  IPCSocket: IPCSocket;
  private __serverStatus: string | null;
  private __initialized: number | null;

  private SERVER: Config["SERVER"];
  private STATUS: Config["SERVER"]["STATUS"];
  
  constructor(config: Config) {
    this.SERVER = config.SERVER;
    this.STATUS = config.SERVER.STATUS;

    // Signal interrupt received: gracefully shut down server
    process.on('SIGINT', this.scheduleShutdown.bind(this, this.SERVER.MS_SHUTDOWN_SCHEDULE));
    process.on('SIGTERM', this.scheduleShutdown.bind(this, this.SERVER.MS_SHUTDOWN_SCHEDULE));

    // Connect to the information database that keeps all the server data
    this.database = new Database();

    // Create the game loop with an interval and callback function
    this.gameLoop = new GameLoop(CONFIG.SERVER.MS_TICK_INTERVAL, this.__loop.bind(this));

    // Open the server for HTTP connections
    this.server = new HTTPServer(CONFIG.SERVER.HOST, CONFIG.SERVER.PORT);

    // The IPC socket for communicating with the server
    this.IPCSocket = new IPCSocket();

    // State variables to keep the current server status
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

    this.setServerStatus(this.STATUS.CLOSING);
    this.world.broadcastMessage(
      `The gameserver is closing in ${Math.floor(seconds / 1000)} seconds. Please log out in a safe place.`
    );

    setTimeout(this.shutdown.bind(this), seconds);
  }

  private __loop(): void {
    this.server.websocketServer.socketHandler.flushSocketBuffers();
    this.world.tick();
  }

  isClosed(): boolean {
    return this.__serverStatus === this.STATUS.CLOSED;
  }

  private __handleUncaughtException(error: Error, origin: string): void {
    console.error(`Uncaught Exception at ${origin}:`, error);
    this.shutdown();
  }
}

export default GameServer;
