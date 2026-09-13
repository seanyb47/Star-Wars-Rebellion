# Master of the Seven Seas — where it stands, and what is next

> **The focus of the game is the islands.** An island is the unit: the thing
> you hold, turn, garrison, build on, earn from, and lose. The chart is a chart
> of islands; Reaches and Seas are how you find one, never what you act on.
> Every filter answers a question about islands. Every officer, hull and coin
> exists to change an island — who holds it, who its people lean to, what
> stands on it. When a screen or a rule pulls attention anywhere else, it is
> wrong, and this line is why.


*12 September 2026. Written after the art delivery. The two specifications
(`galaxy-rebellion-build-spec.md`, `seven-seas-world-bible.md`) say what the
game **is**; this says what is **done**, what is **owed**, and in what order.*

---

## 1. The state of it

Playable end to end on a phone. 184 tests across 12 files. 102KB gzipped, and
that number has barely moved all week because the paintings ship as separate
assets rather than bundled.

| | |
|---|---|
| **Phase 1 — the war** | Built. 71 islands, eight Reaches — one for each Sea — economy, support, control, unrest, building, the day clock. |
| **Phase 2 — fleets** | Built. Hulls in four sizes, troop capacity, movement, auto-resolved combat, assault, blockade. Fighters cut from the design, not deferred. |
| **Phase 3 — missions** | 5 of 8. Parley, Incite Uprising, Recruitment, Sabotage, Survey. |
| **Phase 4 — polish** | Not started. |

All four character ratings are live: Diplomacy decides a parley, Leadership an
action at sea, Combat a landing, Espionage how much of a chain a fleet charts
when it makes landfall.

### What the art has done to it

The chart is a painting now, and the game reads completely differently for it.
`src/data/chart.json` is generated from the painting by
`scripts/chart_positions.py` — 490 painted land bodies, grouped into the ten
Reaches, and every one of the game's hundred islands placed on a real one.
Capitals take the largest island in their Reach, so Highwater sits on the great
central island. The seven Seas are named on screen for the first time.

Opening a chain now zooms into that same painting rather than showing a
diagram of its own. It is a compromise and the view says so: a chain's islands
sit 24 to 50 chart units apart and one island's marks need 262, so the marks
start where the painting put them and are pushed apart only as far as they must
be, with a hairline back to the real island where they had to move. Roomy
chains read as a true zoom; crowded ones read as a diagram with its working
shown.

---

## 2. The art

**All 63 subjects painted** — cut from the contact sheets rather than held back; see below. The register is `ASSETS.md`, generated; the
masters are in `art-masters/`; the tool is `scripts/art.py`.

| folder | done | note |
|---|---|---|
| `chart/` | 2 | the map and the title screen |
| `scenes/` | 7 | the dispatch cards |
| `portraits/` | 26 | the whole cast, as card art |
| `faces/` | 26 | the head of each, for the medallion |
| `islands/` | 20 | 10 archetypes + 10 facilities |
| `ships/` | 8 | four hulls, both sides |
| `creatures/` | 5 | turtle, cat, dragon, kraken, ghost ship |

Every one of these is **upscaled from a contact-sheet tile** and marked as such
in `ASSETS.md`. They look right at the sizes the game shows them; individual
exports would look better on a card. That is the one art job left, and it is a
re-export rather than a re-decision.

### The 12 September delivery, and why it is not in the game

Five contact sheets arrived covering **every remaining subject** — 26
portraits, 8 ships, 10 facilities, 10 island archetypes, 5 creatures. The
direction is right and the set coheres: the Imperium reads as white stone,
green and gold, ships in line; the Confederacy as red canvas, lantern light and
patched timber. Neither is painted as the villain. That was the hard part and
it is done.

They are **contact sheets, not assets**. Each is 1536×1024 holding the whole
set, so every tile is both too small and the wrong shape:

| sheet | tile as delivered | needed | aspect | upscale to fit |
|---|---|---|---|---|
| portraits | 250 × 250 | 640 × 896 | 1.00 vs 0.71 | 3.6× |
| facilities | 767 × 200 | 768 × 512 | 3.83 vs 1.50 | 2.6× |
| islands | 767 × 200 | 768 × 512 | 3.83 vs 1.50 | 2.6× |
| ships | 384 × 506 | 768 × 512 | 0.76 vs 1.50 | 2.0× |
| creatures | 768 × 351 | 768 × 512 | 2.19 vs 1.50 | 1.5× |

The aspect mismatch is the fatal half, not the resolution. Slicing a 3:4 ship
tile into a 3:2 frame means cropping away two thirds of its height — the masts
go. `scripts/art.py` refuses to upscale on purpose, and that rule is right
here.

The sheets are kept at `art-masters/_sheets/` as the visual brief. They are the
proof the set works together, and the reference for re-generating it.

**What is needed:** each subject as its own image at the size in
`art-prompts.md`. The prompts are already written, one per subject, with the
slug under each. Nothing needs re-deciding — only re-exporting.

Order worth doing them in: **portraits first** (26 of the 55 outstanding, and
the thing you look at most), then islands, then ships, then facilities, then
creatures.

---

## 3. The music

Two tracks exist — *Crown Imperium Theme* and *Free Confederacy Theme* — in the
`7 Seas` folder in Drive, as WAV.

**They cannot reach the build from there.** Two independent walls: the Drive
connector returns files as base64 inline, so a 36MB WAV would be ~48MB of text
through the conversation; and this environment's egress proxy denies
`drive.google.com` at the network layer, so a direct fetch fails even with
public link sharing. Both tested.

GitHub is the only route in, and its web uploader caps at 25MB per file. So:

- **Upload Suno's MP3 exports** (~5-8MB) to `audio-in/` on the branch. Simplest
  path; MP3 128 re-encoded to ~96k AAC is not audible for background music.
- Or push the WAVs with git locally, which has no 25MB cap.

The WAVs should stay in Drive either way. A 40MB master in a repo CI clones on
every deploy is a different proposition from a 500KB painting; the register will
record the Drive file IDs so provenance is tracked without the bytes.

**Looping is not your problem.** Two faction themes are almost certainly
complete compositions that will thud when they wrap. Rather than regenerating,
the audio will be analysed for a clean loop point and split into intro + loop
with a cross-fade. Only if that fails is a regeneration worth it.

---

## 4. What gets built next

**Phase 3 is done.** All eight errands are in, and the rule that the island
decides — never a menu — held for every one of them, with two cases worth
recording because they were not obvious:

- **Abduction** only offers itself off the enemy's own ground. Their whole crew
  starts at their capital, so an unrestricted rule made their capital read as an
  abduction on day one and every day after, and incitement — the real answer to
  an enemy island — never came up. Captives are held at your seat for sixty
  days and exchanged; killed or converted were both tried on paper and both are
  worse for a cast of twenty-six.
- **Command** targets exactly the island that had no answer before: your own,
  in revolt. Parley refused it, incitement wanted theirs, sabotage wanted their
  works. Leadership finally has an active use.
- **Research** sits above parley only where parley had nothing left to win
  (allegiance ≥ 75 on an island with a yard), and produces one number —
  shipwright craft, three grades, cheaper and quicker hulls — rather than a
  tree with nothing in it.

**Then real victory**, which is what makes it a game rather than a sandbox:
hold the enemy HQ and capture two named leaders, with the Imperium having to
*find* the hidden Free Harbor first. The pieces for that are all in place.

**Then Phase 4**: Tidecraft tiers and training, the Leviathan, a smarter
opponent, sound, animation.

---

## 4a. Fifteen islands per Reach — measured, and the answer is no

You said you were open to as many as fifteen per Reach "if it makes sense on
the map". It does not, and the reason is the painting rather than the names.

At the 55-unit spacing a chain view needs, here is what each cluster can
actually hold as separate places, against what it holds now:

