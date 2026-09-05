import { G, burst, w2s } from './engine.js?v=3';
import { TILE } from './maps.js?v=3';
import { hero, heroCenter } from './hero.js?v=3';
import { sfxWin, beep, getMuted } from './audio.js?v=3';
import { S, speak } from './i18n.js?v=4';

export const robot = {
  x: 5 * TILE + 8,
  y: 25 * TILE + 8,
  w: 22,
  h: 22,
  lifting: 0,
  target: null,
};

export function resetRobot(c, r) {
  robot.x = c * TILE + 8;
  robot.y = r * TILE + 8;
  robot.lifting = 0;
  robot.target = null;
}

export function updateRobot() {
  if (robot.lifting > 0) {
    robot.lifting--;
    if (robot.lifting === 0 && robot.target) {
      robot.target.lifted = true;
      burst(robot.target.wx, robot.target.wy, '#69f0ae', 16);
      sfxWin();
      if (!getMuted()) speak(S('speak_lift'));
      robot.target = null;
    }
    return;
  }
  const tx = hero.x - 28;
  const ty = hero.y + 4;
  const dx = tx - robot.x;
  const dy = ty - robot.y;
  const d = Math.hypot(dx, dy);
  if (d > 18) {
    const spd = Math.min(2.4, d * 0.08);
    robot.x += (dx / d) * spd;
    robot.y += (dy / d) * spd;
  }
}

function distToLiftable(hx, hy, L) {
  const left = L.col * TILE;
  const top = L.row * TILE;
  const right = left + L.cw * TILE;
  const bottom = top + L.rh * TILE;
  const qx = Math.max(left, Math.min(hx, right));
  const qy = Math.max(top, Math.min(hy, bottom));
  return Math.hypot(hx - qx, hy - qy);
}

export function nearLiftable(liftables, range = 40) {
  const [hx, hy] = heroCenter();
  for (const L of liftables) {
    if (L.lifted || L.level !== G.level) continue;
    if (distToLiftable(hx, hy, L) < range) return L;
  }
  return null;
}

export function tryLift(liftables) {
  if (robot.lifting > 0) return false;
  const L = nearLiftable(liftables, 48);
  if (!L) return false;
  const rd = Math.hypot(robot.x + 11 - L.wx, robot.y + 11 - L.wy);
  if (rd > 70) {
    robot.x = L.wx - 30;
    robot.y = L.wy;
  }
  robot.lifting = 40;
  robot.target = L;
  beep(520, .12, 'sine', .18);
  beep(780, .14, 'sine', .14, .12);
  return true;
}

export function liftableBlocks(col, row, liftables) {
  for (const L of liftables) {
    if (L.lifted || L.level !== G.level) continue;
    if (col >= L.col && col < L.col + L.cw && row >= L.row && row < L.row + L.rh) return true;
  }
  return false;
}

export function drawRobot(ctx, sx, sy, tick) {
  const bob = Math.sin(tick * 0.1) * 1.5;
  const glow = robot.lifting > 0;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(sx + 11, sy + robot.h + 2, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = glow ? '#c8e6c9' : '#90a4ae';
  ctx.beginPath(); ctx.roundRect(sx + 3, sy + 12 + bob, 16, 12, 3); ctx.fill();
  ctx.fillStyle = '#b0bec5';
  ctx.beginPath(); ctx.roundRect(sx + 5, sy + 2 + bob, 14, 12, 3); ctx.fill();
  const eg = 0.6 + 0.4 * Math.abs(Math.sin(tick * 0.12));
  ctx.fillStyle = `rgba(255,220,50,${eg})`;
  ctx.beginPath(); ctx.arc(sx + 9, sy + 8 + bob, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + 15, sy + 8 + bob, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sx + 12, sy + 2 + bob); ctx.lineTo(sx + 12, sy - 4 + bob); ctx.stroke();
  ctx.fillStyle = '#69f0ae';
  ctx.beginPath(); ctx.arc(sx + 12, sy - 5 + bob, 2, 0, Math.PI * 2); ctx.fill();
  if (glow) {
    ctx.strokeStyle = 'rgba(105,240,174,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sx + 11, sy + 12, 18, 0, Math.PI * 2); ctx.stroke();
  }
}

export function drawLiftable(ctx, L, tick) {
  if (L.lifted) return;
  const [sx, sy] = w2s(L.wx - 16, L.wy - 16);
  const shake = robot.target === L ? Math.sin(tick * 0.4) * 2 : 0;
  if (L.kind === 'rock' || L.kind === 'valve') {
    ctx.fillStyle = '#607d8b';
    ctx.beginPath(); ctx.ellipse(sx + 16 + shake, sy + 18, 16, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#90a4ae';
    ctx.beginPath(); ctx.ellipse(sx + 12 + shake, sy + 14, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
    if (L.kind === 'valve') {
      ctx.fillStyle = '#ff8f00';
      ctx.fillRect(sx + 12 + shake, sy + 4, 8, 8);
    }
  } else if (L.kind === 'palm') {
    ctx.fillStyle = '#6d4c41';
    ctx.save();
    ctx.translate(sx + 20 + shake, sy + 18);
    ctx.rotate(1.2);
    ctx.fillRect(-6, -8, 50, 8);
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath(); ctx.ellipse(44, -4, 14, 8, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  const [hx, hy] = heroCenter();
  if (distToLiftable(hx, hy, L) < 48) {
    ctx.fillStyle = 'rgba(105,240,174,0.9)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('C / R', sx + 16, sy - 8);
    ctx.textAlign = 'left';
  }
}
