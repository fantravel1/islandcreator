import { SPECIES } from '../data/species.js';
import {
  MAX_ANIMALS, ANIMAL_SIGHT_RANGE, REPRODUCTION_THRESHOLD,
  GRID_W, GRID_H,
} from '../data/constants.js';
import { createRng } from '../engine/rng.js';
import { bus } from '../engine/events.js';

let _nextId = 1;
const _rng = createRng(Date.now());

export function createAnimal(speciesId, x, y) {
  const spec = SPECIES[speciesId];
  if (!spec) return null;
  return {
    id: _nextId++,
    speciesId,
    x, y,
    energy: 0.5 + _rng() * 0.3,
    ageDays: 0,
    sex: _rng() > 0.5 ? 'F' : 'M',
    hunger: 0.3,
    thirst: 0.3,
    fear: 0,
    state: 'wander',
    target: null,
    cooldown: 0,
    // Flocking velocity
    vx: 0,
    vy: 0,
  };
}

// Spatial hash for fast neighbor lookups
class SpatialHash {
  constructor() {
    this.cells = new Map();
    this.cellSize = 8;
  }

  clear() {
    this.cells.clear();
  }

  _key(x, y) {
    const cx = (x / this.cellSize) | 0;
    const cy = (y / this.cellSize) | 0;
    return cx + cy * 1000;
  }

  insert(animal) {
    const key = this._key(animal.x, animal.y);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = [];
      this.cells.set(key, cell);
    }
    cell.push(animal);
  }

  query(x, y, radius, out) {
    if (!out) out = [];
    out.length = 0;
    const r2 = radius * radius;
    const cx1 = ((x - radius) / this.cellSize) | 0;
    const cy1 = ((y - radius) / this.cellSize) | 0;
    const cx2 = ((x + radius) / this.cellSize) | 0;
    const cy2 = ((y + radius) / this.cellSize) | 0;

    for (let cy = cy1; cy <= cy2; cy++) {
      for (let cx = cx1; cx <= cx2; cx++) {
        const cell = this.cells.get(cx + cy * 1000);
        if (!cell) continue;
        for (let i = 0; i < cell.length; i++) {
          const a = cell[i];
          const dx = a.x - x;
          const dy = a.y - y;
          if (dx * dx + dy * dy <= r2) {
            out.push(a);
          }
        }
      }
    }
    return out;
  }
}

const hash = new SpatialHash();

// Reusable query buffers to avoid per-frame allocations
const _nearbyBuf = [];
const _sameSpeciesBuf = [];
const _threatBuf = [];
const _predNearbyBuf = [];

// Flocking constants
const FLOCK_SEPARATION_DIST = 1.5;
const FLOCK_ALIGNMENT_WEIGHT = 0.3;
const FLOCK_COHESION_WEIGHT = 0.2;
const FLOCK_SEPARATION_WEIGHT = 0.5;

const _flockResult = { fx: 0, fy: 0 };
const FLOCK_SEP_DIST_SQ = FLOCK_SEPARATION_DIST * FLOCK_SEPARATION_DIST;

function _computeFlocking(a, sameSpecies) {
  _flockResult.fx = 0;
  _flockResult.fy = 0;
  if (sameSpecies.length <= 1) return _flockResult;

  let sepX = 0, sepY = 0;
  let alignX = 0, alignY = 0;
  let cohX = 0, cohY = 0;
  let count = 0;

  for (let j = 0; j < sameSpecies.length; j++) {
    const other = sameSpecies[j];
    if (other.id === a.id) continue;
    const dx = a.x - other.x;
    const dy = a.y - other.y;
    const d2 = dx * dx + dy * dy;

    // Separation: steer away from very close neighbors
    if (d2 < FLOCK_SEP_DIST_SQ && d2 > 0.0001) {
      const dist = Math.sqrt(d2);
      sepX += (dx / dist) / dist;
      sepY += (dy / dist) / dist;
    }

    // Alignment: match velocity of neighbors
    alignX += other.vx || 0;
    alignY += other.vy || 0;

    // Cohesion: move toward center of nearby group
    cohX += other.x;
    cohY += other.y;
    count++;
  }

  if (count === 0) return _flockResult;

  alignX /= count;
  alignY /= count;
  cohX = cohX / count - a.x;
  cohY = cohY / count - a.y;

  _flockResult.fx = sepX * FLOCK_SEPARATION_WEIGHT + alignX * FLOCK_ALIGNMENT_WEIGHT + cohX * FLOCK_COHESION_WEIGHT;
  _flockResult.fy = sepY * FLOCK_SEPARATION_WEIGHT + alignY * FLOCK_ALIGNMENT_WEIGHT + cohY * FLOCK_COHESION_WEIGHT;
  return _flockResult;
}

