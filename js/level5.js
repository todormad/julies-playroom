import { lvl5Cfg, BOSS, makeLvl5Arena, createBoss, STAR_GOAL } from './config.js?v=37';
import { playSFX } from './audio.js?v=37';
import { spawnStarBurst, spawnHitBurst } from './particles.js?v=37';

const ATTACKS_P1 = ['stomp', 'sneeze'];
const ATTACKS_P2 = ['stomp', 'sweep', 'sneeze'];
const ATTACKS_P3 = ['sweep', 'laser', 'junk'];

function bossPhase(boss) {
  if (boss.hp <= BOSS.phase3At) return 3;
  if (boss.hp <= BOSS.phase2At) return 2;
  return 1;
}

function attackPool(phase) {
  if (phase >= 3) return ATTACKS_P3;
  if (phase >= 2) return ATTACKS_P2;
  return ATTACKS_P1;
}

function telegraphFrames(difficulty) {
  return difficulty === 'easy' ? BOSS.telegraphEasy : BOSS.telegraphHard;
}

function staggerFrames(difficulty) {
  return difficulty === 'easy' ? BOSS.staggerEasy : BOSS.staggerHard;
}

function pickAttack(boss) {
  const pool = attackPool(boss.phase);
  boss.attack = pool[boss.attackIdx % pool.length];
  boss.attackIdx++;
}

function hitDamage(difficulty) {
  return difficulty === 'easy' ? BOSS.hitDamageEasy : BOSS.hitDamageHard;
}

function buildJunkPlan(difficulty, patternIdx) {
  const easy = difficulty === 'easy';
  const vy = easy ? 1.45 : 2.15;
  const w = 36;
  const pattern = patternIdx % 2; // 0 = top safe, 1 = mid safe
  // Platform X spans (rocks fall full-height columns — must not overlap safe tier):
  // low [30,230], mid [200,375], top [60,215]

  if (pattern === 0) {
    // Top platform safe — columns stay left of x=60 or right of x=215
    const plan = [
      { x: 28, markY: 388, vy, spawnDelay: easy ? 62 : 48, w, h: w },   // low left
      { x: 218, markY: 388, vy, spawnDelay: easy ? 98 : 72, w, h: w },  // low right + mid left
      { x: 292, markY: 306, vy, spawnDelay: easy ? 134 : 98, w, h: w }, // mid center
    ];
    if (!easy) {
      plan.push({ x: 338, markY: 306, vy: 2.15, spawnDelay: 82, w, h: w }); // mid right
    }
    return plan.map(s => ({ ...s, spawned: false, safeZone: 'top' }));
  }

  // Middle platform safe — columns stay left of x=200
  const plan = [
    { x: 38, markY: 388, vy, spawnDelay: easy ? 62 : 48, w, h: w },   // low left
    { x: 158, markY: 388, vy, spawnDelay: easy ? 98 : 72, w, h: w }, // low / top overlap
    { x: 95, markY: 216, vy: vy * 0.95, spawnDelay: easy ? 134 : 102, w: 34, h: 34 }, // top
  ];
  if (!easy) {
    plan.push({ x: 68, markY: 216, vy: 2.2, spawnDelay: 86, w: 34, h: 34 }); // top left
  }
  return plan.map(s => ({ ...s, spawned: false, safeZone: 'mid' }));
}

function getSneezeBolts(boss, difficulty) {
  const baseY = boss.y + 88;
  const warn = difficulty === 'easy' ? 34 : 26;
  return [
    { x: boss.x + 8, y: baseY, w: 20, h: 20, vx: -4.2, vy: -1.4, warnFrames: warn },
    {
      x: boss.x + 28, y: baseY + 18, w: 18, h: 18,
      vx: -3.8, vy: 0.5, warnFrames: warn + 8,
    },
  ];
}

function traceBoltPath(bolt, canvas) {
  const points = [{ x: bolt.x + bolt.w / 2, y: bolt.y + bolt.h / 2 }];
  let x = bolt.x;
  let y = bolt.y;
  for (let i = 0; i < 160; i++) {
    x += bolt.vx;
    y += bolt.vy;
    if (x + bolt.w < 0 || y > canvas.height + 20 || y + bolt.h < -24) break;
    points.push({ x: x + bolt.w / 2, y: y + bolt.h / 2 });
  }
  return points;
}

