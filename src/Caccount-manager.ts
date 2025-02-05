import * as fs from "fs";
import * as bcrypt from "bcryptjs";
import { getDataFile } from "./helper/appContext";
import { FileAccessHandler } from "./Cfile-access-handler";
import { capitalize } from "./utils/functions";

export class AccountManager {
  private fileAccessHandler: FileAccessHandler;
  private CHARACTER_BLUEPRINT: Buffer;
  private SALT_ROUNDS = 12;

  constructor() {
    /*
     * Class AccountManager
     * Container for interaction with the player database (filesystem)
     */

    // The access handler that prevents race conditions when accessing files
    this.fileAccessHandler = new FileAccessHandler();

    // The template for new characters
    this.CHARACTER_BLUEPRINT = fs.readFileSync(getDataFile("account-template.json"));
  }

  private getCharacterBlueprint(queryObject: {
    name: string;
    sex: string;
  }): string {
    /*
     * AccountManager.__getCharacterBlueprint
     * Returns a new character template to create a new account with
     */

    // Copy the template in memory
    const buffer = Buffer.allocUnsafe(this.CHARACTER_BLUEPRINT.length);
    this.CHARACTER_BLUEPRINT.copy(buffer);

    const copiedTemplate = JSON.parse(buffer.toString());

    // Replace names and return the string for saving
    copiedTemplate.creatureStatistics.name = capitalize(queryObject.name);

    // The player sex is 0 for male, 1 for female
    copiedTemplate.characterStatistics.sex =
      queryObject.sex === "male" ? 0 : queryObject.sex === "female" ? 1 : null;

    // Default male & female outfits
    copiedTemplate.characterStatistics.availableOutfits =
      queryObject.sex === "male" ? [128, 129, 130, 131] : [136, 137, 138, 139];

    // Set default outfit too
    copiedTemplate.creatureStatistics.outfit.id =
      queryObject.sex === "male" ? 128 : 136;

    // Return the template as a string to write it to the filesystem
    return JSON.stringify(copiedTemplate, null, 2);
  }

  public createAccount(
    queryObject: { name: string; password: string; sex: string },
    requestCallback: (error: number | null, result: object | null) => void
  ): void {
    /*
     * AccountManager.createAccount
     * Creates an account with the specified query parameters and calls a callback on success/failure
     */
  
    const name = queryObject.name.toLowerCase();
    const filepath = this.getAccountFile(name);
  
    fs.exists(filepath, (exists) => {
      if (exists) {
        return requestCallback(409, null);
      }
  
      bcrypt.hash(queryObject.password, this.SALT_ROUNDS, (error, hash) => {
        if (error) {
          return requestCallback(500, null);
        }
  
        // Convert the character blueprint string to a Buffer
        const buffer = { buffer: Buffer.from(this.getCharacterBlueprint(queryObject)) };
  
        this.fileAccessHandler.writeFile(filepath, buffer, (error: any) => {
          if (error) {
            return requestCallback(500, null);
          }
  
          return requestCallback(null, {
            hash: hash,
            definition: name,
          });
        });
      });
    });
  }  

  private getAccountFile(name: string): string {
    /*
     * Function AccountManager.getAccountFile
     * Returns the account file of a particular name
     */
    return getDataFile("accounts", "definitions", `${name.toLowerCase()}.json`);
  }

  public getPlayerAccount(
    name: string,
    callback: (error: Error | null, result: object | null) => void
  ): void {
    /*
     * Function AccountManager.getPlayerAccount
     * Reads an account from the filesystem database
     */
    const filepath = this.getAccountFile(name);
  
    this.fileAccessHandler.readFile(filepath, (error: Error | null, buffer?: Buffer) => {
      if (error || !buffer) {
        return callback(error ?? new Error("Buffer is undefined"), null);
      }
      try {
        const result = JSON.parse(buffer.toString());
        return callback(null, result);
      } catch (parseError) {
        return callback(parseError as Error, null);
      }
    });
  }  

  public atomicUpdate(
    owner: string,
    callback: (error: Error | null, json: object | null) => void // Allow `json` to be null
  ): void {
    /*
     * Function AccountManager.atomicUpdate
     * Applies an atomic read/write to the player file on disk that does not allow for race conditions to occur
     */
  
    const pointer = { buffer: null as string | null, error: false };
  
    this.getPlayerAccount(owner, (error, json) => {
      if (error || json === null) { // Handle the possibility of `json` being null
        pointer.error = true;
        return callback(error, null);
      }
  
      callback(null, json);
  
      pointer.buffer = JSON.stringify(json, null, 2);
    });
  
    this.savePlayerAccount(owner, pointer);
  }  

  private savePlayerAccount(name: string, pointer: { buffer: string | null }): void {
    /*
     * Function AccountManager.savePlayerAccount
     * Writes the account to the filesystem database
     */
    const filepath = this.getAccountFile(name);
  
    // Convert string buffer to a Buffer object if it's not null
    const filePointer = {
      buffer: pointer.buffer ? Buffer.from(pointer.buffer, "utf-8") : null,
      error: false,
    };
  
    this.fileAccessHandler.writeFile(filepath, filePointer, (error: any) => {
      if (error) {
        console.error(`Could not save account data for ${name}`);
      }
    });
  }
}
