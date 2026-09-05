let muted = false;
let musicVol = 0.8;
export const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export function getMuted() { return muted; }
export function getMusicVol() { return musicVol; }
export function setMutedFlag(v) { muted = v; }

export function beep(freq = 440, dur = 0.08, type = 'sine', vol = 0.18, delay = 0) {
  if (muted) return;
  try {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.type = type; o.frequency.value = freq;
    const t = audioCtx.currentTime + delay;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur + 0.01);
  } catch {}
}

export function sfxCollect() { beep(660, .08, 'sine', .2); beep(880, .08, 'sine', .15, .09); }
export function sfxHit() { beep(200, .15, 'sawtooth', .25); }
export function sfxTalk() { beep(520, .05, 'sine', .12); }
export function sfxWin() { [523, 659, 784, 1047].forEach((f, i) => beep(f, .18, 'sine', .22, i * .18)); }
export function sfxStep() { if (Math.random() < 0.3) beep(180 + Math.random() * 40, .04, 'sine', .06); }
export function sfxArrow() { beep(900, .06, 'square', .12); beep(1200, .05, 'square', .08, .05); }
export function sfxRadio() { beep(1400, .05, 'square', .08); beep(1100, .05, 'square', .08, .07); }
export function sfxSplash() { beep(180, .2, 'sine', .2); beep(90, .25, 'triangle', .15, .08); }
export function sfxBoom() { beep(80, .3, 'sawtooth', .22); beep(40, .4, 'square', .12, .05); }

const NOTE = { C3:130.8, D3:146.8, E3:164.8, G3:196, A3:220, C4:261.6, D4:293.7, E4:329.6, G4:392, A4:440 };

const TRACKS = {
  title: {
    bpm: 88,
    layers: [
      { wave: 'sine', vol: 0.07, steps: [[NOTE.E3, 2, 0.5], [NOTE.G3, 2, 0.45], [NOTE.A3, 2, 0.5], [NOTE.G3, 2, 0.4]] },
      { wave: 'triangle', vol: 0.04, steps: [[NOTE.C3, 4, 0.4], [NOTE.A3, 4, 0.35]] },
    ],
  },
  explore: {
    bpm: 96,
    layers: [
      { wave: 'sine', vol: 0.06, steps: [[NOTE.C4, 2, 0.4], [NOTE.E4, 2, 0.35], [NOTE.G4, 2, 0.4], [NOTE.E4, 2, 0.3]] },
      { wave: 'triangle', vol: 0.035, steps: [[NOTE.C3, 4, 0.35], [NOTE.G3, 4, 0.3]] },
    ],
  },
  combat: {
    bpm: 112,
    layers: [
      { wave: 'square', vol: 0.04, steps: [[NOTE.E3, 1, 0.4], [0, 1, 0], [NOTE.G3, 1, 0.35], [0, 1, 0]] },
      { wave: 'sine', vol: 0.05, steps: [[NOTE.E4, 2, 0.35], [NOTE.D4, 2, 0.3], [NOTE.C4, 2, 0.35], [NOTE.D4, 2, 0.3]] },
    ],
  },
  flight: {
    bpm: 120,
    layers: [
      { wave: 'sawtooth', vol: 0.03, steps: [[NOTE.A3, 1, 0.35], [NOTE.C4, 1, 0.3], [NOTE.E4, 1, 0.35], [NOTE.C4, 1, 0.3]] },
      { wave: 'sine', vol: 0.05, steps: [[NOTE.A4, 2, 0.3], [NOTE.G4, 2, 0.28], [NOTE.E4, 2, 0.3], [NOTE.G4, 2, 0.28]] },
    ],
  },
};

export const Music = (() => {
  let masterGain = null;
  let currentTrack = null;
  let scheduleTimers = [];
  let stepState = {};
  let _muted = false;

  function init() {
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
  }
  function scheduleNote(freq, dur, vel, type, vol, startTime) {
    if (!freq) return;
    const g = audioCtx.createGain();
    g.connect(masterGain);
    const o = audioCtx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, startTime);
    o.connect(g);
    const peak = vel * vol;
    const att = type === 'sine' ? 0.015 : 0.005;
    const rel = type === 'sine' ? Math.min(dur * 0.45, 0.18) : Math.min(dur * 0.3, 0.08);
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(peak, startTime + att);
    g.gain.setValueAtTime(peak, startTime + dur - rel);
    g.gain.linearRampToValueAtTime(0, startTime + dur);
    o.start(startTime);
    o.stop(startTime + dur + 0.02);
  }
  function startLayer(layer, bpm) {
    const secPerBeat = 60 / bpm;
    const lookahead = 0.12;
    const state = { idx: 0, nextTime: audioCtx.currentTime + 0.05 };
    stepState[layer] = state;
    const id = setInterval(() => {
      while (state.nextTime < audioCtx.currentTime + lookahead) {
        const [freq, beats, vel] = layer.steps[state.idx % layer.steps.length];
        const dur = beats * secPerBeat;
        scheduleNote(freq, dur * 0.88, vel, layer.wave, layer.vol, state.nextTime);
        state.nextTime += dur;
        state.idx++;
      }
    }, 60);
    scheduleTimers.push(id);
  }
  function stopAllTimers() {
    scheduleTimers.forEach(clearInterval);
    scheduleTimers = [];
    stepState = {};
  }
  function fadeTo(targetVol, dur = 0.6) {
    if (!masterGain) return;
    const t = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(targetVol, t + dur);
  }
  function play(trackName) {
    if (!masterGain) init();
    if (currentTrack === trackName) return;
    fadeTo(0, 0.5);
    setTimeout(() => {
      stopAllTimers();
      if (_muted) { currentTrack = trackName; return; }
      const track = TRACKS[trackName];
      if (!track) return;
      currentTrack = trackName;
      track.layers.forEach((layer) => startLayer(layer, track.bpm));
      fadeTo(musicVol, 0.6);
    }, 520);
  }
  function setMuted(m) {
    _muted = m;
    muted = m;
    if (!masterGain) return;
    if (m) fadeTo(0, 0.3);
    else {
      const t = currentTrack;
      currentTrack = null;
      if (t) { stopAllTimers(); setTimeout(() => play(t), 0); }
    }
  }
  function setVolume(v) {
    if (!masterGain) init();
    v = Math.max(0, Math.min(1, v));
    musicVol = v;
    muted = (v === 0);
    _muted = muted;
    fadeTo(v, 0.08);
  }
  return { init, play, setMuted, setVolume, getCurrent: () => currentTrack };
})();
