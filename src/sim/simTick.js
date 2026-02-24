import { GRID_SIZE, SIM_CHUNKS, TICKS_PER_DAY, DAYS_PER_SEASON, SEASONS_PER_YEAR, SEASON_NAMES, GRACE_PERIOD_TICKS, BIOME_OCEAN } from '../data/constants.js';
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
let _lastWaterCrisisStory = 0;

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
        if (_tickCount > GRACE_PERIOD_TICKS) {
          bus.emit('storyEvent', {
            text: `Year ${time.year + 1} begins on ${island.name}.`,
            type: 'event',
            detail: `${animals.length} animals roam the island.`,
          });
        }
      }
      if (_tickCount > GRACE_PERIOD_TICKS) {
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

  // Water crisis — when ocean coverage drops too low, the island suffers
  const oceanRatio = island.stats.oceanRatio ?? 0;
  if (oceanRatio < 0.15) {
    _applyWaterCrisis(tiles, animals, oceanRatio, chunkStart, chunkEnd);
  }

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

// Catastrophic effects when the player removes too much ocean
function _applyWaterCrisis(tiles, animals, oceanRatio, chunkStart, chunkEnd) {
  // Severity: 0 at 0.15 ocean, 1.0 at 0 ocean
  const severity = Math.min(1, (0.15 - oceanRatio) / 0.15);
  const w = tiles.w;

  // Tile effects: drain water, kill vegetation, heat the land
  for (let i = chunkStart; i < chunkEnd; i++) {
    const x = i % w;
    const y = (i / w) | 0;
    if (tiles.getBiome(x, y) === BIOME_OCEAN) continue;

    // Accelerated water evaporation — no ocean means no water cycle
    const water = tiles.getWater(x, y);
    tiles.setWater(x, y, Math.max(0, water - 0.008 * severity));

    // Vegetation withers without water
    const veg = tiles.getVeg(x, y);
    tiles.setVeg(x, y, Math.max(0, veg - 0.006 * severity));

    // Soil erosion without moisture
    const soil = tiles.getSoil(x, y);
    tiles.setSoil(x, y, Math.max(0, soil - 0.003 * severity));

    // Temperature rises without ocean to regulate climate
    const temp = tiles.getTemp(x, y);
    tiles.setTemp(x, y, Math.min(0.95, temp + 0.002 * severity));
  }

  // Animal dehydration — direct energy drain proportional to severity
  if (_tickCount % 5 === 0) {
    for (const animal of animals) {
      animal.energy -= 0.01 * severity;
      animal.thirst = Math.min(1, (animal.thirst || 0) + 0.015 * severity);
    }
  }

  // Periodic crisis story events
  if (severity > 0.5 && _tickCount - _lastWaterCrisisStory > 2000) {
    _lastWaterCrisisStory = _tickCount;
    const messages = [
      'The rivers have dried to dust. Animals wander desperately seeking water.',
      'Without the ocean, the water cycle has collapsed. The land bakes under relentless heat.',
      'Mass dehydration sweeps the island. This cannot sustain life much longer.',
      'The island is becoming a desert wasteland. Restore the ocean or lose everything.',
    ];
    bus.emit('storyEvent', {
      text: messages[(_tickCount / 2000 | 0) % messages.length],
      type: 'warning',
      detail: 'Lower terrain with the sculpt tool to bring back the sea.',
    });
  }
}
