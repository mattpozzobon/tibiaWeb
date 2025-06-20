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
    this.filepath = filepath;
    this.characterCreator = new CharacterCreator();
    this.__status = CONFIG.SERVER.STATUS.OPENING;
    this.__open(this.__handleOpen.bind(this));
  }

  private __handleOpen(error: Error | null): void {
    if (error) {
      console.error(`Error opening database ${this.filepath}`, error);
      return;
    }
    this.__status = CONFIG.SERVER.STATUS.OPEN;
    console.log(`Database connection to ${this.filepath} is open.`);
  }

  private __open(callback: (error: Error | null) => void): void {
    const fileExists = fs.existsSync(this.filepath);
    this.db = new sqlite3.Database(this.filepath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, callback);
    if (!fileExists) {
      this.db.serialize(() => this.__createTables());
    }
  }

  private __createTables(): void {
    const createAccounts = `
      CREATE TABLE IF NOT EXISTS accounts (
        uid    TEXT PRIMARY KEY,
        email  TEXT
      );`;

    const createCharacters = `
      CREATE TABLE IF NOT EXISTS characters (
        id     INTEGER PRIMARY KEY AUTOINCREMENT,
        uid    TEXT NOT NULL,
        name   TEXT NOT NULL,
        sex    TEXT NOT NULL,
        role   INTEGER NOT NULL,
        data   JSON NOT NULL,
        FOREIGN KEY(uid) REFERENCES accounts(uid)
      );`;

    this.db.run(createAccounts, err => {
      if (err) console.error("Error creating accounts table:", err.message);
      else console.log("Accounts table ready.");
    });

    this.db.run(createCharacters, err => {
      if (err) console.error("Error creating characters table:", err.message);
      else console.log("Characters table ready.");
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
    console.log("Database connection closed.");
  }

  // -------------------------------
  // Accounts
  // -------------------------------

  public getAccountByUid(
    uid: string,
    callback: (error: Error | null, row: { uid: string; email: string | null } | null) => void
  ): void {
    this.db.get("SELECT uid, email FROM accounts WHERE uid = ?", [uid], callback as any);
  }

  public createAccountForUid(
    uid: string,
    email: string | null,
    callback: (errorCode: number | null) => void
  ): void {
    const values = [uid, email];
    this.db.run("INSERT INTO accounts(uid, email) VALUES(?, ?)", values, err => {
      if (err) {
        console.error("Error inserting account:", err.message);
        return callback(500);
      }
      callback(null);
    });
  }

  // -------------------------------
  // Characters
  // -------------------------------

  public createCharacterForUid(
    uid: string,
    name: string,
    sex: "male" | "female",
    role: number,
    callback: (errorCode: number | null, characterId?: number) => void
  ): void {
    let characterData: string;

    try {
      characterData = this.characterCreator.create(name, sex, role);
    } catch (e) {
      console.error("Character creation failed:", e);
      return callback(500);
    }

    const values = [uid, name, sex, role, characterData];

    this.db.run(
      "INSERT INTO characters(uid, name, sex, role, data) VALUES(?, ?, ?, ?, ?)",
      values,
      function (err) {
        if (err) {
          console.error("Failed to insert character:", err.message);
          return callback(500);
        }
        callback(null, this.lastID); // 👈 Send the characterId
      }
    );
  }

  public getCharactersForUid(
    uid: string,
    callback: (error: Error | null, characters: { id: number; name: string; sex: string; role: number }[]) => void
  ): void {
    this.db.all(
      "SELECT id, name, sex, role FROM characters WHERE uid = ?",
      [uid],
      (err, rows) => {
        if (err) return callback(err, []);
        callback(null, rows as { id: number; name: string; sex: string; role: number }[]);
      }
    );
  }

  public getCharacterById(
    id: number,
    callback: (error: Error | null, character: { id: number; uid: string; name: string; sex: string; role: number; data: string } | null) => void
  ): void {
    this.db.get(
      "SELECT id, uid, name, sex, role, data FROM characters WHERE id = ?",
      [id],
      (err, row) => {
        if (err) return callback(err, null);
        if (!row) return callback(null, null);
        callback(null, row as { id: number; uid: string; name: string; sex: string; role: number; data: string });
      }
    );
  }

  public updateCharacterData(
    characterId: number,
    characterData: string,
    callback: (error: Error | null) => void
  ): void {
    this.db.run(
      "UPDATE characters SET data = ? WHERE id = ?",
      [characterData, characterId],
      callback
    );
  }


}
