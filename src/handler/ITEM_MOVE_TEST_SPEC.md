# ItemMoveHandler Test Specification

This document defines all possible execution paths and behaviors for comprehensive testing of the `ItemMoveHandler` class.

## Overview

The `ItemMoveHandler` manages all item movement operations including validation, swaps, and standard moves between different location types: `Container`, `Equipment`, and `Tile`.

---

## Method: `validateAndMoveItem`

**Purpose**: Main entry point that validates all conditions before executing a move.

### Execution Paths

#### Path 1.1: Null/Invalid Location Check
- **Condition**: `!fromWhere || !toWhere`
- **Behavior**: Returns early (silent failure)
- **Expected Result**: No action taken, no message sent

#### Path 1.2: Distance Check (Tile Source)
- **Condition**: `fromWhere instanceof Tile && !player.position.besides(fromWhere.position)`
- **Behavior**: Sends cancel message and returns
- **Expected Result**: `"You are not close enough."`

#### Path 1.3: Line of Sight Check (Tile Destination)
- **Condition**: `toWhere instanceof Tile && !player.position.inLineOfSight(toWhere.position)`
- **Behavior**: Sends cancel message and returns
- **Expected Result**: `"You cannot throw this item here."`

#### Path 1.4: Item Not Found
- **Condition**: `fromItem === null`
- **Behavior**: Returns early (silent failure)
- **Expected Result**: No action taken

#### Path 1.5: Item Not Moveable
- **Condition**: `!fromItem.isMoveable() || fromItem.hasUniqueId()`
- **Behavior**: Sends cancel message and returns
- **Expected Result**: `"You cannot move this item."`

#### Path 1.6: Mailbox Handling (Tile Destination)
- **Condition**: `toWhere instanceof Tile && toWhere.hasItems() && toWhere.itemStack!.isMailbox() && mailboxHandler.canMailItem(fromItem)`
- **Behavior**: Delegates to `mailboxHandler.sendThing()`
- **Expected Result**: Mailbox processing (parcel/letter sending)

#### Path 1.7: Destination Not Found (Tile)
- **Condition**: `toWhere instanceof Tile && !toWhere2` (from `findDestination`)
- **Behavior**: Sends cancel message and returns
- **Expected Result**: `"You cannot add this item here."`

#### Path 1.8: Trashholder (Tile Destination)
- **Condition**: `toWhere instanceof Tile && toWhere2.isTrashholder()`
- **Behavior**: 
  - Sends magic effect
  - Calls `fromItem.cleanup()`
  - Removes item from source
  - Returns early
- **Expected Result**: Item deleted, magic effect displayed

#### Path 1.9: Solid Item Blocking (Tile Destination)
- **Condition**: `toWhere instanceof Tile && toWhere2.hasItems() && toWhere2.itemStack.isItemSolid()`
- **Behavior**: Sends cancel message and returns
- **Expected Result**: `"You cannot add this item here."`

#### Path 1.10: Blocked Tile (Tile Destination)
- **Condition**: `toWhere instanceof Tile && toWhere2.isBlockSolid() && toWhere2.isOccupiedAny()`
- **Behavior**: Sends cancel message and returns
- **Expected Result**: `"You cannot add this item here."`

#### Path 1.11: Insufficient Capacity (Moving to Player Inventory)
- **Condition**: `toWhere.getTopParent() === player && !player.hasSufficientCapacity(fromItem) && (fromWhere is DepotContainer || parents differ)`
- **Behavior**: Sends cancel message and returns
- **Expected Result**: `"Your capacity is insufficient to carry this item."`

#### Path 1.12: Capacity OK (Same Parent)
- **Condition**: `toWhere.getTopParent() === player && !player.hasSufficientCapacity(fromItem) && fromWhere is not DepotContainer && parents are same`
- **Behavior**: Continues (capacity check bypassed for same-parent moves)
- **Expected Result**: Move proceeds

#### Path 1.13: Swap Attempt (Same Container, Different Index)
- **Condition**: `isSameContainer(fromWhere, toWhere) && fromIndex !== toIndex && both items exist and are moveable`
- **Behavior**: 
  - Attempts swap via `moveItem()`
  - If successful, returns early
  - If failed, falls through to standard move
- **Expected Result**: Swap attempted, then standard move if swap fails

#### Path 1.14: Standard Move - Cannot Add
- **Condition**: `maxCount === 0` (from `getMaximumAddCount`)
- **Behavior**: Sends cancel message and returns
- **Expected Result**: `"You cannot add this item here."`

#### Path 1.15: Standard Move - Success
- **Condition**: `maxCount > 0`
- **Behavior**: 
  - Calculates `realCount = Math.min(count, maxCount)`
  - Calls `moveItem()` with real count
- **Expected Result**: Move executed

---

## Method: `moveItem`

**Purpose**: Routes to either swap or standard move based on conditions.

### Execution Paths

