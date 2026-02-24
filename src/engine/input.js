import { bus } from './events.js';

const LONG_PRESS_MS = 500;
const TAP_MAX_MS = 250;
const TAP_MAX_DIST = 12;

export class InputManager {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.camera = camera;
    this.pointers = new Map();
    this.lastPinchDist = 0;
    this.lastPinchCenter = null;
    this.longPressTimer = null;
    this.isDragging = false;
    this.isPanning = false;
    this.startTime = 0;
    this.startPos = { x: 0, y: 0 };

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onWheel = this._onWheel.bind(this);

    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerup', this._onPointerUp);
    canvas.addEventListener('pointercancel', this._onPointerUp);
    canvas.addEventListener('wheel', this._onWheel, { passive: false });

    // Prevent context menu on long press
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  _screenToWorld(sx, sy) {
    return this.camera.screenToWorld(sx, sy);
  }

  _onPointerDown(e) {
    e.preventDefault();
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.canvas.setPointerCapture(e.pointerId);

    if (this.pointers.size === 1) {
      this.startTime = performance.now();
      this.startPos = { x: e.clientX, y: e.clientY };
      this.isDragging = false;

      this.longPressTimer = setTimeout(() => {
        const world = this._screenToWorld(e.clientX, e.clientY);
        bus.emit('longPress', { screenX: e.clientX, screenY: e.clientY, worldX: world.x, worldY: world.y });
        this.longPressTimer = null;
      }, LONG_PRESS_MS);
    } else if (this.pointers.size === 2) {
      this._cancelLongPress();
      this.isDragging = false;
      const pts = [...this.pointers.values()];
      this.lastPinchDist = this._dist(pts[0], pts[1]);
      this.lastPinchCenter = this._midpoint(pts[0], pts[1]);
      this.isPanning = true;
    }
  }

  _onPointerMove(e) {
    if (!this.pointers.has(e.pointerId)) return;
    e.preventDefault();

    const prev = this.pointers.get(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pointers.size === 1) {
      const dx = e.clientX - this.startPos.x;
      const dy = e.clientY - this.startPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > TAP_MAX_DIST) {
        this._cancelLongPress();
        this.isDragging = true;
        const world = this._screenToWorld(e.clientX, e.clientY);
        bus.emit('drag', {
          screenX: e.clientX, screenY: e.clientY,
          worldX: world.x, worldY: world.y,
          dx: e.clientX - prev.x, dy: e.clientY - prev.y,
        });
      }
    } else if (this.pointers.size === 2) {
      const pts = [...this.pointers.values()];
      const newDist = this._dist(pts[0], pts[1]);
      const newCenter = this._midpoint(pts[0], pts[1]);

      // Pinch zoom
      if (this.lastPinchDist > 0) {
        const scale = newDist / this.lastPinchDist;
        bus.emit('pinch', { scale, centerX: newCenter.x, centerY: newCenter.y });
      }

      // Two-finger pan
      if (this.lastPinchCenter) {
        const panDx = newCenter.x - this.lastPinchCenter.x;
        const panDy = newCenter.y - this.lastPinchCenter.y;
        bus.emit('pan', { dx: panDx, dy: panDy });
      }

      this.lastPinchDist = newDist;
      this.lastPinchCenter = newCenter;
    }
  }

  _onPointerUp(e) {
    if (!this.pointers.has(e.pointerId)) return;
    e.preventDefault();
    this.pointers.delete(e.pointerId);

    if (this.pointers.size === 0) {
      this._cancelLongPress();
      const elapsed = performance.now() - this.startTime;
      const dx = e.clientX - this.startPos.x;
      const dy = e.clientY - this.startPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!this.isDragging && elapsed < TAP_MAX_MS && dist < TAP_MAX_DIST) {
        const world = this._screenToWorld(e.clientX, e.clientY);
        bus.emit('tap', {
          screenX: e.clientX, screenY: e.clientY,
          worldX: world.x, worldY: world.y,
        });
      }

      if (this.isDragging) {
        bus.emit('dragEnd', {});
      }

      this.isDragging = false;
      this.isPanning = false;
    }

    if (this.pointers.size < 2) {
      this.lastPinchDist = 0;
      this.lastPinchCenter = null;
      this.isPanning = false;
    }
  }

  _onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    bus.emit('pinch', { scale: delta, centerX: e.clientX, centerY: e.clientY });
  }

  _cancelLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  _dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  _midpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this.canvas.removeEventListener('pointerup', this._onPointerUp);
    this.canvas.removeEventListener('pointercancel', this._onPointerUp);
    this.canvas.removeEventListener('wheel', this._onWheel);
  }
}
