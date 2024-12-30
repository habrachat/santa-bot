export const config = {
  host: '127.0.0.1',
  port: 2222,
  username: 'santa',
  privateKeyPath: './id_ed25519',
};

export const GAME_CONFIG = {
  LOCALE: 'ru',
  COMMAND_PREFIX: '!',
  EVENT_INTERVAL: 30000,
  EVENT_SPAWN_CHANCE: 0.5,
  CATCH_EVENT_WEIGHT: 0.5,
  MIN_COINS_DROP: 1,
  MAX_COINS_DROP: 10,
  MIN_ACTIVITY_THRESHOLD: 3,
  ACTIVITY_DECAY_CHANCE: 0.2,
  ACTIVITY_DECAY_FACTOR: 2
};
