// Ice Planet — the Snowy Valley.
// Teaches: slippery ice, snow beetles, icicles that drop when you walk underneath, and a
// blizzard you shelter from behind rocks. Shared puzzle: the Robot sits on the snow
// cannon so it can't shoot Astro off the planks (or Astro jumps the snowballs).
// Ground top is y = 600.

export default {
  id: 'ice1',
  theme: 'ice',
  power: 'bubble',
  w: 4400,
  h: 720,
  entries: {
    fromHome: { x: 260, y: 600 },
    fromIce2: { x: 4200, y: 600, face: -1 },
  },
  goal: 'g_ice1',
  onEnter: 'f1_enter',
  ground: [
    { x: 0, y: 600, w: 700 },
    { x: 700, y: 600, w: 420, kind: 'ice' },
    // pit 1120–1260
    { x: 1260, y: 600, w: 420, kind: 'ice' },
    { x: 1680, y: 600, w: 720 },
    { x: 1720, y: 0, w: 640, h: 380, kind: 'rock' },      // the icicle overhang
    // pit 2400–2700, crossed on a plank bridge with one gap to jump
    { x: 2700, y: 600, w: 1700 },
    { x: 3240, y: 500, w: 50, h: 100, kind: 'rock' },     // shelters from the blizzard
    { x: 3500, y: 480, w: 50, h: 120, kind: 'rock' },
  ],
  planks: [
    { x: 2410, y: 600, w: 110 },
    { x: 2600, y: 600, w: 95 },
  ],
  icicles: [{ x: 1800, y: 380 }, { x: 1920, y: 380 }, { x: 2040, y: 380 }, { x: 2160, y: 380 }, { x: 2280, y: 380 }],
  cannons: [{ x: 2880, y: 600, dir: -1, period: 1700, plug: 'c1', range: 640 }],
  plates: [{ id: 'c1', x: 2880, y: 526, hidden: true }],
  holdSpots: [{ plate: 'c1', from: 2250, to: 2720, until: { x: 2730 }, line: 'r_hold_cannon' }],
  winds: [{ x: 3060, y: 280, w: 760, h: 320, force: -210, cycle: [1700, 2200] }],
  beetles: [
    { x: 900, y: 600, min: 760, max: 1090 },
    { x: 1450, y: 600, min: 1290, max: 1650 },
    { x: 3950, y: 600, min: 3850, max: 4150 },
  ],
  stars: [
    { x: 1190, y: 470 },
    { x: 1985, y: 560 },
    { x: 2560, y: 470 },
    { x: 2820, y: 440 },
    { x: 3265, y: 440 },
    { x: 4060, y: 520 },
    { x: 3525, y: 245 }, // hidden: over the shelter rock in the blizzard — a Robot step from its top
  ],
  lanterns: [{ x: 600, y: 600 }, { x: 1720, y: 600 }, { x: 2760, y: 600 }, { x: 3060, y: 600 }, { x: 3880, y: 600 }],
  exits: [
    { x: 4300, y: 480, w: 100, h: 120, to: 'ice2', entry: 'fromIce1' },
    { x: 0, y: 480, w: 30, h: 120, to: 'home', entry: 'fromIce' },
  ],
  tips: [
    { x: 640, key: 'f1_ice' },
    { x: 1700, key: 'f1_icicles' },
    { x: 2300, key: 'f1_cannon' },
    { x: 3010, key: 'f1_wind' },
    { x: 4100, key: 'f1_exit' },
  ],
  decor: [
    { t: 'rocketIce', x: 140, y: 600 },
    { t: 'snowman', x: 520, y: 600 },
    { t: 'pine', x: 360, y: 600, s: 0.8 },
    { t: 'pine', x: 1540, y: 600, s: 0.7 },
    { t: 'pine', x: 3720, y: 600, s: 0.9 },
    { t: 'caveIce', x: 4330, y: 600 },
  ],
};
