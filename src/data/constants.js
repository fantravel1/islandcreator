// Grid
export const GRID_W = 128;
export const GRID_H = 128;
export const GRID_SIZE = GRID_W * GRID_H;

// Tile field indices (for typed array access)
export const FIELD_H = 0;
export const FIELD_WATER = 1;
export const FIELD_SOIL = 2;
export const FIELD_VEG = 3;
export const FIELD_TEMP = 4;
export const FLOAT_FIELDS = 5;

export const FIELD_BIOME = 0;
export const FIELD_PROTECTED = 1;
export const FIELD_DEVELOPED = 2;
export const BYTE_FIELDS = 3;

// Biome enum
export const BIOME_OCEAN = 0;
export const BIOME_FOREST = 1;
export const BIOME_GRASSLAND = 2;
export const BIOME_DESERT = 3;

// Simulation
export const SIM_TICK_MS = 100; // 10 ticks per second
export const SIM_CHUNKS = 10;
export const AUTOSAVE_INTERVAL = 15000; // 15 seconds

// Seasons
export const SEASON_SPRING = 0;
export const SEASON_SUMMER = 1;
export const SEASON_FALL = 2;
export const SEASON_WINTER = 3;
export const SEASON_NAMES = ['Spring', 'Summer', 'Fall', 'Winter'];
export const TICKS_PER_DAY = 100; // 10 seconds real time = 1 game day
export const DAYS_PER_SEASON = 30;
export const SEASONS_PER_YEAR = 4;

// Rendering
export const BASE_TILE_SIZE = 10;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 6;

// Tools
export const TOOL_SCULPT = 'sculpt';
export const TOOL_BIOME = 'biome';
export const TOOL_ANIMAL = 'animal';
export const TOOL_ZONE = 'zone';
export const TOOL_GOVERNANCE = 'governance';
export const TOOL_INSPECT = 'inspect';

// Brush
export const BRUSH_RADIUS = 3;
export const SCULPT_STRENGTH = 0.02;

// Animals
export const MAX_ANIMALS = 200;
export const ANIMAL_SIGHT_RANGE = 8;
export const REPRODUCTION_THRESHOLD = 0.8;
export const STARVATION_THRESHOLD = 0;
export const MAX_ANIMAL_SPEED = 0.3;