export function simulateAnimals(animals, tiles, governance, tick) {
  // Rebuild spatial hash
  hash.clear();
  for (let i = 0; i < animals.length; i++) {
    hash.insert(animals[i]);
  }

  const toAdd = [];
  const ageFrame = tick % 100 === 0;
  let removeCount = 0;

  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    const spec = SPECIES[a.speciesId];
    if (!spec) continue;

    // Age
    if (ageFrame) a.ageDays++;

    // Hunger and thirst increase
    a.hunger = Math.min(1, a.hunger + spec.hungerRate);
    a.thirst = Math.min(1, a.thirst + spec.thirstRate);

    // Energy drains with hunger/thirst
    a.energy -= (a.hunger * 0.002 + a.thirst * 0.001);
    if (a.cooldown > 0) a.cooldown--;

    // Death conditions
    if (a.energy <= 0 || a.ageDays > spec.maxAge) {
      a._dead = true;
      removeCount++;
      _reportDeath(a, spec, tick);
      continue;
    }

    // Decision making
    const tx = (a.x | 0);
    const ty = (a.y | 0);
    const inProtected = tiles.inBounds(tx, ty) && tiles.isProtected(tx, ty);
    const huntingAllowed = !inProtected || governance.enforcement < 0.5;

    // Get nearby and build same-species list inline (avoids .filter allocation)
    const nearby = hash.query(a.x, a.y, 5, _nearbyBuf);
    _sameSpeciesBuf.length = 0;
    const sid = a.speciesId;
    for (let j = 0; j < nearby.length; j++) {
      if (nearby[j].speciesId === sid) _sameSpeciesBuf.push(nearby[j]);
    }

    if (spec.type === 'herbivore') {
      _updateHerbivore(a, spec, tiles, governance, hash, huntingAllowed, _sameSpeciesBuf);
    } else {
      _updatePredator(a, spec, tiles, animals, hash, huntingAllowed, _sameSpeciesBuf);
    }

    // Reproduction
    if (a.energy > spec.reproductionThreshold && a.cooldown <= 0 && animals.length + toAdd.length < MAX_ANIMALS) {
      let mate = null;
      for (let j = 0; j < _sameSpeciesBuf.length; j++) {
        const o = _sameSpeciesBuf[j];
        if (o.id !== a.id && o.sex !== a.sex && o.energy > 0.4) { mate = o; break; }
      }
      if (mate) {
        const baby = createAnimal(
          a.speciesId,
          a.x + (_rng() - 0.5) * 2,
          a.y + (_rng() - 0.5) * 2
        );
        baby.energy = 0.4;
        toAdd.push(baby);
        a.energy -= 0.3;
        a.cooldown = spec.reproductionCooldown;
        mate.energy -= 0.15;
        mate.cooldown = spec.reproductionCooldown;
        bus.emit('animalBirth', { parentId: a.id, mateId: mate.id, babyId: baby.id });
      }
    }

    // Clamp position
    a.x = Math.max(0, Math.min(GRID_W - 1, a.x));
    a.y = Math.max(0, Math.min(GRID_H - 1, a.y));
  }

  // Remove dead animals with swap-and-pop (O(n) instead of O(n^2) splice)
  if (removeCount > 0) {
    let write = 0;
    for (let read = 0; read < animals.length; read++) {
      if (!animals[read]._dead) {
        if (write !== read) animals[write] = animals[read];
        write++;
      }
    }
    animals.length = write;
  }

  // Add newborns
  for (let i = 0; i < toAdd.length; i++) {
    animals.push(toAdd[i]);
  }
}

