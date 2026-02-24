import { GameLoop } from './engine/gameLoop.js';
import { InputManager } from './engine/input.js';
import { Scheduler } from './engine/scheduler.js';
import { bus } from './engine/events.js';
import { Camera } from './render/camera.js';
import { Renderer } from './render/renderer.js';
import { OverlayRenderer } from './render/overlays.js';
import { ParticleSystem } from './render/particles.js';
import { generateIsland } from './world/terrainGen.js';
import { ZoneManager } from './world/zones.js';
import { simTick } from './sim/simTick.js';
import { computeStats } from './sim/stats.js';
import { createGovernanceState } from './sim/governance.js';
import { UI } from './ui/ui.js';
import { TitleScreen } from './ui/titlescreen.js';
import { MiniMap } from './ui/minimap.js';
import { PopulationGraph } from './ui/popgraph.js';
import { NotificationSystem } from './ui/notifications.js';
import { Tutorial } from './ui/tutorial.js';
import { AmbientAudio } from './audio/ambient.js';
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
    meta: { version: 1, seed, createdAt: Date.now(), lastSavedAt: null },
    settings: { sound: false, haptics: true, simSpeed: 1 },
    time: { day: 0, season: 0, year: 0, tick: 0 },
    governance: createGovernanceState(),
    islands: [{
      id: 'island_001',
      name: 'My Island',
      size: { w: GRID_W, h: GRID_H },
      world: { tiles },
      entities: { animals: [], structures: [] },
      stats: {
        population: {}, totalAnimals: 0,
        avgSoil: 0, avgVeg: 0, avgWater: 0,
        landTiles: 0, protectedTiles: 0, developedTiles: 0,
      },
    }],
    flags: { tutorialDone: false },
    _dirty: false,
    _camera: null,
    _gameLoop: null,
    _zoneManager: zoneManager,
  };

  spawnInitialAnimals(gameState, seed);
  return gameState;
}

function spawnInitialAnimals(gameState, seed) {
  const rng = createRng(seed + 999);
  const tiles = gameState.islands[0].world.tiles;
  const animals = gameState.islands[0].entities.animals;

  const landTiles = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (tiles.isLand(x, y) && tiles.getVeg(x, y) > 0.2) {
        landTiles.push([x, y]);
      }
    }
  }
  if (landTiles.length === 0) return;

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
  if (data.zones) zoneManager.loadJSON(data.zones);

  return {
    meta: data.meta,
    settings: data.settings || { sound: false, haptics: true, simSpeed: 1 },
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
}

function startGame(gameState) {
  const canvas = document.getElementById('game-canvas');
  const uiContainer = document.getElementById('ui-container');

  // Camera
  const camera = new Camera(canvas);
  camera.resize();
  camera.centerOn(GRID_W / 2, GRID_H / 2);
  if (gameState._savedCamera) {
    camera.x = gameState._savedCamera.x || GRID_W / 2;
    camera.y = gameState._savedCamera.y || GRID_H / 2;
    camera.zoom = gameState._savedCamera.zoom || 1;
    delete gameState._savedCamera;
  }
  gameState._camera = camera;

  // Renderer
  const renderer = new Renderer(canvas, camera);
  const overlays = new OverlayRenderer(camera);
  const particles = new ParticleSystem();

  // Input
  const input = new InputManager(canvas, camera);

  // UI
  const zoneManager = gameState._zoneManager;
  const ui = new UI(uiContainer, gameState, overlays, zoneManager);

  // Mini-map
  const minimap = new MiniMap(uiContainer, camera);
  minimap.setTiles(gameState.islands[0].world.tiles);

  // Population graph
  const popGraph = new PopulationGraph(uiContainer);

  // Notifications
  const notifications = new NotificationSystem(uiContainer);

  // Audio
  const audio = new AmbientAudio();

  // Sound toggle button in HUD stats
  const soundBtn = document.createElement('button');
  soundBtn.className = 'stat-item sound-toggle';
  soundBtn.textContent = '🔇';
  soundBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    const on = audio.toggle();
    soundBtn.textContent = on ? '🔊' : '🔇';
    gameState.settings.sound = on;
  });

  // Add graph toggle + sound button to HUD
  setTimeout(() => {
    const statsEl = uiContainer.querySelector('.hud-stats');
    if (statsEl) {
      statsEl.appendChild(popGraph.toggleBtn);
      statsEl.appendChild(soundBtn);
    }
  }, 100);

  // Tutorial
  const tutorial = new Tutorial(uiContainer);
  if (!gameState.flags.tutorialDone) {
    setTimeout(() => tutorial.start(), 800);
  }
  bus.on('tutorialDone', () => {
    gameState.flags.tutorialDone = true;
    gameState._dirty = true;
  });

  // Scheduler
  const scheduler = new Scheduler();
  scheduler.add('autosave', AUTOSAVE_INTERVAL, () => {
    if (gameState._dirty) saveGame(gameState);
  });
  scheduler.add('uiUpdate', 500, () => ui.update());
  scheduler.add('minimap', 2000, (now) => minimap.update(now));
  scheduler.add('audio', 5000, () => audio.setSeason(gameState.time.season));

  // Initial stats
  computeStats(gameState.islands[0]);

  // Game loop
  const gameLoop = new GameLoop(
    () => simTick(gameState),
    (dt) => {
      const now = performance.now();
      scheduler.update(now);
      particles.update(gameState.time.season, canvas.width, canvas.height);
      renderer.render(gameState, now);
      particles.render(renderer.ctx);
      overlays.render(renderer.ctx);
    }
  );
  gameState._gameLoop = gameLoop;

  // Resize
  window.addEventListener('resize', () => camera.resize());

  // Save on blur
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState._dirty) saveGame(gameState);
  });

  // Start
  gameLoop.start();

  // Initial notification
  setTimeout(() => {
    bus.emit('notification', {
      message: 'Island generated! Explore and shape your ecosystem.',
      type: 'info',
      icon: '🏝️',
    });
  }, 1500);
}

function boot() {
  const canvas = document.getElementById('game-canvas');
  const uiContainer = document.getElementById('ui-container');
  if (!canvas || !uiContainer) return;

  // Resize canvas to fill screen
  const cam = { resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
  }};
  cam.resize();
  window.addEventListener('resize', cam.resize);

  // Show title screen
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 500);
  }

  const titleScreen = new TitleScreen(uiContainer);

  bus.on('titleAction', ({ action }) => {
    let gameState;

    if (action === 'continue') {
      const saveData = loadGame();
      if (saveData) {
        gameState = restoreGameState(saveData);
      }
    }

    if (!gameState) {
      const seed = (Math.random() * 999999) | 0;
      gameState = createNewGameState(seed);
    }

    startGame(gameState);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
