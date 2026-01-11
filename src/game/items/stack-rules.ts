import { IItem } from "../../interfaces/IThing";
import { CONFIG } from "../../helper/appContext";

/**
 * Maximum stack count for stackable items
 */
export const MAX_STACK_COUNT = CONFIG.WORLD?.MAXIMUM_STACK_COUNT || 100;

/**
 * Checks if two items can be stacked together
 * @param a - First item
 * @param b - Second item
 * @returns true if items can be stacked
 */
export function canStack(a: IItem, b: IItem): boolean {
  if (!a.isStackable() || !b.isStackable()) {
    return false;
  }
  if (a.id !== b.id) {
    return false;
  }
  return true;
}

/**
 * Calculates the result of merging two stacks
 * @param target - The target stack (will be modified)
 * @param source - The source stack to merge
 * @returns Object with merged count and remainder (null if fully merged)
 */
export function calculateMerge(target: IItem, source: IItem): { merged: number; remainder: number } {
  if (!canStack(target, source)) {
    return { merged: 0, remainder: source.count };
  }

  const total = target.count + source.count;
  const merged = Math.min(total, MAX_STACK_COUNT);
  const remainder = total - merged;

  return { merged, remainder };
}

/**
 * Splits a stack into two items
 * @param item - The item to split
 * @param count - The count to split off
 * @returns Object with the split item and remaining count, or null if invalid
 */
export function calculateSplit(item: IItem, count: number): { split: number; remaining: number } | null {
  if (!item.isStackable()) {
    return null;
  }
  if (count <= 0 || count >= item.count) {
    return null;
  }

  return {
    split: count,
    remaining: item.count - count,
  };
}
