import { IActions } from "./IActions";
import { ITargetHandler } from "./ITarget-handler";


export interface IActionHandler {
  readonly REGENERATION_DURATION: number;
  actions: IActions;
  targetHandler: ITargetHandler;

  cleanup(): void;
}
