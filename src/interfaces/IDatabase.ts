import House from "Chouse";
import { ConditionModule } from "./base";
import { IActionLoader } from "./Idatabase-action-loader";
import INPC from "./INpc";
import { IPosition } from "./IPosition";
import { IContainer, IThing } from "./IThing";
import { IThingPrototype } from "./IThing-prototype";
import { IDataValidator } from "./IValidator";

export type ThingData = {
  id: number;
  count?: number;
  actionId?: number;
  duration?: number;
  content?: any;
};

export type HouseDefinition = {
  position: IPosition;
  item: ThingData;
};

export interface IDatabase {
  validator: IDataValidator;
  actionLoader: IActionLoader;
  initialize(): void;
  loadHouseItems(): void;
  saveHouses(): void;
  parseThing(item: ThingData): IThing | null;
  createThing(id: number): IThing | null;
  getThingPrototype(id: number): IThingPrototype;
  getMonster(id: string): any | null;
  getRune(id: string): any | null;
  getSpell(id: number): any | null;
  getDoorEvent(aid: string): any | null;
  parseItems(container: IContainer, things: ThingData[]): void;
  getCondition(name: string): ConditionModule | null;
  getClientId(id: number): number;
  readDataDefinition(definition: string): Record<string, any>;
  loadNPCDefinitions(definition: string): Record<string, INPC>;
  loadSpawnDefinitions(definition: string): void;
  loadHouses(definition: string): Map<number, House>;
  loadItemDefinitions(definition: string): Record<string, IThingPrototype>;
  loadDefinitions(definition: string): Record<string, any>;
  readNPCDefinition(name: {
    definition: string;
    enabled: boolean;
    position: IPosition;
  }): INPC | null;
}
