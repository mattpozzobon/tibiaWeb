import { NPCTradePacket } from "../../network/protocol";


class TradeHandler {
  npc: any;
  trade: { items: any[] };

  /**
   * Class TradeHandler
   * Wrapper for NPCs who sell and buy items from players
   */
  constructor(npc: any, trade: { items: any[] }) {
    this.npc = npc;
    this.trade = trade;
  }

  /**
   * Function TradeHandler.hasTrades
   * Returns true if the NPC has trades to make
   */
  hasTrades(): boolean {
    return this.trade.items.length !== 0;
  }

  /**
   * Function TradeHandler.openTradeWindow
   * Opens trade window with a friendly NPC
   */
  openTradeWindow(player: any): void {
    player.write(new NPCTradePacket(this.npc.guid, this.trade.items));

    // Reset the NPC state
    this.npc.conversationHandler.getFocusHandler().reset();
  }

  /**
   * Function TradeHandler.getTradeItem
   * Returns the trade item for a particular index
   */
  getTradeItem(index: number): any | null {
    // The requested trade index is invalid
    if (index < 0 || index >= this.trade.items.length) {
      return null;
    }

    return this.trade.items[index];
  }
}

export default TradeHandler;