| Reach | now | capacity |
|---|---|---|
| Sovereign | 10 | 15 |
| Salt | 10 | 12 |
| Cinder | 10 | 10 |
| Shipwrights' | 9 | 9 |
| Wreckers' | 9 | 9 |
| Coral | 7 | 6 |
| Rime | 7 | 6 |
| **total** | **62** | **67** |

Five of the seven are already at or above what their cluster can carry. Only
Sovereign and Salt have room, and Sovereign has no more names — the bible gives
the Crown Sea ten islands on the small map. So the whole exercise is worth two
extra islands on Salt, which is not worth the churn.

**Going to fifteen needs a different chart painting**, with denser and better
separated clusters, not a data change. Worth doing if you want a bigger board;
the position script re-runs against a new painting in one command.

## 5. Open, and honestly open

- **The advisors' faces and voices.** Sean's plan is `docs/narrator-build.md`,
  with a checklist at its top that Claude Code keeps. The tooling side is in
  place (asset tree, manifest, render script, checker, mood type); the art and
  the voice audition are Sean's, and the in-app wiring waits until the first
  twenty lines have been heard in the game.

- **The idle-player benchmark is decaying.** 686 → 565 → 449 days as the AI has
  improved. It measures how long a do-nothing player survives, and a better
  opponent shortens that without the game being worse. It is recorded rather
  than defended; do not tune good mechanics down to protect a number.
- ~~Reach count on the small map.~~ **Settled.** Seven Reaches, one per Sea,
  three inner and four outer. Sugar, Whalers' and Mirage moved to the medium
  map with Scrap.
- **The opponent runs itself broke.** Measured 13 September over seeds 1–5:
  the Confederacy AI is solvent to about day 200, then over-expands, goes to
  zero gold with a net of −6 to −34 a day, and its buildings fall apart for
  want of maintenance — 29–35 breakdowns a game, the Slipway among them in
  most seeds. It still wins against an idle Crown by about day 450–500 on
  the 60% rule, on the hulls it built before the money ran out. It is winning
  by land-grab while bankrupt, which is not how it should read. The build
  order needs an upkeep ceiling: no new works, drill grounds or hulls while
  net is under zero, and no more islands than the treasury can garrison. The
  fleets test now measures the AI at its peak for this reason.
- **Deploys must be dispatched by hand.** The `github-pages` environment's
  deployment-branch allow-list still names the original default branch, so a
  push to the feature branch does not deploy itself.

## 6. Cleanups owed

- **44 ad-hoc hex colours** in the UI against 14 named tokens. A colour should
  come from a token, always.
- **Ships differ by mast count**, which is one pixel at chart size. They need to
  differ by hull.
- **Building icons do not share a baseline**, so a row of them sits unevenly.
- **`README.md`'s "Not built yet"** still says fleets are outstanding. They are
  not.
- ~~Two chains crowd on the chart.~~ **Gone** — Sugar, Mirage and Whalers' were
  the three Reaches cut, so the crowding went with them.


---

## State of play — 12 September, evening

**Music.** Two routes, both verified live in the shipped bundle by tapping what
the game connects to its speakers:

- *A recording in `src/audio/music/`* — fetched, decoded, loop point found,
  ducks the bed, and the written score stands down (measured: one 58.6-second
  buffer started, and only the bed's four oscillators running).
- *No recording* — a written theme per side plays instead: a progression, a
  melody that drops out every fourth turn, a pluck, a frame drum. Measured
  against the bed alone: **0 onsets a minute for the bed, 14 and 31 for the
  themes.** It is music, not a hum. It is not your music.

**Both of your themes are in**, as `empire.mp3` (5.3 MB, 194.9 s) and
`alliance.mp3` (6.5 MB, 240.7 s), each verified playing on its own side in the
shipped bundle. How they got here is worth a line for next time: the Drive
connector refuses files over 10 MB *and*, it turned out, expires mid-transfer
somewhere between 5.3 MB (came through) and 6.5 MB (failed four times running
with a healthy session). The Crown came via Drive as an MP3 export; the
Confederacy came via a GitHub web upload to the branch, which has a 25 MB cap
and no such ceiling. For anything over ~5 MB, GitHub upload is the route.

**Art.** All 96 installed subjects are on screen: 26 portraits and faces, 8
hulls, 20 island and facility plates, 7 dispatch scenes, 2 charts, and — as of
tonight — the 5 creatures, which had been installed and never rendered. They
live in the almanac and on the island panel as "these waters".

**Roster.** Every one of the 26 now has an epithet and a full bio, and a test
refuses a build where anyone has lost either.


## The opening, against Rebellion's — 12 September, late

Measured against the original's turn-one state and closed on the three cheapest
gaps. Numbers below are from four seeds.

**The Crown holds more and holds it worse.** Six islands (was four), two of
them sullen at 32–45 allegiance and held by garrison — Rebellion opens the
Empire on about six with three or four disloyal, and that is the whole feel of
the side. The Confederacy keeps four that mean it (65–85).

**Garrisons follow the rule the uprising check uses.** `requiredGarrison` plus
two, capital plus one more, capped at six — Rebellion's ceiling. A loyal port
opens with two companies, a sullen one with three or four, the seat with three.
Nothing you hold is under the line on day one.

**Fleets, hull for hull.** Crown: a ship of the line, two heavy frigates, a
light cruiser, a transport (Rebellion's ISD, two VSDs, Carrack, Galleon).
Confederacy: four sloops, a Tempest, a Brig (corvettes, a bulk cruiser, a
transport). Earners went to 12/12 for the Crown and 10/10 for the Confederacy
to carry it: both sides open solvent (Crown net +3.5 to +6.5 a day, Confederacy
+8 to +10) with free ground on every island.

**Fort and boom.** Two works a yard can build, both taking a water slot. A fort
is five guns on the wall that fire for whoever holds the island — including at
an enemy fleet lying off a harbour with no navy in it. A boom counts as two
companies against a landing, spent from the attacker only, and keeps the port
open under fewer than six enemy guns, so a lone sloop is a nuisance rather than
a siege. Both are listed on the Harbour tab with the hulls, because that is
where they fight. The AI does not build them yet.

What is still not matched, and stays in Phase 4: fighters, probes, research
trees, the movable Free Harbour, the Leviathan, assassination, the Regent's
leadership bonus.


## The chart, the tutorial and the two ways to win — 12 September, night

**Colour is control, and it never changes for a filter.** Every island is
always on the chart in the colour of who holds it — green Crown, red
Confederacy, blue nobody, grey uncharted. A filter draws the islands that
answer it as stars; nothing dims, nothing glows, no chain name fades. The
earlier scheme (loyalty lean as colour, three strengths, dimmed neighbours)
was cleverer and left half the chart unreadable. Lean lives on the island's
panel where there is room for a bar. The chain view follows the same rule, and
its separate control dot is gone because the name already says it. The Sea
names are off the chart.

**Two ways to win.** Rebellion's own: take the enemy's seat and hold both of
their leaders in irons at the same time — Corvane and Blackwater, Hale and
Calloway. Captives are exchanged after sixty days, so it is a window. Or hold
60% of the settled islands, as before. Both ways lose it. `LEADERS` in
constants names them; three tests pin it.

**How to play** is twelve cards in the shape of the manual's introduction —
what this is, how it ends, then the chart, an island, allegiance, the crew,
gold, building, the fleet, the filters, the clock, and a first move for each
side. Reopenable from the menu. The done-key is bumped so people who skipped
the six-card version see this one.

## Decision — 13 September

**The Reach count is not a constraint.** Eight is fine; so would nine be if
the painting had nine chains. Reaches follow the painting and names follow
latitude; the seven Seas are the water they sit in and carry no rule of their
own. Stop treating "one Reach per Sea" as a thing to preserve.
