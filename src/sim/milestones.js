import { bus } from '../engine/events.js';

// Island progression chapters - each has goals that unlock the next
const CHAPTERS = [
  {
    id: 'dawn',
    name: 'Dawn',
    subtitle: 'A New Beginning',
    desc: 'Your island is young. Nurture life and watch it grow.',
    goals: [
      { id: 'pop_10', label: 'Reach 10 animals', check: (gs) => gs.islands[0]?.stats.totalAnimals >= 10 },
      { id: 'veg_30', label: 'Average vegetation above 30%', check: (gs) => gs.islands[0]?.stats.avgVeg >= 0.3 },
      { id: 'species_2', label: 'Have at least 2 species alive', check: (gs) => _countSpecies(gs) >= 2 },
    ],
  },
  {
    id: 'settlement',
    name: 'Settlement',
    subtitle: 'First Footprints',
    desc: 'Life is taking hold. Build your first structures and shape the land.',
    goals: [
      { id: 'structure_1', label: 'Build your first structure', check: (gs) => (gs.islands[0]?.entities.structures?.length || 0) >= 1 },
      { id: 'pop_30', label: 'Reach 30 animals', check: (gs) => gs.islands[0]?.stats.totalAnimals >= 30 },
      { id: 'protect_10', label: 'Protect at least 10% of land', check: (gs) => _protectedPct(gs) >= 0.10 },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    subtitle: 'A Balancing Act',
    desc: 'Development and nature must coexist. Find the balance.',
    goals: [
      { id: 'eco_c', label: 'Reach C-grade ecosystem', checkScore: true, threshold: 45 },
      { id: 'species_all', label: 'All 4 original species alive', check: (gs) => _countSpecies(gs) >= 4 },
      { id: 'year_3', label: 'Reach Year 3', check: (gs) => gs.time.year >= 3 },
    ],
  },
  {
    id: 'harmony',
    name: 'Harmony',
    subtitle: 'Nature and Civilization',
    desc: 'Your island thrives. Can you sustain this paradise?',
    goals: [
      { id: 'eco_b', label: 'Reach B-grade ecosystem', checkScore: true, threshold: 60 },
      { id: 'pop_80', label: 'Reach 80 animals', check: (gs) => gs.islands[0]?.stats.totalAnimals >= 80 },
      { id: 'village_pop', label: 'A village reaches 20 citizens', check: (gs) => _maxVillagePop(gs) >= 20 },
    ],
  },
  {
    id: 'legacy',
    name: 'Legacy',
    subtitle: 'A Living Legend',
    desc: 'Your island is legendary. Leave a mark that lasts.',
    goals: [
      { id: 'eco_a', label: 'Reach A-grade ecosystem', checkScore: true, threshold: 75 },
      { id: 'year_10', label: 'Reach Year 10', check: (gs) => gs.time.year >= 10 },
      { id: 'notable_elder', label: 'An animal survives 5+ years', check: (gs) => _hasElderAnimal(gs) },
    ],
  },
];

function _countSpecies(gs) {
  const pop = gs.islands[0]?.stats.population || {};
  return Object.values(pop).filter(c => c > 0).length;
}

function _protectedPct(gs) {
  const s = gs.islands[0]?.stats;
  if (!s || s.landTiles === 0) return 0;
  return s.protectedTiles / s.landTiles;
}

function _maxVillagePop(gs) {
  const structures = gs.islands[0]?.entities.structures || [];
  let max = 0;
  for (const s of structures) {
    if (s.typeId === 'village' && (s.population || 0) > max) {
      max = s.population;
    }
  }
  return max;
}

function _hasElderAnimal(gs) {
  const animals = gs.islands[0]?.entities.animals || [];
  // 5 years = 5 * 4 seasons * 30 days = 600 days
  return animals.some(a => a.ageDays >= 600);
}

export class MilestoneSystem {
  constructor() {
    this.currentChapter = 0;
    this.completedGoals = new Set();
    this._ecoScore = 0;
    this._lastChapterAnnounced = -1;
  }

  loadState(flags) {
    if (flags?.milestoneChapter !== undefined) {
      this.currentChapter = flags.milestoneChapter;
    }
    if (flags?.milestoneGoals) {
      this.completedGoals = new Set(flags.milestoneGoals);
    }
  }

  saveState(flags) {
    flags.milestoneChapter = this.currentChapter;
    flags.milestoneGoals = [...this.completedGoals];
  }

  setEcoScore(score) {
    this._ecoScore = score;
  }

  getChapter() {
    return CHAPTERS[this.currentChapter] || CHAPTERS[CHAPTERS.length - 1];
  }

  getProgress() {
    const ch = this.getChapter();
    const done = ch.goals.filter(g => this.completedGoals.has(g.id)).length;
    return { chapter: ch, done, total: ch.goals.length, goals: ch.goals.map(g => ({ ...g, completed: this.completedGoals.has(g.id) })) };
  }

  check(gameState) {
    if (this.currentChapter >= CHAPTERS.length) return;

    const ch = CHAPTERS[this.currentChapter];

    // Announce new chapter
    if (this._lastChapterAnnounced !== this.currentChapter) {
      this._lastChapterAnnounced = this.currentChapter;
      bus.emit('storyEvent', {
        text: `Chapter ${this.currentChapter + 1}: ${ch.name} — ${ch.subtitle}`,
        type: 'chapter',
        detail: ch.desc,
      });
    }

    let newlyCompleted = false;
    for (const goal of ch.goals) {
      if (this.completedGoals.has(goal.id)) continue;

      let passed = false;
      if (goal.checkScore) {
        passed = this._ecoScore >= goal.threshold;
      } else if (goal.check) {
        passed = goal.check(gameState);
      }

      if (passed) {
        this.completedGoals.add(goal.id);
        newlyCompleted = true;
        bus.emit('storyEvent', {
          text: `Goal complete: ${goal.label}`,
          type: 'goal',
        });
        if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
      }
    }

    // Check if all goals in chapter are done → advance
    const allDone = ch.goals.every(g => this.completedGoals.has(g.id));
    if (allDone && this.currentChapter < CHAPTERS.length - 1) {
      this.currentChapter++;
      const next = CHAPTERS[this.currentChapter];
      bus.emit('storyEvent', {
        text: `New chapter unlocked: ${next.name} — ${next.subtitle}`,
        type: 'chapter',
        detail: next.desc,
      });
      bus.emit('notification', {
        message: `Chapter ${this.currentChapter + 1}: ${next.name} unlocked!`,
        type: 'success',
        icon: '📖',
      });
      gameState._dirty = true;
    }

    if (newlyCompleted) {
      gameState._dirty = true;
    }
  }
}

export const CHAPTER_COUNT = CHAPTERS.length;
