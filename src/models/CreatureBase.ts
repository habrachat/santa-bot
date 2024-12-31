export interface Stats {
  attack: number;
  defense: number;
  speed: number;
}

export interface Evolution {
  name: string;
  stage: number;
  stats: Stats;
}

export interface CreatureBase {
  name: string;
  evolutions: Evolution[];
}