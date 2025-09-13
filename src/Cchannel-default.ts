import { IPlayer } from "interfaces/IPlayer";
import Channel from "./Cchannel";
import CommandHandler from "./Ccommand-handler";
import { CONST, getGameServer } from "./helper/appContext";


export class DefaultChannel extends Channel {
  private commandHandler: CommandHandler;

  constructor(id: number, name: string) {
    /*
     * Class DefaultChannel
     * Wrapper for the default channel that broadcasts to all characters inside a particular range
     */
    super(id, name);

    // The handler for chat commands
    this.commandHandler = new CommandHandler();
  }

  send(player: IPlayer, packet: { message: string; loudness: number }): void {
    /*
     * Sends a message to all players near this player in the game world
     */

    const { message, loudness } = packet;

    // Administrators have a red color; players yellow
    const color = player.getProperty(CONST.PROPERTIES.ROLE) === CONST.ROLES.GOD ? CONST.COLOR.RED : CONST.COLOR.YELLOW;

    // Forward to the command handler
    if (message.startsWith("/")) {
      this.commandHandler.handle(player, message);
      return;
    }

    // Whispers
    if (loudness === 0) {
      player.speechHandler.internalCreatureWhisper(message, color);
      return;
    }

    // Yells
    if (loudness === 2) {
      player.speechHandler.internalCreatureYell(message, color);
      return;
    }

    // Write to the default game screen and the default chat channel
    player.speechHandler.internalCreatureSay(message, color);

    // NPCs listen to all messages in the default channels
    this.__NPCListen(player, message.toLowerCase());
  }

  private __NPCListen(player: IPlayer, message: string): void {
    /*
     * Handler called when a player says a message and NPCs are nearby
     */

    // Get the NPCs spectating the chunk
    const chunks = getGameServer().world.getSpectatingChunks(player.position);

    // Iterate over all the NPCs nearby in the game world
    chunks.forEach((chunk: { npcs: any[]; }) => {
      chunk.npcs.forEach((npc) => npc.listen(player, message));
    });
  }
}

export default DefaultChannel;
