// Otto's Tower — the climb. Opens once all three friends are home, and needs all of
// their powers in turn (the right one is picked automatically in each part):
//   Nova's dash: cracked walls and gaps too wide to jump,
//   Stitch's shield: walls of fire and a lava trough,
//   Scout's bubble: stompers and a gate that shuts fast.
// Shared puzzle: the Robot holds the button of the lift up to the top floor.
// Ground top is y = 600; the top floor is y = 320.

export default {
  id: 'tower1',
  theme: 'tower',
  w: 5300,
  h: 720,
  entries: {
    fromHome: { x: 140, y: 600 },
  },
  goal: 'g_tower1',
  onEnter: 't1_enter',
  powerZones: [{ x: 0, power: 'dash' }, { x: 1700, power: 'shield' }, { x: 3420, power: 'bubble' }],
  ground: [
    // ── Nova's part ──
    { x: 0, y: 600, w: 640 },
    { x: 500, y: 0, w: 60, h: 420, kind: 'rock' },
    // gap 640–900: jump + dash
    { x: 900, y: 600, w: 520 },
    { x: 1240, y: 0, w: 60, h: 420, kind: 'rock' },
    // gap 1420–1680
    // ── Stitch's part ──
    { x: 1680, y: 600, w: 640 },
    { x: 2020, y: 0, w: 60, h: 380, kind: 'rock' },
    // lava trough 2320–2720 (planks, or bounce off it with the shield)
    { x: 2720, y: 600, w: 740 },
    { x: 2870, y: 0, w: 60, h: 360, kind: 'rock' },
    { x: 3070, y: 0, w: 60, h: 360, kind: 'rock' },
    // lift shaft 3460–3560 to the top floor
    // ── Scout's part ──
    { x: 3560, y: 320, w: 560 },
    // drop 4120–4500 with a fast floe
    { x: 4500, y: 320, w: 800 },
    { x: 4985, y: 0, w: 50, h: 100, kind: 'rock' },
  ],
  cracked: [
    { x: 510, y: 420, w: 40, h: 180 },
    { x: 1250, y: 420, w: 40, h: 180 },
  ],
  lava: [{ x: 2320, y: 640, w: 400, h: 80 }],
  fireballs: [
    { x: 2470, y: 640, h: 230, period: 2600, air: 1300 },
    { x: 2650, y: 640, h: 230, period: 2600, air: 1300, offset: 1300 },
  ],
  planks: [
    { x: 2380, y: 550, w: 100 },
    { x: 2560, y: 530, w: 100 },
  ],
  flames: [
    { x: 2050, top: 380, bottom: 600 },
    { x: 2900, top: 360, bottom: 600 },
    { x: 3100, top: 360, bottom: 600 },
  ],
  plates: [{ id: 'w1', x: 3390, y: 600 }],
  movers: [
    { x: 3462, y: 600, w: 96, x2: 3462, y2: 320, speed: 120, when: { hold: 'w1' }, look: 'metal' },
    { x: 4130, y: 320, w: 100, x2: 4390, y2: 320, speed: 380, pause: 350, look: 'metal' },
  ],
  holdSpots: [{ plate: 'w1', from: 3240, to: 3560, until: { x: 3575, above: 340 }, toggle: true, line: 'r_hold_lift' }],
  crushers: [
    { x: 3700, top: 40, w: 90, h: 80, floor: 320, cycle: [1100, 400] },
    { x: 3900, top: 40, w: 90, h: 80, floor: 320, cycle: [1100, 400], offset: 800 },
  ],
  bells: [{ x: 4640, y: 202, timer: 'g1', ms: 650 }],
  doors: [{ id: 'g1', x: 5010, top: 100, bottom: 320, open: { timer: 'g1' } }],
  stars: [
    { x: 770, y: 470 },
    { x: 1550, y: 470 },
    { x: 2520, y: 470 },
    { x: 3000, y: 560 },
    { x: 3800, y: 280 },
    { x: 4260, y: 240 },
    { x: 4780, y: 88 }, // hidden: high over the top floor — a Robot step
  ],
  lanterns: [{ x: 300, y: 600 }, { x: 1000, y: 600 }, { x: 1740, y: 600 }, { x: 2780, y: 600 }, { x: 3600, y: 320 }, { x: 4560, y: 320 }],
  exits: [
    { x: 5180, y: 200, w: 120, h: 120, to: 'tower2', entry: 'start' },
    { x: 0, y: 480, w: 30, h: 120, to: 'home', entry: 'fromTower' },
  ],
  tips: [
    { x: 560, key: 't1_gap' },
    { x: 2300, key: 'l1_lake', minY: 0, maxY: 620 },
    { x: 3250, key: 'l1_lift' },
    { x: 3600, key: 't1_crush', minY: 0, maxY: 340 },
    { x: 4520, key: 't1_bell', minY: 0, maxY: 340 },
  ],
  decor: [
    { t: 'gear', x: 300, y: 420, s: 1.2 },
    { t: 'flag', x: 820, y: 600 },
    { t: 'gear', x: 1900, y: 380 },
    { t: 'gear', x: 3300, y: 420, s: 0.9 },
    { t: 'flag', x: 4700, y: 320 },
  ],
};
