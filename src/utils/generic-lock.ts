"use strict";
import { CONFIG, getGameServer } from "../helper/appContext";

type LockEvent = {
  remainingFrames: () => number;
  remove: () => void;
};

class GenericLock {
  private __lockEvent: LockEvent | null = null;
  private __extendedLockFrame: number = 0;
  private __unlockCallback: (() => void) | null = null;
  private __lockCallback: (() => void) | null = null;

  remainingFrames(): number {
    if (!this.isLocked()) {
      return 0;
    }
    return this.__lockEvent!.remainingFrames();
  }

  isLocked(): boolean {
    return this.__lockEvent !== null;
  }

  on(which: "lock" | "unlock", callback: () => void): void {
    switch (which) {
      case "lock":
        this.__lockCallback = callback;
        break;
      case "unlock":
        this.__unlockCallback = callback;
        break;
    }
  }

  cleanup(): void {
    this.__lockCallback = null;
    this.__unlockCallback = null;
    this.cancel();
  }

  unlock(): void {
    if (this.__unlockCallback) {
      this.__unlockCallback();
    }
    this.cancel();
  }

  cancel(): void {
    if (!this.isLocked()) {
      return;
    }
    this.__lockEvent!.remove();
    this.__lockEvent = null;
    this.__extendedLockFrame = 0;
  }

  lockSeconds(seconds: number): void {
    this.lock(Math.round(seconds * (1000 / CONFIG.SERVER.MS_TICK_INTERVAL)));
  }

  lock(amount: number): void {
    if (this.isLocked()) {
      this.__extendLock(amount);
      return;
    }
    this.__lock(amount);
    if (this.__lockCallback) {
      this.__lockCallback();
    }
  }

  private __extendLock(amount: number): void {
    this.__extendedLockFrame = Math.max(0, amount - this.__lockEvent!.remainingFrames());
  }

  private __lock(amount: number): void {
    this.__extendedLockFrame = 0;
    this.__lockEvent = getGameServer().world.eventQueue.addEvent(this.__unlock.bind(this), amount);
  }

  private __unlock(): void {
    if (this.__extendedLockFrame > 0) {
      this.__lock(this.__extendedLockFrame);
      return;
    }
    this.__lockEvent = null;
    if (this.__unlockCallback) {
      this.__unlockCallback();
    }
  }
}

export default GenericLock;
