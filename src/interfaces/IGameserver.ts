import { IDatabase } from "./IDatabase";
import { IGameLoop } from "./IGameloop";
import { IHTTPServer } from "./IHttp-server";
import { IIPCSocket } from "./IIpcsocket";
import { IWorld } from "./IWorld";
import { AccountDatabaseGrouped } from "../Caccount-database-grouped";

export interface IGameServer {
  database: IDatabase;
  accountDatabase: AccountDatabaseGrouped;
  world: IWorld;
  gameLoop: IGameLoop;
  server: IHTTPServer;
  IPCSocket: IIPCSocket;

  initialize(): void;
  shutdown(): void;
  setServerStatus(serverStatus: string): void;
  isShutdown(): boolean;
  isClosed(): boolean;
  isMaintenance(): boolean;
  isFeatureEnabled(): boolean;
  scheduleShutdown(seconds: number): void;
  cancelShutdown(): void;
  reopen(): void;
  logoutNonAdminPlayers(seconds: number): void;
  getStatusInfo(): {
    status: string;
    playersOnline: number;
    uptime: number | null;
    activeMonsters: number;
    worldTime: string;
  };
}
