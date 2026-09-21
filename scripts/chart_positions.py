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

import math

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.spatial import ConvexHull

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
# Names follow latitude. The top of the chart is north — Rime's peaks are the
# arctic — so the northern clusters carry the cold names and the southern ones
# the warm: Coral is the spiral atoll in the south-east, because an atoll ring
# is a reef, and the dark forested diagonal in the north-east is the whaling
# ground. A Reach may have more than one seed point, though none needs it now.
SEEDS: dict[str, tuple[float, float] | list[tuple[float, float]]] = {
    # Sean's chart, 14 September. Rime is the dark northern chain and a few
    # of the bergs in the pack ice above it; Windward is the long chain down
    # the west; the rest sit where they are. The names here must match
    # `reaches.json` exactly — three of them were renamed on 21 September and
    # this table is the only other place they are written down.
    "Rime Reach": [(0.50, 0.16), (0.50, 0.05)],
    "Windward Reach": (0.18, 0.27),
    "Sovereign Reach": (0.50, 0.48),
    "Sunken Reach": (0.86, 0.32),
    "Mire Reach": (0.15, 0.60),
    "Coral Reach": (0.85, 0.65),
    "Salt Reach": (0.55, 0.84),
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
MIN_GAP_UNITS = 60
# Beyond this a blob belongs to no Reach. Without it the empty bottom corners
# get adopted by whichever cluster happens to be least far away.
MAX_REACH_UNITS = 210


# A landmass at least this big (painting pixels) is a coast with a port on
# it, not a dot: its mark goes where a harbour would be. Below it the island
# is the location. Tuned against the 1024x1536 chart: 1500px is an island
# about forty pixels across, the smallest at which centre and coast differ
# by more than a mark's width.
BIG_LANDMASS_PX = 1500
# The greatest landmass on the chart carries this many ports; every other
# big one carries one. Sean's rule: three port cities on the great island,
# and a city is never on a mountain in a maritime world.
PORTS_ON_THE_GREAT_ISLAND = 3
# Islands placed by hand, in chart units, after the painting has had its say.
# Sean looked at the chart and wanted the seat of the world on the great
# island's lagoon, and the library on its eastern bay. A pinned island takes
# no pick from the painting; the pin counts as taken when the rest are spaced.
PINS: dict[str, tuple[float, float]] = {
    "The Aldermain": (485.2, 707.0),
    "Cartmel": (584.0, 754.9),
}
PORT_GAP_PX = 60


def bays(mask: np.ndarray, want: int, gap_px: float) -> list[tuple[float, float]]:
    """The `want` deepest bays of a landmass's outer coast, spaced apart.

    A bay is a stretch of coast that sits well inside the landmass's convex
    hull: the deeper inside, the more sheltered the water, the more a port
    belongs there. The mask is hole-filled first so an inland lake or a dark
    valley cannot pass for a coast — the first draft of this put Highwater on
    the great island's mountain for exactly that reason.
    """
    filled = ndimage.binary_fill_holes(mask)
    edge = filled & ~ndimage.binary_erosion(filled, structure=np.ones((3, 3)))
    ys, xs = np.nonzero(edge)
    pts = np.stack([xs, ys], 1).astype(float)
    if len(pts) < 12:
        cy, cx = ndimage.center_of_mass(filled)
        return [(float(cx), float(cy))]
    hull = ConvexHull(pts)
    hp = pts[hull.vertices]
    step = max(1, len(pts) // 400)
    cand = pts[::step]

    def seg_dist(p, a, b):
        ab = b - a
        t = np.clip(((p - a) @ ab) / max(float(ab @ ab), 1e-9), 0, 1)
        return float(np.linalg.norm(p - (a + t * ab)))

    depth = np.array([min(seg_dist(p, hp[k], hp[(k + 1) % len(hp)]) for k in range(len(hp))) for p in cand])
    sites: list[tuple[float, float]] = []
    for j in np.argsort(-depth):
        p = cand[j]
        if all(np.hypot(p[0] - q[0], p[1] - q[1]) >= gap_px for q in sites):
            sites.append((float(p[0]), float(p[1])))
        if len(sites) == want:
            break
    return sites


def painted_islands(path: str) -> list[tuple[float, float, float, bool]]:
    """Every location the painting offers, as (x, y, weight, ice) in chart units.

    A small island is its own centre. A big one is a port on its coast — the
    deepest bay — and the greatest of all carries three. The weight is the
    landmass's area, so the biggest places are taken first and a capital
    lands on the great island rather than an islet.
    """
    a = np.asarray(Image.open(path).convert("RGB"), dtype=float)
    h, w, _ = a.shape
    # Land is green or tan: its green channel at least matches its blue. Every
    # water in the painting, however pale, keeps blue above green.
    land = (a[:, :, 1] >= a[:, :, 2]) & (a[:, :, 1] > 70)
    # Ice is land too: pack ice and bergs read as near-white, brighter than
    # any water in the painting, including the pale shallows.
    ice = (a[:, :, 0] > 185) & (a[:, :, 1] > 185) & (a[:, :, 2] > 185)
    land = land | ice
    # A coastline drawn with a broken pen is still one island.
    land = ndimage.binary_closing(land, structure=np.ones((3, 3)))
    lbl, n = ndimage.label(land, structure=np.ones((3, 3)))
    sizes = ndimage.sum(land, lbl, range(1, n + 1))
    cents = ndimage.center_of_mass(land, lbl, range(1, n + 1))
    # A blob inside a hole of a bigger landmass — an islet in a lake, a peak
    # the green test missed — is not an island. A city in a maritime world
    # is on a coast; a mark on a mountain top says otherwise.
    filled = ndimage.binary_fill_holes(land)
    flbl, fn = ndimage.label(filled, structure=np.ones((3, 3)))
    fsizes = ndimage.sum(filled, flbl, range(1, fn + 1))
    sx, sy = CHART_W / w, CHART_H / h
    ice_share = ndimage.sum(ice, lbl, range(1, n + 1)) / np.maximum(sizes, 1)
    greatest = int(np.argmax(sizes)) + 1
    out = []
    for i, ((cy, cx), area) in enumerate(zip(cents, sizes), 1):
        if area < MIN_BLOB_PX:
            continue
        # The frame edge is paper, not coastline.
        if not (16 < cx < w - 16 and 16 < cy < h - 16):
            continue
        frozen = bool(ice_share[i - 1] > 0.5)
        f = flbl[int(cy), int(cx)]
        if f and fsizes[f - 1] > 3 * area:
            continue
        if area >= BIG_LANDMASS_PX:
            want = PORTS_ON_THE_GREAT_ISLAND if i == greatest else 1
            for (px, py) in bays(lbl == i, want, PORT_GAP_PX):
                out.append((px * sx, py * sy, float(area), frozen))
        else:
            out.append((cx * sx, cy * sy, float(area), frozen))
    return out


# The radius, in chart units, of the water an island's room is measured in.
# About the width of a chain-map mark and its label: the land you would say
# "belongs" to the place when you look at the chart.
ROOM_RADIUS_UNITS = 40

_land_mask: np.ndarray | None = None


def land_near(x: float, y: float) -> float:
    """The fraction of a ROOM_RADIUS disc around (x, y) that is painted land."""
    global _land_mask
    if _land_mask is None:
        a = np.asarray(Image.open(PAINTING).convert("RGB"), dtype=float)
        land = (a[:, :, 1] >= a[:, :, 2]) & (a[:, :, 1] > 70)
        ice = (a[:, :, 0] > 185) & (a[:, :, 1] > 185) & (a[:, :, 2] > 185)
        closed = ndimage.binary_closing(land | ice, structure=np.ones((3, 3)))
        # Holes filled: a lagoon, a lake, a peak the green test missed are all
        # the island's own ground when you look at the chart.
        _land_mask = ndimage.binary_fill_holes(closed)
    h, w = _land_mask.shape
    px, py = x * w / CHART_W, y * h / CHART_H
    r = ROOM_RADIUS_UNITS * w / CHART_W
    y0, y1 = max(0, int(py - r)), min(h, int(py + r) + 1)
    x0, x1 = max(0, int(px - r)), min(w, int(px + r) + 1)
    yy, xx = np.mgrid[y0:y1, x0:x1]
    disc = (xx - px) ** 2 + (yy - py) ** 2 <= r * r
    return round(float(_land_mask[y0:y1, x0:x1][disc].sum() / max(disc.sum(), 1)), 3)


def spaced(blobs: list[tuple[float, float, float]], gap: float, want: int, held=()):
    """The biggest islands, taken in order, none closer than `gap` to another.

    `held` are points already taken — pinned islands — that the picks keep
    their distance from without being counted.
    """
    taken: list = []
    for b in sorted(blobs, key=lambda b: -b[2]):
        x, y = b[0], b[1]
        near = [(q[0], q[1]) for q in taken] + list(held)
        if all((x - px) ** 2 + (y - py) ** 2 >= gap * gap for px, py in near):
            taken.append(b)
        if len(taken) == want:
            break
    return taken


def pick(blobs: list[tuple[float, float, float]], want: int, held=()) -> list:
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
    if len(spaced(blobs, hi, want, held)) == want:
        return spaced(blobs, hi, want, held)
    for _ in range(24):  # bisect to within a fraction of a unit
        mid = (lo + hi) / 2
        if len(spaced(blobs, mid, want, held)) == want:
            lo = mid
        else:
            hi = mid
    return spaced(blobs, lo, want, held)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--overlay", action="store_true", help="also write an image to check it by")
    args = ap.parse_args()

    if not os.path.exists(PAINTING):
        sys.exit(f"no painting at {PAINTING} — add it with scripts/art.py first")
    reaches = json.load(open(REACHES))["reaches"]
    blobs = painted_islands(PAINTING)

    # Flatten to (reach, point) pairs so a Reach with two seeds is two points.
    points: list[tuple[str, tuple[float, float]]] = []
    for k, v in SEEDS.items():
        for (x, y) in (v if isinstance(v, list) else [v]):
            points.append((k, (x * CHART_W, y * CHART_H)))
    names = list(SEEDS)
    pos = np.array([p for _, p in points])

    # Every blob joins its nearest seed point, if it is near enough to belong
    # at all, and the point's Reach owns it.
    owned: dict[str, list] = {n: [] for n in names}
    for b in blobs:
        d = np.hypot(pos[:, 0] - b[0], pos[:, 1] - b[1])
        i = int(d.argmin())
        if d[i] <= MAX_REACH_UNITS:
            owned[points[i][0]].append(b)

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
        # …and the ports of the great island take its other harbours, which are
        # the next-heaviest places in the Reach after the capital's.
        order = sorted(order, key=lambda i: (not i.get("capital"), not i.get("port")))
        # Islands flagged as ice take the bergs; everything else takes the
        # rock. Rime is the one Reach with both, and "a few icy islands" is
        # exactly as many as carry the flag.
        pinned = [i for i in order if i["name"] in PINS]
        held = [PINS[i["name"]] for i in pinned]
        ice_names = [i for i in order if i.get("ice") and i["name"] not in PINS]
        land_names = [i for i in order if not i.get("ice") and i["name"] not in PINS]
        land_blobs = [b for b in group if not b[3]]
        ice_blobs = [b for b in group if b[3]]
        land_picks = pick(land_blobs, len(land_names), held)
        ice_picks = pick(ice_blobs, len(ice_names), held) if ice_names else []
        order = pinned + land_names + ice_names
        # A pinned island's land is measured where it stands, like any other.
        islands = [(x, y, 0.0, False) for x, y in held] + land_picks + ice_picks
        want = len(order)
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
                    {
                        "name": isl["name"],
                        "x": round(p[0], 1),
                        "y": round(p[1], 1),
                        # How much of the sea around the mark is painted
                        # land, 0 to 1. The game sizes an island's room from
                        # this: a rock in open water has nowhere to build, a
                        # harbour with the great island at its back has room
                        # for a city.
                        "land": land_near(p[0], p[1]),
                    }
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

    # --- Where each chain's name goes -------------------------------------
    #
    # The name sits on its chain. The first scorer kept names clear of painted
    # coastline, and that sent half of them into the water between chains,
    # where a name reads as belonging to whichever cluster it is nearest —
    # Shipwrights' landed between its own islands and Cinder's. The names are
    # drawn with a dark stroke behind them, so coastline under them costs
    # nothing; what does cost is an island's mark under the letters, and a
    # name far from home. So: as close to the chain's centre as it can get
    # without covering any island's mark, its own or a neighbour's, or another
    # name. A chain with a gap in it — Coral's ring, the water inside
    # Sovereign — takes the gap.
    #
    # Biggest chain first, so the crowded middle of the chart is settled
    # before the edges have to work around it.
    every = [(i["x"], i["y"]) for e in out for i in e["islands"]]

    def box(name: str, x: float, y: float) -> tuple[float, float, float, float]:
        # Two lines of 36px italic serif, broken at the last space, anchored
        # on the first line's baseline. Width from the longer word.
        longest = max(len(w) for w in name.split(" "))
        half_w = longest * 10 + 8
        return (x - half_w, y - 32, x + half_w, y + 48)

    def overlaps(a, b, pad=0.0) -> bool:
        return a[0] - pad < b[2] and b[0] - pad < a[2] and a[1] - pad < b[3] and b[1] - pad < a[3]

    # Names placed by hand, in chart units, where the scorer's best was not
    # where the eye wanted it. The scorer still searches around the pin and
    # still refuses to cover an island's mark; the pin only says which side
    # of the chain the name belongs on. Rime reads as its snow islands' name
    # from under their left end, not from the open water to their right;
    # Shipwrights' belongs under the foot of its chain, not out in the
    # channel beside Sovereign; Salt sits on its own chain's shoulder.
    LABEL_PINS: dict[str, tuple[float, float]] = {}

    # The foot of the chart belongs to the layer strip.
    FOOT = 250.0
    placed: list[tuple[float, float, float, float]] = []
    for entry in sorted(out, key=lambda e: -len(e["islands"])):
        cx, cy = entry["x"], entry["y"]
        name = entry["reach"]
        mine = {(i["x"], i["y"]) for i in entry["islands"]}
        pinned = name in LABEL_PINS
        hx, hy = LABEL_PINS.get(name, (cx, cy))
        span = 72 if pinned else 260
        best, best_score = (hx, hy), -1e9
        for dy in range(-span, span + 1, 12):
            for dx in range(-span, span + 1, 12):
                x, y = hx + dx, hy + dy
                b = box(name, x, y)
                if b[0] < 8 or b[2] > CHART_W - 8 or b[1] < 8:
                    continue
                if b[3] > CHART_H + 170 - FOOT:
                    continue
                # An island's mark under the letters: 8 units of dot and a
                # little air. Its own islands count the same as a neighbour's.
                covered = sum(
                    1 for (ix, iy) in every if b[0] - 14 < ix < b[2] + 14 and b[1] - 14 < iy < b[3] + 14
                )
                clash = sum(1 for pb in placed if overlaps(b, pb, 16))
                # Company: a name beside its own islands and away from
                # anyone else's. A long thin chain has no inside for a name
                # to sit in, so it sits alongside — and the side that matters
                # is the one that is not also alongside the next chain.
                # Shipwrights' east side is Sovereign's west side.
                own = sum(1 for (ix, iy) in mine if math.hypot(ix - x, iy - y) < 190)
                foreign = sum(1 for (ix, iy) in every if (ix, iy) not in mine and math.hypot(ix - x, iy - y) < 210)
                # Home first: the pull to the centre is what keeps a name on
                # its chain rather than in the nearest clear water.
                score = (
                    -math.hypot(dx, dy * 1.3) * (3 if pinned else 1)
                    - covered * 400
                    - clash * 800
                    + min(own, 5) * 22
                    - foreign * 70
                )
                if score > best_score:
                    best, best_score = (x, y), score
        entry["label"] = {"x": round(best[0], 1), "y": round(best[1], 1)}
        placed.append(box(name, *best))

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
