// Art for the Lava Planet, the Ice Planet and Otto's tower: backdrops, terrain caps,
// hazards, props, the beetle variants and Big Otto himself.

import { TAU, INK, rng, makeCanvas, lin, rad, rrect, ink, starPath, heartPath, limbLine, glow } from './paint.js';

export const PLANET_THEMES = {
  lava: {
    sky: [[0, '#16081f'], [0.35, '#431434'], [0.66, '#93283a'], [0.86, '#de5a35'], [1, '#ffac55']],
    far: ['#3d1530', '#220b1c', '#4a1a34', '#2a0e22'],
    hills: ['#3a1628', '#1c0a16'],
    near: '#1a0912',
    fog: '255,120,60',
    soil: ['#6e4a60', '#4a2e42', '#1c0e1a'],
    cap: ['#a08a9c', '#5e4a5e', '#2e1e2c'],
    blades: ['#ff8a3c', '#ffd27a'],
    tuft: ['#ff7a2a', '#ffb04a'],
    rock: ['#8e6e82', '#644a62', '#34202f'],
    pollen: [0xffb347, 0xff6a2a, 0xffe08a],
    bg: '#16081f',
    cap_style: 'ash',
  },
  ice: {
    sky: [[0, '#0b1d48'], [0.38, '#24548f'], [0.74, '#6fb0dc'], [1, '#d2eeff']],
    far: ['#a6c8ea', '#6c98c8', '#c2dcf2', '#8cb2da'],
    hills: ['#d6eafa', '#8cb6de'],
    near: '#3f6592',
    fog: '230,245,255',
    soil: ['#7da3d4', '#4b70aa', '#1d3366'],
    cap: ['#ffffff', '#e2f2ff', '#a2c8ea'],
    blades: ['#ffffff', '#d8f0ff'],
    tuft: ['#e8f6ff', '#ffffff'],
    rock: ['#a8c4e6', '#6d8fc0', '#3a5488'],
    pollen: [0xffffff, 0xe0f4ff, 0xc8e8ff],
    bg: '#0b1d48',
    cap_style: 'snow',
  },
  // Inside the ice cave: a rock-and-ice back wall instead of a sky, stalactites overhead.
  icecave: {
    sky: [[0, '#040a1c'], [0.45, '#0b1c3e'], [1, '#17406c']],
    far: ['#1d4277', '#0f2550', '#2b5a92', '#173566'],
    hills: ['#2a5f96', '#112a54'],
    near: '#07142c',
    fog: '110,200,255',
    soil: ['#5a86c0', '#2f5590', '#122a5a'],
    cap: ['#eaf8ff', '#a8d8f6', '#5a9ad0'],
    blades: ['#ffffff', '#c8ecff'],
    tuft: ['#d8f2ff', '#ffffff'],
    rock: ['#7096c8', '#3f6aa6', '#1c3870'],
    pollen: [0x9ff0ff, 0xc8e8ff, 0xffffff],
    bg: '#040a1c',
    cap_style: 'snow',
    cave: true,
  },
  tower: {
    sky: [[0, '#06051a'], [0.42, '#1b1450'], [0.76, '#45307c'], [1, '#8b5aa8']],
    far: ['#2e2466', '#1e1848', '#3a2e78', '#261e58'],
    hills: ['#5a4a9a', '#33296a'],
    near: '#1c1640',
    fog: '190,160,255',
    soil: ['#6c6a92', '#4a486e', '#22223c'],
    cap: ['#d4c2ff', '#8c70d6', '#4a3a8a'],
    blades: ['#ffd54f', '#ffffff'],
    tuft: ['#8c70d6', '#c9b2ff'],
    rock: ['#8c80b8', '#5e5490', '#33295e'],
    pollen: [0xd2b8ff, 0xffffff, 0xffe08a],
    bg: '#06051a',
    cap_style: 'metal',
  },
};

// ── Backdrops ───────────────────────────────────────────────────────────────

// A glowing ice crystal cluster, used on cave walls.
function iceCluster(g, x, y, s, r, alpha = 1) {
  glow(g, x, y - s, s * 2.2, '120,220,255', 0.35 * alpha);
  for (let k = 0; k < 4; k++) {
    const h = s * (1.2 + r() * 1.6), w = s * (0.25 + r() * 0.2), lean = (r() - 0.5) * 0.9;
    g.save(); g.translate(x + (r() - 0.5) * s, y); g.rotate(lean);
    g.beginPath(); g.moveTo(-w, 0); g.lineTo(-w, -h * 0.75); g.lineTo(0, -h); g.lineTo(w, -h * 0.75); g.lineTo(w, 0); g.closePath();
    g.fillStyle = lin(g, -w, 0, w, 0, [[0, `rgba(90,180,240,${0.8 * alpha})`], [0.5, `rgba(220,248,255,${0.95 * alpha})`], [1, `rgba(80,160,230,${0.8 * alpha})`]]);
    g.fill();
    g.restore();
  }
}

// The cave ceiling: a jagged rock edge with hanging stalactites.
function caveCeiling(g, w, depth, r, rock, tip) {
  g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, depth * 0.5);
  for (let x = w; x >= 0; x -= 14) g.lineTo(x, depth * (0.35 + r() * 0.3));
  g.closePath();
  g.fillStyle = rock; g.fill();
  for (let x = 10 + r() * 30; x < w; x += 26 + r() * 60) {
    const len = depth * (0.5 + r() * 1.1), half = 6 + r() * 12, top = depth * 0.4;
    g.beginPath(); g.moveTo(x - half, top); g.lineTo(x, top + len); g.lineTo(x + half, top); g.closePath();
    g.fillStyle = rock; g.fill();
    if (tip) {
      g.beginPath(); g.moveTo(x - half * 0.45, top + len * 0.55); g.lineTo(x, top + len); g.lineTo(x + half * 0.45, top + len * 0.55); g.closePath();
      g.fillStyle = tip; g.fill();
    }
  }
}

