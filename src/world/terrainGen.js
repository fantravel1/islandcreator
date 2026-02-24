import { TileGrid } from './tiles.js';
import { createNoise2D, fbm, createRng } from '../engine/rng.js';
import {
  GRID_W, GRID_H,
  BIOME_OCEAN, BIOME_FOREST, BIOME_GRASSLAND, BIOME_DESERT,
  BIOME_TUNDRA, BIOME_JUNGLE,
} from '../data/constants.js';

export function generateIsland(seed) {
  const grid = new TileGrid(GRID_W, GRID_H);
  const rng = createRng(seed);

  const elevNoise = createNoise2D(seed);
  const moistNoise = createNoise2D(seed + 1000);
  const tempNoise = createNoise2D(seed + 2000);

  const cx = GRID_W / 2;
  const cy = GRID_H / 2;
  const maxDist = Math.min(cx, cy) * 0.85;

  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const nx = x / GRID_W;
      const ny = y / GRID_H;

      // --- Elevation ---
      let elev = fbm(elevNoise, nx * 4, ny * 4, 4, 2.0, 0.5);
      elev = (elev + 1) * 0.5;

      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const falloff = Math.max(0, 1 - (dist / maxDist));
      const falloffCurve = falloff * falloff * (3 - 2 * falloff);
      elev = elev * falloffCurve;

      const coastNoise = fbm(elevNoise, nx * 8, ny * 8, 2, 2.0, 0.5);
      elev += coastNoise * 0.05;

      elev = Math.max(0, Math.min(1, elev));
      grid.setH(x, y, elev);

      // --- Moisture ---
      let moisture = fbm(moistNoise, nx * 3, ny * 3, 3, 2.0, 0.5);
      moisture = (moisture + 1) * 0.5;

      // --- Temperature ---
      let temp = fbm(tempNoise, nx * 2, ny * 2, 2, 2.0, 0.5);
      temp = (temp + 1) * 0.5;
      temp = 0.3 + temp * 0.5;
      // Altitude cools temperature
      if (elev > 0.3) {
        temp -= (elev - 0.3) * 0.3;
      }
      temp = Math.max(0.05, Math.min(0.95, temp));
      grid.setTemp(x, y, temp);

      // --- Biome assignment (6 biomes) ---
      let biome;
      if (elev < 0.3) {
        biome = BIOME_OCEAN;
        grid.setWater(x, y, 1.0);
        grid.setSoil(x, y, 0);
        grid.setVeg(x, y, 0);
      } else {
        grid.setWater(x, y, Math.max(0, moisture * 0.3));

        if (temp < 0.3) {
          biome = BIOME_TUNDRA;
          grid.setSoil(x, y, 0.15 + rng() * 0.15);
          grid.setVeg(x, y, 0.05 + rng() * 0.15);
        } else if (temp > 0.65 && moisture > 0.5) {
          biome = BIOME_JUNGLE;
          grid.setSoil(x, y, 0.7 + rng() * 0.25);
          grid.setVeg(x, y, 0.6 + rng() * 0.35);
        } else if (moisture > 0.55 && temp < 0.65) {
          biome = BIOME_FOREST;
          grid.setSoil(x, y, 0.6 + rng() * 0.3);
          grid.setVeg(x, y, 0.5 + rng() * 0.4);
        } else if (moisture < 0.35 && temp > 0.55) {
          biome = BIOME_DESERT;
          grid.setSoil(x, y, 0.1 + rng() * 0.15);
          grid.setVeg(x, y, rng() * 0.1);
        } else {
          biome = BIOME_GRASSLAND;
          grid.setSoil(x, y, 0.4 + rng() * 0.3);
          grid.setVeg(x, y, 0.3 + rng() * 0.3);
        }
      }
      grid.setBiome(x, y, biome);
    }
  }

  // --- Generate rivers ---
  _generateRivers(grid, seed);

  return grid;
}

function _generateRivers(grid, seed) {
  const rng = createRng(seed + 5000);
  const numRivers = 2 + (rng() * 3) | 0;

  const peaks = [];
  for (let y = 10; y < GRID_H - 10; y += 4) {
    for (let x = 10; x < GRID_W - 10; x += 4) {
      const h = grid.getH(x, y);
      if (h > 0.6 && !grid.isOcean(x, y)) {
        peaks.push({ x, y, h });
      }
    }
  }
  peaks.sort((a, b) => b.h - a.h);

  for (let r = 0; r < Math.min(numRivers, peaks.length); r++) {
    const start = peaks[r];
    _carveRiver(grid, start.x, start.y, rng);
  }
}

function _carveRiver(grid, startX, startY, rng) {
  let x = startX;
  let y = startY;
  const visited = new Set();

  for (let step = 0; step < 200; step++) {
    const key = x + y * 1000;
    if (visited.has(key)) break;
    visited.add(key);

    if (!grid.inBounds(x, y) || grid.isOcean(x, y)) break;

    // Add water to this tile
    grid.setWater(x, y, Math.min(1, grid.getWater(x, y) + 0.4));
    // Slight channel
    grid.setH(x, y, Math.max(0.3, grid.getH(x, y) - 0.01));

    // Boost soil along riverbanks
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (grid.inBounds(nx, ny) && !grid.isOcean(nx, ny)) {
          grid.setSoil(nx, ny, Math.min(1, grid.getSoil(nx, ny) + 0.1));
          grid.setWater(nx, ny, Math.min(1, grid.getWater(nx, ny) + 0.15));
        }
      }
    }

    // Flow downhill
    const h = grid.getH(x, y);
    let bestX = x, bestY = y, lowestH = h;
    const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];

    for (const [ddx, ddy] of dirs) {
      const nx = x + ddx;
      const ny = y + ddy;
      if (!grid.inBounds(nx, ny)) continue;
      const nh = grid.getH(nx, ny);
      if (nh < lowestH) {
        lowestH = nh;
        bestX = nx;
        bestY = ny;
      }
    }

    // If stuck, break in a random valid direction
    if (bestX === x && bestY === y) {
      const valid = dirs
        .map(([ddx, ddy]) => [x + ddx, y + ddy])
        .filter(([nx, ny]) => grid.inBounds(nx, ny) && !visited.has(nx + ny * 1000));
      if (valid.length === 0) break;
      const pick = valid[(rng() * valid.length) | 0];
      bestX = pick[0];
      bestY = pick[1];
    }

    x = bestX;
    y = bestY;
  }
}
