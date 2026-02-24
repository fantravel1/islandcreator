import { SPECIES_LIST } from '../data/species.js';

// Ecosystem health score (0-100)
export function computeEcoScore(gameState) {
  const island = gameState.islands[0];
  if (!island) return 0;

  const stats = island.stats;
  const animals = island.entities.animals;
  let score = 0;

  // 1. Biodiversity (0-25): all species present and balanced
  const pop = stats.population || {};
  const speciesPresent = SPECIES_LIST.filter(s => (pop[s.id] || 0) > 0).length;
  const totalSpecies = SPECIES_LIST.length;
  const bioDiv = speciesPresent / totalSpecies;
  score += bioDiv * 15;

  // Balance bonus: populations not too skewed
  if (speciesPresent >= 2) {
    const counts = SPECIES_LIST.map(s => pop[s.id] || 0).filter(c => c > 0);
    const maxPop = Math.max(...counts);
    const minPop = Math.min(...counts);
    const balance = maxPop > 0 ? minPop / maxPop : 0;
    score += balance * 10;
  }

  // 2. Vegetation health (0-20)
  const vegScore = Math.min(1, stats.avgVeg / 0.4) * 20;
  score += vegScore;

  // 3. Soil fertility (0-15)
  const soilScore = Math.min(1, stats.avgSoil / 0.5) * 15;
  score += soilScore;

  // 4. Water availability (0-10)
  const waterScore = Math.min(1, stats.avgWater / 0.2) * 10;
  score += waterScore;

  // 5. Conservation effort (0-15): protected vs developed ratio
  if (stats.landTiles > 0) {
    const protectedRatio = stats.protectedTiles / stats.landTiles;
    const developedRatio = stats.developedTiles / stats.landTiles;
    const conservScore = Math.min(1, protectedRatio * 3) * 10 + Math.max(0, (0.3 - developedRatio) / 0.3) * 5;
    score += conservScore;
  }

  // 6. Animal population health (0-15)
  if (stats.totalAnimals > 0) {
    // Healthy pop = between 20 and 120
    const popHealth = stats.totalAnimals >= 20 && stats.totalAnimals <= 150
      ? 1
      : stats.totalAnimals < 20
        ? stats.totalAnimals / 20
        : Math.max(0, 1 - (stats.totalAnimals - 150) / 100);
    score += popHealth * 15;
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

export function getEcoRating(score) {
  if (score >= 90) return { grade: 'S', label: 'Pristine Paradise', color: '#FFD700' };
  if (score >= 75) return { grade: 'A', label: 'Thriving', color: '#3aaf50' };
  if (score >= 60) return { grade: 'B', label: 'Healthy', color: '#50cf50' };
  if (score >= 45) return { grade: 'C', label: 'Stable', color: '#e0a030' };
  if (score >= 30) return { grade: 'D', label: 'Struggling', color: '#e08030' };
  if (score >= 15) return { grade: 'E', label: 'Endangered', color: '#e05050' };
  return { grade: 'F', label: 'Collapse', color: '#ff2020' };
}
