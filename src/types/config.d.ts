export interface Config {
    HMAC: {
      SHARED_SECRET: string;
    };
    LOGIN: {
      PORT: number;
      HOST: string;
      TOKEN_VALID_MS: number;
    };
    IPC: {
      RECONNECT_MS: number;
      HOST: string;
      PORT: number;
      SOCKET: string;
    };
    LOGGING: {
      INTERVAL: number;
      NETWORK_TELEMETRY: boolean;
      FILEPATH: string;
    };
    DATABASE: {
      ACCOUNT_DATABASE: string;
      DEFAULT_CHARACTER: Character;
      DEFAULT_CHARACTER0: Character;
      DEFAULT_CHARACTER1: Character;
      DEFAULT_CHARACTER2: Character;
      DEFAULT_CHARACTER3: Character;
      DEFAULT_CHARACTER4: Character;
      DEFAULT_CHARACTER5: Character;
    };
    SERVER: {
      COMPRESSION: {
        ENABLED: boolean;
        THRESHOLD: number;
        LEVEL: number;
      };
      STATUS: {
        OPEN: string;
        OPENING: string;
        CLOSING: string;
        CLOSED: string;
        MAINTENANCE: string;
      };
      ON_ALREADY_ONLINE: string;
      EXTERNAL_HOST: string;
      VERSION: string;
      CLIENT_VERSION: string;
      DATE: string;
      PORT: number;
      HOST: string;
      ALLOW_MAXIMUM_CONNECTIONS: number;
      MS_TICK_INTERVAL: number;
      MS_SHUTDOWN_SCHEDULE: number;
      MAX_PACKET_SIZE: number;
      SOCKET_TIMEOUT_MS?: number;
    };
    WORLD: {
      MAXIMUM_STACK_COUNT: number;
      GLOBAL_COOLDOWN_MS: number;
      WORLD_FILE: string;
      IDLE: {
        WARN_SECONDS: number;
        KICK_SECONDS: number;
      };
      CHUNK: {
        WIDTH: number;
        HEIGHT: number;
        DEPTH: number;
      };
      CLOCK: {
        SPEED: number;
        START: string;
      };
      SPAWNS: {
        ENABLED: boolean;
      };
      NPCS: {
        ENABLED: boolean;
      };
    };
  }
  
interface Character {
    ENABLED: boolean;
    ACCOUNT: string;
    PASSWORD: string;
    SEX: string;
    NAME: string;
    ROLE: number;
}
  