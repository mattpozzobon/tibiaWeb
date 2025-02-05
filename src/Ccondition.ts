export default class Condition {
  id: number;
  numberTicks: number;
  maxNumberTicks: number;
  tickDuration: number;
  applyEvent: { cancel: () => void } | null;

  constructor(id: number, ticks: number, duration: number) {
    /*
     * Class Condition
     * Wrapper for a condition fired in intervals (e.g., damage over time or drunkness)
     */
    this.id = id;

    // Condition state
    this.numberTicks = ticks;
    this.maxNumberTicks = ticks;
    this.tickDuration = duration;
    this.applyEvent = null;
  }

  isPermanent(): boolean {
    /*
     * Function Condition.isPermanent
     * Returns true if the condition is considered permanent
     */
    return this.numberTicks === -1;
  }

  isLastTick(): boolean {
    /*
     * Function Condition.isLastTick
     * Returns true if the tick is the last one
     */
    return this.numberTicks === 0;
  }

  getTotalDuration(): number {
    /*
     * Function Condition.getTotalDuration
     * Returns the total duration of the condition
     */
    return this.maxNumberTicks * this.tickDuration;
  }

  getRemainingDuration(): number {
    /*
     * Function Condition.getRemainingDuration
     * Returns the remaining duration of the condition
     */
    return this.numberTicks * this.tickDuration;
  }

  isFirstTick(): boolean {
    /*
     * Function Condition.isFirstTick
     * Returns true if the tick is the first one
     */
    return this.numberTicks === this.maxNumberTicks;
  }

  getFraction(): number {
    /*
     * Function Condition.getFraction
     * Returns the fraction of completeness for the condition
     */
    return this.numberTicks / this.maxNumberTicks;
  }

  cancel(): void {
    /*
     * Function Condition.cancel
     * Cancels the condition by cancelling the scheduled tick event
     */
    if (this.applyEvent === null) {
      return;
    }

    this.applyEvent.cancel();
  }
}
