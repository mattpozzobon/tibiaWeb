export interface ConditionModule {
    onStart: (creature: any, properties: number) => void;
    onExpire: (creature: any) => void;
    onTick?: (creature: any) => void;
  }
