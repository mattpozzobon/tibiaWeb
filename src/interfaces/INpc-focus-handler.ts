import { EventEmitter } from "Ceventemitter";
import { IPlayer } from "./IPlayer";
import { ITalkStateHandler } from "./INpc-talk-state-handler";

export interface IFocusHandler extends EventEmitter {
  getTalkStateHandler(): ITalkStateHandler;
  extendFocus(duration: number): void;
  setFocus(player: IPlayer): void;
  reset(): void;
  getFocus(): IPlayer | null;
  isInConversation(player?: IPlayer): boolean;
}
