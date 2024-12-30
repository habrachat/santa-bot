import fs from 'fs';
import { getRandomItem, formatCreatureDisplay, formatInventory } from '../utils/helpers.ts';
import { Creature } from '../models/Creature.ts';
import { Item, UserProfile } from '../models/UserProfile.ts';
import { I18nManager } from './I18nManager.ts';
import { config, GAME_CONFIG } from '../config.ts';
import items from '../data/items.ts';
import SSHChatBot from '../lib/SSHChatBot.ts';
import creatures from '../data/creatures.ts';

export default class GameManager {
  bot: SSHChatBot;
  userProfiles: { [key: string]: UserProfile } = {};
  items = items;
  creatures: Creature[] = [];
  i18n: I18nManager;
  activity = 0;
  activeCatchEvent: { creature: Creature, claimed: boolean } | null;
  activeCollectEvent: { collectable: Item | { coins: number }, claimed: boolean } | null;

  commands: { [key: string]: (nickname: string, ...attrs: string[]) => void } = {
    catch: this.handleCatchEvent,
    collect: this.handleCollectEvent,
    profile: this.showProfile,
    choose: this.chooseCreature,
    help: this.showHelp,
    battle: this.handleBattleRequest,
    accept: this.handleBattleAccept,
    decline: this.handleBattleDecline,
  };

  constructor(bot: SSHChatBot) {
    this.bot = bot;
    this.activeCatchEvent = null;
    this.activeCollectEvent = null;
    this.i18n = new I18nManager(GAME_CONFIG.LOCALE);
    this.loadProfiles();
    this.initializeCreatures();
  }

  loadProfiles() {
    try {
      const profiles = JSON.parse(fs.readFileSync('./data/profiles.json', 'utf-8'));
      
      for (const nickname of Object.keys(profiles)) {
        const newProfile = UserProfile.fromJSON(profiles[nickname]);
        this.userProfiles[nickname] = newProfile;
      };
    } catch (error) {
      console.error('Failed to load profiles:', error);
      this.userProfiles = {};
    }
  }

  saveProfiles() {
    fs.writeFileSync('./data/profiles.json', JSON.stringify(this.userProfiles, null, 2));
  }

  initializeCreatures() {
    this.creatures = creatures.map(c => new Creature(c.evolutions[0].name, c.evolutions[0].stage, c.evolutions[0].stats));
  }

  getOrCreateProfile(nickname: string) {
    if (!this.userProfiles[nickname]) {
      this.userProfiles[nickname] = new UserProfile();
    }
    return this.userProfiles[nickname];
  }

  handleMessage(nickname: string, message: string) {
    this.activity++;
    
    if (message.startsWith(GAME_CONFIG.COMMAND_PREFIX)) {
      const [command, ...args] = message.split(' ').map(arg => arg.replace(/[^A-z0-9\[\]]/g, ''));
      if (this.commands[command]) {
        console.log(`Resolving command "${command}" for ${nickname}`);
        this.commands[command].bind(this)(nickname, ...args);
        return;
      }

      if (command === GAME_CONFIG.COMMAND_PREFIX + 'use') {
        const [itemName, index] = args;
        this.useItem(nickname, itemName, parseInt(index, 10));
      }
    }
  }

  updateActivity() {
    this.activity = Math.max(0, this.activity - 1);
    if (this.activity < GAME_CONFIG.MIN_ACTIVITY_THRESHOLD) return;

    if (Math.random() > GAME_CONFIG.ACTIVITY_DECAY_CHANCE) {
      this.activity = Math.round(this.activity / GAME_CONFIG.ACTIVITY_DECAY_FACTOR);
    }
  }

  spawnRandomEvent() {
    if (this.activity < GAME_CONFIG.MIN_ACTIVITY_THRESHOLD) return;

    if (Math.random() > GAME_CONFIG.EVENT_SPAWN_CHANCE) return;

    if (Math.random() > GAME_CONFIG.CATCH_EVENT_WEIGHT) {
      if (!this.activeCatchEvent) this.announceCatchEvent();
    } else {
      if (!this.activeCollectEvent) this.announceCollectEvent();
    }
  }

