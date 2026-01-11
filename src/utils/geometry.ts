import { CONST } from "../helper/appContext";
import { Position } from "./position";

export class Geometry {
  /*
   * Class Geometry
   * Wrapper for some geometrical functions
   */

  getSquare(Position: Position, size: number): Position[] {
    /*
     * Function Geometry.getSquare
     * Returns an array of IPositions with size R around a given Position
     */

    const IPositions: Position[] = [];

    for (let x = -size; x <= size; x++) {
      for (let y = -size; y <= size; y++) {
        IPositions.push(Position.addVector(x, y, 0));
      }
    }

    return IPositions;
  }

  getRadius(Position: Position, radius: number): Position[] {
    /*
     * Function Geometry.getRadius
     * Returns an array of IPositions with radius R around a given Position
     */

    const IPositions: Position[] = [];

    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        // Only include what is inside the circle
        if (x * x + y * y > radius * radius) {
          continue;
        }

        IPositions.push(Position.addVector(x, y, 0));
      }
    }

    return IPositions;
  }

  getAngleBetween(one: Position, two: Position): number {
    /*
     * Function Geometry.getAngleBetween
     * Returns the facing direction between two IPositions
     */

    const angle = Math.atan2(one.y - two.y, one.x - two.x) / Math.PI;

    if (angle >= -0.75 && angle < -0.25) {
      return CONST.DIRECTION.SOUTH;
    } else if (angle >= -0.25 && angle < 0.25) {
      return CONST.DIRECTION.WEST;
    } else if (angle >= 0.25 && angle < 0.75) {
      return CONST.DIRECTION.NORTH;
    } else {
      return CONST.DIRECTION.EAST;
    }
  }

  rotate2D(Position: Position, direction: number, x: number, y: number): Position {
    /*
     * Function Geometry.rotate2D
     * Rotates a vector in 2-dimensions (90 deg. increments)
     */

    switch (direction) {
      case CONST.DIRECTION.NORTH:
        return Position.addVector(x, y, 0);
      case CONST.DIRECTION.EAST:
        return Position.addVector(-y, -x, 0);
      case CONST.DIRECTION.SOUTH:
        return Position.addVector(x, -y, 0);
      case CONST.DIRECTION.WEST:
        return Position.addVector(y, -x, 0);
      default:
        return Position;
    }
  }

  interpolate(source: Position, target: Position): Position[] {
    /*
     * Function Geometry.interpolate
     * Interpolates all tiles between the source and target
     */

    const xLerp = target.x - source.x;
    const yLerp = target.y - source.y;
    const steps = Math.max(Math.abs(xLerp), Math.abs(yLerp)) + 1;
    const IPositions: Position[] = [];

    for (let i = 0; i < steps; i++) {
      const fraction = i / (steps - 1);
      const x = Math.round(fraction * xLerp);
      const y = Math.round(fraction * yLerp);

      IPositions.push(source.addVector(x, y, 0));
    }

    return IPositions;
  }
}

export default Geometry;
