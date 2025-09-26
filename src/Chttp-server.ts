import http, { IncomingMessage, ServerResponse } from "http";
import url from "url";
import { CONFIG } from "./helper/appContext";
import WebsocketServer from "./Cwebsocket-server";
import { AuthService } from "./Cauth-service";
import { BandwidthHandler } from "./Cbandwidth-handler";
import { AccountManager } from "./Caccount-manager";
import { admin } from './Clogin-server-firebase';

export interface NetworkDetails {
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

class HTTPServer {
  private __host: string;
  private __port: number;
  private __socketId: number = 0;
  private __server: http.Server;
  private __status: typeof CONFIG.SERVER.STATUS[keyof typeof CONFIG.SERVER.STATUS];
  public websocketServer: WebsocketServer;
  public accountManager: AccountManager;
  private authService: AuthService;
  private bandwidthHandler: BandwidthHandler;

  constructor(host: string, port: number) {
    /*
     * Class HTTPServer
     * Wrapper for NodeJS HTTP server to host the websocket server
     */

    this.__host = host;
    this.__port = port;

    this.websocketServer = new WebsocketServer();
    this.authService = new AuthService();
    this.bandwidthHandler = new BandwidthHandler();
    this.accountManager = new AccountManager();
    this.__server = http.createServer();

    this.__server.timeout = 5000;

    this.websocketServer.websocket.on(
      "wsClientError",
      this.__handleClientError.bind(this)
    );

    this.__server.on("close", this.__handleClose.bind(this));
    this.__server.on("clientError", this.__handleClientError.bind(this));
    this.__server.on("connection", this.__handleConnection.bind(this));
    this.__server.on("error", this.__handleError.bind(this));
    this.__server.on("listening", this.__handleListening.bind(this));
    this.__server.on("request", this.__handleRequest.bind(this));
    this.__server.on("timeout", this.__handleTimeout.bind(this));
    this.__server.on("upgrade", this.__handleUpgrade.bind(this));

    this.__status = CONFIG.SERVER.STATUS.CLOSED;
  }



  public close(): void {
    if (this.__status !== CONFIG.SERVER.STATUS.OPEN) return;

    console.log("The HTTP server has started to close.");

    this.websocketServer.close();
    this.__server.closeAllConnections();
    this.__server.close();
  }

  public getDataDetails(): NetworkDetails {
    return {
      websocket: this.websocketServer.getDataDetails(),
      bandwidth: this.bandwidthHandler.getBandwidth(),
    };
  }

  public listen(): void {
    if (this.__status !== CONFIG.SERVER.STATUS.CLOSED) return;

    this.__status = CONFIG.SERVER.STATUS.OPENING;
    this.__server.listen(this.__port, this.__host);
  }

  private __handleRequest(request: IncomingMessage, response: ServerResponse): void {
    const code = this.__validateHTTPRequest(request);

    if (code !== null) {
      return this.__generateRawHTTPResponse(request.socket, code);
    }

    this.__generateRawHTTPResponse(request.socket, 426);
  }

  private __validateHTTPRequest(request: IncomingMessage): number | null {
    if (request.httpVersion === "0.9" || request.httpVersion === "1.0") return 505;
    if (request.method !== "GET") return 405;
    if (url.parse(request.url || "").pathname !== "/") return 404;

    return null;
  }

  private __handleUpgrade(request: IncomingMessage, socket: any, head: Buffer): void {
    const code = this.__validateHTTPRequest(request);
    if (code !== null) {
      return this.__generateRawHTTPResponse(socket, code);
    }

    let token: string | null = null;
    let characterId: number | null = null;

    try {
      const reqUrl = new URL(request.url || "", `http://${request.headers.host}`);
      token = reqUrl.searchParams.get("token");
      characterId = parseInt(reqUrl.searchParams.get("characterId") || "", 10);
    } catch {
      return this.__generateRawHTTPResponse(socket, 400);
    }

    if (!token || isNaN(characterId!)) {
      return this.__generateRawHTTPResponse(socket, 400);
    }

    admin.auth().verifyIdToken(token)
      .then(decoded => {
        // ✅ Token is valid, proceed with upgrade
        this.websocketServer.upgrade(request, socket, head, characterId!, decoded.uid);
      })
      .catch(err => {
        console.error("❌ Firebase token verification failed:", err);
        this.__generateRawHTTPResponse(socket, 401); // Unauthorized
      });
  }

  private __handleConnection(socket: any): void {
    socket.id = this.__socketId++;

    console.log(
      `Connected TCP socket with identifier ${socket.id} from ${socket.address().address}.`
    );

    socket.on("close", this.__handleSocketClose.bind(this, socket));

    if (CONFIG.LOGGING.NETWORK_TELEMETRY) {
      this.bandwidthHandler.monitorSocket(socket);
    }
  }

  private __generateRawHTTPResponse(socket: any, code: number): void {
    console.log(
      `Ending socket request with identifier ${socket.id} with status code ${code}.`
    );

    socket.write(
      `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r\nConnection: close\r\n\r\n`
    );
    socket.destroy();
  }

  private __handleClientError(error: Error, socket: any): void {
    this.__generateRawHTTPResponse(socket, 400);
  }

  private __handleSocketClose(socket: any): void {
    console.log(`Disconnected TCP socket with identifier ${socket.id}.`);
  }

  private __handleTimeout(socket: any): void {
    this.__generateRawHTTPResponse(socket, 408);
  }

  private __handleError(error: NodeJS.ErrnoException): void {
    if (error.code === "EADDRINUSE") {
      console.log(
        "Could not start the HTTP server: the address or port is already in use."
      );
    }
  }

  private __handleListening(): void {
    this.__status = CONFIG.SERVER.STATUS.OPEN;

    console.log(
      `The HTTP gameserver is listening for connections on ${this.__host}:${this.__port}.`
    );
  }

  private __handleClose(): void {
    this.__status = CONFIG.SERVER.STATUS.CLOSED;

    console.log("The HTTP Server stopped listening for connections.");
  }
}

export default HTTPServer;
