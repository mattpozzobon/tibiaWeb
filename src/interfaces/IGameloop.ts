export interface IGameLoop {
  initialize(): void;
  getCurrentFrame(): number;
  getDataDetails(): { drift: number; tick: number };
  tickModulus(modulus: number): boolean;
}
