import SSHChatBot from './lib.mjs';
import fs from 'fs';

const config = {
  host: '127.0.0.1',
  port: 2222,
  username: 'santa',
  privateKeyPath: './id_ed25519',
};

const bot = new SSHChatBot(config);

let activity = 0;

function generateNumberInRange(str, min, max) {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xFFFFFFFF;
  }

  return min + Math.abs(hash) % (max - min + 1);
}

const creatures = JSON.parse(fs.readFileSync('./creatures.json', 'utf-8')).map(c => ({
  name: c[0],
  evolutions: c.map((name, i) => ({
    stage: i + 1,
    name,
    stats: {
      attack: generateNumberInRange(name.slice(0, 2), i * 4, (i + 3) * 4),
      defense: generateNumberInRange(name.slice(2, 4), i * 4, (i + 3) * 4),
      speed: generateNumberInRange(name.slice(4, 6), i * 2, (i + 3) * 2)
    }
  }))
}));

const items = [
  {
    name: "Potion",
    effect: (creature) => { creature.stats.attack += 5; }
  },
  {
    name: "Rare Candy",
    effect: (creature) => {
      const currentStage = creature.stage;
      const evolution = creatures.find(p => p.name === creature.name)?.evolutions[currentStage];
      if (evolution) {
        creature.name = evolution.name;
        creature.stats = { ...evolution.stats };
        creature.stage += 1;
      }
    }
  },
  {
    name: "Thunder Stone",
    effect: (creature) => {
      const evolution = creatures.find(p => p.name === creature.name)?.evolutions.find(e => e.name === "Raichu");
      if (evolution) {
        creature.name = evolution.name;
        creature.stats = { ...evolution.stats };
      }
    }
  },
  {
    name: "Water Stone",
    effect: (creature) => {
      const evolution = creatures.find(p => p.name === creature.name)?.evolutions.find(e => e.name === "Vaporeon");
      if (evolution) {
        creature.name = evolution.name;
        creature.stats = { ...evolution.stats };
      }
    }
  }
];

const userProfiles = JSON.parse(fs.readFileSync('./profiles.json'));

let activeCatchEvent = null;
let activeCollectEvent = null;

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function initializeUser(nickname) {
  if (!userProfiles[nickname]) {
    userProfiles[nickname] = {
      creatures: [],
      coins: 0,
      items: {},
    };
  }
}

function announceCatchEvent() {
  const creature = getRandomItem(creatures);
  const evolution = creature.evolutions[0];
  activeCatchEvent = { creature: evolution, claimed: false };
  bot.send(`Возникло дикое существо **${evolution.name}**! Набери _!catch_, чтобы поймать!`);
}

function handleCatchEvent(nickname) {
  if (activeCatchEvent && !activeCatchEvent.claimed) {
    activeCatchEvent.claimed = true;
    const creatureData = activeCatchEvent.creature;
    initializeUser(nickname);
    userProfiles[nickname].creatures.push({
      name: creatureData.name,
      stage: 1,
      stats: { ...creatureData.stats },
      level: 1
    });
    bot.send(`${nickname} поймал дикое существо **${creatureData.name}**!`);
    activeCatchEvent = null;
  }
}

function announceCollectEvent() {
  const collectable = /* Math.random() < 0.5 ? getRandomItem(items) :  */`${Math.floor(Math.random() * 10) + 1} монет`;
  activeCollectEvent = { collectable, claimed: false };
  bot.send(`**Появился предмет или монеты!** Введи _!collect_, чтобы забрать!`);
}

function handleCollectEvent(nickname) {
  if (activeCollectEvent && !activeCollectEvent.claimed) {
    activeCollectEvent.claimed = true;
    const collectable = activeCollectEvent.collectable;
    initializeUser(nickname);
    if (typeof collectable === 'string' && collectable.includes('монет')) {
      const coins = parseInt(collectable.split(' ')[0], 10);
      userProfiles[nickname].coins += coins;
      bot.send(`${nickname} забрал **${coins} монет**!`);
    } else {
      const item = collectable.name;
      userProfiles[nickname].items[item] = (userProfiles[nickname].items[item] || 0) + 1;
      bot.send(`${nickname} забрал **${item}**!`);
    }
    activeCollectEvent = null;
  }
}

// function evolveCreature(nickname, index) {
//   initializeUser(nickname);
//   const creature = userProfiles[nickname].creatures[index];
//   if (!creature)
//     return;
//   creature
// }

