// Poem Karaoke: plays a recited poem and highlights each word as it is spoken.
// Poem data (word timings) comes from tools/poem-prep/prepare.py; see its README.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const h = (tag, cls, text) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
};

const STR = {
  hints: {
    listen: 'Press play and follow the words',
    repeat: 'Listen, then say it like a parrot',
    build: 'Learn it one piece at a time',
    solo: 'Say it with the voice… then alone!',
  },
  listening: 'Listening…',
  paused: 'Paused. Press play to go on',
  lineOf: (a, b) => `Line ${a} of ${b}`,
  pieceOf: (a, b) => `Piece ${a} of ${b}`,
  stepOf: (a, b) => `Step ${a} of ${b}`,
  levels: { 1: 'Say it together!', 0.25: 'The voice whispers…', 0: 'All by yourself!' },
  thatsYou: 'That was you!',
  bravo: 'Bravo !',
  micMissing: 'The microphone only works on this computer (localhost) or over https.',
  micDenied: 'The microphone was not allowed.',
};
const MODES = ['listen', 'repeat', 'build', 'solo'];
const PAUSE = { short: 1.2, normal: 1.6, long: 2.2 };
const SETTINGS = [
  { key: 'pause', label: 'Time to repeat', options: [['short', 'Short'], ['normal', 'Normal'], ['long', 'Long']] },
  { key: 'advance', label: 'Go to the next line', options: [['timer', 'Automatically'], ['tap', 'When I tap Next']] },
  { key: 'repeats', label: 'Repeat each line', options: [[1, 'Once'], [2, 'Twice']] },
  { key: 'chunk', label: 'Learn in pieces of', options: [['line', 'One line'], ['sentence', 'A sentence']] },
  { key: 'pics', label: 'Pictures', options: [[true, 'Show'], [false, 'Hide']] },
  { key: 'translation', label: 'Translation', options: () => [['off', 'Off'], ...translationLangs().map(k => [k, TR_LANGS[k]])], when: () => translationLangs().length > 0 },
  { key: 'record', label: 'Hear myself after my turn', options: [[false, 'Off'], [true, 'On']], when: () => canRecord() },
];
const DEFAULTS = { pause: 'normal', advance: 'timer', repeats: 1, chunk: 'line', pics: true, translation: 'off', record: false };
const TR_LANGS = { bg: 'Български', en: 'English' };
const translationLangs = () => Object.keys(TR_LANGS).filter(k => S.poem?.lines.some(l => l.tr?.[k]));

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('poem-karaoke:' + key); return v == null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('poem-karaoke:' + key, JSON.stringify(value)); } catch { /* private mode */ }
  },
};

const audio = $('#audio');
const reader = $('#reader');
const poemEl = $('#poem');
const playBtn = $('#play');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const S = {
  poem: null, id: null,
  mode: MODES.includes(store.get('mode')) ? store.get('mode') : 'listen',
  level: store.get('level', 1),
  speed: 1,
  hideText: false,
  set: { ...DEFAULTS, ...store.get('settings', {}) },
  words: [], lineEls: [],
  run: null, runIsMode: false, seg: null, progress: null,
  activeLine: -1, lastT: -1, dirty: true,
  mic: null,
};

// ---------- Routing ----------

