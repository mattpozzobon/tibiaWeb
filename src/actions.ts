"use strict";

import GenericLock from "./generic-lock";
import { CONFIG } from "./helper/appContext";

class Actions {
  private __allowedActions: Set<Function>;
  private __availableActions: Set<Function>;
  private __actionsLockMap: Map<Function, GenericLock>;
  GLOBAL_COOLDOWN: number;

  constructor() {
    /*
     * Class Actions
     *
     * Wrapper class for possible actions: an entity can have multiple action functions that are executed whenever available.
     *
     * API:
     *
     * Actions.has(action) - returns true if an action is available
     * Actions.add(action) - Adds an action to the action manager that will be executed when available
     * Actions.lock(action) - Locks an action in the action manager
     * Actions.handleActions(scope) - Handles all the available actions with a particular scope (this)
     */

    // The set of allowed actions
    this.__allowedActions = new Set<Function>();

    // Set that keeps the actions that are available
    this.__availableActions = new Set<Function>();

    // Reference to the locks
    this.__actionsLockMap = new Map<Function, GenericLock>();

    // Global minimum cooldown for all actions
    this.GLOBAL_COOLDOWN = Math.floor(
      CONFIG.WORLD.GLOBAL_COOLDOWN_MS / CONFIG.SERVER.MS_TICK_INTERVAL
    );
  }

  forEach(callback: (value: Function) => void, scope?: any): void {
    /*
     * Function Actions.forEach
     * Applies a callback function to each action
     */
    this.__availableActions.forEach(callback, scope);
  }

  handleActions(scope: any): void {
    /*
     * Function Actions.handleActions
     * Executes all available actions in the action manager
     */
    this.__availableActions.forEach(action => action.call(scope));
  }

  isAvailable(action: Function): boolean {
    /*
     * Function Actions.isAvailable
     * Returns true if the requested action is available
     */
    return this.__availableActions.has(action);
  }

  lock(action: Function, until: number): void {
    /*
     * Function Actions.lock
     * Locks an action from the action set by removing it and adding it back after a certain amount of time has passed
     */
    if (!this.__allowedActions.has(action)) return;

    if (!this.__availableActions.has(action)) return;

    // Locking for 0 frames is equivalent to not locking: ignore the request
    if (until === 0) return;

    // Deleting means that it has become unavailable
    this.__availableActions.delete(action);

    // Add to the game queue and save a reference to the event in case it must be canceled
    const lock = this.__actionsLockMap.get(action);
    if (lock) {
      lock.lock(until);
    }
  }

  remove(action: Function): void {
    /*
     * Function Actions.remove
     * Removes a particular action from the action set
     */
    if (!this.__allowedActions.has(action)) return;

    this.__allowedActions.delete(action);
  }

  add(action: Function): void {
    /*
     * Function Actions.add
     * Adds a particular action to the action set
     */
    if (this.__allowedActions.has(action)) return;

    // Add to allowed actions
    this.__allowedActions.add(action);

    // Create the generic lock
    const lock = new GenericLock();

    // Attach a callback to when this unlocks
    lock.on("unlock", this.__unlock.bind(this, action));

    // Set the action as available by adding it to the set and keep a reference
    this.__actionsLockMap.set(action, lock);
    this.__availableActions.add(action);
  }

  private __unlock(action: Function): void {
    /*
     * Function Actions.__unlock
     * Unlocks an action
     */
    if (!this.__allowedActions.has(action)) {
      this.__actionsLockMap.delete(action);
      return;
    }

    this.__availableActions.add(action);
  }

  cleanup(): void {
    /*
     * Function Actions.cleanup
     * Cleans up any remaining actions that are scheduled on the lock
     */
    this.__actionsLockMap.forEach(lock => lock.cancel());
    this.__actionsLockMap.clear();
    this.__availableActions.clear();
  }
}

export default Actions;
