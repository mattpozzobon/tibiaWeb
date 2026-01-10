import { IItem, IThing, IContainer } from "interfaces/IThing";
import Readable from "../item/readable";
import { CONST, getGameServer } from "../helper/appContext";
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
        this.__sendParcel(fromWhere, toWhere, player, thing as IContainer);
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
    if (!parcel || !parcel.isContainer() || !parcel.container) {
      return null;
    }
    
    const slots = parcel.container.getSlots();
    for (const thing of slots) {
      if (thing && thing.id === this.LABEL) {
        return thing;
      }
    }
    return null;
  }

  private __extractRecipientName(content: string): string {
    /*
     * Extracts recipient name from #...# format
     * Examples: #Matheus# -> "Matheus", #Teste Um# -> "Teste Um"
     * Returns empty string if format is invalid or name is not found
     */
    if (!content) return "";
    
    // Match pattern: #Name# (allows spaces and multi-word names)
    const match = content.match(/#([^#]+)#/);
    if (match && match[1]) {
      return match[1].trim(); // Extract name between # markers and trim whitespace
    }
    
    return "";
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

  private __sendParcel(fromWhere: any, toWhere: any, player: IPlayer, thing: IContainer): void {
    /*
     * Sub function for sending a parcel when added to the mailbox
     * Label format: #Recipient Name#
     * Example: #Matheus# or #Teste Um#
     */
    const label = this.__getLabel(thing) as Readable;
    if (!label) {
      return player.sendCancelMessage("You must add a label to your parcel.");
    }

    const labelContent = label.getContent() || "";
    const recipient = this.__extractRecipientName(labelContent);
    
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
     * Letter format: #Recipient Name# followed by message content
     * 
     * Example:
     *   #Teste Um#
     *   Hello, this is my message...
     * 
     * Or:
     *   #Matheus#
     *   This is a message to Matheus
     */
    if (!thing) return;
  
    const content = thing.getContent() || "";
    
    // Extract recipient name from #...# format
    const recipient = this.__extractRecipientName(content);
    
    // Get message content: everything after the #...# marker
    // Find where the recipient name block ends and extract remaining content
    const recipientPattern = /#([^#]+)#/;
    const match = content.match(recipientPattern);
    let isolatedContent = content;
    
    if (match) {
      // Remove the #Name# part and any following whitespace/newlines
      isolatedContent = content.substring(match.index! + match[0].length).trim();
    }
  
    if (!recipient) {
      return player.sendCancelMessage("You must add the recipient to your letter. Format: #Recipient Name# (e.g., #Matheus# or #Teste Um#)");
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
