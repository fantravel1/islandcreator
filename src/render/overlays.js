import { BRUSH_RADIUS, TOOL_SCULPT, TOOL_BIOME, TOOL_ANIMAL, TOOL_ZONE } from '../data/constants.js';
import { SPECIES } from '../data/species.js';

export class OverlayRenderer {
  constructor(camera) {
    this.camera = camera;
    this.activeTool = null;
    this.cursorWorld = null;
    this.zoneStart = null;
    this.zoneEnd = null;
    this.selectedBiome = 1;
    this.selectedSpecies = 'deer';
  }

  setCursor(worldX, worldY) {
    this.cursorWorld = worldX != null ? { x: worldX, y: worldY } : null;
  }

  render(ctx) {
    if (!this.cursorWorld) return;

    const cam = this.camera;
    const ts = cam.tileSize;
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const offsetX = cw / 2 - cam.x * ts;
    const offsetY = ch / 2 - cam.y * ts;

    const tx = Math.floor(this.cursorWorld.x);
    const ty = Math.floor(this.cursorWorld.y);

    if (this.activeTool === TOOL_SCULPT || this.activeTool === TOOL_BIOME) {
      // Draw brush circle
      const radius = BRUSH_RADIUS;
      const cx = (tx + 0.5) * ts + offsetX;
      const cy = (ty + 0.5) * ts + offsetY;

      ctx.strokeStyle = this.activeTool === TOOL_SCULPT ?
        'rgba(255, 255, 255, 0.6)' : 'rgba(255, 200, 50, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, radius * ts, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Highlight affected tiles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      const r2 = radius * radius;
      const tsI = ts | 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy <= r2) {
            const sx = ((tx + dx) * ts + offsetX) | 0;
            const sy = ((ty + dy) * ts + offsetY) | 0;
            ctx.fillRect(sx, sy, tsI, tsI);
          }
        }
      }
    }

    if (this.activeTool === TOOL_ANIMAL) {
      // Ghost animal
      const spec = SPECIES[this.selectedSpecies];
      if (spec) {
        const cx = (tx + 0.5) * ts + offsetX;
        const cy = (ty + 0.5) * ts + offsetY;
        const size = Math.max(4, spec.size * (ts / 10));

        ctx.globalAlpha = 0.5;
        ctx.fillStyle = spec.color;
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        ctx.fill();

        if (ts > 15) {
          ctx.font = `${size * 2.5}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(spec.emoji, cx, cy);
        }
        ctx.globalAlpha = 1;
      }
    }

    if (this.activeTool === TOOL_ZONE && this.zoneStart && this.zoneEnd) {
      const x1 = Math.min(this.zoneStart.x, this.zoneEnd.x);
      const y1 = Math.min(this.zoneStart.y, this.zoneEnd.y);
      const x2 = Math.max(this.zoneStart.x, this.zoneEnd.x);
      const y2 = Math.max(this.zoneStart.y, this.zoneEnd.y);

      const sx = (x1 * ts + offsetX) | 0;
      const sy = (y1 * ts + offsetY) | 0;
      const sw = ((x2 - x1 + 1) * ts) | 0;
      const sh = ((y2 - y1 + 1) * ts) | 0;

      ctx.fillStyle = 'rgba(0, 200, 100, 0.15)';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = 'rgba(0, 200, 100, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.setLineDash([]);
    }

    // Tile highlight cursor
    if (this.activeTool) {
      const sx = (tx * ts + offsetX) | 0;
      const sy = (ty * ts + offsetY) | 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, ts | 0, ts | 0);
    }
  }
}
