import { IPlayer } from "interfaces/IPlayer";
import Thing from "../thing/thing";
import { CONST, getGameServer } from "../helper/appContext";
import DepotContainer from "./depot";

class Inbox {
  private __player: IPlayer;
  private __items: Thing[] = []; // Queue: single source of truth for all mail items (first come, first served)

  constructor(IPlayer: IPlayer, inbox: any[]) {
    /*
     * Class Inbox
     * Queue-based mail system: __items is the single source of truth
     * Mail container displays only the first 5 items from the queue
     */
    this.__player = IPlayer;

    // Load all items into the queue
    inbox.forEach((item) => {
      this.__items.push(getGameServer().database.parseThing(item) as Thing);
    });

    // Note: Container sync will happen when container is opened via syncContainer()
    // Don't sync here because containerManager.depot might not be ready yet
  }

  addThing(thing: Thing): void {
    /*
     * Class Inbox.addThing
     * Adds a thing to the end of the queue (FIFO)
     * If mail container has space, the item will appear immediately via __syncContainerFromQueue
     */
    this.__items.push(thing);
    this.__syncContainerFromQueue();
    this.__player.sendCancelMessage("You just received mail.");
  }

  toJSON(): any[] {
    /*
     * Class Inbox.toJSON
     * Serializes the inbox queue (single source of truth)
     * Returns array of serialized items from __items
     */
    return this.__items.map(item => {
      if (item && typeof (item as any).toJSON === 'function') {
        return (item as any).toJSON();
      }
      // Fallback: manually serialize if toJSON doesn't exist
      const itemAny = item as any;
      const result: any = { id: item.id };
      if (itemAny.count !== undefined) result.count = itemAny.count;
      if (itemAny.actionId !== undefined) result.actionId = itemAny.actionId;
      if (itemAny.duration !== undefined) result.duration = itemAny.duration;
      if (itemAny.content !== undefined) result.content = itemAny.content;
      return result;
    });
  }

  pop(position: any): void {
    /*
     * Class Inbox.pop
     * Removes and returns the last item from the visible container (LIFO - last in, first out)
     * This removes from queue and refills container from queue
     */
    if (this.__items.length === 0) {
      getGameServer().world.sendMagicEffect(position, CONST.EFFECT.MAGIC.POFF);
      this.__player.sendCancelMessage("There are no items in your inbox.");
      return;
    }

    const mailContainer = this.__player.containerManager.depot.getMailContainer();
    if (!mailContainer || mailContainer.getNumberItems() === 0) {
      getGameServer().world.sendMagicEffect(position, CONST.EFFECT.MAGIC.POFF);
      this.__player.sendCancelMessage("There are no items in your inbox.");
      return;
    }

    // Get the item from the container (last visible item, which is the most recently added of the visible 5)
    const thing = mailContainer.peekIndex(mailContainer.getNumberItems() - 1);
    if (!thing) {
      getGameServer().world.sendMagicEffect(position, CONST.EFFECT.MAGIC.POFF);
      this.__player.sendCancelMessage("There are no items in your inbox.");
      return;
    }

    if (!this.__player.containerManager.equipment.canPushItem(thing)) {
      this.__sendToDepot(thing, position);
      return;
    }

    // Find and remove from queue by matching item properties (since instances might differ on load)
    const thingKey = this.__getItemKey(thing);
    const itemIndex = this.__items.findIndex(item => this.__getItemKey(item) === thingKey);
    if (itemIndex !== -1) {
      this.__items.splice(itemIndex, 1);
    }

    // Remove from container
    mailContainer.removeIndex(mailContainer.getNumberItems() - 1, 1);

    // Add to player equipment
    this.__player.containerManager.equipment.pushItem(thing);
    this.__player.sendCancelMessage(`You took ${thing.getName()} from your inbox.`);
    getGameServer().world.sendMagicEffect(position, CONST.EFFECT.MAGIC.BLOCKHIT);
    
    // Refill container from queue (next item in queue will appear)
    this.__syncContainerFromQueue();
  }

