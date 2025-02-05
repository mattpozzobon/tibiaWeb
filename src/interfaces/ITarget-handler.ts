export interface ITargetHandler {
  hasTarget(): boolean;
  getTarget(): any | null;
  setTarget(target: any | null): void;
  isBesidesTarget(): boolean;
}
