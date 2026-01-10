# Complete Move Item Flow - Network Path Analysis

This document traces the **complete network path** taken when a player moves an item, from client packet transmission through server processing to world state updates and broadcast to other players.

---

## Overview: Move Item Architecture

```
Client Browser
    ↓ (WebSocket Message)
GameSocket (Cgamesocket.ts)
    ↓ (Packet Buffer)
Network Manager (Cnetwork-manager.ts)
    ↓ (Packet Handler)
Packet Handler (Cpacket-handler.ts)
    ↓ (World State)
Tile/Container (Ctile.ts / Ccontainer.ts)
    ↓ (Broadcast)
Chunk (Cchunk.ts)
    ↓ (Player Sockets)
All Observing Players
```

---

## Phase 1: Client Packet Transmission

### Step 1.1: Client Sends Move Item Packet
**Location**: Client-side (browser)
- **Opcode**: `CONST.PROTOCOL.CLIENT.THING_MOVE` = `12`
- **Packet Structure**:
  ```
  [Opcode: 1 byte]
  [From Location Type: 1 byte] (0=Container, 1=Tile, 2=Equipment)
  [From Container ID: 4 bytes] (if container)
  [From Position: 6 bytes] (x, y, z - if tile)
  [From Index: 1 byte]
  [To Location Type: 1 byte]
  [To Container ID: 4 bytes] (if container)
  [To Position: 6 bytes] (if tile)
  [To Index: 1 byte]
  [Count: 1 byte]
  ```
- **Network Layer**: WebSocket binary frame

---

### Step 1.2: WebSocket Receives Message
**Location**: `src/Cgamesocket.ts:42`
- **Event**: `socket.on("message", __handleSocketData)`
- **Handler**: `__handleSocketData(buffer: Buffer)`
- **Actions**:
  1. Validates buffer: `if (!Buffer.isBuffer(buffer))` → close
  2. Checks latency request: `if (__isLatencyRequest(buffer))` → respond immediately
  3. Validates controller: `if (!isController())` → ignore (spectator)
  4. **Adds to buffer**: `incomingBuffer.add(buffer)`
     - Updates `__lastPacketReceived = Date.now()`

**Network Layer**: WebSocket message event

---

## Phase 2: Packet Buffering

### Step 2.1: Buffer Accumulation
**Location**: `src/Cpacket-buffer.ts:20-27`
- **Action**: `incomingBuffer.add(buffer)`
- **Process**:
  - Adds buffer to `__buffers` array
  - Updates `__lastPacketReceived = Date.now()`
- **Purpose**: Collects packets until next game tick

**Network Layer**: Application-level buffering

---

### Step 2.2: Game Loop Flush
**Location**: `src/Cgameserver.ts:97`
- **Frequency**: Every game tick (~10ms)
- **Action**: `socketHandler.flushSocketBuffers()`
- **Location**: `src/Cwebsocket-server-socket-handler.ts:63-69`
- **Process**:
  ```typescript
  connectedSockets.forEach((gameSocket) => 
    networkManager.handleIO(gameSocket)
  );
  ```

**Network Layer**: Game loop integration

---

## Phase 3: Network I/O Processing

### Step 3.1: Handle I/O
**Location**: `src/Cnetwork-manager.ts:39-46`
- **Action**: `handleIO(gameSocket)`
- **Steps**:
  1. **Read Incoming**: `readIncomingBuffer(gameSocket)`
  2. **Write Outgoing**: `writeOutgoingBuffer(gameSocket)`

**Network Layer**: Bidirectional I/O

---

### Step 3.2: Socket Timeout Check
**Location**: `src/Cnetwork-manager.ts:54-66`
- **Check**: `Date.now() - lastPacketReceived > 120000ms`
- **Purpose**: Detect stale connections
- **Result**: If timeout exceeded → `gameSocket.close()`
- **Note**: This check happens BEFORE processing the packet

**Network Layer**: Connection health check

---

### Step 3.3: Buffer Flush
**Location**: `src/Cnetwork-manager.ts:68`
- **Action**: `gameSocket.incomingBuffer.flush()`
- **Process**:
  - Concatenates all buffered packets: `Buffer.concat(__buffers)`
  - Clears buffer array: `__buffers = []`
  - **Note**: Does NOT update `__lastPacketReceived` (only `add()` does)
