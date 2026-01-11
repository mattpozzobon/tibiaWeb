import Condition from "./condition";
import { ToggleConditionPacket } from "../../network/protocol";
import { CONST, getGameServer } from "../../helper/appContext";
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

  extendCondition(id: number, ticks: number): void {
    const condition = this.__conditions.get(id);
    if (condition) {
      condition.numberTicks += ticks;
    }
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

  replace(condition: Condition, properties: number | null): boolean {
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

  add(condition: Condition, properties: number | null): void {
    /*
     * Function Creature.add
     * Adds a condition to the creature
     */
    const conditionData = getGameServer().database.getCondition(condition.id.toString());
    if (conditionData && properties)
      conditionData.onStart.call(condition, this.__creature, properties);

    this.__conditions.set(condition.id, condition);

    if (condition.numberTicks !== -1) {
      this.__tickCondition(condition);
    }

    if (this.__creature.isPlayer()) {
      this.__creature.broadcast(
        new ToggleConditionPacket(true, this.__creature.getId(), condition.id)
      );
    }
  }

  private __tickCondition(condition: Condition): void {
    /*
     * Function Condition.__tickCondition
     * Callback that is fired every condition tick
     */
    const conditionData = getGameServer().database.getCondition(condition.id.toString());
  
    if (conditionData?.onTick) {
      // Explicitly bind 'this' to ensure the correct context
      conditionData.onTick.call(condition, this.__creature);
    }
  
    if (!this.__conditions.has(condition.id)) return;
  
    if (condition.numberTicks === 0) {
      this.__expireCondition(condition);
      return;
    }
  
    condition.numberTicks--;
  
    condition.applyEvent = getGameServer().world.eventQueue.addEvent(
      this.__tickCondition.bind(this, condition),
      condition.tickDuration
    );
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
    const conditionData = getGameServer().database.getCondition(condition.id.toString());
    if (conditionData && conditionData.onExpire)
      conditionData.onExpire.call(condition, this.__creature);

    this.__conditions.delete(condition.id);

    if (this.__creature.isPlayer()) {
      this.__creature.broadcast(
        new ToggleConditionPacket(false, this.__creature.getId(), condition.id)
      );
    }
  }

  addCondition(
    id: number,
    ticks: number,
    duration: number,
    properties: number | null
  ): boolean {
    /*
     * Function Creature.addCondition
     * Adds a condition to the creature
     */
    const condition = new Condition(id, ticks, duration);

    if (this.has(condition.id)) {
      return this.replace(condition, properties);
    }

    this.add(condition, properties);
    return true;
  }
}
