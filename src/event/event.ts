"use strict";

import { getGameServer } from "../helper/appContext";


class Event {
  public callback: (() => void) | null;
  private __cancelled: boolean;
  private __f: number;

  constructor(callback: () => void, tick: number) {
    /*
     * Class Event
     * Container for events that fire a callback at a given frame
     */
    this.callback = callback;
    this.__cancelled = false;
    this.__f = tick;
  }

  isCancelled(): boolean {
    /*
     * Function Event.isCancelled
     * Returns true if the event was cancelled
     */
    return this.__cancelled;
  }

  remove(): void {
    /*
     * Function Event.remove
     * Removes the event from the event queue
     */
    getGameServer().world.eventQueue.remove(this);
  }

  getScore(): number {
    /*
     * Function Event.getScore
     * Returns the score of the event for scheduling
     */
    return this.__f;
  }

  cancel(): void {
    /*
     * Function Event.cancel
     * Cancels a scheduled event so that it is no longer executed
     */
    this.__cancelled = true;

    // Clear the callback to prevent references
    this.callback = null;
  }

  remainingFrames(): number {
    /*
     * Function Event.remainingFrames
     * Returns the number of frames remaining before the event is scheduled
     */
    return this.getScore() - getGameServer().gameLoop.getCurrentFrame();
  }

  execute(): void {
    /*
     * Executes the callback if it's not null
     */
    if (this.callback) {
      this.callback();
    } else {
      console.error("Attempted to execute a null callback");
    }
  }
}

export default Event;
