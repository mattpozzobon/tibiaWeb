# Parcel/Letter System Documentation

## Overview

The parcel/letter system allows players to send items and messages to other players (both online and offline) through mailboxes. The system consists of several item types and processes for creating, sending, and receiving mail.

---

## Item Types

### Letters

| ID | Name | Type | Properties |
|---|---|---|---|
| **2597** | Letter | `readable` | `writeable: true`, `maxTextLen: 1999` |
| **2598** | Stamped Letter | `Item` (not `readable` type) | `readable: true`, `writeable: true` (no `maxTextLen` defined - defaults to 2000) |

**Letter (ID 2597):**
- **Type**: `readable` - instantiated as `Readable` class
- **Usage**: Players write on it to create content
- **Format**: 
  - First 2 lines: **Recipient name** (required)
  - Remaining lines: **Message content**
- **Max Length**: 1999 characters
- **When mailed**: Transforms into a Stamped Letter (ID 2598) with only the message content (recipient name is extracted)

**Stamped Letter (ID 2598):**
- **Type**: Regular `Item` (not `readable` type, despite having `readable: true` property)
- **Usage**: Received in mailbox, can be read by recipient
- **Content**: Only contains the message content (recipient name was extracted during sending)
- **Max Length**: 2000 characters (default, no `maxTextLen` defined)
- **Issue**: Content may not be saved properly because `Item.toJSON()` doesn't include `content` by default

### Parcels

| ID | Name | Type | Properties |
|---|---|---|---|
| **2595** | Parcel | `container` | `containerSize: 10` |
| **2596** | Stamped Parcel | `container` | `containerSize: 10` |

**Parcel (ID 2595):**
- **Type**: Container (10 slots)
- **Usage**: Players put items inside and add a label with recipient name
- **Requirements**: Must contain a **Label (ID 2599)** with recipient name written on it

**Stamped Parcel (ID 2596):**
- **Type**: Container (10 slots)
- **Usage**: Created when parcel is mailed
- **Contents**: All items from original parcel are copied using `copyProperties()`

### Labels

| ID | Name | Type | Properties |
|---|---|---|---|
| **2599** | Label | `readable` | `writeable: true`, `maxTextLen: 79` |

**Label (ID 2599):**
- **Type**: `readable`
- **Usage**: Write recipient name on label, then put label inside parcel
- **Max Length**: 79 characters (for recipient name)
- **Location**: Must be inside the parcel container

---

## Writing System

### Creating Letters from Blank Paper

**Blank Paper (ID 1947):**
- `writeable: true`, `maxTextLen: 512`
- `writeOnceItemId: 1954` - transforms into a Letter (ID 2597) when written on
- When player writes on blank paper:
  1. Client sends `ITEM_TEXT_WRITE` packet (opcode 23)
  2. Server validates text length (max 512 chars)
  3. Server creates new Letter (ID 1954, which should be 2597) with content
  4. Original blank paper is removed, new letter is placed

**Note**: The `writeOnceItemId` in definitions.json shows `1954`, but this might be incorrect or refer to a different item. The actual Letter ID used in the mailbox handler is `2597`.

### Writing on Letters

**Letter (ID 2597):**
- When player uses a letter, `ReadTextPacket` is sent (if not distance-readable)
- Player writes text with format:
  ```
  RecipientName
  (optional second line for recipient)
  
  Message content starts here...
  ```
- First 2 lines are extracted as recipient name
- Remaining content becomes the message body

---

## Sending Process

### Sending Letters

**Flow (`MailboxHandler.__sendLetter`):**

1. **Player moves letter to mailbox** (`ItemMoveHandler.validateAndMoveItem`)
   - Checks: `toWhere.itemStack.isMailbox()` and `mailboxHandler.canMailItem(fromItem)`
   - Only `UNSTAMPED_LETTER` (2597) and `UNSTAMPED_PARCEL` (2595) can be mailed

2. **Extract recipient and content** (`__sendLetter`)
   - Splits letter content by `\n`
   - First 2 lines = recipient name (joined together, no newline)
   - Remaining lines = message content (joined with `\n`)

3. **Validate recipient**
   - If no recipient: `"You must add the recipient to your letter."`
   - Freezes the letter item (prevents further modification)

4. **Create stamped letter** (`writeLetter`)
   - Creates new `STAMPED_LETTER` (ID 2598)
   - Sets content to isolated message content (without recipient lines)
   - Calls `__mailThing(recipient, stampedLetter, callback)`

5. **Deliver to recipient** (`__mailThing`)
   - **If recipient is online**: Adds to `player.containerManager.inbox`
   - **If recipient is offline**: Calls `__addItemsOffline()` which atomically updates database

6. **Success/Failure**
   - **Success**: Shows `TELEPORT` magic effect, deletes original letter
   - **Failure**: Shows `POFF` magic effect, unfreezes letter, shows error message

### Sending Parcels

**Flow (`MailboxHandler.__sendParcel`):**

1. **Player moves parcel to mailbox**
   - Same validation as letters

2. **Find label inside parcel** (`__getLabel`)
   - Searches `parcel.container.__slots` for a Label (ID 2599)
   - If no label found: `"You must add a label to your parcel."`

3. **Extract recipient from label**
   - Reads label content (recipient name)
   - If empty: `"You must add the recipient to your label."`

4. **Create stamped parcel** (`writeParcel`)
   - Creates new `STAMPED_PARCEL` (ID 2596)
   - Copies all properties from original parcel using `thing.copyProperties(newParcel)`
   - `copyProperties()` copies:
     - Duration (if not already set)
     - Unique ID (if exists)
     - **Container contents** (if both are containers with same size)

5. **Deliver to recipient** (same as letters)

