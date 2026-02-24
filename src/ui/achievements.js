import { bus } from '../engine/events.js';

const ACHIEVEMENTS = [
  { id: 'first_island', name: 'Island Architect', desc: 'Create your first island', icon: '🏝️', check: (gs) => true },
  { id: 'population_50', name: 'Thriving Ecosystem', desc: 'Reach 50 total animals', icon: '🦌', check: (gs) => gs.islands[0]?.stats.totalAnimals >= 50 },
  { id: 'population_100', name: 'Wildlife Haven', desc: 'Reach 100 total animals', icon: '🐾', check: (gs) => gs.islands[0]?.stats.totalAnimals >= 100 },
  { id: 'all_species', name: 'Biodiversity Champion', desc: 'Have all 4 species alive simultaneously', icon: '🌈',
    check: (gs) => {
      const pop = gs.islands[0]?.stats.population || {};
      return Object.values(pop).every(c => c > 0);
    }
  },
  { id: 'year_5', name: 'Steady Steward', desc: 'Reach Year 5', icon: '📅', check: (gs) => gs.time.year >= 5 },
  { id: 'year_10', name: 'Veteran Governor', desc: 'Reach Year 10', icon: '🏛️', check: (gs) => gs.time.year >= 10 },
  { id: 'eco_score_75', name: 'Grade A Island', desc: 'Achieve ecosystem score 75+', icon: '⭐', checkScore: true, threshold: 75 },
  { id: 'eco_score_90', name: 'Pristine Paradise', desc: 'Achieve ecosystem score 90+', icon: '🌟', checkScore: true, threshold: 90 },
  { id: 'protected_25', name: 'Conservationist', desc: 'Protect 25% of land', icon: '🛡️',
    check: (gs) => {
      const s = gs.islands[0]?.stats;
      return s && s.landTiles > 0 && s.protectedTiles / s.landTiles >= 0.25;
    }
  },
  { id: 'veg_high', name: 'Green Paradise', desc: 'Average vegetation above 60%', icon: '🌿', check: (gs) => gs.islands[0]?.stats.avgVeg >= 0.6 },
  { id: 'survive_drought', name: 'Drought Survivor', desc: 'Survive a drought with all species intact', icon: '💪', event: 'droughtSurvived' },
  { id: 'sculpt_master', name: 'Terraformer', desc: 'Use sculpt tool 50 times', icon: '⛰️', counter: 'sculptCount', target: 50 },
];

export class AchievementSystem {
  constructor(container) {
    this.container = container;
    this.unlocked = new Set();
    this.counters = {};
    this._ecoScore = 0;

    // Listen for counter events
    bus.on('sculptApplied', () => {
      this.counters.sculptCount = (this.counters.sculptCount || 0) + 1;
    });
  }

  loadState(flags) {
    if (flags?.achievements) {
      this.unlocked = new Set(flags.achievements);
    }
    if (flags?.achievementCounters) {
      this.counters = { ...flags.achievementCounters };
    }
  }

  saveState(flags) {
    flags.achievements = [...this.unlocked];
    flags.achievementCounters = { ...this.counters };
  }

  setEcoScore(score) {
    this._ecoScore = score;
  }

  check(gameState) {
    for (const a of ACHIEVEMENTS) {
      if (this.unlocked.has(a.id)) continue;

      let earned = false;

      if (a.check) {
        earned = a.check(gameState);
      } else if (a.checkScore) {
        earned = this._ecoScore >= a.threshold;
      } else if (a.counter) {
        earned = (this.counters[a.counter] || 0) >= a.target;
      }

      if (earned) {
        this.unlocked.add(a.id);
        this._showUnlock(a);
        gameState._dirty = true;
      }
    }
  }

  _showUnlock(achievement) {
    bus.emit('notification', {
      message: `Achievement: ${achievement.name}!`,
      type: 'success',
      icon: achievement.icon,
    });

    // Show achievement banner
    const banner = document.createElement('div');
    banner.className = 'achievement-banner';
    banner.innerHTML = `
      <div class="achievement-icon">${achievement.icon}</div>
      <div class="achievement-info">
        <div class="achievement-title">${achievement.name}</div>
        <div class="achievement-desc">${achievement.desc}</div>
      </div>
    `;
    this.container.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('show'));

    setTimeout(() => {
      banner.classList.add('hide');
      setTimeout(() => banner.remove(), 500);
    }, 4000);

    if (navigator.vibrate) navigator.vibrate([20, 50, 20, 50, 20]);
  }

  getProgress() {
    return {
      total: ACHIEVEMENTS.length,
      unlocked: this.unlocked.size,
      list: ACHIEVEMENTS.map(a => ({
        ...a,
        unlocked: this.unlocked.has(a.id),
      })),
    };
  }
}
