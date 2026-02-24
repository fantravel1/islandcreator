// Save format migrations for version upgrades
// V1 is the first version, so no migrations needed yet

export function migrate(data) {
  if (!data) return data;

  // Future migrations go here:
  // if (data.version < 2) { ... migrate to v2 ... data.version = 2; }

  return data;
}
