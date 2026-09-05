import { G, burst, radio, dlg, w2s, cell, tileAt } from './engine.js?v=3';
import { TILE, T } from './maps.js?v=3';
import { hero, distTo, heroCenter } from './hero.js?v=3';
import { S, Sfor, speak } from './i18n.js?v=4';
import { sfxCollect, sfxHit, sfxWin, beep } from './audio.js?v=3';
import { getMuted } from './audio.js?v=3';

export const inv1 = { parts: 0 };

export let q1 = 0;
let letterNext = 0;
let word = 'ASTRO';
let decoFish = [];

export const items1 = [];
export const enemies1 = [];
export const letters1 = [];
export const liftables1 = [];

function makeItem(id, c, r, color, active) {
  return { id, wx: c * TILE + 20, wy: r * TILE + 20, r: 12, color, taken: false, active };
}

function makeFish(c, r, kind) {
  return {
    kind, wx: c * TILE + 8, wy: r * TILE + 8, w: 28, h: 16,
    hp: kind === 'big' ? 2 : 1, maxHp: kind === 'big' ? 2 : 1,
    speed: kind === 'big' ? 0.7 : 1.1, vx: 0.7, vy: 0,
    hitTimer: 0, dead: false,
    spawnWx: c * TILE + 8, spawnWy: r * TILE + 8,
    color: kind === 'big' ? '#ff7043' : '#4fc3f7',
    flying: kind === 'big',
    homeWx: c * TILE + 8, homeWy: r * TILE + 8,
  };
}

export function initLevel1() {
  q1 = 0;
  inv1.parts = 0;
  letterNext = 0;
  word = S('word_l1');
  items1.length = 0;
  enemies1.length = 0;
  letters1.length = 0;
  liftables1.length = 0;
  decoFish = [];

  items1.push(makeItem('engine', 11, 28, '#ff8f00', () => true));
  items1.push(makeItem('antenna', 22, 24, '#90caf9', () => liftables1[0].lifted));
  items1.push(makeItem('wing', 14, 6, '#eceff1', () => true));
  items1.push(makeItem('battery', 56, 12, '#ffee58', () => letters1.every((l) => l.hit)));
  items1.push(makeItem('propeller', 50, 40, '#b0bec5', () => liftables1[1].lifted));

  liftables1.push({
    id: 'boulder1', level: 1, kind: 'rock',
    col: 16, row: 24, cw: 2, rh: 2,
    wx: 17 * TILE, wy: 25 * TILE,
    lifted: false,
  });
  liftables1.push({
    id: 'valve', level: 1, kind: 'valve',
    col: 24, row: 38, cw: 2, rh: 1,
    wx: 25 * TILE, wy: 38 * TILE + 20,
    lifted: false,
  });

  const chars = word.split('');
  const baseC = 32, baseR = 16;
  chars.forEach((ch, i) => {
    letters1.push({
      letter: ch, index: i, hit: false,
      wx: (baseC + i) * TILE + 20,
      wy: baseR * TILE + 20,
    });
  });

  enemies1.push(makeFish(12, 8, 'small'), makeFish(18, 6, 'big'), makeFish(20, 10, 'small'));
  enemies1.push(makeFish(32, 28, 'small'), makeFish(44, 36, 'big'));

  for (let i = 0; i < 14; i++) {
    decoFish.push({
      x: 80 + (i * 170) % 2400,
      y: 80 + (i * 97) % 1700,
      vx: (i % 2 ? 0.6 : -0.5),
      color: ['#4fc3f7', '#ba68c8', '#ff8a65', '#fff176'][i % 4],
      w: 10 + (i % 4) * 3,
    });
  }
}

export function resetLevel1Runtime() {
  items1.forEach((it) => { it.taken = false; });
  liftables1.forEach((L) => { L.lifted = false; });
  letters1.forEach((l) => { l.hit = false; });
  letterNext = 0;
  inv1.parts = 0;
  q1 = 0;
  enemies1.forEach((e) => {
    e.dead = false; e.hp = e.maxHp; e.hitTimer = 0;
    e.wx = e.spawnWx; e.wy = e.spawnWy;
  });
}

