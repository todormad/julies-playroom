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

// The voiceover plays through the same (gesture-unlocked) audio context.
export function audioContext() { return ac; }

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
  land2() { noise(0.9, { vol: 0.1, freq: 300 }); tone(90, 0.8, { type: 'sawtooth', vol: 0.03, to: 60 }); },
  win() { [0, 2, 4, 5].forEach((n, i) => tone(PENTA[n], 0.34, { type: 'triangle', vol: 0.11, delay: i * 0.14 })); },
  wallJump() { tone(420, 0.12, { type: 'triangle', vol: 0.1, to: 820 }); noise(0.05, { vol: 0.04, freq: 1800, type: 'bandpass' }); },
  climb() { tone(330, 0.1, { type: 'triangle', vol: 0.07, to: 520 }); },
  bounce() { tone(220, 0.28, { type: 'sine', vol: 0.16, to: 880 }); },
  stomp() { tone(500, 0.08, { type: 'square', vol: 0.06, to: 200 }); noise(0.08, { vol: 0.06, freq: 700 }); },
  dash() { noise(0.22, { vol: 0.1, freq: 2400, type: 'bandpass', q: 0.6 }); tone(700, 0.18, { type: 'sine', vol: 0.06, to: 1400 }); },
  crack() { noise(0.35, { vol: 0.14, freq: 2600, type: 'highpass' }); [0, 3, 5].forEach((n, i) => tone(PENTA[n] * 2, 0.15, { vol: 0.05, delay: 0.04 * i })); },
  plateOn() { tone(520, 0.07, { type: 'square', vol: 0.04 }); tone(780, 0.09, { type: 'square', vol: 0.04, delay: 0.06 }); },
  plateOff() { tone(600, 0.08, { type: 'square', vol: 0.03, to: 380 }); },
  doorOpen() { tone(300, 0.35, { type: 'sine', vol: 0.08, to: 900 }); },
  doorClose() { tone(800, 0.25, { type: 'sine', vol: 0.06, to: 250 }); },
  checkpoint() { [2, 4, 6].forEach((n, i) => tone(PENTA[n], 0.2, { type: 'triangle', vol: 0.08, delay: i * 0.07 })); },
  rescue() { [0, 2, 4, 6, 4, 6].forEach((n, i) => tone(PENTA[n], 0.3, { type: 'triangle', vol: 0.1, delay: i * 0.12 })); },
  denied() { tone(260, 0.12, { type: 'square', vol: 0.04 }); tone(200, 0.16, { type: 'square', vol: 0.04, delay: 0.1 }); },
  select() { tone(880, 0.08, { type: 'triangle', vol: 0.07 }); tone(1320, 0.1, { type: 'triangle', vol: 0.06, delay: 0.06 }); },
  shield() { tone(300, 0.4, { type: 'sine', vol: 0.12, to: 620 }); tone(620, 0.3, { type: 'triangle', vol: 0.05, delay: 0.08, to: 900 }); },
  shieldOff() { tone(700, 0.18, { type: 'sine', vol: 0.05, to: 300 }); },
  shieldHit() { tone(900, 0.08, { type: 'triangle', vol: 0.08 }); noise(0.08, { vol: 0.04, freq: 2400, type: 'bandpass' }); },
  bubble() { [0, 3, 5].forEach((n, i) => tone(PENTA[n] * 0.5, 0.5, { type: 'sine', vol: 0.08, delay: i * 0.09, to: PENTA[n] * 0.35 })); },
  bubbleEnd() { [5, 3, 0].forEach((n, i) => tone(PENTA[n] * 0.5, 0.18, { type: 'sine', vol: 0.05, delay: i * 0.12 })); },
  sizzle() { noise(0.45, { vol: 0.12, freq: 3200, type: 'highpass' }); tone(180, 0.2, { type: 'sawtooth', vol: 0.03, to: 90 }); },
  whooshFire() { noise(0.3, { vol: 0.06, freq: 700, type: 'bandpass', q: 0.6 }); },
  fireball() { tone(200, 0.25, { type: 'sine', vol: 0.05, to: 520 }); },
  creak() { tone(1500, 0.18, { type: 'triangle', vol: 0.03, to: 1300 }); },
  shatter() { noise(0.25, { vol: 0.08, freq: 4200, type: 'highpass' }); [5, 6].forEach((n, i) => tone(PENTA[n] * 2, 0.12, { vol: 0.04, delay: i * 0.05 })); },
  cannon() { noise(0.18, { vol: 0.09, freq: 500 }); tone(160, 0.14, { type: 'triangle', vol: 0.06, to: 90 }); },
  snowHit() { noise(0.2, { vol: 0.1, freq: 1200, type: 'bandpass', q: 0.8 }); },
  wind() { noise(1.2, { vol: 0.05, freq: 600, type: 'bandpass', q: 0.5 }); },
  thud() { tone(90, 0.3, { type: 'sine', vol: 0.18, to: 50 }); noise(0.2, { vol: 0.08, freq: 300 }); },
  tick() { tone(1800, 0.03, { type: 'square', vol: 0.025 }); },
  bell() { [4, 6].forEach((n, i) => tone(PENTA[n] * 2, 0.6, { type: 'sine', vol: 0.1, delay: i * 0.02 })); tone(PENTA[4] * 3, 0.4, { type: 'sine', vol: 0.04 }); },
  stompBig() { tone(70, 0.5, { type: 'sawtooth', vol: 0.05, to: 40 }); },
  throwBall() { tone(400, 0.3, { type: 'sine', vol: 0.06, to: 200 }); noise(0.2, { vol: 0.04, freq: 1200, type: 'bandpass' }); },
  rocket() { noise(2.2, { vol: 0.14, freq: 380 }); tone(90, 2, { type: 'sawtooth', vol: 0.05, to: 520 }); },
  firework() { noise(0.5, { vol: 0.06, freq: 2600, type: 'highpass', delay: 0.05 }); tone(220, 0.25, { type: 'sine', vol: 0.05, to: 900 }); },
  sad() { [4, 2, 1, 0].forEach((n, i) => tone(PENTA[n] * 0.5, 0.35, { type: 'triangle', vol: 0.06, delay: i * 0.22 })); },
  party() { [0, 2, 4, 2, 4, 5, 6].forEach((n, i) => tone(PENTA[n], 0.26, { type: 'triangle', vol: 0.1, delay: i * 0.13 })); },
};
