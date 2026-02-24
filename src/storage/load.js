import { TileGrid } from '../world/tiles.js';

const SAVE_KEY = 'islandcreator_save';

export function loadGame() {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) return null;

    const data = JSON.parse(json);
    if (!data || !data.version) return null;

    // Reconstruct typed arrays in tile grids
    for (const island of data.islands) {
      if (island.world?.tiles) {
        island.world.tiles = TileGrid.fromJSON(island.world.tiles);
      }
    }

    return data;
  } catch (e) {
    console.warn('Load failed:', e);
    return null;
  }
}

export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}