export function hint1() {
  if (q1 <= 0) return S('h1_0');
  if (q1 === 1) return S('h1_1');
  if (q1 === 2) return S('h1_2');
  if (q1 === 3) return S('h1_3');
  if (q1 === 4) return S('h1_4');
  return S('h1_5');
}

function onPart(id) {
  inv1.parts++;
  const left = 5 - inv1.parts;
  if (!getMuted()) speak(S('speak_part', left));
  if (id === 'engine') { q1 = Math.max(q1, 1); radio.say('r_l1_engine'); radio.say('r_l1_lift'); }
  if (id === 'antenna') { q1 = Math.max(q1, 2); radio.say('r_l1_antenna'); radio.say('r_l1_fish'); }
  if (id === 'wing') { q1 = Math.max(q1, 3); radio.say('r_l1_letters'); }
  if (id === 'battery') { q1 = Math.max(q1, 4); radio.say('r_l1_valve'); }
  if (inv1.parts >= 5) { q1 = 5; sfxWin(); radio.say('r_l1_all'); openVortex(); }
}

function openVortex() {
  // already vortex tiles; nothing to change
}

function openGate() {
  if (!G.map) return;
  G.map[15][42] = T.CAVE;
  G.map[16][42] = T.CAVE;
  G.map[17][42] = T.CAVE;
}

export function hitLetter(a) {
  for (const L of letters1) {
    if (L.hit) continue;
    if (Math.hypot(a.wx - L.wx, a.wy - L.wy) < 22) {
      if (L.index === letterNext) {
        L.hit = true;
        letterNext++;
        burst(L.wx, L.wy, '#ffd740', 12);
        sfxWin();
        if (letterNext >= word.length) {
          openGate();
          radio.say('r_l1_gate');
        }
      } else {
        letters1.forEach((x) => { x.hit = false; });
        letterNext = 0;
        burst(L.wx, L.wy, '#ef5350', 8);
        radio.seen.r_l1_wrong = false;
        radio.say('r_l1_wrong');
      }
      return true;
    }
  }
  return false;
}

export function pickup1() {
  for (const it of items1) {
    if (it.taken || !it.active()) continue;
    if (distTo(it.wx, it.wy) < it.r + 14) {
      it.taken = true;
      burst(it.wx, it.wy, it.color, 12);
      sfxCollect();
      onPart(it.id);
    }
  }
}

export function updateEnemies1() {
  for (const e of enemies1) {
    if (e.dead) continue;
    if (e.flying) {
      const [hx, hy] = heroCenter();
      const ex = e.wx + e.w / 2, ey = e.wy + e.h / 2;
      const ddx = hx - ex, ddy = hy - ey;
      const dist = Math.hypot(ddx, ddy);
      if (dist < 5 * TILE && dist > 2) {
        e.wx += (ddx / dist) * e.speed;
        e.wy += (ddy / dist) * e.speed;
      } else {
        e.wx += e.vx;
        if (Math.random() < 0.01) e.vx *= -1;
      }
    } else {
      e.wx += e.vx; e.wy += e.vy;
      const t = tileAt(e.wx, e.wy);
      if (t === T.ROCK || t === T.CORAL_P || t === T.CORAL_G || t === T.CORAL_R || t === T.CORAL_Y || t === T.WALL) {
        e.vx *= -1; e.wx += e.vx * 2;
      }
    }
    if (e.hitTimer > 0) e.hitTimer--;
    if (hero.attacking && hero.attackTimer > 12 && e.hitTimer === 0) {
      const [ax, ay] = heroCenter();
      if (Math.hypot(ax - (e.wx + e.w / 2), ay - (e.wy + e.h / 2)) < 42) {
        e.hp--; e.hitTimer = 20;
        burst(e.wx + e.w / 2, e.wy + e.h / 2, '#ff5252', 6); sfxHit();
        if (e.hp <= 0) { e.dead = true; burst(e.wx, e.wy, '#ffd740', 12); }
      }
    }
    if (hero.invincible <= 0 && e.hitTimer === 0 && !e.dead) {
      const [hx, hy] = heroCenter();
      if (Math.hypot(hx - (e.wx + e.w / 2), hy - (e.wy + e.h / 2)) < 26) {
        hero.hp--; hero.invincible = 90; e.hitTimer = 30;
        burst(hx, hy, '#ef9a9a', 6); sfxHit();
        if (hero.hp <= 0) {
          hero.x = 6 * TILE + 8; hero.y = 25 * TILE + 8;
          hero.hp = hero.maxHp; hero.invincible = 120;
        }
      }
    }
  }
  for (const f of decoFish) {
    f.x += f.vx;
    if (f.x < 40 || f.x > 2500) f.vx *= -1;
  }
}

