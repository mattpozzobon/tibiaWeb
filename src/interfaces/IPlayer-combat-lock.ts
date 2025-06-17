import GenericLock from "Cgeneric-lock";

export interface ICombatLock extends GenericLock{
  activate(): void;
}
