export const TILE = 40;
export const COLS = 64;
export const ROWS = 48;
export const WORLD_W = COLS * TILE;
export const WORLD_H = ROWS * TILE;

export const T = {
  DEEP: 0,
  REEF: 1,
  SAND: 2,
  CORAL_P: 3,
  CORAL_G: 4,
  CORAL_R: 5,
  CORAL_Y: 6,
  ROCK: 7,
  KELP: 8,
  WALL: 9,
  CUR_E: 10,
  CUR_W: 11,
  CUR_N: 12,
  CUR_S: 13,
  VORTEX: 14,
  PALM: 15,
  GRASS: 16,
  HOUSE: 17,
  CAVE: 18,
  WRECK: 19,
  GATE: 20,
  PLANT: 21,
};

export const SOLID = new Set([
  T.CORAL_P, T.CORAL_G, T.CORAL_R, T.CORAL_Y, T.ROCK, T.WALL, T.PALM, T.HOUSE, T.GATE, T.PLANT,
]);

export const CURRENT = {
  [T.CUR_E]: [1.6, 0],
  [T.CUR_W]: [-1.6, 0],
  [T.CUR_N]: [0, -1.6],
  [T.CUR_S]: [0, 1.6],
};

export function baseMap(t) {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(t));
}
export function mrect(m, c0, r0, c1, r1, t) {
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) m[r][c] = t;
    }
  }
}
export function mset(m, c, r, t) {
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS) m[r][c] = t;
}
export function mborder(m, t, thick = 1) {
  mrect(m, 0, 0, COLS - 1, thick - 1, t);
  mrect(m, 0, ROWS - thick, COLS - 1, ROWS - 1, t);
  mrect(m, 0, 0, thick - 1, ROWS - 1, t);
  mrect(m, COLS - thick, 0, COLS - 1, ROWS - 1, t);
}

export function buildOcean() {
  const m = baseMap(T.DEEP);
  mborder(m, T.ROCK, 2);

  // wreck clearing (west-center)
  mrect(m, 3, 20, 12, 30, T.SAND);
  mrect(m, 6, 23, 9, 26, T.WRECK);

  // coral garden corridors
  mrect(m, 13, 18, 28, 32, T.REEF);
  [[14, 20], [18, 22], [22, 19], [16, 28], [24, 26], [20, 30]].forEach(([c, r]) => {
    mrect(m, c, r, c + 1, r + 1, T.CORAL_P);
  });
  [[21, 21], [26, 28], [19, 18], [13, 26]].forEach(([c, r]) => {
    mrect(m, c, r, c, r + 1, T.CORAL_G);
  });
  [[23, 23], [17, 27], [27, 20]].forEach(([c, r]) => mset(m, c, r, T.CORAL_R));
  [[14, 29], [25, 24], [18, 19]].forEach(([c, r]) => mset(m, c, r, T.CORAL_Y));

  // antenna room — only the west door (robot-lift boulder) opens it
  mrect(m, 16, 21, 25, 28, T.ROCK);
  mrect(m, 18, 22, 24, 27, T.REEF);
  mrect(m, 16, 24, 17, 25, T.DEEP); // gap filled by liftable entity
  mset(m, 22, 24, T.SAND);

  // kelp forest north
  mrect(m, 6, 3, 26, 14, T.KELP);
  mrect(m, 10, 14, 16, 20, T.DEEP); // corridor down to wreck
  [[8, 5], [12, 7], [20, 4], [16, 9], [24, 6], [9, 11]].forEach(([c, r]) => {
    mrect(m, c, r, c + 1, r, T.CORAL_G);
  });
  [[11, 4], [19, 8], [7, 9]].forEach(([c, r]) => mset(m, c, r, T.CORAL_P));

  // surface whirlpool (north-west)
  mrect(m, 5, 3, 11, 8, T.DEEP);
  mrect(m, 6, 4, 9, 6, T.VORTEX);

  // east cave — interior is behind a full-height gate
  mrect(m, 36, 10, 61, 24, T.WALL);
  mrect(m, 43, 12, 59, 22, T.CAVE);
  mrect(m, 28, 14, 42, 18, T.REEF); // approach up to the gate
  mrect(m, 42, 12, 42, 22, T.WALL);
  mrect(m, 42, 15, 42, 17, T.GATE);
  mrect(m, 50, 13, 53, 14, T.CORAL_R);
  mrect(m, 47, 20, 49, 21, T.CORAL_Y);

  // south current channel — valve wall is the only crossing
  mrect(m, 14, 34, 23, 44, T.REEF);
  mrect(m, 20, 36, 23, 40, T.CUR_E);
  mrect(m, 20, 41, 23, 43, T.CUR_W);
  mrect(m, 24, 32, 25, 45, T.ROCK);
  mrect(m, 24, 38, 25, 38, T.DEEP); // gap for valve liftable
  mrect(m, 26, 34, 54, 44, T.REEF);
  mrect(m, 26, 36, 52, 40, T.CUR_E);
  mrect(m, 48, 38, 53, 43, T.SAND); // propeller pocket
  mrect(m, 26, 32, 61, 33, T.ROCK); // no garden shortcut to the east channel
  mrect(m, 54, 32, 61, 45, T.ROCK); // no wrap-around along the east rim

  // connecting corridors (garden does not spill into the east channel)
  mrect(m, 10, 30, 16, 36, T.DEEP);
  mrect(m, 28, 24, 38, 31, T.DEEP);
  mrect(m, 30, 8, 38, 13, T.DEEP);

  // extra coral along garden edges (deterministic, keeps corridors open)
  const extra = [
    [14, 20, T.CORAL_P], [22, 19, T.CORAL_R], [16, 28, T.CORAL_Y],
    [20, 30, T.CORAL_G],
    [26, 28, T.CORAL_P], [19, 18, T.CORAL_G], [12, 7, T.CORAL_P],
    [20, 4, T.CORAL_R], [16, 9, T.CORAL_Y], [24, 6, T.CORAL_G], [9, 11, T.CORAL_P],
  ];
  extra.forEach(([c, r, t]) => mset(m, c, r, t));
  return m;
}

