import { SpellAddPacket, SpellCastPacket } from "../../network/protocol";
import { CONFIG, getGameServer } from "../../helper/appContext";
import Player from "../../creature/player/player";

interface Cooldown {
  sid: number;
  cooldown: number;
}

export class Spellbook {
  private player: Player;
  private __spellCooldowns: Map<number, any>;
  private __cooldowns: Cooldown[];
  private __availableSpells: Set<number>;

  public readonly GLOBAL_COOLDOWN = 0xffff;
  public readonly GLOBAL_COOLDOWN_DURATION = 20;

  constructor(player: Player, data: { cooldowns: Cooldown[]; availableSpells: number[] }) {
    /*
     * Class Spellbook
     * Container for all spells that a player has and handles casting / cooldowns
     */
    this.player = player;
    this.__spellCooldowns = new Map<number, any>();
    this.__cooldowns = data.cooldowns;
    this.__availableSpells = new Set(data.availableSpells);
  }

  getAvailableSpells(): Set<number> {
    /*
     * Returns the spells that are available in the player's spellbook
     */
    return this.__availableSpells;
  }

  toJSON(): { availableSpells: number[]; cooldowns: Cooldown[] } {
    /*
     * Serializes the spellbook to JSON
     */
    return {
      availableSpells: Array.from(this.__availableSpells),
      cooldowns: Array.from(this.__spellCooldowns).map(([sid, event]) => ({
        sid,
        cooldown: event.remainingFrames(),
      })),
    };
  }

  addAvailableSpell(sid: number): void {
    /*
     * Adds an available spell to the player's spellbook
     */
    this.__availableSpells.add(sid);
    this.player.sendCancelMessage("You have learned a new spell!");
    this.player.write(new SpellAddPacket(sid));
  }

  handleSpell(sid: number): void {
    /*
     * Handles casting of a spell by an entity
     */
    if (this.__spellCooldowns.has(this.GLOBAL_COOLDOWN) || this.__spellCooldowns.has(sid)) {
      return;
    }

    const spell = getGameServer().database.getSpell(sid);
    if (!spell || !this.__availableSpells.has(sid)) {
      return;
    }

    const cooldown = spell.call(this.player);
    if (cooldown === 0) {
      return;
    }

    this.player.write(new SpellCastPacket(sid, cooldown));
    this.__lockSpell(sid, cooldown);
  }

  applyCooldowns(): void {
    /*
     * Applies the serialized cooldowns when the player logs in
     */
    const correction = Date.now() - this.player.lastVisit;

    this.__cooldowns.forEach(({ sid, cooldown }) => {
      cooldown = Math.max(0, cooldown - correction / CONFIG.SERVER.MS_TICK_INTERVAL);
      if (cooldown > 0) {
        this.__internalLockSpell(sid, cooldown);
        this.player.write(new SpellCastPacket(sid, cooldown));
      }
    });
  }

  writeSpells(gameSocket: any): void {
    /*
     * Serializes the spellbook as a binary packet
     */
    this.__availableSpells.forEach((sid) => gameSocket.write(new SpellAddPacket(sid)));
  }

  private __lockSpell(sid: number, duration: number): void {
    /*
     * Locks a spell by adding it to the cooldown map
     */
    this.__internalLockSpell(sid, duration);
    this.__internalLockSpell(this.GLOBAL_COOLDOWN, this.GLOBAL_COOLDOWN_DURATION);
  }

  private __internalLockSpell(sid: number, duration: number): void {
    /*
     * Internal function to schedule the lock
     */
    this.__spellCooldowns.set(
      sid,
      getGameServer().world.eventQueue.addEvent(this.__unlockSpell.bind(this, sid), duration)
    );
  }

  private __unlockSpell(sid: number): void {
    /*
     * Unlocks a spell by deleting it from the cooldown map
     */
    this.__spellCooldowns.delete(sid);
  }
}
