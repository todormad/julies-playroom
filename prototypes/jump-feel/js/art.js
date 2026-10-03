// Procedural art for the prototype. Everything is painted with Canvas 2D at the
// device resolution R, then handed to Phaser as a texture shown at scale 1/R —
// so it stays sharp on Retina/iPad screens. Placeholder until real sprite art exists.

import { TERRAIN, ROCKS, ONE_WAY, WORLD_W, VIEW_W } from './config.js';

const TAU = Math.PI * 2;
export const INK = '#1b1640';
export const TERRAIN_PAD = 10;
export const TERRAIN_TOP = 14;
const PARALLAX_SPAN = WORLD_W - VIEW_W;

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h, R) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * R);
  c.height = Math.ceil(h * R);
  const g = c.getContext('2d');
  g.scale(R, R);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  return { c, g };
}

function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  return gr;
}

function rad(g, x, y, r0, r1, stops) {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  return gr;
}

function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function ink(g, w = 2.5) {
  g.strokeStyle = INK;
  g.lineWidth = w;
  g.stroke();
}

function starPath(g, x, y, ro, ri, n = 5, rot = -Math.PI / 2) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = rot + (i * Math.PI) / n;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.closePath();
}

function heartPath(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y + s * 0.9);
  g.bezierCurveTo(x - s * 1.5, y - s * 0.1, x - s * 0.7, y - s * 1.25, x, y - s * 0.45);
  g.bezierCurveTo(x + s * 0.7, y - s * 1.25, x + s * 1.5, y - s * 0.1, x, y + s * 0.9);
  g.closePath();
}

// ── Backdrop ────────────────────────────────────────────────────────────────

function drawSky(R) {
  const W = 960, H = 540;
  const { c, g } = makeCanvas(W, H, R);
  g.fillStyle = lin(g, 0, 0, 0, H, [
    [0, '#0e153e'], [0.33, '#2c2a78'], [0.6, '#86479c'], [0.82, '#e6878f'], [1, '#ffc793'],
  ]);
  g.fillRect(0, 0, W, H);
  const r = rng(7);
  for (let i = 0; i < 150; i++) {
    const x = r() * W, y = r() * H * 0.55, s = r();
    g.globalAlpha = (1 - y / (H * 0.55)) * (0.35 + 0.65 * s);
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(x, y, s > 0.92 ? 1.7 : 0.8, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  g.fillStyle = rad(g, 300, 480, 10, 340, [
    [0, 'rgba(255,238,196,0.9)'], [0.28, 'rgba(255,190,150,0.4)'], [1, 'rgba(255,160,150,0)'],
  ]);
  g.fillRect(0, 0, W, H);
  // ringed planet
  const px = 770, py = 118, pr = 56;
  g.save(); g.translate(px, py); g.rotate(-0.35);
  g.strokeStyle = 'rgba(255,214,170,0.5)'; g.lineWidth = 7;
  g.beginPath(); g.ellipse(0, 0, pr * 1.75, pr * 0.42, 0, Math.PI, TAU); g.stroke();
  g.restore();
  g.fillStyle = rad(g, px - pr * 0.35, py - pr * 0.4, pr * 0.1, pr * 1.15, [
    [0, '#ffe0b6'], [0.5, '#f08aa0'], [1, '#6c3585'],
  ]);
  g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(px, py, pr, 0, TAU); g.clip();
  g.globalAlpha = 0.16; g.fillStyle = '#fff';
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(px, py + i * pr * 0.38, pr * 1.2, pr * 0.07, -0.35, 0, TAU); g.fill(); }
  g.restore(); g.globalAlpha = 1;
  g.save(); g.translate(px, py); g.rotate(-0.35);
  g.strokeStyle = 'rgba(255,228,192,0.85)'; g.lineWidth = 7;
  g.beginPath(); g.ellipse(0, 0, pr * 1.75, pr * 0.42, 0, 0, Math.PI); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
  g.beginPath(); g.ellipse(0, 0, pr * 1.6, pr * 0.36, 0, 0, Math.PI); g.stroke();
  g.restore();
  // little moon
  g.fillStyle = rad(g, 166, 86, 1, 17, [[0, '#fff6e0'], [1, '#c3b0e6']]);
  g.beginPath(); g.arc(170, 90, 16, 0, TAU); g.fill();
  g.fillStyle = 'rgba(120,90,160,0.35)';
  g.beginPath(); g.arc(174, 93, 3.5, 0, TAU); g.arc(165, 96, 2.2, 0, TAU); g.fill();
  return c;
}

function ridge(g, w, H, { base, amp, freq, top, bottom, rim, r }) {
  const ph = r() * 100;
  const yAt = (x) => base - amp * (
    0.55 * Math.abs(Math.sin(x * freq + ph))
    + 0.3 * Math.sin(x * freq * 2.3 + ph * 1.7)
    + 0.15 * Math.sin(x * freq * 5.1 + ph * 0.3));
  g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= w; x += 6) g.lineTo(x, yAt(x));
  g.lineTo(w, H); g.closePath();
  g.fillStyle = lin(g, 0, base - amp, 0, H, [[0, top], [1, bottom]]);
  g.fill();
  g.strokeStyle = rim; g.lineWidth = 2;
  g.beginPath();
  for (let x = 0; x <= w; x += 6) { if (x) g.lineTo(x, yAt(x)); else g.moveTo(x, yAt(x)); }
  g.stroke();
}

