// Voiceover: plays the pre-generated clips listed in voice/manifest.json (built by
// tools/voice-prep/build-voice.mjs). A clip is used only while its text still matches the
// line on screen; anything else falls back to the browser voice (speech.js).

import { audioContext } from './sfx.js';

const BASE = new URL('../voice/', import.meta.url);
const bytes = new Map();     // file -> Promise<ArrayBuffer> (compressed, ~17 KB each)
const decoded = new Map();   // file -> AudioBuffer, only the last few (they are ~1 MB each)
let manifest = null;
let current = null;
let gain = null;
let seq = 0;
let enabled = true;

// Must match the id scheme in build-voice.mjs.
const slug = (s) => [...s].map((c) => (/[a-z0-9]/i.test(c) ? c.toLowerCase() : `u${c.codePointAt(0).toString(16)}`)).join('');

export async function loadVoices() {
  try {
    const res = await fetch(new URL('manifest.json', BASE), { cache: 'no-cache' });
    if (res.ok) manifest = await res.json();
  } catch {}
  return !!manifest;
}

export function setVoiceEnabled(on) {
  enabled = on;
  if (!on) stopVoice();
}

// The hash changes whenever a line is re-recorded, so browsers never replay an old take.
const clipUrl = (entry) => `${entry.file}?h=${entry.hash}`;

function clipFor(lang, key, args, text) {
  const id = key + (args.length ? `-${args.map(slug).join('-')}` : '');
  const entry = manifest?.lines?.[lang]?.[id];
  return entry && entry.text === text ? clipUrl(entry) : null;
}

function fetchClip(file) {
  if (!bytes.has(file)) {
    const p = fetch(new URL(file, BASE)).then((r) => {
      if (!r.ok) throw new Error(`clip ${r.status}`);
      return r.arrayBuffer();
    });
    p.catch(() => bytes.delete(file));
    bytes.set(file, p);
  }
  return bytes.get(file);
}

async function decode(ac, file) {
  let buf = decoded.get(file);
  if (!buf) {
    // decodeAudioData takes ownership of its input, so hand it a copy
    buf = await ac.decodeAudioData((await fetchClip(file)).slice(0));
    if (decoded.size >= 6) decoded.delete(decoded.keys().next().value);
  } else {
    decoded.delete(file);
  }
  decoded.set(file, buf);
  return buf;
}

// Download every clip for a language in the background (a few at a time).
export function prefetchVoices(lang) {
  const files = Object.values(manifest?.lines?.[lang] || {}).map(clipUrl);
  let i = 0;
  const next = () => {
    const f = files[i++];
    if (f) fetchClip(f).catch(() => {}).finally(next);
  };
  for (let k = 0; k < 4; k++) next();
}

// Plays the clip for a line. Resolves with its length in seconds, 0 when nothing should be
// heard (muted, or another line took over), or null when there is no usable clip.
export async function playVoice(lang, key, args, text) {
  stopVoice();
  if (!enabled) return 0;
  const file = clipFor(lang, key, args || [], text);
  const ac = audioContext();
  if (!file || !ac) return null;
  const token = seq;
  let buf;
  try { buf = await decode(ac, file); } catch { return null; }
  if (token !== seq || !enabled) return 0;
  if (!gain) {
    gain = ac.createGain();
    gain.connect(ac.destination);
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.connect(gain);
  src.start();
  current = src;
  return buf.duration;
}

export function stopVoice() {
  seq++;
  if (current) {
    try { current.stop(); } catch {}
    current = null;
  }
}
