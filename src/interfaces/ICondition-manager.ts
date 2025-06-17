import { ICondition } from "./ICondition";

export interface IConditionManager {
  extendCondition(id: number, ticks: number): void;
  getCondition(id: number): ICondition | undefined;
  isDrunk(): boolean;
  replace(condition: ICondition, properties: number | null): boolean;
  forEach(callback: (condition: ICondition, id: number) => void): void;
  has(id: number): boolean;
  remove(id: number): void;
  cleanup(): void;
  cancelAll(): void;
  add(condition: ICondition, properties: number | null): void;
  addCondition(id: number, ticks: number, duration: number, properties: number | null): boolean;
}