async function route() {
  stopAll();
  releaseMic();
  const m = location.hash.match(/^#\/poem\/([\w-]+)/);
  if (m) await openPoem(m[1]);
  else await showHome();
}

async function fetchJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

async function showHome() {
  S.poem = null;
  const list = await fetchJSON('data/index.json').catch(() => []);
  $('#poem-list').replaceChildren(...list.map(p => {
    const a = h('a', 'card');
    a.href = `#/poem/${p.id}`;
    a.append(h('span', 'cover emoji', p.cover || '📜'), h('span', 't', p.title), h('span', 'a', p.author), starsRow(p.id));
    const li = h('li');
    li.append(a);
    return li;
  }));
  reader.hidden = true;
  $('#home').hidden = false;
  document.title = 'Poem Karaoke';
}

async function openPoem(id) {
  const poem = await fetchJSON(`data/${id}/poem.json`).catch(() => null);
  if (!poem) { location.hash = '#/'; return; }
  S.poem = poem;
  S.id = id;
  S.progress = null;
  audio.src = `data/${id}/${poem.audio}`;
  audio.load();
  applySpeed();
  $('#poem-title').textContent = poem.title;
  document.title = `${poem.title} · Poem Karaoke`;
  renderPoem();
  renderStars();
  setMode(S.mode);
  $('#home').hidden = true;
  reader.hidden = false;
  scrollTo(0, 0);
}

// ---------- Poem rendering ----------

function renderPoem() {
  const { poem } = S;
  S.words = [];
  S.lineEls = [];
  S.activeLine = -1;
  let prevStanza = null;
  const rows = poem.lines.map((l, i) => {
    const row = h('div', `line kind-${l.kind}${l.spoken ? '' : ' unspoken'}`);
    if (l.kind === 'verse') {
      if (prevStanza !== null && l.stanza !== prevStanza) row.classList.add('stanza-start');
      prevStanza = l.stanza;
    }
    const pic = h('button', 'pic emoji', l.pic || '');
    pic.setAttribute('aria-label', 'Hear this line');
    if (l.spoken) pic.addEventListener('click', () => hearLine(i));
    const words = h('p', 'words');
    l.words.forEach((w, j) => {
      const span = h('span', 'w', w.t);
      words.append(span, ' ');
      if (!l.spoken) return;
      const until = j + 1 < l.words.length ? l.words[j + 1].s : l.e;
      S.words.push({ el: span, s: w.s, e: w.e, until: Math.max(until, w.e), line: i, state: '' });
      span.addEventListener('click', () => hearWord(i, j));
    });
    for (const [lang, text] of Object.entries(l.tr || {})) {
      const tr = h('span', 'tr', text);
      tr.lang = lang;
      words.append(tr);
    }
    row.append(pic, words);
    S.lineEls.push(row);
    return row;
  });
  poemEl.replaceChildren(...rows);
  applyDisplaySettings();
  S.dirty = true;
}

function applyDisplaySettings() {
  poemEl.classList.toggle('no-pics', !S.set.pics);
  poemEl.dataset.tr = S.set.translation;
  poemEl.classList.toggle('hide-text', S.hideText);
  $('#hide-text').setAttribute('aria-pressed', S.hideText);
  $('#hide-text').textContent = S.hideText ? '🙈' : '👀';
}

// Every frame: stop a segment at its end, and colour words by the audio clock.
function tick() {
  requestAnimationFrame(tick);
  checkSegment();
  if (!S.poem) return;
  const t = audio.currentTime;
  if (t === S.lastT && !S.dirty) return;
  S.lastT = t;
  S.dirty = false;
  paint(t);
}

function paint(t) {
  let active = -1;
  for (const w of S.words) {
    const state = t >= w.until ? 'spoken' : t >= w.s ? 'current' : '';
    if (state !== w.state) {
      if (w.state) w.el.classList.remove(w.state);
      if (state) w.el.classList.add(state);
      w.state = state;
    }
    if (state === 'current') active = w.line;
  }
  if (active === -1 && !audio.paused) {
    active = S.poem.lines.findIndex(l => l.spoken && t >= l.ps && t < l.pe);
  }
  setActiveLine(active);
}

function setActiveLine(i) {
  if (i === S.activeLine) return;
  S.lineEls[S.activeLine]?.classList.remove('active');
  S.activeLine = i;
  const el = S.lineEls[i];
  if (!el) return;
  el.classList.add('active');
  keepInView(el);
}

function keepInView(el) {
  const r = el.getBoundingClientRect();
  const bottom = $('.dock-inner').getBoundingClientRect().top - 16;
  if (r.top < 90 || r.bottom > bottom) el.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
}

function markLines(cls, lines) {
  S.lineEls.forEach((el, i) => el.classList.toggle(cls, !!lines && lines.includes(i)));
}
const setScope = lines => S.lineEls.forEach((el, i) => el.classList.toggle('out', !!lines && !lines.includes(i)));

// ---------- Audio engine ----------

let actx = null;
let gainNode = null;
let volumeWorks = null;
const abortError = () => new DOMException('Stopped', 'AbortError');

function unlockAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!actx && AC) actx = new AC();
  if (actx?.state === 'suspended') actx.resume().catch(() => {});
}

