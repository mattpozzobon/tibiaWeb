import Condition from "./condition";
import { ToggleConditionPacket } from "../../network/protocol";
import { CONFIG, CONST, getGameServer } from "../../helper/appContext";
import Player from "creature/player/player";
import Creature from "creature/creature";

export class ConditionManager {
  private __creature: Creature;
  private __conditions: Map<number, Condition>;

  constructor(creature: Creature) {
    /*
     * Class ConditionManager
     * Container for conditions that are applied to the creature
     */
    this.__creature = creature;
    this.__conditions = new Map<number, Condition>();
  }

  

  getCondition(id: number): Condition | undefined {
    /*
     * Function ConditionManager.get
     * Retrieves a condition by its ID
     */
    return this.__conditions.get(id);
  }

  isDrunk(): boolean {
    /*
     * Function Creature.isDrunk
     * Returns true if the creature has the drunk condition
     */
    return (
      this.__conditions.has(CONST.CONDITION.DRUNK) &&
      !this.__conditions.has(CONST.CONDITION.SUPPRESS_DRUNK)
    );
  }

  replace(condition: Condition, properties: any): boolean {
    /*
     * Function ConditionManager.replace
     * Attempts to replace a condition with a new condition
     */
    const current = this.__conditions.get(condition.id);

    if (current && current.isPermanent()) {
      if (this.__creature.isPlayer()) {
        (this.__creature as Player).sendCancelMessage(
          "You are under influence of a more powerful condition."
        );
      }
      return false;
    }

    const remaining = current ? current.getRemainingDuration() : 0;
    const total = condition.getTotalDuration();

    if (total > remaining || condition.isPermanent()) {
      this.remove(condition.id);
      condition.properties = properties;
      this.add(condition, properties);
    }

    return true;
  }

  forEach(callback: (condition: Condition, id: number) => void): void {
    /*
     * Function ConditionManager.forEach
     * Applies a callback over all conditions
     */
    this.__conditions.forEach(callback);
  }

  has(id: number): boolean {
    /*
     * Function ConditionManager.has
     * Returns true if the condition already exists
     */
    return this.__conditions.has(id);
  }

  remove(id: number): void {
    /*
     * Function ConditionManager.remove
     * Removes a condition from the player
     */
    if (!this.has(id)) return;

    const condition = this.__conditions.get(id);
    if (condition) {
      this.__remove(condition);
    }
  }

  cleanup(): void {
    this.__conditions.forEach((condition) => this.__remove(condition));
  }

  cancelAll(): void {
    /*
     * Function Creature.cancelAll
     * Cancels all the scheduled conditions (e.g., when logging out)
     */
    this.__conditions.forEach((condition) => condition.cancel());
  }

  add(condition: Condition, properties: any): void {
    /*
     * Function Creature.add
     * Adds a condition to the creature
     */
    condition.properties = properties;
    const conditionData = getGameServer().database.getCondition(condition.id.toString());
    if (conditionData?.onStart) {
      (conditionData.onStart as any).call(condition, this.__creature, properties);
    }

    this.__conditions.set(condition.id, condition);

    // Send the condition to client first (so UI countdown starts immediately)
    if (this.__creature.isPlayer()) {
      const expireMs = condition.isPermanent()
        ? 0
        : condition.getTotalDuration() * CONFIG.SERVER.MS_TICK_INTERVAL;
      this.__creature.broadcast(
        new ToggleConditionPacket(true, this.__creature.getId(), condition.id, expireMs)
      );
    }

    // Execute first tick immediately (synchronized with UI countdown start)
    // This happens after sending the packet so the UI starts counting down at the same time
    if (condition.numberTicks !== -1 && condition.numberTicks > 0) {
      this.__tickCondition(condition);
    }

  }

