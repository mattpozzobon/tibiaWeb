import sqlite3 from "sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";
import { CharacterCreator } from "./Ccharacter-creator";
import { CONFIG, Print } from "./helper/appContext";

export class AccountDatabase {
  private filepath: string;
  private characterCreator: CharacterCreator;
  private db!: sqlite3.Database;
  private __status: typeof CONFIG.SERVER.STATUS[keyof typeof CONFIG.SERVER.STATUS];

  constructor(filepath: string) {
    /*
     * Class AccountDatabase
     * Wrapper for the account database
     */
    this.filepath = filepath;
    this.characterCreator = new CharacterCreator();
    this.__status = CONFIG.SERVER.STATUS.OPENING;

    // Open the database
    this.__open(this.__handleOpen.bind(this));
  }

  private __handleOpen(error: Error | null): void {
    if (error) {
      console.error(`Error opening the database ${this.filepath}`);
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

      if (CONFIG.DATABASE.DEFAULT_CHARACTER.ENABLED) {
        const defaults = [
          CONFIG.DATABASE.DEFAULT_CHARACTER,
          CONFIG.DATABASE.DEFAULT_CHARACTER0,
          CONFIG.DATABASE.DEFAULT_CHARACTER1,
          CONFIG.DATABASE.DEFAULT_CHARACTER2,
          CONFIG.DATABASE.DEFAULT_CHARACTER3,
          CONFIG.DATABASE.DEFAULT_CHARACTER4,
          CONFIG.DATABASE.DEFAULT_CHARACTER5,
        ];

        defaults.forEach((defaultCharacter) => {
          this.__createDefaultCharacter(defaultCharacter);
        });
      }
    });
  }

  private __createDefaultCharacter(DEFAULT_CHARACTER: any): void {
    const queryObject = {
      account: DEFAULT_CHARACTER.ACCOUNT,
      password: DEFAULT_CHARACTER.PASSWORD,
      name: DEFAULT_CHARACTER.NAME,
      sex: DEFAULT_CHARACTER.SEX,
      role: DEFAULT_CHARACTER.ROLE
    };

    this.createAccount(queryObject, (error) => {
      if (error) {
        console.error(`Error creating default character: ${error}`);
        return;
      }
      console.log(`Default character ${queryObject.name} has been created.`);
    });
  }

  private __createAccountDatabase(): void {
    const tableQuery = `
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        account VARCHAR(32) NOT NULL,
        hash BINARY(60) NOT NULL,
        name VARCHAR(32) NOT NULL,
        character JSON NOT NULL,
        UNIQUE(account, name)
      );`;

    this.db.run(tableQuery, (error) => {
      if (error) {
        console.error("Error creating account table");
        return;
      }
      console.log("Created account table");
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

  public createAccount(queryObject: any, callback: (code: number, result: any) => void): void {
    const SALT_ROUNDS = 12;

    this.getAccountCredentials(queryObject.account, (error, result) => {
      if (error) {
        callback(500, null);
        return;
      }

      if (result !== undefined) {
        callback(409, null);
        return;
      }

      bcrypt.hash(queryObject.password, SALT_ROUNDS, (error, hash) => {
        if (error) {
          callback(500, null);
          return;
        }

        const account = queryObject.account.toLowerCase();
        const name = queryObject.name;
        let character = this.characterCreator.create(name, queryObject.sex, queryObject.role);
        const values = [account, hash, name, character];

        this.db.run(
          "INSERT INTO accounts(account, hash, name, character) VALUES(?, ?, ?, ?)",
          values,
          callback
        );
      });
    });
  }

  public saveCharacter(gameSocket: any, callback: (error: Error | null) => void): void {

    try {
      let character = JSON.stringify(gameSocket.player);

      Print.savePlayer(character);
      
      this.db.run(
        "UPDATE accounts SET character = ? WHERE account = ?",
        [character, gameSocket.account],
        callback
      );
    } catch (error) {
      console.error("❌ JSON Stringify Failed:", error);
    }
  }

  public getCharacter(account: string, callback: (error: Error | null, result: any) => void): void {
    this.db.get("SELECT character FROM accounts WHERE account = ?", [account], callback);
  }

  public getAccountCredentials(
    account: string,
    callback: (error: Error | null, result: any) => void
  ): void {
    this.db.get("SELECT hash FROM accounts WHERE account = ?", [account], callback);
  }
}
