// Mulberry32 — fast seeded 32-bit PRNG
export function createRng(seed) {
  let s = seed | 0;
  return function rng() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Simple 2D noise (value noise with smoothing)
export function createNoise2D(seed) {
  const rng = createRng(seed);
  const SIZE = 256;
  const perm = new Uint8Array(SIZE * 2);
  const grad = new Float32Array(SIZE);

  for (let i = 0; i < SIZE; i++) {
    perm[i] = i;
    grad[i] = rng() * 2 - 1;
  }
  // Shuffle
  for (let i = SIZE - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const tmp = perm[i];
    perm[i] = perm[j];
    perm[j] = tmp;
  }
  for (let i = 0; i < SIZE; i++) {
    perm[i + SIZE] = perm[i];
  }

  function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function hash(x, y) {
    return perm[(perm[x & 255] + y) & 255];
  }

  return function noise(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;

    const u = fade(xf);
    const v = fade(yf);

    const g00 = grad[hash(xi, yi) & 255];
    const g10 = grad[hash(xi + 1, yi) & 255];
    const g01 = grad[hash(xi, yi + 1) & 255];
    const g11 = grad[hash(xi + 1, yi + 1) & 255];

    const n00 = g00 * xf + grad[hash(yi, xi) & 255] * yf;
    const n10 = g10 * (xf - 1) + grad[hash(yi, xi + 1) & 255] * yf;
    const n01 = g01 * xf + grad[hash(yi + 1, xi) & 255] * (yf - 1);
    const n11 = g11 * (xf - 1) + grad[hash(yi + 1, xi + 1) & 255] * (yf - 1);

    return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
  };
}

// Fractal Brownian Motion (layered noise)
export function fbm(noiseFn, x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
  let val = 0;
  let amp = 1;
  let freq = 1;
  let maxVal = 0;
  for (let i = 0; i < octaves; i++) {
    val += noiseFn(x * freq, y * freq) * amp;
    maxVal += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return val / maxVal;
}
