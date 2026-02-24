import { bus } from '../engine/events.js';
import { createRng } from '../engine/rng.js';
import { createAnimal } from './animals.js';
import { SPECIES_LIST, UNLOCK_SPECIES } from '../data/species.js';

const _rng = createRng(Date.now() ^ 0xBEEF);
const EVENT_CHECK_INTERVAL = 500;
const EVENT_COOLDOWN = 1000;

let _lastEventTick = -EVENT_COOLDOWN;
let _pendingChain = null;
let _unlockedSpecies = new Set();
let _ecoScore = 0;

export function setEcoScoreForEvents(score) {
  _ecoScore = score;
}

export function loadEventState(flags) {
  if (flags?.unlockedSpecies) {
    _unlockedSpecies = new Set(flags.unlockedSpecies);
  }
}

export function saveEventState(flags) {
  flags.unlockedSpecies = [..._unlockedSpecies];
}

export function getUnlockedSpecies() {
  return _unlockedSpecies;
}

function _checkSpeciesUnlocks(gameState) {
  for (const spec of UNLOCK_SPECIES) {
    if (_unlockedSpecies.has(spec.id)) continue;
    if (_ecoScore >= spec.unlockScore) {
      _unlockedSpecies.add(spec.id);

      bus.emit('storyEvent', {
        text: `New species discovered: ${spec.emoji} ${spec.name}!`,
        type: 'unlock',
        detail: `${spec.name}s have been spotted near the island. You can now place them with the Animal tool.`,
      });

      bus.emit('notification', {
        message: `${spec.emoji} ${spec.name} unlocked!`,
        type: 'success',
        icon: spec.emoji,
      });

      const island = gameState.islands[0];
      const tiles = island.world.tiles;
      const animals = island.entities.animals;
      const landTiles = [];
      for (let y = 0; y < tiles.h; y += 4) {
        for (let x = 0; x < tiles.w; x += 4) {
          if (tiles.isLand(x, y) && tiles.getVeg(x, y) > 0.1) {
            landTiles.push([x, y]);
          }
        }
      }
      if (landTiles.length > 0) {
        const count = 3 + (_rng() * 3) | 0;
        for (let i = 0; i < count; i++) {
          const [x, y] = landTiles[(_rng() * landTiles.length) | 0];
          const animal = createAnimal(spec.id, x + _rng(), y + _rng());
          if (animal) animals.push(animal);
        }
      }

      gameState._dirty = true;
    }
  }
}