function _updateHerbivore(a, spec, tiles, governance, hash, huntingAllowed, sameSpecies) {
  // Check fear (nearby predators)
  a.fear = 0;
  const nearbyThreats = hash.query(a.x, a.y, spec.sightRange, _threatBuf);
  const sightRangeSq = spec.sightRange * spec.sightRange;
  for (let j = 0; j < nearbyThreats.length; j++) {
    const other = nearbyThreats[j];
    const otherSpec = SPECIES[other.speciesId];
    if (otherSpec && otherSpec.type === 'predator' && otherSpec.prey?.includes(a.speciesId)) {
      const dx = other.x - a.x;
      const dy = other.y - a.y;
      const d2 = dx * dx + dy * dy;
      a.fear = Math.max(a.fear, 1 - Math.sqrt(d2) / spec.sightRange);
    }
  }

  // State selection
  if (a.fear > 0.5) {
    a.state = 'flee';
  } else if (a.hunger > 0.6) {
    a.state = 'seekFood';
  } else if (a.thirst > 0.6) {
    a.state = 'seekWater';
  } else if (a.energy < 0.3) {
    a.state = 'rest';
  } else {
    a.state = 'wander';
  }

  // Compute flocking influence
  const flock = _computeFlocking(a, sameSpecies);
  const flockStrength = a.state === 'wander' ? 0.4 : a.state === 'flee' ? 0.6 : 0.15;

  let moveX = 0, moveY = 0;

  switch (a.state) {
    case 'flee': {
      // Run away from nearest predator
      let fleeX = 0, fleeY = 0;
      for (let j = 0; j < nearbyThreats.length; j++) {
        const other = nearbyThreats[j];
        const otherSpec = SPECIES[other.speciesId];
        if (otherSpec?.type === 'predator') {
          fleeX += a.x - other.x;
          fleeY += a.y - other.y;
        }
      }
      const fLen = Math.sqrt(fleeX * fleeX + fleeY * fleeY) || 1;
      moveX = (fleeX / fLen) * spec.speed * 1.3;
      moveY = (fleeY / fLen) * spec.speed * 1.3;
      break;
    }
    case 'seekFood': {
      let bestVeg = 0, bestX = a.x, bestY = a.y;
      const range = 4;
      const ax = Math.floor(a.x);
      const ay = Math.floor(a.y);
      for (let dy = -range; dy <= range; dy++) {
        for (let dx = -range; dx <= range; dx++) {
          const nx = ax + dx, ny = ay + dy;
          if (tiles.inBounds(nx, ny) && tiles.isLand(nx, ny)) {
            const v = tiles.getVeg(nx, ny);
            if (v > bestVeg) {
              bestVeg = v;
              bestX = nx + 0.5;
              bestY = ny + 0.5;
            }
          }
        }
      }
      const tdx = bestX - a.x;
      const tdy = bestY - a.y;
      const tdist = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
      moveX = (tdx / tdist) * spec.speed;
      moveY = (tdy / tdist) * spec.speed;

      // Eat at current tile
      const tx = Math.floor(a.x);
      const ty = Math.floor(a.y);
      if (tiles.inBounds(tx, ty)) {
        const veg = tiles.getVeg(tx, ty);
        if (veg > 0.05) {
          const eat = Math.min(veg, 0.02);
          tiles.setVeg(tx, ty, veg - eat);
          a.hunger = Math.max(0, a.hunger - spec.energyFromFood * eat * 10);
          a.energy = Math.min(1, a.energy + spec.energyFromFood * eat * 5);
        }
      }
      break;
    }
    case 'seekWater': {
      let bestDist = Infinity, bestX = a.x, bestY = a.y;
      const range = 6;
      const ax = Math.floor(a.x);
      const ay = Math.floor(a.y);
      for (let dy = -range; dy <= range; dy++) {
        for (let dx = -range; dx <= range; dx++) {
          const nx = ax + dx, ny = ay + dy;
          if (tiles.inBounds(nx, ny) && tiles.getWater(nx, ny) > 0.3) {
            const d = dx * dx + dy * dy;
            if (d < bestDist) {
              bestDist = d;
              bestX = nx + 0.5;
              bestY = ny + 0.5;
            }
          }
        }
      }
      const wdx = bestX - a.x;
      const wdy = bestY - a.y;
      const wdist = Math.sqrt(wdx * wdx + wdy * wdy) || 1;
      moveX = (wdx / wdist) * spec.speed;
      moveY = (wdy / wdist) * spec.speed;

      // Drink
      const tx = Math.floor(a.x);
      const ty = Math.floor(a.y);
      if (tiles.inBounds(tx, ty) && tiles.getWater(tx, ty) > 0.2) {
        a.thirst = Math.max(0, a.thirst - spec.energyFromWater);
        a.energy = Math.min(1, a.energy + 0.02);
      }
      break;
    }
    case 'rest':
      a.energy = Math.min(1, a.energy + 0.005);
      break;
    default: // wander
      moveX = (_rng() - 0.5) * spec.speed;
      moveY = (_rng() - 0.5) * spec.speed;
      break;
  }

  // Apply flocking
  moveX += flock.fx * flockStrength;
  moveY += flock.fy * flockStrength;

  // Smooth velocity
  a.vx = a.vx * 0.6 + moveX * 0.4;
  a.vy = a.vy * 0.6 + moveY * 0.4;

  a.x += a.vx;
  a.y += a.vy;

  _stayOnLand(a, tiles);
}

