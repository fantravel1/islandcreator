import { bus } from '../engine/events.js';

export const STRUCTURE_TYPES = {
  village: {
    id: 'village',
    name: 'Village',
    emoji: '🏘️',
    size: 2,
    effect: { developed: true, soilDrain: 0.002, foodProd: 0.5 },
    buildCost: 'Requires flat land, no ocean tiles',
    hasPopulation: true,
  },
  farm: {
    id: 'farm',
    name: 'Farm',
    emoji: '🌾',
    size: 3,
    effect: { developed: true, soilDrain: 0.003, vegBoost: 0.01, foodProd: 1.0 },
    buildCost: 'Requires grassland or forest tiles',
    hasPopulation: false,
  },
  lighthouse: {
    id: 'lighthouse',
    name: 'Lighthouse',
    emoji: '🗼',
    size: 1,
    effect: { developed: true, soilDrain: 0, protection: 5 },
    buildCost: 'Place on coastal tiles',
    hasPopulation: false,
  },
  windmill: {
    id: 'windmill',
    name: 'Windmill',
    emoji: '🏗️',
    size: 1,
    effect: { developed: true, soilDrain: 0.001, energyProd: 1 },
    buildCost: 'Requires elevation > 0.5',
    hasPopulation: false,
  },
};

export const STRUCTURE_LIST = Object.values(STRUCTURE_TYPES);

let _nextStructureId = 1;

export function createStructure(typeId, x, y) {
  const type = STRUCTURE_TYPES[typeId];
  if (!type) return null;

  const s = {
    id: _nextStructureId++,
    typeId,
    x,
    y,
    size: type.size,
    age: 0,
    health: 1,
  };

  // Villages have population
  if (type.hasPopulation) {
    s.population = 5;
    s.happiness = 0.6;
    s.food = 0.5;
  }

  return s;
}

export function canPlaceStructure(typeId, tiles, cx, cy) {
  const type = STRUCTURE_TYPES[typeId];
  if (!type) return false;

  const r = Math.floor(type.size / 2);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (!tiles.inBounds(x, y)) return false;
      if (tiles.isOcean(x, y)) return false;
      if (tiles.isDeveloped(x, y)) return false;
    }
  }

  return true;
}

export function placeStructure(typeId, tiles, cx, cy, structures) {
  if (!canPlaceStructure(typeId, tiles, cx, cy)) return null;

  const type = STRUCTURE_TYPES[typeId];
  const structure = createStructure(typeId, cx, cy);
  if (!structure) return null;

  // Mark tiles as developed
  const r = Math.floor(type.size / 2);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (tiles.inBounds(x, y)) {
        tiles.setDeveloped(x, y, true);
      }
    }
  }

  structures.push(structure);

  if (type.hasPopulation) {
    bus.emit('storyEvent', {
      text: `A new ${type.name} was founded with 5 settlers.`,
      type: 'event',
      detail: 'Keep nearby water and vegetation healthy to help them thrive.',
    });
  }

  bus.emit('notification', {
    message: `${type.name} built!`,
    type: 'success',
    icon: type.emoji,
  });

  return structure;
}

export function simulateStructures(structures, tiles, ecoScore) {
  for (const s of structures) {
    const type = STRUCTURE_TYPES[s.typeId];
    if (!type) continue;

    s.age++;

    // Soil drain
    if (type.effect.soilDrain > 0) {
      const r = Math.floor(type.size / 2);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = s.x + dx;
          const y = s.y + dy;
          if (tiles.inBounds(x, y)) {
            const soil = tiles.getSoil(x, y);
            tiles.setSoil(x, y, Math.max(0, soil - type.effect.soilDrain * 0.1));
          }
        }
      }
    }

    // Farm veg boost (around farm, not on it)
    if (type.effect.vegBoost) {
      const range = type.size + 1;
      for (let dy = -range; dy <= range; dy++) {
        for (let dx = -range; dx <= range; dx++) {
          if (Math.abs(dx) <= type.size / 2 && Math.abs(dy) <= type.size / 2) continue;
          const x = s.x + dx;
          const y = s.y + dy;
          if (tiles.inBounds(x, y) && !tiles.isDeveloped(x, y) && !tiles.isOcean(x, y)) {
            const veg = tiles.getVeg(x, y);
            tiles.setVeg(x, y, Math.min(1, veg + type.effect.vegBoost * 0.01));
          }
        }
      }
    }

    // --- Village population simulation ---
    if (type.hasPopulation && s.population !== undefined) {
      let nearbyVeg = 0, nearbyWater = 0, nearbyFarms = 0;
      let sampleCount = 0;
      for (let dy = -10; dy <= 10; dy += 2) {
        for (let dx = -10; dx <= 10; dx += 2) {
          const x = s.x + dx;
          const y = s.y + dy;
          if (!tiles.inBounds(x, y) || tiles.isOcean(x, y)) continue;
          nearbyVeg += tiles.getVeg(x, y);
          nearbyWater += tiles.getWater(x, y);
          sampleCount++;
        }
      }

      for (const other of structures) {
        if (other.typeId === 'farm') {
          const dist = Math.abs(other.x - s.x) + Math.abs(other.y - s.y);
          if (dist < 15) nearbyFarms++;
        }
      }

      const avgVeg = sampleCount > 0 ? nearbyVeg / sampleCount : 0;
      const avgWater = sampleCount > 0 ? nearbyWater / sampleCount : 0;

      s.food = Math.min(1, nearbyFarms * 0.25 + avgVeg * 0.5);

      const natureFactor = Math.min(1, avgVeg * 1.5);
      const ecoFactor = (ecoScore || 50) / 100;
      s.happiness = (s.food * 0.4 + Math.min(1, avgWater * 2) * 0.3 + (natureFactor * 0.5 + ecoFactor * 0.5) * 0.3);
      s.happiness = Math.max(0, Math.min(1, s.happiness));

      if (s.age % 50 === 0) {
        const oldPop = s.population;
        if (s.happiness > 0.6 && s.food > 0.4 && s.population < 50) {
          s.population += 1;
        } else if (s.happiness < 0.3 || s.food < 0.2) {
          s.population = Math.max(1, s.population - 1);
        }

        if (s.population >= 10 && oldPop < 10) {
          bus.emit('storyEvent', { text: `Village grew to 10 citizens!`, type: 'event', detail: 'A small community is forming.' });
        }
        if (s.population >= 20 && oldPop < 20) {
          bus.emit('storyEvent', { text: `A thriving village of 20 citizens!`, type: 'event', detail: 'Happiness and food supply are key.' });
        }
        if (s.population >= 30 && oldPop < 30) {
          bus.emit('storyEvent', { text: `The village is becoming a town with 30 residents.`, type: 'event' });
        }

        if (s.happiness < 0.25 && s.population > 5 && s.age % 200 === 0) {
          bus.emit('storyEvent', { text: `Villagers are struggling. Happiness critically low.`, type: 'warning', detail: 'Build nearby farms and protect water sources.' });
        }
      }
    }
  }
}
