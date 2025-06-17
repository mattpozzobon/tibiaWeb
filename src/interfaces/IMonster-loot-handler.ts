import ICorpse from "./ICorpse";


export interface ILootHandler {
  addLoot(corpse: ICorpse): void;
}
