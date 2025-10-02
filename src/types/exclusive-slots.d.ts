export interface ExclusiveSlotConfig {
  slotIndex: number;
  allowedItemTypes: string[];
  allowedItemIds?: number[];
  name?: string;
}

export interface ContainerExclusiveSlots {
  [containerId: number]: ExclusiveSlotConfig[];
}

export interface ItemType {
  name: string;
  itemIds: number[];
}
