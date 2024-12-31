import fs from 'fs';
import { getRandomItem, formatCreatureDisplay, formatInventory } from '../utils/helpers.ts';
import { Creature } from '../models/Creature.ts';
import { Item, UserProfile } from '../models/UserProfile.ts';
import { I18nManager } from './I18nManager.ts';
import { config, GAME_CONFIG } from '../config.ts';
import items from '../data/items.ts';
import SSHChatBot from '../lib/SSHChatBot.ts';
import creatures from '../data/creatures.ts';
import { CreatureBase } from '../models/CreatureBase.ts';

export default class GameManager {
  bot: SSHChatBot;
  userProfiles: { [key: string]: UserProfile } = {};
  i18n: I18nManager;
  activity = 0;
  spawnActivity = 0;
  activeCatchEvent: { creature: CreatureBase, claimed: boolean } | null;
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
    use: this.useItem
  };

  constructor(bot: SSHChatBot) {
    this.bot = bot;
    this.activeCatchEvent = null;
    this.activeCollectEvent = null;
    this.i18n = new I18nManager(GAME_CONFIG.LOCALE);
    this.loadProfiles();
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

  getOrCreateProfile(nickname: string) {
    if (!this.userProfiles[nickname]) {
      this.userProfiles[nickname] = new UserProfile();
    }
    return this.userProfiles[nickname];
  }

  handleMessage(nickname: string, message: string) {
    this.activity++;
    
    if (message.startsWith(GAME_CONFIG.COMMAND_PREFIX)) {
      const [command, ...args] = message.split(' ').map(arg => arg.replace(/[^A-z0-9А-я\[\]]/g, ''));
      if (this.commands[command]) {
        console.log(`Resolving command "${command}" for ${nickname}`);
        this.commands[command].bind(this)(nickname, ...args);
        return;
      }
    }
  }

  updateActivity() {
    this.activity = Math.max(0, this.activity - 1);
    if (this.activity < GAME_CONFIG.MIN_ACTIVITY_THRESHOLD)
      return;

    if (Math.random() > GAME_CONFIG.ACTIVITY_DECAY_CHANCE) {
      this.activity = Math.round(this.activity / GAME_CONFIG.ACTIVITY_DECAY_FACTOR);
    }
  }

  spawnRandomEvent() {
    if (this.activity < GAME_CONFIG.MIN_ACTIVITY_THRESHOLD)
      return;

    if (Math.random() < Math.min(0.9, this.spawnActivity * 0.1)) {
      this.spawnActivity--;
      return;
    }
    
    this.spawnActivity++;

    if (Math.random() > GAME_CONFIG.CATCH_EVENT_WEIGHT) {
      if (!this.activeCatchEvent)
        this.announceCatchEvent();
    } else {
      if (!this.activeCollectEvent)
        this.announceCollectEvent();
    }
  }

  announceCatchEvent() {
    const creature = getRandomItem(creatures);
    this.activeCatchEvent = { creature, claimed: false };

    this.bot.send(this.i18n.t('events.wild_creature_appears', {
      name: creature.name
    }));
  }

  announceCollectEvent() {
    const coins = Math.floor(Math.random() * (GAME_CONFIG.MAX_COINS_DROP - GAME_CONFIG.MIN_COINS_DROP + 1)) + GAME_CONFIG.MIN_COINS_DROP;
    this.activeCollectEvent = {
      collectable: Math.random() < 0.5 ? getRandomItem(items) : { coins },
      claimed: false
    };

    this.bot.send(this.i18n.t('events.item_appears'));
  }

  handleCatchEvent(nickname: string) {
    if (this.activeCatchEvent && !this.activeCatchEvent.claimed) {
      this.activeCatchEvent.claimed = true;
      const profile = this.getOrCreateProfile(nickname);

      profile.addCreature(new Creature(this.activeCatchEvent.creature));

      this.bot.send(this.i18n.t('events.catch_success', {
        player: nickname,
        creature: this.activeCatchEvent.creature.name
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

  useItem(nickname: string, itemName: string) {
    if (!itemName || !itemName.length) {
      this.bot.send(this.i18n.t('items.usage'));
      return;
    }

    const profile = this.getOrCreateProfile(nickname);
    const item = items.find(i => i.name.toLowerCase() === itemName.trim().toLowerCase());

    if (!item || !profile.items[item.name] || profile.items[item.name] <= 0) {
      this.bot.send(this.i18n.t('items.no_item', {
        player: nickname,
        item: item?.name || itemName
      }));
      return;
    }

    if (!profile.getActiveCreature()) {
      this.bot.send(this.i18n.t('items.no_creatures', {
        player: nickname
      }));
      return;
    }

    if (item.effect(profile.getActiveCreature(), this.bot.send.bind(this.bot))) {
      this.bot.send(this.i18n.t('items.use_success', {
        player: nickname,
        item: itemName,
        creature: profile.getActiveCreature().name
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

    challengerCreature.refillEnergy();
    opponentCreature.refillEnergy();

    if (challengerCreature.energy <= 0 || opponentCreature.energy <= 0) {
      this.bot.send(this.i18n.t('battles.no_energy', {
        player: nickname
      }));
      return;
    }

    const challengerScore = challengerCreature.calculateBattleScore(opponentCreature);
    const opponentScore = opponentCreature.calculateBattleScore(challengerCreature);

    const winner = challengerScore > opponentScore ? challenger : nickname;
    const loser = challengerScore > opponentScore ? nickname : challenger;
    const winnerProfile = this.getOrCreateProfile(winner);
    const loserProfile = this.getOrCreateProfile(loser);

    this.bot.send(this.i18n.t('battles.victory', {
      winner,
      winnerCreature: winnerProfile.getActiveCreature().name,
      loser,
      loserCreature: loserProfile.getActiveCreature().name
    }));

    challengerCreature.energy--;
    opponentCreature.energy--;

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
    profile.creatures.forEach(c => c.refillEnergy());

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