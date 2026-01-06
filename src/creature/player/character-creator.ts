import { Position } from "../../utils/position";
import { CONST } from "../../helper/appContext";
import Outfit from "../../game-object/player/outfit";

export class CharacterCreator {
  private blueprint: {
    position: Position;
    templePosition: Position;
    properties: {
      vocation: number;
      role: number;
      sex: number;
      capacity: number;
      maxCapacity: number;
      availableHairs: number[];
      name: string;
      attack: number;
      attackSpeed: number;
      defense: number;
      direction: number;
      health: number;
      maxHealth: number;
      mana: number;
      maxMana: number;
      energy: number;
      maxEnergy: number;
      level: number;
      experience: number;
      outfit: Outfit;
      speed: number;
    };
    skills: {
      experience: number;
      magic: number;
      fist: number;
      club: number;
      sword: number;
      axe: number;
      distance: number;
      shielding: number;
      fishing: number;
    };
    spellbook: {
      availableSpells: string[];
      cooldowns: string[];
    };
    containers: {
      keyring: number[];
      depot: number[];
      inbox: number[];
      equipment: { slot: number; item: { id: number } }[];
    };
    friends: any[];
  };

  constructor() {
    /*
     * Class CharacterCreator
     * Handler for the creation of new characters
     */

    this.blueprint = {
      position: new Position(10, 10, 9),
      templePosition: new Position(10, 10, 9),
      properties: {
        vocation: CONST.VOCATION.NONE,
        role: CONST.ROLES.NONE,
        sex: CONST.SEX.MALE,
        capacity: 100000,
        maxCapacity: 100000,
        availableHairs: [0, 904, 905], 
        name: "Unknown",
        attack: 4,
        attackSpeed: 20,
        defense: 2,
        direction: CONST.DIRECTION.NORTH,
        health: 150,
        maxHealth: 150,
        mana: 35,
        maxMana: 35,
        energy: 35,
        maxEnergy: 35,
        level: 1,
        experience: 0,
        outfit: new Outfit({
          id: 0,
          details: {
            head: 78,
            body: 69,
            legs: 58,
            feet: 76,
          },
        }),
        speed: 1020,
      },
      skills: {
        experience: 0,
        magic: 0,
        fist: 10,
        club: 10,
        sword: 10,
        axe: 10,
        distance: 10,
        shielding: 10,
        fishing: 10,
      },
      spellbook: {
        availableSpells: [],
        cooldowns: [],
      },
      containers: {
        keyring: [],
        depot: [],
        inbox: [],
        equipment: [],
      },
      friends: [],
    };
  }

  public create(name: string, sex: "male" | "female", role: number): string {
    /*
     * CharacterCreator.create
     * Creates a new character with the given properties
     */

    // Memory copy of the template
    const copiedTemplate = JSON.parse(JSON.stringify(this.blueprint));

    // Replace the character name
    copiedTemplate.properties.name = name;
    // Replace the character role
    copiedTemplate.properties.role = role;
    

    // And sex-specific attributes
    if (sex === "male") {
      copiedTemplate.properties.sex = CONST.SEX.MALE;
      copiedTemplate.properties.outfit.id = CONST.LOOKTYPES.MALE.CITIZEN;
      copiedTemplate.properties.availableOutfits = [
        CONST.LOOKTYPES.MALE.CITIZEN,
        CONST.LOOKTYPES.MALE.HUNTER,
        CONST.LOOKTYPES.MALE.MAGE,
        CONST.LOOKTYPES.MALE.KNIGHT,
      ];
    } else if (sex === "female") {
      copiedTemplate.properties.sex = CONST.SEX.FEMALE;
      copiedTemplate.properties.outfit.id = CONST.LOOKTYPES.FEMALE.CITIZEN;
      copiedTemplate.properties.availableOutfits = [
        CONST.LOOKTYPES.FEMALE.CITIZEN,
        CONST.LOOKTYPES.FEMALE.HUNTER,
        CONST.LOOKTYPES.FEMALE.MAGE,
        CONST.LOOKTYPES.FEMALE.KNIGHT,
      ];
    }

    // Return the template as a string to write it to the filesystem
    return JSON.stringify(copiedTemplate);
  }
}
