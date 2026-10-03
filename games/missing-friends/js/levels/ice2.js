// Ice Planet — inside the ice cave, where Scout is frozen in.
// Teaches: slippery ice blocks over a drop (keep hopping!), fast ice floes. Shared puzzle:
// a tunnel only the Robot fits through, with the button that opens the door. Then spell
// SCOUT, get the time bubble, ring the bell and slip through the gate before it shuts,
// out of the cave to the rocket. Ground top is y = 600.

export default {
  id: 'ice2',
  theme: 'icecave',
  power: 'bubble',
  w: 4000,
  h: 720,
  entries: {
    fromIce1: { x: 120, y: 600 },
  },
  goal: 'g_ice2',
  onEnter: 'f2_enter',
  ground: [
    { x: 0, y: 600, w: 640 },
    // a drop 640–1340 with slippery ice blocks
    { x: 700, y: 550, w: 180, h: 30, kind: 'ice' },
    { x: 940, y: 510, w: 180, h: 30, kind: 'ice' },
    { x: 1180, y: 550, w: 120, h: 30, kind: 'ice' },
    { x: 1340, y: 600, w: 660 },
    // Robot-only chamber: a crate to climb, the roof, the barrier, the button inside
    { x: 1465, y: 540, w: 50, h: 60, kind: 'crate' },
    { x: 1540, y: 460, w: 170, h: 22, kind: 'rock' },
    { x: 1690, y: 482, w: 20, h: 118, kind: 'rock' },
    { x: 1795, y: 0, w: 50, h: 380, kind: 'rock' },       // over the door
    // a drop 2000–2600 with fast ice floes
    { x: 2600, y: 600, w: 1400 },
    { x: 3675, y: 0, w: 50, h: 380, kind: 'rock' },       // over the quick gate
  ],
  barriers: [{ x: 1550, top: 482, bottom: 600 }],
  plates: [{ id: 'p1', x: 1625, y: 600 }],
  doors: [
    { id: 'd1', x: 1820, top: 380, bottom: 600, open: { latch: ['p1'] } },
    { id: 'g1', x: 3700, top: 380, bottom: 600, open: { timer: 'g1' } },
  ],
  holdSpots: [{ plate: 'p1', from: 1400, to: 1810, door: 'd1' }],
  movers: [
    { x: 2030, y: 560, w: 100, x2: 2230, y2: 560, speed: 210, pause: 350, look: 'ice' },
    { x: 2300, y: 520, w: 100, x2: 2480, y2: 520, speed: 230, pause: 350, look: 'ice' },
  ],
  bells: [{ x: 3330, y: 482, timer: 'g1', ms: 700 }],
  letters: { word: 'word_scout', x: 2880, y: 482 },
  cage: { x: 3180, y: 600, friend: 'scout', prefix: 'f2' },
  stars: [
    { x: 1020, y: 440 },
    { x: 1625, y: 410 },
    { x: 2180, y: 470 },
    { x: 2430, y: 430 },
    { x: 3560, y: 520 },
    { x: 3880, y: 520 },
    { x: 1625, y: 228 }, // hidden: high over the tunnel roof — a Robot step on the roof
  ],
  lanterns: [{ x: 560, y: 600 }, { x: 1400, y: 600 }, { x: 1940, y: 600 }, { x: 2660, y: 600 }],
  beetles: [{ x: 2680, y: 600, min: 2620, max: 2740 }],
  exits: [
    { x: 3860, y: 480, w: 140, h: 120, to: 'home', entry: 'fromIce' },
    { x: 0, y: 480, w: 30, h: 120, to: 'ice1', entry: 'fromIce2' },
  ],
  tips: [
    { x: 560, key: 'f2_blocks' },
    { x: 1400, key: 'w2_gate' },
    { x: 1960, key: 'f2_zoom' },
  ],
  triggers: [
    { id: 'cage', x: 2640 },
    { id: 'gate', x: 3260, needs: 'scout' },
  ],
  decor: [
    { t: 'stalagmites', x: 300, y: 600 },
    { t: 'crystals', x: 520, y: 600 },
    { t: 'stalagmites', x: 1960, y: 600, s: 0.8 },
    { t: 'crystals', x: 2660, y: 600, s: 0.9 },
    { t: 'stalagmites', x: 3480, y: 600, s: 0.9 },
    { t: 'caveExit', x: 3870, y: 600 },
    { t: 'rocketIce', x: 3900, y: 600 },
  ],
};