function _updatePredator(a, spec, tiles, animals, hash, huntingAllowed, sameSpecies) {
  if (a.hunger > 0.5 && huntingAllowed) {
    a.state = 'seekFood';
  } else if (a.thirst > 0.6) {
    a.state = 'seekWater';
  } else if (a.energy < 0.3) {
    a.state = 'rest';
  } else {
    a.state = 'wander';
  }

  const flock = _computeFlocking(a, sameSpecies);
  const flockStrength = a.state === 'wander' ? 0.25 : 0.1;

  let moveX = 0, moveY = 0;

  switch (a.state) {
    case 'seekFood': {
      const nearby = hash.query(a.x, a.y, spec.sightRange, _predNearbyBuf);
      let closestPrey = null;
      let closestDist = Infinity;
      for (let j = 0; j < nearby.length; j++) {
        const other = nearby[j];
        if (spec.prey?.includes(other.speciesId)) {
          const dx = other.x - a.x;
          const dy = other.y - a.y;
          const d = dx * dx + dy * dy;
          if (d < closestDist) {
            closestDist = d;
            closestPrey = other;
          }
        }
      }
      if (closestPrey) {
        const pdx = closestPrey.x - a.x;
        const pdy = closestPrey.y - a.y;
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
        moveX = (pdx / pdist) * spec.speed;
        moveY = (pdy / pdist) * spec.speed;
        // Catch prey
        if (closestDist < 1 && !closestPrey._dead) {
          closestPrey._dead = true;
          a.hunger = Math.max(0, a.hunger - 0.5);
          a.energy = Math.min(1, a.energy + spec.energyFromFood);
          bus.emit('animalKill', { predatorId: a.id, preyId: closestPrey.id });
          const preySpec = SPECIES[closestPrey.speciesId];
          if (preySpec) _reportPredation(closestPrey, preySpec, a, spec);
        }
      } else {
        moveX = (_rng() - 0.5) * spec.speed;
        moveY = (_rng() - 0.5) * spec.speed;
      }
      break;
    }
    case 'seekWater': {
      let bestDist = Infinity, bestX = a.x, bestY = a.y;
      const range = 6;
      const ax = Math.floor(a.x);
      const ay = Math.floor(a.y);
      for (let dy = -range; dy <= range; dy++) {
        for (let dx = -range; dx <= range; dx++) {
          const nx = ax + dx, ny = ay + dy;
          if (tiles.inBounds(nx, ny) && tiles.getWater(nx, ny) > 0.3) {
            const d = dx * dx + dy * dy;
            if (d < bestDist) {
              bestDist = d;
              bestX = nx + 0.5;
              bestY = ny + 0.5;
            }
          }
        }
      }
      const wdx = bestX - a.x;
      const wdy = bestY - a.y;
      const wdist = Math.sqrt(wdx * wdx + wdy * wdy) || 1;
      moveX = (wdx / wdist) * spec.speed;
      moveY = (wdy / wdist) * spec.speed;
      const tx = Math.floor(a.x);
      const ty = Math.floor(a.y);
      if (tiles.inBounds(tx, ty) && tiles.getWater(tx, ty) > 0.2) {
        a.thirst = Math.max(0, a.thirst - spec.energyFromWater);
        a.energy = Math.min(1, a.energy + 0.02);
      }
      break;
    }
    case 'rest':
      a.energy = Math.min(1, a.energy + 0.005);
      break;
    default:
      moveX = (_rng() - 0.5) * spec.speed;
      moveY = (_rng() - 0.5) * spec.speed;
      break;
  }

  // Apply flocking
  moveX += flock.fx * flockStrength;
  moveY += flock.fy * flockStrength;

  // Smooth velocity
  a.vx = a.vx * 0.6 + moveX * 0.4;
  a.vy = a.vy * 0.6 + moveY * 0.4;

  a.x += a.vx;
  a.y += a.vy;

  _stayOnLand(a, tiles);
}

