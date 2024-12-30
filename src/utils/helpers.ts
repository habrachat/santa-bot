import { Creature, Stats } from "../models/Creature.ts";
import { UserProfile } from "../models/UserProfile.ts";

export function generateNumberInRange(str: string, min: number, max: number) {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xFFFFFFFF;
  }

  return min + Math.abs(hash) % (max - min + 1);
}

export function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function formatStats(stats: Stats): string {
  return Object.values(stats).join('-');
}

export function formatCreatureDisplay(creature: Creature, isActive: boolean) {
  return `${isActive ? '[A] ' : ''}**${creature.name}** [⬆️${creature.level} 📊${formatStats(creature.stats)}]`;
}

export function formatInventory(profile: UserProfile) {
  return [
    `${profile.coins} coins`,
    ...Object.entries(profile.items).map(([item, count]) => `${item} (${count})`)
  ].join(', ');
}
