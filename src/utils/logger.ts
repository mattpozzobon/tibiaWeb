import fs from "fs";
import { CONFIG, getGameServer } from "../helper/appContext";

class ServerLogger {
  public __gameLoopExecutionTime: number;
  private __cpu: NodeJS.CpuUsage;
  private __time: number;
  private logfile: NodeJS.WritableStream;

  constructor() {
    /*
     * Class ServerLogger
     * Logs internal server parameters to logfile
     */

    this.__gameLoopExecutionTime = 0;
    this.__cpu = process.cpuUsage();
    this.__time = performance.now();

    // Create writable stream to disk
    if (CONFIG.LOGGING.FILEPATH === "stdout") {
      this.logfile = process.stdout;
    } else {
      this.logfile = fs.createWriteStream(CONFIG.LOGGING.FILEPATH);
    }

    // Write the header
    const HEADER = [
      "Timestamp",
      "Memory (mb)",
      "CPU Usage (%)",
      "Event Heap Size",
      "Event Heap Handled",
      "Clients",
      "Total Bytes In",
      "Total Bytes Out",
      "Bandwidth In (kb/s)",
      "Bandwidth Out (kb/s)",
      "Pathfinding Requests",
      "Pathfinding Iterations",
      "Loop Exec Time (ms)",
      "Drift (ms)",
      "Frame",
      "World Time",
      "Monsters",
    ];

    this.writeLine(HEADER);
  }

  writeLine(line: string[]): void {
    /*
     * Function ServerLogger.writeLine
     * Writes an array of parameters to a line delimited by tabs
     */
    this.logfile.write(line.join("\t"));
    this.logfile.write("\n");
  }

  getCPUUsage(): number {
    /*
     * Function ServerLogger.getCPUUsage
     * Determines and returns CPU usage in percent of the process
     */
    const result =
      (100 * (this.__cpu.user + this.__cpu.system)) / (1000 * this.__time);
    this.__cpu = process.cpuUsage(this.__cpu);
    this.__time = performance.now();

    return result;
  }

  log(): void {
    /*
     * Function ServerLogger.log
     * Writes server diagnostics to logfile
     */

    const networkDetails = getGameServer().server.getDataDetails();
    const loopDetails = getGameServer().gameLoop.getDataDetails();
    const worldDetails = getGameServer().world.getDataDetails();

    const memoryUsage = process.memoryUsage().rss / (1024 * 1024);
    const executionTime = this.__gameLoopExecutionTime / CONFIG.LOGGING.INTERVAL;
    const pathfinding = getGameServer().world.lattice.pathfinder.getDataDetails();

    this.__cpu = process.cpuUsage(this.__cpu);

    const message = [
      new Date().toISOString(),
      memoryUsage.toFixed(0),
      this.getCPUUsage().toFixed(1),
      getGameServer().world.eventQueue.heap.size(),
      getGameServer().world.eventQueue.getEventsHandled(),
      networkDetails.websocket.sockets,
      networkDetails.bandwidth.bytesRead,
      networkDetails.bandwidth.bytesWritten,
      networkDetails.bandwidth.bandwidthRead,
      networkDetails.bandwidth.bandwidthWritten,
      pathfinding.requests,
      pathfinding.iterations,
      executionTime.toFixed(0),
      loopDetails.drift,
      loopDetails.tick,
      worldDetails.time,
      worldDetails.activeMonsters,
    ];
    
    // Convert all elements to strings
    const stringMessage = message.map((item) => String(item));
    this.writeLine(stringMessage);
    
    // Reset the execution time
    this.__gameLoopExecutionTime = 0;
  }
}

export default ServerLogger;
