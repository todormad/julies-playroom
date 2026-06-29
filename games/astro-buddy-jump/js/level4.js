import { lvl4Cfg, makeLvl4World, STAR_GOAL, SCORE } from './config.js?v=48';
import { playSFX } from './audio.js?v=48';
import { spawnStarBurst, spawnHitBurst } from './particles.js?v=48';

const CRACK_STAGE1 = 28;
const CRACK_STAGE2 = 55;
const CRACK_BREAK = 80;
const CRACK_SINK_FRAMES = 22;
const SLIDE_MAX = 0.72;
const SLIDE_SCALE = 0.52;
const WIND_CYCLE = 320;
const WIND_WARN = 55;
const WIND_DURATION = 85;

function platformSurfaceY(p) {
  return p.y + (p.sinkOffset || 0);
}

function getCrackStage(p) {
  if (p.fallen) return 4;
  if (p.sinking) return 3;
  const t = p.crackT || 0;
  if (t >= CRACK_STAGE2) return 2;
  if (t >= CRACK_STAGE1) return 1;
  return 0;
}

function getWorldW(l4) {
  const last = l4.plats[l4.plats.length - 1];
  return last ? last.x + last.w + 80 : 4000;
}

function rrPath(ctx, x, y, w, h, rad) {
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function initLevel4(state, difficulty) {
  const world = makeLvl4World(difficulty);
  state.l4 = {
    ...world,
    camX: 0,
    slideVx: 0,
    onIce: false,
    snowflakes: [],
    wind: { phase: 0, dir: 1, active: false, warn: false },
    icicles: [],
    nextIcicleFrame: 180 + Math.floor(Math.random() * 120),
    icicleIdx: 0,
  };
  for (let i = 0; i < 40; i++) {
    state.l4.snowflakes.push({
      x: Math.random() * 900,
      y: Math.random() * 520,
      r: 0.8 + Math.random() * 2.2,
      vy: 0.4 + Math.random() * 1.2,
      vx: (Math.random() - 0.5) * 0.4,
    });
  }
  const p0 = world.plats[0];
  state.robot.x = p0.x + 40;
  state.robot.y = p0.y - state.robot.h;
  state.robot.vy = 0;
  state.robot.jumping = false;
  state.stars = 0;
}

function scheduleIcicle(l4, heroX, difficulty) {
  const ahead = l4.plats.filter(p => p.x > heroX - 100 && p.x < heroX + 520 && !p.fallen && !p.sinking);
  if (!ahead.length) return;
  const p = ahead[l4.icicleIdx % ahead.length];
  l4.icicleIdx++;
  const warn = difficulty === 'easy' ? 48 : 36;
  l4.icicles.push({
    x: p.x + p.w * 0.35 + Math.random() * p.w * 0.3,
    y: -40,
    w: 22,
    h: 28,
    vy: difficulty === 'easy' ? 2.4 : 3.2,
    markY: p.y - 8,
    warnFrames: warn,
    canHit: false,
    life: 220,
  });
  playSFX('beam_warn');
}

function updateWind(l4, ts, hardMode) {
  if (!hardMode) {
    l4.wind.warn = false;
    l4.wind.active = false;
    return;
  }
  l4.wind.phase += ts;
  const cycle = l4.wind.phase % WIND_CYCLE;
  l4.wind.warn = cycle >= WIND_CYCLE - WIND_WARN && cycle < WIND_CYCLE - WIND_WARN + WIND_DURATION * 0.35;
  l4.wind.active = cycle >= WIND_CYCLE - WIND_DURATION;
  if (l4.wind.active && Math.floor(cycle) % 90 === 0) {
    l4.wind.dir = Math.random() < 0.5 ? -1 : 1;
  }
}

export function updateLevel4(state, canvas, deps) {
  const {
    heroes, getTimeScale, tickAbilities, triggerStarPop, endRun,
    updateStats, updateAbilityPill, updateShieldPill, updateParticles,
  } = deps;
  if (!state.running || state.paused) return;

  state.frame++;
  state.score += SCORE.perFrame;
  tickAbilities();
  const ts = getTimeScale();
  const cfg = lvl4Cfg[state.difficulty];
  const l4 = state.l4;
  const r = state.robot;
  const h = heroes[state.hero];
  const moveSpeed = cfg.moveSpeed * ts;

  updateWind(l4, ts, state.difficulty === 'hard');

  r.vy += state.currentGravity * ts;
  r.y += r.vy * ts;
  if (r.squash > 0) r.squash--;
  if (r.flash > 0) r.flash--;

  let onGround = false;
  let stoodPlatform = null;
  l4.onIce = false;

  for (const p of l4.plats) {
    if (p.fallen) continue;
    if (p.sinking) {
      p.sinkT = (p.sinkT || 0) + ts;
      p.sinkOffset = Math.min(90, (p.sinkT / CRACK_SINK_FRAMES) * 90);
      if (p.sinkT >= CRACK_SINK_FRAMES) p.fallen = true;
    }
    const py = platformSurfaceY(p);
    const hl = r.x + 4;
    const hr = r.x + r.w - 4;
    const heroBottom = r.y + r.h;
    const prevBottom = heroBottom - r.vy * ts;
    if (hr > p.x && hl < p.x + p.w) {
      if (prevBottom <= py + 4 && heroBottom >= py - 4 && r.vy >= 0) {
        r.y = py - r.h;
        r.vy = p.sinking ? 2.2 * ts : 0;
        r.jumping = false;
        r.airJumps = h.extraJumps;
        onGround = true;
        stoodPlatform = p;
        if (p.ice) l4.onIce = true;
        break;
      }
      if (Math.abs(heroBottom - py) <= 2 && r.vy >= 0) {
        r.y = py - r.h;
        r.vy = p.sinking ? 2.2 * ts : 0;
        r.jumping = false;
        r.airJumps = h.extraJumps;
        onGround = true;
        stoodPlatform = p;
        if (p.ice) l4.onIce = true;
        break;
      }
    }
  }

  // Ice: responsive control while keys held; short coast when released
  if (l4.onIce && onGround) {
    if (state.keys.left) {
      r.x -= moveSpeed * 0.94;
      l4.slideVx = Math.max(l4.slideVx - cfg.iceAccel * 0.4 * ts, -SLIDE_MAX);
    } else if (state.keys.right) {
      r.x += moveSpeed * 0.94;
      l4.slideVx = Math.min(l4.slideVx + cfg.iceAccel * 0.4 * ts, SLIDE_MAX);
    } else {
      l4.slideVx *= Math.pow(cfg.iceFriction, ts);
      if (Math.abs(l4.slideVx) > 0.04) r.x += l4.slideVx * moveSpeed * SLIDE_SCALE;
      else l4.slideVx = 0;
    }
  } else {
    l4.slideVx = 0;
    if (state.keys.left) r.x -= moveSpeed;
    if (state.keys.right) r.x += moveSpeed;
  }

  if (l4.wind.active && state.difficulty === 'hard') {
    r.x += l4.wind.dir * 2.6 * ts;
  }

  if (stoodPlatform?.crack && onGround && !stoodPlatform.sinking) {
    stoodPlatform.crackT = (stoodPlatform.crackT || 0) + ts;
    if (stoodPlatform.crackT >= CRACK_BREAK) {
      stoodPlatform.sinking = true;
      stoodPlatform.sinkT = 0;
      stoodPlatform.sinkOffset = 0;
      playSFX('hit');
    }
  } else if (stoodPlatform?.crack && !stoodPlatform.sinking) {
    stoodPlatform.crackT = Math.max(0, (stoodPlatform.crackT || 0) - ts * 0.45);
  }

  const worldW = getWorldW(l4);
  if (r.x < 4) { r.x = 4; l4.slideVx = 0; }
  if (r.x + r.w > worldW) { r.x = worldW - r.w; l4.slideVx = 0; }

  const targetCam = r.x - canvas.width * 0.35;
  l4.camX = Math.max(0, Math.min(worldW - canvas.width, targetCam));

  if (r.y > l4.pitY) {
    if (r.shieldActive) {
      r.shieldActive = false;
      r.flash = 28;
      playSFX('shield_break');
      spawnHitBurst(r.x + r.w / 2, r.y + r.h / 2);
      const nearest = l4.plats.find(p => !p.fallen) || l4.plats[0];
      r.x = nearest.x + nearest.w / 2 - r.w / 2;
      r.y = nearest.y - r.h;
      r.vy = 0;
      l4.slideVx = 0;
      updateShieldPill();
      return;
    }
    if (r.hitsLeft > 0) {
      r.hitsLeft--;
      r.flash = 24;
      playSFX('hit');
      spawnHitBurst(r.x + r.w / 2, r.y + r.h / 2);
      updateAbilityPill();
      const nearest = l4.plats.find(p => !p.fallen) || l4.plats[0];
      r.x = nearest.x + nearest.w / 2 - r.w / 2;
      r.y = nearest.y - r.h;
      r.vy = 0;
      l4.slideVx = 0;
      return;
    }
    playSFX('lose');
    spawnHitBurst(r.x + r.w / 2, r.y + r.h / 2);
    endRun('lose', { pit: true });
    return;
  }

  if (state.frame >= l4.nextIcicleFrame) {
    scheduleIcicle(l4, r.x, state.difficulty);
    l4.nextIcicleFrame = state.frame + (state.difficulty === 'easy' ? 200 : 150) + Math.floor(Math.random() * 80);
  }

  l4.icicles.forEach(ic => {
    if (ic.warnFrames > 0) {
      ic.warnFrames -= ts;
      ic.y = -40;
    } else {
      ic.canHit = true;
      ic.y += ic.vy * ts;
    }
    ic.life -= ts;
  });
  l4.icicles = l4.icicles.filter(ic => ic.life > 0 && ic.y < l4.pitY + 40);

  const hb = {
    left: r.x + 4,
    right: r.x + r.w - 4,
    top: r.y,
    bottom: r.y + r.h,
    cx: r.x + r.w / 2,
    cy: r.y + r.h / 2,
  };

  for (const ic of l4.icicles) {
    if (!ic.canHit) continue;
    if (hb.right > ic.x && hb.left < ic.x + ic.w && hb.bottom > ic.y && hb.top < ic.y + ic.h) {
      if (r.shieldActive) {
        r.shieldActive = false;
        r.flash = 22;
        ic.life = 0;
        playSFX('shield_break');
        spawnHitBurst(hb.cx, hb.cy);
        updateShieldPill();
        break;
      }
      if (r.hitsLeft > 0) {
        r.hitsLeft--;
        r.flash = 20;
        ic.life = 0;
        playSFX('hit');
        spawnHitBurst(hb.cx, hb.cy);
        updateAbilityPill();
        break;
      }
      playSFX('lose');
      spawnHitBurst(hb.cx, hb.cy);
      endRun('lose');
      return;
    }
  }

  for (const s of l4.stars) {
    if (s.taken) continue;
    const dx = r.x + r.w / 2 - s.x;
    const dy = r.y + r.h / 2 - s.y;
    if (Math.sqrt(dx * dx + dy * dy) < 34) {
      s.taken = true;
      triggerStarPop(state.stars);
      state.stars++;
      state.score += SCORE.perStar;
      playSFX('star');
      spawnStarBurst(s.x - l4.camX, s.y);
      if (state.stars >= STAR_GOAL) {
        endRun('win');
        return;
      }
    }
  }

  l4.snowflakes.forEach(f => {
    const snowWind = l4.wind.active
      ? l4.wind.dir * 0.8
      : (l4.wind.warn ? l4.wind.dir * 0.28 : 0);
    f.x += (f.vx + snowWind) * ts;
    f.y += f.vy * ts;
    if (f.y > 530) { f.y = -4; f.x = Math.random() * canvas.width; }
    if (f.x < -10) f.x = canvas.width + 10;
    if (f.x > canvas.width + 10) f.x = -10;
  });

  updateParticles();
  updateStats();
  updateAbilityPill();
}

function drawCrackOverlay(ctx, sx, top, w, stage, frame) {
  const pulse = 0.65 + 0.35 * Math.sin(frame * 0.14);
  if (stage === 0) {
    ctx.strokeStyle = `rgba(40,80,120,${(0.55 + pulse * 0.15).toFixed(2)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx + w * 0.12, top + 2);
    ctx.lineTo(sx + w * 0.38, top + 7);
    ctx.lineTo(sx + w * 0.62, top + 3);
    ctx.lineTo(sx + w * 0.88, top + 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + w * 0.45, top + 5);
    ctx.lineTo(sx + w * 0.52, top + 14);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,180,80,${(0.5 + pulse * 0.2).toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(sx + 2, top - 2, w - 4, 5);
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(255,200,120,${(0.7 * pulse).toFixed(2)})`;
    ctx.font = '700 11px Nunito,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠', sx + w / 2, top - 8);
  } else if (stage === 1) {
    ctx.strokeStyle = `rgba(50,100,150,${(0.45 * pulse).toFixed(2)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx + w * 0.15, top + 3);
    ctx.lineTo(sx + w * 0.42, top + 8);
    ctx.lineTo(sx + w * 0.68, top + 4);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,200,100,${(0.25 * pulse).toFixed(2)})`;
    ctx.font = '700 10px Nunito,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', sx + w / 2, top - 6);
  } else if (stage >= 2) {
    ctx.strokeStyle = `rgba(30,60,100,${(0.55 + pulse * 0.25).toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + w * 0.1, top + 2);
    ctx.lineTo(sx + w * 0.35, top + 10);
    ctx.lineTo(sx + w * 0.55, top + 4);
    ctx.lineTo(sx + w * 0.78, top + 11);
    ctx.lineTo(sx + w * 0.92, top + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + w * 0.4, top + 8);
    ctx.lineTo(sx + w * 0.48, top + 22);
    ctx.lineTo(sx + w * 0.62, top + 14);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,100,70,${(0.35 + pulse * 0.2).toFixed(2)})`;
    ctx.fillRect(sx, top - 3, w, 5);
    ctx.fillStyle = '#fff';
    ctx.font = '700 10px Nunito,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠', sx + w / 2, top - 7);
  }
  if (stage === 3) {
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 4; i++) {
      const fx = sx + w * (0.2 + i * 0.2);
      ctx.fillStyle = '#8ec8e8';
      ctx.fillRect(fx, top + 12 + (frame % 8), 6, 6);
    }
    ctx.globalAlpha = 1;
  }
}

