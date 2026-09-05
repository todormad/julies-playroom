import { G, burst, radio, dlg, w2s, cell } from './engine.js?v=3';
import { TILE, T } from './maps.js?v=3';
import { hero, distTo, heroCenter } from './hero.js?v=3';
import { S, Sfor, speak } from './i18n.js?v=4';
import { sfxCollect, sfxHit, sfxWin, sfxTalk } from './audio.js?v=3';
import { getMuted } from './audio.js?v=3';

export const inv2 = { parts: 0, hull: false, coconuts: 0 };
export let q2 = 0;
let letterNext = 0;
let word = 'HOME';
let hermitGiven = false;

export const items2 = [];
export const enemies2 = [];
export const letters2 = [];
export const liftables2 = [];
export const npcs2 = [];
export const coconuts = [];

function makeItem(id, c, r, color, active) {
  return { id, wx: c * TILE + 20, wy: r * TILE + 20, r: 12, color, taken: false, active };
}

function makeEnemy(kind, c, r) {
  const big = kind === 'drone';
  return {
    kind, wx: c * TILE + 8, wy: r * TILE + 8,
    w: big ? 24 : 22, h: big ? 20 : 16,
    hp: big ? 2 : 2, maxHp: 2,
    speed: big ? 1.0 : 0.85, vx: 0.8, vy: 0,
    hitTimer: 0, dead: false,
    spawnWx: c * TILE + 8, spawnWy: r * TILE + 8,
    flying: big,
    homeWx: c * TILE + 8, homeWy: r * TILE + 8,
    color: big ? '#78909c' : '#e65100',
  };
}

export function initLevel2() {
  q2 = 0;
  inv2.parts = 0;
  inv2.hull = false;
  inv2.coconuts = 0;
  hermitGiven = false;
  letterNext = 0;
  word = S('word_l2');
  items2.length = 0;
  enemies2.length = 0;
  letters2.length = 0;
  liftables2.length = 0;
  npcs2.length = 0;
  coconuts.length = 0;

  coconuts.push(
    { id: 'coco1', wx: 12 * TILE + 20, wy: 8 * TILE + 20, taken: false },
    { id: 'coco2', wx: 18 * TILE + 20, wy: 10 * TILE + 20, taken: false },
    { id: 'coco3', wx: 28 * TILE + 20, wy: 6 * TILE + 20, taken: false },
  );

  items2.push(makeItem('plate', 10, 26, '#b0bec5', () => false)); // given by chief
  items2.push(makeItem('window', 22, 12, '#4fc3f7', () => liftables2[0].lifted));
  items2.push(makeItem('computer', 48, 38, '#81c784', () => enemies2.filter((e) => e.kind === 'crab').every((e) => e.dead)));
  items2.push(makeItem('fuel', 8, 8, '#ff8f00', () => true));
  items2.push(makeItem('nav', 30, 18, '#ce93d8', () => hermitGiven));
  items2.push(makeItem('hull', 56, 16, '#eceff1', () => letters2.every((l) => l.hit)));

  liftables2.push({
    id: 'palm', level: 2, kind: 'palm',
    col: 21, row: 14, cw: 3, rh: 1,
    wx: 22 * TILE + 20, wy: 14 * TILE + 20,
    lifted: false,
  });
  liftables2.push({
    id: 'templeRock', level: 2, kind: 'rock',
    col: 42, row: 17, cw: 2, rh: 2,
    wx: 43 * TILE, wy: 18 * TILE,
    lifted: false,
  });

  const chars = word.split('');
  chars.forEach((ch, i) => {
    letters2.push({
      letter: ch, index: i, hit: false,
      wx: (40 + i) * TILE + 20,
      wy: 15 * TILE + 20,
    });
  });

  enemies2.push(makeEnemy('crab', 40, 38), makeEnemy('crab', 44, 40), makeEnemy('crab', 36, 36));
  enemies2.push(makeEnemy('drone', 50, 20), makeEnemy('drone', 54, 24));

  npcs2.push({
    id: 'chief',
    wx: 9 * TILE + 8, wy: 27 * TILE + 8, w: 26, h: 22,
    get name() { return S('npc_chief'); },
    lines() {
      if (q2 === 0) return S('chief_q0');
      if (q2 === 1) return S('chief_q1');
      if (q2 === 2) return S('chief_q2');
      return S('chief_done');
    },
    bgLines() {
      if (q2 === 0) return Sfor('bg', 'chief_q0');
      if (q2 === 1) return Sfor('bg', 'chief_q1');
      if (q2 === 2) return Sfor('bg', 'chief_q2');
      return Sfor('bg', 'chief_done');
    },
    questAdvance() {
      if (q2 === 0) { q2 = 1; radio.say('r_l2_coconuts'); }
      else if (q2 === 2) {
        q2 = 3;
        inv2.parts++;
        sfxCollect();
        radio.say('r_l2_palm');
        radio.say('r_l2_crabs');
      }
    },
    visible() { return true; },
  });

  npcs2.push({
    id: 'hermit',
    wx: 30 * TILE + 8, wy: 20 * TILE + 8, w: 22, h: 20,
    get name() { return S('npc_hermit'); },
    lines() {
      if (q2 < 3) return S('hermit_early');
      if (!hermitGiven) return S('hermit_gift');
      return S('hermit_done');
    },
    bgLines() {
      if (q2 < 3) return Sfor('bg', 'hermit_early');
      if (!hermitGiven) return Sfor('bg', 'hermit_gift');
      return Sfor('bg', 'hermit_done');
    },
    questAdvance() {
      if (q2 >= 3 && !hermitGiven) {
        hermitGiven = true;
        sfxCollect();
      }
    },
    visible() { return true; },
  });
}

