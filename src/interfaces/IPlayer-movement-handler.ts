export interface IPlayerMovementHandler {
  isMoving(): boolean;
  handleMovement(direction: string): void;
  lock(value: number): void;
}
