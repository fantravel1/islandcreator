import { bus } from '../engine/events.js';
import { SPECIES } from '../data/species.js';

const MAX_VISIBLE = 3;
const DISPLAY_TIME = 4000;

export class NotificationSystem {
  constructor(container) {
    this.container = container;
    this.el = document.createElement('div');
    this.el.className = 'notifications';
    container.appendChild(this.el);

    this.queue = [];
    this.visible = [];
    this._prevStats = null;
    this._checkTimer = 0;

    bus.on('statsUpdated', (stats) => this._checkEvents(stats));
    bus.on('notification', (data) => this.push(data.message, data.type, data.icon));
  }

  push(message, type = 'info', icon = '') {
    const notif = { message, type, icon, id: Date.now() + Math.random() };
    this.queue.push(notif);
    this._processQueue();
  }

  _processQueue() {
    while (this.queue.length > 0 && this.visible.length < MAX_VISIBLE) {
      const notif = this.queue.shift();
      this._show(notif);
    }
  }

  _show(notif) {
    this.visible.push(notif);

    const el = document.createElement('div');
    el.className = `notif notif-${notif.type}`;
    el.innerHTML = `${notif.icon ? `<span class="notif-icon">${notif.icon}</span>` : ''}
      <span class="notif-text">${notif.message}</span>`;
    el.dataset.id = notif.id;
    this.el.appendChild(el);

    // Trigger animation
    requestAnimationFrame(() => el.classList.add('show'));

    // Auto dismiss
    setTimeout(() => this._dismiss(notif.id), DISPLAY_TIME);
  }

  _dismiss(id) {
    const el = this.el.querySelector(`[data-id="${id}"]`);
    if (el) {
      el.classList.remove('show');
      el.classList.add('hide');
      setTimeout(() => {
        el.remove();
        this.visible = this.visible.filter(n => n.id !== id);
        this._processQueue();
      }, 300);
    }
  }

  _checkEvents(stats) {
    if (!this._prevStats) {
      this._prevStats = { ...stats, population: { ...stats.population } };
      return;
    }

    const prev = this._prevStats;

    // Check for extinction
    for (const id in SPECIES) {
      const prevCount = prev.population?.[id] || 0;
      const nowCount = stats.population?.[id] || 0;
      if (prevCount > 0 && nowCount === 0) {
        this.push(`${SPECIES[id].name} went extinct!`, 'danger', '💀');
      }
    }

    // Check for population boom
    for (const id in SPECIES) {
      const prevCount = prev.population?.[id] || 0;
      const nowCount = stats.population?.[id] || 0;
      if (prevCount > 0 && nowCount > prevCount * 2 && nowCount > 10) {
        this.push(`${SPECIES[id].name} population booming!`, 'success', SPECIES[id].emoji);
      }
    }

    // Check for drought
    if (prev.avgWater > 0.1 && stats.avgWater < 0.05) {
      this.push('Drought warning! Water levels critically low', 'warning', '🏜️');
    }

    // Check soil depletion
    if (prev.avgSoil > 0.3 && stats.avgSoil < 0.15) {
      this.push('Soil fertility dropping rapidly!', 'warning', '⚠️');
    }

    // Vegetation thriving
    if (prev.avgVeg < 0.4 && stats.avgVeg > 0.6) {
      this.push('Vegetation is thriving!', 'success', '🌿');
    }

    // High biodiversity
    const speciesPresent = Object.values(stats.population).filter(c => c > 0).length;
    const prevPresent = Object.values(prev.population || {}).filter(c => c > 0).length;
    if (speciesPresent === 4 && prevPresent < 4) {
      this.push('All species coexisting! Ecosystem balanced', 'success', '🌈');
    }

    this._prevStats = { ...stats, population: { ...stats.population } };
  }
}
