// Backdrops, terrain and props for the three themes: meadow (the way home),
// home (the village) and woods (Crystal Woods).

import { TAU, INK, rng, makeCanvas, lin, rad, rrect, ink, starPath, glow } from './paint.js';

export const THEMES = {
  meadow: {
    sky: [[0, '#0e153e'], [0.33, '#2c2a78'], [0.6, '#86479c'], [0.82, '#e6878f'], [1, '#ffc793']],
    far: ['#6250a8', '#43357f', '#433788', '#2e2766'],
    hills: ['#2f6c8f', '#1c3862'],
    near: '#1f2c58',
    fog: '215,185,255',
    soil: ['#8a5484', '#6a3b69', '#2a153c'],
    cap: ['#7df5bf', '#34c99a', '#178067'],
    blades: ['#3fdca4', '#9affd2'],
    tuft: ['#1f9f7c', '#2cc08f'],
    pollen: [0xfff0a0, 0x9ff5ff, 0xffb3e6],
    bg: '#0f1640',
  },
  home: {
    sky: [[0, '#0b1238'], [0.35, '#262670'], [0.62, '#6f3f93'], [0.84, '#d9788e'], [1, '#ffb98a']],
    far: ['#56479a', '#3b3078', '#3d3282', '#2a2462'],
    hills: ['#2c6488', '#1a345c'],
    near: '#1c2852',
    fog: '215,185,255',
    soil: ['#8a5484', '#6a3b69', '#2a153c'],
    cap: ['#7df5bf', '#34c99a', '#178067'],
    blades: ['#3fdca4', '#9affd2'],
    tuft: ['#1f9f7c', '#2cc08f'],
    pollen: [0xffe7a0, 0xffd1f0, 0x9ff5ff],
    bg: '#0b1238',
  },
  woods: {
    sky: [[0, '#162a5c'], [0.42, '#24558a'], [0.78, '#3a8c98'], [1, '#6cc2b0']],
    far: ['#2f6488', '#235070', '#3a6f92', '#2a587a'],
    hills: ['#2d7590', '#1f566e'],
    near: '#1b3a5c',
    fog: '150,240,230',
    soil: ['#7272c8', '#5454a6', '#2a2b66'],
    cap: ['#a4fdec', '#41d0be', '#1d918c'],
    blades: ['#5cf0dc', '#c4fff6'],
    tuft: ['#1fa597', '#33c4b4'],
    pollen: [0x9ffcff, 0xd2b8ff, 0xffffff],
    bg: '#162a5c',
  },
};

// ── Backdrop ────────────────────────────────────────────────────────────────

export function drawSky(R, theme) {
  const T = THEMES[theme];
  const W = 960, H = 540;
  const { c, g } = makeCanvas(W, H, R);
  g.fillStyle = lin(g, 0, 0, 0, H, T.sky);
  g.fillRect(0, 0, W, H);
  const r = rng(theme.length * 7);
  for (let i = 0; i < 170; i++) {
    const x = r() * W, y = r() * H * 0.6, s = r();
    g.globalAlpha = (1 - y / (H * 0.6)) * (0.35 + 0.65 * s);
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(x, y, s > 0.93 ? 1.7 : 0.8, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  if (theme === 'woods') {
    // aurora ribbons + a pale moon
    for (let k = 0; k < 3; k++) {
      g.strokeStyle = `rgba(${k === 1 ? '160,120,255' : '90,255,210'},${0.12 - k * 0.02})`;
      g.lineWidth = 46 - k * 10;
      g.beginPath();
      for (let x = -20; x <= W + 20; x += 20) {
        const y = 120 + k * 40 + Math.sin(x / 140 + k) * 26 + Math.sin(x / 61) * 8;
        if (x < 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.fillStyle = rad(g, 740, 96, 2, 30, [[0, '#ffffff'], [0.7, '#d7f3ff'], [1, '#9ad0e6']]);
    g.beginPath(); g.arc(744, 100, 26, 0, TAU); g.fill();
    glow(g, 744, 100, 90, '170,230,255', 0.18);
  } else {
    g.fillStyle = rad(g, 300, 480, 10, 340, [
      [0, 'rgba(255,238,196,0.9)'], [0.28, 'rgba(255,190,150,0.4)'], [1, 'rgba(255,160,150,0)'],
    ]);
    g.fillRect(0, 0, W, H);
    const px = 770, py = 118, pr = 56;
    g.save(); g.translate(px, py); g.rotate(-0.35);
    g.strokeStyle = 'rgba(255,214,170,0.5)'; g.lineWidth = 7;
    g.beginPath(); g.ellipse(0, 0, pr * 1.75, pr * 0.42, 0, Math.PI, TAU); g.stroke();
    g.restore();
    g.fillStyle = rad(g, px - pr * 0.35, py - pr * 0.4, pr * 0.1, pr * 1.15, [[0, '#ffe0b6'], [0.5, '#f08aa0'], [1, '#6c3585']]);
    g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(px, py, pr, 0, TAU); g.clip();
    g.globalAlpha = 0.16; g.fillStyle = '#fff';
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(px, py + i * pr * 0.38, pr * 1.2, pr * 0.07, -0.35, 0, TAU); g.fill(); }
    g.restore(); g.globalAlpha = 1;
    g.save(); g.translate(px, py); g.rotate(-0.35);
    g.strokeStyle = 'rgba(255,228,192,0.85)'; g.lineWidth = 7;
    g.beginPath(); g.ellipse(0, 0, pr * 1.75, pr * 0.42, 0, 0, Math.PI); g.stroke();
    g.restore();
    g.fillStyle = rad(g, 166, 86, 1, 17, [[0, '#fff6e0'], [1, '#c3b0e6']]);
    g.beginPath(); g.arc(170, 90, 16, 0, TAU); g.fill();
  }
  return c;
}

function ridge(g, w, H, base, amp, freq, top, bottom, rim, r) {
  const ph = r() * 100;
  const yAt = (x) => base - amp * (0.55 * Math.abs(Math.sin(x * freq + ph)) + 0.3 * Math.sin(x * freq * 2.3 + ph * 1.7) + 0.15 * Math.sin(x * freq * 5.1 + ph * 0.3));
  g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= w; x += 6) g.lineTo(x, yAt(x));
  g.lineTo(w, H); g.closePath();
  g.fillStyle = lin(g, 0, base - amp, 0, H, [[0, top], [1, bottom]]); g.fill();
  g.strokeStyle = rim; g.lineWidth = 2;
  g.beginPath();
  for (let x = 0; x <= w; x += 6) { if (x) g.lineTo(x, yAt(x)); else g.moveTo(x, yAt(x)); }
  g.stroke();
}

export function drawFar(R, theme, w) {
  const T = THEMES[theme];
  const H = 300;
  const { c, g } = makeCanvas(w, H, R);
  const r = rng(11 + theme.length);
  if (theme === 'woods') {
    // misty giant trunks fading into the sky
    for (let x = 10; x < w; x += 80 + r() * 100) {
      const tw = 22 + r() * 26;
      g.fillStyle = lin(g, 0, 0, 0, H, [[0, 'rgba(58,111,146,0)'], [0.35, 'rgba(58,111,146,0.45)'], [1, 'rgba(58,111,146,0.75)']]);
      g.fillRect(x, 0, tw, H);
    }
    ridge(g, w, H, 250, 40, 1 / 90, T.far[0], T.far[1], 'rgba(160,255,235,0.25)', r);
    return c;
  }
  ridge(g, w, H, 190, 110, 1 / 150, T.far[0], T.far[1], 'rgba(255,205,225,0.3)', r);
  ridge(g, w, H, 235, 60, 1 / 95, T.far[2], T.far[3], 'rgba(255,205,225,0.18)', r);
  if (theme === 'home') {
    // distant cottages with warm windows on the ridge
    for (let x = 40; x < w; x += 160 + r() * 160) {
      const y = 232 + r() * 20;
      g.fillStyle = T.far[3];
      g.fillRect(x, y - 18, 24, 18);
      g.beginPath(); g.moveTo(x - 3, y - 18); g.lineTo(x + 12, y - 30); g.lineTo(x + 27, y - 18); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,214,120,0.85)'; g.fillRect(x + 9, y - 12, 6, 6);
    }
  }
  return c;
}

function bgTree(g, x, y, h, r, trunk, crown, fruit) {
  g.strokeStyle = trunk; g.lineWidth = 5;
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 14, y - h * 0.6, x, y - h); g.stroke();
  const cr = 10 + r() * 9;
  g.fillStyle = crown;
  g.beginPath(); g.arc(x, y - h - cr * 0.4, cr, 0, TAU); g.fill();
  for (let i = 0; i < 3; i++) glow(g, x + (r() - 0.5) * cr * 1.4, y - h - cr * 0.4 + (r() - 0.3) * cr, 6, fruit, 0.95);
}

export function drawHills(R, theme, w) {
  const T = THEMES[theme];
  const H = 260;
  const { c, g } = makeCanvas(w, H, R);
  const r = rng(23 + theme.length);
  const top = (x) => 118 - 36 * Math.sin(x / 210 + 1.3) - 20 * Math.sin(x / 97 + 0.4);
  if (theme === 'woods') {
    for (let x = 30; x < w; x += 60 + r() * 110) {
      const y = top(x) + 10;
      const n = 3 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const s = 10 + r() * 22, ox = (r() - 0.5) * 30, lean = (r() - 0.5) * 0.6;
        g.save(); g.translate(x + ox, y); g.rotate(lean);
        g.beginPath(); g.moveTo(-s * 0.35, 0); g.lineTo(0, -s * 2.2); g.lineTo(s * 0.35, 0); g.closePath();
        g.fillStyle = r() < 0.5 ? 'rgba(110,240,230,0.55)' : 'rgba(180,140,255,0.5)'; g.fill();
        g.restore();
      }
      glow(g, x, y - 18, 30, '120,240,230', 0.25);
    }
  } else {
    for (let x = 30; x < w; x += 70 + r() * 120) bgTree(g, x, top(x) + 8, 26 + r() * 24, r, '#23486a', '#2a5f86', '255,232,150');
  }
  g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= w; x += 6) g.lineTo(x, top(x));
  g.lineTo(w, H); g.closePath();
  g.fillStyle = lin(g, 0, 60, 0, H, [[0, T.hills[0]], [1, T.hills[1]]]); g.fill();
  g.strokeStyle = theme === 'woods' ? 'rgba(120,255,230,0.22)' : 'rgba(160,255,230,0.28)'; g.lineWidth = 2;
  g.beginPath();
  for (let x = 0; x <= w; x += 6) { if (x) g.lineTo(x, top(x)); else g.moveTo(x, top(x)); }
  g.stroke();
  return c;
}