// iPad/iPhone ignore audio.volume, so quieter voices go through Web Audio there.
function setLevel(level) {
  audio.muted = level === 0;
  if (level === 0) return;
  if (volumeWorks === null) {
    audio.volume = 0.5;
    volumeWorks = audio.volume === 0.5;
    audio.volume = 1;
  }
  if (volumeWorks) { audio.volume = level; return; }
  if (!gainNode && actx && level !== 1) {
    gainNode = actx.createGain();
    actx.createMediaElementSource(audio).connect(gainNode).connect(actx.destination);
  }
  if (gainNode) gainNode.gain.value = level;
}

function applySpeed() {
  audio.defaultPlaybackRate = audio.playbackRate = S.speed;
  audio.preservesPitch = audio.webkitPreservesPitch = true;
  $('#speed').setAttribute('aria-pressed', S.speed < 1);
}

// Plays [from, to) and resolves when `to` is reached.
function playSegment(from, to, signal, level = 1) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(abortError()); return; }
    let settled = false;
    let timer = 0;
    const seg = { to };
    const done = err => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (S.seg === seg) S.seg = null;
      signal.removeEventListener('abort', onAbort);
      audio.removeEventListener('ended', onEnded);
      if (err) reject(err); else resolve();
    };
    // Stop on time even when animation frames are throttled (low-power mode, background):
    // sleep until just before the end, then re-check the real audio clock.
    const arm = () => {
      if (settled) return;
      checkSegment();
      const left = (to - audio.currentTime) / (audio.playbackRate || 1);
      timer = setTimeout(arm, Math.max(4, Math.min(left * 1000 - 10, 250)));
    };
    const onAbort = () => { audio.pause(); done(abortError()); };
    const onEnded = () => done();
    seg.done = done;
    signal.addEventListener('abort', onAbort);
    audio.addEventListener('ended', onEnded);
    S.seg = seg;
    setLevel(level);
    audio.currentTime = from;
    S.dirty = true;
    audio.play().then(arm, done);
  });
}

function checkSegment() {
  const seg = S.seg;
  if (seg && !audio.paused && audio.currentTime >= seg.to) {
    audio.pause();
    seg.done();
  }
}

// Runs one activity; pressing stop (or starting another) aborts it.
// `isMode` is false for one-off taps (hear a word/line), which must not move the Listen bookmark.
function start(runner, isMode = true) {
  stopAll();
  unlockAudio();
  const ac = new AbortController();
  S.run = ac;
  S.runIsMode = isMode;
  setPlaying(true);
  // No await before this call: the first audio.play() must happen inside the tap for iPad.
  runner(ac.signal)
    .catch(err => { if (err?.name !== 'AbortError') console.error(err); })
    .finally(() => {
      if (S.run !== ac) return;
      S.run = null;
      setPlaying(false);
    });
}

function stopAll() {
  if (S.run && S.runIsMode && S.progress?.mode === 'listen') S.progress.t = audio.currentTime;
  S.run?.abort();
  S.run = null;
  audio.pause();
  if (S.poem) setPlaying(false);
}

function setPlaying(on) {
  playBtn.classList.toggle('on', on);
  playBtn.setAttribute('aria-label', on ? 'Stop' : 'Play');
  const resumable = !on && S.progress?.mode === S.mode;
  $('#restart').hidden = !resumable;
  if (!on) {
    showTurn(false);
    markLines('turn', null);
    setStatus(resumable ? STR.paused : STR.hints[S.mode]);
  }
}

