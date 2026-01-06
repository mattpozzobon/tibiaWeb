import GameServer from './src/server/gameserver';
import { CONFIG, getDataFile, initializeGameServer } from './src/helper/appContext';

if (require.main === module) {

  console.log('Starting NodeJS Forby Open Tibia Server');
  console.log('Creating server with version: ', CONFIG.SERVER.CLIENT_VERSION);
  console.log('Setting data directory to ', getDataFile(''));

  const gameServer = initializeGameServer(new GameServer());
  gameServer.initialize();

  console.log('GameServer initialized successfully!');
}
