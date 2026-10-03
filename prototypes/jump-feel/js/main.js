/* global Phaser */
// Page shell: start/win screens, HUD, Robot radio, tuning panel, and game boot.

import { VIEW_W, VIEW_H, STARS } from './config.js';
import { loadLocale, setLocale, getLocale, t, has, applyI18n } from './i18n.js';
import { speak, stopSpeech, primeSpeech, warmVoices, setSpeechEnabled } from './speech.js';
import { unlockAudio, setMuted, sfx } from './sfx.js';
import { bindKeyboard, bindTouchButtons, setCoop, clearEdges } from './input.js';
import { tuneMeta, loadTune, setDifficulty, loadPresetValues, buildTunePanel, refreshTunePanel, tuneJSON } from './tuning.js';
import { PlayScene } from './scene.js';
import { portraitURL } from './art.js';

const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches;
const DEBUG = new URLSearchParams(location.search).has('debug');
const URGENT = new Set([
  'r_catch', 'r_catch_short', 'r_wrong', 'r_solved', 'r_fall_hard', 'r_restart_hard', 'r_coop', 'r_step',
  'goal_run', 'goal_letters', 'goal_ship',
]);

const app = { game: null, scene: null, R: 1, coop: false, muted: false, winShownAt: 0 };
window.__jumpFeel = app; // handy for poking at the scene from devtools

// ── Robot radio ─────────────────────────────────────────────────────────────

const radio = { queue: [], current: null, last: null, timer: 0 };

function resolveKey(key) {
  if (app.coop && has(`${key}_coop`)) return `${key}_coop`;
  if (isTouch && has(`${key}_touch`)) return `${key}_touch`;
  return key;
}

function say(key, ...args) {
  const text = t(resolveKey(key), ...args);
  if (URGENT.has(key)) radio.queue.length = 0;
  radio.queue.push(text);
  if (radio.queue.length > 3) radio.queue.shift();
  if (!radio.current || URGENT.has(key)) nextRadio();
}

function nextRadio() {
  clearTimeout(radio.timer);
  const box = $('radio');
  const text = radio.queue.shift();
  if (!text) {
    radio.current = null;
    box.classList.remove('show');
    return;
  }
  radio.current = text;
  radio.last = text;
  $('radioText').textContent = text;
  box.classList.remove('show');
  void box.offsetWidth;
  box.classList.add('show');
  sfx.radio();
  speak(text, t('voice'));
  radio.timer = setTimeout(nextRadio, Math.max(3200, 1100 + text.length * 62));
}

function clearRadio() {
  radio.queue.length = 0;
  radio.current = null;
  clearTimeout(radio.timer);
  $('radio').classList.remove('show');
  stopSpeech();
}

// ── HUD ─────────────────────────────────────────────────────────────────────

const HEART = '<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21C5 15.5 1 12 1 7.2 1 3.8 3.7 1.2 6.9 1.2c2 0 3.8 1 5.1 2.7 1.3-1.7 3.1-2.7 5.1-2.7C20.3 1.2 23 3.8 23 7.2 23 12 19 15.5 12 21z"/></svg>';

function currentWord() { return Array.from(t('word')); }

function renderHearts(n) {
  $('hearts').innerHTML = [0, 1, 2].map((i) => `<span class="heart${i < n ? '' : ' empty'}">${HEART}</span>`).join('');
}

function renderWord(progress) {
  $('word').innerHTML = currentWord()
    .map((ch, i) => `<span class="${i < progress ? 'done' : i === progress ? 'next' : ''}">${ch}</span>`)
    .join('');
}

const hooks = {
  ready(scene) { app.scene = scene; },
  say,
  hearts: renderHearts,
  stars(n, total) { $('starNum').textContent = n; $('starTotal').textContent = total; },
  word: renderWord,
  win: showWin,
};

function fmtTime(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function showWin(s) {
  const easy = s.difficulty === 'easy';
  const rows = [
    [t('stat_time'), fmtTime(s.time)],
    [t('stat_stars'), `${s.stars}/${STARS.length}`],
    [t('stat_steps'), s.steps],
    [easy ? t('stat_catches') : t('stat_falls'), easy ? s.catches : s.falls],
    [t('stat_wrong'), s.wrong],
  ];
  $('stats').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('winScreen').hidden = false;
  app.winShownAt = performance.now();
  clearRadio();
  speak(`${t('winTitle')} ${t('winSub')} ${t('winAsk')}`, t('voice'));
}

// ── Start screen ────────────────────────────────────────────────────────────

function renderStart() {
  applyI18n();
  document.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('on', b.dataset.lang === getLocale()));
  document.querySelectorAll('[data-diff]').forEach((b) => b.classList.toggle('on', b.dataset.diff === tuneMeta.difficulty));
  document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === (app.coop ? 'coop' : 'solo')));
  $('diffNote').textContent = t(tuneMeta.difficulty === 'easy' ? 'easyNote' : 'hardNote');
  $('controlsText').textContent = t(`controls_${app.coop ? 'coop' : 'solo'}_${isTouch ? 'touch' : 'kb'}`);
  $('btnCoop').classList.toggle('on', app.coop);
  document.body.classList.toggle('coop', app.coop);
  refreshTunePanel();
  renderWord(0);
}

