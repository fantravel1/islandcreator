import { bus } from '../engine/events.js';
import { SPECIES } from '../data/species.js';

// Name pools per species type
const HERBIVORE_NAMES = [
  'Sage', 'Willow', 'Clover', 'Fern', 'Birch', 'Hazel', 'Maple', 'Reed',
  'Thistle', 'Briar', 'Moss', 'Ivy', 'Holly', 'Aspen', 'Laurel', 'Cedar',
  'Ember', 'Luna', 'Bloom', 'Gale', 'Mist', 'Cloud', 'Dusk', 'Dawn',
];

const PREDATOR_NAMES = [
  'Shadow', 'Fang', 'Storm', 'Blaze', 'Ghost', 'Scar', 'Flint', 'Onyx',
  'Thunder', 'Cinder', 'Ash', 'Raven', 'Titan', 'Iron', 'Ridge', 'Thorn',
  'Hawk', 'Vex', 'Pike', 'Drake', 'Frost', 'Viper', 'Dagger', 'Stone',
];

// Titles earned by actions
function _getTitle(a, notable) {
  if (notable.kills >= 10) return 'the Apex';
  if (notable.kills >= 5) return 'the Hunter';
  if (notable.children >= 8) return 'the Matriarch';
  if (notable.children >= 4) return 'the Elder';
  if (a.ageDays >= 800) return 'the Ancient';
  if (a.ageDays >= 400) return 'the Wise';
  if (notable.survived_events >= 2) return 'the Survivor';
  return 'the Notable';
}

export class NotableSystem {
  constructor() {
    this.notables = new Map(); // animalId → { name, kills, children, survived_events }
    this._usedNames = new Set();
    this._checkCounter = 0;
  }

  loadState(flags) {
    if (flags?.notables) {
      this.notables = new Map(flags.notables);
      for (const [, data] of this.notables) {
        this._usedNames.add(data.name);
      }
    }
  }

  saveState(flags) {
    flags.notables = [...this.notables.entries()];
  }

  // Track a kill by a predator
  recordKill(predatorId) {
    const n = this.notables.get(predatorId);
    if (n) n.kills = (n.kills || 0) + 1;
  }

  // Track a birth
  recordBirth(parentId) {
    const n = this.notables.get(parentId);
    if (n) n.children = (n.children || 0) + 1;
  }

  // Track surviving an event
  recordEventSurvival(animalId) {
    const n = this.notables.get(animalId);
    if (n) n.survived_events = (n.survived_events || 0) + 1;
  }

  // Get display info for an animal (null if not notable)
  getNotable(animalId) {
    return this.notables.get(animalId) || null;
  }

  // Get full display string
  getDisplayName(animal) {
    const n = this.notables.get(animal.id);
    if (!n) return null;
    const title = _getTitle(animal, n);
    return `${n.name} ${title}`;
  }

  // Pick a name for a species
  _pickName(speciesId) {
    const spec = SPECIES[speciesId];
    const pool = spec?.type === 'predator' ? PREDATOR_NAMES : HERBIVORE_NAMES;
    // Try to find unused name
    for (const name of pool) {
      if (!this._usedNames.has(name)) {
        this._usedNames.add(name);
        return name;
      }
    }
    // All used — pick random with suffix
    const base = pool[Math.floor(Math.random() * pool.length)];
    const suffix = (Math.random() * 99 + 1) | 0;
    const name = `${base} ${suffix}`;
    this._usedNames.add(name);
    return name;
  }

  // Run periodically to promote notable animals and narrate their stories
  update(animals) {
    this._checkCounter++;
    if (this._checkCounter % 3 !== 0) return; // Run every 3rd call (~15s)

    // Clean up dead notables
    const aliveIds = new Set(animals.map(a => a.id));
    for (const [id, data] of this.notables) {
      if (!aliveIds.has(id)) {
        const spec = SPECIES[data.speciesId];
        bus.emit('storyEvent', {
          text: `${data.name} the ${spec?.name || 'creature'} has passed away.`,
          type: 'death',
          detail: `Survived ${data.ageDaysAtDeath || '?'} days. ${data.kills ? data.kills + ' hunts.' : ''} ${data.children ? data.children + ' offspring.' : ''}`,
        });
        this._usedNames.delete(data.name);
        this.notables.delete(id);
      }
    }

    // Promote new notables — one per species, pick the most accomplished
    const speciesBest = {};
    for (const a of animals) {
      if (this.notables.has(a.id)) {
        // Update age tracking
        const n = this.notables.get(a.id);
        n.ageDaysAtDeath = a.ageDays;
        continue;
      }
      // Score: age + energy
      const score = a.ageDays * 2 + a.energy * 100;
      if (!speciesBest[a.speciesId] || score > speciesBest[a.speciesId].score) {
        speciesBest[a.speciesId] = { animal: a, score };
      }
    }

    // Promote one per species if that species has no notable
    const notableSpecies = new Set();
    for (const [, data] of this.notables) {
      notableSpecies.add(data.speciesId);
    }

    for (const [speciesId, { animal }] of Object.entries(speciesBest)) {
      if (notableSpecies.has(speciesId)) continue;
      // Only promote animals that have survived a while
      if (animal.ageDays < 50) continue;

      const name = this._pickName(speciesId);
      this.notables.set(animal.id, {
        name,
        speciesId,
        kills: 0,
        children: 0,
        survived_events: 0,
        ageDaysAtDeath: animal.ageDays,
      });

      const spec = SPECIES[speciesId];
      bus.emit('storyEvent', {
        text: `A ${spec?.name || 'creature'} has earned a name: ${name}.`,
        type: 'birth',
        detail: `Age ${animal.ageDays} days. Watch ${name} grow into a legend.`,
      });
    }

    // Milestone narration for existing notables
    for (const [id, data] of this.notables) {
      const animal = animals.find(a => a.id === id);
      if (!animal) continue;

      // Age milestones
      const ageMilestones = [200, 400, 600, 800];
      for (const milestone of ageMilestones) {
        const key = `age_${milestone}`;
        if (animal.ageDays >= milestone && !data[key]) {
          data[key] = true;
          const spec = SPECIES[data.speciesId];
          const title = _getTitle(animal, data);
          bus.emit('storyEvent', {
            text: `${data.name} ${title} (${spec?.name}) reached ${milestone} days old.`,
            type: 'event',
          });
        }
      }

      // Kill milestones for predators
      if (data.kills === 5 && !data._kill5) {
        data._kill5 = true;
        bus.emit('storyEvent', {
          text: `${data.name} has made 5 hunts — earning the title "the Hunter."`,
          type: 'event',
        });
      }
      if (data.kills === 10 && !data._kill10) {
        data._kill10 = true;
        bus.emit('storyEvent', {
          text: `${data.name} has become the apex predator with 10 hunts!`,
          type: 'warning',
        });
      }

      // Children milestones
      if (data.children === 4 && !data._child4) {
        data._child4 = true;
        bus.emit('storyEvent', {
          text: `${data.name} has raised 4 offspring — a growing lineage.`,
          type: 'event',
        });
      }
    }
  }

  // Get all living notables with display info
  getLivingNotables(animals) {
    const result = [];
    for (const [id, data] of this.notables) {
      const animal = animals.find(a => a.id === id);
      if (!animal) continue;
      const title = _getTitle(animal, data);
      result.push({
        id,
        name: data.name,
        title,
        fullName: `${data.name} ${title}`,
        speciesId: data.speciesId,
        species: SPECIES[data.speciesId],
        animal,
        kills: data.kills,
        children: data.children,
      });
    }
    return result;
  }
}
