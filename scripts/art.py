#!/usr/bin/env python3
"""
The art register: where every painting came from, and what was done to it.

The game itself needs none of this. `src/ui/painted.ts` globs `src/art/` and
matches by slug, so a painting works the moment it is dropped in the right
folder with the right name. That stays true and this tool never gets in its way.

What the game cannot tell you is anything about a painting's *past*, and that is
the whole cost of changing one later:

  - The file the game ships is small and cropped. The delivered image was two to
    four times larger. Once only the small one exists, re-cropping means asking
    for the painting again.
  - Nobody remembers which crop was taken. "Move it up a bit" is a five-second
    job against a recorded box and a guessing game without one.
  - Nobody remembers what a file used to be. Replacing a painting you later
    regret should be undoable.

So: masters are kept at full delivered resolution in `art-masters/`, outside
`src/` so no glob and no bundle ever sees them; the crop that produced the
shipped file is recorded; and a replaced master is not deleted, it is retired.

    scripts/art.py add <file> <folder>/<slug> [--crop ...] [--title ...]
    scripts/art.py recrop <folder>/<slug> --crop x,y,w,h
    scripts/art.py list [--missing]
    scripts/art.py check
    scripts/art.py doc

`check` and `doc` are the two worth running on their own: the first says whether
the register still matches the disk, the second regenerates ASSETS.md.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import json
import os
import re
import sys

try:
    from PIL import Image
except ImportError:  # pragma: no cover - the message is the whole point
    sys.exit("Pillow is required: pip install Pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "art-manifest.json")
MASTERS = os.path.join(ROOT, "art-masters")
RETIRED = os.path.join(MASTERS, "_retired")
SHIPPED = os.path.join(ROOT, "src", "art")
PROMPTS = os.path.join(ROOT, "art-prompts.md")
DOC = os.path.join(ROOT, "ASSETS.md")

# The size each folder ships at, from seven-seas-art-style.md §8. A painting is
# cropped to this aspect and resized to exactly this, so a folder is guaranteed
# uniform however varied the deliveries are.
# Sizes follow the art that exists, not the art that was hoped for. The
# originals were picked as nice sizes for a painting (a portrait at 640x896);
# nothing in the game displays one at that size, and holding the delivered set
# back for failing a number nothing reads would have been the wrong trade. What
# the game shows is a 44px medallion, a card about 220px wide, and a strip on an
# island panel — these are cut to those.
FOLDERS: dict[str, tuple[int, int, str]] = {
    "portraits": (480, 436, "three-quarter figure against its harbour; the card art"),
    "faces": (256, 256, "the head, cropped square out of the portrait; the medallion"),
    "ships": (384, 512, "three-quarter view, whole vessel"),
    "islands": (768, 204, "low approach, as if from a boat; a banner on the island panel"),
    "creatures": (768, 352, "the natural world, and where the 20% fantasy is allowed out"),
    "scenes": (1024, 432, "full-bleed dispatch banner, quiet sky"),
    # The one painting the interface draws on top of, so it ships at the chart's
    # own proportion and is judged by whether a mark reads against it.
    "chart": (1024, 1536, "top-down chart ground, quiet where the chains sit"),
}

# A card should appear rather than arrive, so 120KB. The chart is the exception:
# it is one full-screen image that loads once and stays for the whole game, and
# it is the thing you look at most. Starving it of detail to save 200KB would be
# the wrong trade.
BUDGET: dict[str, int] = {"chart": 320 * 1024}

# Shipped files are quality 82 and must stay under 120KB — a card should appear,
# not arrive. Masters are quality 96, which is a deliberate compromise: lossless
# WebP of a 1932x814 painting is 1.8MB against 0.5MB at 96, and the measured
# difference after a re-crop and downscale to shipping size is 1.4/255 per
# channel. Sixty-six masters is the difference between a 33MB repo and a 117MB
# one, and nobody can see the 1.4.
SHIP_QUALITY = 82
MASTER_QUALITY = 96
SHIP_MAX_BYTES = 120 * 1024


def budget(folder: str) -> int:
    return BUDGET.get(folder, SHIP_MAX_BYTES)


# --------------------------------------------------------------------------
# manifest


def load() -> dict:
    if not os.path.exists(MANIFEST):
        return {"assets": {}}
    with open(MANIFEST) as f:
        return json.load(f)


def save(data: dict) -> None:
    data["assets"] = dict(sorted(data["assets"].items()))
    with open(MANIFEST, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def today() -> str:
    return _dt.date.today().isoformat()


def slugify(name: str) -> str:
    """The same rule as painted.ts, so a register key is a game lookup key."""
    name = name.lower()
    name = re.sub(r"[\"'’.]", "", name)
    name = re.sub(r"[^a-z0-9]+", "-", name)
    return name.strip("-")


def sha1(path: str) -> str:
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def rel(path: str) -> str:
    return os.path.relpath(path, ROOT)


def stamp(path: str) -> dict:
    with Image.open(path) as im:
        w, h = im.size
    return {"file": rel(path), "w": w, "h": h, "bytes": os.path.getsize(path), "sha1": sha1(path)}


# --------------------------------------------------------------------------
# what the game is *supposed* to have


def planned() -> dict[str, str]:
    """Every subject the prompts call for, keyed `folder/slug` -> title.

    Parsed from art-prompts.md rather than typed out again. Two hand-kept lists
    of the same sixty-odd subjects would disagree within a week, and the prompts
    file is the one people actually edit.
    """
    out: dict[str, str] = {}
    if not os.path.exists(PROMPTS):
        return out
    title = ""
    for line in open(PROMPTS):
        head = re.match(r"^#{3}\s+(.*)", line)
        if head:
            title = head.group(1).strip()
            continue
        path = re.match(r"^`([a-z]+)/([a-z0-9-]+)\.webp`\s*$", line.strip())
        if path:
            out[f"{path.group(1)}/{path.group(2)}"] = title
    return out


# --------------------------------------------------------------------------
# adding


def parse_crop(spec: str | None, mw: int, mh: int, tw: int, th: int) -> dict | None:
    """A crop box in master pixels, or None for 'the whole frame'.

    `auto` is the largest centred box at the shipping aspect, which is what you
    want the overwhelming majority of the time: a delivery is usually already
    the right shape and auto is then a no-op.
    """
    if spec in (None, "", "auto"):
        want = tw / th
        have = mw / mh
        # Exact, not near enough. A delivery two pixels off the shipping aspect
        # looks like it needs no crop, and resizing it anyway squashes the
        # painting by a fraction of a percent — which is invisible in the middle
        # of the frame and a full pixel of smear at both edges, where the
        # rigging is. Measured: the difference showed up as 12/255 down the left
        # and right quarters against 1/255 through the centre. Crop the two
        # pixels off instead.
        if abs(want - have) < 1e-9:
            return None  # already exactly the right shape; resize is the whole job
        if have > want:
            w = int(round(mh * want))
            return {"x": (mw - w) // 2, "y": 0, "w": w, "h": mh}
        h = int(round(mw / want))
        return {"x": 0, "y": (mh - h) // 2, "w": mw, "h": h}
    if spec == "none":
        return None
    nums = [int(n) for n in re.split(r"[,\sx]+", spec.strip()) if n]
    if len(nums) != 4:
        sys.exit(f"--crop wants x,y,w,h (or auto/none), got {spec!r}")
    x, y, w, h = nums
    if x < 0 or y < 0 or x + w > mw or y + h > mh:
        sys.exit(f"crop {x},{y},{w},{h} falls outside the {mw}x{mh} master")
    return {"x": x, "y": y, "w": w, "h": h}


def parse_tone(spec: str | None) -> dict | None:
    """A tone adjustment applied on the way out of the master.

    Only gamma so far, and only because it was needed: the chart painting came
    back at luma 56 where the interface needs about 25, and a Confederacy mark
    on it measured 2.7:1 against a 3:1 floor. Darkening it here rather than
    asking for a repaint keeps every brushstroke and stays reversible — the
    master is untouched and the curve is recorded, so `recrop` can change it.

    Never use this to fix composition. It exists for value, which is the one
    thing a painting can be right about everywhere and still wrong for a screen.
    """
    if not spec:
        return None
    if ":" not in spec:
        sys.exit(f"--tone wants name:value, e.g. gamma:1.6 (got {spec!r})")
    name, value = spec.split(":", 1)
    if name != "gamma":
        sys.exit(f"unknown tone {name!r}; only gamma so far")
    return {"gamma": float(value)}


def apply_tone(im: "Image.Image", tone: dict | None) -> "Image.Image":
    if not tone:
        return im
    g = tone["gamma"]
    # 8-bit LUT: exact, fast, and no numpy dependency for the common path.
    lut = [min(255, round(255 * ((i / 255) ** g))) for i in range(256)]
    return im.point(lut * len(im.getbands()))


def render(
    master_path: str, folder: str, crop: dict | None, out_path: str, tone: dict | None = None
) -> None:
    """Cut the shipped file out of the master. The only place this happens."""
    tw, th, _ = FOLDERS[folder]
    with Image.open(master_path) as im:
        im = im.convert("RGB")
        if crop:
            im = im.crop((crop["x"], crop["y"], crop["x"] + crop["w"], crop["y"] + crop["h"]))
        im = im.resize((tw, th), Image.LANCZOS)
        im = apply_tone(im, tone)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        im.save(out_path, "WEBP", quality=SHIP_QUALITY, method=6)
    cap = budget(folder)
    if os.path.getsize(out_path) > cap:
        print(
            f"  ! {rel(out_path)} is {os.path.getsize(out_path)//1024}KB, "
            f"over the {cap//1024}KB budget",
            file=sys.stderr,
        )


def retire(entry: dict) -> None:
    """Move the outgoing master aside instead of overwriting it.

    The point of the whole exercise is that a change can be undone. A retired
    master costs half a megabyte; asking for the painting again costs a day.
    """
    old = os.path.join(ROOT, entry["master"]["file"])
    if not os.path.exists(old):
        return
    folder, slug = entry["folder"], entry["slug"]
    dest_dir = os.path.join(RETIRED, folder)
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, f"{slug}.v{entry['version']}.webp")
    os.replace(old, dest)
    entry.setdefault("history", []).append(
        {
            "version": entry["version"],
            "retired": today(),
            "master": rel(dest),
            "crop": entry.get("crop"),
            "tone": entry.get("tone"),
            "source": entry.get("source"),
        }
    )


def cmd_add(args) -> None:
    if "/" not in args.key:
        sys.exit("key is folder/slug, e.g. scenes/battle or portraits/sable")
    folder, slug = args.key.split("/", 1)
    slug = slugify(slug)
    if folder not in FOLDERS:
        sys.exit(f"unknown folder {folder!r}; one of {', '.join(FOLDERS)}")
    if not os.path.exists(args.file):
        sys.exit(f"no such file: {args.file}")

    tw, th, _ = FOLDERS[folder]
    with Image.open(args.file) as probe:
        pw, ph = probe.size
    upscaled = pw < tw or ph < th
    if upscaled and not args.allow_upscale:
        # Upscaling is the one thing this pipeline must never *quietly* do: a
        # master smaller than the shipped file is not a master, and the result
        # is a soft image nobody can explain later. Doing it on purpose is
        # allowed; doing it by accident is not.
        sys.exit(
            f"{args.file} is {pw}x{ph}, smaller than the {folder} size {tw}x{th}"
            " — pass --allow-upscale if that is intended"
        )

    data = load()
    key = f"{folder}/{slug}"
    entry = data["assets"].get(key)

    with Image.open(args.file) as im:
        mw, mh = im.size
        src = im.convert("RGB")
        master_path = os.path.join(MASTERS, folder, f"{slug}.webp")
        if entry:
            retire(entry)
        os.makedirs(os.path.dirname(master_path), exist_ok=True)
        src.save(master_path, "WEBP", quality=MASTER_QUALITY, method=6)

    crop = parse_crop(args.crop, mw, mh, tw, th)
    tone = parse_tone(args.tone)
    ship_path = os.path.join(SHIPPED, folder, f"{slug}.webp")
    render(master_path, folder, crop, ship_path, tone)

    if entry is None:
        entry = {"folder": folder, "slug": slug, "version": 0, "added": today()}
        data["assets"][key] = entry
    entry["version"] += 1
    entry["updated"] = today()
    entry["title"] = args.title or entry.get("title") or planned().get(key) or slug.replace("-", " ").title()
    if args.source:
        entry["source"] = args.source
    entry.setdefault("source", "unrecorded")
    if args.note:
        entry["notes"] = args.note
    entry["crop"] = crop
    entry["tone"] = tone
    entry["upscaled"] = upscaled or None
    entry["master"] = stamp(master_path)
    entry["shipped"] = stamp(ship_path)

    save(data)
    write_doc(data)
    c = "whole frame" if crop is None else f"{crop['w']}x{crop['h']} at {crop['x']},{crop['y']}"
    print(f"{key} v{entry['version']}")
    print(f"  master  {rel(master_path)}  {mw}x{mh}  {os.path.getsize(master_path)//1024}KB")
    print(f"  shipped {rel(ship_path)}  {tw}x{th}  {os.path.getsize(ship_path)//1024}KB  ({c})")


def cmd_recrop(args) -> None:
    data = load()
    entry = data["assets"].get(args.key)
    if not entry:
        sys.exit(f"{args.key} is not in the register; add it first")
    master_path = os.path.join(ROOT, entry["master"]["file"])
    if not os.path.exists(master_path):
        sys.exit(f"master missing: {entry['master']['file']}")
    folder = entry["folder"]
    tw, th, _ = FOLDERS[folder]
    crop = parse_crop(args.crop, entry["master"]["w"], entry["master"]["h"], tw, th)
    tone = parse_tone(args.tone) if args.tone is not None else entry.get("tone")
    ship_path = os.path.join(SHIPPED, folder, f"{entry['slug']}.webp")
    render(master_path, folder, crop, ship_path, tone)
    entry["crop"] = crop
    entry["tone"] = tone
    entry["upscaled"] = upscaled or None
    entry["shipped"] = stamp(ship_path)
    entry["updated"] = today()
    save(data)
    write_doc(data)
    print(f"{args.key} recropped -> {rel(ship_path)} {os.path.getsize(ship_path)//1024}KB")


# --------------------------------------------------------------------------
# reading back


def cmd_list(args) -> None:
    data = load()
    want = planned()
    keys = sorted(set(want) | set(data["assets"]))
    for key in keys:
        e = data["assets"].get(key)
        if args.missing and e:
            continue
        title = (e or {}).get("title") or want.get(key, "")
        if e:
            m, s = e["master"], e["shipped"]
            print(
                f"  {key:44} v{e['version']}  {m['w']}x{m['h']} -> {s['w']}x{s['h']}"
                f"  {s['bytes']//1024:>3}KB  {title}"
            )
        else:
            print(f"  {key:44} --   not yet painted            {title}")
    have = len([k for k in keys if k in data["assets"]])
    print(f"\n{have} of {len(keys)} subjects painted")


def cmd_check(args) -> None:
    """Does the register still describe the disk?

    Three ways it can drift, all of which have happened to other registers:
    a file edited by hand, a file deleted, and a file added straight into
    src/art/ without ever passing through here — the last is the common one,
    because dropping a file in that folder *works*, which is exactly why the
    register can quietly stop being true.
    """
    data = load()
    problems: list[str] = []
    registered_ship: set[str] = set()

    for key, e in data["assets"].items():
        for role in ("master", "shipped"):
            rec = e[role]
            path = os.path.join(ROOT, rec["file"])
            if role == "shipped":
                registered_ship.add(rec["file"])
            if not os.path.exists(path):
                problems.append(f"{key}: {role} missing — {rec['file']}")
                continue
            live = stamp(path)
            if live["sha1"] != rec["sha1"]:
                problems.append(
                    f"{key}: {role} changed on disk — {rec['file']} "
                    f"({rec['w']}x{rec['h']} {rec['bytes']}B recorded, "
                    f"{live['w']}x{live['h']} {live['bytes']}B now)"
                )
        tw, th, _ = FOLDERS[e["folder"]]
        if (e["shipped"]["w"], e["shipped"]["h"]) != (tw, th):
            problems.append(
                f"{key}: shipped at {e['shipped']['w']}x{e['shipped']['h']}, "
                f"the {e['folder']} size is {tw}x{th}"
            )
        cap = budget(e["folder"])
        if e["shipped"]["bytes"] > cap:
            problems.append(
                f"{key}: shipped is {e['shipped']['bytes']//1024}KB, over the {cap//1024}KB budget"
            )

    for folder in FOLDERS:
        d = os.path.join(SHIPPED, folder)
        for name in sorted(os.listdir(d)) if os.path.isdir(d) else []:
            if name.startswith(".") or name.endswith(".md"):
                continue
            r = rel(os.path.join(d, name))
            if r not in registered_ship:
                problems.append(f"unregistered: {r} — in the game, no master kept")

    if problems:
        print("\n".join("  " + p for p in problems))
        print(f"\n{len(problems)} problem(s)")
        sys.exit(1)
    n = len(data["assets"])
    print(f"register clean — {n} asset{'' if n == 1 else 's'}, masters intact")


# --------------------------------------------------------------------------
# the human-readable list


def write_doc(data: dict | None = None) -> None:
    data = data or load()
    want = planned()
    keys = sorted(set(want) | set(data["assets"]))
    assets = data["assets"]

    lines = [
        "# Asset register",
        "",
        "*Generated by `scripts/art.py`. Do not edit — run `npm run art:doc`.*",
        "",
        "Every painting the game asks for, whether it has arrived, and where its",
        "full-resolution original is kept. The shipped file is small and cropped;",
        f"the master in `art-masters/` is the delivery as it came, so any of these",
        "can be recropped or resized later without asking for the art again.",
        "",
    ]

    total_master = sum(a["master"]["bytes"] for a in assets.values())
    total_ship = sum(a["shipped"]["bytes"] for a in assets.values())
    lines += [
        f"**{len(assets)} of {len(keys)} painted.** "
        f"{total_ship / 1024:.0f}KB shipped, {total_master / 1048576:.1f}MB of masters kept back.",
        "",
    ]

    for folder in FOLDERS:
        tw, th, note = FOLDERS[folder]
        group = [k for k in keys if k.startswith(folder + "/")]
        if not group:
            continue
        done = [k for k in group if k in assets]
        lines += [f"## {folder} — {tw}×{th}", "", f"{note}. {len(done)} of {len(group)}.", ""]
        if done:
            lines += [
                "| subject | slug | v | shipped | master | crop | added | source |",
                "|---|---|---|---|---|---|---|---|",
            ]
            for key in done:
                slug = key.split("/", 1)[1]
                e = assets[key]
                m, sh, c = e["master"], e["shipped"], e.get("crop")
                crop = "whole frame" if not c else f"{c['w']}×{c['h']} @ {c['x']},{c['y']}"
                if e.get("tone"):
                    crop += f", gamma {e['tone']['gamma']}"
                hist = f" (+{len(e['history'])} retired)" if e.get("history") else ""
                if e.get("upscaled"):
                    crop += ", **upscaled**"
                lines.append(
                    f"| {e.get('title', '')} | `{slug}` | {e['version']}{hist} "
                    f"| {sh['bytes'] // 1024}KB | {m['w']}×{m['h']}, {m['bytes'] // 1024}KB "
                    f"| {crop} | {e['added']} | {e.get('source', '')} |"
                )
            lines.append("")
        # Everything still owed goes on one line rather than fifty-five empty
        # table rows. The register is a record of what exists; the backlog is a
        # different question and art-prompts.md answers it properly.
        owed = [k.split("/", 1)[1] for k in group if k not in assets]
        if owed:
            lines += [f"**Still owed ({len(owed)}):** " + ", ".join(f"`{o}`" for o in owed), ""]

    notes = [(k, a) for k, a in sorted(assets.items()) if a.get("notes")]
    if notes:
        lines += ["## Notes", ""]
        lines += [f"- **{k}** — {a['notes']}" for k, a in notes]
        lines.append("")

    lines += [
        "## Changing one",
        "",
        "```sh",
        "npm run art:add -- <new-file> scenes/battle          # replaces, retires the old master",
        "npm run art:recrop -- scenes/battle --crop 0,140,1516,639",
        "npm run art:check                                     # register still matches disk?",
        "```",
        "",
        "Retired masters keep their own copy under `art-masters/_retired/`, so a",
        "replacement is reversible. Nothing here is read by the game: `src/art/`",
        "is globbed by slug at build time and knows nothing about the register.",
        "",
    ]
    with open(DOC, "w") as f:
        f.write("\n".join(lines))


def cmd_doc(args) -> None:
    write_doc()
    print(f"wrote {rel(DOC)}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    a = sub.add_parser("add", help="store a delivery as a master and ship a crop of it")
    a.add_argument("file")
    a.add_argument("key", help="folder/slug, e.g. portraits/sable")
    a.add_argument("--crop", help="x,y,w,h in master pixels | auto | none")
    a.add_argument("--tone", help="tone curve applied to the shipped file, e.g. gamma:1.6")
    a.add_argument(
        "--allow-upscale",
        action="store_true",
        help="the source is smaller than the shipped size and that is intended; recorded in the register",
    )
    a.add_argument("--title")
    a.add_argument("--source")
    a.add_argument("--note")
    a.set_defaults(func=cmd_add)

    r = sub.add_parser("recrop", help="re-cut the shipped file from the stored master")
    r.add_argument("key")
    r.add_argument("--crop", required=True)
    r.add_argument("--tone", help="new tone curve; omit to keep the recorded one")
    r.set_defaults(func=cmd_recrop)

    l = sub.add_parser("list", help="every subject, painted or not")
    l.add_argument("--missing", action="store_true", help="only what is still owed")
    l.set_defaults(func=cmd_list)

    sub.add_parser("check", help="does the register still match the disk?").set_defaults(func=cmd_check)
    sub.add_parser("doc", help="regenerate ASSETS.md").set_defaults(func=cmd_doc)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
