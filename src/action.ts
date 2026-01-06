"use strict";

import { getGameServer } from "./helper/appContext";

class ActionManager {
  private __actions: Set<Function>;
  readonly GLOBAL_COOLDOWN: number = 20;

  constructor() {
    /*
     * Class ActionManager
     *
     * Wrapper class for possible actions. An entity can have multiple action function
     * e.g. for moving or attacking in the available set. Every tick the active creature
     * checks for the available action and performs it, and locks the action function in the queue.
     *
     * Locked actions cannot be performed
     *
     * API:
     *
     * ActionManager.size() - returns the total number of available actions
     * ActionManager.has(action) - returns true if an action is available
     * ActionManager.add(action) - Adds an action to the action manager that will be executed when available
     * ActionManager.lock(action) - Locks an action in the action manager
     * ActionManager.handleActions(scope) - Handles all the available actions with a particular scope (this)
     */

    // Set of actions that are available
    this.__actions = new Set<Function>();
  }

  forEach(callback: (value: Function) => void, scope?: any): void {
    this.__actions.forEach(callback, scope);
  }

  handleActions(scope: any): void {
    /*
     * Function ActionManager.handleActions
     * Executes all available actions in the action manager
     */
    this.__actions.forEach(action => action.call(scope));
  }

  size(): number {
    /*
     * Function ActionManager.size
     * Returns the size of the action set
     */
    return this.__actions.size;
  }

  has(action: Function): boolean {
    /*
     * Function ActionManager.has
     * Returns true if the requested action is available
     */
    return this.__actions.has(action);
  }

  lock(action: Function, until: number): any {
    /*
     * Function ActionManager.lock
     * Locks an action from the action set by removing it and adding it back after a certain amount of time has passed
     */

    this.__actions.delete(action);

    // Add to the game queue and save a reference to the event in case it must be canceled
    return getGameServer().world.eventQueue.addEvent(this.__unlock.bind(this, action), until);
  }

  add(action: Function): void {
    /*
     * Function ActionManager.add
     * Adds a particular action to the action set
     */
    this.__actions.add(action);
  }

  private __unlock(action: Function): void {
    /*
     * Function ActionManager.__unlock
     * Unlocks an action
     */
    this.add(action);
  }
}

export default ActionManager;
