import * as THREE from "./vendor/three.module.js";
import { OrbitControls } from "./vendor/OrbitControls.js";

const app = document.getElementById("app");

app.innerHTML = `
  <div class="ui-shell">
    <div id="viewport"></div>

    <div class="quick-hud">
      <div class="interaction-switch" role="group" aria-label="Interaction Mode">
        <button id="mode-sculpt" class="mode-btn" type="button">Sculpt</button>
        <button id="mode-camera" class="mode-btn" type="button">Camera</button>
      </div>
    </div>

    <div class="message-stack" id="message-stack" aria-live="polite"></div>

    <aside class="control-panel" id="control-panel">
      <div class="panel-header">
        <h1>Archipelago Genesis</h1>
        <button id="panel-close" class="panel-close" type="button">Close</button>
      </div>
      <p class="tagline">Mobile-first God Mode island builder</p>

      <section>
        <h2>Terrain Sculpt</h2>
        <div class="control-row">
          <label for="brush-mode">Brush Mode</label>
          <select id="brush-mode">
            <option value="raise">Raise Land</option>
            <option value="lower">Lower Land</option>
            <option value="smooth">Smooth</option>
            <option value="mountain">Mountain Burst</option>
          </select>
        </div>
        <div class="control-row">
          <label for="brush-radius">Brush Radius <span id="brush-radius-value"></span></label>
          <input id="brush-radius" type="range" min="2" max="24" step="0.5" value="8" />
        </div>
        <div class="control-row">
          <label for="brush-strength">Brush Strength <span id="brush-strength-value"></span></label>
          <input id="brush-strength" type="range" min="0.1" max="2" step="0.05" value="0.8" />
        </div>
      </section>

      <section>
        <h2>World Dials</h2>
        <div class="control-row">
          <label for="water-level">Water Level <span id="water-level-value"></span></label>
          <input id="water-level" type="range" min="-3" max="7" step="0.1" value="1.2" />
        </div>
        <div class="control-row">
          <label for="mountain-intensity">Mountain Intensity <span id="mountain-intensity-value"></span></label>
          <input id="mountain-intensity" type="range" min="0.3" max="2" step="0.05" value="1" />
        </div>
        <div class="control-row">
          <label for="vegetation-density">Vegetation Density <span id="vegetation-density-value"></span></label>
          <input id="vegetation-density" type="range" min="0.1" max="1" step="0.01" value="0.58" />
        </div>
        <div class="control-row">
          <label for="island-scale">Selected Island Size <span id="island-scale-value"></span></label>
          <input id="island-scale" type="range" min="0.7" max="2" step="0.05" value="1" />
        </div>
      </section>

      <section>
        <h2>Performance</h2>
        <div class="control-row">
          <label for="quality-level">Quality Level</label>
          <select id="quality-level">
            <option value="auto">Auto</option>
            <option value="low">Low (Battery)</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <p class="hint" id="quality-hint"></p>
      </section>

      <section>
        <h2>Settlement Builder</h2>
        <div class="button-row">
          <button id="bring-humans" type="button">Bring First Humans</button>
          <button id="gather-resources" type="button">Gather Resources</button>
          <button id="garden-crops" type="button">Garden Crops</button>
          <button id="plant-trees" type="button">Plant Trees</button>
          <button id="care-animals" type="button">Care for Animals</button>
          <button id="build-hut" type="button">Build Hut</button>
          <button id="build-plaza" type="button">Build Village Plaza</button>
          <button id="craft-tools" type="button">Craft Tool Kit</button>
          <button id="craft-canoe" type="button">Craft Canoe</button>
          <button id="sail-island" type="button" disabled>Sail to New Island (Locked)</button>
        </div>
        <p class="hint" id="sail-req">Grow one balanced island first. Sailing unlocks after stable harmony.</p>
      </section>

      <section>
        <h2>World Status</h2>
        <div class="stats-grid">
          <div><span>Islands</span><strong id="stat-islands">0</strong></div>
          <div><span>Animals</span><strong id="stat-animals">0</strong></div>
          <div><span>Fish</span><strong id="stat-fish">0</strong></div>
          <div><span>Species</span><strong id="stat-species">0</strong></div>
          <div><span>Humans</span><strong id="stat-humans">0</strong></div>
          <div><span>Huts</span><strong id="stat-huts">0</strong></div>
          <div><span>Plazas</span><strong id="stat-plazas">0</strong></div>
          <div><span>Gardens</span><strong id="stat-gardens">0</strong></div>
        </div>
        <div class="phase-card">
          <span>Phase</span>
          <strong id="phase-label">Founding</strong>
        </div>
        <div class="resource-grid">
          <div><span>Wood</span><strong id="resource-wood">0</strong></div>
          <div><span>Stone</span><strong id="resource-stone">0</strong></div>
          <div><span>Fiber</span><strong id="resource-fiber">0</strong></div>
          <div><span>Food</span><strong id="resource-food">0</strong></div>
          <div><span>Tools</span><strong id="item-tools">0</strong></div>
          <div><span>Canoes</span><strong id="item-canoes">0</strong></div>
        </div>
        <div class="harmony-wrap">
          <div class="harmony-label">
            <span>Harmony</span>
            <strong id="harmony-score">0</strong>
          </div>
          <div class="harmony-track">
            <div id="harmony-fill"></div>
          </div>
        </div>
      </section>

      <section>
        <h2>Guide</h2>
        <p class="hint" id="hint-text">Build one thriving island first. Sailing unlocks only after harmony holds.</p>
        <ul id="event-log"></ul>
      </section>
    </aside>

    <div class="bottom-hud" id="bottom-hud">
      <div class="hud-shell">
        <div class="hud-row hud-primary">
          <div class="hud-chip"><span>Phase</span><strong id="hud-phase">Founding</strong></div>
          <div class="hud-chip"><span>Harmony</span><strong id="hud-harmony">0</strong></div>
          <div class="hud-chip"><span>Humans</span><strong id="hud-humans">0</strong></div>
          <div class="hud-chip"><span>Huts</span><strong id="hud-huts">0</strong></div>
          <div class="hud-chip"><span>Plazas</span><strong id="hud-plazas">0</strong></div>
          <div class="hud-chip"><span>Fish</span><strong id="hud-fish">0</strong></div>
          <div class="hud-chip"><span>Species</span><strong id="hud-species">0</strong></div>
        </div>
        <div class="hud-harmony-track">
          <div id="hud-harmony-fill"></div>
        </div>
        <div class="hud-row hud-resources">
          <div class="hud-chip"><span>Wood</span><strong id="hud-wood">0</strong></div>
          <div class="hud-chip"><span>Stone</span><strong id="hud-stone">0</strong></div>
          <div class="hud-chip"><span>Fiber</span><strong id="hud-fiber">0</strong></div>
          <div class="hud-chip"><span>Food</span><strong id="hud-food">0</strong></div>
          <div class="hud-chip"><span>Tools</span><strong id="hud-tools">0</strong></div>
          <div class="hud-chip"><span>Canoes</span><strong id="hud-canoes">0</strong></div>
        </div>
        <div class="hud-row hud-support">
          <div class="hud-chip"><span>Gardens</span><strong id="hud-gardens">0</strong></div>
          <div class="hud-chip"><span>Harvest Strain</span><strong id="hud-strain">0</strong></div>
        </div>
        <p class="hud-note">Keep harmony high to unlock sailing.</p>
      </div>
      <button id="panel-toggle" class="panel-toggle" type="button" aria-expanded="false">Controls</button>
    </div>
  </div>
`;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
const fract = (x) => x - Math.floor(x);
const COARSE_POINTER = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

const QUALITY_PRESETS = {
  low: {
    pixelRatioCap: 1.05,
    antialias: false,
    shadows: false,
    shadowMapSize: 1024,
    terrainSegments: 56,
    maxTreesPerIsland: 72,
    maxAnimalsPerIsland: 7,
    maxFishPerIsland: 8,
    maxHumansPerIsland: 12,
    maxHutsPerIsland: 5,
    maxPlazasPerIsland: 2,
    maxIslands: 8,
    simulationStride: 2,
    treeLodDistance: 130,
    sculptIntervalMs: 42,
    growthInterval: 12
  },
  medium: {
    pixelRatioCap: 1.5,
    antialias: true,
    shadows: true,
    shadowMapSize: 1536,
    terrainSegments: 72,
    maxTreesPerIsland: 118,
    maxAnimalsPerIsland: 10,
    maxFishPerIsland: 12,
    maxHumansPerIsland: 20,
    maxHutsPerIsland: 8,
    maxPlazasPerIsland: 3,
    maxIslands: 10,
    simulationStride: 1,
    treeLodDistance: 175,
    sculptIntervalMs: 26,
    growthInterval: 10
  },
  high: {
    pixelRatioCap: 2,
    antialias: true,
    shadows: true,
    shadowMapSize: 2048,
    terrainSegments: 88,
    maxTreesPerIsland: 170,
    maxAnimalsPerIsland: 14,
    maxFishPerIsland: 18,
    maxHumansPerIsland: 30,
    maxHutsPerIsland: 12,
    maxPlazasPerIsland: 5,
    maxIslands: 12,
    simulationStride: 1,
    treeLodDistance: 235,
    sculptIntervalMs: 14,
    growthInterval: 10
  }
};

function detectAutoQuality(isMobile) {
  const memory = navigator.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const dpr = window.devicePixelRatio ?? 1;

  if (isMobile && (memory <= 4 || cores <= 6 || dpr > 2.6)) {
    return "low";
  }
  if (isMobile || memory <= 6 || cores <= 8) {
    return "medium";
  }
  return "high";
}

function hash2(x, z, seed) {
  return fract(Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453123);
}

function valueNoise(x, z, seed) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const xf = x - x0;
  const zf = z - z0;

  const h00 = hash2(x0, z0, seed);
  const h10 = hash2(x0 + 1, z0, seed);
  const h01 = hash2(x0, z0 + 1, seed);
  const h11 = hash2(x0 + 1, z0 + 1, seed);

  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);

  const nx0 = lerp(h00, h10, u);
  const nx1 = lerp(h01, h11, u);
  return lerp(nx0, nx1, v);
}

function fbm(x, z, seed, octaves = 4) {
  let amplitude = 0.55;
  let frequency = 1;
  let total = 0;
  let maxAmplitude = 0;

  for (let i = 0; i < octaves; i += 1) {
    total += valueNoise(x * frequency, z * frequency, seed + i * 13) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return (total / maxAmplitude) * 2 - 1;
}

const treeTrunkGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.9, 7);
const treeCrownGeometry = new THREE.ConeGeometry(0.42, 1.1, 9);
const treeTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6f4c34, roughness: 0.95 });
const treeCrownMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x4d8f4a, roughness: 0.9 }),
  new THREE.MeshStandardMaterial({ color: 0x3f7d3d, roughness: 0.9 }),
  new THREE.MeshStandardMaterial({ color: 0x5a9f50, roughness: 0.9 })
];

const animalBodyGeometry = new THREE.SphereGeometry(0.44, 12, 10);
const animalHeadGeometry = new THREE.SphereGeometry(0.24, 10, 8);
const animalEarGeometry = new THREE.ConeGeometry(0.07, 0.18, 5);
const animalLegGeometry = new THREE.CylinderGeometry(0.04, 0.05, 0.24, 6);
const animalTailGeometry = new THREE.ConeGeometry(0.06, 0.24, 5);
const animalHornGeometry = new THREE.ConeGeometry(0.05, 0.2, 5);
const fishBodyGeometry = new THREE.SphereGeometry(0.2, 11, 9);
const fishTailGeometry = new THREE.ConeGeometry(0.15, 0.26, 5);
const fishFinGeometry = new THREE.ConeGeometry(0.05, 0.12, 5);

