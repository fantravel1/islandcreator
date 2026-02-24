import { bus } from '../engine/events.js';
import { SPECIES } from '../data/species.js';

const MAX_HISTORY = 60;
const GRAPH_W = 200;
const GRAPH_H = 80;

export class PopulationGraph {
  constructor(container) {
    this.container = container;

    this.el = document.createElement('div');
    this.el.className = 'pop-graph';
    this.el.style.display = 'none';

    this.canvas = document.createElement('canvas');
    this.canvas.width = GRAPH_W;
    this.canvas.height = GRAPH_H;
    this.canvas.className = 'pop-graph-canvas';
    this.el.appendChild(this.canvas);

    // Legend
    this.legend = document.createElement('div');
    this.legend.className = 'pop-graph-legend';
    this.el.appendChild(this.legend);

    container.appendChild(this.el);

    this.ctx = this.canvas.getContext('2d');
    this.history = [];
    this.visible = false;

    // Toggle button added to HUD
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'stat-item pop-graph-toggle';
    this.toggleBtn.textContent = '📊';
    this.toggleBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    bus.on('statsUpdated', (stats) => this._record(stats));
  }

  toggle() {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'block' : 'none';
    this.toggleBtn.classList.toggle('active', this.visible);
    if (this.visible) this._render();
  }

  _record(stats) {
    const entry = { t: Date.now() };
    for (const id in SPECIES) {
      entry[id] = stats.population?.[id] || 0;
    }
    entry.veg = ((stats.avgVeg || 0) * 50) | 0; // Scale for display
    this.history.push(entry);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }
    if (this.visible) this._render();
  }

  _render() {
    const ctx = this.ctx;
    const w = GRAPH_W;
    const h = GRAPH_H;
    const data = this.history;
    if (data.length < 2) return;

    // Clear
    ctx.fillStyle = 'rgba(12, 28, 44, 0.9)';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < h; y += h / 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Find max for scale
    let maxVal = 10;
    for (const entry of data) {
      for (const id in SPECIES) {
        maxVal = Math.max(maxVal, entry[id] || 0);
      }
    }

    // Draw lines per species
    const speciesIds = Object.keys(SPECIES);
    let legendHTML = '';

    for (const id of speciesIds) {
      const spec = SPECIES[id];
      ctx.strokeStyle = spec.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < data.length; i++) {
        const x = (i / (MAX_HISTORY - 1)) * w;
        const y = h - (data[i][id] / maxVal) * (h - 10) - 5;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      const lastVal = data[data.length - 1][id] || 0;
      legendHTML += `<span class="legend-item" style="color:${spec.color}">${spec.emoji}${lastVal}</span>`;
    }

    // Vegetation line (dashed green)
    ctx.strokeStyle = 'rgba(100, 200, 100, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = (i / (MAX_HISTORY - 1)) * w;
      const y = h - (data[i].veg / maxVal) * (h - 10) - 5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    this.legend.innerHTML = legendHTML;
  }
}
