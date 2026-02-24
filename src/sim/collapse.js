import { bus } from '../engine/events.js';

const WARN_COOLDOWN = 3000; // Don't spam warnings
let _lastWarnTime = 0;

// Tipping point thresholds
const THRESHOLDS = {
  soilCritical: 0.12,
  vegCritical: 0.08,
  waterCritical: 0.04,
  overDeveloped: 0.35,
  speciesEndangered: 3,
  noVegTiles: 0.6, // 60%+ land tiles with veg < 0.05
  oceanLow: 0.12,       // ocean coverage dangerously low
  oceanCritical: 0.05,  // almost no ocean left — catastrophe
};

export function checkCollapseRisks(gameState) {
  const now = performance.now();
  if (now - _lastWarnTime < WARN_COOLDOWN) return;

  const island = gameState.islands[0];
  if (!island) return;

  const stats = island.stats;
  const tiles = island.world.tiles;
  const animals = island.entities.animals;
  const warnings = [];

  // Soil depletion
  if (stats.avgSoil < THRESHOLDS.soilCritical && stats.avgSoil > 0) {
    warnings.push({
      type: 'danger',
      icon: '⚠️',
      message: `Soil collapse imminent! Avg fertility: ${(stats.avgSoil * 100).toFixed(0)}%. Add protected zones.`,
      severity: 3,
    });
  }

  // Vegetation die-off
  if (stats.avgVeg < THRESHOLDS.vegCritical && stats.avgVeg > 0) {
    warnings.push({
      type: 'danger',
      icon: '🥀',
      message: `Vegetation crisis! Only ${(stats.avgVeg * 100).toFixed(0)}% cover. Plant forests to recover.`,
      severity: 3,
    });
  }

  // Drought
  if (stats.avgWater < THRESHOLDS.waterCritical) {
    warnings.push({
      type: 'warning',
      icon: '🏜️',
      message: `Severe drought! Water at ${(stats.avgWater * 100).toFixed(0)}%. Ecosystem at risk.`,
      severity: 2,
    });
  }

  // Over-development
  if (stats.landTiles > 0 && stats.developedTiles / stats.landTiles > THRESHOLDS.overDeveloped) {
    warnings.push({
      type: 'warning',
      icon: '🏗️',
      message: `Over-development! ${((stats.developedTiles / stats.landTiles) * 100).toFixed(0)}% developed. Reduce development in governance.`,
      severity: 2,
    });
  }

  // Species endangered
  const pop = stats.population || {};
  for (const [speciesId, count] of Object.entries(pop)) {
    if (count > 0 && count <= THRESHOLDS.speciesEndangered) {
      warnings.push({
        type: 'warning',
        icon: '🚨',
        message: `${speciesId} endangered! Only ${count} remaining. Protect their habitat.`,
        severity: 2,
      });
    }
  }

  // Bare land check (sampled)
  let bareLand = 0;
  let totalLand = 0;
  const w = tiles.w;
  const h = tiles.h;
  for (let y = 0; y < h; y += 4) {
    for (let x = 0; x < w; x += 4) {
      if (!tiles.isOcean(x, y)) {
        totalLand++;
        if (tiles.getVeg(x, y) < 0.05) bareLand++;
      }
    }
  }
  if (totalLand > 0 && bareLand / totalLand > THRESHOLDS.noVegTiles) {
    warnings.push({
      type: 'danger',
      icon: '🌾',
      message: `${((bareLand / totalLand) * 100).toFixed(0)}% of land is barren. Ecosystem cannot sustain life.`,
      severity: 3,
    });
  }

  // Ocean coverage crisis — water is the lifeblood of the island
  const oceanRatio = stats.oceanRatio ?? 0;
  if (oceanRatio < THRESHOLDS.oceanCritical) {
    warnings.push({
      type: 'danger',
      icon: '🌊',
      message: `CATASTROPHE: Ocean nearly gone (${(oceanRatio * 100).toFixed(0)}%)! The island cannot survive without water. Lower terrain to restore the sea.`,
      severity: 4,
    });
    bus.emit('storyEvent', {
      text: 'The ocean is vanishing. Without water, all life will perish.',
      type: 'warning',
      detail: 'Rivers dry up. Soil turns to dust. Animals collapse from thirst. This island is dying.',
    });
  } else if (oceanRatio < THRESHOLDS.oceanLow) {
    warnings.push({
      type: 'danger',
      icon: '🌊',
      message: `Ocean levels critical (${(oceanRatio * 100).toFixed(0)}%)! Water sustains all life — lower terrain to restore coastline.`,
      severity: 3,
    });
  }

  // Emit the most severe warning
  if (warnings.length > 0) {
    warnings.sort((a, b) => b.severity - a.severity);
    const w0 = warnings[0];
    bus.emit('notification', {
      message: w0.message,
      type: w0.type,
      icon: w0.icon,
    });
    _lastWarnTime = now;
  }
}
