import { bus } from '../engine/events.js';
import { getBiomeName } from '../world/biomes.js';
import { SPECIES } from '../data/species.js';
import { BIOME_OCEAN } from '../data/constants.js';
import { STRUCTURE_TYPES } from '../sim/structures.js';

export class Inspector {
  constructor(container) {
    this.container = container;
    this.el = document.createElement('div');
    this.el.className = 'inspector';
    this.el.style.display = 'none';
    container.appendChild(this.el);

    this.mode = null; // 'tile', 'governance', 'animal', 'village'
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
    if (!spec) return;

    // Determine what's threatening this animal
    const threats = [];
    if (animal.hunger > 0.7) threats.push(spec.type === 'predator' ? 'Starving — no prey nearby' : 'Starving — needs vegetation');
    else if (animal.hunger > 0.4) threats.push(spec.type === 'predator' ? 'Hungry — hunting for prey' : 'Hungry — foraging');
    if (animal.thirst > 0.7) threats.push('Dehydrated — needs water tiles');
    else if (animal.thirst > 0.4) threats.push('Thirsty — seeking water');
    if (animal.energy < 0.2) threats.push('Critically low energy — may die soon');
    if (animal.ageDays > spec.maxAge * 0.8) threats.push('Old age — nearing natural lifespan');
    if (spec.type === 'herbivore') {
      const predators = Object.values(SPECIES).filter(s => s.prey?.includes(spec.id));
      if (predators.length > 0) {
        threats.push(`Hunted by ${predators.map(p => p.name).join(', ')}`);
      }
    }

    const threatHTML = threats.length > 0
      ? `<div class="inspector-threats">${threats.map(t => `<div class="threat-line">${t}</div>`).join('')}</div>`
      : `<div class="inspector-status-ok">Healthy — no immediate threats</div>`;

    // Lifespan display
    const lifePct = Math.min(100, (animal.ageDays / spec.maxAge) * 100);
    const ageYears = (animal.ageDays / 120).toFixed(1);

    // State display with user-friendly labels
    const stateLabels = {
      'wander': 'Wandering',
      'flee': 'Fleeing danger!',
      'eat': 'Eating',
      'drink': 'Drinking',
      'hunt': 'Hunting prey',
      'seekFood': 'Searching for food',
      'seekWater': 'Searching for water',
      'reproduce': 'Mating',
      'flock': 'Moving with group',
      'rest': 'Resting',
    };
    const stateLabel = stateLabels[animal.state] || animal.state;

    this.el.innerHTML = `
      <div class="inspector-header">
        <span>${spec.emoji} ${animal.name || spec.name} ${animal.sex === 'F' ? '♀' : '♂'}</span>
        <button class="inspector-close">✕</button>
      </div>
      <div class="inspector-body">
        <div class="inspector-row"><span>Activity</span><span class="state-label">${stateLabel}</span></div>
        <div class="inspector-row"><span>Energy</span><div class="inspector-bar"><div class="bar-fill ${animal.energy < 0.2 ? 'bar-danger' : 'bar-energy'}" style="width:${animal.energy * 100}%"></div></div></div>
        <div class="inspector-row"><span>Hunger</span><div class="inspector-bar"><div class="bar-fill ${animal.hunger > 0.7 ? 'bar-danger' : 'bar-hunger'}" style="width:${animal.hunger * 100}%"></div></div></div>
        <div class="inspector-row"><span>Thirst</span><div class="inspector-bar"><div class="bar-fill ${(animal.thirst || 0) > 0.7 ? 'bar-danger' : 'bar-thirst'}" style="width:${(animal.thirst || 0) * 100}%"></div></div></div>
        <div class="inspector-row"><span>Lifespan</span><div class="inspector-bar"><div class="bar-fill bar-age" style="width:${lifePct}%"></div></div></div>
        <div class="inspector-row"><span>Age</span><span>${ageYears} yrs</span></div>
        <div class="inspector-row"><span>Diet</span><span>${spec.type === 'predator' ? 'Hunts ' + (spec.prey || []).join(', ') : 'Eats vegetation'}</span></div>
        ${threatHTML}
      </div>
    `;
    this.show();
  }

  showStructure(structure) {
    if (!structure) return;
    this.mode = 'village';
    const type = STRUCTURE_TYPES[structure.typeId];
    if (!type) return;

    if (!type.hasPopulation) {
      this.el.innerHTML = `
        <div class="inspector-header">
          <span>${type.emoji} ${type.name}</span>
          <button class="inspector-close">✕</button>
        </div>
        <div class="inspector-body">
          <div class="inspector-row"><span>Type</span><span>${type.name}</span></div>
          <div class="inspector-row"><span>Location</span><span>${structure.x}, ${structure.y}</span></div>
          <div class="inspector-hint">${_structureHint(structure.typeId)}</div>
        </div>
      `;
      this.show();
      return;
    }

    // Village — show rich detail
    const pop = structure.population || 0;
    const happiness = structure.happiness || 0;
    const food = structure.food || 0;

    const tips = [];
    if (food < 0.2) tips.push('Food critically low — build farms nearby');
    else if (food < 0.4) tips.push('Food supply low — add farms or grow vegetation');
    if (happiness < 0.3) tips.push('Happiness low — people may leave');
    else if (happiness > 0.6 && food > 0.4 && pop < 50) tips.push('Conditions good — population is growing');
    if (pop >= 50) tips.push('Village at max capacity (50)');

    const tipsHTML = tips.length > 0
      ? `<div class="inspector-threats">${tips.map(t => `<div class="threat-line">${t}</div>`).join('')}</div>`
      : '';

    this.el.innerHTML = `
      <div class="inspector-header">
        <span>${type.emoji} Village</span>
        <button class="inspector-close">✕</button>
      </div>
      <div class="inspector-body">
        <div class="inspector-row"><span>Population</span><span class="pop-count">${pop} / 50</span></div>
        <div class="inspector-row"><span>Happiness</span><div class="inspector-bar"><div class="bar-fill ${happiness < 0.3 ? 'bar-danger' : happiness > 0.6 ? 'bar-energy' : 'bar-hunger'}" style="width:${happiness * 100}%"></div></div></div>
        <div class="inspector-row"><span>Food</span><div class="inspector-bar"><div class="bar-fill ${food < 0.2 ? 'bar-danger' : 'bar-veg'}" style="width:${food * 100}%"></div></div></div>
        <div class="inspector-section-label">What affects happiness:</div>
        <div class="inspector-factors">
          <div class="factor-line">Food supply (40%) — build nearby farms</div>
          <div class="factor-line">Water nearby (30%) — keep water tiles close</div>
          <div class="factor-line">Nature + ecoscore (30%) — protect vegetation</div>
        </div>
        ${tipsHTML}
      </div>
    `;
    this.show();
  }
}

function _structureHint(typeId) {
  const hints = {
    farm: 'Farms boost food supply for nearby villages and help vegetation grow.',
    lighthouse: 'Lighthouses protect nearby coastal areas.',
    windmill: 'Windmills generate energy for the settlement.',
  };
  return hints[typeId] || '';
}
