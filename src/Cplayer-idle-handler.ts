import { ServerMessagePacket } from "./Cprotocol";

import { CONFIG } from "./helper/appContext";
import GenericLock from "./Cgeneric-lock";
import { IPlayer } from "./interfaces/IPlayer";

export class PlayerIdleHandler {
  private __informLock: GenericLock;
  private __kickLock: GenericLock;

  constructor(private player: IPlayer) {
    /*
     * Class PlayerIdleHandler
     * Handles idle behavior of player and informs and kicks them after a set number of seconds
     */
    this.__informLock = new GenericLock();
    this.__kickLock = new GenericLock();

    // When these locks run out apply these callback functions
    this.__informLock.on("unlock", this.__warnPlayer.bind(this));
    this.__kickLock.on("unlock", this.player.disconnect.bind(this.player));

    // Start them locked
    this.extend();
  }

  extend(): void {
    /*
     * PlayerIdleHandler.extend
     * Call this function to reset and extend the idle handler
     */
    // Lock or extend the inform and kick locks
    this.__informLock.lockSeconds(CONFIG.WORLD.IDLE.WARN_SECONDS);
    this.__kickLock.lockSeconds(
      CONFIG.WORLD.IDLE.WARN_SECONDS + CONFIG.WORLD.IDLE.KICK_SECONDS
    );
  }

  private __warnPlayer(): void {
    /*
     * PlayerIdleHandler.__warnPlayer
     * Warns the player they have been idle and are about to be disconnected from the game 
     */
    const warning = `You have been idle for ${CONFIG.WORLD.IDLE.WARN_SECONDS} seconds and will be disconnected after ${CONFIG.WORLD.IDLE.KICK_SECONDS} seconds.`;
    this.player.write(new ServerMessagePacket(warning));
  }

  cleanup(): void {
    /*
     * Function PlayerIdleHandler.cleanup
     * Cleans up the remaining idle functions
     */
    // Cancelling the events is enough
    this.__informLock.cancel();
    this.__kickLock.cancel();
  }
}
