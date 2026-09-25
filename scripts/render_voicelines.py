#!/usr/bin/env python3
"""
Render the advisors' voice lines that have not been rendered yet.

    npm run voices            # render every line with rendered: false
    npm run voices -- --dry   # say what would be rendered, touch nothing

The rules, from docs/narrator-build.md (E2, E6):

- Voice settings come from the world bible, section "NARRATOR VOICES", and
  from nowhere else. There is no default in this file. If the bible's block
  for a character is unfilled, that character's lines are not rendered and
  the script says so.
- The manifest (public/narrator/voicelines.json) is append-only. A line with
  rendered: true is never touched, whatever the settings now say. That is the
  whole point: batch nine must sound like batch one.
- Each line is a complete thought with no variables. The script refuses a
  text containing "{", "}" or "[" rather than render a template.
- The manifest is saved after every successful render, so a failure part-way
  through keeps what was done.

Needs ELEVENLABS_API_KEY in the environment. Uses the plain REST API so there
is nothing to install.
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIBLE = os.path.join(ROOT, "seven-seas-world-bible.md")
MANIFEST = os.path.join(ROOT, "public", "narrator", "voicelines.json")
AUDIO_DIR = os.path.join(ROOT, "public", "narrator", "audio")

CHARACTERS = ("marlow", "pennywhistle")
MOODS = ("neutral", "grave", "encouraged")
# What makes a line play. The first six are the advisor's own sheet — the
# questions you can ask her. The seven after are the `EventKind`s the log
# sorts by: Sean, 22 September, *"for notifications, we can also add
# 'Narrator'"*, and then *"And voice also"*, so the advisor now speaks the
# news as well as answering questions. One vocabulary for both, because a
# line is a line and the manifest should not need two shapes to hold them.
# `news_*` are prefixed on purpose: `war` is both a question she answers and
# a kind of news the log sorts by, and an unprefixed list would have had her
# answering "how is the war going" every time a war ended.
QUESTIONS = (
    "tutorial", "build", "free", "trouble", "defect", "war",
    "news_war", "news_flip", "news_mutiny", "news_battle",
    "news_mission", "news_order", "news_loss",
)
REQUIRED = ("voice_id", "model_id", "stability", "similarity_boost", "style")


def voice_settings() -> dict[str, dict]:
    """The locked settings per character, read from the bible's fenced JSON block."""
    text = open(BIBLE, encoding="utf-8").read()
    m = re.search(r"<!-- narrator-voices -->\s*```json\s*(.*?)```", text, re.S)
    if not m:
        sys.exit("world bible has no narrator-voices block — see docs/narrator-build.md E2")
    block = json.loads(m.group(1))
    ready: dict[str, dict] = {}
    for who in CHARACTERS:
        s = block.get(who) or {}
        missing = [k for k in REQUIRED if s.get(k) in (None, "")]
        if missing:
            print(f"  {who}: settings not locked yet (missing {', '.join(missing)}) — skipped")
            continue
        ready[who] = s
    return ready


def check_line(line: dict) -> str | None:
    for k in ("id", "character", "mood", "question", "text"):
        if not line.get(k):
            return f"missing {k}"
    if line["character"] not in CHARACTERS:
        return f"unknown character {line['character']!r}"
    if line["mood"] not in MOODS:
        return f"unknown mood {line['mood']!r}"
    if line["question"] not in QUESTIONS:
        return f"unknown question {line['question']!r}"
    if not line["id"].startswith(line["character"] + "_"):
        return "id must start with the character's stem"
    if re.search(r"[{}\[\]]", line["text"]):
        return "text looks like a template; lines carry no variables"
    return None


def render(text: str, s: dict, key: str) -> bytes:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{s['voice_id']}?output_format=mp3_44100_128"
    body = {
        "text": text,
        "model_id": s["model_id"],
        "voice_settings": {
            "stability": s["stability"],
            "similarity_boost": s["similarity_boost"],
            "style": s["style"],
            "use_speaker_boost": bool(s.get("use_speaker_boost", True)),
        },
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def main() -> None:
    dry = "--dry" in sys.argv or "--dry-run" in sys.argv
    lines = json.load(open(MANIFEST, encoding="utf-8"))
    seen: set[str] = set()
    for line in lines:
        err = check_line(line)
        if err:
            sys.exit(f"voicelines.json: {line.get('id', '?')}: {err}")
        if line["id"] in seen:
            sys.exit(f"voicelines.json: duplicate id {line['id']}")
        seen.add(line["id"])

    todo = [l for l in lines if not l.get("rendered")]
    print(f"{len(lines)} lines, {len(lines) - len(todo)} rendered, {len(todo)} to do")
    if not todo:
        return
    settings = voice_settings()
    key = os.environ.get("ELEVENLABS_API_KEY", "")
    if not dry and not key:
        sys.exit("ELEVENLABS_API_KEY is not set")
    os.makedirs(AUDIO_DIR, exist_ok=True)

    done = 0
    for line in todo:
        who = line["character"]
        if who not in settings:
            continue
        out = os.path.join(AUDIO_DIR, f"{line['id']}.mp3")
        if dry:
            print(f"  would render {line['id']}: {line['text']!r}")
            continue
        try:
            audio = render(line["text"], settings[who], key)
        except urllib.error.HTTPError as e:
            sys.exit(f"{line['id']}: HTTP {e.code} {e.read()[:200]!r}")
        with open(out, "wb") as f:
            f.write(audio)
        line["rendered"] = True
        done += 1
        # Save after every line: a failure part-way keeps what was done.
        with open(MANIFEST, "w", encoding="utf-8") as f:
            json.dump(lines, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"  rendered {line['id']} ({len(audio) // 1024} KB)")
    print(f"{done} rendered" if not dry else "dry run, nothing written")


if __name__ == "__main__":
    main()
