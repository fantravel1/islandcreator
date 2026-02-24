import { SPECIES } from '../data/species.js';
import {
  MAX_ANIMALS, ANIMAL_SIGHT_RANGE, REPRODUCTION_THRESHOLD,
  GRID_W, GRID_H,
} from '../data/constants.js';
import { createRng } from '../engine/rng.js';

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

  query(x, y, radius) {
    const results = [];
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
          if (dx * dx + dy * dy <= radius * radius) {
            results.push(a);
          }
        }
      }
    }
    return results;
  }
}

const hash = new SpatialHash();

export function simulateAnimals(animals, tiles, governance, tick) {
  // Rebuild spatial hash
  hash.clear();
  for (let i = 0; i < animals.length; i++) {
    hash.insert(animals[i]);
  }

  const toRemove = [];
  const toAdd = [];

  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    const spec = SPECIES[a.speciesId];
    if (!spec) continue;

    // Age
    if (tick % 100 === 0) a.ageDays++;

    // Hunger and thirst increase
    a.hunger = Math.min(1, a.hunger + spec.hungerRate);
    a.thirst = Math.min(1, a.thirst + spec.thirstRate);

    // Energy drains with hunger/thirst
    a.energy -= (a.hunger * 0.002 + a.thirst * 0.001);
    if (a.cooldown > 0) a.cooldown--;

    // Death conditions
    if (a.energy <= 0 || a.ageDays > spec.maxAge) {
      toRemove.push(i);
      continue;
    }

    // Decision making
    const tx = Math.floor(a.x);
    const ty = Math.floor(a.y);
    const inProtected = tiles.inBounds(tx, ty) && tiles.isProtected(tx, ty);
    const huntingAllowed = !inProtected || governance.enforcement < 0.5;

    if (spec.type === 'herbivore') {
      _updateHerbivore(a, spec, tiles, governance, hash, huntingAllowed);
    } else {
      _updatePredator(a, spec, tiles, animals, hash, huntingAllowed, toRemove);
    }

    // Reproduction
    if (a.energy > spec.reproductionThreshold && a.cooldown <= 0 && animals.length + toAdd.length < MAX_ANIMALS) {
      const nearby = hash.query(a.x, a.y, 3);
      const mate = nearby.find(o =>
        o.id !== a.id &&
        o.speciesId === a.speciesId &&
        o.sex !== a.sex &&
        o.energy > 0.4
      );
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
      }
    }

    // Clamp position
    a.x = Math.max(0, Math.min(GRID_W - 1, a.x));
    a.y = Math.max(0, Math.min(GRID_H - 1, a.y));
  }

  // Remove dead (iterate backward)
  const removeSet = new Set(toRemove);
  for (let i = animals.length - 1; i >= 0; i--) {
    if (removeSet.has(i)) {
      animals.splice(i, 1);
    }
  }

  // Add newborns
  for (const baby of toAdd) {
    animals.push(baby);
  }
}

function _updateHerbivore(a, spec, tiles, governance, hash, huntingAllowed) {
  // Check fear (nearby predators)
  a.fear = 0;
  const nearbyThreats = hash.query(a.x, a.y, spec.sightRange);
  for (const other of nearbyThreats) {
    const otherSpec = SPECIES[other.speciesId];
    if (otherSpec && otherSpec.type === 'predator' && otherSpec.prey?.includes(a.speciesId)) {
      const dx = other.x - a.x;
      const dy = other.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      a.fear = Math.max(a.fear, 1 - dist / spec.sightRange);
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

  switch (a.state) {
    case 'flee': {
      // Run away from nearest predator
      let fleeX = 0, fleeY = 0;
      for (const other of nearbyThreats) {
        const otherSpec = SPECIES[other.speciesId];
        if (otherSpec?.type === 'predator') {
          fleeX += a.x - other.x;
          fleeY += a.y - other.y;
        }
      }
      const fLen = Math.sqrt(fleeX * fleeX + fleeY * fleeY) || 1;
      a.x += (fleeX / fLen) * spec.speed * 1.3;
      a.y += (fleeY / fLen) * spec.speed * 1.3;
      break;
    }
    case 'seekFood': {
      // Find tile with most vegetation nearby
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
      _moveToward(a, bestX, bestY, spec.speed);

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
      // Find nearest water
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
      _moveToward(a, bestX, bestY, spec.speed);

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
      a.x += (_rng() - 0.5) * spec.speed;
      a.y += (_rng() - 0.5) * spec.speed;
      // Stay on land
      _stayOnLand(a, tiles);
      break;
  }
}

function _updatePredator(a, spec, tiles, animals, hash, huntingAllowed, toRemove) {
  if (a.hunger > 0.5 && huntingAllowed) {
    a.state = 'seekFood';
  } else if (a.thirst > 0.6) {
    a.state = 'seekWater';
  } else if (a.energy < 0.3) {
    a.state = 'rest';
  } else {
    a.state = 'wander';
  }

  switch (a.state) {
    case 'seekFood': {
      // Find prey
      const nearby = hash.query(a.x, a.y, spec.sightRange);
      let closestPrey = null;
      let closestDist = Infinity;
      for (const other of nearby) {
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
        _moveToward(a, closestPrey.x, closestPrey.y, spec.speed);
        // Catch prey
        if (closestDist < 1) {
          const idx = animals.indexOf(closestPrey);
          if (idx >= 0) {
            toRemove.push(idx);
            a.hunger = Math.max(0, a.hunger - 0.5);
            a.energy = Math.min(1, a.energy + spec.energyFromFood);
          }
        }
      } else {
        a.x += (_rng() - 0.5) * spec.speed;
        a.y += (_rng() - 0.5) * spec.speed;
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
      _moveToward(a, bestX, bestY, spec.speed);
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
      a.x += (_rng() - 0.5) * spec.speed;
      a.y += (_rng() - 0.5) * spec.speed;
      _stayOnLand(a, tiles);
      break;
  }
}

function _moveToward(a, tx, ty, speed) {
  const dx = tx - a.x;
  const dy = ty - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 0.1) {
    a.x += (dx / dist) * speed;
    a.y += (dy / dist) * speed;
  }
}

function _stayOnLand(a, tiles) {
  const tx = Math.floor(a.x);
  const ty = Math.floor(a.y);
  if (!tiles.inBounds(tx, ty) || tiles.isOcean(tx, ty)) {
    // Push back toward center
    const cx = tiles.w / 2;
    const cy = tiles.h / 2;
    _moveToward(a, cx, cy, 0.5);
  }
}