- **Result**: Single combined buffer containing all packets from this tick

**Network Layer**: Buffer consolidation

---

### Step 3.4: Packet Size Validation
**Location**: `src/Cnetwork-manager.ts:71-74`
- **Check**: `buffer.length > CONFIG.SERVER.MAX_PACKET_SIZE` (1024 bytes)
- **Failure**: `gameSocket.close()` - Security check

**Network Layer**: Security validation

---

### Step 3.5: Packet Reader Creation
**Location**: `src/Cnetwork-manager.ts:76`
- **Action**: `new PacketReader(buffer)`
- **Purpose**: Wraps buffer for sequential reading
- **Initial State**: `index = 0`

**Network Layer**: Packet parsing setup

---

### Step 3.6: Idle Handler Extension
**Location**: `src/Cnetwork-manager.ts:78-80`
- **Check**: `if (packet.isReadable())`
- **Action**: `gameSocket.player?.idleHandler.extend()`
- **Purpose**: Resets AFK timer (300s warn + 60s kick)
- **Note**: Any readable packet resets idle timer

**Network Layer**: Player activity tracking

---

## Phase 4: Packet Parsing

### Step 4.1: Read Opcode
**Location**: `src/Cnetwork-manager.ts:94-98`
- **Action**: `const opcode = packet.readUInt8()`
- **Result**: First byte = `12` (THING_MOVE)
- **Handler Lookup**: `handlers[12]` → `moveItem` handler

**Network Layer**: Opcode dispatch

---

### Step 4.2: Handler Execution
**Location**: `src/Cnetwork-manager.ts:139`
- **Handler**: `(gs, p) => this.packetHandler.moveItem(gs.player!, p.readMoveItem(gs.player!))`
- **Action**: Calls `packetHandler.moveItem()` with parsed event

**Network Layer**: Handler invocation

---

## Phase 5: Move Item Event Parsing

### Step 5.1: Read Move Item Event
**Location**: `src/Cpacket-reader.ts:56-86`
- **Action**: `readMoveItem(player)`
- **Process**:
  1. **From Location**: `readMoveEvent(player)`
     - Reads event type (1 byte)
     - If `0`: Reads container ID → `player.containerManager.getContainerFromId()`
     - If `1`: Reads position → `world.getTileFromWorldPosition()`
     - If `2`: Returns equipment slot
  2. **From Index**: `readUInt8()` (1 byte)
  3. **To Location**: `readMoveEvent(player)` (same as above)
  4. **To Index**: `readUInt8()` (1 byte)
  5. **Count**: `readUInt8()` (1 byte)
- **Result**: `MoveItemEvent` object:
  ```typescript
  {
    fromWhere: ITile | IContainer | Equipment,
    fromIndex: number,
    toWhere: ITile | IContainer | Equipment,
    toIndex: number,
    count: number
  }
  ```

**Network Layer**: Packet deserialization

---

### Step 5.2: Read Move Event Helper
**Location**: `src/Cpacket-reader.ts:161-175`
- **Action**: `readMoveEvent(player)`
- **Switch Cases**:
  - **Case 0 (Container)**:
    - Reads `UInt16` (unused)
    - Reads container GUID: `readUInt32()`
    - Returns: `player.containerManager.getContainerFromId(guid)`
  - **Case 1 (Tile)**:
    - Reads position: `readWorldPosition()` → `Position(x, y, z)`
    - Returns: `world.getTileFromWorldPosition(position)`
  - **Case 2 (Equipment)**:
    - Returns equipment slot reference
- **Failure**: Returns `null` if invalid

**Network Layer**: Location resolution

---

## Phase 6: Move Item Validation

### Step 6.1: Initial Validation
**Location**: `src/Cpacket-handler.ts:63-122`
- **Handler**: `moveItem(player, packet)`
- **Validations**:

#### 6.1.1: Source/Destination Check
- **Check**: `if (!fromWhere || !toWhere) return;`
- **Failure**: Silent return (invalid locations)

