import { bus } from '../engine/events.js';
import { createRng } from '../engine/rng.js';
import { createAnimal } from './animals.js';
import { SPECIES_LIST } from '../data/species.js';

const _rng = createRng(Date.now() ^ 0xBEEF);
const EVENT_CHECK_INTERVAL = 500; // ticks between event checks
const EVENT_COOLDOWN = 1000; // minimum ticks between events

let _lastEventTick = -EVENT_COOLDOWN;

const EVENT_DEFS = [
  {
    id: 'migration_wave',
    name: 'Migration Wave',
    probability: 0.12,
    execute(gameState) {
      const island = gameState.islands[0];
      const tiles = island.world.tiles;
      const animals = island.entities.animals;

      // Pick a random species
      const species = SPECIES_LIST[(_rng() * SPECIES_LIST.length) | 0];
      const count = 3 + (_rng() * 5) | 0;

      // Find land tiles for spawning
      const landTiles = [];
      for (let y = 0; y < tiles.h; y += 4) {
        for (let x = 0; x < tiles.w; x += 4) {
          if (tiles.isLand(x, y) && tiles.getVeg(x, y) > 0.1) {
            landTiles.push([x, y]);
          }
        }
      }
      if (landTiles.length === 0) return;

      for (let i = 0; i < count; i++) {
        const [x, y] = landTiles[(_rng() * landTiles.length) | 0];
        const animal = createAnimal(species.id, x + _rng(), y + _rng());
        if (animal) animals.push(animal);
      }

      bus.emit('notification', {
        message: `A group of ${count} ${species.name.toLowerCase()}s has migrated to the island!`,
        type: 'success',
        icon: species.emoji,
      });
    },
  },
  {
    id: 'bloom',
    name: 'Vegetation Bloom',
    probability: 0.10,
    execute(gameState) {
      const tiles = gameState.islands[0].world.tiles;
      const w = tiles.w;
      const h = tiles.h;

      // Boost vegetation in a random area
      const cx = (_rng() * w) | 0;
      const cy = (_rng() * h) | 0;
      const radius = 10 + (_rng() * 15) | 0;

      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > radius * radius) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (!tiles.inBounds(x, y) || tiles.isOcean(x, y)) continue;
          const veg = tiles.getVeg(x, y);
          tiles.setVeg(x, y, Math.min(1, veg + 0.15));
          const soil = tiles.getSoil(x, y);
          tiles.setSoil(x, y, Math.min(1, soil + 0.05));
          count++;
        }
      }

      bus.emit('notification', {
        message: `A vegetation bloom has enriched ${count} tiles with new growth!`,
        type: 'success',
        icon: '🌸',
      });
    },
  },
  {
    id: 'disease',
    name: 'Disease Outbreak',
    probability: 0.06,
    execute(gameState) {
      const animals = gameState.islands[0].entities.animals;
      if (animals.length < 10) return;

      // Pick a random species
      const speciesCounts = {};
      for (const a of animals) {
        speciesCounts[a.speciesId] = (speciesCounts[a.speciesId] || 0) + 1;
      }

      // Affect the most populous species
      let targetSpecies = null;
      let maxPop = 0;
      for (const [id, count] of Object.entries(speciesCounts)) {
        if (count > maxPop) {
          maxPop = count;
          targetSpecies = id;
        }
      }
      if (!targetSpecies || maxPop < 8) return;

      // Drain energy from affected species
      let affected = 0;
      for (const a of animals) {
        if (a.speciesId === targetSpecies && _rng() < 0.4) {
          a.energy -= 0.3;
          a.hunger += 0.2;
          affected++;
        }
      }

      const spec = SPECIES_LIST.find(s => s.id === targetSpecies);
      bus.emit('notification', {
        message: `Disease outbreak! ${affected} ${spec?.name || targetSpecies}s are affected.`,
        type: 'danger',
        icon: '🦠',
      });
    },
  },
  {
    id: 'fertile_rain',
    name: 'Fertile Rains',
    probability: 0.08,
    execute(gameState) {
      const tiles = gameState.islands[0].world.tiles;
      const w = tiles.w;
      const h = tiles.h;

      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          if (tiles.isOcean(x, y)) continue;
          const water = tiles.getWater(x, y);
          tiles.setWater(x, y, Math.min(1, water + 0.08));
          const soil = tiles.getSoil(x, y);
          tiles.setSoil(x, y, Math.min(1, soil + 0.03));
        }
      }

      bus.emit('notification', {
        message: 'Mineral-rich rains have replenished water and soil across the island!',
        type: 'success',
        icon: '💎',
      });
    },
  },
];

export function checkRandomEvents(gameState, tick) {
  if (tick - _lastEventTick < EVENT_COOLDOWN) return;
  if (tick % EVENT_CHECK_INTERVAL !== 0) return;

  // Roll for each event
  for (const evt of EVENT_DEFS) {
    if (_rng() < evt.probability / EVENT_DEFS.length) {
      evt.execute(gameState);
      _lastEventTick = tick;
      return; // Only one event per check
    }
  }
}
