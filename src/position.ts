import { IPosition } from "interfaces/IPosition";
import Geometry from "./geometry";
import { CONST, getGameServer } from "./helper/appContext";
import { IGameServer } from "interfaces/IGameserver";

export class Position implements IPosition{
  public xy: number;
  public z: number;

  constructor(x: number, y: number, z: number) {
    this.xy = x + ((y << 16) >>> 0); // Pack x and y into a single number
    this.z = z;
  }

  get x(): number {
    return this.xy & ((1 << 16) - 1);
  }

  get y(): number {
    return this.xy >>> 16;
  }

  isSameFloor(other: Position): boolean {
    return this.z === other.z;
  }

  inLineOfSight(target: Position): boolean {
    if (this.besides(target)) return true;
    if (this.z !== target.z) return false;

    const gameServer: IGameServer = getGameServer();
    for (const position of Geometry.prototype.interpolate(this, target)) {
      const tile = gameServer.world.getTileFromWorldPosition(position);
      if (!tile) continue;
      if (tile.isBlockProjectile()) return false;
    }
    return true;
  }

  static fromLiteral(position: { x: number; y: number; z: number }): Position {
    return new Position(position.x, position.y, position.z);
  }

  getSquare(size: number): Position[] {
    return Geometry.prototype.getSquare(this, size);
  }

  getRadius(radius: number): Position[] {
    return Geometry.prototype.getRadius(this, radius);
  }

  toString(): string {
    return `${this.x}, ${this.y}, ${this.z}`;
  }

  copy(): Position {
    return new Position(this.x, this.y, this.z);
  }

  equals(position: Position): boolean {
    return this.x === position.x && this.y === position.y && this.z === position.z;
  }

  addVector(x: number, y: number, z: number): Position {
    return new Position(this.x + x, this.y + y, this.z + z);
  }

  add(position: Position): Position {
    return new Position(this.x + position.x, this.y + position.y, this.z + position.z);
  }

  getNESW(): Position[] {
    return [this.north(), this.east(), this.south(), this.west()];
  }

  subtract(position: Position): Position {
    return new Position(this.x - position.x, this.y - position.y, this.z - position.z);
  }

  getPositionFromDirection(direction: number): Position | null {
    switch (direction) {
      case CONST.DIRECTION.NORTH:
        return this.north();
      case CONST.DIRECTION.EAST:
        return this.east();
      case CONST.DIRECTION.SOUTH:
        return this.south();
      case CONST.DIRECTION.WEST:
        return this.west();
      case CONST.DIRECTION.NORTHWEST:
        return this.northwest();
      case CONST.DIRECTION.NORTHEAST:
        return this.northeast();
      case CONST.DIRECTION.SOUTHEAST:
        return this.southeast();
      case CONST.DIRECTION.SOUTHWEST:
        return this.southwest();
      default:
        return null;
    }
  }

  getFacingDirection(position: Position): number {
    return Geometry.prototype.getAngleBetween(this, position);
  }

  west(): Position {
    return new Position(this.x - 1, this.y, this.z);
  }

  north(): Position {
    return new Position(this.x, this.y - 1, this.z);
  }

  east(): Position {
    return new Position(this.x + 1, this.y, this.z);
  }

  south(): Position {
    return new Position(this.x, this.y + 1, this.z);
  }

  up(): Position {
    return new Position(this.x, this.y, this.z + 1);
  }

  down(): Position {
    return new Position(this.x, this.y, this.z - 1);
  }

  northwest(): Position {
    return new Position(this.x - 1, this.y - 1, this.z);
  }

  northeast(): Position {
    return new Position(this.x + 1, this.y - 1, this.z);
  }

  southeast(): Position {
    return new Position(this.x + 1, this.y + 1, this.z);
  }

  southwest(): Position {
    return new Position(this.x - 1, this.y + 1, this.z);
  }

  ladderNorth(): Position {
    return new Position(this.x, this.y - 1, this.z + 1);
  }

  ladder(): Position {
    return new Position(this.x, this.y + 1, this.z + 1);
  }

  random(): Position {
    const randomDirection = Math.floor(Math.random() * 4);
    switch (randomDirection) {
      case 0:
        return this.north();
      case 1:
        return this.east();
      case 2:
        return this.south();
      case 3:
        return this.west();
      default:
        return this.south();
    }
  }  

  isDiagonal(position: Position): boolean {
    return Math.abs(this.x - position.x) === 1 && Math.abs(this.y - position.y) === 1;
  }

  toJSON(): { x: number; y: number; z: number } {
    return { x: this.x, y: this.y, z: this.z };
  }

  manhattanDistance(position: Position): number {
    return Math.abs(this.x - position.x) + Math.abs(this.y - position.y);
  }

  pythagoreanDistance(position: Position): number {
    return Math.ceil(
      Math.sqrt((this.x - position.x) ** 2 + (this.y - position.y) ** 2)
    );
  }

  isWithinRangeOf(position: Position, range: number): boolean {
    if (this.z !== position.z) return false;
    return this.pythagoreanDistance(position) < range;
  }

  besides(position: Position): boolean {
    if (this.z !== position.z) return false;
    if (this.equals(position)) return true;
    return Math.max(Math.abs(this.x - position.x), Math.abs(this.y - position.y)) === 1;
  }

  isVisible(position: Position, x: number, y: number): boolean {
    return Math.abs(this.x - position.x) < x && Math.abs(this.y - position.y) < y;
  }

  rotate2D(direction: number, x: number, y: number): Position {
    return Geometry.prototype.rotate2D(this, direction, x, y);
  }
}
