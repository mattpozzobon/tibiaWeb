export interface IBitFlag {
  get(flag: number): boolean;
  set(flag: number): void;
  unset(flag: string): void;
  print(): void;
}

export interface IBitFlagStatic {
  new (flag?: number): IBitFlag;
  create(...args: string[]): IBitFlagStatic;
  flags: Record<string, number>;
}
