import { Item } from "../models/UserProfile.ts";

export default Object.freeze([
  {
    name: "Potion",
    effect: (creature) => {
      creature.stats.attack += 5;
      return true;
    }
  },
  {
    name: "Rare Candy",
    effect: (creature) => {
      const evolution = creature.getNextEvolution();
      if (evolution) {
        creature.name = evolution.name;
        creature.stats = { ...evolution.stats };
        creature.stage += 1;
        return true;
      }
      return false;
    }
  },
  {
    name: "Thunder Stone",
    effect: (creature) => {
      const evolution = creature.getSpecificEvolution("Raichu");
      if (evolution) {
        creature.name = evolution.name;
        creature.stats = { ...evolution.stats };
        return true;
      }
      return false;
    }
  },
  {
    name: "Water Stone",
    effect: (creature) => {
      const evolution = creature.getSpecificEvolution("Vaporeon");
      if (evolution) {
        creature.name = evolution.name;
        creature.stats = { ...evolution.stats };
        return true;
      }
      return false;
    }
  }
]) as Readonly<Item[]>;