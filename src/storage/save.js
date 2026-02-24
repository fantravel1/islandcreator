const SAVE_KEY = 'islandcreator_save';
const SAVE_VERSION = 1;

export function saveGame(gameState) {
  try {
    const data = {
      version: SAVE_VERSION,
      meta: gameState.meta,
      settings: gameState.settings,
      camera: { x: gameState._camera?.x, y: gameState._camera?.y, zoom: gameState._camera?.zoom },
      time: gameState.time,
      governance: gameState.governance,
      flags: gameState.flags,
      islands: gameState.islands.map(island => ({
        id: island.id,
        name: island.name,
        size: island.size,
        world: {
          tiles: island.world.tiles.toJSON(),
        },
        entities: {
          animals: island.entities.animals.map(a => ({
            id: a.id,
            speciesId: a.speciesId,
            x: a.x,
            y: a.y,
            energy: a.energy,
            ageDays: a.ageDays,
            sex: a.sex,
            hunger: a.hunger,
            thirst: a.thirst,
            fear: a.fear,
            state: a.state,
            cooldown: a.cooldown || 0,
          })),
          structures: (island.entities.structures || []).map(s => ({
            id: s.id,
            typeId: s.typeId,
            x: s.x,
            y: s.y,
            size: s.size,
            age: s.age,
            health: s.health,
            population: s.population,
            happiness: s.happiness,
            food: s.food,
          })),
        },
        stats: island.stats,
      })),
      zones: gameState._zoneManager?.toJSON(),
      weather: gameState._weatherSystem?.toJSON(),
    };

    const json = JSON.stringify(data);
    localStorage.setItem(SAVE_KEY, json);
    gameState.meta.lastSavedAt = Date.now();
    gameState._dirty = false;
    return true;
  } catch (e) {
    console.warn('Save failed:', e);
    return false;
  }
}
