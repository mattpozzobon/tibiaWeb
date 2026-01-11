"use strict";

type EnumType = {
  [key: string]: string;
};

const createEnum = (...values: string[]): EnumType => {
  const enumObject: EnumType = {};
  values.forEach((value) => {
    enumObject[value] = value;
  });
  return enumObject;
};

export interface ISceneAction {
  type: string;
  duration: number;
  timeout: number;
}

const ACTIONS = createEnum(
  "ADD",
  "ANCHOR",
  "EFFECT",
  "EMOTE",
  "FACE",
  "FUNCTION",
  "IDLE",
  "MOVE",
  "TALK",
  "TELEPORT"
);

export class SceneAction {
  type: string;
  duration: number;
  timeout: number;

  constructor(action: Partial<ISceneAction> = {}) {
    /*
     * Class SceneAction
     * Code that wraps a single action for an NPC scene
     */

    // Defaults
    this.type = ACTIONS.IDLE;
    this.duration = 0;
    this.timeout = 20;

    Object.assign(this, action);
  }
}

export { ACTIONS };
