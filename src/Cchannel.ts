export class Channel {
  id: number;
  name: string;

  constructor(id: number, name: string) {
    /*
     * Class Channel
     * Base for classes that implement channels (e.g., default or global channels)
     * Classes that inherit from channel should implement the send() API
     *
     * API:
     * Channel.equals(id) - returns true if the channel has the passed identifier
     */

    // Each channel has a readable name and identifier
    this.id = id;
    this.name = name;
  }

  equals(id: number): boolean {
    /*
     * Returns if this is the channel with identifier id
     */
    return this.id === id;
  }

  send(player: any, packet: any): void {
    /*
     * Default no-op
     * This method should be overridden by derived classes
     */
    // No implementation
  }
}

export default Channel;
