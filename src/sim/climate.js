import {
  SEASON_SPRING, SEASON_SUMMER, SEASON_FALL, SEASON_WINTER,
} from '../data/constants.js';

// Season modifiers for temperature and rainfall
const SEASON_MODS = {
  [SEASON_SPRING]: { tempMod: 0.0, rainMod: 0.2 },
  [SEASON_SUMMER]: { tempMod: 0.15, rainMod: -0.1 },
  [SEASON_FALL]:   { tempMod: -0.05, rainMod: 0.05 },
  [SEASON_WINTER]: { tempMod: -0.15, rainMod: -0.05 },
};

export function getSeasonMods(season) {
  return SEASON_MODS[season] || SEASON_MODS[SEASON_SPRING];
}

export function applyClimate(tiles, season, chunkStart, chunkEnd) {
  const mods = getSeasonMods(season);
  const w = tiles.w;

  for (let i = chunkStart; i < chunkEnd; i++) {
    const x = i % w;
    const y = (i / w) | 0;

    if (tiles.isOcean(x, y)) continue;

    // Gently nudge temperature toward seasonal baseline
    let temp = tiles.getTemp(x, y);
    const target = 0.5 + mods.tempMod;
    temp += (target - temp) * 0.01;
    tiles.setTemp(x, y, Math.max(0, Math.min(1, temp)));

    // Rainfall adds water
    if (mods.rainMod > 0) {
      let water = tiles.getWater(x, y);
      water += mods.rainMod * 0.005;
      tiles.setWater(x, y, Math.min(1, water));
    }
  }
}
