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

## 0. The opening

Rebellion's shape, by Sean's rules: see `docs/opening.md`. Frontier Reaches unexplored with the Confederacy's base hidden in one; the Crown on Highwater and two more in Sovereign Reach; two a side in each contested Reach; everything settled and nobody's is garrisoned.

## 1. The state of it

Playable end to end on a phone. 184 tests across 12 files. 102KB gzipped, and
that number has barely moved all week because the paintings ship as separate
assets rather than bundled.

| | |
|---|---|
| **Phase 1 — the war** | Built. 63 islands, seven Reaches — one for each Sea — economy, support, control, unrest, building, the day clock. |
| **Phase 2 — fleets** | Built. Hulls in four sizes, troop capacity, movement, auto-resolved combat, assault, blockade. Fighters cut from the design, not deferred. |
| **Phase 3 — missions** | Built, and one past the plan: Parley, Incite Uprising, Recruitment, Sabotage, Survey, Abduction, Command, Research, and Rescue. |
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
| Whalers' (was Shipwrights') | 9 | 9 |
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
  the 60% rule, on the hulls it built before the money ran out.
  **Fixed, 14 September.** Two causes. The opponent ordered troops, yards
  and hulls with no eye on the ledger — now nothing that costs upkeep is
  ordered unless the surplus can carry it with three to spare. And an
  island with no works could never get one, for anybody, so both economies
  stalled the day the starting islands filled — now a works can be laid
  down on any held island (`foundWorks`; the sheet offers it, the opponent
  uses it). Measured over a year on four runs: net stays positive
  throughout, works keep growing, and the fleet with them.
  The opponent now places up to three orders a build tick and the reverse
  problem shows: by day 400 it sits on thousands of gold it has no cadence
  to spend. Not urgent — a solvent hoarder beats a bankrupt spender — but
  the next balance pass should let it lay down hulls faster when rich.
- **Deploys must be dispatched by hand.** The `github-pages` environment's
  deployment-branch allow-list still names the original default branch, so a
  push to the feature branch does not deploy itself.

## 6. Cleanups owed

- **44 ad-hoc hex colours** in the UI against 14 named tokens. A colour should
  come from a token, always.
- **Ships differ by mast count**, which is one pixel at chart size. They need to
  differ by hull.
- **Building icons do not share a baseline**, so a row of them sits unevenly.
- ~~**`README.md`'s "Not built yet"** still says fleets are outstanding.~~
  **Gone** — checked 15 September: it already says they are built, and names
  what actually remains (command ranks, Tidecraft tiers, the Leviathan, a
  smarter opponent). The note outlived the thing it was about.
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
trees, the Leviathan, assassination, the Regent's leadership bonus. (The
movable Free Harbour came 14 September: she is a ship, see below.)


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

## The build flow — 14 September

Rebellion's, in two sheets. The Build tab is a popup now, not a screen: three
buttons (facilities, companies, ships), then the order — a dropdown for the
thing, its painting, cost, days and upkeep, its stats where it has any, a
dropdown for the island or a trip to the chart to tap one, and the clock:
work plus passage. Every order carries a destination in the sim
(`BuildOrder.destinationId`); the nearest free maker takes it and the sea
adds three or ten days. An island lost while the order is at sea sends the
thing back to where it was made; room on the destination is reserved from the
day of the order so two crews never sail for one berth. The capital opens
with a works of its own so its orders are made on the spot.

Idle works is gone from the layer strip: after Loyalty comes Idle crew, then
idle works, drill grounds and slipways each as their own filter.

## The chrome — 14 September

Sean's mock-up, built in code rather than painted: one layout, two skins.
The Crown gets green-black oak and brass, the Confederacy red-brown planking
and rust with red. A 3KB wood tile under CSS gradients does the wood; the
banner is the side's own painting (Highwater's port for the Crown, the Free
Harbor for the rebels) under a scrim, with crest, name, creed and the day in
a medallion; the ledger sits on plaques with a coin and a ledger icon; the
layer chips are plaques with a pennant under the live one; a compass rose
sits in the empty water bottom right. The chart keeps three-quarters of the
screen — the mock-up's desk of telescopes under the tab bar was cut, and so
was its side column of tools, which duplicated the strip. No text is baked
into any image, so it stays crisp and changeable.

## The night pass — 14 September, late

**Polish, throughout.** The sheets, cards and lists took the console's
metal: the action button is brass or red with dark lettering, headings rule
off to the margin, sheet heads and panel tabs, the dispatch card and the
tutorial frame in the same metal. The title screen's side cards wear their
own colours. Island lists show each island as its place on the chart, ringed
by whose it is. Hull icons differ by hull; building icons share a ground
line. The log is kept by day with a mark in the margin per kind of news. The
copy counts the world it is in instead of a hundred islands in eight chains.

**The mission menu.** Where an island offers an officer more than one
errand, a sheet lists each with what it does and the odds, and the player
chooses — Rebellion's menu, offered only where there is a choice to make.
`missionsOffered` in the sim; the opponent keeps the old precedence.

**Rescue.** One of yours held at the enemy's seat can be broken out, once
the seat is found. Read off Espionage, harder than a lift off a quay, and
worked on enemy ground with the risks that carries. The freed officer goes
home fit for sea. The opponent values a rescue above any island. The ninth
errand, and the last of Rebellion's that fits a cast this size.

**The battle summary card.** An action at sea and a landing carry their
tally on the event — hulls and guns a side, losses, the harbour's guns, the
boom — and the dispatch card lays it out crest to crest under the sentence.

**The rich opponent.** Above six hundred gold it doubles its orders a tick,
lays down a hull at every idle slipway, wants a third slipway and a battery
on a third of its ports; pending orders count against its surplus so it
cannot overcommit. Banked gold roughly halved over a year; fleets larger;
solvent on all six seeds. What is left in the bank is structural — its
islands are nearly full — and the next lever is room, not cadence.


## No base: three Pirate Lords — 14 September

Sean's call, an hour after the seat-ship: the Confederacy has no seat at all.
It has three Pirate Lords, each bound to a ship with a power of its own —
Hale and the *Free Harbor* (the Moot: allegiance a point a day where she
lies, and home for anyone coming back), Reyne and the *Swallowtail* (fastest
afloat, hit last while another hull floats beside her), Jessup and the
*Ironback* (heaviest guns, and every Confederate fleet in her harbour fights
under his edge). Their ships lie at a random uncharted frontier island where
the Confederacy was formed, with the Home Fleet and the rest of the crew
aboard the *Free Harbor*. A Lord never goes ashore, never boards another
ship, never takes a parley; the AI's diplomat list skips them.

A Lord's ship strikes rather than sinks: the Lord goes in irons to Highwater
and the ship comes back with them when they are exchanged or rescued. The
Crown wins with all three in irons at once; the Confederacy wins the day it
holds Highwater. The 60% rule is gone. Home for the Confederacy (`hqSystemId`)
follows the *Free Harbor*, then any Lord's ship, then the island that loves
them best, never a Crown island.

The opponent had to learn both wins. The Crown keeps one picket fleet charting
the nearest dark island whenever it has no companies aboard and nobody else is
out looking, and treats a charted Lord's island as the richest target on the
water. The Confederacy keeps its strongest non-Lord fleet for Highwater:
it folds every other fleet in the same harbour into it, calls the rest to
join while it is outgunned, stages at the island with the most companies to
spare, and sails when it carries more than the capital's garrison and boom.
Fifteen of sixteen idle-player games across eight seeds now end, most inside
a year and a half.

The star on the chart marks exactly two things: Highwater, and every island a
Lord's ship is lying off (the Crown sees those only once it has charted the
island). Thirty percent bigger than before. Filters answer with a ring now,
never a star.


## Loyalty does something — 14 September, evening

Sean's rule: allegiance is three bands, the chart draws them by size, and the
bands cost money.

**The chart speaks in one mark at three sizes.** A dot, small, medium or
large, and nothing else — except the star, which is Highwater and the Pirate
Lords and never anything else, and a count, where the number is the mark. On
Loyalty the size is the band: large at ninety, medium at sixty, small below it
or in revolt, and small for anything uncharted. Under a filter the size is the
answer: large if the island answers, small if it does not. The fleet sail is
gone from the full chart — a fleet is a large dot under the Fleets filter now,
and the sail itself lives in the chain view and the island's Harbour tab.

**Garrisons read the same way** (Sean, the same evening): under three
companies is a small dot, three to five medium, six and up large — six being
the cap a starting garrison is held to, so a large dot is an island held as
hard as the rules allow. The numeral it used to print is gone; Production and
Idle crew keep theirs, because those are figures you want exactly.

**Smuggling.** Every day, a share of an island's trade goes out the back to the
other side: nothing at firm, 15% at steady, 25% at thin, half in a revolt — and
in a revolt the holder gets nothing at all, so the enemy is the only one paid.
It is a transfer, not a tax, and `totalIncome` counts what the enemy's
smugglers bring you, so the banner still adds up. No event fires for it daily;
the island's panel carries the number and a dispatch says so the day an island
slips a band.

**Information.** A thin or rebellious island of yours the enemy has never
charted may simply turn up on their charts: 2% a day thin, 4% in revolt, never
when firm or steady. It rarely fires in the opening, where almost everything is
already charted; it is what keeps a frontier holding quiet later.

**Two things had to move for the ladder to mean anything.**
`HELD_SUPPORT_LEVEL` went from 55 to 65, because a governed island drifting to
55 would have made thin — a quarter of everything, on every island — the
resting state of the whole game. And the opponent now courts its own slipping
islands and puts down its own revolts, which it never did: it would let a Reach
rot and wonder where the gold went.

**A stall went with it.** Seed 4 as the Crown never ended: the Confederate
navy lay off Highwater for two thousand days with nine fleets and no companies
aboard. The strike fleet returned early at the capital before it ever
consolidated or fetched lift, so it could neither land nor leave. It now folds
in whatever lies in the same harbour, calls in berths as well as guns, and
sails home for companies when it cannot carry the island. Sixteen idle games of
sixteen now end, median 411 days, range 204 to 794.


**Noted while doing it:** `CHART_LAYERS[].hint` is dead data — no component
renders it, so the one-line explanation of each filter is written and never
shown. The chart's rules live in the Almanac instead, under *Reading the
chart*. Worth either surfacing the hints under the layer strip or deleting
them.


## Two sides, one hundred points — 15 September

Sean's rule: every island has loyalty to two factions and nothing else. The
two shares add up to a hundred on every inhabited island, so there is no
undecided middle: a point one side wins is a point the other loses. An empty
rock has no opinion and keeps none.

`setSupport` and `shiftSupport` in `helpers.ts` are now the only places in the
game that write either number, and everything that moved allegiance goes
through them — parley, incitement, command, a landing, the Moot's point a day,
settling an island, drift and spillover.

**What had to change to keep the arithmetic honest.**

- **Drift** used to pull each side's number separately, the holder's toward
  sixty-five and the other's toward nothing, which cannot both be true of one
  balance. It now moves the balance: toward sixty-five for a holder, toward
  even for an island nobody holds.
- **A parley** added its gain to you *and* took four off them. That is the
  same sentence twice now, so the second half is gone.
- **An incitement** took its loss off the governor and gave you a third of it,
  on the grounds that an angry island is not a friendly one. There is no third
  place for an angry island to go any more, so all of it lands on you. The
  number the uprising check reads is unchanged.
- **The flip bar** was sixty points with a twenty-five point lead — two ways of
  saying the same thing once allegiance is a balance, and low enough that one
  landed parley would carry an island that started level. It is a flat eighty
  now: a plain supermajority, three or four parleys' work from even against a
  drift that is always pulling back to the middle. `FLIP_SUPPORT_MARGIN`,
  `MISSION_SUPPORT_LOSS` and `INCITE_SPILLOVER` are gone with it.
- **A landing** set the attacker to at least thirty-five and capped the
  defender at fifty-five; the first of those now implies the second.
- **Unaligned islands** used to open at something like fifteen Crown and ten
  Confederacy — mostly undecided. They now open as a lean: forty to sixty near
  the war, forty-five to fifty-five out on the open sea, and never far enough
  to come over on their own.

