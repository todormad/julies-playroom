// The Way Home — parkour run from the landing field to the village.
// Teaches: running jumps, mushroom bounce, wall jumps (vine walls), ledge grabs,
// riding a flying plank, and the Robot step. No enemies yet.
// Ground top is y = 600. Normal jump ≈ 130 up / 190 across; ledge grab adds ≈ 28.

export default {
  id: 'intro',
  theme: 'meadow',
  w: 4400,
  h: 720,
  entries: {
    start: { x: 250, y: 600 },
    fromHome: { x: 4200, y: 400, face: -1 },
  },
  goal: 'g_intro',
  ground: [
    { x: 0, y: 600, w: 700 },
    { x: 420, y: 560, w: 60, h: 40, kind: 'rock' },
    // small gap 700–820
    { x: 820, y: 600, w: 880 },
    // chimney: hanging vine log + the vine cliff (gap 90, climb 270)
    { x: 1560, y: 300, w: 50, h: 180, kind: 'trunk', grip: true },
    { x: 1700, y: 330, w: 450, grip: true },
    // pit 2150–2450 crossed on the flying plank
    { x: 2450, y: 420, w: 550 },
    { x: 2620, y: 290, w: 100, h: 130, kind: 'rock' },   // grab step (130 high)
    { x: 2780, y: 170, w: 120, h: 250, kind: 'rock' },   // second step (120 higher)
    { x: 3000, y: 600, w: 300 },
    { x: 3300, y: 400, w: 1100 },                       // cliff (200 high) — Robot step
  ],
  planks: [
    { x: 1040, y: 400, w: 170 },
    { x: 1280, y: 380, w: 150 },
  ],
  movers: [
    { x: 2170, y: 380, w: 110, x2: 2330, y2: 380, speed: 90, pause: 700 },
  ],
  bouncers: [{ x: 980, y: 600 }],
  stars: [
    { x: 1125, y: 360 },
    { x: 1355, y: 340 },
    { x: 1655, y: 420 },
    { x: 2300, y: 330 },
    { x: 2840, y: 130 },
    { x: 3700, y: 360 },
  ],
  lanterns: [{ x: 1460, y: 600 }, { x: 2080, y: 330 }, { x: 3060, y: 600 }],
  spots: [{ x: 3236, top: 500, from: 3000, to: 3300, beaconX: 3080 }],
  exits: [{ x: 4290, y: 280, w: 110, h: 120, to: 'home', entry: 'fromIntro' }],
  tips: [
    { x: 870, key: 'i_bounce' },
    { x: 1490, key: 'i_wall' },
    { x: 2060, key: 'i_mover', minY: 0, maxY: 360 },
    { x: 2500, key: 'i_ledge' },
    { x: 3040, key: 'i_robot' },
    { x: 3900, key: 'i_village' },
  ],
  decor: [
    { t: 'pad', x: 170, y: 600 },
    { t: 'tree', x: 560, y: 600, s: 1 },
    { t: 'sign', x: 650, y: 600 },
    { t: 'tree', x: 1480, y: 600, s: 0.8 },
    { t: 'tree', x: 3150, y: 600, s: 1.1 },
    { t: 'tree', x: 3560, y: 400, s: 0.9 },
    { t: 'gate', x: 4330, y: 400 },
  ],
};
