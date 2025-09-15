import sqlite3 from "sqlite3";
import { CharacterCreator } from "./Ccharacter-creator";

export interface CharacterData {
  id: number;
  uid: string;
  name: string;
  sex: string;
  role: number;
  lastVisit: number;
  
  // Grouped JSON columns
  position: string;        // JSON: {x, y, z}
  templePosition: string;  // JSON: {x, y, z}
  properties: string;      // JSON: all player properties
  outfit: string;          // JSON: outfit data
  skills: string;          // JSON: all skills
  containers: string;      // JSON: containers data
  friends: string;         // JSON: friends array
  spellbook: string;       // JSON: spellbook data
}

export class AccountDatabaseGrouped {
  private filepath: string;
  private db: sqlite3.Database;
  private characterCreator: CharacterCreator;

  constructor(filepath: string) {
    this.filepath = filepath;
    this.characterCreator = new CharacterCreator();
    this.db = new sqlite3.Database(this.filepath);
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
    this.db.run("INSERT INTO accounts(uid, email) VALUES(?, ?)", [uid, email], err => {
      if (err) {
        console.error("Failed to create account:", err.message);
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
    // Create character data using the character creator
    const characterData = this.characterCreator.create(name, sex, role);
    const parsedData = JSON.parse(characterData);

    // Insert with grouped JSON schema
    const insertSQL = `
      INSERT INTO characters(
        uid, name, sex, role, last_visit,
        position, temple_position, properties, outfit, skills,
        containers, friends, spellbook
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      uid, name, sex, role, Date.now(),
      JSON.stringify(parsedData.position),
      JSON.stringify(parsedData.templePosition),
      JSON.stringify(parsedData.properties),
      JSON.stringify(parsedData.properties.outfit),
      JSON.stringify(parsedData.skills),
      JSON.stringify(parsedData.containers || { depot: [], equipment: [], inbox: [], keyring: [] }),
      JSON.stringify(parsedData.friends || []),
      JSON.stringify(parsedData.spellbook || { availableSpells: [], cooldowns: [] })
    ];

    this.db.run(insertSQL, params, function (err) {
      if (err) {
        console.error("Failed to insert character:", err.message);
        return callback(500);
      }
      callback(null, this.lastID);
    });
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
    callback: (error: Error | null, character: CharacterData | null) => void
  ): void {
    this.db.get(
      `SELECT 
        id, uid, name, sex, role, last_visit,
        position, temple_position, properties, outfit, skills,
        containers, friends, spellbook
      FROM characters WHERE id = ?`,
      [id],
      (err, row) => {
        if (err) return callback(err, null);
        if (!row) return callback(null, null);
        callback(null, row as CharacterData);
      }
    );
  }

  public updateCharacterData(
    characterId: number,
    characterData: any,
    callback: (error: Error | null) => void
  ): void {
    // Handle both string (from JSON.stringify) and object inputs
    let data;
    if (typeof characterData === 'string') {
      try {
        data = JSON.parse(characterData);
      } catch (error) {
        return callback(new Error('Invalid JSON data'));
      }
    } else {
      data = characterData;
    }

    // Extract grouped data from character object
    const position = data.position || { x: 10, y: 10, z: 9 };
    const templePosition = data.templePosition || { x: 10, y: 10, z: 9 };
    
    // Clean properties - remove outfit-related data that belongs in outfit column
    const properties = { ...data.properties };
    delete properties.outfit;
    delete properties.availableOutfits;
    delete properties.availableMounts;
    delete properties.name; // name comes from database column
    delete properties.role; // role comes from database column
    delete properties.sex; // sex comes from database column
    
    // Extract outfit data (check both new format and legacy format)
    const outfit = data.outfit || data.properties?.outfit || {};
    const skills = data.skills || {};

    const updateSQL = `
      UPDATE characters SET 
        last_visit = ?,
        position = ?, temple_position = ?, properties = ?, outfit = ?, skills = ?,
        containers = ?, friends = ?, spellbook = ?
      WHERE id = ?
    `;

    const params = [
      data.lastVisit || Date.now(),
      JSON.stringify(position),
      JSON.stringify(templePosition),
      JSON.stringify(properties),
      JSON.stringify(outfit),
      JSON.stringify(skills),
      JSON.stringify(data.containers || { depot: [], equipment: [], inbox: [], keyring: [] }),
      JSON.stringify(data.friends || []),
      JSON.stringify(data.spellbook || { availableSpells: [], cooldowns: [] }),
      characterId
    ];

    this.db.run(updateSQL, params, callback);
  }

  // Convert CharacterData to legacy format for compatibility
  public characterDataToLegacyFormat(data: CharacterData): any {
    const properties = this.parseJSON(data.properties, {});
    const skills = this.parseJSON(data.skills, {});
    const outfit = this.parseJSON(data.outfit, {});
    const containers = this.parseJSON(data.containers, { depot: [], equipment: [], inbox: [], keyring: [] });
    const friends = this.parseJSON(data.friends, []);
    const spellbook = this.parseJSON(data.spellbook, { availableSpells: [], cooldowns: [] });
    
    const cleanProperties = { ...properties };

    return {
      position: this.parseJSON(data.position, { x: 10, y: 10, z: 9 }),
      templePosition: this.parseJSON(data.templePosition, { x: 10, y: 10, z: 9 }),
      lastVisit: data.lastVisit || Date.now(),
      properties: {
        ...cleanProperties,
        name: data.name, 
        availableOutfits: outfit.availableOutfits, 
        availableMounts: outfit.availableMounts , 
        outfit: outfit 
      },
      skills,
      outfit,
      containers,
      friends,
      spellbook
    };
  }

  private parseJSON(jsonString: string | null | undefined, defaultValue: any): any {
    if (!jsonString || jsonString === 'undefined' || jsonString === 'null') {
      return defaultValue;
    }
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('Failed to parse JSON:', jsonString, 'using default value');
      return defaultValue;
    }
  }

  close(): void {
    this.db.close();
  }
}
