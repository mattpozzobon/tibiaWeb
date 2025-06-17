import { IContainer } from "./IThing";


interface ICorpse extends IContainer {
  getFluidType(): string;
}

export default ICorpse;