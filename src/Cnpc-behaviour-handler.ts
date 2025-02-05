"use strict";

import { getGameServer } from "./helper/appContext";

type BehaviourConfig = {
  openDoors?: boolean;
  wanderRange?: number;
  wandering?: boolean;
  ignoreCharacters?: boolean;
  pauseAfterWander?: boolean;
};

class NPCBehaviour {
  private npc: any;
  private behaviour: Required<BehaviourConfig>;

  constructor(npc: any, behaviour: BehaviourConfig = {}) {
    /*
     * Class NPCBehaviour
     * Code to handle the behavior of the NPC
     *
     * Public API:
     *
     * @NPCBehaviour.isWandering() - returns true if the NPC is configured to wander
     * @NPCBehaviour.isTileOccupied(tile) - returns true if the passed tile is occupied for the NPC
     * @NPCBehaviour.getWanderMove() - returns a random potential wandering move 
     * @NPCBehaviour.getStepDuration(tile) - returns the duration in frames of a step on the tile
     *
     */
    this.npc = npc;

    this.behaviour = {
      openDoors: true,
      wanderRange: 3,
      wandering: true,
      ignoreCharacters: true,
      pauseAfterWander: true,
      ...behaviour,
    };
  }

  public isWandering(): boolean {
    return this.behaviour.wandering;
  }

  private __isWithinWanderRange(position: any): boolean {
    return this.npc.spawnPosition.isWithinRangeOf(position, this.__getWanderRange());
  }

  private __isValidStandingPosition(position: any): boolean {
    if (!this.__isWithinWanderRange(position)) {
      return false;
    }

    const tile = getGameServer().world.getTileFromWorldPosition(position);

    if (this.isTileOccupied(tile)) {
      return false;
    }

    return true;
  }

  public isTileOccupied(tile: any): boolean {
    if (tile === null || tile.id === 0) {
      return true;
    }

    if (tile.isBlockSolid()) {
      return true;
    }

    if (tile.itemStack && tile.itemStack.isBlockNPC()) {
      return true;
    }

    if (!this.npc.cutsceneHandler.isInScene() && tile.isOccupiedCharacters()) {
      return true;
    }

    return false;
  }

  public getWanderMove(): any {
    const positions = this.npc.position
      .getNESW()
      .filter(this.__isValidStandingPosition.bind(this));

    if (positions.length === 0) {
      return null;
    }

    return getGameServer().world.getTileFromWorldPosition(
      positions[Math.floor(Math.random() * positions.length)]
    );
  }

  public getStepDuration(tile: any): number {
    let stepDuration = this.npc.getStepDuration(tile.getFriction());

    if (this.__willPauseAfterWander()) {
      stepDuration *= 2;
    }

    return stepDuration;
  }

  private __willPauseAfterWander(): boolean {
    return this.behaviour.pauseAfterWander;
  }

  private __getWanderRange(): number {
    return this.behaviour.wanderRange;
  }
}

export default NPCBehaviour;
