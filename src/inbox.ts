import { IPlayer } from "interfaces/IPlayer";
import Thing from "./thing"; // Adjust the import path as needed
import { CONST, getGameServer } from "./helper/appContext";

class Inbox {
  private __player: IPlayer;
  private __items: Thing[] = [];

  constructor(IPlayer: IPlayer, inbox: any[]) {
    /*
     * Class Inbox
     * Container for items that were added to the IPlayer's inbox and can be extracted by clicking a mailbox
     */

    this.__player = IPlayer;

    // Serialize all the items
    inbox.forEach((item) => {
      this.__items.push(getGameServer().database.parseThing(item) as Thing);
    });
  }

  addThing(thing: Thing): void {
    /*
     * Class Inbox.addThing
     * Adds a thing to the inbox
     */

    this.__items.push(thing);
    this.__player.sendCancelMessage("You just received mail.");
  }

  toJSON(): Thing[] {
    /*
     * Class Inbox.toJSON
     * Serializes the inbox
     */

    return this.__items;
  }

  pop(position: any): void {
    /*
     * Class Inbox.pop
     * Returns the top item of the mailbox (first in last out)
     */

    if (this.isEmpty()) {
      getGameServer().world.sendMagicEffect(position, CONST.EFFECT.MAGIC.POFF);
      this.__player.sendCancelMessage("There are no items in your inbox.");
      return;
    }

    let thing = this.__items[this.__items.length - 1];

    if (!this.__player.containerManager.equipment.canPushItem(thing)) {
      this.__sendToDepot(thing, position);
      return;
    }

    thing = this.__items.pop()!;
    this.__player.containerManager.equipment.pushItem(thing);
    this.__player.sendCancelMessage(`You took ${thing.getName()} from your inbox.`);
    getGameServer().world.sendMagicEffect(position, CONST.EFFECT.MAGIC.BLOCKHIT);
  }

  private __sendToDepot(thing: Thing, position: any): void {
    /*
     * Class Inbox.__sendToDepot
     * Sends the next item in the list to the depot
     */

    if (!this.__player.containerManager.depot.canAddFirstEmpty(thing)) {
      getGameServer().world.sendMagicEffect(position, CONST.EFFECT.MAGIC.POFF);
      this.__player.sendCancelMessage(
        "You cannot carry this item and there is no space in your depot."
      );
      return;
    }

    this.__player.sendCancelMessage(
      "You cannot carry this item and it was sent to your depot."
    );
    this.__player.containerManager.depot.addFirstEmpty(this.__items.pop()!);
    getGameServer().world.sendMagicEffect(position, CONST.EFFECT.MAGIC.TELEPORT);
  }

  isEmpty(): boolean {
    /*
     * Class Inbox.isEmpty
     * Returns true if the inbox is empty
     */

    return this.__items.length === 0;
  }
}

export default Inbox;
