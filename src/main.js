import { GameLoop } from './engine/gameLoop.js';
import { InputManager } from './engine/input.js';
import { Scheduler } from './engine/scheduler.js';
import { UndoManager } from './engine/undo.js';
import { bus } from './engine/events.js';
import { Camera } from './render/camera.js';
import { Renderer } from './render/renderer.js';
import { OverlayRenderer } from './render/overlays.js';
import { ParticleSystem } from './render/particles.js';
import { generateIsland } from './world/terrainGen.js';
import { ZoneManager } from './world/zones.js';
import { simTick, setWeatherSystem, setEcoScoreForSim } from './sim/simTick.js';
import { computeStats } from './sim/stats.js';
import { createGovernanceState } from './sim/governance.js';
import { checkCollapseRisks } from './sim/collapse.js';
import { computeEcoScore, getEcoRating } from './sim/ecoscore.js';
import { WeatherSystem } from './sim/weather.js';
import { UI } from './ui/ui.js';
import { TitleScreen } from './ui/titlescreen.js';
import { MiniMap } from './ui/minimap.js';
import { PopulationGraph } from './ui/popgraph.js';
import { NotificationSystem } from './ui/notifications.js';
import { Tutorial } from './ui/tutorial.js';
import { RadialMenu } from './ui/radialmenu.js';
import { OverlayModePanel } from './ui/overlaymodes.js';
import { SettingsPanel } from './ui/settings.js';
import { AchievementSystem } from './ui/achievements.js';
import { PhotoMode } from './ui/photomode.js';
import { AmbientAudio } from './audio/ambient.js';
import { saveGame } from './storage/save.js';
import { loadGame, hasSave } from './storage/load.js';
import { migrate } from './storage/migrations.js';
import { createAnimal } from './sim/animals.js';
import { GRID_W, GRID_H, AUTOSAVE_INTERVAL, GRACE_PERIOD_TICKS, SIM_TICK_MS } from './data/constants.js';
import { BASE_SPECIES } from './data/species.js';
import { createRng } from './engine/rng.js';
import { MilestoneSystem } from './sim/milestones.js';
import { NotableSystem } from './sim/notables.js';
import { StoryFeed } from './ui/storyfeed.js';
import { setEcoScoreForEvents, loadEventState, saveEventState } from './sim/events.js';

