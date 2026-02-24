import { SPECIES } from '../data/species.js';
import { bus } from '../engine/events.js';

export function createStats() {
  return {
    population: {},
    totalAnimals: 0,
    avgSoil: 0,
    avgVeg: 0,
    avgWater: 0,
    landTiles: 0,
    protectedTiles: 0,
    developedTiles: 0,
  };
}

export function computeStats(island) {
  const tiles = island.world.tiles;
  const animals = island.entities.animals;
  const stats = island.stats;

  // Population counts
  const pop = {};
  for (const id in SPECIES) pop[id] = 0;
  for (let i = 0; i < animals.length; i++) {
    const sid = animals[i].speciesId;
    pop[sid] = (pop[sid] || 0) + 1;
  }
  stats.population = pop;
  stats.totalAnimals = animals.length;

  // Tile averages (sampled for performance — every 4th tile)
  let sumSoil = 0, sumVeg = 0, sumWater = 0;
  let landCount = 0, protCount = 0, devCount = 0;
  const step = 4;

  for (let y = 0; y < tiles.h; y += step) {
    for (let x = 0; x < tiles.w; x += step) {
      if (tiles.isOcean(x, y)) continue;
      landCount++;
      sumSoil += tiles.getSoil(x, y);
      sumVeg += tiles.getVeg(x, y);
      sumWater += tiles.getWater(x, y);
      if (tiles.isProtected(x, y)) protCount++;
      if (tiles.isDeveloped(x, y)) devCount++;
    }
  }

  if (landCount > 0) {
    stats.avgSoil = sumSoil / landCount;
    stats.avgVeg = sumVeg / landCount;
    stats.avgWater = sumWater / landCount;
    stats.landTiles = landCount * step * step;
    stats.protectedTiles = protCount * step * step;
    stats.developedTiles = devCount * step * step;
  }

  bus.emit('statsUpdated', stats);
  return stats;
}