**The bar in the interface** has two segments and no neutral remainder, on the
island panel, the chain view and the island list alike.

**Measured.** Sixteen idle games of sixteen end, median 494 days, range 204 to
794, and every inhabited island in all sixteen finishes summing to a hundred.
Expansion by parley is unhurt: the Confederate opponent still goes from eight
islands to eighteen or twenty-one inside a year.

**One test changed its subject.** The navy test measured the Confederate
opponent building its way to a fleet; on most seeds that side now takes
Highwater inside eight months and wins with the hulls it started with, never
needing a yard. It measures the Crown instead, which has to hunt three ships
across the Reaches and therefore fights a war long enough to build for: two
yards to eight, five hulls to thirty-seven.


## Garrisons, and the rules where a player can find them — 15 September

**A garrison is what loyalty asks for.** `requiredGarrison` read a sliding
formula off the support number; it reads the band now, which is Sean's ladder:
none when an island is firmly yours, one when it is steady, four when it is
thin, six in open revolt. Six ashore also *ends* a revolt whatever the island
still thinks of you, which is the first thing companies have ever done about a
mutiny besides fail to prevent one. Starting garrisons stayed where they were
tuned by dropping the spare from two to one: a loyal island still opens with
two companies, a sullen one with five.

**And troops work the smugglers down.** Every company ashore takes a tenth off
what the smugglers were running, so ten close the back door however sour the
island has gone. It is a mitigation and not a business — a company costs more
to keep than it saves on most islands — but it gives a rich island that has
turned thin something to do besides wait for a diplomat.

**Measured.** Day one is unchanged: income 65 against 56 upkeep for the Crown,
60 against 47 for the Confederacy, 21 and 14 companies ashore. Sixteen idle
games of sixteen end, median 472 days. Revolts now actually happen — five to
fourteen a game on the long side, where before the requirement was low enough
that almost nothing rose.

**The rules are in the game now.** Both advisors answer two new questions —
*How does allegiance work?* and *What are garrisons for?* — in their own
voices, each ending with the list of islands it is talking about: the five
leaking most, and the five under their requirement. The Almanac's loyalty card
carries the same ladder.

**Two interface fixes.** The filter follows you into a Reach: the chain view
now carries the chart's layer strip inline, so zooming in keeps the filter and
you can still change it there. And the island panel has a room-to-build bar
that is the width of the card on every island, with a line under it saying what
Ground and Water actually hold — ground takes camps and nothing else, water is
the harbour and shoreline where everything else stands.


## One pool of room, a sail over the name, and swipeable tabs — 15 September

**Ground and Water are gone.** Sean: *the ground and water makes no sense to
me, just make it available space*. He is right, and the bible had already made
this mistake once — Sweetwater was withdrawn in v2.6 for being a second number
that answered the same question. An island now has `slots`, one pool;
`freeSlots` is what is left; every building takes one berth whatever it is, and
companies and hulls take none. `rawSlots`, `energySlots`, `freeRawSlots`,
`freeEnergySlots`, `usedRawSlots`, `usedEnergySlots` and the ground/water half
of `reservedSlots` are all gone with them, and the island panel reads *Built
5 / 13, Free 8* with a line under it saying what takes a berth. Saves bump to
v4. Day one is unchanged and sixteen idle games of sixteen still end, median
506 days.

**The sail moved over the name.** In a Reach a fleet at anchor was a small
glyph to the right of the island's name; it is now a large one centred above
it, which is what you look at a Reach to find.

**The island's tabs swipe.** Harbour, Crew, Garrison, Buildings and Log were
five small targets; a sideways drag across the panel now moves between them.
The chart's layer swipe and this one are the same hook, `useSideSwipe`, which
is what the layer version always was under its own name.


## Four answers, and one rule that still cannot fire — 15 September

Sean's answers to the questions from the last round.

**The scaling indicator was the Buildings tab.** Not the bars — those measure
39, 120 and 362 pixels and are identical across islands — but the board of
boxes, one per berth, which grew downward and scrolled past nine. The tab now
leads with the same fixed bar and a line saying *4 of 13 berths taken, 9 free*,
and the board below holds only what actually stands. No ghost boxes.

**A twentieth per company, not a tenth.** A garrison should be a hand on
disloyalty rather than a cure: twenty companies would close the back door and
nobody will ever keep twenty on one island, so a sour harbour always leaks
something.

**Balance is parked** at Sean's word. For the record, sixteen idle games of
sixteen end, median 472 days.

**Leaks bite harder and still never fire, and it is worth knowing why.** A leak
now gives away what stands on the island and how many companies hold it, plus
any island of yours in the same chain the enemy had not found; the rates went
from a fiftieth and a twenty-fifth a day to a twentieth and a tenth. It fired
zero times in eight more games. Instrumented: 1,689 island-days of thin or
rebellious holdings in one game, of which **nought** had anything left to
reveal, and at the end **no island at all** was dark to the Crown. The reason
is structural rather than a tuning error — charting is the only hidden state
in the game, and the Crown's picket charts the whole map by the time anything
of the Confederacy's has gone sour. The rule is correct and will bite a human
who takes a frontier island and neglects it. To make it bite the opponent, the
game would need charts that go stale — an island the enemy has not visited in
a long time falling off them — which is a real design decision and not one to
sneak in.


## Freeport, a bar that measures, and a filter for open ground — 15 September

**Freeport is an island, not a ship.** The Lords signed the articles somewhere,
and that somewhere is now a place on the chart: one island out in Salt or Rime
Reach takes the name every game, keeping the position, the outline and the room
the painting gave it. `chartName` on the island holds what the painting calls
it, so the chart can still find its coast, its mark and its cameo while the
game and every screen call it Freeport. It is nobody's — populated, ungarrisoned,
the Brethren well liked there at sixty-five to seventy-eight, which is short of
the bar that would run up their colours. The Crown cannot see it. A different
island every game.

**The opening spreads out.** Everyone used to start in one heap, which made the
first move of every game the same move. Now the Regent stays in the citadel at
Highwater and the rest of the Admiralty is posted about the Crown's holdings;
the three Lords are aboard their three ships at Freeport, one or two other
Confederates are ashore on the quay there, and the rest are out on the islands
that have already declared. A Lord is still their ship and nothing else — aboard
on day one, never ashore, taken with the hull — and a Lord is now the *only*
Confederate aboard anything at the start. The officers who used to be swept onto
the *Free Harbor* stand on ground and can sail with anybody.

**The room bar measures rather than fills.** It used to stretch to the width of
whatever it was in and divide that by the island's berths, so a three-berth rock
and the great island drew the same bar and only the pips changed size. Now there
is one track — thirteen columns, the largest room in the game, the great island's
twelve plus a port's extra berth — and an island draws a pip in as many columns
as it has. Twelve berths fills it, six reaches halfway, three stops a quarter
along, and the columns past the end are simply not there. White where something
stands, grey where the ground is open, nothing where the island has no berth at
all. One component, `RoomBar`, on the island panel, in the Reach list and on the
chain view's islands, so the three read alike.

**Available land is a filter.** The tenth chart layer: islands of yours with
berths still open, in the same three dot sizes as loyalty and garrisons — five
or more free is a large dot, two to four medium, one small. An island in revolt
takes no orders and stays dark, and so does room on somebody else's island,
because the question the filter answers is where you can put something down
today.


## The Reach screen swipes, filters pick the tab, and Coral goes dark — 15 September

**A drag across a Reach changes the filter.** The chain view had the chips but
not the gesture, so the one screen you spend the most time on was the one
screen where a thumb had to aim. It is the same `useLayerSwipe` the full chart
uses, hung on the Reach panel's body.

**A filter picks the tab an island opens on.** A filter is a question — where
are my yards standing idle? — and tapping a lit island is asking to see the
answer, which was one more tap away every time. Now Idle yards, Idle training,
Idle shipyards, Available land and Production open on Buildings; Idle crew and
Missions on Crew; Garrisons on Garrison; Loyalty, Fleets and the bare chart on
the Harbour, where the allegiance bar and the hulls at anchor already are. The
tabs swipe from wherever it landed, so the filter chooses where you arrive and
nothing else. One function, `tabForLayer`.

**Coral Reach is frontier, and three islands wider.** The atoll was the one
charted, settled, nobody's Reach — a corner of the map with no reason to sail
to it. It is now the third uncharted Reach, which makes it a third place the
Lords might have signed the articles: Freeport can fall in Coral as readily as
in Salt or Rime. It is fogged and a quarter settled like the other two, which
does mean Coralhome and the great dockyards at Sluysvaan are bare rock in most
games — the same bargain Rime and Salt already make with their own named
islands. Three names from the bible's Coral list joined it, **The Shoals**,
**Passh Bay** and **Denby Cay**, and `scripts/chart_positions.py` placed all
eight on the painting's own land; the world is 63 islands now. Sixteen idle
games of sixteen still end, median 446 days, and day one is unchanged at 65
against 56 for the Crown and 60 against 49 for the Confederacy.

**The phone's clock was sitting on the Crown's name.** Two different things
were both called `banner` — the header with the crest and the creed, and the
one-line verdict shown when the war ends — and the verdict's rule came later
in the stylesheet, so it was quietly taking the header's padding with it,
including the safe-area inset that keeps the chrome out from under the status
bar. The verdict is `.verdict` now; two different things may not share a name.
The page is also `black-translucent` rather than `black`, which is the
combination that makes iOS report a real inset on a full-bleed view, so the
status bar now sits on the banner's own painting. A web app cannot hide the
status bar — only a native app can — so keeping clear of it is the whole of
the fix.

**Every idle layer counts.** Idle crew already drew its number as the mark;
idle yards, idle training and idle shipyards drew a star and left you to open
the island to find out whether it was one yard standing about or three. They
carry the numeral now, on the same pulsing halo, because where the answer is
"go and give something an order" the useful part is how many orders there are
to give. Garrisons and Available land keep their three dot sizes: their
question is how hard and how roomy, not how many.


**One class, one place.** `.build` was defined three times in the stylesheet,
in three different parts of the file, each quietly taking properties off the
last — and one of the three was written for a row layout with a head, an
action and a reason that has no markup left anywhere. Only one component ever
used any of it. They are one rule now, carrying the values that were actually
winning, so the grid renders pixel for pixel what it rendered before; the dead
selectors are gone. This is the same fault that put the phone's clock on the
Crown's name, found by looking for the rest of its kind rather than waiting
for the next one to show up on a screenshot.

**Freeport opens at a hundred — 15 September.** Sean's rule: the island the
articles were signed on answers to the Confederacy the way Highwater answers
to the Crown. It had been left merely fond of them, at sixty-five to
seventy-eight, and that could not stand once you look at what the rules do
with it: anything over eighty runs a neutral island's colours up on the next
tick, so a warm Freeport would have flipped on day one anyway and announced it
in the log as though it were news. So it is held outright, a hundred to
nothing, with a seat's two companies — the same `startGarrison(100, true)`
Highwater gets. It is still dealt none of the opening's camps, mills or yards,
because the articles were signed on it a week ago rather than settled on, and
it is still not a base in the sense that matters: losing it loses nothing,
because the Crown wins by taking the three Lords and by nothing else. Sixteen
idle games of sixteen end, median 481 days, eight wins each way; the
Confederacy's day-one upkeep goes 49 to 51 for the two companies and its
income is unchanged.

**Nothing sails without saying how long — 15 September.** Sean's rule: moving
island to island gets a confirm screen with the days on it. Time is the
currency this game actually spends, and a voyage used to be ordered the
instant you touched an island — the only way to learn it was a fourteen-day
crossing was to watch the days go by with the squadron out of reach.

Picking a destination now proposes the voyage rather than ordering it.
`SailConfirmSheet` says what is sailing, from where to where, how many days,
how many hulls, companies and crew are in it, and what is waiting at the other
end. Where a slow hull is holding the squadron back it names her — "the
Sovereign sets this pace; sail her separately and the rest arrive sooner" —
because that is a fact the player can act on. `sailDays` is exported from
`fleets.ts` and used by both the sheet and `sailFleet`, so the quoted figure
and the voyage cannot drift apart; a test pins them together.

