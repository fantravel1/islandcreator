import { TileGrid } from './tiles.js';
import { createNoise2D, fbm, createRng } from '../engine/rng.js';
import {
  GRID_W, GRID_H,
  BIOME_OCEAN, BIOME_FOREST, BIOME_GRASSLAND, BIOME_DESERT,
} from '../data/constants.js';

export function generateIsland(seed) {
  const grid = new TileGrid(GRID_W, GRID_H);
  const rng = createRng(seed);

  // Create noise functions with different seeds
  const elevNoise = createNoise2D(seed);
  const moistNoise = createNoise2D(seed + 1000);
  const tempNoise = createNoise2D(seed + 2000);

  const cx = GRID_W / 2;
  const cy = GRID_H / 2;
  const maxDist = Math.min(cx, cy) * 0.85;

  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      // Normalized coords
      const nx = x / GRID_W;
      const ny = y / GRID_H;

      // --- Elevation ---
      let elev = fbm(elevNoise, nx * 4, ny * 4, 4, 2.0, 0.5);
      // Map from [-1,1] to [0,1]
      elev = (elev + 1) * 0.5;

      // Apply radial island falloff
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const falloff = Math.max(0, 1 - (dist / maxDist));
      const falloffCurve = falloff * falloff * (3 - 2 * falloff); // smoothstep
      elev = elev * falloffCurve;

      // Add some variation to coastline
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
      temp = 0.3 + temp * 0.5; // Base temp range 0.3 - 0.8
      grid.setTemp(x, y, temp);

      // --- Biome assignment ---
      let biome;
      if (elev < 0.3) {
        biome = BIOME_OCEAN;
        grid.setWater(x, y, 1.0);
        grid.setSoil(x, y, 0);
        grid.setVeg(x, y, 0);
      } else {
        grid.setWater(x, y, Math.max(0, moisture * 0.3));

        if (moisture > 0.55 && temp < 0.65) {
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

  return grid;
}