const hutBaseGeometry = new THREE.BoxGeometry(1, 0.7, 1);
const hutRoofGeometry = new THREE.ConeGeometry(0.78, 0.55, 4);
const hutDoorGeometry = new THREE.BoxGeometry(0.2, 0.36, 0.03);
const hutBaseMaterial = new THREE.MeshStandardMaterial({ color: 0xc49b6e, roughness: 0.92 });
const hutRoofMaterial = new THREE.MeshStandardMaterial({ color: 0xae6838, roughness: 0.95 });
const hutDoorMaterial = new THREE.MeshStandardMaterial({ color: 0x5f3f2a, roughness: 0.95 });
const plazaBaseGeometry = new THREE.CylinderGeometry(1.35, 1.55, 0.5, 10);
const plazaRingGeometry = new THREE.TorusGeometry(1.26, 0.11, 8, 24);
const plazaPostGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.9, 7);
const plazaBaseMaterial = new THREE.MeshStandardMaterial({ color: 0xbf9a72, roughness: 0.9 });
const plazaRingMaterial = new THREE.MeshStandardMaterial({ color: 0x8b603f, roughness: 0.92 });
const plazaPostMaterial = new THREE.MeshStandardMaterial({ color: 0x6d4a30, roughness: 0.9 });

const humanBodyGeometry = new THREE.CylinderGeometry(0.13, 0.15, 0.48, 8);
const humanHeadGeometry = new THREE.SphereGeometry(0.12, 10, 8);

const ANIMAL_SPECIES = [
  { key: "rabbit", label: "Rabbit", hueRange: [0.07, 0.13], speedRange: [0.95, 1.85], scaleRange: [0.76, 0.92] },
  { key: "deer", label: "Deer", hueRange: [0.06, 0.12], speedRange: [0.72, 1.4], scaleRange: [1.02, 1.22] },
  { key: "boar", label: "Boar", hueRange: [0.04, 0.09], speedRange: [0.62, 1.22], scaleRange: [0.9, 1.12] },
  { key: "fox", label: "Fox", hueRange: [0.02, 0.06], speedRange: [0.88, 1.62], scaleRange: [0.86, 1.02] }
];

const FISH_SPECIES = [
  { key: "reef-fish", label: "Reef Fish", hueRange: [0.02, 0.08], speedRange: [0.65, 1.25], scaleRange: [0.84, 1.18] },
  { key: "parrotfish", label: "Parrotfish", hueRange: [0.5, 0.58], speedRange: [0.72, 1.35], scaleRange: [0.9, 1.24] },
  { key: "silverfish", label: "Silver Fish", hueRange: [0.55, 0.62], speedRange: [0.82, 1.42], scaleRange: [0.72, 1.04] }
];

const BUILD_COSTS = {
  hut: { wood: 16, stone: 8, fiber: 12, food: 4 },
  plaza: { wood: 44, stone: 28, fiber: 22, food: 10, tools: 2 },
  tools: { wood: 7, stone: 7, fiber: 2 },
  canoe: { wood: 24, fiber: 14, food: 8, tools: 1 },
  garden: { wood: 2, fiber: 8, food: 2 },
  plantTrees: { fiber: 6, food: 2 },
  careAnimals: { food: 5, fiber: 3 }
};

function createTreeMesh() {
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(treeTrunkGeometry, treeTrunkMaterial);
  trunk.position.y = 0.45;
  trunk.castShadow = true;

  const crown = new THREE.Mesh(
    treeCrownGeometry,
    treeCrownMaterials[Math.floor(Math.random() * treeCrownMaterials.length)]
  );
  crown.position.y = 1.2;
  crown.castShadow = true;

  group.add(trunk);
  group.add(crown);

  const scale = lerp(0.8, 1.28, Math.random());
  group.scale.setScalar(scale);

  return { mesh: group, scale };
}

function createAnimalMesh(species = ANIMAL_SPECIES[Math.floor(Math.random() * ANIMAL_SPECIES.length)]) {
  const hue = lerp(species.hueRange[0], species.hueRange[1], Math.random());
  const bodyColor = new THREE.Color().setHSL(hue, 0.55, 0.58);
  const accentColor = new THREE.Color().setHSL(hue, 0.32, 0.76);

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.84 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.86 });
  const group = new THREE.Group();

  const body = new THREE.Mesh(animalBodyGeometry, bodyMaterial);
  body.position.y = 0.36;
  body.castShadow = true;

  const head = new THREE.Mesh(animalHeadGeometry, accentMaterial);
  head.position.set(0.34, 0.53, 0);
  head.castShadow = true;

  group.add(body, head);

  const legOffsets = [
    [0.16, 0.14],
    [0.16, -0.14],
    [-0.16, 0.14],
    [-0.16, -0.14]
  ];
  for (const [x, z] of legOffsets) {
    const leg = new THREE.Mesh(animalLegGeometry, bodyMaterial);
    leg.position.set(x, 0.14, z);
    leg.castShadow = true;
    group.add(leg);
  }

  if (species.key === "rabbit") {
    const leftEar = new THREE.Mesh(animalEarGeometry, accentMaterial);
    leftEar.position.set(0.36, 0.77, 0.09);
    leftEar.rotation.x = Math.PI;
    const rightEar = leftEar.clone();
    rightEar.position.z = -0.09;
    group.add(leftEar, rightEar);
    body.scale.set(0.95, 0.72, 0.86);
    head.scale.set(0.9, 1, 0.86);
  } else if (species.key === "deer") {
    const leftHorn = new THREE.Mesh(animalHornGeometry, accentMaterial);
    leftHorn.position.set(0.42, 0.79, 0.08);
    leftHorn.rotation.x = -0.24;
    const rightHorn = leftHorn.clone();
    rightHorn.position.z = -0.08;
    group.add(leftHorn, rightHorn);
    body.scale.set(1.2, 0.82, 0.9);
    head.scale.set(1, 0.95, 0.82);
  } else if (species.key === "boar") {
    const snout = new THREE.Mesh(animalHeadGeometry, bodyMaterial);
    snout.position.set(0.5, 0.48, 0);
    snout.scale.set(0.62, 0.55, 0.58);
    group.add(snout);
    body.scale.set(1.15, 0.78, 1);
    head.scale.set(0.9, 0.78, 0.82);
  } else {
    const tail = new THREE.Mesh(animalTailGeometry, bodyMaterial);
    tail.position.set(-0.42, 0.54, 0);
    tail.rotation.z = Math.PI * 0.56;
    group.add(tail);
    body.scale.set(1.06, 0.76, 0.84);
    head.scale.set(0.88, 0.86, 0.74);
  }

  const scale = lerp(species.scaleRange[0], species.scaleRange[1], Math.random());
  group.scale.setScalar(scale);
  return { mesh: group, speciesKey: species.key, speciesLabel: species.label, speedRange: species.speedRange };
}

function createFishMesh(species = FISH_SPECIES[Math.floor(Math.random() * FISH_SPECIES.length)]) {
  const hue = lerp(species.hueRange[0], species.hueRange[1], Math.random());
  const bodyColor = new THREE.Color().setHSL(hue, 0.58, 0.58);
  const finColor = new THREE.Color().setHSL(hue + 0.05, 0.42, 0.78);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.55, metalness: 0.08 });
  const finMaterial = new THREE.MeshStandardMaterial({ color: finColor, roughness: 0.62, metalness: 0.06 });

  const group = new THREE.Group();
  const body = new THREE.Mesh(fishBodyGeometry, bodyMaterial);
  body.scale.set(1.48, 0.85, 0.62);
  body.castShadow = true;

  const tail = new THREE.Mesh(fishTailGeometry, finMaterial);
  tail.position.set(-0.35, 0, 0);
  tail.rotation.z = Math.PI / 2;
  tail.scale.set(1, 0.9, 0.7);

  const topFin = new THREE.Mesh(fishFinGeometry, finMaterial);
  topFin.position.set(0, 0.18, 0);
  topFin.rotation.z = Math.PI;

  group.add(body, tail, topFin);

  const scale = lerp(species.scaleRange[0], species.scaleRange[1], Math.random());
  group.scale.setScalar(scale);
  return { mesh: group, speciesKey: species.key, speciesLabel: species.label, speedRange: species.speedRange };
}

function createHumanMesh() {
  const skin = new THREE.MeshStandardMaterial({ color: 0xe3c4a5, roughness: 0.9 });
  const cloth = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(Math.random(), 0.5, 0.52),
    roughness: 0.84
  });

  const group = new THREE.Group();

  const body = new THREE.Mesh(humanBodyGeometry, cloth);
  body.position.y = 0.24;
  body.castShadow = true;

  const head = new THREE.Mesh(humanHeadGeometry, skin);
  head.position.y = 0.57;
  head.castShadow = true;

  group.add(body, head);
  return group;
}

function createHutMesh() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(hutBaseGeometry, hutBaseMaterial);
  base.position.y = 0.35;
  base.castShadow = true;

  const roof = new THREE.Mesh(hutRoofGeometry, hutRoofMaterial);
  roof.position.y = 0.98;
  roof.rotation.y = Math.PI * 0.25;
  roof.castShadow = true;

  const door = new THREE.Mesh(hutDoorGeometry, hutDoorMaterial);
  door.position.set(0, 0.2, 0.52);

  group.add(base, roof, door);
  return group;
}

function createVillagePlazaMesh() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(plazaBaseGeometry, plazaBaseMaterial);
  base.position.y = 0.26;
  base.castShadow = true;

  const ring = new THREE.Mesh(plazaRingGeometry, plazaRingMaterial);
  ring.position.y = 0.54;
  ring.rotation.x = Math.PI / 2;
  ring.castShadow = true;

  const postOffsets = [
    [0.8, 0],
    [-0.8, 0],
    [0, 0.8],
    [0, -0.8]
  ];

  for (const [x, z] of postOffsets) {
    const post = new THREE.Mesh(plazaPostGeometry, plazaPostMaterial);
    post.position.set(x, 0.95, z);
    post.castShadow = true;
    group.add(post);
  }

  group.add(base, ring);
  return group;
}

function terrainColor(height, waterLevel, outColor) {
  if (height < waterLevel - 2.1) {
    outColor.set(0x385674);
  } else if (height < waterLevel - 0.4) {
    outColor.set(0x597695);
  } else if (height < waterLevel + 0.4) {
    outColor.set(0xdfd199);
  } else if (height < waterLevel + 4.5) {
    outColor.set(0x6cad63);
  } else if (height < waterLevel + 8.5) {
    outColor.set(0x58854d);
  } else if (height < waterLevel + 13) {
    outColor.set(0x877f6b);
  } else {
    outColor.set(0xdfdedd);
  }
}

class TerrainIsland {
  constructor(scene, id, center, radius, seed, waterLevel, mountainIntensity, options = {}) {
    this.id = id;
    this.scene = scene;
    this.center = center.clone();
    this.radius = radius;
    this.size = radius * 2.2;
    this.scale = 1;
    this.seed = seed;
    this.segments = options.segments ?? 88;
    this.count = (this.segments + 1) * (this.segments + 1);

    this.heights = new Float32Array(this.count);
    this.localX = new Float32Array(this.count);
    this.localZ = new Float32Array(this.count);
    this.radial = new Float32Array(this.count);

    this.trees = [];
    this.animals = [];
    this.fish = [];
    this.huts = [];
    this.humans = [];
    this.plazas = [];
    this.gardens = 0;

    this.needsVegetationRegen = false;
    this.needsObjectReposition = true;

    this.geometry = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    this.geometry.rotateX(-Math.PI / 2);

    const colors = new Float32Array(this.count * 3);
    this.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.02
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.receiveShadow = true;
    this.mesh.position.copy(this.center);
    this.mesh.userData.island = this;

    this._populateVertexLookup();
    this._generateInitialHeightmap(mountainIntensity);
    this._applyHeights();
    this.updateColors(waterLevel);

    this.scene.add(this.mesh);
  }

  _populateVertexLookup() {
    let index = 0;
    for (let z = 0; z <= this.segments; z += 1) {
      const lz = (z / this.segments - 0.5) * this.size;
      for (let x = 0; x <= this.segments; x += 1) {
        const lx = (x / this.segments - 0.5) * this.size;
        this.localX[index] = lx;
        this.localZ[index] = lz;
        this.radial[index] = Math.hypot(lx, lz) / this.radius;
        index += 1;
      }
    }
  }

  _generateInitialHeightmap(mountainIntensity) {
    for (let i = 0; i < this.count; i += 1) {
      const x = this.localX[i];
      const z = this.localZ[i];
      const distanceRatio = this.radial[i];
      const islandMask = clamp(1 - distanceRatio * distanceRatio, -0.7, 1);

      const broadNoise = fbm((x + this.seed * 6) * 0.06, (z - this.seed * 3) * 0.06, this.seed, 5) * 1.8;
      const ruggedNoise = Math.max(
        0,
        fbm((x - this.seed * 2) * 0.15, (z + this.seed * 8) * 0.15, this.seed + 17, 4)
      );

      let height = -2.4 + islandMask * 10 + broadNoise + ruggedNoise * 7 * mountainIntensity;

      if (distanceRatio > 1) {
        height -= (distanceRatio - 1) * 10;
      }

      this.heights[i] = clamp(height, -14, 20);
    }
  }

