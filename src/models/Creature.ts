import { GAME_CONFIG } from "../config.ts";
import creatures from "../data/creatures.ts";
import { CreatureBase, Stats } from "./CreatureBase.ts";

export class Creature {
  stage: number;
  base: CreatureBase;
  energy: number;
  modifiers: Stats;

  private _lastRefill;

  get currentEvolution() {
    return this.base.evolutions.find(e => e.stage === this.stage) || this.base.evolutions[0];
  }

  get name(): string {
    return this.currentEvolution.name;
  }

  get stats(): Readonly<Stats> {
    const stats = { ...this.currentEvolution.stats };
    stats.attack += this.modifiers.attack;
    stats.defense += this.modifiers.defense;
    stats.speed += this.modifiers.speed;
    return stats;
  }

  constructor(base: CreatureBase, stage?: number) {
    this.stage = stage || 1;
    this.base = Object.freeze(base);
    this.energy = 0;
    this.modifiers = { attack: 0, defense: 0, speed: 0 };
    this._lastRefill = Date.now();
  }
  
  evolve(evolutionName?: string): Creature {
    const next = this.base.evolutions.find(e => evolutionName ? e.name === evolutionName : e.stage === this.stage + 1);
    if (next)
      this.stage = next.stage;
    return this;
  }

  calculateBattleScore(opponent: Creature): number {
    const attackScore = this.stats.attack - opponent.stats.defense;
    const defenseScore = this.stats.defense - opponent.stats.attack;
    const speedScore = this.stats.speed - opponent.stats.speed;

    const randomize = (base: number) => base * (1 + (Math.random() * 0.2 - 0.1));

    const totalScore = randomize(attackScore * 2) + randomize(defenseScore) + randomize(speedScore * 0.5);

    return Math.max(0, totalScore);
  }

  refillEnergy() {
    const diff = Date.now() - this._lastRefill;
    if (diff < GAME_CONFIG.ENERGY_REFILL_INTERVAL)
      return;
    this._lastRefill = Date.now();
    this.energy = Math.max(GAME_CONFIG.MAX_ENERGY_PER_STAGE * this.stage, this.energy + Math.floor(diff / GAME_CONFIG.ENERGY_REFILL_INTERVAL));
  }

  toJSON(): object {
    return {
      stage: this.stage,
      name: this.base.name,
      energy: this.energy
    };
  }

  static fromJSON(data: { stage: number, name: string, energy: number, modifiers: Stats }): Creature {
    const base = creatures.find(c => c.name === data.name) || creatures[0];
    const creature = new Creature(base, data.stage);
    creature.energy = data.energy;
    if (data.modifiers)
      creature.modifiers = { ...data.modifiers };
    return creature;
  }

  clone(): Creature {
    const creature = new Creature(this.base, this.stage);
    creature.modifiers = { ...this.modifiers };
    return creature;
  }
}