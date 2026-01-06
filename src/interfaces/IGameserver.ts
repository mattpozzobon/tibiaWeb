import { IDatabase } from "./IDatabase";
import { IGameLoop } from "./IGameloop";
import { IHTTPServer } from "./IHttp-server";
import { IIPCSocket } from "./IIpcsocket";
import { IWorld } from "./IWorld";
import { ServerStatusManager } from "../server/server-status-manager";
import { ShutdownManager } from "../server/shutdown-Manager";
import { AccountDatabaseGrouped } from "database/account-database-grouped";

export interface IGameServer {
  database: IDatabase;
  accountDatabase: AccountDatabaseGrouped;
  world: IWorld;
  gameLoop: IGameLoop;
  server: IHTTPServer;
  IPCSocket: IIPCSocket;
  statusManager: ServerStatusManager;
  shutdownManager: ShutdownManager;

  initialize(): void;
  getStatusInfo(): {
    status: string;
    playersOnline: number;
    uptime: number | null;
    worldTime: string;
    scheduledShutdownTime: string | null;
  };
}
