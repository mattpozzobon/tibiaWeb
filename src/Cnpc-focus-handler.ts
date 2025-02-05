import { ITalkStateHandler } from "interfaces/INpc-talk-state-handler";
import { EventEmitter } from "./Ceventemitter";
import GenericLock from "./Cgeneric-lock";
import { TalkStateHandler } from "./Cnpc-talk-state-handler";
import Player from "./Cplayer";
import { IPlayer } from "interfaces/IPlayer";
import IConversationHandler from "interfaces/INpc-conversation-handler";
import { IFocusHandler } from "interfaces/INpc-focus-handler";


export class FocusHandler extends EventEmitter implements IFocusHandler{
  private conversationHandler: IConversationHandler;
  private __talkStateHandler: ITalkStateHandler;
  private __conversationFocus: IPlayer | null = null;
  private __conversationFocusIdleEvent: GenericLock;
  private __conversationFocusMovementEvent: (() => void) | null = null;
  private __conversationFocusLogoutEvent: (() => void) | null = null;

  private readonly IDLE_TIMEOUT_FRAMES = 250;

  constructor(conversationHandler: IConversationHandler) {
    super();

    this.conversationHandler = conversationHandler;
    this.__talkStateHandler = new TalkStateHandler(conversationHandler);
    this.__conversationFocusIdleEvent = new GenericLock();

    this.__conversationFocusIdleEvent.on("unlock", () => this.emit("focusIdle"));
  }

  extendFocus(duration: number): void {
    /*
     * Extends the focus of the NPC by a given or default amount.
     */
    if (!this.isInConversation()) {
      return;
    }

    this.__conversationFocusIdleEvent.lock(
      Math.max(this.IDLE_TIMEOUT_FRAMES, duration)
    );
  }

  setFocus(player: Player): void {
    /*
     * Sets the focus of an NPC to the player.
     */
    if (this.isInConversation()) {
      return;
    }

    this.__conversationFocus = player;

    this.__conversationFocusMovementEvent = () =>
      this.emit("focusMove");
    this.__conversationFocusLogoutEvent = () =>
      this.emit("focusLogout");

    player.on("move", this.__conversationFocusMovementEvent);
    player.on("logout", this.__conversationFocusLogoutEvent);

    this.extendFocus(this.IDLE_TIMEOUT_FRAMES);
  }

  getTalkStateHandler(): ITalkStateHandler {
    /*
     * Returns the talk state handler.
     */
    return this.__talkStateHandler;
  }

  reset(): void {
    /*
     * Resets the focus of the NPC and cleans up remaining events.
     */
    if (!this.isInConversation()) {
      return;
    }

    this.__conversationFocusIdleEvent.cancel();

    if (this.__conversationFocus) {
      if (this.__conversationFocus) {
        if (this.__conversationFocusLogoutEvent) {
          this.__conversationFocus.off("logout", this.__conversationFocusLogoutEvent);
        }
        if (this.__conversationFocusMovementEvent) {
          this.__conversationFocus.off("move", this.__conversationFocusMovementEvent);
        }
      }
    }

    this.__conversationFocus = null;
    this.__conversationFocusLogoutEvent = null;
    this.__conversationFocusMovementEvent = null;

    this.__talkStateHandler.reset();
  }

  getFocus(): IPlayer | null {
    /*
     * Returns the current focus of the NPC.
     */
    return this.__conversationFocus;
  }

  isInConversation(player?: Player): boolean {
    /*
     * Returns true if the NPC is focused and speaking to a player.
     */
    const focus = this.getFocus();

    if (player === undefined) {
      return focus !== null;
    }

    return focus === player;
  }
}