export function hint2() {
  if (q2 === 0) return S('h2_0');
  if (q2 === 1) return S('h2_1', 3 - inv2.coconuts);
  if (q2 === 2) return S('h2_2');
  if (q2 === 3) return S('h2_3');
  if (q2 === 4) return S('h2_4');
  if (q2 === 5) return S('h2_5');
  return S('h2_6');
}

function openTempleGate() {
  if (!G.map) return;
  G.map[16][46] = T.CAVE;
  G.map[17][46] = T.CAVE;
  G.map[18][46] = T.CAVE;
  G.map[19][46] = T.CAVE;
  G.map[20][46] = T.CAVE;
}

export function hitLetter2(a) {
  for (const L of letters2) {
    if (L.hit) continue;
    if (Math.hypot(a.wx - L.wx, a.wy - L.wy) < 22) {
      if (L.index === letterNext) {
        L.hit = true;
        letterNext++;
        burst(L.wx, L.wy, '#ffd740', 12);
        sfxWin();
        if (letterNext >= word.length) {
          openTempleGate();
          q2 = Math.max(q2, 5);
        }
      } else {
        letters2.forEach((x) => { x.hit = false; });
        letterNext = 0;
        burst(L.wx, L.wy, '#ef5350', 8);
        radio.seen.r_l2_wrong = false;
        radio.say('r_l2_wrong');
      }
      return true;
    }
  }
  return false;
}

export function pickup2() {
  for (const c of coconuts) {
    if (c.taken || q2 < 1) continue;
    if (distTo(c.wx, c.wy) < 22) {
      c.taken = true;
      inv2.coconuts++;
      burst(c.wx, c.wy, '#6d4c41', 8);
      sfxCollect();
      if (inv2.coconuts >= 3 && q2 === 1) q2 = 2;
    }
  }
  for (const it of items2) {
    if (it.taken || it.id === 'plate' || !it.active()) continue;
    if (distTo(it.wx, it.wy) < it.r + 14) {
      it.taken = true;
      burst(it.wx, it.wy, it.color, 12);
      sfxCollect();
      if (it.id === 'hull') {
        inv2.hull = true;
        q2 = 6;
        radio.say('r_l2_hull');
        radio.say('r_l2_repair');
        if (!getMuted()) speak(S('speak_part', 0));
      } else {
        inv2.parts++;
        if (!getMuted()) speak(S('speak_part', Math.max(0, 5 - inv2.parts)));
        if (inv2.parts >= 5 && !inv2.hull) {
          q2 = Math.max(q2, 4);
          radio.say('r_l2_temple');
        }
      }
    }
  }
}

