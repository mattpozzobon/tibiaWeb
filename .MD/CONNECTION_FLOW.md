# Complete Player Connection Flow - Network Path Analysis

This document traces the **complete network path** taken when a player attempts to connect to the game server, from initial HTTP request through WebSocket upgrade to player login and world state synchronization.

---

## Overview: Connection Architecture

```
Client Browser
    ↓ (HTTPS/TLS)
Fly.io Proxy
    ↓ (HTTP/WebSocket)
Node.js HTTP Server (Chttp-server.ts)
    ↓ (WebSocket Upgrade)
WebSocket Server (Cwebsocket-server.ts)
    ↓ (GameSocket Wrapper)
Network Manager (Cnetwork-manager.ts)
    ↓ (Game Loop Integration)
World & Player (Cworld-creature-handler.ts)
```

---

## Phase 1: Initial HTTP Connection

### Step 1.1: TCP Socket Connection
**Location**: `src/Chttp-server.ts:58`
- **Event**: `server.on("connection")`
- **Handler**: `__handleConnection()`
- **Actions**:
  - Assigns unique socket ID: `socket.id = this.__socketId++`
  - Logs connection: `"Connected TCP socket with identifier X from [address]"`
  - Sets up close handler: `socket.on("close", __handleSocketClose)`
  - If `NETWORK_TELEMETRY` enabled: Starts bandwidth monitoring

**Network Layer**: TCP socket established at OS level

---

### Step 1.2: HTTP Request Validation
**Location**: `src/Chttp-server.ts:62`
- **Event**: `server.on("request")`
- **Handler**: `__handleRequest()`
- **Validation** (`__validateHTTPRequest()`):
  - ✅ HTTP version must be 1.1 or higher (rejects 0.9, 1.0)
  - ✅ Method must be `GET`
  - ✅ Pathname must be `/`
- **Response**: 
  - Invalid: Returns HTTP error code (400, 404, 405, 505)
  - Valid: Returns `426 Upgrade Required` (signals WebSocket needed)

**Network Layer**: HTTP/1.1 request-response

---

## Phase 2: WebSocket Upgrade Request

### Step 2.1: Upgrade Event
**Location**: `src/Chttp-server.ts:63`
- **Event**: `server.on("upgrade")`
- **Handler**: `__handleUpgrade()`
- **Socket Configuration**:
  ```typescript
  socket.setTimeout(0);           // Disable inactivity timeout
  socket.setNoDelay(true);        // Disable Nagle algorithm
  socket.setKeepAlive(true, 15000); // TCP keepalive every 15s
  ```

**Network Layer**: HTTP Upgrade request with `Upgrade: websocket` header

---

### Step 2.2: Upgrade Request Validation
**Location**: `src/Chttp-server.ts:115-133`
- **Validates**:
  - HTTP version, method, path (same as Step 1.2)
