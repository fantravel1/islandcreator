import {
  BIOME_OCEAN, BIOME_FOREST, BIOME_GRASSLAND, BIOME_DESERT,
  BIOME_TUNDRA, BIOME_JUNGLE,
} from '../data/constants.js';

export const BIOME_DATA = {
  [BIOME_OCEAN]: {
    id: BIOME_OCEAN,
    name: 'Ocean',
    baseColor: [30, 90, 140],
    deepColor: [15, 50, 90],
    vegGrowthRate: 0,
    soilBase: 0,
    tempMod: 0,
  },
  [BIOME_FOREST]: {
    id: BIOME_FOREST,
    name: 'Forest',
    baseColor: [34, 120, 50],
    vegGrowthRate: 0.008,
    soilBase: 0.7,
    tempMod: -0.05,
  },
  [BIOME_GRASSLAND]: {
    id: BIOME_GRASSLAND,
    name: 'Grassland',
    baseColor: [120, 160, 50],
    vegGrowthRate: 0.005,
    soilBase: 0.5,
    tempMod: 0,
  },
  [BIOME_DESERT]: {
    id: BIOME_DESERT,
    name: 'Desert',
    baseColor: [194, 170, 110],
    vegGrowthRate: 0.001,
    soilBase: 0.2,
    tempMod: 0.15,
  },
  [BIOME_TUNDRA]: {
    id: BIOME_TUNDRA,
    name: 'Tundra',
    baseColor: [160, 180, 190],
    vegGrowthRate: 0.002,
    soilBase: 0.25,
    tempMod: -0.2,
  },
  [BIOME_JUNGLE]: {
    id: BIOME_JUNGLE,
    name: 'Jungle',
    baseColor: [20, 100, 35],
    vegGrowthRate: 0.012,
    soilBase: 0.8,
    tempMod: 0.1,
  },
};

export function getBiomeName(biomeId) {
  return BIOME_DATA[biomeId]?.name || 'Unknown';
}

export function getBiomeColor(biomeId) {
  return BIOME_DATA[biomeId]?.baseColor || [128, 128, 128];
}
