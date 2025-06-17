import { IEventEmitter } from "./IEventemitter";

export interface IThingEmitter extends IEventEmitter {
  /**
   * Emits an event with custom handling before delegating.
   * @param which The event name.
   * @param args Additional arguments.
   * @returns Whether the event was successfully emitted.
   */
  emit(which: string, ...args: any[]): boolean;

  /**
   * Provides a prototype emitter for delegation.
   * @returns An object that implements IEventEmitter.
   */
  getPrototype(): IEventEmitter;
}
