import { IItem } from "./IThing";


export interface IDoor extends IItem{
  getHouseName(): string;
  getHouseOwner(): string | number;
  open(): void;
  close(): void;
  handleEnterUnwantedDoor(player: any): void;
  handleEnterExpertiseDoor(player: any): void;
  isHouseDoor(): boolean;
  handleHouseDoor(player: any): void;
  toggle(player: any): void;
  isLocked(): boolean;
  isOpened(): boolean;
}