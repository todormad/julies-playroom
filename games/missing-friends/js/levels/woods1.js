// Crystal Woods — the forest floor.
// Teaches: squashing beetles, the hold-the-button door (shared puzzle: the Robot holds
// the button while Astro runs through), the leaf lift, and a flying plank over a pit.
// A secret room near the end opens to Nova's dash, for a visit after rescuing her.
// Ground top is y = 600.

export default {
  id: 'woods1',
  theme: 'woods',
  w: 3800,
  h: 720,
  entries: {
    fromHome: { x: 120, y: 600 },
    fromWoods2: { x: 3600, y: 420, face: -1 },
  },
  goal: 'g_woods1',
  onEnter: 'w1_enter',
  ground: [
    { x: 0, y: 600, w: 2250 },
    { x: 1975, y: 0, w: 50, h: 380, kind: 'trunk' },     // trunk over the door — no jumping over it
    // lift shaft 2250–2350
    { x: 2350, y: 360, w: 470 },
    // pit 2820–3060 crossed on the flying plank
    { x: 3060, y: 420, w: 740 },
    // a secret room with a star: dash in through the cracked wall once Nova is home
    // (low enough to hop over on the way to the exit)
    { x: 3300, y: 336, w: 170, h: 22, kind: 'rock' },
    { x: 3440, y: 358, w: 30, h: 62, kind: 'rock' },
  ],
  cracked: [{ x: 3300, y: 358, w: 30, h: 62 }],
  planks: [
    { x: 1100, y: 390, w: 170 },
    { x: 1340, y: 370, w: 160 },
  ],
  movers: [
    { x: 2250, y: 600, w: 100, x2: 2250, y2: 360, speed: 110, pause: 900, look: 'leaf' },
    { x: 2830, y: 380, w: 100, x2: 2950, y2: 380, speed: 90, pause: 700 },
  ],
  bouncers: [{ x: 1040, y: 600 }],
  beetles: [
    { x: 470, y: 600, min: 380, max: 600 },
    { x: 840, y: 600, min: 700, max: 960 },
    { x: 1300, y: 600, min: 1150, max: 1480 },
    { x: 2600, y: 360, min: 2450, max: 2780 },
  ],
  plates: [{ id: 'p1', x: 1700, y: 600 }],
  doors: [{ id: 'd1', x: 2000, top: 380, bottom: 600, open: { hold: 'p1' } }],
  holdSpots: [{ plate: 'p1', from: 1550, to: 1990, door: 'd1' }],
  stars: [
    { x: 1185, y: 350 },
    { x: 1420, y: 330 },
    { x: 1850, y: 560 },
    { x: 2300, y: 450 },
    { x: 2880, y: 330 },
    { x: 3400, y: 380 },
    { x: 3385, y: 392 }, // hidden: in the secret room behind the cracked wall (Nova's dash)
  ],
  lanterns: [{ x: 1530, y: 600 }, { x: 2120, y: 600 }, { x: 2760, y: 360 }, { x: 3150, y: 420 }],
  exits: [
    { x: 3680, y: 300, w: 120, h: 120, to: 'woods2', entry: 'fromWoods1' },
    { x: 0, y: 480, w: 30, h: 120, to: 'home', entry: 'fromWoods' },
  ],
  tips: [
    { x: 1560, key: 'w1_plate' },
    { x: 2160, key: 'w1_lift' },
    { x: 3200, key: 'w1_exit' },
  ],
  decor: [
    { t: 'bigTree', x: 300, y: 600 },
    { t: 'crystals', x: 650, y: 600 },
    { t: 'bigTree', x: 1250, y: 600 },
    { t: 'crystals', x: 1820, y: 600 },
    { t: 'crystals', x: 2500, y: 360 },
    { t: 'bigTree', x: 3300, y: 420 },
    { t: 'logArch', x: 3740, y: 420 },
  ],
};
