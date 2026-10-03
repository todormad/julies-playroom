# Juli's Playroom

Free browser games at [astrojuli.com](https://astrojuli.com), made with a 6-year-old for ages 5–8.
Plain static site with no build step: Vercel publishes `main` as soon as it is pushed. Folders in
`.vercelignore` (`tools/`) are local tooling and are not deployed.

- `index.html`, `js/platform.js`, `css/platform.css`: the hub. `js/shared/games.json` lists the
  games and `js/shared/platform-messages.js` holds their titles and descriptions.
- `games/<slug>/`: one folder per game. `poems/`: Poem Karaoke (a button on the hub, but noindex
  and not in the sitemap).
- Everything a child sees or hears exists in Bulgarian, English and French; change all three.
- Preview locally with `node tools/poem-prep/serve.mjs` (http://localhost:5178/).

## Adding a game to the hub

Add an entry at the top of `js/shared/games.json` (the hub lists the newest game first) and its `game.<id>.title` / `game.<id>.desc` in all three
languages in `platform-messages.js`, a 700×520-ratio `thumb` in the game folder, a URL in
`sitemap.xml`, and bump the `?v=` numbers in `index.html` and `js/platform.js` together.

## Voiceover in Where Are My Friends? (`games/missing-friends/`)

Spoken lines are pre-recorded clips in `games/missing-friends/voice/`, generated from the text in
`games/missing-friends/js/i18n.js`. After adding or editing any spoken line (keys starting with
`i_`, `h_`, `w1_`, `w2_`, `l1_`, `l2_`, `f1_`, `f2_`, `t1_`, `t2_`, `p_`, `e_`, `r_`, `g_`), run:

```bash
node tools/voice-prep/build-voice.mjs
```

and commit the changed `voice/` files with the text. Lines without a matching clip fall back to
the browser voice, so the game still works if this is skipped, but it sounds much worse. The
script needs the owner's Google Cloud key in `tools/voice-prep/.env` (git-ignored); if it is
missing, ask for it to be put there. Never print, commit or paste the key. Lines spoken by a
friend or Otto are listed in `SPEAKERS` in i18n.js. Voices, new characters, new areas and how key
names are pronounced: `tools/voice-prep/README.md`.

## Poems

See `tools/poem-prep/README.md`.
