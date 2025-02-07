"use strict";

import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import * as http from "http";
import * as url from "url";
import { CONFIG } from "./helper/appContext";
import { AccountDatabase } from "./Caccount-database";

// Define an interface for the query object used in HTTP requests
interface QueryObject {
  account?: string;
  password?: string;
  name?: string;
  sex?: string;
  [key: string]: any;
}

// Declare CONFIG so TypeScript knows about it.
// Replace with actual types or import if available.


class LoginServer {
  private __host: string;
  private __port: number;
  public accountDatabase: AccountDatabase;
  public server: http.Server;

  constructor() {
    /*
     * Class LoginServer
     *
     * Wrapper for the Forby HTML5 Open Tibia Server.
     * Checks a database of accounts / bcrypt passwords and returns an HMAC token 
     * to be provided to the gameserver. The gameserver uses the validity of the HMAC token 
     * to allow a websocket connection and load the required account file.
     */

    // Save information (using CONFIG values)
    this.__host = CONFIG.LOGIN.HOST;
    this.__port = CONFIG.LOGIN.PORT;

    // Initialize the account database
    this.accountDatabase = new AccountDatabase(CONFIG.DATABASE.ACCOUNT_DATABASE);

    // Create the HTTP server and set up handlers
    this.server = http.createServer(this.__handleRequest.bind(this));
    this.server.on("listening", this.__handleListening.bind(this));
    this.server.on("close", this.__handleClose.bind(this));

    // Graceful close on SIGINT and SIGTERM
    process.on("SIGINT", this.server.close.bind(this.server));
    process.on("SIGTERM", this.server.close.bind(this.server));
  }

  private __handleClose(): void {
    /*
     * Callback fired when the HTTP server is closed.
     */
    this.accountDatabase.close();
  }

  private __handleListening(): void {
    /*
     * Callback fired when the HTTP server is listening.
     */
    console.log("The login server is listening for connections on %s:%s.", this.__host, this.__port);
  }

  public initialize(): void {
    /*
     * Starts the HTTP server and listens for incoming connections.
     */
    this.server.listen(this.__port, this.__host);
  }

  private __generateToken(name: string): { name: string; expire: number; hmac: string } {
    /*
     * Generates a simple HMAC token for the client to identify itself with.
     */
    const expire = Date.now() + CONFIG.LOGIN.TOKEN_VALID_MS;
    const hmac = crypto
      .createHmac("sha256", CONFIG.HMAC.SHARED_SECRET)
      .update(name + expire)
      .digest("hex");

    return { name, expire, hmac };
  }

  private __isValidCreateAccount(queryObject: QueryObject): boolean {
    /*
     * Returns true if the request to create an account is valid.
     */
    for (const property of ["account", "password", "name", "sex"]) {
      if (!Object.prototype.hasOwnProperty.call(queryObject, property)) {
        return false;
      }
    }

    // Accept only lower-case letters for the character name
    if (!/^[a-z]+$/.test(queryObject.name || "")) {
      return false;
    }

    // Must be "male" or "female"
    if (queryObject.sex !== "male" && queryObject.sex !== "female") {
      return false;
    }

    return true;
  }

  private __createAccount(queryObject: QueryObject, response: http.ServerResponse): void {
    /*
     * Calls the account database to create a new account if the request is valid.
     */
    if (!this.__isValidCreateAccount(queryObject)) {
      response.statusCode = 400;
      response.end();
      return;
    }

    this.accountDatabase.createAccount(queryObject, (error: any, accountObject: any) => {
      // Failure creating the account
      if (error !== null) {
        response.statusCode = error;
        response.end();
        return;
      }

      // Account created successfully
      response.statusCode = 201;
      response.end();
    });
  }

  private __handleRequest(request: http.IncomingMessage, response: http.ServerResponse): void {
    /*
     * Handles incoming HTTP requests.
     */
    // Enable CORS for JavaScript requests
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET, POST");

    // Only GET (for tokens) and POST (for account creation) are supported
    if (request.method !== "GET" && request.method !== "POST") {
      response.statusCode = 501;
      response.end();
      return;
    }

    // Parse the URL and querystring
    const requestObject = url.parse(request.url || "", true);

    if (requestObject.pathname !== "/") {
      response.statusCode = 404;
      response.end();
      return;
    }

    // If method is POST, create an account; otherwise, get account details
    if (request.method === "POST") {
      return this.__createAccount(requestObject.query, response);
    }

    return this.__getAccount(requestObject.query, response);
  }

  private __getAccount(queryObject: QueryObject, response: http.ServerResponse): void {
    // Account or password not supplied
    if (!queryObject.account || !queryObject.password) {
      response.statusCode = 401;
      response.end();
      return;
    }

    this.accountDatabase.getAccountCredentials(queryObject.account, (error: any, result: any) => {
      // Account does not exist
      if (result === undefined) {
        response.statusCode = 401;
        response.end();
        return;
      }

      // Compare submitted password with hashed password
      bcrypt.compare(queryObject.password!, result.hash, (error: any, isPasswordCorrect: boolean) => {
        if (error) {
          response.statusCode = 500;
          response.end();
          return;
        }
        if (!isPasswordCorrect) {
          response.statusCode = 401;
          response.end();
          return;
        }

        // Valid credentials; return a HMAC token and game server host
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            token: Buffer.from(JSON.stringify(this.__generateToken(queryObject.account!))).toString("base64"),
            host: CONFIG.SERVER.EXTERNAL_HOST,
          })
        );
      });
    });
  }
}

export default LoginServer;