function computeR() {
  const w = $('stage').clientWidth || VIEW_W;
  const dpr = window.devicePixelRatio || 1;
  const r = Math.round(((dpr * Math.max(w, 320)) / VIEW_W) * 4) / 4;
  return Math.min(2.5, Math.max(1, r));
}

function fontsReady(text) {
  if (!document.fonts) return Promise.resolve();
  const loads = Promise.all([
    document.fonts.load('800 32px "Baloo 2"', text),
    document.fonts.load('800 32px "Nunito"', text),
  ]).catch(() => {});
  return Promise.race([loads, new Promise((r) => setTimeout(r, 1500))]);
}

async function startGame() {
  if (app.booting) return;
  unlockAudio();
  primeSpeech();
  warmVoices();
  clearRadio();
  clearEdges();
  $('startScreen').hidden = true;
  $('winScreen').hidden = true;
  $('hud').hidden = false;
  $('hearts').hidden = tuneMeta.difficulty !== 'hard';
  setCoop(app.coop);
  renderWord(0);
  renderHearts(3);
  const data = { R: app.R, opts: { difficulty: tuneMeta.difficulty, coop: app.coop }, hooks, word: currentWord() };
  if (!app.game) {
    app.booting = true;
    await fontsReady(data.word.join('') + 'ASTROBUDDY');
    app.booting = false;
    app.R = computeR();
    data.R = app.R;
    app.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      width: VIEW_W * app.R,
      height: VIEW_H * app.R,
      backgroundColor: '#0f1640',
      banner: false,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: DEBUG } },
      render: { antialias: true },
      callbacks: { postBoot: (game) => game.scene.add('play', PlayScene, true, data) },
    });
  } else if (app.scene) {
    app.scene.scene.restart(data);
  }
}

function showStart() {
  clearRadio();
  $('winScreen').hidden = true;
  $('startScreen').hidden = false;
  renderStart();
}

// ── Wiring ──────────────────────────────────────────────────────────────────

function toggleCoop() {
  app.coop = !app.coop;
  setCoop(app.coop);
  document.body.classList.toggle('coop', app.coop);
  $('btnCoop').classList.toggle('on', app.coop);
  app.scene?.setCoop(app.coop);
}

function init() {
  loadLocale();
  loadTune();
  $('startHero').src = portraitURL('astro');
  $('startRobot').src = portraitURL('robot');
  $('radioFace').src = portraitURL('robotFace');
  buildTunePanel($('tuneFields'));
  renderStart();

  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => { setLocale(b.dataset.lang); renderStart(); }));
  document.querySelectorAll('[data-diff]').forEach((b) => b.addEventListener('click', () => { setDifficulty(b.dataset.diff); renderStart(); }));
  document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { app.coop = b.dataset.mode === 'coop'; renderStart(); }));
  $('btnPlay').addEventListener('click', startGame);
  $('btnAgain').addEventListener('click', startGame);
  $('btnMenu').addEventListener('click', showStart);
  $('btnWinTune').addEventListener('click', () => { $('tunePanel').hidden = false; });
  $('btnGoal').addEventListener('click', () => { if (app.scene) say(app.scene.goalKey(), currentWord().join('')); });
  $('btnCoop').addEventListener('click', toggleCoop);
  $('btnMute').addEventListener('click', () => {
    app.muted = !app.muted;
    setMuted(app.muted);
    setSpeechEnabled(!app.muted);
    $('btnMute').classList.toggle('on', app.muted);
    $('btnMute').textContent = app.muted ? '🔇' : '🔊';
  });
  $('btnTune').addEventListener('click', () => { $('tunePanel').hidden = !$('tunePanel').hidden; });
  $('btnRestart').addEventListener('click', startGame);
  $('tuneClose').addEventListener('click', () => { $('tunePanel').hidden = true; });
  $('tuneEasy').addEventListener('click', () => loadPresetValues('easy'));
  $('tuneHard').addEventListener('click', () => loadPresetValues('hard'));
  $('tuneCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(tuneJSON()); } catch {}
    $('tuneCopy').textContent = t('tuneCopied');
    setTimeout(() => { $('tuneCopy').textContent = t('tuneCopy'); }, 1400);
  });
  $('radioReplay').addEventListener('click', () => { if (radio.last) speak(radio.last, t('voice')); });

  // Buttons never keep focus, so Space always means "jump", not "click the last button".
  document.addEventListener('click', (e) => { e.target.closest?.('button')?.blur(); });

  bindKeyboard((e) => {
    if (e.code !== 'Space' && e.code !== 'Enter') return;
    if (!$('startScreen').hidden) startGame();
    else if (!$('winScreen').hidden && performance.now() - app.winShownAt > 900) startGame();
  });
  bindTouchButtons($('touch'), () => { unlockAudio(); primeSpeech(); });
}

init();
