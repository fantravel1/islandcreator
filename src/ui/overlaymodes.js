import { bus } from '../engine/events.js';

export const OVERLAY_NONE = 'none';
export const OVERLAY_VEG = 'vegetation';
export const OVERLAY_WATER = 'water';
export const OVERLAY_SOIL = 'soil';
export const OVERLAY_TEMP = 'temperature';

const OVERLAY_LIST = [
  { id: OVERLAY_NONE, label: 'Normal', icon: '🗺️' },
  { id: OVERLAY_VEG, label: 'Veg', icon: '🌿' },
  { id: OVERLAY_WATER, label: 'Water', icon: '💧' },
  { id: OVERLAY_SOIL, label: 'Soil', icon: '🟤' },
  { id: OVERLAY_TEMP, label: 'Temp', icon: '🌡️' },
];

export class OverlayModePanel {
  constructor(container) {
    this.container = container;
    this.activeMode = OVERLAY_NONE;

    this.el = document.createElement('div');
    this.el.className = 'overlay-modes';

    for (const mode of OVERLAY_LIST) {
      const btn = document.createElement('button');
      btn.className = 'overlay-mode-btn' + (mode.id === this.activeMode ? ' active' : '');
      btn.dataset.mode = mode.id;
      btn.innerHTML = `<span>${mode.icon}</span><span class="overlay-mode-label">${mode.label}</span>`;
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.setMode(mode.id);
      });
      this.el.appendChild(btn);
    }

    container.appendChild(this.el);
  }

  setMode(mode) {
    this.activeMode = mode;
    const btns = this.el.querySelectorAll('.overlay-mode-btn');
    btns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    bus.emit('overlayModeChanged', { mode });
  }
}

// Overlay colorizer - returns RGB for overlay visualization
export function overlayTileColor(tiles, x, y, mode, rgb) {
  if (mode === OVERLAY_NONE) return false;

  if (tiles.isOcean(x, y)) {
    rgb[0] = 20; rgb[1] = 30; rgb[2] = 50;
    return true;
  }

  switch (mode) {
    case OVERLAY_VEG: {
      const v = tiles.getVeg(x, y);
      // Dark brown → bright green
      rgb[0] = (60 - v * 50) | 0;
      rgb[1] = (40 + v * 180) | 0;
      rgb[2] = (20 + v * 30) | 0;
      return true;
    }
    case OVERLAY_WATER: {
      const w = tiles.getWater(x, y);
      // Brown → blue
      rgb[0] = (80 - w * 60) | 0;
      rgb[1] = (60 + w * 60) | 0;
      rgb[2] = (40 + w * 200) | 0;
      return true;
    }
    case OVERLAY_SOIL: {
      const s = tiles.getSoil(x, y);
      // Gray → rich brown
      rgb[0] = (60 + s * 120) | 0;
      rgb[1] = (55 + s * 50) | 0;
      rgb[2] = (50 - s * 20) | 0;
      return true;
    }
    case OVERLAY_TEMP: {
      const t = tiles.getTemp(x, y);
      // Blue → white → red
      if (t < 0.5) {
        const f = t * 2;
        rgb[0] = (30 + f * 220) | 0;
        rgb[1] = (60 + f * 190) | 0;
        rgb[2] = (200 - f * 50) | 0;
      } else {
        const f = (t - 0.5) * 2;
        rgb[0] = (250) | 0;
        rgb[1] = (250 - f * 200) | 0;
        rgb[2] = (150 - f * 130) | 0;
      }
      return true;
    }
    default:
      return false;
  }
}
