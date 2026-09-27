"""Turn a YouTube poem recitation into a karaoke poem for the app.

    uv run prepare.py <youtube-url> --text poem.txt [--id automne] [--lang fr]

Downloads the audio, aligns the poem text to it word by word (Whisper via stable-ts),
and writes poems/data/<id>/{audio.m4a,poem.json} plus poems/data/index.json (served at astrojuli.com/poems).

Text format: one verse per line, blank line between stanzas. The first line is taken as
the title and a short last line after a blank line as the author (--no-title / --no-author
to turn that off). Lines that turn out not to be spoken in the recording are kept for
display but skipped during playback. Without --text, the video description is used.

Pictures ("pic"), translations ("tr") and "cover" already in an existing poem.json are kept.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import unicodedata
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np

HERE = Path(__file__).resolve().parent
POEMS = HERE.parent.parent / "poems" / "data"
CACHE = HERE / "cache"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SR = 16000
PUNCT_ONLY = re.compile(r"^[!?;:.,…»«“”—–-]+$")


def sh(*args: str) -> None:
    subprocess.run(args, check=True)


def youtube_id(url: str) -> str:
    m = re.search(r"(?:v=|youtu\.be/|shorts/|embed/)([\w-]{11})", url)
    if not m:
        sys.exit(f"Can't find a YouTube video id in {url}")
    return m.group(1)


def download(url: str, dest: Path) -> tuple[Path, dict]:
    def audio_files():
        return [p for p in dest.glob("source.*") if p.suffix not in (".json", ".part")]

    if not audio_files():
        ytdlp = shutil.which("yt-dlp") or sys.exit("yt-dlp not found: uv tool install 'yt-dlp[default]'")
        sh(ytdlp, "--js-runtimes", "node", "--no-playlist", "-f", "bestaudio[ext=m4a]/bestaudio",
           "--write-info-json", "-o", str(dest / "source.%(ext)s"), url)
    return audio_files()[0], json.loads((dest / "source.info.json").read_text())


def text_from_description(info: dict) -> str:
    # Channels usually put the poem first, then a divider line and their own blurb.
    print("No --text given: using the video description. Check the result!", file=sys.stderr)
    return re.split(r"\n\s*[-_=*]{5,}", info.get("description") or "")[0]


def clean(s: str) -> str:
    # Drop emoji and decorative symbols, e.g. "L’automne🍂".
    s = "".join(ch for ch in s if unicodedata.category(ch) not in ("So", "Cs", "Co") and ch not in "️‍")
    return re.sub(r"\s+", " ", s).strip()


def tokens(line: str) -> list[str]:
    # Glue free-standing punctuation to its word so "feuilles !" highlights as one unit.
    out, prefix = [], ""
    for t in line.split(" "):
        if not t:
            continue
        if PUNCT_ONLY.match(t):
            if out and not t.startswith(("«", "“")):
                out[-1] += " " + t
            else:
                prefix += t + " "
        else:
            out.append(prefix + t)
            prefix = ""
    return out


def parse(raw: str, title: bool, author: bool) -> list[dict]:
    lines, stanza, gap = [], 0, False
    for ln in raw.splitlines():
        ln = clean(ln)
        if not ln:
            gap = bool(lines)
            continue
        if gap:
            stanza, gap = stanza + 1, False
        lines.append({"text": ln, "kind": "verse", "stanza": stanza, "words": [{"t": t} for t in tokens(ln)]})
    if title and len(lines) > 2:
        lines[0]["kind"] = "title"
    last = lines[-1] if lines else None
    if (author and len(lines) > 2 and last["stanza"] != lines[-2]["stanza"]
            and len(last["words"]) <= 4 and not re.search(r"[.!?,;:]$", last["text"])):
        last["kind"] = "author"
    return lines


def load_audio(src: Path) -> np.ndarray:
    wav = src.with_name("audio16k.wav")
    sh(FFMPEG, "-loglevel", "error", "-y", "-i", str(src), "-ac", "1", "-ar", str(SR), str(wav))
    with wave.open(str(wav)) as w:
        return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768


def speech_regions(x: np.ndarray, hop: float = 0.01, min_gap: float = 0.25) -> list[list[float]]:
    """Stretches of audio clearly louder than the background, merged across short gaps."""
    n = int(SR * hop)
    frames = x[: len(x) // n * n].reshape(-1, n)
    db = 20 * np.log10(np.sqrt((frames ** 2).mean(axis=1)) + 1e-9)
    voiced = db > np.percentile(db, 10) + 12
    regions: list[list[float]] = []
    for i in np.flatnonzero(voiced):
        t = i * hop
        if regions and t - regions[-1][1] < min_gap:
            regions[-1][1] = t + hop
        else:
            regions.append([t, t + hop])
    return [r for r in regions if r[1] - r[0] > 0.08]


def align(x: np.ndarray, lines: list[dict], model_name: str, lang: str) -> None:
    import stable_whisper

    model = stable_whisper.load_model(model_name)
    # Whisper places a lone title or author badly unless it reads as its own sentence.
    text = "\n".join(l["text"] + ("." if l["kind"] != "verse" and not re.search(r"[.!?]$", l["text"]) else "")
                     for l in lines)
    result = model.align(x, text, language=lang)
    # The aligner may split or merge words differently from us, so match character by character,
    # skipping punctuation that only it has.
    chars = [(ch, w.start, w.end) for seg in result.segments for w in seg.words for ch in w.word if not ch.isspace()]
    i = 0
    for line in lines:
        for w in line["words"]:
            got = []
            for c in (c for c in w["t"] if not c.isspace()):
                while i < len(chars) and chars[i][0] != c and unicodedata.category(chars[i][0]).startswith("P"):
                    i += 1
                if i >= len(chars) or chars[i][0] != c:
                    sys.exit(f"Aligner changed the text near {w['t']!r}")
                got.append(chars[i])
                i += 1
            w["s"], w["e"] = min(c[1] for c in got), max(c[2] for c in got)


def overlap(a: float, b: float, regions: list[list[float]]) -> float:
    return sum(max(0.0, min(b, r1) - max(a, r0)) for r0, r1 in regions)


def finish_timing(lines: list[dict], regions: list[list[float]], duration: float) -> None:
    for l in lines:
        l["s"], l["e"] = l["words"][0]["s"], l["words"][-1]["e"]
        span = l["e"] - l["s"]
        l["spoken"] = bool(span >= 0.15 and overlap(l["s"], l["e"], regions) >= 0.4 * span)
    spoken = [l for l in lines if l["spoken"]]
    orig = [(l["s"], l["e"]) for l in spoken]

    # Aligners tend to clip the first and last sound of a line; widen each line to the speech
    # actually heard around it (at most 0.3 s), never into its neighbours.
    for k, l in enumerate(spoken):
        lo = orig[k - 1][1] if k else 0.0
        hi = orig[k + 1][0] if k + 1 < len(spoken) else duration
        for r0, r1 in regions:
            if r1 > l["s"] and r0 < l["e"]:
                l["s"] = min(l["s"], max(r0, l["s"] - 0.3, lo))
                l["e"] = max(l["e"], min(r1, l["e"] + 0.3, hi))
        l["words"][0]["s"], l["words"][-1]["e"] = l["s"], l["e"]

    # Playback window for "play just this line": a little air around it, split fairly with neighbours.
    for k, l in enumerate(spoken):
        prev_e = spoken[k - 1]["e"] if k else None
        next_s = spoken[k + 1]["s"] if k + 1 < len(spoken) else None
        l["ps"] = max(l["s"] - 0.12, (prev_e + l["s"]) / 2 if prev_e is not None else 0.0)
        l["pe"] = min(l["e"] + 0.25, (l["e"] + next_s) / 2 if next_s is not None else duration)

    for l in lines:
        for key in ("s", "e", "ps", "pe"):
            if key in l:
                l[key] = round(l[key], 3)
        for w in l["words"]:
            w["s"], w["e"] = round(w["s"], 3), round(w["e"], 3)
        if not l["spoken"]:
            for key in ("s", "e"):
                l.pop(key)
            for w in l["words"]:
                w.pop("s"), w.pop("e")


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.replace("’", "'")).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "poem"


def app_audio(src: Path, dst: Path) -> None:
    codec = ["-c:a", "copy"] if src.suffix == ".m4a" else ["-c:a", "aac", "-b:a", "128k"]
    sh(FFMPEG, "-loglevel", "error", "-y", "-i", str(src), "-vn", *codec, "-movflags", "+faststart", str(dst))


def write_index() -> None:
    items = []
    for p in sorted(POEMS.glob("*/poem.json")):
        d = json.loads(p.read_text())
        cover = d.get("cover") or next((l["pic"] for l in d["lines"] if l.get("pic")), "📜")
        items.append({"id": d["id"], "title": d["title"], "author": d.get("author", ""), "cover": cover})
    (POEMS / "index.json").write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("url")
    ap.add_argument("--text", help="poem text file (default: the video description)")
    ap.add_argument("--id", help="folder name in poems/data (default: from the title)")
    ap.add_argument("--lang", help="language code, e.g. fr (default: from the video)")
    ap.add_argument("--model", default="small", help="Whisper model for alignment (default: small)")
    ap.add_argument("--no-title", action="store_true", help="the first line is not a title")
    ap.add_argument("--no-author", action="store_true", help="the last line is not an author")
    args = ap.parse_args()

    vid = youtube_id(args.url)
    cache = CACHE / vid
    cache.mkdir(parents=True, exist_ok=True)
    src, info = download(args.url, cache)

    raw = Path(args.text).read_text(encoding="utf-8") if args.text else text_from_description(info)
    lines = parse(raw, title=not args.no_title, author=not args.no_author)
    if not lines:
        sys.exit("No poem text found.")
    lang = args.lang or (info.get("language") or "").split("-")[0] or sys.exit("Pass --lang (e.g. --lang fr)")

    x = load_audio(src)
    duration = len(x) / SR
    align(x, lines, args.model, lang)
    finish_timing(lines, speech_regions(x), duration)

    title = next((l["text"] for l in lines if l["kind"] == "title"), None) or clean(info.get("title", "Poem"))
    author = next((l["text"] for l in lines if l["kind"] == "author"), "")
    poem_id = args.id or slug(title)
    out = POEMS / poem_id
    out.mkdir(parents=True, exist_ok=True)

    old = json.loads((out / "poem.json").read_text()) if (out / "poem.json").exists() else {}
    old_lines = {l["text"]: l for l in old.get("lines", [])}
    for l in lines:
        for key in ("pic", "tr"):
            if key in old_lines.get(l["text"], {}):
                l[key] = old_lines[l["text"]][key]

    app_audio(src, out / "audio.m4a")
    poem = {
        "id": poem_id, "title": title, "author": author, "lang": lang,
        **({"cover": old["cover"]} if old.get("cover") else {}),
        "source": {"youtube": vid, "title": info.get("title"), "channel": info.get("channel")},
        "audio": "audio.m4a", "duration": round(duration, 3), "lines": lines,
    }
    (out / "poem.json").write_text(json.dumps(poem, ensure_ascii=False, indent=1) + "\n")
    write_index()

    print(f"\n{title} → poems/data/{poem_id}/")
    for l in lines:
        when = f"{l['s']:6.2f}–{l['e']:6.2f}" if l["spoken"] else "  (not spoken) "
        print(f"  {when}  {l['kind']:<6} {l['text']}")


if __name__ == "__main__":
    main()
