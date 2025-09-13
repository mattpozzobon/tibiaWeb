import { IPosition } from "interfaces/IPosition";
import { ServerMessagePacket } from "./Cprotocol";
import { CONST, getGameServer } from "./helper/appContext"; // Helper to get the game server
import { Position } from "./Cposition";
import { IPlayer } from "interfaces/IPlayer";

export class CommandHandler {
  private WAYPOINTS: Record<string, IPosition>;

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

  handleCommandWaypoint(player: IPlayer, waypoint: string): void {
    /*
     * Executes the waypoint command
     */
    if (!this.WAYPOINTS.hasOwnProperty(waypoint)) {
      player.sendCancelMessage("This waypoint does not exist.");
      return;
    }

    getGameServer().world.creatureHandler.teleportCreature(player, this.WAYPOINTS[waypoint]);
  }

  handle(player: IPlayer, message: string): void {
    /*
     * Handles commands sent by the player
     */
    const args = message.split(" ");

    switch (args[0]) {
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

      case "/broadcast":
        getGameServer().world.broadcastPacket(new ServerMessagePacket(args.slice(1).join(" ")));
        break;

      case "/spawn":
        const id = Number(args[1]);
        getGameServer().world.creatureHandler.spawnCreature(id, player.getPosition());
        break;

      case "/+":
        player.increaseHealth(10);
        player.increaseMana(10);
        player.increaseEnergy(10);
        getGameServer().world.sendMagicEffect(player.getPosition(), CONST.EFFECT.MAGIC.MAGIC_BLUE);
        break;

      case "/-":
        player.decreaseHealth(10);
        player.decreaseMana(10);
        player.decreaseEnergy(10);
        getGameServer().world.sendMagicEffect(player.getPosition(), CONST.EFFECT.MAGIC.DRAWBLOOD);
        break;

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

      default:
        player.sendCancelMessage("Unknown command.");
    }
  }

  private handleCommandSetTime(player: IPlayer, timeStr?: string): void {
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
