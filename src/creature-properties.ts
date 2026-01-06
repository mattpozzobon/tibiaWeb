import { EquipmentDetails, Outfit } from "./outfit";
import { Property } from "./property";
import { CreaturePropertyPacket, OutfitPacket } from "./protocol";
import { CONFIG, CONST, getGameServer } from "./helper/appContext";

export class CreatureProperties {
  private __creature: any;
  private __guid: number;
  private __properties: Map<string, Property<any>>;

  constructor(creature: any, properties: any) {
    this.__creature = creature;

    this.__guid = getGameServer().world.creatureHandler.assignUID();
    this.__properties = new Map<string, Property<any>>();

    // Add shared properties
    this.add(CONST.PROPERTIES.NAME, properties.name);
    this.add(CONST.PROPERTIES.SPEED, properties.speed);
    this.add(CONST.PROPERTIES.DEFENSE, properties.defense);
    this.add(CONST.PROPERTIES.ATTACK, properties.attack);
    this.add(CONST.PROPERTIES.ATTACK_SPEED, properties.attackSpeed);
    this.add(CONST.PROPERTIES.DIRECTION, properties.direction ?? CONST.DIRECTION.NORTH);
    this.add(CONST.PROPERTIES.HEALTH, properties.health);
    this.add(CONST.PROPERTIES.HEALTH_MAX, properties.health);
    // this.add(CONST.PROPERTIES.MANA, properties.mana);
    // this.add(CONST.PROPERTIES.MANA_MAX, properties.maxMana);
    this.add(CONST.PROPERTIES.OUTFIT, new Outfit(properties.outfit));
    // this.add(CONST.PROPERTIES.ENERGY, properties.energy);
    // this.add(CONST.PROPERTIES.ENERGY_MAX, properties.maxEnergy);
    // this.add(CONST.PROPERTIES.CAPACITY, properties.capacity);
    // this.add(CONST.PROPERTIES.CAPACITY_MAX, properties.maxCapacity);
  }

  getId(): number {
    /*
     * Returns the unique identifier of the creature
     */
    return this.__guid;
  }

  updateOutfitEquipment(slot: keyof EquipmentDetails, value: number): void {
    /*
     * Function CreatureProperties.updateOutfitEquipment
     * Updates only a single piece of equipment in the outfit (helmet, armor, legs, boots)
     */
  
    // Retrieve the current outfit
    const currentOutfit = this.getProperty(CONST.PROPERTIES.OUTFIT);
  
    if (!currentOutfit) {
      console.warn("Attempted to update outfit, but no outfit is set.");
      return;
    }
  
    // Create a copy of the outfit to avoid modifying the reference directly
    const newOutfit = currentOutfit.copy();
  
    // Ensure equipment exists
    if (!newOutfit.equipment) {
      newOutfit.equipment = { hair: 904, head: 0, body: 0, legs: 0, feet: 0, lefthand: 0, righthand: 0, backpack: 0, belt: 0 };
    }
  
    // Update the specific equipment slot
    newOutfit.equipment[slot] = value;
  
    // Apply the new outfit
    this.setProperty(CONST.PROPERTIES.OUTFIT, newOutfit);
  }

  updateOutfitAddon(addonType: 'healthPotion' | 'manaPotion' | 'energyPotion' | 'bag', value: number): void {
    const currentOutfit = this.getProperty(CONST.PROPERTIES.OUTFIT);
    const newOutfit = currentOutfit.copy();
  
  
    // Update the specific addon
    newOutfit.addons[addonType] = value;
  
    // Apply the new outfit
    this.setProperty(CONST.PROPERTIES.OUTFIT, newOutfit);
    
    console.log(`Outfit addon ${addonType} set to: ${value}`);
  }

  incrementProperty(type: number, amount: number): void {
    /*
     * Adds an amount to the property
     */
    const value = this.getProperty(type);

    if (value === null) {
      console.warn(`Property of unknown type ${type} with value ${value}.`);
      return;
    }

    this.setProperty(type, value + amount);
  }

  setProperty(type: number, value: any): void {
    /*
     * Sets the property of a creature
     */
    const property = this.getProperty(type);

    if (property === null) {
      console.warn(`Property of unknown type ${type} with value ${value}.`);
      return;
    }

    // Unchanged or invalid value
    if (property === value || value < 0) return;

    if (type === CONST.PROPERTIES.MANA) {
      value = Math.max(0, Math.min(value, this.getProperty(CONST.PROPERTIES.MANA_MAX)));
    } else if (type === CONST.PROPERTIES.HEALTH) {
      value = Math.max(0, Math.min(value, this.getProperty(CONST.PROPERTIES.HEALTH_MAX)));
    }

    this.__properties.get(type.toString())?.set(value);

    if (type === CONST.PROPERTIES.HEALTH_MAX) {
      this.setProperty(CONST.PROPERTIES.HEALTH, this.getProperty(CONST.PROPERTIES.HEALTH));
    } else if (type === CONST.PROPERTIES.MANA_MAX) {
      this.setProperty(CONST.PROPERTIES.MANA, this.getProperty(CONST.PROPERTIES.MANA));
    }

    const packet = this.__getCreaturePropertyPacket(type, value);

    if (type > 12 && type <= 26) {
      this.__creature.write(packet);
    } else {
      this.__creature.broadcast(packet);
    }
  }