export function drawNear(R, theme, w) {
  const T = THEMES[theme];
  const H = 220;
  const { c, g } = makeCanvas(w, H, R);
  const r = rng(41 + theme.length);
  for (let x = 20; x < w; x += 90 + r() * 160) {
    const h = 60 + r() * 80;
    if (r() < 0.55) {
      g.fillStyle = T.near;
      g.beginPath();
      g.moveTo(x - 5, H); g.quadraticCurveTo(x - 3, H - h * 0.5, x - 2, H - h);
      g.lineTo(x + 4, H - h); g.quadraticCurveTo(x + 6, H - h * 0.5, x + 7, H);
      g.closePath(); g.fill();
      const cw = 24 + r() * 22;
      g.beginPath(); g.ellipse(x + 1, H - h, cw, cw * 0.48, 0, Math.PI, TAU); g.fill();
      for (let i = 0; i < 4; i++) {
        g.fillStyle = theme === 'woods' ? 'rgba(190,150,255,0.6)' : 'rgba(120,240,255,0.55)';
        g.beginPath(); g.arc(x + 1 + (r() - 0.5) * cw * 1.3, H - h - r() * cw * 0.32, 1.8 + r() * 2, 0, TAU); g.fill();
      }
    } else {
      g.strokeStyle = T.near;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.33;
        g.lineWidth = 6 - Math.abs(i - 2);
        g.beginPath(); g.moveTo(x, H);
        g.quadraticCurveTo(x + Math.cos(a) * h * 0.5, H + Math.sin(a) * h * 0.8, x + Math.cos(a) * h * 0.9 + (i - 2) * 6, H + Math.sin(a) * h);
        g.stroke();
      }
    }
  }
  return c;
}

export function drawFog(R, theme) {
  const rgb = THEMES[theme].fog;
  const { c, g } = makeCanvas(32, 130, R);
  g.fillStyle = lin(g, 0, 0, 0, 130, [[0, `rgba(${rgb},0)`], [0.45, `rgba(${rgb},0.32)`], [1, `rgba(${rgb},0.8)`]]);
  g.fillRect(0, 0, 32, 130);
  return c;
}

export function drawCloud(R) {
  const { c, g } = makeCanvas(90, 42, R);
  g.fillStyle = 'rgba(245,235,255,0.9)';
  for (const [x, y, rr] of [[22, 26, 14], [42, 18, 18], [64, 24, 15], [50, 30, 14], [30, 32, 11]]) {
    g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }
  return c;
}

// ── Terrain ─────────────────────────────────────────────────────────────────

export const TERRAIN_PAD = 10;
export const TERRAIN_TOP = 14;

function crystal(g, x, y, r, s0 = 5) {
  const col = r() < 0.5 ? ['#8ff7ff', '#39b8d8'] : ['#e6a8ff', '#9a55d6'];
  const s = s0 + r() * 5;
  g.save(); g.translate(x, y); g.rotate((r() - 0.5) * 0.8);
  g.beginPath();
  g.moveTo(0, -s * 1.6); g.lineTo(s * 0.7, -s * 0.3); g.lineTo(0, s * 0.9); g.lineTo(-s * 0.7, -s * 0.3);
  g.closePath();
  g.fillStyle = lin(g, -s, -s, s, s, [[0, col[0]], [1, col[1]]]); g.fill();
  g.strokeStyle = 'rgba(20,6,30,0.6)'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.beginPath(); g.moveTo(0, -s * 1.3); g.lineTo(s * 0.25, -s * 0.3); g.lineTo(0, 0); g.closePath(); g.fill();
  g.restore();
}

function flower(g, x, y, r) {
  const col = ['#ff8fc7', '#ffe07a', '#a8b5ff', '#ffffff'][Math.floor(r() * 4)];
  g.strokeStyle = '#1f9a76'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(x, y + 3); g.lineTo(x, y - 3); g.stroke();
  g.fillStyle = col;
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5;
    g.beginPath(); g.arc(x + Math.cos(a) * 2.5, y - 5 + Math.sin(a) * 2.5, 1.8, 0, TAU); g.fill();
  }
  g.fillStyle = '#ffcf40';
  g.beginPath(); g.arc(x, y - 5, 1.3, 0, TAU); g.fill();
}

function vine(g, x, y, len, r) {
  const ph = r() * 6;
  g.strokeStyle = '#1f9a76'; g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(x, y);
  for (let d = 0; d <= len; d += 6) g.lineTo(x + Math.sin(d * 0.08 + ph) * 3, y + d);
  g.stroke();
  for (let d = 12; d < len; d += 14 + r() * 10) {
    const lx = x + Math.sin(d * 0.08 + ph) * 3;
    g.fillStyle = r() < 0.5 ? '#35c996' : '#6ff0b4';
    g.beginPath(); g.ellipse(lx + (r() < 0.5 ? -4 : 4), y + d, 4, 2.2, r() - 0.5, 0, TAU); g.fill();
  }
}

function grassCap(g, x, y, w, r, T, roundL, roundR) {
  const top = y - 3, bot = y + 11;
  g.beginPath();
  g.moveTo(x + (roundL ? 8 : 0), top);
  g.lineTo(x + w - (roundR ? 8 : 0), top);
  if (roundR) g.quadraticCurveTo(x + w, top, x + w, top + 8); else g.lineTo(x + w, top + 8);
  g.lineTo(x + w - 1, bot);
  let px = x + w - 1;
  while (px > x + 6) {
    const nx = Math.max(x + 1, px - (10 + r() * 14));
    const d = r() < 0.3 ? 7 + r() * 7 : 2 + r() * 3;
    g.quadraticCurveTo((px + nx) / 2, bot + d, nx, bot);
    px = nx;
  }
  g.lineTo(x, top + 8);
  if (roundL) g.quadraticCurveTo(x, top, x + 8, top); else g.lineTo(x, top);
  g.closePath();
  g.fillStyle = lin(g, 0, top, 0, bot + 10, [[0, T.cap[0]], [0.3, T.cap[1]], [1, T.cap[2]]]);
  g.fill();
  ink(g, 2.4);
  g.strokeStyle = 'rgba(225,255,240,0.75)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x + 10, top + 3); g.lineTo(x + w - 10, top + 3); g.stroke();
  for (let bx = x + 5; bx < x + w - 5; bx += 4 + r() * 7) {
    const bh = 3 + r() * 8;
    g.strokeStyle = r() < 0.5 ? T.blades[0] : T.blades[1]; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(bx, top + 1);
    g.quadraticCurveTo(bx + (r() - 0.5) * 4, top - bh * 0.6, bx + (r() - 0.5) * 6, top - bh);
    g.stroke();
  }
  for (let i = 0; i < Math.max(1, w / 90); i++) flower(g, x + 14 + r() * (w - 28), top, r);
}

