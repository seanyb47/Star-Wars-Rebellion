#!/usr/bin/env python3
"""Make the web-size copies of the narrator stills.

The PNGs ChatGPT delivers are 1122×1402 and two and a half megabytes each;
the game shows them in a frame 120 pixels wide. This writes a 512×640 WebP
of each mood still (the size the idle clips are) and a WebP of each tab crop
into `public/narrator/stills/web/`. Run it whenever a still changes:
`npm run narrator:web`.
"""
from __future__ import annotations

import os
import sys

from PIL import Image

BASE = os.path.join(os.path.dirname(__file__), "..", "public", "narrator", "stills")
OUT = os.path.join(BASE, "web")
CHARACTERS = ("marlow", "pennywhistle")
MOODS = ("neutral", "grave", "encouraged")


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    missing = 0
    for c in CHARACTERS:
        for m in MOODS:
            src = os.path.join(BASE, f"{c}_{m}.png")
            if not os.path.exists(src):
                print(f"  missing  {c}_{m}.png")
                missing += 1
                continue
            im = Image.open(src).convert("RGB").resize((512, 640), Image.LANCZOS)
            dst = os.path.join(OUT, f"{c}_{m}.webp")
            im.save(dst, "WEBP", quality=82, method=6)
            print(f"  {os.path.relpath(dst)}  {os.path.getsize(dst) // 1024} KB")
        src = os.path.join(BASE, f"{c}_tab.png")
        if os.path.exists(src):
            dst = os.path.join(OUT, f"{c}_tab.webp")
            Image.open(src).convert("RGB").save(dst, "WEBP", quality=85, method=6)
            print(f"  {os.path.relpath(dst)}  {os.path.getsize(dst) // 1024} KB")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
