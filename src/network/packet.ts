export class Packet {
  index: number;

  constructor() {
    /*
     * Class Packet
     * Parent class of a readable and writable binary packets
     *
     * API:
     * Packet.advance(amount) - advances the packet by a given number of bytes
     */
    this.index = 0;
  }

  public advance(amount: number): void {
    /*
     * Advances the index of the packet
     */
    this.index += amount;
  }
}

export default Packet;
