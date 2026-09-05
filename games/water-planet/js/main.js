import { loadLang, setLang, S, LANGS, speak, primeSpeech, warmVoices, stopSpeech, lang } from './i18n.js?v=4';
import { audioCtx, beep, Music, getMuted, setMutedFlag } from './audio.js?v=3';
import {
  G, W, H, SCREEN, FADE_DUR, dlg, radio, VOL_SL,
  drawVisibleTiles, followCam, updateParticles, drawParticles,
  drawHearts, drawHintBar, drawRadio, drawDialog, drawMinimap, buildMinimap,
  drawVolumeSlider, sliderHitIcon, sliderHitTrack, sliderSetFromMouse, hitRect,
  startFade, drawFade,
} from './engine.js?v=3';
import { TILE, buildOcean, buildIsland } from './maps.js?v=3';
import { hero, resetHero, updateHeroMove, swingSword, shootArrow, updateArrows, drawAstro, drawArrowSprite, drawStarship } from './hero.js?v=3';
import { robot, resetRobot, updateRobot, tryLift, nearLiftable, liftableBlocks, drawRobot, drawLiftable } from './robot.js?v=3';
import {
  initLevel1, items1, liftables1, inv1, hint1,
  pickup1, updateEnemies1, hitEnemyArrow1, nearVortex,
  drawLetters1, drawItems1, drawEnemies1, drawBubbles,
} from './level1.js?v=3';
import {
  initLevel2, items2, liftables2, inv2, hint2,
  pickup2, updateEnemies2, hitEnemyArrow2, nearestNpc, nearWreckRepair,
  drawLetters2, drawItems2, drawEnemies2, drawNpcs2,
} from './level2.js?v=3';
import { initFlight, updateFlight, drawFlight } from './level3.js?v=3';

loadLang();
warmVoices();

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
G.canvas = canvas;
G.ctx = ctx;

let repairTick = -1;
const REPAIR_DUR = 140;
let LBY = 268;
const LBW = 62, LBH = 30, LBG = 10;
const LBX0 = (W - LANGS.length * (LBW + LBG) + LBG) / 2;

G.extraSolid = (col, row) => {
  const list = G.level === 1 ? liftables1 : G.level === 2 ? liftables2 : [];
  return liftableBlocks(col, row, list);
};

function currentLiftables() {
  return G.level === 1 ? liftables1 : G.level === 2 ? liftables2 : [];
}
function currentItems() {
  return G.level === 1 ? items1 : G.level === 2 ? items2 : [];
}

function updateTouchButtons() {
  const bowBtn = document.getElementById('bowBtn');
  const robotBtn = document.getElementById('robotBtn');
  const flightMode = G.level === 3 && G.screen === SCREEN.PLAY;
  if (bowBtn) bowBtn.hidden = flightMode || G.screen !== SCREEN.PLAY;
  if (robotBtn) {
    robotBtn.hidden = flightMode || G.screen !== SCREEN.PLAY;
    const near = nearLiftable(currentLiftables(), 48);
    robotBtn.disabled = !near && robot.lifting <= 0;
  }
}

function startLevel(n) {
  G.level = n;
  G.arrows.length = 0;
  G.particles.length = 0;
  G.idleTimer = 0;
  repairTick = -1;
  radio.reset();
  if (n === 1) {
    G.map = buildOcean();
    initLevel1();
    resetHero(6, 25);
    resetRobot(5, 25);
    Music.play('explore');
    radio.say('r_l1_start');
  } else if (n === 2) {
    G.map = buildIsland();
    initLevel2();
    resetHero(32, 40);
    resetRobot(31, 40);
    Music.play('explore');
    radio.say('r_l2_start');
  } else {
    G.map = null;
    G.cam.x = 0; G.cam.y = 0;
    initFlight();
    Music.play('flight');
  }
  if (n < 3) {
    followCam(hero.x, hero.y);
    buildMinimap(n);
  }
  updateTouchButtons();
}

