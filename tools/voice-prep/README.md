# Voice prep

Records the voiceover for **Where Are My Friends?** (`games/missing-friends/`) with Google Cloud
Text-to-Speech (Chirp 3: HD voices). This folder is local tooling and is not deployed (see
`.vercelignore`).

| Character | Voice | Notes |
| --- | --- | --- |
| Robot (every line not given to someone else) | Fenrir | picked in the listening test |
| Nova | Zephyr | picked in the listening test |
| Stitch | Puck | first pick, not auditioned yet |
| Scout | Leda | first pick, not auditioned yet |
| Big Otto | Algenib | first pick, not auditioned yet |

All voices are Chirp 3: HD in bg-BG, en-US and fr-FR (`VOICES` in `build-voice.mjs`). Who says which
line is the `SPEAKERS` list in `games/missing-friends/js/i18n.js`; the game uses the same list for
the speech bubble. To swap a voice, change `VOICES` and re-run the script: only that character's
lines are recorded again.

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

- Keys starting with `i_` (way home), `h_` (village), `w1_`/`w2_` (Crystal Woods), `l1_`/`l2_`
  (Lava Planet), `f1_`/`f2_` (Ice Planet), `t1_`/`t2_` (Otto's tower), `p_` (friend powers), `e_`
  (ending), `r_` (Robot reactions) and `g_` (goals). Add a new prefix to `SPOKEN` when a new area
  adds its own.
- `_touch` and `_coop` variants are separate lines; the game picks them in `main.js` `resolveKey`.
- Lines with arguments: `r_wrong` is recorded once per letter of the three names; the others get
  the friend's name listed for them in `WORD_OF` (the script stops with an error if a new line
  with an argument is missing there). Clip ids are `<key>-<slug of the args>`; the slug must stay
  identical in `build-voice.mjs` and `games/missing-friends/js/voice.js`.
- `SAY_AS` rewrites key names and symbols for speech only (Bulgarian C → Си, X → Екс, R → Ар,
  SPACE → спейс, ★ → звездичката; English and French ★ → the star button / l'étoile) and lowers
  shouted words (МОИТЕ, MY, OUR, MES, NOTRE) so they are not spelled out. The all-caps names
  (НОВА, СТИЧ, СКАУТ…) are spoken title-cased for the same reason.
- A new speaking character: add its voice to `VOICES` and its lines to `SPEAKERS` in i18n.js,
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
