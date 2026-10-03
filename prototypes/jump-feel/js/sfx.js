// Small Web Audio synth for sound effects — no audio files needed.

let ac = null;
let out = null;
let noiseBuf = null;
let muted = false;

export function unlockAudio() {
  try {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      out = ac.createGain();
      out.gain.value = 0.8;
      out.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
  } catch {}
}

export function setMuted(m) { muted = m; }

function tone(freq, dur, { type = 'sine', vol = 0.15, delay = 0, to = null, attack = 0.006 } = {}) {
  if (muted || !ac) return;
  const t0 = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(out);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur, { vol = 0.1, delay = 0, freq = 800, q = 0.8, type = 'lowpass' } = {}) {
  if (muted || !ac) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.5), ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = ac.currentTime + delay;
  const s = ac.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = dur > 0.45;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f);
  f.connect(g);
  g.connect(out);
  s.start(t0);
  s.stop(t0 + dur + 0.02);
}

const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];

export const sfx = {
  jump() { tone(340, 0.16, { type: 'triangle', vol: 0.12, to: 700 }); },
  land(power = 0.5) { noise(0.08 + power * 0.08, { vol: 0.04 + power * 0.12, freq: 360 }); },
  step() { noise(0.03, { vol: 0.02, freq: 1500, type: 'bandpass', q: 1.4 }); },
  star() { [0, 2, 4].forEach((n, i) => tone(PENTA[n] * 2, 0.2, { vol: 0.08, delay: i * 0.06 })); },
  good(i) {
    const f = PENTA[Math.min(i, PENTA.length - 1)];
    tone(f, 0.24, { type: 'triangle', vol: 0.15 });
    tone(f * 2, 0.32, { vol: 0.05, delay: 0.05 });
  },
  bad() { tone(230, 0.2, { type: 'square', vol: 0.05, to: 150 }); },
  bump() { tone(300, 0.07, { type: 'triangle', vol: 0.07 }); },
  robotGo() { tone(480, 0.2, { vol: 0.07, to: 920 }); },
  robotStep() { tone(660, 0.1, { vol: 0.09 }); tone(990, 0.14, { vol: 0.08, delay: 0.09 }); },
  robotOff() { tone(720, 0.14, { vol: 0.06, to: 400 }); },
  whoosh() { noise(0.4, { vol: 0.08, freq: 900, type: 'bandpass', q: 0.7 }); },
  hurt() { tone(320, 0.28, { type: 'sawtooth', vol: 0.06, to: 110 }); },
  gate() { [0, 1, 2, 3, 4, 5].forEach((n, i) => tone(PENTA[n], 0.26, { type: 'triangle', vol: 0.09, delay: i * 0.08 })); },
  radio() { tone(1320, 0.05, { type: 'square', vol: 0.025 }); tone(990, 0.05, { type: 'square', vol: 0.025, delay: 0.07 }); },
  launch() { noise(1.8, { vol: 0.13, freq: 420 }); tone(110, 1.6, { type: 'sawtooth', vol: 0.04, to: 440 }); },
  win() { [0, 2, 4, 5].forEach((n, i) => tone(PENTA[n], 0.34, { type: 'triangle', vol: 0.11, delay: i * 0.14 })); },
};
