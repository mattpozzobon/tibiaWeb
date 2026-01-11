import { ServerMessagePacket } from "../network/protocol";
import { CONST, getGameServer } from "../helper/appContext"; // Helper to get the game server
import { Position } from "../utils/position";
import Player from "creature/player/player";

export class CommandHandler {
  private WAYPOINTS: Record<string, Position>;

  constructor() {
    /*
     * Class CommandHandler
     * Handles various commands for the game
     */
    this.WAYPOINTS = {
      rookgaard: new Position(32097, 32219, 8),
      thais: new Position(32369, 32241, 8),
      carlin: new Position(32360, 31782, 8),
      "ab'dendriel": new Position(32732, 31634, 8),
      venore: new Position(32957, 32076, 8),
      poh: new Position(32816, 32260, 10),
      "gm-island": new Position(32316, 31942, 8),
      senja: new Position(32125, 31667, 8),
      dracona: new Position(32804, 31586, 15),
      "orc-fortress": new Position(32882, 31772, 9),
      edron: new Position(33217, 31814, 7),
      kazordoon: new Position(32649, 31925, 4),
      ankrahmun: new Position(33194, 32853, 7),
      darama: new Position(33213, 32454, 14),
      cormaya: new Position(33301, 31968, 8),
      fibula: new Position(32174, 32437, 8),
      "white-flower": new Position(32346, 32362, 9),
      "femur-hills": new Position(32536, 31837, 11),
      "ghost-ship": new Position(33321, 32181, 8),
      "mintwallin": new Position(32456, 32100, 0),
      cyclopolis: new Position(33251, 31695, 8),
      annihilator: new Position(33221, 31671, 2),
    };
  }

  handleCommandWaypoint(player: Player, waypoint: string): void {
    /*
     * Executes the waypoint command
     */
    if (!this.WAYPOINTS.hasOwnProperty(waypoint)) {
      player.sendCancelMessage("This waypoint does not exist.");
      return;
    }

    getGameServer().world.creatureHandler.teleportCreature(player, this.WAYPOINTS[waypoint]);
  }