Officers go the same way. The mission sheet already said "3 days' sail, then
15 days' work", but only when the island offered more than one errand; with
one it committed on the tap. It opens every time now, so no island-to-island
move happens without the days in front of it. An island with nothing to do on
it says so instead of opening an empty sheet.

"Stay in harbour" abandons the order outright rather than leaving the chart
waiting for another destination — it was a cancel that had not cancelled, and
the next island you touched was taken for a second attempt.

**The dead band under the console — 15 September.** Sean circled a strip of
flat dark nothing below the tab bar. Sampling his screenshot gave `#0a161c`,
which is `--bg`, the sea-dark — so it was not the console's wood failing to
stretch, it was the **document canvas** showing through.

An iPhone can lay the page out shorter than the glass, reserving the strip the
home indicator sits over, and nothing inside the page can paint there: fixed
positioning, `inset: 0`, `100dvh`, none of it reaches. What fills that strip is
the canvas, and the canvas takes its colour from `body`. Reproduced by laying
the app out 48px short of the viewport, which puts the same band back.

So `body` is painted in the console's own dark now — `#0f2119` for the Crown,
`#24100c` for the Brethren, kept in step by a `data-side` on the body — and
the strip reads as the bottom of the console rather than a band of sea under
it. `.app` paints `--bg` itself so nothing inside changes; that was previously
inherited from the canvas. The tab bar keeps its `padding-bottom:
var(--safe-bottom)`, so where the inset *is* reported the wood genuinely fills
it: the two together cover it whichever way the viewport resolves.

Worth remembering: the effect went in above every early return. Put below one,
it rendered more hooks on some passes than others and React threw #310 on the
title screen.

**The Reach panel's filters move to its foot — 15 September.** They sat above
the islands, which put the control you are least likely to want between you
and the thing you opened the Reach to look at, and a thumb's travel from where
that same control had just been on the chart. They are pinned to the foot of
the panel now, in the sheet's footer, with the chart strip's own wood and the
rule above it — the same control, the same look, the bottom of the screen.
`layers--inline`, which stripped the wood off and sat it in the body, is gone;
`layers--foot` keeps it. Swiping the map and tapping the chips both still work.

One honest caveat: the panel's strip sits 64px lower than the chart's, because
the panel covers the tab bar and the chart's strip floats above it. Making the
two land on the identical pixel would mean leaving a band of empty panel below
the strip, which is the dead space at the bottom of the screen we had just
finished getting rid of.

## Land, and the Lords go ashore — 15 September

**Room redistributed.** The least an island can hold is four berths, not three:
three was a place you built one thing on and never opened again. And every
island a side opens the war holding rolls eight to twelve over whatever the
chart gave it, so a starting island is one you can make something of. The chart
still decides the other fifty-odd, and still wins where it was more generous —
the great island's ports keep their thirteen. Measured across 24 worlds: all
islands 4–13, held islands 8–13, none below.

**A Lord is a ship when idle and a person on an errand.** Sean's rule, and the
best one in the game so far. The three Lords can now be sent to parley, to spy,
to sign somebody on. Ashore they are officers like any other — found out, hurt,
or carried off to Highwater in irons — and their ship lies where they left it,
unable to sail, her power asleep, until they are back aboard. A hull that
strikes with nobody on her quarterdeck is a prize and not a capture: you cannot
put irons on a deck.

That is the Confederacy's dilemma and it is meant to hurt. The three best people
they have are also three of their best hulls, and early on there is nothing else
to send. Every errand is a squadron out of the war and a third of the losing
condition standing on somebody else's beach.

The plumbing worth knowing: `lordAboard` is the one question everything asks —
sailing, powers, capture — rather than each place assuming. `reseatLords` runs
once a day and puts every Lord back on their own deck or takes them off it,
because hooking six mission-ending paths would have meant remembering five.
`fleetHeldAshore` names the Lord pinning a hull, and the fleet panel's button
reads *Waiting for Hale* rather than letting you pick a destination and be told
no at the end of it.

**Ratings, to the brief.** Hale a master diplomat (88–96) and recruiter; Reyne
amazing at combat (80–92) and espionage (82–93) and a recruiter; Jessup amazing
at combat (80–92). All three good leaders, 72 and up.

**The opponent keeps its Lords aboard.** The AI was never taught to send them
ashore and still is not: it plays the safe half of the dilemma. A human choosing
to risk a Lord is the interesting decision; an AI throwing away a third of its
own losing condition is just a bug with extra steps. Worth revisiting once the
rest of the opponent is smarter.

Sixteen idle games of sixteen end, eight wins each way, median 517 days — up
from 481, which is what more room to build should do.

**Not a bug, for the record.** Tracing a Lord's first errand showed the mission
clock running past zero into negative days and never resolving. It does that for
every officer on the player's own side: a finished mission raises a decision —
stay at it or come home — and waits for an answer. The test now answers it.

**A base per ability, and a swing per game — 15 September.** Sean's rule.
Characters carried a min-max band per ability; they carry a single base figure
now, set by their lore and by what the game needs of them, and a game rolls
each ability within a swing of it: twenty either way for a major character, ten
for a minor one. `major: true` marks the fourteen named principals in
`characters.json`; the unaligned are minor. The bases came from the midpoints of
the old bands, so nobody's character changed — only how far they are allowed to
wander from it.

The roll is **not** capped at a hundred, which is the point of the rule: a base
of 92 can come out at 112, and an officer having the game of their life should
be allowed to be better than anyone has a right to be. The floor is 1. The
rating bar cannot draw past full, so past a hundred it fills and turns brass,
and the figure beside it says how far past.

Measured over 80 worlds: ratings run 12 to 112, 194 scores came out over a
hundred, a major's widest span for one ability is 40 and a minor's is 20, and
nobody ever lands further from their base than their swing allows. One rule,
`rollRating`, in the constants ladder with the rest.

## Each side has a shape — 15 September

Sean's rule: the Imperium has a lot more leadership; the Confederacy more
diplomacy and espionage; combat balanced; and individuals free to specialise
against their own side's grain.

Roster averages before: leadership **72.0 against 71.6** and espionage
**61.7 against 62.6** — the two axes meant to separate the sides were the two
that were level. After:

| | diplomacy | espionage | combat | leadership |
|---|---|---|---|---|
| Crown | 58.0 | 56.6 | 66.9 | **78.9** |
| Brethren | **69.1** | **67.4** | 67.7 | 68.1 |
| gap | +11.1 | +10.9 | +0.9 | −10.7 |

The against-type specialists are the point, not a rounding error: **Blackwater**
is the second-best spy in the world on the side that is worst at it, and
**Jessup** and **Hale** out-lead all but three of the Admiralty. Both are
pinned by a test, along with the four gaps.

What it buys on day one, measured: the Brethren's best parley lands 94% against
the Crown's 84%, incite 71% against 63%, sabotage 68% against 58%. The Crown's
best restores order at 95% against 90%. Sixteen idle games of sixteen still end,
eight wins each way, median 505 days.

### Three things Sean described that the rules do not do yet

Measured rather than assumed, and left alone rather than quietly changed.

**The Crown does not have the early military advantage.** It has 17 guns and 5
hulls on day one; the Brethren have **33 guns and 9 hulls**. Twenty-one of those
33 are the three Lords' ships. Without them the Brethren have 12 against the
Crown's 17, which is the intended shape — the Lords' hulls invert it on their
own. The Crown does lead on companies ashore, 21 against 17.5, which is not
"huge". The fix, if the intent stands, is a heavier Crown opening in
`START_FLEET` rather than anything touching the Lords' flare.

**A leader posted on an island does not suppress anything.** `foilChance` reads
only the watcher's **espionage**, so under the new profile the Crown's officers
get *worse* at catching saboteurs, not better. Sean's "put leaders on islands to
lead, suppressing uprisings and espionage and sabotage attempts" wants leadership
in that formula — one line, but a rules change with a blast radius on both sides,
so it is his call.

**Smuggling is symmetric.** Each side already collects what the other's disloyal
islands leak: 8.2 a day to the Crown against 7.8 to the Brethren on day one. It
is not a Confederate specialty unless the rule is made one.

Recruitment does already favour the Brethren, through diplomacy rather than
through a count of recruiters — roles in the data are display only.


**The original's personnel, read and set beside ours — 15 September.** Sean's
Rebellion stat sheet is in Drive; the analysis is `docs/rebellion-personnel.md`.
Nothing was applied. The headline: the original rates the same four abilities
and rolls each from a range, which is our base-and-swing rule arrived at
independently — but its **icons are fixed and its nobodies vary**, which is the
exact reverse of ours, and only **two characters in sixty** ever pass a hundred
against our 194 rolls in 80 worlds. Its Empire is frightening through materiel
rather than officers, which is the same thing Sean wants of the Crown and the
same thing our day-one gun count does not deliver.

**The dead band, properly this time — 15 September.** Painting the canvas in
the console's dark stopped the strip being a foreign colour but did nothing
about its size, and Sean's next screenshot showed why: it is **98 points tall**,
not a home indicator's 34. Sampled at `#22100c`, which is `--chrome-2`, the
exact colour the tab bar's own gradient ends on — so it read as the console
going flat and carrying on for a third of an inch.

Ninety-eight points is not an inset, it is the app not reaching the bottom of
the glass. `position: fixed; inset: 0` measures the **layout** viewport, and iOS
can make that much shorter than the screen. So `.app` asks for `100dvh` — the
dynamic viewport, which is the unit for exactly this — and then overrides that
with `--app-h`, set from `visualViewport.height` in `main.tsx` and updated on
resize and rotation. A unit is the browser's opinion; `visualViewport` is a
measurement.

Proved rather than hoped: with `--app-h` forced 98pt taller than `inset: 0`
gives, the app and the tab bar both follow it to the new bottom. Unchanged at
the normal height, so nothing moves where nothing was wrong.

## One order, four in the boat — 15 September

**The console was already tethered.** Sean asked whether the bottom panel could
be pinned to the screen with the map flexing to fit. It is, and it does:
`.app` is a flex column, the tab bar is `flex: none` at 64pt, and `.screen` is
`flex: 1`. Measured at three glass heights: the tab bar stays 64pt hard against
the bottom and the map absorbs every point of the difference — 678, 574, 774.
The dead band was never the layout, it was the app being told the wrong height,
which `--app-h` now measures off `visualViewport` rather than inferring.

**"Send on mission", and nothing else.** An officer had two buttons of equal
weight, one of which was a way of looking rather than an order. Finding
somebody is now a quiet link on the line that says where they are — *Show
Highwater on the chart* — and the action row is one primary button.

**Up to four in a boat.** Sean's rule. A mission carries a `party`, the leader
holds it and the companions carry `escorting` pointing back, so the day's tick
still resolves one errand however many went on it. Who may go: same side, free,
and in the same harbour — ashore or aboard a hull lying off it, because a boat
pulls for the beach from either. A Lord may not, because their absence pins
their own ship and that cost should not be somebody else's to pay.

**A boat is worth its best hand, not its average.** `bestOf` takes the highest
of each ability across everyone in it. Bring the forger for the forging; a
second-best passenger changes nothing, which is the right incentive — take who
the work needs, not everybody. The errand sheet shows the odds moving as chips
are added, off the same function the resolution uses.

`syncMissionParties` runs daily after the errands resolve, and moves or frees
the companions off the leader's state — the same pattern as `reseatLords`, and
for the same reason: there are six ways an errand can end and five of them
would have been remembered.

**Roles are decorative and always have been.** Spec Ops, Diplomat, Recruiter,
Leader, General, Tidemaster, Deep-touched, Ship Design, Wing-Captain, Drill
Research — eleven labels, read by no rule anywhere in `src/sim`. They are
badges on the card; the four ratings decide everything. Whether they should
gate anything is the Admiral/Commander/General question from
`docs/rebellion-personnel.md`, still open.

**Two places, not three — 15 September.** Sean: *"There is no harbor vs
ashore. You're either on a fleet or island. That simple."* He is right, and
the mechanics always agreed — `companionsFor` compares one `locationSystemId`
and nothing else. It was the words that invented a third place, mine included:
*"anyone in this harbour, ashore or aboard a hull lying off it"* describes two
locations where the code has one.

