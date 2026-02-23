# 🏝️ IslandCreator.com — Mobile‑First Island Building + Ecosystem Governance (HTML/CSS/JS + Vercel)

**IslandCreator** is a calm, creation-first, mobile-first browser game where players **build islands**, **introduce nature and animals**, and **govern systems** that cause ecosystems to **thrive, adapt, or collapse** over time.

- **Tech:** Pure HTML5 + CSS + Vanilla JS (ES Modules)
- **Render:** Canvas (2D) + lightweight DOM UI
- **Deploy:** Vercel static hosting
- **Gameplay Pillars:** Create → Simulate → Govern → Observe → Iterate

---

## 🎮 What the Player Does

Players can:

- Generate one or many islands (procedural terrain)
- Sculpt coastline, elevation, rivers
- Paint biomes (forest, jungle, grassland, desert, tundra)
- Add animals and observe behavior (migration, reproduction, predation)
- Zone land (protected areas, villages, farms)
- Set governance rules (hunting limits, conservation, development speed, taxes)
- Run time forward and watch emergent outcomes

**Non-violent** as a design principle: no weapons, no combat loops. The drama comes from **systems**.

---

# ✅ Game Architecture (Actual Design)

This section defines the **real technical architecture** for a production-ready v1 and a scalable v2.

---

## 1) High-Level System Map

**IslandCreator** is composed of five core layers:

1. **Engine Layer**  
   Timing, update loop, input, events, entity registry, services.

2. **Simulation Layer**  
   Ecosystem math (climate, water, soil, growth), animals, humans (optional), governance effects.

3. **World Layer**  
   Terrain generation, tile/grid management, island chunks, biome painting, map queries.

4. **Presentation Layer**  
   Rendering (Canvas), UI (DOM), camera/viewport, animations.

5. **Persistence + Platform Layer**  
   Save/load (localStorage / IndexedDB), settings, PWA-ready, Vercel deployment.

---

## 2) Rendering & World Representation

### Choice: **Grid + Continuous Height**
Use a **tile grid** for simulation and rules, and a **heightmap** for visuals.

- **Grid:** `width x height` (e.g., 128x128 for v1; 256x256 for v2)
- **Tile Cell Fields (v1):**
  - `h` elevation (0..1 float)
  - `water` (0..1)
  - `soil` fertility (0..1)
  - `biome` enum
  - `veg` vegetation density (0..1)
  - `temp` temperature (0..1)
  - `protected` bool
  - `developed` bool (village/farm)
- **Entity Layer:** animals + structures exist as separate lists with positions in world coordinates.

### Why this works
- Grid makes ecosystem computation cheap and predictable.
- Heightmap makes the world feel organic.
- Chunking later lets it scale to multiple islands.

---

## 3) Core Game Loop (Fixed Timestep)

Use a fixed timestep for stable simulation:

- **Render:** as fast as possible via `requestAnimationFrame`
- **Sim Tick:** fixed rate (e.g., 10 ticks/sec) using accumulator

**Loop**
1. Gather input → translate to intents
2. Simulate world tick(s)
3. Render world + UI
4. Persist autosave (throttled)

---

## 4) Data Model

### GameState (single source of truth)
```js
GameState = {
  meta: { version, seed, createdAt, lastSavedAt },
  settings: { sound, haptics, graphicsQuality, simSpeed },
  camera: { x, y, zoom },
  islands: [ IslandState, ... ],
  activeIslandId: "island_001",
  governance: GovernanceState,
  time: { day, season, year, tick },
  resources: { budget, food, materials }, // optional for v1
  flags: { tutorialDone }
}
```

### IslandState
```js
IslandState = {
  id: "island_001",
  name: "My First Island",
  size: { w: 128, h: 128 },
  world: {
    tiles: TileGrid,          // typed arrays recommended
    heightmap: Float32Array,  // or same as elevation in tiles
    rivers: RiverGraph,       // v2
  },
  entities: {
    animals: AnimalEntity[],
    plants: PlantEntity[],    // optional if using only tile veg density
    structures: StructureEntity[]
  },
  stats: IslandStats
}
```

### GovernanceState (policy knobs)
```js
GovernanceState = {
  conservation: 0.0..1.0,     // how strongly nature is protected
  development: 0.0..1.0,      // how fast land can be developed
  huntingLimit: 0..100,       // max allowed per season (or off)
  protectedZones: Zone[],     // rectangles/polygons mapped to tiles
  taxes: 0.0..1.0,            // slows growth but increases budget
  enforcement: 0.0..1.0       // policy effectiveness
}
```

### AnimalEntity
```js
AnimalEntity = {
  id,
  speciesId,
  x, y,                       // world coords
  energy: 0..1,
  ageDays,
  sex: "F"|"M",
  hunger: 0..1,
  thirst: 0..1,
  fear: 0..1,
  state: "wander"|"seekFood"|"seekWater"|"flee"|"mate"|"rest",
  target: { x, y } | null
}
```

---

## 5) Simulation Model (V1)

V1 focuses on **simple, readable** rules that create visible emergence.

### Tile Simulation (each tick or batched)
- Water diffuses downhill and evaporates
- Soil fertility rises with water + vegetation; drops with over-development
- Vegetation grows with fertility + water + suitable temperature
- Biome transitions can occur slowly if climate shifts (v2)

### Animal Simulation (agent-lite)
- Animals pick behaviors based on hunger/thirst/fear
- Herbivores eat vegetation density (tile-level consumption)
- Predators hunt herbivores (simple chase)
- Reproduction happens when conditions are met

### Governance Simulation (policy effects)
Policies modify rates:
- Conservation ↑ → less development impact; protects veg/soil
- Development ↑ → more structures; lowers soil; increases runoff
- HuntingLimit ↓ → preserves population; reduces short-term food gain
- ProtectedZones → blocks hunting + development in zones
- Enforcement affects whether rules actually apply

