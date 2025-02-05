import { EventEmitter } from "Ceventemitter";


export interface IWorldClock extends EventEmitter {
  isMorning(): boolean;
  isAfternoon(): boolean;
  isEvening(): boolean;
  isNight(): boolean;
  getTime(): number;
  getTimeString(): string;
  before(time: string): boolean;
  after(time: string): boolean;
  at(time: string): boolean;
  changeTime(time: string): void;
  between(start: string, end: string): boolean;
  tick(): void;
}
