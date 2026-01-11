import Actions from "../../action/actions";
import Creature from "../creature";
import NPCBehaviour from "./npc-behaviour-handler";
import { ConversationHandler } from "./npc-conversation-handler";
import CutsceneHandler from "./npc-scene-handler";
import Player from "../player/player";
import { Position } from "../../utils/position";
import Tile from "../../thing/tile";
import { CONST, getGameServer } from "../../helper/appContext";
import { randomStringArray } from "../../utils/functions";


class NPC extends Creature {
  /*
   * Class NPC
   * Container for non-playable characters that can be interacted with
   */

  spawnPosition: Position;
  private conversationHandler: ConversationHandler;
  private behaviourHandler: NPCBehaviour;
  private cutsceneHandler: CutsceneHandler;
  private actions: Actions;

  constructor(data: {
    creatureStatistics: any;
    conversation: any;
    behaviourHandler: any;
  }) {
    super(data.creatureStatistics);

    this.conversationHandler = new ConversationHandler(this, data.conversation);
    this.behaviourHandler = new NPCBehaviour(this, data.behaviourHandler);
    this.cutsceneHandler = new CutsceneHandler(this);
    this.spawnPosition = this.position;
    this.actions = new Actions();

    this.__registerActions();
  }

  private __registerActions(): void {
    /*
     * Registers the available actions for the NPC: these are fired whenever available
     */
    if (this.behaviourHandler.isWandering()) {
      this.actions.add(this.handleActionWander.bind(this));
    }

    if (this.conversationHandler.hasSayings()) {
      this.actions.add(this.handleActionSpeak.bind(this));
    }
  }

  listen(player: Player, message: string): void {
    /*
     * Listens to incoming messages in the default channel
     */
    if (this.cutsceneHandler.isInScene()) {
      return;
    }

    if (!this.isWithinHearingRange(player)) {
      return;
    }

    this.conversationHandler.handleResponse(player, message);
  }

  isWithinHearingRange(creature: Creature): boolean {
    /*
     * Checks if the creature is within hearing range
     */
    return this.isWithinRangeOf(creature, this.conversationHandler.getHearingRange());
  }

  isInConversation(): boolean {
    /*
     * Checks if the NPC is currently occupied in a conversation
     */
    return this.conversationHandler.isInConversation();
  }

  isTileOccupied(tile: Tile): boolean {
    /*
     * Checks if the tile is occupied for the NPC
     */
    return this.behaviourHandler.isTileOccupied(tile);
  }

  private handleActionWander(): void {
    /*
     * Handles the NPC movement
     */
    const tile = this.behaviourHandler.getWanderMove();

    if (tile === null) {
      this.actions.lock(this.handleActionWander.bind(this), this.actions.GLOBAL_COOLDOWN);
      return;
    }

    getGameServer().world.creatureHandler.moveCreature(this, tile.position);
    this.actions.lock(this.handleActionWander.bind(this), this.behaviourHandler.getStepDuration(tile));
  }

  pauseActions(duration: number): void {
    /*
     * Briefly pauses NPC actions
     */
    this.actions.lock(this.handleActionWander.bind(this), duration);
    this.actions.lock(this.handleActionSpeak.bind(this), duration);
  }

  think(): void {
    /*
     * Called every server frame to handle NPC actions
     */
    if (this.isInConversation() || this.cutsceneHandler.isInScene()) {
      return;
    }

    this.actions.handleActions(this);
  }

  private handleActionSpeak(): void {
    /*
     * Handles speaking action of the NPC
     */
    const sayings = this.conversationHandler.getSayings();

    if (Math.random() > 1.0 - sayings.chance) {
      const text = randomStringArray(sayings.texts);
      if (text){
        this.speechHandler.internalCreatureSay(text, CONST.COLOR.YELLOW);
      }
    }

    this.actions.lock(this.handleActionSpeak.bind(this), sayings.rate);
  }

  setScene(scene: any): void {
    /*
     * Sets the NPC state to that of the scene
     */
    if (this.cutsceneHandler.isInScene()) {
      this.cutsceneHandler.abort();
    }

    if (this.isInConversation()) {
      this.conversationHandler.abort();
    }

    this.cutsceneHandler.setScene(scene);
  }
}

export default NPC;
