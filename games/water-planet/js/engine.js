import { S, speak, stopSpeech, lang } from './i18n.js?v=4';
import { beep, sfxRadio, sfxTalk, getMuted, getMusicVol, Music, setMutedFlag } from './audio.js?v=3';
import { TILE, COLS, ROWS, WORLD_W, WORLD_H, T, SOLID, CURRENT, TILE_COLORS, minimapColor } from './maps.js?v=3';

export const W = 700;
export const H = 520;
export const SCREEN = { TITLE: 0, INTRO: 1, PLAY: 2, WIN: 3 };
export const FADE_DUR = 60;

export const G = {
  canvas: null,
  ctx: null,
  screen: SCREEN.TITLE,
  level: 1,
  tick: 0,
  keys: {},
  spaceJustPressed: false,
  bowJustPressed: false,
  robotJustPressed: false,
  cam: { x: 0, y: 0 },
  fadeTick: -1,
  fadeTarget: 0,
  map: null,
  particles: [],
  arrows: [],
  introTick: 0,
  idleTimer: 0,
  speakBtn: null,
  radioBtn: null,
  liftables: [],
  extraSolid: null,
};

export const VOL_SL = { x: 0, y: 0, w: 0, h: 0, iconX: 0, iconY: 0, iconR: 12, dragging: false };

export function w2s(wx, wy) {
  return [Math.round(wx - G.cam.x), Math.round(wy - G.cam.y)];
}

export function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = String(text).split(' ');
  let line = '';
  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxW && line !== '') {
      ctx.fillText(line.trim(), x, y); y += lineH; line = w + ' ';
    } else line = test;
  }
  if (line) ctx.fillText(line.trim(), x, y);
}

export function burst(wx, wy, color, n = 8) {
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 2.5;
    G.particles.push({
      wx, wy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      life: 40 + Math.random() * 20, maxLife: 60, color, r: 3 + Math.random() * 3,
    });
  }
}

export function updateParticles() {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.wx += p.vx; p.wy += p.vy; p.life--;
    if (p.life <= 0) G.particles.splice(i, 1);
  }
}

