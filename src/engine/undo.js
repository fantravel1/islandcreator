const MAX_UNDO = 20;

export class UndoManager {
  constructor() {
    this._stack = [];
    this._pointer = -1;
  }

  // Save a snapshot of tile data before modification
  pushSnapshot(tiles, cx, cy, radius) {
    const data = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (!tiles.inBounds(x, y)) continue;
        data.push({
          x, y,
          h: tiles.getH(x, y),
          biome: tiles.getBiome(x, y),
          water: tiles.getWater(x, y),
          soil: tiles.getSoil(x, y),
          veg: tiles.getVeg(x, y),
          temp: tiles.getTemp(x, y),
          protected: tiles.isProtected(x, y),
          developed: tiles.isDeveloped(x, y),
        });
      }
    }

    // Discard any redo history
    if (this._pointer < this._stack.length - 1) {
      this._stack = this._stack.slice(0, this._pointer + 1);
    }

    this._stack.push(data);
    if (this._stack.length > MAX_UNDO) {
      this._stack.shift();
    }
    this._pointer = this._stack.length - 1;
  }

  canUndo() {
    return this._pointer >= 0;
  }

  undo(tiles) {
    if (!this.canUndo()) return false;
    const snapshot = this._stack[this._pointer];
    for (const d of snapshot) {
      tiles.setH(d.x, d.y, d.h);
      tiles.setBiome(d.x, d.y, d.biome);
      tiles.setWater(d.x, d.y, d.water);
      tiles.setSoil(d.x, d.y, d.soil);
      tiles.setVeg(d.x, d.y, d.veg);
      tiles.setTemp(d.x, d.y, d.temp);
    }
    this._pointer--;
    return true;
  }

  clear() {
    this._stack = [];
    this._pointer = -1;
  }

  get count() {
    return this._pointer + 1;
  }
}
