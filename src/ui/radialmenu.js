import { bus } from '../engine/events.js';
import { SPECIES } from '../data/species.js';

const MENU_RADIUS = 65;
const ITEM_SIZE = 44;

export class RadialMenu {
  constructor(container) {
    this.container = container;
    this.el = null;
    this.visible = false;
    this._worldX = 0;
    this._worldY = 0;

    bus.on('longPress', (e) => this.show(e));
  }

  show({ screenX, screenY, worldX, worldY }) {
    if (this.visible) this.hide();

    this._worldX = worldX;
    this._worldY = worldY;

    const items = [
      { icon: '🔍', label: 'Inspect', action: 'inspect' },
      { icon: '⛰️', label: 'Sculpt', action: 'sculpt' },
      { icon: '🌿', label: 'Biome', action: 'biome' },
      { icon: '🦌', label: 'Animal', action: 'animal' },
      { icon: '🛡️', label: 'Protect', action: 'zone' },
      { icon: '📊', label: 'Info', action: 'info' },
    ];

    this.el = document.createElement('div');
    this.el.className = 'radial-menu';

    // Clamp position to viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = Math.max(MENU_RADIUS + 10, Math.min(vw - MENU_RADIUS - 10, screenX));
    const cy = Math.max(MENU_RADIUS + 10, Math.min(vh - MENU_RADIUS - 10, screenY));

    this.el.style.left = cx + 'px';
    this.el.style.top = cy + 'px';

    // Center dot
    const center = document.createElement('div');
    center.className = 'radial-center';
    center.textContent = '✕';
    center.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.hide();
    });
    this.el.appendChild(center);

    // Items
    const angleStep = (Math.PI * 2) / items.length;
    const startAngle = -Math.PI / 2;

    items.forEach((item, i) => {
      const angle = startAngle + angleStep * i;
      const x = Math.cos(angle) * MENU_RADIUS;
      const y = Math.sin(angle) * MENU_RADIUS;

      const btn = document.createElement('button');
      btn.className = 'radial-item';
      btn.style.transform = `translate(${x}px, ${y}px) scale(0)`;
      btn.innerHTML = `<span class="radial-icon">${item.icon}</span><span class="radial-label">${item.label}</span>`;

      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (navigator.vibrate) navigator.vibrate(15);
        this._dispatch(item.action);
        this.hide();
      });

      this.el.appendChild(btn);

      // Staggered animation
      requestAnimationFrame(() => {
        setTimeout(() => {
          btn.style.transform = `translate(${x}px, ${y}px) scale(1)`;
        }, i * 40);
      });
    });

    // Backdrop
    this._backdrop = document.createElement('div');
    this._backdrop.className = 'radial-backdrop';
    this._backdrop.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.hide();
    });

    this.container.appendChild(this._backdrop);
    this.container.appendChild(this.el);
    this.visible = true;

    if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
  }

  hide() {
    if (!this.visible) return;
    if (this.el) this.el.remove();
    if (this._backdrop) this._backdrop.remove();
    this.visible = false;
  }

  _dispatch(action) {
    if (action === 'info') {
      bus.emit('tap', { worldX: this._worldX, worldY: this._worldY, screenX: 0, screenY: 0 });
      bus.emit('toolChanged', { tool: 'inspect' });
    } else {
      bus.emit('radialAction', { action, worldX: this._worldX, worldY: this._worldY });
    }
  }
}
