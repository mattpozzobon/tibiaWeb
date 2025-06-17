export interface IIPCSocket {
  close(): void;
}

export interface IDataBuffer {
  buffers: Buffer[];
  length: number;
  size: number;
}