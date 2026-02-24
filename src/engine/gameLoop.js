import { SIM_TICK_MS } from '../data/constants.js';

export class GameLoop {
  constructor(onSimTick, onRender) {
    this.onSimTick = onSimTick;
    this.onRender = onRender;
    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;
    this.rafId = null;
    this.simSpeed = 1; // 0=paused, 1=normal, 2=fast, 5=fastest
    this._frame = this._frame.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this._frame);
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  setSpeed(speed) {
    this.simSpeed = speed;
  }

  _frame(now) {
    if (!this.running) return;

    let dt = now - this.lastTime;
    this.lastTime = now;

    // Clamp dt to avoid spiral of death
    if (dt > 200) dt = 200;

    if (this.simSpeed > 0) {
      this.accumulator += dt * this.simSpeed;

      let ticksThisFrame = 0;
      const maxTicksPerFrame = 5;
      while (this.accumulator >= SIM_TICK_MS && ticksThisFrame < maxTicksPerFrame) {
        this.onSimTick(SIM_TICK_MS);
        this.accumulator -= SIM_TICK_MS;
        ticksThisFrame++;
      }

      // Prevent accumulator from growing unbounded
      if (this.accumulator > SIM_TICK_MS * 2) {
        this.accumulator = 0;
      }
    }

    this.onRender(dt);
    this.rafId = requestAnimationFrame(this._frame);
  }
}
