import * as fs from "fs";

interface FileAccessHandlerCallback {
  fs: number;
  pointer?: { buffer: Buffer | null; error?: boolean };
  callback: (error: NodeJS.ErrnoException | null, result?: Buffer) => void;
}

interface Lock {
  callbacks: FileAccessHandlerCallback[];
  locked: boolean;
  filename: string;
}

export class FileAccessHandler {
  private __locks: Map<string, Lock> = new Map();

  public readonly READ = 0x00;
  public readonly WRITE = 0x01;

  /**
   * Writes a buffer to a file asynchronously, ensuring no race conditions.
   */
  public writeFile(
    filename: string,
    pointer: { buffer: Buffer | null; error?: boolean },
    callback: (error: NodeJS.ErrnoException | null) => void
  ): void {
    const lock = this.__createLock(filename);

    lock.callbacks.push({
      fs: this.WRITE,
      pointer,
      callback,
    });

    this.__consume(lock);
  }

  /**
   * Reads a buffer from a file asynchronously, ensuring no race conditions.
   */
  public readFile(
    filename: string,
    callback: (error: NodeJS.ErrnoException | null, result?: Buffer) => void
  ): void {
    const lock = this.__createLock(filename);

    lock.callbacks.push({
      fs: this.READ,
      callback,
    });

    this.__consume(lock);
  }

  /**
   * Consumes the lock and applies a read/write callback to the filesystem.
   */
  private __consume(lock: Lock): void {
    if (lock.locked) {
      return;
    }

    lock.locked = true;

    const handler = lock.callbacks.shift();
    if (!handler) {
      return;
    }

    switch (handler.fs) {
      case this.READ:
        return this.__handleRead(lock, handler);
      case this.WRITE:
        return this.__handleWrite(lock, handler);
      default:
        throw new Error("Invalid lock applied");
    }
  }

  /**
   * Wrapper around the Node.js async fs.readFile function.
   */
  private __handleRead(lock: Lock, handler: FileAccessHandlerCallback): void {
    fs.readFile(lock.filename, (error, result) => {
      handler.callback(error, result);
      this.__free(lock);
    });
  }

  /**
   * Wraps the fs.writeFile function.
   */
  private __handleWrite(lock: Lock, handler: FileAccessHandlerCallback): void {
    if (handler.pointer?.error) {
      return this.__free(lock);
    }

    fs.writeFile(lock.filename, handler.pointer?.buffer || Buffer.alloc(0), (error) => {
      handler.callback(error);
      this.__free(lock);
    });
  }

  /**
   * Frees the lock and processes the next queued callback if available.
   */
  private __free(lock: Lock): void {
    lock.locked = false;

    if (lock.callbacks.length > 0) {
      this.__consume(lock);
    } else {
      this.__locks.delete(lock.filename);
    }
  }

  /**
   * Creates a lock for a filename if it does not already exist.
   */
  private __createLock(filename: string): Lock {
    if (this.__locks.has(filename)) {
      return this.__locks.get(filename)!;
    }

    const newLock: Lock = {
      callbacks: [],
      locked: false,
      filename,
    };

    this.__locks.set(filename, newLock);
    return newLock;
  }
}
