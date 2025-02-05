export interface IEvent {
  callback: (() => void) | null;
  isCancelled(): boolean;
  remove(): void;
  getScore(): number;
  cancel(): void;
  remainingFrames(): number;
  execute(): void;
}