function mossCap(g, x, y, w, r, T) {
  g.beginPath();
  g.moveTo(x + 6, y - 1); g.lineTo(x + w - 6, y - 1);
  g.quadraticCurveTo(x + w, y - 1, x + w - 2, y + 6);
  let px = x + w - 2;
  while (px > x + 4) {
    const nx = Math.max(x + 2, px - (8 + r() * 10));
    g.quadraticCurveTo((px + nx) / 2, y + 8 + r() * 5, nx, y + 5);
    px = nx;
  }
  g.quadraticCurveTo(x, y - 1, x + 6, y - 1);
  g.closePath();
  g.fillStyle = lin(g, 0, y, 0, y + 10, [[0, T.cap[0]], [1, T.cap[2]]]);
  g.fill();
  ink(g, 2);
}

// One solid chunk of the level, drawn to its own texture. The image is placed at
// (rect.x - TERRAIN_PAD, rect.y - TERRAIN_TOP).
export function drawChunk(R, rect, theme, seed, worldW, worldH) {
  const T = THEMES[theme];
  const r = rng(seed);
  const P = TERRAIN_PAD, TOP = TERRAIN_TOP;
  const W = rect.w, H = rect.h;
  const toBottom = rect.y + rect.h >= worldH - 1;
  const { c, g } = makeCanvas(W + P * 2, H + TOP + (toBottom ? 0 : 8), R);
  const x0 = P, y0 = TOP;
  const openL = rect.x > 0, openR = rect.x + rect.w < worldW, openTop = rect.y > 0;
  const kind = rect.kind || 'soil';
  const bottomR = toBottom ? 0 : 10;

  if (kind === 'soil') {
    const radii = [openL ? 12 : 0, openR ? 12 : 0, bottomR, bottomR];
    g.save();
    g.beginPath(); g.roundRect(x0, y0 + 2, W, H - 2 + (toBottom ? 4 : 0), radii);
    g.fillStyle = lin(g, 0, y0, 0, y0 + Math.max(H, 120), [[0, T.soil[0]], [0.18, T.soil[1]], [1, T.soil[2]]]);
    g.fill(); g.clip();
    for (let y = y0 + 34; y < y0 + H; y += 20 + r() * 22) {
      g.strokeStyle = `rgba(20,8,40,${0.18 + r() * 0.14})`; g.lineWidth = 2 + r() * 3;
      const ph = r() * 6;
      g.beginPath();
      for (let x = 0; x <= W; x += 16) { const yy = y + Math.sin(x * 0.045 + ph) * 3; if (x) g.lineTo(x0 + x, yy); else g.moveTo(x0, yy); }
      g.stroke();
    }
    const pebbles = Math.round((W * H) / 700);
    for (let i = 0; i < pebbles; i++) {
      const px = x0 + r() * W, py = y0 + 24 + r() * H, pr = 1.5 + r() * 4;
      g.fillStyle = r() < 0.55 ? `rgba(190,150,220,${0.2 + r() * 0.3})` : `rgba(15,6,30,${0.25 + r() * 0.3})`;
      g.beginPath(); g.ellipse(px, py, pr * 1.4, pr, r() * 3, 0, TAU); g.fill();
    }
    for (let i = 0; i < Math.max(1, Math.round(W / 200)); i++) crystal(g, x0 + 24 + r() * Math.max(10, W - 48), y0 + 44 + r() * Math.max(10, H - 60), r);
    if (openL) { g.fillStyle = lin(g, x0, 0, x0 + 22, 0, [[0, 'rgba(10,4,25,0.5)'], [1, 'rgba(10,4,25,0)']]); g.fillRect(x0, y0, 22, H + 10); }
    if (openR) { g.fillStyle = lin(g, x0 + W - 22, 0, x0 + W, 0, [[0, 'rgba(10,4,25,0)'], [1, 'rgba(10,4,25,0.5)']]); g.fillRect(x0 + W - 22, y0, 22, H + 10); }
    g.fillStyle = lin(g, 0, y0, 0, y0 + 30, [[0, 'rgba(10,4,25,0.45)'], [1, 'rgba(10,4,25,0)']]);
    g.fillRect(x0, y0, W, 30);
    g.restore();
    g.beginPath(); g.roundRect(x0, y0 + 2, W, H - 2 + (toBottom ? 12 : 0), radii); ink(g, 2.5);
    if (rect.grip) {
      for (let i = 0; i < 3; i++) {
        if (openL) vine(g, x0 + 3 + i * 9, y0 + 8, Math.min(H - 10, 80 + r() * 160), r);
        if (openR) vine(g, x0 + W - 3 - i * 9, y0 + 8, Math.min(H - 10, 80 + r() * 160), r);
      }
    }
    if (openTop) grassCap(g, x0 - (openL ? 5 : 0), y0, W + (openL ? 5 : 0) + (openR ? 5 : 0), r, T, openL, openR);
    return c;
  }

  if (kind === 'rock' || kind === 'crate') {
    const crate = kind === 'crate';
    const radii = crate ? 6 : [16, 18, toBottom ? 0 : 10, toBottom ? 0 : 10];
    g.beginPath(); g.roundRect(x0, y0, W, H + (toBottom ? 4 : 0), radii);
    g.fillStyle = crate
      ? lin(g, 0, y0, 0, y0 + H, [[0, '#e3a868'], [1, '#9a5f2e']])
      : lin(g, 0, y0, 0, y0 + H, [[0, '#a893d6'], [0.5, '#7a65ad'], [1, '#4c3b7a']]);
    g.fill();
    g.save(); g.clip();
    if (crate) {
      g.strokeStyle = 'rgba(90,50,20,0.6)'; g.lineWidth = 3;
      g.strokeRect(x0 + 5, y0 + 5, W - 10, H - 10);
      g.beginPath(); g.moveTo(x0 + 6, y0 + 6); g.lineTo(x0 + W - 6, y0 + H - 6); g.stroke();
    } else {
      g.fillStyle = 'rgba(255,255,255,0.16)';
      g.beginPath(); g.moveTo(x0, y0 + 10); g.lineTo(x0 + W * 0.45, y0); g.lineTo(x0 + W * 0.6, y0 + Math.min(H, 80) * 0.45); g.lineTo(x0, y0 + Math.min(H, 80) * 0.6); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(30,15,60,0.45)'; g.lineWidth = 2;
      for (let i = 0; i < Math.max(1, (W * H) / 9000); i++) {
        const cx = x0 + 10 + r() * (W - 20), cy = y0 + 8 + r() * Math.max(10, H - 16);
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + (r() - 0.5) * 16, cy + 10 + r() * 12); g.lineTo(cx + (r() - 0.5) * 20, cy + 22 + r() * 12); g.stroke();
      }
    }
    g.restore();
    g.beginPath(); g.roundRect(x0, y0, W, H + (toBottom ? 12 : 0), radii); ink(g, 2.5);
    if (!crate && openTop) mossCap(g, x0 + 4, y0, W - 8, r, T);
    return c;
  }

  if (kind === 'trunk' || kind === 'branch') {
    const horiz = kind === 'branch';
    const radii = horiz ? 14 : [openTop ? 12 : 0, openTop ? 12 : 0, bottomR, bottomR];
    g.beginPath(); g.roundRect(x0, y0, W, H + (toBottom ? 6 : 0), radii);
    g.fillStyle = horiz
      ? lin(g, 0, y0, 0, y0 + H, [[0, '#9a6a44'], [0.5, '#6e4428'], [1, '#43281a']])
      : lin(g, x0, 0, x0 + W, 0, [[0, '#4a2c1a'], [0.35, '#86593a'], [0.7, '#6e4428'], [1, '#3c2416']]);
    g.fill();
    g.save(); g.clip();
    g.strokeStyle = 'rgba(30,14,6,0.45)'; g.lineWidth = 2;
    if (horiz) {
      for (let y = y0 + 8; y < y0 + H - 4; y += 9 + r() * 5) {
        g.beginPath(); g.moveTo(x0, y);
        for (let x = 0; x <= W; x += 24) g.lineTo(x0 + x, y + Math.sin(x * 0.05 + y) * 1.6);
        g.stroke();
      }
    } else {
      for (let x = x0 + 7; x < x0 + W - 3; x += 9 + r() * 7) {
        g.beginPath(); g.moveTo(x, y0);
        for (let y = 0; y <= H; y += 24) g.lineTo(x + Math.sin(y * 0.04 + x) * 1.8, y0 + y);
        g.stroke();
      }
      for (let i = 0; i < Math.max(1, H / 140); i++) {
        const kx = x0 + W * (0.3 + r() * 0.4), ky = y0 + 30 + r() * Math.max(10, H - 60);
        g.beginPath(); g.ellipse(kx, ky, 5, 8, 0, 0, TAU); g.fillStyle = 'rgba(30,14,6,0.55)'; g.fill();
      }
    }
    if (theme === 'woods') for (let i = 0; i < Math.max(1, (W * H) / 16000); i++) crystal(g, x0 + 8 + r() * (W - 16), y0 + 16 + r() * Math.max(10, H - 24), r, 3);
    g.restore();
    g.beginPath(); g.roundRect(x0, y0, W, H + (toBottom ? 14 : 0), radii); ink(g, 2.6);
    if (rect.grip) {
      // vines with leafy rungs mark walls you can climb
      for (const vx of [x0 + 5, x0 + W - 5]) {
        g.strokeStyle = '#2ad08f'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(vx, y0 + 4);
        for (let y = 0; y <= H - 6; y += 6) g.lineTo(vx + Math.sin(y * 0.09 + vx) * 2.5, y0 + 4 + y);
        g.stroke();
        for (let y = 14; y < H - 6; y += 18) {
          g.fillStyle = (y / 18) % 2 < 1 ? '#6ff0b4' : '#35c996';
          g.beginPath(); g.ellipse(vx + (vx < x0 + W / 2 ? 5 : -5), y0 + y, 5, 2.6, vx < x0 + W / 2 ? 0.5 : -0.5, 0, TAU); g.fill();
        }
      }
    }
    if (openTop && kind === 'trunk' && rect.y > 0) mossCap(g, x0 + 2, y0, W - 4, r, T);
    if (horiz) {
      mossCap(g, x0 + 4, y0, W - 8, r, T);
      for (let i = 0; i < W / 60; i++) {
        const mx = x0 + 10 + r() * (W - 20), len = 8 + r() * 18;
        g.strokeStyle = T.cap[2]; g.lineWidth = 2;
        g.beginPath(); g.moveTo(mx, y0 + H - 2); g.quadraticCurveTo(mx + 3, y0 + H + len * 0.5, mx, y0 + H + len); g.stroke();
      }
    }
    return c;
  }

  // crystal formation (hangs from the top)
  g.save();
  g.beginPath();
  g.moveTo(x0, y0); g.lineTo(x0 + W, y0); g.lineTo(x0 + W, y0 + H - 30);
  g.lineTo(x0 + W * 0.7, y0 + H - 6); g.lineTo(x0 + W * 0.5, y0 + H + 4); g.lineTo(x0 + W * 0.3, y0 + H - 10); g.lineTo(x0, y0 + H - 26);
  g.closePath();
  g.fillStyle = lin(g, x0, 0, x0 + W, 0, [[0, '#5f4bb6'], [0.5, '#9a7dff'], [1, '#4a3a96']]); g.fill();
  g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
  for (let y = y0; y < y0 + H; y += 22) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + W, y + 12); g.stroke(); }
  g.restore();
  g.beginPath();
  g.moveTo(x0, y0); g.lineTo(x0 + W, y0); g.lineTo(x0 + W, y0 + H - 30);
  g.lineTo(x0 + W * 0.7, y0 + H - 6); g.lineTo(x0 + W * 0.5, y0 + H + 4); g.lineTo(x0 + W * 0.3, y0 + H - 10); g.lineTo(x0, y0 + H - 26);
  g.closePath(); ink(g, 2.4);
  return c;
}

