import {
  SEASON_SPRING, SEASON_SUMMER, SEASON_FALL, SEASON_WINTER,
} from '../data/constants.js';

const MAX_PARTICLES = 80;

class Particle {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 0;
    this.size = 0;
    this.type = 'leaf';
    this.color = '';
    this.rotation = 0;
    this.rotSpeed = 0;
  }

  reset(type, canvasW, canvasH, season) {
    this.type = type;
    this.life = 0;

    if (type === 'leaf') {
      this.x = Math.random() * canvasW;
      this.y = -10;
      this.vx = (Math.random() - 0.3) * 0.8;
      this.vy = 0.3 + Math.random() * 0.5;
      this.maxLife = 300 + Math.random() * 200;
      this.size = 3 + Math.random() * 4;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.05;
      const colors = season === SEASON_FALL
        ? ['#d4832e', '#c45c2e', '#b83030', '#daa520']
        : ['#4a8a3a', '#3a7a2a', '#5a9a4a', '#6aaa5a'];
      this.color = colors[(Math.random() * colors.length) | 0];
    } else if (type === 'rain') {
      this.x = Math.random() * canvasW;
      this.y = -5;
      this.vx = -0.5;
      this.vy = 6 + Math.random() * 4;
      this.maxLife = 100 + Math.random() * 50;
      this.size = 1;
      this.color = 'rgba(150, 200, 255, 0.4)';
    } else if (type === 'firefly') {
      this.x = Math.random() * canvasW;
      this.y = canvasH * 0.3 + Math.random() * canvasH * 0.5;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = (Math.random() - 0.5) * 0.3;
      this.maxLife = 200 + Math.random() * 300;
      this.size = 2 + Math.random() * 2;
      this.color = '#ffee88';
    } else if (type === 'snow') {
      this.x = Math.random() * canvasW;
      this.y = -5;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = 0.5 + Math.random() * 1;
      this.maxLife = 400 + Math.random() * 200;
      this.size = 2 + Math.random() * 3;
      this.color = 'rgba(230, 240, 255, 0.7)';
    } else if (type === 'sparkle') {
      this.x = Math.random() * canvasW;
      this.y = canvasH * 0.4 + Math.random() * canvasH * 0.4;
      this.vx = 0;
      this.vy = -0.2;
      this.maxLife = 60 + Math.random() * 60;
      this.size = 1.5 + Math.random() * 2;
      this.color = '#ffffcc';
    }
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.pool = [];
    this.spawnTimer = 0;

    // Pre-allocate pool
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push(new Particle());
    }
  }

  _getParticle() {
    return this.pool.length > 0 ? this.pool.pop() : null;
  }

  _returnParticle(p) {
    this.pool.push(p);
  }

  update(season, canvasW, canvasH) {
    this.spawnTimer++;

    // Spawn rate depends on season
    let spawnType = 'leaf';
    let spawnRate = 15;

    if (season === SEASON_SPRING) {
      spawnType = (Math.random() > 0.7) ? 'sparkle' : 'leaf';
      spawnRate = 20;
    } else if (season === SEASON_SUMMER) {
      spawnType = (Math.random() > 0.5) ? 'firefly' : 'sparkle';
      spawnRate = 30;
    } else if (season === SEASON_FALL) {
      spawnType = 'leaf';
      spawnRate = 8;
    } else if (season === SEASON_WINTER) {
      spawnType = (Math.random() > 0.3) ? 'snow' : 'rain';
      spawnRate = 6;
    }

    if (this.spawnTimer >= spawnRate && this.particles.length < MAX_PARTICLES) {
      const p = this._getParticle();
      if (p) {
        p.reset(spawnType, canvasW, canvasH, season);
        this.particles.push(p);
      }
      this.spawnTimer = 0;
    }

    // Update existing
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;

      // Firefly wobble
      if (p.type === 'firefly') {
        p.vx += (Math.random() - 0.5) * 0.05;
        p.vy += (Math.random() - 0.5) * 0.05;
        p.vx *= 0.98;
        p.vy *= 0.98;
      }

      if (p.life >= p.maxLife || p.y > canvasH + 10 || p.x < -20 || p.x > canvasW + 20) {
        this.particles.splice(i, 1);
        this._returnParticle(p);
      }
    }
  }

  render(ctx) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const alpha = 1 - p.life / p.maxLife;

      if (p.type === 'leaf') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = p.color;
        // Leaf shape
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'rain') {
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 2);
        ctx.stroke();
      } else if (p.type === 'firefly') {
        const pulse = 0.5 + Math.sin(p.life * 0.1) * 0.5;
        ctx.globalAlpha = alpha * pulse;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (p.type === 'snow') {
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'sparkle') {
        const pulse = Math.sin(p.life * 0.15) * 0.5 + 0.5;
        ctx.globalAlpha = alpha * pulse;
        ctx.fillStyle = p.color;
        // Star shape
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s);
        ctx.lineTo(p.x + s * 0.3, p.y - s * 0.3);
        ctx.lineTo(p.x + s, p.y);
        ctx.lineTo(p.x + s * 0.3, p.y + s * 0.3);
        ctx.lineTo(p.x, p.y + s);
        ctx.lineTo(p.x - s * 0.3, p.y + s * 0.3);
        ctx.lineTo(p.x - s, p.y);
        ctx.lineTo(p.x - s * 0.3, p.y - s * 0.3);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
