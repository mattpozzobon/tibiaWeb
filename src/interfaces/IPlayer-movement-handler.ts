export interface IPlayerMovementHandler {
  isMoving(): boolean;
  handleMovement(direction: number): void;
  lock(value: number): void;
}