export function drawParticles(ctx) {
  for (const p of G.particles) {
    const [px, py] = w2s(p.wx, p.wy);
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(px, py, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function tileAt(wx, wy) {
  const col = Math.floor(wx / TILE);
  const row = Math.floor(wy / TILE);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS || !G.map) return T.ROCK;
  if (G.extraSolid && G.extraSolid(col, row)) return T.ROCK;
  return G.map[row][col];
}

export function solidAt(wx, wy) {
  return SOLID.has(tileAt(wx, wy));
}

export function currentAt(wx, wy) {
  return CURRENT[tileAt(wx, wy)] || null;
}

export function followCam(hx, hy) {
  G.cam.x = Math.max(0, Math.min(WORLD_W - W, hx - W / 2));
  G.cam.y = Math.max(0, Math.min(WORLD_H - H, hy - H / 2));
}

export function moveBody(body, dx, dy, margin = 4) {
  const nx = body.x + dx, ny = body.y + dy;
  const canX = ![[nx + margin, body.y + margin], [nx + body.w - margin, body.y + margin],
    [nx + margin, body.y + body.h - margin], [nx + body.w - margin, body.y + body.h - margin]]
    .some(([cx, cy]) => solidAt(cx, cy));
  const canY = ![[body.x + margin, ny + margin], [body.x + body.w - margin, ny + margin],
    [body.x + margin, ny + body.h - margin], [body.x + body.w - margin, ny + body.h - margin]]
    .some(([cx, cy]) => solidAt(cx, cy));
  if (canX) body.x = nx;
  if (canY) body.y = ny;
  body.x = Math.max(0, Math.min(WORLD_W - body.w, body.x));
  body.y = Math.max(0, Math.min(WORLD_H - body.h, body.y));
}

export function arrowBlockedAt(wx, wy) {
  const t = tileAt(wx, wy);
  return SOLID.has(t) && t !== T.GATE;
}

export const dlg = {
  active: false, lines: [], bgLines: [], idx: 0,
  speaker: '', npcRef: null,
  _prevBtn: null, _repeatBtn: null, _nextBtn: null,
  open(npc) {
    const lines = npc.lines();
    if (!lines.length) return;
    this.active = true; this.lines = lines; this.idx = 0;
    this.speaker = npc.name; this.npcRef = npc;
    this.bgLines = npc.bgLines ? npc.bgLines() : [];
    sfxTalk();
    if (!getMuted()) speak(lines[0]);
  },
  advance() {
    this.idx++;
    if (this.idx >= this.lines.length) { this.close(); return; }
    sfxTalk();
    if (!getMuted()) speak(this.lines[this.idx]);
  },
  repeat() { sfxTalk(); if (!getMuted()) speak(this.lines[this.idx]); },
  close() {
    this.active = false;
    stopSpeech();
    if (this.npcRef && this.npcRef.questAdvance) this.npcRef.questAdvance();
    this.npcRef = null;
  },
};

export const radio = {
  active: false, key: null, timer: 0, DUR: 400,
  seen: {}, pendingVoice: false, args: [],
  say(key, ...args) {
    if (this.seen[key]) return;
    this.seen[key] = true;
    this.key = key; this.args = args;
    this.active = true; this.timer = this.DUR;
    sfxRadio();
    if (getMuted()) return;
    if (!dlg.active) { this.pendingVoice = false; speak(S(key, ...args)); }
    else this.pendingVoice = true;
  },
  replay() {
    if (!this.key) return;
    this.timer = this.DUR; this.active = true;
    sfxRadio();
    if (!getMuted()) speak(S(this.key, ...(this.args || [])));
  },
  update() {
    if (this.active && !dlg.active) {
      if (this.pendingVoice) {
        this.pendingVoice = false;
        if (!getMuted()) speak(S(this.key, ...(this.args || [])));
      }
      this.timer--;
      if (this.timer <= 0) this.active = false;
    }
  },
  reset() {
    this.active = false; this.key = null; this.seen = {}; this.timer = 0; this.pendingVoice = false;
  },
};

export function drawTile(ctx, type, px, py, tick) {
  const ts = TILE;
  ctx.fillStyle = TILE_COLORS[type] || '#0d47a1';
  ctx.fillRect(px, py, ts, ts);

  if (type === T.DEEP || type === T.REEF) {
    ctx.fillStyle = type === T.REEF ? 'rgba(100,200,255,0.18)' : 'rgba(80,160,255,0.12)';
    ctx.fillRect(px + 6, py + 10 + (tick % 40 < 20 ? 2 : 0), ts - 14, 4);
    ctx.fillRect(px + 12, py + 24, ts - 20, 3);
  } else if (type === T.SAND) {
    ctx.fillStyle = '#ffca28';
    ctx.fillRect(px + 6, py + 8, 4, 4);
    ctx.fillRect(px + 22, py + 22, 5, 5);
  } else if (type === T.CORAL_P || type === T.CORAL_G || type === T.CORAL_R || type === T.CORAL_Y) {
    const c2 = type === T.CORAL_P ? '#ce93d8' : type === T.CORAL_G ? '#81c784' : type === T.CORAL_R ? '#ef9a9a' : '#ffe082';
    ctx.fillStyle = c2;
    ctx.beginPath(); ctx.ellipse(px + 20, py + 18, 12, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px + 12, py + 26, 7, 9, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px + 28, py + 26, 7, 9, 0.4, 0, Math.PI * 2); ctx.fill();
  } else if (type === T.ROCK) {
    ctx.fillStyle = '#78909c';
    ctx.beginPath(); ctx.ellipse(px + 20, py + 22, 14, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#90a4ae';
    ctx.beginPath(); ctx.ellipse(px + 16, py + 18, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
  } else if (type === T.KELP) {
    ctx.fillStyle = '#1b5e20'; ctx.fillRect(px, py, ts, ts);
    ctx.strokeStyle = '#66bb6a'; ctx.lineWidth = 3;
    const sway = Math.sin(tick * 0.04 + px * 0.01) * 4;
    ctx.beginPath(); ctx.moveTo(px + 20, py + ts); ctx.quadraticCurveTo(px + 20 + sway, py + 18, px + 20, py + 4); ctx.stroke();
  } else if (type === T.WALL || type === T.CAVE) {
    ctx.fillStyle = type === T.WALL ? '#263238' : '#455a64';
    ctx.fillRect(px, py, ts, ts);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(px + 4, py + 4, 6, 6);
  } else if (type === T.CUR_E || type === T.CUR_W || type === T.CUR_N || type === T.CUR_S) {
    ctx.fillStyle = '#0288d1'; ctx.fillRect(px, py, ts, ts);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2;
    const o = (tick * 0.8) % 16;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      if (type === T.CUR_E) { ctx.moveTo(px + o + i * 10, py + 12); ctx.lineTo(px + o + 8 + i * 10, py + 20); ctx.lineTo(px + o + i * 10, py + 28); }
      else if (type === T.CUR_W) { ctx.moveTo(px + ts - o - i * 10, py + 12); ctx.lineTo(px + ts - o - 8 - i * 10, py + 20); ctx.lineTo(px + ts - o - i * 10, py + 28); }
      else if (type === T.CUR_N) { ctx.moveTo(px + 12, py + ts - o - i * 10); ctx.lineTo(px + 20, py + ts - o - 8 - i * 10); ctx.lineTo(px + 28, py + ts - o - i * 10); }
      else { ctx.moveTo(px + 12, py + o + i * 10); ctx.lineTo(px + 20, py + o + 8 + i * 10); ctx.lineTo(px + 28, py + o + i * 10); }
      ctx.stroke();
    }
  } else if (type === T.VORTEX) {
    const spin = tick * 0.08;
    ctx.fillStyle = '#29b6f6'; ctx.fillRect(px, py, ts, ts);
    ctx.strokeStyle = '#e1f5fe'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px + 20, py + 20, 12, spin, spin + 4); ctx.stroke();
    ctx.beginPath(); ctx.arc(px + 20, py + 20, 6, -spin, -spin + 4); ctx.stroke();
  } else if (type === T.PALM) {
    ctx.fillStyle = '#ffe082'; ctx.fillRect(px, py, ts, ts);
    ctx.fillStyle = '#6d4c41'; ctx.fillRect(px + 17, py + 16, 6, 22);
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath(); ctx.ellipse(px + 20, py + 14, 16, 8, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px + 20, py + 14, 16, 8, 0.5, 0, Math.PI * 2); ctx.fill();
  } else if (type === T.GRASS) {
    ctx.fillStyle = '#8bc34a';
    ctx.fillRect(px + 8, py + 10, 3, 3);
    ctx.fillRect(px + 22, py + 24, 3, 3);
  } else if (type === T.HOUSE) {
    ctx.fillStyle = '#a1887f'; ctx.fillRect(px, py, ts, ts);
    ctx.fillStyle = '#c62828'; ctx.fillRect(px, py, ts, 10);
    ctx.fillStyle = '#ffe082'; ctx.fillRect(px + 16, py + 16, 8, 10);
  } else if (type === T.WRECK) {
    ctx.fillStyle = '#90a4ae';
    ctx.fillRect(px + 4, py + 12, 20, 8);
    ctx.fillStyle = '#607d8b';
    ctx.fillRect(px + 14, py + 18, 16, 7);
    ctx.fillStyle = '#c62828';
    ctx.fillRect(px + 8, py + 8, 8, 6);
  } else if (type === T.GATE) {
    const a = 0.35 + 0.25 * Math.abs(Math.sin(tick * 0.08 + px));
    ctx.fillStyle = `rgba(0,229,255,${a})`;
    ctx.fillRect(px + 6, py, ts - 12, ts);
  } else if (type === T.PLANT) {
    ctx.fillStyle = '#9ccc65'; ctx.fillRect(px, py, ts, ts);
    ctx.fillStyle = '#7b1fa2';
    ctx.beginPath(); ctx.arc(px + 20, py + 16, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ce93d8';
    ctx.beginPath(); ctx.arc(px + 14, py + 14, 4, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawVisibleTiles(ctx, tick) {
  if (!G.map) return;
  const startCol = Math.floor(G.cam.x / TILE);
  const startRow = Math.floor(G.cam.y / TILE);
  const endCol = Math.min(COLS, startCol + Math.ceil(W / TILE) + 2);
  const endRow = Math.min(ROWS, startRow + Math.ceil(H / TILE) + 2);
  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      drawTile(ctx, G.map[row][col], col * TILE - G.cam.x, row * TILE - G.cam.y, tick);
    }
  }
}

const minimapCanvas = document.createElement('canvas');
const MW = 90, MH = 68;
minimapCanvas.width = MW; minimapCanvas.height = MH;

export function buildMinimap(level) {
  const mc = minimapCanvas.getContext('2d');
  mc.fillStyle = 'rgba(0,0,0,0.55)';
  mc.fillRect(0, 0, MW, MH);
  const sx = MW / COLS, sy = MH / ROWS;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      mc.fillStyle = minimapColor(G.map[row][col], level);
      mc.fillRect(col * sx, row * sy, sx + 0.5, sy + 0.5);
    }
  }
  mc.strokeStyle = 'rgba(255,255,255,0.3)'; mc.lineWidth = 1;
  mc.strokeRect(0, 0, MW, MH);
}

export function drawMinimap(ctx, hero, items) {
  const mx = W - MW - 8, my = 8;
  const sx = MW / COLS, sy = MH / ROWS;
  ctx.drawImage(minimapCanvas, mx, my);
  ctx.fillStyle = '#ffee58';
  for (const it of items) {
    if (it.taken || !it.active()) continue;
    ctx.beginPath();
    ctx.arc(mx + (it.wx / TILE) * sx, my + (it.wy / TILE) * sy, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(mx + (hero.x / TILE) * sx, my + (hero.y / TILE) * sy, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawHearts(ctx, hero) {
  for (let i = 0; i < hero.maxHp; i++) {
    const hx = 14 + i * 26, hy = 14;
    const filled = i < hero.hp;
    ctx.fillStyle = filled ? '#e53935' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(hx - 4, hy, 5, Math.PI, 0);
    ctx.arc(hx + 4, hy, 5, Math.PI, 0);
    ctx.lineTo(hx + 9, hy + 6);
    ctx.lineTo(hx, hy + 13);
    ctx.lineTo(hx - 9, hy + 6);
    ctx.closePath(); ctx.fill();
  }
}

export function drawHintBar(ctx, hint, tick) {
  if (!hint) { G.speakBtn = null; return; }
  const BTN_W = 34, BTN_H = 28, BTN_X = W / 2 - 180, BTN_Y = H - 38;
  const BAR_W = 360;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.roundRect(BTN_X, BTN_Y, BAR_W, BTN_H, 8); ctx.fill();
  const btnPulse = 0.18 + 0.12 * Math.abs(Math.sin(tick * 0.04));
  ctx.fillStyle = `rgba(21,101,192,${0.7 + btnPulse})`;
  ctx.beginPath(); ctx.roundRect(BTN_X + 3, BTN_Y + 3, BTN_W - 2, BTN_H - 6, 6); ctx.fill();
  const si = BTN_X + 10, sy2 = BTN_Y + 8;
  ctx.fillStyle = '#fff';
  ctx.fillRect(si, sy2 + 3, 5, 8);
  ctx.beginPath();
  ctx.moveTo(si + 5, sy2 + 2); ctx.lineTo(si + 11, sy2); ctx.lineTo(si + 11, sy2 + 14);
  ctx.lineTo(si + 5, sy2 + 12); ctx.closePath(); ctx.fill();
  G.speakBtn = { bx: BTN_X + 3, by: BTN_Y + 3, bw: BTN_W - 2, bh: BTN_H - 6 };
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(hint, BTN_X + BTN_W + (BAR_W - BTN_W) / 2, H - 20);
  ctx.textAlign = 'left';
}

export function drawRadio(ctx, tick) {
  if (!radio.active || dlg.active) { G.radioBtn = null; return; }
  const RX = 10, RY = 34, RW = 310, RH = 56;
  const fadeIn = Math.min(1, (radio.DUR - radio.timer) / 12);
  const fadeOut = Math.min(1, radio.timer / 20);
  ctx.save();
  ctx.globalAlpha = Math.min(fadeIn, fadeOut);
  ctx.fillStyle = 'rgba(8,26,20,0.9)';
  ctx.beginPath(); ctx.roundRect(RX, RY, RW, RH, 12); ctx.fill();
  ctx.strokeStyle = '#69f0ae'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(RX, RY, RW, RH, 12); ctx.stroke();
  const px = RX + 10, py = RY + 10;
  ctx.fillStyle = '#90a4ae';
  ctx.beginPath(); ctx.roundRect(px + 4, py + 14, 28, 20, 4); ctx.fill();
  ctx.fillStyle = '#b0bec5';
  ctx.beginPath(); ctx.roundRect(px + 7, py + 2, 22, 15, 3); ctx.fill();
  const eg = 0.6 + 0.4 * Math.abs(Math.sin(tick * 0.1));
  ctx.fillStyle = `rgba(255,220,50,${eg})`;
  ctx.beginPath(); ctx.arc(px + 13, py + 9, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(px + 23, py + 9, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#69f0ae';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(S('radio_name'), RX + 52, RY + 16);
  ctx.fillStyle = '#e8f5e9';
  ctx.font = '12px sans-serif';
  wrapText(ctx, S(radio.key, ...(radio.args || [])), RX + 52, RY + 31, RW - 92, 14);
  const rbx = RX + RW - 30, rby = RY + RH / 2 - 11;
  ctx.fillStyle = 'rgba(105,240,174,0.18)';
  ctx.beginPath(); ctx.arc(rbx + 11, rby + 11, 12, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#69f0ae'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(rbx + 11, rby + 11, 6, 0.6, Math.PI * 2 - 0.6); ctx.stroke();
  G.radioBtn = { bx: rbx - 2, by: rby - 2, bw: 26, bh: 26 };
  ctx.restore();
}

export function drawDialog(ctx) {
  if (!dlg.active) return;
  const hasBgSub = lang !== 'bg' && dlg.bgLines.length > 0;
  const bx = 30, by = H - (hasBgSub ? 152 : 130), bw = W - 60, bh = hasBgSub ? 132 : 110;
  ctx.fillStyle = 'rgba(10,20,40,0.93)';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 12); ctx.fill();
  ctx.strokeStyle = '#90caf9'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 12); ctx.stroke();
  ctx.fillStyle = '#e3f2fd';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(dlg.speaker, bx + 16, by + 22);
  ctx.font = '15px sans-serif';
  wrapText(ctx, dlg.lines[dlg.idx] || '', bx + 16, by + 44, bw - 32, 20);
  if (hasBgSub) {
    const bgLine = dlg.bgLines[dlg.idx] || '';
    if (bgLine) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.roundRect(bx + 16, by + 94, 22, 16, 4); ctx.fill();
      ctx.fillStyle = '#ffb74d'; ctx.font = 'bold 10px sans-serif';
      ctx.fillText('БГ', bx + 19, by + 106);
      ctx.fillStyle = 'rgba(200,225,255,0.72)';
      ctx.font = 'italic 12px sans-serif';
      wrapText(ctx, bgLine, bx + 44, by + 106, bw - 60, 16);
    }
  }
  ctx.font = 'bold 13px sans-serif';
  const BTN_H = 26, BTN_GAP = 6;
  const isFirst = dlg.idx === 0;
  const isLast = dlg.idx >= dlg.lines.length - 1;
  const nextLabel = isLast ? S('dialog_close') : S('dialog_next');
  const prevLabel = S('dialog_prev');
  const repeatLabel = S('dialog_repeat');
  const nW = ctx.measureText(nextLabel).width + 22;
  const rW = ctx.measureText(repeatLabel).width + 18;
  const pW = ctx.measureText(prevLabel).width + 22;
  const nX = bx + bw - 10 - nW;
  const rX = nX - BTN_GAP - rW;
  const pX = rX - BTN_GAP - pW;
  const btnY = by + bh - BTN_H - 6;
  function pill(px, py, pw, ph, label, active, accent) {
    ctx.globalAlpha = active ? 1 : 0.35;
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, ph / 2); ctx.fill();
    ctx.fillStyle = '#e3f2fd';
    ctx.fillText(label, px + (pw - ctx.measureText(label).width) / 2, py + ph / 2 + 5);
    ctx.globalAlpha = 1;
  }
  pill(pX, btnY, pW, BTN_H, prevLabel, !isFirst, '#1565c0');
  pill(rX, btnY, rW, BTN_H, repeatLabel, true, '#0d47a1');
  pill(nX, btnY, nW, BTN_H, nextLabel, true, isLast ? '#6a1b9a' : '#1565c0');
  dlg._prevBtn = { px: pX, py: btnY, pw: pW, ph: BTN_H };
  dlg._repeatBtn = { rx: rX, ry: btnY, rw: rW, rh: BTN_H };
  dlg._nextBtn = { nx: nX, ny: btnY, nw: nW, nh: BTN_H };
}

export function drawVolumeSlider(ctx) {
  if (G.screen !== SCREEN.PLAY) return;
  const MX = W - 90 - 8;
  const slY = 8 + 68 + 6;
  const slH = 10;
  const iconR = 9;
  const iconCX = MX + iconR;
  const iconCY = slY + slH / 2;
  const trackX = iconCX + iconR + 6;
  const trackW = 90 - iconR * 2 - 10;
  VOL_SL.x = trackX; VOL_SL.y = slY; VOL_SL.w = trackW; VOL_SL.h = slH;
  VOL_SL.iconX = iconCX; VOL_SL.iconY = iconCY; VOL_SL.iconR = iconR;
  const musicVol = getMusicVol();
  const muted = getMuted();
  const fillW = musicVol * trackW;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath(); ctx.roundRect(trackX, slY, trackW, slH, slH / 2); ctx.fill();
  if (fillW > 0) {
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath(); ctx.roundRect(trackX, slY, fillW, slH, slH / 2); ctx.fill();
  }
  ctx.fillStyle = muted ? '#ef5350' : '#90caf9';
  ctx.fillRect(iconCX - iconR + 1, iconCY - 4, 5, 8);
  ctx.beginPath();
  ctx.moveTo(iconCX - iconR + 6, iconCY - 5);
  ctx.lineTo(iconCX - iconR + 12, iconCY - 8);
  ctx.lineTo(iconCX - iconR + 12, iconCY + 8);
  ctx.lineTo(iconCX - iconR + 6, iconCY + 5);
  ctx.closePath(); ctx.fill();
}

export function sliderHitTrack(mx, my) {
  const { x, y, w, h } = VOL_SL;
  return mx >= x - 8 && mx <= x + w + 8 && my >= y - 8 && my <= y + h + 8;
}
export function sliderHitIcon(mx, my) {
  const dx = mx - VOL_SL.iconX, dy = my - VOL_SL.iconY;
  return Math.sqrt(dx * dx + dy * dy) <= VOL_SL.iconR + 6;
}
export function sliderSetFromMouse(mx) {
  const { x, w } = VOL_SL;
  const v = Math.max(0, Math.min(1, (mx - x) / w));
  Music.setVolume(v);
  setMutedFlag(v === 0);
}

export function hitRect(mx, my, r) {
  if (!r) return false;
  const x = r.bx ?? r.px ?? r.rx ?? r.nx;
  const y = r.by ?? r.py ?? r.ry ?? r.ny;
  const w = r.bw ?? r.pw ?? r.rw ?? r.nw;
  const h = r.bh ?? r.ph ?? r.rh ?? r.nh;
  return mx >= x && mx <= x + w && my >= y && my <= y + h;
}

export function startFade(targetLevel) {
  G.fadeTick = 0;
  G.fadeTarget = targetLevel;
}

export function drawFade(ctx) {
  if (G.fadeTick < 0 || G.fadeTick > FADE_DUR) return;
  const pct = G.fadeTick / FADE_DUR;
  const alpha = pct < 0.5 ? pct * 2 : 2 - pct * 2;
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, W, H);
  if (pct >= 0.4 && pct <= 0.6) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(S('lvl' + G.fadeTarget + '_name'), W / 2, H / 2);
    ctx.textAlign = 'left';
  }
}

export function cell(c, r) {
  return { wx: c * TILE + 20, wy: r * TILE + 20 };
}