- **Extracts Query Parameters**:
  ```typescript
  const reqUrl = new URL(request.url, `http://${request.headers.host}`);
  token = reqUrl.searchParams.get("token");        // Firebase ID token
  characterId = parseInt(reqUrl.searchParams.get("characterId"));
  ```
- **Validation**:
  - ✅ `token` must exist
  - ✅ `characterId` must be valid number
- **Failure**: Returns HTTP `400 Bad Request`

**Network Layer**: HTTP Upgrade request with query parameters

---

### Step 2.3: Firebase Token Verification
**Location**: `src/Chttp-server.ts:135-151`
- **Action**: `admin.auth().verifyIdToken(token)`
- **Purpose**: Verifies Firebase authentication token
- **Extracts**: `decoded.uid` (Firebase user ID)
- **Success Path**: Proceeds to WebSocket upgrade
- **Failure Path**: 
  - Logs error: `"❌ Firebase token verification failed"`
  - Returns HTTP `401 Unauthorized`
  - Closes socket

**Network Layer**: Async authentication check (Firebase Admin SDK)

---

## Phase 3: WebSocket Upgrade

### Step 3.1: WebSocket Server Upgrade
**Location**: `src/Chttp-server.ts:137`
- **Action**: `websocketServer.websocket.handleUpgrade(request, socket, head, callback)`
- **Library**: `ws` (WebSocket library)
- **Configuration**: 
  - `noServer: true` (handles upgrade manually)
  - `perMessageDeflate: true` (compression enabled if configured)

**Network Layer**: HTTP → WebSocket protocol upgrade

---

### Step 3.2: WebSocket Socket Configuration
**Location**: `src/Chttp-server.ts:140-143`
- **Critical Fly.io Fix**: Configures the **inner WebSocket socket**
  ```typescript
  const s = ws._socket;  // Get the actual TCP socket
  s.setTimeout(0);        // Disable timeout
  s.setNoDelay(true);    // Disable Nagle
  s.setKeepAlive(true, 15000); // TCP keepalive
  ```
- **Why**: The `ws` library creates its own socket wrapper, which needs separate configuration

**Network Layer**: TCP socket configuration for WebSocket connection

---

### Step 3.3: WebSocket Connection Event
**Location**: `src/Chttp-server.ts:145`
- **Action**: `websocket.emit("connection", ws, request, characterId, decoded.uid)`
- **Parameters Passed**:
  - `ws`: WebSocket instance
  - `request`: Original HTTP request
  - `characterId`: Character ID from query params
  - `decoded.uid`: Firebase user ID

**Network Layer**: WebSocket connection established

---

## Phase 4: WebSocket Server Initialization

### Step 4.1: Raw WebSocket Setup
**Location**: `src/Cwebsocket-server.ts:26-29`
- **Event**: `websocket.on("connection")` (first handler)
- **Actions**:
  - Sets `ws.isAlive = true`
  - Registers pong handler: `ws.on("pong", () => ws.isAlive = true)`
- **Purpose**: Heartbeat tracking for raw WebSocket

**Network Layer**: WebSocket connection metadata

---

### Step 4.2: GameSocket Creation
**Location**: `src/Cwebsocket-server.ts:46-48, 86-88`
- **Event**: `websocket.on("connection")` (second handler)
- **Handler**: `__handleConnection(socket, request, characterId, uid)`
- **Actions**:
  ```typescript
  const gameSocket = new GameSocket(socket, uid);
  gameSocket.characterId = characterId;
  ```
- **GameSocket Constructor** (`src/Cgamesocket.ts:28-44`):
  - Stores WebSocket: `this.socket = socket`
  - Stores account UID: `this.account = uid`
  - Records connection time: `this.__connected = Date.now()`
  - Creates packet buffers: `incomingBuffer`, `outgoingBuffer`
  - Registers event handlers:
    - `socket.on("message", __handleSocketData)`
    - `socket.on("error", __handleSocketError)`
    - `socket.on("pong", __handlePong)`

**Network Layer**: Application-level socket wrapper

---

### Step 4.3: Connection Validation
**Location**: `src/Cwebsocket-server.ts:90-91`
- **Checks**:
  1. **Server Capacity**: `socketHandler.isOverpopulated()`
     - Compares: `connectedSockets.size >= ALLOW_MAXIMUM_CONNECTIONS`
     - Default: 50 connections
     - **Failure**: `gameSocket.closeError("Server is full.")`
  2. **Server Status**: `getGameServer().isShutdown()`
     - **Failure**: `gameSocket.closeError("Server is shutting down.")`

**Network Layer**: Application-level validation

---

### Step 4.4: Connection Acceptance
**Location**: `src/Cwebsocket-server.ts:96-98`
- **Handler**: `__acceptConnection(gameSocket, characterId, uid)`
- **Actions**:
  - Registers close handler: `gameSocket.socket.once("close", __handleSocketClose)`
  - Initiates login: `__handleLoginRequest(gameSocket, characterId, uid)`

**Network Layer**: Connection lifecycle management

---

## Phase 5: Character Authentication & Loading

### Step 5.1: Character Database Lookup
**Location**: `src/Cwebsocket-server.ts:101-107`
- **Handler**: `__handleLoginRequest(gameSocket, characterId, uid)`
- **Action**: `accountDatabase.getCharacterByIdForUser(characterId, uid, callback)`
- **Database**: SQLite (`accounts.db` or Fly volume)
- **Query**: Finds character by ID that belongs to user UID
- **Success**: Returns character data
- **Failure**: `gameSocket.closeError("Character not found.")`

**Network Layer**: Database I/O (async)

---

### Step 5.2: Character Data Conversion
**Location**: `src/Cwebsocket-server.ts:105`
- **Action**: `accountDatabase.characterDataToLegacyFormat(result)`
- **Purpose**: Converts database format to game engine format
- **Data Includes**:
  - Character properties (name, position, stats, etc.)
  - Inventory, equipment, containers
  - Skills, spells, friends
  - Last visit timestamp

**Network Layer**: Data transformation

---

### Step 5.3: Socket Registration
**Location**: `src/Cwebsocket-server.ts:111`
- **Action**: `socketHandler.referenceSocket(gameSocket)`
- **Purpose**: Adds socket to `connectedSockets` Set
- **Effect**: Socket is now tracked and will receive game loop updates

**Network Layer**: Application state management

---

## Phase 6: Player Creation/Attachment

### Step 6.1: Check Existing Player
**Location**: `src/Cwebsocket-server.ts:113-119`
- **Action**: `world.creatureHandler.getPlayerByName(data.properties.name)`
- **Scenarios**:

#### Scenario A: New Player (No Existing)
- **Path**: `createNewPlayer(gameSocket, data)`
- **Location**: `src/Cworld-creature-handler.ts:136-156`

#### Scenario B: Player Already Online
- **Config**: `CONFIG.SERVER.ON_ALREADY_ONLINE`
- **Options**:
  - `"replace"`: `existing.socketHandler.attachController(gameSocket)`
    - Closes old socket, attaches new one
  - `"spectate"`: `existing.socketHandler.addSpectator(gameSocket)`
    - Adds as spectator, keeps existing controller
  - **Default**: `gameSocket.closeError("Already online.")`

**Network Layer**: Game state logic

---

### Step 6.2: New Player Creation
**Location**: `src/Cworld-creature-handler.ts:136-156`

#### 6.2.1: Player Object Creation
- **Action**: `const player = new Player(data)`
- **Initializes**:
  - Properties, skills, equipment, containers
  - Movement handler, combat lock, idle handler
  - Socket handler, action handler
  - Spellbook, friendlist

#### 6.2.2: Position Resolution
- **Action**: `Position.fromLiteral(data.position)`
- **Tile Finding**:
  1. Try saved position: `world.findAvailableTile(player, position)`
  2. Fallback to temple: `world.getTileFromWorldPosition(player.templePosition)`
- **Failure**: `gameSocket.closeError("The character temple position is invalid.")`

#### 6.2.3: Add Player to World
- **Action**: `addPlayer(player, tile.position)`
- **Location**: `src/Cworld-creature-handler.ts:78-104`
- **Steps**:
  1. Adds creature to position: `addCreaturePosition(player, position)`
  2. References player: `__referencePlayer(player)`
  3. Broadcasts login: `world.broadcastPacket(PlayerLoginPacket)`
  4. Shows teleport effect: `player.broadcast(EffectMagicPacket)`
  5. Applies spell cooldowns: `player.spellbook.applyCooldowns()`
  6. Sends welcome message (if `lastVisit` exists)

#### 6.2.4: Attach Controller
- **Action**: `player.socketHandler.attachController(gameSocket)`
- **Location**: `src/Cplayer-socket-handler.ts:34-55`
- **Steps**:
  1. Closes existing controller (if any)
  2. Cancels pending logout event (if any)
  3. Sets new controller: `__controllingSocket = gameSocket`
  4. Adds as spectator: `addSpectator(gameSocket)`

**Network Layer**: Game world state management

---

## Phase 7: World State Synchronization

### Step 7.1: Add as Spectator
**Location**: `src/Cplayer-socket-handler.ts:82-94`
- **Action**: `addSpectator(gameSocket)`
- **Steps**:
  1. Adds to spectators Set: `__spectators.add(gameSocket)`
  2. Links player to socket: `gameSocket.player = this.player`
  3. Sends world state: `gameSocket.writeWorldState(this.player)`

**Network Layer**: Initial state synchronization

---

### Step 7.2: Write World State
**Location**: `src/Cgamesocket.ts:99-107`
- **Action**: `writeWorldState(player)`
- **Packets Sent**:
  1. **ServerStatePacket**: Server status
  2. **World Serialization**: `serializeWorld(player.getChunk())`
     - Sends all visible chunks and their contents
  3. **PlayerStatePacket**: Player's current state
  4. **WorldTimePacket**: Game world time
  5. **PlayerLoginPacket**: Broadcast to all players

**Network Layer**: WebSocket message transmission

---

### Step 7.3: Packet Buffer Flushing
**Location**: `src/Cgamesocket.ts:141-146`
- **Action**: `write(packet)` adds to `outgoingBuffer`
- **Flushing**: Happens in game loop via `NetworkManager.writeOutgoingBuffer()`
- **Location**: `src/Cnetwork-manager.ts:27-37`
- **Process**:
  1. Checks socket ready state
  2. Checks if buffer is empty
  3. Flushes buffer: `outgoingBuffer.flush()`
  4. Sends via WebSocket: `socket.send(message)`

**Network Layer**: WebSocket frame transmission

---

## Phase 8: Game Loop Integration

### Step 8.1: Socket Buffer Processing
**Location**: `src/Cgameserver.ts:97`
- **Game Loop**: `__loop()` called every tick (10ms)
- **Action**: `server.websocketServer.socketHandler.flushSocketBuffers()`
- **Location**: `src/Cwebsocket-server-socket-handler.ts:63-69`
- **Process**:
  ```typescript
  connectedSockets.forEach((gameSocket) => 
    networkManager.handleIO(gameSocket)
  );
  ```

**Network Layer**: Continuous I/O processing

---

### Step 8.2: Network I/O Handling
**Location**: `src/Cnetwork-manager.ts:39-46`
- **Action**: `handleIO(gameSocket)`
- **Steps**:
  1. **Read Incoming**: `readIncomingBuffer(gameSocket)`
     - Flushes incoming buffer
     - Checks socket timeout (120s)
     - Processes packets
     - Extends idle handler on packet
  2. **Write Outgoing**: `writeOutgoingBuffer(gameSocket)`
     - Flushes outgoing buffer
     - Sends to client

**Network Layer**: Bidirectional message handling

---

### Step 8.3: Ping/Heartbeat
**Location**: `src/Cgameloop.ts:110-112`
- **Frequency**: Every `MS_TICK_INTERVAL` ticks (every 10 ticks = ~100ms)
- **Action**: `socketHandler.ping()`
- **Location**: `src/Cwebsocket-server-socket-handler.ts:55-61`
- **Process**:
  ```typescript
  connectedSockets.forEach((gameSocket) => gameSocket.ping());
  ```
- **GameSocket Ping** (`src/Cgamesocket.ts:82-107`):
  - Checks if waiting for pong (30s timeout)
  - Sends WebSocket ping: `socket.ping()`
  - Marks as waiting: `__alive = false`, records time

**Network Layer**: WebSocket heartbeat (every ~1 second)

---

## Network Flow Diagram

```
┌─────────────┐
│   Client    │
│   Browser   │
└──────┬──────┘
       │ HTTPS/TLS
       │ GET /?token=...&characterId=...
       ▼
