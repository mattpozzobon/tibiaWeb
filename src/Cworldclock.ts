"use strict";

import { WorldTimePacket } from "./Cprotocol";
import { EventEmitter } from "./Ceventemitter";
import { CONFIG, getGameServer } from "./helper/appContext";


class WorldClock extends EventEmitter {
  private __previousMinuteCount: number;
  private __initialized: number;
  private __startOffset: number;

  constructor() {
    super();

    this.__previousMinuteCount = 0;
    this.__initialized = performance.now();

    if (CONFIG.WORLD.CLOCK.SPEED > 250) {
      throw new Error(
        `Speed up rate of ${CONFIG.WORLD.CLOCK.SPEED} exceeds the maximum.`
      );
    }

    this.__startOffset = this.__convertStringToTime(CONFIG.WORLD.CLOCK.START);
  }

  isMorning(): boolean {
    return this.between("06:00", "12:00");
  }

  isAfternoon(): boolean {
    return this.between("12:00", "18:00");
  }

  isEvening(): boolean {
    return this.between("18:00", "24:00");
  }

  isNight(): boolean {
    return this.between("00:00", "06:00");
  }

  getTime(): number {
    const max = 24 * 60 * 60 * 1000;
    return Math.round(
      (this.__startOffset +
        CONFIG.WORLD.CLOCK.SPEED * (performance.now() - this.__initialized)) %
        max
    );
  }

  getTimeString(): string {
    const unix = this.getTime();

    const seconds = Math.floor(unix / 1000) % 60;
    const minutes = Math.floor(unix / (60 * 1000)) % 60;
    const hours = Math.floor(unix / (60 * 60 * 1000)) % 24;

    const padHour = String(hours).padStart(2, "0");
    const padMinute = String(minutes).padStart(2, "0");

    return `${padHour}:${padMinute}`;
  }

  before(time: string): boolean {
    return this.getTime() <= this.__convertStringToTime(time);
  }

  after(time: string): boolean {
    return this.getTime() >= this.__convertStringToTime(time);
  }

  at(time: string): boolean {
    return this.getTimeString() === time;
  }

  changeTime(time: string): void {
    this.__initialized = performance.now();
    this.__startOffset = this.__convertStringToTime(time);

    let timep = new WorldTimePacket(getGameServer().world.clock.getTime())
    getGameServer().world.broadcastPacket(timep);
  }

  between(start: string, end: string): boolean {
    if (start === end) {
      return this.at(start);
    }

    const st = this.__convertStringToTime(start);
    const se = this.__convertStringToTime(end);

    if (st > se) {
      return this.after(start) || this.before(end);
    } else {
      return this.after(start) && this.before(end);
    }
  }

  tick(): void {
    const minute = Math.floor(this.getTime() / (1000 * 60)) % 60;

    if (minute === this.__previousMinuteCount) {
      return;
    }

    this.__previousMinuteCount = minute;

    this.emit("time", this.getTimeString());
  }

  private __convertStringToTime(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return 1000 * 60 * (minutes + 60 * hours);
  }
}

export default WorldClock;
