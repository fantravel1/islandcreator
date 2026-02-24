import { BIOME_DATA } from '../world/biomes.js';
import { BIOME_OCEAN } from '../data/constants.js';
import { SPECIES } from '../data/species.js';

// Reusable color buffer to avoid allocations
const _rgb = [0, 0, 0];

function tileColor(tiles, x, y) {
  const biome = tiles.getBiome(x, y);
  const h = tiles.getH(x, y);
  const veg = tiles.getVeg(x, y);
  const water = tiles.getWater(x, y);
  const bdata = BIOME_DATA[biome];

  if (biome === BIOME_OCEAN) {
    // Deeper ocean = darker blue
    const depth = Math.max(0, 0.3 - h) / 0.3;
    const dc = bdata.deepColor;
    const bc = bdata.baseColor;
    _rgb[0] = dc[0] + (bc[0] - dc[0]) * (1 - depth);
    _rgb[1] = dc[1] + (bc[1] - dc[1]) * (1 - depth);
    _rgb[2] = dc[2] + (bc[2] - dc[2]) * (1 - depth);

    // Add slight wave shimmer
    const shimmer = Math.sin(x * 0.3 + y * 0.7) * 8;
    _rgb[0] += shimmer;
    _rgb[1] += shimmer;
    _rgb[2] += shimmer;
  } else {
    const bc = bdata.baseColor;
    // Elevation shading (higher = lighter)
    const elevFactor = 0.7 + (h - 0.3) * 0.5;

    _rgb[0] = bc[0] * elevFactor;
    _rgb[1] = bc[1] * elevFactor;
    _rgb[2] = bc[2] * elevFactor;

    // Vegetation overlay (greener)
    if (veg > 0) {
      _rgb[0] -= veg * 20;
      _rgb[1] += veg * 30;
      _rgb[2] -= veg * 15;
    }

    // Water presence (slight blue tint)
    if (water > 0.1) {
      _rgb[0] -= water * 15;
      _rgb[1] += water * 5;
      _rgb[2] += water * 30;
    }

    // Beach/shore coloring for low land tiles
    if (h < 0.35) {
      const beachFactor = (0.35 - h) / 0.05;
      _rgb[0] = _rgb[0] + (210 - _rgb[0]) * beachFactor * 0.5;
      _rgb[1] = _rgb[1] + (190 - _rgb[1]) * beachFactor * 0.5;
      _rgb[2] = _rgb[2] + (140 - _rgb[2]) * beachFactor * 0.5;
    }
  }

  // Clamp
  _rgb[0] = Math.max(0, Math.min(255, _rgb[0] | 0));
  _rgb[1] = Math.max(0, Math.min(255, _rgb[1] | 0));
  _rgb[2] = Math.max(0, Math.min(255, _rgb[2] | 0));

  return _rgb;
}

export class Renderer {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = camera;
    this.dirty = true;

    // Pre-allocated ImageData for tile rendering (will be created on first frame)
    this._imgData = null;
    this._imgW = 0;
    this._imgH = 0;
  }

  markDirty() {
    this.dirty = true;
  }

  render(gameState) {
    const ctx = this.ctx;
    const cam = this.camera;
    const ts = cam.tileSize;
    const dpr = window.devicePixelRatio || 1;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    // Clear
    ctx.fillStyle = '#0d2137';
    ctx.fillRect(0, 0, cw, ch);

    const range = cam.getVisibleRange();
    const island = gameState.islands[0];
    if (!island) return;

    const tiles = island.world.tiles;
    const offsetX = cw / 2 - cam.x * ts;
    const offsetY = ch / 2 - cam.y * ts;

    // Draw tiles
    for (let y = range.y1; y <= range.y2; y++) {
      for (let x = range.x1; x <= range.x2; x++) {
        const rgb = tileColor(tiles, x, y);
        const sx = (x * ts + offsetX) | 0;
        const sy = (y * ts + offsetY) | 0;
        const sw = (ts + 1) | 0;
        const sh = (ts + 1) | 0;

        ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
        ctx.fillRect(sx, sy, sw, sh);

        // Protected zone overlay
        if (tiles.isProtected(x, y) && !tiles.isOcean(x, y)) {
          ctx.fillStyle = 'rgba(0, 200, 100, 0.2)';
          ctx.fillRect(sx, sy, sw, sh);

          // Diagonal lines for protected zones
          if (ts > 4) {
            ctx.strokeStyle = 'rgba(0, 200, 100, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sx, sy + sh);
            ctx.lineTo(sx + sw, sy);
            ctx.stroke();
          }
        }

        // Developed tile marker
        if (tiles.isDeveloped(x, y)) {
          ctx.fillStyle = 'rgba(150, 100, 50, 0.3)';
          ctx.fillRect(sx, sy, sw, sh);
        }
      }
    }

    // Draw grid lines at high zoom
    if (ts > 12) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.5;
      for (let y = range.y1; y <= range.y2 + 1; y++) {
        const sy = (y * ts + offsetY) | 0;
        ctx.beginPath();
        ctx.moveTo(range.x1 * ts + offsetX, sy);
        ctx.lineTo((range.x2 + 1) * ts + offsetX, sy);
        ctx.stroke();
      }
      for (let x = range.x1; x <= range.x2 + 1; x++) {
        const sx = (x * ts + offsetX) | 0;
        ctx.beginPath();
        ctx.moveTo(sx, range.y1 * ts + offsetY);
        ctx.lineTo(sx, (range.y2 + 1) * ts + offsetY);
        ctx.stroke();
      }
    }

    // Draw animals
    const animals = island.entities.animals;
    for (let i = 0; i < animals.length; i++) {
      const a = animals[i];
      const spec = SPECIES[a.speciesId];
      if (!spec) continue;

      const ax = a.x * ts + offsetX;
      const ay = a.y * ts + offsetY;

      // Skip if off-screen
      if (ax < -20 || ax > cw + 20 || ay < -20 || ay > ch + 20) continue;

      const size = Math.max(3, spec.size * (ts / 10));

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.arc(ax + 1, ay + 1, size, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = spec.color;
      ctx.beginPath();
      ctx.arc(ax, ay, size, 0, Math.PI * 2);
      ctx.fill();

      // Energy indicator (ring)
      if (ts > 6) {
        ctx.strokeStyle = a.energy > 0.5 ? 'rgba(100,255,100,0.6)' :
                          a.energy > 0.2 ? 'rgba(255,200,50,0.6)' : 'rgba(255,50,50,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ax, ay, size + 2, 0, Math.PI * 2 * a.energy);
        ctx.stroke();
      }

      // Emoji at high zoom
      if (ts > 20) {
        ctx.font = `${size * 2}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(spec.emoji, ax, ay);
      }
    }

    this.dirty = false;
  }
}
