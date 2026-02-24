import { bus } from '../engine/events.js';
import { deleteSave } from '../storage/load.js';

export class SettingsPanel {
  constructor(container) {
    this.container = container;
    this.el = document.createElement('div');
    this.el.className = 'settings-panel';
    this.visible = false;

    this._gameState = null;
    this._achievements = null;
  }

  setGameState(gs) {
    this._gameState = gs;
  }

  setAchievements(achSystem) {
    this._achievements = achSystem;
  }

  toggle() {
    this.visible ? this.hide() : this.show();
  }

  show() {
    if (this.visible) return;
    this.visible = true;

    const gs = this._gameState;
    const settings = gs?.settings || {};

    // Build achievement progress HTML
    let achHTML = '';
    if (this._achievements) {
      const progress = this._achievements.getProgress();
      achHTML = `
        <div class="settings-group">
          <div class="settings-section-title">Achievements (${progress.unlocked}/${progress.total})</div>
          <div class="achievement-progress-bar">
            <div class="achievement-progress-fill" style="width:${(progress.unlocked / progress.total * 100) | 0}%"></div>
          </div>
          <div class="achievement-list">
            ${progress.list.map(a => `
              <div class="achievement-row ${a.unlocked ? 'unlocked' : 'locked'}">
                <span class="achievement-row-icon">${a.unlocked ? a.icon : '🔒'}</span>
                <div class="achievement-row-info">
                  <span class="achievement-row-name">${a.name}</span>
                  <span class="achievement-row-desc">${a.desc}</span>
                </div>
                ${a.unlocked ? '<span class="achievement-row-check">✓</span>' : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    this.el.innerHTML = `
      <div class="settings-header">
        <span>Settings</span>
        <button class="settings-close">✕</button>
      </div>
      <div class="settings-body">
        <div class="settings-group">
          <div class="settings-row">
            <span>Haptic Feedback</span>
            <label class="toggle-switch">
              <input type="checkbox" data-setting="haptics" ${settings.haptics !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="settings-row">
            <span>Particle Effects</span>
            <label class="toggle-switch">
              <input type="checkbox" data-setting="particles" ${settings.particles !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="settings-row">
            <span>Grid Lines</span>
            <label class="toggle-switch">
              <input type="checkbox" data-setting="gridLines" ${settings.gridLines !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="settings-row">
            <span>Day/Night Cycle</span>
            <label class="toggle-switch">
              <input type="checkbox" data-setting="dayNight" ${settings.dayNight !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div class="settings-group">
          <div class="settings-row">
            <span>Graphics Quality</span>
            <select class="settings-select" data-setting="quality">
              <option value="low" ${settings.quality === 'low' ? 'selected' : ''}>Low</option>
              <option value="medium" ${settings.quality === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="high" ${!settings.quality || settings.quality === 'high' ? 'selected' : ''}>High</option>
            </select>
          </div>
        </div>
        ${achHTML}
        <div class="settings-group settings-danger">
          <button class="settings-reset-btn">Reset Island</button>
          <p class="settings-warn">This will delete your save and start fresh.</p>
        </div>
      </div>
    `;

    this.container.appendChild(this.el);
    requestAnimationFrame(() => this.el.classList.add('open'));

    // Close button
    this.el.querySelector('.settings-close').addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.hide();
    });

    // Toggle switches
    this.el.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', () => {
        const key = input.dataset.setting;
        if (gs) {
          gs.settings[key] = input.checked;
          gs._dirty = true;
          bus.emit('settingsChanged', { key, value: input.checked });
        }
      });
    });

    // Quality select
    const select = this.el.querySelector('.settings-select');
    if (select) {
      select.addEventListener('change', () => {
        if (gs) {
          gs.settings.quality = select.value;
          gs._dirty = true;
          bus.emit('settingsChanged', { key: 'quality', value: select.value });
        }
      });
    }

    // Reset button
    const resetBtn = this.el.querySelector('.settings-reset-btn');
    let resetConfirmed = false;
    resetBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (!resetConfirmed) {
        resetBtn.textContent = 'Tap again to confirm';
        resetBtn.classList.add('confirm');
        resetConfirmed = true;
        setTimeout(() => {
          resetConfirmed = false;
          resetBtn.textContent = 'Reset Island';
          resetBtn.classList.remove('confirm');
        }, 3000);
      } else {
        deleteSave();
        window.location.reload();
      }
    });
  }

  hide() {
    if (!this.visible) return;
    this.el.classList.remove('open');
    setTimeout(() => {
      this.el.innerHTML = '';
      this.el.remove();
      this.visible = false;
    }, 300);
  }
}