export function updateEnemies2() {
  for (const e of enemies2) {
    if (e.dead) continue;
    if (e.flying) {
      const [hx, hy] = heroCenter();
      const ex = e.wx + e.w / 2, ey = e.wy + e.h / 2;
      const ddx = hx - ex, ddy = hy - ey;
      const dist = Math.hypot(ddx, ddy);
      if (dist < 6 * TILE && dist > 2) {
        e.wx += (ddx / dist) * e.speed;
        e.wy += (ddy / dist) * e.speed;
      } else {
        e.wx += e.vx;
        if (Math.random() < 0.012) e.vx *= -1;
      }
    } else {
      e.wx += e.vx;
      if (e.wx < e.spawnWx - 80 || e.wx > e.spawnWx + 80) e.vx *= -1;
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
    if (hero.invincible <= 0 && e.hitTimer === 0) {
      const [hx, hy] = heroCenter();
      if (Math.hypot(hx - (e.wx + e.w / 2), hy - (e.wy + e.h / 2)) < 26) {
        hero.hp--; hero.invincible = 90; e.hitTimer = 30;
        burst(hx, hy, '#ef9a9a', 6); sfxHit();
        if (hero.hp <= 0) {
          hero.x = 32 * TILE + 8; hero.y = 40 * TILE + 8;
          hero.hp = hero.maxHp; hero.invincible = 120;
        }
      }
    }
  }
}

export function hitEnemyArrow2(a) {
  for (const e of enemies2) {
    if (e.dead) continue;
    if (Math.hypot(a.wx - (e.wx + e.w / 2), a.wy - (e.wy + e.h / 2)) < 16) {
      e.hp--; e.hitTimer = 20;
      burst(e.wx + e.w / 2, e.wy + e.h / 2, '#ff5252', 6); sfxHit();
      if (e.hp <= 0) { e.dead = true; burst(e.wx, e.wy, '#ffd740', 12); }
      return true;
    }
  }
  return hitLetter2(a);
}

export function nearestNpc() {
  for (const npc of npcs2) {
    if (!npc.visible()) continue;
    if (distTo(npc.wx + npc.w / 2, npc.wy + npc.h / 2) < 52) return npc;
  }
  return null;
}

export function nearWreckRepair() {
  return q2 >= 6 && inv2.parts >= 5 && inv2.hull && distTo(32 * TILE + 20, 42 * TILE + 20) < 70;
}

export function drawLetters2(ctx, tick) {
  for (const L of letters2) {
    const [sx, sy] = w2s(L.wx, L.wy);
    if (sx < -50 || sx > 750) continue;
    ctx.fillStyle = L.hit ? '#9e9e9e' : '#e53935';
    ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(sx, sy, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = L.index === letterNext && !L.hit ? '#1565c0' : '#333';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(L.letter, sx, sy + 6);
    ctx.textAlign = 'left';
  }
}

export function drawItems2(ctx, tick) {
  for (const c of coconuts) {
    if (c.taken || q2 < 1) continue;
    const [sx, sy] = w2s(c.wx, c.wy);
    ctx.fillStyle = '#6d4c41';
    ctx.beginPath(); ctx.ellipse(sx, sy, 8, 10, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a1887f';
    ctx.beginPath(); ctx.ellipse(sx - 2, sy - 2, 3, 4, 0.3, 0, Math.PI * 2); ctx.fill();
  }
  for (const it of items2) {
    if (it.taken || it.id === 'plate' || !it.active()) continue;
    const [sx, sy] = w2s(it.wx, it.wy);
    const pulse = 0.8 + Math.abs(Math.sin(tick * 0.06)) * 0.2;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = it.color;
    ctx.beginPath(); ctx.roundRect(sx - 11, sy - 9, 22, 18, 4); ctx.fill();
    if (it.id === 'hull') {
      ctx.fillStyle = '#c62828';
      ctx.beginPath(); ctx.moveTo(sx, sy - 14); ctx.lineTo(sx + 10, sy + 8); ctx.lineTo(sx - 10, sy + 8); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

export function drawEnemies2(ctx, tick) {
  for (const e of enemies2) {
    if (e.dead) continue;
    const [sx, sy] = w2s(e.wx, e.wy);
    const flash = e.hitTimer > 0 && Math.floor(tick / 3) % 2 === 0;
    if (e.kind === 'crab') {
      ctx.fillStyle = flash ? '#fff' : e.color;
      ctx.beginPath(); ctx.ellipse(sx + 11, sy + 10, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = flash ? '#fff' : '#bf360c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, sy + 8); ctx.lineTo(sx - 6, sy + 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + 22, sy + 8); ctx.lineTo(sx + 28, sy + 2); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx + 6, sy + 7, 3, 3); ctx.fillRect(sx + 14, sy + 7, 3, 3);
    } else {
      ctx.fillStyle = flash ? '#fff' : e.color;
      ctx.beginPath(); ctx.roundRect(sx, sy + 4, 24, 14, 4); ctx.fill();
      ctx.fillStyle = '#ff1744';
      ctx.beginPath(); ctx.arc(sx + 8, sy + 10, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + 16, sy + 10, 3, 0, Math.PI * 2); ctx.fill();
      const wFlap = Math.sin(tick * 0.2) * 3;
      ctx.fillStyle = flash ? '#fff' : '#90a4ae';
      ctx.beginPath(); ctx.ellipse(sx - 4, sy + 8, 8, 3 + wFlap, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sx + 28, sy + 8, 8, 3 + wFlap, 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(sx, sy - 8, e.w, 4);
    ctx.fillStyle = '#ef5350'; ctx.fillRect(sx, sy - 8, e.w * (e.hp / e.maxHp), 4);
  }
}

export function drawNpcs2(ctx, tick) {
  for (const npc of npcs2) {
    const [sx, sy] = w2s(npc.wx, npc.wy);
    if (npc.id === 'chief') {
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath(); ctx.ellipse(sx + 13, sy + 14, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a5d6a7';
      ctx.beginPath(); ctx.arc(sx + 13, sy + 6, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1b5e20';
      ctx.fillRect(sx + 9, sy + 5, 2, 2); ctx.fillRect(sx + 15, sy + 5, 2, 2);
    } else {
      ctx.fillStyle = '#ef6c00';
      ctx.beginPath(); ctx.ellipse(sx + 11, sy + 12, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe0b2';
      ctx.beginPath(); ctx.arc(sx + 11, sy + 6, 6, 0, Math.PI * 2); ctx.fill();
    }
    if (distTo(npc.wx + 11, npc.wy + 11) < 55 && !dlg.active) {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath(); ctx.roundRect(sx + 2, sy - 20, 18, 14, 6); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('A', sx + 11, sy - 10);
      ctx.textAlign = 'left';
    }
  }
}