#### 6.1.2: Tile Distance Check (From)
- **Check**: `if (fromWhere instanceof Tile && !player.position.besides(fromWhere.position))`
- **Failure**: `player.sendCancelMessage("You are not close enough.")`
- **Purpose**: Prevents moving items from distant tiles

#### 6.1.3: Tile Line of Sight Check (To)
- **Check**: `if (toWhere instanceof Tile && !player.position.inLineOfSight(toWhere.position))`
- **Failure**: `player.sendCancelMessage("You cannot throw this item here.")`
- **Purpose**: Prevents throwing items through walls

#### 6.1.4: Item Existence Check
- **Check**: `const fromItem = fromWhere.peekIndex(fromIndex)`
- **Failure**: `if (!fromItem) return;` (silent)

#### 6.1.5: Item Movability Check
- **Check**: `if (!fromItem.isMoveable() || fromItem.hasUniqueId())`
- **Failure**: `player.sendCancelMessage("You cannot move this item.")`
- **Purpose**: Prevents moving immovable/unique items

**Network Layer**: Game logic validation

---

### Step 6.2: Special Case Handling

#### 6.2.1: Mailbox Detection
**Location**: `src/Cpacket-handler.ts:96-99`
- **Check**: `toWhere.hasItems() && toWhere.itemStack.isMailbox() && mailboxHandler.canMailItem(fromItem)`
- **Action**: `mailboxHandler.sendThing()` - Handles mailing
- **Result**: Returns early (mailbox handles its own updates)

#### 6.2.2: Destination Resolution (Tile)
**Location**: `src/Cpacket-handler.ts:100-105`
- **Action**: `world.lattice.findDestination(player, toWhere)`
- **Purpose**: Resolves actual destination (handles teleporters, etc.)
- **Failure**: `player.sendCancelMessage("You cannot add this item here.")`

#### 6.2.3: Trashholder Detection
**Location**: `src/Cpacket-handler.ts:102`
- **Check**: `if (toWhere2.isTrashholder())`
- **Action**: `__addThingToTrashholder()` - Deletes item
- **Result**: Returns early (item destroyed)

#### 6.2.4: Solid Item Check
**Location**: `src/Cpacket-handler.ts:103`
- **Check**: `if (toWhere2.hasItems() && toWhere2.itemStack.isItemSolid())`
- **Failure**: `player.sendCancelMessage("You cannot add this item here.")`

#### 6.2.5: Block Solid Check
**Location**: `src/Cpacket-handler.ts:104`
- **Check**: `if (toWhere2.isBlockSolid() && toWhere2.isOccupiedAny())`
- **Failure**: `player.sendCancelMessage("You cannot add this item here.")`

**Network Layer**: Game world rules

---

### Step 6.3: Capacity Validation
**Location**: `src/Cpacket-handler.ts:107-111`
- **Check**: `if (toWhere.getTopParent() === player && !player.hasSufficientCapacity(fromItem))`
- **Special Cases**:
  - Depot → Player: Always check capacity
  - Same parent: Only check if different parent
- **Failure**: `player.sendCancelMessage("Your capacity is insufficient to carry this item.")`

**Network Layer**: Player stat validation

---

### Step 6.4: Maximum Count Calculation
**Location**: `src/Cpacket-handler.ts:113-121`
- **Action**: `const maxCount = toWhere.getMaximumAddCount(player, fromItem, toIndex)`
- **Purpose**: Calculates how many items can actually be moved
- **Validation**: `if (maxCount === 0)` → reject
- **Calculation**: `realCount = Math.min(count, maxCount)`
- **Result**: Actual count to move (may be less than requested)

**Network Layer**: Stack size validation

---

## Phase 7: Item Movement Execution

### Step 7.1: Remove Item from Source
**Location**: `src/Cpacket-handler.ts:188-194`
- **Action**: `__moveItem(player, fromWhere, fromIndex, toWhere, toIndex, realCount)`
- **Step 1**: `const movedItem = fromWhere.removeIndex(fromIndex, count)`
- **Source Types**:

#### 7.1.1: Tile Remove
**Location**: `src/Ctile.ts:203-275`
- **Action**: `removeIndex(index, amount)`
- **Process**:
  1. Gets item from stack: `itemStack.peekIndex(index)`
  2. Removes from stack: `itemStack.deleteThing(index)`
  3. **Broadcasts removal**: `broadcast(new ItemRemovePacket(position, index, count))`
  4. Returns removed item

