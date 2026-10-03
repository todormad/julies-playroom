/* global Phaser */
// Page shell: start/menu screen, HUD, speech bubbles, tuning panel, saving and
// travelling between levels.

import { VIEW_W, VIEW_H, FRIENDS, POWERS } from './config.js';
import { loadLocale, setLocale, getLocale, t, has, applyI18n, speakerOf } from './i18n.js';
import { speak, stopSpeech, primeSpeech, warmVoices, setSpeechEnabled } from './speech.js';
import { unlockAudio, setMuted, sfx } from './sfx.js';
import { loadVoices, prefetchVoices, playVoice, stopVoice, setVoiceEnabled } from './voice.js';
import { bindKeyboard, bindTouchButtons, setCoop, clearEdges } from './input.js';
import { tuneMeta, loadTune, setDifficulty, loadPresetValues, buildTunePanel, refreshTunePanel, tuneJSON } from './tuning.js';
import { save, loadSave, hasSave, resetSave, totalStars } from './save.js';
import { LEVELS } from './levels/index.js';
import { LevelScene } from './game/scene.js';
import { portraitURL } from './art/index.js';

const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches;
const DEBUG = new URLSearchParams(location.search).has('debug');
// Lines that cut in front of whatever the Robot is saying (every goal line g_* too).
const URGENT = new Set([
  'r_catch', 'r_catch_short', 'r_wrong', 'r_fall_hard', 'r_out_of_hearts', 'r_coop', 'r_step', 'r_hold',
  'r_ouch', 'r_no_dash', 'r_hot', 'r_hot_hard', 'r_no_power', 'r_release',
]);
const isUrgent = (key) => URGENT.has(key) || key.startsWith('g_');

const app = {
  game: null, scene: null, R: 1, muted: false, booting: false, menuOpen: false, needRestart: false,
  opts: { difficulty: 'easy', coop: false },
};
window.__missingFriends = app; // handy for poking at the scene from devtools
// devtools: __missingFriends.go('woods2', 'fromWoods1') jumps straight to a level
app.go = (levelId, entry) => { unlockAudio(); closeMenu(); startLevel(levelId, entry || Object.keys(LEVELS[levelId].entries)[0]); };

const FACES = {};

// ── Speech bubble ───────────────────────────────────────────────────────────

const radio = { queue: [], current: null, last: null, timer: 0 };

function resolveKey(key) {
  if (app.opts.coop && has(`${key}_coop`)) return `${key}_coop`;
  if (isTouch && has(`${key}_touch`)) return `${key}_touch`;
  return key;
}

function say(key, opts = {}) {
  const line = resolveKey(key);
  const args = opts.args || [];
  const item = { key: line, args, text: t(line, ...args), who: opts.who || speakerOf(key) || 'robot', resolve: null };
  const done = opts.wait ? new Promise((res) => { item.resolve = res; }) : undefined;
  const urgent = isUrgent(key);
  if (urgent) { for (const q of radio.queue) q.resolve?.(); radio.queue.length = 0; }
  radio.queue.push(item);
  while (radio.queue.length > 4) radio.queue.shift().resolve?.();
  if (!radio.current || urgent) nextRadio();
  return done;
}

const readMs = (text) => Math.max(2600, 900 + text.length * 58);

// Recorded voiceover when there is a clip for the line, the browser voice otherwise.
// A clip keeps its bubble up until it has finished.
let voiceToken = 0;
async function voiceLine(item) {
  const token = ++voiceToken;
  stopSpeech();
  const dur = await playVoice(getLocale(), item.key, item.args, item.text);
  if (token !== voiceToken) return;
  if (dur === null) { speak(item.text, t('voice')); return; }
  if (dur && radio.current === item) {
    clearTimeout(radio.timer);
    radio.timer = setTimeout(nextRadio, Math.max(readMs(item.text), dur * 1000 + 600));
  }
}

