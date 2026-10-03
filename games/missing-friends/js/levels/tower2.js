// The top of Otto's tower. Otto stands behind the room, stomping and throwing star balls.
// Three jars hold the stars, each guarded by something only one friend can get past:
//   left: cracked glass (Nova's dash), right: a wall of fire (Stitch's shield),
//   up high: a lift far too fast to ride (Scout's bubble).
// Open all three and Otto gives up — and turns out to be lonely.
// Floor top is y = 600.

export default {
  id: 'tower2',
  theme: 'tower',
  w: 1920,
  h: 720,
  entries: {
    start: { x: 560, y: 600 },
  },
  goal: 'g_tower2',
  ground: [
    { x: 0, y: 600, w: 1920 },
    { x: 300, y: 0, w: 60, h: 420, kind: 'rock' },
    { x: 1580, y: 0, w: 60, h: 380, kind: 'rock' },
    { x: 840, y: 170, w: 240, h: 30, kind: 'rock' },     // jar C's ledge
  ],
  cracked: [{ x: 310, y: 420, w: 40, h: 180 }],
  flames: [{ x: 1610, top: 380, bottom: 600 }],
  movers: [
    { x: 1090, y: 495, w: 100, x2: 1090, y2: 170, speed: 560, pause: 300, look: 'metal' },
  ],
  jars: [
    { id: 'a', x: 150, y: 600 },
    { id: 'b', x: 1780, y: 600 },
    { id: 'c', x: 960, y: 170 },
  ],
  // hidden: behind the wall of fire (Stitch's shield), too high to jump — a Robot step
  stars: [{ x: 1860, y: 360 }],
  otto: { x: 960, y: 600, min: 520, max: 1400 },
  exits: [{ x: 0, y: 480, w: 30, h: 120, to: 'home', entry: 'fromTower', needs: 'finished' }],
  tips: [
    { x: 440, key: 't2_jar_dash', dir: -1 },
    { x: 1460, key: 't2_jar_fire' },
    { x: 1040, key: 't2_jar_fast', minY: 0, maxY: 620 },
  ],
  decor: [
    { t: 'gear', x: 600, y: 300, s: 1.4 },
    { t: 'gear', x: 1380, y: 260, s: 1.1 },
    { t: 'flag', x: 1250, y: 600 },
  ],
};
