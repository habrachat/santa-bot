import { Creature } from "./Creature.ts";

export interface Item {
  name: string;
  effect: (creature: Creature, send: (msg: string) => void) => boolean;
}

export interface BattleRequest {
  from: string;
}

export class UserProfile {
  creatures: Creature[] = [];
  coins: number = 0;
  items: Record<string, number> = {};
  battleRequest: BattleRequest | undefined;
  activeCreatureIndex: number = 0;
  static version = 2;

  addCreature(creature: Creature): void {
    this.creatures.push(creature);
  }

  removeCreature(index: number): Creature | null {
    if (this.activeCreatureIndex === index) {
      this.activeCreatureIndex = 0;
    }
    if (index >= 0 && index < this.creatures.length) {
      return this.creatures.splice(index, 1)[0];
    }
    return null;
  }

  getActiveCreature() {
    return this.creatures[this.activeCreatureIndex];
  }

  addCoins(amount: number): void {
    this.coins += amount;
  }

  removeCoins(amount: number): boolean {
    if (this.coins >= amount) {
      this.coins -= amount;
      return true;
    }
    return false;
  }

  addItem(itemName: string): void {
    this.items[itemName] = (this.items[itemName] || 0) + 1;
  }

  removeItem(itemName: string): boolean {
    if (this.items[itemName] && this.items[itemName] > 0) {
      this.items[itemName]--;
      if (this.items[itemName] <= 0) {
        delete this.items[itemName];
      }
      return true;
    }
    return false;
  }

  hasItem(itemName: string): boolean {
    return !!this.items[itemName] && this.items[itemName] > 0;
  }

  getItemCount(itemName: string): number {
    return this.items[itemName] || 0;
  }

  setBattleRequest(from: string): void {
    this.battleRequest = { from };
  }

  clearBattleRequest(): void {
    delete this.battleRequest;
  }

  toJSON(): object {
    return {
      creatures: this.creatures.map(creature => creature.toJSON()),
      coins: this.coins,
      items: { ...this.items },
      activeCreatureIndex: this.activeCreatureIndex,
      version: UserProfile.version
    };
  }

  static fromJSON(data: UserProfile & { version: number }): UserProfile {
    if (data.version !== UserProfile.version) {
      data.creatures = data.creatures.map(c => ({
        stage: c.stage,
        name: c.name,
        energy: 0,
        modifiers: { attack: 0, defense: 0, speed: 0 }
      })) as Creature[];
    }
    const profile = new UserProfile();
    profile.coins = data.coins;
    profile.items = { ...data.items };
    profile.activeCreatureIndex = data.activeCreatureIndex || 0;
    profile.creatures = data.creatures.map(c => Creature.fromJSON(c));
    return profile;
  }
}