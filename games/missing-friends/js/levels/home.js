// The Village — the open-world hub. Three trails start here and can be done in any order:
// the Crystal Woods arch (Nova), the Lava rocket pad (Stitch) and the Ice rocket pad (Scout).
// Otto's tower stays locked until all three friends are home.
// Ground top is y = 600.

export default {
  id: 'home',
  theme: 'home',
  w: 3500,
  h: 720,
  entries: {
    fromIntro: { x: 140, y: 600 },
    fromWoods: { x: 3300, y: 600, face: -1 },
    fromLava: { x: 2440, y: 600 },
    fromIce: { x: 2600, y: 600 },
  },
  goal: 'home',
  ground: [
    { x: 0, y: 600, w: 3500 },
    { x: 660, y: 540, w: 50, h: 60, kind: 'crate' },
    // the raised ledge with the secret dash corridor underneath
    { x: 2680, y: 540, w: 70, h: 60, kind: 'rock' },
    { x: 2750, y: 470, w: 250, h: 50, kind: 'rock' },
    { x: 2750, y: 520, w: 30, h: 80, kind: 'rock' },
  ],
  cracked: [{ x: 2970, y: 520, w: 30, h: 80 }],
  planks: [
    { x: 380, y: 420, w: 220, look: 'roof' },
    { x: 720, y: 450, w: 200, look: 'roof' },
  ],
  stars: [
    { x: 490, y: 380 },
    { x: 830, y: 410 },
    { x: 1460, y: 520 },
    { x: 2870, y: 430 },
    { x: 2875, y: 565 },
  ],
  lanterns: [{ x: 1000, y: 600 }],
  pads: [
    { x: 2440, y: 600, friend: 'stitch', tip: 'h_lava_soon', look: 'lava' },
    { x: 2600, y: 600, friend: 'scout', tip: 'h_ice_soon', look: 'ice' },
  ],
  exits: [
    { x: 3380, y: 470, w: 120, h: 130, to: 'woods1', entry: 'fromHome' },
    { x: 0, y: 480, w: 30, h: 120, to: 'intro', entry: 'fromHome' },
  ],
  triggers: [
    { id: 'arrival', x: 1240 },
    { id: 'tower', x: 2110, w: 80, repeat: true },
    { id: 'crackHint', x: 3010, w: 60 },
    { id: 'woodsHint', x: 3200 },
    { id: 'novaParty', x: 1330, w: 160, needs: 'nova' },
  ],
  npcs: [{ friend: 'nova', x: 1400, y: 600, needs: 'nova' }],
  decor: [
    { t: 'gateArch', x: 70, y: 600 },
    { t: 'house', x: 380, y: 600, w: 220, h: 180, color: '#ff9e7a' },
    { t: 'house', x: 720, y: 600, w: 200, h: 150, color: '#8fd3ff' },
    { t: 'tree', x: 1040, y: 600, s: 0.9 },
    { t: 'pole', x: 1150, y: 600 },
    { t: 'pole', x: 1720, y: 600 },
    { t: 'banner', x: 1435, y: 404 },
    { t: 'table', x: 1240, y: 600 },
    { t: 'cake', x: 1430, y: 600 },
    { t: 'table', x: 1620, y: 600 },
    { t: 'feet', x: 1330, y: 600 },
    { t: 'feet', x: 1530, y: 600 },
    { t: 'bolt', x: 1580, y: 600 },
    { t: 'feet', x: 1740, y: 600 },
    { t: 'feet', x: 1950, y: 600 },
    { t: 'tower', x: 2150, y: 600 },
    { t: 'tree', x: 2900, y: 470, s: 0.75 },
    { t: 'archWoods', x: 3430, y: 600 },
  ],
};
