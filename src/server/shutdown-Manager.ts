import { CONFIG } from "../config/config";
import { CONST } from "../helper/appContext";
import { spawn } from "child_process";
import * as path from "path";
import type GameServer from "./gameserver";
import type Player from "../creature/player/player";

/**
 * Shutdown Manager
 * Handles all server shutdown operations including:
 * - Daily scheduled shutdowns with player saving and database backup
 * - Manual shutdowns (via signals or commands)
 * - Maintenance mode (logout non-admin players)
 */
export class ShutdownManager {
  private gameServer: GameServer;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastCheckDate: string = "";
  private warningTimers: NodeJS.Timeout[] = [];
  private shutdownTriggered: boolean = false;
  private warningsScheduled: boolean = false;
  private shutdownTimeout: NodeJS.Timeout | null = null;

  constructor(gameServer: GameServer) {
    this.gameServer = gameServer;
    
    // Setup signal handlers for graceful shutdown
    process.on("SIGINT", this.scheduleShutdown.bind(this, CONFIG.SERVER.MS_SHUTDOWN_SCHEDULE / 1000));
    process.on("SIGTERM", this.scheduleShutdown.bind(this, CONFIG.SERVER.MS_SHUTDOWN_SCHEDULE / 1000));
  }

  /**
   * Start the scheduled shutdown scheduler
   */
  public startScheduledShutdown(): void {
    if (!CONFIG.SERVER.SCHEDULED_SHUTDOWN.ENABLED) {
      console.log("Scheduled shutdown is disabled.");
      return;
    }

    const shutdownTime = CONFIG.SERVER.SCHEDULED_SHUTDOWN.TIME;
    console.log(`Scheduled shutdown enabled. Server will shutdown daily at ${shutdownTime}`);

    // Check every second for precise timing
    this.checkInterval = setInterval(() => {
      this.checkShutdownTime();
    }, 1000); // Check every second

    // Do an initial check
    this.checkShutdownTime();
  }

