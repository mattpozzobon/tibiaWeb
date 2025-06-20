"use strict";
import * as http from "http";
import * as url from "url";
import { CONFIG } from "./helper/appContext";
import { AccountDatabase } from "./Caccount-database";
import { admin } from './Clogin-server-firebase';

interface QueryObject {
  token?: string; // Firebase ID token
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

  private async __handleRequest(request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.end();
      return;
    }

    const parsedUrl = url.parse(request.url || "", true);
    const pathname = parsedUrl.pathname || "";
    const query = parsedUrl.query as QueryObject;

    const idToken = query.token;
    if (!idToken) {
      response.statusCode = 401;
      response.end("Missing token");
      return;
    }

    let decoded;
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
      return this.__handleHandshake(uid, email, idToken, response);
    }

    if (pathname === "/characters" && request.method === "GET") {
      return this.__handleGetCharacters(uid, response);
    }

    if (pathname === "/characters/create" && request.method === "POST") {
      return this.__handleCreateCharacter(request, uid, response);
    }

    response.statusCode = 404;
    response.end("Not found");
  }

  private __handleHandshake(uid: string, email: string | null, idToken: string, response: http.ServerResponse): void {
    this.accountDatabase.getAccountByUid(uid, (err, row) => {
      if (err) {
        console.error("DB error:", err);
        response.statusCode = 500;
        response.end();
        return;
      }

      const proceed = () => {
        const responsePayload = {
          token: idToken,
          gameHost: CONFIG.SERVER.EXTERNAL_HOST,
          loginHost: `${this.__host}:${this.__port}`,
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
    request.on("data", chunk => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        const name = parsed.name?.trim();
        const sex = parsed.sex;

        if (!name || !sex || !["male", "female"].includes(sex)) {
          response.statusCode = 400;
          response.end("Invalid character data");
          return;
        }

        this.accountDatabase.createCharacterForUid(uid, name, sex, 1, (errCode, newCharacterId) => {
          if (errCode) {
            response.statusCode = 500;
            response.end("Failed to create character");
            return;
          }

          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ characterId: newCharacterId }));
        });
      } catch {
        response.statusCode = 400;
        response.end("Invalid JSON");
      }
    });
  }

}

export default LoginServer;
