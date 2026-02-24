import { GameLoop } from './engine/gameLoop.js';
import { InputManager } from './engine/input.js';
import { Scheduler } from './engine/scheduler.js';
import { Camera } from './render/camera.js';
import { Renderer } from './render/renderer.js';
import { OverlayRenderer } from './render/overlays.js';
import { generateIsland } from './world/terrainGen.js';
import { ZoneManager } from './world/zones.js';
import { simTick } from './sim/simTick.js';
import { computeStats } from './sim/stats.js';
import { createGovernanceState } from './sim/governance.js';
import { UI } from './ui/ui.js';
import { saveGame } from './storage/save.js';
import { loadGame, hasSave } from './storage/load.js';
import { migrate } from './storage/migrations.js';
import { createAnimal } from './sim/animals.js';
import { GRID_W, GRID_H, AUTOSAVE_INTERVAL } from './data/constants.js';
import { SPECIES_LIST } from './data/species.js';
import { createRng } from './engine/rng.js';

function createNewGameState(seed) {
  const tiles = generateIsland(seed);
  const zoneManager = new ZoneManager(tiles);

  const gameState = {
    meta: {
      version: 1,
      seed,
      createdAt: Date.now(),
      lastSavedAt: null,
    },
    settings: {
      sound: true,
      haptics: true,
      simSpeed: 1,
    },
    time: { day: 0, season: 0, year: 0, tick: 0 },
    governance: createGovernanceState(),
    islands: [{
      id: 'island_001',
      name: 'My Island',
      size: { w: GRID_W, h: GRID_H },
      world: { tiles },
      entities: {
        animals: [],
        structures: [],
      },
      stats: {
        population: {},
        totalAnimals: 0,
        avgSoil: 0,
        avgVeg: 0,
        avgWater: 0,
        landTiles: 0,
        protectedTiles: 0,
        developedTiles: 0,
      },
    }],
    flags: { tutorialDone: false },
    _dirty: false,
    _camera: null,
    _gameLoop: null,
    _zoneManager: zoneManager,
  };

  // Spawn initial animals on land tiles
  spawnInitialAnimals(gameState, seed);

  return gameState;
}

function spawnInitialAnimals(gameState, seed) {
  const rng = createRng(seed + 999);
  const tiles = gameState.islands[0].world.tiles;
  const animals = gameState.islands[0].entities.animals;

  // Find land tiles
  const landTiles = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (tiles.isLand(x, y) && tiles.getVeg(x, y) > 0.2) {
        landTiles.push([x, y]);
      }
    }
  }

  if (landTiles.length === 0) return;

  // Spawn counts per species
  const spawnCounts = { deer: 8, rabbit: 12, wolf: 3, hawk: 2 };

  for (const spec of SPECIES_LIST) {
    const count = spawnCounts[spec.id] || 4;
    for (let i = 0; i < count; i++) {
      const idx = (rng() * landTiles.length) | 0;
      const [x, y] = landTiles[idx];
      const animal = createAnimal(spec.id, x + rng(), y + rng());
      if (animal) animals.push(animal);
    }
  }
}

function restoreGameState(saveData) {
  const data = migrate(saveData);

  const tiles = data.islands[0].world.tiles;
  const zoneManager = new ZoneManager(tiles);
  if (data.zones) {
    zoneManager.loadJSON(data.zones);
  }

  const gameState = {
    meta: data.meta,
    settings: data.settings || { sound: true, haptics: true, simSpeed: 1 },
    time: data.time,
    governance: data.governance,
    islands: data.islands,
    flags: data.flags || { tutorialDone: false },
    _dirty: false,
    _camera: null,
    _gameLoop: null,
    _zoneManager: zoneManager,
    _savedCamera: data.camera,
  };

  return gameState;
}

function boot() {
  const canvas = document.getElementById('game-canvas');
  const uiContainer = document.getElementById('ui-container');

  if (!canvas || !uiContainer) {
    console.error('Missing DOM elements');
    return;
  }

  // Check for saved game
  let gameState;
  if (hasSave()) {
    const saveData = loadGame();
    if (saveData) {
      gameState = restoreGameState(saveData);
    }
  }

  if (!gameState) {
    const seed = (Math.random() * 999999) | 0;
    gameState = createNewGameState(seed);
  }

  // Setup camera
  const camera = new Camera(canvas);
  camera.resize();
  camera.centerOn(GRID_W / 2, GRID_H / 2);

  // Restore camera position if from save
  if (gameState._savedCamera) {
    camera.x = gameState._savedCamera.x || GRID_W / 2;
    camera.y = gameState._savedCamera.y || GRID_H / 2;
    camera.zoom = gameState._savedCamera.zoom || 1;
    delete gameState._savedCamera;
  }

  gameState._camera = camera;

  // Setup renderer
  const renderer = new Renderer(canvas, camera);
  const overlays = new OverlayRenderer(camera);

  // Setup input
  const input = new InputManager(canvas, camera);

  // Setup zone manager reference
  const zoneManager = gameState._zoneManager;

  // Setup UI
  const ui = new UI(uiContainer, gameState, overlays, zoneManager);

  // Setup scheduler
  const scheduler = new Scheduler();
  scheduler.add('autosave', AUTOSAVE_INTERVAL, () => {
    if (gameState._dirty) {
      saveGame(gameState);
    }
  });
  scheduler.add('uiUpdate', 500, () => {
    ui.update();
  });

  // Compute initial stats
  computeStats(gameState.islands[0]);

  // Setup game loop
  const gameLoop = new GameLoop(
    () => simTick(gameState),
    (dt) => {
      scheduler.update(performance.now());
      renderer.render(gameState);
      overlays.render(renderer.ctx);
    }
  );
  gameState._gameLoop = gameLoop;

  // Handle resize
  window.addEventListener('resize', () => {
    camera.resize();
  });

  // Save on blur/visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState._dirty) {
      saveGame(gameState);
    }
  });

  // Start
  gameLoop.start();

  // Hide loading screen
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 500);
  }
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
