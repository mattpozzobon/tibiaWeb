import sqlite3 from "sqlite3";
import fs from "fs";
import { CharacterCreator } from "./Ccharacter-creator";
import { CONFIG } from "./helper/appContext";


export class AccountDatabase {
  private filepath: string;
  private characterCreator: CharacterCreator;
  private db!: sqlite3.Database;
  private __status: typeof CONFIG.SERVER.STATUS[keyof typeof CONFIG.SERVER.STATUS];

  constructor(filepath: string) {
    /*
     * Class AccountDatabase
     * Wrapper for the account database, keyed by Firebase UID.
     */
    this.filepath = filepath;
    this.characterCreator = new CharacterCreator();
    this.__status = CONFIG.SERVER.STATUS.OPENING;

    // Open the database
    this.__open(this.__handleOpen.bind(this));
  }

  private __handleOpen(error: Error | null): void {
    if (error) {
      console.error(`Error opening the database ${this.filepath}`, error);
      return;
    }
    this.__status = CONFIG.SERVER.STATUS.OPEN;
    console.log(`The sqlite database connection to ${this.filepath} has been opened.`);
  }

  private __open(callback: (error: Error | null) => void): void {
    if (fs.existsSync(this.filepath)) {
      this.db = new sqlite3.Database(this.filepath, sqlite3.OPEN_READWRITE, callback);
    } else {
      this.__createNewDatabase(callback);
    }
  }

  private __createNewDatabase(callback: (error: Error | null) => void): void {
    this.db = new sqlite3.Database(
      this.filepath,
      sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      callback
    );
    this.db.serialize(() => {
      this.__createAccountDatabase();
      // We do not pre-create default characters here; those depend on Firebase users
    });
  }

  private __createAccountDatabase(): void {
    // Create the accounts table keyed by Firebase UID
    const createAccounts = `
      CREATE TABLE IF NOT EXISTS accounts (
        uid       TEXT    PRIMARY KEY,
        email     TEXT,
        character JSON    NOT NULL
      );`;
    this.db.run(createAccounts, err => {
      if (err) {
        console.error("Error creating accounts table:", err.message);
      } else {
        console.log("Accounts table ready");
      }
    });
  }

  public close(): void {
    this.__status = CONFIG.SERVER.STATUS.CLOSING;
    this.db.close(this.__handleClose.bind(this));
  }

  private __handleClose(error: Error | null): void {
    if (error) {
      console.error(error.message);
      return;
    }
    this.__status = CONFIG.SERVER.STATUS.CLOSED;
    console.log("The database connection has been closed.");
  }

  /**
   * Fetch account record by Firebase UID.
   * callback(err, row) where row = { uid, email, character }
   */
  public getAccountByUid(
    uid: string,
    callback: (error: Error | null, row: { uid: string; email: string | null; character: string } | null) => void
  ): void {
    this.db.get("SELECT uid, email, character FROM accounts WHERE uid = ?", [uid], (err, row) => {
      if (err) return callback(err, null);
      if (!row) return callback(null, null);
      return callback(null, row as any);
    });
  }

  /**
   * Create a new account record for given UID and email, with a default character blueprint.
   * callback(code, null). On success code = 0.
   */
  public createAccountForUid(
    uid: string,
    email: string | null,
    callback: (errorCode: number | null) => void
  ): void {
    // Derive a default name from email local-part
    let defaultName = "player";
    if (email) {
      const local = email.split('@')[0].toLowerCase();
      const sanitized = local.replace(/[^a-z]/g, '');
      if (sanitized.length >= 3) {
        defaultName = sanitized.substring(0, 12);
      }
    }
    // Default sex and role; adjust as desired
    const defaultSex: "male" | "female" = "male";
    const defaultRole = 0; // adjust or define a CONST.ROLES.NONE

    // Create character JSON via CharacterCreator
    let characterJson: string;
    try {
      characterJson = this.characterCreator.create(defaultName, defaultSex, defaultRole);
    } catch (e) {
      console.error("Error creating default character:", e);
      return callback(500);
    }

    // Insert into DB
    const values = [uid, email, characterJson];
    this.db.run(
      "INSERT INTO accounts(uid, email, character) VALUES(?, ?, ?)",
      values,
      function(err) {
        if (err) {
          console.error("Error inserting account record:", err.message);
          return callback(500);
        }
        return callback(null);
      }
    );
  }

  /**
   * Save/update character JSON for a given UID.
   */
  public saveCharacterForUid(
    uid: string,
    characterObj: any,
    callback: (error: Error | null) => void
  ): void {
    try {
      const characterJson = JSON.stringify(characterObj);
      this.db.run(
        "UPDATE accounts SET character = ? WHERE uid = ?",
        [characterJson, uid],
        callback
      );
    } catch (err) {
      console.error("Error saving character JSON:", err);
      callback(err as Error);
    }
  }

  /**
   * Retrieve character JSON for a given UID.
   */
  public getCharacterForUid(
    uid: string,
    callback: (error: Error | null, result: { character: string } | undefined) => void
  ): void {
    this.db.get("SELECT character FROM accounts WHERE uid = ?", [uid], callback as any);
  }
}