---

## 6) Input System (Mobile)

Use **pointer events** (covers touch + mouse):
- Tap: select tool / place item
- Drag: paint biomes / sculpt terrain
- Pinch: zoom
- Two-finger drag: pan
- Long press: context radial menu

**Design rule:** Everything must be playable with one thumb.

---

## 7) UI Architecture

### UI = DOM overlay (fast iteration)
- Bottom toolbar: tools (terrain, biome, animals, zoning, governance, time)
- Right side: inspector panel (tile stats, species stats, policy sliders)
- Top: island name, time controls, menu

### Tool System
Tools are modular:
- `ToolTerrainSculpt`
- `ToolBiomePaint`
- `ToolPlaceAnimal`
- `ToolZoneProtect`
- `ToolBuildVillage`
- `ToolGovernance`

Each tool implements:
- `onPointerDown / Move / Up`
- `renderOverlay(ctx)` for ghost previews
- `getCursor()` for UX clarity

---

## 8) Performance Plan (So It Runs Smooth on Phones)

### V1 targets
- 60fps render
- 10 sim ticks/sec (adjustable)

### Techniques
- Use **typed arrays** for tiles (Float32Array / Uint8Array)
- Do simulation in **chunks** (e.g., process 1/10th of tiles per tick)
- Keep DOM minimal; update UI with throttling
- Avoid per-frame allocations; reuse objects
- Use spatial hashing for animals (grid bucket by tile)

---

## 9) Saving & Loading

### V1: localStorage (simple)
- Serialize GameState to JSON
- Compress later (v2)

### V2: IndexedDB (large worlds + multiple islands)
- Store per-island chunks
- Store entity lists separately
- Autosave every N seconds + on blur/unload

Autosave logic should be throttled:
- only when “dirty”
- only every 10–30 seconds

---

## 10) Recommended Folder Structure (Real)

```text
/public
  index.html
  styles.css
  manifest.webmanifest        # optional PWA
  icons/                      # PWA icons

/src
  main.js                     # bootstraps game
  engine/
    gameLoop.js               # fixed timestep loop
    events.js                 # event bus
    input.js                  # pointer + gesture processing
    rng.js                    # seeded RNG
    scheduler.js              # throttled tasks (autosave, UI update)
  world/
    terrainGen.js             # island generation
    tiles.js                  # tile grid + typed array helpers
    biomes.js                 # biome definitions + rules
    zones.js                  # protected / developed zones
  sim/
    simTick.js                # orchestrates sim subsystems
    climate.js
    water.js
    soil.js
    vegetation.js
    animals.js
    governance.js
    stats.js
  render/
    renderer.js               # draw world
    camera.js
    sprites.js                # optional; v1 can be procedural shapes
    overlays.js               # tool previews, selection rings
  ui/
    ui.js                     # UI mount + event wiring
    hud.js
    toolbar.js
    inspector.js
    tutorial.js
  data/
    species.js                # species list + traits
    constants.js
  storage/
    save.js
    load.js
    migrations.js             # save version upgrades

/vercel.json
/README.md
```

---

## 11) Subsystem Contracts (How Modules Talk)

### Engine → Simulation
- Calls `simTick(GameState, dt)`

### Simulation → World
- Reads/writes `tiles`, entity positions, island stats

### Simulation → UI
- Emits events:
  - `statsUpdated`
  - `policyChanged`
  - `selectionChanged`
  - `warning` (collapse risk, drought)

### UI → Engine
- Dispatches intents:
  - `setTool(toolId)`
  - `applyBrush(x,y,amount)`
  - `spawnAnimal(speciesId,x,y)`
  - `setPolicy(key,value)`
  - `setSimSpeed(multiplier)`

---

## 12) Systems That Make It Feel “Alive” (Design Cheats)

These are simple, high-impact mechanics:

- **Seasons:** shift temperature + rainfall cyclically
- **Carrying Capacity:** vegetation sets max herbivores; herbivores set max predators
- **Drought & Flood:** based on water cycle extremes
- **Protected Zones:** instantly visible effect on biodiversity
- **Collapse Warnings:** UI signals when tipping points are near (soil depletion, extinction risk)

---

# 🧪 MVP Scope (Build This First)

### ✅ MVP Goal: “One island, 3 biomes, 4 species, policies + time controls”

**Tools**
- Sculpt elevation (raise/lower)
- Paint biome
- Place animals
- Draw protected zone

**Systems**
- Vegetation growth
- Herbivore grazing
- Predator hunting
- Water/soil feedback
- Policy sliders affect rates

**UI**
- Bottom toolbar
- Right inspector
- Time controls (pause / play / 2x / 5x)

---

# 🔥 V2 Expansion (The Real Dream)

- Multi-island archipelago map
- Boats + migration between islands
- Citizens + culture values (eco-minded vs extractive)
- Diplomacy between island governments
- Trade system (food/materials/biodiversity credits)
- Procedural species evolution (traits drift over generations)
- Climate change scenarios & long-term stewardship challenges

---

# 🚀 Getting Started (Local + Vercel)

## Local
```bash
# simplest: open public/index.html in your browser
# or serve the /public folder:

npx serve public
```

## Deploy to Vercel
```bash
npm i -g vercel
vercel
```

---

# 🧩 Contribution Guidelines

- Keep v1 framework-free
- Favor clarity over cleverness
- Every feature must work on mobile Safari + Chrome
- Avoid heavy assets; procedural art preferred
- No violence loops; keep it creative + ecological

---

# 📜 License

MIT — build freely, remix boldly.

---

# 🏝️ IslandCreator.com
**Build your world. Govern with care. Then watch it live.**
