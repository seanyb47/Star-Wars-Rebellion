#!/usr/bin/env python3
"""
Cut the contact sheets into individual assets.

The art arrived as five sheets, each 1536x1024 holding a whole set. That is a
preview format, not a delivery format, and the first instinct was to send it
back: every tile is smaller than the spec asked for and none of them is the
right shape.

That was the wrong call, and the reason is worth writing down. The spec sizes
were aspirational — 640x896 for a portrait because that is a nice size for a
painting, not because anything in the game displays one at 640x896. What the
game actually shows is a 44px medallion and a card about 220px wide. A 215px
tile serves both. So the frames move to fit the art rather than the art being
held back to fit the frames, and the register records the upscale honestly.

Each portrait yields two files. The full tile is the card art, because these
are three-quarter figures against a harbour and that is worth keeping. A square
crop around the head is the medallion, because a three-quarter figure shrunk
into a 44px circle is a smudge. Both come out of the same tile.

    python3 scripts/slice_sheets.py            # cut into scratch/
    python3 scripts/slice_sheets.py --install  # and add every one to the register
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = os.path.join(ROOT, "art-masters", "_sheets")
OUT = os.path.join(ROOT, "art-masters", "_sliced")

# Where the gutters fall in each sheet, measured once with a bright-and-uniform
# column/row detector and written down. The sheets do not change; re-detecting
# them on every run would only add a way to be wrong.
GRIDS: dict[str, dict] = {
    "portraits": {
        "rows": [(0, 255), (255, 508), (508, 762), (762, 1024)],
        "cols": [
            [255, 512, 768, 1024, 1280],
            [224, 446, 663, 875, 1089, 1312],
            [221, 440, 663, 875, 1093, 1312],
            [274, 523, 768, 1012, 1260],
        ],
        # The bottom fifth of a portrait tile is its name plate, which is
        # interface printed into the image and must not ship.
        "trim_bottom": 0.21,
    },
    "ships": {"rows": [(0, 506), (506, 1024)], "cols": [[383, 767, 1151]] * 2},
    "facilities": {
        "rows": [(0, 200), (200, 401), (401, 597), (597, 794), (794, 1024)],
        "cols": [[767]] * 5,
    },
    "islands": {
        "rows": [(0, 200), (200, 408), (408, 597), (597, 797), (797, 1024)],
        "cols": [[767]] * 5,
    },
    "creatures": {"rows": [(0, 312), (312, 663), (663, 1024)], "cols": [[], [767], [767]]},
}

# Sheet -> the subject each tile is, in reading order, as folder/slug.
SUBJECTS: dict[str, list[str]] = {
    "portraits": [
        "portraits/lord-regent-halvard-corvane", "portraits/admiral-corvus-blackwater",
        "portraits/captain-fenwick-pryor", "portraits/governor-tiberius-jarrold",
        "portraits/captain-lorne-neddam", "portraits/admiral-kendrick-ozmond",
        "portraits/colonel-maximilian-vierling", "portraits/commodore-elect-adaira-hale",
        "portraits/tam-calloway", "portraits/rosalind-ros-carrow",
        "portraits/captain-silas-reyne", "portraits/anselm-big-torvik",
        "portraits/admiral-dorian-jessup", "portraits/wyatt-ansell",
        "portraits/maren-quist", "portraits/pellam-voss", "portraits/sable",
        "portraits/hesper-lyn", "portraits/brannoc-tull", "portraits/wren-tally",
        "portraits/doctor-ambrose-kell", "portraits/captain-isolde-marrow",
        "portraits/the-widow-ashgrave", "portraits/tobias-renn",
        "portraits/silvaine-crow", "portraits/jory-halloran",
    ],
    "ships": [
        "ships/empire-large", "ships/empire-medium", "ships/empire-small", "ships/empire-transport",
        "ships/alliance-large", "ships/alliance-medium", "ships/alliance-small", "ships/alliance-transport",
    ],
    "facilities": [
        "islands/facility-mine-empire", "islands/facility-mine-alliance",
        "islands/facility-refinery-empire", "islands/facility-refinery-alliance",
        "islands/facility-construction-yard-empire", "islands/facility-construction-yard-alliance",
        "islands/facility-training-facility-empire", "islands/facility-training-facility-alliance",
        "islands/facility-shipyard-empire", "islands/facility-shipyard-alliance",
    ],
    "islands": [
        "islands/jungle-isle", "islands/rock-isle",
        "islands/port-city", "islands/free-harbor",
        "islands/mining-isle", "islands/reef-isle",
        "islands/storm-isle", "islands/ice-isle",
        "islands/drowned-isle", "islands/tide-isle",
    ],
    "creatures": [
        "creatures/sea-turtle",
        "creatures/ships-cat", "creatures/young-sea-dragon",
        "creatures/the-kraken", "creatures/ghost-ship",
    ],
}

GUTTER = 4  # the seam itself, trimmed off both sides of every cut


def tiles(name: str) -> list[Image.Image]:
    im = Image.open(os.path.join(SHEETS, f"{name}.webp")).convert("RGB")
    w, _ = im.size
    grid = GRIDS[name]
    trim = grid.get("trim_bottom", 0.0)
    out = []
    for (y0, y1), cols in zip(grid["rows"], grid["cols"]):
        xs = [0, *cols, w]
        h = y1 - y0
        for i in range(len(xs) - 1):
            left = xs[i] + (GUTTER if i else 0)
            right = xs[i + 1] - (GUTTER if i + 1 < len(xs) - 1 else 0)
            out.append(im.crop((left, y0, right, y0 + int(h * (1 - trim)))))
    return out


def figure_centre(im: Image.Image) -> float:
    """Where the subject stands, as a fraction of the width.

    Sky and sail are the bright background; the figure is the mass that reaches
    the bottom of the frame. Only its upper half counts — below that a coat
    flares and drags the centre off the face.

    Tried and rejected: finding skin tone directly. Warm-lit canvas, brass and
    rope all read as skin, and the marker landed on a collar or a hand about as
    often as a face.
    """
    a = np.asarray(im, dtype=float)
    h, w, _ = a.shape
    lum = 0.2126 * a[:, :, 0] + 0.7152 * a[:, :, 1] + 0.0722 * a[:, :, 2]
    background = (lum > 150) & (a[:, :, 2] >= a[:, :, 0] - 14)
    fg = ndimage.binary_opening(~background, np.ones((3, 3)), iterations=2)
    lbl, n = ndimage.label(fg)
    if n == 0:
        return 0.5
    touching = set(np.unique(lbl[-4:, :])) - {0}
    figure = max(touching or set(range(1, n + 1)), key=lambda c: int((lbl == c).sum()))
    ys, xs = np.where(lbl == figure)
    upper = ys < h * 0.5
    return float(xs[upper].mean()) / w if upper.sum() > 50 else 0.5


# The head sits at about a third of the way down every tile in the set, and the
# crop is a little over half the height. Checked by rendering all twenty-six as
# circles rather than by trusting the number.
FACE_Y = 0.34
FACE_SIDE = 0.62


def face(im: Image.Image) -> Image.Image:
    w, h = im.size
    side = int(h * FACE_SIDE)
    cx = int(min(max(figure_centre(im) * w, side / 2), w - side / 2))
    cy = int(min(max(FACE_Y * h, side / 2), h - side / 2))
    return im.crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--install", action="store_true", help="add every tile to the register")
    args = ap.parse_args()

    os.makedirs(OUT, exist_ok=True)
    jobs: list[tuple[str, str]] = []
    for sheet, subjects in SUBJECTS.items():
        cut = tiles(sheet)
        if len(cut) != len(subjects):
            sys.exit(f"{sheet}: cut {len(cut)} tiles for {len(subjects)} subjects")
        for subject, tile in zip(subjects, cut):
            slug = subject.replace("/", "__")
            path = os.path.join(OUT, f"{slug}.png")
            tile.save(path)
            jobs.append((path, subject))
            if sheet == "portraits":
                fpath = os.path.join(OUT, f"faces__{subject.split('/')[1]}.png")
                face(tile).save(fpath)
                jobs.append((fpath, f"faces/{subject.split('/')[1]}"))
        print(f"{sheet:11} {len(cut):>2} tiles")

    print(f"\n{len(jobs)} files in {os.path.relpath(OUT, ROOT)}")
    if not args.install:
        return

    src = "ChatGPT art project contact sheets, 12 Sep 2026"
    note = ("Cut from a contact sheet rather than delivered on its own, so it is "
            "upscaled from the tile size. Replace with an individual export when there is one.")
    for path, subject in jobs:
        r = subprocess.run(
            [sys.executable, os.path.join(ROOT, "scripts", "art.py"), "add", path, subject,
             "--source", src, "--note", note, "--allow-upscale"],
            capture_output=True, text=True,
        )
        if r.returncode:
            print(f"  ! {subject}: {r.stderr.strip().splitlines()[-1] if r.stderr else 'failed'}")
    print("installed")


if __name__ == "__main__":
    main()
