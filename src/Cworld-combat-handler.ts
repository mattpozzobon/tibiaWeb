import { CONST, getGameServer } from "./helper/appContext";

class CombatHandler {
  constructor() {
    /*
     * Class CombatHandler
     * Wrapper for all combat-related functions
     */
  }

  handleCombat(source: any): void {
    /*
     * Function CombatHandler.handleCombat
     * Handles combat between a creature and its target
     */

    // Reference the target
    const target = source.getTarget();

    // Calculate the damage
    const damage = source.calculateDamage();
    const defense = target.calculateDefense();

    // Get the unmitigated damage clamped
    let unmitigatedDamage = this.clamp(
      damage - defense,
      0,
      target.getProperty(CONST.PROPERTIES.HEALTH)
    );

    // If the attacker has a distance weapon equipped
    if (source.isDistanceWeaponEquipped()) {
      // No ammunition?
      if (!source.isAmmunitionEquipped()) {
        return;
      }

      this.handleDistanceCombat(source, target);
    }

    // If there is no damage send a block poff effect
    if (unmitigatedDamage < 0) {
      return getGameServer().world.sendMagicEffect(
        target.position,
        CONST.EFFECT.MAGIC.POFF
      );
    }

    // Precisely zero
    if (unmitigatedDamage === 0) {
      return getGameServer().world.sendMagicEffect(
        target.position,
        CONST.EFFECT.MAGIC.BLOCKHIT
      );
    }

    unmitigatedDamage = 2; // Enforce a minimum damage of 2 (as per original logic)

    // Remove health from the target
    target.decreaseHealth(source, unmitigatedDamage);
  }

  handleDistanceCombat(source: any, target: any): void {
    /*
     * Function CombatHandler.handleDistanceCombat
     * Handles the distance combat
     */

    // Consume the ammunition
    const ammo = source.consumeAmmunition();

    // Write a distance effect
    getGameServer().world.sendDistanceEffect(
      source.position,
      target.position,
      ammo.getShootType()
    );
  }

  applyEnvironmentalDamage(
    target: any,
    amount: number,
    color: number
  ): void {
    /*
     * Function CombatHandler.applyEnvironmentalDamage
     * Applies environmental damage from the game world (fire, energy, poison)
     */

    // Make sure to lock the player in combat
    if (target.isPlayer()) {
      target.combatLock.activate();
    }

    // Decrease the health
    target.decreaseHealth(null, amount, color);
  }

  private clamp(value: number, min: number, max: number): number {
    /*
     * Helper Function
     * Clamps a value between a minimum and a maximum
     */
    return Math.max(min, Math.min(max, value));
  }
}

export default CombatHandler;