function _stayOnLand(a, tiles) {
  const tx = Math.floor(a.x);
  const ty = Math.floor(a.y);
  if (!tiles.inBounds(tx, ty) || tiles.isOcean(tx, ty)) {
    const cx = tiles.w / 2;
    const cy = tiles.h / 2;
    const dx = cx - a.x;
    const dy = cy - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    a.x += (dx / dist) * 0.5;
    a.y += (dy / dist) * 0.5;
  }
}

// --- Death cause notifications (throttled so they don't spam) ---
let _lastDeathNotifTick = 0;
let _lastPredationNotifTick = 0;

function _reportDeath(animal, spec, tick) {
  // Only report occasionally — ~1 in 6 deaths, and at most once per 500 ticks
  if (tick - _lastDeathNotifTick < 500) return;
  if (_rng() > 0.16) return;
  _lastDeathNotifTick = tick;

  const name = animal.name || spec.name;
  let msg, icon;
  if (animal.ageDays > spec.maxAge) {
    msg = `${name} died of old age after ${(animal.ageDays / 120).toFixed(1)} years.`;
    icon = '🕊️';
  } else if (animal.thirst > 0.8 && animal.hunger <= 0.6) {
    msg = `${name} died of dehydration. The land needs more water.`;
    icon = '💧';
  } else if (animal.hunger > 0.8) {
    msg = `${name} starved. ${spec.type === 'predator' ? 'Not enough prey to hunt.' : 'Not enough vegetation to eat.'}`;
    icon = '🍂';
  } else {
    msg = `${name} perished from exhaustion.`;
    icon = '💀';
  }
  bus.emit('notification', { message: msg, type: 'info', icon });
}

function _reportPredation(prey, preySpec, predator, predSpec) {
  // Only report occasionally — ~1 in 8 kills
  const tick = _lastPredationNotifTick; // approximate
  if (performance.now() - _lastPredationNotifTick < 8000) return;
  if (_rng() > 0.12) return;
  _lastPredationNotifTick = performance.now();

  const predName = predator.name || predSpec.name;
  const preyName = prey.name || preySpec.name;
  bus.emit('notification', {
    message: `${predName} caught a ${preyName}.`,
    type: 'info',
    icon: predSpec.emoji,
  });
}