  _applyHeights() {
    const position = this.geometry.attributes.position;
    for (let i = 0; i < this.count; i += 1) {
      position.setY(i, this.heights[i]);
    }
    position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  setScale(scale) {
    this.scale = scale;
    this.mesh.scale.set(scale, 1, scale);
    this.needsObjectReposition = true;
  }

  updateColors(waterLevel) {
    const colorAttribute = this.geometry.attributes.color;
    const tempColor = new THREE.Color();

    for (let i = 0; i < this.count; i += 1) {
      terrainColor(this.heights[i], waterLevel, tempColor);
      colorAttribute.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
    }

    colorAttribute.needsUpdate = true;
  }

  index(x, z) {
    return z * (this.segments + 1) + x;
  }

  sampleHeightLocal(lx, lz) {
    const gx = (lx / this.size + 0.5) * this.segments;
    const gz = (lz / this.size + 0.5) * this.segments;

    if (gx < 0 || gx > this.segments || gz < 0 || gz > this.segments) {
      return -14;
    }

    const x0 = Math.floor(clamp(gx, 0, this.segments - 1));
    const z0 = Math.floor(clamp(gz, 0, this.segments - 1));
    const x1 = Math.min(this.segments, x0 + 1);
    const z1 = Math.min(this.segments, z0 + 1);

    const tx = gx - x0;
    const tz = gz - z0;

    const h00 = this.heights[this.index(x0, z0)];
    const h10 = this.heights[this.index(x1, z0)];
    const h01 = this.heights[this.index(x0, z1)];
    const h11 = this.heights[this.index(x1, z1)];

    return lerp(lerp(h00, h10, tx), lerp(h01, h11, tx), tz);
  }

  randomLandPoint(minHeight, maxHeight = 20, maxAttempts = 40) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * this.radius * 0.9;
      const lx = Math.cos(angle) * radius;
      const lz = Math.sin(angle) * radius;
      const height = this.sampleHeightLocal(lx, lz);

      if (height > minHeight && height < maxHeight) {
        return { lx, lz, height };
      }
    }

    const fallbackHeight = this.sampleHeightLocal(0, 0);
    return { lx: 0, lz: 0, height: fallbackHeight };
  }

  applyBrush(worldPoint, brushMode, brushRadius, brushStrength, waterLevel, mountainIntensity) {
    const localX = (worldPoint.x - this.center.x) / this.scale;
    const localZ = (worldPoint.z - this.center.z) / this.scale;
    const effectiveRadius = brushRadius / this.scale;

    if (Math.hypot(localX, localZ) > this.radius * 1.3 + effectiveRadius) {
      return false;
    }

    const minX = clamp(Math.floor(((localX - effectiveRadius) / this.size + 0.5) * this.segments), 0, this.segments);
    const maxX = clamp(Math.ceil(((localX + effectiveRadius) / this.size + 0.5) * this.segments), 0, this.segments);
    const minZ = clamp(Math.floor(((localZ - effectiveRadius) / this.size + 0.5) * this.segments), 0, this.segments);
    const maxZ = clamp(Math.ceil(((localZ + effectiveRadius) / this.size + 0.5) * this.segments), 0, this.segments);

    const snapshot = brushMode === "smooth" ? this.heights.slice() : null;
    let changed = false;

    for (let z = minZ; z <= maxZ; z += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const idx = this.index(x, z);
        const vx = this.localX[idx];
        const vz = this.localZ[idx];

        const distance = Math.hypot(vx - localX, vz - localZ);
        if (distance > effectiveRadius) {
          continue;
        }

        const falloff = 1 - distance / effectiveRadius;
        const weight = falloff * falloff;

        let nextHeight = this.heights[idx];
        if (brushMode === "raise") {
          nextHeight += brushStrength * 0.85 * weight;
        } else if (brushMode === "lower") {
          nextHeight -= brushStrength * 0.85 * weight;
        } else if (brushMode === "mountain") {
          const jagged = 0.6 + Math.max(0, fbm(vx * 0.24, vz * 0.24, this.seed + 91, 3));
          nextHeight += brushStrength * mountainIntensity * jagged * weight;
        } else if (brushMode === "smooth" && snapshot) {
          const left = snapshot[this.index(Math.max(0, x - 1), z)];
          const right = snapshot[this.index(Math.min(this.segments, x + 1), z)];
          const up = snapshot[this.index(x, Math.max(0, z - 1))];
          const down = snapshot[this.index(x, Math.min(this.segments, z + 1))];
          const avg = (snapshot[idx] + left + right + up + down) / 5;
          nextHeight = lerp(this.heights[idx], avg, clamp(brushStrength * 0.5 * weight, 0, 1));
        }

        const radial = this.radial[idx];
        const edgeFactor = clamp(1 - radial * 0.75, 0, 1);
        const maxHeight = lerp(1.5, 18 * mountainIntensity, edgeFactor);
        const minHeight = radial > 1 ? -14 - (radial - 1) * 6 : -7;

        const clamped = clamp(nextHeight, minHeight, maxHeight);
        if (Math.abs(clamped - this.heights[idx]) > 0.0001) {
          this.heights[idx] = clamped;
          changed = true;
        }
      }
    }

    if (changed) {
      this._applyHeights();
      this.updateColors(waterLevel);
      this.needsVegetationRegen = true;
      this.needsObjectReposition = true;
    }

    return changed;
  }
}

class IslandGame {
  constructor() {
    this.viewport = document.getElementById("viewport");
    this.isMobile = COARSE_POINTER || window.innerWidth <= 920;
    this.autoQuality = detectAutoQuality(this.isMobile);
    this.performancePreset = QUALITY_PRESETS[this.autoQuality];

    this.controlsRef = {
      bottomHud: document.getElementById("bottom-hud"),
      messageStack: document.getElementById("message-stack"),
      controlPanel: document.getElementById("control-panel"),
      panelToggle: document.getElementById("panel-toggle"),
      panelClose: document.getElementById("panel-close"),
      modeSculpt: document.getElementById("mode-sculpt"),
      modeCamera: document.getElementById("mode-camera"),
      hudPhase: document.getElementById("hud-phase"),
      hudHarmony: document.getElementById("hud-harmony"),
      hudHarmonyFill: document.getElementById("hud-harmony-fill"),
      hudHumans: document.getElementById("hud-humans"),
      hudHuts: document.getElementById("hud-huts"),
      hudPlazas: document.getElementById("hud-plazas"),
      hudFish: document.getElementById("hud-fish"),
      hudSpecies: document.getElementById("hud-species"),
      hudWood: document.getElementById("hud-wood"),
      hudStone: document.getElementById("hud-stone"),
      hudFiber: document.getElementById("hud-fiber"),
      hudFood: document.getElementById("hud-food"),
      hudTools: document.getElementById("hud-tools"),
      hudCanoes: document.getElementById("hud-canoes"),
      hudGardens: document.getElementById("hud-gardens"),
      hudStrain: document.getElementById("hud-strain"),
      hintText: document.getElementById("hint-text"),
      qualityLevel: document.getElementById("quality-level"),
      qualityHint: document.getElementById("quality-hint"),
      brushMode: document.getElementById("brush-mode"),
      brushRadius: document.getElementById("brush-radius"),
      brushStrength: document.getElementById("brush-strength"),
      waterLevel: document.getElementById("water-level"),
      mountainIntensity: document.getElementById("mountain-intensity"),
      vegetationDensity: document.getElementById("vegetation-density"),
      islandScale: document.getElementById("island-scale"),
      bringHumans: document.getElementById("bring-humans"),
      gatherResources: document.getElementById("gather-resources"),
      gardenCrops: document.getElementById("garden-crops"),
      plantTrees: document.getElementById("plant-trees"),
      careAnimals: document.getElementById("care-animals"),
      buildHut: document.getElementById("build-hut"),
      buildPlaza: document.getElementById("build-plaza"),
      craftTools: document.getElementById("craft-tools"),
      craftCanoe: document.getElementById("craft-canoe"),
      sailIsland: document.getElementById("sail-island"),
      sailReq: document.getElementById("sail-req"),
      statIslands: document.getElementById("stat-islands"),
      statAnimals: document.getElementById("stat-animals"),
      statFish: document.getElementById("stat-fish"),
      statSpecies: document.getElementById("stat-species"),
      statHumans: document.getElementById("stat-humans"),
      statHuts: document.getElementById("stat-huts"),
      statPlazas: document.getElementById("stat-plazas"),
      statGardens: document.getElementById("stat-gardens"),
      phaseLabel: document.getElementById("phase-label"),
      resourceWood: document.getElementById("resource-wood"),
      resourceStone: document.getElementById("resource-stone"),
      resourceFiber: document.getElementById("resource-fiber"),
      resourceFood: document.getElementById("resource-food"),
      itemTools: document.getElementById("item-tools"),
      itemCanoes: document.getElementById("item-canoes"),
      harmonyScore: document.getElementById("harmony-score"),
      harmonyFill: document.getElementById("harmony-fill"),
      eventLog: document.getElementById("event-log"),
      brushRadiusValue: document.getElementById("brush-radius-value"),
      brushStrengthValue: document.getElementById("brush-strength-value"),
      waterLevelValue: document.getElementById("water-level-value"),
      mountainIntensityValue: document.getElementById("mountain-intensity-value"),
      vegetationDensityValue: document.getElementById("vegetation-density-value"),
      islandScaleValue: document.getElementById("island-scale-value")
    };

    this.state = {
      brushMode: "raise",
      brushRadius: 8,
      brushStrength: 0.8,
      waterLevel: 1.2,
      mountainIntensity: 1,
      vegetationDensity: 0.58,
      harmony: 70,
      civilizationUnlocked: false,
      interactionMode: this.isMobile ? "sculpt" : "camera",
      panelCollapsed: this.isMobile,
      qualityLevel: "auto",
      phaseLabel: "Founding",
      sailUnlocked: false,
      harmonyGateSeconds: 0,
      gatherCooldown: 0,
      gatherStrain: 0,
      lastManualGatherAt: 0,
      gardens: 0,
      careActions: 0,
      treesPlanted: 0,
      ecoCare: 0,
      resources: {
        wood: 24,
        stone: 18,
        fiber: 20,
        food: 24
      },
      items: {
        tools: 0,
        canoes: 0
      }
    };

    this.islands = [];
    this.animals = [];
    this.fish = [];
    this.humans = [];
    this.huts = [];
    this.villagePlazas = [];
    this.bridges = [];

    this.selectedIsland = null;
    this.nextIslandId = 1;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.sculpting = false;
    this.sculptPointerId = null;
    this.lastSculptStamp = 0;

    this.lastTime = performance.now();
    this.statusAccumulator = 0;
    this.ecologyRefreshAccumulator = 0;
    this.lodAccumulator = 0;
    this.resourceDripAccumulator = 0;
    this.lowHarmonyNoticeCooldown = 0;
    this.highStrainNoticeCooldown = 0;
    this.frameCounter = 0;
    this.displayCache = {};

    this._setupScene();
    this._bindUI();
    this._applyQualitySetting(this.state.qualityLevel, false);
    this._setInteractionMode(this.state.interactionMode, false);
    this._setPanelCollapsed(this.state.panelCollapsed, false);
    this._createInitialWorld();
    this._refreshValueLabels();

    this._animate = this._animate.bind(this);
    requestAnimationFrame(this._animate);

    this.log("Begin with one island. Build a calm village before sailing anywhere else.");
  }

  _resolveQualityPreset(choice) {
    const key = choice === "auto" ? this.autoQuality : choice;
    return { key, preset: QUALITY_PRESETS[key] ?? QUALITY_PRESETS.medium };
  }

