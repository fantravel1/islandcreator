import { BASE_TILE_SIZE, MIN_ZOOM, MAX_ZOOM, GRID_W, GRID_H } from '../data/constants.js';

export class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = GRID_W / 2;
    this.y = GRID_H / 2;
    this.zoom = 1;
    this._tileSize = BASE_TILE_SIZE;
  }

  get tileSize() {
    return this._tileSize * this.zoom;
  }

  screenToWorld(sx, sy) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = sx - rect.left;
    const canvasY = sy - rect.top;
    const ts = this.tileSize;
    const offsetX = this.canvas.width / 2 - this.x * ts;
    const offsetY = this.canvas.height / 2 - this.y * ts;
    return {
      x: (canvasX - offsetX) / ts,
      y: (canvasY - offsetY) / ts,
    };
  }

  worldToScreen(wx, wy) {
    const ts = this.tileSize;
    const offsetX = this.canvas.width / 2 - this.x * ts;
    const offsetY = this.canvas.height / 2 - this.y * ts;
    return {
      x: wx * ts + offsetX,
      y: wy * ts + offsetY,
    };
  }

  pan(dx, dy) {
    const ts = this.tileSize;
    this.x -= dx / ts;
    this.y -= dy / ts;
    this._clamp();
  }

  zoomAt(factor, screenX, screenY) {
    const before = this.screenToWorld(screenX, screenY);

    this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom * factor));

    const after = this.screenToWorld(screenX, screenY);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
    this._clamp();
  }

  centerOn(wx, wy) {
    this.x = wx;
    this.y = wy;
    this._clamp();
  }

  _clamp() {
    const margin = 10;
    this.x = Math.max(-margin, Math.min(GRID_W + margin, this.x));
    this.y = Math.max(-margin, Math.min(GRID_H + margin, this.y));
  }

  getVisibleRange() {
    const ts = this.tileSize;
    const halfW = this.canvas.width / 2 / ts;
    const halfH = this.canvas.height / 2 / ts;

    return {
      x1: Math.max(0, Math.floor(this.x - halfW) - 1),
      y1: Math.max(0, Math.floor(this.y - halfH) - 1),
      x2: Math.min(GRID_W - 1, Math.ceil(this.x + halfW) + 1),
      y2: Math.min(GRID_H - 1, Math.ceil(this.y + halfH) + 1),
    };
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
  }
}
