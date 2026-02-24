import { bus } from '../engine/events.js';
import {
  TOOL_SCULPT, TOOL_BIOME, TOOL_ANIMAL, TOOL_ZONE, TOOL_GOVERNANCE, TOOL_INSPECT,
  BIOME_FOREST, BIOME_GRASSLAND, BIOME_DESERT,
} from '../data/constants.js';
import { SPECIES_LIST } from '../data/species.js';
import { getBiomeName } from '../world/biomes.js';

const TOOLS = [
  { id: TOOL_INSPECT, icon: '👆', label: 'Select' },
  { id: TOOL_SCULPT, icon: '⛰️', label: 'Sculpt' },
  { id: TOOL_BIOME, icon: '🌿', label: 'Biome' },
  { id: TOOL_ANIMAL, icon: '🦌', label: 'Animals' },
  { id: TOOL_ZONE, icon: '🛡️', label: 'Protect' },
  { id: TOOL_GOVERNANCE, icon: '⚖️', label: 'Govern' },
];

const BIOMES = [
  { id: BIOME_FOREST, icon: '🌲', label: 'Forest' },
  { id: BIOME_GRASSLAND, icon: '🌾', label: 'Grass' },
  { id: BIOME_DESERT, icon: '🏜️', label: 'Desert' },
];

export class Toolbar {
  constructor(container) {
    this.container = container;
    this.activeTool = TOOL_INSPECT;
    this.selectedBiome = BIOME_FOREST;
    this.selectedSpecies = 'deer';
    this.sculptMode = 'raise'; // 'raise' or 'lower'

    this.el = document.createElement('div');
    this.el.className = 'toolbar';

    this.subMenu = document.createElement('div');
    this.subMenu.className = 'toolbar-submenu';
    this.subMenu.style.display = 'none';

    container.appendChild(this.subMenu);
    container.appendChild(this.el);

    this._render();
  }

  _render() {
    this.el.innerHTML = '';

    for (const tool of TOOLS) {
      const btn = document.createElement('button');
      btn.className = 'tool-btn' + (tool.id === this.activeTool ? ' active' : '');
      btn.innerHTML = `<span class="tool-icon">${tool.icon}</span><span class="tool-label">${tool.label}</span>`;
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.setTool(tool.id);
      });
      this.el.appendChild(btn);
    }
  }

  setTool(toolId) {
    this.activeTool = toolId;
    this._render();
    this._updateSubMenu();
    bus.emit('toolChanged', { tool: toolId });
  }

  _updateSubMenu() {
    this.subMenu.innerHTML = '';

    if (this.activeTool === TOOL_BIOME) {
      this.subMenu.style.display = 'flex';
      for (const biome of BIOMES) {
        const btn = document.createElement('button');
        btn.className = 'submenu-btn' + (biome.id === this.selectedBiome ? ' active' : '');
        btn.innerHTML = `${biome.icon} ${biome.label}`;
        btn.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          this.selectedBiome = biome.id;
          this._updateSubMenu();
          bus.emit('biomeSelected', { biome: biome.id });
        });
        this.subMenu.appendChild(btn);
      }
    } else if (this.activeTool === TOOL_ANIMAL) {
      this.subMenu.style.display = 'flex';
      for (const spec of SPECIES_LIST) {
        const btn = document.createElement('button');
        btn.className = 'submenu-btn' + (spec.id === this.selectedSpecies ? ' active' : '');
        btn.innerHTML = `${spec.emoji} ${spec.name}`;
        btn.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          this.selectedSpecies = spec.id;
          this._updateSubMenu();
          bus.emit('speciesSelected', { species: spec.id });
        });
        this.subMenu.appendChild(btn);
      }
    } else if (this.activeTool === TOOL_SCULPT) {
      this.subMenu.style.display = 'flex';
      for (const mode of ['raise', 'lower']) {
        const btn = document.createElement('button');
        btn.className = 'submenu-btn' + (this.sculptMode === mode ? ' active' : '');
        btn.innerHTML = mode === 'raise' ? '⬆️ Raise' : '⬇️ Lower';
        btn.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          this.sculptMode = mode;
          this._updateSubMenu();
          bus.emit('sculptModeChanged', { mode });
        });
        this.subMenu.appendChild(btn);
      }
    } else {
      this.subMenu.style.display = 'none';
    }
  }
}