#### 7.1.2: Container Remove
**Location**: `src/Cbase-container.ts:119-136`
- **Action**: `removeIndex(index, count)`
- **Process**:
  1. Gets item: `peekIndex(index)`
  2. If stackable: `__removeStackableItem()` (handles partial removal)
  3. If not stackable: `__remove(index)`
  4. **Broadcasts removal**: `__informSpectators(new ContainerRemovePacket(guid, index, 0))`
  5. Returns removed item

#### 7.1.3: Equipment Remove
**Location**: `src/Cequipment.ts:86-115`
- **Action**: `removeIndex(index, count)`
- **Process**:
  1. Removes from container: `container.removeIndex(index, count)`
  2. Updates player properties (weight, capacity, etc.)
  3. Broadcasts via container system
  4. Returns removed item

**Network Layer**: Item removal with broadcast

---

### Step 7.2: Add Item to Destination
**Location**: `src/Cpacket-handler.ts:196-201`
- **Step 2**: `toWhere.addThing(movedItem, toIndex)`
- **Destination Types**:

#### 7.2.1: Tile Add
**Location**: `src/Ctile.ts:62-100`
- **Action**: `addThing(thing, index)`
- **Process**:
  1. Validates index: `itemStack.isValidIndex(index)`
  2. Checks if full: `if (isFull())` → `eliminateItem()` (destroys item)
  3. Checks magic door: Prevents adding items on expertise doors
  4. Sets parent: `thing.setParent(this)`
  5. **Stackable check**: If stackable and same ID → `__addStackable()`
  6. Adds to stack: `itemStack.addThing(index, thing)`
  7. **Broadcasts addition**: `broadcast(new ItemAddPacket(position, thing, index))`

#### 7.2.2: Container Add
**Location**: `src/Cbase-container.ts:104-117`
- **Action**: `addThing(thing, index)`
- **Process**:
  1. Checks current item: `peekIndex(index)`
  2. **Stackable check**: If stackable and same ID → `__addStackable()`
  3. **Broadcasts addition**: `__informSpectators(new ContainerAddPacket(guid, index, thing))`
  4. Sets item: `__setItem(thing, index)`

#### 7.2.3: Equipment Add
**Location**: `src/Cequipment.ts:233-266`
- **Action**: `addThing(thing, index)`
- **Process**:
  1. Validates slot compatibility
  2. Updates player properties (weight, capacity, stats)
  3. Adds to container: `container.addThing(thing, index)`
  4. Broadcasts via container system

**Network Layer**: Item addition with broadcast

---

### Step 7.3: Event Emission
**Location**: `src/Cpacket-handler.ts:203-215`
- **Actions**:

#### 7.3.1: Tile "add" Event
- **Condition**: `if (toWhere instanceof Tile)`
- **Action**: `toWhere.emit("add", player, movedItem)`
- **Purpose**: Triggers tile-specific handlers (e.g., item actions)

#### 7.3.2: Container Adjacency Check
- **Condition**: `if (movedItem.constructor.name === "Container" && fromWhere.getTopParent() !== toWhere.getTopParent())`
- **Action**: `(movedItem as IContainer).checkPlayersAdjacency()`
- **Purpose**: Updates which players can see the container

#### 7.3.3: Item "move" Event
- **Action**: `movedItem.emit("move", player, toWhere, movedItem)`
- **Purpose**: Triggers item-specific handlers

**Network Layer**: Event-driven updates

---

## Phase 8: Broadcast to Observers

### Step 8.1: Tile Broadcast
**Location**: `src/Ctile.ts:449-455`
- **Action**: `tile.broadcast(packet)`
- **Process**: `this.getChunk().broadcast(packet)`
- **Purpose**: Sends packet to chunk for distribution

**Network Layer**: Tile → Chunk routing

---

### Step 8.2: Chunk Broadcast
**Location**: `src/Cchunk.ts:89-91`
- **Action**: `chunk.broadcast(packet)`
- **Process**:
  ```typescript
  this.neighbours.forEach((chunk) => 
    chunk.internalBroadcast(packet)
  );
  ```