function drawBoltPathWarning(ctx, bolt, canvas, alpha, frame) {
  if (bolt.vx == null || bolt.vy == null) return;
  const points = traceBoltPath(bolt, canvas);
  if (points.length < 2) return;
  const pulse = 0.45 + 0.55 * Math.sin(frame * 0.14 + bolt.x * 0.02);
  const end = points[points.length - 1];

  ctx.save();
  ctx.globalAlpha = alpha * pulse;
  ctx.strokeStyle = 'rgba(100, 255, 180, 0.7)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(100, 255, 180, 0.28)';
  ctx.beginPath();
  ctx.arc(end.x, end.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2dbd77';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffbf3c';
  ctx.font = '700 16px Nunito,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚠', points[0].x, points[0].y - 14);
  ctx.restore();
}

function drawSafePlatformHint(ctx, platforms, safeZone, frame, tr) {
  const idx = safeZone === 'top' ? 2 : 1;
  const p = platforms[idx];
  if (!p) return;
  const pulse = 0.35 + 0.25 * Math.sin(frame * 0.1);
  ctx.save();
  ctx.fillStyle = `rgba(45, 189, 119, ${pulse.toFixed(2)})`;
  ctx.strokeStyle = '#2dbd77';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  rrPath(ctx, p.x + 2, p.y - 2, p.w - 4, 8, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = '700 11px Nunito,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(tr('boss.junk.safe'), p.x + p.w / 2, p.y - 10);
  ctx.restore();
}

function drawJunkWarnings(ctx, plan, frame, alpha) {
  if (!plan) return;
  plan.forEach(spot => {
    const cx = spot.x + spot.w / 2;
    const pulse = 0.45 + 0.55 * Math.sin(frame * 0.14 + spot.x * 0.03);
    ctx.save();
    ctx.globalAlpha = alpha * pulse;
    ctx.fillStyle = 'rgba(255, 80, 60, 0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, spot.markY, spot.w * 0.85, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff6b7a';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255, 200, 100, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, 24);
    ctx.lineTo(cx, spot.markY - 18);
    ctx.stroke();
    ctx.fillStyle = '#ffbf3c';
    ctx.font = '700 18px Nunito,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠', cx, spot.markY - 22);
    ctx.restore();
  });
}

function drawBeamWarnings(ctx, plan, frame, alpha, boss, canvas, tr) {
  if (!plan) return;
  ctx.save();
  ctx.globalAlpha = alpha;

  if (plan.type === 'laser') {
    const pulse = 0.4 + 0.6 * Math.sin(frame * 0.16);
    ctx.fillStyle = `rgba(255, 60, 120, ${(0.18 * pulse).toFixed(2)})`;
    ctx.fillRect(0, plan.y, canvas.width, plan.h);
    ctx.strokeStyle = '#ff6b7a';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(4, plan.y + 2, canvas.width - 8, plan.h - 4);
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffbf3c';
    ctx.font = '700 16px Nunito,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tr('boss.warn.laser'), canvas.width / 2, plan.y + plan.h / 2 + 5);
  } else if (plan.type === 'sweep') {
    const pulse = 0.45 + 0.55 * Math.sin(frame * 0.14);
    const x = plan.x;
    ctx.fillStyle = `rgba(255, 100, 80, ${(0.22 * pulse).toFixed(2)})`;
    ctx.fillRect(x, plan.y, plan.w, plan.h);
    ctx.strokeStyle = '#ff6b7a';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(x, plan.y, plan.w, plan.h);
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255, 200, 100, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + plan.w / 2, plan.y + plan.h / 2);
    ctx.lineTo(40, plan.y + plan.h / 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd470';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👊', x + plan.w / 2, plan.y + plan.h / 2 + 7);
    ctx.font = '700 13px Nunito,sans-serif';
    ctx.fillStyle = '#ffbf3c';
    ctx.fillText(tr('boss.warn.sweepDuck'), x + plan.w / 2, plan.y - 8);
  } else if (plan.type === 'sneeze') {
    plan.bolts.forEach(bolt => drawBoltPathWarning(ctx, bolt, canvas, alpha, frame));
    const mid = plan.bolts[0];
    if (mid) {
      ctx.fillStyle = '#a8ffb8';
      ctx.font = '700 13px Nunito,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(tr('boss.warn.dodge'), 24, mid.y + mid.h / 2 + 8);
    }
  }

  ctx.restore();
}