function setStatus(text) { $('#status').textContent = text; }

// ---------- Your turn ----------

function showTurn(on, secs = 0) {
  const tap = S.set.advance === 'tap';
  $('#status').hidden = on;
  $('#turn').hidden = !on;
  $('#next').hidden = !on;
  $('#hide-text').hidden = on;
  $('#next').classList.toggle('big', tap);
  $('.drain').hidden = tap;
  const bar = $('#drain-bar');
  bar.style.animation = 'none';
  if (on && !tap) {
    void bar.offsetWidth; // restart the animation
    bar.style.setProperty('animation', `drain ${secs}s linear forwards`, 'important');
  }
}

function waitTurn(secs, signal) {
  return new Promise((resolve, reject) => {
    const next = $('#next');
    let timer = 0;
    const finish = err => {
      clearTimeout(timer);
      next.onclick = null;
      signal.removeEventListener('abort', onAbort);
      showTurn(false);
      if (err) reject(err); else resolve();
    };
    const onAbort = () => finish(abortError());
    signal.addEventListener('abort', onAbort);
    next.onclick = () => finish();
    if (S.set.advance !== 'tap') timer = setTimeout(() => finish(), secs * 1000);
    showTurn(true, secs);
  });
}

// The child repeats `lines`, which took `heard` seconds in the recording.
async function yourTurn(lines, heard, signal) {
  const factor = lines.length > 2 ? Math.min(PAUSE[S.set.pause], 1.35) : PAUSE[S.set.pause];
  const secs = (heard / S.speed) * factor + 1;
  markLines('turn', lines);
  const stopRecording = S.set.record && S.mic ? record(S.mic) : null;
  let clip = null;
  try {
    await waitTurn(secs, signal);
  } finally {
    markLines('turn', null);
    if (stopRecording) clip = await stopRecording();
  }
  if (clip?.size) await hearMyself(clip, signal);
}

// ---------- Microphone ("hear myself") ----------

function canRecord() {
  return !!(window.isSecureContext && navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
}

async function ensureMic() {
  if (!S.mic) S.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  return S.mic;
}

function releaseMic() {
  S.mic?.getTracks().forEach(t => t.stop());
  S.mic = null;
}

function record(stream) {
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.start();
  return () => new Promise(resolve => {
    rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType }));
    if (rec.state === 'inactive') resolve(null); else rec.stop();
  });
}

async function hearMyself(clip, signal) {
  if (!actx) return;
  const before = $('#status').textContent;
  setStatus('👂 ' + STR.thatsYou);
  try {
    const buffer = await actx.decodeAudioData(await clip.arrayBuffer());
    await new Promise((resolve, reject) => {
      if (signal.aborted) { reject(abortError()); return; }
      const src = actx.createBufferSource();
      src.buffer = buffer;
      src.connect(actx.destination);
      const onAbort = () => { try { src.stop(); } catch { /* already stopped */ } reject(abortError()); };
      src.onended = () => { signal.removeEventListener('abort', onAbort); resolve(); };
      signal.addEventListener('abort', onAbort, { once: true });
      src.start();
    });
  } finally {
    setStatus(before);
  }
}

// ---------- Modes ----------