function drawIcePlatform(ctx, p, camX, frame) {
  if (p.fallen) return;
  const sx = p.x - camX;
  if (sx + p.w < -20 || sx > 720) return;
  ctx.save();
  const ice = p.ice !== false;
  const top = platformSurfaceY(p);
  const bodyH = 520 - top;
  const stage = getCrackStage(p);

  if (ice) {
    const g = ctx.createLinearGradient(sx, top, sx, top + bodyH);
    if (stage >= 2) {
      g.addColorStop(0, '#a8d0e8');
      g.addColorStop(0.15, '#7ab0d0');
    } else {
      g.addColorStop(0, '#c8e8ff');
      g.addColorStop(0.15, '#8ec8e8');
    }
    g.addColorStop(1, '#3a6888');
    ctx.fillStyle = g;
  } else {
    const g = ctx.createLinearGradient(sx, top, sx, top + bodyH);
    g.addColorStop(0, '#6a7888');
    g.addColorStop(1, '#2a3440');
    ctx.fillStyle = g;
  }
  ctx.beginPath();
  rrPath(ctx, sx, top, p.w, bodyH, 6);
  ctx.fill();

  ctx.strokeStyle = ice ? 'rgba(200,240,255,0.55)' : 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx + 4, top + 1);
  ctx.lineTo(sx + p.w - 4, top + 1);
  ctx.stroke();

  if (p.crack) {
    drawCrackOverlay(ctx, sx, top, p.w, stage, frame);
  }
  ctx.restore();
}

