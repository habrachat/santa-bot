import { Item } from "../models/UserProfile.ts";

export default Object.freeze([
  {
    name: "Веселье",
    effect: (creature) => {
      creature.modifiers.speed += 5;
      return true;
    }
  },
  {
    name: "Мандаринка",
    effect: (creature, send) => {
      creature.modifiers.attack += 5;
      send(`${creature.name} съел мандаринку и увеличил атаку на 5`);
      return true;
    }
  },
  {
    name: "Щииит",
    effect: (creature, send) => {
      creature.modifiers.defense += 5;
      send(`${creature.name} взял Щииит и увеличил защиту на 5`);
      return true;
    }
  },
  {
    name: "Оливье",
    effect: (creature, send) => {
      creature.energy += 5;
      send(`${creature.name} съел ольвье и пополнил энергию на 5`);
      return true;
    }
  },
  {
    name: "Зелье эволюции",
    effect: (creature) => {
      creature.evolve();
    }
  },
  {
    name: "Новогодняя гирлянда",
    effect: (creature, send) => {
      creature.modifiers.speed += 10;
      send(`${creature.name} украсил себя гирляндой и стал быстрее на 10`);
      return true;
    }
  },
  {
    name: "Праздничная свеча",
    effect: (creature, send) => {
      creature.modifiers.attack += 7;
      send(`${creature.name} зажег праздничную свечу и увеличил атаку на 7`);
      return true;
    }
  },
  {
    name: "Шапка Санты",
    effect: (creature, send) => {
      creature.modifiers.defense += 7;
      send(`${creature.name} надел шапку Санты и стал защищеннее на 7`);
      return true;
    }
  },
  {
    name: "Леденец",
    effect: (creature, send) => {
      creature.energy += 10;
      send(`${creature.name} съел леденец и восстановил 10 энергии`);
      return true;
    }
  },
  {
    name: "Снежок",
    effect: (creature, send) => {
      creature.modifiers.attack -= 2;
      creature.modifiers.defense += 5;
      send(`${creature.name} бросил снежок! Атака уменьшилась на 2, защита увеличилась на 5`);
      return true;
    }
  },
  {
    name: "Морозный кристалл",
    effect: (creature, send) => {
      creature.modifiers.speed += 15;
      creature.modifiers.defense -= 3;
      send(`${creature.name} взял морозный кристалл. Скорость увеличилась на 15, но защита уменьшилась на 3`);
      return true;
    }
  },
  {
    name: "Рождественская звезда",
    effect: (creature, send) => {
      creature.modifiers.attack += 10;
      creature.energy += 5;
      send(`${creature.name} нашел рождественскую звезду. Атака увеличилась на 10, энергия восстановлена на 5`);
      return true;
    }
  },
  {
    name: "Колокольчики",
    effect: (creature, send) => {
      creature.modifiers.speed += 5;
      creature.modifiers.defense += 5;
      send(`${creature.name} позвенел колокольчиками. Скорость и защита увеличились на 5`);
      return true;
    }
  },
  {
    name: "Праздничный торт",
    effect: (creature, send) => {
      creature.energy += 15;
      send(`${creature.name} съел праздничный торт и восстановил 15 энергии`);
      return true;
    }
  },
  {
    name: "Снеговик-страж",
    effect: (creature, send) => {
      creature.modifiers.defense += 10;
      send(`${creature.name} поставил снеговика-стража и увеличил защиту на 10`);
      return true;
    }
  },
  {
    name: "Эльфийская пыль",
    effect: (creature, send) => {
      creature.modifiers.attack += 5;
      creature.modifiers.speed += 5;
      send(`${creature.name} использовал эльфийскую пыль. Атака и скорость увеличились на 5`);
      return true;
    }
  },
  {
    name: "Волшебные печеньки",
    effect: (creature, send) => {
      const effects = [
        () => {
          creature.modifiers.attack += 10;
          send(`${creature.name} съел волшебные печеньки и увеличил атаку на 10.`);
        },
        () => {
          creature.modifiers.defense += 10;
          send(`${creature.name} съел волшебные печеньки и увеличил защиту на 10.`);
        },
        () => {
          creature.energy += 20;
          send(`${creature.name} съел волшебные печеньки и восстановил 20 энергии.`);
        },
        () => {
          creature.modifiers.speed += 10;
          send(`${creature.name} съел волшебные печеньки и увеличил скорость на 10.`);
        }
      ];
      const chosenEffect = effects[Math.floor(Math.random() * effects.length)];
      chosenEffect();
      return true;
    }
  },
]) as Readonly<Item[]>;