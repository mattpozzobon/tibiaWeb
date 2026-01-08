import exclusiveSlotsConfig from '../config/exclusive-slots.json';
import { ExclusiveSlotConfig, ContainerExclusiveSlots, ItemType } from '../types/exclusive-slots';

class ExclusiveSlotsManager {
  private itemTypes: Map<string, ItemType>;
  private containerSlots: ContainerExclusiveSlots;

  constructor() {
    this.itemTypes = new Map();
    this.containerSlots = {};

    // Load item types
    Object.entries(exclusiveSlotsConfig.itemTypes).forEach(([key, itemType]) => {
      this.itemTypes.set(key, itemType as ItemType);
    });

    // Load container slot configurations
    Object.entries(exclusiveSlotsConfig.containerSlots).forEach(([containerId, slots]) => {
      this.containerSlots[parseInt(containerId)] = slots as ExclusiveSlotConfig[];
    });
  }

  /**
   * Check if an item can be placed in a specific slot of a container
   */
  canPlaceItem(containerId: number, slotIndex: number, itemId: number): boolean {
    const containerSlots = this.containerSlots[containerId];
    if (!containerSlots) {
      return true; // No restrictions for this container
    }

    const slotConfig = containerSlots.find(slot => slot.slotIndex === slotIndex);
    if (!slotConfig) {
      return true; // No restrictions for this slot
    }

    // Check if item ID is explicitly allowed
    if (slotConfig.allowedItemIds && slotConfig.allowedItemIds.includes(itemId)) {
      return true;
    }

    // Check if item type is allowed
    if (slotConfig.allowedItemTypes) {
      return slotConfig.allowedItemTypes.some(typeName => {
        const itemType = this.itemTypes.get(typeName);
        return itemType && itemType.itemIds.includes(itemId);
      });
    }

    return false;
  }

  /**
   * Get the exclusive slot configuration for a container
   */
  getContainerSlots(containerId: number): ExclusiveSlotConfig[] {
    return this.containerSlots[containerId] || [];
  }

  /**
   * Check if a slot is exclusive (has restrictions)
   */
  isExclusiveSlot(containerId: number, slotIndex: number): boolean {
    const containerSlots = this.containerSlots[containerId];
    if (!containerSlots) {
      return false;
    }

    return containerSlots.some(slot => slot.slotIndex === slotIndex);
  }

  /**
   * Get allowed item types for a specific slot
   */
  getAllowedItemTypes(containerId: number, slotIndex: number): string[] {
    const containerSlots = this.containerSlots[containerId];
    if (!containerSlots) {
      return [];
    }

    const slotConfig = containerSlots.find(slot => slot.slotIndex === slotIndex);
    return slotConfig ? slotConfig.allowedItemTypes || [] : [];
  }

  /**
   * Get allowed item IDs for a specific slot
   */
  getAllowedItemIds(containerId: number, slotIndex: number): number[] {
    const containerSlots = this.containerSlots[containerId];
    if (!containerSlots) {
      return [];
    }

    const slotConfig = containerSlots.find(slot => slot.slotIndex === slotIndex);
    if (!slotConfig) {
      return [];
    }

    let allowedIds: number[] = [];

    // Add explicitly allowed item IDs
    if (slotConfig.allowedItemIds) {
      allowedIds = [...allowedIds, ...slotConfig.allowedItemIds];
    }

    // Add item IDs from allowed types
    if (slotConfig.allowedItemTypes) {
      slotConfig.allowedItemTypes.forEach(typeName => {
        const itemType = this.itemTypes.get(typeName);
        if (itemType) {
          allowedIds = [...allowedIds, ...itemType.itemIds];
        }
      });
    }

    return [...new Set(allowedIds)]; // Remove duplicates
  }

  /**
   * Get the name/description of an exclusive slot
   */
  getSlotName(containerId: number, slotIndex: number): string | null {
    const containerSlots = this.containerSlots[containerId];
    if (!containerSlots) {
      return null;
    }

    const slotConfig = containerSlots.find(slot => slot.slotIndex === slotIndex);
    return slotConfig ? slotConfig.name || null : null;
  }

  /**
   * Get an item type by name
   */
  getItemType(typeName: string): ItemType | undefined {
    return this.itemTypes.get(typeName);
  }
}

// Export singleton instance
export const exclusiveSlotsManager = new ExclusiveSlotsManager();
export default exclusiveSlotsManager;
