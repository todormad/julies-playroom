import { G, W, H, SCREEN, burst } from './engine.js?v=3';
import { hero } from './hero.js?v=3';
import { drawStarship } from './hero.js?v=3';
import { S, speak } from './i18n.js?v=4';
import { beep, sfxHit, sfxWin, sfxBoom, getMuted } from './audio.js?v=3';
import { radio } from './engine.js?v=3';

const GOAL_ALT = 4200;

export const flight = {
  ship: { x: 350, y: 380, w: 52, h: 64 },
  bullets: [],
  missiles: [],
  turrets: [],
  altitude: 0,
  shootCd: 0,
  shake: 0,
  won: false,
  bossSpawned: false,
};

export function initFlight() {
  flight.ship.x = 350;
  flight.ship.y = 380;
  flight.bullets.length = 0;
  flight.missiles.length = 0;
  flight.turrets.length = 0;
  flight.altitude = 0;
  flight.shootCd = 0;
  flight.shake = 0;
  flight.won = false;
  flight.bossSpawned = false;
  hero.hp = hero.maxHp;
  hero.invincible = 90;
  radio.say('r_l3_start');
}

function spawnTurret(kind) {
  const side = Math.random() < 0.5 ? 40 : W - 70;
  flight.turrets.push({
    x: side,
    y: -30,
    w: kind === 'boss' ? 70 : 42,
    h: kind === 'boss' ? 54 : 36,
    hp: kind === 'boss' ? 8 : 3,
    maxHp: kind === 'boss' ? 8 : 3,
    kind,
    cd: 40 + Math.floor(Math.random() * 40),
  });
}

export function updateFlight() {
  const s = flight.ship;
  const { keys } = G;
  let dx = 0, dy = 0;
  if (keys.ArrowRight || keys.KeyD) dx = 5;
  if (keys.ArrowLeft || keys.KeyA) dx = -5;
  if (keys.ArrowUp || keys.KeyW) dy = -3.2;
  if (keys.ArrowDown || keys.KeyS) dy = 3.2;
  s.x = Math.max(28, Math.min(W - 28, s.x + dx));
  s.y = Math.max(80, Math.min(H - 50, s.y + dy));
  flight.altitude += 2.4;
  if (flight.shootCd > 0) flight.shootCd--;
  if (hero.invincible > 0) hero.invincible--;
  if (flight.shake > 0) flight.shake--;

  if ((G.spaceJustPressed || keys.Space) && flight.shootCd === 0) {
    flight.bullets.push({ x: s.x, y: s.y - 40, vy: -9 });
    flight.shootCd = 12;
    beep(880, .05, 'square', .1);
  }
  G.spaceJustPressed = false;

  if (flight.altitude > 400 && flight.turrets.length < 5 && G.tick % 90 === 0) {
    spawnTurret('gun');
  }
  if (!flight.bossSpawned && flight.altitude > 2800) {
    spawnTurret('boss');
    flight.bossSpawned = true;
  }

  for (const t of flight.turrets) {
    t.y += 1.15;
    t.cd--;
    if (t.cd <= 0 && t.y > 10 && t.y < H - 40) {
      const ang = Math.atan2(s.y - t.y, s.x - t.x);
      const spd = t.kind === 'boss' ? 2.1 : 1.7;
      flight.missiles.push({
        x: t.x + t.w / 2, y: t.y + t.h, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd + 1.2,
        w: t.kind === 'boss' ? 18 : 14, h: t.kind === 'boss' ? 28 : 22,
      });
      t.cd = t.kind === 'boss' ? 50 : 80;
      beep(180, .08, 'sawtooth', .1);
    }
  }
  flight.turrets = flight.turrets.filter((t) => t.y < H + 40 && t.hp > 0);

  for (const b of flight.bullets) b.y += b.vy;
  flight.bullets = flight.bullets.filter((b) => b.y > -20);

  for (const m of flight.missiles) {
    m.x += m.vx; m.y += m.vy;
  }

  for (let i = flight.bullets.length - 1; i >= 0; i--) {
    const b = flight.bullets[i];
    let hit = false;
    for (const t of flight.turrets) {
      if (b.x > t.x && b.x < t.x + t.w && b.y > t.y && b.y < t.y + t.h) {
        t.hp--; hit = true;
        burst(t.x + t.w / 2 + G.cam.x, t.y + G.cam.y, '#ffd740', 8);
        sfxHit();
        break;
      }
    }
    if (!hit) {
      for (let j = flight.missiles.length - 1; j >= 0; j--) {
        const m = flight.missiles[j];
        if (Math.hypot(b.x - m.x, b.y - m.y) < 16) {
          flight.missiles.splice(j, 1);
          hit = true;
          burst(m.x + G.cam.x, m.y + G.cam.y, '#ff8a65', 10);
          sfxBoom();
          break;
        }
      }
    }
    if (hit) flight.bullets.splice(i, 1);
  }

  if (hero.invincible <= 0) {
    for (let j = flight.missiles.length - 1; j >= 0; j--) {
      const m = flight.missiles[j];
      if (Math.hypot(m.x - s.x, m.y - (s.y - 10)) < 28) {
        flight.missiles.splice(j, 1);
        hero.hp--;
        hero.invincible = 90;
        flight.shake = 12;
        sfxHit();
        if (hero.hp <= 0) {
          hero.hp = hero.maxHp;
          hero.invincible = 120;
          s.x = 350; s.y = 380;
        }
        break;
      }
    }
    for (const t of flight.turrets) {
      if (Math.hypot((t.x + t.w / 2) - s.x, (t.y + t.h / 2) - s.y) < 36) {
        hero.hp--;
        hero.invincible = 90;
        flight.shake = 10;
        sfxHit();
        break;
      }
    }
  }

  flight.missiles = flight.missiles.filter((m) => m.y < H + 40 && m.y > -40 && m.x > -40 && m.x < W + 40);

  if (flight.altitude >= GOAL_ALT && !flight.won) {
    flight.won = true;
    sfxWin();
    if (!getMuted()) speak(S('win_sub'));
    setTimeout(() => { G.screen = SCREEN.WIN; }, 800);
  }
}

