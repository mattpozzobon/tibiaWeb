"use strict";

import { IEventQueue } from "interfaces/IEventqueue";
import BinaryHeap from "../utils/binary-heap";
import Event from "./event";
import { CONFIG, getGameServer } from "../helper/appContext";


class EventQueue implements IEventQueue{
  public heap: BinaryHeap<Event>;
  private __handledCounter: number;

  constructor() {
    /*
     * Class EventQueue
     * Container for priority queuing class based on a binary heap
     */
    this.heap = new BinaryHeap();
    this.__handledCounter = 0;
  }

  getEventsHandled(): number {
    /*
     * Function EventQueue.getEventsHandled
     * Returns the number of events handled since the last call
     */
    const handled = this.__handledCounter;
    this.__handledCounter = 0;
    return handled;
  }

  addEventSeconds(callback: () => void, seconds: number): Event | null {
    /*
     * Function EventQueue.addEventSeconds
     * Adds an event that fires a number of seconds from now
     */
    return this.addEventMs(callback, 1000 * seconds);
  }

  addEventMs(callback: () => void, milliseconds: number): Event | null {
    /*
     * Function EventQueue.addEventMs
     * Adds an event a number of milliseconds from now
     */
    return this.addEvent(callback, Math.floor(milliseconds / CONFIG.SERVER.MS_TICK_INTERVAL));
  }

  addEvent(callback: () => void, ticks: number): Event | null {
    /*
     * Function EventQueue.addEvent
     * Adds an event a number of ticks from now
     */
    const future = Math.round(Math.max(ticks, 1));

    if (!Number.isInteger(future)) {
      console.error(`Cannot add event with non-integer future ${future}`);
      return null;
    }

    const scheduledFrame = getGameServer().gameLoop.getCurrentFrame() + future;
    const heapEvent = new Event(callback, scheduledFrame);

    this.heap.push(heapEvent);

    return heapEvent;
  }

  tick(): void {
    /*
     * Function EventQueue.tick
     * Executes all events scheduled to be run in the queue
     */
    const currentFrame = getGameServer().gameLoop.getCurrentFrame();

    while (true) {
      if (this.heap.isEmpty()) return;

      if (this.heap.hasExecutedUntil(currentFrame)) return;

      const nextEvent = this.heap.pop();

      if (nextEvent.isCancelled()) continue;

      this.__handledCounter++;
      nextEvent.execute();
    }
  }

  remove(event: Event): void {
    /*
     * Function EventQueue.remove
     * Actually removes an event from the event queue: this is an expensive operation
     */
    this.heap.remove(event);
  }
}

export default EventQueue;
