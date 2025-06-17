
import Creature from "./Ccreature";
import Corpse from "./Ccorpse";
import { CONST, getGameServer } from "./helper/appContext";
import { EmotePacket } from "./Cprotocol";
import DamageMap from "./Cdamage-map";
import LootHandler from "./Cmonster-loot-handler";
import MonsterBehaviour from "./Cmonster-behaviour";
import { IMonster, IMonsterBehaviour } from "interfaces/IMonster";
import { IDamageMap } from "interfaces/IDamage-map";
import { ILootHandler } from "interfaces/IMonster-loot-handler";
import ICorpse from "interfaces/ICorpse";

class Monster extends Creature implements IMonster{
  public cid: number;
  public corpse: number;
  public fluidType: number;
  public experience: number;
  public damageMap: IDamageMap;
  public lootHandler: ILootHandler;
  public behaviourHandler: IMonsterBehaviour;

  constructor(cid: number, data: any) {
    super(data.creatureStatistics);
    this.cid = cid;
    this.corpse = data.corpse;
    this.fluidType = CONST.COLOR.RED;
    this.experience = data.experience;
    this.damageMap = new DamageMap(this);
    this.lootHandler = new LootHandler(data.loot);
    this.behaviourHandler = new MonsterBehaviour(this, data.behaviour);
  }

  public setTarget(target: any): void {
    this.behaviourHandler.setTarget(target);
  }

  public cleanup(): void {
    this.setTarget(null);
  }

  public isTileOccupied(tile: any): boolean {
    if (!tile) return true;

    if (tile.isBlockSolid() || tile.isProtectionZone()) return true;

    if (tile.itemStack?.isBlockSolid(this.behaviourHandler.openDoors)) return true;

    if (tile.isOccupiedCharacters()) return true;

    return false;
  }

  public createCorpse(): ICorpse | null {
    const thing = getGameServer().database.createThing(this.corpse);

    this.damageMap.distributeExperience();

    if (thing instanceof Corpse) {
      this.lootHandler.addLoot(thing);
    }

    return thing as Corpse | null;
  }

  public getPrototype(): any {
    return getGameServer().database.getMonster(this.cid.toString());
  }

  public getTarget(): any {
    return this.behaviourHandler.getTarget();
  }

  public push(position: any): void {
    // TODO: Revisit this isMoving()
    // if (this.isMoving() || !position.besides(this.position)) {
    //   return;
    // }

    const tile = getGameServer().world.getTileFromWorldPosition(position);
    if (!tile || tile.id === 0) {
      return;
    }

    const lockDuration = this.getStepDuration(tile.getFriction());
    const slowness = this.position.isDiagonal(position) ? 2 * lockDuration : lockDuration;

    getGameServer().world.creatureHandler.moveCreature(this, position);

    this.behaviourHandler.actions.lock(this.behaviourHandler.handleActionMove, slowness);
  }

  public hasTarget(): boolean {
    return this.behaviourHandler.hasTarget();
  }

  public think(): void {
    this.behaviourHandler.actions.handleActions(this.behaviourHandler);
  }

  public isDistanceWeaponEquipped(): boolean {
    return false;
  }

  public decreaseHealth(source: any, amount: number): void {
    amount = Math.max(0, Math.min(amount, this.getProperty(CONST.PROPERTIES.HEALTH)));

    this.damageMap.update(source, amount);
    this.incrementProperty(CONST.PROPERTIES.HEALTH, -amount);

    this.behaviourHandler.handleDamage(source);
    this.broadcast(new EmotePacket(this, String(amount), this.fluidType));

    if (this.isZeroHealth()) {
      getGameServer().world.creatureHandler.dieCreature(this);
    }
  }

  // TODO: 
  // public handleSpellAction(): void {
  //   if (!this.behaviourHandler.hasTarget()) return;

  //   this.lockAction(this.handleSpellAction, 1000);

  //   if (!this.isInLineOfSight(this.behaviourHandler.target)) return;

  //   this.spellActions.forEach((spell: any) => {
  //     if (Math.random() > spell.chance) return;

  //     const cast = getGameServer().database.getSpell(spell.id);
  //     if (cast.call(this, spell)) {
  //       this.spellActions.lock(spell, spell.cooldown);
  //     }
  //   });
  // }

  // private __addSpells(spells: any[]): void {
  //   spells.forEach((spell) => this.spellActions.add(spell));
  // }
}

export default Monster;
