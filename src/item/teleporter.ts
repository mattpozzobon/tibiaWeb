"use strict";

import { IPosition } from "../interfaces/IPosition";
import Item from "./item";

class Teleporter extends Item {
  private destination?: IPosition;

  /*
   * Class Teleporter
   * Wrapper for an item that teleports the player to another location
   */

  constructor(id: number) {
    super(id);
  }

  setDestination(destination: IPosition): void {
    /*
     * Function Teleporter.setDestination
     * Wrapper for an item that teleports players and items to another location
     */
    this.destination = destination;
  }

  getDestination(): IPosition | undefined {
    /*
     * Function Teleporter.getDestination
     * Returns the destination of the teleporter
     */
    return this.destination;
  }
}

export default Teleporter;