  announceCatchEvent() {
    const creature = getRandomItem(this.creatures);
    this.activeCatchEvent = { creature, claimed: false };

    this.bot.send(this.i18n.t('events.wild_creature_appears', {
      name: creature.name
    }));
  }

  announceCollectEvent() {
    const coins = Math.floor(Math.random() * (GAME_CONFIG.MAX_COINS_DROP - GAME_CONFIG.MIN_COINS_DROP + 1)) + GAME_CONFIG.MIN_COINS_DROP;
    this.activeCollectEvent = {
      collectable: /* Math.random() < 0.5 ? getRandomItem(this.items) : */ { coins },
      claimed: false
    };

    this.bot.send(this.i18n.t('events.item_appears'));
  }

  handleCatchEvent(nickname: string) {
    if (this.activeCatchEvent && !this.activeCatchEvent.claimed) {
      this.activeCatchEvent.claimed = true;
      const creatureData = this.activeCatchEvent.creature;
      const profile = this.getOrCreateProfile(nickname);

      profile.addCreature(new Creature(
        creatureData.name,
        1,
        { ...creatureData.stats }
      ));

      this.bot.send(this.i18n.t('events.catch_success', {
        player: nickname,
        creature: creatureData.name
      }));

      this.activeCatchEvent = null;
    }
  }

  handleCollectEvent(nickname: string) {
    if (this.activeCollectEvent && !this.activeCollectEvent.claimed) {
      this.activeCollectEvent.claimed = true;
      const profile = this.getOrCreateProfile(nickname);
      const collectable = this.activeCollectEvent.collectable;

      if ('coins' in collectable) {
        profile.addCoins(collectable.coins);
        this.bot.send(this.i18n.t('events.collect_coins', {
          player: nickname,
          amount: collectable.coins
        }));
      } else {
        profile.addItem(collectable.name);
        this.bot.send(this.i18n.t('events.collect_item', {
          player: nickname,
          item: collectable.name
        }));
      }

      this.activeCollectEvent = null;
    }
  }

  useItem(nickname: string, itemName: string, creatureIndex: number) {
    const profile = this.getOrCreateProfile(nickname);
    const item = this.items.find(i => i.name === itemName);

    if (!item || !profile.items[itemName] || profile.items[itemName] <= 0) {
      this.bot.send(this.i18n.t('items.no_item', {
        player: nickname,
        item: itemName
      }));
      return;
    }

    if (!profile.creatures[creatureIndex]) {
      this.bot.send(this.i18n.t('items.no_creatures', {
        player: nickname
      }));
      return;
    }

    const creature = profile.creatures[creatureIndex];

    if (item.effect(creature)) {
      this.bot.send(this.i18n.t('items.use_success', {
        player: nickname,
        item: itemName,
        creature: creature.name
      }));
      profile.removeItem(itemName);
    } else {
      this.bot.send(this.i18n.t('items.use_fail', {
        item: itemName
      }));
    }
  }

  handleBattleRequest(challenger: string, opponent: string) {
    if (!opponent) {
      this.bot.send(this.i18n.t('battles.usage'));
      return;
    }
    if (opponent === config.username) {
      this.bot.send(this.i18n.t('battles.cant_fight_me'));
      return;
    }
    const challengerProfile = this.getOrCreateProfile(challenger);
    const opponentProfile = this.getOrCreateProfile(opponent);

    if (!challengerProfile.getActiveCreature() || !opponentProfile.getActiveCreature()) {
      this.bot.send(this.i18n.t('battles.no_creatures', {
        player: challenger
      }));
      return;
    }

    opponentProfile.battleRequest = { from: challenger };

    this.bot.send(this.i18n.t('battles.challenge', {
      challenger,
      opponent
    }));
  }

