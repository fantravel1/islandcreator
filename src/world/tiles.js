import {
  GRID_W, GRID_H, GRID_SIZE,
  FLOAT_FIELDS, BYTE_FIELDS,
  FIELD_H, FIELD_WATER, FIELD_SOIL, FIELD_VEG, FIELD_TEMP,
  FIELD_BIOME, FIELD_PROTECTED, FIELD_DEVELOPED,
} from '../data/constants.js';

export class TileGrid {
  constructor(w = GRID_W, h = GRID_H) {
    this.w = w;
    this.h = h;
    this.size = w * h;

    // Float fields: h, water, soil, veg, temp
    this.floats = new Float32Array(this.size * FLOAT_FIELDS);
    // Byte fields: biome, protected, developed
    this.bytes = new Uint8Array(this.size * BYTE_FIELDS);
  }

  idx(x, y) {
    return y * this.w + x;
  }

  inBounds(x, y) {
    return x >= 0 && x < this.w && y >= 0 && y < this.h;
  }

  // Float field accessors
  getF(x, y, field) {
    return this.floats[this.idx(x, y) * FLOAT_FIELDS + field];
  }

  setF(x, y, field, val) {
    this.floats[this.idx(x, y) * FLOAT_FIELDS + field] = val;
  }

  // Byte field accessors
  getB(x, y, field) {
    return this.bytes[this.idx(x, y) * BYTE_FIELDS + field];
  }

  setB(x, y, field, val) {
    this.bytes[this.idx(x, y) * BYTE_FIELDS + field] = val;
  }

  // Convenience getters
  getH(x, y) { return this.getF(x, y, FIELD_H); }
  getWater(x, y) { return this.getF(x, y, FIELD_WATER); }
  getSoil(x, y) { return this.getF(x, y, FIELD_SOIL); }
  getVeg(x, y) { return this.getF(x, y, FIELD_VEG); }
  getTemp(x, y) { return this.getF(x, y, FIELD_TEMP); }
  getBiome(x, y) { return this.getB(x, y, FIELD_BIOME); }
  isProtected(x, y) { return this.getB(x, y, FIELD_PROTECTED) === 1; }
  isDeveloped(x, y) { return this.getB(x, y, FIELD_DEVELOPED) === 1; }

  // Convenience setters
  setH(x, y, v) { this.setF(x, y, FIELD_H, v); }
  setWater(x, y, v) { this.setF(x, y, FIELD_WATER, v); }
  setSoil(x, y, v) { this.setF(x, y, FIELD_SOIL, v); }
  setVeg(x, y, v) { this.setF(x, y, FIELD_VEG, v); }
  setTemp(x, y, v) { this.setF(x, y, FIELD_TEMP, v); }
  setBiome(x, y, v) { this.setB(x, y, FIELD_BIOME, v); }
  setProtected(x, y, v) { this.setB(x, y, FIELD_PROTECTED, v ? 1 : 0); }
  setDeveloped(x, y, v) { this.setB(x, y, FIELD_DEVELOPED, v ? 1 : 0); }

  isLand(x, y) {
    return this.getH(x, y) >= 0.3;
  }

  isOcean(x, y) {
    return this.getH(x, y) < 0.3;
  }

  // Get neighboring tile coordinates
  neighbors4(x, y) {
    const n = [];
    if (x > 0) n.push([x - 1, y]);
    if (x < this.w - 1) n.push([x + 1, y]);
    if (y > 0) n.push([x, y - 1]);
    if (y < this.h - 1) n.push([x, y + 1]);
    return n;
  }

  neighbors8(x, y) {
    const n = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.w && ny >= 0 && ny < this.h) {
          n.push([nx, ny]);
        }
      }
    }
    return n;
  }

  // Serialize for save
  toJSON() {
    return {
      w: this.w,
      h: this.h,
      floats: Array.from(this.floats),
      bytes: Array.from(this.bytes),
    };
  }

  // Deserialize from save
  static fromJSON(data) {
    const grid = new TileGrid(data.w, data.h);
    grid.floats.set(data.floats);
    grid.bytes.set(data.bytes);
    return grid;
  }
}