// ── Props ───────────────────────────────────────────────────────────────────

export function drawPlank(R, w) {
  const { c, g } = makeCanvas(w + 12, 46, R);
  const x0 = 6, y0 = 4, h = 16;
  const pods = [x0 + w * 0.22, x0 + w * 0.78];
  for (const px of pods) { g.fillStyle = rad(g, px, y0 + h + 8, 1, 22, [[0, 'rgba(122,240,255,0.85)'], [1, 'rgba(122,240,255,0)']]); g.fillRect(px - 24, y0 + h - 4, 48, 30); }
  for (const px of pods) { g.beginPath(); g.ellipse(px, y0 + h + 1, 11, 6, 0, 0, Math.PI); g.fillStyle = '#6f7fa0'; g.fill(); ink(g, 2); }
  rrect(g, x0, y0, w, h, 7);
  g.fillStyle = lin(g, 0, y0, 0, y0 + h, [[0, '#f0b877'], [0.5, '#c9884a'], [1, '#8f5a2c']]);
  g.fill(); ink(g, 2.5);
  g.strokeStyle = 'rgba(90,50,20,0.55)'; g.lineWidth = 1.5;
  for (let x = x0 + 30; x < x0 + w - 10; x += 32) { g.beginPath(); g.moveTo(x, y0 + 3); g.lineTo(x, y0 + h - 3); g.stroke(); }
  g.strokeStyle = 'rgba(255,230,190,0.6)';
  g.beginPath(); g.moveTo(x0 + 8, y0 + 3.5); g.lineTo(x0 + w - 8, y0 + 3.5); g.stroke();
  return c;
}

export function drawLeaf(R, w) {
  const { c, g } = makeCanvas(w + 20, 40, R);
  glow(g, (w + 20) / 2, 26, w * 0.45, '120,255,200', 0.35);
  g.beginPath();
  g.moveTo(8, 10); g.quadraticCurveTo((w + 20) / 2, -4, w + 12, 10);
  g.quadraticCurveTo((w + 20) / 2, 30, 8, 10); g.closePath();
  g.fillStyle = lin(g, 0, 2, 0, 24, [[0, '#9dffc6'], [1, '#22a86e']]); g.fill(); ink(g, 2.4);
  g.strokeStyle = 'rgba(20,90,60,0.7)'; g.lineWidth = 1.8;
  g.beginPath(); g.moveTo(14, 11); g.lineTo(w + 6, 10); g.stroke();
  for (let x = 30; x < w; x += 22) { g.beginPath(); g.moveTo(x, 11); g.lineTo(x + 8, 5); g.moveTo(x, 11); g.lineTo(x + 8, 17); g.stroke(); }
  return c;
}

export function drawBouncer(R, squashed) {
  const { c, g } = makeCanvas(76, 52, R);
  const sy = squashed ? 0.65 : 1;
  rrect(g, 30, 30, 16, 22, 6); g.fillStyle = '#f2e6ff'; g.fill(); ink(g, 2);
  g.save(); g.translate(38, 32); g.scale(squashed ? 1.12 : 1, sy);
  g.beginPath(); g.ellipse(0, 0, 34, 22, 0, Math.PI, TAU); g.closePath();
  g.fillStyle = lin(g, 0, -22, 0, 0, [[0, '#ff9ad6'], [1, '#d6338f']]); g.fill(); ink(g, 2.4);
  g.fillStyle = '#fff3fb';
  for (const [x, y, rr] of [[-18, -8, 4.5], [0, -15, 5], [17, -9, 4], [-6, -4, 2.6], [10, -3, 2.4]]) { g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
  g.restore();
  return c;
}

export function drawLantern(R, lit) {
  const { c, g } = makeCanvas(40, 96, R);
  rrect(g, 17, 34, 6, 62, 3); g.fillStyle = '#5b4a6e'; g.fill(); ink(g, 2);
  rrect(g, 10, 90, 20, 6, 3); g.fillStyle = '#44385a'; g.fill(); ink(g, 1.8);
  if (lit) glow(g, 20, 22, 20, '255,210,110', 0.85);
  rrect(g, 9, 10, 22, 26, 7);
  g.fillStyle = lit ? lin(g, 0, 10, 0, 36, [[0, '#fff3b8'], [1, '#ffb43c']]) : 'rgba(150,140,190,0.5)';
  g.fill(); ink(g, 2.2);
  rrect(g, 7, 6, 26, 6, 3); g.fillStyle = '#6e5a88'; g.fill(); ink(g, 1.8);
  if (lit) { starPath(g, 20, 23, 5, 2.2); g.fillStyle = '#fffbe6'; g.fill(); }
  return c;
}

export function drawPlate(R, on) {
  const { c, g } = makeCanvas(64, 18, R);
  rrect(g, 2, 9, 60, 8, 3); g.fillStyle = '#596783'; g.fill(); ink(g, 2);
  if (on) glow(g, 32, 9, 30, '120,255,170', 0.55);
  rrect(g, 9, on ? 6 : 2, 46, on ? 6 : 10, 4);
  g.fillStyle = on ? lin(g, 0, 6, 0, 12, [[0, '#c4ffd8'], [1, '#2fd47a']]) : lin(g, 0, 2, 0, 12, [[0, '#ffe39a'], [1, '#ff9d2e']]);
  g.fill(); ink(g, 2);
  return c;
}

export function drawBeam(R, h, rgb = '90,230,255') {
  const { c, g } = makeCanvas(34, h, R);
  g.fillStyle = lin(g, 0, 0, 34, 0, [[0, `rgba(${rgb},0)`], [0.5, `rgba(${rgb},0.35)`], [1, `rgba(${rgb},0)`]]);
  g.fillRect(0, 0, 34, h);
  for (let k = 0; k < 3; k++) {
    g.strokeStyle = k === 1 ? 'rgba(235,255,255,0.95)' : `rgba(${rgb},0.85)`;
    g.lineWidth = k === 1 ? 2.4 : 1.6;
    g.beginPath();
    for (let y = 0; y <= h; y += 4) { const x = 17 + (k - 1) * 7 + Math.sin(y * 0.09 + k * 2) * 2.2; if (y) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }
  return c;
}

export function drawBridge(R, w, h) {
  const { c, g } = makeCanvas(w + 8, h + 16, R);
  glow(g, (w + 8) / 2, h, w * 0.5, '120,240,255', 0.3);
  rrect(g, 4, 4, w, h, 8);
  g.fillStyle = lin(g, 0, 4, 0, 4 + h, [[0, 'rgba(210,250,255,0.95)'], [1, 'rgba(60,190,230,0.85)']]); g.fill(); ink(g, 2.2);
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5;
  for (let x = 24; x < w; x += 30) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x - 8, h); g.stroke(); }
  return c;
}

