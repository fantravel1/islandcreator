import { bus } from '../engine/events.js';
import { Toolbar } from './toolbar.js';
import { HUD } from './hud.js';
import { Inspector } from './inspector.js';
import {
  TOOL_SCULPT, TOOL_BIOME, TOOL_ANIMAL, TOOL_ZONE, TOOL_GOVERNANCE, TOOL_INSPECT,
  TOOL_BUILD,
  BRUSH_RADIUS, SCULPT_STRENGTH,
  BIOME_OCEAN, BIOME_GRASSLAND,
} from '../data/constants.js';
import { createAnimal } from '../sim/animals.js';
import { placeStructure, canPlaceStructure } from '../sim/structures.js';

export class UI {
  constructor(uiContainer, gameState, overlays, zoneManager, undoManager) {
    this.gameState = gameState;
    this.overlays = overlays;
    this.zoneManager = zoneManager;
    this.undoManager = undoManager;

    this.toolbar = new Toolbar(uiContainer);
    this.hud = new HUD(uiContainer);
    this.inspector = new Inspector(uiContainer);

    this._sculptMode = 'raise';
    this._isDragging = false;
    this._zoneStartTile = null;

    this._setupEvents();
  }

  _setupEvents() {
    // Tool changes
    bus.on('toolChanged', ({ tool }) => {
      this.overlays.activeTool = tool;

      if (tool === TOOL_GOVERNANCE) {
        this.inspector.showGovernance(this.gameState.governance);
      } else {
        if (this.inspector.mode === 'governance') {
          this.inspector.hide();
        }
      }
    });

    bus.on('sculptModeChanged', ({ mode }) => {
      this._sculptMode = mode;
    });

    bus.on('biomeSelected', ({ biome }) => {
      this.overlays.selectedBiome = biome;
    });

    bus.on('speciesSelected', ({ species }) => {
      this.overlays.selectedSpecies = species;
    });

    // Speed
    bus.on('speedChanged', ({ speed }) => {
      this.gameState._gameLoop?.setSpeed(speed);
    });

    // Stats update
    bus.on('statsUpdated', (stats) => {
      this.hud.updateStats(stats);
    });

    // Input events
    bus.on('tap', (e) => this._onTap(e));
    bus.on('drag', (e) => this._onDrag(e));
    bus.on('dragEnd', () => this._onDragEnd());
    bus.on('pinch', (e) => this._onPinch(e));
    bus.on('pan', (e) => this._onPan(e));

    // Radial menu action
    bus.on('radialAction', ({ action, worldX, worldY }) => {
      this._handleRadialAction(action, worldX, worldY);
    });

    // Undo keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        this._performUndo();
      }
    });
  }

  _handleRadialAction(action, worldX, worldY) {
    const toolMap = {
      'inspect': TOOL_INSPECT,
      'sculpt': TOOL_SCULPT,
      'biome': TOOL_BIOME,
      'animal': TOOL_ANIMAL,
      'zone': TOOL_ZONE,
    };
    const tool = toolMap[action];
    if (tool) {
      this.toolbar.setTool(tool);
    }
  }

  _performUndo() {
    if (this.undoManager && this.undoManager.canUndo()) {
      const tiles = this.gameState.islands[0]?.world.tiles;
      if (tiles) {
        this.undoManager.undo(tiles);
        this.gameState._dirty = true;
        if (navigator.vibrate) navigator.vibrate([10, 20, 10]);
        bus.emit('notification', {
          message: 'Undo successful',
          type: 'info',
          icon: '↩️',
        });
      }
    }
  }

  _onTap(e) {
    const tool = this.toolbar.activeTool;
    const tiles = this.gameState.islands[0]?.world.tiles;
    if (!tiles) return;

    const tx = Math.floor(e.worldX);
    const ty = Math.floor(e.worldY);

    if (!tiles.inBounds(tx, ty)) return;

    if (tool === TOOL_INSPECT) {
      // Priority: animal > structure > tile
      const animals = this.gameState.islands[0].entities.animals;
      let closest = null;
      let closestDist = 4;
      for (const a of animals) {
        const dx = a.x - e.worldX;
        const dy = a.y - e.worldY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < closestDist) {
          closestDist = d;
          closest = a;
        }
      }
      if (closest) {
        this.inspector.showAnimal(closest);
      } else {
        // Check if tapping on a structure
        const structures = this.gameState.islands[0].entities.structures || [];
        const tappedStruct = structures.find(s => {
          const half = Math.floor((s.size || 1) / 2);
          return tx >= s.x - half && tx <= s.x + half && ty >= s.y - half && ty <= s.y + half;
        });
        if (tappedStruct) {
          this.inspector.showStructure(tappedStruct);
        } else {
          this.inspector.showTile(tiles, tx, ty);
        }
      }
    } else if (tool === TOOL_ANIMAL) {
      if (tiles.isLand(tx, ty)) {
        const animal = createAnimal(this.toolbar.selectedSpecies, tx + 0.5, ty + 0.5);
        if (animal) {
          this.gameState.islands[0].entities.animals.push(animal);
          this.gameState._dirty = true;
          if (navigator.vibrate) navigator.vibrate(20);
        }
      }
    } else if (tool === TOOL_BUILD) {
      const structType = this.toolbar.selectedStructure;
      const structures = this.gameState.islands[0].entities.structures;
      if (canPlaceStructure(structType, tiles, tx, ty)) {
        placeStructure(structType, tiles, tx, ty, structures);
        this.gameState._dirty = true;
        if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
        bus.emit('sculptApplied'); // for achievement tracking
      } else {
        bus.emit('notification', {
          message: 'Cannot build here. Need open, undeveloped land.',
          type: 'warning',
          icon: '⚠️',
        });
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      }
    } else if (tool === TOOL_ZONE) {
      this.zoneManager.toggleTile(tx, ty);
      this.gameState._dirty = true;
      if (navigator.vibrate) navigator.vibrate(15);
    } else if (tool === TOOL_SCULPT) {
      if (this.undoManager) {
        this.undoManager.pushSnapshot(tiles, tx, ty, BRUSH_RADIUS);
      }
      this._applySculpt(tiles, tx, ty);
      bus.emit('sculptApplied');
    } else if (tool === TOOL_BIOME) {
      if (this.undoManager) {
        this.undoManager.pushSnapshot(tiles, tx, ty, BRUSH_RADIUS);
      }
      this._applyBiome(tiles, tx, ty);
    }
  }

  _onDrag(e) {
    const tool = this.toolbar.activeTool;
    const tiles = this.gameState.islands[0]?.world.tiles;
    if (!tiles) return;

    const tx = Math.floor(e.worldX);
    const ty = Math.floor(e.worldY);

    this.overlays.setCursor(e.worldX, e.worldY);

    if (tool === TOOL_SCULPT) {
      this._applySculpt(tiles, tx, ty);
    } else if (tool === TOOL_BIOME) {
      this._applyBiome(tiles, tx, ty);
    } else if (tool === TOOL_INSPECT) {
      const cam = this.gameState._camera;
      if (cam) cam.pan(e.dx, e.dy);
    } else if (tool === TOOL_ZONE) {
      if (!this._zoneStartTile) {
        this._zoneStartTile = { x: tx, y: ty };
      }
      this.overlays.zoneStart = this._zoneStartTile;
      this.overlays.zoneEnd = { x: tx, y: ty };
    }
  }

  _onDragEnd() {
    this.overlays.setCursor(null, null);

    if (this.toolbar.activeTool === TOOL_ZONE && this._zoneStartTile && this.overlays.zoneEnd) {
      this.zoneManager.addZone(
        this._zoneStartTile.x, this._zoneStartTile.y,
        this.overlays.zoneEnd.x, this.overlays.zoneEnd.y
      );
      this.gameState._dirty = true;
      if (navigator.vibrate) navigator.vibrate([15, 50, 15]);
    }

    this._zoneStartTile = null;
    this.overlays.zoneStart = null;
    this.overlays.zoneEnd = null;
  }

  _onPinch(e) {
    const cam = this.gameState._camera;
    if (cam) cam.zoomAt(e.scale, e.centerX, e.centerY);
  }

  _onPan(e) {
    const cam = this.gameState._camera;
    if (cam) cam.pan(e.dx, e.dy);
  }

  _applySculpt(tiles, cx, cy) {
    const dir = this._sculptMode === 'raise' ? 1 : -1;
    const LAND_THRESHOLD = 0.3;
    for (let dy = -BRUSH_RADIUS; dy <= BRUSH_RADIUS; dy++) {
      for (let dx = -BRUSH_RADIUS; dx <= BRUSH_RADIUS; dx++) {
        if (dx * dx + dy * dy > BRUSH_RADIUS * BRUSH_RADIUS) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (!tiles.inBounds(x, y)) continue;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const falloff = 1 - dist / (BRUSH_RADIUS + 1);
        const oldH = tiles.getH(x, y);
        const wasOcean = oldH < LAND_THRESHOLD;
        const newH = Math.max(0, Math.min(1, oldH + SCULPT_STRENGTH * dir * falloff));
        tiles.setH(x, y, newH);
        const nowOcean = newH < LAND_THRESHOLD;

        // Convert between water and land when crossing the threshold
        if (wasOcean && !nowOcean) {
          // Ocean → Land: create new land with modest starting values
          tiles.setBiome(x, y, BIOME_GRASSLAND);
          tiles.setWater(x, y, 0.15);
          tiles.setSoil(x, y, 0.25);
          tiles.setVeg(x, y, 0.05);
        } else if (!wasOcean && nowOcean) {
          // Land → Ocean: flood the tile
          tiles.setBiome(x, y, BIOME_OCEAN);
          tiles.setWater(x, y, 1.0);
          tiles.setSoil(x, y, 0);
          tiles.setVeg(x, y, 0);
        }
      }
    }
    this.gameState._dirty = true;
    if (navigator.vibrate) navigator.vibrate(10);
  }

  _applyBiome(tiles, cx, cy) {
    const biome = this.toolbar.selectedBiome;
    for (let dy = -BRUSH_RADIUS; dy <= BRUSH_RADIUS; dy++) {
      for (let dx = -BRUSH_RADIUS; dx <= BRUSH_RADIUS; dx++) {
        if (dx * dx + dy * dy > BRUSH_RADIUS * BRUSH_RADIUS) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (!tiles.inBounds(x, y) || tiles.isOcean(x, y)) continue;
        tiles.setBiome(x, y, biome);
      }
    }
    this.gameState._dirty = true;
    if (navigator.vibrate) navigator.vibrate(10);
  }

  update() {
    this.hud.updateTime(this.gameState.time);
  }
}