  _applyQualitySetting(choice, announce = true) {
    const { key, preset } = this._resolveQualityPreset(choice);
    this.state.qualityLevel = choice;
    this.performancePreset = preset;

    this.controlsRef.qualityLevel.value = choice;
    this.controlsRef.qualityHint.textContent =
      choice === "auto"
        ? `Auto currently uses ${key.toUpperCase()} quality on this device.`
        : `Running ${key.toUpperCase()} quality.`;

    if (this.renderer) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.pixelRatioCap));
      this.renderer.shadowMap.enabled = preset.shadows;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    if (this.sun) {
      this.sun.castShadow = preset.shadows;
      this.sun.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
      this.sun.shadow.needsUpdate = true;
    }

    if (this.controls) {
      this.controls.enableDamping = true;
      this.controls.dampingFactor = this.isMobile ? 0.085 : 0.075;
    }

    this._enforceQualityCaps();
    for (const island of this.islands) {
      island.needsVegetationRegen = true;
      island.needsObjectReposition = true;
    }
    this.ecologyRefreshAccumulator = 0.18;

    if (announce) {
      this._notify(`Quality switched to ${key.toUpperCase()}.`, "info");
    }
  }

  _setPanelCollapsed(collapsed, syncButton = true) {
    this.state.panelCollapsed = collapsed;
    this.controlsRef.controlPanel.classList.toggle("collapsed", collapsed);
    if (syncButton) {
      this.controlsRef.panelToggle.textContent = collapsed ? "Controls" : "Hide Controls";
    }
    this.controlsRef.panelToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    document.body.classList.toggle("panel-open", !collapsed && this.isMobile);
  }

  _togglePanel() {
    if (!this.isMobile) {
      return;
    }
    this._setPanelCollapsed(!this.state.panelCollapsed);
  }

  _setInteractionMode(mode, announce = true) {
    this.state.interactionMode = mode;
    const sculptMode = mode === "sculpt";

    this.controls.enabled = !sculptMode;
    this.controls.enableRotate = !sculptMode;
    this.controls.enableZoom = !sculptMode;
    this.controls.enablePan = !sculptMode;

    this.controls.touches.ONE = sculptMode ? THREE.TOUCH.NONE : THREE.TOUCH.ROTATE;
    this.controls.touches.TWO = sculptMode ? THREE.TOUCH.NONE : THREE.TOUCH.DOLLY_PAN;

    this.controlsRef.modeSculpt.classList.toggle("active", sculptMode);
    this.controlsRef.modeCamera.classList.toggle("active", !sculptMode);

    this.controlsRef.hintText.textContent = sculptMode
      ? "Sculpt mode: shape your main island for safe village land."
      : "Camera mode: orbit and inspect village balance before expanding.";

    this.sculpting = false;
    this.sculptPointerId = null;

    if (announce) {
      this._notify(sculptMode ? "Switched to Sculpt mode." : "Switched to Camera mode.", "info");
    }
  }

  _removeFromArray(array, value) {
    const index = array.indexOf(value);
    if (index >= 0) {
      array.splice(index, 1);
    }
  }

  _enforceQualityCaps() {
    const caps = this.performancePreset;

    for (const island of this.islands) {
      while (island.animals.length > caps.maxAnimalsPerIsland) {
        const animal = island.animals.pop();
        this._removeFromArray(this.animals, animal);
        this.scene.remove(animal.mesh);
      }

      while (island.fish.length > caps.maxFishPerIsland) {
        const fish = island.fish.pop();
        this._removeFromArray(this.fish, fish);
        this.scene.remove(fish.mesh);
      }

      while (island.humans.length > caps.maxHumansPerIsland) {
        const human = island.humans.pop();
        this._removeFromArray(this.humans, human);
        this.scene.remove(human.mesh);
      }

      while (island.huts.length > caps.maxHutsPerIsland) {
        const hut = island.huts.pop();
        this._removeFromArray(this.huts, hut);
        this.scene.remove(hut.mesh);

        for (const human of this.humans) {
          if (human.home === hut) {
            human.home = null;
          }
        }
      }

      while (island.plazas.length > caps.maxPlazasPerIsland) {
        const plaza = island.plazas.pop();
        this._removeFromArray(this.villagePlazas, plaza);
        this.scene.remove(plaza.mesh);
      }
    }
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x93d2fb);
    this.scene.fog = new THREE.Fog(0x93d2fb, 130, 480);

    this.camera = new THREE.PerspectiveCamera(55, this.viewport.clientWidth / this.viewport.clientHeight, 0.1, 2500);
    this.camera.position.set(64, 54, 68);

    this.renderer = new THREE.WebGLRenderer({
      antialias: this.performancePreset.antialias,
      powerPreference: this.isMobile ? "high-performance" : "default"
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.performancePreset.pixelRatioCap));
    this.renderer.setSize(this.viewport.clientWidth, this.viewport.clientHeight);
    this.renderer.shadowMap.enabled = this.performancePreset.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.touchAction = "none";
    this.viewport.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 6, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = this.isMobile ? 0.085 : 0.075;
    this.controls.minDistance = 24;
    this.controls.maxDistance = 260;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    this.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    this.controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;

    this.renderer.domElement.addEventListener("contextmenu", (event) => event.preventDefault());

    const hemisphere = new THREE.HemisphereLight(0xd5f3ff, 0x5f7351, 0.92);
    this.scene.add(hemisphere);

    this.sun = new THREE.DirectionalLight(0xfff5ce, 1.28);
    this.sun.position.set(120, 140, 80);
    this.sun.castShadow = this.performancePreset.shadows;
    this.sun.shadow.mapSize.set(this.performancePreset.shadowMapSize, this.performancePreset.shadowMapSize);
    this.sun.shadow.camera.left = -220;
    this.sun.shadow.camera.right = 220;
    this.sun.shadow.camera.top = 220;
    this.sun.shadow.camera.bottom = -220;
    this.scene.add(this.sun);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1400, 92),
      new THREE.MeshStandardMaterial({ color: 0x3d5f79, roughness: 0.95, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -11;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.waterMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x59bfdc,
      transparent: true,
      opacity: 0.66,
      roughness: 0.1,
      metalness: 0.05,
      transmission: this.performancePreset.shadows ? 0.08 : 0.03
    });

    this.water = new THREE.Mesh(new THREE.CircleGeometry(1500, 110), this.waterMaterial);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = this.state.waterLevel;
    this.scene.add(this.water);

    this.selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(1, 1.08, 80),
      new THREE.MeshBasicMaterial({
        color: 0xfff4a4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72
      })
    );
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);

    window.addEventListener("resize", () => {
      this.camera.aspect = this.viewport.clientWidth / this.viewport.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.viewport.clientWidth, this.viewport.clientHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.performancePreset.pixelRatioCap));
      const wasMobile = this.isMobile;
      this.isMobile = COARSE_POINTER || window.innerWidth <= 920;
      document.body.classList.toggle("touch-ui", this.isMobile);
      if (wasMobile !== this.isMobile) {
        if (this.isMobile) {
          this._setPanelCollapsed(true, false);
        } else {
          this._setPanelCollapsed(false, false);
        }
      } else {
        this._setPanelCollapsed(this.state.panelCollapsed, false);
      }
    });

    this.renderer.domElement.addEventListener("pointerdown", (event) => this._onViewportPointerDown(event));
    window.addEventListener("pointermove", (event) => this._onWindowPointerMove(event), { passive: false });
    window.addEventListener("pointerup", (event) => this._onWindowPointerUp(event));
    window.addEventListener("pointercancel", (event) => this._onWindowPointerUp(event));

    document.body.classList.toggle("touch-ui", this.isMobile);
  }

  _onViewportPointerDown(event) {
    if (this.state.interactionMode !== "sculpt") {
      return;
    }

    const validButton = event.pointerType === "mouse" ? event.button === 0 : true;
    if (!validButton) {
      return;
    }

    this.sculpting = true;
    this.sculptPointerId = event.pointerId;
    this.renderer.domElement.setPointerCapture(event.pointerId);
    this._sculptFromPointer(event);
    event.preventDefault();
  }

  _onWindowPointerMove(event) {
    if (!this.sculpting || this.state.interactionMode !== "sculpt") {
      return;
    }
    if (event.pointerId !== this.sculptPointerId) {
      return;
    }
    this._sculptFromPointer(event);
    event.preventDefault();
  }

  _onWindowPointerUp(event) {
    if (event.pointerId !== this.sculptPointerId) {
      return;
    }
    this.sculpting = false;
    this.sculptPointerId = null;
    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) {
      this.renderer.domElement.releasePointerCapture(event.pointerId);
    }
  }

  _bindUI() {
    this.controlsRef.modeSculpt.addEventListener("click", () => this._setInteractionMode("sculpt"));
    this.controlsRef.modeCamera.addEventListener("click", () => this._setInteractionMode("camera"));

    this.controlsRef.panelToggle.addEventListener("click", () => this._togglePanel());
    this.controlsRef.panelClose.addEventListener("click", () => this._setPanelCollapsed(true));

    this.controlsRef.qualityLevel.addEventListener("change", (event) => {
      this._applyQualitySetting(event.target.value);
    });

    this.controlsRef.brushMode.addEventListener("change", (event) => {
      this.state.brushMode = event.target.value;
    });

    this.controlsRef.brushRadius.addEventListener("input", (event) => {
      this.state.brushRadius = Number(event.target.value);
      this._refreshValueLabels();
    });

    this.controlsRef.brushStrength.addEventListener("input", (event) => {
      this.state.brushStrength = Number(event.target.value);
      this._refreshValueLabels();
    });

    this.controlsRef.waterLevel.addEventListener("input", (event) => {
      this.state.waterLevel = Number(event.target.value);
      this._refreshValueLabels();
      this.water.position.y = this.state.waterLevel;
      for (const island of this.islands) {
        island.updateColors(this.state.waterLevel);
        island.needsObjectReposition = true;
      }
      this._updateBridgeTransforms();
    });

    this.controlsRef.mountainIntensity.addEventListener("input", (event) => {
      this.state.mountainIntensity = Number(event.target.value);
      this._refreshValueLabels();
    });

    this.controlsRef.vegetationDensity.addEventListener("input", (event) => {
      this.state.vegetationDensity = Number(event.target.value);
      this._refreshValueLabels();
      for (const island of this.islands) {
        island.needsVegetationRegen = true;
      }
      this.ecologyRefreshAccumulator = 0.32;
    });

    this.controlsRef.islandScale.addEventListener("input", (event) => {
      const scale = Number(event.target.value);
      this._refreshValueLabels();
      if (!this.selectedIsland) {
        return;
      }
      this.selectedIsland.setScale(scale);
      this._updateBridgeTransforms();
    });

    this.controlsRef.bringHumans.addEventListener("click", () => {
      this.unlockHumans();
    });

    this.controlsRef.gatherResources.addEventListener("click", () => {
      this.gatherResources(true);
    });

    this.controlsRef.gardenCrops.addEventListener("click", () => {
      this.gardenCrops();
    });

    this.controlsRef.plantTrees.addEventListener("click", () => {
      this.plantTrees();
    });

    this.controlsRef.careAnimals.addEventListener("click", () => {
      this.careForAnimals();
    });

    this.controlsRef.buildHut.addEventListener("click", () => {
      this.buildHut();
    });

    this.controlsRef.buildPlaza.addEventListener("click", () => {
      this.buildVillagePlaza();
    });

    this.controlsRef.craftTools.addEventListener("click", () => {
      this.craftToolKit();
    });

    this.controlsRef.craftCanoe.addEventListener("click", () => {
      this.craftCanoe();
    });

    this.controlsRef.sailIsland.addEventListener("click", () => {
      this.sailToNewIsland();
    });
  }

  _refreshValueLabels() {
    this.controlsRef.brushRadiusValue.textContent = `${this.state.brushRadius.toFixed(1)}m`;
    this.controlsRef.brushStrengthValue.textContent = this.state.brushStrength.toFixed(2);
    this.controlsRef.waterLevelValue.textContent = this.state.waterLevel.toFixed(1);
    this.controlsRef.mountainIntensityValue.textContent = this.state.mountainIntensity.toFixed(2);
    this.controlsRef.vegetationDensityValue.textContent = `${Math.round(this.state.vegetationDensity * 100)}%`;

    if (this.selectedIsland) {
      this.controlsRef.islandScaleValue.textContent = `${this.selectedIsland.scale.toFixed(2)}x`;
      this.controlsRef.islandScale.value = this.selectedIsland.scale.toFixed(2);
    } else {
      this.controlsRef.islandScaleValue.textContent = "1.00x";
    }

    this._updateBuilderUI();
  }

  log(message, options = {}) {
    const item = document.createElement("li");
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    item.textContent = `${time}  ${message}`;
    this.controlsRef.eventLog.prepend(item);

    while (this.controlsRef.eventLog.children.length > 10) {
      this.controlsRef.eventLog.removeChild(this.controlsRef.eventLog.lastChild);
    }

    if (options.toast) {
      this._pushToast(message, options.tone ?? "info");
    }
  }

  _pushToast(message, tone = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${tone}`;
    toast.textContent = message;
    this.controlsRef.messageStack.appendChild(toast);

    while (this.controlsRef.messageStack.children.length > 4) {
      this.controlsRef.messageStack.removeChild(this.controlsRef.messageStack.firstChild);
    }

    requestAnimationFrame(() => toast.classList.add("show"));

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      }, 220);
    }, 2800);
  }

  _pulseValue(el, direction = "up") {
    if (!el) {
      return;
    }
    const className = direction === "down" ? "pulse-down" : "pulse-up";
    el.classList.remove("pulse-up", "pulse-down");
    void el.offsetWidth;
    el.classList.add(className);
    if (el._pulseTimer) {
      clearTimeout(el._pulseTimer);
    }
    el._pulseTimer = setTimeout(() => {
      el.classList.remove("pulse-up", "pulse-down");
    }, 520);
  }

  _setDisplayValue(key, value, el) {
    const prev = this.displayCache[key];
    el.textContent = String(value);
    if (typeof value === "number" && Number.isFinite(prev)) {
      if (value > prev) {
        this._pulseValue(el, "up");
      } else if (value < prev) {
        this._pulseValue(el, "down");
      }
    } else if (typeof value === "string" && prev !== undefined && prev !== value) {
      this._pulseValue(el, "up");
    }
    this.displayCache[key] = value;
  }

  _afterPrimaryAction(message, tone = "success") {
    this.controlsRef.hintText.textContent = message;
    this.log(message, { toast: true, tone });
    if (this.isMobile) {
      this._setPanelCollapsed(true);
    }
  }

  _notify(message, tone = "info") {
    this.controlsRef.hintText.textContent = message;
    this.log(message, { toast: true, tone });
  }

  _primaryIsland() {
    return this.islands[0] ?? null;
  }

  _focusIslandForBuilding() {
    if (!this.state.sailUnlocked) {
      return this._primaryIsland();
    }
    return this.selectedIsland ?? this._primaryIsland();
  }

  _costToText(cost) {
    return Object.entries(cost)
      .map(([key, value]) => `${value} ${key}`)
      .join(", ");
  }

  _resourceLabel(key) {
    if (key === "wood") {
      return "wood";
    }
    if (key === "stone") {
      return "stone";
    }
    if (key === "fiber") {
      return "fiber";
    }
    if (key === "food") {
      return "food";
    }
    if (key === "tools") {
      return "tools";
    }
    if (key === "canoes") {
      return "canoes";
    }
    return key;
  }

  _missingCost(cost) {
    const missing = {};
    for (const [key, value] of Object.entries(cost)) {
      const pool = key in this.state.resources ? this.state.resources : this.state.items;
      const available = pool[key] ?? 0;
      if (available < value) {
        missing[key] = value - available;
      }
    }
    return missing;
  }

  _missingCostText(cost) {
    const missing = this._missingCost(cost);
    return Object.entries(missing)
      .map(([key, value]) => `${value} ${this._resourceLabel(key)}`)
      .join(", ");
  }

  _hasCost(cost) {
    for (const [key, value] of Object.entries(cost)) {
      if (key in this.state.resources && this.state.resources[key] < value) {
        return false;
      }
      if (key in this.state.items && this.state.items[key] < value) {
        return false;
      }
    }
    return true;
  }

  _spendCost(cost) {
    if (!this._hasCost(cost)) {
      return false;
    }
    for (const [key, value] of Object.entries(cost)) {
      if (key in this.state.resources) {
        this.state.resources[key] -= value;
      } else if (key in this.state.items) {
        this.state.items[key] -= value;
      }
    }
    return true;
  }

  _gainResources(payload) {
    for (const [key, value] of Object.entries(payload)) {
      if (key in this.state.resources) {
        this.state.resources[key] += value;
      }
    }
  }

  _updateBuilderUI() {
    this._setDisplayValue("resourceWood", this.state.resources.wood, this.controlsRef.resourceWood);
    this._setDisplayValue("resourceStone", this.state.resources.stone, this.controlsRef.resourceStone);
    this._setDisplayValue("resourceFiber", this.state.resources.fiber, this.controlsRef.resourceFiber);
    this._setDisplayValue("resourceFood", this.state.resources.food, this.controlsRef.resourceFood);
    this._setDisplayValue("itemTools", this.state.items.tools, this.controlsRef.itemTools);
    this._setDisplayValue("itemCanoes", this.state.items.canoes, this.controlsRef.itemCanoes);
    this._setDisplayValue("phaseLabel", this.state.phaseLabel, this.controlsRef.phaseLabel);

    this._setDisplayValue("hudPhase", this.state.phaseLabel, this.controlsRef.hudPhase);
    this._setDisplayValue("hudWood", this.state.resources.wood, this.controlsRef.hudWood);
    this._setDisplayValue("hudStone", this.state.resources.stone, this.controlsRef.hudStone);
    this._setDisplayValue("hudFiber", this.state.resources.fiber, this.controlsRef.hudFiber);
    this._setDisplayValue("hudFood", this.state.resources.food, this.controlsRef.hudFood);
    this._setDisplayValue("hudTools", this.state.items.tools, this.controlsRef.hudTools);
    this._setDisplayValue("hudCanoes", this.state.items.canoes, this.controlsRef.hudCanoes);
    this._setDisplayValue("hudGardens", this.state.gardens, this.controlsRef.hudGardens);
    this._setDisplayValue("hudStrain", Math.round(this.state.gatherStrain), this.controlsRef.hudStrain);

    const civReady = this.state.civilizationUnlocked;
    const gatherCooldown = Math.ceil(this.state.gatherCooldown);
    this.controlsRef.gatherResources.disabled = !civReady || gatherCooldown > 0;
    this.controlsRef.gatherResources.textContent =
      gatherCooldown > 0
        ? `Gather Resources (${gatherCooldown}s)`
        : this.state.gatherStrain > 54
          ? "Gather Resources (High Strain)"
          : "Gather Resources";

    this.controlsRef.gardenCrops.disabled = !civReady;
    this.controlsRef.plantTrees.disabled = !civReady;
    this.controlsRef.careAnimals.disabled = !civReady;
    this.controlsRef.buildHut.disabled = !civReady;
    this.controlsRef.buildPlaza.disabled = !civReady;
    this.controlsRef.craftTools.disabled = !civReady;
    this.controlsRef.craftCanoe.disabled = !civReady;

    const canSailNow =
      this.state.sailUnlocked && this.state.items.canoes > 0 && this.islands.length < this.performancePreset.maxIslands;
    this.controlsRef.sailIsland.disabled = !canSailNow;
    this.controlsRef.sailIsland.textContent = this.state.sailUnlocked
      ? "Sail to New Island"
      : "Sail to New Island (Locked)";

    const primaryIsland = this._primaryIsland();
    const primaryHuts = primaryIsland ? primaryIsland.huts.length : 0;
    const primaryPlazas = primaryIsland ? primaryIsland.plazas.length : 0;
    if (!civReady) {
      this.controlsRef.sailReq.textContent = "Bring the first humans, then build your island village.";
    } else if (this.state.sailUnlocked) {
      this.controlsRef.sailReq.textContent = "Sailing unlocked. Send a canoe to begin co-building another island.";
    } else {
      this.controlsRef.sailReq.textContent =
        `Need 4 huts (${primaryHuts}/4), 1 plaza (${primaryPlazas}/1), 2 tools (${this.state.items.tools}/2), ` +
        `1 canoe (${this.state.items.canoes}/1), harmony 86+ for 30s (${Math.floor(this.state.harmonyGateSeconds)}s).`;
    }
  }

  gatherResources(manual) {
    if (!this.state.civilizationUnlocked) {
      if (manual) {
        this._notify("Bring humans first so someone can gather materials.", "warn");
      }
      return false;
    }

    if (manual && this.state.gatherCooldown > 0) {
      this._notify("Gatherers are still out. Try again in a moment.", "warn");
      return false;
    }

    const island = this._primaryIsland();
    const visibleTrees = island ? island.trees.filter((tree) => tree.baseVisible !== false).length : 0;
    const animalCount = island ? island.animals.length : 0;
    const hutCount = island ? island.huts.length : 0;
    const plazaCount = island ? island.plazas.length : 0;
    const peopleCount = island ? island.humans.length : 0;

    if (manual) {
      this._gainResources({
        wood: 4 + Math.floor(visibleTrees / 40) + Math.min(2, hutCount),
        stone: 2 + plazaCount,
        fiber: 3 + Math.round(this.state.vegetationDensity * 2),
        food: 2 + Math.min(3, Math.floor((animalCount + peopleCount) / 6))
      });

      const now = performance.now() * 0.001;
      const secondsSinceLast = this.state.lastManualGatherAt > 0 ? now - this.state.lastManualGatherAt : 999;
      let strainGain = 9;
      if (secondsSinceLast < 10) {
        strainGain += 7;
      }
      if (secondsSinceLast < 6) {
        strainGain += 8;
      }
      if (secondsSinceLast < 3.5) {
        strainGain += 10;
      }

      this.state.gatherStrain = clamp(this.state.gatherStrain + strainGain, 0, 100);
      this.state.lastManualGatherAt = now;
      this.state.gatherCooldown = 4;

      if (this.state.gatherStrain >= 56) {
        this._afterPrimaryAction(
          "Supplies arrived, but the island is strained. Garden, plant trees, or care for animals to recover harmony.",
          "warn"
        );
      } else {
        this._afterPrimaryAction("Great gathering run. New supplies reached the village.", "success");
      }
    } else {
      this._gainResources({
        wood: 1 + Math.min(1, hutCount),
        stone: 1,
        fiber: 1,
        food: 1 + Math.min(1, plazaCount)
      });
      this.state.gatherStrain = Math.max(0, this.state.gatherStrain - 0.2);
    }
    return true;
  }

  _plantTreesOnIsland(island, count) {
    const availableSlots = Math.max(0, this.performancePreset.maxTreesPerIsland - island.trees.length);
    const target = clamp(count, 0, availableSlots);
    if (target <= 0) {
      return 0;
    }

    let planted = 0;
    let attempts = 0;
    while (planted < target && attempts < target * 10) {
      attempts += 1;
      const point = island.randomLandPoint(this.state.waterLevel + 0.35, this.state.waterLevel + 11.5);
      const { mesh, scale } = createTreeMesh();
      mesh.rotation.y = Math.random() * Math.PI * 2;
      island.trees.push({
        mesh,
        localX: point.lx,
        localZ: point.lz,
        baseScale: scale,
        baseRotation: mesh.rotation.y,
        baseVisible: true
      });
      this.scene.add(mesh);
      planted += 1;
    }

    island.needsObjectReposition = true;
    return planted;
  }

  gardenCrops() {
    if (!this.state.civilizationUnlocked) {
      this._notify("Bring humans first, then start island gardens.", "warn");
      return false;
    }

    const island = this._focusIslandForBuilding();
    if (!island) {
      return false;
    }

    if (!this._spendCost(BUILD_COSTS.garden)) {
      this._notify(`Need ${this._missingCostText(BUILD_COSTS.garden)} to start a garden. Gather resources first.`, "warn");
      return false;
    }

    const foodYield = 5 + Math.min(4, Math.floor(island.humans.length / 3)) + Math.min(2, island.plazas.length);
    this.state.resources.food += foodYield;
    island.gardens += 1;
    this.state.gardens += 1;
    this.state.ecoCare = clamp(this.state.ecoCare + 8, 0, 100);
    this.state.gatherStrain = Math.max(0, this.state.gatherStrain - 12);

    this._afterPrimaryAction(`Garden started. +${foodYield} food and harmony support increased.`, "success");
    return true;
  }

  plantTrees() {
    if (!this.state.civilizationUnlocked) {
      this._notify("Bring humans first, then start reforestation.", "warn");
      return false;
    }

    const island = this._focusIslandForBuilding();
    if (!island) {
      return false;
    }

    if (island.trees.length >= this.performancePreset.maxTreesPerIsland) {
      this._notify("This island is already at its tree capacity. Expand or choose another island.", "warn");
      return false;
    }

    if (!this._spendCost(BUILD_COSTS.plantTrees)) {
      this._notify(`Need ${this._missingCostText(BUILD_COSTS.plantTrees)} to plant trees. Gather resources first.`, "warn");
      return false;
    }

    const planted = this._plantTreesOnIsland(island, 2 + (this.state.items.tools > 0 ? 1 : 0));
    this.state.treesPlanted += planted;
    this.state.ecoCare = clamp(this.state.ecoCare + 11, 0, 100);
    this.state.gatherStrain = Math.max(0, this.state.gatherStrain - 14);

    this._afterPrimaryAction(`Reforestation success. ${planted} new trees planted.`, "success");
    return true;
  }

  careForAnimals() {
    if (!this.state.civilizationUnlocked) {
      this._notify("Bring humans first so they can care for animals.", "warn");
      return false;
    }

    const island = this._focusIslandForBuilding();
    if (!island) {
      return false;
    }

    const atLandCap = island.animals.length >= this.performancePreset.maxAnimalsPerIsland;
    const atFishCap = island.fish.length >= this.performancePreset.maxFishPerIsland;
    if (atLandCap && atFishCap) {
      this._notify("Wildlife is thriving here already. Choose another island to expand care.", "warn");
      return false;
    }

    if (!this._spendCost(BUILD_COSTS.careAnimals)) {
      this._notify(
        `Need ${this._missingCostText(BUILD_COSTS.careAnimals)} to support wildlife care. Gather resources first.`,
        "warn"
      );
      return false;
    }

    const landBefore = island.animals.length;
    const fishBefore = island.fish.length;
    this._spawnAnimals(island, island.animals.length + 1 + (Math.random() < 0.45 ? 1 : 0));
    this._spawnFish(island, island.fish.length + 2);

    const landAdded = island.animals.length - landBefore;
    const fishAdded = island.fish.length - fishBefore;
    this.state.careActions += 1;
    this.state.ecoCare = clamp(this.state.ecoCare + 9, 0, 100);
    this.state.gatherStrain = Math.max(0, this.state.gatherStrain - 10);

    this._afterPrimaryAction(`Animal care completed. +${landAdded} land animals and +${fishAdded} fish joined.`, "success");
    return true;
  }

  buildHut() {
    if (!this.state.civilizationUnlocked) {
      this._notify("Bring the first humans before building huts.", "warn");
      return false;
    }

    const island = this._focusIslandForBuilding();
    if (!island) {
      return false;
    }

    if (island.huts.length >= this.performancePreset.maxHutsPerIsland) {
      this._notify("This island is at its hut cap for the current quality setting.", "warn");
      return false;
    }

    if (!this._spendCost(BUILD_COSTS.hut)) {
      const missing = this._missingCost(BUILD_COSTS.hut);
      if (missing.wood) {
        this._notify(`Not enough wood for a hut. Gather ${missing.wood} more wood first.`, "warn");
      } else {
        this._notify(`Need ${this._missingCostText(BUILD_COSTS.hut)} for a hut. Gather resources first.`, "warn");
      }
      return false;
    }

    this._spawnSettlement(island, 1, 1);
    this._afterPrimaryAction("Hut complete. Your village just grew.", "success");
    return true;
  }

  buildVillagePlaza() {
    if (!this.state.civilizationUnlocked) {
      this._notify("Bring humans first, then establish a village plaza.", "warn");
      return false;
    }

    const island = this._focusIslandForBuilding();
    if (!island) {
      return false;
    }

    if (island.huts.length < 3) {
      this._notify("Build at least 3 huts on this island before a village plaza.", "warn");
      return false;
    }

    if (island.plazas.length >= this.performancePreset.maxPlazasPerIsland) {
      this._notify("This island is already at the village plaza cap.", "warn");
      return false;
    }

    if (!this._spendCost(BUILD_COSTS.plaza)) {
      this._notify(`Need ${this._missingCostText(BUILD_COSTS.plaza)} before building a plaza.`, "warn");
      return false;
    }

    const point = island.randomLandPoint(this.state.waterLevel + 0.8, this.state.waterLevel + 9);
    const mesh = createVillagePlazaMesh();
    mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = this.performancePreset.shadows;
      }
    });
    this.scene.add(mesh);

    const plaza = {
      island,
      mesh,
      localX: point.lx,
      localZ: point.lz,
      flooded: false
    };

    island.plazas.push(plaza);
    this.villagePlazas.push(plaza);
    island.needsObjectReposition = true;

    this._spawnSettlement(island, 2, 0);
    this._afterPrimaryAction("Village plaza raised. Community harmony is strengthening.", "success");
    return true;
  }

  craftToolKit() {
    if (!this.state.civilizationUnlocked) {
      this._notify("Bring humans first, then craft tool kits.", "warn");
      return false;
    }

    if (!this._spendCost(BUILD_COSTS.tools)) {
      this._notify(`Need ${this._missingCostText(BUILD_COSTS.tools)} before crafting tools.`, "warn");
      return false;
    }

    this.state.items.tools += 1;
    this._afterPrimaryAction("Tool kit crafted. Builders can work smarter now.", "success");
    return true;
  }

  craftCanoe() {
    if (!this.state.civilizationUnlocked) {
      this._notify("Bring humans first, then craft canoes.", "warn");
      return false;
    }

    if (!this._spendCost(BUILD_COSTS.canoe)) {
      this._notify(`Need ${this._missingCostText(BUILD_COSTS.canoe)} before crafting a canoe.`, "warn");
      return false;
    }

    this.state.items.canoes += 1;
    this._afterPrimaryAction("Canoe launched. Sailing prep is complete.", "success");
    return true;
  }

  sailToNewIsland() {
    if (!this.state.sailUnlocked) {
      this._notify("Sailing is still locked. Hold harmony and complete village goals first.", "warn");
      return false;
    }

    if (this.state.items.canoes < 1) {
      this._notify("Craft a canoe before launching to another island.", "warn");
      return false;
    }

    if (this.islands.length >= this.performancePreset.maxIslands) {
      this._notify("Map limit reached for this quality setting.", "warn");
      return false;
    }

    this.state.items.canoes -= 1;
    const island = this.addConnectedIsland(false);
    if (!island) {
      this.state.items.canoes += 1;
      return false;
    }

    if (this.state.civilizationUnlocked) {
      this._spawnSettlement(island, 2, 1);
    }

    this._afterPrimaryAction("Voyagers landed safely. Co-building has begun on a new island.", "success");
    return true;
  }

  _updatePhaseAndSailing(delta) {
    const primaryIsland = this._primaryIsland();
    const primaryHuts = primaryIsland ? primaryIsland.huts.length : 0;
    const primaryPlazas = primaryIsland ? primaryIsland.plazas.length : 0;
    const hasVillageCore = primaryPlazas >= 1 && primaryHuts >= 4 && this.state.items.tools >= 2;
    const harmonyReady = hasVillageCore && this.state.harmony >= 86 && this.state.items.canoes >= 1;

    if (!this.state.civilizationUnlocked) {
      this.state.phaseLabel = "Founding";
    } else if (primaryPlazas < 1) {
      this.state.phaseLabel = "Village Building";
    } else if (!this.state.sailUnlocked) {
      this.state.phaseLabel = "Harmony Watch";
    } else if (this.islands.length === 1) {
      this.state.phaseLabel = "Ready to Sail";
    } else {
      this.state.phaseLabel = "Archipelago Co-Build";
    }

    if (!this.state.sailUnlocked) {
      if (harmonyReady) {
        this.state.harmonyGateSeconds += delta;
      } else {
        this.state.harmonyGateSeconds = Math.max(0, this.state.harmonyGateSeconds - delta * 0.8);
      }

      if (this.state.harmonyGateSeconds >= 30) {
        this.state.sailUnlocked = true;
        this.state.phaseLabel = "Ready to Sail";
        this.log("Harmony held. Sailing routes are now unlocked.", { toast: true, tone: "success" });
      }
    }
  }

  _createInitialWorld() {
    const first = this._createIsland(new THREE.Vector3(0, 0, 0), 36);
    this._setSelectedIsland(first);

    this._updateBridgeTransforms();
    this._updateStatusUI();
  }

  _createIsland(center, radius) {
    const island = new TerrainIsland(
      this.scene,
      this.nextIslandId,
      center,
      radius,
      Math.random() * 1000,
      this.state.waterLevel,
      this.state.mountainIntensity,
      { segments: this.performancePreset.terrainSegments }
    );

    island.mesh.castShadow = false;

    this.nextIslandId += 1;
    this.islands.push(island);

    island.needsVegetationRegen = true;
    this._regenerateVegetation(island);

    const baseAnimals = Math.max(5, Math.round(4 + radius * 0.12));
    this._spawnAnimals(island, baseAnimals);

    const baseFish = Math.max(6, Math.round(5 + radius * 0.13));
    this._spawnFish(island, baseFish);

    return island;
  }

  _setSelectedIsland(island) {
    this.selectedIsland = island;
    this.selectionRing.visible = true;
    this._refreshValueLabels();
  }

  _raycastIsland(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.islands.map((island) => island.mesh));

    if (!hits.length) {
      return null;
    }

    const hit = hits[0];
    return {
      island: hit.object.userData.island,
      point: hit.point
    };
  }

  _sculptFromPointer(event) {
    const now = performance.now();
    if (now - this.lastSculptStamp < this.performancePreset.sculptIntervalMs) {
      return;
    }
    this.lastSculptStamp = now;

    const pick = this._raycastIsland(event.clientX, event.clientY);
    if (!pick) {
      return;
    }

    this._setSelectedIsland(pick.island);

    const changed = pick.island.applyBrush(
      pick.point,
      this.state.brushMode,
      this.state.brushRadius,
      this.state.brushStrength,
      this.state.waterLevel,
      this.state.mountainIntensity
    );

    if (changed) {
      this.ecologyRefreshAccumulator = 0.2;
    }
  }

  _regenerateVegetation(island) {
    for (const tree of island.trees) {
      this.scene.remove(tree.mesh);
    }
    island.trees = [];

    const scaledRadius = island.radius * island.scale;
    const baseCount = Math.round(12 + this.state.vegetationDensity * scaledRadius * 2.4);
    const targetCount = Math.min(baseCount, this.performancePreset.maxTreesPerIsland);
    const minHeight = this.state.waterLevel + 0.3;

    let attempts = 0;
    while (island.trees.length < targetCount && attempts < targetCount * 16) {
      attempts += 1;
      const point = island.randomLandPoint(minHeight, this.state.waterLevel + 13);

      const { mesh, scale } = createTreeMesh();
      mesh.rotation.y = Math.random() * Math.PI * 2;

      island.trees.push({
        mesh,
        localX: point.lx,
        localZ: point.lz,
        baseScale: scale,
        baseRotation: mesh.rotation.y,
        baseVisible: true
      });

      this.scene.add(mesh);
    }

    island.needsVegetationRegen = false;
    island.needsObjectReposition = true;
  }

  _applyTreeLodForIsland(island) {
    const dx = this.camera.position.x - island.center.x;
    const dz = this.camera.position.z - island.center.z;
    const distance = Math.hypot(dx, dz) - island.radius * island.scale;

    let fraction = 1;
    if (distance > this.performancePreset.treeLodDistance) {
      fraction = 0.35;
    } else if (distance > this.performancePreset.treeLodDistance * 0.72) {
      fraction = 0.65;
    }

    const budget = Math.max(8, Math.floor(island.trees.length * fraction));
    let visibleCount = 0;

    for (const tree of island.trees) {
      const visibleByHeight = tree.baseVisible !== false;
      const visibleByBudget = visibleCount < budget;
      tree.mesh.visible = visibleByHeight && visibleByBudget;
      if (tree.mesh.visible) {
        visibleCount += 1;
      }
    }
  }

  _updateTreeLodAll() {
    for (const island of this.islands) {
      this._applyTreeLodForIsland(island);
    }
  }

  _repositionIslandStatics(island) {
    for (const tree of island.trees) {
      const height = island.sampleHeightLocal(tree.localX, tree.localZ);
      tree.baseVisible = height >= this.state.waterLevel + 0.2;

      tree.mesh.position.set(
        island.center.x + tree.localX * island.scale,
        height,
        island.center.z + tree.localZ * island.scale
      );
      tree.mesh.rotation.y = tree.baseRotation;
      tree.mesh.scale.setScalar(tree.baseScale);
      tree.mesh.castShadow = this.performancePreset.shadows;
    }

    for (const plaza of island.plazas) {
      const height = island.sampleHeightLocal(plaza.localX, plaza.localZ);
      if (height < this.state.waterLevel + 0.2) {
        const safePoint = island.randomLandPoint(this.state.waterLevel + 0.9, this.state.waterLevel + 9);
        plaza.localX = safePoint.lx;
        plaza.localZ = safePoint.lz;
      }

      const adjustedHeight = island.sampleHeightLocal(plaza.localX, plaza.localZ);
      plaza.flooded = adjustedHeight < this.state.waterLevel + 0.2;
      plaza.mesh.position.set(
        island.center.x + plaza.localX * island.scale,
        adjustedHeight,
        island.center.z + plaza.localZ * island.scale
      );
    }

    this._applyTreeLodForIsland(island);
    island.needsObjectReposition = false;
  }

  _spawnAnimals(island, count) {
    const cappedCount = Math.min(count, this.performancePreset.maxAnimalsPerIsland);
    while (island.animals.length < cappedCount) {
      const point = island.randomLandPoint(this.state.waterLevel + 0.4, this.state.waterLevel + 12);
      const species = ANIMAL_SPECIES[Math.floor(Math.random() * ANIMAL_SPECIES.length)];
      const { mesh, speciesKey, speciesLabel, speedRange } = createAnimalMesh(species);
      mesh.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = this.performancePreset.shadows;
        }
      });
      this.scene.add(mesh);

      const target = island.randomLandPoint(this.state.waterLevel + 0.4, this.state.waterLevel + 11);

      const animal = {
        island,
        mesh,
        species: speciesKey,
        speciesLabel,
        localPosition: new THREE.Vector2(point.lx, point.lz),
        targetPosition: new THREE.Vector2(target.lx, target.lz),
        speed: lerp(speedRange[0], speedRange[1], Math.random()),
        bobOffset: Math.random() * Math.PI * 2
      };

      island.animals.push(animal);
      this.animals.push(animal);
    }
  }

  _spawnFish(island, count) {
    const cappedCount = Math.min(count, this.performancePreset.maxFishPerIsland);
    while (island.fish.length < cappedCount) {
      const species = FISH_SPECIES[Math.floor(Math.random() * FISH_SPECIES.length)];
      const { mesh, speciesKey, speciesLabel, speedRange } = createFishMesh(species);
      mesh.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = this.performancePreset.shadows;
        }
      });
      this.scene.add(mesh);

      const orbitRadius = island.radius * lerp(0.78, 1.28, Math.random());
      const fish = {
        island,
        mesh,
        species: speciesKey,
        speciesLabel,
        orbitRadius,
        angle: Math.random() * Math.PI * 2,
        turnDir: Math.random() < 0.5 ? -1 : 1,
        speed: lerp(speedRange[0], speedRange[1], Math.random()),
        depth: lerp(0.45, 1.45, Math.random()),
        bobOffset: Math.random() * Math.PI * 2
      };

      island.fish.push(fish);
      this.fish.push(fish);
    }
  }

  _updateAnimals(delta, elapsed) {
    for (const animal of this.animals) {
      const { island } = animal;

      const direction = new THREE.Vector2(
        animal.targetPosition.x - animal.localPosition.x,
        animal.targetPosition.y - animal.localPosition.y
      );

      const distance = direction.length();
      if (distance < 0.4) {
        const next = island.randomLandPoint(this.state.waterLevel + 0.4, this.state.waterLevel + 12);
        animal.targetPosition.set(next.lx, next.lz);
      } else {
        direction.multiplyScalar(1 / Math.max(distance, 0.0001));
        const step = Math.min(distance, animal.speed * delta);
        animal.localPosition.x += direction.x * step;
        animal.localPosition.y += direction.y * step;
      }

      const height = island.sampleHeightLocal(animal.localPosition.x, animal.localPosition.y);
      if (height < this.state.waterLevel + 0.15) {
        const fallback = island.randomLandPoint(this.state.waterLevel + 0.5, this.state.waterLevel + 12);
        animal.localPosition.set(fallback.lx, fallback.lz);
      }

      const worldX = island.center.x + animal.localPosition.x * island.scale;
      const worldZ = island.center.z + animal.localPosition.y * island.scale;
      const worldY = island.sampleHeightLocal(animal.localPosition.x, animal.localPosition.y) + 0.34;

      animal.mesh.position.set(worldX, worldY + Math.sin(elapsed * 2.3 + animal.bobOffset) * 0.03, worldZ);
      animal.mesh.rotation.y = Math.atan2(direction.x, direction.y);
    }
  }

  _updateFish(delta, elapsed) {
    for (const fish of this.fish) {
      const island = fish.island;
      fish.angle += fish.turnDir * fish.speed * delta * 0.72;

      let localX = Math.cos(fish.angle) * fish.orbitRadius;
      let localZ = Math.sin(fish.angle) * fish.orbitRadius;
      let seabed = island.sampleHeightLocal(localX, localZ);

      if (seabed > this.state.waterLevel - 0.05) {
        fish.orbitRadius = clamp(
          fish.orbitRadius + lerp(1.8, 4.4, Math.random()),
          island.radius * 0.84,
          island.radius * 1.35
        );
        localX = Math.cos(fish.angle) * fish.orbitRadius;
        localZ = Math.sin(fish.angle) * fish.orbitRadius;
        seabed = island.sampleHeightLocal(localX, localZ);
      }

      const worldX = island.center.x + localX * island.scale;
      const worldZ = island.center.z + localZ * island.scale;
      const waterTop = this.state.waterLevel + Math.sin(elapsed * 0.9) * 0.05;
      const minHeight = seabed + 0.22;
      const targetY = clamp(waterTop - fish.depth, minHeight, waterTop - 0.05);

      fish.mesh.position.set(worldX, targetY + Math.sin(elapsed * 2 + fish.bobOffset) * 0.02, worldZ);
      fish.mesh.rotation.y = fish.turnDir > 0 ? -fish.angle + Math.PI * 0.5 : -fish.angle - Math.PI * 0.5;
      fish.mesh.rotation.z = Math.sin(elapsed * 4.2 + fish.bobOffset) * 0.08;
    }
  }

  unlockHumans() {
    if (this.state.civilizationUnlocked) {
      this._notify("Humans are already here. Keep balance with gardens, tree planting, and animal care.", "info");
      return false;
    }

    this.state.civilizationUnlocked = true;

    const seedIsland = this.islands[0];
    this._spawnSettlement(seedIsland, 3, 1);

    this.controlsRef.bringHumans.textContent = "Humans Arrived";
    this._afterPrimaryAction(
      "The first voyagers arrived. Start with huts, then support harmony with gardens and wildlife care.",
      "success"
    );
    return true;
  }

  _spawnSettlement(island, humanCount, hutCount) {
    const allowedHuts = clamp(
      hutCount,
      0,
      Math.max(0, this.performancePreset.maxHutsPerIsland - island.huts.length)
    );
    const allowedHumans = clamp(
      humanCount,
      0,
      Math.max(0, this.performancePreset.maxHumansPerIsland - island.humans.length)
    );

    for (let i = 0; i < allowedHuts; i += 1) {
      const point = island.randomLandPoint(this.state.waterLevel + 0.8, this.state.waterLevel + 8);
      const hutMesh = createHutMesh();
      hutMesh.rotation.y = Math.random() * Math.PI * 2;
      hutMesh.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = this.performancePreset.shadows;
        }
      });
      this.scene.add(hutMesh);

      const hut = {
        island,
        mesh: hutMesh,
        localX: point.lx,
        localZ: point.lz,
        flooded: false
      };

      this.huts.push(hut);
      island.huts.push(hut);
    }

    for (let i = 0; i < allowedHumans; i += 1) {
      const home = island.huts[Math.floor(Math.random() * island.huts.length)] ?? null;
      const sourcePoint = home
        ? {
            lx: home.localX + (Math.random() - 0.5) * 2.2,
            lz: home.localZ + (Math.random() - 0.5) * 2.2
          }
        : island.randomLandPoint(this.state.waterLevel + 0.7, this.state.waterLevel + 10);

      const mesh = createHumanMesh();
      mesh.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = this.performancePreset.shadows;
        }
      });
      this.scene.add(mesh);

      const target = island.randomLandPoint(this.state.waterLevel + 0.8, this.state.waterLevel + 9);

      const human = {
        island,
        home,
        mesh,
        localPosition: new THREE.Vector2(sourcePoint.lx, sourcePoint.lz),
        targetPosition: new THREE.Vector2(target.lx, target.lz),
        speed: lerp(0.45, 1.1, Math.random())
      };

      this.humans.push(human);
      island.humans.push(human);
    }

    island.needsObjectReposition = true;
  }

  _updateHutsAndHumans(delta) {
    for (const hut of this.huts) {
      let height = hut.island.sampleHeightLocal(hut.localX, hut.localZ);
      if (height < this.state.waterLevel + 0.2) {
        const saferSpot = hut.island.randomLandPoint(this.state.waterLevel + 0.9, this.state.waterLevel + 9);
        hut.localX = saferSpot.lx;
        hut.localZ = saferSpot.lz;
        height = saferSpot.height;
      }

      hut.flooded = height < this.state.waterLevel + 0.2;
      hut.mesh.position.set(
        hut.island.center.x + hut.localX * hut.island.scale,
        height,
        hut.island.center.z + hut.localZ * hut.island.scale
      );
    }

    for (const human of this.humans) {
      const island = human.island;
      const direction = new THREE.Vector2(
        human.targetPosition.x - human.localPosition.x,
        human.targetPosition.y - human.localPosition.y
      );

      const distance = direction.length();
      if (distance < 0.25) {
        if (human.home) {
          human.targetPosition.set(
            human.home.localX + (Math.random() - 0.5) * 3,
            human.home.localZ + (Math.random() - 0.5) * 3
          );
        } else {
          const roam = island.randomLandPoint(this.state.waterLevel + 0.8, this.state.waterLevel + 10);
          human.targetPosition.set(roam.lx, roam.lz);
        }
      } else {
        direction.multiplyScalar(1 / Math.max(distance, 0.0001));
        const step = Math.min(distance, human.speed * delta);
        human.localPosition.x += direction.x * step;
        human.localPosition.y += direction.y * step;
      }

      const height = island.sampleHeightLocal(human.localPosition.x, human.localPosition.y);
      if (height < this.state.waterLevel + 0.2) {
        const safePoint = island.randomLandPoint(this.state.waterLevel + 1, this.state.waterLevel + 9);
        human.localPosition.set(safePoint.lx, safePoint.lz);
      }

      human.mesh.position.set(
        island.center.x + human.localPosition.x * island.scale,
        island.sampleHeightLocal(human.localPosition.x, human.localPosition.y) + 0.02,
        island.center.z + human.localPosition.y * island.scale
      );
      human.mesh.rotation.y = Math.atan2(direction.x, direction.y);
    }
  }

  _createBridge(fromIsland, toIsland) {
    const group = new THREE.Group();

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.36, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x876042, roughness: 0.93 })
    );
    deck.castShadow = this.performancePreset.shadows;

    const railMaterial = new THREE.MeshStandardMaterial({ color: 0x70513a, roughness: 0.95 });

    const railLeft = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 0.16), railMaterial);
    railLeft.position.set(0, 0.27, 1.45);

    const railRight = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 0.16), railMaterial);
    railRight.position.set(0, 0.27, -1.45);

    group.add(deck, railLeft, railRight);
    this.scene.add(group);

    const bridge = { fromIsland, toIsland, group, deck, railLeft, railRight };
    this.bridges.push(bridge);
    return bridge;
  }

  _updateBridgeTransforms() {
    for (const bridge of this.bridges) {
      const from = bridge.fromIsland;
      const to = bridge.toIsland;

      const dx = to.center.x - from.center.x;
      const dz = to.center.z - from.center.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.001) {
        continue;
      }

      const nx = dx / distance;
      const nz = dz / distance;

      const startX = from.center.x + nx * from.radius * from.scale * 0.88;
      const startZ = from.center.z + nz * from.radius * from.scale * 0.88;
      const endX = to.center.x - nx * to.radius * to.scale * 0.88;
      const endZ = to.center.z - nz * to.radius * to.scale * 0.88;

      const spanX = endX - startX;
      const spanZ = endZ - startZ;
      const span = Math.hypot(spanX, spanZ);

      bridge.group.position.set((startX + endX) * 0.5, this.state.waterLevel + 0.42, (startZ + endZ) * 0.5);
      bridge.group.rotation.y = Math.atan2(spanZ, spanX);
      bridge.deck.scale.set(span, 1, 1);
      bridge.railLeft.scale.set(span, 1, 1);
      bridge.railRight.scale.set(span, 1, 1);
    }
  }

  _findNearestIsland(island) {
    let nearest = null;
    let nearestDistance = Infinity;

    for (const candidate of this.islands) {
      if (candidate === island) {
        continue;
      }

      const distance = Math.hypot(candidate.center.x - island.center.x, candidate.center.z - island.center.z);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = candidate;
      }
    }

    return nearest;
  }

  addConnectedIsland(autoTriggered) {
    if (this.islands.length >= this.performancePreset.maxIslands) {
      if (!autoTriggered) {
        this.log("Map limit reached for this quality level. Increase quality or grow current islands.");
      }
      return null;
    }

    const anchor = this.selectedIsland ?? this.islands[Math.floor(Math.random() * this.islands.length)];
    const radius = lerp(24, 38, Math.random());

    let center = null;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = anchor.radius * anchor.scale + radius + lerp(24, 44, Math.random());
      const candidate = new THREE.Vector3(
        anchor.center.x + Math.cos(angle) * distance,
        0,
        anchor.center.z + Math.sin(angle) * distance
      );

      let valid = true;
      for (const existing of this.islands) {
        const minGap = existing.radius * existing.scale + radius + 10;
        const gap = Math.hypot(candidate.x - existing.center.x, candidate.z - existing.center.z);
        if (gap < minGap) {
          valid = false;
          break;
        }
      }

      if (valid) {
        center = candidate;
        break;
      }
    }

    if (!center) {
      const fallbackAngle = Math.random() * Math.PI * 2;
      center = new THREE.Vector3(
        anchor.center.x + Math.cos(fallbackAngle) * (anchor.radius * anchor.scale + radius + 50),
        0,
        anchor.center.z + Math.sin(fallbackAngle) * (anchor.radius * anchor.scale + radius + 50)
      );
    }

    const island = this._createIsland(center, radius);
    island.setScale(Number(this.controlsRef.islandScale.value));

    const nearest = this._findNearestIsland(island);
    if (nearest) {
      this._createBridge(nearest, island);
    }

    this._setSelectedIsland(island);
    this._updateBridgeTransforms();

    if (!autoTriggered) {
      this.log("A connected island rose from the sea.");
    }

    return island;
  }

  _harmonyScore() {
    const islandCount = this.islands.length;
    const animalCount = this.animals.length;
    const fishCount = this.fish.length;
    const humanCount = this.humans.length;
    const hutCount = this.huts.length;
    const plazaCount = this.villagePlazas.length;

    let rootedTrees = 0;
    for (const island of this.islands) {
      for (const tree of island.trees) {
        if (tree.baseVisible !== false) {
          rootedTrees += 1;
        }
      }
    }

    const species = new Set();
    for (const animal of this.animals) {
      species.add(animal.species);
    }
    for (const fish of this.fish) {
      species.add(fish.species);
    }

    const treeScore = clamp((rootedTrees / Math.max(1, islandCount * 55)) * 24, 0, 24);
    const animalScore = clamp((animalCount / Math.max(1, islandCount * 6)) * 16, 0, 16);
    const fishScore = clamp((fishCount / Math.max(1, islandCount * 9)) * 8, 0, 8);
    const speciesScore = clamp(species.size * 2.6, 0, 10);
    const villageScore = clamp(plazaCount * 6, 0, 12);
    const toolScore = clamp(this.state.items.tools * 2.5, 0, 10);
    const bridgeScore = clamp((this.bridges.length / Math.max(1, islandCount - 1)) * 8, 0, 8);
    const careBonus = clamp(this.state.ecoCare * 0.18, 0, 13);

    const capacity = Math.max(
      10,
      rootedTrees * 0.22 +
        animalCount * 0.8 +
        fishCount * 0.42 +
        hutCount * 2 +
        plazaCount * 6 +
        this.state.items.tools * 1.2
    );
    const pressurePenalty = clamp((humanCount / capacity) * 36, 0, 32);

    const floodedHuts = this.huts.filter((hut) => hut.flooded).length;
    const floodedPlazas = this.villagePlazas.filter((plaza) => plaza.flooded).length;
    const floodPenalty = floodedHuts * 5 + floodedPlazas * 8;
    const gatherPenalty = clamp(this.state.gatherStrain * 0.42, 0, 35);

    this.state.harmony = clamp(
      18 +
        treeScore +
        animalScore +
        fishScore +
        speciesScore +
        villageScore +
        toolScore +
        bridgeScore +
        careBonus -
        pressurePenalty -
        floodPenalty -
        gatherPenalty,
      0,
      100
    );
    return this.state.harmony;
  }

  triggerGrowthPulse(autoTriggered) {
    if (!this.state.civilizationUnlocked) {
      if (!autoTriggered) {
        this.log("Introduce humans first to start civilization growth.");
      }
      return;
    }

    const harmony = this._harmonyScore();
    if (harmony < 35) {
      if (!autoTriggered) {
        this.log("Harmony is too low. Add greenery and reduce flooding before growth.");
      }
      return;
    }

    let bestIsland = this.islands[0];
    let bestNeed = -Infinity;

    for (const island of this.islands) {
      const treeCount = island.trees.filter((tree) => tree.baseVisible !== false).length;
      const capacity = treeCount * 0.25 + island.animals.length * 0.6 + 3;
      const population = island.humans.length + island.huts.length * 0.6;
      const need = capacity - population;
      if (need > bestNeed) {
        bestNeed = need;
        bestIsland = island;
      }
    }

    const addHumans = harmony > 78 ? 2 : 1;
    const shouldAddHut = bestIsland.humans.length > bestIsland.huts.length * 3;
    this._spawnSettlement(bestIsland, addHumans, shouldAddHut ? 1 : 0);

    if (harmony > 80 && this.islands.length < this.performancePreset.maxIslands && Math.random() < 0.4) {
      this.addConnectedIsland(true);
      if (!autoTriggered) {
        this.log("High harmony opened migration routes to a new island.");
      }
    } else if (!autoTriggered) {
      this.log("Settlers expanded peacefully.");
    }
  }

  _updateSelectionRing(elapsed) {
    if (!this.selectedIsland) {
      this.selectionRing.visible = false;
      return;
    }

    const island = this.selectedIsland;
    this.selectionRing.visible = true;
    this.selectionRing.position.set(
      island.center.x,
      Math.max(this.state.waterLevel + 0.06, island.sampleHeightLocal(0, 0) + 0.08),
      island.center.z
    );
    this.selectionRing.scale.setScalar(island.radius * island.scale);

    this.selectionRing.material.opacity = 0.55 + Math.sin(elapsed * 2.4) * 0.13;
  }

  _updateStatusUI() {
    const speciesSet = new Set();
    for (const animal of this.animals) {
      speciesSet.add(animal.species);
    }
    for (const fish of this.fish) {
      speciesSet.add(fish.species);
    }

    this._setDisplayValue("statIslands", this.islands.length, this.controlsRef.statIslands);
    this._setDisplayValue("statAnimals", this.animals.length, this.controlsRef.statAnimals);
    this._setDisplayValue("statFish", this.fish.length, this.controlsRef.statFish);
    this._setDisplayValue("statSpecies", speciesSet.size, this.controlsRef.statSpecies);
    this._setDisplayValue("statHumans", this.humans.length, this.controlsRef.statHumans);
    this._setDisplayValue("statHuts", this.huts.length, this.controlsRef.statHuts);
    this._setDisplayValue("statPlazas", this.villagePlazas.length, this.controlsRef.statPlazas);
    this._setDisplayValue("statGardens", this.state.gardens, this.controlsRef.statGardens);
    this._setDisplayValue("hudHumans", this.humans.length, this.controlsRef.hudHumans);
    this._setDisplayValue("hudHuts", this.huts.length, this.controlsRef.hudHuts);
    this._setDisplayValue("hudPlazas", this.villagePlazas.length, this.controlsRef.hudPlazas);
    this._setDisplayValue("hudFish", this.fish.length, this.controlsRef.hudFish);
    this._setDisplayValue("hudSpecies", speciesSet.size, this.controlsRef.hudSpecies);

    const harmony = Math.round(this._harmonyScore());
    this._setDisplayValue("harmonyScore", harmony, this.controlsRef.harmonyScore);
    this._setDisplayValue("hudHarmony", harmony, this.controlsRef.hudHarmony);
    this.controlsRef.harmonyFill.style.width = `${harmony}%`;
    this.controlsRef.hudHarmonyFill.style.width = `${harmony}%`;
    this._updateBuilderUI();
  }

  _animate(now) {
    const elapsed = now * 0.001;
    const delta = Math.min((now - this.lastTime) * 0.001, 0.05);
    this.lastTime = now;

    if (this.controls.enabled) {
      this.controls.update();
    }

    this.sun.position.x = Math.cos(elapsed * 0.06) * 128;
    this.sun.position.z = Math.sin(elapsed * 0.06) * 128;

    this.water.position.y = this.state.waterLevel + Math.sin(elapsed * 0.9) * 0.05;
    this.waterMaterial.opacity = 0.63 + Math.sin(elapsed * 1.1) * 0.03;

    if (this.ecologyRefreshAccumulator > 0) {
      this.ecologyRefreshAccumulator -= delta;
      if (this.ecologyRefreshAccumulator <= 0) {
        for (const island of this.islands) {
          if (island.needsVegetationRegen) {
            this._regenerateVegetation(island);
          }
        }
      }
    }

    for (const island of this.islands) {
      if (island.needsObjectReposition) {
        this._repositionIslandStatics(island);
      }
    }

    this.frameCounter += 1;
    const doSimulation = this.frameCounter % this.performancePreset.simulationStride === 0;
    if (doSimulation) {
      const scaledDelta = delta * this.performancePreset.simulationStride;
      this._updateAnimals(scaledDelta, elapsed);
      this._updateFish(scaledDelta, elapsed);
      this._updateHutsAndHumans(scaledDelta);
    }

    this.lodAccumulator += delta;
    if (this.lodAccumulator > 0.25) {
      this.lodAccumulator = 0;
      this._updateTreeLodAll();
    }

    this.state.gatherCooldown = Math.max(0, this.state.gatherCooldown - delta);
    this.state.gatherStrain = Math.max(0, this.state.gatherStrain - delta * (this.state.gardens > 0 ? 1.15 : 0.75));
    this.state.ecoCare = Math.max(0, this.state.ecoCare - delta * 0.28);
    if (this.state.civilizationUnlocked) {
      this.resourceDripAccumulator += delta;
      if (this.resourceDripAccumulator >= 16) {
        this.resourceDripAccumulator = 0;
        this.gatherResources(false);
      }
    }

    this._harmonyScore();
    this._updatePhaseAndSailing(delta);
    this.lowHarmonyNoticeCooldown = Math.max(0, this.lowHarmonyNoticeCooldown - delta);
    this.highStrainNoticeCooldown = Math.max(0, this.highStrainNoticeCooldown - delta);
    if (this.state.civilizationUnlocked && this.state.harmony < 58 && this.lowHarmonyNoticeCooldown <= 0) {
      this.lowHarmonyNoticeCooldown = 18;
      this.log("Harmony is dropping. Add resources and avoid flooding to stabilize the island.", {
        toast: true,
        tone: "warn"
      });
    }

    if (this.state.civilizationUnlocked && this.state.gatherStrain > 64 && this.highStrainNoticeCooldown <= 0) {
      this.highStrainNoticeCooldown = 14;
      this.log("Over-harvesting is hurting harmony. Slow gathering and use gardening/tree care actions.", {
        toast: true,
        tone: "warn"
      });
    }

    this.statusAccumulator += delta;
    if (this.statusAccumulator > 0.2) {
      this.statusAccumulator = 0;
      this._updateStatusUI();
      this._refreshValueLabels();
    }

    this._updateSelectionRing(elapsed);

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this._animate);
  }
}

new IslandGame();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