6. **Success/Failure** (same as letters)

---

## Receiving Process

### Mailbox Usage

**When player uses a mailbox** (`UseHandler.handleItemUse`):
- Checks `item.isMailbox()`
- Calls `player.containerManager.inbox.pop(mailboxPosition)`

### Inbox System

**Inbox Storage:**
- Items are stored in `player.containerManager.depot.getMailContainer()` (Mail container, ID 14404)
- Also tracked in `inbox.__items` array for JSON serialization
- When item is added: `inbox.addThing(thing)` → adds to both Mail container and `__items` array

**Retrieving Mail (`Inbox.pop`):**

1. **Check if mail exists**
   - Checks `mailContainer.getNumberItems() === 0`
   - If empty: Shows `POFF` effect, message `"There are no items in your inbox."`

2. **Get latest item** (LIFO - Last In, First Out)
   - Gets item at index `mailContainer.getNumberItems() - 1` (last slot)

3. **Check player capacity**
   - If player can't carry: `__sendToDepot()` - moves to depot container instead
   - If player can carry: Removes from mail container, adds to equipment (backpack)

4. **Cleanup**
   - Removes item from `__items` array
   - Shows success message: `"You took {itemName} from your inbox."`
   - Shows `BLOCKHIT` magic effect

**Capacity Handling:**
- If item can't be carried: Item is moved to depot container
- Message: `"You cannot carry this item and it was sent to your depot."`
- Shows `TELEPORT` effect

### Reading Letters/Parcels

**Stamped Letter (ID 2598):**
- Can be opened/used like a regular readable item
- Sends `ReadTextPacket` with letter content
- **Note**: Content may not persist because `Item.toJSON()` doesn't serialize `content` by default

**Stamped Parcel (ID 2596):**
- Can be opened as a container
- Contains all items that were in the original parcel

---

## Data Persistence

### Saving Mail

**When player logs out:**
- `ContainerManager.toJSON()` is called
- Returns: `{ depot: [...], equipment: [...], inbox: mailContainerItems, keyring: [...] }`
- Mail items are serialized from `depot.getMailContainer()` slots

**Item Serialization:**
- `Readable.toJSON()`: Includes `{ id, actionId, content }`
- `Item.toJSON()`: Includes `{ id, count, actionId, duration }` - **MISSING `content`**
- `Container.toJSON()`: Includes `{ id, actionId, duration, items: [...] }`

**Issue with Stamped Letters:**
- Stamped Letter (ID 2598) is instantiated as `Item`, not `Readable`
- `Item.toJSON()` doesn't include `content` property
- **Result**: Stamped letter content is lost when player logs out
- **Fix**: Need to add `content` to `Item.toJSON()` if it exists (user reverted this change, possibly for investigation)

### Loading Mail

**When player logs in:**
- `ContainerManager` constructor loads depot data
- `Inbox` constructor calls `database.parseThing(item)` for each inbox item
- `parseThing()` checks for `item.content` and calls `thing.setContent(item.content)`
- Items are added to `depot.mailContainer` and `inbox.__items`

---

## Code Locations

### Key Files

1. **`src/handler/mailbox-handler.ts`**
   - `MailboxHandler` class
   - Handles sending letters and parcels
   - Manages offline player mail delivery

2. **`src/item/inbox.ts`**
   - `Inbox` class
   - Manages received mail storage and retrieval

3. **`src/handler/item-move-handler.ts`**
   - Detects mailbox usage
   - Validates mailable items

4. **`src/creature/player/player-use-handler.ts`**
   - Handles mailbox interaction (retrieving mail)

5. **`src/network/packet-handler.ts`**
   - `handleItemTextWrite()` - handles writing on letters/blank paper

6. **`src/item/depot.ts`**
   - `DepotContainer` class
   - Contains `mailContainer` (ID 14404) for storing received mail

---

## Key Constants

```typescript
// In MailboxHandler
UNSTAMPED_PARCEL = 2595
STAMPED_PARCEL = 2596
UNSTAMPED_LETTER = 2597
STAMPED_LETTER = 2598
LABEL = 2599

// In DepotContainer
MAIL_CONTAINER_ID = 14404
DEPOT_CONTAINER_ID = 2594
```

---

## Known Issues

1. **Stamped Letter Content Not Saving**
   - Stamped Letter (ID 2598) is `Item` type, not `Readable`
   - `Item.toJSON()` doesn't serialize `content` property
   - Content is lost on logout
   - **Fix**: Add `content` to `Item.toJSON()` if it exists (similar to `Readable.toJSON()`)

2. **Letter Format Requirement**
   - Letter requires first 2 lines to be recipient name
   - This might be confusing for players who expect different formats
   - Could be more flexible (single line recipient, or structured format)

3. **Blank Paper Transformation**
   - `writeOnceItemId: 1954` in blank paper definition might not match actual Letter ID (2597)
   - Should verify this mapping is correct

4. **Offline Player Mail**
   - `__addItemsOffline()` updates database but doesn't verify item serialization works correctly
   - If `Item.toJSON()` doesn't include content, offline mail with stamped letters will lose content

---

## Future Improvements

1. **Fix Stamped Letter Content Saving**
   - Update `Item.toJSON()` to include `content` if present
   - Ensure `parseThing()` correctly restores content for all item types

2. **Better Letter Format Validation**
   - Allow single-line recipient names
   - Add validation messages for incorrect formats
   - Show example format to players

3. **Mail Notification System**
   - Notify players when they receive mail (if online)
   - Show mailbox indicator when mail is waiting

4. **Mail History/Archive**
   - Keep sent mail history
   - Allow players to see what they've sent

5. **Mail Expiration**
   - Auto-delete old mail after certain period
   - Prevent inbox overflow
