export interface ICondition {
  id: number;
  numberTicks: number;
  maxNumberTicks: number;
  tickDuration: number;
  applyEvent: { cancel: () => void } | null;

  isPermanent(): boolean;
  isLastTick(): boolean;
  getTotalDuration(): number;
  getRemainingDuration(): number;
  isFirstTick(): boolean;
  getFraction(): number;
  cancel(): void;
}
