import { G, moveBody, burst, tileAt, currentAt, arrowBlockedAt, w2s } from './engine.js?v=3';
import { TILE, T } from './maps.js?v=3';
import { beep, sfxArrow, sfxStep } from './audio.js?v=3';

export const hero = {
  x: 6 * TILE + 8,
  y: 25 * TILE + 8,
  w: 24,
  h: 24,
  speed: 2.8,
  dir: 1,
  frame: 0,
  frameTick: 0,
  hp: 3,
  maxHp: 3,
  invincible: 0,
  attacking: false,
  attackTimer: 0,
  attackDir: 1,
  hasBow: true,
  bowCd: 0,
};

export function resetHero(c, r) {
  hero.x = c * TILE + 8;
  hero.y = r * TILE + 8;
  hero.hp = hero.maxHp;
  hero.invincible = 90;
  hero.attacking = false;
  hero.attackTimer = 0;
  hero.bowCd = 0;
  hero.dir = 1;
}

export function heroCenter() {
  return [hero.x + hero.w / 2, hero.y + hero.h / 2];
}

export function distTo(wx, wy) {
  const [hx, hy] = heroCenter();
  return Math.hypot(hx - wx, hy - wy);
}

export function updateHeroMove() {
  const { keys } = G;
  let dx = 0, dy = 0;
  if (keys.ArrowRight || keys.KeyD) { dx = hero.speed; hero.dir = 1; }
  if (keys.ArrowLeft || keys.KeyA) { dx = -hero.speed; hero.dir = 3; }
  if (keys.ArrowUp || keys.KeyW) { dy = -hero.speed; hero.dir = 0; }
  if (keys.ArrowDown || keys.KeyS) { dy = hero.speed; hero.dir = 2; }
  if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
  const cur = currentAt(hero.x + hero.w / 2, hero.y + hero.h / 2);
  if (cur) { dx += cur[0]; dy += cur[1]; }
  if (dx !== 0 || dy !== 0) {
    moveBody(hero, dx, dy);
    hero.frameTick++;
    if (hero.frameTick % 10 === 0) { hero.frame = (hero.frame + 1) % 4; sfxStep(); }
    G.idleTimer = 0;
  }
  if (hero.attackTimer > 0) hero.attackTimer--;
  else hero.attacking = false;
  if (hero.bowCd > 0) hero.bowCd--;
  if (hero.invincible > 0) hero.invincible--;
}

export function swingSword() {
  hero.attacking = true;
  hero.attackTimer = 18;
  hero.attackDir = hero.dir;
  beep(300, .1, 'sawtooth', .2);
}

export function shootArrow() {
  if (!hero.hasBow || hero.bowCd > 0 || G.level === 3) return;
  const d = [[0, -1], [1, 0], [0, 1], [-1, 0]][hero.dir];
  G.arrows.push({
    wx: hero.x + hero.w / 2,
    wy: hero.y + hero.h / 2,
    vx: d[0] * 7,
    vy: d[1] * 7,
    dir: hero.dir,
    life: 120,
  });
  hero.bowCd = 50;
  sfxArrow();
}

export function updateArrows(onHit) {
  for (let i = G.arrows.length - 1; i >= 0; i--) {
    const a = G.arrows[i];
    a.wx += a.vx; a.wy += a.vy; a.life--;
    if (a.life <= 0 || arrowBlockedAt(a.wx, a.wy)) {
      burst(a.wx, a.wy, '#bdbdbd', 4);
      G.arrows.splice(i, 1);
      continue;
    }
    if (onHit(a)) G.arrows.splice(i, 1);
  }
}

