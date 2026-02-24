import { BIOME_DATA } from '../world/biomes.js';

export function simulateSoil(tiles, governance, chunkStart, chunkEnd) {
  const w = tiles.w;

  for (let i = chunkStart; i < chunkEnd; i++) {
    const x = i % w;
    const y = (i / w) | 0;

    if (tiles.isOcean(x, y)) continue;

    let soil = tiles.getSoil(x, y);
    const water = tiles.getWater(x, y);
    const veg = tiles.getVeg(x, y);
    const biome = tiles.getBiome(x, y);
    const isProtected = tiles.isProtected(x, y);
    const isDeveloped = tiles.isDeveloped(x, y);

    // Natural regeneration: water + vegetation presence improve soil
    const regen = (water * 0.3 + veg * 0.3) * 0.003;
    soil += regen;

    // Biome baseline pull
    const biomeBase = BIOME_DATA[biome]?.soilBase || 0.3;
    soil += (biomeBase - soil) * 0.001;

    // Development degrades soil
    if (isDeveloped) {
      const devImpact = governance.development * (1 - governance.conservation * 0.5);
      soil -= devImpact * 0.005;
    }

    // Protected zones get bonus
    if (isProtected) {
      soil += 0.001 * governance.enforcement;
    }

    tiles.setSoil(x, y, Math.max(0, Math.min(1, soil)));
  }
}
