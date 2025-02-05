export interface ITalkStateHandler {
  handle(player: any, keyword: string): void;
  isDefaultState(): boolean;
  setTalkState(
    talkState: (player: any, keyword: string) => void,
    propertyState?: object
  ): void;
  reset(): void;
  setBaseState(baseState: (state?: any) => void): void;
}
