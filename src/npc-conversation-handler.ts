import INPC from "interfaces/INpc";
import { EventEmitter } from "./eventemitter";
import { FocusHandler } from "./npc-focus-handler";
import TradeHandler from "./npc-trade-handler";
import Player from "./player";
import { getDataFile } from "./helper/appContext";
import IConversationHandler, { ConversationConfig } from "interfaces/INpc-conversation-handler";
import { IFocusHandler } from "interfaces/INpc-focus-handler";
import { IPlayer } from "interfaces/IPlayer";


export class ConversationHandler extends EventEmitter implements IConversationHandler {
  private npc: INPC;
  private __seenCreatures: WeakSet<Player>;
  private conversation: ConversationConfig;
  private tradeHandler: TradeHandler;
  private __focusHandler: IFocusHandler;

  constructor(npc: INPC, conversation: Partial<ConversationConfig>) {
    super();

    this.npc = npc;
    this.__seenCreatures = new WeakSet();

    this.conversation = {
      hearingRange: 5,
      trade: { items: [] as any[] },
      keywords: {},
      farewells: [],
      greetings: [],
      sayings: {
        texts: [],
        rate: 300,
        chance: 1.0,
      },
      script: null,
      ...conversation,
    };

    this.tradeHandler = new TradeHandler(npc, this.conversation.trade);
    this.__focusHandler = new FocusHandler(this);

    this.__focusHandler.on("focusIdle", () => this.__resetEmitter("idle"));
    this.__focusHandler.on("focusLogout", () => this.__resetEmitter("exit"));
    this.__focusHandler.on("focusMove", () => this.__handleFocusMove());

    if (this.conversation.script) {
      this.__loadScript(this.conversation.script);
    }
  }

  getHearingRange(): number {
    return this.conversation.hearingRange;
  }

  private __handleFocusMove(): void {
    const focus = this.getFocus();

    if(focus){
    this.npc.faceCreature(focus);

    if (!this.npc.isWithinHearingRange(focus)) {
      this.__resetEmitter("exit");
    }
   }
  }

  getFocus(): IPlayer | null {
    return this.__focusHandler.getFocus();
  }

  respond(message: string, color: number): void {
    if (this.isInConversation()) {
      this.getFocusHandler().extendFocus(message.length * 4);
    }
    this.say(message, color);
  }

  emote(message: string, color: number): void {
    // TODO
    // this.npc.emote(message, color);
  }

  privateSay(player: Player, message: string, color: number): void {
    // TODO
    //this.npc.privateSay(player, message, color);
  }

  say(message: string, color: number): void {
    // TODO
    //this.npc.internalCreatureSay(message, color);
  }

  hasSayings(): boolean {
    return this.getSayings().texts.length > 0;
  }

  getSayings(): ConversationConfig["sayings"] {
    return this.conversation.sayings;
  }

  enterAlert(creature: Player): void {
    this.__seenCreatures.add(creature);
    this.emit("enter", creature);
  }

  hasSeen(creature: Player): boolean {
    return this.__seenCreatures.has(creature);
  }

  isInConversation(player?: Player): boolean {
    return this.getFocusHandler().isInConversation(player);
  }

  handleResponse(player: Player, keyword: string): void {
    if (this.__isGreeting(keyword)) {
      this.__handleGreeting(player);
      return;
    }

    if (!this.isInConversation(player)) {
      return;
    }

    if (this.__isGoodbye(keyword)) {
      this.__resetEmitter("defocus");
      return;
    }

    if (this.__isDefaultKeyword(keyword)) {
      this.respond(this.conversation.keywords[keyword], 0);
      return;
    }

    this.getTalkStateHandler().handle(player, keyword);
  }

  getTalkStateHandler(): any {
    return this.getFocusHandler().getTalkStateHandler();
  }

  getFocusHandler(): IFocusHandler {
    return this.__focusHandler;
  }

  setBaseState(baseState: any): void {
    this.getTalkStateHandler().setBaseState(baseState);
  }

  setTalkState(talkState: any, propertyState: any): void {
    this.getTalkStateHandler().setTalkState(talkState, propertyState);
  }

  private __loadScript(script: string): void {
    if (!script) {
      return;
    }

    const scriptModule = require(getDataFile("npcs", "definitions", "script", script));
    scriptModule.call(this);
  }

  private __handleGreeting(player: Player): void {
    if (!this.isInConversation()) {
      this.__acceptConversation(player);
      return;
    }

    if (this.isInConversation(player)) {
      this.emit("regreet", this.getFocus());
      return;
    }

    this.emit("busy", this.getFocus(), player);
  }

  private __acceptConversation(player: Player): void {
    this.getFocusHandler().setFocus(player);
    const focus = this.getFocus();
    if (focus)
    this.npc.faceCreature(focus);
    this.emit("focus", player);
  }

  abort(): void {
    this.__resetEmitter("abort");
  }

  private __resetEmitter(which: string): void {
    this.emit(which, this.getFocus());
    this.getFocusHandler().reset();
    this.npc.pauseActions(50);
  }

  private __isGoodbye(string: string): boolean {
    return this.conversation.farewells.includes(string);
  }

  private __isGreeting(string: string): boolean {
    return this.conversation.greetings.includes(string);
  }

  private __isDefaultKeyword(keyword: string): boolean {
    return this.getTalkStateHandler().isDefaultState() && keyword in this.conversation.keywords;
  }
}
