# Voice prep

Records the voiceover for **Where Are My Friends?** (`games/missing-friends/`) with Google Cloud
Text-to-Speech (Chirp 3: HD voices). This folder is local tooling and is not deployed (see
`.vercelignore`).

| Character | Voice | Languages |
| --- | --- | --- |
| Robot (and every line not listed below) | Fenrir | bg-BG, en-US, fr-FR |
| Nova (`NOVA_LINES` in `build-voice.mjs`) | Zephyr | bg-BG, en-US, fr-FR |

## After changing a line

The script reads every spoken line straight from `games/missing-friends/js/i18n.js`, so edit the
text there (all three languages), then:

```bash
node tools/voice-prep/build-voice.mjs
```

It records only new or changed lines, deletes clips for lines that no longer exist, and rewrites
`games/missing-friends/voice/manifest.json`. Commit the changed `voice/` files with the text change.
`--force` re-records everything; `--dry` prints the lines whose spoken form differs from the
screen text, without calling Google.

Until the script is re-run, the game plays a clip only if the manifest text still matches the
line on screen, so an edited line falls back to the browser voice (`js/speech.js`) instead of
saying the old words.

## What gets recorded

- Keys starting with `i_`, `h_`, `w1_`, `w2_`, `r_`, `g_` (radio and dialogue lines). Add a new
  prefix to `SPOKEN` when a new area adds its own (e.g. `l1_` for a lava level).
- `_touch` and `_coop` variants are separate lines; the game picks them in `main.js` `resolveKey`.
- Lines with arguments: `r_wrong` is recorded once per letter of the word, the others with the
  word itself. Clip ids are `<key>-<slug of the args>`; the slug must stay identical in
  `build-voice.mjs` and `games/missing-friends/js/voice.js`.
- `SAY_AS` rewrites key names and symbols for speech only (Bulgarian C → Си, X → Екс, R → Ар,
  SPACE → спейс, ★ → звездичката; English and French ★ → the star button / l'étoile). The
  all-caps word (НОВА / NOVA) is spoken title-cased so it is not spelled out.
- A new speaking character: add its voice to `VOICES`, its line keys to a set like `NOVA_LINES`,
  and audition voices first with `tts.py` (below).

## Setup

Needs `node` 18+ and a Google Cloud API key with the Text-to-Speech API enabled (a personal Google
account works). Put it in `tools/voice-prep/.env`, which is git-ignored:

```
GOOGLE_TTS_API_KEY=...
```

Never commit the key, print it, or put it in a URL; the scripts send it in the `X-Goog-Api-Key`
header. A full run is about 200 requests; when Google returns 429 (per-minute quota) the script
waits a minute and continues, and progress is saved even if it stops.

`tts.py` (Python standard library only) lists voices and records single test lines for
auditions:

```bash
python3 tools/voice-prep/tts.py voices bg-BG
python3 tools/voice-prep/tts.py say bg-BG-Chirp3-HD-Fenrir "Здравей, Астро!" /tmp/test.mp3
```
