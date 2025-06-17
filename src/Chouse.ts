import { CONST, getGameServer } from "./helper/appContext";

export interface HouseEntry {
  name: string;
  owner: string;
  invited: string[];
  exit: { x: number; y: number; z: number };
  rent: number;
}

class House {
  id: number;
  name: string;
  owner: string | null;
  invited: string[];
  exit: any;
  rent: number;
  tiles: any[];

  /*
   * Class House
   * Wrapper for a player-ownable house
   */

  constructor(id: number, entry: HouseEntry) {
    this.id = id;
    this.name = entry.name;
    this.owner = entry.owner;
    this.invited = entry.invited;
    this.exit = entry.exit;
    this.rent = entry.rent;

    // Save a reference to all the tiles in the house
    this.tiles = [];
  }

  setOwner(player: { name: string }): void {
    /*
     * Function House.setOwner
     * Updates the owner of the house
     */

    // Evict all players and items from the emptied house
    this.__evictAllPlayers();
    this.__evictAllItems();

    this.owner = player.name;
    this.invited = [];
  }

  private __evictAllItems(): void {
    /*
     * Function House.__evictAllItems
     * Moves all pickupable items to the inbox
     */
    let owner;
    if(this.owner)
      owner = getGameServer().world.creatureHandler.getPlayerByName(this.owner);

    if (owner === null) {
      //TODO 
      //this.__evictAllItemsOffline(this.owner);
    } else {
      this.__evictAllItemsOnline(owner);
    }
  }

  //TODO: check this
  // private __evictAllItemsOffline(owner: string): void {
  //   /*
  //    * Function House.__evictAllItemsOffline
  //    * Updates the player account if the player is offline
  //    */

  //   const items: any[] = [];

  //   this.tiles.forEach((tile) => {
  //     tile.itemStack.__items
  //       .filter((thing: any) => thing.isPickupable())
  //       .forEach((thing: any) => {
  //         tile.__deleteThing(thing);
  //         items.push(thing.toJSON());
  //       });
  //   });

  //   getGameServer().server.websocketServer.accountManager.atomicUpdate(owner, (error: Error | null, json: any) => {
  //     if (error) {
  //       console.error("Encountered a fatal error writing inbox to player file.");
  //       return;
  //     }

  //     // Update the player's inbox
  //     json.inbox.push(...items);
  //   });
  // }

  private __evictAllItemsOnline(owner: any): void {
    /*
     * Function House.__evictAllItemsOnline
     * Evicts all items from the house to the owner's inbox
     */

    this.tiles.forEach((tile) => {
      tile.itemStack.__items
        .filter((thing: any) => thing.isPickupable())
        .forEach((thing: any) => {
          tile.__deleteThing(thing);
          owner.player.containerManager.inbox.addThing(thing);
        });
    });
  }

  private __evictAllPlayers(): void {
    /*
     * Function House.__evictAllPlayers
     * Evicts all players from the house to the exit tile
     */

    this.tiles.forEach((tile) => {
      tile.players.forEach((player: any) => {
        getGameServer().world.creatureHandler.teleportCreature(player, this.exit);
        getGameServer().world.sendMagicEffect(player.position, CONST.EFFECT.MAGIC.TELEPORT);
      });
    });
  }

  toJSON(): { owner: string | null; rent: number; exit: any; invited: string[]; name: string } {
    /*
     * Function House.toJSON
     * Implements the toJSON API and serializes the house metadata like owner and exit tile
     */

    return {
      owner: this.owner,
      rent: this.rent,
      exit: this.exit,
      invited: this.invited,
      name: this.name,
    };
  }

  isOwnedBy(player: { name: string }): boolean {
    /*
     * Function House.isOwnedBy
     * Checks if the house is owned by a specific player
     */

    return this.owner === player.name;
  }

  addTile(tile: any): void {
    /*
     * Function House.addTile
     * Adds a tile reference to the house
     */

    this.tiles.push(tile);

    // Circular reference
    tile.house = this;
  }
}

export default House;
