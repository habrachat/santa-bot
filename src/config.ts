import fs from 'fs';

interface Config {
  ssh: {
    host: string,
    port: number,
    username: string,
    privateKeyPath: string,
  },
  game: {
    LOCALE: string,
    COMMAND_PREFIX: string,
    EVENT_INTERVAL: number,
    CATCH_EVENT_WEIGHT: number,
    MIN_COINS_DROP: number,
    MAX_COINS_DROP: number,
    MIN_ACTIVITY_THRESHOLD: number,
    ACTIVITY_DECAY_CHANCE: number,
    ACTIVITY_DECAY_FACTOR: number,
    MAX_ENERGY_PER_STAGE: number,
    ENERGY_REFILL_INTERVAL: number
  }
}

const combined = JSON.parse(fs.readFileSync('./data/config.json', 'utf-8')) as Config;

export const config = combined.ssh;

export const GAME_CONFIG = combined.game;
