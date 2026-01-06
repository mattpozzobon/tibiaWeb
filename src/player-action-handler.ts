"use strict";

import { IActionHandler } from "interfaces/IPlayer-action-handler";
import Actions from "./actions";
import TargetHandler from "./target-handler";
import { CONST, getGameServer } from "./helper/appContext";


class ActionHandler implements IActionHandler{
  private __player: any;
  actions: Actions;
  targetHandler: TargetHandler;
  readonly REGENERATION_DURATION: number = 100;

  constructor(player: any) {
    /*
     * Class ActionHandler
     * Wrapper for player action handlers
     */

    this.__player = player;

    this.actions = new Actions();
    this.targetHandler = new TargetHandler(player);

    // Add the available player actions that are checked every server tick
    this.actions.add(this.handleActionAttack.bind(this));
    this.actions.add(this.handleActionRegeneration.bind(this));
  }

  cleanup(): void {
    /*
     * Function ActionHandler.cleanup
     * Delegates to the actions to clean up remaining actions
     */
    this.actions.cleanup();
  }

  private handleActionAttack(): void {
    /*
     * Function ActionHandler.handleActionAttack
     * Handles attack action 
     */

    // No target
    if (!this.targetHandler.hasTarget()) {
      return;
    }

    // Drop the target if it is dead
    if (!getGameServer().world.creatureHandler.isCreatureActive(this.targetHandler.getTarget())) {
      this.targetHandler.setTarget(null);
      return;
    }

    // Not besides target and not distance fighting
    if (!this.targetHandler.isBesidesTarget() && !this.__player.isDistanceWeaponEquipped()) {
      return;
    }

    // Confirm player can see the creature for distance (or normal) fighting
    if (!this.__player.isInLineOfSight(this.targetHandler.getTarget())) {
      return;
    }

    this.__player.combatLock.activate();

    // Handle combat with the target
    getGameServer().world.combatHandler.handleCombat(this.__player);

    // Lock the action for the inverse of the attack speed of the player
    this.actions.lock(
      this.handleActionAttack.bind(this),
      this.__player.getProperty(CONST.PROPERTIES.ATTACK_SPEED)
    );
  }

  private handleActionRegeneration(): void {
    /*
     * Function ActionHandler.handleActionRegeneration
     * Handles default health regeneration of players
     */

    if (!this.__player.isFull(CONST.PROPERTIES.HEALTH)) {
      let regeneration = this.__player.getEquipmentAttribute("healthGain");

      // If not full health
      if (
        !this.__player.isInCombat() &&
        this.__player.hasCondition(CONST.CONDITION.SATED)
      ) {
        regeneration += 5;
      }

      // Uncomment this line if `increaseHealth` implementation is present
      // this.__player.increaseHealth(regeneration);
    }

    this.actions.lock(
      this.handleActionRegeneration.bind(this),
      this.REGENERATION_DURATION
    );
  }
}

export default ActionHandler;
