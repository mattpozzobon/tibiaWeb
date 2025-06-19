"use strict";
import * as crypto from "crypto";
import * as http from "http";
import * as url from "url";
import { CONFIG } from "./helper/appContext";
import { AccountDatabase } from "./Caccount-database";
import { admin } from './Clogin-server-firebase';

interface QueryObject {
  token?: string;  // Firebase ID token
  [key: string]: any;
}

class LoginServer {
  private __host: string;
  private __port: number;
  public accountDatabase: AccountDatabase;
  public server: http.Server;

  constructor() {
    this.__host = CONFIG.LOGIN.HOST;
    this.__port = CONFIG.LOGIN.PORT;

    this.accountDatabase = new AccountDatabase(CONFIG.DATABASE.ACCOUNT_DATABASE);

    this.server = http.createServer((req, res) => {
      this.__handleRequest(req, res).catch(err => {
        console.error("Error in request handler:", err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end("Internal server error");
        }
      });
    });

    this.server.on("listening", this.__handleListening.bind(this));
    this.server.on("close", this.__handleClose.bind(this));

    // Graceful close on SIGINT and SIGTERM
    process.on("SIGINT", this.server.close.bind(this.server));
    process.on("SIGTERM", this.server.close.bind(this.server));
  }

  private __handleClose(): void {
    // Callback fired when the HTTP server is closed.
    this.accountDatabase.close();
  }

  private __handleListening(): void {
    console.log("The login server is listening for connections on %s:%s.", this.__host, this.__port);
  }

  public initialize(): void {
    // Starts the HTTP server and listens for incoming connections.
    this.server.listen(this.__port, this.__host);
  }

  private __generateToken(uid: string): { name: string; expire: number; hmac: string } {
    // Generates a simple HMAC token for the client to identify itself with.
    const expire = Date.now() + CONFIG.LOGIN.TOKEN_VALID_MS;
    const hmac = crypto
      .createHmac("sha256", CONFIG.HMAC.SHARED_SECRET)
      .update(uid + expire)
      .digest("hex");
    return { name: uid, expire, hmac };
  }

  private async __handleRequest(request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
    // Enable CORS for JavaScript requests
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight
    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.end();
      return;
    }

    // Parse the URL and querystring
    const parsedUrl = url.parse(request.url || "", true);
    const pathname = parsedUrl.pathname || "";

    // Only "/" is supported for login handshake
    if (pathname !== "/") {
      response.statusCode = 404;
      response.end();
      return;
    }

    // Only GET is used here (client calls fetch on `/?token=<ID_TOKEN>`)
    if (request.method !== "GET" && request.method !== "POST") {
      response.statusCode = 405;
      response.end();
      return;
    }

    // Extract Firebase ID token from query
    const queryObject = parsedUrl.query as QueryObject;
    const idToken = queryObject.token as string | undefined;
    if (!idToken) {
      response.statusCode = 401;
      response.end("Missing token");
      return;
    }

    // Verify Firebase ID token
    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (e: any) {
      response.statusCode = 401;
      response.end("Invalid token");
      return;
    }

    const firebaseUid = decoded.uid;
    const email = decoded.email || null;

    // Check or create DB record
    this.accountDatabase.getAccountByUid(firebaseUid, (err: Error | null, row: any) => {
      if (err) {
        console.error("DB error in getAccountByUid:", err);
        response.statusCode = 500;
        response.end();
        return;
      }

      const proceedWithHmac = () => {
        console.log('Login request for UID:', firebaseUid, 'Email:', email || 'N/A');
        const tokenObj = this.__generateToken(firebaseUid);
        const responsePayload = {
          token: Buffer.from(JSON.stringify(tokenObj)).toString("base64"),
          host: CONFIG.SERVER.EXTERNAL_HOST,
        };
        console.log("→ Responding with payload:", responsePayload);
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify(responsePayload));
      };

      if (!row) {
        // No existing record: create default character entry
        this.accountDatabase.createAccountForUid(firebaseUid, email, (createErr: number | null) => {
          if (createErr) {
            console.error("Error creating account record for new UID:", createErr);
            response.statusCode = 500;
            response.end();
            return;
          }
          // After creation, return HMAC
          proceedWithHmac();
        });
      } else {
        // Already exists: just return HMAC
        proceedWithHmac();
      }
    });
  }
}

export default LoginServer;