Gone: the island panel's first tab is **Island**, not Harbour, and the
component behind it is `ShipsHere` rather than `Harbour`. An officer is **On
Highwater** or **On the Swallowtail, at Avermere** — never "ashore at". The
errand sheet says *"anyone at this island, on it or on a fleet here"*. "Stay in
harbour" on the sail sheet is "Don't sail"; a Lord who cannot leave mid-passage
"leaves from an island, not mid-passage"; the officer sheet's "Going ashore" is
"On a mission" and its "Time ashore" is "Time on the island".

Kept, deliberately: **"companies ashore"**. That is not a third place, it is
the word for troops on the island as against troops on a ship — which is
exactly the two-place model. And an island still *has* a harbour the way it has
a coast: the harbour's guns fire, a boom closes the harbour mouth, a blockade
shuts it. What is gone is the harbour as somewhere a person can be.

**The band is padding, not a gap — 15 September.** Sampling the fourth
screenshot settled what the third could not: the strip under the console is
now **textured wood**, where before it was flat `#24100c`. Flat was the page
showing through; textured is the tab bar's own background. So the app *is*
reaching the bottom of the glass — `--app-h` did its job — and what is left is
`.tabbar`'s `padding-bottom: var(--safe-bottom)` coming out at something like
**106 points**.

No iPhone reserves that. An inset is a strip of glass, not an opinion, so both
are bounded now: `min(env(...), 34px)` at the bottom and `min(..., 60px)` at
the top. Whatever the browser reports, the padding cannot run away with the
console again.

**And `?diag`, so the next round is not another guess.** Four passes at this
went by on inference, because every measurement available to me is on a browser
that does not have the fault. `?diag` prints four lines on the phone itself:
what each viewport reports, what the insets actually resolve to, where `.app`
and `.tabbar` land, and the gap below the tab bar. A screenshot of that settles
it in one round. Absent the parameter it costs nothing.

**The Harbour is the ships in it — 15 September.** Two corrections at once.

First, mine: "there is no harbour vs ashore" was about *where a person can
be*, and I over-read it into renaming the island panel's first tab to Island.
Sean wants it called Harbour, which it is again.

Second, what the tab is for. It opened with the allegiance bar, the smuggling
line and a Room-to-build block, and the ships were at the very bottom under the
sea monster. Every one of those first three is on the chain view before you
ever open the panel — the loyalty bar under each island, the room pips beside
it. So the tab now goes painting, **At anchor**, blockade, these waters. The
ships are the first thing under the name, because the harbour is the ships.

Nothing was thrown away. Room already leads the Buildings tab. Allegiance and
the smuggling line moved to **Garrison**, which is where they belong: how many
companies an island asks for and how much of its trade goes out the back are
both read off that one number. The "nobody lives here" line went with them.

Spelling kept British — Harbour, as everywhere else in the game bar the *Free
Harbor*, which is a ship's name. One word to change if Sean wants the American
one.

**Three from Sean, 15 September: the monster goes out to the dark, the
painting comes up, and a garrison stops being ten identical pikes.**

**"If there is a sea monster, it needs to be in an unexplored area and it's
discovered when your fleet arrives."** It was decoration and he is right that
it should not have been. A creature was derived on the fly from any island's
name and archetype, which meant every charted island in the game had one, the
Crown's own capital included, readable on day one from a panel you open with a
thumb. That is a line of text about a place you have already been.

Now nothing lives in charted water. Worldgen rolls a creature for islands of
the three unexplored Reaches only — Rime, Salt and Coral — about one in three
of those whose waters hold anything, which comes out at three to fifteen in a
world and never all of them. It is written on the island and never changes.
It stays invisible until somebody of yours has actually stood there: a fleet
coming to anchor, or a boat rowing an officer in on an errand. Charting an
island from a masthead two islands away does not do it, which is the whole
point — `scoutFrom` can open half a chain and reveals none of this.

Each creature gained a `found` line, so the day it happens goes in the log in
its own words: the boats come back from somewhere short a boat, with the
grooves in what is left parallel and a hand apart. The Almanac's bestiary is
now a log rather than a bestiary — it lists what your own crews have seen and
names the islands they saw it at, and opens empty.

Freeport keeps its own: the Confederacy signed the articles standing on it, so
whatever is off it is not news to them. It is still news to the Crown. And
because Freeport is renamed and re-painted after the roll, its creature is
asked for again afterwards, or a kraken ends up haunting a free harbour.

**"Move the port image up so it's on every tab."** `Sheet` gained a banner slot
between the header and the tab strip, and the island's painting moved into it.
Four tabs are all about one place and the place used to go off screen the
moment you looked at its garrison.

The painting and nothing else. The line of lore under it went back into the
Harbour tab: everything in that slot is paid for on all five tabs, out of the
height each tab has to work in, so only what is about the place on every one of
them earns the space. A picture does. Two lines about seawalls does not.

**"Garrisons need images… model garrisons after SW Rebellion units but follow
lore and races of our world. Names, stats, and prompts."** Ten company types,
`src/data/troops.json`, names and the watch column out of the bible's §7, which
took them off Rebellion's ground units; attack and hold are new, set against
what the bible already claims — best offense, best defense, best starting
troop — so the numbers and the prose cannot contradict each other. A test holds
those three superlatives true.

What decides where a company turns up is the sort of thing it is, and that is
the part worth having:

- **Line** and **sailors** everywhere the side has anything — Crown Regulars,
  Island Militia, a Ship's Company each. Sailors only where a shipyard stands,
  because that is where they came off a hull.
- **Native** units are a people rather than a purchase. Reefwalkers in the
  ports, Reef Guard on the reefs and in the drowned water, Urskin Berserkers on
  the ice and the bare rock. The Reef Guard do not garrison a reef island, they
  *are* the reef island.
- **Made** — Tidewrought and the Drowned Guard, the two things the Crown
  manufactures rather than musters. Behind research, so nowhere yet, which is
  correct: they are the Crown's answer to a war it is not winning.

A garrison is now a roster the length of the count the rest of the game already
runs on, seeded from the island so it never reshuffles when a company is lost.
Nine drawn figures for the ten types, all cut on the same 14×26 grid so a mixed
garrison reads as a rank: what changes is what is in the hands and what is on
the head, because nothing finer survives thirty pixels. A painting dropped into
`src/art/troops` beats the drawing, as everywhere else. `docs/troops.md` has
the ten prompts in the art-batch house style.

**One thing deliberately not done.** The three numbers are shown and not yet
read. A landing is still settled on how many companies are ashore, exactly as
it was. Wiring them means typed companies in a ship's hold as well as on an
island — a real job, and one that moves the balance, so it is worth doing on
purpose rather than as a side effect of adding art.

**And one stale test found on the way.** `defences.test.ts` asserted the
Confederacy opens with seven or eight islands. It has opened with eight or nine
since Freeport started flying Confederate colours at Sean's word; the four
seeds it checked had all happened to roll one home island, so it passed on
luck. Adding a die roll to worldgen shifted the stream and exposed it. Bounds
and comment corrected.

**Four from Sean, 15 September: the dead band answered with a cause rather
than another guess, one log, the American spelling, and something in the
water worth bringing a squadron for.**

**"Why can't we just slide down the utility panel to the bottom of the phone
screen?"** It is the right question, and the answer is that the panel has
always been on the bottom of the app — `.app` is a flex column with the tab
bar last, so the bar sits on the app's own floor. The app was the thing in
the wrong place, and two separate measurements put it there.

*Height*, which I had already fixed: `position: fixed; inset: 0` measures the
layout viewport, which an iPhone can make most of a hundred points shorter
than the glass. `visualViewport.height` is a measurement rather than a unit's
opinion, and the app is sized from it.

*Position*, which I had not. Height alone is not enough. A fixed element is
anchored to the top of the **layout** viewport whatever its height, and the
visual viewport can be offset from it — so the app comes out the right height
in the wrong place, and what you see is a band of nothing along the bottom
edge. `visualViewport.offsetTop` is that difference, and `.app` is now moved
by it.

*And the bottom inset was being paid for twice.* The home indicator's strip is
real, but in a browser tab it is not ours: Safari's own toolbar is sitting in
it, and `visualViewport.height` already stops above that toolbar. Padding the
tab bar by `env(safe-area-inset-bottom)` as well buys the same strip a second
time, and the second one is drawn as tab-bar wood with nothing on it — which
is exactly the textured band in Sean's screenshot. `--safe-bottom` is now
zero in a browser and the real inset only in standalone, where there is no
toolbar and the strip genuinely is ours.

Both of those are invisible to me: every browser I can measure on has
`offsetTop` 0 and no insets, which is why four rounds of this went by on
inference. So `?diag` now prints a **cause** line naming which of the two is
live on the phone it is running on, or saying neither. One screenshot settles
the next round instead of another guess.

**"Cut log from locations. Only need 1 log."** Gone. The island panel is four
tabs now — Harbor, Crew, Garrison, Buildings — and the Log screen in the tab
bar is the log.

**"Change harbour spelling to harbor please."** Done, everywhere: 105
occurrences across the source, and the bible, the opening and the art docs
with it. It matches what was already American — the *Free Harbor* and the
`free-harbor` archetype. PLAN and ASSETS keep the old spelling on purpose:
they are dated records, and the entry above that explains why the British one
was kept should stay legible rather than quietly become a lie.

**"Treat the sea monsters as like a neutral faction ship to challenge."** So
it is one. A creature carries guns and hulls now, it is nobody's, and it
fires on every fleet lying in its harbor whoever it belongs to — and
everything there fires back. It does not mend: break off and come back a
month later and it is still carrying what you gave it, which makes a second
attempt a plan rather than a restart. Kill it and the island's water is only
water.

In the panel it is a card among the ships at anchor, red-edged and badged
Neutral, with its painting, its guns and how much it has taken. That is what
it is to the player: a thing lying in this harbor that has to be got past.
The turtles and the cats keep no guns and stay where they were, as the quiet
block at the foot of the tab.

**Measured rather than asserted**, because "a real fight" is a claim:

| | opening squadron, 5 hulls / 17 guns | one sloop |
|---|---|---|
| The Kraken (10 guns, 8 hulls) | killed day 3, five times in five, 3–4 hulls left | eaten day 1, five times in five |
| Sea Dragon (6 / 5) | killed day 2, 4–5 hulls left | eaten day 1 |
| The Derelict (4 / 3) | killed day 1, nothing lost | eaten day 2 |

A hull takes a hit for about every two guns firing at it and a creature for
every six, so a lone sloop's two guns round to nothing and it cannot mark a
kraken at all. The Derelict costing a squadron nothing is right for her: she
is eerie, not deadly, and every captain who has met her wrote her off and
turned for home.

**And an action against one is always logged**, even when nothing sinks. Two
fleets trading shot without a loss has always been a quiet day the log leaves
out; a creature is not, because it can chew a squadron for a week without
taking a hull down, and a player watching damage climb with nothing in the
log has no way to find out why.

**Freeport never gets a dangerous one.** The Confederacy chose that island to
meet on and is moored in it on the morning of day one; losing hulls to a
kraken in your own birthplace before you have given an order is a coin toss,
not an opening. A harmless one can stay — a free harbor full of cats is
exactly right.

**A balance scare that was my own instrument.** A sixteen-game idle run came
back 16–0 to the Confederacy at a median of 215 days against a recorded
baseline of 8–8 at ~510, and with zero monster fights in it, so it was not the
monsters. It was the harness: `runAI` plays only the side the player is *not*,
so a one-sided idle run measures nothing but "the AI beats a statue". Sitting
the player on each side in turn — which is what the original measurement must
have done — gives **8–8, no stalls, median 589 days** with the creatures in.
Checked against the previous commit before believing it, which showed the same
16–0, proving the fault was in the measurement and not in today's work.

