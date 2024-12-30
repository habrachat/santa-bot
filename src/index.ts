import SSHChatBot from './lib/SSHChatBot.ts';
import { config, GAME_CONFIG } from './config.ts';
import GameManager from './services/GameManager.ts';

class GameBot {
  bot: SSHChatBot;
  gameManager: GameManager;

  constructor() {
    this.bot = new SSHChatBot(config);
    this.gameManager = new GameManager(this.bot);
    this.setupEventHandlers();
    this.startEventLoop();
  }

  setupEventHandlers() {
    this.bot.on('message', (nickname, message) => {
      console.log(`Message from ${nickname}: ${message}`);
      this.gameManager.handleMessage(nickname, message);
    });

    this.bot.on('event', (event) => {
      console.log(`Event: ${event}`);
    });

    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
  }

  handleShutdown(signal: string) {
    console.log(`${signal} signal received.`);
    this.gameManager.saveProfiles();
    process.exit(0);
  }

  startEventLoop() {
    setInterval(() => {
      this.gameManager.saveProfiles();
      this.gameManager.updateActivity();
      this.gameManager.spawnRandomEvent();
    }, GAME_CONFIG.EVENT_INTERVAL);
  }

  start() {
    this.bot.connect();
  }
}

const gameBot = new GameBot();
gameBot.start();