const EVENT_DEFS = [
  {
    id: 'migration_wave',
    probability: 0.12,
    execute(gameState) {
      const island = gameState.islands[0];
      const tiles = island.world.tiles;
      const animals = island.entities.animals;

      const available = SPECIES_LIST.filter(s => !s.unlockScore || _unlockedSpecies.has(s.id));
      const species = available[(_rng() * available.length) | 0];
      const count = 3 + (_rng() * 5) | 0;

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

      bus.emit('storyEvent', {
        text: `A group of ${count} ${species.name.toLowerCase()}s migrated to the island.`,
        type: 'event',
        detail: 'Drawn by the island\'s resources.',
      });
    },
  },
  {
    id: 'bloom',
    probability: 0.10,
    execute(gameState) {
      const tiles = gameState.islands[0].world.tiles;
      const cx = (_rng() * tiles.w) | 0;
      const cy = (_rng() * tiles.h) | 0;
      const radius = 10 + (_rng() * 15) | 0;
      let count = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > radius * radius) continue;
          const x = cx + dx, y = cy + dy;
          if (!tiles.inBounds(x, y) || tiles.isOcean(x, y)) continue;
          tiles.setVeg(x, y, Math.min(1, tiles.getVeg(x, y) + 0.15));
          tiles.setSoil(x, y, Math.min(1, tiles.getSoil(x, y) + 0.05));
          count++;
        }
      }

      bus.emit('storyEvent', {
        text: `A vegetation bloom enriched ${count} tiles with new growth.`,
        type: 'event',
      });
    },
  },
  {
    id: 'disease_chain',
    probability: 0.06,
    execute(gameState) {
      const animals = gameState.islands[0].entities.animals;
      if (animals.length < 10) return;

      const speciesCounts = {};
      for (const a of animals) {
        speciesCounts[a.speciesId] = (speciesCounts[a.speciesId] || 0) + 1;
      }
      let targetSpecies = null, maxPop = 0;
      for (const [id, count] of Object.entries(speciesCounts)) {
        if (count > maxPop) { maxPop = count; targetSpecies = id; }
      }
      if (!targetSpecies || maxPop < 8) return;

      const spec = SPECIES_LIST.find(s => s.id === targetSpecies);
      bus.emit('storyEvent', {
        text: `Some ${spec?.name || targetSpecies}s appear lethargic. Could be illness.`,
        type: 'warning',
        detail: 'The disease may spread further...',
      });

      _pendingChain = {
        ticksUntil: 150,
        execute(gs) {
          const animals2 = gs.islands[0].entities.animals;
          let affected = 0;
          for (const a of animals2) {
            if (a.speciesId === targetSpecies && _rng() < 0.4) {
              a.energy -= 0.3;
              a.hunger += 0.2;
              affected++;
            }
          }
          bus.emit('storyEvent', {
            text: `Disease spreads! ${affected} ${spec?.name || targetSpecies}s are weakened.`,
            type: 'warning',
            detail: 'Only the strongest will survive.',
          });

          _pendingChain = {
            ticksUntil: 200,
            execute(gs2) {
              const animals3 = gs2.islands[0].entities.animals;
              const survivors = animals3.filter(a => a.speciesId === targetSpecies).length;
              if (survivors > 0) {
                for (const a of animals3) {
                  if (a.speciesId === targetSpecies) a.energy = Math.min(1, a.energy + 0.1);
                }
                bus.emit('storyEvent', {
                  text: `The ${spec?.name} population recovers. ${survivors} survived.`,
                  type: 'event',
                  detail: 'Survivors developed natural resistance.',
                });
              } else {
                bus.emit('storyEvent', { text: `The disease was devastating. No ${spec?.name}s remain.`, type: 'death' });
              }
            },
          };
        },
      };
    },
  },
  {
    id: 'fertile_rain',
    probability: 0.08,
    execute(gameState) {
      const tiles = gameState.islands[0].world.tiles;
      for (let y = 0; y < tiles.h; y += 2) {
        for (let x = 0; x < tiles.w; x += 2) {
          if (tiles.isOcean(x, y)) continue;
          tiles.setWater(x, y, Math.min(1, tiles.getWater(x, y) + 0.08));
          tiles.setSoil(x, y, Math.min(1, tiles.getSoil(x, y) + 0.03));
        }
      }
      bus.emit('storyEvent', { text: 'Mineral-rich rains replenished water and soil across the island.', type: 'event' });
    },
  },
  {
    id: 'wildfire',
    probability: 0.04,
    execute(gameState) {
      const tiles = gameState.islands[0].world.tiles;
      let startX = -1, startY = -1;
      for (let attempt = 0; attempt < 20; attempt++) {
        const x = (_rng() * tiles.w) | 0;
        const y = (_rng() * tiles.h) | 0;
        if (tiles.isLand(x, y) && tiles.getVeg(x, y) > 0.5 && tiles.getWater(x, y) < 0.2) {
          startX = x; startY = y; break;
        }
      }
      if (startX < 0) return;

      const radius = 5 + (_rng() * 8) | 0;
      let burned = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > radius * radius) continue;
          const x = startX + dx, y = startY + dy;
          if (!tiles.inBounds(x, y) || tiles.isOcean(x, y)) continue;
          if (tiles.getVeg(x, y) > 0.1) {
            tiles.setVeg(x, y, Math.max(0, tiles.getVeg(x, y) - 0.3 - _rng() * 0.2));
            burned++;
          }
        }
      }

      bus.emit('storyEvent', {
        text: `Wildfire scorched ${burned} tiles. Dry vegetation ignited.`,
        type: 'warning',
        detail: 'The land will recover in time — fire enriches the soil.',
      });

      _pendingChain = {
        ticksUntil: 400,
        execute(gs) {
          const t2 = gs.islands[0].world.tiles;
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              if (dx * dx + dy * dy > radius * radius) continue;
              const x = startX + dx, y = startY + dy;
              if (!t2.inBounds(x, y) || t2.isOcean(x, y)) continue;
              t2.setSoil(x, y, Math.min(1, t2.getSoil(x, y) + 0.1));
              t2.setVeg(x, y, Math.min(1, t2.getVeg(x, y) + 0.05));
            }
          }
          bus.emit('storyEvent', { text: 'New growth emerges from the ashes. Life persists.', type: 'event' });
        },
      };
    },
  },
  {
    id: 'predator_surge',
    probability: 0.05,
    execute(gameState) {
      const animals = gameState.islands[0].entities.animals;
      const predators = animals.filter(a => {
        const s = SPECIES_LIST.find(sp => sp.id === a.speciesId);
        return s?.type === 'predator';
      });
      if (predators.length < 3) return;

      for (const p of predators) {
        p.energy = Math.min(1, p.energy + 0.2);
        p.hunger += 0.3;
      }
      bus.emit('storyEvent', {
        text: `Predators grow restless. ${predators.length} hunters prowl with unusual aggression.`,
        type: 'warning',
        detail: 'Herbivore populations may be at risk.',
      });
    },
  },
];

export function checkRandomEvents(gameState, tick) {
  if (_pendingChain) {
    _pendingChain.ticksUntil--;
    if (_pendingChain.ticksUntil <= 0) {
      const chain = _pendingChain;
      _pendingChain = null;
      chain.execute(gameState);
    }
  }

  if (tick % 200 === 0) {
    _checkSpeciesUnlocks(gameState);
  }

  if (tick - _lastEventTick < EVENT_COOLDOWN) return;
  if (tick % EVENT_CHECK_INTERVAL !== 0) return;

  for (const evt of EVENT_DEFS) {
    if (_rng() < evt.probability / EVENT_DEFS.length) {
      evt.execute(gameState);
      _lastEventTick = tick;
      return;
    }
  }
}