export function buildIsland() {
  const m = baseMap(T.GRASS);
  mborder(m, T.PLANT, 2);

  // beach south
  mrect(m, 2, 34, 61, 45, T.SAND);
  mrect(m, 30, 40, 34, 43, T.WRECK);

  // village west
  mrect(m, 4, 22, 16, 32, T.SAND);
  mrect(m, 6, 24, 8, 26, T.HOUSE);
  mrect(m, 11, 23, 13, 25, T.HOUSE);
  mrect(m, 8, 28, 10, 30, T.HOUSE);

  // jungle north
  mrect(m, 6, 3, 40, 18, T.GRASS);
  [[8, 5], [14, 6], [20, 4], [26, 8], [12, 12], [32, 5], [18, 14], [28, 12], [36, 9]].forEach(([c, r]) => {
    mset(m, c, r, T.PALM);
  });
  [[10, 8], [22, 10], [30, 7], [16, 5]].forEach(([c, r]) => mset(m, c, r, T.PLANT));
  // fallen palm gap (liftable occupies 21-23,14)
  mrect(m, 20, 13, 24, 15, T.GRASS);

  // path village -> beach
  mrect(m, 8, 32, 14, 36, T.SAND);
  // path jungle
  mrect(m, 14, 16, 18, 24, T.GRASS);

  // hermit glade
  mrect(m, 26, 18, 34, 24, T.SAND);

  // temple east
  mrect(m, 44, 8, 61, 28, T.WALL);
  mrect(m, 46, 10, 59, 26, T.CAVE);
  mrect(m, 40, 16, 46, 20, T.SAND); // approach
  mrect(m, 46, 16, 46, 20, T.GATE);
  mrect(m, 52, 14, 57, 18, T.CAVE); // hull chamber
  mrect(m, 48, 22, 50, 24, T.ROCK); // robot-lift rock inside? optional outside
  // temple outer rock (robot)
  mrect(m, 42, 17, 43, 19, T.GRASS);

  // east beach combat
  mrect(m, 40, 34, 58, 44, T.SAND);

  return m;
}

export const TILE_COLORS = {
  [T.DEEP]: '#0d47a1',
  [T.REEF]: '#1565c0',
  [T.SAND]: '#ffe082',
  [T.CORAL_P]: '#6a1b9a',
  [T.CORAL_G]: '#2e7d32',
  [T.CORAL_R]: '#c62828',
  [T.CORAL_Y]: '#f9a825',
  [T.ROCK]: '#546e7a',
  [T.KELP]: '#1b5e20',
  [T.WALL]: '#37474f',
  [T.CUR_E]: '#0277bd',
  [T.CUR_W]: '#0277bd',
  [T.CUR_N]: '#0277bd',
  [T.CUR_S]: '#0277bd',
  [T.VORTEX]: '#4fc3f7',
  [T.PALM]: '#33691e',
  [T.GRASS]: '#7cb342',
  [T.HOUSE]: '#8d6e63',
  [T.CAVE]: '#455a64',
  [T.WRECK]: '#90a4ae',
  [T.GATE]: '#00acc1',
  [T.PLANT]: '#558b2f',
};

export function minimapColor(t, level) {
  if (t === T.CORAL_P || t === T.CORAL_G || t === T.CORAL_R || t === T.CORAL_Y || t === T.ROCK || t === T.WALL || t === T.PALM || t === T.HOUSE || t === T.PLANT || t === T.GATE)
    return '#2e7d32';
  if (t === T.DEEP || t === T.REEF || t === T.KELP || t === T.CUR_E || t === T.CUR_W || t === T.CUR_N || t === T.CUR_S) return '#1565c0';
  if (t === T.SAND) return '#ffe082';
  if (t === T.VORTEX) return '#00e5ff';
  if (t === T.WRECK) return '#ffd740';
  if (t === T.CAVE) return '#546e7a';
  return level === 1 ? '#0d47a1' : '#7cb342';
}
