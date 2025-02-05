import { ICreature } from "./ICreature";
import { IPlayer } from "./IPlayer";
import { IPosition } from "./IPosition";
import ITile from "./ITile";

export interface INPC extends ICreature {
  spawnPosition: IPosition;

  listen(player: IPlayer, message: string): void;
  isWithinHearingRange(creature: ICreature): boolean;
  isInConversation(): boolean;
  isTileOccupied(tile: ITile): boolean;
  pauseActions(duration: number): void;
  think(): void;
  setScene(scene: any): void;
}

export default INPC;
