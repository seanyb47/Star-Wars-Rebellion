#!/usr/bin/env python3
"""
Assemble the game's lore into one readable document, docs/lore.md.

The world bible is a build document: mechanics tables, open questions,
changelogs, voice settings. This pulls out only what a reader of the fiction
wants — the world, the two sides, the Pirate Lords, the peoples, the Deep,
every named character with their story, the ships, the Seas and their
islands, the creatures, the advisors — and writes it as prose and short
tables, from the same files the game reads. Run it again after any lore
change; the Google Doc in Drive is a copy of this file.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BIBLE = (ROOT / 'seven-seas-world-bible.md').read_text()
characters = json.loads((ROOT / 'src/data/characters.json').read_text())
ships = json.loads((ROOT / 'src/data/ships.json').read_text())
reaches = json.loads((ROOT / 'src/data/reaches.json').read_text())
factions = json.loads((ROOT / 'src/data/factions.json').read_text())
creatures_ts = (ROOT / 'src/sim/creatures.ts').read_text()


def section(start: str, end: str) -> str:
    """Bible text between two headings, exclusive."""
    i = BIBLE.index(start)
    j = BIBLE.index(end, i + len(start))
    return BIBLE[i + len(start):j].strip()


def strip_tables(text: str) -> str:
    keep = [l for l in text.splitlines() if not l.startswith('|') and l.strip() != '---' and not l.startswith('**Strengths')]
    return '\n'.join(keep).strip()


def clean(text: str) -> str:
    text = re.sub(r'\(orig\.[^)]*\)', '', text)
    text = re.sub(r'⚙[^\n]*', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def roster_rows(heading: str, next_heading: str):
    """Rows of the minor-character table under a roster heading."""
    text = section(heading, next_heading)
    rows = []
    for line in text.splitlines():
        if not line.startswith('|') or line.startswith('| #') or line.startswith('|---'):
            continue
        cells = [c.strip() for c in line.strip('|').split('|')]
        if len(cells) < 6:
            continue
        rows.append(cells)
    return rows


out = []
w = out.append

w(f"# {factions['gameTitle']} — The Lore\n")
w("_Everything the game knows about its world, in one place. Edit freely: this is the fiction, not the rules. Regenerate from the repository with `scripts/lore_doc.py` after the bible or the data changes, or edit here and tell Claude what to carry back._\n")

# ---------------- The world ----------------
w("## 1. The World\n")
w(clean(strip_tables(section('### The Seven Seas', '### The Black Tide'))) + "\n")
w("### The Black Tide\n")
w(clean(strip_tables(section('### The Black Tide', '## 2. THE FACTIONS'))) + "\n")

# ---------------- The factions ----------------
w("## 2. The Two Sides\n")
crown = section('### Faction A — THE CROWN IMPERIUM (original Empire slot)', '### Faction B — THE FREE CONFEDERACY (original Rebel slot)')
crown = re.sub(r'\*\*Strengths \(mirror original\):\*\*.*?\n', '', crown)
w("### The Crown Imperium\n")
w(clean(strip_tables(crown)) + "\n")
conf = section('### Faction B — THE FREE CONFEDERACY (original Rebel slot)', '**Design rule for ambiguity:**')
conf = re.sub(r'\*\*Strengths \(mirror original\):\*\*.*?\n', '', conf)
w("### The Free Confederacy\n")
# Keep the Lords table as prose.
lords_table = [l for l in conf.splitlines() if l.startswith('| **')]
conf_prose = strip_tables(conf)
w(clean(conf_prose) + "\n")
w("#### The three Pirate Lords\n")
for row in lords_table:
    cells = [c.strip() for c in row.strip('|').split('|')]
    lord, ship, power = cells[0].strip('*'), cells[1], cells[2]
    w(f"**{lord}** — {ship}\n\n{power}\n")

# ---------------- Peoples ----------------
w("## 3. The Peoples\n")
peoples = section('## 3. PEOPLES (replaces alien species)', '## 4. THE DEEP (replaces the Force)')
for line in peoples.splitlines():
    if not line.startswith('|') or line.startswith('| Original') or line.startswith('|---'):
        continue
    cells = [c.strip() for c in line.strip('|').split('|')]
    if len(cells) < 4:
        continue
    _, name, where, look = cells[:4]
    w(f"- **{name.strip('*')}** ({where}). {look}")
w("")

# ---------------- The Deep ----------------
w("## 4. The Deep\n")
deep = section('## 4. THE DEEP (replaces the Force)', '**Scripted events (Luke chain):**')
deep = strip_tables(deep)
w(clean(deep) + "\n")
w("### Stories waiting to be told\n")
events = section('**Scripted events (Luke chain):**', '## 5. CHARACTERS')
events = (events.replace('**Scripted events (Han chain):**', '\n**Reyne\'s debt.**')
          .replace('*Dagobah* →', '**Fogmire.**').replace('*Luke before the Emperor* →', '**Before the Regent.**')
          .replace('*Bounty hunters* →', '**Collectors.**').replace("*Jabba's Palace* →", '**Blackreef.**')
          .replace('*"I am your father"* →', '**The black water.**').replace("*Leia's heritage* →", '**The twins.**'))
w(clean(strip_tables(events)) + "\n")

# ---------------- Characters ----------------
w("## 5. The People of the War\n")
w("_Every named character has one admirable trait and one ugly one. No side owns either._\n")
for fac, title in (('empire', 'The Crown Imperium'), ('alliance', 'The Free Confederacy')):
    w(f"### {title}\n")
    w("#### The principals\n")
    for c in characters[fac]:
        ep = f" “{c['epithet']}”" if c.get('epithet') else ''
        roles = ', '.join(c.get('roles', []))
        w(f"**{c['name']}**{ep} — {c.get('people', 'Human')}. {roles}.\n\n{c['bio']}\n")
    w("#### The rest of the roster\n")
    heading = '### 5A. THE CROWN IMPERIUM (Empire roster)' if fac == 'empire' else '### 5B. THE FREE CONFEDERACY (Rebel roster)'
    nxt = '### 5B. THE FREE CONFEDERACY (Rebel roster)' if fac == 'empire' else '## 6. SHIPS'
    seen = {c['name'] for c in characters[fac]}
    for cells in roster_rows(heading, nxt):
        name = re.sub(r'\*\*', '', cells[2]).strip()
        bare = re.sub(r',\s*".*?"', '', name)
        if any(bare.startswith(s) or s.startswith(bare) for s in seen):
            continue
        people, role, bio = cells[3], cells[4], cells[5]
        w(f"- **{name}** — {people}; {role}. {bio}")
    w("")
w("### The unaligned\n")
w("_Ashore somewhere in the Reaches, waiting for whichever side asks first._\n")
for c in characters['recruits']:
    ep = f" “{c['epithet']}”" if c.get('epithet') else ''
    w(f"- **{c['name']}**{ep} — {c.get('people', 'Human')}. {c['bio']}")
w("")

# ---------------- Ships ----------------
w("## 6. Ships\n")
w("_There are no fighters in these waters. A small craft is just a small ship, so each fleet runs small to large with a transport off to one side, and the Confederacy has three hulls nobody else has._\n")
for fac, title in (('empire', 'The Crown Imperium'), ('alliance', 'The Free Confederacy')):
    w(f"### {title}\n")
    for cls in ships['classes']:
        if cls['faction'] != fac or cls.get('unique'):
            continue
        w(f"- **{cls['name']}** ({cls['role']}). {cls['blurb']}")
    if fac == 'alliance':
        w("")
        w("#### The Pirate Lords' ships\n")
        for cls in ships['classes']:
            if cls['faction'] == fac and cls.get('unique'):
                w(f"**The *{cls['name']}*.** {cls['blurb']}\n")
    w("")

# ---------------- The map ----------------
w("## 7. The Seas, the Reaches and the Islands\n")
w("Seven Seas, each its own archipelago with its own water, its own weather and its own idea of what is normal. The three Inner Seas behave like seas. The four Outer Seas do not always. On the chart each Sea shows one Reach — one chain of islands — and the war is fought across the seven of them.\n")
sea_lines = dict(re.findall(r'### (The [A-Za-z ]+?) \((?:Inner|Outer) Sea\)\n\*(.+?)\*', BIBLE))
sea_kind = dict(re.findall(r'### (The [A-Za-z ]+?) \((Inner|Outer) Sea\)', BIBLE))
for reach in reaches['reaches']:
    sea = reach['sea']
    w(f"### {sea} — {reach['name']}\n")
    if sea in sea_lines:
        w(f"_{sea_kind.get(sea, '')} Sea. {sea_lines[sea]}_\n")
    role = {'home': "The Crown's home waters; Highwater is here.",
            'contested': 'Contested: both sides hold islands here from the first day.',
            'frontier': "Frontier: uncharted at the start, and where the Pirate Lords signed the articles. One island of these Reaches is renamed **Freeport** every game and keeps its own position, outline and room — the place the Confederacy was founded, and the one island out here that flies its colours from the first day.",
            'open': 'Open: charted, settled, and nobody\'s.'}.get(reach.get('role', ''), '')
    if role:
        w(role + "\n")
    for isle in reach['islands']:
        note = isle.get('note')
        port = ' (port)' if isle.get('port') else ''
        w(f"- **{isle['name']}**{port}{'. ' + note if note else ''}")
    w("")

# ---------------- Creatures ----------------
w("## 8. What Lives in the Water\n")
for m in re.finditer(r"name: '([^']+)',\s*sighting:\s*'([^']*)',\s*lore:\s*'((?:[^'\\]|\\.)*)'", creatures_ts):
    name, sighting, lore = m.group(1), m.group(2), m.group(3).replace("\\'", "'")
    w(f"**{name}.** _{sighting}_ {lore}\n")
for m in re.finditer(r'name: "([^"]+)",\s*sighting:\s*\'([^\']*)\',\s*lore:\s*\'((?:[^\'\\]|\\.)*)\'', creatures_ts):
    name, sighting, lore = m.group(1), m.group(2), m.group(3).replace("\\'", "'")
    w(f"**{name}.** _{sighting}_ {lore}\n")

# ---------------- Advisors ----------------
w("## 9. The Voices at Your Elbow\n")
adv = section('### 16.1 Visual descriptions (plan step A1 — Sean)', '### 16.2 Art direction')
marlow = re.search(r'\*\*Secretary Sabine Marlow\.\*\*(.*?)\n\n_Who she is\._(.*?)\n\n', adv, re.S)
penny = re.search(r'\*\*Mr Pennywhistle\.\*\*(.*?)(?:\n\n|$)', adv, re.S)
if marlow:
    w("### Secretary Sabine Marlow — the Crown's advisor\n")
    w(clean(marlow.group(2)) + "\n")
    w(clean(marlow.group(1)) + "\n")
if penny:
    w("### Mr Pennywhistle — the Confederacy's advisor\n")
    w(clean(penny.group(1)) + "\n")
w("### Forms of address\n")
w(clean(strip_tables(section('### 16.5 Forms of address', '`factions.json`'))) + "\n")

# ---------------- Mythic Isles ----------------
w("## 10. Told of, not yet charted: the Mythic Isles\n")
myth = section('### 14.1 Mythic Isles — the exploration race', '**Placement rules.**')
w(clean(strip_tables(myth)) + "\n")
seed = section('**Seed pool** (game picks 2–3 per session; each is tied to a Sea\'s flavor):', '### 14.2 Double Agents')
for line in seed.splitlines():
    if not line.startswith('|') or line.startswith('| Isle') or line.startswith('|---'):
        continue
    cells = [c.strip() for c in line.strip('|').split('|')]
    if len(cells) < 6:
        continue
    isle, sea, guardian, garrison, key, unit = cells[:6]
    w(f"- **{isle.strip('*')}** ({sea}). Guardian: {guardian.rstrip('.')}. Held by {garrison.rstrip('.').lower()}. To win it over: {key.rstrip('.')}. As a unit: {unit}")
w("")

(ROOT / 'docs/lore.md').write_text('\n'.join(out))
print('wrote', ROOT / 'docs/lore.md', len('\n'.join(out)), 'chars')
