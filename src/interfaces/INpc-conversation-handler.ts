import { EventEmitter } from "Ceventemitter";
import { IPlayer } from "./IPlayer";
import { IFocusHandler } from "./INpc-focus-handler";

export interface ConversationConfig {
  hearingRange: number;
  trade: { items: any[] };
  keywords: Record<string, string>;
  farewells: string[];
  greetings: string[];
  sayings: {
    texts: string[];
    rate: number;
    chance: number;
  };
  script: string | null;
}

export interface IConversationHandler extends EventEmitter {
  getHearingRange(): number;
  getFocus(): IPlayer | null;
  respond(message: string, color: number): void;
  emote(message: string, color: number): void;
  privateSay(player: IPlayer, message: string, color: number): void;
  say(message: string, color: number): void;
  hasSayings(): boolean;
  getSayings(): ConversationConfig["sayings"];
  enterAlert(creature: IPlayer): void;
  hasSeen(creature: IPlayer): boolean;
  isInConversation(player?: IPlayer): boolean;
  handleResponse(player: IPlayer, keyword: string): void;
  getTalkStateHandler(): any;
  getFocusHandler(): IFocusHandler;
  setBaseState(baseState: any): void;
  setTalkState(talkState: any, propertyState: any): void;
  abort(): void;
}

export default IConversationHandler;