function nextRadio() {
  clearTimeout(radio.timer);
  voiceToken++;
  stopVoice();
  radio.current?.resolve?.();
  const box = $('radio');
  const item = radio.queue.shift();
  if (!item) {
    radio.current = null;
    box.classList.remove('show');
    return;
  }
  radio.current = item;
  radio.last = item;
  const base = item.who.split('_')[0];  // 'otto_sad' → Otto, with the sad face
  $('radioText').textContent = item.text;
  $('radioName').textContent = t(`who_${base}`);
  $('radioFace').src = FACES[item.who] || FACES[base];
  box.dataset.who = base;
  box.classList.remove('show');
  void box.offsetWidth;
  box.classList.add('show');
  sfx.radio();
  radio.timer = setTimeout(nextRadio, readMs(item.text));
  voiceLine(item);
}

function clearRadio() {
  for (const q of radio.queue) q.resolve?.();
  radio.queue.length = 0;
  radio.current?.resolve?.();
  radio.current = null;
  clearTimeout(radio.timer);
  $('radio').classList.remove('show');
  voiceToken++;
  stopVoice();
  stopSpeech();
}

// ── HUD ─────────────────────────────────────────────────────────────────────

const HEART = '<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21C5 15.5 1 12 1 7.2 1 3.8 3.7 1.2 6.9 1.2c2 0 3.8 1 5.1 2.7 1.3-1.7 3.1-2.7 5.1-2.7C20.3 1.2 23 3.8 23 7.2 23 12 19 15.5 12 21z"/></svg>';

function renderHearts(n) {
  $('hearts').innerHTML = [0, 1, 2].map((i) => `<span class="heart${i < n ? '' : ' empty'}">${HEART}</span>`).join('');
}

function renderWord(progress) {
  const box = $('word');
  const scene = app.scene;
  if (progress === null || !scene || !scene.word.length) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = scene.word
    .map((ch, i) => `<span class="${i < progress ? 'done' : i === progress ? 'next' : ''}">${ch}</span>`)
    .join('');
}

// The friends row doubles as the power picker: tap a rescued friend to put their power on X / ★.
function renderFriends() {
  const power = app.scene?.currentPower() ?? (save.power && save.rescued[FRIENDS.find((f) => POWERS[f] === save.power)] ? save.power : null);
  $('friends').innerHTML = FRIENDS.map((f, i) => {
    const found = save.rescued[f];
    const on = found && POWERS[f] === power;
    const label = `${i + 1} · ${t(`who_${f}`)}${found ? ` — ${t(`power_${POWERS[f]}`)}` : ''}`;
    return `<button type="button" tabindex="-1" class="friend${found ? ' found' : ''}${on ? ' on' : ''}" data-friend="${f}" title="${label}" aria-label="${label}"${found ? '' : ' disabled'}><img src="${found ? FACES[`${f}_happy`] : FACES[`${f}_sad`]}" alt=""></button>`;
  }).join('');
  const any = FRIENDS.some((f) => save.rescued[f]);
  document.body.classList.toggle('has-power', any);
  document.body.dataset.power = power || '';
}

function pickFriend(f) {
  if (!save.rescued[f] || !app.scene || app.scene.inCutscene) return;
  app.scene.selectPower(POWERS[f]);
}