function useItem(nickname, itemName, creatureIndex) {
  initializeUser(nickname);
  const profile = userProfiles[nickname];
  const item = items.find(i => i.name === itemName);

  if (!item || !profile.items[itemName] || profile.items[itemName] <= 0) {
    bot.send(`У ${nickname} нет **${itemName}**!`);
    return;
  }

  if (!profile.creatures[creatureIndex]) {
    bot.send(`У ${nickname} нет пойманных существ!`);
    return;
  }

  const creature = profile.creatures[creatureIndex];

  if (item.effect) {
    item.effect(creature);
    bot.send(`${nickname} использовал **${itemName}** на существо **${creature.name}**.`);
  } else {
    bot.send(`${itemName} нельзя использовать.`);
  }

  profile.items[itemName] -= 1;
  if (profile.items[itemName] === 0) {
    delete profile.items[itemName];
  }
}

function handleBattleRequest(challenger, opponent) {
  initializeUser(challenger);
  initializeUser(opponent);

  if (!userProfiles[challenger].creatures.length || !userProfiles[opponent].creatures.length) {
    bot.send(`${challenger}: нечем бороться`);
    return;
  }

  bot.send(`${challenger} вызвал ${opponent} на битву! ${opponent}, вводи !accept чтобы сразиться или !decline, если зассал.`);
  userProfiles[opponent].battleRequest = { from: challenger };
}

function handleBattleAccept(opponent) {
  const challenger = userProfiles[opponent].battleRequest?.from;
  if (!challenger) {
    bot.send(`У ${opponent} нет битв.`);
    return;
  }

  initializeUser(challenger);

  const challengercreature = userProfiles[challenger].creatures[0];
  const opponentcreature = userProfiles[opponent].creatures[0];

  if (!challengercreature || !opponentcreature) {
    return;
  }

  const challengerScore = (challengercreature.stats.attack + challengercreature.stats.speed) * Math.random();
  const opponentScore = (opponentcreature.stats.attack + opponentcreature.stats.speed) * Math.random();

  const winner = challengerScore > opponentScore ? challenger : opponent;
  const loser = challengerScore > opponentScore ? opponent : challenger;

  userProfiles[winner].creatures[0].level++;
  bot.send(`Существо игрока ${winner} **${userProfiles[winner].creatures[0].name}** победило против существа игрока ${loser} **${userProfiles[loser].creatures[0].name}** и залевелапилось до ${userProfiles[winner].creatures[0].level} левела!`);

  const stolenItem = Object.keys(userProfiles[loser].items)[0];
  if (stolenItem) {
    userProfiles[loser].items[stolenItem] -= 1;
    userProfiles[winner].items[stolenItem] = (userProfiles[winner].items[stolenItem] || 0) + 1;
    bot.send(`${winner} стырил **${stolenItem}** у ${loser}!`);
  } else if (userProfiles[loser].coins > 0) {
    const amount = Math.min(userProfiles[loser].coins, Math.round(Math.random() * 10));
    userProfiles[loser].coins -= amount;
    userProfiles[winner].coins += amount;
    bot.send(`${winner} стырил **${amount} монет** у ${loser}!`);
  }

  delete userProfiles[opponent].battleRequest;
}

bot.on('message', (nickname, message) => {
  console.log(`Message from ${nickname}: ${message}`);
  activity++;

  if (message === '!catch') {
    handleCatchEvent(nickname);
  } else if (message === '!collect') {
    handleCollectEvent(nickname);
  } else if (message.startsWith('!use')) {
    const [, itemName, index] = message.split(' ');
    useItem(nickname, itemName, parseInt(index, 10));
  } else if (message.startsWith('!battle')) {
    const opponent = message.split(' ')[1];
    if (opponent) {
      handleBattleRequest(nickname, opponent);
    } else {
      bot.send(`Использование: !battle <оппонент>`);
    }
  } else if (message === '!accept') {
    handleBattleAccept(nickname);
  } else if (message === '!profile') {
    initializeUser(nickname);
    const profile = userProfiles[nickname];
    bot.send(`**Профиль ${nickname}**: _Существа_: ${profile.creatures.map(p => `**${p.name}** [⬆️${p.level} 📊${Object.values(p.stats).join('-')}]`).join(', ')}, _Инвентарь_: ${[`${profile.coins} монет`, ...Object.keys(profile.items)].join()}`);
  } else if (message === '!help') {
    bot.send(`Команды: profile, battle, catch, collect, accept, decline`);
  }
});

setInterval(() => {
  fs.writeFileSync('./profiles.json', JSON.stringify(userProfiles));

  activity--;
  if (activity < 3)
    return;

  if (activity > 20)
    activity /= 2;

  if (Math.random() > 0.5)
    if (!activeCatchEvent) announceCatchEvent();
  else
    if (!activeCollectEvent) announceCollectEvent();
}, 30000);

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received.');
  fs.writeFileSync('./profiles.json', JSON.stringify(userProfiles));
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received.');
  fs.writeFileSync('./profiles.json', JSON.stringify(userProfiles));
  process.exit(0);
});

bot.on('event', (event) => {
  console.log(`Event: ${event}`);
});

bot.connect();