export function skyExtras(g, theme, W, H) {
  if (theme === 'icecave') {
    // the back wall: dark rock with frozen seams and glowing crystals
    const r = rng(404);
    for (let i = 0; i < 60; i++) {
      const x = r() * W, y = r() * H, rr = 20 + r() * 70;
      g.fillStyle = `rgba(${r() < 0.5 ? '30,70,130' : '6,14,36'},${0.18 + r() * 0.2})`;
      g.beginPath(); g.ellipse(x, y, rr * 1.4, rr, r() * 3, 0, TAU); g.fill();
    }
    g.strokeStyle = 'rgba(140,220,255,0.18)'; g.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      let x = r() * W, y = 60 + r() * H * 0.6;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 80; y += 14 + r() * 30; g.lineTo(x, y); }
      g.stroke();
    }
    for (let i = 0; i < 7; i++) iceCluster(g, 60 + r() * (W - 120), 160 + r() * 300, 10 + r() * 14, r, 0.7);
    // a soft light from cracks in the ceiling
    for (const lx of [240, 690]) {
      g.fillStyle = lin(g, lx, 0, lx + 120, H, [[0, 'rgba(200,240,255,0.16)'], [1, 'rgba(200,240,255,0)']]);
      g.beginPath(); g.moveTo(lx - 20, 0); g.lineTo(lx + 30, 0); g.lineTo(lx + 160, H); g.lineTo(lx + 40, H); g.closePath(); g.fill();
    }
    caveCeiling(g, W, 70, r, '#030816', null);
    return;
  }
  if (theme === 'lava') {
    g.fillStyle = rad(g, 480, 560, 20, 420, [[0, 'rgba(255,190,90,0.75)'], [0.4, 'rgba(255,90,40,0.35)'], [1, 'rgba(255,60,40,0)']]);
    g.fillRect(0, 0, W, H);
    for (let k = 0; k < 4; k++) {
      g.fillStyle = `rgba(30,8,20,${0.25 - k * 0.04})`;
      g.beginPath();
      for (let x = -20; x <= W + 20; x += 20) {
        const y = 60 + k * 46 + Math.sin(x / 120 + k * 1.7) * 18;
        if (x < 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.lineTo(W + 20, 40 + k * 46); g.lineTo(-20, 40 + k * 46); g.closePath(); g.fill();
    }
    const px = 760, py = 110, pr = 40;
    g.fillStyle = rad(g, px - 12, py - 14, 4, pr * 1.2, [[0, '#ffd9a0'], [0.55, '#e0603a'], [1, '#6a1830']]);
    g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
    glow(g, px, py, 110, '255,140,80', 0.2);
    return;
  }
  if (theme === 'ice') {
    for (let k = 0; k < 4; k++) {
      g.strokeStyle = `rgba(${k % 2 ? '170,255,210' : '255,170,230'},${0.16 - k * 0.025})`;
      g.lineWidth = 50 - k * 9;
      g.beginPath();
      for (let x = -20; x <= W + 20; x += 20) {
        const y = 90 + k * 36 + Math.sin(x / 160 + k * 0.9) * 30 + Math.sin(x / 57) * 6;
        if (x < 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.fillStyle = rad(g, 220, 120, 2, 44, [[0, '#ffffff'], [0.6, '#fff6d8'], [1, 'rgba(255,240,200,0)']]);
    g.beginPath(); g.arc(220, 120, 44, 0, TAU); g.fill();
    glow(g, 220, 120, 120, '255,250,220', 0.25);
    return;
  }
  if (theme === 'tower') {
    const r = rng(99);
    for (let i = 0; i < 120; i++) {
      const x = r() * W, y = r() * H * 0.7;
      g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`;
      starPath(g, x, y, 1.6 + r() * 1.6, 0.7, 4); g.fill();
    }
    g.fillStyle = rad(g, 730, 120, 4, 60, [[0, '#ffffff'], [0.7, '#e8dcff'], [1, '#b9a2ee']]);
    g.beginPath(); g.arc(736, 124, 54, 0, TAU); g.fill();
    g.fillStyle = 'rgba(150,120,220,0.35)';
    for (const [x, y, rr] of [[716, 108, 9], [752, 140, 12], [760, 104, 6]]) { g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
    glow(g, 736, 124, 150, '220,200,255', 0.2);
  }
}

function cloudBand(g, w, H, y, col, r, big = 1) {
  g.fillStyle = col;
  for (let x = -40; x < w + 40; x += 34 + r() * 30) {
    const rr = (22 + r() * 26) * big;
    g.beginPath(); g.arc(x, y + (r() - 0.5) * 16, rr, 0, TAU); g.fill();
  }
  g.fillRect(0, y, w, H - y);
}

export function drawFarPlanet(g, theme, w, H, T, ridge) {
  const r = rng(13 + theme.length * 5);
  if (theme === 'lava') {
    for (let x = 60; x < w; x += 300 + r() * 260) {
      const bw = 170 + r() * 120, top = 120 + r() * 50;
      g.beginPath();
      g.moveTo(x - bw, H); g.lineTo(x - 26, top); g.lineTo(x + 26, top); g.lineTo(x + bw, H); g.closePath();
      g.fillStyle = lin(g, 0, top, 0, H, [[0, T.far[2]], [1, T.far[1]]]); g.fill();
      glow(g, x, top, 50, '255,140,60', 0.5);
      g.strokeStyle = 'rgba(255,120,50,0.75)'; g.lineWidth = 3;
      for (let k = -1; k <= 1; k += 2) {
        g.beginPath(); g.moveTo(x + k * 12, top + 2);
        for (let y = top; y < H; y += 12) g.lineTo(x + k * (12 + (y - top) * 0.35) + Math.sin(y / 9) * 3, y);
        g.stroke();
      }
    }
    ridge(g, w, H, 250, 40, 1 / 80, T.far[0], T.far[1], 'rgba(255,140,90,0.25)', r);
    return;
  }
  if (theme === 'ice') {
    ridge(g, w, H, 200, 120, 1 / 130, T.far[0], T.far[1], 'rgba(255,255,255,0.6)', r);
    // snow caps on the far peaks
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (let x = 0; x < w; x += 140 + r() * 120) {
      g.beginPath(); g.moveTo(x - 30, 150 + r() * 20); g.lineTo(x, 100 + r() * 30); g.lineTo(x + 34, 150 + r() * 20); g.closePath(); g.fill();
    }
    ridge(g, w, H, 245, 60, 1 / 90, T.far[2], T.far[3], 'rgba(255,255,255,0.4)', r);
    return;
  }
  if (theme === 'icecave') {
    // great ice columns on the back wall
    for (let x = 30; x < w; x += 140 + r() * 180) {
      const cw = 40 + r() * 50;
      g.fillStyle = lin(g, x - cw / 2, 0, x + cw / 2, 0, [[0, 'rgba(40,100,170,0.55)'], [0.5, 'rgba(120,200,250,0.5)'], [1, 'rgba(30,80,150,0.55)']]);
      g.beginPath(); g.moveTo(x - cw / 2, H); g.quadraticCurveTo(x - cw * 0.2, H * 0.5, x - cw * 0.35, 0); g.lineTo(x + cw * 0.35, 0); g.quadraticCurveTo(x + cw * 0.2, H * 0.5, x + cw / 2, H); g.closePath(); g.fill();
    }
    ridge(g, w, H, 255, 50, 1 / 70, T.far[0], T.far[1], 'rgba(160,230,255,0.35)', r);
    return;
  }
  // tower: the sea of clouds far below
  cloudBand(g, w, H, 200, 'rgba(120,96,190,0.55)', r, 1.2);
  cloudBand(g, w, H, 240, 'rgba(80,62,150,0.7)', r);
}

function pine(g, x, y, h, body, snow) {
  g.fillStyle = body;
  for (let k = 0; k < 3; k++) {
    const yy = y - h * (0.25 + k * 0.28), ww = h * (0.42 - k * 0.1);
    g.beginPath(); g.moveTo(x - ww, yy + h * 0.22); g.lineTo(x, yy - h * 0.2); g.lineTo(x + ww, yy + h * 0.22); g.closePath(); g.fill();
    if (snow) {
      g.fillStyle = snow;
      g.beginPath(); g.moveTo(x - ww * 0.5, yy + h * 0.02); g.lineTo(x, yy - h * 0.2); g.lineTo(x + ww * 0.5, yy + h * 0.02); g.quadraticCurveTo(x, yy + h * 0.08, x - ww * 0.5, yy + h * 0.02); g.fill();
      g.fillStyle = body;
    }
  }
  g.fillRect(x - 3, y - h * 0.1, 6, h * 0.12);
}

export function drawHillsPlanet(g, theme, w, H, T, top) {
  const r = rng(29 + theme.length * 3);
  if (theme === 'lava') {
    for (let x = 30; x < w; x += 70 + r() * 120) {
      const y = top(x) + 12, h = 30 + r() * 60;
      g.fillStyle = T.hills[1];
      g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x - 3, y - h); g.lineTo(x + 4, y - h * 0.9); g.lineTo(x + 14, y); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,120,50,0.6)'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x, y - h * 0.8); g.lineTo(x - 2, y - h * 0.4); g.lineTo(x + 2, y); g.stroke();
    }
  } else if (theme === 'ice') {
    for (let x = 30; x < w; x += 44 + r() * 70) pine(g, x, top(x) + 10, 40 + r() * 34, '#3d6f8e', 'rgba(255,255,255,0.9)');
  } else if (theme === 'icecave') {
    // stalagmites and crystal clusters on an uneven cave floor
    const floor = (x) => 150 - 22 * Math.sin(x / 130 + 0.7) - 10 * Math.sin(x / 47);
    for (let x = 20; x < w; x += 50 + r() * 90) {
      const h = 40 + r() * 80, half = 12 + r() * 14;
      g.beginPath(); g.moveTo(x - half, floor(x) + 6); g.lineTo(x - 2, floor(x) - h); g.lineTo(x + 2, floor(x) - h); g.lineTo(x + half, floor(x) + 6); g.closePath();
      g.fillStyle = lin(g, 0, floor(x) - h, 0, floor(x), [[0, '#9fd6f6'], [0.3, T.hills[0]], [1, T.hills[1]]]); g.fill();
      if (r() < 0.45) iceCluster(g, x + half + 10, floor(x) + 4, 8 + r() * 6, r);
    }
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= w; x += 6) g.lineTo(x, floor(x));
    g.lineTo(w, H); g.closePath();
    g.fillStyle = lin(g, 0, 100, 0, H, [[0, T.hills[0]], [1, T.hills[1]]]); g.fill();
    g.strokeStyle = 'rgba(170,235,255,0.35)'; g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x <= w; x += 6) { if (x) g.lineTo(x, floor(x)); else g.moveTo(x, floor(x)); }
    g.stroke();
    return true;
  } else {
    // floating rocks with tiny houses
    for (let x = 80; x < w; x += 260 + r() * 220) {
      const y = 70 + r() * 60, s = 30 + r() * 30;
      g.fillStyle = '#4a3d82';
      g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.lineTo(x + s * 0.3, y + s * 1.1); g.lineTo(x - s * 0.2, y + s * 0.8); g.closePath(); g.fill();
      g.fillStyle = '#7a6ac0'; g.fillRect(x - s, y - 4, s * 2, 6);
      g.fillStyle = 'rgba(255,214,120,0.85)'; g.fillRect(x - 6, y - 16, 10, 10);
    }
    cloudBand(g, w, H, 160, 'rgba(170,150,230,0.45)', r);
    return true;
  }
  return false;
}

export function drawNearPlanet(g, theme, w, H, T) {
  const r = rng(53 + theme.length);
  for (let x = 20; x < w; x += 80 + r() * 150) {
    const h = 60 + r() * 90;
    if (theme === 'lava') {
      g.fillStyle = T.near;
      g.beginPath(); g.moveTo(x - 22, H); g.lineTo(x - 6, H - h); g.lineTo(x + 4, H - h * 0.75); g.lineTo(x + 12, H - h * 0.9); g.lineTo(x + 26, H); g.closePath(); g.fill();
      glow(g, x, H - h * 0.5, 10, '255,110,50', 0.5);
    } else if (theme === 'ice') {
      pine(g, x, H + 4, h * 1.1, T.near, 'rgba(240,250,255,0.75)');
    } else if (theme === 'icecave') {
      const half = 14 + r() * 18;
      g.fillStyle = T.near;
      g.beginPath(); g.moveTo(x - half, H); g.lineTo(x - 4, H - h); g.lineTo(x + 3, H - h * 0.92); g.lineTo(x + half, H); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(120,210,255,0.35)'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x - 3, H - h + 6); g.lineTo(x - half * 0.6, H); g.stroke();
    } else {
      g.strokeStyle = T.near; g.lineWidth = 7;
      g.beginPath(); g.moveTo(x, H); g.lineTo(x, H - h); g.lineTo(x + 50, H - h); g.lineTo(x + 50, H); g.stroke();
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(x, H - h); g.lineTo(x + 50, H - h * 0.5); g.lineTo(x, H - h * 0.1); g.stroke();
    }
  }
}

// Stalactites hanging from the cave roof, on their own parallax layer.
export function drawRoof(R, theme, w) {
  const H = 200;
  const { c, g } = makeCanvas(w, H, R);
  const r = rng(77 + theme.length);
  caveCeiling(g, w, 110, r, '#0a1a38', 'rgba(170,230,255,0.85)');
  g.strokeStyle = 'rgba(140,220,255,0.25)'; g.lineWidth = 2;
  g.beginPath();
  for (let x = 0; x <= w; x += 14) g.lineTo(x, 40 + Math.sin(x / 37) * 6);
  g.stroke();
  return c;
}

// The way out of the ice cave: daylight and snow through a rocky arch.
export function drawCaveExit(R) {
  const W = 340, H = 330;
  const { c, g } = makeCanvas(W, H, R);
  const arch = () => { g.beginPath(); g.moveTo(40, H); g.quadraticCurveTo(30, 40, W / 2, 30); g.quadraticCurveTo(W - 30, 40, W - 40, H); g.closePath(); };
  glow(g, W / 2, H * 0.6, W * 0.6, '220,245,255', 0.5);
  arch();
  g.fillStyle = lin(g, 0, 30, 0, H, [[0, '#8fd0ff'], [0.6, '#d8f2ff'], [1, '#ffffff']]); g.fill();
  g.save(); arch(); g.clip();
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(0, H); g.quadraticCurveTo(W * 0.3, H - 110, W * 0.55, H - 70); g.quadraticCurveTo(W * 0.8, H - 120, W, H - 60); g.lineTo(W, H); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.beginPath(); g.arc(W * 0.7, 90, 22, 0, TAU); g.fill();
  g.restore();
  // rocky rim
  g.lineWidth = 26; g.strokeStyle = '#0d2148'; arch(); g.stroke();
  g.lineWidth = 2.4; g.strokeStyle = 'rgba(170,230,255,0.8)';
  g.beginPath(); g.moveTo(56, H); g.quadraticCurveTo(46, 56, W / 2, 46); g.quadraticCurveTo(W - 46, 56, W - 56, H); g.stroke();
  for (let x = 70; x < W - 70; x += 22) {
    const y = 42 + Math.abs(x - W / 2) * 0.12;
    g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x, y + 18 + (x % 3) * 6); g.lineTo(x + 6, y); g.closePath();
    g.fillStyle = '#d8f2ff'; g.fill();
  }
  return c;
}

export function drawStalagmites(R) {
  const { c, g } = makeCanvas(120, 110, R);
  const r = rng(9);
  for (const [x, h, half] of [[30, 70, 14], [62, 100, 18], [92, 56, 12]]) {
    g.beginPath(); g.moveTo(x - half, 110); g.lineTo(x - 2, 110 - h); g.lineTo(x + 2, 110 - h); g.lineTo(x + half, 110); g.closePath();
    g.fillStyle = lin(g, x - half, 0, x + half, 0, [[0, '#3f6aa6'], [0.5, '#b8e4ff'], [1, '#2f5590']]); g.fill(); ink(g, 2);
  }
  iceCluster(g, 100, 110, 10, r);
  return c;
}

// ── Terrain caps & grips ────────────────────────────────────────────────────

export function planetCap(g, x, y, w, r, T, style) {
  const top = y - 3;
  if (style === 'snow') {
    g.beginPath();
    g.moveTo(x + 6, top - 4);
    g.quadraticCurveTo(x + w / 2, top - 9, x + w - 6, top - 4);
    g.quadraticCurveTo(x + w + 3, top, x + w - 2, top + 10);
    let px = x + w - 2;
    while (px > x + 6) {
      const nx = Math.max(x + 2, px - (12 + r() * 18));
      g.quadraticCurveTo((px + nx) / 2, top + 14 + r() * 8, nx, top + 10);
      px = nx;
    }
    g.quadraticCurveTo(x - 3, top, x + 6, top - 4);
    g.closePath();
    g.fillStyle = lin(g, 0, top - 8, 0, top + 20, [[0, T.cap[0]], [0.6, T.cap[1]], [1, T.cap[2]]]); g.fill(); ink(g, 2.2);
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x + 12, top - 2); g.lineTo(x + w - 12, top - 2); g.stroke();
    for (let ix = x + 12; ix < x + w - 10; ix += 26 + r() * 40) {
      const len = 6 + r() * 12;
      g.beginPath(); g.moveTo(ix - 3, top + 12); g.lineTo(ix, top + 12 + len); g.lineTo(ix + 3, top + 12); g.closePath();
      g.fillStyle = 'rgba(220,245,255,0.95)'; g.fill(); g.strokeStyle = 'rgba(27,22,64,0.6)'; g.lineWidth = 1.2; g.stroke();
    }
    for (let i = 0; i < w / 40; i++) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(x + 8 + r() * (w - 16), top + 1 + r() * 5, 1 + r() * 1.2, 0, TAU); g.fill(); }
    return;
  }
  if (style === 'ash') {
    g.beginPath();
    g.moveTo(x + 4, top); g.lineTo(x + w - 4, top);
    g.lineTo(x + w, top + 6);
    let px = x + w;
    while (px > x + 4) {
      const nx = Math.max(x, px - (8 + r() * 14));
      g.lineTo((px + nx) / 2, top + 9 + r() * 6); g.lineTo(nx, top + 7);
      px = nx;
    }
    g.lineTo(x, top + 5); g.closePath();
    g.fillStyle = lin(g, 0, top, 0, top + 14, [[0, T.cap[0]], [1, T.cap[2]]]); g.fill(); ink(g, 2.2);
    g.strokeStyle = 'rgba(255,140,70,0.9)'; g.lineWidth = 1.6;
    for (let cx = x + 10; cx < x + w - 10; cx += 22 + r() * 30) {
      g.beginPath(); g.moveTo(cx, top + 2); g.lineTo(cx + 5, top + 6); g.lineTo(cx + 2, top + 11); g.stroke();
    }
    g.strokeStyle = 'rgba(255,220,200,0.4)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x + 8, top + 2); g.lineTo(x + w - 8, top + 2); g.stroke();
    for (let i = 0; i < w / 70; i++) glow(g, x + 10 + r() * (w - 20), top - 2, 4, '255,170,80', 0.9);
    return;
  }
  // metal: riveted trim
  rrect(g, x, top - 2, w, 12, 4);
  g.fillStyle = lin(g, 0, top - 2, 0, top + 10, [[0, T.cap[0]], [0.5, T.cap[1]], [1, T.cap[2]]]); g.fill(); ink(g, 2.2);
  g.fillStyle = '#ffd54f';
  for (let rx = x + 10; rx < x + w - 6; rx += 26) { g.beginPath(); g.arc(rx, top + 4, 1.8, 0, TAU); g.fill(); }
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(x + 6, top); g.lineTo(x + w - 6, top); g.stroke();
}

// Soil body details instead of crystals and pebbles.
export function planetSoil(g, x0, y0, W, H, r, style) {
  if (style === 'ash') {
    g.strokeStyle = 'rgba(255,110,50,0.55)'; g.lineWidth = 2;
    for (let i = 0; i < Math.max(1, (W * H) / 12000); i++) {
      let x = x0 + 10 + r() * (W - 20), y = y0 + 30 + r() * Math.max(10, H - 40);
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 3; k++) { x += (r() - 0.5) * 30; y += 8 + r() * 14; g.lineTo(x, y); }
      g.stroke();
    }
    for (let i = 0; i < Math.max(1, W / 160); i++) glow(g, x0 + 20 + r() * (W - 40), y0 + 40 + r() * Math.max(10, H - 60), 9, '255,120,60', 0.45);
  } else if (style === 'snow') {
    g.strokeStyle = 'rgba(220,240,255,0.35)'; g.lineWidth = 1.5;
    for (let i = 0; i < Math.max(1, (W * H) / 9000); i++) {
      const cx = x0 + 10 + r() * (W - 20), cy = y0 + 30 + r() * Math.max(10, H - 40), s = 4 + r() * 4;
      for (let a = 0; a < 3; a++) { g.beginPath(); g.moveTo(cx - Math.cos(a * 1.05) * s, cy - Math.sin(a * 1.05) * s); g.lineTo(cx + Math.cos(a * 1.05) * s, cy + Math.sin(a * 1.05) * s); g.stroke(); }
    }
  } else {
    g.strokeStyle = 'rgba(20,16,50,0.5)'; g.lineWidth = 2;
    for (let y = y0 + 30; y < y0 + H; y += 46) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + W, y); g.stroke(); }
    for (let x = x0 + 60; x < x0 + W; x += 90) { g.beginPath(); g.moveTo(x, y0 + 10); g.lineTo(x, y0 + H); g.stroke(); }
    g.fillStyle = 'rgba(210,200,255,0.45)';
    for (let y = y0 + 38; y < y0 + H; y += 46) for (let x = x0 + 14; x < x0 + W - 6; x += 30) { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
  }
}

// Marks on a wall you can climb (instead of vines).
export function planetGrip(g, x, y0, H, r, style, side) {
  if (style === 'ash') {
    for (let y = y0 + 14; y < y0 + H - 6; y += 20 + r() * 8) {
      rrect(g, x - 4, y, 8, 6, 3); g.fillStyle = '#ffb04a'; g.fill(); ink(g, 1.4);
      glow(g, x, y + 3, 7, '255,160,70', 0.5);
    }
  } else if (style === 'snow') {
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x, y0 + 4);
    for (let y = 0; y <= H - 6; y += 8) g.lineTo(x + Math.sin(y * 0.2) * 2, y0 + 4 + y);
    g.stroke();
    for (let y = y0 + 12; y < y0 + H - 6; y += 16) { g.fillStyle = '#c8ecff'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + side * 7, y + 3); g.lineTo(x, y + 6); g.closePath(); g.fill(); }
  } else {
    g.strokeStyle = '#ffd54f'; g.lineWidth = 2.6;
    for (let y = y0 + 12; y < y0 + H - 6; y += 16) { g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x + 5, y); g.stroke(); }
    g.strokeStyle = 'rgba(27,22,64,0.7)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x - 6, y0 + 6); g.lineTo(x - 6, y0 + H - 4); g.moveTo(x + 6, y0 + 6); g.lineTo(x + 6, y0 + H - 4); g.stroke();
  }
}

// An ice block / patch (kind 'ice', slippery).
export function drawIceChunk(g, x0, y0, W, H, r, toBottom) {
  const radii = [10, 10, toBottom ? 0 : 10, toBottom ? 0 : 10];
  g.beginPath(); g.roundRect(x0, y0, W, H + (toBottom ? 4 : 0), radii);
  g.fillStyle = lin(g, 0, y0, 0, y0 + Math.min(H, 160), [[0, '#e6f8ff'], [0.25, '#9fd8f6'], [1, '#4a8ccc']]); g.fill();
  g.save(); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.35)';
  for (let x = x0 - 20; x < x0 + W; x += 60 + r() * 40) { g.beginPath(); g.moveTo(x, y0 + H); g.lineTo(x + 24, y0); g.lineTo(x + 36, y0); g.lineTo(x + 12, y0 + H); g.closePath(); g.fill(); }
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.2;
  for (let i = 0; i < Math.max(2, W / 80); i++) {
    let x = x0 + r() * W, y = y0 + 10 + r() * Math.min(H, 80);
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 3; k++) { x += (r() - 0.5) * 30; y += 6 + r() * 10; g.lineTo(x, y); }
    g.stroke();
  }
  g.restore();
  g.beginPath(); g.roundRect(x0, y0, W, H + (toBottom ? 12 : 0), radii); ink(g, 2.4);
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(x0 + 10, y0 + 4); g.lineTo(x0 + W - 10, y0 + 4); g.stroke();
}

// ── Hazards & props ─────────────────────────────────────────────────────────

export function drawLava(R, w, h) {
  const { c, g } = makeCanvas(w + 12, h + 14, R);
  const x0 = 6, y0 = 10;
  g.beginPath(); g.moveTo(x0, y0 + 4);
  for (let x = 0; x <= w; x += 10) g.lineTo(x0 + x, y0 + Math.sin(x / 13) * 3);
  g.lineTo(x0 + w, y0 + h + 4); g.lineTo(x0, y0 + h + 4); g.closePath();
  g.fillStyle = lin(g, 0, y0, 0, y0 + h, [[0, '#fff2a0'], [0.12, '#ffb43c'], [0.45, '#f0582a'], [1, '#8a1a24']]); g.fill();
  const r = rng(w + h);
  for (let i = 0; i < w / 26; i++) {
    const bx = x0 + r() * w, by = y0 + 14 + r() * (h - 18);
    g.strokeStyle = 'rgba(255,230,140,0.7)'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(bx, by, 2 + r() * 4, 0, TAU); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,220,0.95)'; g.lineWidth = 2.4;
  g.beginPath();
  for (let x = 0; x <= w; x += 10) { const y = y0 + Math.sin(x / 13) * 3; if (x) g.lineTo(x0 + x, y); else g.moveTo(x0, y); }
  g.stroke();
  return c;
}

export function drawFlameColumn(R, h) {
  const { c, g } = makeCanvas(46, h, R);
  g.fillStyle = lin(g, 0, 0, 46, 0, [[0, 'rgba(255,90,40,0)'], [0.3, 'rgba(255,120,50,0.65)'], [0.5, 'rgba(255,240,170,0.95)'], [0.7, 'rgba(255,120,50,0.65)'], [1, 'rgba(255,90,40,0)']]);
  g.fillRect(0, 0, 46, h);
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = lin(g, 0, 0, 0, h, [[0, 'rgba(0,0,0,0.2)'], [0.2, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,1)']]);
  g.fillRect(0, 0, 46, h);
  return c;
}

export function drawVent(R) {
  const { c, g } = makeCanvas(54, 18, R);
  rrect(g, 3, 3, 48, 14, 5);
  g.fillStyle = lin(g, 0, 3, 0, 17, [[0, '#8a7486'], [1, '#3a2232']]); g.fill(); ink(g, 2.2);
  rrect(g, 13, 5, 28, 5, 2.5); g.fillStyle = '#1a0a14'; g.fill();
  glow(g, 27, 7, 12, '255,140,60', 0.6);
  return c;
}

export function drawFireball(R) {
  const { c, g } = makeCanvas(40, 48, R);
  glow(g, 20, 26, 20, '255,150,60', 0.7);
  g.beginPath(); g.moveTo(20, 4); g.quadraticCurveTo(34, 18, 33, 30); g.arc(20, 30, 13, 0, Math.PI); g.quadraticCurveTo(6, 18, 20, 4); g.closePath();
  g.fillStyle = rad(g, 17, 26, 2, 18, [[0, '#fffbd0'], [0.45, '#ffc24a'], [1, '#f05a28']]); g.fill(); ink(g, 2.2);
  g.fillStyle = '#5a1a10';
  g.beginPath(); g.ellipse(15, 30, 2, 2.8, 0, 0, TAU); g.ellipse(25, 30, 2, 2.8, 0, 0, TAU); g.fill();
  g.strokeStyle = '#5a1a10'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(11, 24); g.lineTo(17, 26); g.moveTo(29, 24); g.lineTo(23, 26); g.stroke();
  return c;
}

export function drawSinker(R, w) {
  const { c, g } = makeCanvas(w + 12, 40, R);
  const x0 = 6, y0 = 4;
  glow(g, x0 + w / 2, y0 + 22, w * 0.5, '255,120,50', 0.5);
  g.beginPath(); g.moveTo(x0, y0 + 4); g.lineTo(x0 + w, y0 + 4); g.lineTo(x0 + w - 8, y0 + 24); g.lineTo(x0 + w * 0.6, y0 + 30); g.lineTo(x0 + w * 0.3, y0 + 28); g.lineTo(x0 + 6, y0 + 22); g.closePath();
  g.fillStyle = lin(g, 0, y0, 0, y0 + 30, [[0, '#6c5468'], [0.6, '#3a2232'], [1, '#c84a2a']]); g.fill(); ink(g, 2.2);
  g.strokeStyle = 'rgba(255,150,70,0.85)'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(x0 + w * 0.3, y0 + 8); g.lineTo(x0 + w * 0.36, y0 + 16); g.lineTo(x0 + w * 0.3, y0 + 24); g.moveTo(x0 + w * 0.7, y0 + 8); g.lineTo(x0 + w * 0.64, y0 + 18); g.stroke();
  rrect(g, x0 + 2, y0 + 1, w - 4, 7, 3.5); g.fillStyle = '#8a7486'; g.fill(); ink(g, 1.8);
  return c;
}

export function drawIcicle(R) {
  const { c, g } = makeCanvas(26, 52, R);
  g.beginPath(); g.moveTo(3, 2); g.lineTo(23, 2); g.lineTo(14, 50); g.lineTo(12, 50); g.closePath();
  g.fillStyle = lin(g, 3, 0, 23, 0, [[0, '#8fcaf0'], [0.45, '#f2fbff'], [1, '#6aa8dc']]); g.fill(); ink(g, 2);
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(9, 6); g.lineTo(12, 34); g.stroke();
  return c;
}

export function drawCannon(R) {
  const { c, g } = makeCanvas(100, 76, R);
  // facing left; flipped for right
  rrect(g, 28, 46, 56, 30, 8);
  g.fillStyle = lin(g, 0, 46, 0, 76, [[0, '#d8ecff'], [1, '#7aa0d0']]); g.fill(); ink(g, 2.4);
  g.beginPath(); g.arc(56, 40, 24, 0, TAU);
  g.fillStyle = rad(g, 50, 32, 2, 26, [[0, '#ffffff'], [1, '#a8c8ec']]); g.fill(); ink(g, 2.4);
  rrect(g, 4, 26, 52, 26, 10);
  g.fillStyle = lin(g, 0, 26, 0, 52, [[0, '#8fb4e0'], [1, '#3e5f96']]); g.fill(); ink(g, 2.4);
  g.beginPath(); g.ellipse(8, 39, 6, 11, 0, 0, TAU); g.fillStyle = '#1b2850'; g.fill(); ink(g, 2);
  g.strokeStyle = '#ffffff'; g.lineWidth = 2;
  for (let a = 0; a < 3; a++) { g.beginPath(); g.moveTo(56 - Math.cos(a * 1.05) * 9, 40 - Math.sin(a * 1.05) * 9); g.lineTo(56 + Math.cos(a * 1.05) * 9, 40 + Math.sin(a * 1.05) * 9); g.stroke(); }
  // little face
  g.fillStyle = '#1b2850';
  g.beginPath(); g.arc(66, 56, 2.4, 0, TAU); g.arc(76, 56, 2.4, 0, TAU); g.fill();
  return c;
}

export function drawSnowball(R) {
  const { c, g } = makeCanvas(34, 34, R);
  g.beginPath(); g.arc(17, 17, 14, 0, TAU);
  g.fillStyle = rad(g, 12, 12, 1, 16, [[0, '#ffffff'], [1, '#bcd8f2']]); g.fill(); ink(g, 2.2);
  g.fillStyle = 'rgba(160,200,235,0.8)';
  for (const [x, y] of [[20, 20], [12, 22], [22, 11]]) { g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); }
  return c;
}

export function drawCrusher(R, w, h) {
  const { c, g } = makeCanvas(w + 8, h + 8, R);
  const x0 = 4, y0 = 4;
  rrect(g, x0, y0, w, h, 8);
  g.fillStyle = lin(g, 0, y0, 0, y0 + h, [[0, '#b9a8e8'], [0.5, '#7a68b8'], [1, '#4a3a86']]); g.fill(); ink(g, 2.6);
  g.fillStyle = '#ffd54f';
  for (const [x, y] of [[x0 + 8, y0 + 8], [x0 + w - 8, y0 + 8]]) { g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill(); }
  // grumpy face
  const cx = x0 + w / 2, cy = y0 + h * 0.45;
  g.fillStyle = '#1b1640';
  g.beginPath(); g.ellipse(cx - 12, cy, 5, 6, 0, 0, TAU); g.ellipse(cx + 12, cy, 5, 6, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - 11, cy - 2, 1.6, 0, TAU); g.arc(cx + 13, cy - 2, 1.6, 0, TAU); g.fill();
  g.strokeStyle = INK; g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(cx - 19, cy - 10); g.lineTo(cx - 6, cy - 6); g.moveTo(cx + 19, cy - 10); g.lineTo(cx + 6, cy - 6); g.stroke();
  // teeth along the bottom
  g.fillStyle = '#e6e2ff';
  for (let x = x0 + 4; x < x0 + w - 6; x += 12) { g.beginPath(); g.moveTo(x, y0 + h - 2); g.lineTo(x + 6, y0 + h + 4); g.lineTo(x + 12, y0 + h - 2); g.closePath(); g.fill(); ink(g, 1.4); }
  return c;
}

export function drawRod(R) {
  const { c, g } = makeCanvas(14, 20, R);
  g.fillStyle = lin(g, 0, 0, 14, 0, [[0, '#4a4070'], [0.5, '#a89cd8'], [1, '#4a4070']]);
  g.fillRect(2, 0, 10, 20);
  return c;
}

export function drawBell(R) {
  const { c, g } = makeCanvas(52, 52, R);
  glow(g, 26, 28, 26, '255,220,120', 0.4);
  g.beginPath(); g.moveTo(26, 6); g.quadraticCurveTo(40, 8, 40, 26); g.lineTo(46, 40); g.lineTo(6, 40); g.lineTo(12, 26); g.quadraticCurveTo(12, 8, 26, 6); g.closePath();
  g.fillStyle = lin(g, 0, 6, 0, 40, [[0, '#fff2a8'], [0.5, '#ffc93a'], [1, '#c8860a']]); g.fill(); ink(g, 2.4);
  g.beginPath(); g.arc(26, 44, 5, 0, TAU); g.fillStyle = '#ffb300'; g.fill(); ink(g, 1.8);
  starPath(g, 26, 25, 6, 2.6); g.fillStyle = '#fffbe6'; g.fill();
  return c;
}

export function drawJar(R, open) {
  const { c, g } = makeCanvas(70, 90, R);
  if (!open) glow(g, 35, 54, 34, '255,214,80', 0.55);
  // glass body
  g.beginPath(); g.moveTo(14, 22); g.lineTo(56, 22); g.quadraticCurveTo(64, 50, 58, 86); g.lineTo(12, 86); g.quadraticCurveTo(6, 50, 14, 22); g.closePath();
  g.fillStyle = 'rgba(200,230,255,0.35)'; g.fill(); ink(g, 2.4);
  if (!open) {
    for (const [x, y, s] of [[26, 70, 7], [42, 66, 8], [33, 52, 7], [22, 50, 5], [46, 46, 6], [35, 36, 5]]) { starPath(g, x, y, s, s * 0.45); g.fillStyle = '#ffd54f'; g.fill(); ink(g, 1.2); }
    rrect(g, 10, 12, 50, 12, 4); g.fillStyle = '#8a5ad0'; g.fill(); ink(g, 2.2);
    g.font = '800 10px "Baloo 2", Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffe9ff'; g.fillText('O', 35, 18.5);
  } else {
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(20, 30); g.lineTo(28, 46); g.lineTo(22, 60); g.moveTo(48, 28); g.lineTo(42, 44); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(18, 32); g.quadraticCurveTo(14, 54, 17, 78); g.stroke();
  return c;
}

export function drawShieldFx(R) {
  const { c, g } = makeCanvas(96, 100, R);
  const cx = 48, cy = 50;
  g.fillStyle = rad(g, cx, cy, 20, 46, [[0, 'rgba(255,200,120,0)'], [0.75, 'rgba(255,190,90,0.18)'], [1, 'rgba(255,230,160,0.6)']]);
  g.beginPath(); g.ellipse(cx, cy, 44, 48, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,220,140,0.95)'; g.lineWidth = 2.4;
  g.beginPath(); g.ellipse(cx, cy, 44, 48, 0, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(255,240,200,0.5)'; g.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * 18, cy + Math.sin(a) * 20); g.lineTo(cx + Math.cos(a) * 44, cy + Math.sin(a) * 48); g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.beginPath(); g.ellipse(cx - 18, cy - 24, 8, 4, -0.6, 0, TAU); g.fill();
  return c;
}

export function drawBubbleFx(R) {
  const S = 340;
  const { c, g } = makeCanvas(S, S, R);
  const cx = S / 2, cy = S / 2, rr = S / 2 - 6;
  g.fillStyle = rad(g, cx, cy, rr * 0.6, rr, [[0, 'rgba(120,220,255,0)'], [0.85, 'rgba(120,220,255,0.12)'], [1, 'rgba(200,245,255,0.45)']]);
  g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(200,245,255,0.85)'; g.lineWidth = 2.4;
  g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.stroke();
  // clock ticks
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    g.strokeStyle = `rgba(255,240,170,${i % 3 ? 0.5 : 0.9})`; g.lineWidth = i % 3 ? 2 : 3.4;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * (rr - 4), cy + Math.sin(a) * (rr - 4)); g.lineTo(cx + Math.cos(a) * (rr - (i % 3 ? 14 : 22)), cy + Math.sin(a) * (rr - (i % 3 ? 14 : 22))); g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.beginPath(); g.ellipse(cx - rr * 0.45, cy - rr * 0.55, 30, 12, -0.7, 0, TAU); g.fill();
  return c;
}

export function drawWave(R) {
  const { c, g } = makeCanvas(70, 40, R);
  glow(g, 35, 36, 30, '255,120,160', 0.45);
  g.beginPath(); g.moveTo(4, 40); g.quadraticCurveTo(30, 4, 66, 40); g.closePath();
  g.fillStyle = lin(g, 0, 8, 0, 40, [[0, 'rgba(255,220,240,0.95)'], [1, 'rgba(200,90,200,0.75)']]); g.fill(); ink(g, 2);
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(14, 34); g.quadraticCurveTo(32, 14, 54, 34); g.stroke();
  return c;
}

export function drawStreak(R) {
  const { c, g } = makeCanvas(56, 8, R);
  g.fillStyle = lin(g, 0, 0, 56, 0, [[0, 'rgba(255,255,255,0)'], [0.6, 'rgba(240,250,255,0.95)'], [1, 'rgba(255,255,255,0.4)']]);
  rrect(g, 2, 2, 52, 4, 2); g.fill();
  return c;
}

export function drawTarget(R) {
  const { c, g } = makeCanvas(76, 20, R);
  g.strokeStyle = 'rgba(255,90,110,0.95)'; g.lineWidth = 3;
  g.beginPath(); g.ellipse(38, 12, 32, 7, 0, 0, TAU); g.stroke();
  g.lineWidth = 2; g.beginPath(); g.ellipse(38, 12, 16, 3.5, 0, 0, TAU); g.stroke();
  return c;
}

export function drawStarBall(R) {
  const { c, g } = makeCanvas(48, 48, R);
  glow(g, 24, 24, 24, '255,200,90', 0.6);
  g.beginPath(); g.arc(24, 24, 16, 0, TAU);
  g.fillStyle = rad(g, 19, 18, 2, 18, [[0, '#d8c2ff'], [1, '#6a4ac0']]); g.fill(); ink(g, 2.2);
  starPath(g, 24, 25, 9, 4); g.fillStyle = '#ffd54f'; g.fill(); ink(g, 1.4);
  return c;
}

export function drawTowerDoor(R) {
  const { c, g } = makeCanvas(230, 520, R);
  const H = 520;
  glow(g, 115, H - 60, 70, '255,220,120', 0.7);
  rrect(g, 80, H - 120, 70, 120, [30, 30, 0, 0]);
  g.fillStyle = lin(g, 0, H - 120, 0, H, [[0, '#fff3c0'], [1, '#ffb84a']]); g.fill(); ink(g, 2.4);
  for (const [x, y] of [[100, H - 86], [130, H - 86], [115, H - 58]]) { glow(g, x, y, 12, '255,230,120', 0.9); starPath(g, x, y, 7, 3); g.fillStyle = '#ffe066'; g.fill(); }
  return c;
}

export function drawRocket(R, look) {
  const { c, g } = makeCanvas(110, 160, R);
  const col = look === 'lava' ? ['#ff8a5a', '#b8321e'] : ['#8fd8ff', '#2a6ab8'];
  g.strokeStyle = INK; g.lineWidth = 4;
  g.beginPath(); g.moveTo(38, 124); g.lineTo(24, 156); g.moveTo(72, 124); g.lineTo(86, 156); g.stroke();
  const finFill = lin(g, 0, 100, 0, 146, [[0, col[0]], [1, col[1]]]);
  g.beginPath(); g.moveTo(37, 100); g.lineTo(13, 134); g.lineTo(16, 146); g.lineTo(39, 132); g.closePath(); g.fillStyle = finFill; g.fill(); ink(g, 2.4);
  g.beginPath(); g.moveTo(73, 100); g.lineTo(97, 134); g.lineTo(94, 146); g.lineTo(71, 132); g.closePath(); g.fillStyle = finFill; g.fill(); ink(g, 2.4);
  const body = () => { g.beginPath(); g.moveTo(55, 6); g.bezierCurveTo(85, 24, 87, 84, 76, 136); g.lineTo(34, 136); g.bezierCurveTo(23, 84, 25, 24, 55, 6); g.closePath(); };
  body();
  g.fillStyle = lin(g, 26, 0, 84, 0, [[0, '#c3cfe0'], [0.38, '#ffffff'], [0.7, '#dfe7f2'], [1, '#93a6c2']]); g.fill();
  g.save(); body(); g.clip();
  g.fillStyle = lin(g, 0, 6, 0, 40, [[0, col[0]], [1, col[1]]]); g.fillRect(0, 0, 110, 38);
  g.fillStyle = col[1]; g.fillRect(0, 112, 110, 8);
  g.restore();
  body(); ink(g, 3);
  g.beginPath(); g.arc(55, 68, 15, 0, TAU); g.fillStyle = '#8fa3b8'; g.fill(); ink(g, 2.4);
  g.beginPath(); g.arc(55, 68, 11, 0, TAU);
  g.fillStyle = rad(g, 51, 64, 1, 13, [[0, '#e1f5fe'], [0.5, '#4fc3f7'], [1, '#0277bd']]); g.fill();
  if (look === 'lava') { glow(g, 55, 96, 10, '255,140,60', 0.9); } else {
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    for (let a = 0; a < 3; a++) { g.beginPath(); g.moveTo(55 - Math.cos(a * 1.05) * 7, 96 - Math.sin(a * 1.05) * 7); g.lineTo(55 + Math.cos(a * 1.05) * 7, 96 + Math.sin(a * 1.05) * 7); g.stroke(); }
  }
  return c;
}

export function drawCageThemed(R, theme) {
  if (theme === 'icecave') theme = 'ice';
  const col = {
    woods: ['#e6dcff', '#8f72f0', '#6a55c4', '180,140,255', '#5a3aa8'],
    lava: ['#9a7a8a', '#3a2232', '#2a1420', '255,120,60', '#ff8a3c'],
    ice: ['#ffffff', '#7ab8e8', '#4a80c0', '160,220,255', '#2a5a9a'],
  }[theme] || null;
  const { c, g } = makeCanvas(104, 112, R);
  glow(g, 52, 64, 56, col[3], 0.35);
  rrect(g, 6, 102, 92, 10, 4); g.fillStyle = col[2]; g.fill(); ink(g, 2.2);
  g.beginPath(); g.moveTo(10, 24); g.quadraticCurveTo(52, -6, 94, 24); g.lineTo(94, 30); g.lineTo(10, 30); g.closePath();
  g.fillStyle = lin(g, 0, 4, 0, 30, [[0, col[0]], [1, col[1]]]); g.fill(); ink(g, 2.2);
  for (let x = 14; x <= 90; x += 15.2) {
    rrect(g, x - 3.5, 28, 7, 76, 3.5);
    g.fillStyle = theme === 'lava'
      ? lin(g, x - 4, 0, x + 4, 0, [[0, '#2a1420'], [0.5, '#7a5a6e'], [1, '#2a1420']])
      : lin(g, x - 4, 0, x + 4, 0, [[0, `rgba(${col[3]},0.8)`], [0.5, 'rgba(240,250,255,0.9)'], [1, `rgba(${col[3]},0.8)`]]);
    g.fill(); ink(g, 1.6);
  }
  if (theme === 'lava') for (let x = 14; x <= 90; x += 15.2) glow(g, x, 100, 6, '255,140,60', 0.8);
  starPath(g, 52, 14, 7, 3); g.fillStyle = col[4]; g.fill();
  g.font = '800 11px "Baloo 2", Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffe9ff'; g.fillText('O', 52, 15);
  return c;
}

export function drawPlatformLook(R, look, w) {
  const { c, g } = makeCanvas(w + 12, 40, R);
  const x0 = 6, y0 = 4, h = 16;
  if (look === 'ice') {
    glow(g, x0 + w / 2, y0 + 20, w * 0.45, '160,230,255', 0.4);
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + w, y0); g.lineTo(x0 + w - 10, y0 + h + 8); g.lineTo(x0 + 10, y0 + h + 8); g.closePath();
    g.fillStyle = lin(g, 0, y0, 0, y0 + h + 8, [[0, '#f2fbff'], [1, '#6aa8dc']]); g.fill(); ink(g, 2.2);
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x0 + 8, y0 + 3); g.lineTo(x0 + w - 8, y0 + 3); g.stroke();
  } else if (look === 'rock') {
    glow(g, x0 + w / 2, y0 + 24, w * 0.4, '255,120,50', 0.5);
    rrect(g, x0, y0, w, h + 6, 7);
    g.fillStyle = lin(g, 0, y0, 0, y0 + h + 6, [[0, '#8a7486'], [1, '#3a2232']]); g.fill(); ink(g, 2.4);
    g.strokeStyle = 'rgba(255,140,70,0.85)'; g.lineWidth = 1.6;
    for (let x = x0 + 16; x < x0 + w - 10; x += 30) { g.beginPath(); g.moveTo(x, y0 + 5); g.lineTo(x + 4, y0 + 12); g.lineTo(x + 1, y0 + h + 2); g.stroke(); }
  } else {
    glow(g, x0 + w / 2, y0 + 24, w * 0.4, '200,160,255', 0.4);
    rrect(g, x0, y0, w, h, 5);
    g.fillStyle = lin(g, 0, y0, 0, y0 + h, [[0, '#d4c2ff'], [0.5, '#8c70d6'], [1, '#4a3a8a']]); g.fill(); ink(g, 2.4);
    g.fillStyle = '#ffd54f';
    for (let x = x0 + 8; x < x0 + w - 4; x += 20) { g.beginPath(); g.arc(x, y0 + h / 2, 1.8, 0, TAU); g.fill(); }
  }
  return c;
}

// ── Decor ───────────────────────────────────────────────────────────────────

export function drawVolcano(R) {
  const { c, g } = makeCanvas(320, 240, R);
  glow(g, 160, 40, 80, '255,140,60', 0.55);
  g.beginPath(); g.moveTo(0, 240); g.lineTo(130, 40); g.lineTo(190, 40); g.lineTo(320, 240); g.closePath();
  g.fillStyle = lin(g, 0, 40, 0, 240, [[0, '#5a3048'], [1, '#2a1020']]); g.fill(); ink(g, 2.4);
  g.beginPath(); g.moveTo(130, 40); g.quadraticCurveTo(160, 52, 190, 40); g.lineTo(184, 36); g.quadraticCurveTo(160, 46, 136, 36); g.closePath();
  g.fillStyle = '#ffb43c'; g.fill();
  g.strokeStyle = '#ff7a2a'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(150, 46); g.quadraticCurveTo(130, 120, 110, 236); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.moveTo(172, 46); g.quadraticCurveTo(200, 140, 214, 236); g.stroke();
  return c;
}

export function drawSpikes(R) {
  const { c, g } = makeCanvas(110, 90, R);
  for (const [x, h, w] of [[24, 70, 18], [52, 88, 22], [80, 60, 16]]) {
    g.beginPath(); g.moveTo(x - w, 90); g.lineTo(x, 90 - h); g.lineTo(x + w, 90); g.closePath();
    g.fillStyle = lin(g, 0, 90 - h, 0, 90, [[0, '#6c5468'], [1, '#2a1420']]); g.fill(); ink(g, 2);
    g.strokeStyle = 'rgba(255,130,60,0.8)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(x, 90 - h * 0.7); g.lineTo(x - 3, 90 - h * 0.35); g.lineTo(x + 2, 88); g.stroke();
  }
  return c;
}

export function drawCaveMouth(R, look) {
  const { c, g } = makeCanvas(170, 170, R);
  const col = look === 'ice' ? ['#d8f0ff', '#6a9ad0', '160,220,255'] : ['#7a5a6e', '#2a1420', '255,140,60'];
  glow(g, 85, 110, 70, col[2], 0.45);
  g.beginPath(); g.moveTo(4, 170); g.quadraticCurveTo(10, 20, 85, 12); g.quadraticCurveTo(160, 20, 166, 170); g.closePath();
  g.fillStyle = lin(g, 0, 12, 0, 170, [[0, col[0]], [1, col[1]]]); g.fill(); ink(g, 2.6);
  g.beginPath(); g.moveTo(34, 170); g.quadraticCurveTo(38, 54, 85, 48); g.quadraticCurveTo(132, 54, 136, 170); g.closePath();
  g.fillStyle = '#0d0716'; g.fill(); ink(g, 2);
  if (look === 'ice') {
    for (let x = 44; x < 130; x += 14) { g.beginPath(); g.moveTo(x - 4, 56 + Math.abs(x - 85) * 0.3); g.lineTo(x, 76 + Math.abs(x - 85) * 0.3); g.lineTo(x + 4, 56 + Math.abs(x - 85) * 0.3); g.closePath(); g.fillStyle = '#e2f6ff'; g.fill(); }
  } else glow(g, 85, 150, 40, '255,120,50', 0.4);
  return c;
}

export function drawPine(R) {
  const { c, g } = makeCanvas(120, 200, R);
  const x = 60, y = 200, h = 190;
  rrect(g, x - 7, y - 30, 14, 30, 3); g.fillStyle = '#6a4428'; g.fill(); ink(g, 2);
  for (let k = 0; k < 4; k++) {
    const yy = y - 30 - k * 38, ww = 52 - k * 10;
    g.beginPath(); g.moveTo(x - ww, yy); g.lineTo(x, yy - 60); g.lineTo(x + ww, yy); g.closePath();
    g.fillStyle = lin(g, 0, yy - 60, 0, yy, [[0, '#3f9a8a'], [1, '#1e5c62']]); g.fill(); ink(g, 2.2);
    g.beginPath(); g.moveTo(x - ww * 0.55, yy - 28); g.lineTo(x, yy - 60); g.lineTo(x + ww * 0.55, yy - 28); g.quadraticCurveTo(x, yy - 20, x - ww * 0.55, yy - 28); g.closePath();
    g.fillStyle = '#ffffff'; g.fill();
  }
  starPath(g, x, y - h + 2, 7, 3); g.fillStyle = '#ffd54f'; g.fill(); ink(g, 1.4);
  return c;
}

export function drawSnowman(R) {
  const { c, g } = makeCanvas(80, 110, R);
  for (const [y, rr] of [[86, 22], [52, 17], [24, 13]]) {
    g.beginPath(); g.arc(40, y, rr, 0, TAU);
    g.fillStyle = rad(g, 34, y - 6, 2, rr, [[0, '#ffffff'], [1, '#c4dcf4']]); g.fill(); ink(g, 2.2);
  }
  g.fillStyle = '#1b1640';
  g.beginPath(); g.arc(35, 21, 2, 0, TAU); g.arc(45, 21, 2, 0, TAU); g.fill();
  for (const y of [46, 56]) { g.beginPath(); g.arc(40, y, 2, 0, TAU); g.fill(); }
  g.beginPath(); g.moveTo(40, 25); g.lineTo(54, 28); g.lineTo(40, 29); g.closePath(); g.fillStyle = '#ff8f2e'; g.fill();
  rrect(g, 26, 34, 28, 6, 3); g.fillStyle = '#e53935'; g.fill(); ink(g, 1.6);
  rrect(g, 46, 38, 6, 16, 3); g.fillStyle = '#e53935'; g.fill(); ink(g, 1.6);
  g.strokeStyle = '#6a4428'; g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(24, 52); g.lineTo(8, 40); g.moveTo(56, 52); g.lineTo(72, 42); g.stroke();
  return c;
}

export function drawGear(R) {
  const { c, g } = makeCanvas(120, 120, R);
  const cx = 60, cy = 60;
  g.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU, rr = i % 2 ? 46 : 56;
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
    if (i) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.closePath();
  g.fillStyle = 'rgba(120,100,190,0.55)'; g.fill();
  g.strokeStyle = 'rgba(200,180,255,0.5)'; g.lineWidth = 2; g.stroke();
  g.beginPath(); g.arc(cx, cy, 16, 0, TAU); g.fillStyle = 'rgba(30,20,70,0.8)'; g.fill();
  return c;
}

export function drawFlag(R) {
  const { c, g } = makeCanvas(70, 120, R);
  rrect(g, 8, 6, 6, 114, 3); g.fillStyle = '#c9a56e'; g.fill(); ink(g, 2);
  g.beginPath(); g.moveTo(14, 10); g.quadraticCurveTo(40, 4, 64, 14); g.lineTo(60, 26); g.lineTo(64, 40); g.quadraticCurveTo(40, 32, 14, 42); g.closePath();
  g.fillStyle = lin(g, 0, 8, 0, 42, [[0, '#c9b2ff'], [1, '#7b5fd0']]); g.fill(); ink(g, 2.2);
  g.font = '800 18px "Baloo 2", Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffd54f'; g.fillText('O', 38, 25);
  return c;
}

// ── Beetles for the other planets ───────────────────────────────────────────

export const BEETLE_PALETTES = {
  lava: { shell: ['#ffd27a', '#ff7a2a', '#a8261a'], spots: '#fff2a0', head: '#4a1010', flat: ['#ff9a4a', '#a8261a'] },
  ice: { shell: ['#ffffff', '#9fd0f2', '#4a7ec0'], spots: '#ffffff', head: '#2a4a8a', flat: ['#cfe8ff', '#4a7ec0'] },
};

// ── Big Otto ────────────────────────────────────────────────────────────────
// Frame 260×330, feet at y=326, facing left (towards the arena middle).

export const OTTO_W = 260;
export const OTTO_H = 330;

export function drawOtto(g, mood) {
  const sad = mood === 'sad', happy = mood === 'happy';
  const legUp = mood === 'stomp';
  const armUp = mood === 'throw';
  const metal = (y0, y1) => lin(g, 0, y0, 0, y1, [[0, '#d8c8ff'], [0.5, '#9a80e0'], [1, '#5a44a8']]);
  // legs + feet
  const leg = (x, lift) => {
    rrect(g, x - 18, 236 - lift, 36, 66, 12); g.fillStyle = metal(236, 302); g.fill(); ink(g, 2.8);
    rrect(g, x - 32, 296 - lift, 64, 30, 14); g.fillStyle = metal(296, 326); g.fill(); ink(g, 2.8);
  };
  leg(92, 0);
  leg(168, legUp ? 46 : 0);
  // arms
  const arm = (sx, sy, ex, ey) => {
    limbLine(g, sx, sy, ex, ey, 22, '#8a70d0');
    g.beginPath(); g.arc(ex, ey, 17, 0, TAU); g.fillStyle = metal(ey - 17, ey + 17); g.fill(); ink(g, 2.6);
  };
  if (armUp) arm(56, 156, 30, 66); else arm(56, 156, 34, sad ? 250 : 236);
  arm(204, 156, 228, sad ? 250 : 236);
  // body
  rrect(g, 50, 132, 160, 118, 30); g.fillStyle = metal(132, 250); g.fill(); ink(g, 3);
  // chest core: dim when grumpy or sad, a warm pink heart when happy
  g.beginPath(); g.arc(130, 190, 30, 0, TAU); g.fillStyle = '#2a2050'; g.fill(); ink(g, 2.4);
  if (happy) glow(g, 130, 190, 46, '255,120,160', 0.8);
  heartPath(g, 130, 192, 15);
  g.fillStyle = happy ? '#ff5a8a' : sad ? '#6a7aa8' : '#8a5a7a'; g.fill(); ink(g, 2);
  // head
  g.strokeStyle = INK; g.lineWidth = 3.4;
  g.beginPath(); g.moveTo(130, 40); g.lineTo(130, 16); g.stroke();
  g.beginPath(); g.arc(130, 14, 9, 0, TAU); g.fillStyle = happy ? '#ffd54f' : sad ? '#7ad8ff' : '#ff6b6b'; g.fill(); ink(g, 2.2);
  rrect(g, 58, 38, 144, 98, 26); g.fillStyle = metal(38, 136); g.fill(); ink(g, 3);
  rrect(g, 74, 56, 112, 54, 16); g.fillStyle = '#1e1640'; g.fill(); ink(g, 2);
  const eyeCol = happy ? ['255,220,90', '#ffe680'] : sad ? ['120,210,255', '#a8e6ff'] : ['255,90,90', '#ff7a7a'];
  for (const x of [106, 154]) {
    if (happy) {
      g.strokeStyle = eyeCol[1]; g.lineWidth = 4.5;
      g.beginPath(); g.arc(x, 88, 10, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    } else {
      glow(g, x, 82, 18, eyeCol[0], 0.6);
      g.beginPath(); g.arc(x, 82, 9, 0, TAU); g.fillStyle = eyeCol[1]; g.fill();
    }
  }
  g.strokeStyle = sad ? '#a8e6ff' : happy ? '#ffe680' : '#ff7a7a'; g.lineWidth = 4;
  if (!happy && !sad) {
    // grumpy brows
    g.beginPath(); g.moveTo(90, 66); g.lineTo(118, 74); g.moveTo(170, 66); g.lineTo(142, 74); g.stroke();
  }
  if (sad) {
    g.beginPath(); g.moveTo(92, 70); g.lineTo(116, 64); g.moveTo(168, 70); g.lineTo(144, 64); g.stroke();
    for (const x of [100, 160]) { g.beginPath(); g.moveTo(x, 96); g.quadraticCurveTo(x - 6, 110, x, 116); g.quadraticCurveTo(x + 6, 110, x, 96); g.fillStyle = '#7ad8ff'; g.fill(); }
  }
  // mouth
  g.lineWidth = 4;
  g.beginPath();
  if (happy) g.arc(130, 96, 14, Math.PI * 0.15, Math.PI * 0.85);
  else g.arc(130, 112, 12, Math.PI * 1.2, Math.PI * 1.8);
  g.stroke();
  // ear bolts
  for (const x of [56, 204]) { g.beginPath(); g.arc(x, 86, 9, 0, TAU); g.fillStyle = '#c9b2ff'; g.fill(); ink(g, 2.2); }
  // the O on his belly
  g.font = '800 26px "Baloo 2", Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffd54f'; g.fillText('O', 130, 236);
}
