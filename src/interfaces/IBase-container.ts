import { IItem } from "./IThing";

export interface IBaseContainer {
    guid: number;
    size: number;
    slots: Array<any>;
    spectators: Set<any>;

    getPacketSize(): number;
    addSpectator(player: any): void;
    removeSpectator(player: any): void;
    isFull(): boolean;
    copyContents(container: IBaseContainer): void;
    isValidIndex(index: number): boolean;
    getSlots(): Array<any>;
    peekIndex(slotIndex: number): IItem | null;
    addThing(thing: any, index: number): void;
    removeIndex(index: number, count: number): any | null;
    deleteThing(thing: any): number;
    addFirstEmpty(thing: any): void;
}
