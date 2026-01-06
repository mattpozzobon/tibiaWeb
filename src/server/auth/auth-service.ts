import { createHmac } from "crypto";
import { CONFIG } from "../../helper/appContext";

export class AuthService {
  private readonly sharedSecret: string;

  constructor() {
    /*
     * Class AuthService
     * Service responsible for player authentication
     *
     * API:
     * AuthService.authenticate(token: string): string | null - Returns the name of the account if the token is valid.
     */

    this.sharedSecret = CONFIG.HMAC.SHARED_SECRET;

    if (this.sharedSecret === "0000000000000000000000000000000000000000000000000000000000000000") {
      console.warn("The default HMAC secret is used. This is a security vulnerability in production environments.");
    }
  }

  public authenticate(token: string): string | null {
    /*
     * Function AuthService.authenticate
     * Authenticates a client request with a token
     */

    const payload = this.parseToken(token);

    if (!payload) return null;

    if (!this.verifyLoginToken(payload)) return null;

    if (payload.expire <= Date.now()) return null;

    return payload.name; // Token verified successfully
  }

  private parseToken(token: string): Record<string, any> | null {
    /*
     * Function AuthService.parseToken
     * Attempts to parse the HMAC token to JSON
     */

    const decodedString = Buffer.from(token, "base64").toString();

    try {
      return JSON.parse(decodedString);
    } catch (error) {
      return null;
    }
  }

  private verifyLoginToken(payload: Record<string, any>): boolean {
    /*
     * Function AuthService.verifyLoginToken
     * Verifies the passed HMAC token and checks that it was signed by the login server
     */

    if (!payload || typeof payload !== "object") return false;

    if (!payload.name || !payload.expire || !payload.hmac) return false;

    const expectedHmac = createHmac("sha256", this.sharedSecret)
      .update(`${payload.name}${payload.expire}`)
      .digest("hex");

    return payload.hmac === expectedHmac;
  }
}
