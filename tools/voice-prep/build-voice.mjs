// Builds the voiceover for "Where Are My Friends?" with Google Cloud Text-to-Speech (Chirp 3: HD).
//
//   node tools/voice-prep/build-voice.mjs            # only new or changed lines
//   node tools/voice-prep/build-voice.mjs --force    # everything again
//
// Reads every spoken line from games/missing-friends/js/i18n.js, writes
// games/missing-friends/voice/<lang>/<line>.mp3 and voice/manifest.json.
// The game plays a clip only while its text still matches the manifest, so edited
// lines fall back to the browser voice until this script is run again.
// Needs GOOGLE_TTS_API_KEY in tools/voice-prep/.env (git-ignored).

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STRINGS } from '../../games/missing-friends/js/i18n.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../../games/missing-friends/voice');
const FORCE = process.argv.includes('--force');

const LOCALES = { bg: 'bg-BG', en: 'en-US', fr: 'fr-FR' };
const VOICES = { robot: 'Fenrir', nova: 'Zephyr' };   // picked in the listening test
const RATE = 0.95;                                     // a little slower for young listeners
const SPOKEN = /^(i_|h_|w1_|w2_|r_|g_)/;
const NOVA_LINES = new Set(['w2_cage1', 'w2_cage2', 'w2_free1', 'w2_free2', 'w2_free2_touch', 'w2_free3', 'h_nova_back']);

// Key names and symbols, rewritten so they are spoken naturally (display text is unchanged).
const SAY_AS = {
  bg: [[/\bSPACE\b/g, 'спейс'], [/\bC\b/g, 'Си'], [/\bX\b/g, 'Екс'], [/\bR\b/g, 'Ар'], [/★/g, 'звездичката']],
  en: [[/★/g, 'the star button']],
  fr: [[/★/g, 'l’étoile']],
};

function apiKey() {
  const env = fs.readFileSync(path.join(HERE, '.env'), 'utf8');
  const key = env.match(/^GOOGLE_TTS_API_KEY=(.*)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '');
  if (!key) throw new Error('No GOOGLE_TTS_API_KEY in tools/voice-prep/.env');
  return key;
}

const slug = (s) => [...s].map((c) => (/[a-z0-9]/i.test(c) ? c.toLowerCase() : `u${c.codePointAt(0).toString(16)}`)).join('');
const titleCase = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

// Every spoken line, with the argument values the game can pass to it.
function lines() {
  const out = [];
  for (const lang of Object.keys(LOCALES)) {
    const table = STRINGS[lang];
    const word = Array.from(table.word_nova).join('');
    for (const [key, val] of Object.entries(table)) {
      if (!SPOKEN.test(key)) continue;
      let argSets = [[]];
      if (typeof val === 'function') argSets = key === 'r_wrong' ? [...new Set(word)].map((l) => [l]) : [[word]];
      for (const args of argSets) {
        const text = typeof val === 'function' ? val(...args) : val;
        let speech = text.split(word).join(titleCase(word));
        for (const [re, rep] of SAY_AS[lang]) speech = speech.replace(re, rep);
        const id = key + (args.length ? `-${args.map(slug).join('-')}` : '');
        const who = NOVA_LINES.has(key) ? 'nova' : 'robot';
        out.push({ lang, id, key, args, text, speech, who });
      }
    }
  }
  return out;
}

async function synthesize(key, voice, text) {
  const body = {
    input: { text },
    voice: { languageCode: voice.split('-').slice(0, 2).join('-'), name: voice },
    audioConfig: { audioEncoding: 'MP3', speakingRate: RATE },
  };
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: { 'X-Goog-Api-Key': key, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    if (res.ok) return Buffer.from((await res.json()).audioContent, 'base64');
    const msg = await res.text();
    if (res.status === 429 && attempt < 5) {
      // per-minute quota: wait for the next minute
      await new Promise((r) => setTimeout(r, 62000));
      continue;
    }
    if (res.status >= 500 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    throw new Error(`Google TTS ${res.status}: ${msg.slice(0, 300)}`);
  }
}

async function main() {
  if (process.argv.includes('--dry')) {
    for (const l of lines()) if (l.speech !== l.text) console.log(`${l.lang} ${l.id}: ${l.speech}`);
    return;
  }
  const key = apiKey();
  const manifestPath = path.join(OUT, 'manifest.json');
  const old = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { lines: {} };
  const manifest = { voices: VOICES, rate: RATE, lines: {} };
  const todo = [];
  for (const l of lines()) {
    const voice = `${LOCALES[l.lang]}-Chirp3-HD-${VOICES[l.who]}`;
    const hash = crypto.createHash('sha1').update(`${voice}|${RATE}|${l.speech}`).digest('hex').slice(0, 10);
    const file = `${l.lang}/${l.id}.mp3`;
    (manifest.lines[l.lang] ||= {})[l.id] = { file, text: l.text, who: l.who, hash };
    const prev = old.lines?.[l.lang]?.[l.id];
    if (FORCE || !prev || prev.hash !== hash || !fs.existsSync(path.join(OUT, file))) todo.push({ ...l, voice, file });
  }
  console.log(`${Object.values(manifest.lines).reduce((n, t) => n + Object.keys(t).length, 0)} lines, ${todo.length} to generate (${todo.reduce((n, l) => n + l.speech.length, 0)} characters)`);
  let done = 0;
  const finished = new Set();
  const queue = [...todo];
  try {
    await Promise.all(Array.from({ length: 4 }, async () => {
      for (let l = queue.shift(); l; l = queue.shift()) {
        const audio = await synthesize(key, l.voice, l.speech);
        fs.mkdirSync(path.join(OUT, l.lang), { recursive: true });
        fs.writeFileSync(path.join(OUT, l.file), audio);
        finished.add(l);
        done++;
        if (done % 20 === 0 || done === todo.length) console.log(`  ${done}/${todo.length}`);
      }
    }));
  } finally {
    // Save progress even after an error: unfinished lines are left out, so the next run
    // retries them and the game uses the browser voice for them meanwhile.
    for (const l of todo) if (!finished.has(l)) delete manifest.lines[l.lang][l.id];
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 1)}\n`);
  }
  // remove clips for lines that no longer exist
  for (const lang of Object.keys(LOCALES)) {
    const dir = path.join(OUT, lang);
    if (!fs.existsSync(dir)) continue;
    const keep = new Set(Object.values(manifest.lines[lang] || {}).map((e) => path.basename(e.file)));
    for (const f of fs.readdirSync(dir)) if (!keep.has(f)) fs.unlinkSync(path.join(dir, f));
  }
  console.log(`wrote ${path.relative(process.cwd(), manifestPath)}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
