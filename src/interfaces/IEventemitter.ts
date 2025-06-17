export interface IEventEmitter {
  /**
   * Emits an event to all listeners.
   * @param which The event name.
   * @param args Additional arguments for the event.
   * @returns Whether the event was successfully emitted.
   */
  emit(which: string, ...args: any[]): boolean;

  /**
   * Subscribes a callback that will only be called once.
   * @param which The event name.
   * @param callback The function to call.
   */
  once(which: string, callback: (...args: any[]) => any): void;

  /**
   * Checks if there is any listener for the given event.
   * @param which The event name.
   * @returns True if at least one listener exists.
   */
  hasEvent(which: string): boolean;

  /**
   * Subscribes a callback to the given event.
   * @param which The event name.
   * @param callback The function to call.
   * @returns The callback function.
   */
  on(which: string, callback: (...args: any[]) => any): (...args: any[]) => any;

  /**
   * Unsubscribes a callback from the given event.
   * @param which The event name.
   * @param callback The function to remove.
   */
  off(which: string, callback: (...args: any[]) => any): void;

  /**
   * Clears all event listeners.
   */
  clear(): void;
}
