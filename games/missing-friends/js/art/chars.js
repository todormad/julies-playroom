// Characters: Astro, the Robot, the three friends (styled after Astro Buddy Jump) and beetles.

import { TAU, INK, lin, rad, rrect, ink, starPath, heartPath, limbLine, glow } from './paint.js';

// ── Astro ───────────────────────────────────────────────────────────────────
// Frame 64×72, facing right, feet at y=70. Limb angles are from straight down;
// positive swings forward (to the right).

export const ASTRO_W = 64;
export const ASTRO_H = 72;
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
  { bob: 0, legB: 0.55, legF: 0.85, legLenF: 9, armB: 2.0, armF: 2.25, eyes: 'open' },        // 11 wall cling (wall on the right)
  { bob: -1, legB: -0.85, legF: 0.35, armB: -1.1, armF: -1.3, eyes: 'wow' },                  // 12 dash
  { bob: 1, legB: 0.7, legF: 1.1, legLenF: 8, legLenB: 9, armB: 2.4, armF: 2.7, eyes: 'open' }, // 13 climb
  { bob: 0, legB: 0.3, legF: -0.4, armB: -0.5, armF: 0.9, eyes: 'wow' },                      // 14 hurt
];

function astroEyes(g, x1, x2, y, kind) {
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

function limb(g, x, y, ang, len, w, fill) {
  const ex = x + Math.sin(ang) * len;
  const ey = y + Math.cos(ang) * len;
  limbLine(g, x, y, ex, ey, w, fill);
  return [ex, ey];
}

export function drawAstro(g, p) {
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
  astroEyes(g, cx + 0.5, cx + 8.5, cy + 1.5, p.eyes);
  g.fillStyle = 'rgba(255,255,255,0.78)';
  g.beginPath(); g.ellipse(cx - 2, cy - 5, 4.5, 2.2, -0.5, 0, TAU); g.fill();
  g.beginPath(); g.arc(cx + 11, cy - 4, 1.3, 0, TAU); g.fill();
}

// ── Robot ───────────────────────────────────────────────────────────────────
// Frame 96×88, centre (48,44). In 'plate' mode the platform surface is the frame top.

export const ROBOT_FRAMES = ['idle', 'blink', 'plate', 'carry', 'hold'];

export function drawRobot(g, mode) {
  const arm = (x0, y0, x1, y1) => {
    limbLine(g, x0, y0, x1, y1, 5.5, '#9fb0bd');
    g.beginPath(); g.arc(x1, y1, 4.2, 0, TAU); g.fillStyle = '#dfe7ee'; g.fill(); ink(g, 2);
  };
  glow(g, 48, 76, 10, '255,200,110', 0.85);
  g.beginPath(); g.moveTo(40, 66); g.lineTo(56, 66); g.lineTo(53, 75); g.lineTo(43, 75); g.closePath();
  g.fillStyle = '#4a5a6a'; g.fill(); ink(g, 2);
  if (mode === 'idle' || mode === 'blink') { arm(32, 48, 20, 61); arm(64, 48, 76, 61); }
  if (mode === 'carry') { arm(33, 50, 43, 78); arm(63, 50, 53, 78); }
  if (mode === 'hold') { arm(32, 48, 16, 40); arm(64, 48, 80, 40); }
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
  } else if (mode === 'plate' || mode === 'hold') {
    g.strokeStyle = '#ffd54f'; g.lineWidth = 2.2;
    for (const x of [41, 55]) { g.beginPath(); g.arc(x, 28.5, 3.2, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  } else {
    for (const x of [41, 55]) {
      glow(g, x, 27, 7, '255,230,120', 0.6);
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

// ── Friends (from Astro Buddy Jump) ─────────────────────────────────────────
// Frame 64×72, feet at y=70, centred at x=32.

export const FRIEND_FRAMES = ['idle', 'happy', 'sad'];

function friendEyes(g, xs, y, mood, dark = '#17324a') {
  if (mood === 'happy') {
    g.strokeStyle = dark; g.lineWidth = 2.4;
    for (const x of xs) { g.beginPath(); g.arc(x, y + 1.5, 3, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    return;
  }
  for (const x of xs) {
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, 4, 4.6, 0, 0, TAU); g.fill();
    g.fillStyle = dark; g.beginPath(); g.arc(x + 0.6, y + (mood === 'sad' ? 1.2 : 0.4), 2.4, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 1.4, y - 1, 0.9, 0, TAU); g.fill();
  }
  if (mood === 'sad') {
    g.strokeStyle = dark; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(xs[0] - 4, y - 7); g.lineTo(xs[0] + 3, y - 5.5); g.stroke();
    g.beginPath(); g.moveTo(xs[1] + 4, y - 7); g.lineTo(xs[1] - 3, y - 5.5); g.stroke();
  }
}

function mouth(g, x, y, mood, col) {
  g.strokeStyle = col; g.lineWidth = 2.2;
  g.beginPath();
  if (mood === 'sad') g.arc(x, y + 5, 4.5, Math.PI * 1.2, Math.PI * 1.8);
  else g.arc(x, y, mood === 'happy' ? 5.5 : 4.5, Math.PI * 0.15, Math.PI * 0.85);
  g.stroke();
}

export function drawNova(g, mood) {
  // orange rocket-hood with a brown visor band and yellow legs
  limbLine(g, 26, 56, 23, 69, 6, '#ffd470');
  limbLine(g, 38, 56, 41, 69, 6, '#ffd470');
  const body = () => {
    g.beginPath();
    g.moveTo(32, 8); g.quadraticCurveTo(52, 14, 52, 36); g.lineTo(48, 42); g.lineTo(49, 58);
    g.lineTo(15, 58); g.lineTo(16, 42); g.lineTo(12, 36); g.quadraticCurveTo(12, 14, 32, 8); g.closePath();
  };
  body();
  g.fillStyle = lin(g, 0, 8, 0, 58, [[0, '#ffb07c'], [0.5, '#eb7b4d'], [1, '#c4552c']]); g.fill(); ink(g, 2.6);
  g.save(); body(); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath(); g.ellipse(22, 20, 6, 10, -0.4, 0, TAU); g.fill();
  g.restore();
  rrect(g, 16, 24, 32, 16, 7);
  g.fillStyle = '#7f4d2e'; g.fill(); ink(g, 2);
  friendEyes(g, [25, 39], 32, mood, '#111');
  mouth(g, 32, 46, mood, '#7f2d10');
  // little fins
  g.fillStyle = '#ffd470';
  g.beginPath(); g.moveTo(15, 44); g.lineTo(7, 54); g.lineTo(16, 54); g.closePath(); g.fill(); ink(g, 1.8);
  g.beginPath(); g.moveTo(49, 44); g.lineTo(57, 54); g.lineTo(48, 54); g.closePath(); g.fill(); ink(g, 1.8);
  starPath(g, 32, 13, 3.5, 1.6); g.fillStyle = '#fff3c4'; g.fill();
}

export function drawStitch(g, mood) {
  limbLine(g, 25, 56, 23, 69, 6.5, '#7a4f2d');
  limbLine(g, 39, 56, 41, 69, 6.5, '#7a4f2d');
  g.beginPath(); g.arc(17, 16, 7, 0, TAU); g.arc(47, 16, 7, 0, TAU);
  g.fillStyle = '#a26c3d'; g.fill(); ink(g, 2.2);
  g.beginPath(); g.ellipse(32, 30, 20, 18, 0, 0, TAU);
  g.fillStyle = lin(g, 0, 12, 0, 48, [[0, '#c48a55'], [1, '#93602f']]); g.fill(); ink(g, 2.6);
  rrect(g, 19, 42, 26, 16, 8); g.fillStyle = '#93602f'; g.fill(); ink(g, 2.4);
  g.strokeStyle = '#5c3a1c'; g.lineWidth = 1.6;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(21 + i * 5, 46); g.lineTo(24 + i * 5, 51); g.stroke(); }
  friendEyes(g, [25, 39], 28, mood, '#111');
  mouth(g, 32, 34, mood, '#e88a9e');
  g.fillStyle = 'rgba(255,140,160,0.45)';
  g.beginPath(); g.arc(19, 35, 3, 0, TAU); g.arc(45, 35, 3, 0, TAU); g.fill();
}

export function drawScout(g, mood) {
  limbLine(g, 25, 56, 23, 69, 6.5, '#e0a234');
  limbLine(g, 39, 56, 41, 69, 6.5, '#e0a234');
  g.beginPath(); g.ellipse(32, 31, 21, 21, 0, 0, TAU);
  g.fillStyle = rad(g, 25, 22, 2, 26, [[0, '#ffe08a'], [0.6, '#f1b44c'], [1, '#c8830a']]); g.fill(); ink(g, 2.6);
  rrect(g, 19, 46, 26, 12, 6); g.fillStyle = '#c8830a'; g.fill(); ink(g, 2.2);
  g.beginPath();
  g.moveTo(30, 6); g.lineTo(25, 18); g.lineTo(31, 18); g.lineTo(27, 29); g.lineTo(40, 13); g.lineTo(33, 13); g.lineTo(38, 6); g.closePath();
  g.fillStyle = '#fff176'; g.fill(); ink(g, 1.8);
  friendEyes(g, [24, 40], 30, mood, '#222');
  mouth(g, 32, 38, mood, '#5a3200');
}

const FRIEND_DRAW = { nova: drawNova, stitch: drawStitch, scout: drawScout };
export function drawFriend(g, who, mood) { FRIEND_DRAW[who](g, mood); }

// ── Beetle ──────────────────────────────────────────────────────────────────
// Frame 48×34, facing right, feet at y=32.

export const BEETLE_FRAMES = ['walkA', 'walkB', 'flat', 'dizzy'];

export function drawBeetle(g, mode) {
  if (mode === 'flat') {
    g.beginPath(); g.ellipse(24, 28, 20, 5, 0, 0, TAU);
    g.fillStyle = lin(g, 0, 22, 0, 33, [[0, '#b388ff'], [1, '#5e35b1']]); g.fill(); ink(g, 2.2);
    g.strokeStyle = '#eafcff'; g.lineWidth = 1.6;
    for (const x of [18, 30]) {
      g.beginPath(); g.moveTo(x - 2.5, 25.5); g.lineTo(x + 2.5, 28.5); g.moveTo(x + 2.5, 25.5); g.lineTo(x - 2.5, 28.5); g.stroke();
    }
    return;
  }
  const step = mode === 'walkB' ? 1 : -1;
  g.strokeStyle = INK; g.lineWidth = 2.4;
  for (const [x, d] of [[14, step], [24, -step], [34, step]]) {
    g.beginPath(); g.moveTo(x, 24); g.lineTo(x + d * 4, 32); g.stroke();
  }
  g.beginPath(); g.ellipse(24, 20, 18, 13, 0, Math.PI, TAU); g.lineTo(42, 24); g.lineTo(6, 24); g.closePath();
  g.fillStyle = lin(g, 0, 7, 0, 25, [[0, '#d1b3ff'], [0.5, '#8e5cf0'], [1, '#4b2ab0']]); g.fill(); ink(g, 2.4);
  g.strokeStyle = 'rgba(30,10,70,0.6)'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(24, 8); g.lineTo(24, 24); g.stroke();
  g.fillStyle = '#9ffcff';
  for (const [x, y] of [[16, 14], [31, 13], [19, 20], [29, 20]]) { g.beginPath(); g.arc(x, y, 1.9, 0, TAU); g.fill(); }
  g.beginPath(); g.ellipse(41, 21, 7, 6, 0, 0, TAU); g.fillStyle = '#3a2470'; g.fill(); ink(g, 2);
  if (mode === 'dizzy') {
    g.strokeStyle = '#ffe066'; g.lineWidth = 1.4;
    g.beginPath(); g.arc(43, 20, 2.2, 0, Math.PI * 1.6); g.stroke();
    starPath(g, 36, 6, 3.4, 1.4); g.fillStyle = '#ffe066'; g.fill();
    starPath(g, 46, 4, 2.6, 1.1); g.fill();
  } else {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(43, 20, 2.6, 0, TAU); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(44, 20.5, 1.4, 0, TAU); g.fill();
  }
  g.strokeStyle = INK; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(44, 15); g.quadraticCurveTo(47, 9, 51, 9); g.stroke();
}
