export class ZoneManager {
  constructor(tiles) {
    this.tiles = tiles;
    this.zones = [];
    this.nextId = 1;
  }

  addZone(x1, y1, x2, y2) {
    const minX = Math.max(0, Math.min(x1, x2));
    const minY = Math.max(0, Math.min(y1, y2));
    const maxX = Math.min(this.tiles.w - 1, Math.max(x1, x2));
    const maxY = Math.min(this.tiles.h - 1, Math.max(y1, y2));

    const zone = { id: this.nextId++, x1: minX, y1: minY, x2: maxX, y2: maxY };
    this.zones.push(zone);

    // Mark tiles as protected
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (this.tiles.isLand(x, y)) {
          this.tiles.setProtected(x, y, true);
        }
      }
    }

    return zone;
  }

  removeZone(id) {
    const idx = this.zones.findIndex(z => z.id === id);
    if (idx < 0) return;

    const zone = this.zones[idx];
    this.zones.splice(idx, 1);

    // Unmark tiles (unless covered by another zone)
    for (let y = zone.y1; y <= zone.y2; y++) {
      for (let x = zone.x1; x <= zone.x2; x++) {
        if (!this._coveredByOtherZone(x, y, id)) {
          this.tiles.setProtected(x, y, false);
        }
      }
    }
  }

  _coveredByOtherZone(x, y, excludeId) {
    for (const z of this.zones) {
      if (z.id === excludeId) continue;
      if (x >= z.x1 && x <= z.x2 && y >= z.y1 && y <= z.y2) return true;
    }
    return false;
  }

  toggleTile(x, y) {
    if (!this.tiles.inBounds(x, y) || !this.tiles.isLand(x, y)) return;
    const current = this.tiles.isProtected(x, y);
    this.tiles.setProtected(x, y, !current);
  }

  toJSON() {
    return { zones: this.zones, nextId: this.nextId };
  }

  loadJSON(data) {
    if (!data) return;
    this.zones = data.zones || [];
    this.nextId = data.nextId || 1;
  }
}
