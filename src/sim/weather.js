import { bus } from '../engine/events.js';
import { createRng } from '../engine/rng.js';

const _rng = createRng(Date.now() ^ 0xDEAD);

// Weather states
export const WEATHER_CLEAR = 'clear';
export const WEATHER_RAIN = 'rain';
export const WEATHER_STORM = 'storm';
export const WEATHER_DROUGHT = 'drought';
export const WEATHER_HEATWAVE = 'heatwave';

const WEATHER_DURATION = {
  [WEATHER_CLEAR]: [200, 600],
  [WEATHER_RAIN]: [100, 300],
  [WEATHER_STORM]: [50, 150],
  [WEATHER_DROUGHT]: [150, 400],
  [WEATHER_HEATWAVE]: [100, 250],
};

export class WeatherSystem {
  constructor() {
    this.current = WEATHER_CLEAR;
    this.remaining = 300;
    this.intensity = 0;
    this._transitionTimer = 0;
    this._warmupTicks = 2000; // suppress notifications during early game
  }

  update(season, tiles, chunkStart, chunkEnd) {
    this.remaining--;
    if (this._warmupTicks > 0) this._warmupTicks--;

    if (this.remaining <= 0) {
      this._pickNext(season);
    }

    // Smooth intensity ramp
    const targetIntensity = this.current === WEATHER_CLEAR ? 0 : 0.5 + _rng() * 0.5;
    this.intensity += (targetIntensity - this.intensity) * 0.02;

    // Apply weather effects to tiles
    this._applyEffects(tiles, chunkStart, chunkEnd, season);
  }

  _pickNext(season) {
    const roll = _rng();

    // Season affects weather probability
    if (season === 0) { // Spring
      this.current = roll < 0.4 ? WEATHER_RAIN : roll < 0.6 ? WEATHER_STORM : WEATHER_CLEAR;
    } else if (season === 1) { // Summer
      this.current = roll < 0.2 ? WEATHER_HEATWAVE : roll < 0.35 ? WEATHER_DROUGHT : roll < 0.5 ? WEATHER_STORM : WEATHER_CLEAR;
    } else if (season === 2) { // Fall
      this.current = roll < 0.3 ? WEATHER_RAIN : roll < 0.45 ? WEATHER_STORM : WEATHER_CLEAR;
    } else { // Winter
      this.current = roll < 0.25 ? WEATHER_STORM : roll < 0.4 ? WEATHER_RAIN : WEATHER_CLEAR;
    }

    const [min, max] = WEATHER_DURATION[this.current];
    this.remaining = min + (_rng() * (max - min)) | 0;

    // Emit weather change notification (suppressed during warmup)
    if (this.current !== WEATHER_CLEAR && this._warmupTicks <= 0) {
      const messages = {
        [WEATHER_RAIN]: { msg: 'Rain clouds gather over the island.', icon: '🌧️', type: 'info' },
        [WEATHER_STORM]: { msg: 'A storm approaches! Heavy winds and rain.', icon: '⛈️', type: 'warning' },
        [WEATHER_DROUGHT]: { msg: 'A dry spell begins. Water will become scarce.', icon: '☀️', type: 'warning' },
        [WEATHER_HEATWAVE]: { msg: 'Heatwave! Temperatures are rising rapidly.', icon: '🔥', type: 'warning' },
      };
      const m = messages[this.current];
      if (m) {
        bus.emit('notification', { message: m.msg, icon: m.icon, type: m.type });
      }
    }
  }

  _applyEffects(tiles, chunkStart, chunkEnd, season) {
    const w = tiles.w;
    const intensity = this.intensity;

    for (let i = chunkStart; i < chunkEnd; i++) {
      const x = i % w;
      const y = (i / w) | 0;
      if (tiles.isOcean(x, y)) continue;

      switch (this.current) {
        case WEATHER_RAIN: {
          let water = tiles.getWater(x, y);
          water += 0.003 * intensity;
          tiles.setWater(x, y, Math.min(1, water));
          break;
        }
        case WEATHER_STORM: {
          let water = tiles.getWater(x, y);
          water += 0.006 * intensity;
          tiles.setWater(x, y, Math.min(1, water));
          // Storm can damage vegetation slightly
          if (_rng() < 0.002 * intensity) {
            let veg = tiles.getVeg(x, y);
            veg -= 0.01;
            tiles.setVeg(x, y, Math.max(0, veg));
          }
          break;
        }
        case WEATHER_DROUGHT: {
          let water = tiles.getWater(x, y);
          water -= 0.004 * intensity;
          tiles.setWater(x, y, Math.max(0, water));
          // Vegetation stress
          let veg = tiles.getVeg(x, y);
          if (water < 0.05) {
            veg -= 0.001 * intensity;
            tiles.setVeg(x, y, Math.max(0, veg));
          }
          break;
        }
        case WEATHER_HEATWAVE: {
          let temp = tiles.getTemp(x, y);
          temp += 0.002 * intensity;
          tiles.setTemp(x, y, Math.min(1, temp));
          // Evaporate water faster
          let water = tiles.getWater(x, y);
          water -= 0.002 * intensity;
          tiles.setWater(x, y, Math.max(0, water));
          break;
        }
      }
    }
  }

  toJSON() {
    return { current: this.current, remaining: this.remaining, intensity: this.intensity };
  }

  fromJSON(data) {
    if (!data) return;
    this.current = data.current || WEATHER_CLEAR;
    this.remaining = data.remaining || 300;
    this.intensity = data.intensity || 0;
  }
}