export function drawFlight(ctx, tick) {
  const sh = flight.shake ? (Math.random() - 0.5) * 6 : 0;
  ctx.save();
  ctx.translate(sh, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  const t = Math.min(1, flight.altitude / GOAL_ALT);
  sky.addColorStop(0, t > 0.6 ? '#05070f' : '#4fc3f7');
  sky.addColorStop(0.45, t > 0.6 ? '#1a237e' : '#81d4fa');
  sky.addColorStop(1, t > 0.35 ? '#1565c0' : '#ffe082');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  if (t < 0.5) {
    ctx.fillStyle = '#2e7d32';
    const groundY = H - 40 + flight.altitude * 0.02;
    ctx.fillRect(0, groundY, W, 80);
    ctx.fillStyle = '#ffe082';
    ctx.fillRect(0, groundY - 12, W, 14);
  }

  for (let i = 0; i < 50; i++) {
    const sx = (i * 127.3 + 31) % W;
    const sy = ((i * 61.7 + tick * (2 + t * 4)) % (H + 40)) - 20;
    ctx.globalAlpha = 0.25 + t * 0.5;
    ctx.fillStyle = '#fff';
    ctx.fillRect(sx, sy, 1.6, 4 + (i % 3) * 3);
  }
  ctx.globalAlpha = 1;

  for (const tur of flight.turrets) {
    ctx.fillStyle = tur.kind === 'boss' ? '#5d4037' : '#6d4c41';
    ctx.beginPath(); ctx.roundRect(tur.x, tur.y, tur.w, tur.h, 6); ctx.fill();
    ctx.fillStyle = '#ef5350';
    ctx.fillRect(tur.x + 8, tur.y + 6, tur.w - 16, 8);
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(tur.x, tur.y - 8, tur.w, 4);
    ctx.fillStyle = '#66bb6a';
    ctx.fillRect(tur.x, tur.y - 8, tur.w * (tur.hp / tur.maxHp), 4);
  }

  for (const m of flight.missiles) {
    ctx.fillStyle = '#ff7043';
    ctx.beginPath(); ctx.roundRect(m.x - m.w / 2, m.y, m.w, m.h, 4); ctx.fill();
    ctx.fillStyle = '#ffee58';
    ctx.fillRect(m.x - 3, m.y + m.h - 4, 6, 10);
  }

  for (const b of flight.bullets) {
    ctx.fillStyle = '#80deea';
    ctx.fillRect(b.x - 2, b.y, 4, 12);
  }

  const flash = hero.invincible > 0 && Math.floor(tick / 4) % 2 === 0;
  ctx.save();
  if (flash) ctx.globalAlpha = 0.35;
  drawStarship(ctx, flight.ship.x, flight.ship.y, 0.55, true, tick);
  ctx.restore();

  ctx.restore();

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.roundRect(W / 2 - 80, 10, 160, 16, 8); ctx.fill();
  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath(); ctx.roundRect(W / 2 - 78, 12, 156 * Math.min(1, flight.altitude / GOAL_ALT), 12, 6); ctx.fill();
}
