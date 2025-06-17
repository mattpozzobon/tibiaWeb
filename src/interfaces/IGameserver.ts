import { IDatabase } from "./IDatabase";
import { IGameLoop } from "./IGameloop";
import { IHTTPServer } from "./IHttp-server";
import { IIPCSocket } from "./IIpcsocket";
import { IWorld } from "./IWorld";

export interface IGameServer {
  database: IDatabase;
  world: IWorld;
  gameLoop: IGameLoop;
  server: IHTTPServer;
  IPCSocket: IIPCSocket;

  initialize(): void;
  shutdown(): void;
  setServerStatus(serverStatus: string): void;
  isShutdown(): boolean;
  isClosed(): boolean;
  isFeatureEnabled(): boolean;
  scheduleShutdown(seconds: number): void;
}