  handleBattleAccept(nickname: string) {
    const opponentProfile = this.getOrCreateProfile(nickname);
    const challenger = opponentProfile.battleRequest?.from;

    if (!challenger) {
      this.bot.send(this.i18n.t('battles.no_battles', {
        player: nickname
      }));
      return;
    }

    const challengerProfile = this.getOrCreateProfile(challenger);

    const challengerCreature = challengerProfile.getActiveCreature();
    const opponentCreature = opponentProfile.getActiveCreature();

    if (!challengerCreature || !opponentCreature) {
      this.bot.send(this.i18n.t('battles.no_creatures', {
        player: nickname
      }));
      return;
    }

    const challengerScore = this.calculateBattleScore(challengerCreature);
    const opponentScore = this.calculateBattleScore(opponentCreature);

    const winner = challengerScore > opponentScore ? challenger : nickname;
    const loser = challengerScore > opponentScore ? nickname : challenger;
    const winnerProfile = this.getOrCreateProfile(winner);
    const loserProfile = this.getOrCreateProfile(loser);

    winnerProfile.getActiveCreature().levelUp();

    this.bot.send(this.i18n.t('battles.victory', {
      winner,
      winnerCreature: winnerProfile.getActiveCreature().name,
      loser,
      loserCreature: loserProfile.getActiveCreature().name,
      level: winnerProfile.getActiveCreature().level
    }));

    this.handlePostBattleRewards(winner, loser, winnerProfile, loserProfile);

    opponentProfile.clearBattleRequest();
  }

  handleBattleDecline(nickname: string) {
    const profile = this.getOrCreateProfile(nickname);
    if (profile.battleRequest) {
      delete profile.battleRequest;
      this.bot.send(this.i18n.t('battles.declined', {
        player: nickname
      }));
    }
  }

  calculateBattleScore(creature: Creature) {
    return (creature.stats.attack + creature.stats.speed) *
      (Math.random() * 2 + 0.5) *
      (1 + creature.level * 0.1);
  }

  handlePostBattleRewards(winner: string, loser: string, winnerProfile: UserProfile, loserProfile: UserProfile) {
    const stolenItem = Object.keys(loserProfile.items)[0];
    if (stolenItem) {
      loserProfile.removeItem(stolenItem);
      winnerProfile.addItem(stolenItem);
      this.bot.send(this.i18n.t('battles.item_stolen', {
        winner,
        item: stolenItem,
        loser
      }));
    }

    else if (loserProfile.coins > 0) {
      const amount = Math.min(
        loserProfile.coins,
        Math.round(Math.random() * GAME_CONFIG.MAX_COINS_DROP)
      );
      loserProfile.removeCoins(amount);
      winnerProfile.addCoins(amount);
      this.bot.send(this.i18n.t('battles.coins_stolen', {
        winner,
        amount,
        loser
      }));
    }
  }

  showProfile(nickname: string) {
    const profile = this.getOrCreateProfile(nickname);

    this.bot.send([
      this.i18n.t('profile.header', { player: nickname }),
      this.i18n.t('profile.creatures', {
        creatures: profile.creatures.map((c, i) => formatCreatureDisplay(c, profile.creatures.length > 1 && profile.activeCreatureIndex === i)).join(', ')
      }),
      this.i18n.t('profile.inventory', {
        inventory: formatInventory(profile)
      })
    ].join(' '));
  }

  chooseCreature(nickname: string, index: string) {
    const i = parseInt(index);
    const profile = this.getOrCreateProfile(nickname);
    if (!i || !profile.creatures[i - 1]) {
      this.bot.send(this.i18n.t('profile.creature_not_found'));
      return;
    }
    const creature = profile.creatures[i - 1];
    profile.activeCreatureIndex = i - 1;
    this.bot.send(this.i18n.t('profile.creature_selected', { creature: creature.name }));
  }

  showHelp() {
    this.bot.send(this.i18n.t('help.available_commands')
      + Object.keys(this.commands).map(v => GAME_CONFIG.COMMAND_PREFIX + v).join(', ')
    );
  }
}