  handle(player: Player, message: string): void {
    /*
     * Handles commands sent by the player
     */
    console.log('COMMAND: ', message);
    const args = message.split(" ");
    const command = args[0].trim(); // Trim whitespace just in case

    switch (command) {
      case "/property":
        player.setProperty(Number(args[1]), Number(args[2]));
        break;

      case "/waypoint":
        this.handleCommandWaypoint(player, args[1]);
        break;

      case "/teleport":
        const position = new Position(Number(args[1]), Number(args[2]), Number(args[3]));
        getGameServer().world.creatureHandler.teleportCreature(player, position);
        break;

      case "/t":
        if (!args[1]) {
          player.sendCancelMessage("Usage: /t x,y,z (e.g., /t 12,20,7)");
          break;
        }
        const coords = args[1].split(",");
        if (coords.length !== 3) {
          player.sendCancelMessage("Invalid format. Use: /t x,y,z (e.g., /t 12,20,7)");
          break;
        }
        const x = Number(coords[0].trim());
        const y = Number(coords[1].trim());
        const z = Number(coords[2].trim());
        if (isNaN(x) || isNaN(y) || isNaN(z)) {
          player.sendCancelMessage("Invalid coordinates. All values must be numbers.");
          break;
        }
        const teleportPos = new Position(x, y, z);
        const teleportSuccess = getGameServer().world.creatureHandler.teleportCreature(player, teleportPos);
        if (!teleportSuccess) {
          player.sendCancelMessage("Cannot teleport to that position. Tile may not exist.");
        }
        break;

      case "/a":
        if (!args[1]) {
          player.sendCancelMessage("Usage: /a <number> (e.g., /a 2 to move 2 squares forward)");
          break;
        }
        const distance = Number(args[1]);
        if (isNaN(distance) || distance < 1) {
          player.sendCancelMessage("Invalid distance. Must be a positive number.");
          break;
        }
        const direction = player.getProperty(CONST.PROPERTIES.DIRECTION);
        const currentPos = player.getPosition();
        const oneStep = currentPos.getPositionFromDirection(direction);
        if (!oneStep) {
          player.sendCancelMessage("Invalid direction.");
          break;
        }
        // Calculate offset (one step position - current position)
        const offsetX = oneStep.x - currentPos.x;
        const offsetY = oneStep.y - currentPos.y;
        // Multiply offset by distance and add to current position
        const targetPos = new Position(
          currentPos.x + (offsetX * distance),
          currentPos.y + (offsetY * distance),
          currentPos.z
        );
        const moveSuccess = getGameServer().world.creatureHandler.teleportCreature(player, targetPos);
        if (!moveSuccess) {
          player.sendCancelMessage("Cannot move to that position. Tile may not exist.");
        }
        break;

      case "/up":
        const currentPosUp = player.getPosition();
        const upPos = currentPosUp.up();
        const upSuccess = getGameServer().world.creatureHandler.teleportCreature(player, upPos);
        if (!upSuccess) {
          player.sendCancelMessage("Cannot move up. Floor may not exist.");
        }
        break;

      case "/down":
        const currentPosDown = player.getPosition();
        const downPos = currentPosDown.down();
        const downSuccess = getGameServer().world.creatureHandler.teleportCreature(player, downPos);
        if (!downSuccess) {
          player.sendCancelMessage("Cannot move down. Floor may not exist.");
        }
        break;

      case "/broadcast":
        getGameServer().world.broadcastPacket(new ServerMessagePacket(args.slice(1).join(" ")));
        break;

      case "/spawn":
        const id = Number(args[1]);
        getGameServer().world.creatureHandler.spawnCreature(id, player.getPosition());
        break;

      case "/+": {
        const amt = this.parseAmount(args[1], 10);
        player.increaseHealth(amt);
        player.increaseMana(amt);
        player.increaseEnergy(amt);
        getGameServer().world.sendMagicEffect(player.getPosition(), CONST.EFFECT.MAGIC.MAGIC_BLUE);
        break;
      }

      case "/-": {
        const amt = this.parseAmount(args[1], 10);
        player.decreaseHealth(amt);
        player.decreaseMana(amt);
        player.decreaseEnergy(amt);
        getGameServer().world.sendMagicEffect(player.getPosition(), CONST.EFFECT.MAGIC.DRAWBLOOD);
        break;
      }

      case "/path":
        const start = player.getPosition();
        const end = start.add(new Position(Number(args[1]), Number(args[2]), 0));
        const path = getGameServer().world.findPath(player, start, end, 1);
        path.forEach((tile: { getPosition: () => any; }) => {
          getGameServer().world.sendMagicEffect(tile.getPosition(), CONST.EFFECT.MAGIC.TELEPORT);
        });
        break;

      case "/time":
        this.handleCommandSetTime(player, args[1]);
        break;

      case "/close": {
        const defaultSeconds = 1; // 1 second default
        const seconds = args[1] ? Number(args[1]) : defaultSeconds;
        if (isNaN(seconds) || seconds < 0) {
          player.sendCancelMessage("Usage: /close [seconds] (default: 1 second)");
          return;
        }
        getGameServer().shutdownManager.logoutNonAdminPlayers(seconds);
        player.sendCancelMessage(`Server will enter maintenance mode in ${seconds} seconds. Players with role > 1 will remain connected.`);
        break;
      }

      case "/open":
      case "/open ": { // Handle with trailing space just in case
        const gameServer = getGameServer();
        if (gameServer.statusManager.isShutdown()) {
          gameServer.shutdownManager.cancelShutdown();
          player.sendCancelMessage("Server shutdown cancelled. Server is now open.");
        } else if (gameServer.statusManager.isClosed() || gameServer.statusManager.isMaintenance()) {
          gameServer.shutdownManager.reopen();
          player.sendCancelMessage("Server reopened. Server is now open for connections.");
        } else {
          player.sendCancelMessage("Server is already open.");
        }
        break;
      }

      default:
        player.sendCancelMessage(`Unknown command: "${command}"`);
    }
  }

  private parseAmount(arg?: string, def = 10): number {
    const n = Number(arg);
    if (!Number.isFinite(n)) return def;
    const v = Math.abs(Math.trunc(n));
    return v > 0 ? v : def;
  }

  private handleCommandSetTime(player: Player, timeStr?: string): void {
    if (!timeStr) {
      player.sendCancelMessage("Usage: /time HH:MM (24h)");
      return;
    }

    const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) {
      player.sendCancelMessage("Invalid time format. Use HH:MM (24h).");
      return;
    }

    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) {
      player.sendCancelMessage("Invalid time. Hours 0–23, minutes 0–59.");
      return;
    }

    const hh = String(h).padStart(2, "0");
    const mm = String(min).padStart(2, "0");
    const canon = `${hh}:${mm}`;

    // set and broadcast (WorldClock.changeTime already broadcasts the time packet)
    getGameServer().world.clock.changeTime(canon);

    // optional chat broadcast for humans
    //getGameServer().world.broadcastPacket(new ServerMessagePacket(`World time set to ${canon}.`));
  }
}

export default CommandHandler;
