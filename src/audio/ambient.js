import {
  SEASON_SPRING, SEASON_SUMMER, SEASON_FALL, SEASON_WINTER,
} from '../data/constants.js';

// Web Audio API ambient sound generator
// All sounds are procedurally generated — no audio files needed

export class AmbientAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.enabled = false;
    this._oscillators = [];
    this._currentSeason = -1;
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.15;
      this.masterGain.connect(this.ctx.destination);
      this._initialized = true;
    } catch (e) {
      console.warn('Web Audio not available');
    }
  }

  toggle() {
    if (!this._initialized) this.init();
    this.enabled = !this.enabled;
    if (this.enabled) {
      if (this.ctx?.state === 'suspended') this.ctx.resume();
      this._startAmbient();
    } else {
      this._stopAll();
    }
    return this.enabled;
  }

  setSeason(season) {
    if (season === this._currentSeason || !this.enabled) return;
    this._currentSeason = season;
    this._stopAll();
    this._startAmbient();
  }

  _startAmbient() {
    if (!this.ctx || !this.enabled) return;

    const season = this._currentSeason;

    // Base ocean waves — always present
    this._createWaveSound(0.08);

    if (season === SEASON_SPRING || season === SEASON_SUMMER) {
      // Bird chirps
      this._scheduleBirdChirps();
    }

    if (season === SEASON_SUMMER) {
      // Cicadas
      this._createCicadaSound();
    }

    if (season === SEASON_FALL) {
      // Wind
      this._createWindSound(0.06);
    }

    if (season === SEASON_WINTER) {
      // Stronger wind
      this._createWindSound(0.1);
    }
  }

  _createWaveSound(volume) {
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate wave-like noise
    for (let i = 0; i < bufferSize; i++) {
      const t = i / this.ctx.sampleRate;
      data[i] = (
        Math.sin(t * 0.3) * 0.3 +
        Math.sin(t * 0.7 + 1) * 0.2 +
        (Math.random() - 0.5) * 0.1
      ) * Math.sin(t * 0.15) * 0.5;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();

    this._oscillators.push({ source, gain });
  }

  _createWindSound(volume) {
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.11;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = this.ctx.createGain();
    gain.gain.value = volume;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start();

    this._oscillators.push({ source, gain });
  }

  _createCicadaSound() {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 4000;

    const modOsc = this.ctx.createOscillator();
    modOsc.frequency.value = 8;

    const modGain = this.ctx.createGain();
    modGain.gain.value = 2000;

    modOsc.connect(modGain);
    modGain.connect(osc.frequency);

    const gain = this.ctx.createGain();
    gain.gain.value = 0.02;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 5000;
    filter.Q.value = 5;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    modOsc.start();

    this._oscillators.push({ source: osc, gain }, { source: modOsc, gain: modGain });
  }

  _scheduleBirdChirps() {
    if (!this.ctx || !this.enabled) return;

    const chirp = () => {
      if (!this.enabled) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const baseFreq = 2000 + Math.random() * 3000;
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(baseFreq * 1.3, this.ctx.currentTime + 0.05);
      osc.frequency.linearRampToValueAtTime(baseFreq * 0.9, this.ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.03, this.ctx.currentTime + 0.02);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);

      // Schedule next chirp
      if (this.enabled) {
        setTimeout(chirp, 2000 + Math.random() * 5000);
      }
    };

    setTimeout(chirp, 1000 + Math.random() * 3000);
  }

  _stopAll() {
    for (const entry of this._oscillators) {
      try {
        entry.source.stop();
        entry.source.disconnect();
      } catch (e) { /* already stopped */ }
    }
    this._oscillators = [];
  }

  setVolume(v) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, v));
    }
  }
}