- **Purpose**: Broadcasts to all neighboring chunks

**Network Layer**: Chunk → Neighbor chunks

---

### Step 8.3: Internal Broadcast
**Location**: `src/Cchunk.ts:126-128`
- **Action**: `chunk.internalBroadcast(packet)`
- **Process**:
  ```typescript
  this.players.forEach((player) => 
    player.write(packet)
  );
  ```
- **Purpose**: Sends packet to all players in chunk

**Network Layer**: Chunk → Players

---

### Step 8.4: Container Spectator Broadcast
**Location**: `src/Cbase-container.ts:114, 170`
- **Action**: `__informSpectators(packet)`
- **Process**: Sends `ContainerAddPacket` or `ContainerRemovePacket` to all players viewing the container
- **Purpose**: Updates container UI for all viewers

**Network Layer**: Container → Viewers

---

## Phase 9: Packet Transmission to Clients

### Step 9.1: Player Write
**Location**: `src/Cplayer.ts:374-376`
- **Action**: `player.write(packet)`
- **Process**: `this.socketHandler.write(packet)`
- **Purpose**: Routes to socket handler

**Network Layer**: Player → Socket handler

---

### Step 9.2: Socket Handler Write
**Location**: `src/Cplayer-socket-handler.ts:26-32`
- **Action**: `socketHandler.write(buffer)`
- **Process**:
  ```typescript
  this.__spectators.forEach((gameSocket) => 
    gameSocket.write(buffer)
  );
  ```
- **Purpose**: Sends to all spectator sockets (including controller)

**Network Layer**: Socket handler → GameSockets

---

### Step 9.3: GameSocket Write
**Location**: `src/Cgamesocket.ts:141-146`
- **Action**: `gameSocket.write(packet)`
- **Process**:
  1. Gets buffer: `const buffer = packet.getBuffer()`
  2. Logs packet: `Print.packet(buffer, packet)`
  3. Adds to buffer: `outgoingBuffer.add(buffer)`
- **Purpose**: Queues packet for transmission

**Network Layer**: Packet queuing

---

### Step 9.4: Outgoing Buffer Flush
**Location**: `src/Cnetwork-manager.ts:27-37`
- **Action**: `writeOutgoingBuffer(gameSocket)`
- **Process**:
  1. Checks socket state: `socket.readyState === OPEN`
  2. Checks if empty: `if (outgoingBuffer.isEmpty()) return`
  3. Flushes buffer: `outgoingBuffer.flush()`
  4. **Sends via WebSocket**: `socket.send(message)`
- **Frequency**: Every game tick (~10ms)

**Network Layer**: WebSocket frame transmission

---

## Phase 10: Client Receives Update

### Step 10.1: WebSocket Message Received
**Location**: Client-side (browser)
- **Event**: WebSocket `onmessage`
- **Packets Received**:
  - `ItemAddPacket`: Item added to tile
  - `ItemRemovePacket`: Item removed from tile
  - `ContainerAddPacket`: Item added to container
  - `ContainerRemovePacket`: Item removed from container
- **Result**: Client updates UI to reflect item movement

**Network Layer**: WebSocket message delivery

---

## Network Flow Diagram

```
┌─────────────┐
│   Client    │
│   Browser   │
└──────┬──────┘
       │ WebSocket Binary Frame
       │ [Opcode 12] + Move Item Data
       ▼
┌─────────────────────┐
│ GameSocket          │
│ (Cgamesocket.ts)    │
│                     │
│ 1. Receive message  │
│ 2. Add to buffer    │
│ 3. Update timestamp │
└──────┬──────────────┘
       │ Buffered Packet
       ▼
┌─────────────────────┐
│ Network Manager      │
│ (Cnetwork-manager)   │
│                     │
│ 1. Check timeout    │
│ 2. Flush buffer     │
│ 3. Parse opcode     │
│ 4. Dispatch handler │
└──────┬──────────────┘
       │ MoveItemEvent
       ▼
┌─────────────────────┐
│ Packet Handler      │
│ (Cpacket-handler)   │
│                     │
│ 1. Validate move   │
│ 2. Check rules      │
│ 3. Remove from src  │
│ 4. Add to dest      │
└──────┬──────────────┘
       │ Item Moved
       ▼
┌─────────────────────┐
│ Tile/Container      │
│                     │
│ 1. Update state     │
│ 2. Broadcast packet │
└──────┬──────────────┘
       │ Broadcast
       ▼
┌─────────────────────┐
│ Chunk               │
│ (Cchunk.ts)         │
│                     │
│ 1. Broadcast to     │
│    neighbors        │
│ 2. Send to players  │
└──────┬──────────────┘
       │ Packets
       ▼
┌─────────────────────┐
│ Player Sockets      │
│                     │
│ 1. Queue packets    │
│ 2. Flush buffers    │
│ 3. Send via WS      │
└──────┬──────────────┘
       │ WebSocket Frames
       ▼
┌─────────────┐
│   Clients   │
│  (All Players)│
└─────────────┘
```