#### Path 2.1: Swap Scenario (Same Container, Different Index)
- **Condition**: `isSameContainer(fromWhere, toWhere) && fromIndex !== toIndex && existingItem !== null && movedItem !== null && both are moveable`
- **Behavior**: Calls `executeSwap()`
- **Expected Result**: Returns swap result (boolean)

#### Path 2.2: Standard Move (Different Container or Same Index)
- **Condition**: Any other scenario
- **Behavior**: Calls `executeStandardMove()`
- **Expected Result**: Returns standard move result (boolean)

---

## Method: `isSameContainer`

**Purpose**: Determines if two locations refer to the same container.

### Execution Paths

#### Path 3.1: Reference Equality
- **Condition**: `fromWhere === toWhere`
- **Behavior**: Returns `true`
- **Expected Result**: Same container detected

#### Path 3.2: Container GUID Match
- **Condition**: Both are `Container` instances with same `container.guid`
- **Behavior**: Returns `true`
- **Expected Result**: Same container detected

#### Path 3.3: Container GUID Mismatch
- **Condition**: Both are `Container` instances with different `container.guid`
- **Behavior**: Returns `false`
- **Expected Result**: Different containers

#### Path 3.4: Equipment Reference Match
- **Condition**: Both are `Equipment` instances and `fromWhere === toWhere`
- **Behavior**: Returns `true`
- **Expected Result**: Same equipment

#### Path 3.5: Equipment Reference Mismatch
- **Condition**: Both are `Equipment` instances but different references
- **Behavior**: Returns `false` (fallthrough)
- **Expected Result**: Different equipment

#### Path 3.6: Different Types
- **Condition**: Any other type combination
- **Behavior**: Returns `false`
- **Expected Result**: Not same container

---

## Method: `executeSwap`

**Purpose**: Executes item swapping within the same container.

### Execution Paths

#### Path 4.1: Partial Count Swap (Invalid)
- **Condition**: `count !== movedItem.count`
- **Behavior**: Returns `false` immediately
- **Expected Result**: Swap rejected

#### Path 4.2: Container Fast Path - GUID Mismatch
- **Condition**: Both are `Container` instances but `container.guid` differs
- **Behavior**: Returns `false`
- **Expected Result**: Swap rejected

#### Path 4.3: Container Fast Path - Item Not Found
- **Condition**: `Container` path, but `base.__getItem()` returns null for either index
- **Behavior**: Returns `false`
- **Expected Result**: Swap rejected

#### Path 4.4: Container Fast Path - Item Mismatch
- **Condition**: `Container` path, but items don't match expected (`a !== movedItem || b !== existingItem`)
- **Behavior**: Returns `false`
- **Expected Result**: Swap rejected

#### Path 4.5: Container Fast Path - Validation Failed
- **Condition**: `Container` path, `base.__canAddItem()` exists and returns `false` for either item
- **Behavior**: Returns `false`
- **Expected Result**: Swap rejected (slot restrictions)

#### Path 4.6: Container Fast Path - Success
- **Condition**: `Container` path, all validations pass
- **Behavior**: 
  - Directly swaps items using `__setItem()`
  - Sends `ContainerAddPacket` for both items
  - Updates parent references
  - Emits "move" events for both items
  - Returns `true`
- **Expected Result**: Items swapped successfully, packets sent, events emitted

#### Path 4.7: Same Reference Fallback (Equipment/Tile)
- **Condition**: `sameRef === true` (after Container check fails)
- **Behavior**: Returns `false`
- **Expected Result**: Swap rejected (only works for Container fast path)

#### Path 4.8: Fallback Path - Removal Failed
- **Condition**: `!removedMovedItem || !removedSwappedItem`
- **Behavior**: 
  - Restores any successfully removed items
  - Returns `false`
- **Expected Result**: Items restored, swap failed

#### Path 4.9: Fallback Path - Placement Validation Failed
- **Condition**: `canPlaceMovedAtDest === false || canPlaceSwappedAtSource === false`
- **Behavior**: 
  - Restores both items to original positions
  - Returns `false`
- **Expected Result**: Items restored, swap failed

#### Path 4.10: Fallback Path - Success
- **Condition**: All validations pass in fallback path
- **Behavior**: 
  - Places items in swapped positions using `placeItemInContainer()`
  - Emits "move" events for both items
  - Returns `true`
- **Expected Result**: Items swapped successfully

---

## Method: `executeStandardMove`

**Purpose**: Executes a standard move between different locations or to empty slot.

### Execution Paths

#### Path 5.1: Removal Failed
- **Condition**: `!movedItem` (removeIndex returns null)
- **Behavior**: Returns `false`
- **Expected Result**: Move failed, no side effects

#### Path 5.2: Tile Destination - Empty Tile
- **Condition**: `toWhere instanceof Tile && existthing === null`
- **Behavior**: 
  - Adds item to destination
  - Emits "add" event on tile
  - Continues with container adjacency check