  private __getCreaturePropertyPacket(type: number, value: any): any {
    /*
     * Returns the packet to write
     */
    switch (type) {
      case CONST.PROPERTIES.NAME:
        return null;
      case CONST.PROPERTIES.OUTFIT:
        return new OutfitPacket(this.getId(), value);
      case CONST.PROPERTIES.HEALTH:
      case CONST.PROPERTIES.HEALTH_MAX:
      case CONST.PROPERTIES.MANA:
      case CONST.PROPERTIES.MANA_MAX:
      case CONST.PROPERTIES.ENERGY:
      case CONST.PROPERTIES.ENERGY_MAX:
      case CONST.PROPERTIES.SPEED:
      case CONST.PROPERTIES.DEFENSE:
      case CONST.PROPERTIES.ATTACK:
      case CONST.PROPERTIES.ATTACK_SPEED:
      case CONST.PROPERTIES.DIRECTION:
      case CONST.PROPERTIES.CAPACITY:
      case CONST.PROPERTIES.CAPACITY_MAX:
      case CONST.PROPERTIES.SEX:
      case CONST.PROPERTIES.ROLE:
      case CONST.PROPERTIES.VOCATION:
        return new CreaturePropertyPacket(this.getId(), type, value);
      default:
        return null;
    }
  }

  has(type: number): boolean {
    /*
     * Function CreatureProperties.has
     * Returns true if the creature has a property
     */
    return this.__properties.has(type.toString());
  }

  add(type: number, value: any): void {
    /*
     * Function CreatureProperties.add
     * Adds a skill to the map of skills
     */
  
    // Add it to the map
    this.__properties.set(type.toString(), new Property(value));
  }

  toJSON(): Record<string, any> {
    /*
     * Serializes the class to JSON
     */
    return {
      name: this.__properties.get(CONST.PROPERTIES.NAME.toString())?.get(),
      health: this.__properties.get(CONST.PROPERTIES.HEALTH.toString())?.get(),
      maxHealth: this.__properties.get(CONST.PROPERTIES.HEALTH_MAX.toString())?.get(),
      mana: this.__properties.get(CONST.PROPERTIES.MANA.toString())?.get(),
      maxMana: this.__properties.get(CONST.PROPERTIES.MANA_MAX.toString())?.get(),
      energy: this.__properties.get(CONST.PROPERTIES.ENERGY.toString())?.get(),
      maxEnergy: this.__properties.get(CONST.PROPERTIES.ENERGY_MAX.toString())?.get(),
      capacity: this.__properties.get(CONST.PROPERTIES.CAPACITY.toString())?.get(),
      maxCapacity: this.__properties.get(CONST.PROPERTIES.CAPACITY_MAX.toString())?.get(),
      speed: this.__properties.get(CONST.PROPERTIES.SPEED.toString())?.get(),
      defense: this.__properties.get(CONST.PROPERTIES.DEFENSE.toString())?.get(),
      attack: this.__properties.get(CONST.PROPERTIES.ATTACK.toString())?.get(),
      attackSpeed: this.__properties.get(CONST.PROPERTIES.ATTACK_SPEED.toString())?.get(),
      direction: this.__properties.get(CONST.PROPERTIES.DIRECTION.toString())?.get(),
      outfit: this.__properties.get(CONST.PROPERTIES.OUTFIT.toString())?.get(),
      role: this.__properties.get(CONST.PROPERTIES.ROLE.toString())?.get(),
      vocation: this.__properties.get(CONST.PROPERTIES.VOCATION.toString())?.get(),
      sex: this.__properties.get(CONST.PROPERTIES.SEX.toString())?.get(),

      availableHairs: this.__properties.get(CONST.PROPERTIES.HAIRS.toString())?.get(),
    };
  }
  

  getProperty(type: number): any {
    /*
     * Function CreatureProperties.getProperty
     * Returns a property of a particular type
     */
    const property = this.__properties.get(type.toString());
    return property ? property.get() : null;
  }

  getStepDuration(friction: number): number {
    const A = 857.36;
    const B = 261.29;
    const C = -4795.009;

    const speed = this.getProperty(CONST.PROPERTIES.SPEED);
    const calculatedStepSpeed = Math.max(1, Math.round(A * Math.log(speed + B) + C));

    return Math.ceil((1000 * friction) / calculatedStepSpeed / CONFIG.SERVER.MS_TICK_INTERVAL);
  }
}
