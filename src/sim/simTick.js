import { GRID_SIZE, SIM_CHUNKS, TICKS_PER_DAY, DAYS_PER_SEASON, SEASONS_PER_YEAR } from '../data/constants.js';
import { applyClimate } from './climate.js';
import { simulateWater } from './water.js';
import { simulateSoil } from './soil.js';
import { simulateVegetation } from './vegetation.js';
import { simulateAnimals } from './animals.js';
import { applyGovernance } from './governance.js';
import { computeStats } from './stats.js';

let _tickCount = 0;

export function simTick(gameState) {
  const island = gameState.islands[0];
  if (!island) return;

  _tickCount++;
  const tiles = island.world.tiles;
  const animals = island.entities.animals;
  const governance = gameState.governance;
  const time = gameState.time;

  // Advance time
  time.tick++;
  if (time.tick >= TICKS_PER_DAY) {
    time.tick = 0;
    time.day++;
    if (time.day >= DAYS_PER_SEASON) {
      time.day = 0;
      time.season = (time.season + 1) % SEASONS_PER_YEAR;
      if (time.season === 0) {
        time.year++;
      }
    }
  }

  // Chunked tile simulation
  const chunkIdx = _tickCount % SIM_CHUNKS;
  const chunkSize = Math.ceil(GRID_SIZE / SIM_CHUNKS);
  const chunkStart = chunkIdx * chunkSize;
  const chunkEnd = Math.min(chunkStart + chunkSize, GRID_SIZE);

  applyClimate(tiles, time.season, chunkStart, chunkEnd);
  simulateWater(tiles, chunkStart, chunkEnd);
  simulateSoil(tiles, governance, chunkStart, chunkEnd);
  simulateVegetation(tiles, governance, chunkStart, chunkEnd);
  applyGovernance(tiles, governance, chunkStart, chunkEnd);

  // Animals run every tick (usually <200 entities)
  simulateAnimals(animals, tiles, governance, _tickCount);

  // Stats computed less frequently (every 50 ticks = 5 seconds)
  if (_tickCount % 50 === 0) {
    computeStats(island);
  }

  gameState._dirty = true;
}
