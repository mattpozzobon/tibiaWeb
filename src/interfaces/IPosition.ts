export interface IPosition {
  xy: number;
  z: number;
  x: number;
  y: number;

  isSameFloor(other: IPosition): boolean;
  inLineOfSight(target: IPosition): boolean;
  getSquare(size: number): IPosition[];
  getRadius(radius: number): IPosition[];
  toString(): string;
  copy(): IPosition;
  equals(position: IPosition): boolean;
  addVector(x: number, y: number, z: number): IPosition;
  add(position: IPosition): IPosition;
  subtract(position: IPosition): IPosition;
  getNESW(): IPosition[];
  getPositionFromDirection(direction: number): IPosition | null;
  getFacingDirection(position: IPosition): number;
  west(): IPosition;
  north(): IPosition;
  east(): IPosition;
  south(): IPosition;
  up(): IPosition;
  down(): IPosition;
  northwest(): IPosition;
  northeast(): IPosition;
  southeast(): IPosition;
  southwest(): IPosition;
  ladderNorth(): IPosition;
  ladder(): IPosition;
  random(): IPosition;
  isDiagonal(position: IPosition): boolean;
  toJSON(): { x: number; y: number; z: number };
  manhattanDistance(position: IPosition): number;
  pythagoreanDistance(position: IPosition): number;
  isWithinRangeOf(position: IPosition, range: number): boolean;
  besides(position: IPosition): boolean;
  isVisible(position: IPosition, x: number, y: number): boolean;
  rotate2D(direction: number, x: number, y: number): IPosition;
}

export interface IPositionStatic {
  fromLiteral(position: { x: number; y: number; z: number }): IPosition;
}