export function drawPost(R) {
  const { c, g } = makeCanvas(46, 26, R);
  rrect(g, 3, 3, 40, 18, 6);
  g.fillStyle = lin(g, 0, 3, 0, 21, [[0, '#dfe7ee'], [1, '#6c8196']]); g.fill(); ink(g, 2.4);
  rrect(g, 12, 17, 22, 7, 3); g.fillStyle = '#7af0ff'; g.fill(); ink(g, 1.8);
  return c;
}

export function drawBarrier(R, h) {
  const { c, g } = makeCanvas(30, h, R);
  g.fillStyle = lin(g, 0, 0, 30, 0, [[0, 'rgba(80,140,255,0)'], [0.5, 'rgba(80,140,255,0.45)'], [1, 'rgba(80,140,255,0)']]);
  g.fillRect(0, 0, 30, h);
  g.fillStyle = 'rgba(190,220,255,0.9)';
  for (let y = 6; y < h; y += 12) { g.beginPath(); g.arc(15, y, 1.8, 0, TAU); g.fill(); }
  for (let y = 22; y < h - 10; y += 46) {
    rrect(g, 7, y, 16, 13, 4); g.fillStyle = 'rgba(230,245,255,0.95)'; g.fill();
    g.fillStyle = '#ffcc33'; g.beginPath(); g.arc(12, y + 6.5, 1.8, 0, TAU); g.arc(18, y + 6.5, 1.8, 0, TAU); g.fill();
  }
  return c;
}

export function drawCracked(R, w, h) {
  const { c, g } = makeCanvas(w + 8, h + 8, R);
  const r = rng(w * 31 + h);
  rrect(g, 4, 4, w, h, 6);
  g.fillStyle = lin(g, 4, 0, 4 + w, 0, [[0, '#b7a2ff'], [0.5, '#e2d8ff'], [1, '#9c84f2']]); g.fill();
  g.save(); g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2;
  for (let i = 0; i < Math.max(3, h / 30); i++) {
    let x = 4 + r() * w, y = 4 + r() * h;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += (r() - 0.5) * w * 0.7; y += 6 + r() * 16; g.lineTo(x, y); }
    g.stroke();
  }
  g.strokeStyle = 'rgba(60,30,140,0.55)'; g.lineWidth = 1.4;
  for (let y = 12; y < h; y += 24) { g.beginPath(); g.moveTo(4, y + 4); g.lineTo(4 + w, y); g.stroke(); }
  g.restore();
  rrect(g, 4, 4, w, h, 6); ink(g, 2.4);
  return c;
}

export function drawCage(R) {
  const { c, g } = makeCanvas(104, 112, R);
  glow(g, 52, 64, 56, '180,140,255', 0.35);
  rrect(g, 6, 102, 92, 10, 4); g.fillStyle = '#6a55c4'; g.fill(); ink(g, 2.2);
  g.beginPath(); g.moveTo(10, 24); g.quadraticCurveTo(52, -6, 94, 24); g.lineTo(94, 30); g.lineTo(10, 30); g.closePath();
  g.fillStyle = lin(g, 0, 4, 0, 30, [[0, '#e6dcff'], [1, '#8f72f0']]); g.fill(); ink(g, 2.2);
  for (let x = 14; x <= 90; x += 15.2) {
    rrect(g, x - 3.5, 28, 7, 76, 3.5);
    g.fillStyle = lin(g, x - 4, 0, x + 4, 0, [[0, 'rgba(160,130,255,0.8)'], [0.5, 'rgba(240,235,255,0.9)'], [1, 'rgba(140,110,240,0.8)']]);
    g.fill(); ink(g, 1.6);
  }
  starPath(g, 52, 14, 7, 3); g.fillStyle = '#5a3aa8'; g.fill();
  g.font = '800 11px "Baloo 2", Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffe9ff'; g.fillText('O', 52, 15);
  return c;
}

export function drawPad(R, look = 'metal') {
  const { c, g } = makeCanvas(150, 34, R);
  const col = { metal: ['#c9d6e6', '#6f8099', '122,240,255'], lava: ['#ffb08a', '#b83a2a', '255,120,60'], ice: ['#d9f6ff', '#5fa3d6', '140,220,255'] }[look];
  glow(g, 75, 16, 70, col[2], 0.35);
  g.beginPath(); g.ellipse(75, 18, 68, 12, 0, 0, TAU);
  g.fillStyle = lin(g, 0, 6, 0, 30, [[0, col[0]], [1, col[1]]]); g.fill(); ink(g, 2.4);
  g.beginPath(); g.ellipse(75, 15, 44, 6, 0, 0, TAU); g.strokeStyle = `rgba(${col[2]},0.9)`; g.lineWidth = 2; g.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    g.fillStyle = `rgba(${col[2]},0.95)`;
    g.beginPath(); g.arc(75 + Math.cos(a) * 56, 18 + Math.sin(a) * 9, 2.2, 0, TAU); g.fill();
  }
  return c;
}

export function drawScaffold(R, look) {
  const { c, g } = makeCanvas(110, 170, R);
  const body = look === 'lava' ? ['#ffd2c2', '#e05a3a'] : ['#e8fbff', '#64b6e6'];
  g.strokeStyle = '#8a7a5a'; g.lineWidth = 3;
  for (const x of [12, 98]) { g.beginPath(); g.moveTo(x, 168); g.lineTo(x, 26); g.stroke(); }
  for (let y = 40; y < 168; y += 32) { g.beginPath(); g.moveTo(12, y); g.lineTo(98, y + 16); g.stroke(); g.beginPath(); g.moveTo(12, y + 16); g.lineTo(98, y); g.stroke(); }
  g.beginPath(); g.moveTo(55, 40); g.bezierCurveTo(78, 60, 78, 120, 72, 166); g.lineTo(38, 166); g.bezierCurveTo(32, 120, 32, 60, 55, 40); g.closePath();
  g.fillStyle = lin(g, 34, 0, 76, 0, [[0, body[1]], [0.45, body[0]], [1, body[1]]]); g.fill(); ink(g, 2.6);
  g.beginPath(); g.arc(55, 96, 10, 0, TAU); g.fillStyle = '#2a3a5a'; g.fill(); ink(g, 2);
  // traffic cone: "under construction"
  g.beginPath(); g.moveTo(88, 168); g.lineTo(96, 138); g.lineTo(104, 168); g.closePath();
  g.fillStyle = '#ff8f2e'; g.fill(); ink(g, 1.8);
  g.fillStyle = '#fff'; g.fillRect(92, 152, 8, 4);
  return c;
}

export function drawSign(R) {
  const { c, g } = makeCanvas(64, 84, R);
  rrect(g, 29, 30, 7, 54, 3); g.fillStyle = '#8f5a2c'; g.fill(); ink(g, 2);
  rrect(g, 4, 6, 56, 30, 8);
  g.fillStyle = lin(g, 0, 6, 0, 36, [[0, '#f3c286'], [1, '#c48346']]); g.fill(); ink(g, 2.5);
  g.fillStyle = '#fff8ea';
  g.beginPath(); g.moveTo(14, 18); g.lineTo(36, 18); g.lineTo(36, 12); g.lineTo(50, 21); g.lineTo(36, 30); g.lineTo(36, 24); g.lineTo(14, 24); g.closePath();
  g.fill(); ink(g, 1.8);
  return c;
}