function drawMountains(R) {
  const w = VIEW_W + PARALLAX_SPAN * 0.15, H = 300;
  const { c, g } = makeCanvas(w, H, R);
  const r = rng(11);
  ridge(g, w, H, { base: 190, amp: 110, freq: 1 / 150, top: '#6250a8', bottom: '#43357f', rim: 'rgba(255,205,225,0.3)', r });
  ridge(g, w, H, { base: 235, amp: 60, freq: 1 / 95, top: '#433788', bottom: '#2e2766', rim: 'rgba(255,205,225,0.18)', r });
  return c;
}

function tree(g, x, y, h, r) {
  g.strokeStyle = '#23486a'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 14, y - h * 0.6, x, y - h); g.stroke();
  const cr = 10 + r() * 9;
  g.fillStyle = '#2a5f86';
  g.beginPath(); g.arc(x, y - h - cr * 0.4, cr, 0, TAU); g.fill();
  for (let i = 0; i < 3; i++) {
    const fx = x + (r() - 0.5) * cr * 1.4, fy = y - h - cr * 0.4 + (r() - 0.3) * cr;
    g.fillStyle = rad(g, fx, fy, 0, 6, [[0, 'rgba(255,232,150,0.95)'], [1, 'rgba(255,200,90,0)']]);
    g.beginPath(); g.arc(fx, fy, 6, 0, TAU); g.fill();
  }
}

function drawHills(R) {
  const w = VIEW_W + PARALLAX_SPAN * 0.4, H = 260;
  const { c, g } = makeCanvas(w, H, R);
  const r = rng(23);
  const top = (x) => 118 - 36 * Math.sin(x / 210 + 1.3) - 20 * Math.sin(x / 97 + 0.4);
  for (let x = 30; x < w; x += 70 + r() * 120) tree(g, x, top(x) + 8, 26 + r() * 24, r);
  g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= w; x += 6) g.lineTo(x, top(x));
  g.lineTo(w, H); g.closePath();
  g.fillStyle = lin(g, 0, 60, 0, H, [[0, '#2f6c8f'], [1, '#1c3862']]);
  g.fill();
  g.strokeStyle = 'rgba(160,255,230,0.28)'; g.lineWidth = 2;
  g.beginPath();
  for (let x = 0; x <= w; x += 6) { if (x) g.lineTo(x, top(x)); else g.moveTo(x, top(x)); }
  g.stroke();
  return c;
}

