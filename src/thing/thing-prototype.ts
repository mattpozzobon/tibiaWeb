"use strict";

import {  OTBBitFlag, TileFlag } from "../utils/bitflag";
import { EventEmitter } from "../event/eventemitter";

interface ThingPrototypeData {
  id: number;
  flags: number;
  group: number;
  properties: Record<string, any>;
}

class ThingPrototype extends EventEmitter {
  id: number;
  flags: InstanceType<typeof TileFlag>;
  group: number;
  properties: Record<string, any>;

  constructor(data: ThingPrototypeData) {
    /*
     * Class ThingPrototype
     * Container for a thing prototype that contains the data definition of every thing in the world
     */
    super();
    this.id = data.id;
    if (!data.flags === undefined || data.flags === null) {
      console.log('data.flags bag', data);
    }

    this.flags = new OTBBitFlag(data.flags);
    this.group = data.group;
    this.properties = data.properties;
  }

  isStackable(): boolean {
    /*
     * Function ThingPrototype.isStackable
     * Returns TRUE when the item is moveable
     */
    return this.flags.get(OTBBitFlag.prototype.flags.FLAG_STACKABLE);
  }
  
  hasContent(): boolean {
    /*
     * Function ThingPrototype.hasContent
     * Returns true if the thing has content & is readable
     */
    return this.isReadable() || this.isDistanceReadable();
  }

  isWeapon(): boolean {
    /*
     * Function ThingPrototype.isWeapon
     * Returns true if the thing is a weapon
     */
    return this.__has("weaponType");
  }

  isEquipment(): boolean {
    /*
     * Function ThingPrototype.isEquipment
     * Returns true if the thing is something that can be equipped in a slot
     */
    return this.__has("slotType");
  }

  isDoor(): boolean {
    return this.__isType("door");
  }

  isDestroyable(): boolean {
    /*
     * Function ThingPrototype.isDestroyable
     * Returns true if the thing can be destroyed
     */
    return this.__has("destroyTo");
  }

  isRotateable(): boolean {
    /*
     * Function ThingPrototype.isRotateable
     * Returns true if the thing can be rotated
     */
    return this.__has("rotateTo");
  }

  isDistanceReadable(): boolean {
    /*
     * Function ThingPrototype.isDistanceReadable
     * Returns true if the thing is readable from a distance
     */
    return this.flags.get(OTBBitFlag.prototype.flags.FLAG_ALLOWDISTREAD);
  }

  isMailbox(): boolean {
    return this.__isType("mailbox");
  }

  isReadable(): boolean {
    /*
     * Function Thing.isReadable
     * Returns true if the thing is readable (book)
     * Checks both "type": "readable" and "readable": true properties
     */
    if (this.__isType("readable")) {
      return true;
    }
    // Also check for "readable": true property (for items like stamped letter - ID 2598)
    return this.properties && this.properties.readable === true;
  }

  isTeleporter(): boolean {
    /*
     * Function ThingPrototype.isTeleporter
     * Returns true when the type of the thing is a teleporter
     */
    return this.__isType("teleport");
  }

  isDepot(): boolean {
    /*
     * Function ThingPrototype.isDepot
     * Returns true when the type of the thing is a depot
     */
    return this.__isType("depot");
  }

  isField(): boolean {
    return this.__has("field");
  }

  isMagicField(): boolean {
    /*
     * Function ThingPrototype.isMagicField
     * Returns true if the thing is a magic field (e.g., energy, fire, poison)
     */
    return this.__isType("magicfield");
  }

  isTrashholder(): boolean {
    /*
     * Function Thing.isTrashholder
     * Returns true if the thing is a trashholder
     */
    return this.__isType("trashholder");
  }

  isPickupable(): boolean {
    /*
     * Function Thing.isPickupable
     * Returns true if the item is a trashholder
     */
    return this.flags.get(OTBBitFlag.prototype.flags.FLAG_PICKUPABLE);
  }

  isFluidContainer(): boolean {
    /*
     * Function Thing.isFluidContainer
     * Returns true when the type of the thing is a container. This is apparently defined by the group === 12
     */
    return this.group === 0x0C;
  }

  isSplash(): boolean {
    /*
     * Function Thing.isSplash
     * Returns true when the type of the thing is a container. This is apparently defined by the group === 11
     */
    return this.group === 0x0B;
  }

  isContainer(): boolean {
    /*
     * Function Thing.isContainer
     * Returns true when the type of the thing is a container. This is apparently defined by the group === 2
     */
    return this.group === 0x02;
  }

  private __isType(type: string): boolean {
    /*
     * Function Thing.__isType
     * Returns true if thing has a type
     */
    if (!this.properties) {
      return false;
    }
    if (!this.__has(type)) {
      return false;
    }
    return this.properties.type === type;
  }

  private __has(type: string): boolean {
    /*
     * Function ThingPrototype.__has
     * Returns true if the thing prototype has a particular property
     */
    
    return Object.values(this.properties).includes(type) || Object.keys(this.properties).includes(type);
  }
}

export default ThingPrototype;