export function drawPortraitSign(R, drawFace) {
  const { c, g } = makeCanvas(76, 120, R);
  rrect(g, 34, 66, 8, 54, 3); g.fillStyle = '#8f5a2c'; g.fill(); ink(g, 2);
  rrect(g, 4, 4, 68, 68, 10);
  g.fillStyle = lin(g, 0, 4, 0, 72, [[0, '#fff6e2'], [1, '#e9cf9e']]); g.fill(); ink(g, 2.6);
  g.save(); g.translate(6, 0); g.scale(1, 1); drawFace(g); g.restore();
  g.font = '800 22px "Baloo 2", Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#e53935'; g.fillText('?', 62, 18);
  return c;
}

export function drawBeacon(R) {
  const { c, g } = makeCanvas(44, 98, R);
  rrect(g, 19, 38, 6, 58, 3); g.fillStyle = '#5b6b86'; g.fill(); ink(g, 2);
  rrect(g, 10, 90, 24, 8, 3); g.fillStyle = '#44506a'; g.fill(); ink(g, 2);
  rrect(g, 4, 4, 36, 34, 9);
  g.fillStyle = 'rgba(90,230,255,0.28)'; g.fill();
  g.strokeStyle = 'rgba(160,248,255,0.95)'; g.lineWidth = 2; g.stroke();
  rrect(g, 12, 12, 20, 16, 5); g.fillStyle = '#e6fbff'; g.fill();
  g.fillStyle = '#ffcc33';
  g.beginPath(); g.arc(18, 20, 2.4, 0, TAU); g.arc(26, 20, 2.4, 0, TAU); g.fill();
  g.strokeStyle = '#e6fbff'; g.lineWidth = 1.8;
  g.beginPath(); g.moveTo(22, 12); g.lineTo(22, 8); g.stroke();
  g.fillStyle = '#69f0ae'; g.beginPath(); g.arc(22, 7, 2, 0, TAU); g.fill();
  return c;
}

export function drawGhost(R) {
  const { c, g } = makeCanvas(96, 16, R);
  rrect(g, 4, 2, 88, 10, 5);
  g.fillStyle = 'rgba(122,240,255,0.18)'; g.fill();
  g.setLineDash([6, 5]);
  g.strokeStyle = 'rgba(170,250,255,0.95)'; g.lineWidth = 2; g.stroke();
  g.setLineDash([]);
  return c;
}

export function drawShroom(R) {
  const { c, g } = makeCanvas(34, 38, R);
  glow(g, 17, 14, 17, '160,120,255', 0.6);
  rrect(g, 13, 16, 8, 21, 4); g.fillStyle = '#efe6ff'; g.fill(); ink(g, 2);
  g.beginPath(); g.ellipse(17, 16, 13, 9, 0, Math.PI, TAU); g.closePath();
  g.fillStyle = lin(g, 0, 7, 0, 17, [[0, '#c7a4ff'], [1, '#7c4dff']]); g.fill(); ink(g, 2);
  g.fillStyle = '#9ffcff';
  for (const [x, y, rr] of [[11, 12, 1.8], [18, 9.5, 2.2], [24, 13, 1.6]]) { g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
  return c;
}

export function drawTuft(R, theme) {
  const T = THEMES[theme];
  const { c, g } = makeCanvas(40, 24, R);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.28;
    g.strokeStyle = i % 2 ? T.tuft[0] : T.tuft[1]; g.lineWidth = 3;
    g.beginPath(); g.moveTo(20 + (i - 3) * 2, 24);
    g.quadraticCurveTo(20 + Math.cos(a) * 10, 24 + Math.sin(a) * 14, 20 + Math.cos(a) * 18 + (i - 3), 24 + Math.sin(a) * 20);
    g.stroke();
  }
  return c;
}

export function drawTree(R) {
  const { c, g } = makeCanvas(150, 210, R);
  g.beginPath(); g.moveTo(66, 210); g.quadraticCurveTo(70, 140, 64, 96); g.lineTo(86, 96); g.quadraticCurveTo(80, 140, 86, 210); g.closePath();
  g.fillStyle = lin(g, 64, 0, 86, 0, [[0, '#5a3a24'], [1, '#8c5a36']]); g.fill(); ink(g, 2.4);
  for (const [x, y, rr, col] of [[75, 62, 50, '#2c8f7a'], [45, 82, 32, '#22786a'], [108, 80, 34, '#2a8a74'], [76, 34, 34, '#38a98e']]) {
    g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fillStyle = col; g.fill(); ink(g, 2.4);
  }
  for (const [x, y] of [[60, 50], [96, 66], [72, 24], [42, 78], [112, 88]]) glow(g, x, y, 7, '255,232,150', 0.95);
  return c;
}

export function drawBigTree(R) {
  const { c, g } = makeCanvas(220, 420, R);
  g.beginPath(); g.moveTo(80, 420); g.quadraticCurveTo(92, 260, 84, 0); g.lineTo(140, 0); g.quadraticCurveTo(128, 260, 146, 420); g.closePath();
  g.fillStyle = lin(g, 80, 0, 146, 0, [[0, '#1a2a44'], [0.5, '#2c4466'], [1, '#162238']]); g.fill();
  g.strokeStyle = 'rgba(120,255,230,0.18)'; g.lineWidth = 2;
  for (let y = 40; y < 400; y += 60) { g.beginPath(); g.moveTo(92, y); g.quadraticCurveTo(112, y + 20, 132, y + 6); g.stroke(); }
  for (const [x, y] of [[100, 120], [124, 210], [104, 300], [118, 360]]) {
    g.beginPath(); g.moveTo(x - 5, y + 6); g.lineTo(x, y - 10); g.lineTo(x + 5, y + 6); g.closePath();
    g.fillStyle = 'rgba(140,250,240,0.85)'; g.fill();
    glow(g, x, y, 16, '120,240,230', 0.35);
  }
  // roots
  g.fillStyle = '#1a2a44';
  g.beginPath(); g.moveTo(60, 420); g.quadraticCurveTo(84, 380, 96, 360); g.lineTo(100, 420); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(170, 420); g.quadraticCurveTo(140, 380, 130, 360); g.lineTo(126, 420); g.closePath(); g.fill();
  return c;
}

export function drawCrystals(R) {
  const { c, g } = makeCanvas(90, 70, R);
  glow(g, 45, 50, 44, '120,240,230', 0.4);
  const r = rng(77);
  for (let i = 0; i < 6; i++) {
    const s = 8 + r() * 12, x = 18 + r() * 54, lean = (r() - 0.5) * 0.7;
    g.save(); g.translate(x, 70); g.rotate(lean);
    g.beginPath(); g.moveTo(-s * 0.4, 0); g.lineTo(-s * 0.4, -s * 2); g.lineTo(0, -s * 2.8); g.lineTo(s * 0.4, -s * 2); g.lineTo(s * 0.4, 0); g.closePath();
    const col = r() < 0.5 ? ['#c4fff8', '#3cc8bc'] : ['#e8d6ff', '#9a6af0'];
    g.fillStyle = lin(g, -s, 0, s, 0, [[0, col[1]], [0.5, col[0]], [1, col[1]]]); g.fill(); ink(g, 1.8);
    g.restore();
  }
  return c;
}

export function drawHouse(R, w, h, color) {
  const roofH = Math.round(h * 0.42);
  const { c, g } = makeCanvas(w + 20, h + 10, R);
  const x0 = 10, wallTop = roofH;
  rrect(g, x0 + 8, wallTop, w - 16, h - roofH, 6);
  g.fillStyle = lin(g, 0, wallTop, 0, h, [[0, '#fff2df'], [1, '#e2c7a4']]); g.fill(); ink(g, 2.5);
  // door + windows (dark: nobody home)
  rrect(g, x0 + w / 2 - 15, h - 52, 30, 52, [14, 14, 0, 0]); g.fillStyle = '#7a4a2c'; g.fill(); ink(g, 2.2);
  g.fillStyle = '#ffd54f'; g.beginPath(); g.arc(x0 + w / 2 + 8, h - 26, 2.4, 0, TAU); g.fill();
  for (const wx of [x0 + 26, x0 + w - 56]) {
    rrect(g, wx, wallTop + 18, 30, 26, 5); g.fillStyle = '#2a2f5a'; g.fill(); ink(g, 2.2);
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(wx + 15, wallTop + 18); g.lineTo(wx + 15, wallTop + 44); g.moveTo(wx, wallTop + 31); g.lineTo(wx + 30, wallTop + 31); g.stroke();
  }
  g.beginPath(); g.moveTo(x0 - 4, wallTop + 4); g.lineTo(x0 + w / 2, 2); g.lineTo(x0 + w + 4, wallTop + 4); g.closePath();
  g.fillStyle = lin(g, 0, 0, 0, wallTop, [[0, color], [1, '#b9475a']]); g.fill(); ink(g, 2.6);
  g.save(); g.clip();
  g.strokeStyle = 'rgba(80,20,40,0.35)'; g.lineWidth = 2;
  for (let y = 12; y < wallTop; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(w + 20, y); g.stroke(); }
  g.restore();
  return c;
}