function spawnAttackHazards(l5, attack, canvas, difficulty) {
  const b = l5.boss;
  l5.hazards = [];
  if (attack === 'stomp') {
    l5.hazards.push({ type: 'shock', x: 0, y: 392, w: canvas.width, h: 128, life: 32 });
    l5.shake = 16;
    playSFX('hit');
  } else if (attack === 'sneeze') {
    getSneezeBolts(b, difficulty).forEach(spec => {
      l5.hazards.push({ type: 'bolt', ...spec, life: 160, canHit: false });
    });
    playSFX('beam_warn');
  } else if (attack === 'sweep') {
    const warn = difficulty === 'easy' ? 38 : 30;
    l5.hazards.push({
      type: 'sweep', x: b.x - 20, y: 328, w: 90, h: 48,
      moveVx: difficulty === 'easy' ? -4.6 : -5.4,
      life: 95, canHit: false, warnFrames: warn,
    });
    playSFX('beam_warn');
  } else if (attack === 'laser') {
    const warn = difficulty === 'easy' ? 42 : 32;
    l5.hazards.push({
      type: 'laser', x: 0, y: 292, w: canvas.width, h: 32,
      life: 105, canHit: false, warnFrames: warn,
    });
    playSFX('beam_warn');
  } else if (attack === 'junk') {
    l5.junkPlan = buildJunkPlan(difficulty, l5.junkPatternIdx);
    l5.junkPatternIdx++;
    l5.junkAttackFrame = 0;
    playSFX('beam_warn');
  }
}

function weakRect(boss) {
  return { x: boss.x + 52, y: boss.y + 108, w: 96, h: 72 };
}

/** How far right the hero can move (max r.x). Opens up during stagger so you can reach the chest. */
export function getL5HeroMoveBounds(l5, robotW) {
  const minX = l5.heroMinX;
  let maxX = l5.heroMaxX - robotW;
  const b = l5.boss;
  if (b.weakOpen && b.mode === 'stagger') {
    const wr = weakRect(b);
    maxX = Math.max(maxX, wr.x + wr.w - robotW - 4);
  }
  return { minX, maxX };
}

function rectsOverlap(a, b) {
  return a.left < b.x + b.w && a.right > b.x && a.top < b.y + b.h && a.bottom > b.y;
}

function rrPath(ctx, x, y, w, h, rad) {
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
}

function drawArenaPlatform(ctx, p, frame) {
  const g = ctx.createLinearGradient(0, p.y, 0, p.y + 20);
  g.addColorStop(0, '#4a5568');
  g.addColorStop(0.5, '#2d3748');
  g.addColorStop(1, '#1a202c');
  ctx.fillStyle = g;
  ctx.beginPath();
  const r = 8;
  ctx.moveTo(p.x + r, p.y);
  ctx.arcTo(p.x + p.w, p.y, p.x + p.w, p.y + 20, r);
  ctx.arcTo(p.x + p.w, p.y + 20, p.x, p.y + 20, r);
  ctx.arcTo(p.x, p.y + 20, p.x, p.y, r);
  ctx.arcTo(p.x, p.y, p.x + p.w, p.y, r);
  ctx.fill();
  const pulse = 0.45 + 0.25 * Math.sin(frame * 0.06 + p.x * 0.02);
  ctx.fillStyle = `rgba(0, 200, 255, ${pulse.toFixed(2)})`;
  ctx.fillRect(p.x + 6, p.y, p.w - 12, 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, 18);
}

