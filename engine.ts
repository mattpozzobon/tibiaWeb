import GameServer from './src/Cgameserver';
import { CONFIG, getDataFile, initializeGameServer } from './src/helper/appContext';

if (require.main === module) {

  console.log('Starting NodeJS Forby Open Tibia Server');
  console.log('Creating server with version: ', CONFIG.SERVER.CLIENT_VERSION);
  console.log('Setting data directory to ', getDataFile(''));

  const gameServer = initializeGameServer(new GameServer(CONFIG));
  gameServer.initialize();

  console.log('GameServer initialized successfully!');
}