┌─────────────┐
│ Fly.io      │
│ Proxy       │
└──────┬──────┘
       │ HTTP/WebSocket
       │ Upgrade: websocket
       ▼
┌─────────────────────┐
│ HTTP Server         │
│ (Chttp-server.ts)   │
│                     │
│ 1. Validate HTTP    │
│ 2. Extract params   │
│ 3. Verify Firebase │
└──────┬──────────────┘
       │ WebSocket Upgrade
       ▼
┌─────────────────────┐
│ WebSocket Server    │
│ (Cwebsocket-server) │
│                     │
│ 1. Create GameSocket│
│ 2. Validate capacity│
│ 3. Load character   │
└──────┬──────────────┘
       │ Character Data
       ▼
┌─────────────────────┐
│ World Handler       │
│ (CreatureHandler)   │
│                     │
│ 1. Create Player    │
│ 2. Add to world     │
│ 3. Attach socket    │
└──────┬──────────────┘
       │ World State
       ▼
┌─────────────────────┐
│ Network Manager     │
│                     │
│ 1. Send world state │
│ 2. Start I/O loop   │
│ 3. Handle packets   │
└──────┬──────────────┘
       │ WebSocket Messages
       ▼
┌─────────────┐
│   Client    │
│   Browser   │
└─────────────┘
```

---

## Key Network Configurations

### TCP Socket Settings
- **Timeout**: `0` (disabled)
- **NoDelay**: `true` (Nagle disabled)
- **KeepAlive**: `true`, 15000ms (15 seconds)

### WebSocket Settings
- **Compression**: Enabled (perMessageDeflate)
- **Heartbeat**: 20 seconds (raw WebSocket)
- **Ping Frequency**: ~1 second (GameSocket, via game loop)

### Timeout Values
- **Socket Idle**: 120 seconds (no packets)
- **Ping Timeout**: 30 seconds (no pong)
- **AFK Kick**: 360 seconds (6 minutes)

---

## Error Paths & Disconnections

### Connection Rejection Points

1. **HTTP Validation** (`Chttp-server.ts:102-108`)
   - Invalid HTTP version → `505`
   - Wrong method → `405`
   - Wrong path → `404`

2. **Token Validation** (`Chttp-server.ts:131-133`)
   - Missing token/characterId → `400`

3. **Firebase Auth** (`Chttp-server.ts:148-150`)
   - Invalid token → `401`

4. **Server Capacity** (`Cwebsocket-server.ts:90`)
   - Server full → `"Server is full."`

5. **Server Shutdown** (`Cwebsocket-server.ts:91`)
   - Shutting down → `"Server is shutting down."`

6. **Character Not Found** (`Cwebsocket-server.ts:103`)
   - Invalid characterId/uid → `"Character not found."`

7. **Invalid Position** (`Cworld-creature-handler.ts:148`)
   - Bad temple position → `"The character temple position is invalid."`

8. **Already Online** (`Cwebsocket-server.ts:119`)
   - Character online + config rejects → `"Already online."`

---

## Post-Connection: Ongoing Network Activity

### Incoming Messages
- **Handler**: `GameSocket.__handleSocketData()`
- **Process**: Added to `incomingBuffer`
- **Flush**: Every game tick via `NetworkManager.readIncomingBuffer()`
- **Timeout Check**: Validates 120s since last packet

### Outgoing Messages
- **Handler**: `GameSocket.write(packet)`
- **Process**: Added to `outgoingBuffer`
- **Flush**: Every game tick via `NetworkManager.writeOutgoingBuffer()`

### Heartbeat
- **Raw WS**: Every 20 seconds (setInterval)
- **GameSocket**: Every ~1 second (game loop)
- **Purpose**: Detect stale connections

---

## Summary

The connection flow involves **8 major phases**:

1. **HTTP Connection**: TCP socket establishment
2. **HTTP Validation**: Request validation
3. **WebSocket Upgrade**: Protocol upgrade
4. **WebSocket Setup**: GameSocket creation
5. **Character Auth**: Database lookup
6. **Player Creation**: World integration
7. **State Sync**: Initial world state
8. **Game Loop**: Ongoing I/O processing

**Total Network Layers**:
- TCP (OS level)
- HTTP/1.1 (request/response)
- WebSocket (upgraded protocol)
- Application (game packets)

**Key Files**:
- `Chttp-server.ts`: HTTP/WebSocket upgrade
- `Cwebsocket-server.ts`: WebSocket management
- `Cgamesocket.ts`: Socket wrapper
- `Cnetwork-manager.ts`: I/O processing
- `Cworld-creature-handler.ts`: Player creation
