export function createGovernanceState() {
  return {
    conservation: 0.5,
    development: 0.3,
    huntingLimit: 50,
    enforcement: 0.5,
    taxes: 0.2,
  };
}

export function applyGovernance(tiles, governance, chunkStart, chunkEnd) {
  const w = tiles.w;

  for (let i = chunkStart; i < chunkEnd; i++) {
    const x = i % w;
    const y = (i / w) | 0;

    if (tiles.isOcean(x, y)) continue;

    // High development pressure can convert land to developed
    if (!tiles.isDeveloped(x, y) && !tiles.isProtected(x, y)) {
      if (governance.development > 0.7 && Math.random() < 0.0001 * governance.development) {
        tiles.setDeveloped(x, y, true);
      }
    }

    // Conservation can slowly restore developed land
    if (tiles.isDeveloped(x, y) && tiles.isProtected(x, y)) {
      if (governance.conservation > 0.7 && Math.random() < 0.0002 * governance.conservation * governance.enforcement) {
        tiles.setDeveloped(x, y, false);
      }
    }
  }
}
