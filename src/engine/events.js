export class EventBus {
  constructor() {
    this._listeners = {};
  }

  on(event, fn) {
    (this._listeners[event] || (this._listeners[event] = [])).push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const list = this._listeners[event];
    if (!list) return;
    const idx = list.indexOf(fn);
    if (idx >= 0) list.splice(idx, 1);
  }

  emit(event, data) {
    const list = this._listeners[event];
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      list[i](data);
    }
  }

  clear() {
    this._listeners = {};
  }
}

// Global singleton
export const bus = new EventBus();