function drawWindStreaks(ctx, canvas, l4, frame) {
  if (!l4.wind.warn && !l4.wind.active) return;
  const dir = l4.wind.dir;
  const strength = l4.wind.active ? 1 : 0.45;
  const scroll = (frame * (l4.wind.active ? 6 : 2)) % 120;

  ctx.save();
  ctx.globalAlpha = strength * 0.55;
  ctx.strokeStyle = 'rgba(200,235,255,0.75)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const y = 40 + i * 34 + (i % 3) * 8;
    const len = 50 + (i % 4) * 22;
    const x = dir < 0
      ? canvas.width - ((scroll + i * 47) % (canvas.width + len))
      : ((scroll + i * 47) % (canvas.width + len)) - len;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dir * len, y + (i % 2 ? 2 : -2));
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  const edgeX = dir < 0 ? canvas.width - 36 : 36;
  const pulse = 0.6 + 0.4 * Math.sin(frame * 0.18);
  ctx.globalAlpha = strength * pulse;
  ctx.fillStyle = 'rgba(168,216,255,0.35)';
  ctx.fillRect(dir < 0 ? canvas.width - 48 : 0, 0, 48, canvas.height);
  ctx.fillStyle = '#dff4ff';
  ctx.font = '700 28px Nunito,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(dir < 0 ? '←' : '→', edgeX, canvas.height * 0.38);
  ctx.font = '700 22px Nunito,sans-serif';
  ctx.fillText(dir < 0 ? '←' : '→', edgeX, canvas.height * 0.52);
  ctx.restore();
}