export function drawPole(R) {
  const { c, g } = makeCanvas(20, 220, R);
  rrect(g, 7, 10, 6, 210, 3); g.fillStyle = '#c9a56e'; g.fill(); ink(g, 2);
  g.beginPath(); g.arc(10, 8, 6, 0, TAU); g.fillStyle = '#ffd54f'; g.fill(); ink(g, 2);
  return c;
}

export function drawBanner(R, text) {
  const W = 560, H = 120;
  const { c, g } = makeCanvas(W, H, R);
  g.strokeStyle = '#6b4a2a'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(4, 8); g.quadraticCurveTo(W / 2, 40, W - 4, 8); g.stroke();
  const cols = ['#ff7aa8', '#ffd54f', '#7af0ff', '#9dff9a', '#c59bff'];
  for (let i = 0; i < 18; i++) {
    const t = (i + 0.5) / 18, x = 4 + t * (W - 8), y = 8 + Math.sin(t * Math.PI) * 32 * 0.75;
    g.beginPath(); g.moveTo(x - 11, y); g.lineTo(x + 11, y); g.lineTo(x, y + 22); g.closePath();
    g.fillStyle = cols[i % cols.length]; g.fill(); ink(g, 1.5);
  }
  rrect(g, 90, 52, W - 180, 54, 14);
  g.fillStyle = lin(g, 0, 52, 0, 106, [[0, '#fff1c7'], [1, '#ffc96b']]); g.fill(); ink(g, 2.6);
  g.font = '800 30px "Baloo 2", Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#a3311a'; g.fillText(text, W / 2, 81);
  return c;
}

export function drawTable(R, withCake) {
  const { c, g } = makeCanvas(150, 110, R);
  g.fillStyle = '#7a4a2c';
  for (const x of [26, 118]) { rrect(g, x, 64, 8, 46, 3); g.fill(); ink(g, 1.8); }
  rrect(g, 6, 52, 138, 16, 6); g.fillStyle = '#ff9eb5'; g.fill(); ink(g, 2.4);
  g.fillStyle = '#fff';
  for (let x = 14; x < 140; x += 16) { g.beginPath(); g.arc(x, 68, 5, 0, Math.PI); g.fill(); }
  if (withCake) {
    rrect(g, 44, 18, 62, 34, 8); g.fillStyle = lin(g, 0, 18, 0, 52, [[0, '#fff3f8'], [1, '#ffc1d7']]); g.fill(); ink(g, 2.2);
    g.fillStyle = '#ff6b9a'; g.fillRect(46, 30, 58, 5);
    for (const x of [56, 75, 94]) { rrect(g, x - 2, 6, 4, 13, 2); g.fillStyle = '#7af0ff'; g.fill(); glow(g, x, 4, 6, '255,220,120', 0.9); }
  } else {
    for (const x of [36, 75, 114]) { g.beginPath(); g.ellipse(x, 50, 14, 4, 0, 0, TAU); g.fillStyle = '#f5f7ff'; g.fill(); ink(g, 1.6); }
  }
  return c;
}

export function drawFeet(R) {
  const { c, g } = makeCanvas(90, 16, R);
  for (const [x, rot] of [[22, -0.1], [66, 0.12]]) {
    g.save(); g.translate(x, 8); g.rotate(rot);
    g.beginPath(); g.ellipse(0, 0, 20, 5.5, 0, 0, TAU); g.fillStyle = 'rgba(40,10,40,0.55)'; g.fill();
    for (const tx of [-14, -6, 2, 10]) { g.beginPath(); g.arc(tx + 4, -6, 2.4, 0, TAU); g.fill(); }
    g.restore();
  }
  return c;
}

export function drawBolt(R) {
  const { c, g } = makeCanvas(40, 30, R);
  glow(g, 20, 18, 18, '255,230,120', 0.5);
  g.save(); g.translate(20, 20); g.rotate(-0.4);
  rrect(g, -14, -3, 22, 6, 2); g.fillStyle = '#b8c4d4'; g.fill(); ink(g, 1.6);
  g.beginPath();
  for (let i = 0; i < 6; i++) { const a = i * TAU / 6; const px = 10 + Math.cos(a) * 7, py = Math.sin(a) * 7; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
  g.closePath(); g.fillStyle = '#d6dfea'; g.fill(); ink(g, 1.8);
  g.font = '800 9px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#c62828'; g.fillText('O', 10, 0.5);
  g.restore();
  return c;
}

export function drawTower(R) {
  const W = 230, H = 520;
  const { c, g } = makeCanvas(W, H, R);
  g.beginPath(); g.moveTo(40, H); g.lineTo(58, 110); g.lineTo(172, 110); g.lineTo(190, H); g.closePath();
  g.fillStyle = lin(g, 40, 0, 190, 0, [[0, '#4a3f6e'], [0.45, '#7a6aa6'], [1, '#3a3060']]); g.fill(); ink(g, 2.8);
  g.save(); g.clip();
  g.strokeStyle = 'rgba(20,10,40,0.35)'; g.lineWidth = 2;
  for (let y = 130; y < H; y += 26) { g.beginPath(); g.moveTo(30, y); g.lineTo(200, y); g.stroke(); }
  g.restore();
  // top: a giant robot head (Otto)
  rrect(g, 46, 30, 138, 92, 22); g.fillStyle = lin(g, 0, 30, 0, 122, [[0, '#c9b2ff'], [1, '#7b5fd0']]); g.fill(); ink(g, 2.8);
  rrect(g, 64, 50, 102, 44, 14); g.fillStyle = '#20183c'; g.fill();
  for (const x of [92, 138]) { glow(g, x, 72, 16, '255,90,90', 0.6); g.beginPath(); g.arc(x, 72, 7, 0, TAU); g.fillStyle = '#ff6b6b'; g.fill(); }
  g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(115, 30); g.lineTo(115, 8); g.stroke();
  g.beginPath(); g.arc(115, 8, 7, 0, TAU); g.fillStyle = '#ff6b6b'; g.fill(); ink(g, 2);
  // big O
  g.beginPath(); g.arc(115, 210, 30, 0, TAU); g.fillStyle = '#2a2050'; g.fill(); ink(g, 2.4);
  g.font = '800 40px "Baloo 2", Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffd54f'; g.fillText('O', 115, 212);
  // locked door with three lock slots
  rrect(g, 80, H - 120, 70, 120, [30, 30, 0, 0]); g.fillStyle = '#2a2050'; g.fill(); ink(g, 2.4);
  for (const [x, y] of [[100, H - 86], [130, H - 86], [115, H - 58]]) { g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fillStyle = '#3d3470'; g.fill(); ink(g, 1.8); }
  return c;
}

export function drawLockLight(R) {
  const { c, g } = makeCanvas(28, 28, R);
  glow(g, 14, 14, 14, '255,220,90', 0.7);
  starPath(g, 14, 14, 7, 3); g.fillStyle = '#ffe066'; g.fill();
  return c;
}

export function drawGateArch(R) {
  const { c, g } = makeCanvas(140, 190, R);
  for (const x of [14, 112]) { rrect(g, x, 40, 16, 150, 5); g.fillStyle = lin(g, x, 0, x + 16, 0, [[0, '#6e4428'], [1, '#a56c42']]); g.fill(); ink(g, 2.4); }
  g.beginPath(); g.moveTo(4, 50); g.quadraticCurveTo(70, -6, 136, 50); g.lineTo(136, 64); g.quadraticCurveTo(70, 10, 4, 64); g.closePath();
  g.fillStyle = lin(g, 0, 10, 0, 64, [[0, '#d9925a'], [1, '#8f5a2c']]); g.fill(); ink(g, 2.6);
  for (const x of [22, 118]) { g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, 60); g.lineTo(x, 76); g.stroke(); glow(g, x, 84, 14, '255,210,110', 0.8); rrect(g, x - 6, 76, 12, 15, 4); g.fillStyle = '#ffd36b'; g.fill(); ink(g, 1.6); }
  return c;
}

