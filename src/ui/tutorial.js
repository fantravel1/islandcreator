import { bus } from '../engine/events.js';

const STEPS = [
  {
    title: 'Welcome to IslandCreator!',
    text: 'Your island has been generated with forests, grasslands, and deserts. Animals are already roaming free.',
    highlight: null,
    action: 'tap anywhere',
  },
  {
    title: 'Explore Your Island',
    text: 'Pinch to zoom in and out. Use two fingers to pan around. Tap any tile to inspect it.',
    highlight: null,
    action: 'try zooming',
  },
  {
    title: 'Sculpt the Land',
    text: 'Tap the mountain tool to raise or lower terrain. Drag across tiles to sculpt your island.',
    highlight: 'sculpt',
    action: 'select sculpt tool',
  },
  {
    title: 'Paint Biomes',
    text: 'Choose the biome brush to paint forests, grasslands, or deserts. Each supports different ecosystems.',
    highlight: 'biome',
    action: 'select biome tool',
  },
  {
    title: 'Place Animals',
    text: 'Add deer, rabbits, wolves, and hawks. Watch them interact — herbivores graze, predators hunt.',
    highlight: 'animal',
    action: 'select animal tool',
  },
  {
    title: 'Protect Zones',
    text: 'Use the shield tool to create protected areas where hunting and development are blocked.',
    highlight: 'zone',
    action: 'select protect tool',
  },
  {
    title: 'Govern Your Ecosystem',
    text: 'Adjust conservation, development, and enforcement policies to guide how your island evolves.',
    highlight: 'governance',
    action: 'select govern tool',
  },
  {
    title: 'Control Time',
    text: 'Use the time controls at the top to pause, play, or speed up the simulation. Watch your ecosystem unfold!',
    highlight: null,
    action: 'done',
  },
];

export class Tutorial {
  constructor(container) {
    this.container = container;
    this.step = 0;
    this.active = false;

    this.el = document.createElement('div');
    this.el.className = 'tutorial';
    this.el.style.display = 'none';
    container.appendChild(this.el);
  }

  start() {
    this.active = true;
    this.step = 0;
    this._showStep();
  }

  _showStep() {
    if (this.step >= STEPS.length) {
      this._finish();
      return;
    }

    const s = STEPS[this.step];
    this.el.style.display = 'block';
    this.el.innerHTML = `
      <div class="tutorial-card">
        <div class="tutorial-progress">
          ${STEPS.map((_, i) => `<span class="tutorial-dot ${i <= this.step ? 'active' : ''}"></span>`).join('')}
        </div>
        <h3 class="tutorial-title">${s.title}</h3>
        <p class="tutorial-text">${s.text}</p>
        <div class="tutorial-actions">
          <button class="tutorial-skip">Skip</button>
          <button class="tutorial-next">${this.step < STEPS.length - 1 ? 'Next' : 'Start Playing!'}</button>
        </div>
      </div>
    `;

    requestAnimationFrame(() => {
      this.el.querySelector('.tutorial-card').classList.add('show');
    });

    this.el.querySelector('.tutorial-next').addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.step++;
      this._showStep();
      if (navigator.vibrate) navigator.vibrate(15);
    });

    this.el.querySelector('.tutorial-skip').addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this._finish();
    });

    if (s.highlight) {
      bus.emit('tutorialHighlight', { tool: s.highlight });
    }
  }

  _finish() {
    this.active = false;
    this.el.classList.add('fade-out');
    setTimeout(() => {
      this.el.style.display = 'none';
      this.el.classList.remove('fade-out');
      bus.emit('tutorialDone');
    }, 400);
  }
}