function drawWindHint(ctx, canvas, l4, tr, frame) {
  if (!l4.wind.warn && !l4.wind.active) return;

  drawWindStreaks(ctx, canvas, l4, frame);

  ctx.save();
  const alpha = l4.wind.active ? 0.92 : 0.65 + 0.25 * Math.sin(frame * 0.12);
  ctx.globalAlpha = alpha;

  const bannerW = 168;
  const bx = canvas.width / 2 - bannerW / 2;
  ctx.fillStyle = l4.wind.active ? 'rgba(80,140,200,0.88)' : 'rgba(60,100,150,0.75)';
  ctx.beginPath();
  rrPath(ctx, bx, 28, bannerW, 32, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,240,255,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = '700 14px Nunito,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const arrow = l4.wind.dir < 0 ? '← ' : '→ ';
  const label = l4.wind.active ? tr('ice.wind') : tr('ice.windSoon');
  ctx.fillText(arrow + label, canvas.width / 2, 44);
  ctx.restore();
}

export function bgLevel4(ctx, canvas, frame) {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, '#0a1428');
  g.addColorStop(0.35, '#142840');
  g.addColorStop(0.7, '#1a3050');
  g.addColorStop(1, '#0e1828');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 3; i++) {
    const ag = ctx.createLinearGradient(0, 40 + i * 30, canvas.width, 120 + i * 40);
    ag.addColorStop(0, 'rgba(80,255,180,0)');
    ag.addColorStop(0.5, `rgba(${60 + i * 40},200,255,${(0.08 + 0.04 * Math.sin(frame * 0.02 + i)).toFixed(2)})`);
    ag.addColorStop(1, 'rgba(120,80,255,0)');
    ctx.fillStyle = ag;
    ctx.fillRect(0, 30 + i * 25, canvas.width, 80);
  }

  ctx.fillStyle = '#1a2840';
  for (let i = 0; i < 5; i++) {
    const px = (i * 200 - (frame * 0.15) % 1000);
    ctx.beginPath();
    ctx.moveTo(px, canvas.height);
    ctx.lineTo(px + 60, canvas.height - 90 - i * 15);
    ctx.lineTo(px + 120, canvas.height);
    ctx.fill();
  }
}

