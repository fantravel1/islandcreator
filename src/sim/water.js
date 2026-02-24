export function simulateWater(tiles, chunkStart, chunkEnd) {
  const w = tiles.w;
  const h = tiles.h;

  for (let i = chunkStart; i < chunkEnd; i++) {
    const x = i % w;
    const y = (i / w) | 0;

    if (tiles.isOcean(x, y)) continue;

    let water = tiles.getWater(x, y);
    const elev = tiles.getH(x, y);

    // Evaporation (faster in hot areas)
    const temp = tiles.getTemp(x, y);
    water -= 0.002 + temp * 0.003;

    // Water flows downhill to neighbors
    const neighbors = tiles.neighbors4(x, y);
    for (let n = 0; n < neighbors.length; n++) {
      const [nx, ny] = neighbors[n];
      const nElev = tiles.getH(nx, ny);

      if (nElev < elev && water > 0.05) {
        const flow = (elev - nElev) * 0.02;
        const transfer = Math.min(water * 0.1, flow);
        water -= transfer;
        // Add to neighbor (safe since we're reading/writing small amounts)
        tiles.setWater(nx, ny, Math.min(1, tiles.getWater(nx, ny) + transfer));
      }
    }

    tiles.setWater(x, y, Math.max(0, Math.min(1, water)));
  }
}
