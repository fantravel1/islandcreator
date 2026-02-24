export class Scheduler {
  constructor() {
    this.tasks = [];
  }

  add(name, intervalMs, fn) {
    this.tasks.push({ name, interval: intervalMs, fn, lastRun: 0 });
  }

  update(now) {
    for (let i = 0; i < this.tasks.length; i++) {
      const task = this.tasks[i];
      if (now - task.lastRun >= task.interval) {
        task.fn(now);
        task.lastRun = now;
      }
    }
  }

  remove(name) {
    this.tasks = this.tasks.filter(t => t.name !== name);
  }
}
