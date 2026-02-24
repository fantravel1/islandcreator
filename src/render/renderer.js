import { BIOME_DATA } from '../world/biomes.js';
import { BIOME_OCEAN } from '../data/constants.js';
import { SPECIES } from '../data/species.js';
import { overlayTileColor, OVERLAY_NONE } from '../ui/overlaymodes.js';
import { STRUCTURE_TYPES } from '../sim/structures.js';

const _rgb = [0, 0, 0];
let _frameTime = 0;

// Season color tints
const SEASON_TINTS = [
  { r: 5, g: 15, b: -5 },    // Spring: slight green boost
  { r: 10, g: 5, b: -10 },   // Summer: warm golden
  { r: 20, g: -5, b: -15 },  // Fall: warm reds/oranges
  { r: -10, g: -5, b: 15 },  // Winter: cool blue
];

function tileColor(tiles, x, y, time, season) {
  const biome = tiles.getBiome(x, y);
  const h = tiles.getH(x, y);
  const veg = tiles.getVeg(x, y);
  const water = tiles.getWater(x, y);
  const bdata = BIOME_DATA[biome];

  if (biome === BIOME_OCEAN) {
    const depth = Math.max(0, 0.3 - h) / 0.3;
    const dc = bdata.deepColor;
    const bc = bdata.baseColor;
    _rgb[0] = dc[0] + (bc[0] - dc[0]) * (1 - depth);
    _rgb[1] = dc[1] + (bc[1] - dc[1]) * (1 - depth);
    _rgb[2] = dc[2] + (bc[2] - dc[2]) * (1 - depth);

    // Animated wave shimmer
    const wave = Math.sin(x * 0.4 + y * 0.6 + _frameTime * 0.002) * 6
               + Math.sin(x * 0.15 - y * 0.3 + _frameTime * 0.0015) * 4;
    _rgb[0] += wave;
    _rgb[1] += wave * 1.2;
    _rgb[2] += wave * 1.5;

    // Coastal foam
    if (depth < 0.15) {
      const foam = Math.sin(x * 0.8 + _frameTime * 0.003) * 0.5 + 0.5;
      const foamAmt = (1 - depth / 0.15) * foam * 40;
      _rgb[0] += foamAmt;
      _rgb[1] += foamAmt;
      _rgb[2] += foamAmt;
    }
  } else {
    const bc = bdata.baseColor;
    const elevFactor = 0.7 + (h - 0.3) * 0.5;

    _rgb[0] = bc[0] * elevFactor;
    _rgb[1] = bc[1] * elevFactor;
    _rgb[2] = bc[2] * elevFactor;

    // Vegetation with wind sway
    if (veg > 0) {
      const sway = Math.sin(x * 0.5 + y * 0.3 + _frameTime * 0.001) * 3 * veg;
      _rgb[0] -= veg * 20 + sway;
      _rgb[1] += veg * 30 + sway * 2;
      _rgb[2] -= veg * 15;
    }

    // Water presence
    if (water > 0.1) {
      const waterShimmer = Math.sin(x + _frameTime * 0.002) * 3 * water;
      _rgb[0] -= water * 15;
      _rgb[1] += water * 5 + waterShimmer;
      _rgb[2] += water * 30 + waterShimmer * 2;
    }

    // Beach/shore
    if (h < 0.35) {
      const beachFactor = (0.35 - h) / 0.05;
      _rgb[0] = _rgb[0] + (210 - _rgb[0]) * beachFactor * 0.5;
      _rgb[1] = _rgb[1] + (190 - _rgb[1]) * beachFactor * 0.5;
      _rgb[2] = _rgb[2] + (140 - _rgb[2]) * beachFactor * 0.5;
    }

    // Snow caps on peaks
    if (h > 0.8) {
      const snowFactor = (h - 0.8) / 0.2;
      _rgb[0] = _rgb[0] + (240 - _rgb[0]) * snowFactor;
      _rgb[1] = _rgb[1] + (245 - _rgb[1]) * snowFactor;
      _rgb[2] = _rgb[2] + (250 - _rgb[2]) * snowFactor;
    }

    // Seasonal tinting
    if (season !== undefined && season >= 0 && season <= 3) {
      const tint = SEASON_TINTS[season];
      // Fall: desaturate greens, boost oranges on vegetation tiles
      if (season === 2 && veg > 0.1) {
        const fallAmt = veg * 0.6;
        _rgb[0] += fallAmt * 40;
        _rgb[1] -= fallAmt * 15;
        _rgb[2] -= fallAmt * 10;
      }
      // Winter: lighten slightly (frost)
      if (season === 3 && h > 0.4) {
        const frost = (h - 0.4) * 0.15;
        _rgb[0] += frost * 40;
        _rgb[1] += frost * 45;
        _rgb[2] += frost * 55;
      }
      _rgb[0] += tint.r;
      _rgb[1] += tint.g;
      _rgb[2] += tint.b;
    }
  }

  // Day/night tinting
  if (time) {
    const dayProgress = time.tick / 100;
    let brightness = 1.0;
    if (dayProgress < 0.1) {
      brightness = 0.55 + dayProgress * 4.5;
    } else if (dayProgress < 0.2) {
      brightness = 1.0;
      _rgb[0] += 12 * (1 - (dayProgress - 0.1) * 10);
      _rgb[1] += 4 * (1 - (dayProgress - 0.1) * 10);
    } else if (dayProgress < 0.75) {
      brightness = 1.0;
    } else if (dayProgress < 0.9) {
      const duskAmt = (dayProgress - 0.75) / 0.15;
      brightness = 1.0 - duskAmt * 0.25;
      _rgb[0] += 18 * duskAmt;
      _rgb[2] -= 12 * duskAmt;
    } else {
      brightness = 0.75 - (dayProgress - 0.9) * 2;
    }
    brightness = Math.max(0.5, brightness);
    _rgb[0] *= brightness;
    _rgb[1] *= brightness;
    _rgb[2] *= brightness;
  }

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
    this.overlayMode = OVERLAY_NONE;
    this.showGridLines = true;
    this.showDayNight = true;
  }

  markDirty() {
    this.dirty = true;
  }

  render(gameState, timestamp) {
    _frameTime = timestamp || performance.now();

    const ctx = this.ctx;
    const cam = this.camera;
    const ts = cam.tileSize;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    ctx.fillStyle = '#0a1929';
    ctx.fillRect(0, 0, cw, ch);

    const range = cam.getVisibleRange();
    const island = gameState.islands[0];
    if (!island) return;

    const tiles = island.world.tiles;
    const offsetX = cw / 2 - cam.x * ts;
    const offsetY = ch / 2 - cam.y * ts;
    const time = this.showDayNight ? gameState.time : null;
    const season = gameState.time?.season;
    const oMode = this.overlayMode;
    const oRgb = [0, 0, 0];

    // Draw tiles
    for (let y = range.y1; y <= range.y2; y++) {
      for (let x = range.x1; x <= range.x2; x++) {
        let r, g, b;

        if (oMode !== OVERLAY_NONE && overlayTileColor(tiles, x, y, oMode, oRgb)) {
          r = oRgb[0]; g = oRgb[1]; b = oRgb[2];
        } else {
          const rgb = tileColor(tiles, x, y, time, season);
          r = rgb[0]; g = rgb[1]; b = rgb[2];
        }

        const sx = (x * ts + offsetX) | 0;
        const sy = (y * ts + offsetY) | 0;
        const sw = (ts + 1) | 0;
        const sh = (ts + 1) | 0;

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(sx, sy, sw, sh);

        // Protected zone overlay
        if (tiles.isProtected(x, y) && !tiles.isOcean(x, y)) {
          ctx.fillStyle = 'rgba(0, 200, 100, 0.15)';
          ctx.fillRect(sx, sy, sw, sh);
          if (ts > 4) {
            ctx.strokeStyle = 'rgba(0, 200, 100, 0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sx, sy + sh);
            ctx.lineTo(sx + sw, sy);
            ctx.stroke();
          }
        }

        // Developed tile
        if (tiles.isDeveloped(x, y)) {
          ctx.fillStyle = 'rgba(150, 100, 50, 0.25)';
          ctx.fillRect(sx, sy, sw, sh);
          if (ts > 15) {
            ctx.fillStyle = 'rgba(200, 150, 80, 0.7)';
            const hx = sx + sw * 0.3;
            const hy = sy + sh * 0.3;
            const hs = sw * 0.4;
            ctx.fillRect(hx, hy + hs * 0.4, hs, hs * 0.6);
            ctx.beginPath();
            ctx.moveTo(hx, hy + hs * 0.4);
            ctx.lineTo(hx + hs / 2, hy);
            ctx.lineTo(hx + hs, hy + hs * 0.4);
            ctx.fill();
          }
        }
      }
    }

    // Structures
    const structures = island.entities.structures;
    if (structures && ts > 6) {
      for (const s of structures) {
        const type = STRUCTURE_TYPES[s.typeId];
        if (!type) continue;
        const sx = (s.x * ts + offsetX) | 0;
        const sy = (s.y * ts + offsetY) | 0;
        if (sx < -ts * 4 || sx > cw + ts * 4 || sy < -ts * 4 || sy > ch + ts * 4) continue;
        const sz = type.size * ts;

        if (ts > 15) {
          // Show emoji at high zoom
          ctx.font = `${sz * 0.7}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(type.emoji, sx + ts * 0.5, sy + ts * 0.5);
        } else {
          // Simple colored marker at low zoom
          ctx.fillStyle = 'rgba(200, 160, 80, 0.6)';
          const r = Math.floor(type.size / 2);
          ctx.fillRect(sx - r * ts, sy - r * ts, sz, sz);
          ctx.strokeStyle = 'rgba(255, 220, 120, 0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(sx - r * ts, sy - r * ts, sz, sz);
        }
      }
    }

    // Grid lines at high zoom
    if (this.showGridLines && ts > 14) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
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

    // Animal shadows
    const animals = island.entities.animals;
    for (let i = 0; i < animals.length; i++) {
      const a = animals[i];
      const spec = SPECIES[a.speciesId];
      if (!spec) continue;
      const ax = a.x * ts + offsetX;
      const ay = a.y * ts + offsetY;
      if (ax < -20 || ax > cw + 20 || ay < -20 || ay > ch + 20) continue;
      const size = Math.max(3, spec.size * (ts / 10));
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(ax + 1, ay + 2, size, size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Animals
    for (let i = 0; i < animals.length; i++) {
      const a = animals[i];
      const spec = SPECIES[a.speciesId];
      if (!spec) continue;
      const ax = a.x * ts + offsetX;
      const ay = a.y * ts + offsetY;
      if (ax < -20 || ax > cw + 20 || ay < -20 || ay > ch + 20) continue;

      const size = Math.max(3, spec.size * (ts / 10));

      // Bobbing animation
      let bobY = 0;
      if (a.state === 'wander' || a.state === 'seekFood' || a.state === 'seekWater') {
        bobY = Math.sin(_frameTime * 0.005 + a.id) * size * 0.2;
      } else if (a.state === 'flee') {
        bobY = Math.sin(_frameTime * 0.015 + a.id) * size * 0.3;
      }

      // Body
      ctx.fillStyle = spec.color;
      ctx.beginPath();
      ctx.arc(ax, ay + bobY, size, 0, Math.PI * 2);
      ctx.fill();

      // Energy ring
      if (ts > 5) {
        ctx.strokeStyle = a.energy > 0.5 ? 'rgba(100,255,100,0.5)' :
                          a.energy > 0.2 ? 'rgba(255,200,50,0.5)' : 'rgba(255,50,50,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ax, ay + bobY, size + 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * a.energy);
        ctx.stroke();
      }

      // State indicator
      if (ts > 10 && ts <= 20) {
        const stateIcon = a.state === 'flee' ? '!' : a.state === 'rest' ? 'z' : '';
        if (stateIcon) {
          ctx.font = `bold ${size}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = a.state === 'flee' ? '#ff4444' : '#aaaaff';
          ctx.fillText(stateIcon, ax, ay + bobY - size - 3);
        }
      }

      // Emoji at high zoom
      if (ts > 20) {
        ctx.font = `${size * 2.2}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(spec.emoji, ax, ay + bobY);
      }
    }

    this.dirty = false;
  }
}