export function hitEnemyArrow1(a) {
  for (const e of enemies1) {
    if (e.dead) continue;
    if (Math.hypot(a.wx - (e.wx + e.w / 2), a.wy - (e.wy + e.h / 2)) < 16) {
      e.hp--; e.hitTimer = 20;
      burst(e.wx + e.w / 2, e.wy + e.h / 2, '#ff5252', 6); sfxHit();
      if (e.hp <= 0) { e.dead = true; burst(e.wx, e.wy, '#ffd740', 12); }
      return true;
    }
  }
  return hitLetter(a);
}

export function nearVortex() {
  return inv1.parts >= 5 && tileAt(hero.x + 12, hero.y + 12) === T.VORTEX;
}

export function drawLetters1(ctx, tick) {
  for (const L of letters1) {
    const [sx, sy] = w2s(L.wx, L.wy);
    if (sx < -50 || sx > 750 || sy < -50 || sy > 570) continue;
    const pulse = L.hit ? 0.35 : 0.85 + 0.15 * Math.abs(Math.sin(tick * 0.08));
    ctx.globalAlpha = pulse;
    ctx.fillStyle = L.hit ? '#9e9e9e' : '#e53935';
    ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(sx, sy, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = L.index === letterNext && !L.hit ? '#1565c0' : '#333';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(L.letter, sx, sy + 6);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}

export function drawItems1(ctx, tick) {
  for (const it of items1) {
    if (it.taken || !it.active()) continue;
    const [sx, sy] = w2s(it.wx, it.wy);
    if (sx < -50 || sx > 750) continue;
    const pulse = 0.8 + Math.abs(Math.sin(tick * 0.06 + it.wx)) * 0.2;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = it.color;
    ctx.beginPath(); ctx.roundRect(sx - 10, sy - 8, 20, 16, 4); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('✦', sx, sy + 4);
    ctx.globalAlpha = pulse * 0.25;
    ctx.beginPath(); ctx.arc(sx, sy, 18, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}

export function drawEnemies1(ctx, tick) {
  for (const e of enemies1) {
    if (e.dead) continue;
    const [sx, sy] = w2s(e.wx, e.wy);
    if (sx < -60 || sx > 760) continue;
    const flash = e.hitTimer > 0 && Math.floor(tick / 3) % 2 === 0;
    const flap = Math.sin(tick * 0.15) * 3;
    ctx.fillStyle = flash ? '#fff' : e.color;
    ctx.beginPath(); ctx.ellipse(sx + 14, sy + 8, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sx + 4, sy + 6, 6, 8 + flap * 0.2, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(sx + 22, sy + 6, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(sx + 23, sy + 6, 1.5, 0, Math.PI * 2); ctx.fill();
    if (e.maxHp > 1) {
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(sx, sy - 8, e.w, 4);
      ctx.fillStyle = '#ef5350'; ctx.fillRect(sx, sy - 8, e.w * (e.hp / e.maxHp), 4);
    }
  }
  for (const f of decoFish) {
    const [sx, sy] = w2s(f.x, f.y);
    if (sx < -20 || sx > 720 || sy < -20 || sy > 540) continue;
    ctx.fillStyle = f.color;
    ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.ellipse(sx, sy, f.w, f.w * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function drawBubbles(ctx, tick) {
  ctx.fillStyle = 'rgba(200,240,255,0.35)';
  for (let i = 0; i < 18; i++) {
    const x = ((i * 137 + tick * 0.4) % 700);
    const y = (H - ((i * 91 + tick * 0.7) % 520));
    ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
  }
}

const H = 520;
