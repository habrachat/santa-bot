export interface Stats {
  attack: number;
  defense: number;
  speed: number;
}

export class Creature {
  name: string;
  stage: number;
  stats: Stats;
  level: number;

  constructor(name: string, stage: number, stats: Stats) {
    this.name = name;
    this.stage = stage;
    this.stats = { ...stats };
    this.level = 1;
  }

  levelUp(): void {
    this.level++;

    this.stats.attack += Math.floor(this.stats.attack + 3 * Math.random());
    this.stats.defense += Math.floor(this.stats.defense + 3 * Math.random());
    this.stats.speed += Math.floor(this.stats.speed + 1 * Math.random());
  }
  
  getNextEvolution(): Creature {
    // const creatureData = this.creatures.find(c => c.name === creature.name);
    // if (creatureData) {
    //   return creatureData.evolutions[creature.stage];
    // }
    return this;
  }

  getSpecificEvolution(_evolutionName: string): Creature {
    // const creatureData = this.creatures.find(c => c.name === creature.name);
    // if (creatureData) {
    //   return creatureData.evolutions.find(e => e.name === evolutionName);
    // }
    return this;
  }

  clone(): Creature {
    return new Creature(this.name, this.stage, { ...this.stats });
  }
}