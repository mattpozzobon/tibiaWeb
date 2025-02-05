class PacketBuffer {
  /*
   * Class PacketBuffer
   * Buffer that collects packets and only flushes the buffer / concatenates the data to write a single message per frame
   *
   * API:
   * @PacketBuffer.add(buffer) - adds a buffer to the main buffer
   * @PacketBuffer.flush() - flushes the outgoing buffer by emptying it and returning the concatenation of all buffers
   * @PacketBuffer.isEmpty() - Returns true if the buffer is empty
   */

  private __buffers: Buffer[]; // Collects the buffers
  __lastPacketReceived: number; // Tracks the timestamp of the last received packet

  constructor() {
    this.__buffers = [];
    this.__lastPacketReceived = Date.now();
  }

  public add(buffer: Buffer): void {
    /*
     * Function PacketBuffer.add
     * Adds a buffer to the main buffer
     */
    this.__buffers.push(buffer);
    this.__lastPacketReceived = Date.now();
  }

  public flush(): Buffer {
    /*
     * Function PacketBuffer.flush
     * Flushes and resets the buffer
     */
    const buffer = Buffer.concat(this.__buffers);
    this.__buffers = [];
    return buffer;
  }

  public isEmpty(): boolean {
    /*
     * Function PacketBuffer.isEmpty
     * Returns true if there are no messages in the buffer
     */
    return this.__buffers.length === 0;
  }

  public getLastPacketReceived(): number {
    /*
     * Function PacketBuffer.getLastPacketReceived
     * Returns the timestamp of the last received packet
     */
    return this.__lastPacketReceived;
  }
}

export default PacketBuffer;
