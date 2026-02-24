import { bus } from '../engine/events.js';

export const STRUCTURE_TYPES = {
  village: {
    id: 'village',
    name: 'Village',
    emoji: '🏘️',
    size: 2,
    effect: { developed: true, soilDrain: 0.002, foodProd: 0.5 },
    buildCost: 'Requires flat land, no ocean tiles',
  },
  farm: {
    id: 'farm',
    name: 'Farm',
    emoji: '🌾',
    size: 3,
    effect: { developed: true, soilDrain: 0.003, vegBoost: 0.01, foodProd: 1.0 },
    buildCost: 'Requires grassland or forest tiles',
  },
  lighthouse: {
    id: 'lighthouse',
    name: 'Lighthouse',
    emoji: '🗼',
    size: 1,
    effect: { developed: true, soilDrain: 0, protection: 5 },
    buildCost: 'Place on coastal tiles',
  },
  windmill: {
    id: 'windmill',
    name: 'Windmill',
    emoji: '🏗️',
    size: 1,
    effect: { developed: true, soilDrain: 0.001, energyProd: 1 },
    buildCost: 'Requires elevation > 0.5',
  },
};

export const STRUCTURE_LIST = Object.values(STRUCTURE_TYPES);

let _nextStructureId = 1;

export function createStructure(typeId, x, y) {
  const type = STRUCTURE_TYPES[typeId];
  if (!type) return null;

  return {
    id: _nextStructureId++,
    typeId,
    x,
    y,
    size: type.size,
    age: 0,
    health: 1,
  };
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

  bus.emit('notification', {
    message: `${type.name} built!`,
    type: 'success',
    icon: type.emoji,
  });

  return structure;
}

export function simulateStructures(structures, tiles) {
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
  }
}