function resetGame() {
  radio.reset();
  stopSpeech();
  G.arrows.length = 0;
  G.particles.length = 0;
  G.fadeTick = -1;
  G.introTick = 0;
  repairTick = -1;
  G.level = 1;
}

function beginIntro() {
  G.screen = SCREEN.INTRO;
  G.introTick = 0;
  audioCtx.resume();
  Music.play('combat');
  radio.reset();
  radio.say('r_crash');
}

function updateIntro() {
  G.introTick++;
  if (G.introTick === 90) beep(80, .3, 'sawtooth', .25);
  if (G.introTick >= 200) {
    G.screen = SCREEN.PLAY;
    startLevel(1);
  }
}

function drawIntro() {
  const t = G.introTick;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  if (t < 110) {
    sky.addColorStop(0, '#05070f');
    sky.addColorStop(1, '#1a237e');
  } else {
    sky.addColorStop(0, '#4fc3f7');
    sky.addColorStop(1, '#0d47a1');
  }
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    const sx = (i * 137.5 + 11) % W;
    const sy = (i * 83.7 + t * (t > 110 ? 3 : 0.4)) % H;
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.arc(sx, sy, 1.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const shipX = 120 + t * 1.6;
  const shipY = 180 + (t > 90 ? (t - 90) * 2.2 : Math.sin(t * 0.03) * 8);
  if (t < 170) drawStarship(ctx, shipX, shipY, 0.7, t < 90, t);
  if (t > 50 && t < 100) {
    const rx = W + 40 - (t - 50) * 10;
    const ry = 160;
    ctx.fillStyle = '#ff7043';
    ctx.beginPath(); ctx.roundRect(rx, ry, 22, 10, 3); ctx.fill();
  }
  if (t > 88 && t < 130) {
    ctx.fillStyle = `rgba(255,180,40,${1 - (t - 88) / 42})`;
    ctx.beginPath(); ctx.arc(shipX, shipY, 20 + (t - 88), 0, Math.PI * 2); ctx.fill();
  }
  if (t > 140) {
    ctx.fillStyle = `rgba(10,40,80,${Math.min(1, (t - 140) / 50)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawTitle() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0d47a1');
  sky.addColorStop(0.55, '#0277bd');
  sky.addColorStop(1, '#004d40');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = ['#ce93d8', '#81c784', '#ef9a9a', '#ffe082'][i % 4];
    const x = (i * 97) % W, y = 360 + (i % 5) * 22;
    ctx.beginPath(); ctx.ellipse(x, y, 18, 10, 0, 0, Math.PI * 2); ctx.fill();
  }
  drawStarship(ctx, W / 2 + 180, H - 120, 0.7, false, G.tick);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText(S('title_line1'), W / 2, 72);
  ctx.fillStyle = '#80deea';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(S('title_line2'), W / 2, 102);
  const btnW = 220, btnH = 50, btnX = W / 2 - btnW / 2, btnY = 158;
  const pulse = 0.88 + Math.abs(Math.sin(G.tick * 0.04)) * 0.12;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#00838f';
  ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 14); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#80deea'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 14); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText(S('btn_newgame'), W / 2, btnY + 32);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '12px sans-serif';
  ctx.fillText(S('controls'), W / 2, btnY + 72);
  ctx.textAlign = 'left';
  drawLangSelector();
}

function drawLangSelector() {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '11px sans-serif';
  ctx.fillText('langue / език / language', W / 2, LBY - 8);
  for (let i = 0; i < LANGS.length; i++) {
    const lx = LBX0 + i * (LBW + LBG), ly = LBY;
    const isOn = LANGS[i].code === lang;
    ctx.globalAlpha = isOn ? 1 : 0.55;
    ctx.fillStyle = isOn ? '#ffe082' : 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.roundRect(lx, ly, LBW, LBH, LBH / 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = isOn ? '#1a237e' : '#fff';
    ctx.font = '13px sans-serif';
    ctx.fillText(LANGS[i].label, lx + LBW / 2, ly + LBH / 2 + 5);
  }
  ctx.restore();
}

function langBtnAt(mx, my) {
  for (let i = 0; i < LANGS.length; i++) {
    const lx = LBX0 + i * (LBW + LBG);
    if (mx >= lx && mx <= lx + LBW && my >= LBY && my <= LBY + LBH) return LANGS[i].code;
  }
  return null;
}

function drawWin() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#05070f');
  sky.addColorStop(1, '#1a237e');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) {
    const sx = (i * 127.3 + 31) % W;
    const sy = ((i * 61.7 + G.tick * 3.2) % (H + 40)) - 20;
    ctx.globalAlpha = 0.3 + ((i * 13) % 10) / 18;
    ctx.fillStyle = '#fff';
    ctx.fillRect(sx, sy, 1.6, 7 + (i % 3) * 4);
  }
  ctx.globalAlpha = 1;
  const shipY = H / 2 - 40 + Math.sin(G.tick * 0.05) * 6;
  drawStarship(ctx, W / 2, shipY, 1.15, true, G.tick);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(S('win_title'), W / 2, H - 150);
  ctx.fillStyle = '#ffe082';
  ctx.font = '18px sans-serif';
  ctx.fillText(S('win_sub'), W / 2, H - 115);
  ctx.fillStyle = '#80deea';
  ctx.font = 'italic 15px sans-serif';
  ctx.fillText(S('win_tease'), W / 2, H - 85);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '15px sans-serif';
  ctx.fillText(S('win_restart'), W / 2, H - 50);
  ctx.textAlign = 'left';
}

function drawInventory() {
  const SLOT = 32, PAD = 5, GAP = 4;
  const slots = G.level === 1 ? 5 : 6;
  const PW = PAD * 2 + SLOT * Math.min(slots, 6) + GAP * (Math.min(slots, 6) - 1);
  const PH = PAD * 2 + SLOT;
  const PX = W - PW - 10, PY = 8 + 68 + 6 + 14 + 6;
  ctx.fillStyle = 'rgba(10,20,50,0.82)';
  ctx.beginPath(); ctx.roundRect(PX, PY, PW, PH, 9); ctx.fill();
  const filled = G.level === 1 ? inv1.parts : inv2.parts + (inv2.hull ? 1 : 0);
  const total = G.level === 1 ? 5 : 6;
  for (let i = 0; i < total; i++) {
    const sx = PX + PAD + i * (SLOT + GAP);
    ctx.fillStyle = i < filled ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
    ctx.beginPath(); ctx.roundRect(sx, PY + PAD, SLOT, SLOT, 6); ctx.fill();
    ctx.strokeStyle = i < filled ? '#80deea' : 'rgba(255,255,255,0.12)';
    ctx.stroke();
    if (i < filled) {
      ctx.fillStyle = '#ffee58';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(i === total - 1 && G.level === 2 ? '◆' : '✦', sx + SLOT / 2, PY + PAD + 22);
      ctx.textAlign = 'left';
    }
  }
}

function updateWorld() {
  radio.update();
  if (repairTick >= 0) {
    repairTick++;
    if (repairTick >= REPAIR_DUR) {
      startFade(3);
      repairTick = -1;
    }
    return;
  }
  if (dlg.active) {
    if (G.spaceJustPressed) dlg.advance();
    if (G.keys.KeyR) { dlg.repeat(); G.keys.KeyR = false; }
    G.spaceJustPressed = false;
    G.bowJustPressed = false;
    G.robotJustPressed = false;
    return;
  }

  G.idleTimer++;
  if (G.idleTimer === 2100) radio.say('r_idle');

  updateHeroMove();
  updateRobot();
  followCam(hero.x, hero.y);

  if (G.spaceJustPressed && !hero.attacking) {
    let talked = false;
    if (G.level === 2) {
      const npc = nearestNpc();
      if (npc) { dlg.open(npc); talked = true; }
      if (!talked && nearWreckRepair()) {
        repairTick = 0;
        Music.play('combat');
        if (!getMuted()) speak(S('speak_repair'));
        talked = true;
      }
    }
    if (!talked) swingSword();
    G.idleTimer = 0;
  }
  G.spaceJustPressed = false;

  if (G.bowJustPressed) { shootArrow(); G.idleTimer = 0; }
  G.bowJustPressed = false;

  if (G.robotJustPressed) {
    tryLift(currentLiftables());
    G.idleTimer = 0;
  }
  G.robotJustPressed = false;

  updateArrows((a) => (G.level === 1 ? hitEnemyArrow1(a) : hitEnemyArrow2(a)));

  if (G.level === 1) {
    pickup1();
    updateEnemies1();
    if (nearVortex() && G.fadeTick < 0) startFade(2);
  } else {
    pickup2();
    updateEnemies2();
  }
  updateParticles();
}

function renderWorld() {
  drawVisibleTiles(ctx, G.tick);
  if (G.level === 1) {
    drawBubbles(ctx, G.tick);
    drawLetters1(ctx, G.tick);
    drawEnemies1(ctx, G.tick);
    const wreckX = Math.round(8 * TILE - G.cam.x);
    const wreckY = Math.round(24 * TILE - G.cam.y);
    drawStarship(ctx, wreckX, wreckY, 0.42, false, G.tick);
    drawItems1(ctx, G.tick);
  } else {
    drawLetters2(ctx, G.tick);
    drawEnemies2(ctx, G.tick);
    drawNpcs2(ctx, G.tick);
    const [sx, sy] = [Math.round(32 * TILE + 20 - G.cam.x), Math.round(42 * TILE + 20 - G.cam.y)];
    drawStarship(ctx, sx, sy - 10, 0.45, repairTick >= 0, G.tick);
    drawItems2(ctx, G.tick);
  }
  for (const L of currentLiftables()) drawLiftable(ctx, L, G.tick);
  const [rsx, rsy] = [Math.round(robot.x - G.cam.x), Math.round(robot.y - G.cam.y)];
  drawRobot(ctx, rsx, rsy, G.tick);
  const [hsx, hsy] = [Math.round(hero.x - G.cam.x), Math.round(hero.y - G.cam.y)];
  drawAstro(ctx, hsx, hsy, G.tick);
  for (const a of G.arrows) {
    const [asx, asy] = [Math.round(a.wx - G.cam.x), Math.round(a.wy - G.cam.y)];
    drawArrowSprite(ctx, asx, asy, a.dir);
  }
  drawParticles(ctx);
  drawHearts(ctx, hero);
  drawInventory();
  drawHintBar(ctx, G.level === 1 ? hint1() : hint2(), G.tick);
  drawRadio(ctx, G.tick);
  drawDialog(ctx);
  drawMinimap(ctx, hero, currentItems());
  ctx.save();
  ctx.font = 'bold 11px sans-serif';
  const lLabel = S('lvl' + G.level + '_name').split('—')[0].trim();
  const llW = ctx.measureText(lLabel).width + 14;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.roundRect(8, H - 58, llW, 16, 8); ctx.fill();
  ctx.fillStyle = '#90caf9';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(lLabel, 8 + llW / 2, H - 50);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.restore();
  drawVolumeSlider(ctx);
}

function update() {
  G.tick++;
  if (G.screen === SCREEN.INTRO) { updateIntro(); return; }
  if (G.screen !== SCREEN.PLAY) return;
  if (G.fadeTick >= 0) {
    radio.update();
    G.fadeTick++;
    if (G.fadeTick === Math.floor(FADE_DUR / 2)) startLevel(G.fadeTarget);
    if (G.fadeTick > FADE_DUR) G.fadeTick = -1;
    updateTouchButtons();
    return;
  }
  if (G.level === 3) {
    radio.update();
    updateFlight();
    updateParticles();
    updateTouchButtons();
    return;
  }
  updateWorld();
  updateTouchButtons();
}

function render() {
  ctx.clearRect(0, 0, W, H);
  if (G.screen === SCREEN.TITLE) { drawTitle(); return; }
  if (G.screen === SCREEN.INTRO) { drawIntro(); return; }
  if (G.screen === SCREEN.WIN) { drawWin(); return; }
  if (G.level === 3) {
    drawFlight(ctx, G.tick);
    drawHearts(ctx, hero);
    drawHintBar(ctx, S('h3_0'), G.tick);
    drawRadio(ctx, G.tick);
    drawVolumeSlider(ctx);
  } else {
    renderWorld();
  }
  drawFade(ctx);
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

document.addEventListener('keydown', (e) => {
  G.keys[e.code] = true;
  warmVoices();
  primeSpeech();
  if (e.code === 'Space') {
    G.spaceJustPressed = true;
    e.preventDefault();
  }
  if (e.code === 'KeyX') G.bowJustPressed = true;
  if (e.code === 'KeyC') G.robotJustPressed = true;
  if ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') && e.shiftKey) {
    if (e.code === 'Digit1') { G.screen = SCREEN.PLAY; startLevel(1); }
    if (e.code === 'Digit2') { G.screen = SCREEN.PLAY; startLevel(2); }
    if (e.code === 'Digit3') { G.screen = SCREEN.PLAY; startLevel(3); }
  }
  if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') e.preventDefault();

  if (G.screen === SCREEN.TITLE && e.code === 'Space') {
    beginIntro();
    beep(440, .1, 'sine', .2);
  } else if (G.screen === SCREEN.TITLE && audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => Music.play('title'));
  }
  if (G.screen === SCREEN.TITLE && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
    const idx = LANGS.findIndex((l) => l.code === lang);
    const next = LANGS[(idx + (e.code === 'ArrowRight' ? 1 : -1) + LANGS.length) % LANGS.length].code;
    setLang(next);
    beep(520, .05, 'sine', .12);
  }
  if (G.screen === SCREEN.WIN && e.code === 'Space') {
    resetGame();
    G.screen = SCREEN.TITLE;
    Music.play('title');
  }
});
document.addEventListener('keyup', (e) => { G.keys[e.code] = false; });

function canvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const src = e.touches ? e.touches[0] : e;
  return [(src.clientX - rect.left) * (W / rect.width), (src.clientY - rect.top) * (H / rect.height)];
}

canvas.addEventListener('mousedown', (e) => {
  const [mx, my] = canvasPos(e);
  handlePointerDown(mx, my);
});
canvas.addEventListener('mousemove', (e) => {
  if (VOL_SL.dragging) {
    const [mx] = canvasPos(e);
    sliderSetFromMouse(mx);
  }
});
canvas.addEventListener('mouseup', () => { VOL_SL.dragging = false; });
canvas.addEventListener('touchstart', (e) => {
  const [mx, my] = canvasPos(e);
  handlePointerDown(mx, my);
}, { passive: true });
canvas.addEventListener('touchmove', (e) => {
  if (VOL_SL.dragging) {
    const [mx] = canvasPos(e);
    sliderSetFromMouse(mx);
  }
}, { passive: true });
canvas.addEventListener('touchend', () => { VOL_SL.dragging = false; });

function handlePointerDown(mx, my) {
  warmVoices();
  primeSpeech();
  audioCtx.resume();
  if (G.screen === SCREEN.TITLE) {
    const code = langBtnAt(mx, my);
    if (code) { setLang(code); beep(520, .05, 'sine', .12); return; }
    if (mx > W / 2 - 110 && mx < W / 2 + 110 && my > 158 && my < 208) beginIntro();
    return;
  }
  if (G.screen === SCREEN.WIN) {
    resetGame();
    G.screen = SCREEN.TITLE;
    Music.play('title');
    return;
  }
  if (G.screen === SCREEN.PLAY && sliderHitIcon(mx, my)) {
    const next = !getMuted();
    Music.setMuted(next);
    setMutedFlag(next);
    return;
  }
  if (G.screen === SCREEN.PLAY && sliderHitTrack(mx, my)) {
    VOL_SL.dragging = true;
    sliderSetFromMouse(mx);
    return;
  }
  if (dlg.active) {
    if (hitRect(mx, my, dlg._nextBtn)) dlg.advance();
    else if (hitRect(mx, my, dlg._repeatBtn)) dlg.repeat();
    else if (hitRect(mx, my, dlg._prevBtn) && dlg.idx > 0) { dlg.idx--; speak(dlg.lines[dlg.idx]); }
    return;
  }
  if (hitRect(mx, my, G.radioBtn)) radio.replay();
  if (hitRect(mx, my, G.speakBtn)) {
    const h = G.level === 1 ? hint1() : G.level === 2 ? hint2() : S('h3_0');
    if (h) speak(h);
  }
}

// Touch D-pad
(function bindTouch() {
  const pad = document.getElementById('dpad');
  const nub = document.getElementById('dpadNub');
  const DIRS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  function clearDirs() { DIRS.forEach((d) => { G.keys[d] = false; }); }
  function setFrom(e) {
    const rect = pad.getBoundingClientRect();
    const x = (e.clientX ?? e.touches[0].clientX) - rect.left - rect.width / 2;
    const y = (e.clientY ?? e.touches[0].clientY) - rect.top - rect.height / 2;
    const mag = Math.hypot(x, y);
    nub.style.transform = `translate(${Math.max(-28, Math.min(28, x * 0.35))}px, ${Math.max(-28, Math.min(28, y * 0.35))}px)`;
    clearDirs();
    if (mag < 12) return;
    let deg = Math.atan2(y, x) * 180 / Math.PI;
    if (deg < 0) deg += 360;
    if (deg >= 337.5 || deg < 22.5) G.keys.ArrowRight = true;
    else if (deg < 67.5) { G.keys.ArrowRight = true; G.keys.ArrowDown = true; }
    else if (deg < 112.5) G.keys.ArrowDown = true;
    else if (deg < 157.5) { G.keys.ArrowDown = true; G.keys.ArrowLeft = true; }
    else if (deg < 202.5) G.keys.ArrowLeft = true;
    else if (deg < 247.5) { G.keys.ArrowLeft = true; G.keys.ArrowUp = true; }
    else if (deg < 292.5) G.keys.ArrowUp = true;
    else { G.keys.ArrowUp = true; G.keys.ArrowRight = true; }
  }
  pad.addEventListener('pointerdown', (e) => { pad.setPointerCapture(e.pointerId); setFrom(e); });
  pad.addEventListener('pointermove', (e) => { if (e.buttons) setFrom(e); });
  pad.addEventListener('pointerup', () => { clearDirs(); nub.style.transform = ''; });
  pad.addEventListener('pointercancel', () => { clearDirs(); nub.style.transform = ''; });

  document.getElementById('actionBtn').addEventListener('pointerdown', (e) => {
    e.preventDefault(); warmVoices(); primeSpeech(); G.spaceJustPressed = true; G.keys.Space = true;
  });
  document.getElementById('actionBtn').addEventListener('pointerup', () => { G.keys.Space = false; });
  document.getElementById('actionBtn').addEventListener('pointercancel', () => { G.keys.Space = false; });
  document.getElementById('bowBtn').addEventListener('pointerdown', (e) => {
    e.preventDefault(); G.bowJustPressed = true;
  });
  document.getElementById('robotBtn').addEventListener('pointerdown', (e) => {
    e.preventDefault(); G.robotJustPressed = true;
  });
})();

Music.play('title');
loop();