// A "piece" is one spoken line, or with chunk=sentence, lines up to the next full stop.
function pieces() {
  const out = [];
  S.poem.lines.forEach((l, i) => {
    if (!l.spoken) return;
    const last = out.at(-1);
    const ends = /[.!?…]["»”]?$/.test(l.text);
    if (S.set.chunk === 'sentence' && last && !last.closed && l.kind === 'verse' && last.stanza === l.stanza && last.lines.length < 4) {
      last.lines.push(i);
      last.pe = l.pe;
      last.closed = ends;
    } else {
      out.push({ lines: [i], ps: l.ps, pe: l.pe, stanza: l.stanza, closed: l.kind !== 'verse' || ends || S.set.chunk === 'line' });
    }
  });
  return out;
}

const runners = {
  async listen(signal) {
    const P = pieces();
    const end = P.at(-1).pe;
    const saved = S.progress?.mode === 'listen' ? S.progress.t : 0;
    const from = saved < end - 0.5 ? saved : 0;
    S.progress = { mode: 'listen', t: from };
    setScope(null);
    setStatus('🎧 ' + STR.listening);
    await playSegment(from, end, signal);
    finish('listen');
  },

  async repeat(signal) {
    const P = pieces();
    const label = S.set.chunk === 'line' ? STR.lineOf : STR.pieceOf;
    for (let k = S.progress?.mode === 'repeat' ? S.progress.i : 0; k < P.length; k++) {
      S.progress = { mode: 'repeat', i: k };
      const p = P[k];
      setScope(p.lines);
      setStatus('🦜 ' + label(k + 1, P.length));
      for (let r = 0; r < S.set.repeats; r++) {
        await playSegment(p.ps, p.pe, signal);
        await yourTurn(p.lines, p.pe - p.ps, signal);
      }
    }
    finish('repeat');
  },

  // Classic chaining: hear the new piece and repeat it, then say everything so far.
  async build(signal) {
    const P = pieces();
    for (let k = S.progress?.mode === 'build' ? S.progress.i : 0; k < P.length; k++) {
      S.progress = { mode: 'build', i: k };
      const p = P[k];
      const soFar = P.slice(0, k + 1).flatMap(x => x.lines);
      setScope(soFar);
      setStatus('🧱 ' + STR.stepOf(k + 1, P.length));
      if (k > 0) {
        await playSegment(p.ps, p.pe, signal);
        await yourTurn(p.lines, p.pe - p.ps, signal);
      }
      await playSegment(P[0].ps, p.pe, signal);
      await yourTurn(soFar, p.pe - P[0].ps, signal);
    }
    finish('build');
  },

  async solo(signal) {
    const P = pieces();
    S.progress = null;
    setScope(null);
    setStatus(`${S.level === 0 ? '🔇' : S.level < 1 ? '🔉' : '🔊'} ${STR.levels[S.level]}`);
    await playSegment(P[0].ps, P.at(-1).pe, signal, S.level);
    setLevel(1);
    finish('solo');
  },
};

function finish(mode) {
  S.progress = null;
  setScope(null);
  award(mode);
  celebrate();
}

function hearLine(i) {
  const l = S.poem.lines[i];
  start(signal => playSegment(l.ps, l.pe, signal), false);
}

function hearWord(i, j) {
  const l = S.poem.lines[i];
  const w = l.words[j];
  const next = j + 1 < l.words.length ? l.words[j + 1].s : l.e;
  const from = Math.max(l.ps, w.s - 0.06);
  const to = Math.min(l.pe, Math.max(next + 0.05, from + 0.4));
  start(signal => playSegment(from, to, signal), false);
}

function setMode(mode) {
  stopAll();
  if (S.progress?.mode !== mode) S.progress = null;
  S.mode = mode;
  store.set('mode', mode);
  reader.dataset.mode = mode;
  $$('.modes button').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === mode));
  $('#levels').hidden = mode !== 'solo';
  $$('#levels button').forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.level) === S.level));
  setScope(null);
  markLines('turn', null);
  audio.currentTime = 0;
  S.dirty = true;
  setPlaying(false);
}

// ---------- Stars & celebration ----------

const STAR_PATH = 'M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.3L12 17.1l-5.6 3 1.1-6.3L2.9 9.4l6.3-.9z';

function starsRow(id) {
  const got = store.get('stars:' + id, {});
  const row = h('div', 'stars');
  for (const m of MODES) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', got[m] ? 'star on' : 'star');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', STAR_PATH);
    svg.append(path);
    row.append(svg);
  }
  return row;
}

