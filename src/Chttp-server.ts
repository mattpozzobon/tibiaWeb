import http, { IncomingMessage, ServerResponse } from "http";
import url from "url";
import { CONFIG, getGameServer } from "./helper/appContext";
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
    this.__server.timeout = 0;            // disables inactivity timeout on sockets
    this.__server.keepAliveTimeout = 0;   // default is 5s in Node -> can bite you
    this.__server.requestTimeout = 0;     // Node 20 has this (default 300s)
    this.__server.headersTimeout = 0;     // Node 20 has this (default 60s)


    this.websocketServer.websocket.on("wsClientError",this.__handleClientError.bind(this));

    this.__server.on("close", this.__handleClose.bind(this));
    this.__server.on("clientError", this.__handleClientError.bind(this));
    this.__server.on("connection", this.__handleConnection.bind(this));
    this.__server.on("error", this.__handleError.bind(this));
    this.__server.on("listening", this.__handleListening.bind(this));
    this.__server.on("request", this.__handleRequest.bind(this));
    //this.__server.on("timeout", this.__handleTimeout.bind(this));
    this.__server.on("upgrade", this.__handleUpgrade.bind(this));

    this.__status = CONFIG.SERVER.STATUS.CLOSED;
  }

  public close(): void {
    if (this.__status !== CONFIG.SERVER.STATUS.OPEN) return;

    console.log("The HTTP server has started to close.");

    // Set status to CLOSED immediately to prevent new connections
    this.__status = CONFIG.SERVER.STATUS.CLOSED;

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
    const parsedUrl = url.parse(request.url || "");
    const pathname = parsedUrl.pathname;

    // Handle /api/status endpoint
    if (pathname === "/api/status") {
      return this.__handleStatusRequest(request, response);
    }

    // Original validation for root path
    const code = this.__validateHTTPRequest(request);

    if (code !== null) {
      return this.__generateRawHTTPResponse(request.socket, code);
    }

    this.__generateRawHTTPResponse(request.socket, 426);
  }

  private __handleStatusRequest(request: IncomingMessage, response: ServerResponse): void {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      response.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      response.end();
      return;
    }

    if (request.method !== "GET") {
      return this.__sendJSONResponse(response, 405, { error: "Method not allowed" });
    }

    if (request.httpVersion === "0.9" || request.httpVersion === "1.0") {
      return this.__sendJSONResponse(response, 505, { error: "HTTP version not supported" });
    }

    try {
      const statusInfo = getGameServer().getStatusInfo();
      this.__sendJSONResponse(response, 200, statusInfo);
    } catch (error) {
      console.error("Error getting server status:", error);
      this.__sendJSONResponse(response, 500, { error: "Internal server error" });
    }
  }

  private __sendJSONResponse(response: ServerResponse, statusCode: number, data: any): void {
    const json = JSON.stringify(data);
    response.writeHead(statusCode, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // Allow CORS for frontend
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    response.end(json);
  }

  private __validateHTTPRequest(request: IncomingMessage): number | null {
    if (request.httpVersion === "0.9" || request.httpVersion === "1.0") return 505;
    if (request.method !== "GET") return 405;
    if (url.parse(request.url || "").pathname !== "/") return 404;

    return null;
  }

  private __handleUpgrade(request: IncomingMessage, socket: any, head: Buffer): void {
    socket.setTimeout(0);
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 15000);
  
    // Check if this is an API endpoint - API endpoints should not be WebSocket upgrades
    const parsedUrl = url.parse(request.url || "");
    const pathname = parsedUrl.pathname;
    
    if (pathname && pathname.startsWith("/api/")) {
      // API endpoints are not WebSocket upgrades - reject with 400
      return this.__generateRawHTTPResponse(socket, 400);
    }

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

    // Verify Firebase token first, then check server status (allows god bypass)
    admin.auth().verifyIdToken(token)
      .then(decoded => {
        // Check if server is closed, shutting down, or in maintenance - but allow role > 1 to bypass
        const gameServer = getGameServer();
        if (gameServer.isClosed() || gameServer.isShutdown() || gameServer.isMaintenance()) {
          // Load character data to check if player has role > 1
          this.websocketServer.accountDatabase.getCharacterByIdForUser(characterId!, decoded.uid, (error, result) => {
            if (error || !result) {
              return this.__generateRawHTTPResponse(socket, 503); // Character not found
            }
            
            // Check if player has role > 1 (senior tutors, gamemasters, gods) - allow them to connect
            const hasHighRole = result.role !== undefined && result.role !== null && result.role > 1;
            if (!hasHighRole) {
              return this.__generateRawHTTPResponse(socket, 503); // Not high role, reject
            }
            
            // Player with role > 1 - allow connection even when server is closed/maintenance
            this.websocketServer.websocket.handleUpgrade(request, socket, head, (ws: any) => {
              const s = ws._socket;
              s.setTimeout(0);
              s.setNoDelay(true);
              s.setKeepAlive(true, 15000);
              this.websocketServer.websocket.emit("connection", ws, request, characterId!, decoded.uid);
            });
          });
          return;
        }
        
        // Server is open - proceed normally
        this.websocketServer.websocket.handleUpgrade(request, socket, head, (ws: any) => {

          // 🔥 THIS is the missing Fly fix
          const s = ws._socket;
          s.setTimeout(0);
          s.setNoDelay(true);
          s.setKeepAlive(true, 15000);

          this.websocketServer.websocket.emit("connection", ws, request, characterId!, decoded.uid);
        });
      })
      .catch(err => {
        console.error("❌ Firebase token verification failed:", err);
        this.__generateRawHTTPResponse(socket, 401);
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
