#!/usr/bin/env python3
"""
Say what the narrator asset tree is missing, and what is in it that should
not be. The names are fixed by docs/narrator-build.md (B8, D5); this is the
enforcement.

    npm run narrator:check
"""
from __future__ import annotations

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, "public", "narrator")

CHARACTERS = ("marlow", "pennywhistle")
MOODS = ("neutral", "grave", "encouraged")
ACCENTS = {"marlow": ("spectacles", "lean"), "pennywhistle": ("headcock", "ruffle", "hop", "laugh")}

STILLS = [f"{c}_{m}.png" for c in CHARACTERS for m in MOODS] + [f"{c}_tab.png" for c in CHARACTERS]
VIDEOS = [f"{c}_{m}_idle.mp4" for c in CHARACTERS for m in MOODS] + [
    f"{c}_accent_{a}.mp4" for c in CHARACTERS for a in ACCENTS[c]
]
VIDEO_MAX_KB = 600


def listing(sub: str) -> set[str]:
    d = os.path.join(BASE, sub)
    return (
        {f for f in os.listdir(d) if not f.startswith(".") and os.path.isfile(os.path.join(d, f))}
        if os.path.isdir(d)
        else set()
    )


def report(title: str, expected: list[str], have: set[str]) -> int:
    missing = [f for f in expected if f not in have]
    extra = sorted(have - set(expected))
    print(f"{title}: {len(expected) - len(missing)}/{len(expected)}")
    for f in missing:
        print(f"  missing  {f}")
    for f in extra:
        print(f"  unexpected  {f}  (not a name the plan knows; rename or remove)")
    return len(missing) + len(extra)


def main() -> None:
    faults = 0
    faults += report("stills", STILLS, listing("stills"))
    have_video = listing("video")
    faults += report("video", VIDEOS, have_video)
    for f in sorted(have_video & set(VIDEOS)):
        kb = os.path.getsize(os.path.join(BASE, "video", f)) // 1024
        if kb > VIDEO_MAX_KB:
            print(f"  heavy  {f} is {kb} KB; the plan wants under ~500 (D4)")
            faults += 1

    manifest = os.path.join(BASE, "voicelines.json")
    lines = json.load(open(manifest, encoding="utf-8")) if os.path.exists(manifest) else []
    have_audio = listing("audio")
    want_audio = [f"{l['id']}.mp3" for l in lines if l.get("rendered")]
    faults += report("audio (rendered lines)", want_audio, have_audio)
    unrendered = [l["id"] for l in lines if not l.get("rendered")]
    if unrendered:
        print(f"  {len(unrendered)} line(s) written but not rendered yet: npm run voices")
    for l in lines:
        if re.search(r"[{}\[\]]", l.get("text", "")):
            print(f"  template  {l['id']}: lines carry no variables (E4)")
            faults += 1
    sys.exit(1 if faults else 0)


if __name__ == "__main__":
    main()
