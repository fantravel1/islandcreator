import { BIOME_DATA } from '../world/biomes.js';
import { BIOME_OCEAN } from '../data/constants.js';

export function simulateVegetation(tiles, governance, chunkStart, chunkEnd) {
  const w = tiles.w;

  for (let i = chunkStart; i < chunkEnd; i++) {
    const x = i % w;
    const y = (i / w) | 0;

    const biome = tiles.getBiome(x, y);
    if (biome === BIOME_OCEAN) continue;

    let veg = tiles.getVeg(x, y);
    const soil = tiles.getSoil(x, y);
    const water = tiles.getWater(x, y);
    const temp = tiles.getTemp(x, y);
    const isProtected = tiles.isProtected(x, y);
    const isDeveloped = tiles.isDeveloped(x, y);

    const biomeData = BIOME_DATA[biome];
    const growthRate = biomeData?.vegGrowthRate || 0.003;

    // Growth conditions: soil, water, temperature all contribute
    const growthCondition = soil * 0.4 + water * 0.35 + (1 - Math.abs(temp - 0.5) * 2) * 0.25;

    // Growth
    veg += growthRate * growthCondition;

    // Natural decay / carrying capacity
    veg -= veg * veg * 0.003; // self-limiting growth

    // Development reduces vegetation
    if (isDeveloped) {
      const impact = governance.development * (1 - governance.conservation * 0.5);
      veg -= impact * 0.008;
    }

    // Protected zones bonus
    if (isProtected) {
      veg += 0.001 * governance.enforcement;
    }

    // Drought stress
    if (water < 0.05) {
      veg -= 0.005;
    }

    // Freeze damage
    if (temp < 0.15) {
      veg -= (0.15 - temp) * 0.01;
    }

    // Spread from neighbors (slow) — inlined to avoid array allocation
    if (veg < 0.1) {
      let neighborVeg = 0;
      let nCount = 0;
      if (x > 0)         { neighborVeg += tiles.getVeg(x - 1, y); nCount++; }
      if (x < w - 1)     { neighborVeg += tiles.getVeg(x + 1, y); nCount++; }
      if (y > 0)          { neighborVeg += tiles.getVeg(x, y - 1); nCount++; }
      if (y < tiles.h - 1){ neighborVeg += tiles.getVeg(x, y + 1); nCount++; }
      if (nCount > 0 && neighborVeg / nCount > 0.3) {
        veg += 0.002;
      }
    }

    tiles.setVeg(x, y, Math.max(0, Math.min(1, veg)));
  }
}
