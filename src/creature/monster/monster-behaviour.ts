
import Pathfinder from "../../pathfinder/pathfinder";
import Actions from "../../action/actions";
import Player from "../player/player";
import { Position } from "../../utils/position";
import Tile from "../../thing/tile";
import { CONFIG, CONST, getGameServer } from "../../helper/appContext";
import { IMonster, IMonsterBehaviour } from "../../interfaces/IMonster";

class MonsterBehaviour implements IMonsterBehaviour{
  monster: IMonster;
  public actions: Actions;
  private __target: Player | null = null;
  private ignoreCharacters: boolean;
  openDoors: boolean;
  sayings?: { texts: string[]; slowness: number };
  state: number;
  GLOBAL_COOLDOWN: number;

  // Behavior states
  public static readonly NEUTRAL = 0;
  public static readonly FRIENDLY = 1;
  public static readonly HOSTILE = 2;
  public static readonly HOSTILE_ON_ATTACK = 3;
  public static readonly RANGED = 4;
  public static readonly FLEEING = 5;

  constructor(monster: IMonster, behaviour: { openDoors: boolean; type: number; sayings?: { texts: string[]; slowness: number } }) {
    this.monster = monster;
    this.actions = new Actions();
    this.ignoreCharacters = false;
    this.openDoors = behaviour.openDoors;
    this.state = behaviour.type;
    this.setBehaviour(behaviour.type);
    

    if (behaviour.sayings) {
      this.sayings = behaviour.sayings;
      this.actions.add(this.handleActionSpeak.bind(this));
    }
    this.GLOBAL_COOLDOWN = Math.floor(
      CONFIG.WORLD.GLOBAL_COOLDOWN_MS / CONFIG.SERVER.MS_TICK_INTERVAL
    );
  }

  handleActionTarget(): void {
    this.actions.lock(this.handleActionTarget.bind(this), this.GLOBAL_COOLDOWN);

    if (!this.requiresTarget()) return;

    if (!this.hasTarget()) {
      this.__findTarget();
      return;
    }

    const target = this.getTarget();
    if (!target || !this.canSeeTarget() || target.isInvisible() || target.isInProtectionZone()) {
      this.setTarget(null);
    }
  }

  handleActionSpeak(): void {
    if (Math.random() > 0.15 && this.sayings) {
      this.monster.speechHandler.internalCreatureSay(this.sayings.texts[Math.floor(Math.random() * this.sayings.texts.length)], CONST.COLOR.YELLOW);
      this.actions.lock(this.handleActionSpeak.bind(this), 0.1 * (Math.random() * 5 + 1) * this.sayings.slowness);
    }
  }

  isBesidesTarget(): boolean {
    if (this.hasTarget())
      return this.monster.isBesidesThing(this.__target)
    else
      return false;
  }

  handleActionAttack(): void {
    if (!this.hasTarget() || !this.canSeeTarget() || !this.isBesidesTarget()) {
      this.actions.lock(this.handleActionAttack.bind(this), this.GLOBAL_COOLDOWN);
      return;
    }

    this.monster.faceCreature(this.getTarget() as Player);
    getGameServer().world.combatHandler.handleCombat(this.monster);
    this.actions.lock(this.handleActionAttack.bind(this), this.monster.getProperty(CONST.PROPERTIES.ATTACK_SPEED));
  }

  public handleActionMove(): void {
    const tile = this.getNextMoveTile();

    if (!tile || tile.id === 0) {
      this.actions.lock(this.handleActionMove.bind(this), this.GLOBAL_COOLDOWN);
      return;
    }

    const lockDuration = this.monster.getStepDuration(tile.getFriction());
    const slowness = this.monster.position.isDiagonal(tile.position) ? 2 * lockDuration : lockDuration;
    getGameServer().world.creatureHandler.moveCreature(this.monster, tile.position);
    this.actions.lock(this.handleActionMove.bind(this), slowness);
  }

  private __findTarget(): void {
    const monsterPos = this.monster.getPosition();
    if (!monsterPos) return;

    const chunks = getGameServer().world.getSpectatingChunks(monsterPos);
    for (const chunk of chunks) {
      for (const player of chunk.players) {
        if (player.isInProtectionZone() || player.isInvisible() || !this.__canReach(player.position)) {
          continue;
        }

        player.combatLock.activate();
        this.setTarget(player);
        return;
      }
    }
  }

  private __canReach(targetPosition: Position): boolean {
    const monsterPos = this.monster.getPosition();
    if (!monsterPos) return false;

    if (!this.monster.canSee(targetPosition)) return false;
    if (targetPosition.besides(monsterPos)) return true;

    const path = getGameServer().world.findPath(this.monster, monsterPos, targetPosition, Pathfinder.ADJACENT);
    return path.length > 0;
  }

