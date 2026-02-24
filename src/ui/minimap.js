import { GRID_W, GRID_H, BIOME_OCEAN } from '../data/constants.js';
import { BIOME_DATA } from '../world/biomes.js';

const MAP_SIZE = 100; // px
const REFRESH_INTERVAL = 2000; // ms

export class MiniMap {
  constructor(container, camera) {
    this.camera = camera;
    this.tiles = null;

    this.el = document.createElement('div');
    this.el.className = 'minimap';

    this.canvas = document.createElement('canvas');
    this.canvas.width = MAP_SIZE;
    this.canvas.height = MAP_SIZE;
    this.canvas.className = 'minimap-canvas';
    this.el.appendChild(this.canvas);

    // Viewport indicator
    this.viewport = document.createElement('div');
    this.viewport.className = 'minimap-viewport';
    this.el.appendChild(this.viewport);

    container.appendChild(this.el);

    this.ctx = this.canvas.getContext('2d');
    this._lastRefresh = 0;
    this._imgData = this.ctx.createImageData(MAP_SIZE, MAP_SIZE);
    this._collapsed = false;

    // Tap to navigate
    this.canvas.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / MAP_SIZE * GRID_W;
      const my = (e.clientY - rect.top) / MAP_SIZE * GRID_H;
      this.camera.centerOn(mx, my);
    });

    // Toggle collapse
    this.el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this._collapsed = !this._collapsed;
      this.el.classList.toggle('collapsed', this._collapsed);
    });
  }

  setTiles(tiles) {
    this.tiles = tiles;
    this._renderMap();
  }

  update(now) {
    if (now - this._lastRefresh > REFRESH_INTERVAL) {
      this._renderMap();
      this._lastRefresh = now;
    }
    this._updateViewport();
  }

  _renderMap() {
    if (!this.tiles) return;

    const data = this._imgData.data;
    const scaleX = GRID_W / MAP_SIZE;
    const scaleY = GRID_H / MAP_SIZE;

    for (let py = 0; py < MAP_SIZE; py++) {
      for (let px = 0; px < MAP_SIZE; px++) {
        const tx = (px * scaleX) | 0;
        const ty = (py * scaleY) | 0;
        const idx = (py * MAP_SIZE + px) * 4;

        const biome = this.tiles.getBiome(tx, ty);
        const h = this.tiles.getH(tx, ty);
        const veg = this.tiles.getVeg(tx, ty);

        if (biome === BIOME_OCEAN) {
          const depth = Math.max(0, 0.3 - h) / 0.3;
          data[idx] = 15 + (1 - depth) * 15;
          data[idx + 1] = 50 + (1 - depth) * 40;
          data[idx + 2] = 90 + (1 - depth) * 50;
        } else {
          const bc = BIOME_DATA[biome]?.baseColor || [128, 128, 128];
          const factor = 0.7 + (h - 0.3) * 0.5;
          data[idx] = Math.min(255, (bc[0] * factor - veg * 15) | 0);
          data[idx + 1] = Math.min(255, (bc[1] * factor + veg * 25) | 0);
          data[idx + 2] = Math.min(255, (bc[2] * factor - veg * 10) | 0);

          if (this.tiles.isProtected(tx, ty)) {
            data[idx + 1] = Math.min(255, data[idx + 1] + 30);
          }
        }
        data[idx + 3] = 255;
      }
    }

    this.ctx.putImageData(this._imgData, 0, 0);
  }

  _updateViewport() {
    const cam = this.camera;
    const range = cam.getVisibleRange();

    const left = (range.x1 / GRID_W) * 100;
    const top = (range.y1 / GRID_H) * 100;
    const width = ((range.x2 - range.x1) / GRID_W) * 100;
    const height = ((range.y2 - range.y1) / GRID_H) * 100;

    this.viewport.style.left = `${Math.max(0, left)}%`;
    this.viewport.style.top = `${Math.max(0, top)}%`;
    this.viewport.style.width = `${Math.min(100, width)}%`;
    this.viewport.style.height = `${Math.min(100, height)}%`;
  }
}
