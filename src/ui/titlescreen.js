import { bus } from '../engine/events.js';
import { hasSave, deleteSave } from '../storage/load.js';

export class TitleScreen {
  constructor(container) {
    this.container = container;
    this.el = document.createElement('div');
    this.el.className = 'title-screen';
    this.el.innerHTML = this._buildHTML();
    container.appendChild(this.el);

    this._setupEvents();
    this._animateWaves();
  }

  _buildHTML() {
    const savedGame = hasSave();
    return `
      <div class="title-bg">
        <canvas class="title-waves" id="title-waves"></canvas>
        <div class="title-particles" id="title-particles"></div>
      </div>
      <div class="title-content">
        <div class="title-logo">
          <span class="title-emoji">🏝️</span>
          <h1 class="title-name">IslandCreator</h1>
          <p class="title-tagline">Build your world. Govern with care. Watch it live.</p>
        </div>
        <div class="title-create-form" id="title-create-form" style="display:none">
          <div class="title-input-group">
            <label class="title-label">Island Name</label>
            <input type="text" class="title-input" id="island-name-input" placeholder="My Island" maxlength="24" autocomplete="off" />
          </div>
          <div class="title-input-group">
            <label class="title-label">World Seed</label>
            <div class="title-seed-row">
              <input type="text" class="title-input title-seed" id="island-seed-input" placeholder="Random" maxlength="8" autocomplete="off" inputmode="numeric" />
              <button class="title-seed-dice" id="seed-dice">🎲</button>
            </div>
          </div>
          <button class="title-btn title-btn-primary" data-action="generate">
            <span class="btn-icon">🌊</span>
            <span class="btn-text">Generate Island</span>
          </button>
          <button class="title-btn title-btn-back" data-action="back">
            <span class="btn-text">← Back</span>
          </button>
        </div>
        <div class="title-buttons" id="title-main-buttons">
          ${savedGame ? `
            <button class="title-btn title-btn-primary" data-action="continue">
              <span class="btn-icon">▶</span>
              <span class="btn-text">Continue Island</span>
            </button>
            <button class="title-btn title-btn-secondary" data-action="new">
              <span class="btn-icon">✨</span>
              <span class="btn-text">New Island</span>
            </button>
          ` : `
            <button class="title-btn title-btn-primary" data-action="new">
              <span class="btn-icon">✨</span>
              <span class="btn-text">Create Island</span>
            </button>
          `}
        </div>
        <div class="title-footer">
          <span>No combat. Just ecosystems.</span>
        </div>
      </div>
    `;
  }

  _setupEvents() {
    // Dice button for random seed
    this.el.addEventListener('pointerdown', (e) => {
      const dice = e.target.closest('#seed-dice');
      if (dice) {
        e.preventDefault();
        e.stopPropagation();
        const seedInput = this.el.querySelector('#island-seed-input');
        if (seedInput) {
          seedInput.value = ((Math.random() * 999999) | 0).toString();
        }
        if (navigator.vibrate) navigator.vibrate(15);
        return;
      }

      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.preventDefault();

      const action = btn.dataset.action;
      btn.classList.add('pressed');
      setTimeout(() => btn.classList.remove('pressed'), 200);

      if (navigator.vibrate) navigator.vibrate(25);

      if (action === 'continue') {
        this._fadeOut(() => bus.emit('titleAction', { action: 'continue' }));
      } else if (action === 'new') {
        if (hasSave()) {
          btn.innerHTML = '<span class="btn-icon">⚠️</span><span class="btn-text">Tap again to confirm</span>';
          btn.dataset.action = 'confirmNew';
        } else {
          this._showCreateForm();
        }
      } else if (action === 'confirmNew') {
        deleteSave();
        this._showCreateForm();
      } else if (action === 'generate') {
        const nameInput = this.el.querySelector('#island-name-input');
        const seedInput = this.el.querySelector('#island-seed-input');
        const name = (nameInput?.value || '').trim() || 'My Island';
        const seedStr = (seedInput?.value || '').trim();
        const seed = seedStr ? parseInt(seedStr, 10) || 0 : (Math.random() * 999999) | 0;
        this._fadeOut(() => bus.emit('titleAction', { action: 'new', name, seed }));
      } else if (action === 'back') {
        this._hideCreateForm();
      }
    });

    // Prevent keyboard zoom
    this.el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const genBtn = this.el.querySelector('[data-action="generate"]');
        if (genBtn) genBtn.click();
      }
    });
  }

  _showCreateForm() {
    const mainBtns = this.el.querySelector('#title-main-buttons');
    const form = this.el.querySelector('#title-create-form');
    if (mainBtns) mainBtns.style.display = 'none';
    if (form) {
      form.style.display = 'flex';
      form.classList.add('form-enter');
      setTimeout(() => {
        const nameInput = form.querySelector('#island-name-input');
        if (nameInput) nameInput.focus();
      }, 300);
    }
  }

  _hideCreateForm() {
    const mainBtns = this.el.querySelector('#title-main-buttons');
    const form = this.el.querySelector('#title-create-form');
    if (form) form.style.display = 'none';
    if (mainBtns) mainBtns.style.display = 'flex';
  }

  _fadeOut(cb) {
    this.el.classList.add('fade-out');
    setTimeout(() => {
      this.el.remove();
      cb();
    }, 600);
  }

  _animateWaves() {
    const canvas = this.el.querySelector('#title-waves');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (t) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const layers = [
        { y: h * 0.65, amp: 20, freq: 0.008, speed: 0.0008, color: 'rgba(15, 60, 100, 0.4)' },
        { y: h * 0.70, amp: 15, freq: 0.012, speed: 0.001, color: 'rgba(20, 80, 120, 0.3)' },
        { y: h * 0.75, amp: 10, freq: 0.015, speed: 0.0015, color: 'rgba(25, 100, 140, 0.25)' },
      ];

      for (const layer of layers) {
        ctx.fillStyle = layer.color;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 3) {
          const y = layer.y + Math.sin(x * layer.freq + t * layer.speed) * layer.amp
                               + Math.sin(x * layer.freq * 0.5 + t * layer.speed * 0.7) * layer.amp * 0.5;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    draw(0);

    const observer = new MutationObserver(() => {
      if (!document.contains(this.el)) {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
