import GenericLock from "../generic-lock";

export interface ICombatLock extends GenericLock {
  activate(): void;
  isLocked(): boolean;
  cleanup(): void;
}
