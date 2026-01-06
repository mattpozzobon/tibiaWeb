import { IPlayer } from "interfaces/IPlayer";
import BaseContainer from "../../item/base-container";
import Key from "../../item/key";
import { getGameServer } from "../../helper/appContext";

class Keyring {
  private __keys: Set<number> = new Set();
  private __player: IPlayer;
  public container: BaseContainer;

  constructor(id: number, IPlayer: IPlayer, keyring: any[]) {
    /*
     * Class Keyring
     * Container for just keys that can automatically open doors
     */

    this.__player = IPlayer;
    this.container = new BaseContainer(id, 32);

    // Serialize keys
    this.__addKeys(keyring);
  }

  getPosition(): any {
    /*
     * Function Keyring.getPosition
     * Returns the position of the container in the game world (which is with the IPlayer)
     */
    return this.__player.position;
  }

  hasKey(aid: number): boolean {
    /*
     * Function Keyring.hasKey
     * Returns true if a particular action identifier is in the keyring
     */
    return this.__keys.has(aid);
  }

  toJSON(): any[] {
    /*
     * Function Equipment.toJSON
     * Implements the JSON.Stringify interface that is called when the IPlayer is serialized
     */
    return this.container.getSlots();
  }

  peekIndex(index: number): Key | null {
    /*
     * Function Equipment.peekIndex
     * Peeks at the item at the specified slot index
     */
    return this.container.peekIndex(index) as Key | null;
  }

  addThing(key: Key, index: number): void {
    /*
     * Function Keyring.addThing
     * Adds a key to the keyring at the specified index
     */

    this.container.addThing(key, index);
    key.setParent(this.container);
    this.__updateWeight(key.getWeight());
    if (key.actionId)
      this.__keys.add(key.actionId);
  }

  removeIndex(index: number, count: number): Key | null {
    /*
     * Function Keyring.removeIndex
     * Implements the removeIndex API that handles removal of an item by the index and amount
     */

    const key = this.container.removeIndex(index, count) as Key | null;
    if (key) {
      this.__updateWeight(-key.getWeight());
      key.setParent(null);
      if (key.actionId)
        this.__keys.delete(key.actionId);
    }

    return key;
  }

  getTopParent(): IPlayer {
    /*
     * Function Keyring.getTopParent
     * Returns the top level parent of the keyring which is the IPlayer
     */
    return this.__player;
  }

  getMaximumAddCount(IPlayer: IPlayer, key: Key, index: number): number {
    /*
     * Function Keyring.getMaximumAddCount
     * Logic that implements whether a thing can be added to the keyring
     */

    if (!this.container.isValidIndex(index)) {
      return 0;
    }

    if (!(key instanceof Key)) {
      return 0;
    }

    if (key.actionId){
      if (this.__keys.has(key.actionId) && key.getParent() !== this) {
        return 0;
      }
    }
    
    const thing = this.container.peekIndex(index);

    if (thing !== null) {
      return 0;
    }

    return 1;
  }

  private __addKeys(keys: any[]): void {
    /*
     * Function Keyring.__addKeys
     * Adds all keys serialized from the database
     */

    keys.forEach((item, index) => {
      if (item === null) {
        return;
      }
      this.addThing(getGameServer().database.parseThing(item) as Key, index);
    });
  }

  private __updateWeight(weight: number): void {
    /*
     * Function Equipment.__updateWeight
     * Updates the capacity of the parent IPlayer
     */
    this.__player.changeCapacity(-weight);
  }
}

export default Keyring;
