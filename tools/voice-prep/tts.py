"""Google Cloud Text-to-Speech helper for the game voiceover (standard library only).

    python3 tts.py voices bg-BG            # list voices for a language
    python3 tts.py say bg-BG-Chirp3-HD-Aoede "Здравей, Астро!" out.mp3

Reads GOOGLE_TTS_API_KEY from tools/voice-prep/.env (git-ignored). The key is sent in a
request header, never printed or put in a URL.
"""

from __future__ import annotations

import base64
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
API = "https://texttospeech.googleapis.com/v1"


def api_key() -> str:
    env = HERE / ".env"
    for line in env.read_text(encoding="utf-8").splitlines():
        if line.startswith("GOOGLE_TTS_API_KEY="):
            key = line.split("=", 1)[1].strip().strip('"').strip("'")
            if key:
                return key
    sys.exit(f"No GOOGLE_TTS_API_KEY in {env}")


def call(path: str, body: dict | None = None) -> dict:
    req = urllib.request.Request(
        f"{API}/{path}",
        data=json.dumps(body).encode() if body is not None else None,
        headers={"X-Goog-Api-Key": api_key(), "Content-Type": "application/json; charset=utf-8"},
        method="POST" if body is not None else "GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        try:
            detail = json.loads(detail)["error"]["message"]
        except Exception:
            pass
        raise SystemExit(f"Google TTS error {e.code}: {detail}") from None


def voices(lang: str) -> list[dict]:
    return call(f"voices?languageCode={lang}").get("voices", [])


def synthesize(voice: str, text: str, out: Path, rate: float = 1.0) -> Path:
    lang = "-".join(voice.split("-")[:2])
    res = call("text:synthesize", {
        "input": {"text": text},
        "voice": {"languageCode": lang, "name": voice},
        "audioConfig": {"audioEncoding": "MP3", "speakingRate": rate},
    })
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(base64.b64decode(res["audioContent"]))
    return out


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "voices":
        for v in voices(sys.argv[2]):
            print(v["name"], v.get("ssmlGender", ""))
    elif cmd == "say":
        print(synthesize(sys.argv[2], sys.argv[3], Path(sys.argv[4])))
    else:
        print(__doc__)
