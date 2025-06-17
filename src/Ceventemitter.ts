export type ActionEmmiter = {
  on: string;
  callback: (...args: any[]) => any;
};

export class EventEmitter {
  private __events: { [key: string]: Set<(...args: any[]) => any> };

  constructor() {
    /*
     * Class EventEmitter
     * Subscribes to events and waits for emit
     */
    this.__events = {};
  }

  

  emit(which: string, ...args: any[]): boolean {
    /*
     * Function EventEmitter.emit
     * Delegates to the internal emit handler
     */
    return this.__emit(which, ...args);
  }

  once(which: string, callback: (...args: any[]) => any): void {
    /*
     * Function EventEmitter.once
     * Subscribes to an event emitter but only executes the function once
     */
  
    const wrappedFunction = (...args: any[]) => {
      this.off(which, wrappedFunction);
      callback.apply(this, args);
    };
  
    this.on(which, wrappedFunction);
  }

  hasEvent(which: string): boolean {
    /*
     * Function EventEmitter.hasEvent
     * Returns true if the event is subscribed
     */
    return (
      this.__events.hasOwnProperty(which) &&
      this.__events[which].size > 0
    );
  }

  private __emit(which: string, ...args: any[]): boolean {
    /*
     * Function EventEmitter.__emit
     * Emits a call to the event emitter and executes callbacks
     */
    if (!this.__events.hasOwnProperty(which)) {
      return true;
    }

    return Array.from(this.__events[which])
      .map((callback) => callback.apply(this, args))
      .every(Boolean);
  }

  on(which: string, callback: (...args: any[]) => any): (...args: any[]) => any {
    /*
     * Function EventEmitter.on
     * Subscribes a callback to an event
     */

    if (!this.__events.hasOwnProperty(which)) {
      this.__events[which] = new Set();
    }

    this.__events[which].add(callback);

    return callback;
  }

  off(which: string, callback: (...args: any[]) => any): void {
    /*
     * Function EventEmitter.off
     * Unsubscribe a callback from an event
     */

    if (!this.__events.hasOwnProperty(which)) {
      return;
    }

    this.__events[which].delete(callback);
  }

  clear(): void {
    /*
     * Function EventEmitter.clear
     * Clears all events from the emitter
     */
    this.__events = {};
  }
}
