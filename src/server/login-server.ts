"use strict";
import * as http from "http";
import * as url from "url";
import { CONFIG, getGameServer } from "../helper/appContext";
import { AccountDatabaseGrouped } from "../database/account-database-grouped";
import { admin } from "./auth/login-server-firebase";

interface QueryObject {
  token?: string;
  [key: string]: any;
}

class LoginServer {
  private __host: string;
  private __port: number;
  public accountDatabase: AccountDatabaseGrouped;
  public server: http.Server;

  constructor() {
    this.__host = process.env.LOGIN_HOST || CONFIG.LOGIN.HOST;
    this.__port = Number(process.env.LOGIN_PORT || CONFIG.LOGIN.PORT);

    // ✅ Persisted DB on Fly (or local default)
    this.accountDatabase = new AccountDatabaseGrouped(process.env.ACCOUNT_DATABASE || CONFIG.DATABASE.ACCOUNT_DATABASE);

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

    process.on("SIGINT", this.server.close.bind(this.server));
    process.on("SIGTERM", this.server.close.bind(this.server));
  }

  private __handleClose(): void {
    this.accountDatabase.close();
  }

  private __handleListening(): void {
    console.log("The login server is listening for connections on %s:%s.", this.__host, this.__port);
  }

  public initialize(): void {
    this.server.listen(this.__port, this.__host);
  }

  private async __handleRequest(
    request: http.IncomingMessage,
    response: http.ServerResponse
  ): Promise<void> {
    // ---- CORS (server-side) ----
    const origin = request.headers.origin;
  
    const allowedOrigins = new Set<string>([
      "https://emperia.netlify.app",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:1338",
      
    ]);
  
    if (origin && allowedOrigins.has(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
    } else {
      // Allow non-browser callers (no Origin) and keep things permissive if desired
      response.setHeader("Access-Control-Allow-Origin", "*");
    }
  
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.setHeader("Access-Control-Max-Age", "86400");
  
    // ---- Routing ----
    const parsedUrl = url.parse(request.url || "", true);
    const pathname = parsedUrl.pathname || "";
    const query = parsedUrl.query as QueryObject;

    // Helpful while debugging - simplified one-line log
    console.log(`LOGIN: ${request.method} ${pathname}${origin ? ` from ${origin}` : ''}`);

    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.end();
      return;
    }
  
    // ✅ allow health without token
    if (pathname === "/health" && request.method === "GET") {
      response.statusCode = 200;
      response.setHeader("Content-Type", "text/plain");
      response.end("ok");
      return;
    }

    // ✅ allow /api/status without token (public endpoint)
    if (pathname === "/api/status" && request.method === "GET") {
      try {
        const gameServer = getGameServer();
        const statusInfo = gameServer.getStatusInfo();
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify(statusInfo));
      } catch (error: any) {
        this.__sendFallbackStatus(response);
      }
      return;
    }

    const idToken = query.token;
    if (!idToken) {
      response.statusCode = 401;
      response.end("Missing token");
      return;
    }
  
    let decoded: any;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch {
      response.statusCode = 401;
      response.end("Invalid token");
      return;
    }
  
    const uid = decoded.uid;
    const email = decoded.email || null;
  
    if (pathname === "/" && request.method === "GET") {
      this.__handleHandshake(request, uid, email, idToken, response);
      return;
    }
  
    if (pathname === "/characters" && request.method === "GET") {
      this.__handleGetCharacters(uid, response);
      return;
    }
  
    if (pathname === "/characters/create" && request.method === "POST") {
      this.__handleCreateCharacter(request, uid, response);
      return;
    }
  
    response.statusCode = 404;
    response.end("Not found");
  }  

  private __handleHandshake(
    request: http.IncomingMessage,
    uid: string,
    email: string | null,
    idToken: string,
    response: http.ServerResponse
  ): void {
    this.accountDatabase.getAccountByUid(uid, (err, row) => {
      if (err) {
        console.error("DB error:", err);
        response.statusCode = 500;
        response.end();
        return;
      }
  
      const proceed = () => {
        const externalGameHost = process.env.EXTERNAL_HOST || CONFIG.SERVER.EXTERNAL_HOST;
  
        // ✅ Use public host from proxy headers (Fly sets these)
        const forwardedHost = request.headers["x-forwarded-host"];
        const hostHeader = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost)
          || request.headers.host
          || "";
  
        const responsePayload = {
          token: idToken,
          gameHost: externalGameHost, // emperia-server.fly.dev:2222
          loginHost: hostHeader,      // emperia-server.fly.dev  (NOT 0.0.0.0:1338)
        };
  
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify(responsePayload));
      };
  
      if (!row) {
        this.accountDatabase.createAccountForUid(uid, email, createErr => {
          if (createErr) {
            response.statusCode = 500;
            response.end();
            return;
          }
          proceed();
        });
      } else {
        proceed();
      }
    });
  }

  private __handleGetCharacters(uid: string, response: http.ServerResponse): void {
    this.accountDatabase.getCharactersForUid(uid, (err, characters) => {
      if (err) {
        console.error("Character list error:", err);
        response.statusCode = 500;
        response.end("Database error");
        return;
      }
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify(characters));
    });
  }

  private __handleCreateCharacter(request: http.IncomingMessage, uid: string, response: http.ServerResponse): void {
    let body = "";
    request.on("data", chunk => { body += chunk; });
    request.on("end", () => {
      try {
        const parsed = JSON.parse(body);

        let name: string | undefined = typeof parsed.name === "string" ? parsed.name : undefined;
        if (name) name = name.trim().replace(/\s+/g, " ");
        const sex = parsed.sex;

        if (!name || !sex || !["male", "female"].includes(sex)) {
          response.statusCode = 400;
          response.end("Invalid character data");
          return;
        }

        if (name.length > 15) {
          response.statusCode = 400;
          response.end("Name too long (max 20)");
          return;
        }

        if (!/^[A-Za-z ]+$/.test(name)) {
          response.statusCode = 400;
          response.end("Invalid characters in name");
          return;
        }

        if (!/[A-Za-z]/.test(name)) {
          response.statusCode = 400;
          response.end("Name must contain letters");
          return;
        }

        this.accountDatabase.getCharacterByName(name, (lookupErr, existing) => {
          if (lookupErr) {
            response.statusCode = 500;
            response.end("Database error");
            return;
          }

          if (existing) {
            response.statusCode = 409;
            response.end("Name already exists");
            return;
          }

          this.accountDatabase.createCharacterForUid(uid, name!, sex, 1, (errCode, newCharacterId) => {
            if (errCode) {
              response.statusCode = 500;
              response.end("Failed to create character");
              return;
            }

            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ characterId: newCharacterId }));
          });
        });
      } catch {
        response.statusCode = 400;
        response.end("Invalid JSON");
      }
    });
  }

  private __sendFallbackStatus(response: http.ServerResponse): void {
    const fallbackStatus = {
      status: "closed",
      playersOnline: 0,
      uptime: null,
      activeMonsters: 0,
      worldTime: "00:00",
      error: "Game server not available"
    };
    console.log("✅ Returning fallback status");
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(fallbackStatus));
  }
}

export default LoginServer;
