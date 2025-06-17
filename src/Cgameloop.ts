import ServerLogger from "./Clogger";
import { CONFIG, getGameServer } from "./helper/appContext";

class GameLoop {
  private __gameLoopStart: number | null = null;
  private __gameLoopEnd: number | null = null;
  private __loopTimeout: NodeJS.Timeout | null = null;
  private __internalTickCounter: number = 0;
  private __callback: () => void;
  private __interval: number;
  private __drift: number = 0;
  private logger: ServerLogger;

  constructor(interval: number, callback: () => void) {
    /*
     * Class GameLoop
     * Wrapper for the main game server loop
     */

    this.__interval = interval;
    this.__callback = callback;
    this.logger = new ServerLogger();
  }

  initialize(): void {
    /*
     * Function GameLoop.initialize
     * Delegates to the internal looping function
     */
    this.__internalLoop();
  }

  getCurrentFrame(): number {
    /*
     * Function GameLoop.getCurrentFrame
     * Returns the current game server frame from the event queue
     */
    return this.__internalTickCounter;
  }

  getDataDetails(): { drift: number; tick: number } {
    /*
     * Function GameLoop.getDataDetails
     * Gets the data details (received & sent) from the network manager
     */
    return {
      drift: this.__drift,
      tick: this.__internalTickCounter,
    };
  }

  tickModulus(modulus: number): boolean {
    /*
     * Function GameLoop.tickModulus
     * Only returns TRUE when the tick counter passes through the modulus parameter
     */
    return this.getCurrentFrame() % modulus === 0;
  }

  private __estimateLoopDrift(): void {
    /*
     * Function GameLoop.__estimateLoopDrift
     * Estimates the game loop drift in milliseconds
     */
    this.__gameLoopStart = Date.now();

    if (this.__gameLoopEnd === null) {
      this.__drift = 0;
      return;
    }

    this.__drift =
      (this.__drift + (this.__gameLoopStart - this.__gameLoopEnd) - this.__interval) %
      -this.__interval;
  }

  private __estimateNextTimeout(): number {
    /*
     * Function GameLoop.__estimateNextTimeout
     * Calculates the timeout for the next tick
     */
    this.__gameLoopEnd = Date.now();

    const gameLoopExecutionTime = this.__gameLoopEnd - this.__gameLoopStart!;
    this.logger.__gameLoopExecutionTime += gameLoopExecutionTime;

    return this.__interval - this.__drift - gameLoopExecutionTime;
  }

  private __internalLoop(): void {
    /*
     * Function GameLoop.__internalLoop
     * The main looping function for the game server executed every server tick
     */

    this.__internalTickCounter++;

    if (getGameServer().isClosed()) {
      console.log("Game loop has been aborted.");
      return;
    }

    this.__estimateLoopDrift();
    this.__callback();

    if (this.tickModulus(CONFIG.LOGGING.INTERVAL)) {
      this.logger.log();
    }

    if (this.tickModulus(CONFIG.SERVER.MS_TICK_INTERVAL)) {
      getGameServer().server.websocketServer.socketHandler.ping();
    }

    this.__loopTimeout = setTimeout(
      this.__internalLoop.bind(this),
      Math.min(this.__interval, this.__estimateNextTimeout())
    );
  }
}

export default GameLoop;
