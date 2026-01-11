"use strict";

import { Position } from "utils/position";
import Item from "./item";

class Teleporter extends Item {
  private destination?: Position;

  /*
   * Class Teleporter
   * Wrapper for an item that teleports the player to another location
   */

  constructor(id: number) {
    super(id);
  }

  setDestination(destination: Position): void {
    /*
     * Function Teleporter.setDestination
     * Wrapper for an item that teleports players and items to another location
     */
    this.destination = destination;
  }

  getDestination(): Position | undefined {
    /*
     * Function Teleporter.getDestination
     * Returns the destination of the teleporter
     */
    return this.destination;
  }
}

export default Teleporter;
