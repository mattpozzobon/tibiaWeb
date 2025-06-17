export interface IUseHandler {
  readonly GLOBAL_USE_COOLDOWN: number;

  handleActionUseWith(packet: any): void;
  handleItemUse(packet: any): void;
  handleTileUse(tile: any): any | null;
}
