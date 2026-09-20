#!/usr/bin/env python3
"""
Rebuild src/data/combat-ships.json and src/data/ship-lore.json from the master.

`COMBAT-MASTER-v4.3.md` is the single authoritative reference, and Parts 3 and 4
of it are the roster and the ship encyclopedia. Both data files are parses of
it, and both carry a standing instruction not to be edited by hand: re-run this.

The v3-to-v4 import changed no existing stat. Twenty-three of the twenty-five
ships moved only their simulated win rate, because the matrix went from 25x25
to 28x28, and three hulls were added — Fenrunner, Wraith and Witchlight.

v4.3 is three lines: the Majestic's build goes 1,045 to 1,200 days, the
Swift's goes 40 to 15, and Part 2B grows a **floor** — no hull builds in under
forty days and the Swift is the only exception, being barely more than a sail
with a hull under it.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTER = os.path.join(ROOT, 'COMBAT-MASTER-v4.3.md')

LORE_FIELDS = {
    'Encyclopedia': 'entry', 'Visual identity': 'identity',
    'Silhouette signature': 'silhouette', 'Construction & materials': 'materials',
    'Sail plan & palette': 'sails', 'Signature detail': 'detail',
    'Preferred art scene': 'scene', 'Distinctness guardrail': 'guardrail',
}


def part(text, n, nxt):
    return text.split(f'PART {n} —')[1].split(f'PART {nxt} —')[0]


def pct(value):
    """Percentages the way the file already wrote them: '1%' for a whole number,
    two decimals otherwise. Matching the existing format keeps the v3-to-v4 diff
    to the things that actually moved."""
    return f'{int(value)}%' if value == int(value) else f'{value:.2f}%'


def gold(value):
    """And whole gold stays an int rather than becoming 2.0."""
    return int(value) if value == int(value) else value


def win(value):
    return f'{value:.2f}%'


def shipname(caps):
    """The master's headers are upper case. Title case is right for every hull
    except the mark numbers, which `str.title` turns into 'Vanguard Ii'."""
    return re.sub(r'\bIi\b', 'II', caps.strip().title()).replace("'S", "'s")


def roster(text):
    seg = part(text, 3, 4)
    chunks = re.split(r'^--- (.+?) \((C[A-Z]{2}-[A-Z0-9-]+)\) ---$', seg, flags=re.M)[1:]
    out = []
    for name, sid, body in zip(chunks[0::3], chunks[1::3], chunks[2::3]):
        g = lambda pat: (re.search(pat, body, re.M) or [None, None])[1]
        num = lambda pat, cast=int: cast(g(pat).replace(',', '')) if g(pat) else cast(0)
        cls = g(r'\| Research [A-Z0-9]+ \| (.+)$')
        light, heavy, long_ = num(r'/ ([\d,]+) Light'), num(r'/ ([\d,]+) Heavy'), num(r'Guns: ([\d,]+) Long')
        repair = num(r'Repair ([\d.]+)%', float)
        out.append({
            'Ship ID': sid,
            'Faction': g(r'^(Crown Imperium|Free Confederacy) \|'),
            'Research Order': g(r'\| Research ([A-Z0-9]+) \|'),
            'Ship': shipname(name),
            'Class': cls,
            # The class with its gun count stripped: "4th rate (50)" -> "4th rate".
            'Role': re.sub(r'\s*\(\d+\)$', '', cls),
            'Size': g(r'Size (\w+)'),
            'Speed': g(r'Speed (\w+(?: \w+)?) \|'),
            'Long Guns': long_, 'Heavy Guns': heavy, 'Light Guns': light,
            'Total Guns': num(r'= ([\d,]+) total'),
            'Armor': num(r'\| Armor ([\d,]+)'),
            'Hull': num(r'\| Hull ([\d,]+)'),
            'Bombardment': num(r'Bombardment ([\d,]+)'),
            'Troop Capacity': num(r'Troops ([\d,]+)'),
            'Repair Rate': pct(repair),
            'Repair Display': g(r'displays: (\w+(?: \w+)?)\)'),
            'Days to Build': num(r'\| ([\d,]+) days to build'),
            'Gold to Build': num(r'Economy: ([\d,]+) gold'),
            'Gold/Day Maintenance': gold(num(r'\| ([\d.]+) gold/day maintenance', float)),
            'Status': 'Healthy',
            # A hull with no gun of any kind is not a warship, whatever else she is.
            'Combatant Type': 'Warship' if (long_ + heavy + light) > 0 else 'Noncombat',
            'Scaled Reference Cost': num(r'Reference cost ([\d,]+)'),
            'Price Ratio': pct(num(r'Price ratio ([\d.]+)%', float)),
            'Value Rating': g(r'Rating ([A-Z] — [A-Za-z ]+)').strip(),
            'Sim Win%': win(num(r'win rate ([\d.]+)%', float)),
        })
    return out


def lore(text, ids):
    seg = part(text, 4, 5)
    chunks = re.split(r'^--- (.+?) ---$', seg, flags=re.M)[1:]
    out = {}
    for name, body in zip(chunks[0::2], chunks[1::2]):
        sid = ids[name.strip()]
        rec = {}
        for label, key in LORE_FIELDS.items():
            m = re.search(rf'^{re.escape(label)}:\s*(.+)$', body, re.M)
            assert m, (name, label)
            rec[key] = m.group(1).strip().replace('’', "'")
        out[sid] = rec
    return out


# Part 1's accuracy table. Base 75, clamped 10-95.
SIZE_MOD = {'Light': {'Small': 0, 'Medium': 0, 'Large': 0, 'Gigantic': 0},
            'Long': {'Small': -10, 'Medium': -5, 'Large': 0, 'Gigantic': 10},
            'Heavy': {'Small': -30, 'Medium': -15, 'Large': 0, 'Gigantic': 15}}
SPEED_MOD = {'Light': {'Slow': 5, 'Normal': 0, 'Fast': -10, 'Very Fast': -20},
             'Long': {'Slow': 5, 'Normal': 0, 'Fast': -15, 'Very Fast': -25},
             'Heavy': {'Slow': 10, 'Normal': 0, 'Fast': -20, 'Very Fast': -35}}
GUN_BASE = {'Light': 10, 'Long': 0, 'Heavy': 0}
# 2d20 averages 21; Heavy is 4d20, so 42.
AVG_DAMAGE = {'Light': 21.0, 'Long': 21.0, 'Heavy': 42.0}


def hit(kind, size, speed):
    return max(10, min(95, 75 + GUN_BASE[kind] + SIZE_MOD[kind][size] + SPEED_MOD[kind][speed]))


def derived(ships, text):
    """The derived table, computed rather than transcribed.

    It used to be a hand-copied block from the roster sheet. Everything in it
    follows from Part 1's accuracy formula and the gun counts, so it is
    calculated here and then checked against the master's own 'Avg raw volley'
    line — which turns a table that could silently rot into one that cannot.
    """
    stated = dict(re.findall(r'^--- .+? \((C[A-Z]{2}-[A-Z0-9-]+)\) ---$[\s\S]*?Avg raw volley ([\d,]+)',
                             text, re.M))
    out = {}
    for s in ships:
        sid, size, speed = s['Ship ID'], s['Size'], s['Speed']
        volley = {k: s[f'{k} Guns'] * AVG_DAMAGE[k] for k in ('Long', 'Heavy', 'Light')}
        raw = sum(volley.values())
        want = stated.get(sid)
        if want is not None:
            assert abs(raw - float(want.replace(',', ''))) < 0.5, (sid, raw, want)
        out[sid] = {
            'lightHit': hit('Light', size, speed),
            'longHit': hit('Long', size, speed),
            'heavyHit': hit('Heavy', size, speed),
            'longVolley': volley['Long'], 'heavyVolley': volley['Heavy'],
            'lightVolley': volley['Light'], 'rawVolley': raw,
            'combatant': s['Combatant Type'],
        }
    return out


def main():
    text = open(MASTER).read()
    ships = roster(text)
    ids = {re.sub(r'\s*\(\d+\)$', '', s['Class']) and s['Ship'].upper(): s['Ship ID'] for s in ships}
    ids['CORAL-CLASS DREADNAUGHT'] = 'CFS-COR-R8-01'

    p = os.path.join(ROOT, 'src/data/combat-ships.json')
    doc = json.load(open(p))
    doc['_source'] = ('Part 3 of COMBAT-MASTER-v4.3.md, parsed by scripts/import_roster.py. '
                      'Do not edit by hand: edit the master and re-run the script.')
    doc['ships'] = ships
    json.dump(doc, open(p, 'w'), indent=2, ensure_ascii=False)
    open(p, 'a').write('\n')

    p = os.path.join(ROOT, 'src/data/ship-lore.json')
    doc = json.load(open(p))
    doc['_comment'] = ('Part 4 of COMBAT-MASTER-v4.3.md, verbatim, parsed by '
                       'scripts/import_roster.py. `entry` is the encyclopedia text shown on the '
                       "ship's sheet; the rest is art direction and is shown to nobody — it is here "
                       'rather than only in the doc so a test can hold it to the master. Do not edit '
                       'by hand: edit the master and re-run the script.')
    doc['lore'] = lore(text, ids)
    json.dump(doc, open(p, 'w'), indent=2, ensure_ascii=False)
    open(p, 'a').write('\n')
    entries = len(doc['lore'])

    p = os.path.join(ROOT, 'src/data/combat-derived.json')
    doc = json.load(open(p))
    doc['_source'] = 'Computed from Part 1 and Part 3 of COMBAT-MASTER-v4.3.md by scripts/import_roster.py'
    doc['derived'] = derived(ships, text)
    json.dump(doc, open(p, 'w'), indent=2, ensure_ascii=False)
    open(p, 'a').write('\n')

    print(f'{len(ships)} ships, {entries} entries, {len(doc["derived"])} derived rows')


if __name__ == '__main__':
    main()