  private __handleTargetMoveMonsterBehaviour(): Tile | null {
    if (this.isBesidesTarget()) return null;
    return this.__handlePathToTarget();
  }

  private __handlePathToTarget(): Tile | null {
    const path = this.getPathToTarget();
    if (path) return path;

    this.setTarget(null);
    return null;
  }

  public getTarget(): Player | null {
    return this.__target;
  }

  public hasTarget(): boolean {
    return this.__target !== null;
  }

  public canSeeTarget(): boolean {
    const target = this.getTarget();
    return target !== null && this.monster.canSee(target.getPosition());
  }

  public setTarget(target: Player | null): void {
    this.__target = target;
  }

  public setBehaviour(state: number): void {
    this.actions.add(this.handleActionMove.bind(this));
    this.actions.add(this.handleActionSpeak.bind(this));

    if (this.is(MonsterBehaviour.HOSTILE)) {
      this.actions.add(this.handleActionAttack.bind(this));
      this.actions.add(this.handleActionTarget.bind(this));
    } else {
      this.actions.remove(this.handleActionAttack.bind(this));
      this.actions.remove(this.handleActionTarget.bind(this));
      this.setTarget(null);
    }
  }

  public is(behaviour: number): boolean {
    return this.state === behaviour;
  }

  public requiresTarget(): boolean {
    return [MonsterBehaviour.HOSTILE, MonsterBehaviour.FLEEING, MonsterBehaviour.FRIENDLY, MonsterBehaviour.RANGED].includes(this.state);
  }

  public getPathToTarget(): Tile | null {
    if (!this.hasTarget()) return null;

    const monsterPos = this.monster.getPosition();
    if (!monsterPos) return null;

    const path = getGameServer().world.findPath(
      this.monster,
      monsterPos,
      this.getTarget()!.getPosition(),
      Pathfinder.ADJACENT
    );

    return path.length > 0 ? path.pop() || null : null;
  }

  public getNextMoveTile(): Tile | null {
    if (!this.hasTarget()) return this.wander();
    return this.__handleTargetMoveMonsterBehaviour();
  }

  public wander(): Tile | null {
    const position = this.monster.getPosition();
    if (!position) return null;

    const options = position.getNESW();

    while (options.length > 0) {
      const tile = getGameServer().world.getTileFromWorldPosition(options.pop()!);
      if (!tile || tile.id === 0 || this.monster.isTileOccupied(tile)) continue;
      return tile;
    }

    return null;
  }

  private handleOpenDoor(thing: any): void {
    /*
     * Checks whether a door exists at the tile and that the door can be opened
     */
    if (!thing || !thing.isDoor()) {
      return;
    }
  
    if (!thing.isOpened() && !thing.isLocked()) {
      thing.open();
    }
  }
  
  private __handleRangedMoveMonsterBehaviour(): Tile | null {
    /*
     * Handles the next move action for a ranged monster
     */
    const KEEP_DISTANCE = 3;
  
    const distance = this.monster.position.pythagoreanDistance(
      this.getTarget()?.getPosition()!
    );
  
    if (distance < KEEP_DISTANCE) {
      return this.__handleFleeMoveMonsterBehaviour();
    } else if (distance > KEEP_DISTANCE) {
      return this.__handlePathToTarget();
    }
  
    if (this.__canReach(this.getTarget()?.getPosition()!)) {
      return null;
    }
  
    this.setTarget(null);
    return null;
  }
  
  private __handleFleeMoveMonsterBehaviour(): Tile | null {
    /*
     * Handles the fleeing movement for the monster using a heuristic
     */
    const heuristics: number[] = [];
    const tiles: Tile[] = [];
  
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        const added = this.monster.position.add(new Position(x, y, 0));
        const tile = getGameServer().world.getTileFromWorldPosition(added);
  
        if (tile && !this.monster.isTileOccupied(tile)) {
          let heuristic = this.getTarget()?.getPosition().manhattanDistance(added);
  
          if (this.monster.position.isDiagonal(added)) {
            heuristic /= 3;
          }
  
          heuristics.push(heuristic);
          tiles.push(tile);
        }
      }
    }
  
    if (tiles.length === 0) {
      return null;
    }
  
    const maximum = Math.max(...heuristics);
    return tiles[heuristics.indexOf(maximum)];
  }
  
  handleDamage(attacker: Player): void {
    /*
     * Handles changes to behaviour for an incoming event by an attacker
     */
    if (this.is(MonsterBehaviour.HOSTILE_ON_ATTACK)) {
      this.setBehaviour(MonsterBehaviour.HOSTILE);
      this.setTarget(attacker);
    }
  
    // TODO
    // if (this.monster.health <= this.monster.getProperty(CONST.PROPERTIES.FLEE_HEALTH)) {
    //   this.setBehaviour(MonsterBehaviour.FLEEING);
    //   this.setTarget(attacker);
    // }
  }

}

export default MonsterBehaviour;