export function renderLevel4(state, ctx, canvas, deps) {
  const l4 = state.l4;
  const camX = l4.camX;
  const shake = state.screenShake || 0;
  ctx.save();
  if (shake > 0 && !state.reducedMotion) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake * 0.5);
  }

  bgLevel4(ctx, canvas, state.frame);

  const pitG = ctx.createLinearGradient(0, l4.pitY - 40, 0, canvas.height);
  pitG.addColorStop(0, 'rgba(10,20,40,0)');
  pitG.addColorStop(0.3, 'rgba(20,40,80,0.5)');
  pitG.addColorStop(1, 'rgba(5,10,25,0.95)');
  ctx.fillStyle = pitG;
  ctx.fillRect(0, l4.pitY - 20, canvas.width, canvas.height - l4.pitY + 20);

  l4.plats.forEach(p => drawIcePlatform(ctx, p, camX, state.frame));

  l4.stars.forEach(s => {
    if (s.taken) return;
    const sx = s.x - camX;
    if (sx < -30 || sx > canvas.width + 30) return;
    const bob = Math.sin(state.frame * 0.08 + s.x * 0.01) * 4;
    ctx.save();
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⭐', sx, s.y + bob);
    ctx.restore();
  });

  l4.icicles.forEach(ic => {
    const sx = ic.x - camX;
    if (sx < -40 || sx > canvas.width + 40) return;
    ctx.save();
    if (!ic.canHit) {
      const pulse = 0.45 + 0.55 * Math.sin(state.frame * 0.18);
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#a8d8ff';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx + ic.w / 2, 20);
      ctx.lineTo(sx + ic.w / 2, ic.markY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffbf3c';
      ctx.font = '700 16px Nunito,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠', sx + ic.w / 2, 28);
    } else {
      ctx.fillStyle = '#b8e4ff';
      ctx.beginPath();
      ctx.moveTo(sx + ic.w / 2, ic.y + ic.h);
      ctx.lineTo(sx, ic.y + 6);
      ctx.lineTo(sx + ic.w, ic.y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#6a9cb8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  });

  l4.snowflakes.forEach(f => {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
  });

  drawWindHint(ctx, canvas, l4, deps.t, state.frame);

  deps.drawRobot();
  deps.drawDashTrail();
  deps.drawParticles(ctx);
  deps.drawConfetti();
  deps.drawProgressBar();
  deps.drawTimeBubbleOverlay();

  ctx.restore();
}
