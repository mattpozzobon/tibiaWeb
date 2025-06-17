"use strict";
import { EventEmitter } from "./Ceventemitter";


class ThingEmitter extends EventEmitter {
  constructor() {
    super();
  }

  emit(which: string, ...args: any[]): boolean {
    let result = true;

    try {
      // Custom emit logic
      result = this.customEmit(which, ...args);
      if (!result) {
        return false; // Stop propagation if customEmit returns false
      }
    } catch (error) {
      console.debug(error);
    }

    try {
      // Delegate to the prototype event listener
      this.getPrototype().emit(which, ...args);
    } catch (error) {
      console.debug(error);
    }

    return result;
  }

  private customEmit(which: string, ...args: any[]): boolean {
    /*
     * Custom internal emit logic
     */
    return super.emit(which, ...args);
  }

  protected getPrototype(): any {
    /*
     * Placeholder for child class implementation
     */
    throw new Error("getPrototype() must be implemented by subclasses");
  }
}

export default ThingEmitter;
