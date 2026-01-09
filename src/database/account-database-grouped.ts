import sqlite3 from "sqlite3";
import { CharacterCreator } from "../creature/player/character-creator";

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
  friends: string;         // JSON: {friends: [], requests: []}
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
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    callback: (error: Error | null, characters: { id: number; name: string; sex: string; role: number; level: number; outfit: any }[]) => void
  ): void {
    this.db.all(
      "SELECT id, name, sex, role, properties, outfit FROM characters WHERE uid = ?",
      [uid],
      (err, rows) => {
        if (err) return callback(err, []);
        
        const characters = (rows as any[]).map(row => {
          // Parse properties JSON to get level
          const properties = this.parseJSON(row.properties, { level: 1, experience: 0 });
          const level = properties.level || 1;
          
          // Parse outfit JSON
          const outfit = this.parseJSON(row.outfit, {});
          
          return {
            id: row.id,
            name: row.name,
            sex: row.sex,
            role: row.role,
            level: level,
            outfit: outfit
          };
        });
        
        callback(null, characters);
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

  public getCharacterByIdForUser(
    id: number,
    uid: string,
    callback: (error: Error | null, character: CharacterData | null) => void
  ): void {
    this.db.get(
      `SELECT 
        id, uid, name, sex, role, last_visit,
        position, temple_position, properties, outfit, skills,
        containers, friends, spellbook
      FROM characters WHERE id = ? AND uid = ?`,
      [id, uid],
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
    
    // Extract outfit data (check both new format and legacy format)
    const outfit = data.outfit || data.properties?.outfit || {};
    
    // Move outfit-related data from properties to outfit column
    if (data.properties?.availableHairs) {
      outfit.availableHairs = data.properties.availableHairs;
    }
    if (data.properties?.availableOutfits) {
      outfit.availableOutfits = data.properties.availableOutfits;
    }
    if (data.properties?.availableMounts) {
      outfit.availableMounts = data.properties.availableMounts;
    }
    
    // Now remove outfit-related data from properties
    delete properties.outfit;
    delete properties.availableOutfits;
    delete properties.availableMounts;
    delete properties.availableHairs; // availableHairs belongs in outfit column
    delete properties.name; // name comes from database column
    delete properties.role; // role comes from database column
    delete properties.sex; // sex comes from database column
    
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
      JSON.stringify(data.friends || { friends: [], requests: [] }),
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
    const friendsData = this.parseJSON(data.friends, { friends: [], requests: [] });
    const spellbook = this.parseJSON(data.spellbook, { availableSpells: [], cooldowns: [] });
    
    const cleanProperties = { ...properties };

    // Migrate equipment array to have 15 slots if needed
    const migratedContainers = this.migrateEquipmentSlots(containers);

    return {
      position: this.parseJSON(data.position, { x: 10, y: 10, z: 9 }),
      templePosition: this.parseJSON(data.templePosition, { x: 10, y: 10, z: 9 }),
      lastVisit: data.lastVisit || Date.now(),
      properties: {
        ...cleanProperties,
        name: data.name,
        sex: data.sex, // Add sex from database column
        role: data.role, // Add role from database column
        availableHairs: (outfit as any).availableHairs || [0, 904, 905], // Read from outfit column
        availableOutfits: (outfit as any).availableOutfits || [128, 129, 130, 131], 
        availableMounts: (outfit as any).availableMounts || [], 
        outfit: outfit 
      },
      skills,
      outfit,
      containers: migratedContainers,
      friends: friendsData.friends || [],
      friendRequests: friendsData.requests || [],
      spellbook
    };
  }

  // Migrate equipment array to ensure it has 15 slots (0-14)
  private migrateEquipmentSlots(containers: any): any {
    if (!containers || !Array.isArray(containers.equipment)) {
      return containers;
    }

    const equipment = containers.equipment;
    const expectedSlots = 15; // 0-14

    if (equipment.length < expectedSlots) {
      // Extend the array with null values to reach 15 slots
      const extendedEquipment = [...equipment];
      while (extendedEquipment.length < expectedSlots) {
        extendedEquipment.push(null);
      }
      
      return {
        ...containers,
        equipment: extendedEquipment
      };
    }

    return containers;
  }

  private parseJSON<T>(jsonString: string | null | undefined, defaultValue: T): T {
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

  // Friend request management methods
  public getCharacterByName(name: string, callback: (error: Error | null, character: CharacterData | null) => void): void {
    this.db.get(
      `SELECT 
        id, uid, name, sex, role, last_visit,
        position, temple_position, properties, outfit, skills,
        containers, friends, spellbook
      FROM characters WHERE name = ?`,
      [name],
      (err, row) => {
        if (err) return callback(err, null);
        if (!row) return callback(null, null);
        callback(null, row as CharacterData);
      }
    );
  }

  public addFriendRequest(targetName: string, requesterName: string, callback: (error: Error | null) => void): void {
    this.db.get(
      `SELECT friends FROM characters WHERE name = ?`,
      [targetName],
      (err, row) => {
        if (err) return callback(err);
        if (!row) return callback(new Error('Character not found'));

        // @ts-ignore
        const friendsData = this.parseJSON(row.friends, { friends: [], requests: [] });
        
        // Check if request already exists
        // @ts-ignore
        if (friendsData.requests.includes(requesterName)) {
          return callback(new Error('Friend request already exists'));
        }

        // Add the request
        // @ts-ignore
        friendsData.requests.push(requesterName);

        this.db.run(
          `UPDATE characters SET friends = ? WHERE name = ?`,
          [JSON.stringify(friendsData), targetName],
          callback
        );
      }
    );
  }

  public removeFriendRequest(targetName: string, requesterName: string, callback: (error: Error | null) => void): void {
    this.db.get(
      `SELECT friends FROM characters WHERE name = ?`,
      [targetName],
      (err, row) => {
        if (err) return callback(err);
        if (!row) return callback(new Error('Character not found'));

        // @ts-ignore
        const friendsData = this.parseJSON(row.friends, { friends: [], requests: [] });
        
        // @ts-ignore
        const index = friendsData.requests.indexOf(requesterName);
        
        if (index === -1) {
          return callback(new Error('Friend request not found'));
        }

        // Remove the request
        friendsData.requests.splice(index, 1);

        this.db.run(
          `UPDATE characters SET friends = ? WHERE name = ?`,
          [JSON.stringify(friendsData), targetName],
          callback
        );
      }
    );
  }

  public addFriendToBothPlayers(player1Name: string, player2Name: string, callback: (error: Error | null) => void): void {
    // Add player2 to player1's friends list
    this.db.get(
      `SELECT friends FROM characters WHERE name = ?`,
      [player1Name],
      (err, row) => {
        if (err) return callback(err);
        if (!row) return callback(new Error('Player 1 not found'));

        // @ts-ignore
        const friendsData = this.parseJSON(row.friends, { friends: [], requests: [] });
        
        // Ensure friends array exists
        if (!friendsData.friends) {
          friendsData.friends = [];
        }
        
        // @ts-ignore
        if (!friendsData.friends.includes(player2Name)) {
          // @ts-ignore
          friendsData.friends.push(player2Name);
        }

        this.db.run(
          `UPDATE characters SET friends = ? WHERE name = ?`,
          [JSON.stringify(friendsData), player1Name],
          (err) => {
            if (err) return callback(err);

            // Add player1 to player2's friends list
            this.db.get(
              `SELECT friends FROM characters WHERE name = ?`,
              [player2Name],
              (err, row) => {
                if (err) return callback(err);
                if (!row) return callback(new Error('Player 2 not found'));

                // @ts-ignore
                const friendsData2 = this.parseJSON(row.friends, { friends: [], requests: [] });
                
                // Ensure friends array exists
                if (!friendsData2.friends) {
                  friendsData2.friends = [];
                }
                
                // @ts-ignore
                if (!friendsData2.friends.includes(player1Name)) {
                  // @ts-ignore
                  friendsData2.friends.push(player1Name);
                }

                this.db.run(
                  `UPDATE characters SET friends = ? WHERE name = ?`,
                  [JSON.stringify(friendsData2), player2Name],
                  callback
                );
              }
            );
          }
        );
      }
    );
  }

  public removeFriendFromBothPlayers(player1Name: string, player2Name: string, callback: (error: Error | null) => void): void {
    // Remove player2 from player1's friends list
    this.db.get(
      `SELECT friends FROM characters WHERE name = ?`,
      [player1Name],
      (err, row) => {
        if (err) return callback(err);
        if (!row) return callback(new Error('Player 1 not found'));

        // @ts-ignore
        const friendsData = this.parseJSON(row.friends, { friends: [], requests: [] });
        
        // Ensure friends array exists
        if (!friendsData.friends) {
          friendsData.friends = [];
        }
        
        // @ts-ignore
        const index = friendsData.friends.indexOf(player2Name);
        if (index !== -1) {
          // @ts-ignore
          friendsData.friends.splice(index, 1);
        }

        this.db.run(
          `UPDATE characters SET friends = ? WHERE name = ?`,
          [JSON.stringify(friendsData), player1Name],
          (err) => {
            if (err) return callback(err);

            // Remove player1 from player2's friends list
            this.db.get(
              `SELECT friends FROM characters WHERE name = ?`,
              [player2Name],
              (err, row) => {
                if (err) return callback(err);
                if (!row) return callback(new Error('Player 2 not found'));

                // @ts-ignore
                const friendsData2 = this.parseJSON(row.friends, { friends: [], requests: [] });
                
                // Ensure friends array exists
                if (!friendsData2.friends) {
                  friendsData2.friends = [];
                }
                
                // @ts-ignore
                const index2 = friendsData2.friends.indexOf(player1Name);
                if (index2 !== -1) {
                  // @ts-ignore
                  friendsData2.friends.splice(index2, 1);
                }

                this.db.run(
                  `UPDATE characters SET friends = ? WHERE name = ?`,
                  [JSON.stringify(friendsData2), player2Name],
                  callback
                );
              }
            );
          }
        );
      }
    );
  }

  close(): void {
    if (!this.db) {
      return; 
    }
    
    try {
      this.db.close();
    } catch (error: any) {
      if (error.code !== 'SQLITE_MISUSE' && error.message !== 'Database is closed') {
        console.error('Error closing database:', error);
      }
    }
  }
}
