// Level layout and movement presets for the jump-feel prototype.
// All positions are in logical world units (1 tile = 40). The ground top is y = 480.

export const VIEW_W = 960;
export const VIEW_H = 540;
export const WORLD_W = 2560;
export const WORLD_H = 600;
export const GROUND_Y = 480;
export const TILE = 40;

export const SPAWN = { x: 70, y: GROUND_Y };

// Solid ground chunks. The tall ledge is last so it draws over its neighbours' seams.
export const TERRAIN = [
  { x: 0, y: 480, w: 520, h: 120 },
  { x: 640, y: 480, w: 360, h: 120 },   // small gap before this one (120 px)
  { x: 1300, y: 480, w: 260, h: 120 },  // wide gap before this one (300 px) — needs the Robot
  { x: 1880, y: 480, w: 680, h: 120 },
  { x: 1560, y: 280, w: 320, h: 320 },  // high ledge (200 px) — needs the Robot
];
export const ROCKS = [{ x: 330, y: 424, w: 80, h: 56 }];
export const ONE_WAY = [{ x: 110, y: 380, w: 150 }];

// Where the Robot parks as a step when you press C nearby.
// `top` is the platform surface; `from`/`to` is the hero x-range that calls it here.
export const HELP_SPOTS = [
  { id: 'gap', x: 1150, top: 470, from: 800, to: 1300, beaconX: 968 },
  { id: 'ledge', x: 1494, top: 380, from: 1300, to: 1560, beaconX: 1340 },
];

// Letter blocks: the word's letters are placed out of order (order[i] = index into the word).
export const BLOCKS = { cy: 346, size: 48, xs: [1990, 2066, 2142, 2218, 2294], order: [2, 1, 4, 0, 3] };
export const GATE = { x: 2383, top: 200, bottom: 480, w: 26 };
export const SHIP = { x: 2478, y: 482 };

export const STARS = [
  { x: 185, y: 338 },   // on the floating plank
  { x: 580, y: 392 },   // over the small gap
  { x: 1150, y: 402 },  // on the Robot step over the wide gap
  { x: 1722, y: 238 },  // on the high ledge
  { x: 2142, y: 272 },  // standing on the middle letter block
];

export const TIPS = [
  { key: 'r_gap_small', x: 400 },
  { key: 'r_gap_wide', x: 840 },
  { key: 'r_ledge', x: 1320 },
  { key: 'r_letters', x: 1900 },
  { key: 'r_gate_locked', x: 2320, unlessSolved: true },
];

// Movement feel. Easy is tuned for ages 5–8; every value is adjustable in the ⚙ panel.
export const PRESETS = {
  easy: {
    runSpeed: 250, accel: 2400, decel: 3000, airControl: 0.75,
    jumpTiles: 3.3, gravity: 1600, fallMult: 1.35, apexFloat: 0.45,
    coyoteMs: 120, bufferMs: 150, jumpCut: 0.45, maxFall: 900,
  },
  hard: {
    runSpeed: 280, accel: 2600, decel: 3200, airControl: 0.65,
    jumpTiles: 3.0, gravity: 1900, fallMult: 1.5, apexFloat: 0.2,
    coyoteMs: 80, bufferMs: 100, jumpCut: 0.4, maxFall: 1000,
  },
};

export const TUNE_FIELDS = [
  { key: 'runSpeed', min: 140, max: 380, step: 10 },
  { key: 'accel', min: 600, max: 5000, step: 100 },
  { key: 'decel', min: 600, max: 6000, step: 100 },
  { key: 'airControl', min: 0.2, max: 1, step: 0.05 },
  { key: 'jumpTiles', min: 1.5, max: 4.8, step: 0.1 },
  { key: 'gravity', min: 800, max: 3000, step: 50 },
  { key: 'fallMult', min: 1, max: 2.5, step: 0.05 },
  { key: 'apexFloat', min: 0, max: 0.8, step: 0.05 },
  { key: 'coyoteMs', min: 0, max: 250, step: 10 },
  { key: 'bufferMs', min: 0, max: 300, step: 10 },
  { key: 'jumpCut', min: 0.1, max: 1, step: 0.05 },
];