---

## Packet Types Used

### Incoming (Client → Server)
- **THING_MOVE** (Opcode 12): Move item request

### Outgoing (Server → Clients)
- **ITEM_ADD**: Item added to tile
- **ITEM_REMOVE**: Item removed from tile
- **CONTAINER_ADD**: Item added to container
- **CONTAINER_REMOVE**: Item removed from container

---

## Validation & Error Messages

### Validation Failures
1. **"You are not close enough."** - Moving from distant tile
2. **"You cannot throw this item here."** - No line of sight to destination
3. **"You cannot move this item."** - Item is immovable or unique
4. **"You cannot add this item here."** - Invalid destination (solid, occupied, etc.)
5. **"Your capacity is insufficient to carry this item."** - Player weight limit exceeded

### Silent Failures
- Invalid source/destination locations
- Item doesn't exist at source index
- Tile is full (item destroyed)
- Invalid index

---

## Special Cases

### Stackable Items
- If source and destination have same stackable item → Merges stacks
- Handles overflow if stack exceeds maximum
- Updates counts in both locations

### Containers
- Moving container between different parents → Updates adjacency
- Container viewers receive updates automatically
- Container GUID used for client-side tracking

### Equipment
- Moving to equipment slot → Updates player stats
- Moving from equipment → Removes stat bonuses
- Weight and capacity recalculated

### Mailbox
- Detected automatically
- Routes to `MailboxHandler.sendThing()`
- Handles mail delivery logic

### Trashholder
- Item destroyed immediately
- Shows magic effect
- No item remains

---

## Timing & Performance

### Processing Time
- **Packet Reception**: ~0ms (WebSocket event)
- **Buffer Accumulation**: Up to 10ms (until next tick)
- **Validation**: ~1-5ms (depends on complexity)
- **Item Movement**: ~1-2ms (data structure updates)
- **Broadcast**: ~1-3ms per observer
- **Total**: ~5-20ms typical

### Network Latency
- **Client → Server**: Production ~50-200ms (TLS + proxy)
- **Server Processing**: ~5-20ms
- **Server → Clients**: Production ~50-200ms per client
- **Total Round-Trip**: ~100-400ms typical

---

## Summary

The move item flow involves **10 major phases**:

1. **Client Transmission**: WebSocket binary frame
2. **Packet Buffering**: Accumulation until game tick
3. **Network I/O**: Timeout check and buffer flush
4. **Packet Parsing**: Opcode dispatch and event parsing
5. **Move Item Validation**: Game rules and constraints
6. **Item Movement**: Remove from source, add to destination
7. **Event Emission**: Triggers item/tile handlers
8. **Broadcast**: Tile → Chunk → Players
9. **Packet Transmission**: Queue and send via WebSocket
10. **Client Update**: Receive and render changes

**Key Files**:
- `Cgamesocket.ts`: WebSocket message handling
- `Cnetwork-manager.ts`: I/O and packet routing
- `Cpacket-reader.ts`: Packet deserialization
- `Cpacket-handler.ts`: Move item logic
- `Ctile.ts`: Tile item management
- `Cbase-container.ts`: Container item management
- `Cchunk.ts`: Broadcast distribution
- `Cprotocol.ts`: Packet definitions

**Network Layers**:
- WebSocket (binary frames)
- Application (game packets)
- Game logic (validation & state)
- Broadcast (multiplayer sync)
