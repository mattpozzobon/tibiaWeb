"use strict";

import { TargetPacket } from "./protocol";

class TargetHandler {
  private __player: any;
  private __target: any | null;

  constructor(player: any) {
    /*
     * Class TargetHandler
     * Handler for targeting 
     */
    this.__player = player;
    this.__target = null;
  }

  hasTarget(): boolean {
    /*
     * Function TargetHandler.hasTarget
     * Returns true when the creature has a target
     */
    return this.__target !== null;
  }

  getTarget(): any | null {
    return this.__target;
  }

  setTarget(target: any | null): void {
    /*
     * Function TargetHandler.setTarget
     * Sets the target of the creature
     */
    this.__target = target;

    const id = target === null ? 0 : target.getId();

    this.__player.write(new TargetPacket(id));
  }

  isBesidesTarget(): boolean {
    if (!this.hasTarget()) {
      return false;
    }

    return this.__player.isBesidesThing(this.getTarget());
  }
}

export default TargetHandler;
