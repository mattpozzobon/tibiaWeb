import { getDataFile, getGameServer } from "../helper/appContext";

class ActionLoader {
  /*
   * Class ActionLoader
   * Handles the management of user-defined actions
   */
  private __uniqueActions: Map<number, Array<{ on: string; callback: (...args: any[]) => any }>>;

  constructor() {
    this.__uniqueActions = new Map();
  }

  private __isClass(fn: Function): boolean {
    // Best-effort: classes stringify starting with "class ..."
    return /^class\s/.test(Function.prototype.toString.call(fn));
  }

  private __unwrapModule(mod: any): any {
    // Webpack/TS interop sometimes puts the actual export under `default`
    return mod && mod.default ? mod.default : mod;
  }

  private __getSingleNamedExportFunction(mod: any): ((...args: any[]) => any) | null {
    if (!mod || typeof mod !== "object") return null;

    const fns = Object.keys(mod)
      .filter((k) => k !== "default" && k !== "__esModule")
      .map((k) => mod[k])
      .filter((v) => typeof v === "function")
      .filter((fn) => !this.__isClass(fn));

    return fns.length === 1 ? (fns[0] as (...args: any[]) => any) : null;
  }

  private __resolveHandler(mod: any, on: string): ((...args: any[]) => any) | null {
    const exp = this.__unwrapModule(mod);

    // module.exports = function (...) {}
    if (typeof exp === "function") {
      return this.__isClass(exp) ? null : (exp as (...args: any[]) => any);
    }

    if (!exp || typeof exp !== "object") return null;

    // module.exports = { use: fn, useWith: fn, ... }
    const byEvent = exp[on];
    if (typeof byEvent === "function") {
      return this.__isClass(byEvent) ? null : (byEvent as (...args: any[]) => any);
    }

    // TS named export modules like `export function useTrunk(...) {}`
    return this.__getSingleNamedExportFunction(exp);
  }

  private __getUids(definition: { uid?: number; uids?: number[] }): number[] {
    if (Array.isArray(definition.uids)) return definition.uids;
    if (typeof definition.uid === "number") return [definition.uid];
    return [];
  }

  private __getIds(definition: { id?: number; ids?: number[]; from?: number; to?: number }): number[] {
    // Single, multiple, or range
    if (typeof definition.id === "number") return [definition.id];
    if (Array.isArray(definition.ids)) return definition.ids;
    if (definition.from !== undefined && definition.to !== undefined) {
      return Array.from({ length: definition.to - definition.from + 1 }, (_, i) => definition.from! + i);
    }

    return [];
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

    definitions.forEach((definition: { uid?: number; uids?: number[]; on: string[]; callback: string }) => {
      const mod = require(getDataFile(filepath, "definitions", definition.callback));
      const onEvents = definition.on;
      const uids = this.__getUids(definition);

      if (uids.length === 0) {
        console.warn(`[ActionLoader] Skipping unique action: no "uid"/"uids" provided for callback "${definition.callback}".`);
        return;
      }

      uids.forEach((uid) => {
        // Create a bucket to collect the functions
        if (!this.__uniqueActions.has(uid)) {
          this.__uniqueActions.set(uid, []);
        }

        onEvents.forEach((on) => {
          const callback = this.__resolveHandler(mod, on);
          if (!callback) {
            console.warn(`[ActionLoader] Skipping unique action: callback "${definition.callback}" does not export a handler for "${on}".`);
            return;
          }

          // Can be multiple actions
          this.__uniqueActions.get(uid)!.push({
            on,
            callback,
          });
        });
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
    definitions.forEach((definition: { on: string[]; callback: string; id?: number; ids?: number[]; from?: number; to?: number }) => {
      const mod = require(getDataFile(filepath, "definitions", definition.callback));
      const onEvents = definition.on;

      // The range of item identifiers to apply it to
      const range = this.__getIds(definition);

      if (range.length === 0) {
        console.warn(`[ActionLoader] Skipping prototype action: no "id"/"ids"/"from-to" provided for callback "${definition.callback}".`);
        return;
      }

      // Attach for __addPrototypeEventListener
      onEvents.forEach((on) => {
        const callback = this.__resolveHandler(mod, on);
        if (!callback) {
          console.warn(`[ActionLoader] Skipping prototype action: callback "${definition.callback}" does not export a handler for "${on}".`);
          return;
        }

        range.forEach((id) => getGameServer().database.getThingPrototype(id).on(on, callback));
      });
    });

    console.log(`Attached [[ ${definitions.length} ]] prototype event listeners.`);
  }

  getUniqueActions(uid: number): Array<{ on: string; callback: (...args: any[]) => any }> | null {
    /*
     * Function ActionLoader.getUniqueActions
     * Returns the configured unique actions for a particular unique identifier
     */

    return this.__uniqueActions.get(uid) || null;
  }
}

export default ActionLoader;
