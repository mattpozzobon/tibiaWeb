# Timed Logout/Disconnect Mechanisms Analysis

This document identifies **ALL** places in the codebase that use timers, timeouts, or scheduled events to logout/disconnect players.

## Direct Timeout-Based Disconnects

### 1. ⏱️ **NetworkManager Socket Timeout** 
   - **Location**: `src/Cnetwork-manager.ts:54-65`
   - **Mechanism**: Checks time since last packet received
   - **Timeout**: `CONFIG.SERVER.SOCKET_TIMEOUT_MS` (default: **120 seconds**)
   - **Trigger**: `Date.now() - lastPacketReceived > timeoutMs`
   - **Action**: `gameSocket.close()` - Disconnects player
   - **Resets On**: 
     - Any incoming packet (opcode)
     - WebSocket pong response
   - **Status**: ✅ Fixed - Now 120s (was likely ~10-15s before)

### 2. ⏱️ **GameSocket Ping Timeout**
   - **Location**: `src/Cgamesocket.ts:82-106`
   - **Mechanism**: Tracks ping/pong cycle
   - **Timeout**: **30 seconds** (hardcoded `__pingTimeoutMs`)
   - **Trigger**: `timeSincePing > 30000` after sending ping
   - **Action**: `this.terminate()` - Terminates socket
   - **Resets On**: WebSocket pong received
   - **Frequency**: Called from game loop every 10 ticks (~100ms)
   - **Status**: ✅ Fixed - Prevents race conditions

### 3. ⏱️ **WebSocketServer Raw Ping Interval**
   - **Location**: `src/Cwebsocket-server.ts:32-41`
   - **Mechanism**: `setInterval` checking raw WebSocket `isAlive` flag
   - **Interval**: **20 seconds**
   - **Trigger**: `ws.isAlive === false` when interval fires
   - **Action**: `ws.terminate()` - Terminates raw WebSocket
   - **Resets On**: Raw WebSocket pong event
   - **Status**: ✅ OK - Standard WebSocket heartbeat

## Scheduled Event-Based Logouts

### 4. ⏱️ **PlayerIdleHandler - AFK Kick**
   - **Location**: `src/Cplayer-idle-handler.ts:21,33-36`
   - **Mechanism**: `GenericLock` using `EventQueue.addEvent()`
   - **Timing**: 
     - **Warn**: `CONFIG.WORLD.IDLE.WARN_SECONDS` = **300 seconds** (5 minutes)
     - **Kick**: `WARN_SECONDS + KICK_SECONDS` = **360 seconds** (6 minutes total)
   - **Trigger**: Lock expires via `EventQueue.tick()`
   - **Action**: `this.player.disconnect()` - Disconnects player
   - **Resets On**: `idleHandler.extend()` called when packet received
   - **Status**: ✅ OK - Intentional AFK handling

### 5. ⏱️ **Combat Lock Delayed Logout**
   - **Location**: `src/Cwebsocket-server.ts:130-135`
   - **Mechanism**: `EventQueue.addEvent()` scheduled when socket closes during combat
   - **Timing**: `combatLock.remainingFrames()` converted to ticks
   - **Combat Lock Duration**: **3 seconds** (from `Cplayer-combat-lock.ts:32`)
   - **Trigger**: Socket closes while player is in combat
   - **Action**: `__removePlayer()` - Removes player from world after combat ends
   - **Status**: ✅ OK - Prevents logout during combat

## Time-Based Checks (Not Direct Timers)

### 6. ⏱️ **Combat Lock Activation**
   - **Location**: `src/Cplayer-combat-lock.ts:27-34`
   - **Mechanism**: `GenericLock.lockSeconds(3)`
   - **Duration**: **3 seconds** per activation
   - **Purpose**: Prevents logout during combat
   - **Not a disconnect**: Only prevents logout, doesn't cause it
   - **Status**: ✅ OK - Gameplay mechanic

## Configuration Values

### Timeout Configuration (`src/config/config.json`)

```json
{
  "SERVER": {
    "MS_TICK_INTERVAL": 10,           // Game loop tick interval (ms)
    "SOCKET_TIMEOUT_MS": 120000       // Socket idle timeout (120 seconds)
  },
  "WORLD": {
    "IDLE": {
      "WARN_SECONDS": 300,            // AFK warning after 5 minutes
      "KICK_SECONDS": 60              // AFK kick after 6 minutes total
    }
  }
}
```

### Hardcoded Timeouts

- **GameSocket Ping Timeout**: 30 seconds (`__pingTimeoutMs`)
- **Combat Lock Duration**: 3 seconds (`COMBAT_LOCK_SECONDS`)
- **WebSocket Ping Interval**: 20 seconds (setInterval)

## Summary Table

| # | Mechanism | Timeout | Location | Action | Status |
|---|-----------|---------|----------|--------|--------|
| 1 | Socket Idle Timeout | 120s | `Cnetwork-manager.ts` | `close()` | ✅ Fixed |
| 2 | Ping/Pong Timeout | 30s | `Cgamesocket.ts` | `terminate()` | ✅ Fixed |
| 3 | Raw WS Ping | 20s | `Cwebsocket-server.ts` | `terminate()` | ✅ OK |
| 4 | AFK Kick | 360s | `Cplayer-idle-handler.ts` | `disconnect()` | ✅ OK |
| 5 | Combat Delayed Logout | 3s | `Cwebsocket-server.ts` | `removePlayer()` | ✅ OK |

## Key Findings

### ✅ All Timeouts Are Reasonable
- **Socket timeout**: 120s (2 minutes) - accounts for production latency
- **Ping timeout**: 30s - reasonable for network round-trip
- **AFK timeout**: 360s (6 minutes) - standard MMO AFK handling
- **Combat lock**: 3s - prevents logout during combat

### ✅ No Problematic Short Timeouts Found
All timeout mechanisms have been reviewed and are set to reasonable values that account for:
- Network latency
- Production proxy delays
- Browser scheduling delays
- WebSocket heartbeat timing

### ⚠️ Important Notes

1. **Socket Timeout (120s)**: This is the main protection against stale connections. It checks `lastPacketReceived` which is updated on:
   - Any game opcode packet
   - WebSocket pong responses

2. **Ping Timeout (30s)**: This is a secondary check. If a ping is sent and no pong arrives within 30 seconds, the connection is considered dead.

3. **AFK Handler (360s)**: This is intentional gameplay - players are warned at 5 minutes and kicked at 6 minutes of inactivity.

4. **Combat Lock (3s)**: This prevents logout during combat but doesn't cause disconnects - it just delays the logout process.

## Recommendations

All timeout mechanisms are properly configured and should work correctly in production. The main fixes applied were:

1. ✅ Increased socket timeout from ~10-15s to 120s
2. ✅ Fixed ping race condition to prevent premature disconnects
3. ✅ Treat WebSocket pongs as activity (updates `lastPacketReceived`)

No further timeout adjustments needed.