export function drawArchWoods(R) {
  const { c, g } = makeCanvas(200, 230, R);
  glow(g, 100, 150, 90, '120,240,230', 0.35);
  for (const [x, w] of [[16, 34], [150, 34]]) {
    g.beginPath(); g.moveTo(x, 230); g.quadraticCurveTo(x + 6, 120, x + w / 2, 60); g.quadraticCurveTo(x + w - 2, 120, x + w, 230); g.closePath();
    g.fillStyle = lin(g, x, 0, x + w, 0, [[0, '#1d3048'], [1, '#2e4a6a']]); g.fill(); ink(g, 2.4);
  }
  g.beginPath(); g.moveTo(26, 90); g.quadraticCurveTo(100, -10, 174, 90); g.lineTo(166, 100); g.quadraticCurveTo(100, 14, 34, 100); g.closePath();
  g.fillStyle = lin(g, 0, 20, 0, 100, [[0, '#33bcae'], [1, '#1b6a72']]); g.fill(); ink(g, 2.4);
  const r = rng(5);
  for (let i = 0; i < 7; i++) {
    const x = 40 + i * 20, y = 46 + Math.abs(i - 3) * 9;
    g.beginPath(); g.moveTo(x - 5, y + 8); g.lineTo(x, y - 12 - r() * 8); g.lineTo(x + 5, y + 8); g.closePath();
    g.fillStyle = i % 2 ? '#c4fff8' : '#e2ccff'; g.fill(); ink(g, 1.5);
  }
  return c;
}

export function drawLogArch(R) {
  const { c, g } = makeCanvas(150, 130, R);
  g.beginPath(); g.ellipse(75, 70, 68, 56, 0, 0, TAU);
  g.fillStyle = lin(g, 0, 14, 0, 126, [[0, '#9a6a44'], [1, '#4a2c1a']]); g.fill(); ink(g, 2.6);
  g.beginPath(); g.ellipse(75, 74, 46, 40, 0, 0, TAU); g.fillStyle = '#0d0a1a'; g.fill(); ink(g, 2);
  glow(g, 75, 80, 40, '120,240,230', 0.3);
  g.strokeStyle = 'rgba(40,20,10,0.5)'; g.lineWidth = 2;
  for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(75, 70, 52 + k * 5, 46 + k * 3, 0, 3.6, 5.8); g.stroke(); }
  return c;
}

export function drawCrystalPortal(R) {
  const { c, g } = makeCanvas(130, 150, R);
  glow(g, 65, 80, 64, '170,140,255', 0.5);
  g.beginPath(); g.ellipse(65, 80, 44, 62, 0, 0, TAU);
  g.lineWidth = 12; g.strokeStyle = lin(g, 0, 18, 0, 142, [[0, '#e6dcff'], [1, '#7a5cf0']]); g.stroke();
  g.lineWidth = 2.4; g.strokeStyle = INK; g.beginPath(); g.ellipse(65, 80, 50, 68, 0, 0, TAU); g.stroke();
  g.beginPath(); g.ellipse(65, 80, 38, 56, 0, 0, TAU); g.stroke();
  g.fillStyle = 'rgba(200,180,255,0.35)'; g.beginPath(); g.ellipse(65, 80, 36, 54, 0, 0, TAU); g.fill();
  return c;
}

export function drawStar(R) {
  const { c, g } = makeCanvas(36, 36, R);
  starPath(g, 18, 19, 15, 7.2);
  g.fillStyle = rad(g, 14, 13, 1, 18, [[0, '#fffbd6'], [0.5, '#ffe266'], [1, '#ffab1f']]);
  g.fill();
  g.strokeStyle = '#a25a00'; g.lineWidth = 2.4; g.stroke();
  g.fillStyle = '#5a2a00';
  g.beginPath(); g.ellipse(15, 19, 1.4, 2, 0, 0, TAU); g.ellipse(21, 19, 1.4, 2, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,120,120,0.5)';
  g.beginPath(); g.arc(12.5, 22, 1.6, 0, TAU); g.arc(23.5, 22, 1.6, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.beginPath(); g.ellipse(14, 11, 2.5, 1.3, -0.6, 0, TAU); g.fill();
  return c;
}

export function drawShip(R) {
  const { c, g } = makeCanvas(100, 140, R);
  g.strokeStyle = INK; g.lineWidth = 4;
  g.beginPath(); g.moveTo(32, 108); g.lineTo(18, 136); g.moveTo(68, 108); g.lineTo(82, 136); g.stroke();
  g.strokeStyle = '#9fb0c8'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(32, 108); g.lineTo(18, 136); g.moveTo(68, 108); g.lineTo(82, 136); g.stroke();
  const finFill = lin(g, 0, 86, 0, 128, [[0, '#ff6b6b'], [1, '#b71c1c']]);
  g.beginPath(); g.moveTo(32, 86); g.lineTo(10, 116); g.lineTo(13, 127); g.lineTo(34, 116); g.closePath(); g.fillStyle = finFill; g.fill(); ink(g, 2.4);
  g.beginPath(); g.moveTo(68, 86); g.lineTo(90, 116); g.lineTo(87, 127); g.lineTo(66, 116); g.closePath(); g.fillStyle = finFill; g.fill(); ink(g, 2.4);
  g.beginPath(); g.moveTo(39, 116); g.lineTo(61, 116); g.lineTo(57, 129); g.lineTo(43, 129); g.closePath();
  g.fillStyle = '#4a5a6a'; g.fill(); ink(g, 2.2);
  const body = () => { g.beginPath(); g.moveTo(50, 6); g.bezierCurveTo(77, 22, 79, 72, 69, 118); g.lineTo(31, 118); g.bezierCurveTo(21, 72, 23, 22, 50, 6); g.closePath(); };
  body();
  g.fillStyle = lin(g, 24, 0, 76, 0, [[0, '#c3cfe0'], [0.38, '#ffffff'], [0.7, '#dfe7f2'], [1, '#93a6c2']]); g.fill();
  g.save(); body(); g.clip();
  g.fillStyle = lin(g, 0, 6, 0, 36, [[0, '#ff7070'], [1, '#c62828']]); g.fillRect(0, 0, 100, 34);
  g.fillStyle = '#e53935'; g.fillRect(0, 98, 100, 7);
  g.restore();
  body(); ink(g, 3);
  g.beginPath(); g.arc(50, 60, 14, 0, TAU); g.fillStyle = '#8fa3b8'; g.fill(); ink(g, 2.4);
  g.beginPath(); g.arc(50, 60, 10.5, 0, TAU);
  g.fillStyle = rad(g, 46, 56, 1, 12, [[0, '#e1f5fe'], [0.5, '#4fc3f7'], [1, '#0277bd']]); g.fill();
  starPath(g, 50, 86, 5.5, 2.4); g.fillStyle = '#ffd54f'; g.fill(); ink(g, 1.4);
  return c;
}

export function drawDot(R) {
  const { c, g } = makeCanvas(32, 32, R);
  g.fillStyle = rad(g, 16, 16, 0, 16, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]);
  g.fillRect(0, 0, 32, 32);
  return c;
}

export function drawPuff(R) {
  const { c, g } = makeCanvas(28, 28, R);
  g.fillStyle = rad(g, 14, 14, 0, 14, [[0, 'rgba(255,255,255,0.95)'], [0.6, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0)']]);
  g.fillRect(0, 0, 28, 28);
  return c;
}

export function drawSpark(R) {
  const { c, g } = makeCanvas(24, 24, R);
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(12, 0); g.quadraticCurveTo(13.5, 10.5, 24, 12); g.quadraticCurveTo(13.5, 13.5, 12, 24);
  g.quadraticCurveTo(10.5, 13.5, 0, 12); g.quadraticCurveTo(10.5, 10.5, 12, 0);
  g.fill();
  return c;
}

export function drawFlame(R) {
  const { c, g } = makeCanvas(20, 20, R);
  g.fillStyle = rad(g, 10, 10, 0, 10, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,230,150,0.9)'], [1, 'rgba(255,160,80,0)']]);
  g.fillRect(0, 0, 20, 20);
  return c;
}

export function drawShadow(R) {
  const { c, g } = makeCanvas(48, 12, R);
  g.save(); g.translate(24, 6); g.scale(1, 0.25);
  g.fillStyle = rad(g, 0, 0, 0, 24, [[0, 'rgba(10,0,30,0.7)'], [1, 'rgba(10,0,30,0)']]);
  g.beginPath(); g.arc(0, 0, 24, 0, TAU); g.fill();
  g.restore();
  return c;
}

export function drawBlock(R, letter, done) {
  const { c, g } = makeCanvas(52, 52, R);
  const col = done ? ['#fff0a8', '#ffc21a', '#b36b00'] : ['#a98af5', '#5d4fd8', '#2c2378'];
  rrect(g, 2, 2, 48, 48, 11);
  g.fillStyle = lin(g, 0, 2, 0, 50, [[0, col[0]], [0.55, col[1]], [1, col[2]]]);
  g.fill(); ink(g, 2.6);
  rrect(g, 7, 6, 38, 13, 7); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fill();
  g.font = '800 33px "Baloo 2", "Nunito", system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = done ? 'rgba(120,60,0,0.35)' : 'rgba(20,10,60,0.5)';
  g.fillText(letter, 26, 30);
  g.fillStyle = done ? '#7a3e00' : '#ffffff';
  g.fillText(letter, 26, 28);
  return c;
}
