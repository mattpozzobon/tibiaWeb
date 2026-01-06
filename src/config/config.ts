/**
 * Configuration values
 * Default values can be overridden by environment variables
 */

export const CONFIG = {
  HMAC: {
    SHARED_SECRET: "0000000000000000000000000000000000000000000000000000000000000000",
  },
  LOGIN: {
    PORT: 1338,
    HOST: "127.0.0.1",
    TOKEN_VALID_MS: 3000,
  },
  IPC: {
    PORT: 2000,
    HOST: "127.0.0.1",
    RECONNECT_MS: 1000,
    SOCKET: "game.sock",
  },
  LOGGING: {
    INTERVAL: 20,
    NETWORK_TELEMETRY: true,
    FILEPATH: "server.log",
  },
  DATABASE: {
    ACCOUNT_DATABASE: "accounts.db",
    DEFAULT_CHARACTER: {
      ENABLED: true,
      ACCOUNT: "111111",
      PASSWORD: "tibia",
      SEX: "male",
      NAME: "God",
      ROLE: 5,
    },
    DEFAULT_CHARACTER0: {
      ENABLED: true,
      ACCOUNT: "0",
      PASSWORD: "0",
      SEX: "female",
      NAME: "0",
      ROLE: 0,
    },
    DEFAULT_CHARACTER1: {
      ENABLED: true,
      ACCOUNT: "1",
      PASSWORD: "1",
      SEX: "female",
      NAME: "1",
      ROLE: 0,
    },
    DEFAULT_CHARACTER2: {
      ENABLED: true,
      ACCOUNT: "2",
      PASSWORD: "2",
      SEX: "male",
      NAME: "2",
      ROLE: 0,
    },
    DEFAULT_CHARACTER3: {
      ENABLED: true,
      ACCOUNT: "3",
      PASSWORD: "3",
      SEX: "male",
      NAME: "3",
      ROLE: 0,
    },
    DEFAULT_CHARACTER4: {
      ENABLED: true,
      ACCOUNT: "4",
      PASSWORD: "4",
      SEX: "male",
      NAME: "4",
      ROLE: 0,
    },
    DEFAULT_CHARACTER5: {
      ENABLED: true,
      ACCOUNT: "5",
      PASSWORD: "5",
      SEX: "male",
      NAME: "5",
      ROLE: 0,
    },
  },
  SERVER: {
    COMPRESSION: {
      ENABLED: true,
      THRESHOLD: 1024,
      LEVEL: 1,
    },
    STATUS: {
      OPEN: "OPEN",
      OPENING: "OPENING",
      CLOSING: "CLOSING",
      CLOSED: "CLOSED",
      MAINTENANCE: "MAINTENANCE",
    },
    ON_ALREADY_ONLINE: "replace",
    EXTERNAL_HOST: "127.0.0.1:2222",
    VERSION: "0.0.0",
    CLIENT_VERSION: "1098",
    DATE: "2022-03-24",
    PORT: 2222,
    HOST: "127.0.0.1",
    ALLOW_MAXIMUM_CONNECTIONS: 50,
    MS_TICK_INTERVAL: 10,
    MS_SHUTDOWN_SCHEDULE: 10000,
    MAX_PACKET_SIZE: 1024,
    SOCKET_TIMEOUT_MS: 120000,
    SCHEDULED_SHUTDOWN: {
      ENABLED: true,
      TIME: "09:35", // Format: "HH:MM" in 24-hour format
      WARNING_MINUTES: 5, // Warn players X minutes before shutdown
    },
  },
  WORLD: {
    MAXIMUM_STACK_COUNT: 100,
    GLOBAL_COOLDOWN_MS: 1000,
    WORLD_FILE: "Tibia1098.otbm",
    IDLE: {
      WARN_SECONDS: 300,
      KICK_SECONDS: 60,
    },
    CHUNK: {
      WIDTH: 18,
      HEIGHT: 7,
      DEPTH: 8,
    },
    CLOCK: {
      SPEED: 10,
      START: "08:00",
    },
    SPAWNS: {
      ENABLED: false,
    },
    NPCS: {
      ENABLED: false,
    },
  },
};

// Export the type
export type Config = typeof CONFIG;
