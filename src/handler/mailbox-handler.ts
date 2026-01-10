import { IItem, IThing, IContainer } from "interfaces/IThing";
import Readable from "../item/readable";
import Inbox from "../item/inbox";
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
     * Adds mail to a player that is offline by updating their character data in the database
     * Serializes the item and adds it to the character's inbox array (queue)
     * Database query uses case-insensitive matching (COLLATE NOCASE)
     */
    const accountDatabase = getGameServer().accountDatabase;
    
    // Get character by name (query is case-insensitive via COLLATE NOCASE)
    accountDatabase.getCharacterByName(owner, (error: Error | null, character: any) => {
      if (error || !character) {
        return callback(true); // Character not found or error occurred
      }
      
      // Process mail for found character
      this.__processOfflineMail(character, thing, callback, accountDatabase);
    });
  }
  
  private __processOfflineMail(character: any, thing: IThing, callback: (error: boolean) => void, accountDatabase: any): void {
    /*
     * Helper method to process adding mail to offline player's inbox
     * Uses Inbox.serializeItem() - the exact same serialization method as online players
     * This ensures 100% consistency: offline mail is serialized identically to online mail
     * When online player logs out, Inbox.toJSON() uses Inbox.serializeItem() for each item
     * When offline player receives mail, we use Inbox.serializeItem() directly
     */
    // Parse containers JSON (it's stored as a string in the database)
    let containers: any;
    try {
      containers = typeof character.containers === 'string' 
        ? JSON.parse(character.containers) 
        : character.containers;
    } catch (parseError) {
      // If parsing fails, initialize empty containers
      containers = { depot: [], equipment: [], inbox: [], keyring: [] };
    }
    
    // Ensure inbox array exists
    if (!Array.isArray(containers.inbox)) {
      containers.inbox = [];
    }
    
    // Serialize the item using the same method as online players
    // Uses Inbox.serializeItem() which is the same logic used by Inbox.toJSON()
    // This ensures 100% consistency between online and offline mail handling
    const itemJSON = Inbox.serializeItem(thing);
    
    // Add serialized item to inbox queue (same format as when player logs out)
    // This matches exactly what Inbox.toJSON() produces for online players
    containers.inbox.push(itemJSON);
    
    // Convert character data to legacy format for updateCharacterData
    const characterData = accountDatabase.characterDataToLegacyFormat(character);
    
    // Update containers in character data with modified inbox
    characterData.containers = containers;
    
    // Update character in database
    accountDatabase.updateCharacterData(character.id, characterData, (updateError: Error | null) => {
      if (updateError) {
        console.error(`Failed to update character inbox for ${character.name}:`, updateError);
        return callback(true); // Error occurred during update
      }
      
      callback(false); // Success
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
