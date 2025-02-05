export interface IActions {
  GLOBAL_COOLDOWN: number;

  forEach(callback: (value: Function) => void, scope?: any): void;
  handleActions(scope: any): void;
  isAvailable(action: Function): boolean;
  lock(action: Function, until: number): void;
  remove(action: Function): void;
  add(action: Function): void;
  cleanup(): void;
}
