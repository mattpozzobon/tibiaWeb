import GenericLock from "./Cgeneric-lock";
import { getGameServer } from "./helper/appContext";


class PlayerMovementHandler {
  private __player: any;
  private __moveLock: GenericLock;
  private __clientMoveBuffer: number | null = null;

  constructor(player: any) {
    /*
     * Class PlayerMovementHandler
     * Handler for movement of the player
     */

    // Reference the parent
    this.__player = player;

    // Create a generic lock for movement
    this.__moveLock = new GenericLock();
    this.__moveLock.on("unlock", this.__unlockMovementAction.bind(this));

    // The buffer if more consecutive inputs are given by the client
    this.__clientMoveBuffer = null;
  }

  isMoving(): boolean {
    /*
     * Function PlayerMovementHandler.isMoving
     * Returns true if the creature is moving and does not have the move action available
     */
    return this.__moveLock.isLocked();
  }

  lock(value: number): void {
    this.__moveLock.lock(value);
  }

  handleMovement(direction: number): void {
    /*
     * Function PlayerMovementHandler.handleMovement
     * Callback fired when a particular function is unlocked
     */

    // If the player has its move action locked: set the movement buffer
    if (this.isMoving()) {
      this.__setMoveBuffer(direction);
      return;
    }

    const position = this.__player.getPosition().getPositionFromDirection(direction);

    // Move the player
    const tile = getGameServer().world.getTileFromWorldPosition(position);

    const isDiagonal = this.__player.getPosition().isDiagonal(position);
    let stepDuration = tile === null || tile.id === 0 ? 10: this.__player.getStepDuration(tile.getFriction());
    if (isDiagonal) {
      stepDuration *= 1.414; // Apply diagonal movement penalty
    }
    // Lock movement action
    this.__moveLock.lock(stepDuration);

    // Move the player by walking!
    const success = getGameServer().world.creatureHandler.moveCreature(this.__player, position);

    // Not successful: teleport to the current position
    if (!success) {
      getGameServer().world.creatureHandler.teleportCreature(this.__player, this.__player.position);
    } 
  }

  private __unlockMovementAction(): void {
    /*
     * Function PlayerMovementHandler.__unlockMovementAction
     * Callback fired when a particular function is unlocked
     */

    // Movement buffer actions must have special handling
    if (this.__clientMoveBuffer === null) {
      return;
    }

    this.handleMovement(this.__clientMoveBuffer);

    // Clear the buffer
    this.__setMoveBuffer(null);
  }

  private __setMoveBuffer(direction: number | null): void {
    /*
     * Function PlayerMovementHandler.__setMoveBuffer
     * Updates the server-side movement buffer of the player
     */

    // Sets the server-side move buffer
    this.__clientMoveBuffer = direction;
  }
}

export default PlayerMovementHandler;