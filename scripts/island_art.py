#!/usr/bin/env python3
"""
Decide which painting each island wears, and space the repeats out.

Thirty-two paintings, sixty-three islands. The thirty-two that have their own
keep it; the rest borrow. The naive answer — fall through to the island's
archetype painting — puts four identical jungle isles in a row on the
encyclopedia's Locations grid, which is what Sean saw on 20 September:

    "Looks like encyclopedia can fit about 8 per scroll. Let's try to space
     unique art so that for most part you're not seeing tons of duplicates in
     same 8 location block. A few is fine. But shouldn't be a bunch."

The grid is alphabetical and shows eight at a time, so that is the thing to
optimise directly: walk the islands in the order the player reads them and give
each borrower the painting that has been out of sight longest, never one that is
still on screen. A painting may only stand in for an archetype it was actually
painted for — a borrowed picture still has to look like the kind of place it is.

Writes src/data/island-art.json. Re-run it when art arrives or names change.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WINDOW = 8
# How far apart two islands wearing the same painting are kept. The grid shows
# eight, so eight would be the obvious number — but the grid lists only the
# islands a side has *charted*, and filtering pulls the survivors closer
# together. Measured over 400 random 40%-charted maps: at a gap of 8 the worst
# screen drops back to five distinct out of eight, and at 20 it holds at six
# with the mean up from 6.98 to 7.49. Past 20 the pools are too small and
# neighbours start matching again.
AVOID = 20

# Mirrors LOOKS/BARE in src/sim/galaxy.ts. A test fails if the two drift.
LOOKS = {
    'The Crown Sea': ['jungle-isle', 'rock-isle'],
    'The Merchant Sea': ['port-city', 'jungle-isle', 'mining-isle'],
    'The Amber Sea': ['reef-isle', 'jungle-isle', 'port-city'],
    'The Far Sea': ['ice-isle', 'rock-isle', 'mining-isle'],
    'The Sea of Storms': ['storm-isle', 'jungle-isle', 'mining-isle'],
    'The Glass Sea': ['mining-isle', 'drowned-isle', 'rock-isle'],
    'The Bone Sea': ['drowned-isle', 'tide-isle', 'free-harbor'],
}


def slugify(name: str) -> str:
    name = name.lower()
    name = re.sub(r"[\"'’.]", "", name)
    name = re.sub(r"[^a-z0-9]+", "-", name)
    return name.strip("-")


def islands():
    data = json.load(open(os.path.join(ROOT, 'src/data/reaches.json')))
    out = []
    for reach in data['reaches']:
        looks = LOOKS[reach['sea']]
        for isle in reach['islands']:
            arch = 'port-city' if isle.get('port') else looks[isle['seed'] % len(looks)]
            out.append({'name': isle['name'], 'slug': slugify(isle['name']),
                        'reach': reach['name'], 'archetype': arch})
    return out


def assign():
    own = {f[:-5] for f in os.listdir(os.path.join(ROOT, 'src/art/isles'))}
    isles = islands()
    # A painting can stand in for the archetype of the island it was painted for.
    pools: dict[str, list[str]] = {}
    for i in isles:
        if i['slug'] in own:
            pools.setdefault(i['archetype'], []).append(i['slug'])

    order = sorted(isles, key=lambda i: i['name'])
    chosen: dict[str, str] = {}
    recent: list[str] = []
    used: dict[str, int] = {}

    for pos, i in enumerate(order):
        if i['slug'] in own:
            pick = i['slug']
        else:
            # The archetype's own painting is always a candidate; borrowables
            # are the paintings made for islands of the same kind.
            cands = [f'@{i["archetype"]}'] + pools.get(i['archetype'], [])
            # Look behind at what is still on screen, and *ahead* at the islands
            # about to appear wearing their own: borrowing Minterne's painting
            # for Marlbury is the one mistake the window rule cannot see, since
            # Minterne is the very next row.
            ahead = {j['slug'] for j in order[pos + 1:pos + AVOID] if j['slug'] in own}
            blocked = set(recent[-(AVOID - 1):]) | ahead
            # Relax to the visible window if nothing is free that far back —
            # a small pool cannot always keep its distance, and never
            # neighbours matters more than always twenty apart.
            offscreen = ([c for c in cands if c not in blocked]
                         or [c for c in cands if c not in recent[-(WINDOW - 1):]])
            # Longest out of sight first, then least used overall, then stable.
            best = offscreen or cands
            pick = min(best, key=lambda c: (used.get(c, 0), cands.index(c)))
        chosen[i['name']] = pick
        used[pick] = used.get(pick, 0) + 1
        recent.append(pick)
    return isles, order, chosen


def score(order, chosen):
    arts = [chosen[i['name']] for i in order]
    wins = [len(set(arts[s:s + WINDOW])) for s in range(max(1, len(arts) - WINDOW + 1))]
    return min(wins), sum(wins) / len(wins)


def main():
    isles, order, chosen = assign()
    worst, mean = score(order, chosen)
    doc = {
        '_comment': (
            'Which painting each island wears, precomputed by scripts/island_art.py and read by '
            'paintedIsleFor(). Thirty-two islands have their own; the rest borrow one painted for '
            'an island of the same kind, spaced so the encyclopedia\'s alphabetical grid of eight '
            'does not show the same picture several times at once, and holds up when only part of the map is charted — Sean, 20 September. A name '
            'prefixed @ is an archetype painting in src/art/islands rather than a borrowed one. '
            'Do not edit by hand: re-run the script.'
        ),
        'window': WINDOW,
        'avoidWithin': AVOID,
        'worstDistinctPerWindow': worst,
        'meanDistinctPerWindow': round(mean, 2),
        'art': {i['name']: chosen[i['name']] for i in order},
    }
    path = os.path.join(ROOT, 'src/data/island-art.json')
    with open(path, 'w') as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write('\n')
    print(f'wrote src/data/island-art.json — worst {worst}/{WINDOW} distinct, mean {mean:.2f}')
    if '-v' in sys.argv:
        arts = [chosen[i['name']] for i in order]
        for s in range(len(arts) - WINDOW + 1):
            d = len(set(arts[s:s + WINDOW]))
            if d <= worst + 1:
                print(f'  {d}/{WINDOW} at {order[s]["name"]}:')
                for i in order[s:s + WINDOW]:
                    print(f'      {i["name"]:<18} {chosen[i["name"]]}')


if __name__ == '__main__':
    main()
