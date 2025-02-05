import { getDataFile, getGameServer } from "./helper/appContext";

class ActionLoader {
  /*
   * Class ActionLoader
   * Handles the management of user-defined actions
   */
  private __uniqueActions: Map<number, Array<{ on: string; callback: Function }>>;

  constructor() {
    this.__uniqueActions = new Map();
  }

  initialize(): void {
    /*
     * Function ActionLoader.initialize
     * Initializes the action loader and loads data from disk
     */

    // Three different types:
    // - Unique actions apply to a single instance of an item
    // - Prototype actions apply to the prototype of a single item and hence all items of that type
    // - Clock actions subscribe to the world clock and are executed every game time tick
    this.__attachUniqueEvents("unique");
    this.__attachPrototypeEvents("actions");
  }

  private __attachUniqueEvents(filepath: string): void {
    /*
     * Function ActionLoader.__attachUniqueEvents
     * Loads the configured unique actions
     */

    // Save all definitions
    const definitions = getGameServer().database.readDataDefinition(filepath);

    definitions.forEach((definition: { uid: number; on: string; callback: string }) => {
      const callback = require(getDataFile(filepath, "definitions", definition.callback));

      // Create a bucket to collect the functions
      if (!this.__uniqueActions.has(definition.uid)) {
        this.__uniqueActions.set(definition.uid, []);
      }

      // Can be multiple actions
      this.__uniqueActions.get(definition.uid)!.push({
        on: definition.on,
        callback,
      });
    });

    console.log(`Attached [[ ${this.__uniqueActions.size} ]] unique action listeners.`);
  }

  attachClockEvents(filepath: string): void {
    /*
     * Function ActionLoader.attachClockEvents
     * Attaches timed events to the world
     */

    // Save all definitions
    const definitions = getGameServer().database.readDataDefinition(filepath);

    definitions.forEach((definition: { callback: string }) => {
      const callback = require(getDataFile(filepath, "definitions", definition.callback));
      getGameServer().world.clock.on("time", callback);
    });
  }

  private __attachPrototypeEvents(filepath: string): void {
    /*
     * Function ActionLoader.__attachPrototypeEvents
     * Attaches the configured prototype events that apply to all items of a certain type
     */

    // These are the JSON definitions that configure the action and reference the script
    const definitions = getGameServer().database.readDataDefinition(filepath);

    // Read the definition
    definitions.forEach((definition: { on: string; callback: string; id?: number; ids?: number[]; from?: number; to?: number }) => {
      const callback = require(getDataFile(filepath, "definitions", definition.callback));

      // The range of item identifiers to apply it to
      let range: number[] = [];

      // Single, multiple, or range
      if (definition.id) {
        range = [definition.id];
      } else if (definition.ids) {
        range = definition.ids;
      } else if (definition.from !== undefined && definition.to !== undefined) {
        range = Array.from({ length: definition.to - definition.from + 1 }, (_, i) => definition.from! + i);
      }

      // Attach for __addPrototypeEventListener
      range.forEach((id) => getGameServer().database.getThingPrototype(id).on(definition.on, callback));
    });

    console.log(`Attached [[ ${definitions.length} ]] prototype event listeners.`);
  }

  getUniqueActions(uid: number): Array<{ on: string; callback: Function }> | null {
    /*
     * Function ActionLoader.getUniqueActions
     * Returns the configured unique actions for a particular unique identifier
     */

    return this.__uniqueActions.get(uid) || null;
  }
}

export default ActionLoader;
