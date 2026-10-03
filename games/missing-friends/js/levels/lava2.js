// Lava Planet — inside the volcano (a cave), where Stitch is trapped.
// Teaches: cooling rocks that sink when you stand on them, wall jumps on glowing holds.
// Shared puzzle: two buttons at once (Astro low, the Robot high) bring out a bridge.
// Then spell STITCH to open the cage, get the shield, and walk through the wall of fire
// out of the volcano to the rocket home. Ground top is y = 600, the upper floor is y = 300.

export default {
  id: 'lava2',
  theme: 'lavacave',
  power: 'shield',
  w: 4000,
  h: 720,
  entries: {
    fromLava1: { x: 120, y: 600 },
  },
  goal: 'g_lava2',
  onEnter: 'l2_enter',
  ground: [
    { x: 0, y: 600, w: 520 },
    // lava lake 520–1320 with sinking rocks
    { x: 1320, y: 600, w: 460 },
    // chimney: hanging basalt + the wall (gap 90, climb 300)
    { x: 1640, y: 300, w: 50, h: 220, kind: 'rock', grip: true },
    { x: 1780, y: 300, w: 520, grip: true },
    { x: 2190, y: 80, w: 120, h: 28, kind: 'rock' },     // high perch for the Robot's button
    // bridge 2300–2600 over lava
    { x: 2600, y: 300, w: 1400 },
    { x: 3530, y: 0, w: 60, h: 60, kind: 'rock' },       // over the wall of fire
  ],
  lava: [
    { x: 520, y: 640, w: 800, h: 80 },
    { x: 2300, y: 640, w: 300, h: 80 },
  ],
  sinkers: [
    { x: 600, y: 560, w: 80 },
    { x: 780, y: 545, w: 80 },
    { x: 960, y: 560, w: 80 },
    { x: 1140, y: 545, w: 80 },
  ],
  fireballs: [
    { x: 870, y: 640, h: 220, period: 3600, air: 1300, offset: 600 },
  ],
  plates: [
    { id: 'a', x: 2130, y: 300 },
    { id: 'b', x: 2250, y: 80 },
  ],
  bridges: [{ id: 'b1', x: 2300, y: 300, w: 300, h: 30, open: { all: ['a', 'b'] } }],
  holdSpots: [{ plate: 'b', from: 1900, to: 2300, door: 'b1' }],
  flames: [{ x: 3560, top: 60, bottom: 300 }],          // the exit: only with Stitch's shield
  letters: { word: 'word_stitch', x: 2950, y: 182 },
  cage: { x: 3320, y: 300, friend: 'stitch', prefix: 'l2' },
  stars: [
    { x: 690, y: 480 },
    { x: 1050, y: 480 },
    { x: 1735, y: 230 },
    { x: 2450, y: 240 },
    { x: 3720, y: 250 },
    { x: 2215, y: 48 }, // hidden: on the Robot's high perch — a Robot step, then grab the ledge
  ],
  lanterns: [{ x: 1400, y: 600 }, { x: 1850, y: 300 }, { x: 2680, y: 300 }],
  beetles: [
    { x: 1450, y: 600, min: 1350, max: 1600 },
    { x: 1950, y: 300, min: 1830, max: 2080 },
  ],
  exits: [
    { x: 3860, y: 180, w: 140, h: 120, to: 'home', entry: 'fromLava' },
    { x: 0, y: 480, w: 30, h: 120, to: 'lava1', entry: 'fromLava2' },
  ],
  tips: [
    { x: 420, key: 'l2_rocks' },
    { x: 1560, key: 'l2_climb' },
    { x: 1900, key: 'w2_two', minY: 0, maxY: 330 },
  ],
  triggers: [
    { id: 'cage', x: 2700 },
    { id: 'fire', x: 3430, needs: 'stitch' },
  ],
  decor: [
    { t: 'spikes', x: 300, y: 600 },
    { t: 'spikes', x: 1500, y: 600, s: 0.8 },
    { t: 'spikes', x: 2700, y: 300, s: 0.7 },
    { t: 'caveExitLava', x: 3850, y: 300 },
    { t: 'rocketLava', x: 3880, y: 300 },
  ],
};