export function drawBigOtto(ctx, boss, frame) {
  const { x, y, w, h } = boss;
  const bob = Math.sin(frame * 0.05) * 3;
  const telegraph = boss.mode === 'telegraph';
  const stagger = boss.mode === 'stagger';
  const defeated = boss.defeated;

  ctx.save();
  ctx.translate(x, y + bob);

  if (boss.hitFlash > 0) {
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(frame * 0.8);
  }

  // Steam puffs
  boss.steam.forEach(s => {
    ctx.save();
    ctx.globalAlpha = s.life * 0.55;
    ctx.fillStyle = 'rgba(180,200,220,0.75)';
    ctx.beginPath();
    ctx.arc(s.x - x, s.y - y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Legs
  ctx.fillStyle = '#3d4f63';
  ctx.fillRect(36, h - 42, 38, 36);
  ctx.fillRect(w - 74, h - 42, 38, 36);
  ctx.fillStyle = '#2a3544';
  ctx.fillRect(44, h - 18, 24, 18);
  ctx.fillRect(w - 68, h - 18, 24, 18);

  // Body
  const bodyG = ctx.createLinearGradient(0, 40, 0, h - 30);
  bodyG.addColorStop(0, telegraph ? '#7a8fa8' : '#5a6d82');
  bodyG.addColorStop(1, '#2f3d4d');
  ctx.fillStyle = bodyG;
  ctx.beginPath();
  rrPath(ctx, 28, 48, w - 56, h - 88, 28);
  ctx.fill();
  ctx.strokeStyle = '#1a2430';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Belly panel / weak point
  const wr = weakRect(boss);
  const localW = { x: wr.x - x, y: wr.y - y, w: wr.w, h: wr.h };
  if (stagger && boss.weakOpen) {
    const glow = 0.55 + 0.45 * Math.sin(frame * 0.18);
    ctx.fillStyle = `rgba(255, 210, 60, ${glow.toFixed(2)})`;
    ctx.shadowColor = '#ffbf3c';
    ctx.shadowBlur = 18;
  } else {
    ctx.fillStyle = '#253040';
    ctx.shadowBlur = 0;
  }
  ctx.beginPath();
  rrPath(ctx, localW.x, localW.y, localW.w, localW.h, 10);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = stagger && boss.weakOpen ? '#ffbf3c' : '#1a2430';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Head
  ctx.fillStyle = telegraph ? '#8a9cb5' : '#6a7d94';
  ctx.beginPath();
  rrPath(ctx, 48, 0, w - 96, 72, 22);
  ctx.fill();
  ctx.strokeStyle = '#1a2430';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Antenna
  ctx.strokeStyle = '#ffd470';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2 + Math.sin(frame * 0.12) * 8, -28);
  ctx.stroke();
  ctx.fillStyle = '#ff6b7a';
  ctx.beginPath();
  ctx.arc(w / 2 + Math.sin(frame * 0.12) * 8, -28, 7, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  const spin = boss.eyeSpin;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(88, 34, 18, 22, 0, 0, Math.PI * 2);
  ctx.ellipse(w - 88, 34, 14, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#17324a';
  if (defeated) {
    ctx.strokeStyle = '#17324a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(78, 28);
    ctx.lineTo(98, 40);
    ctx.moveTo(98, 28);
    ctx.lineTo(78, 40);
    ctx.moveTo(w - 98, 28);
    ctx.lineTo(w - 78, 40);
    ctx.moveTo(w - 78, 28);
    ctx.lineTo(w - 98, 40);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(88 + Math.cos(spin) * 4, 36, 7, 0, Math.PI * 2);
    ctx.arc(w - 88, 36 + Math.sin(spin * 1.3) * 3, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mouth
  ctx.strokeStyle = '#1a2430';
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (telegraph) {
    ctx.arc(w / 2, 58, 16, 0.1, Math.PI - 0.1);
  } else if (stagger) {
    ctx.arc(w / 2, 62, 12, Math.PI + 0.2, -0.2);
  } else if (defeated) {
    ctx.arc(w / 2, 60, 18, 0, Math.PI);
  } else {
    ctx.moveTo(w / 2 - 18, 58);
    ctx.lineTo(w / 2 + 18, 58);
  }
  ctx.stroke();

  // Arms
  const armSwing = telegraph ? -0.4 : stagger ? 0.5 : Math.sin(frame * 0.07) * 0.25;
  ctx.save();
  ctx.translate(24, 92);
  ctx.rotate(armSwing);
  ctx.fillStyle = '#4a5d72';
  ctx.fillRect(-16, 0, 32, 72);
  ctx.restore();
  ctx.save();
  ctx.translate(w - 24, 92);
  ctx.rotate(-armSwing);
  ctx.fillStyle = '#4a5d72';
  ctx.fillRect(-16, 0, 32, 72);
  ctx.restore();

  ctx.restore();
}

function drawBossHpBar(ctx, boss, canvas) {
  const barW = 200;
  const bx = canvas.width - barW - 18;
  const by = 18;
  const ratio = boss.hp / BOSS.maxHp;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  rrPath(ctx, bx, by, barW, 18, 9);
  ctx.fill();
  if (ratio > 0) {
    ctx.fillStyle = ratio > 0.5 ? '#2dbd77' : ratio > 0.25 ? '#ffbf3c' : '#ff6b7a';
    ctx.beginPath();
    rrPath(ctx, bx, by, Math.max(8, barW * ratio), 18, 9);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx + 0.5, by + 0.5, barW - 1, 17);
  ctx.fillStyle = '#fff';
  ctx.font = '700 11px Nunito,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`OTTO ${boss.hp}/${BOSS.maxHp}`, bx + barW / 2, by + 9);
}

function drawHazards(ctx, hazards, frame, canvas) {
  hazards.forEach(h => {
    ctx.save();
    if (h.type === 'shock') {
      const alpha = Math.min(1, h.life / 12) * 0.55;
      ctx.fillStyle = `rgba(255, 120, 40, ${alpha.toFixed(2)})`;
      ctx.fillRect(h.x, h.y, h.w, h.h);
      ctx.strokeStyle = `rgba(255, 200, 80, ${(alpha + 0.2).toFixed(2)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x < h.w; x += 24) {
        const wave = Math.sin((x + frame * 8) * 0.08) * 6;
        ctx.moveTo(h.x + x, h.y + wave);
        ctx.lineTo(h.x + x + 12, h.y + 8 + wave);
      }
      ctx.stroke();
    } else if (h.type === 'bolt') {
      if (!h.canHit && h.vx != null) {
        drawBoltPathWarning(ctx, h, canvas, 0.75, frame);
      }
      if (!h.canHit) {
        ctx.globalAlpha = 0.45 + 0.35 * Math.sin(frame * 0.2);
      }
      ctx.fillStyle = h.canHit ? '#a8ffb8' : 'rgba(168, 255, 184, 0.5)';
      ctx.strokeStyle = '#2dbd77';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(h.x + h.w / 2, h.y + h.h / 2, h.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💧', h.x + h.w / 2, h.y + h.h / 2 + 5);
    } else if (h.type === 'sweep') {
      if (!h.canHit) {
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(frame * 0.22);
        ctx.fillStyle = 'rgba(255, 160, 120, 0.45)';
        ctx.fillRect(h.x, h.y, h.w, h.h);
        ctx.strokeStyle = '#ffd470';
        ctx.lineWidth = 2;
        ctx.strokeRect(h.x, h.y, h.w, h.h);
        ctx.fillStyle = '#ffd470';
        ctx.font = '18px sans-serif';
        ctx.fillText('👊', h.x + h.w / 2 - 9, h.y + h.h / 2 + 6);
      } else {
        ctx.fillStyle = 'rgba(255, 100, 80, 0.75)';
        ctx.fillRect(h.x, h.y, h.w, h.h);
        ctx.fillStyle = '#ffd470';
        ctx.font = '20px sans-serif';
        ctx.fillText('👊', h.x + h.w / 2 - 10, h.y + h.h / 2 + 7);
      }
    } else if (h.type === 'laser') {
      if (!h.canHit) {
        const pulse = 0.35 + 0.45 * Math.sin(frame * 0.28);
        ctx.fillStyle = `rgba(255, 60, 120, ${(0.15 + pulse * 0.15).toFixed(2)})`;
        ctx.fillRect(h.x, h.y, h.w, h.h);
        ctx.strokeStyle = '#ff6b7a';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(h.x + 2, h.y + 2, h.w - 4, h.h - 4);
        ctx.setLineDash([]);
      } else {
        const pulse = 0.5 + 0.5 * Math.sin(frame * 0.35);
        ctx.fillStyle = `rgba(255, 60, 120, ${(0.35 + pulse * 0.35).toFixed(2)})`;
        ctx.fillRect(h.x, h.y, h.w, h.h);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(h.x + 1, h.y + 1, h.w - 2, h.h - 2);
      }
    } else if (h.type === 'junk') {
      const cx = h.x + h.w / 2;
      if (!h.canHit) {
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(frame * 0.25);
        ctx.fillStyle = '#8a9cb5';
        ctx.fillRect(h.x, h.y, h.w, h.h);
        ctx.strokeStyle = '#ffd470';
        ctx.lineWidth = 2;
        ctx.strokeRect(h.x, h.y, h.w, h.h);
        ctx.fillStyle = '#ffd470';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⬇', cx, h.y + h.h / 2 + 5);
      } else {
        ctx.fillStyle = '#6a7d94';
        ctx.fillRect(h.x, h.y, h.w, h.h);
        ctx.strokeStyle = '#2f3d4d';
        ctx.lineWidth = 2;
        ctx.strokeRect(h.x, h.y, h.w, h.h);
      }
    }
    ctx.restore();
  });
}

export function bgLevel5(ctx, canvas, frame) {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, '#0a1020');
  g.addColorStop(0.45, '#141c32');
  g.addColorStop(1, '#1a1428');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Factory catwalk lights
  for (let i = 0; i < 6; i++) {
    const lx = 60 + i * 110;
    const flick = 0.7 + 0.3 * Math.sin(frame * 0.04 + i * 1.7);
    ctx.fillStyle = `rgba(255, 220, 120, ${(0.08 * flick).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(lx, 40 + (i % 2) * 18, 80, 0, Math.PI * 2);
    ctx.fill();
  }

  // Arena floor grate
  ctx.fillStyle = '#111820';
  ctx.fillRect(0, 448, canvas.width, canvas.height - 448);
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.25)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, 452);
    ctx.lineTo(x + 14, canvas.height);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 448);
  ctx.lineTo(canvas.width, 448);
  ctx.stroke();

  // Pit glow
  const pitG = ctx.createLinearGradient(0, 460, 0, canvas.height);
  pitG.addColorStop(0, 'rgba(255,80,40,0.15)');
  pitG.addColorStop(1, 'rgba(255,40,0,0.45)');
  ctx.fillStyle = pitG;
  ctx.fillRect(0, 460, canvas.width, canvas.height - 460);
}

export function initLevel5(state, difficulty) {
  const arena = makeLvl5Arena();
  state.l5 = {
    ...arena,
    boss: createBoss(),
    hazards: [],
    junkPatternIdx: 0,
    junkPlan: null,
    junkAttackFrame: 0,
    beamPlan: null,
    shake: 0,
    hitCooldown: 0,
  };
  const p0 = arena.platforms[0];
  state.robot.x = p0.x + 50;
  state.robot.y = p0.y - state.robot.h;
  state.robot.vy = 0;
  state.robot.jumping = false;
  state.stars = 0;
}

export function updateLevel5(state, canvas, deps) {
  const { heroes, getTimeScale, tickAbilities, getHeroBounds, triggerStarPop, endRun, updateStats, updateAbilityPill } = deps;
  if (!state.running || state.paused) return;

  state.frame++;
  tickAbilities();
  const ts = getTimeScale();
  const cfg = lvl5Cfg[state.difficulty];
  const l5 = state.l5;
  const b = l5.boss;
  const h = heroes[state.hero];
  const r = state.robot;
  const moveSpeed = cfg.moveSpeed * ts;

  if (l5.shake > 0) l5.shake--;
  if (l5.hitCooldown > 0) l5.hitCooldown--;
  if (b.hitFlash > 0) b.hitFlash--;
  b.anim++;
  b.phase = bossPhase(b);
  b.eyeSpin += 0.08;

  if (Math.random() < 0.04 && (b.mode === 'telegraph' || b.mode === 'attack')) {
    b.steam.push({ x: b.x + b.w / 2 + (Math.random() - 0.5) * 40, y: b.y + 40, r: 8 + Math.random() * 12, life: 1 });
  }
  b.steam.forEach(s => { s.y -= 0.8; s.r += 0.15; s.life -= 0.025; });
  b.steam = b.steam.filter(s => s.life > 0);

  // Boss state machine
  if (b.mode === 'intro') {
    b.timer++;
    if (b.timer >= BOSS.introFrames) {
      b.mode = 'idle';
      b.timer = BOSS.idleMin + Math.floor(Math.random() * (BOSS.idleMax - BOSS.idleMin));
    }
  } else if (b.mode === 'idle') {
    b.timer--;
    l5.junkPlan = null;
    l5.junkAttackFrame = 0;
    l5.beamPlan = null;
    if (b.timer <= 0 && !b.defeated) {
      pickAttack(b);
      b.mode = 'telegraph';
      b.timer = telegraphFrames(state.difficulty);
      b.weakOpen = false;
    }
  } else if (b.mode === 'telegraph') {
    if (b.attack === 'junk' && !l5.junkPlan) {
      l5.junkPlan = buildJunkPlan(state.difficulty, l5.junkPatternIdx);
    }
    if (b.attack === 'laser') {
      l5.beamPlan = { type: 'laser', y: 292, h: 32 };
    } else if (b.attack === 'sweep') {
      l5.beamPlan = { type: 'sweep', x: b.x - 20, y: 328, w: 90, h: 48 };
    } else if (b.attack === 'sneeze') {
      l5.beamPlan = { type: 'sneeze', bolts: getSneezeBolts(b, state.difficulty) };
    } else {
      l5.beamPlan = null;
    }
    b.timer--;
    if (b.timer <= 0) {
      b.mode = 'attack';
      spawnAttackHazards(l5, b.attack, canvas, state.difficulty);
      b.timer = b.attack === 'stomp' ? 36
        : b.attack === 'laser' ? 115
        : b.attack === 'sweep' ? 100
        : b.attack === 'sneeze' ? 90
        : b.attack === 'junk' ? 155
        : 48;
    }
  } else if (b.mode === 'attack') {
    if (b.attack === 'junk' && l5.junkPlan) {
      l5.junkAttackFrame += ts;
      l5.junkPlan.forEach(spot => {
        if (spot.spawned || l5.junkAttackFrame < spot.spawnDelay) return;
        spot.spawned = true;
        l5.hazards.push({
          type: 'junk',
          x: spot.x,
          y: -48,
          w: spot.w,
          h: spot.h,
          vy: spot.vy,
          markY: spot.markY,
          life: 340,
          canHit: false,
          warnFrames: 22,
        });
      });
    }
    b.timer--;
    if (b.timer <= 0) {
      b.mode = 'stagger';
      b.timer = staggerFrames(state.difficulty);
      b.weakOpen = true;
      l5.hazards = l5.hazards.filter(hz => hz.type !== 'shock' && hz.type !== 'laser');
    }
  } else if (b.mode === 'stagger') {
    b.timer--;
    if (b.timer <= 0) {
      b.mode = 'idle';
      b.timer = BOSS.idleMin + Math.floor(Math.random() * (BOSS.idleMax - BOSS.idleMin));
      b.weakOpen = false;
    }
  } else if (b.mode === 'defeated') {
    b.timer--;
    if (b.timer <= 0 && !state.endAnim) {
      endRun('win');
    }
  }

  // Hero movement
  if (state.keys.left) r.x -= moveSpeed;
  if (state.keys.right) r.x += moveSpeed;
  const moveBounds = getL5HeroMoveBounds(l5, r.w);
  r.x = Math.max(moveBounds.minX, Math.min(moveBounds.maxX, r.x));

  r.vy += state.currentGravity * ts;
  r.y += r.vy * ts;
  if (r.squash > 0) r.squash--;
  if (r.flash > 0) r.flash--;

  let onGround = false;
  for (const p of l5.platforms) {
    const hl = r.x + 4;
    const hr = r.x + r.w - 4;
    const heroBottom = r.y + r.h;
    const prevBottom = heroBottom - r.vy * ts;
    if (hr > p.x && hl < p.x + p.w) {
      if (prevBottom <= p.y + 4 && heroBottom >= p.y - 4 && r.vy >= 0) {
        r.y = p.y - r.h;
        r.vy = 0;
        r.jumping = false;
        r.airJumps = h.extraJumps;
        onGround = true;
        break;
      }
      if (Math.abs(heroBottom - p.y) <= 2 && r.vy >= 0) {
        r.y = p.y - r.h;
        r.vy = 0;
        r.jumping = false;
        r.airJumps = h.extraJumps;
        onGround = true;
        break;
      }
    }
  }

  // Pit death
  if (r.y + r.h > l5.pitY) {
    if (r.shieldActive) {
      r.shieldActive = false;
      r.flash = 28;
      playSFX('shield_break');
      spawnHitBurst(r.x + r.w / 2, r.y + r.h / 2);
      l5.shake = 10;
      const p0 = l5.platforms[0];
      r.x = p0.x + 50;
      r.y = p0.y - r.h;
      r.vy = 0;
      deps.updateShieldPill();
      return;
    }
    if (r.hitsLeft > 0) {
      r.hitsLeft--;
      r.flash = 24;
      playSFX('hit');
      spawnHitBurst(r.x + r.w / 2, r.y + r.h / 2);
      l5.shake = 14;
      updateAbilityPill();
      const p0 = l5.platforms[0];
      r.x = p0.x + 50;
      r.y = p0.y - r.h;
      r.vy = 0;
      return;
    }
    playSFX('lose');
    spawnHitBurst(r.x + r.w / 2, r.y + r.h / 2);
    l5.shake = 18;
    endRun('lose');
    return;
  }

  // Update hazards
  l5.hazards.forEach(hz => {
    if (hz.type === 'junk') {
      if (hz.warnFrames > 0) {
        hz.warnFrames -= ts;
        hz.y = -48;
      } else {
        hz.canHit = true;
        hz.y += hz.vy * ts;
      }
    } else if (hz.type === 'laser' || hz.type === 'sweep' || hz.type === 'bolt') {
      if (hz.warnFrames > 0) {
        hz.warnFrames -= ts;
        hz.canHit = false;
        if (hz.type === 'sweep') hz.x = l5.boss.x - 20;
      } else {
        hz.canHit = true;
        if (hz.moveVx) {
          hz.x += hz.moveVx * ts;
        } else if (hz.vx) {
          hz.x += hz.vx * ts;
        }
        if (hz.vy) hz.y += hz.vy * ts;
      }
    } else if (hz.vx) {
      hz.x += hz.vx * ts;
    } else if (hz.vy) {
      hz.y += hz.vy * ts;
    }
    if (hz.life != null) hz.life--;
  });
  l5.hazards = l5.hazards.filter(hz => hz.life == null || hz.life > 0);

  const hb = getHeroBounds();

  // Hazard collision
  for (const hz of l5.hazards) {
    if ((hz.type === 'junk' || hz.type === 'laser' || hz.type === 'sweep' || hz.type === 'bolt') && !hz.canHit) continue;
    const box = { x: hz.x, y: hz.y, w: hz.w, h: hz.h };
    if (!rectsOverlap(hb, box)) continue;
    if (hz.type === 'shock' && hb.bottom < 388) continue;

    if (r.shieldActive) {
      r.shieldActive = false;
      r.flash = 22;
      hz.life = 0;
      playSFX('shield_break');
      spawnHitBurst(hb.cx, hb.cy);
      l5.shake = 10;
      deps.updateShieldPill();
      break;
    }
    if (r.hitsLeft > 0) {
      r.hitsLeft--;
      r.flash = 20;
      hz.life = 0;
      playSFX('hit');
      spawnHitBurst(hb.cx, hb.cy);
      l5.shake = 12;
      updateAbilityPill();
      break;
    }
    playSFX('lose');
    spawnHitBurst(hb.cx, hb.cy);
    l5.shake = 18;
    endRun('lose');
    return;
  }

  // Boss weak-point hit
  if (b.weakOpen && l5.hitCooldown <= 0 && b.mode === 'stagger') {
    const wr = weakRect(b);
    if (rectsOverlap(hb, wr)) {
      const dmg = hitDamage(state.difficulty);
      const prevStars = state.stars;
      b.hp = Math.max(0, b.hp - dmg);
      state.stars = Math.min(STAR_GOAL, state.stars + dmg);
      state.score += 25 * dmg;
      for (let i = prevStars; i < state.stars; i++) triggerStarPop(i);
      playSFX('star');
      spawnStarBurst(wr.x + wr.w / 2, wr.y + wr.h / 2);
      b.hitFlash = 14;
      l5.hitCooldown = 24;
      b.weakOpen = false;
      b.mode = 'idle';
      b.timer = Math.floor(BOSS.idleMin * 0.6);
      l5.hazards = [];

      if (b.hp <= 0) {
        b.defeated = true;
        b.mode = 'defeated';
        b.timer = 90;
        playSFX('win');
      }
    }
  }

  if (b.defeated && b.mode === 'defeated' && b.timer === 90) {
    // confetti trigger handled by endRun after timer
  }

  updateStats();
  updateAbilityPill();
  deps.updateParticles();
}

export function renderLevel5(state, ctx, canvas, deps) {
  const l5 = state.l5;
  const shake = l5.shake + (state.screenShake || 0);
  ctx.save();
  if (shake > 0 && !state.reducedMotion) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake * 0.5);
  }

  bgLevel5(ctx, canvas, state.frame);
  l5.platforms.forEach(p => drawArenaPlatform(ctx, p, state.frame));
  if (l5.boss.attack === 'junk' && l5.junkPlan &&
      (l5.boss.mode === 'telegraph' || l5.boss.mode === 'attack')) {
    const alpha = l5.boss.mode === 'telegraph' ? 1 : 0.65;
    const safeZone = l5.junkPlan[0]?.safeZone;
    if (safeZone) drawSafePlatformHint(ctx, l5.platforms, safeZone, state.frame, deps.t);
    drawJunkWarnings(ctx, l5.junkPlan, state.frame, alpha);
  }
  if (l5.beamPlan && (l5.boss.mode === 'telegraph' || l5.boss.mode === 'attack')) {
    const alpha = l5.boss.mode === 'telegraph' ? 1 : 0.55;
    drawBeamWarnings(ctx, l5.beamPlan, state.frame, alpha, l5.boss, canvas, deps.t);
  }
  drawHazards(ctx, l5.hazards, state.frame, canvas);
  drawBigOtto(ctx, l5.boss, state.frame);
  drawBossHpBar(ctx, l5.boss, canvas);

  deps.drawRobot();
  deps.drawDashTrail();
  deps.drawParticles(ctx);
  deps.drawConfetti();
  deps.drawProgressBar();
  deps.drawTimeBubbleOverlay();

  if (l5.boss.mode === 'intro' && l5.boss.timer < BOSS.introFrames - 10) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '800 18px Baloo 2, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(deps.t('boss.intro'), canvas.width / 2, 56);
  }

  ctx.restore();
}