**The clock runs at Rebellion's pace — 15 September.** Sean's reference
table: **150 / 75 / 30 / 15 seconds** a game day for Very Slow, Slow, Medium
and Fast. The game had been running 4 / 2 / 1 / 0.4, so this is about
thirty-seven times slower, and it is the original's pacing rather than a
strategy game's demo loop. A war here runs a few hundred days, which puts
Fast at a couple of hours, Medium at about five, and Very Slow at something
you leave going and come back to.

**Two things had to come with it, and the first is not optional.** The clock
was a `setInterval` one day long, torn down and rebuilt whenever the game
paused — and it pauses every time a panel opens, which is most of what a
player does. At four seconds a day the lost progress was invisible. At a
hundred and fifty, opening an island two minutes into a day and closing it
would cost those two minutes every time, and a player who taps about would
find the date never moved at all. So the clock counts real elapsed time into
a total that survives the pause: whatever the day had behind it when you
opened the panel is still there when you close it. Measured in a browser —
at Fast the day sat at 0.44 when a panel opened, was still 0.44 four seconds
later, and carried on from 0.467. It also advances exactly one day per
crossing, never a burst, so a backgrounded tab does not come back and run a
fortnight in a frame.

**And the day badge has hands now.** A date that sits unchanged for two and a
half minutes is a clock with no hands — there is no way to tell the game from
a freeze. A ring round the badge fills from noon, clockwise, and resets on the
turn of the day; it holds its place while paused, which is half the point of
it. Driven by a `--day-progress` custom property written on the root element
five times a second rather than by React state, because re-rendering the chart
to move a ring three degrees would be absurd.

**One judgement call, flagged.** The first tap on a paused clock used to start
at Slow. At the old speeds that was two seconds a day; at the new ones it is
seventy-five, and the first minute of a new game would be spent watching a
date that has not moved. It starts at **Medium** now. Still inside Sean's
table, and a tap either way from there.

**Monsters start small, then start moving — 15 September.** Sean: "Monsters
should start small. Maybe like 25% of unexplored have a monster. But later in
the game a log pops up saying rumours of [monster] are spreading in the [sea
name], and maybe we can have a monster attack either a fleet in transit or a
harbor… And a monster might run away just like a fleet can. Run to another
location within the sea. But it always stays and fights if there is nowhere
else to go."

**A quarter, not a third** — 5.6 creatures in a world rather than 8.4. They
are not meant to be a feature of the frontier; they are meant to be the thing
you did not expect out there, and what they do later is worth more than there
being lots of them.

**Two hundred days of nothing.** The opening is about the war, and a creature
in that stretch is a hazard of going somewhere nobody has been, which is what
it should be. After that each has a slow chance of waking per day. Measured
over twelve worlds: **2.1 rumours a game**, the first on day 200 and the
median on day 260 — a phase of the middle game rather than a thing that
happens once or constantly. The rumour is public and names the Sea, because
that is what a rumour is.

**A woken one hunts.** It moves about its own Sea roughly weekly, and where it
goes is the whole difference between its two reasons for moving:

- **Whole, it hunts**: water with ships at anchor first, anywhere else only if
  there is none. Coming into a harbor puts it in the battle round, which
  already knew what to do with a creature, so arriving somewhere with ships
  *is* the attack — nothing new had to be written for it.
- **Hurt past half its hull, it runs**: and running toward a squadron is not
  running, so it will only go where there are no ships.

**Which is what makes "nowhere else to go" real.** A creature is cornered when
every other island in its Sea has ships in it or something else in the water —
so cornering one is a thing a player can do on purpose by spreading hulls
through a Sea, and a cornered creature stands and fights and does not run
again. It is rare in an ordinary game, so it is tested directly rather than
hoped for: a world is built with ships on every island but the one, and the
creature turns and fights.

**A fleet in transit** is taken when there is nothing at anchor in the Sea to
go for. A voyage in this game has a destination and a count of days but no
route, so "in transit" can only mean bound somewhere in this Sea — which is
enough, because it is the fleet nobody can reinforce, caught where no fort can
fire and no squadron can join.

**How a creature moves at all:** it is carried on the island it is in rather
than being a thing with a position of its own, so moving one moves the fields
— what it is, what it has taken, and which side has seen it, all travelling
together. Nothing else had to learn that a creature can move: the harbor
panel, the battle round and the almanac go on reading the island in front of
them.

**Balance unmoved:** 8–8 over sixteen games with the AI in each seat, no
stalls, median 493 days.

**Two of my own instruments were wrong before the code was**, both in the same
way — counting a thing by a key that is not unique. Wakes were counted by
creature slug, which collapses two Krakens into one; movement was counted off
a log line that is only written where the player has charted the island. Both
said the feature was barely firing. Counted off the rumour log, which is
always public, and off the set of islands holding creatures, it fires exactly
as intended.

**The band under the console, measured at last — 15 September.** Sixth pass,
and the first one with a number instead of an inference. Sean sent a
screenshot; I measured it rather than looking at it.

**What it actually is.** Sampling the bottom of that image row by row — with
his red annotation masked out, because the first pass at this mistook the ink
for texture — the console's wood runs to y=2412 and below that sit **164
device pixels of perfectly flat `rgb(32,17,12)`**, standard deviation 0.1
across the width. Flat, not textured. That is the page showing under the app,
not the tab bar padding itself. On a 393pt phone at 3x it is **55 points of
app that is not reaching the glass**.

So the previous two rounds were both wrong, and wrong in an interesting way.
The inset theory was wrong because the strip is not the tab bar's background.
The offset theory was wrong because the app is the right height in the right
place and simply too short.

**Why it kept being wrong: I kept picking one number to trust.**
`visualViewport.height` is a measurement rather than a unit's opinion, which
is true, and on that phone it is also 55 points short of the glass. The fix is
not a better source. It is that **the two failure directions are not
symmetric**: an app taller than the glass hides the overflow under
`overflow: hidden` and looks perfect, while an app shorter than it shows a
dead band. So the height is now the **largest** of everything the browser will
say — `innerHeight`, `clientHeight`, `visualViewport.height + offsetTop`, and,
installed to the home screen where there is no toolbar to account for,
`screen.height` bounded to +140px. In CSS it is `max(100dvh, var(--app-h))`,
so the unit and the measurement cannot undershoot each other either.

**Reproduced and controlled**, which is the part the last two rounds skipped.
Chromium will not lie about its viewport, so the lie was injected —
`visualViewport.height` redefined to report 55 less, exactly the fault in the
screenshot. Before: a 55pt gap. After: **gap 0**. And a control that pins the
app short on purpose still shows its 55pt gap, so the passes mean something
rather than being a harness that cannot see a gap at all. That control is the
same mistake I made twice earlier today with the balance runs, caught this
time before reporting.

**And a backstop, because five rounds said the same thing and were wrong.**
The page now wears the console's own wood rather than a flat colour. What made
this ugly was never that a gap existed — it was that the gap was a dark slab
under a textured console, which reads as the app having stopped early. Wood
under wood reads as the console being a little deeper, which is nothing. If a
sliver survives on some phone neither of us has, it will not look broken.

`?diag` now prints every number the browser offers for the height of the glass
side by side, and the gap below the console measured against two of them.

**One height for a panel with tabs — 15 September.** Sean, four screenshots
of the same island: "Make all these same size panels. Not getting taller and
shorter depending on content."

`.sheet` was `max-height: 82%`, so it grew to whatever was in it — Harbor
filled the cap, Buildings on an island you do not hold came in at half that.
The panel is anchored to the bottom of the screen, so a shorter panel moves
its *top*: the island's name, its painting and the tab strip all jumped to a
different place on every swipe, and the tab you were aiming at was never twice
in the same spot.

A sheet with tabs is now a fixed `height: 82%` and the body scrolls inside it.
Measured across all four tabs: top 172, height 784, tab strip at 369 — the
same three numbers every time.

A sheet **without** tabs still sizes to its contents, and should: a ship's
sheet has as much in it as that ship has, and stretching it to fill the screen
would be padding for its own sake. It is the tabbed panel that is furniture.

The cost is honest and visible: a sparse tab has room to spare at the bottom.
That is the trade Sean asked for — a still panel over a snug one.

**Command is a posting, and Sign on is gone — 15 September.** Sean: "Instead
of the 'sign on' thing. Cut that. Just make a mission 'Command'. You can set a
crew unit to command a location or a fleet."

Signing on was the odd one out in the whole game. Every other thing an officer
does is an errand — you order it, they sail, it takes days — and this one was
a chip in the harbor panel that put somebody on a deck the instant you tapped
it, provided they were already standing on that exact island. It was free, it
was instant, and it only worked where the geography already agreed.

Now there is one verb. **Command** targets an island of yours or a squadron of
yours lying at one, the officer sails there like anything else, and on arrival
they are *in post* — no fortnight of work and no success roll, because taking
command of your own island is not a thing you can fail at. What it costs is
the officer: they are tied up until relieved. Relieving is instant and free,
because they are already standing there.

**Command was already a mission type**, but a narrow one: "an island of yours
that is in revolt", a one-shot that went and put the revolt down. That is
subsumed. Any island of yours will take a commander now; putting down a revolt
is what one does on arrival rather than the only reason to send one. It is
offered everywhere and *defaulted* to only on an island actually in revolt — a
posting spends an officer indefinitely and should be asked for, not assumed.

**What a posting ashore buys** is the thing that was missing from the faction
profile. Measured two rounds ago and reported as unimplemented: the Crown's
leadership edge bought it nothing defensively, because `foilChance` read
espionage only. A posted commander now adds up to a quarter to the chance of
catching anyone working against that island, and **an island with a commander
on it does not rise**. That is worth an officer: the alternative is companies,
which cost gold every day and can be landed on.

Balance unchanged: 8–8 over sixteen games with the AI in each seat, no stalls,
median 493 days.

**One honest gap.** The AI does not post commanders — measured zero across
sixteen finished games. Its mission picker only reaches for Command where the
old default did, on an island in revolt, and its revolts are usually settled
by garrisons first. So this is a player-side tool until `aiMission` learns to
value a posting. Worth doing, and worth doing knowing what it costs the AI in
tied-up officers.

**Two test bugs of mine, both the same shape as this morning's**: I advanced
the state a command had *returned from* rather than the one it returned, and I
asserted an island's allegiance could only go up over twenty days when drift
takes it down. Commands are pure and allegiance is not monotonic; both were my
instruments, not the code.

**The combat engine, rebuilt — 15 September.** Sean's four calls on the naval
combat spec: modal battle, one to three rounds, targeting by simulation, flee
to the nearest friendly isle, and monsters with abilities of their own rather
than different numbers.

**Ships shoot now.** The old round added both sides' guns, halved the total
and dealt that many one-point hits at random hulls. That could not express a
damage roll — a seventh of one point is nothing — and it could not express a
target choice either, because there were no attackers, only a number. Every
hull takes its own shot: **75% to tell, damage the gun's worth give or take a
seventh**, simultaneously resolved so a hull that goes down still fired.

**The scale moved to make room.** 2/3, 4/5, 7/9 and 0/4 became 8/9, 17/18,
30/32 and 0/14. The ratios between the four are unchanged, so the war balances
where it balanced; what changed is that a damage roll now has somewhere to
land. Forts, booms, the Lords' three ships and every creature moved with them.

**One to three rounds, measured.** Against the opening fleets over forty
battles: **decided by round 2 at the median, 40 of 40 inside three rounds**.
An even match decides in one. Annihilation takes a round or two longer, but
only because a beaten side with a transport left gets chased — which will stop
happening the moment the loser can flee.

**Targeting, and the honest version of "run sims".** Sean is right about what
the answer looks like, but a Monte Carlo inside a round inside a day that
ticks a hundred times a second is not affordable, and it would eat the seeded
RNG stream besides. So the engine uses the closed form the sim converges on —
threat removed per point of damage spent removing it — and a test
**brute-forces the question the sim would answer and checks the closed form
agrees: 295 of 300 random boards.** Verified rather than claimed. Jitter is
kept deliberately, so fire spreads between hulls of equal worth and a battle
reads as a battle rather than a list being worked down.

