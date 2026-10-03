// Crystal Woods — the treetops, where Nova is trapped.
// Shared puzzles: a robot-only barrier (the Robot presses the button inside) and two
// buttons that must be held at the same time (one by Astro, one by the Robot).
// Then spell NOVA to open her cage, get the dash, and dash through the cracked wall home.
// Forest floor is y = 840; the branches are at y = 520 over a drop.

export default {
  id: 'woods2',
  theme: 'woods',
  w: 3700,
  h: 960,
  entries: {
    fromWoods1: { x: 120, y: 840 },
  },
  goal: 'g_woods2',
  onEnter: 'w2_enter',
  ground: [
    { x: 0, y: 840, w: 740 },
    // hollow tree: hanging vine trunk + the giant trunk (gap 90, climb 320)
    { x: 600, y: 380, w: 50, h: 380, kind: 'trunk', grip: true },
    { x: 740, y: 520, w: 560, kind: 'trunk', grip: true },
    // branches over the drop
    { x: 1300, y: 520, w: 520, h: 44, kind: 'branch' },
    // robot-only chamber with a button inside; Astro goes over its roof (crate = step up)
    { x: 1365, y: 460, w: 50, h: 60, kind: 'crate' },
    { x: 1440, y: 380, w: 170, h: 22, kind: 'branch' },
    { x: 1590, y: 402, w: 20, h: 118, kind: 'branch' },
    { x: 1695, y: 0, w: 50, h: 300, kind: 'trunk' },      // trunk over door d2
    { x: 1820, y: 520, w: 400, h: 44, kind: 'branch' },
    { x: 2060, y: 300, w: 120, h: 30, kind: 'branch' },   // high perch with button pb
    // bridge appears 2220–2520
    { x: 2520, y: 520, w: 1180, h: 44, kind: 'branch' },
    { x: 3220, y: 0, w: 60, h: 300, kind: 'crystal' },    // crystal over the cracked wall
  ],
  barriers: [{ x: 1450, top: 402, bottom: 520 }],
  plates: [
    { id: 'p2', x: 1525, y: 520 },
    { id: 'pa', x: 1950, y: 520 },
    { id: 'pb', x: 2120, y: 300 },
  ],
  doors: [{ id: 'd2', x: 1720, top: 300, bottom: 520, open: { latch: ['p2'] } }],
  bridges: [{ id: 'b1', x: 2220, y: 520, w: 300, h: 30, open: { all: ['pa', 'pb'] } }],
  holdSpots: [
    { plate: 'p2', from: 1300, to: 1710, door: 'd2' },
    { plate: 'pb', from: 1840, to: 2220, door: 'b1' },
  ],
  cracked: [{ x: 3230, y: 300, w: 40, h: 220 }],
  letters: { word: 'word_nova', xs: [2640, 2716, 2792, 2868], y: 402, order: [2, 0, 3, 1] },
  cage: { x: 3030, y: 520, friend: 'nova' },
  stars: [
    { x: 695, y: 640 },
    { x: 1150, y: 480 },
    { x: 1525, y: 350 },
    { x: 2370, y: 480 },
    { x: 3150, y: 480 },
  ],
  lanterns: [{ x: 300, y: 840 }, { x: 1000, y: 520 }, { x: 1860, y: 520 }, { x: 2560, y: 520 }],
  exits: [
    { x: 3330, y: 400, w: 100, h: 120, to: 'home', entry: 'fromWoods' },
    { x: 0, y: 720, w: 30, h: 120, to: 'woods1', entry: 'fromWoods2' },
  ],
  tips: [
    { x: 540, key: 'w2_climb' },
    { x: 1330, key: 'w2_gate', minY: 0, maxY: 600 },
    { x: 1840, key: 'w2_two' },
  ],
  triggers: [
    { id: 'cage', x: 2560 },
    { id: 'crack', x: 3120, needs: 'nova' },
  ],
  decor: [
    { t: 'bigTree', x: 380, y: 840 },
    { t: 'crystals', x: 200, y: 840 },
    { t: 'crystals', x: 1150, y: 520 },
    { t: 'crystalPortal', x: 3390, y: 520 },
  ],
};