export function drawAstro(ctx, sx, sy, tick) {
  const bobY = (hero.frameTick % 10 < 5) ? 0 : 1;
  const swim = G.level === 1 ? Math.sin(tick * 0.08) * 1.5 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(sx + 12, sy + hero.h + 1 + swim, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  if (hero.attacking) drawSword(ctx, sx, sy, bobY + swim);
  ctx.fillStyle = hero.invincible > 0 && Math.floor(tick / 4) % 2 === 0 ? '#fff' : '#1565c0';
  ctx.beginPath(); ctx.roundRect(sx + 3, sy + 8 + bobY + swim, 18, 14, 4); ctx.fill();
  ctx.fillStyle = '#90caf9';
  ctx.beginPath(); ctx.arc(sx + 12, sy + 7 + bobY + swim, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1565c0'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#1a237e';
  ctx.beginPath(); ctx.arc(sx + 12, sy + 7 + bobY + swim, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  if (hero.dir === 2 || hero.dir === 1) {
    ctx.fillRect(sx + 9, sy + 5 + bobY + swim, 3, 3);
    ctx.fillRect(sx + 14, sy + 5 + bobY + swim, 3, 3);
  } else if (hero.dir === 0) {
    ctx.fillRect(sx + 9, sy + 4 + bobY + swim, 3, 3);
    ctx.fillRect(sx + 14, sy + 4 + bobY + swim, 3, 3);
  } else {
    ctx.fillRect(sx + 8, sy + 5 + bobY + swim, 3, 3);
    ctx.fillRect(sx + 13, sy + 5 + bobY + swim, 3, 3);
  }
  const legOff = (hero.frame % 2 === 0) ? 2 : -2;
  ctx.fillStyle = '#1565c0';
  ctx.fillRect(sx + 4, sy + 20 + bobY + swim, 6, 6);
  ctx.fillRect(sx + 14, sy + 20 + bobY + swim, 6, 6);
  ctx.fillStyle = '#e53935';
  ctx.fillRect(sx + 3, sy + 24 + bobY + swim + legOff, 7, 4);
  ctx.fillRect(sx + 13, sy + 24 + bobY + swim - legOff, 7, 4);
  if (hero.hasBow && !hero.attacking) {
    ctx.strokeStyle = G.level === 1 ? '#26c6da' : '#8d6e63';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx + 2, sy + 9 + bobY + swim); ctx.lineTo(sx + 7, sy + 19 + bobY + swim); ctx.stroke();
  }
}

function drawSword(ctx, sx, sy, bobY) {
  const prog = 1 - hero.attackTimer / 18;
  const baseAng = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][hero.attackDir];
  const ang = baseAng - Math.PI * 0.45 + prog * Math.PI * 0.9;
  const cx = sx + 12, cy = sy + 12 + bobY;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.fillStyle = '#e0e0e0';
  ctx.beginPath();
  ctx.moveTo(10, -2.4); ctx.lineTo(30, -1.2); ctx.lineTo(32, 0); ctx.lineTo(30, 1.2); ctx.lineTo(10, 2.4);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffb300'; ctx.fillRect(8, -4, 3, 8);
  ctx.fillStyle = '#6d4c41'; ctx.fillRect(3, -1.6, 5, 3.2);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 26, baseAng - Math.PI * 0.45, ang);
  ctx.stroke();
}

export function drawArrowSprite(ctx, sx, sy, dir) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate([-Math.PI / 2, 0, Math.PI / 2, Math.PI][dir]);
  if (G.level === 1) {
    ctx.strokeStyle = '#26c6da'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.fillStyle = '#e0f7fa';
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(6, -4); ctx.lineTo(6, 4); ctx.closePath(); ctx.fill();
  } else {
    ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(6, 0); ctx.stroke();
    ctx.fillStyle = '#eceff1';
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(4, -3.4); ctx.lineTo(4, 3.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ef5350';
    ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-4, 0); ctx.lineTo(-8, 3); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

export function drawStarship(ctx, sx, sy, scale = 1, engineOn = false, tick = 0) {
  ctx.save();
  ctx.translate(sx, sy); ctx.scale(scale, scale);
  if (engineOn) {
    const eg = 0.6 + 0.4 * Math.abs(Math.sin(tick * 0.3));
    ctx.fillStyle = `rgba(255,152,0,${eg})`;
    ctx.beginPath();
    ctx.moveTo(-22, 58); ctx.lineTo(-12, 92 + Math.sin(tick * 0.5) * 6); ctx.lineTo(-2, 58); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, 58); ctx.lineTo(12, 92 + Math.cos(tick * 0.5) * 6); ctx.lineTo(22, 58); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#c62828';
  ctx.beginPath(); ctx.moveTo(-20, 20); ctx.lineTo(-38, 58); ctx.lineTo(-20, 52); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(20, 20); ctx.lineTo(38, 58); ctx.lineTo(20, 52); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#eceff1';
  ctx.beginPath();
  ctx.moveTo(0, -55);
  ctx.bezierCurveTo(24, -30, 26, 20, 22, 58);
  ctx.lineTo(-22, 58);
  ctx.bezierCurveTo(-26, 20, -24, -30, 0, -55);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c62828';
  ctx.beginPath();
  ctx.moveTo(0, -55);
  ctx.bezierCurveTo(14, -42, 18, -30, 19, -18);
  ctx.lineTo(-19, -18);
  ctx.bezierCurveTo(-18, -30, -14, -42, 0, -55);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath(); ctx.arc(0, 4, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd740'; ctx.fillRect(-22, 34, 44, 6);
  ctx.restore();
}