- **Expected Result**: Item moved, tile "add" event emitted

#### Path 5.3: Tile Destination - Tile Has Items
- **Condition**: `toWhere instanceof Tile && existthing !== null`
- **Behavior**: 
  - Adds item to destination
  - Emits "add" event on top item (not tile)
  - Continues with container adjacency check
- **Expected Result**: Item moved, top item "add" event emitted

#### Path 5.4: Container Moved - Different Parents
- **Condition**: `movedItem.constructor.name === "Container" && fromWhere.getTopParent() !== toWhere.getTopParent()`
- **Behavior**: 
  - Calls `checkPlayersAdjacency()` on moved container
  - Emits "move" event
- **Expected Result**: Adjacency checked, move event emitted

#### Path 5.5: Standard Move Success
- **Condition**: All conditions pass
- **Behavior**: 
  - Adds item to destination
  - Handles tile events if applicable
  - Checks container adjacency if applicable
  - Emits "move" event
  - Returns `true`
- **Expected Result**: Item moved successfully, all events emitted

---

## Method: `placeItemInContainer`

**Purpose**: Places item using direct BaseContainer methods (bypasses normal validation).

### Execution Paths

#### Path 6.1: Container Type
- **Condition**: `container.constructor.name === "Container"`
- **Behavior**: 
  - Uses `__setItem()` directly
  - Sends `ContainerAddPacket` to spectators
  - Sets item parent
  - Updates parent weight recursively
- **Expected Result**: Item placed, packet sent, weight updated

#### Path 6.2: Non-Container Type (Equipment/Tile)
- **Condition**: Any other type
- **Behavior**: Uses standard `container.addThing()`
- **Expected Result**: Item placed via normal path

---

## Method: `updateParentWeight`

**Purpose**: Recursively updates parent weight.

### Execution Paths

#### Path 7.1: Normal Recursion
- **Condition**: Valid parent chain exists
- **Behavior**: 
  - Iterates through parent chain
  - Calls `__updateWeight()` on each parent that supports it
  - Stops when parent is self or null
- **Expected Result**: All parent weights updated

#### Path 7.2: No Parent Chain
- **Condition**: Parent chain is null or self-referential
- **Behavior**: Exits loop immediately
- **Expected Result**: No updates performed

---

## Test Scenarios Summary

### Scenario Categories

1. **Validation Failures** (Paths 1.1-1.12)
   - Null checks
   - Distance/line of sight
   - Item moveability
   - Tile restrictions
   - Capacity checks

2. **Special Tile Handling** (Paths 1.6-1.10)
   - Mailbox operations
   - Trashholder deletion
   - Solid item blocking
   - Occupied tile blocking

3. **Swap Operations** (Paths 4.1-4.10)
   - Container fast path (optimized)
   - Fallback path (remove/validate/place)
   - Validation failures
   - Success cases

4. **Standard Moves** (Paths 5.1-5.5)
   - Different containers
   - Empty destinations
   - Tile destinations
   - Container adjacency checks

5. **Helper Methods** (Paths 3.1-3.6, 6.1-6.2, 7.1-7.2)
   - Container comparison
   - Item placement
   - Weight updates

---

## Edge Cases to Test

1. **Same Index Swap**: Moving item to same position (should not trigger swap)
2. **Stackable Items**: Swapping stackable vs non-stackable items
3. **Partial Stack Moves**: Moving partial stack (count < total)
4. **Container in Container**: Moving container that contains items
5. **Equipment Swap**: Swapping items in equipment slots
6. **Mixed Types**: Moving between Container, Equipment, and Tile
7. **Exclusive Slots**: Moving items to/from exclusive slots (potion slots, tool slots)
8. **Parent Chain**: Deeply nested containers (weight updates)
9. **Removal Failure**: When `removeIndex` fails mid-swap
10. **Validation After Removal**: Slot restrictions after items removed

---

## Expected Return Values

- `validateAndMoveItem`: `void` (no return value, uses early returns)
- `moveItem`: `boolean` (true = success, false = failure)
- `isSameContainer`: `boolean` (true = same, false = different)
- `executeSwap`: `boolean` (true = swapped, false = failed)
- `executeStandardMove`: `boolean` (true = moved, false = failed)
- `placeItemInContainer`: `void` (always succeeds or throws)
- `updateParentWeight`: `void` (always completes)

---

## Success Criteria

A successful test suite should verify:
1. ✅ All validation paths return correct error messages
2. ✅ Swap operations work for Container, Equipment, and mixed scenarios
3. ✅ Standard moves work between all location type combinations
4. ✅ Events are emitted correctly for all successful operations
5. ✅ Packets are sent to spectators for container operations
6. ✅ Weight is updated correctly through parent chains
7. ✅ Items are restored correctly on failure scenarios
8. ✅ Edge cases are handled without crashes or side effects