**Flee** always works, always runs for the nearest island you hold, and costs
only what can reach a fleet already under way: long guns, a fort you have to
sail past, and a creature, which is in the water with you. Nothing in the game
carries long guns yet — deliberately, because that is the arc — so early
disengagement is free, and the day the first long-gunned hull launches is the
day breaking off starts to cost. How many parting shots a hull eats is its
**speed**: measured over sixty retreats under a Kraken, the first-rate took
1618 damage and the sloop 260.

**A creature is not a ship with different numbers.** The **Kraken** does not
fire: it gets hold of a hull, and a quarter of its strikes take one whole,
sound or not, which no amount of hull protects you from. It strikes twice a
round and is hard to hit at all. The **Sea Dragon** catches more than one hull
at a time. The **Derelict** is nearly impossible to hit back. And every
creature can reach a fleet that is running, so you cannot simply swim away
from one — which is also what keeps the cornered-creature drama intact.

**War balance unmoved after all of it:** 8–8 over sixteen games with the AI in
each seat, no stalls, median 568 days.

**Still to come:** the modal battle itself — the clock stopping, the round
report, the assessment, and FIGHT AGAIN or FLEE. Flee is a working order on
the fleet card in the meantime, so the rules are playable before the ceremony
around them exists.

**The band, seventh pass — the gate was wrong, not the reasoning — 15
September.** Sean: "Bottom still is fucked up. Explain the issue plainly. Why
can't the utility bar be on the bottom of my iPhone screen? Why is it always
higher."

**What the screenshots actually say.** Measured, not looked at. Both his
screenshots have the same 164 device pixels — 55 points — of perfectly flat
colour below the last row of console wood, standard deviation zero across the
width. And between the two, **that slab changed colour exactly when I changed
the page's colour** and nothing else. That settles what it is: it is the page
showing under an app that stops 55 points short of the glass. Not the tab
bar's padding, not the home indicator, not a viewport offset.

**Why the last fix did not fix it, which is the interesting part.** I had the
right remedy — grow the app to `screen.height`, because in a context with no
browser furniture the glass and the viewport should be the same thing — and I
gated it on `display-mode: standalone`. That gate is wrong. Safari lets you
hide the toolbar in an ordinary tab, and in that state the page is *also*
flush to the glass while standalone is false, `navigator.standalone` is false,
and `innerHeight` is still sized as though the toolbar were there. That is his
phone: the small chevron in the corner of his screenshot is the tab that
brings the toolbar back. So the branch never ran.

**The right signal is not how the page was launched.** It is whether the page
reaches the bottom of the glass, and the browser will say so directly: with
`viewport-fit=cover`, `env(safe-area-inset-bottom)` is non-zero *only* when
the page extends into the home indicator's strip. A toolbar in the way and it
is zero. So the inset is the gate now, and it is right in both of the cases
the standalone check got wrong.

**And the backstop finally works.** The wood was on `body`, and came back off
his phone as a flat slab with no grain in it at all — measured, deviation
zero. A body background is propagated to the browser's canvas rather than
painted as an ordinary box, and the tiling and blending do not survive the
trip. It is a fixed element behind everything now, painted like any other box,
so the grain is actually there.

**What I could not verify, and am saying so rather than implying otherwise.**
Chromium has no safe-area insets, so the new gate cannot be exercised here. I
tried to fake them three ways and broke the harness each time — the same
instrument failure as this morning's balance runs and this afternoon's wake
counts, caught before reporting. So this ships as reasoned-and-unverified,
which is a weaker claim than everything else in this file, and `?diag` now
prints every figure side by side so one screenshot from the phone ends the
guessing.

## The clock, the distance, and an action you command — 15 September, night

Seven of Sean's, and they turned out to be three decisions wearing seven
coats.

**The band under the console, settled by giving up on it.** Six passes went
into growing the app to the glass and the last of them — gate on
`env(safe-area-inset-bottom)` rather than on `display-mode: standalone` —
shipped reasoned and unverified because Chromium has no insets to exercise it
with. It did not work either. Sean's call ended it: *"let's just avoid the cut
off at bottom."* So the `screen.height` branch is gone. Every height the app
considers is now one the browser reports for the viewport it is actually
laying out, which can never exceed the glass, which means the console can
never be pushed off the bottom — and the tab labels, which had been clipped by
exactly that, came back.

What is left is the strip itself, and the honest answer is that nothing inside
the page can paint there. Only the canvas can. The fixed wood backstop from
the last pass could never have covered it: a fixed element is laid out against
the same short viewport that leaves the strip over, so it stopped exactly
where the app stopped. Deleted. In its place the bottom of the tab bar fades
out of its own grain into flat `--chrome-2`, which is what the canvas is
painted, so the two sides of the seam are the same colour and the same
flatness. Forced the failure — app 80px short — and measured across it: grain
gone by 8px above the edge, identical colour and zero variance either side.

The band is still there. It no longer reads as a hole, and that was the trade
Sean chose.

**Distance is a distance, and the clock pays for it.** Travel was two numbers,
three days inside a Reach and ten to leave it, which made the chart a diagram:
every island in a Reach equally close, and the far side of the world three
days further than the Sea next door. It is measured now in the galaxy's own
1200 units — a fixed cost to cast off, a day per league, and a toll for
leaving your own Sea.

One trap worth writing down. An island's x and y are relative to its Reach,
because that is how the chart draws a cluster. A distance between two islands
means nothing until each is placed in the world, Reach centre plus island
offset. Getting that wrong would have been quiet rather than loud: two islands
in different Reaches would still come out a plausible distance apart, just the
wrong one.

Measured over every pair on a generated world: inside a Sea 3 to 8 days,
median 5; across Seas 9 to 36, median 21. Against the old 3 and 10 that is
about double for a crossing, and a fleet is slower or quicker than the figure
by its pace, so a first-rate crossing the world is closer to seven weeks and a
sloop closer to three.

Which is why the clock moved with it: **30 / 15 / 5 / 2 seconds a day**, five
times quicker at every setting than the table Sean set this morning. The two
are one decision. Days are cheap now, so a crossing can cost more of them
without costing the player an evening — which is the whole point of making
distance mean anything. Re-measured both ways, since longer travel could
easily have stalled the AI: 8–8 across sixteen games with the seat
alternating, no stalls, median 642 days against 532 on the same seeds before.
The war runs a fifth longer in game-days and a good deal shorter in real ones.

**The war does not stop while you look at it.** Every panel used to hold the
clock — island sheet, crew, Reach, build menu, almanac, the menu itself —
which is most of what a player does, so the war ran only while you were
staring at the chart touching nothing. Sean's rule: a sub-screen is somewhere
you went to look at something, and the world does not stop for that. What
still holds it is what stopped *you*: an action your ships are in, a dispatch
raised over whatever you were doing, and a decision it is waiting on an answer
for. The third is my call rather than his — he said combat and nothing else —
and it is there because an unanswered continue-or-return is the game asking a
question, not a screen you went to. One clause to drop if he disagrees.

**An action is a sheet, not a report.** Sean, on a battle dispatch: *"shouldn't
this be flee or fight?"* Yes.

The first broadside is still fired by the clock — you met them, shots were
exchanged, and declining to be shot at was never on offer — and then the
action is handed over. The clock holds, and every round after the first is the
player's to order: Break off, or Fight on, until it settles.

The design decision worth recording is what the flag *is*. My first pass had
`advanceDay` refuse to advance while an action was open, and it was wrong: it
made the sim depend on somebody being at the wheel, and eleven tests went red
because a headless run stopped dead at the first battle. Now the sim waits for
nobody. If days keep passing, as they do in a test or a balance run, the
action is fought a round a day exactly as it always was and the flag is simply
overwritten each morning. Only a player holding the clock makes it mean
anything — and the balance harness comes back 8–8 with a median of 642 days,
identical to the run before it, which is the proof.

The assessment is the point of the sheet: five bands off the guns still
firing, the wall counted for whoever holds it and the creature counted against
everybody. A player who has to add up two columns to decide whether to run is
being handed arithmetic instead of a decision.

Then Sean, the same evening: *"I need to be able to look at both sides and
what they have."* Each side is a full board now — every class of hull with its
count, what those hulls have left out of what they started with, what they are
worth in guns, heaviest first; and under it the three things that change the
arithmetic without appearing in it: who is handling the fleet and what their
leadership is worth as a percentage, how many companies are aboard and will go
down with the hulls carrying them, and the harbor's guns where they fire. Four
hulls and seventy-two guns against two and sixty is arithmetic. Two sloops and
a brig against two ships of the line is a decision, and they are the same
fact.

The other side can break off too — at twice the guns with somewhere to run,
and never on the first exchange, because that is a decision taken after you
have seen what the other fellow's broadside does. Keeping it out of the
opening also keeps it where the player can watch it happen, since every round
after the first is fought from the sheet.

**One real bug, found by the shape of the feature.** A fleet whose last hull
goes down stays in `state.fleets` until the day's wrecks are cleared, so a
finished action went on looking contested and never settled. `fightingAt` is
`fleetsAt` with the empty ones dropped, and everything that asks "is anyone
still in this" uses it now.

**And the small ones.** Berths carry their figure — free berths, not built
ones, since nobody builds on the ones already taken — set in the track's
thirteenth column, which no island can fill because twelve is the most there
is, so it lands immediately after the last pip rather than at a fixed right
edge where on a small island it read as belonging to the loyalty bar
underneath. Allegiance moved above the island sheet's tabs, slim, on all four
of them: it is the number the rest of the island is read off, and asking for
it used to mean a tab change and a tab change back.

## Companies carry themselves — 15 September, night

*"Cut this ashore / aboard thing."*

He is right, and the reason is worth stating because it is a test the rest of
the interface should pass too: **a control with one sensible answer is a
chore.** Nobody leaves companies standing on a quiet island when the hulls
going somewhere have room, and nobody sails past an island of theirs that could
use the ones aboard. Both ends of that stepper only ever had one answer, so it
was two taps asking a question nobody had.

So it happens by itself, at exactly the two moments it used to be done by hand.
A fleet leaving an island you hold takes what the island can spare — everything
above what it needs to stay quiet, and never the last company off an island
nobody lives on, which is held by that company and nothing else. A fleet
arriving anywhere you hold puts everything ashore. Arriving anywhere else it
keeps them, which is what a landing is made of.

Nothing replaced the control, because the fact was never missing: the fleet's
own line already reads `3 hulls · 17 guns · 3/7 companies`.

The opponent had its own figure for this — everything over two — which was a
private rule, and it is not allowed those. It uses `sparedCompanies` now, the
same one the player's fleets follow.

Balance after: 8–8 across sixteen games with the seat alternating, no stalls,
median 580 days against 642 before. Wars run a little shorter, which is the
expected consequence of companies actually reaching the front instead of
sitting on an island because nobody tapped a plus sign eleven times.

## Splitting a squadron, a Lore tab, and the compass goes west — 15 September, night

**Fleets split.** Sean: *"how do I split fleets? I need a way to create a fleet
from a unit and move ships between fleets."* There was no way, and it was the
one order the fleet layer was missing — a squadron that can only be sailed
whole cannot do two things at once, which is most of what a navy is for.

One function does both halves, because they are the same operation: hulls leave
one fleet and arrive in another lying in the same water, and `into` either
names an existing squadron or is left out for a new one. Two functions would
have drifted apart.

Companies needed less care than they looked like needing. Both fleets are at
the same island, so moving hulls between them cannot change the total room
aboard — only the distribution — so each fleet keeps what it can and the rest
goes across, and nothing can be lost. A source fleet emptied into another is
dissolved, and whoever was serving with it goes across with the hulls rather
than quietly ceasing to exist. Making a "new" squadron out of the whole
squadron is refused: that is a rename, not a split.

In the UI it is a mode the card enters rather than a preference. Grouping and
reordering are settings — how you like your lists — so they live in `prefs`;
this is an order you are halfway through giving, so it lives on the card and
goes away with it. Tap the hulls, then say where they go. The panel sits under
the rows, not over them: you choose, then you decide what to do with what you
chose.

**A Lore tab, far right.** The italic line at the top of the Harbor tab was the
first thing in the way of the thing you opened the panel for. It is a tab of
its own now, last on purpose — it is where you go to know what a place is, not
when you are doing something to it.