function renderStars() { $('#poem-stars').replaceChildren(...starsRow(S.id).childNodes); }

function award(mode) {
  const got = store.get('stars:' + S.id, {});
  got[mode] = true;
  store.set('stars:' + S.id, got);
  renderStars();
}

function celebrate() {
  const party = $('#party');
  const bits = ['⭐', '✨', '🎉', ...S.poem.lines.map(l => l.pic).filter(Boolean)];
  party.replaceChildren();
  for (let i = 0; i < 36; i++) {
    const b = h('span', 'bit emoji', bits[i % bits.length]);
    b.style.left = `${Math.random() * 96}%`;
    b.style.fontSize = `${24 + Math.random() * 26}px`;
    b.style.animationDuration = `${2.2 + Math.random() * 1.6}s`;
    b.style.animationDelay = `${Math.random() * 0.9}s`;
    party.append(b);
  }
  const card = h('div', 'bravo');
  card.append(h('div', 'bravo-word', STR.bravo), starsRow(S.id));
  party.append(card);
  party.hidden = false;
  const close = () => { party.hidden = true; clearTimeout(timer); };
  const timer = setTimeout(close, 5000);
  party.onclick = close;
}

// ---------- Settings ----------

function renderSettings() {
  const fields = SETTINGS.filter(f => !f.when || f.when()).map(f => {
    const options = typeof f.options === 'function' ? f.options() : f.options;
    const fs = h('fieldset');
    fs.append(h('legend', null, f.label));
    const seg = h('div', 'seg');
    for (const [value, text] of options) {
      const label = h('label');
      const input = h('input');
      input.type = 'radio';
      input.name = f.key;
      input.value = String(value);
      input.checked = S.set[f.key] === value;
      input.addEventListener('change', () => changeSetting(f.key, value));
      label.append(input, text);
      seg.append(label);
    }
    fs.append(seg);
    return fs;
  });
  $('#settings-fields').replaceChildren(...fields);
}

async function changeSetting(key, value) {
  S.set[key] = value;
  $('#settings-note').hidden = true;
  if (key === 'record' && value) {
    try {
      await ensureMic();
    } catch {
      S.set.record = false;
      $('#settings-note').textContent = canRecord() ? STR.micDenied : STR.micMissing;
      $('#settings-note').hidden = false;
      renderSettings();
    }
  }
  if (key === 'record' && !value) releaseMic();
  if (key === 'chunk') { stopAll(); S.progress = null; setPlaying(false); }
  store.set('settings', { ...S.set, record: false });
  applyDisplaySettings();
}

// ---------- Wiring ----------

playBtn.addEventListener('click', () => (S.run ? stopAll() : start(runners[S.mode])));
$('#restart').addEventListener('click', () => { S.progress = null; start(runners[S.mode]); });
$$('.modes button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
$$('#levels button').forEach(b => b.addEventListener('click', () => {
  S.level = Number(b.dataset.level);
  store.set('level', S.level);
  setMode('solo');
}));
$('#speed').addEventListener('click', () => { S.speed = S.speed === 1 ? 0.75 : 1; applySpeed(); });
$('#hide-text').addEventListener('click', () => { S.hideText = !S.hideText; applyDisplaySettings(); });
$('#open-settings').addEventListener('click', () => { renderSettings(); $('#settings-note').hidden = true; $('#settings').showModal(); });
audio.addEventListener('loadedmetadata', applySpeed);
audio.addEventListener('timeupdate', checkSegment);
audio.addEventListener('seeked', () => { S.dirty = true; });

document.addEventListener('keydown', e => {
  if (reader.hidden || $('#settings').open || e.target.closest('input, textarea')) return;
  if (e.code === 'Space') { e.preventDefault(); playBtn.click(); }
  else if (e.key === 'ArrowRight' && !$('#next').hidden) $('#next').click();
});

window.addEventListener('hashchange', route);
route();
requestAnimationFrame(tick);
