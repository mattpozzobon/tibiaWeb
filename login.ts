"use strict";
import LoginServer from "./src/Clogin-server";

if(require.main === module) {
  console.log("Starting NodeJS Forby Open Tibia Login Server.");

  // Start
  const loginServer = new LoginServer();
  loginServer.initialize();
  
}