The point of doing it properly is that every island has something to say, not
only the eleven the bible names. Three sources, widest to narrowest: the Sea it
lies in, the kind of island it is, then its own line where it has one. The ten
archetype descriptions are new (`src/data/lore.json`) and written so no
sentence in them refers to the war — they are about the place. The creature
comes last and only once your own boats have seen it, on the same rule the
Almanac's bestiary follows.

Ships get the same treatment without the tab: a sheet that is one screen does
not need one, but the lore announces itself the same way — a heading, then
prose meant to be read rather than scanned.

**The compass is south-west.** It sat south-east, which is the cartographer's
habit and the wrong corner here: the south-east is where Coral Reach comes
down, and where the eye is already going when it follows a chain south.

## Combat alone stops the clock, and roles start meaning something — 15 September, night

**One rule for the clock, not a judgement call.** Sean: *"combat is only clock
pause. Unless player pauses."* So the dispatch cards and the pending-decision
hold both go. `clockHeld` is one term now: `state.battle !== undefined`.

That uncovered a bug the hold had been concealing, which is the argument for
simple rules. An errand that reports and is never answered used to freeze the
world the instant it raised its question, so the next cycle never came round.
With the clock running it resolved again every fifteen days and pushed another
decision for the same officer — **measured at 209 of them for one character
over two hundred days.** The fix is the fiction: an officer who has made their
report is standing there waiting for an answer, so their errand is paused until
they get one, and not answering costs you their time. Which is the honest price
of not deciding, and exactly what the frozen clock was hiding.

Fixing that introduced a second one worth recording, because it is the same
shape. A waiting officer can be lifted off the island by their abductors while
they wait — and a pending decision pauses its officer, so it would have paused
a prisoner's captivity along with it and left them in the cells for the rest of
the war. Stale decisions are pruned at the top of every day now.

**`roles` is a rule.** Sean, on whether command ranks should gate anything:
*"Naw. But only certain units can command."* So not a rank system — nobody is
promoted and no other order is gated — but one question asked of one errand,
answered by the thing the world bible already wrote down. Holding an island is
what a Leader or a General is for.

`roles` had been display only since it was written; this is the first rule that
reads it. Two things had to be fixed for it to work at all. The twelve unaligned
had no roles, so nobody you signed on could ever have held anything — they have
them now, and five of the twelve can command, so recruiting can get you a
governor without every stranger being one. And the generator was dropping the
field on the way in for exactly those twelve, which would have made the rule
silently unsatisfiable.

One data correction while in there: Commodore-Elect Hale had no Leader role. She
is elected to lead; the list said otherwise.

Where it leaves the two sides: the Crown 7 of 7, the Confederacy 4 of 7. That
asymmetry is the lore doing its job — the Crown is an institution with
governors, the Confederacy a moot of captains — and it gives each side a reason
its islands stay quiet or rise. Balance unchanged at 8–8 across sixteen games,
median 580 days.

**Still open: recruiting is not gated**, though Sean's phrasing assumed it was.
It is soft-gated by diplomacy and nothing else. Gating it on the Recruiter role
would leave the Crown with one recruiter out of seven against the Confederacy's
four, which is too large a swing to make without his say-so.

## Fixed principals, wandering strangers — 15 September, night

Sean's answer to the variance question: **knowing the cast should be knowledge
worth having.** So it inverts. The fourteen named principals are exactly who
the bible says in every game; the twelve unaligned swing twenty either way.

It had been the other way about, which meant the thing you could look up was
the thing you could not rely on. Hale is the best diplomat in the Seven Seas
now, not in some games; Corvane always out-leads everyone. Learning who is who
is learning something that stays learned, which is what makes a cast a cast
rather than a roll.

The variance moves to where it is interesting. A stranger on a quay is an
unknown quantity by definition and now genuinely is one — measured over forty
worlds, the Widow's best rating runs 71 to 110 and Sable's 73 to 111, against
a flat 92 for Hale and 96 for Corvane. The uncapped top belongs to the
strangers now, which is the better story: the harpooner you signed on in Coral
Reach turns out to be the find of the war. Balance 8–8, median 527 days.

**And a bug found by the other half of what Sean said.** His reason for making
command a mission rather than a rank: *"when I want to move people it's always
annoying that generals or admirals are always in the way."* So I checked
whether a posted officer is in the way here, and found the opposite problem — a
posting survived its holder walking down the quay and sailing off on another
errand. The island went on counting a commander three Reaches away, and went on
being harder to infiltrate for it. Not friction: a free lunch, which is worse.

Now the posting ends because they have gone. There is nothing to undo first,
which is exactly the property Sean was after: you move the person, and the rank
does not argue with you.

## Four a side, five for the Confederacy — 15 September, night

Sean: cut the starting crew to four for the Crown and five for the Confederacy,
its three Lords and two others.

It had been the whole roster, seven a side, which made the opening cast the
same cast every game and left recruiting with nothing to be *for*. The two
changes of the night work together: the principals' ratings are fixed now, so
the variety cannot come from *what* Hale is worth — it comes from *whether you
have her*, and from the strangers, whose ratings swing twenty either way.

The three Lords are never drawn out. They are the Confederacy's losing
condition and three of its hulls at once, so a war missing one is a different
game rather than a varied one. Measured over sixty worlds: all three present in
100%, everyone else between 42% and 75%, and neither side ever short of an
officer who can hold a place — the Crown's four all can, the Confederacy's
three Lords all can.

Balance 8–8 across sixteen games, median 649 days.

**One consequence worth a decision.** The Lord Regent turns up in 45% of wars.
He is the Crown's head of state and the best leader in the game, and a Crown
without him is a strange Crown — the Confederacy has three characters it cannot
lose and the Crown has none. Pinning Corvane the way the Lords are pinned would
make it one fixed and three drawn. Not done: Sean asked for four, and which
four is his call.

Five tests moved rather than deleted. They had assumed a seven-strong roster or
the presence of a particular person — "the first officer of the Crown is the
Regent", "Torvik's people is Urskin" — and each now asks the bible where the
war no longer answers.

## Personnel are personnel: the Pirate Lords retooled — 15 September, night

Sean, after a day of the Lords feeling clunky:

> Maybe I'm just making things too complicated. Maybe personnel should be
> personnel, fleet should be fleets. And we don't overthink it. […] So we make
> them personnel, and then in the lore we talk about their pirate ships and
> things like that […] and then we can give them an ability like, for example,
> while they command, you know, such and such happens. […] but to the degree
> that they have a pirate ship, it's a lore pirate ship, not a physical game
> piece.

He is right, and the measurements from the afternoon say exactly why. A Lord
was a person and a hull at the same time: idle they were a ship in the water,
on an errand they were an officer on a quay, and their ship could not sail
without them. Over sixteen measured wars that design produced:

- **0 points of allegiance** from the Moot. The *Free Harbor* never moved,
  because she was also the Confederacy's seat and no opponent would commit her,
  and she sat on an island already at a hundred.
- **1% of days** with a Lord off their ship. The one thing that made them
  people almost never happened.
- **0 abductions in 16 games**, though somebody was liftable somewhere on 95%
  of days — because a Lord could not be lifted at all, and the opponent had no
  term for abduction in its scoring.
- **26 ship strikes → 8 Crown wins out of 8.** Every Crown victory was three
  hulls sunk. Not a manhunt; a naval accounting exercise.

And every file in `sim/` carried a special case for them, because a thing that
is two things at once is a thing no rule can reason about.

### What they are now

People. Three of them, in the cast like anybody else, each carrying one thing
nobody else in the war can do — Rebellion's habit of hiding a real rule inside
a piece of character, which is where Sean started (Han Solo and the Falcon):

- **Reyne** — *the passage.* Any errand he leads makes the crossing in half the
  time. The one power that is not a posting, because it is about the man
  travelling, and the only way a ship that is not on the water can still be
  felt. `passageShare()`.
- **Hale** — *the Moot.* While she holds a Command posting, that island comes
  round a point a day. It works on Crown ground too, which was forbidden before
  and was the wrong call: the one power the Confederacy can *aim* had nothing
  to aim at.
- **Jessup** — *the line.* While he holds a posting, every fleet in that harbor
  fights under the Admiral's command, whoever is on the deck.

Two of the three hang off Command, which is already a mission and already asks
who may take it. So a power costs an officer indefinitely, is placed somewhere
on purpose, and can be seen and gone after by the other side. That is the whole
design: the powers are *positions*, not passives.

The ships stay in `ships.json` as **legends** — `legend: true`, no numbers, no
`power` field. Nothing builds them, nothing sails them, nothing fights them.
They are named in the Lords' bios and printed under the bio on the character
sheet, which is where they belong and where they now read better than they ever
did as three stat blocks nobody could see without tapping a hull.

### The rule that had to change

`abductOn` refused an island the enemy held. With Lords made personnel, that
closed the Crown's only route to victory: the three of them stand on
Confederate ground. Measured with the rule as it was — **Crown 0, Confederacy
8, 8 wars unfinished at 3,000 days, and not one Lord ever taken.**

So: their harbor is worth going into for one of three people and nobody else.
An ordinary officer caught off their own ground is still a chance you take;
sailing into their anchorage to lift a clerk is not a war aim — and if it were,
abduction would outrank inciting on every enemy island in the game and the
chart would have one answer everywhere. The raid is priced rather than free:
work on enemy soil already carries the higher foil chance, so this is how
officers get hurt.

### And the opponent had to be taught all of it

Three hard-coded rules went:

- `aiMission` filtered Lords out of its officer pool outright (`&& !isLord(c)`).
  Honest about the old design; the reason the powers measured zero.
- It had no abduction term at all. Now scored, with a bounty on a Lord.
- It never took a Command posting of any kind: over eight wars and 2,620 days,
  **commanders held a chair on zero island-days.** `aiPostLords` seats the two
  seated powers where each is worth most — the Moot on the nearest-to-flipping
  island that is not already theirs and never one the enemy holds; the Admiral
  in the harbor with the most of its own hulls. Reyne is never seated: his
  power is spent by sending him, which the errand pass does on its own.

Officers holding a posting are now skipped by the errand pass, or it would have
walked every commander it appointed straight back out of the room.

### Measured after

| | before the retool | after |
|---|---|---|
| Crown — Confederacy | 8 — 8 | **8 — 8** |
| Wars unfinished at 3,000 days | 0 | **0** |
| Lords ever in irons, per war | — | **1.5 mean; 3 in every Crown win** |
| Lord-posted island-days / 8 wars | 0 | **3,553** (Moot 1,120, line 2,433) |
| Reyne travelling, days / 8 wars | 0 | **214** |

Every Crown win is now a manhunt that ends with all three in irons, and they
run long — 356 to 2,145 days against the Confederacy's 288 to 360. That
asymmetry is the theme: the Confederacy races for Highwater, the Crown grinds
out a hunt. Worth watching rather than fixing.

340 tests green.

### Smaller things that fell out of it

- `startMission` clamped every passage to a minimum of one day, to stop Reyne's
  halving reaching nought. It also broke taking a posting in the room you are
  standing in — the `days === 0` branch could never fire. Nought is now an
  explicit exception.
- The chart's star followed the three hulls. It follows the three people, which
  is what it was pointing at all along.
- The Confederacy's `hqLabel` was "the Free Harbor". It is "the meeting place".
- `unique` on a ship class became `legend`, because the field's meaning changed
  from "one of a kind" to "never on the water".
- The Almanac gained a **What the three Lords do** section. The powers used to
  live on three ship sheets, where a Crown player never saw them and a
  Confederate player only saw them by tapping a hull.

## The island in "On Freeport" goes to the chart — 15 September, night

Sean: *"On personnel where it says 'On [location]' can you make the location
clickable?"*

It does now, in all three shapes the line takes — *On Freeport*, *On the Home
Fleet, at Freeport*, *In irons at Highwater*. Only the island is the link; the
fleet's name beside it stays plain, because a squadron is not a place on the
chart.

A "Show Freeport on the chart" link used to sit under the painting doing exactly
this. It is gone, because keeping it would leave two controls a thumb's width
apart saying the same thing, and the worse of the two was the one that had to
name the island a second time to explain itself. The words that already say
where somebody is are the right thing to tap.

