import { IDatabase } from "./IDatabase";
import { IGameLoop } from "./IGameloop";
import { IHTTPServer } from "./IHttp-server";
import { IIPCSocket } from "./IIpcsocket";
import { IWorld } from "./IWorld";
import { AccountDatabaseGrouped } from "../Caccount-database-grouped";
import { ServerStatusManager } from "../Cserver-status-manager";

export interface IGameServer {
  database: IDatabase;
  accountDatabase: AccountDatabaseGrouped;
  world: IWorld;
  gameLoop: IGameLoop;
  server: IHTTPServer;
  IPCSocket: IIPCSocket;
  statusManager: ServerStatusManager;

  initialize(): void;
  shutdown(): void;
  scheduleShutdown(seconds: number): void;
  cancelShutdown(): void;
  reopen(): void;
  logoutNonAdminPlayers(seconds: number): void;
  getStatusInfo(): {
    status: string;
    playersOnline: number;
    uptime: number | null;
    worldTime: string;
  };
}