function toast(key, ...args) {
  const el = $('toast');
  el.textContent = t(key, ...args);
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

function showTitle(key) {
  const el = $('levelTitle');
  el.textContent = t(key);
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

const hooks = {
  ready(scene) { app.scene = scene; },
  say,
  hearts: renderHearts,
  stars(n, total) { $('starNum').textContent = n; $('starTotal').textContent = total; },
  word: renderWord,
  friends: renderFriends,
  power: renderFriends,
  toast,
  levelName: showTitle,
  travel(to, entry) { startLevel(to, entry); },
  ending: showEnding,
  ask: showQuestion,
};

// ── Yes / no question (before taking a rocket or entering the tower) ────────

const question = { open: false, yes: null, no: null };

function showQuestion({ key, face, yes, no }) {
  question.open = true;
  question.yes = yes;
  question.no = no;
  clearRadio();
  app.scene?.scene.pause();
  applyI18n($('question'));
  $('qText').textContent = t(key);
  $('qRobot').src = FACES.robot;
  $('qFace').hidden = !face;
  if (face) $('qFace').src = FACES[face] || FACES[face.split('_')[0]];
  $('question').hidden = false;
  voiceLine({ key, args: [], text: t(key), who: 'robot' });
}

function answer(yes) {
  if (!question.open) return;
  question.open = false;
  $('question').hidden = true;
  voiceToken++;
  stopVoice();
  stopSpeech();
  clearEdges();
  app.scene?.scene.resume();
  (yes ? question.yes : question.no)?.();
}

function showEnding() {
  const { got, all } = totalStars(LEVELS);
  $('endStars').textContent = t('end_stars', got, all);
  $('endMore').textContent = t(got >= all ? 'end_all' : 'end_more');
  $('ending').hidden = false;
  sfx.win();
}

// ── Start / menu screen ─────────────────────────────────────────────────────

function renderMenu() {
  applyI18n();
  document.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('on', b.dataset.lang === getLocale()));
  document.querySelectorAll('[data-diff]').forEach((b) => b.classList.toggle('on', b.dataset.diff === tuneMeta.difficulty));
  document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === (app.opts.coop ? 'coop' : 'solo')));
  $('diffNote').textContent = t(tuneMeta.difficulty === 'easy' ? 'easyNote' : 'hardNote');
  $('controlsText').textContent = t(`controls_${app.opts.coop ? 'coop' : 'solo'}_${isTouch ? 'touch' : 'kb'}`);
  $('btnCoop').classList.toggle('on', app.opts.coop);
  document.body.classList.toggle('coop', app.opts.coop);
  const resumable = !!app.scene || hasSave();
  $('btnContinue').hidden = !resumable;
  $('btnNew').classList.toggle('play', !resumable);
  $('btnNew').classList.toggle('ghost', resumable);
  refreshTunePanel();
  renderFriends();
}

function openMenu() {
  app.menuOpen = true;
  if (app.scene?.sys.isActive()) app.scene.scene.pause();
  clearRadio();
  $('menu').hidden = false;
  renderMenu();
}

function closeMenu() {
  app.menuOpen = false;
  $('menu').hidden = true;
  $('hud').hidden = false;
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

function levelData(levelId, entry) {
  const L = LEVELS[levelId];
  return {
    R: app.R, hooks, opts: app.opts, levelId, entry,
    word: L.letters ? Array.from(t(L.letters.word)) : [],
    banner: t('banner'),
  };
}

async function startLevel(levelId, entry) {
  if (app.booting) return;
  clearRadio();
  clearEdges();
  const data = levelData(levelId, entry);
  if (!app.game) {
    app.booting = true;
    await fontsReady(`${data.word.join('')}${data.banner}ASTRO`);
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
      callbacks: { postBoot: (game) => game.scene.add('level', LevelScene, true, data) },
    });
    app.booting = false;
  } else if (app.scene) {
    app.scene.scene.restart(data);
  }
}

function play(fresh) {
  unlockAudio();
  primeSpeech();
  warmVoices();
  voicesReady.then(() => prefetchVoices(getLocale()));
  if (fresh) {
    if (hasSave() && (save.seen.arrival || save.level !== 'intro') && !confirm(t('newGameConfirm'))) return;
    resetSave();
    renderFriends();
  }
  closeMenu();
  setCoop(app.opts.coop);
  if (!fresh && app.scene && !app.needRestart) {
    app.scene.scene.resume();
    app.scene.setCoop(app.opts.coop, true);
    return;
  }
  app.needRestart = false;
  startLevel(fresh ? 'intro' : save.level, fresh ? 'start' : save.entry);
}

// ── Wiring ──────────────────────────────────────────────────────────────────

function toggleCoop() {
  app.opts.coop = !app.opts.coop;
  setCoop(app.opts.coop);
  document.body.classList.toggle('coop', app.opts.coop);
  $('btnCoop').classList.toggle('on', app.opts.coop);
  app.scene?.setCoop(app.opts.coop);
}

let voicesReady = Promise.resolve(false);

