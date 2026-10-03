// Canvas painting helpers shared by all art modules. Everything is drawn in logical
// units on a canvas pre-scaled by R (device resolution), so it stays sharp when
// Phaser shows it at scale 1/R under a camera zoomed by R.

export const TAU = Math.PI * 2;
export const INK = '#1b1640';

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

export function makeCanvas(w, h, R) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * R));
  c.height = Math.max(1, Math.ceil(h * R));
  const g = c.getContext('2d');
  g.scale(R, R);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  return { c, g };
}

export function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  return gr;
}

export function rad(g, x, y, r0, r1, stops) {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  return gr;
}

export function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

export function ink(g, w = 2.5) {
  g.strokeStyle = INK;
  g.lineWidth = w;
  g.stroke();
}

export function starPath(g, x, y, ro, ri, n = 5, rot = -Math.PI / 2) {
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

export function heartPath(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y + s * 0.9);
  g.bezierCurveTo(x - s * 1.5, y - s * 0.1, x - s * 0.7, y - s * 1.25, x, y - s * 0.45);
  g.bezierCurveTo(x + s * 0.7, y - s * 1.25, x + s * 1.5, y - s * 0.1, x, y + s * 0.9);
  g.closePath();
}

// Two-pass line: dark outline, then colour on top.
export function limbLine(g, x0, y0, x1, y1, w, fill) {
  g.strokeStyle = INK; g.lineWidth = w + 3;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.strokeStyle = fill; g.lineWidth = w;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
}

export function glow(g, x, y, r, rgb, a = 0.7) {
  g.fillStyle = rad(g, x, y, 0, r, [[0, `rgba(${rgb},${a})`], [1, `rgba(${rgb},0)`]]);
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
