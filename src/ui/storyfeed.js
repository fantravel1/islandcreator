import { bus } from '../engine/events.js';
import { SEASON_NAMES } from '../data/constants.js';

const MAX_ENTRIES = 50;

export class StoryFeed {
  constructor(container) {
    this.container = container;
    this.entries = [];
    this._gameState = null;
    this._expanded = false;

    // Collapsed ticker bar
    this.tickerEl = document.createElement('div');
    this.tickerEl.className = 'story-ticker';
    this.tickerEl.innerHTML = '<span class="story-ticker-text"></span>';
    this.tickerEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.toggleExpand();
    });
    container.appendChild(this.tickerEl);

    // Expanded journal panel
    this.panelEl = document.createElement('div');
    this.panelEl.className = 'story-panel';
    this.panelEl.innerHTML = `
      <div class="story-panel-header">
        <span>Island Journal</span>
        <button class="story-panel-close">✕</button>
      </div>
      <div class="story-panel-body"></div>
    `;
    this.panelEl.querySelector('.story-panel-close').addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.collapse();
    });

    // Listen for story events
    bus.on('storyEvent', (data) => this.addEntry(data));
  }

  setGameState(gs) {
    this._gameState = gs;
  }

  addEntry(data) {
    const gs = this._gameState;
    const time = gs ? `${SEASON_NAMES[gs.time.season]}, Year ${gs.time.year + 1}` : '';

    const entry = {
      time,
      text: data.text,
      type: data.type || 'event', // chapter, goal, birth, death, event, warning
      detail: data.detail || '',
      timestamp: Date.now(),
    };

    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.shift();
    }

    // Update ticker
    this._updateTicker(entry);

    // If panel open, append
    if (this._expanded) {
      this._appendEntryToPanel(entry);
    }
  }

  _updateTicker(entry) {
    const textEl = this.tickerEl.querySelector('.story-ticker-text');
    textEl.textContent = entry.text;
    this.tickerEl.classList.remove('story-ticker-flash');
    void this.tickerEl.offsetWidth; // reflow
    this.tickerEl.classList.add('story-ticker-flash');

    // Color by type
    const colors = {
      chapter: '#f0c040',
      goal: '#3db88e',
      birth: '#80d0ff',
      death: '#e05050',
      warning: '#e0a030',
      event: '#b0b8c0',
      unlock: '#d4a0f0',
    };
    this.tickerEl.style.borderLeftColor = colors[entry.type] || colors.event;
  }

  toggleExpand() {
    this._expanded ? this.collapse() : this.expand();
  }

  expand() {
    if (this._expanded) return;
    this._expanded = true;

    const body = this.panelEl.querySelector('.story-panel-body');
    body.innerHTML = '';
    for (const entry of this.entries) {
      this._appendEntryToPanel(entry, body);
    }

    this.container.appendChild(this.panelEl);
    requestAnimationFrame(() => this.panelEl.classList.add('open'));

    // Scroll to bottom
    setTimeout(() => { body.scrollTop = body.scrollHeight; }, 50);
  }

  collapse() {
    if (!this._expanded) return;
    this.panelEl.classList.remove('open');
    setTimeout(() => {
      this.panelEl.remove();
      this._expanded = false;
    }, 300);
  }

  _appendEntryToPanel(entry, body) {
    const container = body || this.panelEl.querySelector('.story-panel-body');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `story-entry story-entry-${entry.type}`;
    el.innerHTML = `
      <span class="story-entry-time">${entry.time}</span>
      <span class="story-entry-text">${entry.text}</span>
      ${entry.detail ? `<span class="story-entry-detail">${entry.detail}</span>` : ''}
    `;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  }
}
