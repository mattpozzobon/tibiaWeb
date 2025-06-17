export interface IActionLoader {
  initialize(): void;
  attachClockEvents(filepath: string): void;
  getUniqueActions(uid: number): Array<{ on: string; callback: Function }> | null;
}
