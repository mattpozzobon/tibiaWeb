export interface IDamageMap {
  /**
   * Updates the damage map with damage caused by an attacker.
   * @param attacker The attacker causing the damage.
   * @param amount The amount of damage caused.
   */
  update(attacker: any, amount: number): void;

  /**
   * Distributes experience among all attackers in the damage map.
   */
  distributeExperience(): void;

  /**
   * Gets the divided experience per attacker.
   * @param experience The total experience to divide.
   * @returns The experience divided among attackers.
   */
  getDividedExperience(experience: number): number;
}
