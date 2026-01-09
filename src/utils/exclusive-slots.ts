import { getGameServer } from '../helper/appContext';
import { ExclusiveSlotConfig, ContainerExclusiveSlots, ItemType } from '../types/exclusive-slots';

class ExclusiveSlotsManager {
  private itemTypes: Map<string, ItemType>;
  private containerSlots: ContainerExclusiveSlots;

  constructor() {
    this.itemTypes = new Map();
    this.containerSlots = {};
    // Don't load item types here - wait for initialize() to be called after database is ready
  }

  /**
   * Initialize item types (called after database is loaded)
   * Builds the itemTypes map by scanning all items in definitions.json
   */
  initialize(): void {
    const database = getGameServer()?.database;
    if (!database) {
      console.warn('ExclusiveSlotsManager.initialize() called but database is not available');
      return;
    }

    // Read definitions.json to build itemTypes map from item properties
    const definitions = database.readDataDefinition('items');
    
    // Build itemTypes map by scanning all items and grouping by itemType property
    const itemTypesMap: { [key: string]: number[] } = {};
    
    Object.entries(definitions).forEach(([key, item]: [string, any]) => {
      // Skip non-item entries
      if (!item || !item.properties) {
        return;
      }
      
      const itemType = item.properties.itemType;
      if (itemType && item.id) {
        // item.id is the client ID
        if (!itemTypesMap[itemType]) {
          itemTypesMap[itemType] = [];
        }
        if (!itemTypesMap[itemType].includes(item.id)) {
          itemTypesMap[itemType].push(item.id);
        }
      }
    });
    
    // Convert to ItemType format and store in map
    Object.entries(itemTypesMap).forEach(([typeName, itemIds]) => {
      this.itemTypes.set(typeName, {
        name: typeName.charAt(0).toUpperCase() + typeName.slice(1),
        itemIds: itemIds.sort((a, b) => a - b)
      });
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
   * Note: Container slots are now defined in definitions.json properties, not here
   * This method is kept for backward compatibility but always returns empty array
   */
  getContainerSlots(containerId: number): ExclusiveSlotConfig[] {
    // definitions.json is the single source of truth - container slots are in item properties
    return [];
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
   * Lazy-loads item types from definitions.json on first access
   */
  getItemType(typeName: string): ItemType | undefined {
    // Lazy-load item types if not already loaded
    if (this.itemTypes.size === 0) {
      this.initialize();
    }
    return this.itemTypes.get(typeName);
  }
}

// Export singleton instance
export const exclusiveSlotsManager = new ExclusiveSlotsManager();
export default exclusiveSlotsManager;