function createNewGameState(seed, islandName) {
  const tiles = generateIsland(seed);
  const zoneManager = new ZoneManager(tiles);

  const gameState = {
    meta: { version: 1, seed, createdAt: Date.now(), lastSavedAt: null },
    settings: { sound: false, haptics: true, simSpeed: 1, particles: true, gridLines: true, dayNight: true, quality: 'high' },
    time: { day: 0, season: 0, year: 0, tick: 0 },
    governance: createGovernanceState(),
    islands: [{
      id: 'island_001',
      name: islandName || 'My Island',
      size: { w: GRID_W, h: GRID_H },
      world: { tiles },
      entities: { animals: [], structures: [] },
      stats: {
        population: {}, totalAnimals: 0,
        avgSoil: 0, avgVeg: 0, avgWater: 0,
        landTiles: 0, protectedTiles: 0, developedTiles: 0,
        oceanRatio: 0,
      },
    }],
    flags: { tutorialDone: false, achievements: [], achievementCounters: {} },
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
  for (const spec of BASE_SPECIES) {
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

  // Ensure entities.structures exists for older saves
  if (!data.islands[0].entities.structures) {
    data.islands[0].entities.structures = [];
  }

  return {
    meta: data.meta,
    settings: data.settings || { sound: false, haptics: true, simSpeed: 1, particles: true, gridLines: true, dayNight: true, quality: 'high' },
    time: data.time,
    governance: data.governance,
    islands: data.islands,
    flags: data.flags || { tutorialDone: false, achievements: [], achievementCounters: {} },
    _dirty: false,
    _camera: null,
    _gameLoop: null,
    _zoneManager: zoneManager,
    _savedCamera: data.camera,
    _savedWeather: data.weather,
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

  renderer.showGridLines = gameState.settings.gridLines !== false;
  renderer.showDayNight = gameState.settings.dayNight !== false;

  // Input
  const input = new InputManager(canvas, camera);

  // Undo manager
  const undoManager = new UndoManager();

  // Weather system
  const weatherSystem = new WeatherSystem();
  if (gameState._savedWeather) {
    weatherSystem.fromJSON(gameState._savedWeather);
    delete gameState._savedWeather;
  }
  gameState._weatherSystem = weatherSystem;
  setWeatherSystem(weatherSystem);

  // Double-tap to zoom in/out
  let _zoomedIn = false;
  bus.on('doubleTap', ({ screenX, screenY }) => {
    if (_zoomedIn) {
      camera.zoomAt(0.4, screenX, screenY);
      _zoomedIn = false;
    } else {
      camera.zoomAt(2.5, screenX, screenY);
      _zoomedIn = true;
    }
    if (navigator.vibrate) navigator.vibrate(15);
  });

  // UI
  const zoneManager = gameState._zoneManager;
  const ui = new UI(uiContainer, gameState, overlays, zoneManager, undoManager);

  // Set island name in HUD
  ui.hud.setIslandName(gameState.islands[0].name);

  // Radial context menu
  const radialMenu = new RadialMenu(uiContainer);

  // Overlay modes panel
  const overlayPanel = new OverlayModePanel(uiContainer);
  bus.on('overlayModeChanged', ({ mode }) => {
    renderer.overlayMode = mode;
  });

  // Achievements
  const achievements = new AchievementSystem(uiContainer);
  achievements.loadState(gameState.flags);

  // Settings panel
  const settingsPanel = new SettingsPanel(uiContainer);
  settingsPanel.setGameState(gameState);
  settingsPanel.setAchievements(achievements);

  // Milestone progression system
  const milestones = new MilestoneSystem();
  milestones.loadState(gameState.flags);

  // Notable animals system
  const notables = new NotableSystem();
  notables.loadState(gameState.flags);
  gameState._notables = notables;

  // Track kills and births for notables
  bus.on('animalKill', ({ predatorId }) => notables.recordKill(predatorId));
  bus.on('animalBirth', ({ parentId, mateId }) => {
    notables.recordBirth(parentId);
    notables.recordBirth(mateId);
  });

  // Story feed (narrative journal)
  const storyFeed = new StoryFeed(uiContainer);
  storyFeed.setGameState(gameState);

  // Event state (species unlocks)
  loadEventState(gameState.flags);

  // Photo mode
  const photoMode = new PhotoMode(uiContainer, canvas);

  // Settings gear button
  const gearBtn = document.createElement('button');
  gearBtn.className = 'stat-item settings-gear';
  gearBtn.textContent = '⚙️';
  gearBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    settingsPanel.toggle();
  });

  // Undo button
  const undoBtn = document.createElement('button');
  undoBtn.className = 'stat-item undo-btn';
  undoBtn.textContent = '↩️';
  undoBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (undoManager.canUndo()) {
      const tiles = gameState.islands[0]?.world.tiles;
      if (tiles) {
        undoManager.undo(tiles);
        gameState._dirty = true;
        if (navigator.vibrate) navigator.vibrate([10, 20, 10]);
      }
    }
  });

  // Ecosystem score display
  const ecoScoreEl = document.createElement('div');
  ecoScoreEl.className = 'stat-item eco-score';
  ecoScoreEl.textContent = '-- ';

  // Listen for settings changes
  bus.on('settingsChanged', ({ key, value }) => {
    if (key === 'gridLines') renderer.showGridLines = value;
    if (key === 'dayNight') renderer.showDayNight = value;
  });

  // Mini-map
  const minimap = new MiniMap(uiContainer, camera);
  minimap.setTiles(gameState.islands[0].world.tiles);

  // Population graph
  const popGraph = new PopulationGraph(uiContainer);

  // Notifications
  const notifications = new NotificationSystem(uiContainer);

  // Audio
  const audio = new AmbientAudio();

  // Sound toggle
  const soundBtn = document.createElement('button');
  soundBtn.className = 'stat-item sound-toggle';
  soundBtn.textContent = '🔇';
  soundBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    const on = audio.toggle();
    soundBtn.textContent = on ? '🔊' : '🔇';
    gameState.settings.sound = on;
  });

  // Add HUD extras
  setTimeout(() => {
    const statsEl = uiContainer.querySelector('.hud-stats');
    if (statsEl) {
      statsEl.appendChild(ecoScoreEl);
      statsEl.appendChild(undoBtn);
      statsEl.appendChild(photoMode.btn);
      statsEl.appendChild(popGraph.toggleBtn);
      statsEl.appendChild(soundBtn);
      statsEl.appendChild(gearBtn);
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
    if (gameState._dirty) {
      achievements.saveState(gameState.flags);
      milestones.saveState(gameState.flags);
      notables.saveState(gameState.flags);
      saveEventState(gameState.flags);
      saveGame(gameState);
    }
  });
  scheduler.add('uiUpdate', 500, () => {
    ui.update();
    ui.hud.setWeather(weatherSystem.current);
  });
  scheduler.add('minimap', 2000, (now) => minimap.update(now));
  scheduler.add('audio', 5000, () => audio.setSeason(gameState.time.season));
  scheduler.add('ecoscore', 4000, () => {
    const score = computeEcoScore(gameState);
    const rating = getEcoRating(score);
    ecoScoreEl.innerHTML = `<span style="color:${rating.color};font-weight:700">${rating.grade}</span> ${score}`;
    ecoScoreEl.title = rating.label;
    achievements.setEcoScore(score);
    milestones.setEcoScore(score);
    setEcoScoreForEvents(score);
    setEcoScoreForSim(score);
  });

  // Delay event-heavy systems until after the grace period so the start is calm
  const graceMs = GRACE_PERIOD_TICKS * SIM_TICK_MS;
  setTimeout(() => {
    scheduler.add('collapse', 8000, () => checkCollapseRisks(gameState));
    scheduler.add('achievements', 5000, () => {
      achievements.check(gameState);
    });
    scheduler.add('milestones', 5000, () => {
      milestones.check(gameState);
    });
    scheduler.add('notables', 5000, () => {
      notables.update(gameState.islands[0].entities.animals);
    });
  }, graceMs);

  // Initial stats
  computeStats(gameState.islands[0]);

  // Game loop
  const gameLoop = new GameLoop(
    () => simTick(gameState),
    (dt) => {
      const now = performance.now();
      scheduler.update(now);
      if (gameState.settings.particles !== false) {
        particles.update(gameState.time.season, canvas.width, canvas.height);
      }
      renderer.render(gameState, now);
      if (gameState.settings.particles !== false) {
        particles.render(renderer.ctx);
      }
      overlays.render(renderer.ctx);
    }
  );
  gameState._gameLoop = gameLoop;

  // Resize
  window.addEventListener('resize', () => camera.resize());

  // Save on blur
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState._dirty) {
      achievements.saveState(gameState.flags);
      milestones.saveState(gameState.flags);
      notables.saveState(gameState.flags);
      saveEventState(gameState.flags);
      saveGame(gameState);
    }
  });

  // Start
  gameLoop.start();

  // Gentle intro — just a single quiet welcome, no chapter fanfare yet
  setTimeout(() => {
    bus.emit('storyEvent', {
      text: `Welcome to ${gameState.islands[0].name}.`,
      type: 'event',
      detail: 'Take a moment to explore. Life is already stirring.',
    });
  }, 2500);
}

function boot() {
  const canvas = document.getElementById('game-canvas');
  const uiContainer = document.getElementById('ui-container');
  if (!canvas || !uiContainer) return;

  const cam = { resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
  }};
  cam.resize();
  window.addEventListener('resize', cam.resize);

  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 500);
  }

  const titleScreen = new TitleScreen(uiContainer);

  bus.on('titleAction', ({ action, name, seed: customSeed }) => {
    let gameState;

    if (action === 'continue') {
      const saveData = loadGame();
      if (saveData) {
        gameState = restoreGameState(saveData);
      }
    }

    if (!gameState) {
      const seed = customSeed ?? ((Math.random() * 999999) | 0);
      gameState = createNewGameState(seed, name);
    }

    startGame(gameState);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
