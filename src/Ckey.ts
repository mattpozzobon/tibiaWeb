import Item from "./Citem";
import Tile from "./Ctile";
import Door from "./Cdoor";
import { IPlayer } from "interfaces/IPlayer";

class Key extends Item {
  constructor(id: number) {
    super(id);
  }

  handleKeyUse(player: IPlayer, tile: Tile): void {
    // Get the top element
    const door = tile.getTopItem();

    // Nothing there
    if (!door ) {
      return;
    }

    // Narrow type to Door
    if (!door.isDoor()) {
      return;
    }

    const doorAsDoor = door as Door; // Type assertion to treat it as Door

    // Magic doors are not affected by keys
    if (doorAsDoor.getAttribute("expertise") || doorAsDoor.getAttribute("unwanted")) {
      player.sendCancelMessage("Keys do not work on magic doors.");
      return;
    }

    // Already opened: close it
    if (doorAsDoor.isOpened()) {
      doorAsDoor.toggle(player);
      return;
    }

    // Confirm the action identifiers match with the key
    if (this.actionId !== doorAsDoor.actionId) {
      player.sendCancelMessage("The key does not fit inside the keyhole.");
      return;
    }

    // Write message to the player
    player.sendCancelMessage("The door unlocks.");

    // Request the door to be opened by the key
    doorAsDoor.open();
  }
}

export default Key;
