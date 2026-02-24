import { bus } from '../engine/events.js';
import { getBiomeName } from '../world/biomes.js';
import { SPECIES } from '../data/species.js';
import { BIOME_OCEAN } from '../data/constants.js';

export class Inspector {
  constructor(container) {
    this.container = container;
    this.el = document.createElement('div');
    this.el.className = 'inspector';
    this.el.style.display = 'none';
    container.appendChild(this.el);

    this.mode = null; // 'tile', 'governance', 'animal'
    this.tileData = null;
    this.governance = null;

    // Close button
    this.el.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('inspector-close')) {
        this.hide();
      }
    });
  }

  show() {
    this.el.style.display = 'block';
    setTimeout(() => this.el.classList.add('open'), 10);
  }

  hide() {
    this.el.classList.remove('open');
    setTimeout(() => { this.el.style.display = 'none'; }, 300);
  }

  showTile(tiles, x, y) {
    if (!tiles.inBounds(x, y)) return;

    this.mode = 'tile';
    const biome = tiles.getBiome(x, y);

    if (biome === BIOME_OCEAN) {
      this.el.innerHTML = `
        <div class="inspector-header">
          <span>Ocean (${x}, ${y})</span>
          <button class="inspector-close">✕</button>
        </div>
        <div class="inspector-body">
          <div class="inspector-row"><span>Depth</span><span>${((0.3 - tiles.getH(x, y)) * 100).toFixed(0)}%</span></div>
        </div>
      `;
    } else {
      this.el.innerHTML = `
        <div class="inspector-header">
          <span>${getBiomeName(biome)} (${x}, ${y})</span>
          <button class="inspector-close">✕</button>
        </div>
        <div class="inspector-body">
          <div class="inspector-row"><span>Elevation</span><span>${(tiles.getH(x, y) * 100).toFixed(0)}%</span></div>
          <div class="inspector-row"><span>Water</span><div class="inspector-bar"><div class="bar-fill bar-water" style="width:${tiles.getWater(x, y) * 100}%"></div></div></div>
          <div class="inspector-row"><span>Soil</span><div class="inspector-bar"><div class="bar-fill bar-soil" style="width:${tiles.getSoil(x, y) * 100}%"></div></div></div>
          <div class="inspector-row"><span>Vegetation</span><div class="inspector-bar"><div class="bar-fill bar-veg" style="width:${tiles.getVeg(x, y) * 100}%"></div></div></div>
          <div class="inspector-row"><span>Temperature</span><span>${(tiles.getTemp(x, y) * 100).toFixed(0)}%</span></div>
          <div class="inspector-row"><span>Protected</span><span>${tiles.isProtected(x, y) ? '✅' : '❌'}</span></div>
          <div class="inspector-row"><span>Developed</span><span>${tiles.isDeveloped(x, y) ? '🏗️' : '—'}</span></div>
        </div>
      `;
    }
    this.show();
  }

  showGovernance(governance) {
    this.mode = 'governance';
    this.governance = governance;

    this.el.innerHTML = `
      <div class="inspector-header">
        <span>⚖️ Governance</span>
        <button class="inspector-close">✕</button>
      </div>
      <div class="inspector-body">
        <div class="inspector-slider-row">
          <label>Conservation</label>
          <input type="range" min="0" max="100" value="${governance.conservation * 100}" data-key="conservation">
          <span class="slider-value">${(governance.conservation * 100).toFixed(0)}%</span>
        </div>
        <div class="inspector-slider-row">
          <label>Development</label>
          <input type="range" min="0" max="100" value="${governance.development * 100}" data-key="development">
          <span class="slider-value">${(governance.development * 100).toFixed(0)}%</span>
        </div>
        <div class="inspector-slider-row">
          <label>Hunting Limit</label>
          <input type="range" min="0" max="100" value="${governance.huntingLimit}" data-key="huntingLimit">
          <span class="slider-value">${governance.huntingLimit}</span>
        </div>
        <div class="inspector-slider-row">
          <label>Enforcement</label>
          <input type="range" min="0" max="100" value="${governance.enforcement * 100}" data-key="enforcement">
          <span class="slider-value">${(governance.enforcement * 100).toFixed(0)}%</span>
        </div>
        <div class="inspector-slider-row">
          <label>Taxes</label>
          <input type="range" min="0" max="100" value="${governance.taxes * 100}" data-key="taxes">
          <span class="slider-value">${(governance.taxes * 100).toFixed(0)}%</span>
        </div>
      </div>
    `;

    // Wire up sliders
    const sliders = this.el.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
      slider.addEventListener('input', (e) => {
        const key = e.target.dataset.key;
        const val = parseInt(e.target.value);
        const display = e.target.nextElementSibling;

        if (key === 'huntingLimit') {
          governance[key] = val;
          display.textContent = val;
        } else {
          governance[key] = val / 100;
          display.textContent = val + '%';
        }
        bus.emit('policyChanged', { key, value: governance[key] });
      });
    });

    this.show();
  }

  showAnimal(animal) {
    if (!animal) return;
    this.mode = 'animal';
    const spec = SPECIES[animal.speciesId];

    this.el.innerHTML = `
      <div class="inspector-header">
        <span>${spec?.emoji || ''} ${spec?.name || animal.speciesId}</span>
        <button class="inspector-close">✕</button>
      </div>
      <div class="inspector-body">
        <div class="inspector-row"><span>State</span><span>${animal.state}</span></div>
        <div class="inspector-row"><span>Energy</span><div class="inspector-bar"><div class="bar-fill bar-energy" style="width:${animal.energy * 100}%"></div></div></div>
        <div class="inspector-row"><span>Hunger</span><div class="inspector-bar"><div class="bar-fill bar-hunger" style="width:${animal.hunger * 100}%"></div></div></div>
        <div class="inspector-row"><span>Thirst</span><div class="inspector-bar"><div class="bar-fill bar-thirst" style="width:${animal.thirst * 100}%"></div></div></div>
        <div class="inspector-row"><span>Age</span><span>${animal.ageDays} days</span></div>
        <div class="inspector-row"><span>Sex</span><span>${animal.sex === 'F' ? '♀' : '♂'}</span></div>
      </div>
    `;
    this.show();
  }
}
