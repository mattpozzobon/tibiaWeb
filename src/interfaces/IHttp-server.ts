import { AccountManager } from "Caccount-manager";
import WebsocketServer from "Cwebsocket-server";

export interface INetworkDetails {
  websocket: {
    sockets: number;
  };
  bandwidth: {
    bytesRead: number;
    bytesWritten: number;
    bandwidthRead: number;
    bandwidthWritten: number;
  };
}

export interface IHTTPServer {
  websocketServer: WebsocketServer;
  accountManager: AccountManager;

  listen(): void;
  close(): void;
  getDataDetails(): INetworkDetails;
}
