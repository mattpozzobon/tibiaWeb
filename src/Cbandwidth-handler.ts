export class BandwidthHandler {
  /*
   * Class BandwidthHandler
   * Handler for keeping statistics on network I/O
   *
   * API:
   * BandwidthHandler.getBandwidth(): BandwidthStats - Returns the current bandwidth usage statistics.
   * BandwidthHandler.monitorSocket(socket: any): void - Monitors the bandwidth of a socket.
   */

  private bytesWritten: number;
  private bytesRead: number;

  private bandwidthStartWritten: number;
  private bandwidthStartRead: number;

  constructor() {
    this.bytesWritten = 0;
    this.bytesRead = 0;

    this.bandwidthStartWritten = 0;
    this.bandwidthStartRead = 0;
  }

  public monitorSocket(socket: any): void {
    /*
     * Enables monitoring of the socket by recording the bytes written / read
     */

    // Add total number of bytes read
    socket.on("data", (data: Buffer) => {
      this.bytesRead += data.length;
    });

    // Add total number of bytes written
    const originalWrite = socket.write;

    socket.write = (data: Buffer, ...args: any[]) => {
      originalWrite.call(socket, data, ...args);
      this.bytesWritten += data.length;
    };
  }

  public getBandwidth(): BandwidthStats {
    /*
     * Returns the network I/O bandwidth of the HTTP server
     */

    // Calculate bandwidth by taking the difference
    const differenceWritten = this.bytesWritten - this.bandwidthStartWritten;
    this.bandwidthStartWritten = this.bytesWritten;

    const differenceRead = this.bytesRead - this.bandwidthStartRead;
    this.bandwidthStartRead = this.bytesRead;

    return {
      bytesWritten: this.bytesWritten,
      bytesRead: this.bytesRead,
      bandwidthWritten: differenceWritten,
      bandwidthRead: differenceRead,
    };
  }
}

export interface BandwidthStats {
  bytesWritten: number;
  bytesRead: number;
  bandwidthWritten: number;
  bandwidthRead: number;
}