function init() {
  loadLocale();
  voicesReady = loadVoices();
  loadTune();
  loadSave();
  app.opts.difficulty = tuneMeta.difficulty;
  FACES.robot = portraitURL('robot');
  FACES.otto = portraitURL('otto', 'grump');
  FACES.otto_sad = portraitURL('otto', 'sad');
  FACES.otto_happy = portraitURL('otto', 'happy');
  for (const f of FRIENDS) {
    FACES[f] = portraitURL(f, 'idle');
    FACES[`${f}_happy`] = portraitURL(f, 'happy');
    FACES[`${f}_sad`] = portraitURL(f, 'sad');
  }
  $('menuHero').src = portraitURL('astro');
  $('menuRobot').src = FACES.robot;
  buildTunePanel($('tuneFields'));
  renderMenu();

  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
    setLocale(b.dataset.lang);
    if (app.scene) app.needRestart = true;
    renderMenu();
  }));
  document.querySelectorAll('[data-diff]').forEach((b) => b.addEventListener('click', () => {
    setDifficulty(b.dataset.diff);
    app.opts.difficulty = b.dataset.diff;
    renderMenu();
  }));
  document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { app.opts.coop = b.dataset.mode === 'coop'; renderMenu(); }));
  $('btnContinue').addEventListener('click', () => play(false));
  $('btnNew').addEventListener('click', () => play(true));
  $('btnGoal').addEventListener('click', () => { if (app.scene) { const [key, ...args] = app.scene.goalKey(); say(key, { args }); } });
  $('btnCoop').addEventListener('click', toggleCoop);
  $('btnMute').addEventListener('click', () => {
    app.muted = !app.muted;
    setMuted(app.muted);
    setSpeechEnabled(!app.muted);
    setVoiceEnabled(!app.muted);
    $('btnMute').classList.toggle('on', app.muted);
    $('btnMute').textContent = app.muted ? '🔇' : '🔊';
  });
  $('btnTune').addEventListener('click', () => { $('tunePanel').hidden = !$('tunePanel').hidden; });
  $('btnMenu').addEventListener('click', openMenu);
  $('tuneClose').addEventListener('click', () => { $('tunePanel').hidden = true; });
  $('tuneEasy').addEventListener('click', () => loadPresetValues('easy'));
  $('tuneHard').addEventListener('click', () => loadPresetValues('hard'));
  $('tuneCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(tuneJSON()); } catch {}
    $('tuneCopy').textContent = t('tuneCopied');
    setTimeout(() => { $('tuneCopy').textContent = t('tuneCopy'); }, 1400);
  });
  $('radio').addEventListener('click', () => { if (app.scene?.inCutscene) nextRadio(); else if (radio.last) voiceLine(radio.last); });
  $('friends').addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-friend]');
    if (!b) return;
    e.preventDefault();
    unlockAudio();
    pickFriend(b.dataset.friend);
  });
  $('endStay').addEventListener('click', () => { $('ending').hidden = true; });
  $('qYes').addEventListener('click', () => answer(true));
  $('qNo').addEventListener('click', () => answer(false));
  $('endMenu').addEventListener('click', () => { $('ending').hidden = true; openMenu(); });

  // Buttons never keep focus, so Space always means "jump", not "click the last button".
  document.addEventListener('click', (e) => { e.target.closest?.('button')?.blur(); });

  bindKeyboard((e) => {
    if (question.open) {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyY') answer(true);
      else if (e.code === 'Escape' || e.code === 'KeyN' || e.code === 'Backspace') answer(false);
      return;
    }
    if (!$('menu').hidden) {
      if (e.code === 'Space' || e.code === 'Enter' || (e.code === 'Escape' && app.scene)) play(false);
      return;
    }
    if (e.code === 'Escape') { if (!$('ending').hidden) $('ending').hidden = true; else openMenu(); return; }
    const n = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
    if (n >= 0) pickFriend(FRIENDS[n]);
    if ((e.code === 'Space' || e.code === 'Enter') && app.scene?.inCutscene && radio.current) nextRadio();
  });
  bindTouchButtons($('touch'), (key) => {
    unlockAudio();
    primeSpeech();
    if (question.open) { if (key === 'jump') answer(true); return; }
    if (key === 'jump' && app.scene?.inCutscene && radio.current) nextRadio();
  });
}

init();