function drawNear(R) {
  const w = VIEW_W + PARALLAX_SPAN * 0.7, H = 220;
  const { c, g } = makeCanvas(w, H, R);
  const r = rng(41);
  for (let x = 20; x < w; x += 90 + r() * 160) {
    const h = 60 + r() * 80;
    if (r() < 0.55) {
      g.fillStyle = '#1f2c58';
      g.beginPath();
      g.moveTo(x - 5, H); g.quadraticCurveTo(x - 3, H - h * 0.5, x - 2, H - h);
      g.lineTo(x + 4, H - h); g.quadraticCurveTo(x + 6, H - h * 0.5, x + 7, H);
      g.closePath(); g.fill();
      const cw = 24 + r() * 22;
      g.beginPath(); g.ellipse(x + 1, H - h, cw, cw * 0.48, 0, Math.PI, TAU); g.fill();
      for (let i = 0; i < 4; i++) {
        g.fillStyle = 'rgba(120,240,255,0.55)';
        g.beginPath(); g.arc(x + 1 + (r() - 0.5) * cw * 1.3, H - h - r() * cw * 0.32, 1.8 + r() * 2, 0, TAU); g.fill();
      }
    } else {
      g.strokeStyle = '#1f2c58';
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

function drawFog(R) {
  const { c, g } = makeCanvas(32, 130, R);
  g.fillStyle = lin(g, 0, 0, 0, 130, [
    [0, 'rgba(210,180,255,0)'], [0.45, 'rgba(210,180,255,0.35)'], [1, 'rgba(235,215,255,0.8)'],
  ]);
  g.fillRect(0, 0, 32, 130);
  return c;
}

function drawCloud(R) {
  const { c, g } = makeCanvas(90, 42, R);
  g.fillStyle = 'rgba(245,235,255,0.9)';
  for (const [x, y, rr] of [[22, 26, 14], [42, 18, 18], [64, 24, 15], [50, 30, 14], [30, 32, 11]]) {
    g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }
  return c;
}

// ── Terrain ─────────────────────────────────────────────────────────────────

function crystal(g, x, y, r) {
  const col = r() < 0.5 ? ['#8ff7ff', '#39b8d8'] : ['#e6a8ff', '#9a55d6'];
  const s = 5 + r() * 5;
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

function grassCap(g, x, y, w, r, roundL, roundR) {
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
  g.fillStyle = lin(g, 0, top, 0, bot + 10, [[0, '#7df5bf'], [0.3, '#34c99a'], [1, '#178067']]);
  g.fill();
  ink(g, 2.4);
  g.strokeStyle = 'rgba(225,255,240,0.75)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x + 10, top + 3); g.lineTo(x + w - 10, top + 3); g.stroke();
  for (let bx = x + 5; bx < x + w - 5; bx += 4 + r() * 7) {
    const bh = 3 + r() * 8;
    g.strokeStyle = r() < 0.5 ? '#3fdca4' : '#9affd2'; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(bx, top + 1);
    g.quadraticCurveTo(bx + (r() - 0.5) * 4, top - bh * 0.6, bx + (r() - 0.5) * 6, top - bh);
    g.stroke();
  }
  for (let i = 0; i < Math.max(1, w / 90); i++) flower(g, x + 14 + r() * (w - 28), top, r);
}

function drawTerrain(R, rect, seed) {
  const r = rng(seed);
  const P = TERRAIN_PAD, TOP = TERRAIN_TOP;
  const W = rect.w, H = rect.h;
  const { c, g } = makeCanvas(W + P * 2, H + TOP, R);
  const x0 = P, y0 = TOP;
  const openL = rect.x > 0, openR = rect.x + rect.w < WORLD_W;
  const radii = [openL ? 12 : 0, openR ? 12 : 0, 0, 0];
  g.save();
  g.beginPath(); g.roundRect(x0, y0 + 2, W, H + 4, radii);
  g.fillStyle = lin(g, 0, y0, 0, y0 + Math.max(H, 120), [[0, '#8a5484'], [0.18, '#6a3b69'], [1, '#2a153c']]);
  g.fill();
  g.clip();
  for (let y = y0 + 34; y < y0 + H; y += 20 + r() * 22) {
    g.strokeStyle = `rgba(35,12,50,${0.18 + r() * 0.14})`; g.lineWidth = 2 + r() * 3;
    const ph = r() * 6;
    g.beginPath();
    for (let x = 0; x <= W; x += 16) {
      const yy = y + Math.sin(x * 0.045 + ph) * 3;
      if (x) g.lineTo(x0 + x, yy); else g.moveTo(x0, yy);
    }
    g.stroke();
  }
  const pebbles = Math.round((W * H) / 700);
  for (let i = 0; i < pebbles; i++) {
    const px = x0 + r() * W, py = y0 + 24 + r() * H, pr = 1.5 + r() * 4;
    g.fillStyle = r() < 0.55 ? `rgba(190,140,190,${0.25 + r() * 0.3})` : `rgba(20,6,30,${0.25 + r() * 0.3})`;
    g.beginPath(); g.ellipse(px, py, pr * 1.4, pr, r() * 3, 0, TAU); g.fill();
  }
  for (let i = 0; i < Math.max(1, Math.round(W / 200)); i++) {
    crystal(g, x0 + 24 + r() * (W - 48), y0 + 44 + r() * Math.max(10, H - 60), r);
  }
  if (openL) {
    g.fillStyle = lin(g, x0, 0, x0 + 22, 0, [[0, 'rgba(15,4,25,0.5)'], [1, 'rgba(15,4,25,0)']]);
    g.fillRect(x0, y0, 22, H + 10);
  }
  if (openR) {
    g.fillStyle = lin(g, x0 + W - 22, 0, x0 + W, 0, [[0, 'rgba(15,4,25,0)'], [1, 'rgba(15,4,25,0.5)']]);
    g.fillRect(x0 + W - 22, y0, 22, H + 10);
  }
  g.fillStyle = lin(g, 0, y0, 0, y0 + 30, [[0, 'rgba(15,4,25,0.45)'], [1, 'rgba(15,4,25,0)']]);
  g.fillRect(x0, y0, W, 30);
  g.restore();
  g.beginPath(); g.roundRect(x0, y0 + 2, W, H + 12, radii); ink(g, 2.5);
  if (H > 150) {
    for (let i = 0; i < 3; i++) {
      if (openL) vine(g, x0 + 3 + i * 9, y0 + 8, 60 + r() * 120, r);
      if (openR) vine(g, x0 + W - 3 - i * 9, y0 + 8, 60 + r() * 120, r);
    }
  }
  grassCap(g, x0 - (openL ? 5 : 0), y0, W + (openL ? 5 : 0) + (openR ? 5 : 0), r, openL, openR);
  return c;
}

function mossCap(g, x, y, w, r) {
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
  g.fillStyle = lin(g, 0, y, 0, y + 10, [[0, '#7df5bf'], [1, '#22a07f']]);
  g.fill();
  ink(g, 2);
}

function drawRock(R, rect, seed) {
  const r = rng(seed);
  const W = rect.w, H = rect.h;
  const { c, g } = makeCanvas(W + 12, H + 14, R);
  const x0 = 6, y0 = 10;
  g.beginPath(); g.roundRect(x0, y0, W, H + 4, [16, 18, 6, 6]);
  g.fillStyle = lin(g, 0, y0, 0, y0 + H, [[0, '#a893d6'], [0.5, '#7a65ad'], [1, '#4c3b7a']]);
  g.fill();
  g.save(); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.beginPath(); g.moveTo(x0, y0 + 10); g.lineTo(x0 + W * 0.45, y0); g.lineTo(x0 + W * 0.6, y0 + H * 0.45); g.lineTo(x0, y0 + H * 0.6); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(30,15,60,0.45)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x0 + W * 0.62, y0 + 6); g.lineTo(x0 + W * 0.55, y0 + H * 0.4); g.lineTo(x0 + W * 0.7, y0 + H * 0.7); g.stroke();
  g.restore();
  g.beginPath(); g.roundRect(x0, y0, W, H + 4, [16, 18, 6, 6]); ink(g, 2.5);
  mossCap(g, x0 + 4, y0, W - 8, r);
  return c;
}

function drawPlank(R, w) {
  const { c, g } = makeCanvas(w + 12, 46, R);
  const x0 = 6, y0 = 4, h = 16;
  const pods = [x0 + w * 0.22, x0 + w * 0.78];
  for (const px of pods) {
    g.fillStyle = rad(g, px, y0 + h + 8, 1, 22, [[0, 'rgba(122,240,255,0.85)'], [1, 'rgba(122,240,255,0)']]);
    g.fillRect(px - 24, y0 + h - 4, 48, 30);
  }
  for (const px of pods) {
    g.beginPath(); g.ellipse(px, y0 + h + 1, 11, 6, 0, 0, Math.PI);
    g.fillStyle = '#6f7fa0'; g.fill(); ink(g, 2);
  }
  rrect(g, x0, y0, w, h, 7);
  g.fillStyle = lin(g, 0, y0, 0, y0 + h, [[0, '#f0b877'], [0.5, '#c9884a'], [1, '#8f5a2c']]);
  g.fill(); ink(g, 2.5);
  g.strokeStyle = 'rgba(90,50,20,0.55)'; g.lineWidth = 1.5;
  for (let x = x0 + 30; x < x0 + w - 10; x += 32) { g.beginPath(); g.moveTo(x, y0 + 3); g.lineTo(x, y0 + h - 3); g.stroke(); }
  g.strokeStyle = 'rgba(255,230,190,0.6)';
  g.beginPath(); g.moveTo(x0 + 8, y0 + 3.5); g.lineTo(x0 + w - 8, y0 + 3.5); g.stroke();
  g.fillStyle = '#5a3a1e';
  for (let x = x0 + 14; x < x0 + w; x += 32) { g.beginPath(); g.arc(x, y0 + h / 2, 1.5, 0, TAU); g.fill(); }
  return c;
}

// ── Props ───────────────────────────────────────────────────────────────────

function drawShroom(R) {
  const { c, g } = makeCanvas(34, 38, R);
  g.fillStyle = rad(g, 17, 14, 2, 17, [[0, 'rgba(160,120,255,0.6)'], [1, 'rgba(160,120,255,0)']]);
  g.fillRect(0, 0, 34, 34);
  rrect(g, 13, 16, 8, 21, 4); g.fillStyle = '#efe6ff'; g.fill(); ink(g, 2);
  g.beginPath(); g.ellipse(17, 16, 13, 9, 0, Math.PI, TAU); g.closePath();
  g.fillStyle = lin(g, 0, 7, 0, 17, [[0, '#c7a4ff'], [1, '#7c4dff']]); g.fill(); ink(g, 2);
  g.fillStyle = '#9ffcff';
  for (const [x, y, rr] of [[11, 12, 1.8], [18, 9.5, 2.2], [24, 13, 1.6]]) { g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
  return c;
}

function drawTuft(R) {
  const { c, g } = makeCanvas(40, 24, R);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.28;
    g.strokeStyle = i % 2 ? '#1f9f7c' : '#2cc08f'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(20 + (i - 3) * 2, 24);
    g.quadraticCurveTo(20 + Math.cos(a) * 10, 24 + Math.sin(a) * 14, 20 + Math.cos(a) * 18 + (i - 3), 24 + Math.sin(a) * 20);
    g.stroke();
  }
  return c;
}

function drawSign(R) {
  const { c, g } = makeCanvas(64, 84, R);
  rrect(g, 29, 30, 7, 54, 3); g.fillStyle = '#8f5a2c'; g.fill(); ink(g, 2);
  rrect(g, 4, 6, 56, 30, 8);
  g.fillStyle = lin(g, 0, 6, 0, 36, [[0, '#f3c286'], [1, '#c48346']]); g.fill(); ink(g, 2.5);
  g.fillStyle = '#fff8ea';
  g.beginPath(); g.moveTo(14, 18); g.lineTo(36, 18); g.lineTo(36, 12); g.lineTo(50, 21); g.lineTo(36, 30); g.lineTo(36, 24); g.lineTo(14, 24); g.closePath();
  g.fill(); ink(g, 1.8);
  return c;
}

function drawBeacon(R) {
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
  g.strokeStyle = 'rgba(160,248,255,0.8)'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(14, 32); g.lineTo(30, 32); g.stroke();
  return c;
}

function drawGhost(R) {
  const { c, g } = makeCanvas(96, 16, R);
  rrect(g, 4, 2, 88, 10, 5);
  g.fillStyle = 'rgba(122,240,255,0.18)'; g.fill();
  g.setLineDash([6, 5]);
  g.strokeStyle = 'rgba(170,250,255,0.95)'; g.lineWidth = 2; g.stroke();
  g.setLineDash([]);
  return c;
}

function drawStar(R) {
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

function drawDot(R) {
  const { c, g } = makeCanvas(32, 32, R);
  g.fillStyle = rad(g, 16, 16, 0, 16, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]);
  g.fillRect(0, 0, 32, 32);
  return c;
}

function drawPuff(R) {
  const { c, g } = makeCanvas(28, 28, R);
  g.fillStyle = rad(g, 14, 14, 0, 14, [[0, 'rgba(255,255,255,0.95)'], [0.6, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0)']]);
  g.fillRect(0, 0, 28, 28);
  return c;
}

function drawSpark(R) {
  const { c, g } = makeCanvas(24, 24, R);
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(12, 0); g.quadraticCurveTo(13.5, 10.5, 24, 12); g.quadraticCurveTo(13.5, 13.5, 12, 24);
  g.quadraticCurveTo(10.5, 13.5, 0, 12); g.quadraticCurveTo(10.5, 10.5, 12, 0);
  g.fill();
  return c;
}

function drawFlame(R) {
  const { c, g } = makeCanvas(20, 20, R);
  g.fillStyle = rad(g, 10, 10, 0, 10, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,230,150,0.9)'], [1, 'rgba(255,160,80,0)']]);
  g.fillRect(0, 0, 20, 20);
  return c;
}

function drawShadow(R) {
  const { c, g } = makeCanvas(48, 12, R);
  g.save(); g.translate(24, 6); g.scale(1, 0.25);
  g.fillStyle = rad(g, 0, 0, 0, 24, [[0, 'rgba(10,0,30,0.7)'], [1, 'rgba(10,0,30,0)']]);
  g.beginPath(); g.arc(0, 0, 24, 0, TAU); g.fill();
  g.restore();
  return c;
}

function drawGateBeam(R) {
  const H = 280;
  const { c, g } = makeCanvas(34, H, R);
  g.fillStyle = lin(g, 0, 0, 34, 0, [[0, 'rgba(90,230,255,0)'], [0.5, 'rgba(90,230,255,0.35)'], [1, 'rgba(90,230,255,0)']]);
  g.fillRect(0, 0, 34, H);
  for (let k = 0; k < 3; k++) {
    g.strokeStyle = k === 1 ? 'rgba(235,255,255,0.95)' : 'rgba(140,245,255,0.8)';
    g.lineWidth = k === 1 ? 2.4 : 1.6;
    g.beginPath();
    for (let y = 0; y <= H; y += 4) {
      const x = 17 + (k - 1) * 7 + Math.sin(y * 0.09 + k * 2) * 2.2;
      if (y) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.stroke();
  }
  return c;
}

function drawGatePost(R) {
  const { c, g } = makeCanvas(46, 26, R);
  rrect(g, 3, 3, 40, 18, 6);
  g.fillStyle = lin(g, 0, 3, 0, 21, [[0, '#dfe7ee'], [1, '#6c8196']]); g.fill(); ink(g, 2.4);
  rrect(g, 12, 17, 22, 7, 3); g.fillStyle = '#7af0ff'; g.fill(); ink(g, 1.8);
  g.fillStyle = '#44506a';
  g.beginPath(); g.arc(9, 12, 1.6, 0, TAU); g.arc(37, 12, 1.6, 0, TAU); g.fill();
  return c;
}

function drawShip(R) {
  const { c, g } = makeCanvas(100, 140, R);
  g.strokeStyle = INK; g.lineWidth = 4;
  g.beginPath(); g.moveTo(32, 108); g.lineTo(18, 136); g.moveTo(68, 108); g.lineTo(82, 136); g.stroke();
  g.strokeStyle = '#9fb0c8'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(32, 108); g.lineTo(18, 136); g.moveTo(68, 108); g.lineTo(82, 136); g.stroke();
  rrect(g, 11, 133, 14, 5, 2); g.fillStyle = '#6c8196'; g.fill(); ink(g, 1.8);
  rrect(g, 75, 133, 14, 5, 2); g.fillStyle = '#6c8196'; g.fill(); ink(g, 1.8);
  const finFill = lin(g, 0, 86, 0, 128, [[0, '#ff6b6b'], [1, '#b71c1c']]);
  g.beginPath(); g.moveTo(32, 86); g.lineTo(10, 116); g.lineTo(13, 127); g.lineTo(34, 116); g.closePath(); g.fillStyle = finFill; g.fill(); ink(g, 2.4);
  g.beginPath(); g.moveTo(68, 86); g.lineTo(90, 116); g.lineTo(87, 127); g.lineTo(66, 116); g.closePath(); g.fillStyle = finFill; g.fill(); ink(g, 2.4);
  g.beginPath(); g.moveTo(39, 116); g.lineTo(61, 116); g.lineTo(57, 129); g.lineTo(43, 129); g.closePath();
  g.fillStyle = '#4a5a6a'; g.fill(); ink(g, 2.2);
  const body = () => {
    g.beginPath(); g.moveTo(50, 6);
    g.bezierCurveTo(77, 22, 79, 72, 69, 118); g.lineTo(31, 118);
    g.bezierCurveTo(21, 72, 23, 22, 50, 6); g.closePath();
  };
  body();
  g.fillStyle = lin(g, 24, 0, 76, 0, [[0, '#c3cfe0'], [0.38, '#ffffff'], [0.7, '#dfe7f2'], [1, '#93a6c2']]);
  g.fill();
  g.save(); body(); g.clip();
  g.fillStyle = lin(g, 0, 6, 0, 36, [[0, '#ff7070'], [1, '#c62828']]); g.fillRect(0, 0, 100, 34);
  g.fillStyle = '#e53935'; g.fillRect(0, 98, 100, 7);
  g.restore();
  body(); ink(g, 3);
  g.strokeStyle = INK; g.lineWidth = 2;
  g.beginPath(); g.moveTo(28, 34); g.quadraticCurveTo(50, 38, 72, 34); g.stroke();
  g.beginPath(); g.arc(50, 60, 14, 0, TAU); g.fillStyle = '#8fa3b8'; g.fill(); ink(g, 2.4);
  g.beginPath(); g.arc(50, 60, 10.5, 0, TAU);
  g.fillStyle = rad(g, 46, 56, 1, 12, [[0, '#e1f5fe'], [0.5, '#4fc3f7'], [1, '#0277bd']]); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(46, 55, 4, 2, -0.6, 0, TAU); g.fill();
  starPath(g, 50, 86, 5.5, 2.4); g.fillStyle = '#ffd54f'; g.fill(); ink(g, 1.4);
  rrect(g, 47, 104, 6, 22, 3); g.fillStyle = '#e53935'; g.fill(); ink(g, 2);
  return c;
}

// ── Letter blocks ───────────────────────────────────────────────────────────

export function blockKey(letter, done) {
  return `block_${letter.codePointAt(0)}_${done ? 1 : 0}`;
}

function drawBlock(R, letter, done) {
  const { c, g } = makeCanvas(52, 52, R);
  const col = done ? ['#fff0a8', '#ffc21a', '#b36b00'] : ['#a98af5', '#5d4fd8', '#2c2378'];
  rrect(g, 2, 2, 48, 48, 11);
  g.fillStyle = lin(g, 0, 2, 0, 50, [[0, col[0]], [0.55, col[1]], [1, col[2]]]);
  g.fill(); ink(g, 2.6);
  rrect(g, 7, 6, 38, 13, 7); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fill();
  g.fillStyle = done ? 'rgba(120,60,0,0.35)' : 'rgba(255,255,255,0.35)';
  for (const [x, y] of [[8, 44], [44, 44]]) { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
  g.font = '800 33px "Baloo 2", "Nunito", system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = done ? 'rgba(120,60,0,0.35)' : 'rgba(20,10,60,0.5)';
  g.fillText(letter, 26, 30);
  g.fillStyle = done ? '#7a3e00' : '#ffffff';
  g.fillText(letter, 26, 28);
  return c;
}

// ── Astro ───────────────────────────────────────────────────────────────────
// Frame 64×72, facing right, feet at y=70. Limb angles are from straight down;
// positive swings forward (to the right).

export const ASTRO_POSES = [
  { bob: 0, legB: 0.1, legF: -0.1, armB: 0.25, armF: -0.2, eyes: 'open' },                    // 0 idle
  { bob: 1, legB: 0.1, legF: -0.1, armB: 0.3, armF: -0.15, eyes: 'open' },                    // 1 idle breathe
  { bob: 0, legB: -0.55, legF: 0.6, armB: 0.6, armF: -0.6, eyes: 'open' },                    // 2 run
  { bob: -2, legB: 0.25, legF: -0.1, armB: 0.1, armF: 0.1, legLenB: 10, eyes: 'open' },       // 3 run
  { bob: 0, legB: 0.6, legF: -0.55, armB: -0.6, armF: 0.6, eyes: 'open' },                    // 4 run
  { bob: -2, legB: -0.1, legF: 0.25, armB: 0.1, armF: 0.1, legLenF: 10, eyes: 'open' },       // 5 run
  { bob: -1, legB: -0.3, legF: 0.95, legLenF: 9, armB: 2.5, armF: -2.6, eyes: 'open' },       // 6 jump
  { bob: 0, legB: -0.35, legF: 0.4, armB: 2.1, armF: -2.0, eyes: 'wow' },                     // 7 fall
  { bob: 0, legB: 0.12, legF: -0.08, armB: 3.0, armF: -3.0, eyes: 'happy' },                  // 8 carried
  { bob: 0, legB: 0.1, legF: -0.1, armB: 0.25, armF: -0.2, eyes: 'blink' },                   // 9 blink
  { bob: 0, legB: 0.05, legF: -0.05, armB: 2.6, armF: -2.6, eyes: 'happy' },                  // 10 cheer
];

function limb(g, x, y, ang, len, w, fill) {
  const ex = x + Math.sin(ang) * len;
  const ey = y + Math.cos(ang) * len;
  g.strokeStyle = INK; g.lineWidth = w + 3;
  g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
  g.strokeStyle = fill; g.lineWidth = w;
  g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
  return [ex, ey];
}

function eyes(g, x1, x2, y, kind) {
  g.fillStyle = '#eafcff'; g.strokeStyle = '#eafcff'; g.lineWidth = 2;
  if (kind === 'blink') {
    for (const x of [x1, x2]) { g.beginPath(); g.moveTo(x - 2.4, y); g.lineTo(x + 2.4, y); g.stroke(); }
  } else if (kind === 'happy') {
    for (const x of [x1, x2]) { g.beginPath(); g.arc(x, y + 1.6, 2.6, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  } else {
    const rx = kind === 'wow' ? 3 : 2.4, ry = kind === 'wow' ? 3.8 : 3.3;
    for (const x of [x1, x2]) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); }
  }
}

function drawAstroFrame(g, p) {
  const bob = p.bob || 0;
  const hipY = 55 + bob, shY = 43 + bob;
  const boot = (x, y, dark) => {
    rrect(g, x - 5, y - 3, 12, 7, 3.5);
    g.fillStyle = dark ? '#b8232a' : '#ef4b4b'; g.fill(); ink(g, 2);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x - 3, y - 2, 5, 1.5);
  };
  const hand = (x, y, dark) => {
    g.beginPath(); g.arc(x, y, 3.8, 0, TAU);
    g.fillStyle = dark ? '#cdd6dd' : '#f5f7fa'; g.fill(); ink(g, 2);
  };
  let [hx, hy] = limb(g, 25, shY, p.armB, 12, 6, '#1f5fb8'); hand(hx, hy, true);
  let [fx, fy] = limb(g, 28, hipY, p.legB, p.legLenB ?? 12, 7.5, '#1f5fb8'); boot(fx + 1, fy, true);
  rrect(g, 13, 35 + bob, 10, 19, 4);
  g.fillStyle = lin(g, 13, 0, 23, 0, [[0, '#8fa3b5'], [1, '#cbd6e0']]); g.fill(); ink(g, 2.2);
  g.fillStyle = '#ffb300'; g.beginPath(); g.arc(18, 40 + bob, 1.8, 0, TAU); g.fill();
  rrect(g, 19, 36 + bob, 26, 22, 9);
  g.fillStyle = lin(g, 0, 36 + bob, 0, 58 + bob, [[0, '#45a3ff'], [1, '#1a5dc0']]); g.fill(); ink(g, 2.5);
  g.fillStyle = 'rgba(10,30,90,0.35)'; g.fillRect(20, 51 + bob, 24, 3);
  starPath(g, 36, 45 + bob, 4.2, 1.9); g.fillStyle = '#ffd54f'; g.fill();
  [fx, fy] = limb(g, 36, hipY, p.legF, p.legLenF ?? 12, 7.5, '#2f7ce0'); boot(fx + 1, fy, false);
  [hx, hy] = limb(g, 41, shY, p.armF, 12, 6, '#2f7ce0'); hand(hx, hy, false);
  const cx = 32, cy = 23 + bob;
  g.strokeStyle = INK; g.lineWidth = 2;
  g.beginPath(); g.moveTo(25, cy - 14); g.lineTo(22, cy - 21); g.stroke();
  g.fillStyle = rad(g, 21.5, cy - 23, 0, 4, [[0, '#fff8c4'], [1, '#ffb300']]);
  g.beginPath(); g.arc(22, cy - 22.5, 3, 0, TAU); g.fill(); ink(g, 1.5);
  g.beginPath(); g.arc(cx, cy, 18, 0, TAU);
  g.fillStyle = rad(g, cx - 6, cy - 8, 2, 22, [[0, '#ffffff'], [0.6, '#dcecff'], [1, '#9cc3f0']]); g.fill(); ink(g, 2.6);
  g.beginPath(); g.ellipse(cx + 3.5, cy + 1, 12.5, 10.5, 0, 0, TAU);
  g.fillStyle = lin(g, 0, cy - 10, 0, cy + 12, [[0, '#2c3280'], [1, '#141640']]); g.fill(); ink(g, 2);
  g.strokeStyle = 'rgba(120,200,255,0.55)'; g.lineWidth = 1.5;
  g.beginPath(); g.ellipse(cx + 3.5, cy + 1, 10.4, 8.4, 0, 0.2, 1.4); g.stroke();
  eyes(g, cx + 0.5, cx + 8.5, cy + 1.5, p.eyes);
  g.fillStyle = 'rgba(255,255,255,0.78)';
  g.beginPath(); g.ellipse(cx - 2, cy - 5, 4.5, 2.2, -0.5, 0, TAU); g.fill();
  g.beginPath(); g.arc(cx + 11, cy - 4, 1.3, 0, TAU); g.fill();
}

// ── Robot ───────────────────────────────────────────────────────────────────
// Frame 96×88, centre (48,44). In 'plate' mode the platform surface is the frame top (y=0).

export const ROBOT_FRAMES = ['idle', 'blink', 'plate', 'carry'];

function drawRobotFrame(g, mode) {
  const arm = (x0, y0, x1, y1) => {
    g.strokeStyle = INK; g.lineWidth = 8.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = '#9fb0bd'; g.lineWidth = 5.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.beginPath(); g.arc(x1, y1, 4.2, 0, TAU); g.fillStyle = '#dfe7ee'; g.fill(); ink(g, 2);
  };
  g.fillStyle = rad(g, 48, 76, 0, 10, [[0, 'rgba(255,243,176,0.9)'], [1, 'rgba(255,170,60,0)']]);
  g.beginPath(); g.arc(48, 76, 10, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(40, 66); g.lineTo(56, 66); g.lineTo(53, 75); g.lineTo(43, 75); g.closePath();
  g.fillStyle = '#4a5a6a'; g.fill(); ink(g, 2);
  if (mode === 'idle' || mode === 'blink') { arm(32, 48, 20, 61); arm(64, 48, 76, 61); }
  if (mode === 'carry') { arm(33, 50, 43, 78); arm(63, 50, 53, 78); }
  rrect(g, 30, 40, 36, 28, 10);
  g.fillStyle = lin(g, 0, 40, 0, 68, [[0, '#e2e9ee'], [1, '#8a9cab']]); g.fill(); ink(g, 2.5);
  heartPath(g, 48, 54, 5.2); g.fillStyle = '#ff5a6e'; g.fill(); ink(g, 1.6);
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(46, 51.5, 1.3, 0, TAU); g.fill();
  if (mode === 'plate') { arm(32, 46, 15, 9); arm(64, 46, 81, 9); }
  for (const x of [26, 70]) { g.beginPath(); g.arc(x, 27, 4.2, 0, TAU); g.fillStyle = '#9fb0bd'; g.fill(); ink(g, 2); }
  rrect(g, 27, 12, 42, 30, 12);
  g.fillStyle = lin(g, 0, 12, 0, 42, [[0, '#ffffff'], [1, '#b6c4ce']]); g.fill(); ink(g, 2.6);
  rrect(g, 33, 18, 30, 18, 8); g.fillStyle = '#1b2436'; g.fill();
  if (mode === 'blink') {
    g.strokeStyle = '#ffd54f'; g.lineWidth = 2;
    for (const x of [41, 55]) { g.beginPath(); g.moveTo(x - 3, 27); g.lineTo(x + 3, 27); g.stroke(); }
  } else if (mode === 'plate') {
    g.strokeStyle = '#ffd54f'; g.lineWidth = 2.2;
    for (const x of [41, 55]) { g.beginPath(); g.arc(x, 28.5, 3.2, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  } else {
    for (const x of [41, 55]) {
      g.fillStyle = rad(g, x, 27, 0, 7, [[0, 'rgba(255,230,120,0.6)'], [1, 'rgba(255,230,120,0)']]);
      g.beginPath(); g.arc(x, 27, 7, 0, TAU); g.fill();
      g.fillStyle = rad(g, x - 1, 26, 0, 4.2, [[0, '#fffbe0'], [1, '#ffc233']]);
      g.beginPath(); g.arc(x, 27, 4, 0, TAU); g.fill();
    }
  }
  g.strokeStyle = '#ffd54f'; g.lineWidth = 1.8;
  g.beginPath(); g.arc(48, 30.5, 3.6, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
  g.strokeStyle = INK; g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(48, 12); g.lineTo(48, 5); g.stroke();
  g.fillStyle = rad(g, 47, 3, 0, 5, [[0, '#dcffee'], [1, '#22d98a']]);
  g.beginPath(); g.arc(48, 4, 3.3, 0, TAU); g.fill(); ink(g, 1.6);
  if (mode === 'plate') {
    rrect(g, 4, 0.5, 88, 9, 4.5);
    g.fillStyle = lin(g, 0, 0, 0, 9, [[0, '#d4fbff'], [1, '#2fbfe2']]); g.fill(); ink(g, 2.2);
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(10, 3); g.lineTo(86, 3); g.stroke();
  }
}

// ── Registration ────────────────────────────────────────────────────────────

function addSheet(T, key, canvas, fw, fh, n, R) {
  const tex = T.addCanvas(key, canvas);
  for (let i = 0; i < n; i++) tex.add(i, 0, Math.round(i * fw * R), 0, Math.round(fw * R), Math.round(fh * R));
}

export function buildTextures(scene, R, word) {
  const T = scene.textures;
  const add = (key, fn) => { if (!T.exists(key)) T.addCanvas(key, fn()); };
  add('sky', () => drawSky(R));
  add('far', () => drawMountains(R));
  add('hills', () => drawHills(R));
  add('near', () => drawNear(R));
  add('fog', () => drawFog(R));
  add('cloud', () => drawCloud(R));
  TERRAIN.forEach((rect, i) => add(`terrain${i}`, () => drawTerrain(R, rect, 100 + i)));
  ROCKS.forEach((rect, i) => add(`rock${i}`, () => drawRock(R, rect, 300 + i)));
  ONE_WAY.forEach((p, i) => add(`plank${i}`, () => drawPlank(R, p.w)));
  add('shroom', () => drawShroom(R));
  add('tuft', () => drawTuft(R));
  add('sign', () => drawSign(R));
  add('beacon', () => drawBeacon(R));
  add('ghost', () => drawGhost(R));
  add('star', () => drawStar(R));
  add('dot', () => drawDot(R));
  add('puff', () => drawPuff(R));
  add('spark', () => drawSpark(R));
  add('flame', () => drawFlame(R));
  add('shadow', () => drawShadow(R));
  add('gateBeam', () => drawGateBeam(R));
  add('gatePost', () => drawGatePost(R));
  add('ship', () => drawShip(R));
  if (!T.exists('astro')) {
    const { c, g } = makeCanvas(64 * ASTRO_POSES.length, 72, R);
    ASTRO_POSES.forEach((p, i) => { g.save(); g.translate(i * 64, 0); drawAstroFrame(g, p); g.restore(); });
    addSheet(T, 'astro', c, 64, 72, ASTRO_POSES.length, R);
  }
  if (!T.exists('robot')) {
    const { c, g } = makeCanvas(96 * ROBOT_FRAMES.length, 88, R);
    ROBOT_FRAMES.forEach((m, i) => { g.save(); g.translate(i * 96, 0); drawRobotFrame(g, m); g.restore(); });
    addSheet(T, 'robot', c, 96, 88, ROBOT_FRAMES.length, R);
  }
  for (const ch of new Set(word)) {
    add(blockKey(ch, false), () => drawBlock(R, ch, false));
    add(blockKey(ch, true), () => drawBlock(R, ch, true));
  }
}

// Images for the HTML overlays (start screen, radio avatar).
export function portraitURL(kind) {
  if (kind === 'astro') {
    const { c, g } = makeCanvas(64, 72, 3);
    drawAstroFrame(g, ASTRO_POSES[10]);
    return c.toDataURL();
  }
  if (kind === 'robotFace') {
    const { c, g } = makeCanvas(56, 46, 3);
    g.translate(-20, 0);
    drawRobotFrame(g, 'idle');
    return c.toDataURL();
  }
  const { c, g } = makeCanvas(96, 88, 3);
  drawRobotFrame(g, 'idle');
  return c.toDataURL();
}
