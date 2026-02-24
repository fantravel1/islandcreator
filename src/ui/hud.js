import { bus } from '../engine/events.js';
import { SEASON_NAMES } from '../data/constants.js';
import { SPECIES } from '../data/species.js';

export class HUD {
  constructor(container) {
    this.container = container;

    this.el = document.createElement('div');
    this.el.className = 'hud';

    // Top-left: Island info
    this.infoEl = document.createElement('div');
    this.infoEl.className = 'hud-info';
    this.infoEl.innerHTML = '<span class="hud-title">IslandCreator</span>';
    this.el.appendChild(this.infoEl);

    // Top-right: Time controls
    this.timeEl = document.createElement('div');
    this.timeEl.className = 'hud-time';
    this.el.appendChild(this.timeEl);

    // Stats bar
    this.statsEl = document.createElement('div');
    this.statsEl.className = 'hud-stats';
    this.el.appendChild(this.statsEl);

    container.appendChild(this.el);

    this.currentSpeed = 1;
    this._renderTimeControls();
  }

  _renderTimeControls() {
    this.timeEl.innerHTML = '';

    const speeds = [
      { speed: 0, label: '⏸' },
      { speed: 1, label: '▶' },
      { speed: 2, label: '⏩' },
      { speed: 5, label: '⏭' },
    ];

    const timeInfo = document.createElement('span');
    timeInfo.className = 'time-info';
    timeInfo.id = 'time-display';
    timeInfo.textContent = 'Day 1, Spring, Year 1';
    this.timeEl.appendChild(timeInfo);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'time-controls';

    for (const s of speeds) {
      const btn = document.createElement('button');
      btn.className = 'time-btn' + (s.speed === this.currentSpeed ? ' active' : '');
      btn.textContent = s.label;
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.currentSpeed = s.speed;
        this._renderTimeControls();
        bus.emit('speedChanged', { speed: s.speed });
      });
      btnGroup.appendChild(btn);
    }
    this.timeEl.appendChild(btnGroup);
  }

  updateTime(time) {
    const el = document.getElementById('time-display');
    if (el) {
      el.textContent = `Day ${time.day + 1}, ${SEASON_NAMES[time.season]}, Year ${time.year + 1}`;
    }
  }

  updateStats(stats) {
    if (!stats) return;

    let html = '';
    for (const id in SPECIES) {
      const count = stats.population?.[id] || 0;
      html += `<span class="stat-item">${SPECIES[id].emoji}${count}</span>`;
    }

    html += `<span class="stat-item stat-veg">🌱${(stats.avgVeg * 100).toFixed(0)}%</span>`;
    html += `<span class="stat-item stat-soil">🟤${(stats.avgSoil * 100).toFixed(0)}%</span>`;

    this.statsEl.innerHTML = html;
  }
}
