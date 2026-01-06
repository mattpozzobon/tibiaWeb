"use strict";

import Pathfinder from "../../pathfinder/pathfinder";
import Actions from "../../action/actions";
import { ISceneAction, SceneAction, ACTIONS } from "./npc-scene-action";
import { CONST, getGameServer } from "../../helper/appContext";

class CutsceneHandler {
  private npc: any;
  private actions: Actions;
  private __currentSceneAction: ISceneAction | null = null;
  private __scheduledActions: ISceneAction[] = [];
  private __sceneTimeout: number = 0;

  constructor(npc: any) {
    this.npc = npc;
    this.actions = new Actions();
    this.actions.add(this.__handleScene.bind(this));
  }

  public isInScene(): boolean {
    return this.__currentSceneAction !== null;
  }

  public think(): void {
    if (!this.isInScene()) {
      return;
    }
    this.actions.handleActions(this);
  }

  public setScene(scene: { actions: Partial<ISceneAction>[] }): void {
    this.__scheduledActions = scene.actions.map(
      (action) => new SceneAction(action)
    );
    this.__currentSceneAction = this.__scheduledActions.shift() || null;
    getGameServer().world.creatureHandler.sceneNPCs.add(this.npc);
  }

  public abort(): void {
    getGameServer().world.creatureHandler.teleportCreature(this.npc, this.npc.spawnPosition);
    getGameServer().world.sendMagicEffect(
      this.npc.spawnPosition,
      CONST.EFFECT.MAGIC.TELEPORT
    );
    this.__reset();
  }

  private __hasRemainingActions(): boolean {
    return this.__scheduledActions.length > 0;
  }

  private __reset(): void {
    this.__sceneTimeout = 0;
    this.__currentSceneAction = null;
    this.__scheduledActions = [];
    getGameServer().world.creatureHandler.sceneNPCs.delete(this.npc);
    this.npc.pauseActions(50);
  }

  private __completeAction(): void {
    if (this.__hasRemainingActions()) {
      this.__currentSceneAction = this.__scheduledActions.shift() || null;
      return;
    }
    this.__reset();
  }

  private __isTimedOut(action: ISceneAction): boolean {
    return this.__sceneTimeout++ > (action.timeout || 0);
  }

  private __addItemAction(action: any): void {
    const tile = getGameServer().world.getTileFromWorldPosition(action.position);
    if (!tile) return;

    let thing;
    const gameServer = getGameServer();
    if (gameServer && action.item){
      thing = gameServer.database.createThing(action.item)?.setCount(action.count);
    }
    if (action.actionId && thing) {
      thing.setActionId(action.actionId);
    }

    tile.addTopThing(thing);
  }

  private __moveAction(action: any): void {
    if (this.npc.position.equals(action.position)) {
      this.__completeAction();
      return;
    }

    const path = getGameServer().world.findPath(
      this.npc,
      this.npc.position,
      action.position,
      Pathfinder.EXACT
    );

    if (path.length === 0) {
      return;
    }

    const nextTile = path.pop();
    if (!nextTile) return;

    getGameServer().world.creatureHandler.moveCreature(this.npc, nextTile.position);
    this.actions.lock(
      this.__handleScene.bind(this),
      this.npc.getStepDuration(nextTile.getFriction())
    );
  }

  private __handleScene(): void {
    const action = this.__currentSceneAction;
    if (!action) return;

    if (this.__isTimedOut(action)) {
      this.abort();
      return;
    }

    if (action.type === ACTIONS.MOVE) {
      this.__moveAction(action as SceneAction);
      return;
    }

    this.actions.lock(this.__handleScene.bind(this), action.duration || 0);

    switch (action.type) {
      case ACTIONS.IDLE:
        break;
      case ACTIONS.FUNCTION:
        (action as any).callback?.call(this.npc);
        break;
      case ACTIONS.ADD:
        this.__addItemAction(action as any);
        break;
      case ACTIONS.FACE:
        this.npc.setDirection((action as any).direction);
        break;
      case ACTIONS.ANCHOR:
        this.npc.spawnPosition = (action as any).position;
        break;
      case ACTIONS.TELEPORT:
        getGameServer().world.creatureHandler.teleportCreature(this.npc, (action as any).position);
        break;
      case ACTIONS.EMOTE:
        this.npc.sayEmote((action as any).message, (action as any).color);
        break;
      case ACTIONS.TALK:
        this.npc.internalCreatureSay((action as any).message);
        break;
      case ACTIONS.EFFECT:
        getGameServer().world.sendMagicEffect(
          (action as any).position,
          (action as any).effect
        );
        break;
      default:
        break;
    }

    this.__completeAction();
  }
}

export default CutsceneHandler;
