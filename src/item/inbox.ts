import { IPlayer } from "interfaces/IPlayer";
import Thing from "../thing/thing";
import { CONST, getGameServer } from "../helper/appContext";

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
     * Adds a thing to the inbox (also adds to depot mail container)
     */
    this.__items.push(thing);
    if (this.__player.containerManager && this.__player.containerManager.depot) {
      this.__player.containerManager.depot.addToMail(thing);
    }
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

    const mailContainer = this.__player.containerManager.depot.getMailContainer();
    if (!mailContainer || mailContainer.getNumberItems() === 0) {
      getGameServer().world.sendMagicEffect(position, CONST.EFFECT.MAGIC.POFF);
      this.__player.sendCancelMessage("There are no items in your inbox.");
      return;
    }

    const thing = mailContainer.peekIndex(mailContainer.getNumberItems() - 1);

    if (!thing) {
      getGameServer().world.sendMagicEffect(position, CONST.EFFECT.MAGIC.POFF);
      this.__player.sendCancelMessage("There are no items in your inbox.");
      return;
    }

    if (!this.__player.containerManager.equipment.canPushItem(thing)) {
      this.__sendToDepot(thing, position);
      return;
    }

    mailContainer.removeIndex(mailContainer.getNumberItems() - 1, 1);
    this.__items = this.__items.filter(item => item !== thing);
    this.__player.containerManager.equipment.pushItem(thing);
    this.__player.sendCancelMessage(`You took ${thing.getName()} from your inbox.`);
    getGameServer().world.sendMagicEffect(position, CONST.EFFECT.MAGIC.BLOCKHIT);
  }

  private __sendToDepot(thing: Thing, position: any): void {
    /*
     * Class Inbox.__sendToDepot
     * Sends the next item in the list to the depot container
     */
    const mailContainer = this.__player.containerManager.depot.getMailContainer();
    if (!mailContainer || !this.__player.containerManager.depot.canAddFirstEmpty(thing)) {
      getGameServer().world.sendMagicEffect(position, CONST.EFFECT.MAGIC.POFF);
      this.__player.sendCancelMessage(
        "You cannot carry this item and there is no space in your depot."
      );
      return;
    }

    mailContainer.removeIndex(mailContainer.getNumberItems() - 1, 1);
    this.__items = this.__items.filter(item => item !== thing);
    this.__player.sendCancelMessage(
      "You cannot carry this item and it was sent to your depot."
    );
    this.__player.containerManager.depot.addFirstEmpty(thing);
    getGameServer().world.sendMagicEffect(position, CONST.EFFECT.MAGIC.TELEPORT);
  }

  isEmpty(): boolean {
    /*
     * Class Inbox.isEmpty
     * Returns true if the inbox is empty (checks Mail container as source of truth)
     */
    if (!this.__player.containerManager || !this.__player.containerManager.depot) {
      return this.__items.length === 0;
    }
    const mailContainer = this.__player.containerManager.depot.getMailContainer();
    return mailContainer ? mailContainer.getNumberItems() === 0 : this.__items.length === 0;
  }
}

export default Inbox;
