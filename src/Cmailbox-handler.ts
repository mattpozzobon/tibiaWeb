import { IItem, IThing } from "interfaces/IThing";
import Player from "./Cplayer";
import Readable from "./Creadable";
import Thing from "./Cthing";
import { CONST, getGameServer } from "./helper/appContext";
import { IPlayer } from "interfaces/IPlayer";


export class MailboxHandler {
  readonly UNSTAMPED_PARCEL = 2595;
  readonly STAMPED_PARCEL = 2596;
  readonly UNSTAMPED_LETTER = 2597;
  readonly STAMPED_LETTER = 2598;
  readonly LABEL = 2599;

  canMailItem(thing: IItem): boolean {
    /*
     * Determines whether something can be mailed or not
     */
    return thing.id === this.UNSTAMPED_PARCEL || thing.id === this.UNSTAMPED_LETTER;
  }

  sendThing(fromWhere: any, toWhere: any, player: IPlayer, thing: IItem): void {
    /*
     * Sub function for sending a parcel or letter when added to the mailbox
     */
    switch (thing.id) {
      case this.UNSTAMPED_LETTER:
        this.__sendLetter(fromWhere, toWhere, player, thing as Readable);
        break;
      case this.UNSTAMPED_PARCEL:
        this.__sendParcel(fromWhere, toWhere, player, thing as Readable);
        break;
    }
  }

  writeParcel(name: string, thing: IThing, callback: (error: boolean) => void): void {
    /*
     * Writes a parcel to a player with a particular name (async with I/O)
     */

    const newParcel = getGameServer().database.createThing(this.STAMPED_PARCEL);
    if(!thing || !newParcel) return;
    thing.copyProperties(newParcel);
    this.__mailThing(name, newParcel, callback);
  }

  writeLetter(name: string, content: string, callback: (error: boolean) => void): void {
    /*
     * Writes a letter to a player with a particular name (async with I/O)
     */
    const newLetter = getGameServer().database.createThing(this.STAMPED_LETTER);
    if (newLetter){
      newLetter.setContent(content);
      this.__mailThing(name, newLetter, callback);
    }
  }

  private __getLabel(parcel: IThing): IThing | null {
    /*
     * Attempts to find a label inside the parcel
     */
    for (const thing of parcel.container.__slots) {
      if (thing && thing.id === this.LABEL) {
        return thing;
      }
    }
    return null;
  }

  private __mailThing(name: string, thing: IThing, callback: (error: boolean) => void): void {
    /*
     * Writes a letter to a player that is offline by doing an atomic update
     */
    const player = getGameServer().world.creatureHandler.getPlayerByName(name);
    if (!player) {
      return this.__addItemsOffline(name, thing, callback);
    }

    player.containerManager.inbox.addThing(thing);
    callback(false);
  }

  private __addItemsOffline(owner: string, thing: IThing, callback: (error: boolean) => void): void {
    /*
     * Writes a letter to a player that is offline by doing an atomic update
     */
    getGameServer().server.accountManager.atomicUpdate(owner, (error: Error | null, json: any) => {
      if (error) {
        return callback(true); // Pass `true` to indicate an error occurred.
      }
    
      if (json && json.inbox) {
        json.inbox.push(thing); // Push the thing to the inbox if `json` is valid.
      }
    
      callback(false); // Indicate success by passing `false`.
    });
  }

  private __sendParcel(fromWhere: any, toWhere: any, player: IPlayer, thing: Readable): void {
    /*
     * Sub function for sending a parcel when added to the mailbox
     */
    const label = this.__getLabel(thing) as Readable;
    if (!label) {
      return player.sendCancelMessage("You must add a label to your parcel.");
    }

    const recipient = label.getContent();
    if (!recipient) {
      return player.sendCancelMessage("You must add the recipient to your label.");
    }

    thing.freeze();

    this.writeParcel(recipient, thing, (error: boolean) => {
      if (error) {
        thing.unfreeze();
        getGameServer().world.sendMagicEffect(toWhere.position, CONST.EFFECT.MAGIC.POFF);
        return player.sendCancelMessage("A recipient with this name does not exist.");
      }

      getGameServer().world.sendMagicEffect(toWhere.position, CONST.EFFECT.MAGIC.TELEPORT);
      thing.delete();
    });
  }

  private __sendLetter(fromWhere: any, toWhere: any, player: IPlayer, thing: Readable): void {
    /*
     * Sub function for sending a letter when added to the mailbox
     */
    if (!thing) return;
  
    const lines = thing.getContent()?.split("\n") || [];
    const recipient = lines.slice(0, 2).join("") || ""; // Default to an empty string if undefined
    const isolatedContent = lines.slice(2).join("\n") || ""; // Default to an empty string if undefined
  
    if (!recipient) {
      return player.sendCancelMessage("You must add the recipient to your letter.");
    }
  
    thing.freeze();
  
    this.writeLetter(recipient, isolatedContent, (error: boolean) => {
      if (error) {
        thing.unfreeze();
        getGameServer().world.sendMagicEffect(toWhere.position, CONST.EFFECT.MAGIC.POFF);
        return player.sendCancelMessage("A recipient with this name does not exist.");
      }
  
      getGameServer().world.sendMagicEffect(toWhere.position, CONST.EFFECT.MAGIC.TELEPORT);
      thing.delete();
    });
  }
  
}
