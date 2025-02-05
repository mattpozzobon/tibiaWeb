import { IEvent } from "./IEvent";

export interface IEventQueue {
  heap: any; // Adjust type if BinaryHeap is available as an interface
  getEventsHandled(): number;
  addEventSeconds(callback: () => void, seconds: number): IEvent | null;
  addEventMs(callback: () => void, milliseconds: number): IEvent | null;
  addEvent(callback: () => void, ticks: number): IEvent | null;
  tick(): void;
  remove(event: IEvent): void;
}