  private __tickCondition(condition: Condition): void {
    const now = Date.now();
    const last = (condition as any).__lastTickAt ?? now;
    (condition as any).__lastTickAt = now;
  
    console.log("[COND TICK]", {
      id: condition.id,
      dtMs: now - last,
      numberTicks: condition.numberTicks,
      tickDuration: condition.tickDuration,
      assumedTickMs: condition.tickDuration * CONFIG.SERVER.MS_TICK_INTERVAL,
    });
    /*
     * Function Condition.__tickCondition
     * Callback that is fired every condition tick
     */
    
    // Check if condition still exists first
    if (!this.__conditions.has(condition.id)) return;
    
    // Permanent conditions do not tick automatically
    if (condition.isPermanent()) return;
    
    // Check if this is the last tick (numberTicks == 1 means this is the last one)
    const isLastTick = condition.numberTicks === 1;

    const conditionData = getGameServer().database.getCondition(condition.id.toString());
  
    if (conditionData?.onTick) {
      try {
        // Explicitly bind 'this' to ensure the correct context
        // Pass properties as second argument (callbacks can ignore it if not needed)
        (conditionData.onTick as any).call(condition, this.__creature, condition.properties);
      } catch (error) {
        console.error(`[ConditionManager] Error in onTick for condition ${condition.id}:`, error);
      }
    }
  
    // Check again after tick in case it was removed during the tick
    if (!this.__conditions.has(condition.id)) return;

    // Decrement AFTER applying this tick
    condition.numberTicks--;

    // If this was the last tick, expire now
    if (isLastTick || condition.numberTicks <= 0) {
      this.__expireCondition(condition);
      return;
    }

    // Schedule next tick only if condition still exists and we have ticks remaining
    if (this.__conditions.has(condition.id) && condition.numberTicks > 0) {
      condition.applyEvent = getGameServer().world.eventQueue.addEvent(
        this.__tickCondition.bind(this, condition),
        condition.tickDuration
      );
    }
  }

  private __remove(condition: Condition): void {
    this.__expireCondition(condition);
    condition.cancel();
  }

  private __expireCondition(condition: Condition): void {
    /*
     * Function Condition.__expireCondition
     * Called when the condition has expired
     */
    
    // Cancel any pending tick events first
    condition.cancel();
    
    const conditionData = getGameServer().database.getCondition(condition.id.toString());
    if (conditionData && conditionData.onExpire)
      conditionData.onExpire.call(condition, this.__creature);

    // Remove from map to prevent further ticks
    this.__conditions.delete(condition.id);

    if (this.__creature.isPlayer()) {
      this.__creature.broadcast(
        new ToggleConditionPacket(false, this.__creature.getId(), condition.id, 0)
      );
    }
  }

  addCondition(id: number, tickEverySeconds: number, totalSeconds: number, properties: any): boolean {
    // New semantics:
    // - tickEverySeconds: e.g. 1 (every second), 0.5 (every half second)
    // - totalSeconds: total duration in seconds (negative = permanent)
    if (totalSeconds < 0 || tickEverySeconds < 0) {
      const permanent = new Condition(id, -1, -1);
      if (this.has(permanent.id)) {
        return this.replace(permanent, properties);
      }
      this.add(permanent, properties);
      return true;
    }

    if (!Number.isFinite(tickEverySeconds) || tickEverySeconds <= 0) return false;
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return false;

    const tickEveryMs = tickEverySeconds * 1000;
    const totalMs = totalSeconds * 1000;
    
    const durationFrames = Math.max(1, Math.round(tickEveryMs / CONFIG.SERVER.MS_TICK_INTERVAL));
    
    // Calculate ticks: total duration divided by tick interval
    // For 10s with 1s ticks: we want exactly 10 ticks
    // The first tick happens immediately, then we schedule (ticks-1) more ticks
    // Total duration = first tick (immediate) + (ticks-1) * tickEverySeconds
    // For 10s with 1s ticks: 10 ticks = 1 immediate + 9 scheduled = 0s + 9s = 9s duration
    // But we want 10s duration, so we need 11 ticks total
    // Actually, let's think: if we tick at 0s, 1s, 2s... 9s, that's 10 ticks over 9 seconds
    // To get 10 seconds, we need to tick at 0s, 1s, 2s... 10s, which is 11 ticks
    // But that doesn't make sense. Let me recalculate:
    // For 10 seconds with 1 second ticks, we want:
    // - Tick at 0s (immediate)
    // - Tick at 1s, 2s, 3s... 9s (9 more ticks)
    // - Expire at 10s
    // Total: 10 ticks over 10 seconds
    
    // So we need totalSeconds / tickEverySeconds ticks
    const exactTicks = totalMs / tickEveryMs;
    const ticks = Math.max(1, Math.round(exactTicks));

    const condition = new Condition(id, ticks, durationFrames);
    if (this.has(condition.id)) {
      return this.replace(condition, properties);
    }

    this.add(condition, properties);
    return true;
  }
}
