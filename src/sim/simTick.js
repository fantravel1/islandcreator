import { GRID_SIZE, SIM_CHUNKS, TICKS_PER_DAY, DAYS_PER_SEASON, SEASONS_PER_YEAR, SEASON_NAMES } from '../data/constants.js';
import { bus } from '../engine/events.js';
import { applyClimate } from './climate.js';
import { simulateWater } from './water.js';
import { simulateSoil } from './soil.js';
import { simulateVegetation } from './vegetation.js';
import { simulateAnimals } from './animals.js';
import { applyGovernance } from './governance.js';
import { computeStats } from './stats.js';
import { simulateStructures } from './structures.js';
import { checkRandomEvents } from './events.js';

let _tickCount = 0;
let _weatherSystem = null;
let _ecoScore = 0;

export function setEcoScoreForSim(score) {
  _ecoScore = score;
}

export function setWeatherSystem(ws) {
  _weatherSystem = ws;
}

export function simTick(gameState) {
  const island = gameState.islands[0];
  if (!island) return;

  _tickCount++;
  const tiles = island.world.tiles;
  const animals = island.entities.animals;
  const structures = island.entities.structures;
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
        bus.emit('storyEvent', {
          text: `Year ${time.year + 1} begins on ${island.name}.`,
          type: 'event',
          detail: `${animals.length} animals roam the island.`,
        });
      }
      const seasonFlavor = [
        'Fresh growth stirs across the land.',
        'Warm days and long light bathe the island.',
        'Leaves turn and the air cools.',
        'Cold settles in. The island endures.',
      ];
      bus.emit('storyEvent', {
        text: `${SEASON_NAMES[time.season]}, Year ${time.year + 1}.`,
        type: 'event',
        detail: seasonFlavor[time.season],
      });
    }
  }

  // Chunked tile simulation
  const chunkIdx = _tickCount % SIM_CHUNKS;
  const chunkSize = Math.ceil(GRID_SIZE / SIM_CHUNKS);
  const chunkStart = chunkIdx * chunkSize;
  const chunkEnd = Math.min(chunkStart + chunkSize, GRID_SIZE);

  applyClimate(tiles, time.season, chunkStart, chunkEnd);

  // Weather system
  if (_weatherSystem) {
    _weatherSystem.update(time.season, tiles, chunkStart, chunkEnd);
  }

  simulateWater(tiles, chunkStart, chunkEnd);
  simulateSoil(tiles, governance, chunkStart, chunkEnd);
  simulateVegetation(tiles, governance, chunkStart, chunkEnd);
  applyGovernance(tiles, governance, chunkStart, chunkEnd);

  // Structures every 10 ticks
  if (_tickCount % 10 === 0 && structures) {
    simulateStructures(structures, tiles, _ecoScore);
  }

  // Animals run every tick
  simulateAnimals(animals, tiles, governance, _tickCount);

  // Random events every ~50 seconds of sim time
  checkRandomEvents(gameState, _tickCount);

  // Stats computed less frequently
  if (_tickCount % 50 === 0) {
    computeStats(island);
  }

  gameState._dirty = true;
}
