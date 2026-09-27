# Poem prep

Builds the poems served at [astrojuli.com/poems](https://astrojuli.com/poems/): a recited poem from
YouTube with each word highlighted as it is spoken (Listen, Repeat, Build up, Say it modes).
This folder is local tooling and is not deployed (see `.vercelignore`).

## Add a poem

Put the text in `texts/<name>.txt`: one verse per line, a blank line between stanzas, the title
first and the author last (like the school handout). Then:

```bash
cd tools/poem-prep
uv run prepare.py "https://www.youtube.com/watch?v=..." --text texts/<name>.txt --lang fr
```

It downloads the audio, lines the text up with the voice (Whisper, runs locally), and writes
`poems/data/<id>/` plus `poems/data/index.json`. Then add each line's picture (`"pic"`) and
translations (`"tr": {"bg": "…", "en": "…"}`) in `poem.json`; both survive re-running the script.
Commit and push to `main` to publish.

Needs `uv`, `node`, and `yt-dlp` (`uv tool install 'yt-dlp[default]'`).

## Preview locally

```bash
node tools/poem-prep/serve.mjs
```

Open http://localhost:5178/poems/, or the home Wi-Fi address it prints on a tablet.

The `/poems/` pages and files are served with `noindex` and are not linked from the homepage or
the sitemap.
