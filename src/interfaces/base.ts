import { ICreature } from "./ICreature";

export interface ConditionModule {
    onStart: (creature: ICreature, properties: number) => void;
    onExpire: (creature: ICreature) => void;
    onTick?: (creature: ICreature) => void;
  }
  