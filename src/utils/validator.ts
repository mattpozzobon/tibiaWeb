import { Validator, ValidatorResult } from "jsonschema";
import fs from "fs";
import { getDataFile } from "../helper/appContext";

export class DataValidator {
  private validator: Validator;
  private npcSchema: object;
  private monsterSchema: object;

  constructor() {
    // JSON schema library
    this.validator = new Validator();

    // Load JSON schemas for NPCs and monsters
    this.npcSchema = JSON.parse(fs.readFileSync(getDataFile("npcs", "schema.json"), "utf-8"));
    this.monsterSchema = JSON.parse(fs.readFileSync(getDataFile("monsters", "schema.json"), "utf-8"));
  }

  validateMonster(name: string, monster: object): void {
    /*
     * Function Validator.validateMonster
     * Validates Monster data on load
     */

    console.log('name: ',name);
    console.log('monster: ',monster);
    const validated: ValidatorResult = this.validator.validate(monster, this.monsterSchema);


    if (!validated.valid) {
      const errorMessages = validated.errors.map((error) => error.stack).join("\n");
      console.log(`Schema validation failed for monster "${name}": ${errorMessages}`);
    }
  }

  validateNPC(filename: string, npc: object): void {
    /*
     * Function Validator.validateNPC
     * Validates NPC data on load
     */

    const validated: ValidatorResult = this.validator.validate(npc, this.npcSchema);

    if (!validated.valid) {
      const errorMessages = validated.errors.map((error) => error.stack).join("\n");
      throw new Error(`Schema validation failed for NPC "${filename}": ${errorMessages}`);
    }
  }
}

export default DataValidator;
