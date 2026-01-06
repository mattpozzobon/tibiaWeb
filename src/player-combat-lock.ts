"use strict";

import GenericLock from "./generic-lock";
import { CombatLockPacket } from "./protocol";


class CombatLock extends GenericLock {
  private __player: any;

  constructor(player: any) {
    /*
     * Class CombatLock
     * Wrapper for the player combat lock so they cannot log out when they are in combat
     */

    // Call the parent constructor
    super();

    // Owner of the lock
    this.__player = player;

    // Assign the callbacks to write true or false during lock/unlock to client
    this.on("unlock", this.__writeChangeCombat.bind(this, false));
    this.on("lock", this.__writeChangeCombat.bind(this, true));
  }

  activate(): void {
    /*
     * Function CombatLock.activate
     * Triggers or extends the combat lock
     */
    const COMBAT_LOCK_SECONDS = 3;
    this.lockSeconds(COMBAT_LOCK_SECONDS);
  }

  private __writeChangeCombat(state: boolean): void {
    /*
     * Function CombatLock.__writeChangeCombat
     * Writes a packet to the client to update the state of the combat lock
     */
    this.__player.write(new CombatLockPacket(state));
  }
}

export default CombatLock;
