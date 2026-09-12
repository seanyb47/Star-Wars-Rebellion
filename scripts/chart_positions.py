#!/usr/bin/env python3
"""
Where each island sits on the chart, read out of the painting.

The chart used to scatter its islands procedurally: ten seeded points inside a
disc, one disc per Reach. That was right while the chart was drawn in code —
the scatter came from the island's own name, so it was identical in every game
and cost nothing. It is wrong now that the chart is a painting, because the
painting already says where the islands are, and a mark floating in open water
next to a painted island reads as a mistake.

So the positions are derived from the image instead: find the painted land,
group it into the ten Reaches, and give each Reach's ten islands the ten
biggest pieces of land in its group. The output is committed as data, not
computed at runtime — the painting does not change between builds, and the
game should not ship a blob detector.

Re-run this when the chart painting is replaced:

    python3 scripts/chart_positions.py            # rewrite src/data/chart.json
    python3 scripts/chart_positions.py --overlay  # and an image to check it by

The ten seeds below are placed by hand against the painting. Automatic
clustering got eight of ten and then fought paper grain in the corners for the
last two, which is a bad trade: ten pairs of numbers, read off once, are more
reliable than a detector that has to be tuned every time the art changes.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAINTING = os.path.join(ROOT, "src", "art", "chart", "seas.webp")
REACHES = os.path.join(ROOT, "src", "data", "reaches.json")
OUT = os.path.join(ROOT, "src", "data", "chart.json")

# The chart's own coordinate space. 2:3, matching the painting, so a position
# in the image maps to a position on the chart by a single scale factor.
CHART_W, CHART_H = 1000, 1500

# Reach -> where its cluster sits, as a fraction of the painting. Read off the
# image by eye; snapped onto the painted land by the code below, so these only
# have to be close enough to pick the right cluster.
SEEDS: dict[str, tuple[float, float]] = {
    "Rime Reach": (0.186, 0.091),          # snow peaks, top left — the arctic one
    "Coral Reach": (0.854, 0.126),         # top right
    "Shipwrights' Reach": (0.195, 0.293),  # the long green chain down the left
    "Sovereign Reach": (0.504, 0.449),     # dead centre, the largest — Highwater
    "Cinder Reach": (0.215, 0.638),        # thin chain, lower left
    "Wreckers' Reach": (0.840, 0.677),     # the spiral — the Bone Sea whirlpool
    "Salt Reach": (0.512, 0.833),          # the long chain across the bottom
}
# Three seeds were removed rather than moved. Whalers' sat on islets too small
# to chart, and Sugar and Mirage ran together with their neighbours down the
# right-hand side. Each shared a Sea with one of the seven above, so the Sea
# keeps its place on the chart and only the second archipelago inside it is
# held back for a larger map.

# A blob has to be this big to count as an island rather than paper grain, and
# two islands have to be this far apart or their marks touch on a phone.
MIN_BLOB_PX = 6
# Far enough apart to be separate places when a chain is opened.
#
# This used to be 24, which was only asking that two marks not overlap on the
# main chart. Opening a chain zooms in 2.4x to 5.4x, and at that range 24 units
# put two islands on top of each other with their names crossing. 55 is what a
# chain view needs to read as seven to twelve distinct places, and it is why
# each Reach now holds as many islands as its painted cluster can carry at that
# spacing rather than a flat ten.
MIN_GAP_UNITS = 55
# Beyond this a blob belongs to no Reach. Without it the empty bottom corners
# get adopted by whichever cluster happens to be least far away.
MAX_REACH_UNITS = 210


def painted_islands(path: str) -> list[tuple[float, float, float]]:
    """Every piece of land in the painting, as (x, y, area) in chart units."""
    a = np.asarray(Image.open(path).convert("RGB"), dtype=float)
    h, w, _ = a.shape
    # Land is green or tan: its green channel at least matches its blue. Every
    # water in the painting, however pale, keeps blue above green.
    land = (a[:, :, 1] >= a[:, :, 2]) & (a[:, :, 1] > 70)
    lbl, n = ndimage.label(land, structure=np.ones((3, 3)))
    sizes = ndimage.sum(land, lbl, range(1, n + 1))
    cents = ndimage.center_of_mass(land, lbl, range(1, n + 1))
    sx, sy = CHART_W / w, CHART_H / h
    out = []
    for (cy, cx), area in zip(cents, sizes):
        if area < MIN_BLOB_PX:
            continue
        # The frame edge is paper, not coastline.
        if not (16 < cx < w - 16 and 16 < cy < h - 16):
            continue
        out.append((cx * sx, cy * sy, float(area)))
    return out


def spaced(blobs: list[tuple[float, float, float]], gap: float, want: int):
    """The biggest islands, taken in order, none closer than `gap` to another."""
    taken: list[tuple[float, float]] = []
    for x, y, _ in sorted(blobs, key=lambda b: -b[2]):
        if all((x - px) ** 2 + (y - py) ** 2 >= gap * gap for px, py in taken):
            taken.append((x, y))
        if len(taken) == want:
            break
    return taken


def pick(blobs: list[tuple[float, float, float]], want: int) -> list[tuple[float, float]]:
    """The `want` biggest islands, as far apart as this cluster can manage.

    Not "at least MIN_GAP" — the widest gap that still yields `want`. Stepping
    down in a few fixed jumps threw away most of the room: Coral and Rime both
    fit seven islands at 48 units, and a fallback that went straight from 55 to
    38.5 sat them at 41 for no reason.

    A Reach still gets the number of islands it asks for even where the
    painting is tight. The chain view is built to show that honestly rather
    than hide it — it tethers a mark to its real island when it has had to move
    one — but there is no reason to make it work harder than the cluster
    requires.
    """
    lo, hi = 0.0, MIN_GAP_UNITS
    if len(spaced(blobs, hi, want)) == want:
        return spaced(blobs, hi, want)
    for _ in range(24):  # bisect to within a fraction of a unit
        mid = (lo + hi) / 2
        if len(spaced(blobs, mid, want)) == want:
            lo = mid
        else:
            hi = mid
    return spaced(blobs, lo, want)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--overlay", action="store_true", help="also write an image to check it by")
    args = ap.parse_args()

    if not os.path.exists(PAINTING):
        sys.exit(f"no painting at {PAINTING} — add it with scripts/art.py first")
    reaches = json.load(open(REACHES))["reaches"]
    blobs = painted_islands(PAINTING)

    seeds = {k: (x * CHART_W, y * CHART_H) for k, (x, y) in SEEDS.items()}
    names = list(seeds)
    pos = np.array([seeds[n] for n in names])

    # Every blob joins its nearest seed, if it is near enough to belong at all.
    owned: dict[str, list] = {n: [] for n in names}
    for b in blobs:
        d = np.hypot(pos[:, 0] - b[0], pos[:, 1] - b[1])
        i = int(d.argmin())
        if d[i] <= MAX_REACH_UNITS:
            owned[names[i]].append(b)

    out = []
    for reach in reaches:
        name = reach["name"]
        if name not in owned:
            sys.exit(f"{name} has no seed in SEEDS — the painting and the data disagree")
        group = owned[name]
        order = reach["islands"]
        # A capital takes the biggest painted island in its Reach. Otherwise
        # the pairing is alphabetical accident and Highwater — the seat of the
        # world, drawn larger than anything else — lands on whatever islet the
        # list happened to start with.
        order = sorted(order, key=lambda i: not i.get("capital"))
        want = len(order)
        islands = pick(group, want)
        if len(islands) < want:
            # Short means the painting has fewer islands here than the game does.
            # Say so rather than silently drawing nine of ten.
            print(f"  ! {name}: painting offers {len(islands)} of {want}", file=sys.stderr)
        cx = sum(p[0] for p in islands) / len(islands)
        cy = sum(p[1] for p in islands) / len(islands)
        r = max(np.hypot(p[0] - cx, p[1] - cy) for p in islands)
        # Vertical half-extent, kept separately from the radius. A long thin
        # chain like Salt is 204 units wide and 120 tall; hanging its label off
        # the radius pushed it a hundred units past its own southern island and
        # into the next chain's name.
        ry = max(abs(p[1] - cy) for p in islands)
        out.append(
            {
                "reach": name,
                "sea": reach["sea"],
                "x": round(cx, 1),
                "y": round(cy, 1),
                "r": round(r, 1),
                "ry": round(ry, 1),
                "islands": [
                    {"name": isl["name"], "x": round(p[0], 1), "y": round(p[1], 1)}
                    for isl, p in zip(order, islands)
                ],
            }
        )

    # How bright the painting is where each chain sits.
    #
    # The chain view zooms 2.4x to 5.4x into this painting, and at that range a
    # crop is no longer "a dark sea": the Crown's chain fills the frame with a
    # lit green island whose brightest tenth reaches luma 99, where a
    # Confederacy mark measures 1.4:1 against a 3:1 floor. It needs a scrim —
    # but a flat one erases the chains whose crop was dark to begin with. So the
    # brightness is measured here, once, and the view scrims each chain by what
    # its own crop actually needs.
    im = Image.open(PAINTING).convert("L")
    iw, ih = im.size
    px = np.asarray(im, dtype=float)
    for entry in out:
        P = [(i["x"], i["y"]) for i in entry["islands"]]
        xs = [p[0] for p in P]
        ys = [p[1] for p in P]
        pad = 46
        # Widened to the chain view's proportion, the same way the view does it.
        w = max(xs) - min(xs) + pad * 2
        h = max(ys) - min(ys) + pad * 2
        want = 1000 / 1400
        if w / h > want:
            h = w / want
        else:
            w = h * want
        cx = (min(xs) + max(xs)) / 2
        cy = (min(ys) + max(ys)) / 2
        x0 = max(0, min(CHART_W - w, cx - w / 2)) if w <= CHART_W else cx - w / 2
        y0 = max(0, min(CHART_H - h, cy - h / 2)) if h <= CHART_H else cy - h / 2
        sx, sy = iw / CHART_W, ih / CHART_H
        box = px[
            max(0, int(y0 * sy)) : max(1, int((y0 + h) * sy)),
            max(0, int(x0 * sx)) : max(1, int((x0 + w) * sx)),
        ]
        entry["luma"] = round(float(np.percentile(box, 90)), 1) if box.size else 0.0

    doc = {
        "_comment": (
            "Generated by scripts/chart_positions.py from src/art/chart/seas.webp. "
            "Do not edit by hand — re-run the script when the painting changes. "
            f"Coordinates are in the chart's {CHART_W}x{CHART_H} space."
        ),
        "width": CHART_W,
        "height": CHART_H,
        "reaches": out,
    }
    with open(OUT, "w") as f:
        json.dump(doc, f, indent=1)
        f.write("\n")

    used = sum(len(r["islands"]) for r in out)
    print(f"{OUT.split('/')[-1]}: {len(out)} reaches, {used} islands, from {len(blobs)} painted bodies")
    for r in out:
        print(f"  {r['reach']:20} {r['sea']:18} {len(r['islands']):>2} at {r['x']:>5.0f},{r['y']:>6.0f}  r{r['r']:>4.0f}  crop luma {r['luma']:>5.1f}")

    if args.overlay:
        im = Image.open(PAINTING).convert("RGB")
        w, h = im.size
        d = ImageDraw.Draw(im)
        for r in out:
            for isl in r["islands"]:
                x, y = isl["x"] * w / CHART_W, isl["y"] * h / CHART_H
                d.ellipse([x - 9, y - 9, x + 9, y + 9], outline=(255, 210, 90), width=3)
            cx, cy = r["x"] * w / CHART_W, r["y"] * h / CHART_H
            d.text((cx - 40, cy - 6), r["reach"], fill=(255, 255, 255))
        p = os.path.join(ROOT, "chart-overlay.png")
        im.save(p)
        print(f"overlay: {p}")


if __name__ == "__main__":
    main()
