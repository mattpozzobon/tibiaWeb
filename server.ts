import GameServer from './src/gameserver';
import LoginServer from './src/login-server';
import { CONFIG, getDataFile, initializeGameServer } from './src/helper/appContext';

if (require.main === module) {
  console.log('Starting NodeJS Forby Open Tibia Server (Combined)');
  console.log('Creating server with version: ', CONFIG.SERVER.CLIENT_VERSION);
  console.log('Setting data directory to ', getDataFile(''));

  // Initialize Game Server first
  const gameServer = initializeGameServer(new GameServer(CONFIG));
  gameServer.initialize();
  console.log('GameServer initialized successfully!');

  // Then start Login Server (which can now access GameServer via getGameServer())
  console.log('Starting Login Server...');
  const loginServer = new LoginServer();
  loginServer.initialize();
  console.log('Login Server initialized successfully!');

  console.log('All servers started successfully!');
}