`.linkish` grows its hit area with 14px of padding and a matching negative
margin. In a sheet header that reach would put the target over the officer's
name above it, so `.linkish--inline` trims it to 8px — still a thumb at this
size, and no further.

## The running report — 15 September, night

Sean:

> Next thing we need to add is a report on the bottom underneath the utility
> bar, or above, wherever there's open space. We need a running place where
> messages post. So anytime somebody's posted the log, there's an alert that
> pops up on the screen while you're playing. And then you can click on it to
> open the log to that entry.

Half the log had no presence on the screen at all, and it was the half the
player set in motion themselves.

The loud half always had one: an island changing hands, a rising, an action, the
war ending — `isNotable` — stops the player with a full dispatch card. The quiet
half is orders finishing, officers reporting, and things taken from you. It went
in silently, and the only way to learn any of it was to stop playing and go and
read. Which is the gap: you queue a mill, and then nothing ever tells you it is
built.

So the division is the existing one, and nothing is told twice: **notable news
gets a card, everything else gets a line in the strip.** The strip is the
complement of the dispatch card, not a second copy of it.

**Where it sits.** Under the utility bar, over whatever is below it. The slot it
hangs from has no height, so the bar's own height — two rows, a notch, a home
indicator — decides where the strip lands rather than a number in the
stylesheet, and the chart never moves to deliver the news. `pointer-events` are
off on the strip and on only for the lines, so the chart stays draggable in the
gaps between them.

**A report waits for you.** The obvious build starts a five-second timer the
moment a line posts. Then a dispatch card held open for a minute, or a long look
at an island, expires every report behind it — news that was never read, thrown
away silently. So a line ages only while it is actually on the screen: the sweep
that ages them runs only while the strip is up, and the ages live in a ref
rather than in state, because they move four times a second and nothing changes
until one reaches the end. Measured: a line caught the instant it posted survived
a twelve-second island sheet, and the two that posted behind that sheet came up
with it.

**What it defers to.** An action, a dispatch card, and any panel the player
opened. A sheet is anchored to the bottom and runs to 82% of the screen, which
stops just about where the strip hangs — so a report would sit on a sheet's top
edge, and tapping one would take you to the log *behind* the sheet. `panelOpen`
in `App` is one derived boolean rather than a z-index fight, and because lines
wait rather than expire, deferring costs nothing.

**And the tap.** It opens the Log scrolled to that entry, marked with a brass
rule. Scrolled to and marked rather than filtered to, because what you usually
want next is what happened *around* it. The mark belongs to one visit and is
dropped on the way out, so the log is a log again when you come back.

Three on screen at once, five seconds each. The cap applies to what is waiting
as well as what is up: a card read at leisure could have a hundred quiet days
behind it, and the answer to that is the three most recent, not a hundred lines
to sit through.

## Playing it three hundred times — 15 September, night

Sean: *"I want you to take a few hours and run tons of gameplay tests. Play full
games. Tell me what you get."*

So: a harness in `lab/` that plays whole wars headless, audits the state every
day against everything that must be true of it, counts what every rule actually
did, and prints a list of anything that never happened at all. Then about three
hundred games through it, both seats, with and without a scripted player at the
wheel.

The invariant auditor found six real bugs on its first run. All six are fixed.

### The bugs

**One officer crewing thirty-seven squadrons.** `boardError` asked whether
somebody was already aboard *this* fleet — the same mistake as asking whether a
chair is empty rather than whether the person is sitting somewhere. The
opponent's signing-on pass runs once per fleet, so its best captain ended up
serving with every hull it owned and his Leadership was counted in all of them.
Now serving with one squadron refuses the next.

**A navy of confetti.** A new hull joins the fleet already at the island —
unless that fleet is at sea when the yard finishes, and then it is a squadron of
one. Nothing put them back together. Measured over one war the Crown finished
with forty-four hulls in thirty-seven squadrons, most of them a single sloop:
nothing that could fight anything or carry a landing. `aiConsolidate` is now the
opponent's habit. Deliberately not a rule of the world — splitting a squadron is
an order the player gives on purpose, and a world that merged them back every
morning would be undoing it.

**Ghost fleets still sailing.** A creature takes a fleet in open water after the
day's fighting is over. A squadron it emptied went on sailing to a destination
it could not reach, voyage counting down, nothing left to arrive — and visible
to the player as a fleet inbound. One per war. `clearWrecks` is now one rule
called at the end of the fighting, at the end of the day, and at the end of any
round the player fights by hand.

**A posting three Reaches from its holder.** Three different ways to leave an
island without giving up command of it: boarding a ship, being carried off a
quay, and — closed earlier — taking an errand. A Lord abducted off Freeport
still "held" Freeport from inside Highwater's cells for four hundred days, and
the island went on being harder to infiltrate for it.

**Home on enemy ground.** The Confederacy's home was chosen first thing in the
morning; islands fall in the evening. `restoreLord` reads it to decide where an
exchanged Lord is put ashore — which could be a harbor the Crown had taken that
afternoon, handing them straight back. Home is worked out at the point of use
now, and re-derived at the end of the day rather than the start.

**A crash.** `aiPostLords` — written earlier the same night — asked for a
Command posting on a neutral island. Command is only ever offered on ground you
hold, so `startMission` threw, which in a running game is a white screen rather
than a bad decision. It checks what the island actually offers now.

### The one that would have cost a game

The Crown's capital can be emptied by its own Home Fleet weighing anchor.

Companies load themselves when a fleet sails (Sean cut the control for it, so
nobody chooses this), and how many an island can spare was read off
`requiredGarrison`. That ladder answers *how many companies stop this island
rising*, and a firmly loyal island correctly answers **none**. It was being
asked a different question: *how many may sail away*.

Highwater at ninety-seven per cent loyal therefore let its whole garrison go.
Measured: the capital sat at a garrison of nought for twenty-three days with
nothing in the log about it, one Confederate squadron with four companies aboard
walked in on day thirty-five, and the war was over on day thirty-six.

Two floors now. A seat whose fall ends the war is never stripped at all, and the
last company never leaves any island you hold — an empty harbor is taken by
whoever turns up with one company, however much its people like you.

### Research was dead, and now is not

`craft` measured exactly **zero** at the end of every game, on both sides. The
opponent's candidate islands are neutral ones, enemy ones, and its own in
trouble; research lives on its own islands doing *well*, which is none of those,
so the whole mechanic was unreachable for it. It now scores its own yards at 55
— under an island, over inciting — and researches in about three wars in five.

### What the numbers say now

Three hundred games, invariants clean across every day of every one.

| | player idle | with a pilot |
|---|---|---|
| Crown — Confederacy | 29 — 30 (1 unfinished) | 23 — 30 (7 unfinished) |
| median length | 348 days | 252 days |
| Crown wins | median 955 days | median 1,149 |
| Confederacy wins | median 264 days | median 48 |

Balance between the two AIs is even. The rest is in the report to Sean: what
never happens, and why the Crown's capital is worth talking about.

## The land gets a say: bombardment, sieges and repair — 15 September, night

Sean's design, settled over a long conversation and then built. The shape of it
is one rule:

> **A seawall shuts the landing, and only weight of shot opens it.**

That makes bombardment *necessary* rather than merely strong, which is the fix
to the thing he disliked about Rebellion: *"the optimal play is to bombard until
they have zero troops remaining and then go take the place, so garrisons fighting
garrisons almost never happens."* Here the guns are the only door, and the door
does not open far enough to walk through — past the walls you still have to land
against their companies.

### The four phases, and why each is the price of the next

1. **Their fleet.** Forts are irrelevant; you meet in open water.
2. **The blockade.** Already built — an enemy squadron in the harbor zeroes the
   island's income.
3. **The walls.** A day at a time, as standing orders rather than a button
   pressed every morning. The battery fires back the whole time, and its gunnery
   falls with its condition, so the first day of a siege is the expensive one.
4. **The landing.** Troops against troops, which is `resolveLanding` as it was.

A defending squadron, however poor, is therefore worth keeping in the harbor:
while it floats, nothing is being bombarded.

### Past the walls, and what it costs

One target list and no picker — Sean cut deliberate civilian targeting and he is
right, both because he has never once found it worth doing in twenty years of
Rebellion and because a target menu on a phone is a menu in the middle of a
decision. Shot goes at the walls while any stand. Only when none do can it reach
the garrison, and shot that goes looking for companies in a town finds the town:
the island's regard falls hard, every other island in the same Reach hears of
it, and each further day costs more than the last, to a ceiling.

So the decision at the door is simply *have I brought enough companies*. If yes,
land — free. If no, break them with the guns and pay for it across the Reach.
Which is exactly the case Sean described: *"maybe they have just a ton of troops
and you're going to go, screw it, I'm going to bombard like crazy."*

### Weight of shot, and why a fleet needs both kinds of ship

`bombard` is a second gunnery number on every hull, on a much steeper curve than
`guns`: 1 / 5 / 14 / 0 against 8 / 17 / 30 / 0. A first-rate is under twice a
frigate in a fleet action and fourteen times a sloop against stone. Heaving shot
onto a battery is a different job from hitting something that moves.

The counter to a sloop swarm is arithmetic rather than a rule. Six sloops make
six a day against a wall that patches over one, need a fortnight, and spend it
under twenty guns. They do not survive it.

### Control, and who holds an island

Sean: *"a garrison establishes control whatever the island thinks of you, and
loyalty decides it only when there is no garrison."* Most of that was already
true — a held island never flipped on opinion alone. The gap was an island held
by nobody at all, which stayed yours because a map said so. Now a populated
island of yours with no companies ashore declares for whoever its people prefer.

### What mends overnight

Nothing at sea: a squadron carries what was done to it until it stops fighting.
At anchor a hull comes back a hundredth of itself a day, twice that at an island
of yours with a working yard. Forts patch at twice the base rate and do it under
blockade — men with shovels work under fire and shipwrights do not — which is
also what makes abandoning a half-finished siege worthless, because the wall
comes back while nobody is working it.

Damage is fractional now, because one per cent of a nine-hull sloop is nine
hundredths of a point. Rounded wherever it is shown and never in the arithmetic.

**A wall beaten to nothing is rubble, and rubble does not mend.** This was the
one real bug in the first build: a fort at full damage was patched a stone
overnight, which put it back under its own strength and therefore back on the
list of walls standing. Measured: every siege in eight games ground the walls to
two per cent and stuck there for ever, bombarding and rebuilding in the same
breath, and not one siege ever finished.

### Highwater opens behind its own seawalls

The world bible always said the seawalls were older than the Imperium; the map
never agreed. Measured before this: the Crown's capital opened with two companies
and no wall in all forty worlds generated, never built one in twelve wars, and
sat under three companies on three quarters of all days. A played Crown that
moved its Home Fleet — the most natural first move in the game — lost on day
forty-eight to one squadron with three companies aboard.

It opens with a wall and six companies now. Two walls was tried first and was
too much: the Crown went 9–3 with eight wars in twenty never finishing at all.

### Taking the island

Enough companies go ashore to hold it quiet and the rest stay aboard, so a
squadron that takes an island can go on to the next one instead of ending its
campaign there. A landing that only just carried the place has not brought
enough to sit on it, and the island says so at once.

### Measured

Three hundred-odd games, invariants clean every day of every one.

| | before the siege rules | after |
|---|---|---|
| Crown — Confederacy (idle) | 14 — 14 | **19 — 20** (of 40) |
| with a player at the wheel | 14 — 13 | **12 — 12** |
| median war | 348 days | **710** |
| Confederacy's fastest win | 48 days | **324** |
| sieges | — | 7.7 days a war, in half of all wars |
| towns shelled | — | 10.3 island-days a war, in half of all wars |

The Confederate rush is gone: it cannot take Highwater in seven weeks any more
because it has to bring a siege train and spend days under the guns. Both sides'
wars now run to a similar length, which they never did before — the war has a
middle.

357 tests, including fifteen on the siege alone and one that drives a whole
siege end to end through the orders a player actually gives.