  private __syncContainerFromQueue(containerManager?: any): void {
    /*
     * Class Inbox.__syncContainerFromQueue
     * Syncs mail container to display first 5 items from __items queue (FIFO - first come, first served)
     * This is the single source of truth - container is just a view of the queue
     * 
     * Simple approach: Compare what should be (first 5 from queue) vs what's in container
     * Only update slots that differ to minimize packet spam
     * 
     * @param containerManager - Optional ContainerManager instance (used during initialization)
     */
    // Get depot from containerManager parameter or from player.containerManager
    const depot = containerManager?.depot || this.__player.containerManager?.depot;
    if (!depot) {
      return; // Will sync later when container is opened via syncContainer()
    }
    
    const mailContainer = depot.getMailContainer();
    if (!mailContainer) return;

    // Temporarily skip removal hook to avoid triggering queue updates during sync
    (mailContainer as any).__skipRemovalHook = true;

    // Get what should be in container (first 5 items from queue, in order)
    const maxVisible = Math.min(this.__items.length, DepotContainer.MAIL_CONTAINER_SIZE);
    const shouldBeInContainer = this.__items.slice(0, maxVisible).map(item => ({
      item,
      key: this.__getItemKey(item)
    }));

    // Check each slot and update if needed
    for (let i = 0; i < DepotContainer.MAIL_CONTAINER_SIZE; i++) {
      const shouldBeItem = shouldBeInContainer[i];
      const currentItem = mailContainer.container.peekIndex(i);

      if (shouldBeItem) {
        // Slot i should have an item
        const shouldBeKey = shouldBeItem.key;
        const currentKey = currentItem ? this.__getItemKey(currentItem) : null;

        if (currentKey !== shouldBeKey) {
          // Slot i has wrong item or is empty, fix it
          if (currentItem) {
            // Remove wrong item
            mailContainer.removeIndex(i, 1);
          }
          // Add correct item
          mailContainer.addThing(shouldBeItem.item, i);
        }
        // If keys match, item is already correct, skip
      } else {
        // Slot i should be empty
        if (currentItem) {
          // Remove item from slot
          mailContainer.removeIndex(i, 1);
        }
      }
    }

    // Re-enable removal hook
    (mailContainer as any).__skipRemovalHook = false;
  }

  private __sendToDepot(thing: Thing, position: any): void {
    /*
     * Class Inbox.__sendToDepot
     * Sends the item to the depot container if player cannot carry it
     * Removes the item from queue and container, then adds to depot
     */
    const mailContainer = this.__player.containerManager.depot.getMailContainer();
    if (!mailContainer) {
      getGameServer().world.sendMagicEffect(position, CONST.EFFECT.MAGIC.POFF);
      this.__player.sendCancelMessage("You cannot carry this item and there is no space in your depot.");
      return;
    }

    // Find and remove from queue by matching item properties
    const thingKey = this.__getItemKey(thing);
    const itemIndex = this.__items.findIndex(item => this.__getItemKey(item) === thingKey);
    if (itemIndex !== -1) {
      this.__items.splice(itemIndex, 1);
    }

    // Remove from mail container if it's there
    for (let i = 0; i < mailContainer.container.size; i++) {
      const item = mailContainer.container.peekIndex(i);
      if (item && this.__getItemKey(item) === thingKey) {
        mailContainer.removeIndex(i, 1);
        break;
      }
    }
    
    // Check if depot has space and add to depot
    const depotContainer = this.__player.containerManager.depot.getDepotContainer();
    if (!depotContainer || depotContainer.container.isFull()) {
      getGameServer().world.sendMagicEffect(position, CONST.EFFECT.MAGIC.POFF);
      this.__player.sendCancelMessage("You cannot carry this item and there is no space in your depot.");
      return;
    }

    this.__player.containerManager.depot.addToDepot(thing);
    this.__player.sendCancelMessage("You cannot carry this item and it was sent to your depot.");
    getGameServer().world.sendMagicEffect(position, CONST.EFFECT.MAGIC.TELEPORT);
    
    // Refill container from queue
    this.__syncContainerFromQueue();
  }

  isEmpty(): boolean {
    /*
     * Class Inbox.isEmpty
     * Returns true if the inbox queue is empty
     */
    return this.__items.length === 0;
  }

  removeItemFromQueue(item: Thing): void {
    /*
     * Class Inbox.removeItemFromQueue
     * Removes an item from the queue (called when item is removed directly from container via UI)
     * Then refills container from queue
     */
    const itemKey = this.__getItemKey(item);
    const itemIndex = this.__items.findIndex(queueItem => this.__getItemKey(queueItem) === itemKey);
    if (itemIndex !== -1) {
      this.__items.splice(itemIndex, 1);
      this.__syncContainerFromQueue();
    }
  }

  syncContainer(containerManager?: any): void {
    /*
     * Class Inbox.syncContainer
     * Public method to sync mail container with queue (called when container is opened or during initialization)
     * Ensures container displays first 5 items from queue
     * 
     * @param containerManager - Optional ContainerManager instance (used during initialization)
     */
    this.__syncContainerFromQueue(containerManager);
  }

  private __getItemKey(item: Thing): string {
    /*
     * Class Inbox.__getItemKey
     * Creates a unique key for an item based on its properties
     * Used to compare items by properties instead of instance reference
     */
    const itemAny = item as any;
    const id = item.id || 0;
    const count = itemAny.count || 0;
    const actionId = itemAny.actionId || 0;
    const duration = itemAny.duration || 0;
    const content = itemAny.getContent ? itemAny.getContent() : (itemAny.content || '');
    
    return `${id}:${count}:${actionId}:${duration}:${content}`;
  }
}

export default Inbox;
