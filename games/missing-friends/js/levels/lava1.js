// Lava Planet — the Fire Fields.
// Teaches: lava pits (the Robot catches you on Easy), fire drops that jump out of the
// lava, fire jets that come and go. Shared puzzles: the Robot stands on a valve to put
// out a wall of fire, then weighs down a button so a lift carries Astro up a cliff.
// Ground top is y = 600; the cliff is at y = 300 and the end of the level at y = 400.

export default {
  id: 'lava1',
  theme: 'lava',
  power: 'shield',
  w: 4400,
  h: 720,
  entries: {
    fromHome: { x: 260, y: 600 },
    fromLava2: { x: 4200, y: 400, face: -1 },
  },
  goal: 'g_lava1',
  onEnter: 'l1_enter',
  ground: [
    { x: 0, y: 600, w: 640 },
    { x: 420, y: 560, w: 60, h: 40, kind: 'rock' },
    // lava pit 640–780
    { x: 780, y: 600, w: 700 },
    { x: 1060, y: 540, w: 70, h: 60, kind: 'rock' },
    // fire-drop pit 1480–1760 with a stepping pillar
    { x: 1590, y: 540, w: 60, kind: 'rock' },
    { x: 1760, y: 600, w: 1060 },
    { x: 2580, y: 0, w: 60, h: 380, kind: 'rock' },      // over the fire wall: no jumping over it
    { x: 2820, y: 600, w: 240 },
    // lift shaft 3060–3160
    { x: 3160, y: 300, w: 420 },
    // lava lake 3580–3980, crossed on planks
    { x: 3980, y: 400, w: 420 },
  ],
  lava: [
    { x: 640, y: 650, w: 140, h: 70 },
    { x: 1480, y: 640, w: 110, h: 80 },
    { x: 1650, y: 640, w: 110, h: 80 },
    { x: 3580, y: 640, w: 400, h: 80 },
  ],
  fireballs: [
    { x: 1535, y: 640, h: 210, period: 3000, air: 1300 },
    { x: 1705, y: 640, h: 210, period: 3000, air: 1300, offset: 1500 },
    { x: 3775, y: 640, h: 300, period: 2800, air: 1400 },
    { x: 3945, y: 640, h: 280, period: 2800, air: 1400, offset: 1400 },
  ],
  flames: [
    { x: 1960, top: 380, bottom: 600, cycle: [1800, 1300] },
    { x: 2190, top: 380, bottom: 600, cycle: [1800, 1300], offset: 900 },
    { x: 2610, top: 380, bottom: 600, off: { hold: 'v1' } },   // the wall of fire with a valve
  ],
  plates: [
    { id: 'v1', x: 2470, y: 600 },
    { id: 'w1', x: 2920, y: 600 },
  ],
  movers: [
    { x: 3062, y: 600, w: 96, x2: 3062, y2: 300, speed: 120, when: { hold: 'w1' }, look: 'rock' },
  ],
  planks: [
    { x: 3640, y: 380, w: 110 },
    { x: 3810, y: 420, w: 110 },
  ],
  holdSpots: [
    { plate: 'v1', from: 2400, to: 2630, until: { x: 2680 } },
    { plate: 'w1', from: 2820, to: 3160, until: { x: 3175, above: 320 }, toggle: true, line: 'r_hold_lift' },
  ],
  beetles: [
    { x: 900, y: 600, min: 820, max: 1040 },
    { x: 1250, y: 600, min: 1150, max: 1460 },
    { x: 3350, y: 300, min: 3200, max: 3540 },
  ],
  stars: [
    { x: 450, y: 500 },
    { x: 710, y: 520 },
    { x: 1620, y: 470 },
    { x: 2075, y: 560 },
    { x: 3110, y: 420 },
    { x: 3865, y: 330 },
    { x: 3420, y: 65 }, // hidden: high over the cliff — a Robot step
  ],
  lanterns: [{ x: 560, y: 600 }, { x: 1820, y: 600 }, { x: 2440, y: 600 }, { x: 3220, y: 300 }, { x: 4040, y: 400 }],
  exits: [
    { x: 4300, y: 270, w: 100, h: 130, to: 'lava2', entry: 'fromLava1' },
    { x: 0, y: 480, w: 30, h: 120, to: 'home', entry: 'fromLava' },
  ],
  tips: [
    { x: 540, key: 'l1_lava' },
    { x: 1390, key: 'l1_fireball' },
    { x: 1800, key: 'l1_jets' },
    { x: 2420, key: 'l1_valve' },
    { x: 2830, key: 'l1_lift' },
    { x: 3480, key: 'l1_lake', minY: 0, maxY: 330 },
    { x: 4080, key: 'l1_exit' },
  ],
  decor: [
    { t: 'rocketLava', x: 140, y: 600 },
    { t: 'spikes', x: 330, y: 600 },
    { t: 'spikes', x: 1300, y: 600, s: 0.8 },
    { t: 'spikes', x: 2340, y: 600, s: 0.9 },
    { t: 'volcano', x: 3420, y: 300, s: 0.9 },
    { t: 'caveLava', x: 4330, y: 400 },
  ],
};