  /**
   * Stop the scheduled shutdown scheduler
   */
  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    // Clear all warning timers
    this.warningTimers.forEach(timer => clearTimeout(timer));
    this.warningTimers = [];
    // Clear manual shutdown timeout
    this.cancelShutdownTimeout();
  }

  // ============================================================================
  // Manual Shutdown Management
  // ============================================================================

  /**
   * Schedule a manual shutdown after specified seconds
   */
  public scheduleShutdown(seconds: number): void {
    const ms = seconds * 1000;
    if (!this.gameServer.statusManager.canShutdown()) {
      return console.log("Shutdown command refused because the server is already shutting down.");
    }

    this.cancelShutdownTimeout();
    this.gameServer.statusManager.setClosing();
    
    if (this.gameServer.world) {
      this.gameServer.world.broadcastMessage(
        `The gameserver is closing in ${seconds} seconds. Please log out in a safe place.`
      );
    }

    this.shutdownTimeout = setTimeout(() => {
      this.shutdown();
    }, ms);
  }

  /**
   * Cancel a scheduled shutdown
   */
  public cancelShutdown(): void {
    if (!this.gameServer.statusManager.isClosing()) {
      return;
    }

    this.cancelShutdownTimeout();
    this.gameServer.statusManager.setOpen();
    this.gameServer.server.listen();
    
    if (this.gameServer.world) {
      this.gameServer.world.broadcastMessage("The gameserver is now open for connections.");
    }
  }

  /**
   * Reopen the server (exit maintenance/closed mode)
   */
  public reopen(): void {
    if (!this.gameServer.statusManager.canReopen()) {
      return;
    }

    this.gameServer.statusManager.setOpen();
    this.gameServer.server.listen();
    
    if (this.gameServer.world) {
      this.gameServer.world.broadcastMessage("The gameserver is now open for connections.");
    }
    console.log("Server reopened and is now accepting connections.");
  }

  /**
   * Perform shutdown (without restart)
   */
  public shutdown(): void {
    console.log("The game server is shutting down.");

    // Stop scheduled shutdown if running
    this.stop();

    this.cancelShutdownTimeout();
    this.gameServer.statusManager.setClosed();

    this.gameServer.server.close();
    this.gameServer.IPCSocket.close();
  }

  /**
   * Logout non-admin players (enter maintenance mode)
   * @param seconds - Delay in seconds before logging out players (0 = immediate)
   */
  public logoutNonAdminPlayers(seconds: number = 0): void {
    const ms = seconds * 1000;
    if (!this.gameServer.statusManager.canEnterMaintenance()) {
      return console.log(
        "Close command refused because the server is already closed, closing, or in maintenance."
      );
    }

    this.cancelShutdownTimeout();

    const logoutPlayers = () => {
      const connectedSockets = this.gameServer.server.websocketServer.socketHandler.getConnectedSockets();
      const socketsToCheck = Array.from(connectedSockets);
      let loggedOut = 0;

      socketsToCheck.forEach((gameSocket: any) => {
        if (!gameSocket.player) return;

        const role = gameSocket.player.getProperty(CONST.PROPERTIES.ROLE);

        // Logout players with role <= 1 (keep only role > 1: senior tutors, gamemasters, gods)
        const shouldLogout = role === undefined || role === null || role <= 1;

        if (shouldLogout) {
          // Force immediate removal - bypass combat checks
          if (gameSocket.isController()) {
            this.gameServer.world.creatureHandler.removePlayerFromWorld(gameSocket);
          } else {
            this.gameServer.world.creatureHandler.removePlayer(gameSocket.player);
          }

          gameSocket.close();
          loggedOut++;
        }
      });

      this.gameServer.statusManager.setMaintenance();

      const message =
        loggedOut > 0
          ? `Server is now in maintenance. ${loggedOut} player(s) have been logged out.`
          : "Server is now in maintenance.";

      console.log(
        loggedOut > 0
          ? `Logged out ${loggedOut} player(s). Server is now in maintenance. Players with role > 1 remain connected.`
          : "No players to logout. Server is now in maintenance."
      );
      
      if (this.gameServer.world) {
        this.gameServer.world.broadcastMessage(message);
      }
    };

    if (seconds > 0) {
      this.gameServer.statusManager.setClosing();
      if (this.gameServer.world) {
        this.gameServer.world.broadcastMessage(
          `The gameserver will enter maintenance mode in ${seconds} seconds. Players with role > 1 will remain connected.`
        );
      }
      this.shutdownTimeout = setTimeout(logoutPlayers, ms);
    } else {
      logoutPlayers();
    }
  }

  /**
   * Cancel shutdown timeout
   */
  private cancelShutdownTimeout(): void {
    if (this.shutdownTimeout) {
      clearTimeout(this.shutdownTimeout);
      this.shutdownTimeout = null;
    }
  }

  // ============================================================================
  // Scheduled Shutdown Management
  // ============================================================================

  /**
   * Check if it's time to shutdown or send warnings
   */
  private checkShutdownTime(): void {
    const now = new Date();
    const currentDate = now.toDateString();
    const [shutdownHour, shutdownMinute] = CONFIG.SERVER.SCHEDULED_SHUTDOWN.TIME.split(":").map(Number);

    // Reset flags if it's a new day
    if (this.lastCheckDate !== currentDate && this.lastCheckDate !== "") {
      this.shutdownTriggered = false;
      this.warningsScheduled = false;
      // Clear any old warning timers
      this.warningTimers.forEach(timer => clearTimeout(timer));
      this.warningTimers = [];
    }

    // If we already completed shutdown today, don't check again
    if (this.lastCheckDate === currentDate && this.shutdownTriggered) {
      return;
    }

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();

    // Calculate time until shutdown in seconds
    const currentTimeSeconds = currentHour * 3600 + currentMinute * 60 + currentSecond;
    const shutdownTimeSeconds = shutdownHour * 3600 + shutdownMinute * 60;
    let secondsUntilShutdown = shutdownTimeSeconds - currentTimeSeconds;

    // Handle case where shutdown time is tomorrow (negative seconds)
    if (secondsUntilShutdown < 0) {
      secondsUntilShutdown += 24 * 3600; // Add 24 hours
    }

    // Schedule warnings once when we're within the warning window (15 minutes)
    if (!this.warningsScheduled && secondsUntilShutdown > 0 && secondsUntilShutdown <= 15 * 60) {
      this.scheduleWarnings(secondsUntilShutdown);
      this.warningsScheduled = true;
    }

    // If shutdown time has arrived (at or past the exact time), trigger immediately
    if (secondsUntilShutdown <= 0 && !this.shutdownTriggered) {
      this.lastCheckDate = currentDate;
      this.shutdownTriggered = true;
      this.triggerScheduledShutdown();
      return;
    }
  }

  /**
   * Schedule warning messages at specific intervals before shutdown
   */
  private scheduleWarnings(secondsUntilShutdown: number): void {
    const warningMinutes = [15, 10, 5, 3, 2, 1];
    
    warningMinutes.forEach(minutes => {
      const warningSeconds = minutes * 60;
      if (secondsUntilShutdown >= warningSeconds) {
        const delayMs = (secondsUntilShutdown - warningSeconds) * 1000;
        const timer = setTimeout(() => {
          if (this.gameServer.world) {
            this.gameServer.world.broadcastMessage(
              `Server will shutdown in ${minutes} minute(s) for scheduled maintenance. Please log out safely.`
            );
            console.log(`[Scheduled Shutdown] Warning: ${minutes} minute(s) until shutdown`);
          }
        }, delayMs);
        this.warningTimers.push(timer);
      }
    });
  }

  /**
   * Trigger the scheduled shutdown process
   */
  private async triggerScheduledShutdown(): Promise<void> {
    console.log(`[Scheduled Shutdown] Triggered at ${new Date().toISOString()}`);
    
    // Safety check: ensure world is initialized
    if (!this.gameServer.world) {
      console.error("[Scheduled Shutdown] World not initialized, cannot proceed with shutdown");
      return;
    }

    // Send final warning
    this.gameServer.world.broadcastMessage(
      "Server is shutting down NOW for scheduled maintenance. All players will be disconnected."
    );
    console.log("[Scheduled Shutdown] Final warning sent, starting shutdown process...");

    // Small delay to ensure message is sent, then proceed with shutdown
    setTimeout(async () => {
      await this.performShutdown();
    }, 2000);
  }

  /**
   * Perform the actual shutdown: save players, backup database, kick players, restart
   */
  private async performShutdown(): Promise<void> {
    console.log("[Scheduled Shutdown] Starting shutdown process...");
    
    try {
      // Step 1: Save all players
      console.log("[Scheduled Shutdown] Saving all players...");
      await this.saveAllPlayers();

      // Step 2: Backup database
      console.log("[Scheduled Shutdown] Creating database backup...");
      await this.backupDatabase();

      // Step 3: Kick all players
      console.log("[Scheduled Shutdown] Kicking all players...");
      this.kickAllPlayers();

      // Step 4: Close server connections (only for scheduled shutdowns with restart)
      console.log("[Scheduled Shutdown] Closing server connections...");
      this.closeServerForRestart();

      // Step 5: Restart server (only for scheduled shutdowns)
      console.log("[Scheduled Shutdown] Restarting server...");
      this.restartServer();
    } catch (error) {
      console.error("[Scheduled Shutdown] Error during shutdown process:", error);
      // Still try to kick players and restart even if there was an error
      this.kickAllPlayers();
      this.closeServerForRestart();
      this.restartServer();
    }
  }

  /**
   * Save all connected players to the database
   */
  private async saveAllPlayers(): Promise<void> {
    if (!this.gameServer.world) {
      console.warn("[Scheduled Shutdown] World not initialized, skipping player save");
      return;
    }
    
    const connectedPlayers = this.gameServer.world.creatureHandler.getConnectedPlayers();
    const savePromises: Promise<void>[] = [];

    connectedPlayers.forEach((player: Player, playerName: string) => {
      // Find the gameSocket for this player
      const connectedSockets = this.gameServer.server.websocketServer.socketHandler.getConnectedSockets();
      
      for (const gameSocket of connectedSockets) {
        if (gameSocket.player === player && gameSocket.characterId) {
          const promise = new Promise<void>((resolve, reject) => {
            this.gameServer.accountDatabase.updateCharacterData(
              gameSocket.characterId,
              JSON.stringify(player),
              (error: Error | null) => {
                if (error) {
                  console.error(`[Scheduled Shutdown] Failed to save player ${playerName}:`, error);
                  reject(error);
                } else {
                  console.log(`[Scheduled Shutdown] Saved player ${playerName}`);
                  resolve();
                }
              }
            );
          });
          savePromises.push(promise);
          break;
        }
      }
    });

    await Promise.allSettled(savePromises);
    console.log(`[Scheduled Shutdown] Finished saving ${connectedPlayers.size} player(s)`);
  }

  /**
   * Create a backup copy of the database
   */
  private async backupDatabase(): Promise<void> {
    const fs = require("fs").promises;
    const path = require("path");
    
    const dbPath = CONFIG.DATABASE.ACCOUNT_DATABASE;
    const dbDir = path.dirname(dbPath);
    const dbName = path.basename(dbPath, path.extname(dbPath));
    const dbExt = path.extname(dbPath);
    
    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const backupPath = path.join(dbDir, `${dbName}_backup_${timestamp}${dbExt}`);

    try {
      // Copy the database file
      await fs.copyFile(dbPath, backupPath);
      console.log(`[Scheduled Shutdown] Database backed up to: ${backupPath}`);
    } catch (error) {
      console.error(`[Scheduled Shutdown] Failed to backup database:`, error);
      throw error;
    }
  }

  /**
   * Kick all connected players
   */
  private kickAllPlayers(): void {
    if (!this.gameServer.world) {
      return;
    }

    const connectedSockets = this.gameServer.server.websocketServer.socketHandler.getConnectedSockets();
    const socketsToKick = Array.from(connectedSockets);
    let kicked = 0;

    socketsToKick.forEach((gameSocket: any) => {
      if (!gameSocket.player) {
        // Close socket even if no player attached
        gameSocket.close();
        return;
      }

      const playerName = gameSocket.player.getProperty(CONST.PROPERTIES.NAME);
      
      // Force immediate removal - bypass combat checks
      if (gameSocket.isController()) {
        this.gameServer.world.creatureHandler.removePlayerFromWorld(gameSocket);
      } else {
        this.gameServer.world.creatureHandler.removePlayer(gameSocket.player);
      }

      gameSocket.close();
      kicked++;
      console.log(`[Scheduled Shutdown] Kicked player: ${playerName}`);
    });

    console.log(`[Scheduled Shutdown] Kicked ${kicked} player(s)`);
  }

  /**
   * Close all server connections (for restart)
   */
  private closeServerForRestart(): void {
    // Set server status to closing first to prevent new connections
    this.gameServer.statusManager.setClosing();
    
    // Close websocket server (this will disconnect any remaining clients)
    this.gameServer.server.websocketServer.close();
    
    // Close HTTP server (this will close all HTTP connections)
    this.gameServer.server.close();
    
    // Close IPC socket
    this.gameServer.IPCSocket.close();
    
    // Set server status to closed
    this.gameServer.statusManager.setClosed();
    
    console.log("[Scheduled Shutdown] All server connections closed");
  }

  /**
   * Restart the server by spawning a new process
   */
  private restartServer(): void {
    console.log("[Scheduled Shutdown] Restarting server...");
    
    // Find the original script that was executed
    // process.argv[0] = node/ts-node executable
    // process.argv[1] = script file
    const nodeExecutable = process.execPath;
    let scriptPath = process.argv[1];
    
    // Check if we're running with ts-node
    const isTsNode = process.argv[0].includes("ts-node") || 
                     process.argv.some(arg => arg.includes("ts-node"));
    
    // If scriptPath is not a .ts file, try to find it in argv
    if (!scriptPath || (!scriptPath.endsWith(".ts") && !scriptPath.endsWith(".js"))) {
      // Look for .ts or .js files in argv
      scriptPath = process.argv.find(arg => 
        arg.endsWith(".ts") || arg.endsWith(".js")
      ) || "server.ts";
    }
    
    // Resolve to absolute path
    const absoluteScriptPath = path.isAbsolute(scriptPath) 
      ? scriptPath 
      : path.join(process.cwd(), scriptPath);
    
    let restartCommand: string;
    let restartArgs: string[];
    
    if (isTsNode || scriptPath.endsWith(".ts")) {
      // Running with ts-node
      restartCommand = "ts-node";
      restartArgs = [absoluteScriptPath];
    } else {
      // Running compiled JavaScript
      restartCommand = nodeExecutable;
      restartArgs = [absoluteScriptPath];
    }
    
    console.log(`[Scheduled Shutdown] Spawning new process: ${restartCommand} ${restartArgs.join(" ")}`);
    console.log(`[Scheduled Shutdown] Working directory: ${process.cwd()}`);
    
    // Spawn the new process in a detached state
    const newProcess = spawn(restartCommand, restartArgs, {
      detached: true,
      stdio: "inherit",
      cwd: process.cwd(),
      env: process.env,
      shell: process.platform === "win32" // Use shell on Windows for better compatibility
    });
    
    // Unref the new process so the parent can exit
    newProcess.unref();
    
    // Handle errors
    newProcess.on("error", (error) => {
      console.error(`[Scheduled Shutdown] Failed to spawn new process:`, error);
      console.error(`[Scheduled Shutdown] Attempted command: ${restartCommand} ${restartArgs.join(" ")}`);
      console.error(`[Scheduled Shutdown] Please ensure the server is started with a process manager or manually restart it.`);
    });
    
    newProcess.on("spawn", () => {
      console.log(`[Scheduled Shutdown] New process spawned successfully (PID: ${newProcess.pid})`);
    });
    
    // Give a moment for the new process to start, then exit
    setTimeout(() => {
      console.log("[Scheduled Shutdown] Old process exiting, new process should be running...");
      process.exit(0);
    }, 2000);
  }
}
