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
does mean Coralhome and the great dockyards at Graving Bay are bare rock in most
games — the same bargain Rime and Salt already make with their own named
islands. Three names from the bible's Coral list joined it, **The Shoals**,
**Hawksbill Bay** and **Denby Cay**, and `scripts/chart_positions.py` placed all
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

## Three reasons a won war would not end — 15 September, night

A hundred and fifty fresh games under the siege rules. Balance was even —
Crown 60, Confederacy 60 — and **thirty of them never finished at all**, up
from one in forty before the walls went up. Every one of the stalls was the
same shape: one side had already won and could not close it out.

**A treasury is not a ledger.** The opponent weighed every order against its
daily surplus so a war of conquest could not bankrupt it, which is right, and
took no account of savings at all. So a side could hold a hundred and
seventy-two thousand gold, a thin daily surplus, and build *nothing*. Measured
in one stalled war: the Confederacy held forty-one islands of sixty-three, the
Crown had no navy left at all, and the war ran three thousand days because the
Confederacy could not afford the two first-rates it needed to open one seawall.
Upkeep is paid out of the bank and nothing breaks until the bank is empty, so a
deficit a treasury can carry for a year is not worth refusing an order over: the
surplus now counts the bank spread over four hundred days.

**Berths are no use with nothing to put ashore behind.** The lift test chases
the capital's garrison, and the Crown grows that garrison all war — so the
Confederacy could sit permanently "short of lift" and build nothing but
transports. Measured: eleven hulls, a hundred and sixty-five thousand gold, and
a bombard total of **zero**, because every hull was a brig. While it cannot
break the walls of the one island it has to take, what it builds now is a ship
of the line.

**And the strike fleet could not besiege.** The squadron meant for Highwater is
the one `aiFleet` skips — it is handed whole to `aiStrikeCapital` — so the siege
had to be opened there or nowhere, and it was nowhere. Measured: a fourteen-hull
squadron with fifty-six weight of shot and thirty-eight companies aboard lay off
Highwater for two thousand days while one seawall stood, because the only thing
it knew how to do was land, and landing was shut.

### After

| | before | after |
|---|---|---|
| idle, 60 games | 28 — 24, **8 unfinished** | 28 — 30, **2 unfinished** |
| piloted, 50 games | 19 — 19, **12 unfinished** | 22 — 27, **1 unfinished** |
| median war | 804 days | 541 |
| gold banked at the end | 172,000 in a stalled war | 24,000 |

Invariants clean across every day of all hundred and fifty. Research, which
measured exactly zero a few hours ago, now runs 17 a game in every game.

## Two walls at Highwater, and one on the great island's other port — 15 September, night

Sean:

> Highwater should probably start with 2 defensive structures. And maybe even
> the other port on the big island should have 1. This makes the game so that
> Imperium can use their fleet rather than keeping it docked to protect the
> island.

Which is the point of a wall, and the thing an earlier tuning pass missed by
optimising a win rate instead of asking what the rule was for. Two walls *was*
tried a few hours ago and scored 9–3 to the Crown with eight wars in twenty
never ending, so it was cut to one — and that reading was contaminated. At the
time the opponent could not mount a siege at all: it built nothing but
transports, banked six figures it would not spend, and the one squadron meant
for Highwater had no idea how to open fire. With those three fixed, the walls
can be what they are for.

**The starting walls are not on anybody's books.** Three new batteries at two
upkeep apiece took the Crown from five a day clear to a shilling in the red on
day one. The bible has always said Highwater's seawalls are older than the
Crown that shelters behind them, which makes them part of the city rather than
a work somebody is paying to keep — and charging the Crown a standing tax for
the one thing that lets its fleet leave harbor would undo the reason they are
there. A wall you *build* costs what a wall costs.

### Measured, 110 games

| | one wall | two walls + the second port |
|---|---|---|
| idle, 60 games | 28 — 30, 2 unfinished | **28 — 28**, 4 unfinished |
| piloted, 50 games | 22 — 27, 1 unfinished | 20 — 21, 9 unfinished |

Two walls moved a slight Confederate tilt to dead even, which is the better
balance as well as the better rule.

And the thing Sean actually asked for, over twenty wars and thirteen thousand
days: **the Crown's navy is away from Highwater on 61% of days.** The capital
stays walled on 99% of them and is held on all but the day it falls — and it
still falls in eight wars in twenty, so a fortress is not a wall the war breaks
against. The fleet can go and do its job.

### What is left

Nine of fifty piloted wars ran past three thousand days, and every one of them
is an *even* war — C19/F24, C24/F21 — rather than one side unable to finish a
war it had won, which is what the stalls were this afternoon. Two are the one
structural thing left to decide: the Crown can hold forty islands of sixty-three
and still have none of the three Lords in irons, because they are exchanged
after sixty days faster than it can gather all three. That is the Mothma-and-Luke
condition working as designed, and whether it should ever time out is Sean's
call rather than a bug.

## Six things off Sean's list — 15 September, late

> 1. The outer rim unexplored islands should be explored most games… Since all
> you have to do is move one ship carrying one garrison to the location and move
> the garrison into the island and boom. Now you have a free location you didn't
> have to attack.
> 2. Over time fleeing will be more and more useless if we get timing correct…
> A strong superior fleet can stop retreat.
> 3. Build it… Sea combat has nothing to do with fortress defenses. One is ship
> vs ship another is ship vs island.
> 4. Have him start all games.
> 5. Housekeeping: sure do this.
> 6. I need you to make a file on optimal game play for the AI. Teaches strategy
> learned over time and updates as it learns. And AIs can read this for future
> games. This will also help with when we establish difficulties. More advanced
> AIs can use more advanced tactics.

### 1. The frontier is free capital, and the opponent could not see it

An island nobody lives on has `control: 'none'`, and every list the opponent
built of places worth going asked for `neutral`, `enemy`, or `mine and in
trouble`. A third of the world matched none of them. Measured before: **23
islands started dark and all 23 ended dark, in every war.**

Surveying is now a target, scored against the ledger — comfortable it charts
because land is land, squeezed it will cross half the world — and `aiSettle`
sails a squadron at the best empty island and puts a company on the beach,
counting what it will pick up on the way out rather than what it happens to be
carrying now. **22.5 islands dark → 4.1; 5.0 colonies and twenty-five plots of
new ground a war.**

### 2. A superior fleet stops a retreat

`PURSUIT_ODDS = 4`: breaking off is refused when their guns are four times yours
*and* they have a hull at least as fast as your fastest. Both halves matter — a
heavy squadron of the line cannot catch sloops, and that is the sloops' whole
job.

### 3. The triangle

Frigates take sloops, sloops take ships of the line, ships of the line take
frigates. Three knobs, all in `constants.ts`: `HULL_EASE` (a big target is
easier to hit), `GUNNERY_ON_SMALL` (a frigate's guns are handy against a small
hull, a first-rate's are not), and `GUN_DECKS` — which was the fix that made it
work at all. Every hull used to fire **one shot a round** whatever it carried,
so a first-rate spent thirty damage killing a nine-hull sloop and any swarm beat
anything. A first-rate now fires three broadsides of ten.

Measured by the purse, even gold a side: **two frigates beat four sloops 89-42,
four sloops beat a first-rate 134-5, two first-rates beat three frigates 76-38**,
and a balanced 1-large-2-medium loses narrowly to seven sloops at 62-72. Sean is
right that this is a separate system from the walls; nothing here touches a
fort, and a wall is still the only thing that makes a ship of the line necessary.

### 4. The Lord Regent

`CROWN_PRINCIPAL` is bound in `openingCast` beside the three Lords. Present in
60 of 60 worlds.

### 5. Housekeeping

`deploy.yml` triggers on `claude/**` as well as `main`.

### 6. The doctrine file

`src/data/doctrine.json` is sixteen named articles, each with a tier, a rule,
a reason, and the measurement that earned it. `src/sim/doctrine.ts` is the only
thing between that file and the opponent, and `ai.ts` now asks
`follows(state, 'hunt-the-principals')` rather than simply doing it. Eight
articles are switchable that way, which buys three things at once:

- the tactics are prose somebody can argue with, in one place;
- a difficulty is one word — `state.doctrine.tier` — and absent means the whole
  book, so every save written before this keeps the opponent it had;
- **every article can be measured**, because the harness can withhold exactly
  one and play the same wars twice.

`lab/doctrine.ts` does that and writes what it finds back into the file as
`measured`, which is the "updates as it learns" half. It also checks the file
against the code: a `follows()` call with no article behind it, or an article
nothing asks about, is reported. Sixteen wars an arm, ten arms:

| withheld | what changed |
|---|---|
| seat-your-principals | 813 island-days with a principal in a chair → **0** |
| research-your-own-yards | 25.7 mentions of craft a war → **0** |
| expand-when-the-bill-grows | 5.0 colonies a war → 3.3 |
| balanced-fleet | ends 3.5/3.0/13.3/12.0 by kind → 1.5/1.6/13.9/11.3 |
| commit-to-the-siege | 48 days a war with the guns on the walls → 26 |
| spend-the-bank | **nothing measurable** — 16,615 gold and 33.8 hulls against 17,909 and 37.8 |

That last row is the point of writing the numbers down: `spend-the-bank` earned
its place when the opponent was banking 172,000 gold in a war it would not
finish, and with the other stalls fixed it no longer pays. It stays, measured
and honest, rather than being quietly believed.

**The tier sweep found a design bug immediately.** Hunting people is a ruthless
article and taking the three Lords is the Crown's *only* victory condition, so a
plain or sharp Crown was literally unable to win: **none of sixteen wars, nine of
them running three thousand days and stopping.** A gentler opponent is one that
passes up cheap prizes, not one with its win condition removed — so a Lord is
always worth hunting and the article now governs ordinary officers. Plain: Crown
8 / Confederacy 7. Withholding the article also turned out to do nothing at all
at first, because an errand takes its kind from the island and an island with
somebody standing on it answers "abduct" before anything else; the opponent was
still lifting seven people a war by turning up somewhere else and finding them
there. It now asks the island for its next-best errand instead.

### Two bugs the campaigns found

**Home could sit on enemy ground for a day.** `syncHome` runs last thing at
night, which is right for everything the world does on its own and wrong for an
order given at noon: a player taking the island the Confederacy called home left
home on Crown ground until morning, and a Lord exchanged in between was landed
inside the enemy's harbor. `orderAssault` now re-syncs. Two day-hits in thirty
games before, clean after.

**The scripted pilot was feeding the navy in one hull at a time.** Over twelve
hundred days a piloted Confederacy built forty-six first-rates, had **none**
afloat at the end, put a squadron off enemy ground four times in the whole war
and never once opened a wall. It now merges squadrons lying in the same harbor
(the thing the opponent does in `aiConsolidate`, and a player does without
thinking) and will not sail a single hull at an island somebody is holding.

### Where it stands, 60 fresh wars

| | idle player, 30 | pilot at the wheel, 30 |
|---|---|---|
| | Crown 15 — Confederacy 12, 3 unfinished | Crown 19 — Confederacy 10, 1 unfinished |
| median war | 708 days | 980 |
| invariants | clean every day | clean every day |

367 tests, 26 files, green.

### What is honestly still wrong

**The pilot cannot play the Confederacy.** Split by seat it wins 5 of 15 as the
Crown and 1 of 15 as the Confederacy. That is not the game being lopsided — the
idle arm is 15–12 — it is that the Crown's route to victory is an errand chain
the pilot runs well, and the Confederacy's is a naval campaign against two
seawalls that it never assembles. Until the pilot can mount a siege, the piloted
arm measures the Crown seat and should be read that way.

**And the three unfinished idle wars are all the same war**: the Confederacy
holding fifty islands and standing off Highwater with fourteen weight of shot.
The siege train is the hardest thing in the game to put together, which is
probably correct for a capital with two seawalls, but it is the thing to watch.

## Yards that work together, and an encyclopedia — 16 September

Sean, on the economy and the build panel:

> The construction yard situation is odd… Only one thing can be produced by a
> construction yard, a shipyard or a troop training facility at a time. If you
> have multiples on the same island they work together and increase the speed
> proportionally — if something were to take 60 days at a construction yard then
> three of them would complete the task in 20 days. And that will also change in
> the middle of the task… on any given island it is possible to have three things
> being built maximum. And needs a progress bar… how many days to completion (not
> including travel time) and how many days to deploy (including travel time) and
> where it's scheduled to deploy to.

### A job is works-days now, not days

The order used to carry `daysRemaining`, one number with the crossing folded
into it, decremented once a day by the one building that held it. Three things
were wrong with that and all three were Sean's point:

1. **Three yards were three separate builders.** An island with three could
   raise three buildings at once, each at one-yard pace. Now the island raises
   one, at three-yard pace — the same total throughput, a completely different
   decision.
2. **The clock was written down at the order.** A `work`/`workLeft` pair in
   works-days is divided by *today's* crew, so a yard finished this morning
   shortens a job begun last month, and a yard lost to a landing slows one. Days
   to go is a question, not a promise. Sean's own example is a test:
   `a yard finished mid-task shortens what is left from that morning`.
3. **Build and passage were one number.** They are separate fields now, and the
   panel says both: **2d to build · 9d to deploy · bound for Highwater**.

One works of a kind holds the order and the rest are its crew, which keeps the
data where it was and makes `crewOn` the only new concept. `planBuild` now picks
the **quickest** island rather than the nearest — four slipways a fortnight away
have a first-rate in the water before one slipway next door, and the old rule
sent the order next door every time.

The bar runs from ordered to arrived with a notch where the building stops and
the sailing starts, because a hull three days off the stocks with a fortnight's
passage ahead of it is not nearly delivered.

**Knock-on:** the *Idle yards* filter counted empty buildings. One job to an
island means the moment any yard takes an order they are all on it, so it
answers per island now — and the numeral became more useful rather than less:
three means a job here takes a third the days.

Saves go to **v7**. A v6 order counts down a field that no longer exists, so its
yards would sit at work forever.

### The encyclopedia

> Add to the utility panel an encyclopedia that has info and stats on all
> units… personnel, garrisons, buildings (including defensive structures),
> ships, islands. So a player can pause the game if they want and research.

The Almanac had most of the prose and was reachable only through the gear menu —
where you go to quit, not to look something up mid-war. It is six tabs now, with
a book on the utility rail beside the clock:

| | what was missing |
|---|---|
| **Crew** | what the four ratings actually do; the full roster with its numbers, not seven names and a bio |
| **Companies** | what a garrison is *for*, in four parts: holding, quieting, watching the back door, and being the landing party |
| **Buildings** | how a thing gets built at all — the new yard rule — and standing defences, which had no page anywhere |
| **Ships** | **everything.** The hulls were four lines under the battle rules; cost, upkeep, lift, broadsides and weight against a wall were nowhere |
| **Islands** | what an island is, settled vs empty vs dark, and the seven Reaches |
| **Rules** | the glossary, the sea action, the bestiary, how the war is won |

Every figure is read out of the same constants the simulation runs on, so the
page cannot quietly go out of date.

### Measured

Ten new tests pin the yard rule, Sean's mid-task example among them. 377 green.

| 60 fresh wars | idle, 30 | pilot at the wheel, 30 |
|---|---|---|
| before | Crown 15 — Confederacy 12, 3 unfinished | 19 — 10, 1 unfinished |
| after | Crown 14 — Confederacy 11, 5 unfinished | 19 — 10, 1 unfinished |
| invariants | clean every day | clean every day |

Balance-neutral, which is what it should be: the rule changes the granularity of
building, not the rate. The two extra unfinished idle wars are the same siege-train
problem already on the board — the Confederacy holding fifty islands and standing
off Highwater with fourteen weight of shot.

## Prompts for every works and every company, and a gold mark — 16 September

> Give me art prompts for all facilities and garrisons. Instead of "costs x gold
> a day" say "Upkeep: 3g/day". And let's use gold symbol.

### One sheet for the art

`docs/art-units.md` — twenty-four prompts: seven works painted twice, once per
side, and ten companies. Written against the same style line and the same
delivery rules as the island batch, so the whole set matches.

Two things the sheet fixes as well as gathering:

- **Fort and Boom have never been painted**, and the prompts that existed for
  them asked for the wrong shape — 3:2 landscape, where the five installed
  facility paintings are wide banner strips at 768×204. A fort delivered to the
  old prompt would not sit in the same row as a shipyard. The old section is
  marked superseded rather than deleted; its scene descriptions were good and
  are carried over.
- **The company prompts lived in `troops.md` and now live here**, with that page
  pointing at this one. Two copies of a prompt is two things to keep in step,
  and the design page should be about the design.

The two-sides-per-works split is the point of doing each one twice: a Crown yard
is cut stone, squared off and kept up at expense; a Confederate one is the same
job done out of salvage by people not waiting for permission. That has to live
in the *materials and the order of things*, because it is being read at 96
pixels wide.

### The gold mark

`Coin` and `GoldFig` in `components.tsx`. "Costs 3 gold a day" was eight words
doing the work of one figure, and it sat under every building on every panel.
It is `Upkeep: 3◉/day` now, green for money coming in and brass for money going
out, as one unbreakable inline run so a figure never wraps halfway through.

The coin is drawn rather than a glyph — no font has one that matches the brass
on the console — and it is two rings and nothing else, because the 'S' on the
big coin in the banner turns to mud under 12px and this is read at 10.

Applied everywhere a sum appears: the encyclopedia's buildings, companies and
hulls; the island sheet's works cards and its smuggling line; the build flow's
price, upkeep and confirm button; the ship sheet; the Reach summary. Two
facility blurbs lost their "Costs gold to keep." — the figure beside them says
it, and the sentence was saying it twice.

377 tests green.

## The building art was already there — 16 September

> I think you have the art already, it's just not applied to all instances of
> buildings.

Right, and worth writing down because it is the kind of thing that hides. Ten
facility paintings have been in `src/art/islands/` since the first art batch —
five works, both sides — and they were being drawn in exactly **two** places:
the works card at the bottom of the Buildings tab, and the unit card in the
build flow. Everywhere else a works appeared, the game drew a line glyph at it.

The worst of those was **the slot board**, which is the thing a player actually
looks at to see what stands on an island. Seven tiles of drawn icons, with the
paintings sitting on disk and appearing only if you scrolled past them.

- `Slot` takes an optional `art` now: a painting run full width across the top
  of the tile, name under it, in place of the centred 34px glyph. `icon` stays
  the fallback, so a works with no painting still gets its glyph and the two
  sorts of tile sit in the same grid.
- The encyclopedia's Buildings page shows the painting too, at the width the
  works card uses.
- `facilityPainting()` is exported so a caller can ask *whether* there is one
  before choosing a layout, rather than `FacilityThumb` silently falling back
  and leaving the container the wrong shape.

**Fort and Boom are the genuine gap**, and the sweep confirms it: no file for
them anywhere — not in `src/art`, not in `art-masters`, not in the slices. They
are the two prompts in `art-units.md` that have never been run.

Checked the same class of bug elsewhere while in there. Every remaining glyph is
a glyph on purpose: the 22px build buttons, the build menu's category icons, the
16px marks on event cards, and the contact sheet, which exists to review the
glyphs. Ships and portraits are painted wherever there is room for a painting.

## What is in the ground — 16 September

> All islands should have raw resources on them. Forests, gold. I think these
> should be randomly assigned to each island and Lumber Mills and Gold Mines can
> only be deployed on them. They replace the raw resource. Because it doesn't
> make sense that you can just put gold mines anywhere and print money.

Sean's rulings on the two questions that decide the shape of it: **forests
common, gold rare**, and **the frontier rolls at the same odds as anywhere** —
an empty island is not leftovers.

### The rule

Every island rolls its ground once, at worldgen, and it never changes. Forests
three to six, gold on about one island in four and then only one or two veins.
A light nudge by what the island looks like, so a jungle island has trees and an
ice floe does not — still a roll, taken within the island's character.

**A deposit stands in a berth**, and the works that works it takes *that* berth.
So a mill on a forest costs no room, an island's total built never exceeds its
plots, and a full island can still cut its own timber. What it cannot do is
invent ground it does not have. One plot is always kept clear, which is exactly
enough: a yard in it can then work every deposit on the island.

The two earners are named for their ground now — **Gold Mine** and **Lumber
Mill** — and a vein is worth three mills a day at twice the price. A deposit
comes back when whatever was working it comes down: burn a mill and the trees
are still standing, so a long war does not grind the world to bare rock.

### Four measurements, and what each one changed

The whole job was arithmetic against the old economy. Baseline first, then four
passes:

| | day 1 | day 200 | day 600 | day 1200 |
|---|---|---|---|---|
| **before the rule** | 63 | 105 | 216 | 290 |
| first cut | 126 | 131 | 160 | 153 |
| ground opened up | 71 | 114 | 139 | 125 |
| builders sent | 71 | 155 | **354** | 381 |
| **shipped** | 61 | 115 | 242 | 319 |

1. **The opening was twice as rich.** Fifteen starting mines at a gold mine's
   yield is 126 a day on day one against the old 63 — a side that opens rich
   never has to make any of the decisions the economy is about. Two veins apiece
   now, and timber for the rest.
2. **The ground ran out by day 200.** Two clear berths was one too many: the cap
   was biting on 37% of islands and the opponent had worked everything it had
   before the war was properly started. One clear berth, and forests three to
   six.
3. **Then the opponent sat on eleven thousand gold with two forests an island
   still standing** — and that was the real find. `bestSpotFor` only ever looked
   for a works on the island it was building *for*, which is fine when any berth
   will do and useless when the value is in the ground: most islands it had
   taken had no yard of their own, and it never thought to ship anybody.
   `planBuild` already picks the quickest works in the faction and counts the
   passage. Income went 139 → 354 on that one change.
4. Yields trimmed to land the curve back on the old one.

### A bug the campaigns caught

**An island of six berths finished a war with seven buildings on it.** Room was
checked when an order was placed and, for orders sent overseas, when it landed —
but never for an order made at home. Avermere changed hands with a Crown yard
already at work; the new holder's yard filled the last plot, and the old order
landed on top of it. Checked at completion now, wherever it was ordered from.

### Where it stands

| 60 wars | idle, 30 | pilot at the wheel, 30 |
|---|---|---|
| before the rule | Crown 14 — Confederacy 11, 5 unfinished | 19 — 10, 1 unfinished |
| after | **Crown 14 — Confederacy 15, 1 unfinished** | 11 — 12, 7 unfinished |
| invariants | clean every day | clean every day |

388 tests. Saves go to **v8**: a v7 save has no ground in it, and every island
on it would be barren forever.

The idle arm is the best it has been — dead even, one unfinished war in thirty.
The piloted arm is more balanced and much more stalled, and the stalls are all
the *same known thing* rather than anything resources did: six of the seven are
a side holding thirty or forty islands with two of the three Lords in irons and
no way to hold all three at once inside the sixty-day exchange window. Wars are
longer now, so that window closes more often. **That is the open question from
two days ago and it is now the main reason a war does not end** — worth a ruling.

## Settled ground, felling timber, and nothing running out — 16 September

> The difference between settled and unsettled will be settled islands will
> have resources already converted. Some, not necessarily all.
>
> Oh also forests can be cleared to make room for other facilities, not just
> mills. But if cleared it's destroyed.
>
> Resources never run out in the game.

### Settled islands open part-worked

A settled island now opens with thirty to seventy per cent of its ground
already turned into mills and mines — rolled per island, always at least one,
never all of it. Measured: a neutral island averages **2.0 worked and 2.1 still
raw**, and not one of them opens bare. An empty island averages **3.9 raw
deposits and nothing worked at all**.

That is a good difference. An empty island is cheap ground with all its worth
in front of you; a settled one is a going concern you take for what is standing
on it.

### Which forced a change nobody had noticed was missing

**Facilities never changed hands with the island.** Take an island and its
mills stayed the enemy's — earning nobody anything, on ground already spent.
Nothing in the game did this and it went unnoticed while an island's worth was
*berths*: you took the place and built your own works on what was left.

With resources it is fatal. A captured island's mills stand on forests that
have already been cut, so the works earn nothing, the ground is gone, and the
island is barren for ever. So an island hands over everything standing on it —
which is what the defences have always done, since a seawall fires for whoever
holds the island and never for whoever paid for it. Anything still *being*
built is lost with the old holder; the builders scatter when the boats come in.

### Felling timber

The one order in the game that takes something out of the world for good. A
forest can be cleared to open its plot for anything — not only a mill — and
nothing grows it back. Gold cannot be cleared: it is in the rock, so an island
with a vein and no room is a problem rather than a decision.

Destructive and not undoable, so the panel asks first, and the opponent will
only fell where there are more than two stands standing.

### Resources never run out

Already true and now pinned by a test: a worked deposit earns the same on day
two thousand as on day one, and a deposit comes back when whatever was working
it comes down. The only thing that removes ground permanently is clearing it on
purpose.

### Measured

Economy still on the old curve: **62 / 92 / 232 / 252** against the old
63 / 105 / 216 / 290 at days 1, 200, 600 and 1200. 396 tests.

| 30 wars | idle | pilot at the wheel |
|---|---|---|
| | Crown 14 — Confederacy 15, **1 unfinished** | 14 — 5, 11 unfinished |
| invariants | clean every day | clean every day |

**The piloted arm needs saying plainly.** The pilot's economy collapsed under
the resource rule — it ordered everything from a works standing on the island it
was building for, so over thirty wars it raised **four gold mines and eleven
mills in total** and spent the whole treasury on hulls. Exactly the blindness
the opponent had. Fixed the same way, with `planBuild`: 108 mines and 1,007
mills.

And with both economies working, the piloted arm stalls *more*, not less —
eleven wars in thirty. Every one of them is an **even** war with nought to two
of the three Lords in irons. That is not the economy: the idle arm finishes
twenty-nine of thirty on the same rules. **It is the sixty-day exchange window**,
now the single largest thing standing between this game and a war that ends,
and the one open question waiting on a ruling.

### The ground, painted — 16 September

Sean delivered the two resource paintings. Installed as `islands/resource-gold`
and `islands/resource-forest`, in the same 768×204 banner every facility uses —
a deposit and the mill that replaces it sit in the same row on the same board,
so they have to be the same shape. Both came 4:3, cropped to a deliberate
horizontal band rather than the centre: the gold at y=250 to catch the seam
running across the face, the timber at y=420 for trunks over understory.

They show on the island's Buildings tab as their own tiles, dimmed and marked
*unworked*, and in the encyclopedia beside the rule. The drawn glyphs stay as
the fallback.

## Bigger art, the encyclopedia in the console, and observe mode — 16 September

Sean asked for unit art to stop being small. The boards went from three columns
to two, works and ground and companies and crew from 30px glyphs to 64-68px
paintings, hulls in the fleet list from 84 to 112. Tapping a unit with nothing
else to do opens the encyclopedia at that entry; a unit that already does
something keeps that and takes a corner mark. A new `useLookUp` context carries
it, because the panels are four deep inside a sheet and the encyclopedia is held
at the top.

The encyclopedia moved out of the top rail and onto the console between Build
and Log, and the rail gained an eye: **observe mode**, which hands the player's
side to the opponent's brain and makes a game of player-against-machine into
machine-against-machine. `runAI` takes a side now and `advanceDay` runs it
twice. The lock lives in the one `run()` wrapper every order passes through, so
it cannot be got round by a screen somebody forgot to disable, and `setSpeed`
is deliberately not a `run` command — you keep the clock and lose everything
else.

Buildings stopped being reorderable and are always grouped, in one fixed order.

## Coral is the Confederacy's, and the canon documents arrive — 16 September

Sean: *"Coral should be a confederacy only thing."* It was on both sides — the
Crown's hulls were grown over with it for warding, the Sovereign was warded with
it, the Tidewrought were brass-and-coral, Crane's collar grew it. That made the
Confederacy's one piece of real strangeness into something both navies did.

The Crown coppers instead: milled plate bolted on below the waterline, bright as
a new coin and green as a drowned church a year later. Carpentry, not warding —
the warding is disciplined Tidecraft, which is what the canon says. Crane's
collar bloom became verdigris and kept its image.

Then four source documents arrived and became `docs/canon/`: the project README,
the Art Direction Guide v2.2, the Naval Art Master, the Faction Sigils sheet, and
the one-sheet board. The lore was brought into line with all of them — both
creeds went to their full five clauses, both palettes and both sigils are written
down, the supernatural got its own palette, and a new section carries the north
star, the 70/20/10 mix and the three readability tests. 149 art prompts had a
stale style clause and 43 had the old creeds; both swept.

## The Heavy Fortress, and the fleet goes to twenty-one hulls — 16 September

Two fort paintings, and Sean's ruling: Fortress and Heavy Fortress, the second a
tier you build rather than an upgrade you apply. 250 gold, 45 guns, 150 of wall,
on the one plot a Fortress would have taken — slightly the worse buy per gun and
per day, more than twice the harbour per **plot**, which is the scarce thing. The
siege rules stopped asking `type === 'fort'` and started asking `isWall`,
`wallGuns`, `wallStrength`.

Then the Naval Art Master's roster: eight hulls became twenty-one. Four a side
from the first morning and three grades of shipwright craft opening the rest —
the craft ladder already existed and had nothing to unlock. The Crown improves
families it trusts and ends very high; the Confederacy has no II programme by
rule, so it opens broader and answers with different ships. Measured over 24
wars: twelve wins each, zero unfinished, better than the eight hulls managed.

**Two bugs of the same shape, in one day.** A convenient default hid each one.
The build menu kept a fourth hand-written copy of the facility list, so the
Heavy Fortress existed, the opponent built them, they stood on islands and
fired, and the player could not order one. Then `buildMenu` gained a `grade`
argument defaulting to "nothing researched" and two call sites forgot it — the
opponent's own hull-laying loop among them — so it picked the dearest hull its
grade allowed, checked it against a menu pretending it had researched nothing,
and skipped every shipyard it owned: 78,000 gold, seven slipways, grade three,
not one hull in the water. Both fixes were the same: stop the default existing,
let the compiler name every caller.

## The Boom goes, and a prisoner stays a prisoner — 16 September

The Boom was cut. Twelve full wars, zero standing on zero islands: the opponent
had no rule that wanted one and a player had no reason to buy one next to a
Fortress that stops a landing outright. 24 wars before and after came out
byte-identical.

Then Sean asked the question that mattered: *"Why would anyone be released
without a rescue mission?"* Nobody hands back the leader of the rebellion
because two months have passed. The sixty-day counter is gone; captivity now
ends only when somebody comes. That could not ship alone — the opponent had no
rescue behaviour at all — so it learned to go and get its people, a Lord scored
above taking one of theirs. Measured: out again in a median of 58 days, 70 for a
Lord, but varying 27 to 148, costing an officer and a voyage, able to fail, and
**impossible for a Confederacy down to its last islands** — which was exactly
the case that used to leave the Crown holding sixty-three islands and unable to
finish.

"Exchange" is retired as a word throughout. Nothing was ever exchanged.

## A stormed island gives up its people — 16 September

Sean's rule, and the last piece: taking an island takes everyone standing on it,
errands included. Not the ones at sea. And storming an island frees your own out
of its cells.

Which means taking every island takes every Lord, and the Crown's victory
condition stopped being a manhunt it could never close. No second victory
condition was needed after all; the existing one simply became reachable.

Every hull carries companies now, at Sean's word — a sloop carried nobody and
could not put one person on an empty beach.

**And the finding that matters.** Observe mode was built as a toy and
immediately earned itself: played by the machine on *both* sides, the Crown
loses **21-0** with three unfinished. Every player-idle campaign all day read
12-12 and hid it completely, because an idle side loses differently from a
played one. That is the deepest balance problem in the game and it is where the
tuning starts.

## The overnight tuning run — 16/17 September

Sean: *"Run gameplay sims and tune all dimensions of game. Fix bugs. Run game
after game. All night."* This is what that found, in the order it found it.

**Crown 0 — Confederacy 24 was one line of code, not a balance problem.** An
officer who finishes a spell ashore is asked what to do next, and the question
goes to the player when it is the player's side. Observe mode has no player, so
every Crown officer who landed anywhere was handed a question nobody answered
and stood on that quay for the rest of the war. An officer on ground that is not
theirs can be lifted off it by anyone who turns up, and forty were, against four
of the Confederacy's. Ninety per cent of the corps ended in irons. Half a day
went into measuring roster sizes, abduction odds, gaol locations and doctrine
gates before the trace showed four Crown officers landing on day 10 and never
reporting again. The same hand-off hid a second one: an action at sea arrives as
a battle sheet, which stops the clock until somebody answers it.

*The lesson worth keeping: when a measurement is extreme — 0 of 24, 91% — look
for a broken mechanism before tuning a number. Balance problems are gradients.*

**Then the tuning proper, each change measured over 24 to 40 wars on at least
two seed blocks:**

- *Hunting is a detail, not the corps.* Three Lords stand on Confederate ground
  and never leave the target list, so the Crown put a third of its officers on
  them and one twenty-fifth on the yards. Two hunters at a time; rescue is not
  counted against the cap.
- *The island first, then the hand.* The errand pass took the best diplomat and
  let them pick — so the officer least suited to a raid was the one sent on it,
  with both the snatch and the getting out again priced off espionage. The
  island is picked first now and the hand second, on the rating the errand is
  settled by.
- *The first officer at the yards outranks anything on the chart.* Craft is the
  only thing that pays for the whole rest of the war and it loses every ranking
  it is in. The Crown finished every block at craft 1.0-1.5 against 2.1-2.9.
- *One slipway per four islands, one drill ground per six.* Both were flat caps
  — three and two for a whole faction — which are not budgets but ceilings on
  the navy and the army. Sides finished with thirteen thousand gold in the vault
  and nothing to spend it on.
- *A squadron with an empty hold musters before it sails.* It loaded what the
  island under it could spare and then sailed at the enemy whether or not it had
  loaded anything.
- *Nowhere left to stand.* Seed 11021, day 2,301: the Crown held all sixty-three
  islands and the Confederacy still had two Lords at large, walking from one
  Crown island to the next stirring up revolts while a fourth officer cut the
  third out of the cells as fast as the Crown could put him back. A side holding
  no island has nowhere to put anybody; everyone still at large is taken where
  they stand. This is Sean's *"capturing all islands means you captured all
  lords"* finally being true.
- *A siege is news to the island being besieged.* The bombardment lines only
  fired for your own guns, so a player whose capital was being battered down was
  told nothing until the last battery fell.

**Rejected, with the measurement, so nobody tries them twice:** two boats after
the same mark (14-19 becomes 7-23); always walling the seat of government first
(costs the Crown five wins in forty, turning them into stalemates — the beaten
walls at every Confederate victory are the siege's work, not a failure to
build); a squadron that answers a siege on its own island (8-16 becomes 3-21 —
a navy that answers every siege never takes anything).

**Where it stands.** One hundred and twelve wars over five seed blocks, both
sides played: **Crown 50 — Confederacy 56, six unfinished.** Every rule the
audit checks held on every day of every war. With a scripted player at the wheel
and the harness's own coin fixed — `mixed` had been answering "come home" to 270
reports of 282, because the draw overflowed a double — twelve wars run Crown 4 —
Confederacy 5.

Verified in the browser: observe mode runs a war at a steady half-day a second
with no modal ever blocking the clock and nothing in the console.

---

## Espionage, and the darkness it is the answer to

*Sean, 18 September, asking what the gap was and then sending the memo that
closed it: "espionage is primarily an intelligence mission... a successful
mission can reveal enemy characters, ground troops, facilities, fleets, ships in
orbit, enemy missions currently being conducted, units currently travelling
toward the system."*

The gap was not the unused painting on the errand sheet. It was that knowledge
in this game was one bit. `system.explored[faction]` went from nothing to
everything — companies, commander, works, harbor, and since the watch went in,
the exact number every covert errand has to beat — live, free, and for ever.
There was no way to *want* a report, so the Espionage rating on a crew card was
a number that opened doors and never asked a question of its own.

**What it is now.** A tenth errand, `espionage`, on the covert list, so it rolls
the watch at the door like everything else and is settled on Espionage once
inside — the one errand where Sean's cheat sheet answers "Espionage" to both
questions. On success it files an `Intel`: the island carried whole, stamped
with the day, plus their people ashore, their errands aimed at it, what lay in
the harbor and what was at sea for it. A report is a photograph and never a
feed; it does not update and the sheet says how old it is.

**What it made dark.** `sightOf` answers three ways, and only on ground the
enemy holds: `eyes` where you hold it or have a hull in its water or somebody
ashore, `report` where you were told, `none` where neither. At `none` the island
sheet is a name, a flag and a line saying to go and look; the Reach list draws
dashes where it used to count companies. Neutral ground stays open once charted
— that is where parley happens, and darkening the unaligned world is a second
and much larger change wearing this one's clothes.

**The counter-intelligence half**, which is the memo's best trick and cost a bug
to find: *"you can conduct espionage on your own planets... if the Empire has
sent agents to one of your planets, an espionage mission can potentially
identify those enemy missions."* Abduction and sabotage have always worked on
anybody standing ashore — a Confederate agent inciting one of your islands has
been standing there, liftable, for a fortnight. Nothing ever said so. The first
cut filed that report and never showed it, because your own island is always
`eyes` and the sheet asked one question where there were two: *is there a
report* and *should the screen be reading it*.

**The bonus island**, with the memo's restriction and the memo's reason: never
their seat and never an island with a Lord on it. The original would not hand
you the hidden Rebel Base as a side effect of a lucky roll somewhere else. A
bonus may tell you where the guns are; it may not tell you where the war is.

**The opponent plays under the same fog.** Doctrine article
`look-before-you-land`: it prices covert work off `knownWatch` — its own
reports, its own eyes, or `ASSUMED_WATCH` where it has neither — and sends a spy
to a dark island before it sends anybody to work on one. Sean's chain arrives on
its own: look, then soften, then raid. Measured across four wars, ten espionage
errands sent and seventeen reports still held at the end, which is the right
size — a report costs a fortnight of an officer's life.

**Measured, matched seeds, eighty wars both sides played:**

|            | seeds 9000-9039 | seeds 9040-9079 | total |
|------------|-----------------|-----------------|-------|
| before     | Crown 19 — 19   | Crown 19 — 20   | **38 — 39** |
| with fog   | Crown 19 — 18   | Crown 17 — 21   | **36 — 39** |

Two wars in eighty, inside the noise. The machine plays as well half-blind as it
did omniscient, which is the result worth having: the fog costs the opponent
nothing and takes away a thing it should never have had.

Four new invariants in the auditor, because all three ways a report can go wrong
are quiet: one about an island that no longer exists, one dated after today, one
filed under a different island than it describes, one written by nobody.

**Noticed while measuring, not caused by this.** Across four machine-played
wars, neither side incited or sabotaged once — abduction outranks both on every
enemy island, and with the Lords as personnel it always will. That was true
before this change too (same probe on the old code: also zero). It is the next
thing worth looking at.

---

## The opening navy: two squadrons for the Crown, one for the Brethren

*Sean, 18 September: "Imperium should start with a powerful fleet on Highwater
and a medium fleet on another inner reach. Confederacy fleet is its Freeport
only and it's medium sized. Should rival the medium fleet from imperium."*

Built as asked. The Crown opens with the **Home Fleet** at Highwater — a ship
of the line, three heavy frigates, a scout and a transport, eighty-nine guns —
and the **Windward Squadron** at a Crown holding out in a contested Reach,
drawn afresh every war: two heavy frigates, a scout and a transport, forty-two
guns. The Confederacy's own Home Fleet lies at Freeport and nowhere else: four
sloops, a bulk cruiser and a transport, forty-nine guns. The two mediums are a
fair fight; the Home Fleet is not one. What the shape actually buys is that the
Crown has to be in two seas at once and the Confederacy does not.

**What it cost to keep the Crown solvent.** A second squadron is thirteen gold
a day more in upkeep, against an opening ledger with about five a day in it and
a hundred and fifty in the bank. Dropped in on its own, Sean's opening put the
Crown at minus eight a day — broke on day nineteen, before the player had done
anything wrong. A vein and five more mills puts it back where it was and no
further: plus three to plus eight a day against the plus five it averaged
before.

**That is not the balance dial and it is worth saying so.** Three mills either
way — a whole point of surplus a day — moved forty measured wars by exactly
one: Crown 23-14 at twenty-four mills, Crown 23-13 at twenty-three. What moved
the war was the second squadron.

**Measured, matched seeds, eighty wars both sides played:**

|                    | seeds 9000-9039 | seeds 9040-9079 | total |
|--------------------|-----------------|-----------------|-------|
| one squadron each  | Crown 19 — 18   | Crown 17 — 21   | **36 — 39** (48%) |
| Sean's opening     | Crown 23 — 13   | Crown 24 — 15   | **47 — 28** (63%) |

**So the opening shape is worth about fifteen points to the Crown**, and the
war it produces is a shorter one: the median fell from around nine hundred days
to around seven hundred and seventy, the Crown finishes with twice the
Confederacy's islands rather than a third more, and the Lords in irons at the
end went from 1.4 of three to 1.8. A second squadron means the Home Fleet can
go hunting without leaving the Crown's own water open, which is exactly the
thing the old opening would not let it do — and hunting Lords is how the Crown
wins.

That is the honest number and the shape is Sean's call, so it ships as asked
rather than being quietly trimmed back. Two dials if he wants it nearer even,
neither of which touches what he specified:

- **The Windward's weight.** It is at forty-two guns to rival the Confederacy's
  forty-nine. Dropping a frigate takes it to twenty-five — still a squadron,
  no longer a rival, and the Confederacy's one fleet becomes the best medium
  on the water.
- **The Confederacy's side of the ledger.** It opens on twenty-odd gold a day
  to the Crown's five, which is a standing advantage it has never spent well;
  the machine sits on three to five thousand gold at the end of every war. That
  is an opponent problem rather than an opening problem, and fixing it would
  give the Confederacy back more than a hull would.

## An island decides rather than fills a bar — 17 September

Sean's memo of the seventeenth, in one sentence of his own: the system should
feel like *"my character is attempting to influence a population"* and not like
*"my character is filling an allegiance progress bar."* Both halves of the old
design were certain — a parley added `8 + Diplomacy/10` every fortnight without
fail, and an unaligned island joined the day the bar touched eighty — so the
only question a player ever had was how many fortnights, and it was arithmetic
done once, in advance.

**What replaced it** lives in `src/sim/politics.ts` and turns on four terms.

- **Pull** — what the boat's people are worth at this kind of persuasion, the
  best hand whole and the rest at three quarters, a half and a quarter. Sean's
  rule: *"allow multiple characters to participate... however, apply
  diminishing returns."* Four of the best diplomat in the world are worth two
  and a half of him, so the opportunity cost is real — one excellent envoy
  working four islands, or four of them on the island that decides the war.
  A specialist's bonus goes to whoever is actually doing the talking, which is
  the best hand aboard and not whoever the order was written for.
- **Resist** — what the island already thinks, against you.
- **Political security** — companies ashore and the officer in the chair.
  Sean: *"troops do not make people love the government. They make it harder
  for political opposition to act."* So security appears **nowhere** in a
  parley and everywhere in an incitement and in whether an island dares rise.
- **Momentum** — what has lately been happening there, built by success,
  capped, and forgotten at four tenths of a point a day if nobody keeps it up.

A fortnight ashore is a roll against those, and a landed one is worth a
variable amount rather than a fixed one — Sean's weak/normal/strong/exceptional
as a continuum, read off how far the roll beat the odds. Only after a landed
parley is the island asked whether it will declare, at a chance that climbs
with its warmth and reaches two in three at a hundred, never certainty.
`resolveControlAndUnrest` lost its auto-flip loop entirely; the one flag
arithmetic still moves is the physical rule that an empty harbor belongs to
whoever wants it.

**Mutiny lost its trigger** the same way. It was three conditions ANDed — under
thirty, short of companies, no officer — so an island either rose that morning
or never could. Sean: *"treat thirty as a major warning threshold... actual
Mutiny should be determined by the combination of allegiance, garrison, officer
presence, and Incite pressure."* It is now a small daily chance, rolled once a
day in `advanceDay` and nowhere else, so a revolt is a morning's news rather
than something re-rolled six times a day because six things touched the island.

### What the player is told, and what they are not

Sean is explicit: *"do NOT tell the player 'this Parley has a 73.2% chance of
success'."* A parley or an incitement on the errand sheet reads **Very
difficult** through **Very favorable**, with the terms behind it drawn as
pluses and minuses — *Your envoy ++, What the island already thinks +,
Recent standing here +++* — and the figure never leaves the rules. Covert work
keeps its two percentages, because getting past a watch is a different kind of
question and the player is buying a specific risk there.

### The treadmill the first pass walked into

`PARLEY_SWING_MIN/MAX` opened at 2–10. That looks reasonable and is not, once
it is read against `SUPPORT_DRIFT`: an island nobody holds settles back toward
fifty at a quarter-point a day, which is three and a half points a fortnight,
and a mean swing of six landed about half the time wins three. A parley was
losing ground. Modelled over four thousand courtings, only **forty per cent**
ever carried the island inside the opponent's patience; measured over six wars,
the two sides left thirty-seven unaligned islands on the chart and sent **no
agitator and no explorer anywhere at all**, because there was always another
neutral island to fail at. At 4–18 a trained envoy carries a cold island in
four fortnights nine times in ten, an ordinary officer in five and six times in
ten, and a poor one fails outright as often as not.

### The flat premium that was a veto

The opponent scored an unaligned island at a flat `AI_COURT_BONUS` of 170 and
an enemy-held one at a fraction of that. The comment in `ai.ts` claimed this
was *"a premium and not a veto"*; measured, it was a veto. Both are now the
premium multiplied by how likely the errand is to come off, so a hostile harbor
nobody can talk round stops outranking a weakly-held one that would rise if
somebody leaned on it — and `inciteStanding` puts political security into that
price, which is the first time companies ashore have deterred the opponent from
walking officers into a garrisoned island for months.

**Measured, six wars, both sides played, errands started:**

|                     | before | after |
|---------------------|--------|-------|
| Parley              | 172    | 157   |
| Stirring up trouble | 4      | **77** |
| Sabotage            | 0      | **35** |
| Explore             | 31     | 38    |
| Espionage           | 17     | 37    |
| Rescue              | 53     | 112   |

Sabotage had never once been sent in the project's history.

**Measured, matched seeds, forty wars both sides played:**

|                          | before | after |
|--------------------------|--------|-------|
| result                   | Crown 36 — 4 | Crown 29 — 5 |
| never ended              | 0      | 6     |
| median length            | 513 days | 588 days |
| Confederacy's islands    | 3.6    | **7.7** |
| Crown's islands          | 32.0   | 23.1  |

The Confederacy is materially healthier and the Crown's share of decided wars
falls from 90% to 85%, which is the right direction and nowhere near far
enough. Two costs come with it, both honest: wars are about seventy days
longer, and **six in forty now run to the cap without ending** where none did
before — the Confederacy survives well enough that the Crown cannot get all
three Lords in irons at once, and rescues more than doubled. That is a
decisiveness problem the balance decision Sean already owes a steer on should
probably be taken together with, rather than something to paper over here.

## News travels: local, regional, global — 17 September

Sean's propagation memo, and its first two sections are a description of what
the code was already doing wrong. *"Do not make every allegiance change affect
the region."* *"Do NOT simply add the same allegiance value to every island."*
`applySupportChange` did both: a flat fifth of **every** allegiance change
spilled onto **every** island in the Reach, equally, always. One fortnight's
parley moved nine islands, and moved the far end of a chain exactly as much as
the harbor next door.

### The three scopes

**LOCAL** is nearly everything, and is now genuinely local. A landed parley, a
failed one, a backfire, an incitement, a commander taking a chair, the daily
drift — all of them move one island and nothing else. `applyLocalSupport` is
the new call and most of the game uses it.

**REGIONAL** is raised by name, at named moments, and is the only thing that
reaches past the island. Ten triggers:

| event | who it favours | Sean's § |
|---|---|---|
| an unaligned island declares | whoever it joined | 3 |
| an empty harbor changes hands | the taker | 3 |
| an island rises in mutiny | whoever is *not* holding it | 3 |
| a landing on people who wanted you | the attacker | 12 |
| a landing on people who did not | **against** the attacker | 11 |
| the walls come down, town untouched | the attacker | 14 |
| an action won by a clear margin | the victor, scaled by guns sunk | 15 |
| a Pirate Lord taken | the taker | 16 |
| a Pirate Lord broken out | the rescuer | 16 |
| shelling a town over its people | **against** the attacker, and globally | 13 |

**GLOBAL** is one event: shot that goes past the walls looking for the garrison.
A large local loss, a moderate regional one, and a very faint one everywhere
else, because *"people across the region hear about the destruction"* — not
because every island changes sides.

### How far it carries

Four things scale every regional effect, and the point of all four is that no
two islands feel the same thing.

- **Falloff.** `REGIONAL_FALLOFF` is `[1, 0.7, 0.45, 0.3, 0.18, 0.1]`, nearest
  first, then nothing. Read against a regional figure of 3 that is Sean's own
  worked example — target +10, adjacent +3, second +2, distant +1, remote +0.5.
- **Jitter.** ±40% per island, so a cascade is never a calculation.
- **Connectivity.** Each Reach rolls one, 0.45 to 1.45, once at worldgen and
  never again — §9's *"distinct political personalities"*. It is drawn from a
  **stream of its own**: taking seven draws out of the worldgen RNG mid-layout
  moved every island, deposit and garrison after them, and a world is a thing
  players share by its number.
- **Cascade damping.** `[1, 0.6, 0.3, 0]`, and the zero is deliberate —
  "negligible" that is not actually zero is a chain that runs for ever at a
  hundredth of a point. An island the news has lately reached remembers it
  (`System.shaken`), so when *it* declares or rises, its own shock goes out one
  step deeper and much quieter. The chain is emergent: nothing decides an
  island will fall, only how loudly it is heard from when it does.

### What the player sees

No figure, ever (§19). The feed carries the news — *"Word of the rising on
Cald is running through the Kettle Reach"* — and the loyalty dots move. §20's
propagation animation is a ring that opens out of the Reach and fades, drawn
under everything and taking no pointer events, for the two or three days a
shock is fresh; it holds still for anyone who has asked their system for
reduced motion.

### What the measurements said

**Six wars, both sides played, six hundred days each — shocks actually raised:**

| | raised |
|---|---|
| peaceful conversion | 15 |
| conquest (landing on unwilling people) | 23 |
| a Lord taken | 6 |
| a Lord broken out | 3 |
| major fleet action | 3 |
| liberation, defection, mutiny, bombardment | **0** |

Four of the five zeroes are not propagation faults — the underlying event never
happens. Over the same six wars there were **no mutinies at all**, no empty
harbor ever changed hands, three siege-days in total and no wall ever beaten
down. The wiring for each is proven directly in `propagate.test.ts` instead.

**And the mutiny zero is the finding worth acting on.** Held islands sit at a
mean allegiance of 67.5 with 3.1 companies ashore, so `mutinyChance` reads
`max(0, 45 − 67.5) − 18.6` and is **0.00% a day on every island, every day**.
The only route to a revolt is an agitator driving allegiance twenty-odd points
below where drift settles it *and* beating the garrison's political security,
and the opponent almost never sends one. `AI_AGITATION_PATIENCE` now gives an
incitement the eight cycles a courting parley gets, for the same arithmetic
reason — but it did not move the number, because the opponent's scoring rarely
picks the errand in the first place. So the end of Sean's own chain —
*"espionage to discover defenses, sabotage to weaken them, incite uprising to
destabilise, then diplomacy"* — is still not reachable in machine play, and
`MUTINY_WATCH` against `SECURITY_PER_COMPANY` is where it would be fixed.

**Measured, matched seeds, 24 wars both sides played, before and after:**

|  | before | after |
|---|---|---|
| result | Crown 18 — 5 | Crown 14 — 7 |
| Crown's share of decided wars | 78% | **67%** |
| never ended | 1 | 3 |
| median length | 489 days | 732 days |
| Confederacy's islands | 9.5 | 10.8 |
| Confederacy's gold at the end | 414 | 10,807 |

The balance is the best it has been all session and the cost is legible: with
the flat spill gone, allegiance moves roughly a fifth as fast across a chain,
so wars run about half as long again and three in twenty-four reach the cap.
The Confederacy has also gone back to hoarding — ten thousand gold it is not
spending, which is an opponent-economy problem rather than a political one and
was briefly fixed earlier today by nothing more than longer wars not being in
the sample.

## Three outcomes, three screens — 17 September

Sean's combat outcome specification, and the instruction on top of it: *"LOSS
and DRAW must have their own presentation logic, not simply be the same screen
with the word changed."*

### A draw had to be invented before it could be presented

The game had four endings — won, lost, they-fled, beast-slain — and no third
state. `verdictOf` folds the five ways an action can end into Sean's three:
`won`, `they-fled` and `beast-slain` are a **victory**; `lost` is a **defeat**;
and breaking off is a **draw**, because you were not destroyed and they were
not driven off, so who owns that water is unresolved. What breaking off *did* —
that you hauled off and they are still there — is a fact, and facts go in the
consequences, which is §13's whole point.

Bombardments and assaults needed their own third states, and both fell out of
rules that were already there.

- A bombardment either **silences the harbor** (objective achieved), **knocks
  stones about without silencing it** (inconclusive — §7: *"do not call this a
  victory simply because something was destroyed"*), or **achieves nothing at
  all** (failed, which is §6's explicit *"the player should not receive a
  generic Defeat screen when the operation simply failed"*).
- An assault that is thrown back **with companies still in the hold** is
  inconclusive — §10's *"both forces remain capable of continuing operations"* —
  and one thrown back with nothing left aboard is a defeat. The rule was
  already in `resolveLanding`; what is new is that the screen tells them apart.

### The three screens do not share an order

This is the part that is not a re-tint.

- **Victory** reads down §2's layout: your force, their force, who came
  through, what it settled, what moved politically.
- **Defeat** leads with the player's losses, because *"they are the most
  important consequence"*, and the loss is drawn as one large figure rather
  than one of four in a row. Anybody taken off the strategic map is boxed out
  of the list entirely — a name in a row of names reads as a footnote and
  losing an officer is not a footnote.
- **Draw** leads with *"no decisive control established"*, boxed, **above any
  tally at all**. A screen that opens with two columns of losses invites the
  player to total them and award somebody the win, which is the one reading a
  draw exists to refuse. Its headline is also the quietest of the three: a loud
  DRAW reads as a result, and a draw is the absence of one.

### Facts and consequences, reported apart

§13 asks for a victory that can carry heavy losses and a political backlash,
and a defeat that can leave the enemy wrecked and the Reach pleased. `tensionOf`
is that: one line, and only when the word and the contents actually disagree —
*"Won, and it cost more than it was worth"*, *"Beaten off, and they will be a
long time making good what it cost them"*. When they agree it says nothing,
because a sheet that always editorialises is a sheet nobody reads.

The political section prints island by island and only what moved, which is why
`applyShock` now hands back a `Ripple[]` rather than a list of systems: the
screen shows what actually changed rather than what the constants say it should
have. §8's sentence gets its own line on an assault screen — *"military capture
does not automatically equal political allegiance"* — so an island carried by
storm reads **Crown holds Port Royal** and, separately, *occupied and
politically hostile*.

### And the flat spill is finally gone

`applySupportChange` — the fifth of every allegiance change that landed on every
island in the Reach — had one caller left after the propagation work. It has
none now, and neither it nor `SPILLOVER_FRACTION` is in the codebase any more.
`applyLocalSupport` is what the ordinary case uses, and it returns what actually
moved so the outcome screen can print it.

20 new tests in `outcome.test.ts`, most of them asking whether the three screens
genuinely differ rather than whether the arithmetic adds up: that a draw's first
line is the absence of a decision and never claims either fleet was destroyed,
that the three accounts of the same action are three different accounts, that a
failed bombardment never uses the word beaten, and that being repulsed reads
differently from being unable to finish. 513 pass.

**Not built, and worth saying:** §20's propagation animation is the Reach ripple
from the political work, not a per-screen one; the surviving-ship thumbnails are
grouped by class with a count rather than drawn one per hull; and a bombardment
report is raised only on a day that resolves something — a siege grinding on is
a line in the log, because a card every day for a fortnight is a card nobody
reads.

## A tuning run, and the thing it found under the win table — 17 September

Sean: *"run game sims and tune."* The headline numbers were Crown 25–12 with
three wars in forty never ending. The three stalls all had the same shape, and
tracing them found a problem the win table cannot show.

### The stall

Seed 9014 sat at Crown 47 islands, Brethren 3, neutral 3 — **unchanged from day
1,200 to day 3,000**. Seed 9020 held two of the three Lords in irons
continuously for 1,800 days and never took the third. Seed 9002 reached 62 of
63 islands and could not finish.

In 9020 the last free Lord stood on **one island, liftable, for 1,802
consecutive days**, with a garrison of two. The Crown ran 403 abduction cycles
at her and never succeeded. The reason, printed by the probe in one line:

> Crown officers not in irons: **1**

### The corps collapse

`lab/corps.ts` is new and is the diagnostic that matters. Averaged over the
wars *still running* at each day — which is the whole trick, since dividing by
every war makes a collapsing corps look like a shrinking sample:

| day | Crown free | Crown in irons | no Recruiter | Brethren free | Brethren in irons |
|---|---|---|---|---|---|
| 200 | 3.6 | 1.5 | 20% | 5.3 | 1.8 |
| 500 | 3.0 | 3.2 | 62% | 4.5 | 3.8 |
| 1000 | 2.0 | 3.2 | 50% | **9.0** | 2.8 |
| 2000 | 0.5 | 3.5 | **100%** | **12.0** | 1.0 |
| 3000 | 1.0 | 3.0 | **100%** | **13.0** | 0.0 |

The Confederacy signs the entire unaligned pool and ends with thirteen
officers. The Crown ends with one, and **has no Recruiter at large at every
late sample point in every war** — its two Recruiters are prime abduction
targets, and a side that cannot recruit cannot replace the officers it needs to
rescue the officer who would let it recruit. Across twelve wars the Crown
launched 122 raids, lost 90 people and answered with 27 rescues; the Brethren
lost 138 and answered with 62, getting 103 back.

### What shipped

**A second Crown Recruiter.** Admiral Blackwater joins the Regent, making it
two against the Confederacy's four — which is Rebellion's own asymmetry. One
was not an asymmetry, it was a single point of failure. Median war length
672 → 588 on its own.

**Scarcity: the price of being seen rises as the hands run out.** The missing
idea is the one a person applies without thinking — a side with six officers
can afford a raid that will probably cost it one, a side with one cannot. The
covert-risk discount is now multiplied by `AI_CORPS_COMFORT / hands free`,
capped at four. Nothing else changes: the same raids at the same odds, and what
changes is when a side judges them worth it.

**Measured, 80 wars, both sides played:** Crown 55 — Confederacy 22, **three
never ended**, median 696 days. Against the 40-war baseline of Crown 25–12 with
three never ending, the stalemate rate halves (7.5% → 3.75%) at a few points of
balance. `lab/errands.ts` reads its healthiest yet: officer-days idle **11.4%**,
against 34% at the start of the day, with all ten errands in use.

### Four things tried and cut, and they rhyme

- **Rescue urgency** — scale a rescue's worth by how much of the corps is in
  irons. Reads as obviously right; measured 28–9 with three unfinished against
  28–11 with one, and seventy days longer. A side down to its last hands sent
  *them* into enemy harbours after the rest, where they were taken too. It
  amplified the doom loop it was meant to break.
- **A longer siege commitment** (`AI_SIEGE_DAYS` 6 → 10), to let the smaller
  side commit to Highwater's walls: Crown 32–7.
- **One hunter instead of two**, to slow the Crown's manhunt: Crown 30–8, and
  *more* stalls — fewer failed raids means a healthier Crown corps.
- **A slipway floor**, because the navy is budgeted off acreage
  (`slipways * 4 < held`) and the Confederacy holds five islands, so it wanted
  two slipways and built none while sitting on eighteen free berths and the
  gold. It did exactly what it was meant to — 1.2 slipways to 3.2 by day 300 —
  and the war got worse: Crown 30–7, three unfinished, because both sides spent
  gold on berths instead of hulls and only the Crown had the income to fill
  them.

**They rhyme, and the rhyme is the finding: every symmetric improvement to how
well the machine plays is worth more to the side with more to play with.** The
Crown has twice the islands and twice the income; anything that helps both
sides play better widens the gap. A balance fix has to be asymmetric.

### And the one that worked, and cannot ship

Rebuilding the Recruiter restriction as a strong preference — anybody may keep
a table, a Recruiter is about twice as good — fixed the absorbing state
completely. Crown officers at large at day 1,000 went from 1.0 to **3.4**, and
its late-war chance of having a Recruiter from nought to certain.

And **ten wars in eighty then never ended, against three**. With both corps
healthy, both sides rescue faster than either can hold three Lords at once, and
the Crown's victory condition stops closing.

So the Crown's corps collapse is currently *load-bearing*: it is what ends long
wars. It cannot be fixed until the war can be finished another way — and that
is a design decision rather than a tuning one. The obvious candidates, none of
which I would pick unilaterally: widen `roundUpTheLandless` so a side reduced to
one or two islands with no fleet is finished rather than only a side with none;
give the Crown a second victory condition; or make a Lord held a long time
harder to get back.

---

## One word per idea — 17 September

Sean: *"I think we need to cleanup names. I don't mean unit names I mean
gameplay terms. Like is it 'crew', 'officer' or 'personnel'? Let's make it
crew. Is it 'diplomacy' or 'parley'? Let's make it parley. Is it island or
port? Let's make it: World Map / Reach Map / Location."*

Asked how deep to take it, he picked **labels, and kill the synonyms**: every
label, filter, tab, tooltip and errand name uses the agreed word, and prose
keeps its voice. In a sentence a location is still an island, because in this
world it is one. What is forbidden is a second word for the same idea in a
label.

### The three words, and what they replaced

| Idea | The word | What was also being used |
|---|---|---|
| A person of yours | **Crew** | officer, personnel |
| Talking a place round | **Parley** | diplomacy |
| The whole archipelago | **World Map** | the chart, Seas |
| One chain, opened | **Reach Map** | the chain view |
| One island, opened | **Location** | island, port, harbor |

All five live in `src/data/terms.json`, which was already the vocabulary file;
the pass mostly consisted of finding the places that had gone round it.

### The three views now say which one they are

A player looking at a sheet could not tell whether they were in a Reach or on
an island, because both opened with a name in the same type. `Sheet` gained an
**eyebrow** — a small line above the title — and the Reach map, the Reach's
list of its islands and the island panel all carry theirs. Three screens, three
labels, in the same place every time.

### A person who talks is a Negotiator

The role chip on a crew sheet said **Diplomat** while the rating beside it said
Parley. It is now **Negotiator**, which is the word the advisor was already
using when asked who to send. `sendDiplomat` went with it — renamed `sendCrew`,
since it has sent people to spy, incite, sabotage, research, recruit and take
command for a long time.

### The test that keeps it

`src/ui/__tests__/vocabulary.test.ts` reads every interface file through
Vite's raw glob, strips the comments and the `${...}` interpolations, and
fails on `personnel`, on the noun `officer`, on `Diplomacy` and on `diplomat`
in anything the game says out loud.

Stripping the comments **first** is the point: the files are full of Sean's own
memos quoted back at the code, and a citation that says *"only show this section
when personnel status is relevant"* is a record of why the code is the way it
is, not a word the game says. Rewording those to satisfy a lint would be
falsifying the record.

It caught two things I had missed by hand. The first cut of the officer rule
looked for the noun behind an article — *an officer*, *your officer* — and the
tutorial's very first card slipped straight through it saying *"ships, officers
and islands of its own"*, which is exactly the use the pass exists to kill. The
rule is now the bare noun in any position. And the advisor's roster note still
read `Diplomacy 78 · ashore at Highwater`.

### What a screenshot found that no test could

The Reach's **map** view counted *15 locations* and its **list** view counted
*15 islands*, with no eyebrow on the list at all — two views of one thing
disagreeing about what the thing is called. Both now read the same. The main
island panel had no eyebrow either: the two I had added went to the *dark* and
*uncharted* variants of the sheet, and the one a player actually sees most was
a third render path further down the file.

The tab bar fits **World Map** at 414pt beside Crew, Build, Book and Log with
room to spare, which was the one thing a rename could have broken visually.

---

## A glossary, a translation table, and three build speeds — 17 September

### The glossary

Sean: *"add a glossary to the encyclopedia."* There had been one — eleven
entries at the top of the Rules page, where a player looking a word up had to
already know the word was a rule. It is now its own tab with about forty
entries, grouped the way the vocabulary pass grouped the ideas: what you are
looking at, your people, errands, what people think, money and building, war.
A filter box narrows it, because forty entries on a phone is a scroll.

Writing it caught two things:

- The old entry for a Location said *"seventy-one of them."* There are 63. It
  now counts `reaches.json` rather than remembering.
- My first draft interpolated the label into the prose and produced **"the
  companies standing on an location"** — which is precisely the failure the
  vocabulary rule exists to prevent, committed by the person who wrote the
  rule. A headword is the agreed label; the sentence under it says *island*.

### A–Z, asked afterwards

*"Should glossary be in ABC order?"* — not as a whole. The filter box already
serves the player who knows the word they want, and a flat A–Z scatters Parley,
Incitement and Sabotage over six screens when they are the same kind of thing.

But the question found a real flaw: *inside* a group the order had been the
order the entries were written, which is no order to scan by. So every group
sorts A–Z now, at the point of use rather than in the source, so adding an
entry never means finding its place first.

One group is exempt, and the exemption is the interesting part. **What you are
looking at** runs World Map → Reach Map → Location → Reach → Sea → Unexplored,
which is zoom order, outermost inward. Sorted it reads *Location, Reach, Reach
Map, Sea, Unexplored, World Map* and the hierarchy — the one thing that list is
teaching — is gone. It carries a `keepOrder` flag saying so.

Sorting also caught a headword: *"The watch"* filed under T is a word nobody
finds. It is **Watch**, like every other headword, which is a bare noun.

### The translation table

Sean: *"correct me when I use wrong terms from now on. I use a lot of SW
Rebellion terms. So you should note from a dev perspective which ones mean same
thing."*

`docs/rebellion-terms.md` is that table — regiment→Company, system→Location,
sector→Reach, personnel→Crew, mission→Errand, uprising→Mutiny, and the rest —
and `CLAUDE.md` now carries the rule that governs using it: **understand him
first, then correct in passing.** A clause, never a lecture, and never a
question he has to answer before he gets his work. The left column is another
game's vocabulary and appears nowhere a player can see.

### Three build speeds

Sean: *"I think construction is happening too fast. Look at rates for SW
Rebellion. Ships take forever, facilities medium, troops generally fast."*

The original derives build time from cost and divides it by how many yards of
that kind work the job — which is already this game's model (`daysToFinish` is
`workLeft / crewOn`, asked fresh every morning). So this was a numbers problem,
not a structural one. What was wrong with the numbers is that the three classes
overlapped almost completely: ships ran 8–38 days and buildings 5–32, so a
ship of the line and a Shipyard cost about the same fortnight.

Now they are three separate bands, at one works. More works divide it.

| | was | now |
|---|---|---|
| A company | 5 | **7** |
| Lumber Mill | 5 | 12 |
| Gold Mine | 10 | 20 |
| Training Facility | 15 | 28 |
| Fortress | 18 | 30 |
| Construction Yard | 20 | 34 |
| Shipyard | 25 | 42 |
| Heavy Fortress | 32 | 54 |
| A sloop | 8–11 | **18–24** |
| A frigate | 15–18 | **38–45** |
| A ship of the line | 22–38 | **64–110** |

### What it cost, measured

Forty wars, both sides played, seeds 1–40, against the same forty before the
change:

| | before | ships ×3.2 | ships ×2.9 |
|---|---|---|---|
| Crown — Confederacy | 23 – 13 | 19 – 13 | 17 – 14 |
| Never ended | 4 | **8** | **9** |
| Median length | 624 | 780 | 912 |
| Crown hulls at the end | 17.0 | 13.6 | 11.1 |
| Confederacy islands | 9.8 | **19.4** | 16.1 |
| Crown gold at the end | 561 | **4,431** | 922 |

The gentler ×2.9 was tried precisely to buy back the endings and did not: nine
never ended against eight, and the median ran *longer*. At forty wars that
difference is noise, which is the finding — **inside that range the exact
multiplier buys nothing**, so the slower one ships, because it is the one that
reads as *forever*.

Two of those are the point and one is a bill.

**The point:** the Confederacy doubles its ground. With fewer hulls the Crown
cannot police sixty-three islands, so the political game decides more of the
map — which is the game Sean has been asking for since the allegiance rework.
And gold stops being the constraint, exactly as his September memo wanted:
*"early game shouldn't be terribly constrained by gold... usually constraint
early game is waiting on things to build."*

**The bill:** the war ends less often — one in five now runs to the cap instead
of one in ten. This is the same fork the tuning run found and it has not moved:
the Crown's corps collapse is what ends long wars, and anything that thins the
Crown's fleet thins its manhunt. Slowing ships did not create the problem; it
made the existing one twice as visible.

Two test failures say the same thing in miniature: a war where the player does
nothing no longer ends inside 3,000 days, and the opponent's rescue rate falls
below the floor its test asserts. Both are real regressions of *decisiveness*,
not of correctness, and both are downstream of the fork.

### The two tests it broke, and what they were really measuring

Neither was a bug in the change, and neither is now weaker for it.

**"Lets the opponent win when the player does nothing"** pinned seed 1 and a
1,500-day deadline. Probing it at 6,000 days found something better than a
fix: on that seed the idle Crown ends day 5,000 holding **35 islands to the
Confederacy's one** and *still* has not won, because winning wants all three
Lords in irons at once and an idle side runs no manhunt. It is not beaten — it
never finishes. The test now samples six seeds and allows two exceptions, which
is the claim it was always making.

**"Is gone after by the opponent, and mostly got out"** wanted more than a
third of eight rescues to succeed and got exactly two. Eight samples against a
one-third bar cannot tell a regression from a coin, and a build-rate change had
flipped it. Sixteen seeds now, measured at **5 of 16**, with the bar at a
quarter and the measured figure written into the test.

### Long guns: the answer is that they are already built

Asked when they go in. The rule has been live since the retreat pass:
`fleets.ts` gives a fort, a long-gunned hull or a creature a shot at half
weight (`LONG_GUN_SHARE`) at anything trying to break off, the Encyclopedia has
a Long guns row, and the spec type carries the flag.

**No hull in `ships.json` sets it.** The constants file says why, and says it
was on purpose: *"nothing has them yet, which is the point — early retreat is
nearly free, and the day the first long-gunned hull is launched is the day
breaking off starts to cost."* So forts have them, ships do not, and the arc
was left as a design decision rather than a property of being large.

What is left is picking the hulls. The recommendation is the Craft-3 ships of
the line — `vanguard-ii`, `sovereign-ii`, `majestic`, `freebooter` — so that
long guns are a thing **Research buys** in the back half of a war and the
moment they arrive is legible: retreat stops being free the day the enemy
launches one. Not done in this pass, because two balance changes measured
together are two balance changes nobody can read.

---

## The fleet roster Sean rewrote, and a legend renamed

Two things on 18 September, and the second follows from the first.

**The roster.** The Fleet Roster sheet in Drive is the ships now. It supersedes
the v2.4 export of the same morning outright rather than sitting beside it, so
`combat-ships.json` is a re-read of the sheet and records what it replaced. The
shape changed more than the numbers: twenty-four hulls instead of twenty-five,
four starting ships and eight research unlocks a side, and the Confederacy's
gapped ladder closed — which quietly fixed a wart, because "the nth unlock" and
"the step called Rn" are now the same question and `nextUnlock` no longer has to
explain why they were not.

The endgame is the interesting part. It used to be one ship: the Majestic was
heaviest at guns, hull and armor together, and a test said so. It is now split
three ways — the Majestic keeps the guns, the Urskin Whaler takes the largest
hull in the game at 1,800, the Coral-Class takes the heaviest armor at 110 —
which is the sheet's own endgame rule doing work: *"Together they exceed a lone
Majestic."* The Confederacy answers a first-rate with two ships, not one. The
test was rewritten to assert the split rather than deleted, because a roster
that stops being lopsided by accident and a roster that stops being lopsided on
purpose look identical in a diff.

The blocking item did not move. Still no Firepower column and no 1–10 Speed, and
Firepower is explicitly not the three gun columns added up, so no adapter can
fake the conversion the combat engine needs. It is now a roster worth
converting, which is a different thing from being converted.

**The name.** The roster calls an R5 Confederate siege ship the *Ironback*, and
so did Jessup's legend hull — the Crown dreadnought he sailed out of the
Imperium's service with, named in his fleet-command power. One name, two jobs: a
unique ship in the live game and a class anybody can lay down in the design
roster.

Renaming the roster ship was tried first, that morning, and produced the
provisional *Frostback*. It was the wrong way round. The roster is Sean's own
document and will be read by whoever converts it; a legend is one field, one art
file and a line of flavour. So the legend moved: Jessup's dreadnought is the
***Adamant***, and the roster was not touched to make room.

*Adamant* keeps the iron without the word, reads as the Crown first-rate she
actually is, and says something about a man who left rather than bent. The id,
the art and the manifest entry moved with her — legends are filtered out of
`buildableShips`, so no fleet has ever carried the class id and no save can
break. Two places still say Ironback and both are right to: the world bible's S5
dreadnought *class* rows and the Ghost Fleet's *"2–3 old Ironbacks"*. They mean a
type of hull, which the Fleet Roster has now made true rather than stale.

---

## Harbor guns answer a bombardment and nothing else

Sean sent a screenshot of an action off Highwater and said the screen made no
sense. He was right twice over, and the second half is the cause of the first.

> *"First; it's not a broadside bc one fleet. Second; guns should be anti
> bombardment only."*

**What he was looking at.** Five Confederate hulls with twenty-eight guns, the
Imperium with **zero hulls** and forty harbor guns, `UNFAVORABLE` over the top,
a hull lost that round, and a heading calling it the *First broadside*. He had
sailed to Highwater and been put into a battle against a building. The wall was
a combatant with an infinite hull that shot and could not be shot at, so the
only way out was to run, and lying there cost a hull a day for ever.

**The rule was already written the other way.** `bombardError` carries his own
order of operations — *their fleet, then the blockade, then the walls, then the
landing* — and `bombardRound` opens with *"the wall answers first, at what it
still has."* The walls come **after** their fleet, which means they were never
meant to be part of the fleet action. The fort was doing the job twice: once
correctly, against a bombardment, and once wrongly, against anything afloat.

So the second copy is gone. `wallOf` is deleted, `contestedAt` no longer counts
a fort, the assessment no longer adds a wall to either side, and the battle
sheet no longer has a `shore` at all. One shared test, `underTheWall`, decides
whether the battery is live — is this fleet bombarding? — and the battle, the
break-off and the parting volley all ask it, so they cannot drift apart.

**The fort has not been weakened.** It still refuses a landing outright while
it stands, it still has to be beaten down with shot, and it still answers that
shot at full weight — against a fleet that can now actually hit it back. What
it has lost is the thing it should never have had: the power to sink ships that
were not attacking it.

**Measured, 24 wars, seeds 9000–9023, both sides machine-played:**

| | Before | After |
|---|---|---|
| Crown — Confederacy — unfinished | 13 — 7 — **4** | 17 — 7 — **0** |
| Length (min / median / max) | 240 / **876** / 2808 | 216 / **420** / 1332 |
| Crown at the end | 24.1 islands, 12.4 hulls, 2020 gold | 19.0 islands, 17.8 hulls, 505 gold |
| Confederacy at the end | 11.6 islands, 6.4 hulls, **8157 gold** | 6.6 islands, 5.4 hulls, **1152 gold** |
| Lords in irons | 1.96 of 3 | 2.25 of 3 |

Three things to read in that, and the first is the one that matters.

**The stalemate was the fort.** Every war now finishes. The four that used to
run to the three-thousand-day cap were *all* Crown-ahead — 46, 20, 59 and 15
islands — and all four became Crown wins. The Confederacy still wins exactly
seven. So the head-to-head balance did not move at all; the wars that could
never close now close the way they were already leaning. That is the fork the
last tuning run found and could not choose between, and it turns out not to
have been a balance problem: fronts froze because a fleet could not sit off a
fortified island long enough to do anything to it.

**The median war halved**, 876 days to 420. This is the number to look at
first if the new pace feels wrong — it is a large change and it is not a side
effect to be explained away, it is what happens when the sequence he designed
(beat their fleet, blockade, break the walls, land) can actually be run.

**The Confederacy has stopped hoarding.** 8,157 gold at the end became 1,152.
That was an open item and it was downstream of the same thing: gold piles up in
a war where there is nothing useful to spend it on.

**The wording.** With the fort out of it, the only one-fleet action left is a
creature, and a creature does not fire a broadside — it makes a pass. The
heading reads *First pass* there and *First broadside* when there are two
fleets in the water, which is the only case the word was ever true of.

---

## The locked combat system, and the engine it asked for

Sean rewrote the Fleet Roster sheet again on the evening of 18 September, and
this time the ship table is the smaller half of it. The sheet now carries four
things: the roster, a **Ratings & Pricing** system that prices every hull from
its capabilities, the **Combat Rules** marked LOCKED, and a **Combat Derived
Stats** table of per-ship hit chances and average volleys.

### The sentence that dissolves the blocking item

> *"There is no ship-level Firepower stat. Every individual cannon makes its
> own attack using the rules for its gun type."*

Every version of the naval document since that morning opened by saying nothing
downstream could move until the roster was converted to Firepower / Hull /
Speed 1–10 / hasLongGuns, and that Firepower was explicitly not the three gun
columns added up. **There was never a Firepower number to derive.** Speed stays
a category, the three gun columns *are* the combat inputs, and `ShipDefinition`
now satisfies `CombatStats` structurally — the roster feeds the guns with no
adapter and no conversion step. The blocking item is cancelled rather than
completed, which is a better outcome than finishing it would have been.

### Two reversals, both deliberate

**Armor is back**, and rescaled from 0–110 to **0–30**: `effective = ceil(armor
× (1 − penetration))`, `damage = max(0, rolled − effective)`. So Armor 25 stops
a 25-damage Light hit dead and takes 13 off the same roll from a Heavy. The
Majestic is the only Maximum 30 hull.

**First Strike is back**, and is much stronger than the flag that was cut: it is
now the *shape of the round*. Long Guns are Phase 1, and a hull they sink is
removed before Phase 2 — so it never fires its Light and Heavy guns at all.

What stays gone: boarding, morale, formation, retreat probability, and a
size-class **damage** triangle. That last needs saying precisely, because the
locked rules do have a size matrix. **Size and Speed change accuracy only.** A
Heavy Gun against a sloop is not doing reduced damage, it is missing — 10% to
hit against Small and Very Fast, against 95% at a Slow Gigantic. A test holds
that the dice are the same dice whatever they are pointed at.

### The engine

`lab/navyduel.ts`, which the sheet names as the next build step: 5,000 trials a
matchup, every hull against every hull, fought to annihilation.

**The endgame rule holds exactly, with nothing tuned to make it.**

| Confederacy fielding | Beats a Majestic | Mutual |
|---|---|---|
| 1 Urskin Whaler | **0.0%** | 15.7% |
| 1 Coral-Class | **0.0%** | 0.0% |
| 2 Urskin Whalers | **100.0%** | 0.0% |
| 2 Coral-Class | **98.3%** | 1.5% |
| 1 of each | **100.0%** | 0.0% |

That is his stated target — *"one of either Confederate capital loses to
Majestic, while two of either — or one of each — should defeat it reliably"* —
landing on the nose out of the roster's own numbers. It is the strongest
evidence available that both the roster and my reading of the rules are right.
The accuracy model is checked the same way: sixteen hulls' Light, Long and
Heavy hit chances are asserted against his published Combat Derived Stats
table, both clamps included.

### One target is missed, and it is worth his attention

> *"Evenly matched battles should usually resolve in 1–3 player-visible Combat
> Exchanges."*

| Sample | n | Mean Exchanges | Within 1–3 |
|---|---|---|---|
| Evenly matched (40–60% win share) | 5 | 3.30 | **40%** |
| Close (30–70%) | 20 | 3.40 | **25%** |
| Every matchup | 485 | 2.10 | 82.5% |

So the roster at large sits comfortably inside the target and the *even* fights
— exactly the ones the rule is about — sit just outside it. The cause is
structural rather than a bug: the 30% stop is proportional, so the pairings that
are most evenly matched are the armored ones where each cannon gets least
through, and they trade many short Exchanges instead of a few decisive ones.

Two dials would move it and **both are his**, because the rules are locked:
raise the stop share above 30%, or leave it and accept that a close fight
between two capitals is a long conversation. Nothing was changed to chase it.

### Two findings from the sweep he did not ask for

**The retreat volley barely touches anything Medium or larger.** Fleeing from a
single long-gunned pursuer, every hull from the Brigantine up escapes 100% of
the time with most of its hull; only the Swift (69.8%), Interceptor I (84.6%),
Cutlass (89.8%) and Marauder (94.8%) are ever caught. That is a floor rather
than the whole picture — this is one pursuer, and a fleet of long-gunned hulls
multiplies it — but as written, breaking off a capital is nearly free.

**The pricing system tracks combat efficiency well, with two outliers.** Wins
per 1,000 gold across the whole roster puts Tempest (1.89) and Vanguard (1.71)
at the top, which matches their S ratings. But the **Chimera** is rated C and
returns 1.61, and the **Marauder** is rated S and returns 0.98 — middling. The
likely explanation is that a 1v1 duel cannot see what the Marauder is priced
for: troops, bombardment and independent raiding are strategic value that never
appears in a straight fight. Worth knowing before either is retuned.

### Not wired in

`navycombat.ts` is imported by no UI file and by nothing in `advanceDay`. The
live 24-hull roster and its own combat in `fleets.ts` are untouched and are a
different fleet with different numbers. Joining them is real work — the live
roster adopting Size and the 0–30 armor scale, saved games carrying `classId`
strings that would no longer resolve, and the battle sheet learning to show an
Exchange rather than a broadside — and it has not been asked for.

---

## Moving the live game onto the locked model — the sequencing problem

Sean: *"start me rebuilding the encyclopedia around new names and stats and
removing old stats or discontinued ones like 'against a wall' and 'getting
clear' and 'broadsides'. Yea basically scrap old model. This is the future!"*

He chose the staged plan: swap the roster and rebuild the Encyclopedia first,
leave combat resolution on `fleets.ts` for one more pass. **That split is not
available, and this is the record of why.**

### The roster swap forces the engine swap

The live damage formula is `damage = guns × swing`, applied against `hull`:

| | Old scale | New scale |
|---|---|---|
| Guns | 5–46 (a weight of fire) | 0–36 (a count of cannon) |
| Hull | 1–55 | 70–1800 |
| Shots to sink a typical hull | about 1 | about 50 |

A Razorback's 18 guns against 17 hull killed in one shot. A Majestic's 36
cannon against an Urskin Whaler's 1,800 hull takes fifty. Dropping the new
numbers into the old formula does not make the war slightly slower, it makes
every action interminable and every test that asks whether a war ends fail.

And the coupling is wider than `fightRound`. Three more things read the old
scale and would have to move in the same commit:

- **Officer leadership**, which is a hit-chance edge on a volley. The locked
  rules have no officers in them at all, so keeping the live feature means
  extending the sheet's model, which is a design decision rather than a port.
- **The Kraken**, which is a combatant with a `guns` number and its own strike.
- **Forts**, at 20 guns against hulls that now run to 1,800.

So "roster now, engine next" would have committed a knowingly broken war. I did
not do that.

### What is parked, and what it cost

`src/data/ships.next.json` — the full twenty-four hulls on the new model,
**every field verified against the Fleet Roster sheet**, plus the three legend
hulls. Ids are slugs of the new names; eleven of them already have paintings
(bulwark, cutlass, majestic, marauder, sovereign, sovereign-ii, swift, tempest,
urskin-whaler, vanguard, vanguard-ii) and six more map cleanly by lineage
(reef-class → coral-class, reefwalker → reefwarden, brig → brigantine, kestrel
→ interceptor-i, kestrel-ii → interceptor-ii, fluyt → wayfinder). Seven need
new art: morningstar, resolute, justiciar, chimera, tidestalker, blackfin,
ironback.

The migration itself was taken far enough to prove the shape and then rolled
back rather than left half-applied: `ShipClass` loses `role` for `size`, gains
`research`, `armor`, `repairPct` and three gun counts; `SHIP_ROLES`,
`GUN_DECKS`, `HULL_EASE`, `GUNNERY_ON_SMALL`, `hitChanceOn` and `aimAt` all
delete outright, because all six were the one idea the locked rules replace —
that size changes damage. It changes accuracy now, and only accuracy.

### The order it actually wants to go in

1. **Engine and roster together**, one commit: `ships.json` replaced, sea
   combat delegating to `navycombat.ts`, the Kraken and the forts rescaled, and
   a ruling needed on where officer leadership attaches.
2. **The Encyclopedia**, on the result — which is when *Against a wall* becomes
   **Bombardment** (the stat survives, the label was old), *Getting clear*
   becomes the Long Gun retreat volley, and *Broadsides* goes with nothing to
   replace it, because there are no gun decks: every cannon fires on its own.
3. **Re-measure the war from scratch.** The balance will be unrecognisable.

---

## The Encyclopedia, rebuilt on the new model

Sean asked twice, having heard the sequencing objection, so the objection is
settled: the Encyclopedia now describes **the locked combat system and the
twenty-four-hull roster**, read straight off `ROSTER` and `navycombat.ts`
rather than off the hulls the live game currently sails. A banner at the top of
the Ships page says exactly that, so a reader who cannot find the Justiciar in
their harbour knows why.

### The three names he called out

- **"Broadsides"** — gone, with nothing to replace it. There are no gun decks
  in the locked rules and no broadside: every individual cannon makes its own
  attack. `GUN_DECKS` is no longer read here at all.
- **"Getting clear"** — gone as a stat. The old speed-1-to-10 retreat exposure
  is replaced by a rule rather than a number: every surviving **long gun** in
  the pursuing fleet gets one shot, and nothing else reaches. It has its own
  section, *Breaking off*.
- **"Against a wall"** — the **label** was old, the stat was not. Bombardment
  is still in the locked rules as the siege rating, so it keeps its column
  under its proper name and gains a section saying plainly that it contributes
  nothing to a fleet action. Removing it outright would have deleted a live
  mechanic on a wording complaint.

Also gone: *Which hull beats which*, the whole damage-triangle section, along
with `HULL_EASE` and `GUNNERY_ON_SMALL`. Its replacement, *Size, speed, and
what can hit you*, prints the two accuracy matrices from the engine's own
constants and states the thing that matters — size and speed change **accuracy
only**, and a heavy gun against a sloop is missing, not doing less damage.

### What the Ships page is now

A banner, then all twenty-four hulls grouped by navy, each with Size, Speed,
Hull, Armor, the three gun counts, Bombardment, Carries and Repair — and,
under every card, what she is actually *hit* by: her light, long and heavy hit
chances, computed live by `hitChance` rather than typed in. Then six sections:
the three cannon, armor and penetration, the accuracy matrices, an action at
sea (two phases, first strike, the Combat Exchange, and officers), choosing a
target, breaking off, and bombardment.

Art: eleven hulls keep their own painting, six inherit by lineage (Coral-Class
from Reef-class, Reefwarden from Reefwalker, Brigantine from Brig, Interceptor
I and II from the Kestrels, Wayfinder from the Fluyt) and seven fall through to
the drawn silhouette until they are painted — Morningstar, Resolute, Justiciar,
Chimera, Tidestalker, Blackfin, Ironback.

### One ruling made rather than asked for

The locked rules have no officers in them anywhere, and the live game has had a
crew member's Leadership tell in a sea action since the ratings pass. Rather
than stall a third time, leadership now enters the engine as **percentage
points on the hit roll**, clamped like everything else — it changes who
connects, never what a hit is worth. It is flagged in `hitChance` as not being
from the sheet, and one line overturns it.

---

## The Urskin Goliath, and a Whaler that will actually be a whaler

Sean, 19 September, with two paintings attached: *"Change its name to Urskin
Goliath. I am gonna invest a new ship called the Urskin Whaler and put it in
the google sheet here is the whaler art and Goliath art. The big one is the
Goliath small one is whaler."*

### Why the name had to move rather than the art

There were already two ships called the Urskin Whaler and they were nothing
like each other. The live roster's is a **Medium of 30 hull** — *"a northern
whaling hull with the ice-frames still in her and a harpoon battery over the
bow"*. The locked roster's `CFS-URW-R7-01` is a **Gigantic of 1,800**, the
largest hull in the game, filed as a *colossal invasion dreadnaught*. One name,
a sixtyfold difference in hull, and the only reason it had not bitten yet is
that the two rosters never meet.

So this is not a cosmetic rename. It splits a name that was doing two jobs. The
dreadnaught becomes the **Goliath**, which is what she has always been, and the
Whaler goes back to being a whaler — the hull the live roster has described all
along, and the one Sean is now putting into the sheet properly.

### The Ship ID moved too, and that part was my call

`CFS-URW-R7-01` → `CFS-URG-R7-01`. The sheet is the source of truth for IDs and
this one was not read off it, so it is flagged in `combat-ships.json`'s own
`_notes` and the sheet overrules it on the next import. The reason not to wait:
leaving the Goliath holding **URW** guarantees a collision the moment a real
Urskin Whaler is entered.

That id collision would at least have been caught — `validateRoster` has
checked for a duplicate `Ship ID` since the import, and `ROSTER.byId.size` is
asserted against the ship count besides. **The one that would not have been
caught is the name.** Nothing checked that two hulls were called different
things, which is precisely the collision that has been sitting in the game
all day: a Gigantic of 1,800 and a Medium of 30, both the Urskin Whaler,
invisible only because the two rosters never meet. So the validator now
rejects a repeated name the way it rejects a repeated id, case- and
space-insensitively, and a test pins it along with the rename itself. That
guard is worth more than the rename that prompted it — it is the thing that
will catch the *next* one, in a sheet nobody has read yet.

### What did not change

Every number. Same Gigantic, same 1,800 hull, same 7 Long and 13 Heavy, same
armor 25. The 5,000-trial endgame table is unchanged to the decimal — one
Goliath still loses to a Majestic 100% of the time, two still win 100% — which
is the check that this was a rename and not an edit.

### The two paintings

The big one, installed this morning under the Whaler's slug, moves to
`ships/urskin-goliath`: a bone-hulled leviathan with a whale skull for a
figurehead, three gun decks and ranks of bone spars out over the ice. She reads
Gigantic, which is the point.

The new one takes `ships/urskin-whaler` at v3, retiring both the Goliath copy
that held the slug for a few hours and the contact-sheet placeholder under it.
Same ice, same bone frames, same Urskin hand — but two masts, one gun deck, and
a harpoon run out over the bow. That harpoon is the live roster's own blurb
made visible, and it is the first ship art in the game that reads *smaller*
than the hull beside it on purpose.

### One thing unhooked rather than repointed

`ENCYCLOPEDIA_SHIP` had the live `urskin-whaler` pointing at `CFS-URW-R7-01`.
That mapping is now removed rather than redirected. Sending a player who taps a
30-hull whaler to an entry for a 1,800-hull dreadnaught is worse than sending
them nowhere, and she is the first hull in that map to be *waiting* for her
counterpart rather than lacking one. She gets remapped the day the Whaler
lands in the sheet.

---

## The encyclopedia tidied, and the art given somewhere to live

Sean, 19 September, six things at once: *"Crew images are too big now. Reduce
by 40% / Also center their heads some are off screen / And make their role tags
clickable to glossary term / Overall ui for encyclopedia needs some work. Looks
a little messy. Needs cleaner design / Put all encyclopedia entities in
alphabetical order / Can you save all art to Google Drive also? So I can view
it when I want. All unit thumbnails."*

### The heads were being cut in the crop, not by the CSS

Worth writing down because the obvious diagnosis was wrong. The face crops are
square and the box they render into is square, so `object-fit: cover` was
taking nothing off — the CSS could not have been clipping anybody.

The crops themselves were the problem. Recovering each one's box by matching
the 124px face master against the portrait master it came from showed all
twenty-six anchored at **y = 6**, with a side of 124 out of a portrait only
~200 tall. That is a box pushed hard against the top of the frame, and it was
cutting the Widow Ashgrave's hat, Blackwater's hair, Isolde Marrow's crown and
several more. Four were also well off the head horizontally — Ozmond's centre
sat at 36% of the portrait's width against a head at 47%.

Recut at **154px square from y = 0**, centred on the head. The head centres
were read off a ruler overlay rather than detected: the cast includes a
sea-bear, a goblin, a fish-person and a green Bog-folk, and no face detector
available here handles four of twenty-six. `cv2` 5.0 has dropped the cascade
API in any case. The boxes are recorded in the register, so a future nudge is
`art.py recrop` rather than another matching pass.

### 40% smaller is also, for the first time, sharp

The art was the card's full 384px from a 256px source — the largest version of
this picture was also the softest. At 60% it is about 216px, under the source,
so the reduction Sean asked for is the first size at which the crop has been
shown at or below its own resolution.

### What the tidying actually was

Four bands instead of three things run together. The head sits beside the name
now, which frees a column that was empty for anyone without a rank or a sworn
people — the four ratings go there, level with the face, which is the pairing
you actually read. Then role chips, then the life. The other tabs have read
art-left-text-right all along, so the crew page had been the odd one out as
well as the loud one.

### Alphabetical, with one judgement call

Every list on the screen had its own order and every one of those orders served
somebody writing the game: buildings by unlock, hulls by research grade, crew
by roster position. A reference is for looking things up, so all of it is A–Z
now — **within the groups**, which stay. Flattening Crown and Confederacy into
one list would lose the distinction every entry on the page turns on, and the
glossary settled the same question the same way on 17 September.

People sort by **surname**, not by the displayed name. A page reading *Admiral,
Admiral, Captain, Captain* is not alphabetical in any sense a reader wants.
Blackwater, Calloway, Carrow, Corvane — the way a book of people does it. The
cast makes it easy: no particles, the mononyms are their own surname, and *The
Widow Ashgrave* files under A, which is right.

### Role tags, and nine words the game had never explained

Eleven tags across the cast. Two had glossary entries. The other nine —
Leader, General, Spec Ops, Ship Design, Drill Research, Deep-touched, Latent
Deep-touched, Tidemaster, Wing-Captain — were words the game showed the player
and defined nowhere, so they got written before the tags became links: a chip
that opens the glossary and lands on nothing is worse than one that does
nothing.

Each entry says whether the tag is a **rule or a label**, which a player cannot
tell from the card and which turns out to be a four/five split. Recruiter gates
Recruitment. Leader and General gate Command. Negotiator is worth +12 at a
parley and Spec Ops the same at an incitement. The other five are read by
nothing. A chip is brass and bordered when it opens something and flat when it
does not, so the difference is visible before you tap rather than after.

`glossaryWords()` decides which is which, and a test walks the cast against it
— a role added to somebody with no entry written fails the build rather than
quietly going grey.

### A real bug found on the way

The first role tag did nothing. `Almanac` seeds its open tab from a prop into
`useState`, so a lookup made while the encyclopedia was *already open* never
moved it — and the crew tags are the first lookup in the game that fires from
inside the sheet. Asking twice for the same page and entry was broken for the
same reason. Lookups are counted now and the count is the component's React
key, so every request is distinct and the sheet remounts at what was asked for.

### Google Drive: the half that could not be done, and what replaced it

The connector takes a file only as base64 inline and the tool channel truncates
long output at roughly 20KB, so a 90KB ship painting cannot be round-tripped
through it — never mind 139 files and 5MB. A 12KB test file went up fine and a
105KB one could not be read back to send. That is a hard ceiling, not a slow
path.

So Drive gets the **written index** — every asset, its version, shipped and
master size, and where it came from — and the art itself gets `?art=paintings`,
a gallery beside the three `?art` instruments already in `main.tsx`. All 139
files at shipped resolution, grouped, searchable, each tappable to the file on
its own. It deploys with the game, which makes it strictly better than a folder
would have been: install a painting and it is there on the next deploy, with no
second copy to remember to update and no way for it to go stale.

The index says all of this in the folder, so the reason is where somebody would
go looking for the files.

*(The gallery counts 139 and the register 136. Three files — `chrome/wood` and
the two crests — predate the register and were never added to it. Not a fault:
the gallery reads the disk and the register reads itself.)*

### One art column, every tab

Sean, straight after: *"Make ships on encyclopedia same size images as crew. In
fact all units same size."*

They had been all over the place — a crew face at 216px, a hull at 140, a works
at 84, a company at 76 — because each entry was built when its own tab was, and
each picked whatever number looked right on that page alone. Swiping between
tabs, nothing lined up.

Every unit now shares `.encunit__art`: **the same 60% of the card**, which is
what makes the column read as one column down the whole reference. Not the same
*box*, deliberately. A hull is 4:3, a works is a wide strip and a head is
square; forcing those into one shape would either crop the art or hang it in
empty space. Each fills the width and keeps its own proportions, so they come
out 216×216, 216×162 and 216×135 and still align on the left edge, which is the
edge the eye follows.

A company is the exception that proves it: there are no troop paintings, so it
is still a drawn figure, and stretching a 14:26 silhouette to 216 wide would
have made it four hundred pixels tall. It sits centred in a 4:3 plate at the
same width instead, which gives it the same weight as the paintings beside it.

The knock-on was the text column, now 40% of a phone: the `row--between`
headers that used to run name-left figure-right across a full card had nowhere
to go and were breaking names in half — *Interceptor / I*, *Crown / Marines*.
They stack in this context now, set once in CSS rather than by rewriting four
headers, because `row--between` is still the right markup and only its width
changed.

`.company__thumb` went with it — the encyclopedia was its only caller.

## Two layers: a picture to scroll, an entry to open

Sean, 19 September: *"I feel like on the encyclopedia you're trying to do too
much... Within the encyclopedia you can look at pics and scroll. But when you
find the entry you want you click it for max info in a single entry. And then
in the game panels if you need to learn about something you click it and it
pops up the full max entry."*

He is right, and the thing he is describing is not a tidy-up. Every list row
had been carrying its whole subject — art, name, tags, a stat grid, hit
chances, lore — and twenty-six of those is a **document you scroll past**
rather than a reference you look things up in. The page was doing the browsing
job and the reading job at once and failing the first.

### The browse layer

A grid, two to a row: a picture, a name, and one line. Ships get *Large · 700
hull · R3*, crew get their people, companies their three numbers, works their
cost. That is the fact you would sort or choose by and nothing else. A dozen
hulls fit on a screen where one and a half used to.

The crew page's three paragraphs about what a rating is for moved **below** the
grid on the same reasoning: it is a page you read once and then scroll past
twenty-six times.

### The entry layer

`EntrySheet` — one subject, everything known about it, on a third sheet level
above the reference. It is not a new document: it is what the rows were
carrying, plus the couple of facts that had only ever been stated in
page-level prose and never on the thing they were about. A person's entry now
answers *may this one be sent recruiting, may this one hold an island* from
their own `roles` rather than leaving the player to hold the rule in their head
while looking at somebody.

### One destination, two ways in

The sheet is keyed by **id**, not by whatever object the caller happened to be
holding, which is what lets a game panel and the reference's own list be the
same request. Tapping a crew card on the Crew screen now opens that person's
entry directly, over the encyclopedia rather than instead of it, so closing it
leaves you somewhere sensible.

`subjectFor` does the guessing — hull ids, company ids, works types, the two
resources, a person's slug — once, in one place. That guess is the fragile
part of the design: a new id space that happened to look like an old one would
send a player to the wrong sheet in silence. So a test walks every id in all
five spaces and fails if any two ever collide, and another pins that a
glossary word, a cut hull and the empty case all resolve to nothing rather
than to a wrong guess.

### A second silent bug, found by rewriting the anchors

Landing on an entry had never worked for a hull. The cells were keyed
`enc-CWN-MAJ-R8-01` and the effect looked for `enc-${slugOf(entry)}`, which
lower-cases — and `getElementById` does not. **Every ship lookup in the game
has been landing at the top of the Ships page since the roster went in**, which
looks exactly like a lookup that did nothing. Both ends go through `anchorOf`
now, so they cannot drift apart again.

That is the second one this week in the same few lines — the first was lookups
from inside an already-open encyclopedia doing nothing at all. Both were
invisible because the failure mode of a broken lookup is a page that opens
anyway, just not where you wanted it.

## Troops, one idle filter, and an order the player sets

Six notes, 19 September.

### A ground unit is a Troop

*"Rename 'company' to 'troop(s)' through game when talking about ground
units."* This **reverses the 17 September ruling** that made it a Company and
retired *troops*, so the vocabulary table in `CLAUDE.md` and
`docs/rebellion-terms.md` are turned round with it rather than left saying the
opposite of the game.

`terms.troop` was already the single source for the label, so the flip is one
line; the work was the hundred-odd places that had spelled it out instead. 62
player-facing string literals and 48 stretches of raw JSX text.

**One exemption, and it is a name rather than the category.** The unit sailors
ashore are called is a **Ship's Company**, which is a real naval idiom for the
crew of a vessel. Renaming it would have invented a unit name nobody asked
for, so it stands, and the guard exempts it by name.

Ids did not move. `crown-ships-company` is a troop type's key and the name of
its painting on disk; the encyclopedia route `'companies'` and the entry kind
`'company'` are passed around by half the game. Renaming those would have been
renaming files for a word nobody reads.

### The guard had a hole, and this is what found it

`vocabulary.test.ts` only ever read **quoted strings**. Every retired word —
officer, personnel, diplomat — has been checked against half the interface
since the pass was written, because the text *between* the tags was invisible
to it. That is where 48 of the company occurrences were: whole paragraphs of
the encyclopedia and the island panel.

`jsxText` closes it, and the company rule runs against both. Worth more than
the rename that turned it up.

### One filter for the three yards

*"Consolidate idle yards, training, shipyards into 'Idle Buildings'."* Three
filters asking the same question — what of mine is standing about — meant
three swipes to find out, and the answer a player acts on is identical either
way: go there and give something an order. The count is every idle works on
the island whatever kind, and the Buildings tab it opens on says which.

*"Move idle land to last."* Done, and pinned by a test, because the order of
`CHART_LAYERS` **is** the swipe order and nothing else says so.

### Numbers on two filters that only had sizes

*"Display # on garrison filter."* Garrisons and Available land were graded by
dot size and nothing else; both show their figure now.

That needed one more thing than it looks. A numeral **replaces** the dot, so
adding the number to those two would have thrown away the very banding Sean
asked about in the same message. The numeral takes the band's size instead —
read the size from across the chart, read the figure up close.

### The dot ladder, and a correction

*"Change filter dot size to <3 small, 3-5 medium, 6+ large."* A garrison has
done exactly that since his own ladder of **14 September** — `GARRISON_FAIR`
3, `GARRISON_STRONG` 6. So the filter he was asking to change is the other one
that sizes by a count: open ground was 2 and 5. It is 3 and 6 now, literally
`GARRISON_FAIR` and `GARRISON_STRONG`, so there is one rule for both rather
than two that nearly agree.

### The strip in the player's own order

*"Add in settings ability to change default order of game filters. That would
be cool."* Up and down arrows in the menu, the same ones the harbor and the
garrison already use.

Saved to the device rather than the game, with grouping and reordering, on the
same reasoning: which filters matter is a fact about how somebody plays, not
about this war. Stored as **ids**, with the specs left to the build, and
reconciled at read time — a filter the saved order has never heard of appears
at the end rather than vanishing, and a retired one is dropped. Five tests on
that reconciliation, because it is the part that breaks silently between
versions.

## The location screen, and a hull's own voice (19 September)

Two batches, and the same instinct behind both: *"I feel like on the
encyclopedia you're trying to do too much."* Most of this is subtraction.

### A tab that has nothing behind it does not appear

*"Can we make the Harbor tab only appear when there is something there or on
route? Otherwise it just goes to next tab? Same with crew."* Harbor shows when
a hull is in the roads or standing for the island; Crew shows when somebody is
ashore or on passage. Buildings and Troops always show, because an island of
yours always has ground.

The exception matters more than the rule: **on an enemy island every tab
shows**. *"When I click on enemy locations I should see all tabs. No tabs
hidden... But info might not be accurate."* Hiding a tab on their island would
be the fog of war telling the player a lie shaped like a fact — an empty
Harbor tab that says nothing is there, when what it means is that nothing was
there the last time anybody looked. So their islands show all four and carry
the age of the report instead: **"Last report 6 days ago"**, and today and
yesterday said as words.

### Headings that only said what the reader could see

*"Cut the at harbor. If nothing is there, nothing is there. Same with crew. Cut
all the text. Ashore / underway. Only add if distinction is necessary."* The
"At anchor" heading is gone; Ashore and Underway are two words apiece and only
appear when both exist. The glossary's section intros went the same way — each
was a sentence explaining what a list of ships is.

### Grouping stops being a question

*"Always group them and allow me to press and hold to drag and move. Same goes
for all units. No need for group and reorder. Just always combine alike. The
only exception is ships!"*

Ten identical tiles saying the same thing ten times was never an option
anybody wanted; four Kestrels genuinely are four different amounts of damage,
so hulls keep the toggle and nothing else does.

The hold-and-drag is built on the one-step `up`/`down` the lists already
expose rather than on a drop target, which is what keeps it small: while a
tile is held, crossing a neighbour's boundary moves it one place and the
origin resets. Drag three tiles' worth and it moves three places, and nobody
has to track a drop index.

It needed **pointer capture** to work at all. The first thing a drag does is
take the finger off the tile it started on, and without capture the tile stops
receiving moves the instant that happens — so the gesture could only ever move
a tile by less than its own width, which is to say never. That was the whole
bug, and it cost most of the afternoon because the arrows were plainly present
and plainly working.

The arrows stay in the page but are not drawn until one is focused. A hold is
not a gesture a keyboard has, and the row of them under every tile is exactly
the clutter Sean was describing.

### What a ship is good and bad against

*"Delete the description text that repeats the stats... Replace it with 1-2
sentences of in-world flavor text per ship that tells the player what the ship
is good and bad against, naturally."*

The roster's own Design Notes column read *"Heavy Armor 22; 400 Hull; 7 Long
and 8 Heavy Guns"* — the stat grid again, in a sentence, directly under the
stat grid. Twenty-four lines written instead, and then **rewritten**, because
the first pass still leaned on numerals: *"Twelve light guns is a hail of
shot"* is the grid wearing a coat. They name opponents now. The Blackfin eats
scouts, transports and unplated escorts, and every ball she fires rings off
anything properly plated — which is the light gun's zero penetration said in a
way a player can act on without doing arithmetic.

They live in `src/data/ship-flavour.json`, not in `combat-ships.json`, because
that file carries a standing instruction to be changed by re-reading the sheet
and never by hand; a line written into it would be gone at the next import. A
test fails if a hull has no line or a line has no hull, and §6C of the world
bible is generated from the same file.

### Armor, and one word for it

*"Use 'Armor' everywhere: UI, data, and the world bible."* `MAX_ARMOUR` was the
last holdout and it was in a UI file, so it moved with the rest.

## The Lords' ships, and a picture that fits its frame (19 September)

### A hull is a fact about its Lord

*"Move the ships of stories section in ship encyclopedia under the character
lore in the crew profile."*

The three legend hulls — the *Free Harbor*, the *Swallowtail*, the *Adamant* —
sat in a section at the foot of the Ships page under a paragraph explaining
that nothing builds them, nothing sails them and nothing fights them. That
paragraph was the tell: a page of things you lay down and send to sea is
exactly the wrong place for three ships you cannot. They are now a card under
the bio in the crew entry, which is where the in-game character sheet has put
them since the Lords stopped being game pieces.

Moving them means the only route to a legend hull is the Lord who owns it, so
that join is pinned by a test both ways: every Lord resolves to a hull, and
every hull marked `legend` is claimed by a Lord. Without it a rename would
drop a ship out of the game's writing entirely and nothing would say so.

### A painting is not one shape

*"All the unit images I'm sending you are 4:3 can you please scale them so
they don't cut?"*

Measured before changing anything, at a 390px phone. Crew: box 1.00, art 1.00.
Ships: 1.33 and 1.33. Troops: a 1.01 painting in a 1.33 box, letterboxed.
**Works: a 1.60 box, and the two fortresses that had just arrived are 1.33** —
so both were losing their sky and their water to a band. That was the whole of
the complaint, and it was one constant: `FACILITY_BAND = 1.6`, chosen when the
only works art was five strips sliced out of a contact sheet at about four to
one.

So a works painting now carries its own shape. `facilityArt` reports which of
the two sources matched — a whole 4:3 commission or an old sliced strip — and
the box takes that ratio, in the encyclopedia, on the island board and on the
build card alike. Nothing had to be re-cut and nothing else moved. The comment
above that constant had said *"as the strips are replaced with paintings of
their own this can go to 4:3"*; this is that, one painting at a time instead
of all at once.

Two consequences worth writing down. The five strips still show as bands,
because they *are* bands — they will fill a 4:3 box the day they are
repainted, with no further code. And the tiles in a row are no longer the same
height, so the card's caption is pushed to its foot and the names line up
regardless.

The art briefs in `docs/art-units.md` told the artist the game would crop to a
16:10 band and to keep the subject clear of the top and bottom eighth. That is
no longer true, in fourteen prompts.

### Armor, finished properly

The earlier pass moved `MAX_ARMOUR` and stopped. The Rules page still said
*armour* in eight places a player reads, and a hull blurb said *armoured*. One
spelling now, through the UI, the data and the docs.

## Cut the frames (19 September)

*"This screen is still showing way too small of images. Cut the frames and
just show me the crew please."*

Crew were the last unit kind still drawn as a ringed medallion on the Location
board: a square badge in the middle of the tile, an ornate frame taking most
of it, the face a circle inside that. Everything else on a board — a hull, a
troop, a works — is a painting run full width across the top of the tile. Crew
now are too, at 166px against the 50-odd the ring's opening allowed.

This is the second run at the same complaint. In September he said *"we want
the image to pop not the frame"* and the answer then was to tuck the face
under the ring's inner bevel so it read as a band around a portrait rather
than a portrait inside a frame. That made the face bigger and kept the frame.
He has now said which of the two he wanted.

The rings are not deleted. They are still worn where a medallion is the right
object and there is no room for a painting — and, as it turns out, that is now
nowhere in the game: `RING_MIN` is 80px, every remaining `CharacterPortrait`
in play is 44, and the only callers above the threshold are the art gallery
and the style gallery. Worth saying out loud, since the five rings were
commissioned for this.

`Slot`'s `icon` became optional in the process. `CharacterFace` carries its own
fallback — the drawn cameo, when a character has no painting — so there was
nothing to put there, and a second fallback that can never fire is a lie about
what the tile does.

### And an app that could be scrolled

Found while measuring the above, not by looking for it. The board seemed to
stop a sixth of the way up the screen with dead space under it; the sheet
measured `-109` to `684` in an 844 viewport, with the topbar off the top and
the console off the bottom.

The cause was **my own maroon-strip fix**. `.sheet::after` paints 160px of
filler below the sheet to cover the gap where `.app` measures short, and
`.app` was `overflow: hidden` — which clips the paint but still makes a scroll
container. So the whole app could be scrolled 160px, and anything that scrolls
an element into view did it unasked. `.app` reported `scrollTop: 160`.

`overflow: clip` paints identically and makes no scroll container, so it
cannot happen. The filler stays; it was never the problem.

I also raised `.sheet--tabbed` from 82% to 94% on the strength of the dead
space, and then put it back when the measurement turned out to be the scroll
and not the layout. At 82% the sheet already reaches the bottom of the glass
and leaves the island's header showing above it, which is the design.

## Distance costs what distance should (19 September)

*"Travel time is still way too fast. Traveling to island should be
proportional to their distance on map with 200 days being longest travel
distance."*

### What it was

Measured first, over 9,765 island pairs across five seeds. The longest passage
anywhere in the game was **37 days** and the median **19**. Against a war that
runs a year and a half, a fleet could be anywhere it liked within a month, so
where a fleet *was* barely constrained what it could do next.

Three numbers produced that: a day for every 36 units of water, two days to
cast off at all, and a four-day toll for leaving your own Sea.

### What it is

One line. How far apart the two islands are, as a fraction of the width of the
world, times two hundred — clamped at both ends, because a voyage of no days
is a teleport and the promise of two hundred should be exactly true.

`TRAVEL_WORLD_SPAN` is 1100 and fixed rather than measured per map, so the same
two islands are the same distance apart in every game. Across 120 seeds the
farthest pair the generator places ranges 1054–1121 units, so a genuine
corner-to-corner haul lands within a few days of the ceiling and the clamp
catches the overshoot.

Both of the old extras are gone rather than added on top, since either would
put the longest voyage past the two hundred he asked for. **The open-sea toll
is the loss worth naming:** crossing between Reaches used to cost more than the
same distance inside one, and now it costs the same. If that rule is wanted
back it has to be a multiplier on distance rather than a flat addition, or the
ceiling stops being true.

What it works out to, measured:

| | before | after |
|---|---|---|
| nearest neighbour | 3 | 7–9 |
| within a Reach (median) | 7 | 19 |
| Reach to Reach (median) | 14 | 111 |
| corner to corner | 37 | **200** |

The ceiling is on the *distance*, not on the voyage: `fleetPace` still applies,
so a ship of the line crossing the world is longer than two hundred days and a
sloop appreciably shorter.

### What it cost, measured

Twelve seeds, machine played on both sides, 3,000-day cap:

| | settled | median | range |
|---|---|---|---|
| before | 12 / 12 | 527 | 299–803 |
| after | **10 / 12** | 659 | 527–827 |

Wars run about a quarter longer, which is the point. **Two seeds now never
settle at all** — seed 2 does not finish at nine thousand days either. The
mechanism is visible in the end state: the idle Crown sits on 42 islands to the
Confederacy's 1, because the machine-played Confederacy will not commit a fleet
to a six-month passage and so never comes for Highwater, while an unplayed
Crown quietly eats everything within a fortnight's sail of itself.

That is a real cost and it is in the open rather than papered over. The
victory-condition test moved from seed 2 to seed 1 with the finding written
into it, and the sibling test that already tolerates two exceptions in six now
uses both of them.

**What I have not done, because it is a separate decision:** the opponent's
planner discounts a target by `travelDays × 2` and picks the nearest eligible
island. At the old scale that was a mild preference; at this one it is close to
a prohibition on ever leaving home. Making the AI willing to mount a long
offensive is the fix for the two stalled seeds, and it is a tuning change to
take deliberately rather than smuggle in with a rescaling.

### Fallout in the tests

Four tests failed on horizon rather than on behaviour — a fixed budget of forty
days that a voyage now outruns. Each derives its budget from the actual passage
now, so the next rescaling will not break them.

One failed on behaviour, correctly: *"sends the order to the quickest island,
not the nearest"* put eight yards on the farthest island of the map and
expected the plan to use them. Eight yards save 36 days of building and no
number of yards saves 150 days of sailing, so the near island genuinely wins
now. The rule is still right and still tested — the many yards moved to an
island where the extra passage is worth paying for, and the sums are worked out
in the test rather than assumed — and its other half got a test of its own:
a yard on the far side of the world is not a yard you can use.

## Four errands, named for what they are (19 September)

*"Rename these missions as follows: Recruit / Command [location] / Command
[Fleet1, Fleet 2, Fleet 3, etc for each fleet on location] / Espionage. Cut %
chance."*

**Recruit**, not "Signing on". The in-world phrase reads well in a sentence and
stays there — an island still keeps an open table and people still sign the
articles — but this is a label on a button beside Espionage and Command, and a
label wants the word for the job. Renamed in `MISSION_LABEL`, so the log, the
crew card and the island's own section all moved with it rather than three
screens disagreeing.

**Command Freeport**, not "Command the island". The line under it already named
the fleet, and two postings that read differently for no reason are two things
to work out instead of one. The fleet lines lost their article to match:
*Command Home Fleet*. One per squadron lying in the harbor was already how it
worked — the screenshot showed one because there was one.

**Cut % chance.** The line used to carry two figures: the odds of getting
through the island's watch unseen, and the odds of the work coming off once
nobody had. The reasoning for showing both still holds — a raid on a loyal
capital is a bad idea because of the getting in and out, not because of the
work — but that is a rule to feel, not a pair of numbers to read off before
spending a crew member.

The parley bands stay. A band is a judgement rather than a percentage, and it
is the one thing on the sheet that says which island will actually listen. The
sim is untouched: `missionOdds` and `foilChance` still settle every errand and
the espionage report still says what happened. This is only what is shown
beforehand — and with it went `bestOf`, the whole reason the sheet was
recomputing the party's best hand on every tick of a checkbox.

## The idle count was right; the island could not say which (19 September)

*"This construction yard is making something so it's not idle. Shouldn't be
active on idle buildings filter."*

### Reproduced before changing anything

Swept 15,726 island-days across five seeds, four hundred days each, looking
for any island where `idleFacilities` returned more than zero for a kind of
works while one of that kind was building. **Zero cases.** Then built Sean's
Firewatch by hand — an island holding both a construction yard and a slipway —
and set the yard to work:

```
before      yards 1  drills 0  slips 1
yard busy   yards 0  drills 0  slips 1
+blockaded  yards 0  drills 0  slips 1
```

So the arithmetic was never wrong. The yard dropped out the moment it took the
job, whole kind at once, which is the *one task per type per island* rule doing
what it says. The 1 on Firewatch was the **slipway** standing empty beside it,
which the panel showed offering a Swift at 45 gold.

I also checked the blockade, since Firewatch was under one: a blockade stops an
island earning, not building, so a slipway behind one still wants an order and
lighting it is right.

### What was actually wrong

The mark can say *how many* and never *which*. The moment two kinds of works
stand on one island the count stops being attributable by eye — and the panel
put the busy one at the top of the list, so the first thing Sean saw on opening
the island was a yard plainly at work under a filter that had said "idle here".
He drew the only conclusion the screen supported.

So the answer goes where the question is asked. A works the count is about
carries an **Idle** tag, and the idle kinds sort to the top of *Order something
built*.

The tag asks `idleFacilities` — the same function the chart mark calls — rather
than re-deriving idleness from whether the card has an order. That is the whole
point: a tag that said Idle where the chart disagreed would be worse than no
tag, and deriving it twice is how that happens.

### And a test that says the arithmetic was right

Pinned in `layers.test.ts`, because the reasoning is not recoverable from the
mark. It searches seeds for an island holding both kinds rather than skipping
when the default map does not deal one — a test that quietly skips has stopped
guarding anything — and it checks the blockade case in the same breath.

Verified non-vacuous by deleting the `if (ofKind.some((f) => f.building))` line
and confirming the suite goes red.

## The reference stops being a manual (19 September)

*"Move all the ship game info stuff to glossary and rules sections. Goal is to
keep game clean and minimize text blocks but add ℹ️ info that links to
encyclopedia or rules or glossary when needed."*

### Thirteen sections moved

Seven off the Ships page — the three cannon, armor, size and speed, an action
at sea, choosing a target, breaking off, bombardment — and six off Locations.
Both pages are a shelf of pictures you scroll until you find the thing you came
for, and a manual between the pictures and the reader is a manual with a
gallery in it. The rules did not get worse by moving; they got findable, and
the pages they left are now the length of what they list. **Ships is a grid and
nothing else. Locations is a grid and nothing else** — *"Keep this just a list
of all locations. And thumbnail image."*

The unit entries needed no change: the ship sheet was already stats and a
flavour line, with the stat-repeating prose cut two batches ago.

### ℹ️ where the paragraph used to be

One line, not a block, and it carries a label rather than a bare glyph — a lone
ℹ️ says there is something to read and not what about. Ships has two, Locations
three, and the three stat groups on a ship's entry each point at the rule that
explains them.

**It did not work when I added it, and the reason was old.** A lookup at a
particular entry only scrolled on the four unit pages; every other page bailed
out before looking. So the role tags on a crew member — which have called
`lookUp('glossary', glossaryAnchor(role))` since they were built, against a
Glossary that puts `enc-<anchor>` on every row to receive them — have been
landing at the top of a long page for their whole life. Fixed first, because
the ℹ️ marks go the same way and were not worth adding over a broken landing.

### How to win, first and large

*"Add at the top of rules in big box 'how to win'."* It was four fifths of the
way down the page under a heading the same weight as "Not built yet", which is
a strange place for the only thing in the game you are trying to do. Brass
border, larger type, and **your own side first** whichever you are playing: the
first line is what you are doing and the second is what to stop.

### Reef-folk will not sign Crown articles

*"Move all reef folk and urskin to confederacy only crew."* The Urskin already
were. The Reef-folk were the gap, and the bible had been saying otherwise for a
week — §3 calls them the Confederacy's best admirals and says the Crown held
them on oar-benches under an indenture it has never apologised for, while the
rule let a Crown recruiter sign Maren Quist straight out of the pool. Lore the
code does not enforce is decoration.

**Noticed and not changed:** §3 also says the Hushed are *"bound to the Crown by
an old bargain"* and `PEOPLE_ALLEGIANCE` does not say so, so Sable can sign
either way. Same class of gap; not asked for, so it is named here rather than
fixed quietly.

### Garrisons counts, and grades nothing

*"Change garrison filter to be more like production. Just tell me the number
all in same size font. No dots."* It carried a size band as well — his own
ladder of 14 September — and the ladder was right while the mark was only a
dot. Once the numeral arrived, on the same day, the band was saying in a second
and vaguer channel the thing the numeral said exactly: a big 4 and a small 2
are a 4 and a 2. `garrisonBand` stays, because the island panels still grade a
garrison in words; only the chart has stopped.

**Available land still bands**, because he named Garrisons and only Garrisons.
It is now the one counted layer that does, which is either a deliberate
distinction or the next thing to cut.

### A tutorial that teaches the loop

*"Doesn't need to be rules crazy. Just show a newbie how to play."* Twelve
cards down to seven. The twelve were teaching the game — allegiance bands, what
each filter draws, a Fort against a Boom — which is a manual, and the game now
has one. These teach the loop and nothing else: open an island, send somebody,
build something, start the clock, read the Log. The last card says where the
rest is rather than being it.

## The sheet, re-read (19 September)

*"I made more ship changes... I updated doc with new changes and damage
calculations."*

### What actually changed

Diffed the whole roster tab against `combat-ships.json` before touching
anything: **all 24 hulls matched field for field, zero diffs.** The change is
one addition — `CFS-URW-R3-01`, the **Urskin Whaler**, a Medium retrofit at
Confederacy R3. She is the ship he said he would invest back when the Gigantic
hull was renamed the Goliath to free the name, and her art has been on disk
since that day.

The damage calculations turned out not to be a rule change. The Combat
Simulation Rules tab matches `navycombat.ts` exactly — the gun profiles, both
accuracy matrices, the armor formula, the phase order, the 30% exchange stop,
the targeting algorithm, the retreat volley. Nothing needed editing.

### The import found two things the code had assumed

**Two hulls may share a research rung.** The validator refused the import:
*"R3 is already taken by CFS-TEM-R3-01"*. That was my inference from a roster
where it happened to hold, and the sheet says otherwise on purpose — its own
Roster structure note reads *"research order establishes progression, not
strict replacement"*. So it is a warning now, not an error. It stays a warning
because a collision typed by accident looks exactly like a pair placed on
purpose, and only the sheet knows which.

**The two navies are no longer the same length.** Thirteen Confederate hulls to
the Crown's twelve. The test that pinned them equal now pins the difference,
because the sheet's stated contrast is *"the Confederacy favors asymmetric
specialists, retrofits, raiders"* and a retrofit is exactly what she is.

The guards did their job on the rest: she was caught with no flavour line (and
falling back to Design Notes, which are stats), and caught missing from the
encyclopedia bridge — where the comment written when she was unhooked said *"she
gets mapped the day she lands."* She has.

### And a cross-check worth more than the import

The sheet grew a **Combat Derived Stats** tab: for every hull, what each gun
type scores against her, and what her own battery averages. That is the same
arithmetic `navycombat.ts` does, worked independently in another tool — the one
check available that is not the engine marking its own homework.

It is now `src/data/combat-derived.json`, copied verbatim, and a test compares
it hull by hull: twenty-five ships × three gun types for accuracy, plus every
volley column and every combatant type. Verified non-vacuous by nudging one
matrix cell by a single point, which fails it and names the ship.

**One correction to my first reading of it.** The volley columns are labelled
*"pre-armor average damage"* and I assumed hit chance was in them. It is not:
the Wayfinder's two light guns come out at 42, which is 2 × 21 flat rather than
85% of it. The column measures what a hull *throws*, not what lands — the right
yardstick for comparing two batteries, and emphatically not expected damage.
The test says so where it could mislead the next reader.

## The playtest bug list, second pass (19 September)

Sean's Confederacy run, days 1–150. Bugs 1, 2 and 4 went in the first pass;
this is 3, 5–12. Two of them turned out to be worse than reported and one of
them reverses an instruction of his, so both are called out rather than
buried.

### One log, two sides (#3)

Every dispatch the game writes goes into the same feed, whoever it happened
to. Anything phrased in the second person therefore has to ask whose news it
is first, and three writers had not:

- A Crown settlement read *"there are people on it now, and they are yours."*
- A leak out of a Crown island was filed as the player's **loss**, in the
  third person, when it was the player's own **intelligence**.
- An action fought against a creature alone drew a full crest for the faction
  that never sailed, with nothing lost — which reads as an enemy fleet
  standing off untouched. `BattleReport` carries the creature now, the way the
  battle sheet already did, and the card draws only the sides that were in the
  water.

### An island with nobody on it (#5)

Three symptoms, one flag. `resolveLanding` set `uprising` from whether the
garrison it left behind met what the island would demand — a rule about
whether the *islanders* will stand for it. On an uninhabited rock there are no
islanders. So Coralhome came up MUTINY, its assault report said *"the people
did not want this"*, and it dropped off the build picker, which hides islands
in mutiny — taking the rock off the list of places you can settle, which is
the one thing you take a rock for.

### Filed under the port they left (#6, #8)

`locationSystemId` only moves when a boat touches a beach, so for the whole of
a passage a crew member is still standing, on paper, at the island their
squadron sailed from: in its crew list, in its idle-hands count, in its Reach
tally, offered as a companion, and catchable if it fell. Fleets were already
right — `isAtSea` keeps a sailing squadron out of every harbor — and people
were not. `atSea` and `ashoreAt` answer "who is actually here" and every such
question goes through them. `locationSystemId` itself is untouched: half the
game reads it, and where somebody sailed from is the honest answer to a
different question, which the fate lists want.

The badge is the same mistake one level up. An errand is a passage and then a
fortnight ashore; `on_mission` covers both and the badge printed the passage's
word over the whole of it.

### The pool that had not run out (#11, and Sean's #27 and dev #5)

**Worse than reported.** The notice *"There is nobody left in the Seven Seas
to sign"* was reading the unaligned who are **ashore**, and the roster arrives
across the whole war. Measured over six seeds: eight unaligned, turning up on
roughly days 1, 1, 70, 135, 205, 275, 350 and 425. So the pool is empty for
most of the war by design, and the notice fired the first time a player caught
up with it — telling them on day 80 that five people still to come were never
coming. Signing on then correctly reappeared when the next one landed, which
is the contradiction Sean saw on day 107.

His two balance notes about recruiting dying are the same defect wearing a
different hat. The verb was not dying; the game was announcing that it had,
and a player who believes it stops using it. Whether the ~65-day gaps between
arrivals are the right shape is a separate question and his to answer — the
message is fixed either way.

### Two boats on one errand (#12)

Warned, not blocked. The errand sheet names whoever of yours is already at it,
and says so more plainly for the five where a second is simply wasted: signing
on, a rescue, an abduction, research, a posting. Two boats arguing the same
parley is a real tactic, and which of those the player is doing is theirs to
decide.

### People who are not in this war (#9)

The bible has seven a side; the opening draw seats four and five, and the
undrawn sit the war out entirely — they are not put in the recruit pool
either, so no amount of signing on produces them. The encyclopedia lists the
whole cast, which is what a reference is for, and has stopped flying your flag
over somebody who was never drawn.

### A chain counted before it was charted (#10)

A real leak, and a wider one than the single "Unaligned 1" he caught. Yours /
Unaligned / Theirs / Ashore, the mutiny badge and the mean allegiance were all
taken over every island in the Reach, charted or not. They count what has been
charted, and a line says how many islands are left that nobody of yours has
been to — under-reporting silently would have been the other half of the same
bug.

### The clock behind a pop-up (#7) — and a rule of his reversed

Sean, 18 September: *"combat is only clock pause. Unless player pauses."* Sean,
19 September: *"The clock keeps running behind pop-ups. Days pass while a
report dialog is open (Day 30 became Day 34 on one dialog)."* Those are not
compatible and the later one wins, but the earlier one was given against a
card stack that could not have carried it: dismissal used to mark only the
dispatches captured in the render that drew the card, so at Fast a card
replaced itself endlessly, and a clock held by one would have been a clock
held for good. That was the first pass's fix; the hold is safe on top of it.

Three things hold the clock now and nothing else: an action your ships are in,
a dispatch that interrupted you, and an errand waiting on your answer. A card
you opened yourself out of the Log does not, because that is somewhere you
went to look at something — Sean's own distinction, and the reason no
sub-screen holds it either.

## Fleet Roster v3 (19 September)

*"Check google sheet for any changes to ships or rules."*

There is a **new sheet**, not an edit to the old one: *Master of the Seven Seas
— Fleet Roster v3*, created the same afternoon, which says in its own header
that it **supersedes v1/v2**. The old sheet is untouched since the morning's
import, and still carries the Combat Simulation Rules tab, which v3 does not
reproduce.

### What changed, and what did not

**Every one of the 25 hulls changed.** Same ids, same names, same 25 ships.

- **Guns rebased on the Royal Navy rating system** — *"1st rate 100-120 / 2nd
  90-98 / 3rd 64-80 / 4th 48-60 / 5th-rate frigate 32-44 / 6th rate 20-28 /
  sloop 16-18 / gun-brig & cutter 6-14."* The Majestic goes from 36 guns to a
  1st rate's 104; the Sovereign from 11 to a 3rd rate's 74. Roughly a tripling,
  and a new **Class** column names the rate.
- **Hulls rescaled four- to ninefold.** Majestic 1,600 → 13,900. Goliath 1,800
  → 14,000. The tier bands moved with them.
- **Gold, build days and maintenance rebalanced**, on two stated rules:
  maintenance is 1% of build gold a day, and build time is one day per gold "on
  rate".
- **Gun multipliers are new in the pricing model**: Light ×1.0, Long ×1.25,
  Heavy ×2.5, which is what let the gun counts triple without every hull
  repricing.

**Untouched:** Speed, Size, Armor, Bombardment, Troop Capacity, Repair Rate —
and the whole combat engine. The accuracy matrices, the gun dice, the armor
formula, the phase order and the 30% Exchange stop are not in v3 and still
match `navycombat.ts` exactly. `navycombat.ts` was not edited.

### Verified three ways before it was trusted

A transcription of 25 rows × 24 columns is exactly the sort of thing that goes
wrong silently, so none of it was taken on faith.

1. **The sheet's own arithmetic.** Long + Heavy + Light equals Total Guns;
   Total Guns equals the rate in the Class name; Gold ÷ Ref Cost equals the
   stated Price Ratio; the ratio falls in the band of the stated letter. 25
   rows, four checks, zero mismatches.
2. **The Combat Derived Stats tab against the engine.** `derived.test.ts`
   already compares the engine's hit chances and volleys to the sheet's table
   hull by hull. It passed on the new table **without a line of engine change**
   — which is the proof that the rules did not move, rather than the
   assumption.
3. **v3's own ten published 5,000-trial matchups**, against
   `lab/v3check.ts` (new). The engine reproduces all ten, worst gap **2.2
   percentage points** — and the two that are not deterministic, Majestic vs
   Coral (84.6/1.2/14.2 published, 86.1/0.4/13.5 measured) and Interceptor II
   vs Blackfin (83/4/13 against 85/3.5/11.3), are inside Monte Carlo noise.

Two different tools, written from the same specification by different hands,
agreeing to two points. That is the strongest check this project has.

### What v3 stopped publishing, and what was done about each

Role, Design Notes, Status, Combatant Type and the four intermediate pricing
columns are gone from the sheet. Rather than let "whatever was in the file"
decide:

- **Role** ← the new **Class** column, rate name with the gun count stripped.
  The Majestic reads *1st rate* now.
- **Status** and **Combatant Type** keep the last value the sheet published.
  Nothing in v3 contradicts them and neither is a stat the rebase touched.
- **Design Notes is dropped.** Every line of it quoted the stats it was written
  beside — *"No Armor; 300 Hull; 2 Light Guns"* — and the rebase changed all of
  them. Carrying it forward would have put wrong numbers on screen through the
  flavour fallback. `ship-flavour.json` has a line for all 25 and a test that
  says so.
- **The pricing working** (Capability Points, Base Reference Cost, Synergy %,
  Weakness %) is left out. v3 publishes the result and not the method.

### Repair stops being a percentage

v3: *"Repair is a BETWEEN-BATTLES stat (never during combat) and displays to
players as Slow/Normal/Fast/Very Fast, never a percentage."* The engine already
never repaired inside a round. The **encyclopedia was showing "1.0%/day"**, and
that was the one piece of back-end math that had leaked past the rule the sheet
has always had about hiding it. It shows the sheet's own word now; the bar still
moves with the fraction, so the ordering on screen is the real ordering. The
loader warns if a word and its percentage disagree — all 25 agree.

### Two things found on the way

**The Urskin Whaler's painting was never wired up.** It has been on disk since
16 September. The slug was held by the Gigantic hull until that was renamed the
Goliath on the 19th, and the mapping did not move back with the painting, so her
entry has been drawing a silhouette. Fixed.

**Four tests had v2 numbers baked into them** — the Majestic's guns, the
Marauder's maintenance, the Swift's hull, and "the Goliath leads the
Confederacy's Heavy Guns" (she does not any more; the Coral-Class carries 50 to
her 40). Rewritten against the crowns v3 states in its own header, which is
better than inferring them. One of those rewrites failed first time and was
right to: I read *"Coral-Class 102 guns, highest broadside (3,192)"* as a gun
count, and the crown is the **damage** — the Majestic wins the gun count 104 to
102 while throwing 3,150, because Heavy guns are 4d20 against everything else's
2d20.

### One new warning, which is the rule working

The **Sovereign** now trips `Early-game power`: a 3rd rate of 74 guns among the
four hulls the Crown opens with sits top-tier in Heavy Guns, Light Guns and Hull
at once. The design rule asks for *"major drawbacks such as poor efficiency,
fragility, Slow speed... or production constraints"* against exactly that, and
she has three — Slow, 1,940 gold, and 700 days on the stocks, the second-longest
build in the game. The validator can see the capabilities and cannot see the
counterweights, so it says so and a reader decides. Pinned alongside the Whaler's
shared R3 rung so a third warning cannot appear unnoticed.

### Measured, and for Sean to rule on: battles got longer

The locked rules set a duration standard — *"Evenly matched battles should
usually resolve in 1-3 player-visible Combat Exchanges."* v3 does not restate
it, and v3 moves away from it, because the hulls were rescaled harder than the
guns. Mirror duels, 1,000 trials each, before and after the same day:

| Mirror | v2 | v3 |
|---|---|---|
| Majestic | 3.67 | 5.52 |
| Sovereign II | 3.24 | 3.82 |
| Vanguard II | 3.57 | 4.56 |
| Tempest | 3.23 | 5.24 |
| Marauder | 1.72 | 3.49 |
| Coral-Class | 3.89 | 5.54 |
| **mean** | **3.22** | **4.69** |

Every published matchup still lands where the sheet says, so the numbers are
what Sean intends; it is the *pace* that drifted, and it was already over the
stated 1–3 before v3. Not touched — the lever the rules name for this is the
Exchange stop share, and that is a design decision rather than a tuning one.

## Naval Combat System v3 — the rules doc (19 September)

*"Updated files in Naval Combat System folder. Read everything in there. And
implement."*

The folder holds four things. Three I already had: the v1/v2 roster sheet, the
v3 roster sheet imported this afternoon, and an old JSON export. The fourth is
new and is the one that matters — **"7 Seas — Naval Combat System v3"**, a
Google Doc written the same afternoon, which *"supersedes the Sep 15 combat doc
entirely."* The roster import covered the ships; this covers the rules, and it
moves four of them.

### 1. Long Guns fall to 25% penetration

The line that does it: *"Armor-cracking is Heavy's signature alone."* A Long
Gun had been a Light Gun's dice with a Heavy Gun's penetration, which made it
the best gun in the game — first strike, full reach, and armor-cracking in one
purchase. It now takes a quarter off rather than a half. Against Armor 25 a
26-damage roll goes from 13 through to 7.

**This turned out to be a correction rather than a change.** v3's roster
publishes ten 5,000-trial matchups; at 50% penetration my engine reproduced
them to within 2.2 percentage points, and at 25% it reproduces them to within
**1.4**. Sean's published numbers were produced with 25%, so the sheet and the
engine had disagreed slightly and now do not.

### 2. Guns never hold fire

*"EVERY GUN ALWAYS FIRES at its highest-priority target; guns never hold fire
(there is no 'cannot penetrate' exclusion — hopeless targets simply rank
last)."* The targeting algorithm had an explicit viability exclusion: a cannon
that could not penetrate a hull skipped her entirely. That agrees with v3
almost everywhere, because a target it cannot hurt scores zero and comes last
anyway — and disagrees in one place, which is why the rule is written the way
it is. With overkill control holding back the only penetrable target, the
exclusion sent the gun to a hull already marked for death instead of to the one
it cannot hurt. Zero-score ranking, no special case.

### 3. The Stern Rake: four volleys, and armor counts for nothing

The largest change. Breaking off used to be a single parting volley at ordinary
penetration. v3 sets out a sequence:

> *"Volley 1 at ALL fleeing ships -> resolve damage -> update status -> surviving
> Very Fast ships escape"*, then Fast, then Normal, then Slow.

So a Very Fast hull is shot at once and a Slow one four times, which is the
whole of what Speed buys on the day it matters most. And **retreat fire ignores
armor entirely** — 100% penetration, *"raking fire down the exposed stern"* —
so the plate that makes a first-rate unkillable in line does nothing for her
while she runs.

`land` is called *between* volleys rather than at the end, which is deliberate:
that is the *"update status"* step the doc names as the hook for component
damage. When a hit can knock a ship down a Speed class, she is released a
volley later than she would have been and nothing in the sequence has to change
to allow it.

### 4. Repair's band boundary

The doc is exact where my import had guessed: *"Slow (below 1.0%/day) / Normal
(1.0%) / Fast (1.1–2.0%) / Very Fast (above 2.0%)."* Normal is the one exact
value rather than a range. No hull on the roster moves band, but 0.95%/day used
to read Normal and now reads Slow.

### What the doc settles that was open

**The duration standard was the wrong one.** This morning I reported that
mirror duels ran 4.69 Combat Exchanges against a stated target of 1–3, and
flagged it for Sean. v3 §11 replaces that line: *"mirrors average ~8 internal
rounds; capital duels 7–10 rounds; evenly matched battles resolve in a handful
of player-visible Exchanges."* Measured against the new standard, mirrors come
out at **7.6 internal rounds** and 4.77 Exchanges — which is ~8 and a handful.
The concern is withdrawn; it was measured against a superseded number.

**Mutual destruction is intended.** *"Same-class mirror duels end in mutual
destruction ~50% of the time. This is accepted; if playtests ever want messier
capital fights, the lever is initiative or crew quality — never hull or gun
counts."* Measured: 16–99% across six mirrors, mean around 53%.

### What could not be verified, and why

v3 publishes retreat costs — *"mid-game fleet ~16%; late-game slow fleet ~15%;
a lone fleeing Majestic ~41%"* — but not the **scenarios**: which hulls were
running and, far more important, which were chasing. Retreat damage is close to
linear in the pursuer's Long Gun count, so "41%" pins a chasing battery that
nothing here can recover. `lab/v3check.ts` runs plausible readings and prints
the sheet's figure beside them as a band rather than an equality: 29% / 21% /
27% against 16 / 15 / 41. The one line that *is* exactly checkable is the
first, and it reproduces exactly: an early fleet with no Long Guns between them
takes **0%**.

If Sean wants the published figures reproduced, the missing input is the
pursuing fleet in each of the three scenarios.

### And the art prompts

The two hulls still on a drawn silhouette are the **Blackfin** and the
**Ironback**, both now on a second pass. Their revision prompts are in
`art-prompts.md` with the guardrail for each — the Blackfin's tall plain black
mainsail, the Ironback's iron carapace and the fortress under fire. A standing
negative prompt goes in beside them, because the generator put a Jolly Roger on
both first attempts: **no skull, no jolly roger, no crossbones.** It is the
strongest pirate prior in these models and has to be banned by name.

## The crew tab comes off the console (19 September)

*"Cut the 'crew' tab from the bottom utility bar. Now that I think about it
'Idle Crew' is already best way to view crew anyway."*

He is right, and the screenshot makes the argument better than the reasoning
does: the Idle crew filter sits directly above the bar it was cut from, with
its own count on it.

**What the screen was for, and where each of those went.** It was an A–Z of
your people with their faces on it, and four things reach the same places
without it: the **Idle crew filter** lights the islands with somebody standing
about on them and says how many; an island's own **Crew tab** says who is
there; the **advisor** answers "who is free" with a tappable list, opening the
sheet directly; and the **encyclopedia** holds the whole cast A–Z. The crew
*sheet* — the thing the screen existed to open — is untouched and opens over
whatever you are looking at.

**One thing it genuinely costs**, and it is worth having said: there is no
longer a single view of everyone of yours at once *including the busy ones*.
The filter shows the idle; the island tabs show who is standing where. Somebody
captured, or a fortnight into an errand, is now found through the Log or the
advisor rather than by scanning a roster. If that turns out to matter it wants
a filter rather than a tab back — "crew, anywhere" on the chart.

**What came out with it.** `CharactersScreen.tsx` (197 lines) is deleted rather
than left unreachable; the `characters` member of `Tab`, its icon, and its
`terms.tabs.characters` label go with it, because a label for a tab that does
not exist is a word the vocabulary file promises and the game never says. Two
dozen dead `.crewcard` / `.crewgrid` rules go too — `.charface` stays, since
the island tabs, the errand sheet and the encyclopedia all draw people with it.
The grid is `repeat(4, 1fr) 84px` now.

**One live route needed rewiring.** The Log's "jump to this crew member" set
the tab and then opened the sheet. It opens the sheet only now, so closing it
puts you back in the log where you were reading, which is better than it was.

## Where a crew member is, on their encyclopedia entry (19 September)

*"In the encyclopedia (just for crew) say 'Ashore at [location]' /
'Commanding [fleet name / location name]' / ... 'Aboard [fleet name]' if idle.
If en route say 'Enroute to [location]'."*

One line at the top of the entry, in brass, above the role tags — the only
thing on an encyclopedia page that is about *today* rather than about the
world.

### Only your own people, and that is not a detail

An enemy officer's whereabouts is **intelligence**. It is the thing the
espionage errand exists to buy, and a reference page printing *"Ashore at
Highwater"* beside every Crown name would hand a player the entire enemy
disposition for free, permanently, from turn one. So the line is drawn for the
player's own crew and for nobody else. Measured on a fresh Confederacy game:
five entries carry it, twenty-one do not.

The unaligned are left out for a different reason rather than the same one:
signing on is set against an *island* rather than against whoever happens to be
standing on it, so where a recruit is standing is not a fact the game means
anything by.

### The one state on his list the simulation does not have

Sean's list distinguishes *"Commanding [fleet name]"* from *"Aboard [fleet
name] if idle"*. There is no such distinction to draw: `takePost` and `board`
both put an officer into `fleet.officerIds`, and both relieve whatever they
held before. **Taking a deck is the posting** — nobody rides along. So anyone
on a ship reads *Commanding*, and if he wants a genuine passenger state that is
a sim change rather than a copy change, and worth saying so rather than
inventing a word for a thing that cannot happen.

### What it says, in order

| State | Line |
|---|---|
| Captured | *In irons at Highwater* |
| Errand on passage | *Enroute to Greenholm* |
| Aboard a squadron under way | *Commanding Fleet 2, enroute to Bracton* |
| Aboard a squadron at anchor | *Commanding Fleet 2* |
| Holding an island | *Commanding Wainfleet* |
| Working an errand ashore | *Ashore at Greenholm* |
| Idle | *Ashore at Freeport* |

Captured is the one row Sean did not name, and it is there because the fallback
would otherwise have read *"Ashore at Highwater"* about somebody in a cell,
which is a lie rather than a shortening. Injured falls through to *Ashore at*,
which is true; the days left are on the crew sheet.

A companion carries no errand of their own, so they read the errand of whoever
is leading the boat — *Enroute to* the same island, which is where they are.

### Not done, and cheap if wanted

The line is on the **entry**, not on the grid cell. Forty-odd cells each
carrying a location is a lot of moving text on a page whose job is to be
scanned by face and name, and the cells already carry *people · sworn
elsewhere / not in this war*. Say the word and it goes on the cells too.

### And the art audit he asked for in the same message

Two hulls have no painting: the **Ironback** and the **Blackfin** — the two
whose revision prompts went into `art-prompts.md` this afternoon. Every other
hull on the 25-ship roster is painted and wired, and no mapping points at a
file that is not there.

## Enemy whereabouts are dated, never stated (19 September, same day)

Two corrections, both Sean's, both to the line added an hour earlier.

**"Don't say in irons. Just say Captured at location. If [I don't] know just
say captured."** Done: *Captured at Highwater*, or *Captured* where the island
was never charted — a seat you have not found is a cell you cannot name.

**"With all enemy information we always add a disclaimer it's either unknown
whereabouts or it says location and the days since last intelligence so we know
the intel is how many days old. Could be true maybe not."**

This reverses my call of an hour earlier, and it is the better rule. I had left
enemy crew blank on the grounds that their whereabouts is what the espionage
errand exists to buy. Sean's answer is that the fog is the *interesting* part
and should be shown as fog rather than hidden as a blank — so an enemy line now
always carries one of two disclaimers:

- **`Ashore at Highwater · in sight`** — you can see them for yourself this
  morning, because you hold the island, or it is unaligned and charted, or you
  have a hull or a person standing at it. Read through `sightOf`, the same
  function the island sheet runs on, so the two screens cannot disagree about
  what you can see.
- **`Ashore at Wrightsport · report 12 days old`** — read off the newest report
  of yours that had them on it. *reported today* on the day it is written, and
  *1 day old* rather than *1 days old*.
- **`Unknown whereabouts`** — no eyes, no report.

**The half that matters, and the easy thing to get wrong.** Where a report is
what you have, the island named is the **report's**, never the one they are
actually standing on. Naming the true island and hanging "12 days old" off it
would be the leak wearing a disclaimer — the player would read a stale label
and receive live intelligence. There is a test for exactly this: the officer is
moved to an uncharted island, a report places him somewhere else twelve days
ago, and the line is asserted *not* to contain the name of where he really is.

The unaligned stay blank, for a different reason than secrecy: signing on is
set against an island rather than against whoever is standing on it, so where a
recruit is standing is not a fact the game means anything by.

## The Ironback gets her painting (19 September)

The last hull but one. A captured Imperial two-decker plated over in bolted
iron, a great bow chaser over the beakhead, long barrels reaching well past her
side, shelling a clifftop fortress through snow and storm light — which is
precisely her stat block: 26 Long Guns, 2 Heavy, Bombardment 8, Armor 25, Slow,
and a ship that loses at sea by design.

Two of the three revision notes landed. The guns are right — long barrels, not
a broadside of medium cannon — and the flag came back as the **Confederacy's
own crest** rather than a stock Jolly Roger, which is the carve-out written
this afternoon working rather than the ban failing. The sails are still
red-and-white striped rather than the weathered grey patched canvas asked for;
accepted as sent, and recorded in `art-prompts.md` so a future re-cut knows
what was wanted.

**One hull left on a drawn silhouette: the Blackfin.**

## The Blackfin, and the roster is painted (19 September)

The last one. A low knife-lean corvette under a tall black mainsail, white
foresails beside it, both rails crowded end to end with small crewed guns on
carriages and not a gunport anywhere — which is what 29 light guns should look
like, and she carries more of them than anything else in the game. A prize
running for the horizon astern.

**The guardrail held**, which was the whole point of writing one: the black
main owns the frame, and the white foresails make it read as *the* signature
rather than as a dark ship. The gun arrangement is right and was the half that
mattered. Two notes did not land and are recorded rather than re-cut — the guns
read as brass cannon rather than stubby iron carronades, and the cloth is red
rather than turquoise-and-bone. Her mainsail carries the Confederacy crest
rather than being plain, which contradicts her own exception but not the
standing rule, since the crest is theirs.

**All 25 hulls are painted.** Verified in the browser rather than off the
register: 25 cells on the Ships page, 25 with a photograph in them. The drawn
silhouette is now a fallback nothing reaches, and it stays for the next ship
Sean adds.

## The second playtest pass: two fixed, one diagnosed differently, one automated (19 September)

### 1. Reyne's quoted sail — already correct, and now pinned

Measured before touching anything, because the fix for this shipped in
`d7d5f10` and Sean is reporting it as still broken. It is not:

```
powerOf(Reyne) = runner   share = 0.5
raw travelDays        = 100
preview, Reyne        = 50
preview, anybody else = 100
booked daysRemaining  = 50
```

The preview and the order agree exactly. `MissionChoiceSheet` calls
`passageDays`, which applies `passageShare`, and there is no second screen in
the game that quotes a sail estimate.

**Which leaves the question of what Sean saw**, and the honest answer is that I
cannot reproduce it and can only offer the likeliest explanation: the same
stale-shell problem he reports as item 3. It does not fit perfectly — all three
of the dev-report fixes were in one commit and he reports one of them as
working — so it is a hypothesis rather than a finding, and item 4 is now built
so the next report can settle it in one glance.

The regression test is deliberately not "Reyne is halved". It is **the preview
equals the booking, for every officer on four seeds**, because the bug was two
functions disagreeing rather than one being wrong; plus a source assertion that
the sheet calls `passageDays` and never `travelDays`, since the bug was a
screen reaching past the helper.

### 2. Silent captures — two of five paths were done, three were not

Sean was right, and more precisely right than he knew. The abduction errand —
the path he actually hit with Pryor — *was* carded. Three others were not:

- taken when an island is stormed (`fleets.ts`),
- taken up when a side has no harbor left anywhere (`advanceDay.ts`),
- **freed by a landing** — the rescue half he also asked for (`fleets.ts`).

All three now carry `notable: true`.

**The test is over the rule, not the paths.** A war sweep was written first and
thrown away: three 600-day wars with both sides machine-played produced **zero**
captures between them, so the net caught nothing and would have gone on
catching nothing after a regression. (Worth knowing on its own — the opponent
does carry people off against a human, because a human leaves officers standing
about on islands and the machine does not. That is a plausible reading of
Sean's *"Crown kidnapping is relentless"* sitting beside a machine war with
none at all.) So the test reads the sim's own source, finds every `pushEvent`
whose prose is about somebody changing hands, and requires the flag in the same
call — five today, and a sixth written next month is caught without anybody
remembering. Verified non-vacuous by removing one flag: it fails and names the
file and the call.

### 3. The stale-asset 404s — there is no service worker

Sean's diagnosis was *"the service worker is precaching old asset hashes"*.
**There is no service worker in this project and never has been** — no
registration, no `sw.js`, no PWA plugin, nothing precaching anything. The
manifest makes the app installable and does nothing else. So there was no
service-worker cache to bust, and adding one to fix a caching bug would have
been adding the exact machinery that causes them.

What actually goes stale is the **document**. An installed standalone app holds
`index.html`; that HTML names its script and stylesheet by content hash; the
next deploy deletes the hashes it is naming. The shell then asks for files that
are gone — which is precisely the symptom, and needs no service worker to
happen. (The manifest and icon paths were checked too, in case they were the
404s: Vite rewrites them correctly for the subfolder.)

Two fixes, because the failure has two shapes:

- **The bundle is gone and nothing runs.** Nothing in the app can fix this, so
  the recovery is an inline script in `index.html`, before the module: catch a
  script or stylesheet failing to load, and reload once with a cache-busting
  query. A `sessionStorage` guard means a genuine outage shows an error rather
  than a reload loop.
- **The bundle loads but is not the current one.** `build.json` is emitted
  beside the bundle **unhashed**, so it is always at a known URL; the app
  fetches it with `cache: 'no-store'` and reloads once if the server's build id
  disagrees with the one compiled in. Keyed to what the server is serving, so a
  second deploy while the tab is open is still caught and a reload that changes
  nothing will not try again. Silent on failure — offline is the normal reason
  it cannot be answered, and a game that will not start because it could not
  check its own version would be the worse bug.

### 4. A version that cannot go stale

0.4.0 → **0.5.0**, and the menu reads `Version 0.5.0 · build 202609192152`. The
version is hand-set and says what was released; **the build id is stamped by
the bundler and changes on its own every time**, so two deploys can never look
alike in that line however often the version is forgotten — which is the actual
thing Sean needs for QA. It is the same id `build.json` carries, so the number
on the screen and the number the freshness check compares are one number.

---

## The last Star Wars names come off the chart

*19 September 2026. Sean: "The island names in `src/data/` still contain Star
Wars planet names carried over from the Rebellion conversion… Do not assume a
name is clean because it sounds invented. Check it."*

### The audit did not need guessing

The obvious way to do this was to read sixty-three island names and decide, one
by one, which of them sounded like a Star Wars planet. That is exactly the
method that would have missed the ones that matter, and Sean said so in the
brief.

It turned out not to be necessary. `seven-seas-world-bible.md` §13 is the
conversion table from the original packet, and it carries **the original planet
in the left-hand column beside every island**. So the audit is a lookup, not a
judgement: every island's provenance is written down, and the question for each
one is only whether the conversion went far enough.

Sean flagged five. The table found **thirty-one**, and the largest finding was
one he had not suspected:

> **Whalers' Reach is the Corellian system, almost intact.** Wrightsport←Corellia,
> Duroso←Duros, Dralla←Drall, Selona←Selonia, Talusa←Talus, Tralosa←Tralus.
> Eight of its nine islands were light respellings; only Wrightsport had
> actually been converted. Duroso's note — *"the best navigators alive"* — is
> the Duros species' defining canon trait, carried straight over.

Others were the same shape: the note gave the original away as loudly as the
name. Tierfon→Tjerfon is *"a cutter base, of sorts"* and Tierfon was a Rebel
fighter base. Ryloth→Rylo Salt is *"one side never sees dusk"*, which is
Ryloth's tidal lock, and *"a salt-slave island"*, which is the Twi'leks.
Umgul→Umgulla is *"gambling and racing"*, which is Umgul's blob races.
Bothawui→Bothaway is *"the Rumor Guild, who sell to both sides"*, which is the
Bothans. Sluis Van→Sluysvaan is a shipyard in both worlds.

Three were flagged and **kept**, because a shared syllable is not a borrowing:
Basilisk Rock (basilisk is an English word and HMS *Basilisk* was a real ship of
1695), Chaswell, and the derived-but-plainly-English set — Gorley, Avermere,
Sievern, Ulverne, Yarrow Minor, The Kettles, Denby Cay, Chandler's Rest.

### The rename must not move the world, and nearly did

Sean's rule was *"keep each island's existing note, role, coordinates and
mechanical data exactly as-is. Only the name changes."*

The code did not allow that. Three separate places seeded off the island's
name — its archetype in `galaxy.ts` (which decides its painting **and feeds
`groundOf`, so its forests and gold veins**), its creature in `creatures.ts`,
and its garrison mix in `troops.ts`, each computing `[...name].reduce(char
codes)`. Renaming thirty-two islands would have silently re-rolled the terrain,
the deposits and what lives in the water across most of the map. The first test
run said so: thirteen failures, only six of them about names.

So the seed is **written down** instead. `reaches.json` carries a `seed` per
island, frozen at the value that island already had, and `System.seed` carries
it into the sim; the three readers take it and fall back to the old name sum for
a hand-built test system. A label can no longer move the world, this time or the
next time.

**Verified rather than asserted.** A scratch harness dumped every island's
archetype, room, population, control, garrison, deposits, creature and
coordinates across five seeds, with names mapped through the rename, and diffed
the pre-rename world against the post-rename one: **identical, 320 rows, five
seeds**. Then the freeze was deliberately broken and the same diff re-run:
**416 differing lines**. The check sees what it claims to see.

### The Aldermain

Canon v4.0 §3 settles the map change: the island in Sovereign Reach called
Highwater becomes **the Aldermain**, and Highwater stays as the walled capital
city standing on it. That is what shipped — the node is the Aldermain,
`capitalIslandName` points at it, and `hqLabel` stays *Highwater*, because the
seat the interface names is the city.

It also makes the data honest about something that was nearly true already:
`reaches.json` marks Highwater, Gorley and Ballmoor as ports and its own comment
called them *"the three port cities on Sovereign Reach's great island"* — a
great island with no name. It has one now.

The island's note lost its Black Tide clause in the same move, because v4.0 cuts
the Tide entirely and the note was *"carved with the name of every island the
Tide has taken"*. The Crown's faction blurb went the same way. Those two are the
whole of the Tide sweep in this pass; the rest of it — Blackwater's backstory,
Ros Carrow's island, the Deep, `docs/lore.md` — sits behind v4.0's own open
questions and is not ours to invent.

## Six from the 20 September play session

Sean, after playing: the drag is clunky, research ships are in the fleets, the
Confederacy has three Swifts too many, the music is broken, open with one of
each yard rather than two, and give the unaligned islands some infrastructure.
Five of the six landed. The music did not, and the honest reason is below.

### The drag: three faults, one mistake

The gesture was already *press and hold and move* on paper. What it did was
count travel: while a tile was held, crossing 0.6 of a tile width on whichever
axis had moved further called `order.up` or `order.down` once and reset the
origin. Everything wrong with it follows from measuring distance instead of
looking at where the finger actually was.

- **The board would not scroll.** `touch-action: none` sat on every orderable
  tile so the browser could not claim the gesture. A board is almost entirely
  tiles, so almost nothing on the screen scrolled and the only way down a long
  list was to find a gap. It is `pan-y` now — the board scrolls normally until
  the hold lands, and the drag pins the page itself, for exactly as long as it
  runs, with a non-passive `touchmove`.
- **Nothing followed the finger.** The tile scaled up six per cent and stayed
  where it was while the list rearranged underneath it. It is lifted and
  translated now. The shift is computed against the *cell wrapper's*
  rectangle, which is never transformed — so after a reorder it re-reads
  correctly with nothing to rebase.
- **A grid was treated as a line.** The board is two across, three when wide.
  Dragging a tile straight down one row moved it one place and put it in the
  wrong column. The target now comes from the neighbours' real rectangles:
  nearest centre wins, by a margin that stops a finger resting on a boundary
  from rattling the tile between two places.

Two more only a driven gesture would have found, and both were found that way —
a scratch page mounting the real `Slot` in a board, driven with a real pointer:

- **Pointer capture does not survive the reorder.** `setPointerCapture` is the
  obvious way to keep the gesture while the finger crosses onto a neighbour.
  The first thing this drag does is reorder the list; React moves the node; and
  moving a node in the DOM drops its capture. Measured: the tile stepped
  exactly one place, went deaf, and — because the `pointerup` then landed on
  whatever tile was now under the cursor — never put itself down, staying
  lifted on the board. Everything listens on the document now, which cannot be
  reordered out from under a listener.
- **Dropping a tile on another tile opened that tile.** The click after a drag
  goes to the nearest common ancestor of the press and the release, passing
  through whatever is under the finger on the way. The tile's own `moved` guard
  only ever covered a drag that ended where it started. The click after a real
  drag is now swallowed once, at the document, and dropped after 350ms in case
  no click follows.

### The opening

`START_YARDS`, `START_TRAINING` and `START_SHIPYARDS` all go 2 → 1. The
Confederate Home Fleet goes from four Swifts, a Tempest and a Brig to one
Swift, two Tempests and a Brig — 39 guns in four hulls against the Windward's
44 in four, where it had been 44 in six. Slightly lighter and no longer a
swarm, which is the trade for Sean's *"1 swift is all the swifts you need"*.

### Works on the unaligned islands

A fifth of settled unaligned islands carry one of each of the two building
yards, the slipway and the Fortress; a twentieth carry two. Three things had to
be got right and only the first was obvious.

**The rolls come off a stream of the island's own**, keyed on the island *and*
the world, never off the world generator. Four extra draws per settled island
taken from the shared stream would have re-rolled every terrain, deposit,
creature and garrison downstream — the same trap the island rename hit on 19
September, and the reason `System.seed` is frozen at all. Keyed on the island
alone, which is what the first cut did, every world gave the same island the
same shipyard: there are sixty-one islands and one frozen seed apiece, so the
rate would not settle however many worlds were sampled.

**The rates were a third of what was asked for** until the works were given the
berth they stand on. A settled island is mostly spoken for already — deposits,
and the mills already on them — so the roll was being won and then thrown away
for want of a plot. Measured at 0.09–0.12 per island against the 0.30 Sean
specified; the opening deal makes the same allowance for the two sides' own
islands, and for the same reason. It measures 0.31–0.33 now, one at 20% and two
at 5%.

**And mulberry32 is a poor generator in its first few draws from neighbouring
seeds.** Four independent one-in-five rolls off a freshly seeded stream came out
as two good rolls and two holding hands — the fourth landed on 8% and 8% where
it should have been 20% and 5%. `mixSeed` (the murmur3 finaliser) and a
two-draw warm-up fixed it. Worth knowing for anything else that wants a stream
per island.

**The works are dealt after the two sides take their islands, not during.**
Every island is briefly unaligned while the world is being made, so running it
in the generation loop put yards and walls on the eight or ten islands the
sides were about to be dealt — and the upkeep opened **both sides insolvent**,
the Crown at 91 against an unchanged income of 83. An island is only neutral
once the dealing is over.

**The Fortress fires.** `fortGuns` and `fortsOf` refused any island the two
sides did not hold, which was fine while only they could build one. A wall that
cannot shoot is not a wall, so the guard is gone and the `f.owner ===
system.control` test — which was always the right one — carries it, with
`handOver` moving the deed when the island changes hands. So a landing on an
island that rolled a Fortress has to knock it down first, and parley gets more
attractive against conquest.

### What the changes cost

Forty machine-played wars on the same seeds, before and after:

|  | before | after |
|---|---|---|
| result | Crown 17 — Confederacy 23 | **Crown 17 — Confederacy 23** |
| median length | 612 days | 756 days |
| Crown at the end | 19.1 islands, 18.3 hulls, 568 gold | 19.7, 17.9, 876 |
| Confederacy at the end | 8.6 islands, 11.0 hulls, 757 gold | 8.9, 9.5, **1,840** |
| Lords in irons | 1.30 of 3 | 1.43 of 3 |

The war balance did not move at all. Two things did: wars run about a quarter
longer, and both sides end much richer — the Confederacy on 1,840 gold against
757 — because with one construction yard and one slipway there are half as many
places to put it. That is the existing gold-hoard problem made worse rather than
a new one, and it is worth a look before the yards change is called finished.

The baseline run also turned up a rule the harness had been reporting broken
29,400 times: `crown-seat-moved` still expected the Crown's seat to be named
Highwater, which the island rename made false on 19 September. A harness that
always reports a broken rule is one nobody reads when a rule actually breaks.
It reads `capitalIslandName` now, and forty wars report no rule broken at all.

### The research hulls, and where they actually were

Nothing either side opens with has ever needed a grade of shipwright craft —
checked over twelve worlds before changing anything. What was wrong is the
Build sheet, which listed `shipsFor(faction)`, every hull the side has designs
for, and refused the locked ones on the way out with a message. A hull you
cannot lay down should not be on the list you lay hulls down from; it is
`shipsAt(you, gradeOf(state, you))` now. Both halves are pinned in
`openingfleet.test.ts` so neither can drift back.

### The music, which is not fixed

I could not reproduce it, and say so rather than claim otherwise.

What was checked, in a browser, against both the old build and the new: the two
mp3s are committed and not ignored; Vite emits them into `dist/assets`; the
request for the right side's theme goes out; `decodeAudioData` succeeds; the
buffer source starts (240.7s, looping 28.9 → 182.8); and the music gain ramps
to 0.55. That holds on a cold start, on a first toggle, and on a reload with
the preference remembered — every path I could construct plays.

One real fault was found and fixed on the way, and it is worth keeping even
though it is not the reported symptom. `setTheme` needs an AudioContext, the
context is only built inside a user gesture, and `musicFor` is what stops a
theme being laid down twice — so a theme asked for before the first gesture was
turned away at the first guard and *never asked for again*. Today that is
masked by the player's side changing after the gesture, which re-triggers the
effect; it is an accident of ordering, not a safeguard. `ensureTheme` retries
when nothing is actually sounding, and every path that starts or resumes the
engine goes through it — which also means the written-score fallback comes back
after the tab has been in the background, which it previously did not.

The likeliest remaining cause is the one a desktop browser cannot show: on iOS
the hardware silent switch mutes Web Audio, and that would mute the sea and the
bell along with the music. Which is the question worth asking, and it is in the
reply rather than guessed at here.

### And a sweep that came with the rename

`inprose.test.ts` went red on a seed where a parley happened on an island named
*The Terraces* — *"Sable makes no headway on The Terraces."* `inProse` lowercases
a leading "The " for mid-sentence use and had been applied in about six places
out of a hundred and eight. It was passing on the luck of the draw. All 102
remaining sites now use it, restricted to variables that genuinely hold a
System.

## The chart knew more than the island sheet

Sean, 20 September, with a screenshot of the World Map under the Fleets filter:
*"When I look at map it says imperium fleet in the wreckers reach but when I
click on the island it says no reports."*

Both screens were telling the truth about their own source, which is the tell.
`layers.ts` had:

```ts
case 'fleets': {
  const hulls = fleetsAt(state, system.id)
    .filter((f) => !isAtSea(f))
    .reduce((n, f) => n + f.ships.length, 0);
  return hulls > 0 ? { lit: true, count: hulls } : DARK;
}
```

Every hull, both sides, live, on any charted island. The island sheet has read
enemy ground through `sightOf` since the watch went in; the chart never did. So
the Crown's Windward Squadron was legible on the World Map from day one and the
whole point of an espionage errand was available for free, on the map, in a
numeral.

The rule now matches the sheet exactly:

- **yours** — always, and a squadron of yours lying at an enemy island is also
  what makes that island `eyes` in the first place;
- **theirs, `eyes`** — live;
- **theirs, `report`** — what `Intel.harbor` recorded, at anchor rather than
  inbound, and it does *not* update: a squadron that has since sailed is still
  shown lying there until somebody looks again, which is what a dated report
  means;
- **theirs, `none`** — nothing.

**Production leaked the same way** and was not reported. An island earns what
its works earn; works are the first thing the sheet stops showing on unreported
enemy ground; so a number on the chart adding them up answers the question the
errand is for. Whose flag flies is public and stays the gate; the sum is now
taken off `knownIsland`.

That function already existed, written when the Reach list was counting
companies off the live world, and carries the note that it is *"the one call
anything outside the island sheet should be making about an enemy island's
contents."* The chart had never been wired to it. Second time this exact leak
has been found in a different screen, which is why the test is written as the
general rule — *no layer lights an island with something `sightOf` says this
side cannot see* — rather than as "the Fleets layer hides the Crown". A layer
added later is covered by it.

Checked against the unfixed code before committing: three failures, the first
being the Crown's entire six-hull Home Fleet readable at the Aldermain on day
one. One fix covers both map screens, since `GalaxyMap` and `ChainMap` share
`layerMark`.

## The encyclopedia entry becomes one scroll

Sean, 20 September: *"In encyclopedia when I scroll down for more, the image
should scroll not stay static. The large image thumbnail is good but if I
scroll down I want it to scroll with me."*

`Sheet` renders header, banner, tabs and body as four siblings in a flex
column, and only the body scrolls. That is deliberate and stays: an island
sheet has four tabs about one place, and a banner that scrolled away meant
looking at a garrison with no idea whose garrison it was. An encyclopedia
entry has no tabs and is read top to bottom, so the same rule reads as a
picture that will not get out of the way.

So `Sheet` gains a **`flow`** mode rather than changing for everybody. In flow
the header and the banner render *inside* `sheet__body` — one column, one
scrollbar, the art off the screen entirely and no spacer behind it.

**The collapsed header** is absolutely placed over the top of the body, not
stacked above it, so it reserves no height and nothing jumps when it arrives.
It carries the name, the class and the close, and it is driven by an
IntersectionObserver on a one-pixel marker sitting between the header and the
art — not by a scroll handler, because the question is only ever "has this
gone past", the browser answers it off the main thread, and a scroll listener
on a long list is the one thing guaranteed to make the scrolling being
complained about feel worse. The marker sits under the *header* rather than
under the art, so the bar arrives as the name goes and the picture then
scrolls away underneath it.

**The plate** is `height: 40vh` with `object-fit: cover`, phone widths only,
and scoped to `--plate` so only hulls take it. That scoping is load-bearing: a
first cut applied the height to every entry's art and would have cropped a
crew portrait, which is square, to two fifths of a phone.

**The sections** are Economy · Defense · Handling · Firepower · Lore. Each
heading carries its own help as a small round info button, where it used to be
a full sentence of link beside the heading — *Defense · What armor stops* —
which put a longer, brighter thing on the line whose job was to name the
section. The sentence survives as the button's label.

**The bars come off the categorical stats.** Repairs, Size and Speed are names
of bands; a bar under them was an index into a list dressed up as a
measurement, and it invited a comparison against Hull's bar, which is a
different quantity. Hull, Armor, Carries and the four gun figures keep theirs,
because those are counts against the highest in the game. The ten tiles and
their order do not change, so Sean's rule of the morning — every card the same
outline — still holds.

### The crest that read as a close button

*"Remove the redundant close-like crossed-swords control from the header, or
render it as a noninteractive ship-class emblem. The × should be the only
close control."*

He is describing the Free Confederacy's sigil. It is crossed cutlasses, and at
header size, in the faction's red, sitting in its own slot at the opposite end
of the row from a grey ✕, it reads as the brighter and more important of two
close buttons. It never was a button — which is not the point, because nobody
tries a control to find out what it does.

Both of his options were tried in that order. Shrinking it to two thirds and
half the ink, hard against the title, was photographed at 393×852 and is still
plainly two crossed strokes beside a ✕. So the other branch: the crest comes
out of the entry header and the subtitle says whose she is instead —
*Conjure sloop · Confederacy*. That inverts a note from 19 September which read
*"the crest says whose she is, so the subtitle does not have to"*; it now says
the opposite, for the same reason. Every in-game sheet keeps its crest, because
the rule that put it there is about knowing whose thing you are looking at, and
a sheet that says it in words has not broken it.

### Verified at 393×852

Measured rather than eyeballed: art 341px on an 852px viewport, which is
exactly 40vh; sections in the order asked for; three info buttons, ten stat
tiles, seven bars; one crest, which is none. Scrolled to the end, the art sits
at `bottom: -167` and the header at `bottom: -509` — both fully above the body,
so nothing is reserved or left behind. The collapsed bar is up, `window.scrollY`
is still 0, the sheet's own rectangle is unchanged from where it started, and
the last lore paragraph ends 30px clear of the bottom edge. The measure comes
out at about 52 characters.

## The ship entry, built to the mockup

Sean sent a rendering of the Cutlass and a contact sheet of eighteen line
symbols. The entry is now that rendering.

**The symbols** are redrawn as inline SVG in `src/ui/icons.tsx`, to the
sheet's own stated spec — a 24×24 box, `currentColor` stroke, round caps and
joins, nothing filled. They came as a picture rather than as files, so there
was nothing to import. Taking their colour from the text they sit in is what
lets one icon serve the brass of a stat tile and the red of a section rule
without a second copy, and it is why they are line drawings and stay line
drawings: the game already has paintings and drawn glyphs, and a third
picture language that competed with either would make a stat tile look like a
unit.

**The plate runs edge to edge.** The body's 14px of side padding is cancelled
on the art rather than removed from the body, so everything else keeps it.
That is the whole difference between a plate and a thumbnail sitting in a
card.

### The line under the painting

The mockup reads *ARMORED CORVETTE · HEAVY-GUN HUNTER*. That is one hull out
of twenty-eight, so the line is **derived** rather than written out — which
also means it cannot drift from the stats printed an inch below it the first
time a gun count moves.

What she is: her armor and her rate. What she is for: read off her armament.
And the reading is by **weight of shot, not number of barrels**, which is the
whole of why it works. The Cutlass carries six heavy guns against fourteen
light. Counting barrels makes her a close-quarters raider. She is not one —
her own encyclopedia entry says *"enough heavy guns to threaten something
larger"*. A heavy throws twice what a light throws, by the combat master's own
damage table, and weighting by that lands her on heavy-gun hunter exactly as
Sean has her.

Two roles describe themselves and override the arithmetic: a survey ship is a
scout whatever she is carrying, and a razee *siege ship* is a siege ship at
eight bombardment where a second rate at eight is still a gun platform.

All twenty-eight were read before shipping. The test pins the Cutlass to the
mockup, and pins the non-vacuity of that pin — her lights outnumber her
heavies better than two to one, so a naive rule could not agree by accident.

### What else the mockup settled

- **The bars are gone.** The morning's instruction took them off the
  categorical stats; the mockup has none under Hull or Armor either. It loses
  one real thing — where a hull sits against the fleet, at a glance — and buys
  a tile that is a symbol, a name and a number. The test asserts `share=` and
  `shipstat__bar` are absent, because a bar is the kind of thing that creeps
  back one stat at a time.
- **The help mark moves to the far right** of its rule, past the heading, via
  flex `order` rather than by reordering the markup.
- **The crest comes back, as a class emblem** — the other half of his earlier
  sentence, *"or render it as a noninteractive ship-class emblem"*. Brass
  where the ✕ is red, a line drawing where the ✕ is a stroke, and it answers
  *what kind of ship is this* rather than *whose*. The crossed-cutlass faction
  sigil could not be made to stop reading as a second close button; a class
  mark never did.

One deliberate departure from the mockup: the subtitle keeps *· Confederacy*.
The mockup shows the class alone, but the emblem beside it is now a class mark
rather than a flag, so without the word the entry would not name the navy
anywhere above the lore. One word, and it costs nothing.

## A count I had been getting wrong

Installing new art for the Coral-Class Dreadnaught turned up something worse
than the painting it replaced: the hull was already painted, and so were
twelve others I had been listing as unpainted at the end of every reply for
two days.

The cause is the ordinary one. There were two records of the same fact:

- `art-manifest.json`, written by `scripts/art.py` every time a painting is
  installed, and
- the **PAINTED** markers in `docs/ship-art-direction.md`, written by hand.

The doc had fallen thirteen hulls behind, I was reading the count off the
doc, and nothing in the build compared the two. Every one of the twenty-eight
hulls has had a painting throughout.

Fixed three ways rather than one, because correcting the thirteen markers on
its own would only reset the clock:

1. The markers are **mirrored from the register**, not composed.
2. The file now **names the register as the authority** in its header, so the
   next person to read it knows which way the arrow points.
3. `shipart.test.ts` fails the build if the two disagree — in either
   direction, since a marker claiming art that does not exist is the same bug
   wearing the other face. It asserts against the *roster* rather than against
   either file alone, because the question worth failing a build over is "does
   every hull in the game have a painting, and does the page a person reads
   say so".

Checked the way the fix deserves: run against the stale doc, the test names
exactly the thirteen hulls I had misreported — Morningstar, Resolute,
Justiciar, Majestic, Brigantine, Chimera, Marauder, Cutlass, Tempest, Urskin
Whaler, Ironback, Urskin Goliath and the Coral-Class Dreadnaught.

Both new paintings are v2 and both v1 masters are retired rather than deleted,
so either can be brought back.

## COMBAT MASTER v4.2

The re-import produced exactly the six changes v4.2's own header lists and
nothing else, which is the check that matters on a generated file: Resolute
Troops 1 → 3, Majestic Repair 1.0 → 0.8% (now displays **Slow**), Tidestalker
upkeep 3.5 → 2.5, Blackfin 500 → 375 gold and C → B, Goliath upkeep 16 → 28,
Coral-Class build 900 → 1,300 days. Part 2B, an Economy Doctrine, is new.

One test fell, and it was the right one to fall: my `shipcard` non-vacuity
asserted that some hull carries exactly one troop, so the singular in *"1
troop"* was exercised by real data. v4.2 took the Resolute from 1 to 3 and she
was the last. The branch stays and is asserted in the source; the roster check
becomes "the capacities have not all gone one way", because capacity is data
and the next revision can put a 1 back when nobody is watching.

### The reef ships are built, not merely grown

Sean: *"I know the reef stuff is 'sung into existence' but these ships are
still made in shipyards and require them. The coral is part of them. It's a
mix of ship making and magic."*

Corrected in the master rather than in the JSON, per the rule at the top of
the art-direction page, in the four places the text read grown-not-built:

- **Part 2B rule 1** said *"a dreadnaught is not grown to order — it is
  WOKEN"*. It now says she is laid down like any other capital ship and then
  woken: the yard frames her, the singers bring the coral up over the frame,
  and the magic is in what grows on the frame rather than in the absence of
  one.
- **Tidestalker** was *"sung into shape in shallow Reef-folk nurseries"* and
  *"unmistakably grown rather than built"* — now laid down in Reef-folk yards
  with shipwrights framing the spine, and *framed by shipwrights and finished
  by growth*.
- **Reefwarden** was *"grown after Confederate captains learned…"* — now laid
  down, with the coral sung up over the frames for weight no free yard could
  otherwise afford.
- **Coral-Class** was *"not launched"* — now laid down in a lagoon yard over
  four years, with the singers working as the framing goes. What stays
  different is the *launching*: she is not floated out, she is woken.

This also closes a gap between fiction and mechanics that had been open the
whole time: a Coral-Class has always needed a Slipway in the game.

### The Stern Rake check stops guessing

v3 published the four retreat costs and not the scenarios. On 19 September I
searched for pursuits that reproduced them and found four, and said plainly in
the note that hitting the numbers was evidence the engine matched the sim, not
proof those were the pursuits.

v4.2 publishes the fleets. Four of six are now the sheet's own:

| | ours | sheet |
|---|---|---|
| early game (no Long Guns) | 0.0% | ~0% |
| mid-game mixed fleet | 24.7% | ~25% |
| late slow fleet | 21.2% | ~21% |
| a lone fleeing Majestic | **26.6%** | **~27%** |

That last row settles an argument the old note had with itself. The earlier
two-pursuer scenario produced 26.6% and was "corrected" by adding a third
pursuer to reach v3's 41%. The two-pursuer version was right all along — 41%
came off v3 hulls, and the hulls changed underneath it.

The two rows v4.2 leaves without a named pursuit share one, and that is the
argument for it: the sheet names chasers once, in the Marauder's clause
(*"fleeing pursuit corvettes"*), and the Witchlight sits in the same sentence
with none of her own. Three Interceptor IIs — the Crown's pursuit corvette —
put the Marauder on 62.9 against ~63 and the Witchlight on 33.5 against ~34.
One squadron, two figures, both landed, which is better evidence than two
separately-fitted pursuits would have been.

---

## Playing it, both sides, to the end (20 September)

Sean: *"Review last session make changes and updates. When you're all done
with work. I want you to play the game. Play both sides. Play it through to
completion. Explore every button and options. See what works and what doesn't
and adjust."*

So this is a report of playing rather than of building: what was driven, what
it turned up, what was adjusted, and what is left for him to decide. The
harness is Playwright at 393×852 — an iPhone — against the built bundle, and
every finding below was found by tapping, not by reading the code.

### What was driven

- **57 islands** across all seven Reaches, every tab on each: no blank panel,
  no console error. That is the Crew-tab fix from earlier in the day holding
  at scale.
- The whole utility bar: World Map, Build (all three kinds), Book (all seven
  sections, and one entry deep), Log, the advisor, the Menu and both of its
  pages, the sound toggle both ways, the clock through all five speeds.
- A crew member opened, sent on an errand, the errand sheet read, the errand
  taken, and the order confirmed in the log.
- A squadron split, sailed, and the voyage confirmed in the log.
- **Two whole wars, both sides, machine-played, both to an outcome** — the
  Crown's to day 972 and the Confederacy's to day 1368.

### Six things that did not work

**1. Closing a Location dropped you to the World Map.** A Location opens *in
place of* the Reach Map rather than on top of it — one sheet at a time is the
shape of this screen — so the cross took you all the way out. Reading a chain
island by island, which is most of what looking at the chart is for, cost two
taps each time. The island sheet now remembers where it was opened from.
Every other way in drops the crumb, so the cross never sends you somewhere you
have not been.

**2. The build card said "1 co."** — *company* abbreviated, and company is the
retired word. It walked past a check written for `\bcompany\b`. Two more of
the same: `terms.json` itself said a Training Facility "Drills companies of
marines and militia", and three hull blurbs in `ships.json` said what they
land. The vocabulary file being the one place the rule is written down and
also a place it was broken is the part worth remembering — the test read the
interface and never the data.

**3. A Pirate Lord's one order read "Send on mission."** Under a heading
reading *On a mission*, with *Missions* as the chart filter and the tutorial
card naming the button by the same word. **Errand** has been the agreed word
since 17 September; it had never reached `terms.json`, and nothing was
checking. Every *report* of one already said errand — only the places you give
the order still said the old thing.

**4. The Errands filter showed a nought with an errand in flight.** Send
somebody on Explore — the one errand that by definition goes to an island
nobody of yours has charted — and the filter whose own hint reads *islands
your crew are working on, or sailing for* lit nothing. One gate at the top of
`layerMark` was the cause: *you cannot be told about an island you have never
charted*, which is right for every other layer and exactly wrong for this one.
What stands on a stranger's island is not yours to know until somebody looks.
Where you sent your own people is not news you have to buy.

**5. The Fleets filter had the same hole.** Order the Home Fleet to sea on day
one — the first thing anybody does — and the only way to ask where your navy
is reads nought, because a squadron at sea lies off nothing. Yours on passage
now count at the harbor they are making for. Theirs at sea stay invisible,
which is what the watch is for.

**6. The errand sheet asked who was going before it said what the job was.**
"Who else goes" led it, so the first decision put to you was which four people
to send and the last was what they were going to do. Its own copy gives it
away — *take who the work needs* — which you cannot do until you have seen the
work. The errands lead now.

### Both wars, to the end

| | Crown | Confederacy |
|---|---|---|
| war ended | **day 972** | **day 1368** |
| gold at the end | **1,359** | 249 |
| upkeep at the end | 344 | 102 |
| idle buildings at the end | **19** | 2 |

Both ended *"The Seven Seas are yours. Victory."* — which with two samples
says nothing about balance (the machine has both sides, so it beat itself
twice) and quite a lot about everything else. The 40-war measurement from 19
September stands: Crown 17, Confederacy 23, median 756 days. These two, at 972
and 1368, are both above that median, and the spread between them is the
number worth keeping.

The contrast in the last three rows is the useful part, because it is not
symmetrical. **The gold hoard is a Crown problem, not a general one**: the
Crown finished sitting on eighteen months' income with nineteen works standing
about, the Confederacy on two months' and two. Its navy is three times the
size and it still cannot spend what it earns. That narrows the open item —
whatever the build order is doing wrong, it is doing it on one side.

### What winning looks like, and why that is the next thing

The screenshot of the moment the Crown won is the most useful thing this
session produced, because you cannot read it. The dispatch strip floats over the top
of the chart with the last three notable events in it, and the one line that
says who won sits directly underneath. You win a thirty-two-month war and what
is on screen is three captures.

Half of that is fixed here: the strip goes quiet once the war is over, so the
line is visible. The other half is Sean's to decide, and it is the largest
open item in the game — **there is no end-of-war screen at all.** `.verdict`
is a single bordered line of 13px text above the chart. Everything a player
would want at that moment — how long it took, what it cost, which islands
turned, who was lost, whether to sail again — does not exist. The three
outcome *screens* built in task 95 are battle outcomes, not the war's.

### What the end of a war also showed

- **The battle sheet was never driven.** Four attempts at provoking an action
  by hand all failed for the same undramatic reason — the seat's own chain is
  all your own islands, and the enemy's is months away — and the two full wars
  ran in observing mode, where the machine settles its own actions without
  stopping on a sheet. `BattleSheet` is covered by the sim's tests and by
  `observe.test.ts`; it is not covered by anybody having looked at it today,
  and this note is here so nobody reads the rest of this section as though it
  were.

### Left standing, not touched

- **The encyclopedia's Ships page still opens by saying it is not this game**:
  *"The war you are playing still sails the old fleet and fights it the old way
  until the engine swap lands."* 21 hulls in play, 28 in the book. Honest, and
  the largest structural gap.
- **The Crew page leads with people who are not in your war** — three of the
  first six, alphabetically. Raised here and then withdrawn on reading the
  history: the *not in this war* mark is the settled answer to Sean's earlier
  complaint that the page listed Carrow and Torvik as *yours* when they were
  never drawn, and `castinplay.test.ts` carries the reasoning — the
  encyclopedia is a reference to the whole cast and alphabetical is what a
  reference is. Noted rather than changed, and only worth revisiting if he
  says the page feels like somebody else's game.
- **Your capital cannot build on day one.** Freeport's Buildings tab reads
  *"NOTHING TO BUILD WITH — everything is raised by a construction yard
  standing on the same island."* The one-of-each opening put the yards
  elsewhere. Whether the seat should have one is a design call, not a defect.
- **A crossing can take four months, and that is worth a look.** Playing it,
  the errand sheet kept quoting sail times in the high double figures, so it
  was measured rather than guessed at: from the Confederate seat, over forty
  worlds, the **nearest** island is 7–21 days, the **median** island is
  **95–132**, and the furthest is 157–200. A war runs 750–970 days. So half
  the map is more than three months away from where you start, and a side gets
  something like four to eight crossings of the chart in a whole war. Nothing
  is broken — it is the distance model doing exactly what it says — but it is
  the number that decides how many decisions a war contains, and Sean has
  never been shown it.

- **Escape closes nothing.** No sheet listens for it; only the tutorial does.
  Irrelevant on a phone, wrong on a desktop.

---

## A construction yard on both seats (20 September)

Sean, after the playtest opened Freeport and found its Buildings tab reading
*"NOTHING TO BUILD WITH"*: *"I think Freeport and Highwater should have
construction yards at start. And maybe you're right we should start with 2
construction yards. 1 at home base and 1 randomly on their other starting
locations. Keep shipyards and troop training to 1."*

Freeport was the harder half. It is not in `allianceSystems` at all — it is
dealt none of the opening's camps or mills, on the rule that the articles were
signed on it a week ago rather than settled on — so a count of yards a side
would never have put one there. The seat now takes its yard by name, before
the deal starts, and the second goes round the table among the side's *other*
starting islands.

### What it cost, measured over the same forty worlds

| | 1 yard, dealt at random | 1 yard, on the seat | **2 yards, 1 on the seat** |
|---|---|---|---|
| Crown — Confederacy | 20 — 19 | 19 — 21 | **20 — 18** |
| never ended | 1 | 0 | 2 |
| median length | **731** | 1116 | **1248** |
| range | 440–1968 | 444–2760 | 551–2928 |
| Crown at the end | 21.5 isles, 17.6 hulls, 780g | 22.4, 21.6, 487g | 22.1, 20.6, 589g |
| Confederacy at the end | 8.3 isles, 9.9 hulls, 588g | 9.9, 10.7, 798g | 10.9, 10.9, 980g |

**Balance is untouched** — 20–19, 19–21, 20–18 is one number three times at
forty samples. What moved is the length, and it moved a long way: the median
war is **517 days longer**.

And the interesting part is *where* that came from. Adding the second yard
costs 132 days. **Moving the first one onto the seat costs 385.** The capital
is the roomiest, most loyal, best-defended island a side owns — thirteen
berths at the Aldermain, twelve at Freeport — so a yard standing there builds
continuously and builds walls and garrisons at the one island the war is
decided at. Both seats get harder to take at once, and the war that has to end
by taking one of them drags.

That is not an argument against the change: the first screen of the game
should not tell you your capital cannot build. It is an argument that **war
length is an economy problem rather than an opening one**, which is what
`lab/hoard.ts` found the same morning — neither side can ever build its way to
a finish, so anything that makes both sides tougher makes the stalemate
longer. The 517 days are recorded here so that whatever is done about the
economy is measured against them.

The random stream moved when the deal changed, so seed 9000 is a different
world than it was; all three columns above were run on the new stream, which
is why the before column is 731 rather than the 756 recorded on 19 September.

---

## The lore package, and where the chart stops it (20 September)

Sean sent COMBAT MASTER v4.3 and a self-contained lore package in one message,
with a new standing rule: **nothing is canon until Sean confirms it**, and
`seven-seas-world-bible.md` is demoted to a non-canon idea pool — do not take
lore from it, do not invent lore to fill gaps, and do not rewrite anything in
its Part D list.

### Done

- **v4.3**: Majestic 1,045 → 1,200 days, Swift 40 → 15, and a 40-day build
  floor with the Swift as its only exception, pinned by a test that reads the
  roster rather than the prose.
- **The Deep is retired as a system** (Part A 4). Three glossary entries and
  four role tags gone; eleven tags on the cast become eight. *Tidecraft*
  survives only as the word for a Reef-folk hull's vanes, and comes off the
  "Not built yet" card because those vanes already sail.
- **Blackwater** (Part A 5) is Human, with the bio the package gives.
- **The Hushed and the Shoal-folk are sworn** (Part A 6), which closes the
  same hole the Reef-folk line closed: either side could sign them.
- **Nineteen island notes** (Part C), for islands staying where they are.

### What the chart painting blocks

The world map is a painting — `src/art/chart/seas.webp` — and
`scripts/chart_positions.py` reads every island's position out of the painted
land, grouped into Reaches by hand-placed seeds. `chart.json` is that output,
committed as data. The interface then looks a position up by
**`ReachName/IslandName`** (`GalaxyMap.tsx`, `ChainMap.tsx`), and island art is
keyed the same way.

Three consequences, in increasing order of awkwardness:

1. **Renaming a Reach is safe.** The labels are SVG text, not paint. Whalers'
   → Windward, Wreckers' → Sunken, Cinder → Mire cost three data edits.
2. **Renaming an island in place is safe.** The painted landmass keeps its
   position; only the name on it changes. Ashcombe → Starpath, Oakhanger →
   Chimehouse, Sawtry → Outrigger Bay, Pitchcombe → Longreef, Tarmouth →
   Palmfall, Tamalu → Reedmoot.
3. **Moving an island between Reaches does not work**, and neither does
   adding one. The five moves — Wrightsport, Starcross, Ropley and Wainfleet
   from Whalers' to Sovereign; The Shoals from Coral to Windward; Tundvik from
   Cinder to Rime — would put a Crown Sea island up in the north-west where
   the old Whalers' cluster is painted, because that is where its landmass is.
   And the six new islands (Driftway, Nine Reefs, Singing Shallows, Keelhaven,
   Cane Hollow, Belfry Shoal) have no painted land to stand on.

So Part B's restructure is not a data edit. It is either a new chart painting,
or a decision that the six new islands take spare landmasses the blob detector
already finds and the five moves are dropped.

### Also standing

- **Blackwater's epithet is now orphaned.** He is "the Drowned Admiral", and
  the bio the package gives him has no drowning in it. Part D does not list
  the epithet, and the rule is not to invent, so it is left alone and raised
  here.
- Part A 2 (Coralhome starts Crown-held) and Part A 3 (coral beds, a slipway
  on a bed unlocking the reef hulls) are untouched. Neither depends on the
  painting; both are real mechanics rather than data.

---

## The ground, by share instead of by count (20 September)

Sean, after reading `lab/hoard.ts`: *"on average 50% of available land should
be either gold mines or trees slash coral... 40% trees and 10% gold mines. So
mills will be super common... and if the place happens to have gold, it
produces significantly more. Let's say 3x — uh, let's just say 2x."*

Deposits were a flat three-to-six trees whatever the island's size, plus a
one-in-four chance of a vein. That put **twelve gold veins in a world of
sixty-three islands** and ran both sides out of unworked ground by day two
hundred. They are now a **share of the island's slots**, so a big island is
worth taking because it is big.

Measured over twenty worlds, 1,260 islands, 9,469 plots: timber **38.6%** of
land against the 40% asked for, gold **10.4%** against 10%, both together
**49.0%** against 50%. `DEPOSIT_UPLIFT` is the one number that gets it there —
the room cap clips rich rolls and starting islands are widened *after* the
ground is rolled, which cost six points before it was compensated for. It is
documented as the cheap fix it is.

A settled island is now floored at one deposit. Three of them opened with
nothing at all once the share model let a small island roll zero, and a town
you can parley for and get no reason to want is worse than a bare rock.

### What it did

| | 1 yard, random | 2 yards, 1 on seat | **+ ground by share** |
|---|---|---|---|
| Crown — Confederacy | 20 — 19 | 20 — 18 | **23 — 16** |
| median length | 731 | 1248 | **1512** |
| Crown at the end | 21.5 islands | 22.1 | **29.2** |

And on the treadmill itself, four wars deep: income roughly doubled — 333,
434, 353 and 542 a day against the 215–250 the old ground allowed — and, for
the first time, **the side that is winning has money to spend**: spare of +99,
+47 and +88 where every side used to sit at zero. The 72% "thin" figure is
*worse* than the old 65%, and that is the losing side dragging it down: a
Confederacy reduced to one island with no income is thin every day until it
dies.

### Two things this did not fix, and one it made worse

- **The winners still have 37 to 39 idle works** against 83 to 93 free
  berths. That is not the ground any more; it is the surplus gate in
  `aiBuild` and the six-orders-a-tick cadence. Sean's fortnight settlement,
  scrap and shortfall are the next three pieces and all of them bear on it.
- **The war is longer again**: 1,512 days against this morning's 731. Richer
  ground means more walls and more garrisons on both sides, and nothing in the
  game yet destroys anything a side owns except battle. Scrap and maintenance
  shortfall are exactly that missing pressure, so this number should not be
  judged until they land.
- **The Crown is drifting ahead**, 23–16 against 20–18. Within noise at forty
  samples, and worth watching: the Crown ends on 29.2 islands where it used to
  end on 22, so it is the side that gains most from ground being worth taking.

## The fortnight, scrap, and the shortfall

Sean's economy spec of 20 September, dictated in one go, and it is four
mechanics that only make sense together.

### Why a fortnight and not a day

The ledger used to move every morning: income in, upkeep out, and when the
upkeep could not be met something of yours fell apart. Sean's objection is not
that the arithmetic was wrong, it is what the arithmetic did to the player:
*"those numbers get revised every 14 days. They're recalculated and reapplied
every 14 days... Otherwise what's going to end up happening is that people are
going to be looking at it like a stock chart."* A figure that twitches every
tick is a figure you watch instead of a figure you plan against.

So `settleLedger` runs on `state.day % FORTNIGHT === 0` and nothing moves in
between. Fourteen days of income in, fourteen days of upkeep out, once. The
banner's In / Out / Clear are recomputed there too, so what the player reads
between settlements is exactly what the next settlement will charge them —
which is the whole point of showing it.

### Why the banner shows a delta

Sean again, on what the number is *for*: *"if I was a player managing my
economy and deciding, do I want to use available land to produce more income
producing stuff or build stuff... that decision should largely be based on...
what's my maintenance deficit."* The gold you hold does not answer that
question and income alone does not either. The third column does, so it is the
one with the state: **Clear +13** in the ordinary case, **Short −13** in red.

Four separate plaques were tried first and do not fit a 393px phone — the
labels collide and CLEAR clips. One ledger plaque with three columns does,
with `flex: none` on it so the gold plaque cannot squeeze it.

### Scrap, which is two mechanics wearing one coat

*"Destroy the unit to get money back and you get 50% of what you paid for
it... the additional advantage though, is that you don't pay the upkeep cost
anymore... a great way to clear old things to make room for new things."*

The coin is the smaller half. An earner is free to raise, so half of nothing is
nothing and `scrapValue('mine')` is 0 — and a mine is still worth pulling down,
because what you get back is the **plot**. That is why `scrap` calls
`returnDeposit`: the ground under a works is still ground, the same rule as a
works falling apart unpaid, and a long war must not grind the world down to
land that can never earn again.

Two bugs in the first cut, both caught before it ran, both worth recording
because they are the same bug:

- `Chargeable` carried a facility's **array index**. That is fine until
  something is scrapped, at which point the splice shifts every later index
  down and the next entry in a shuffled list points at the wrong building, or
  off the end. A shortfall scraps several things in a row, so that is the
  normal path rather than a corner case. It carries an id now.
- The sold-off line was assembled from the facility **after** it had been
  deleted. The label is captured up front instead.

And one that did run, found by the audit rather than by reading: scrapping a
**hull** took the ship off the books and left everything that was riding in it
behind. Forty wars later — `over-berthed x179`, `people-on-no-hull x60`,
`ghost-fleet x24`: four troops in one berth, crew serving with a squadron that
had no ships, and empty squadrons still sailing to islands they could not
reach. The fix reuses `clearWrecks`, which the fighting has always called for
exactly this, with one thing added in front of it. Breaking a ship up is not
sinking it, so if the fleet is in harbor at an island you hold, the troops
turned out of their berths **march ashore into the garrison** rather than
drowning at anchor. At sea, or in someone else's harbor, there is no quay and
the sinking's rule applies after all.

### The shortfall

*"The game randomly selects units and basically blows them up to get you the
gold back to pay the cost that you couldn't have... So you can either actively
do it or the game's going to do it for you."*

Which is the old daily break-down with three differences: it pays for itself,
it can take anything on the books rather than only buildings, and the player
had a fortnight's warning in the banner. Randomly, deliberately — the player
who did not choose does not get to choose. One `loss` event for the whole
settlement rather than one per thing, because a sold-down side is one event in
the player's day.

This is the pressure Sean is after: *"you should run out of resources if you're
not expanding. That's kind of the name of the game."*

### What it measured

Forty wars, both sides machine-played, same seeds as this morning's:

| | ground by share | **+ fortnight, scrap, shortfall** |
|---|---|---|
| Crown — Confederacy | 23 — 16 | **18 — 21** |
| median length | 1512 | **1380** |
| never ended | 3 | **1** |
| Crown at the end | 29.2 islands | **24.9** |

The audit is clean. The war is shorter, fewer wars run out the clock, and the
Crown's drift is gone — which is the expected shape: the side that was winning
on accumulated works is now paying for them every fortnight.

**Not fixed, and it is the one that was in the ticket:** the Confederacy still
ends sitting on 2,737 gold against the Crown's 589. The fortnight does not
touch it, because hoarding is not a ledger problem — it is `aiBuild` declining
to spend. That is the surplus gate and the six-orders-a-tick cadence, still
next.

## Scrap, from the player's side

The mechanic shipped without the half Sean actually described. *"You can
either actively do it or the game's going to do it for you"* — the game could
do it; the player could not. This is the other half.

### One list, not a button on every tile

The Buildings board already says why, about felling timber: *a destructive
button on a small tile is a button somebody taps by accident*. It is also the
wrong shape for the decision. What to pull down is a question about the
**island** — what has to go for this to be raised — so the answer is
everything standing on it at once, in one list, reached from a line under the
board beside the one that fells timber.

The list is the island's buildings, its garrison as one row that can be tapped
as many times as there are troops, and every hull of yours lying in the
harbor. Each row says three things: what it raises, what it saves a day, and
whether the plot comes back. The coin is the smallest of the three and often
zero, which the sheet says out loud rather than hiding.

### `ScrapTarget`, and the two gates

`Chargeable` became an exported `ScrapTarget` carrying ids only, so the UI can
name a thing to break up without reaching into the state it is drawing. With
it, two functions that did not exist before:

- `scrapError` is the **player** gate: not somebody else's works, not the
  city's own ancient walls, not an order half-run (that is Cancel, and it is
  already there), not an island in mutiny or out of your hands, and not a hull
  in open water or in the middle of an action.
- `scrap` asks none of it, because the fortnightly shortfall has to be able to
  reach anything on the books, a squadron at sea very much included. That is
  the difference the game draws everywhere else: what you may order, and what
  happens to you.

Measured after the refactor, forty wars on the same seeds: 18–21, median
1,380, audit clean — identical to before it, which is what a refactor with no
behaviour in it should read.

### The bug the browser found and the stylesheet hid

Verifying the sheet at 393px turned up something older and worse than anything
in the new code. The ledger plaque wanted 84px and had 76, so **CLEAR was cut
off by its own border** — on the exact phone width the top bar was built for,
and on the console I had checked by eye the same day and called clean.

Two causes, the same mistake twice:

- `@media (max-width: 400px) { .topbar .iconbtn { width: 34px } }` sat *above*
  the plain `.topbar .iconbtn { width: 38px }`. Equal specificity, so source
  order decided and the wide rule won. Four buttons four pixels over is
  sixteen pixels, which is twice what the ledger was short.
- `.plaque--ledger { flex: none }` lost to `.console .plaque { flex: 0 1
  auto }`, one class more specific. The plaque written not to shrink was the
  one shrinking — and the comment above it confidently explained why it could
  not be.

Both narrow-screen blocks are now one block, placed after every rule it has to
beat, and `console.test.ts` reads the stylesheet and checks that order. It
needed `test.css: true` in the Vite config, because vitest stubs every CSS
module to an empty string by default, `?raw` included. Nothing else in the
suite imports CSS.

The lesson is the cheap one: this was invisible to the build, to the type
check, to every render test, and to reading the file top to bottom. It took
`getBoundingClientRect` on a running page. Anything laid out for a specific
width should be measured at that width rather than looked at.

## Three rungs: gold, silver, timber

Sean, 20 September, correcting his own correction of the same morning:

> Gold vein >> 3x
> Silver vein >> 2x
> Forrest >> mill 1x

His first pass had said *"3x the amount, uh, let's just say 2x"* and I took the
2x as the correction it sounded like. This puts the 3x back and adds the rung
between, which is better than either version was: a mill is what most ground
gives you, silver is the find worth rerouting a yard for, and gold is the
island you go to war over. Three rungs also make the **plot** the decision it
is supposed to be, because now there is something to give up as well as
something to gain.

### Where the silver comes from

Sean set the ground rule earlier the same day and has not changed it — half an
island's plots are deposits, four parts timber to one part metal. So the ladder
is cut **out of** the metal rather than added beside it: the tenth that was all
gold is now seven parts silver and three parts gold. Gold pays triple, so gold
is the scarce one.

He did not say how to split it. That is my number, and it is chosen to be
near-neutral on what the world is worth so the measurement reads the *shape* of
the change and not a change in wealth. Measured over twenty worlds and 9,479
plots:

| | before | after |
|---|---|---|
| timber | 38.9% of plots | 38.1% |
| silver | — | 7.8% |
| gold | 10.3% | 3.8% |
| all deposits | 49.2% | **49.7%** |
| worth, fully worked | 1.79 a plot | **1.95 a plot** |

Sean's half of the ground is intact and the world is nine per cent richer, all
of it in where the money lands rather than how much there is. Say the word and
the split moves; nothing else has to.

### Four bugs of one shape, and the test that ends them

Adding a member to `FacilityType` and a member to `ResourceType` found four
bugs, none of which was a type error:

- `YARD_BUILDABLE` is a hand-written `FacilityType[]`, so the Silver Mine could
  not be ordered at all and the Build sheet did not mention it. Found by
  opening the sheet in a browser, not by any test.
- The Buildings board and the encyclopedia each wrote `['forest', 'gold'] as
  const`, so both drew two kinds of ground out of three.
- `resources.test.ts` counted earners as `type === 'mine' || type ===
  'refinery'` and duly reported five settled islands as bare — they were
  working silver and the filter could not see it.

A `Record<FacilityType, …>` is checked by the compiler and cannot go stale; a
`FacilityType[]` is just an array and will be short by one forever. So
`complete.test.ts` now checks every hand-written list against the records,
which are the only runtime enumeration of the unions there is, and asserts the
ladder is a ladder: one works per kind of ground, each earning, each rung
strictly above the last. It fails on the `YARD_BUILDABLE` omission.

`RESOURCE_TYPES` replaces the scattered literals.

### The deadlock this uncovered, and the war chest

The suite came back with one failure that was not a fixture: *"mostly loses the
war for a player who gives no orders"* went from five idle Crowns beaten out of
six to **one**.

Not a balance wobble. Traced on seed 1: the idle Crown collapses from 26
islands to 9, exactly as it should, and then the war simply stops. The
Confederacy takes forty islands and sits there for fifteen hundred days.

    alliance: 40 islands  income 347  upkeep 347  surplus -0.5  gold 91
    strike fleet: 113 guns against Highwater's bar of 165

It cannot buy the hulls to close the gap, because it has no surplus; it has no
surplus because it spent every penny of income on garrisons, drill grounds and
walls across forty islands; and the fortnightly settlement keeps the treasury
at zero, so it never accumulates the price of a first-rate either. The baseline
cleared the bar at 182 guns — by ten per cent — and that was the whole margin
the test was passing on.

This is the same failure the `spend-the-bank` doctrine was written for. The
note on `surplus` describes a side that banked 172,000 and still could not
afford the two first-rates it needed. That one could not see its savings; this
one has none to see, because nothing ever told it to stop spending. The ladder
did not create the defect, it removed the ten per cent of slack that was hiding
it.

So: **a side that cannot win the war it is in stops building post offices.**
While its best fleet cannot outgun the enemy capital, the margin it demands
before ordering anything with a wage goes from 3 to 12. Earners are untouched —
they cost nothing and are how the surplus comes back — and hulls are untouched,
because they are what it is saving for.

Idle Crowns beaten: **1 of 6 → 5 of 6.** Seed 1 remains the exception the
test's own comment has always named.

### What forty wars say

| | after the fortnight | **+ the ladder and the war chest** |
|---|---|---|
| Crown — Confederacy | 18 — 21 | **15 — 22** |
| median length | 1380 | **1020** |
| never ended | 1 | **3** |
| Confederacy gold at the end | 2737 | **1548** |

Audit clean. Wars are a third shorter and the Confederacy's hoard is down by
nearly half — the war chest is being spent on hulls, which is the point, and it
is real progress on the thing the ticket was actually about.

**Three wars in forty still do not end**, against one before, and it is a
different stall: the Crown ahead on 25 to 27 islands with two of three Lords
taken and unable to find the last. That is the manhunt, not the economy, and it
is the next thing worth measuring.

### Still to come

The silver vein and the Silver Mine draw with generated glyphs — the vein is
the gold vein's cut rock with two thin pale seams instead of one heavy bright
one, the mine is a shaft head rather than a cut hillside, so the two tell each
other apart at 30px on either faction's palette. Both fall back cleanly the
moment Sean's silver set arrives: *"I'll get to silver vein set."*

## The resource paintings

Sean, 20 September, four images and no words: a reef, gold in dark rock,
silver in dark rock, and a stand of old trees. The silver set he promised when
the ladder went in — *"I'll get to silver vein set"* — and with it new paintings
for the two that already had one, plus coral.

All four came at 1448×1086, the same delivery size as the existing masters, so
they went in through `scripts/art.py` like everything else: master kept at full
resolution outside `src/`, crop recorded, old gold and forest masters retired
rather than deleted.

The crops are full-width bands at the islands folder's 768×204. The thing worth
knowing about that shape is that **the tile does not show all of it**: a slot
board draws the band at 96/40 with `object-fit: cover`, so only the middle 64%
is ever on screen. So the crops are chosen against that window rather than
against the band — the bright metal has to sit in the centre of the strip, not
just somewhere in it. Checked by rendering the visible slice of each:

| | crop y | mean luma, the part you see |
|---|---|---|
| forest | 420 | 77.5 |
| silver | 350 | **109.1** |
| gold | 300 | 94.1 |
| coral | 430 | 89.2 |

Gold and silver are now plainly the same rock with different metal in it, which
is what a ladder wants — you should be able to tell which rung an island is on
from the tile, before reading the label.

The drawn glyphs stay as the fallback they were written to be, and still do the
work at icon size where no painting is drawn.

**Coral is installed and not wired.** The painting is in the register and ready,
but coral is still not a `ResourceType`, because the question from the economy
spec has never been answered: Sean said living coral replaces trees in Coral
Reach and then *"the coral is just leave it, we'll deal with the coral later."*
Replacing timber there with a deposit nothing can work would leave that Reach
unable to earn from two fifths of its ground, which is strictly worse than
today. The ladder now makes the obvious answer available — coral as the bottom
rung at 1x, with its own works — but that is his call, not one to assume from
an image.

## One roll per plot, and coral lands

Sean's math of 20 September, replacing the share model wholesale:

> For each of available land there is a 40% chance it has a resource. Now of
> that 40% chance — 60% chance of forest / living coral (coral reef only),
> 30% chance silver vein, 10% chance gold vein.

This is a better model and not only a different one. Three shares rolled
separately could overshoot an island's room and had to be trimmed, which
quietly favoured whichever resource the trim kept; they needed a variance term
so every island did not come out average, and an uplift term to undo the trim's
bias. **One roll per plot cannot overshoot and is its own variance** — a
four-plot rock genuinely can come up bare — so two of the three corrections are
simply gone, and `DEPOSIT_VARIANCE` and `DEPOSIT_UPLIFT` with them.

The third correction is not gone and the number is now honest rather than
achieved. Measured over twenty worlds and 9,241 plots:

| | asked | got |
|---|---|---|
| plots carrying a deposit | 40% | **37.8%** |
| of those, timber + coral | 60% | **59.0%** |
| silver | 30% | **31.3%** |
| gold | 10% | **9.8%** |

The mix is within a point and a half on each. The density runs two points light
for a reason that predates this model and is not its fault: a side's own
islands are **widened after their ground is rolled**, a seat to thirteen plots
and a starting island to at least eight, so the roll was taken against a
smaller island than the one on the chart. The old code hid that behind a 1.19
multiplier. Two points is small enough to carry in the open, and carrying it in
the open beats a thumb on the scale nobody remembers is there. The honest fix —
roll the ground after `seedHoldings` — is one move away and changes every seed
in the game, so it is his call and not a thing to slip in.

Fully worked, the world now pays **1.71 a plot**, against 1.79 before the
ladder and 1.95 after it. So the ladder's nine per cent is handed back and a
little more: this is the leanest the ground has been, which is the direction
Sean has been pushing all along — *"you should run out of resources if you're
not expanding."*

### The archetype tilt, rewritten

`FOREST_BY_LOOK` and its two siblings added whole plots to a share, so a mining
isle was outright *richer* than an ice field. Under one roll per plot that is
not expressible, and it should not be: an ice field has less worth digging up,
not less ground. So `DEPOSIT_TILT` multiplies the **mix** and never the 40% —
every plot everywhere is asked the same question, and the island's look decides
the flavour of the answer.

Tuned by measurement rather than by taste: the first pass came out 55.7 / 32.7
/ 11.6 because the tilt's spread dragged the world average off Sean's numbers,
so the multipliers were softened toward 1 until the average landed back on
60/30/10.

### Coral

Sean's bracket — *"forest / living coral (coral reef only)"* — is the ruling
that had been outstanding since the economy spec, and it answers the question I
had flagged: coral is not a fourth kind of ground, it is **what the staple is
called in the one Reach where nothing grows**. An atoll ring has no forest on
it, so Coral Reach rolls coral wherever anywhere else rolls timber. Verified
over twelve worlds: 140 coral beds inside Coral Reach, zero timber inside it,
zero coral anywhere else.

It earns what a mill earns, because it is the same rung. The works is a **Coral
Kiln** — coral burned for lime and building stone, which is a real thing people
did on reefs — and that name is mine, not Sean's, so it is a one-word rename if
he wants another. `complete.test.ts` had to learn that a ladder can have two
names on one rung: it now checks the three distinct heights are 1×, 2×, 3× and
that the pair sharing the bottom is exactly timber and coral.

### What forty wars say

| | the ladder | **+ Sean's roll-and-pick** |
|---|---|---|
| Crown — Confederacy | 15 — 22 | **20 — 18** |
| median length | 1020 | **1210** |
| never ended | 3 | **2** |
| Lords taken | 1.32 of 3 | **1.70 of 3** |

Audit clean. Dead even, one fewer war runs out the clock, and the manhunt is
going better than it has — 1.7 Lords of 3 against 1.32. The median is longer
because the world is leaner and everything takes more saving for, which is the
trade Sean asked for.

### Three fixtures, two of them mine

`newmissions.test.ts` parked the Confederate crew on `systems[0]` and asserted
a Lord was *not* on the target island — which held only while `systems[0]`
happened not to be that island. A new world generator made them the same place.

`dispatchpov.test.ts` asserted a battle line contained `beast.name` — "The
Kraken" — which the `inProse` fix two commits ago correctly made "the Kraken".
The test had been quietly requiring the sentence to be wrong.

## The Gold Mine, repainted

Sean, 20 September: *"Gold mine new art."* A timber mine head with a winch
drum, an ore cart heaped with gold, and gold running through the rock face.

The old pair were wide quarry scenes full of figures, one flying crown banners
and one flying skull-and-crossbones, and they read as *white stone quarries* —
the one thing a Gold Mine should never be mistaken for.

### The crop is a close-up, on purpose

The painting is 4:3 and vertical in composition; the islands band is 3.76:1.
Worse, a slot board shows only the **middle 64%** of the band, and the middle of
this painting is the dark tunnel mouth between two posts. The honest auto-crop
ships a tile that reads as "dark timber".

Six boxes were tried and rendered as the tile actually draws them. The one that
ships is `0,430,1050,279` — the ore cart, heaped, with the mine's timbers
behind it and the tunnel at the right edge. It is the only family of crops
where the tile says *gold mine* at a glance.

The cost is a change of register: every other building card is a wide
establishing shot and this one is a close-up. It is the better trade — a card
you can read beats a card that matches — but it is a trade, and the wider crop
is one `scripts/art.py recrop` away if Sean would rather have the set consistent.

### One painting, two sides

Every other works has a Crown version and a Confederate one, distinguished by
the flag over it. This delivery carries no faction marks, so it ships to both
slugs and the Gold Mine is now the one building that looks the same whoever
holds it. The owner is still named by the emblem in the sheet header, which is
where Sean put faction identity on 19 September. Both old masters are retired
rather than deleted, so the flagged pair comes back with one command.

## The Lumber Mill, repainted — and the crop rule that was never written down

Sean, 20 September: *"Lumber mill new art."* A water-powered sawmill — overshot
wheel with the water coming over it, a frame saw in a timber house, a log on
the carriage and sawn boards stacked beside it.

The first crop was chosen the way the Gold Mine's was, against the slot board's
window, and it looked good as a band: wheel on the left, log on the right. On
the page it was wrong. **The encyclopedia card showed a stone pier.**

### Two windows, both centred, neither of them the band

Measured on the running page rather than assumed:

| where | box | shows |
|---|---|---|
| island panel, slot tile | 96 / 40 | the middle **64%** of the band |
| encyclopedia, building card | 176 × 110 | the middle **42.5%** |

Both `object-fit: cover`. So a 768×204 band is three quarters decoration: **a
subject that is not dead centre is a subject the player never sees.** That is
now written on the `islands` entry in `scripts/art.py`, where the next person
cropping one will read it before choosing rather than after.

### Which is why the waterwheel is not in it

The wheel is a circle about 560px across in a 1448px painting. A 3.76:1 band
cannot contain a circle: centring the wheel forces a crop 750 wide and 199
tall, which is a thin slice across the hub and reads as spokes and an axle,
not as a wheel. Six boxes were rendered at **both** windows and the wheel lost
every one of them.

What ships is `560,600,888,236` — the log on its carriage with its cut end to
camera and the sawn boards stacked behind. It says *timber, cut* at 176px,
which is the job. It also pairs with the Gold Mine, which by luck rather than
judgement ended up doing the same thing: both cards now show the **product**,
close up, where the older set showed wide establishing scenes.

If the wheel matters more than legibility — it is the in-game glyph, after all
— the fix is not a different crop but a taller band for this folder, and that
is a change to every island painting rather than to this one.

## The Shipyard, repainted

Sean, 20 September: *"Shipyard."* A hull on the stocks — the frames standing
up in a row with the sky showing between them, planking already on the lower
strakes, a crane swinging a load of timber in, and the bow curving away at the
right.

First painting cropped with the rule from the Lumber Mill already in hand
rather than learned afterwards, and it took two passes instead of six-then-a-
recrop. Eleven boxes were rendered at **both** windows — the encyclopedia
card's middle 42.5% and the slot tile's middle 64% — before choosing.

What settles it is what the *card* shows, because the card is the smallest and
least forgiving: a crop across the planking reads as a wooden wall, and a crop
across the sweeping stern reads as one big curved beam. Only a crop with **sky
between the frames** reads as a ship being built rather than as timber. That is
the whole test, and `140,250,1200,319` passes it — a long run of ribs against
cloud, planking below, the crane at the left edge of the band and the bow at
the right.

Best band of the three so far: the full 768×204 is a proper scene rather than a
detail, and the card cut out of its middle still says shipyard.

### The set is drifting into two registers

Three of the seven buildings now carry Sean's new paintings and all three are
close on the work — a cart of ore, a log and boards, a hull's frames. The four
that have not been repainted are wide establishing scenes with figures and
faction banners: Construction Yard, both Fortresses, Training Facility.

That is not wrong yet and it may be the intended direction — the new ones are
markedly more legible at 176px, which is the size that matters — but it is a
split worth naming before it is four against three the other way.

### Two buildings still have no painting

The **Silver Mine** and the **Coral Kiln** draw the glyphs written for them, and
on a page of paintings they read as placeholders, because they are. The Silver
Mine is the more pressing of the two: silver is in every world and is twelve
per cent of all ground, where coral is one Reach.

## Both fortresses, repainted — and the Confederacy gets walls at last

Sean, 20 September: *"Heavy and normal fortress."* Two paintings, and the
mechanical difference is visible in them, which is the whole job: the Fortress
is one rampart with four guns run out over a rock; the Heavy Fortress is a
tiered mass with ten in two rows. The rule those pictures have to carry is that
a Heavy gives *more than twice the guns and two and a half times the stone on
the one plot*, and at 176px you can count the barrels and see it.

### No crop decisions, for once

The forts do not live in the islands band. They are in `buildings/` at 512×384,
which is 4:3 — and both deliveries are 1448×1086, which is 4:3 exactly. So the
crop is the whole frame and the card shows the whole painting. `facilityArt`
has looked in two places since the first fort arrived on 16 September:
`buildings/` for a work painted as a whole picture, `islands/` for the older
strips sliced out of a contact sheet, and it hands the UI the ratio to draw at.

That is also why the fortress cards are visibly taller than the mine's and the
mill's: 4/3 against 1.6. Not a bug — two shapes with two ratios, doing what
they were built to do.

### The gap this closed

`facilitySide('alliance')` returns `'alliance'`, with no fall-back to the
Crown's art. Only `fort-empire` and `heavy-fort-empire` existed. So **a
Confederate-held Fortress had no painting at all** and fell through to the
drawn glyph — on a building the Confederacy raises as often as the Crown does.
Nobody had reported it, and it would not show up in the encyclopedia, which
draws whatever side you are playing.

Both paintings now ship to both slugs. The two files per fort are
byte-identical, so Rollup deduplicates them: four keys in the bundle, two
assets on disk. Verified in the built output rather than assumed — the
`fort-alliance` key is there and resolves.

### Where the building set stands

Five of the seven are Sean's new paintings now. Construction Yard and Training
Facility are the two left from the original contact sheet, and they are also
the two that still carry faction banners in the art — which is now the odd
thing rather than the normal one.

## The Training Facility, repainted

Sean, 20 September: *"Training facility."* A drill yard — three straw pells on
their stands, three men working a musket through the drill, the armoury behind
them, and a rack of muskets and a target at the right.

The whole width is the crop, `0,430,1448,385`, and for once the natural one was
also the best: six boxes rendered at both windows and none of the tighter ones
beat it. The band holds the entire scene, the slot tile holds pells and men,
and the card holds a pell with two men in the drill stance — which is the thing
the building does, with a person doing it.

Worth noting against the last five: every other new painting needed the subject
hunted down and centred, because the subject was one object in a tall frame.
This one is a *yard*, laid out left to right, and a 3.76:1 band is the shape a
yard already is. Composition that suits the band needs no rescuing from it.

### Six of seven

Only the **Construction Yard** is left from the original contact sheet, and it
is now the last building whose art carries a painted faction banner — every
other works looks the same whoever holds it. That is a consistent rule now,
just not the one the set started with.

Still unpainted and still drawing their glyphs: the **Silver Mine** and the
**Coral Kiln**, the two works added today.

## The Silver Mine, and why it took the Gold Mine's crop

Sean, 20 September: *"Silver mine."* Deliberately the Gold Mine's twin — the
same mine head, the same winch drum, the same ore cart, with pale crystalline
ore in it and silver running through the rock instead of gold.

So the crop is not a fresh decision, it is a **matching** job. The frame, the
width and the subject are copied from the Gold Mine's `0,430,1050,279`; only
the vertical moved, to `y=400`, because the silver heap sits a little higher in
its painting and the two cards had to line up. Four offsets were rendered
against the gold card side by side and 400 is the one where the cart rim lands
in the same place.

That is the point of the pair. The ladder asks a player to tell three rungs
apart at a glance, and these two now differ **only in the colour of the ore** —
same cart, same cut, same light. A player who has seen one knows what the other
is before reading the label, and knows it is the same kind of thing one rung
down.

### One glyph left

The **Coral Kiln** is the last works drawing a placeholder. Every other
building on that page is now a painting, which makes the one line drawing
conspicuous in a way it was not when there were two.

## Cutting the construction yard

Sean, 20 September, first as a question and then as a ruling:

> *"I want to cut construction yards from the game. Instead you just build shit
> anywhere you want. What do you think?"*
>
> *"Just cut the construction yards. Can just build anywhere / That way
> buildings are never traveling / Well just increase their time to build / Cut
> construction yards completely. Anyone can build on any available land. / So
> gold becomes building constraint not the yard."*

He is right, and the second message says why better than the first: **buildings
are never travelling.** A building ordered at a yard on one island and shipped
to another was the strangest object in the simulation — a fort in transit, a
mine on a boat — and every screen that had to describe one was describing
something nobody could picture. Cutting the yard does not just remove a
building, it removes a *state*.

### What replaced it

`makerFor` now answers for two items only: a troop comes off a Training
Facility floor, a hull off a Shipyard slip. Everything else has no maker, and
`raiseWorks(state, systemId, type, owner)` puts it straight onto the island with
a `founding: true` flag. `raiseWorksError` is the gate — island is yours, not in
mutiny, a berth free, the ground under it if the works needs ground, the gold in
the treasury, the craft grade if it wants one. The Buildings tab lists all eight
works with the reason each cannot be raised, where it used to say "NOTHING TO
BUILD WITH" and stop.

A founding works builds with one pair of hands rather than a crew (`const hands
= facility.founding ? 1 : crewOn(...)`), which is what makes the second half of
Sean's ruling land: *"just increase their time to build"*. Every build time is
**doubled** — mine 40, silver mine 32, refinery 24, coral kiln 24, fort 60,
training facility 56, shipyard 84, heavy fort 108. The ×2 is measured, not
picked; see below.

### Three real bugs, and only one of them showed

Measurement found all three, which is the argument for measuring.

1. **`over-built x35685`, and 2.8 million gold.** A founding earner did not
   consume its deposit, so an island with one gold vein could be given a mine,
   and another, and another. The duel audit caught it as an island count; the
   treasury caught it as a number no war has ever produced. Fixed by taking the
   deposit **at order time** rather than on completion, which is also the honest
   rule — the plot is spoken for the day you start digging.
2. **`handOver` ate the ground.** An island changing hands dropped its founding
   works without returning the deposit under them, so ground leaked out of the
   world one conquest at a time. `handOver` now hands it back.
3. **Raised earners froze at zero days left.** Completion re-checked
   `depositsLeft < 1` — which `raiseWorks` had just made false by taking the
   deposit at order time, per fix 1. So the works sat finished and never
   finished. This one **only surfaced via a dispatch that never arrived**: a
   settlement test asked for the "has been settled" line and got an empty array.
   No audit rule covers it, no balance number moves, and a player would have
   read it as the building simply being slow. Founding works are now exempt from
   the completion re-checks, because the checks were already made when the order
   was given.

### What it did to the war

Forty machine-played wars, seeds 9000+, both sides played by the AI:

| | before | after |
|---|---|---|
| Crown — Confederacy | 20 — 18 | **16 — 24** |
| median length | 1210 | **672** |
| unfinished | 2 | **0** |
| audit | clean | clean |
| Lords taken | — | 1.30 of 3 |

Halving the war's length and clearing the last two stalls is the win here. The
balance shift is real and it is **not** a tuning accident, so it goes on the
record with its diagnosis rather than being tuned away:

**The Confederacy wins by taking Highwater. The Crown must hold all three Lords
at once.** Cutting the yard removed 26% of all upkeep from the game — that is
what a whole category of building costing nothing to keep amounts to — and for
the Confederacy that was the missing money: it could finally afford the strike
fleet it spent whole wars saving for and never launching. The Crown got no
equivalent gain, because **its win condition is not purchasable.** Three Lords
scattered across an unexplored chart are found by errands and luck, not bought.
Cheaper building buys the Crown more of a ground war it already wins — 19.8
islands to 8.6 — and then it loses anyway.

Build time is a **weak lever** against this. ×1.5 gave 11—29; ×2 gives 16—24;
×2.5 gives 7—13 of 20, which is noise in the same place. Moving the multiplier
moves the length of the war much more than it moves who wins it, which is what
you would expect if the deciding factor is a manhunt rather than an economy. ×2
is kept because it is the value where the median war is shortest with nothing
unfinished.

So the next fix is **#125, the three-Lord manhunt**, not more time tuning. The
Crown needs a way to *find* Lords that scales with effort the way building
scales with gold; until it has one, every economic change will read as a Crown
nerf whether or not it is one.

### Tried and cut

- **×1.5 build time** — 11—29 over forty wars, median 564. Too fast: the yard's
  cost came out and nothing came in to replace it.
- **×2.5 build time** — 7—13 of twenty wars, median 672. No better balanced than
  ×2 and slower to reach; the lever had stopped moving.

Both are recorded in `src/sim/constants.ts` beside the table they would have
changed.

### Loose ends

The **Construction Yard art** is now orphaned — six of seven buildings had just
been repainted and the yard was the last one carrying a faction banner, which is
a problem that has solved itself. Its masters and manifest entries want
retiring. The **Coral Kiln** is still the one works drawing a placeholder glyph.

## Training Facility becomes Barracks

Sean, 20 September: *"Change 'Training Facilities' to 'Barracks' across game."*

A label change, and the vocabulary rule already says how to make one: the word
lives in `src/data/terms.json` and everything that shows it reads it from there.
So the change is one line, plus the places that had spelled the old name out by
hand — two sentences in the Glossary and the tutorial's build card, all three
written before the label existed to be read.

### The key does not move

`training_facility` stays the id. That is the precedent the file already sets:
`refinery` is the key for the Lumber Mill and `mine` for the Gold Mine, and
neither was renamed when its label was. An id is code — this one is a
`FacilityType` member, two art slugs, and the `.webp` files on disk behind them
— and renaming it would have touched about sixty lines and two binaries for the
sake of a word no player reads. The vocabulary test is written against the words
*with a space in them* for exactly this reason: `training_facility` and
`training-facility` both survive it on purpose, and the test says so.

### Barracks is already plural

The one real trap, and it is the kind that only shows on screen. The
idle-buildings chart filter built its hint by sticking an `s` on the label:

```ts
`— ${terms.facilities.training_facility.toLowerCase()}s or ${...shipyard...}s —`
```

Against "Barracks" that reads ***barrackss***. It names the works singular now —
*"a barracks or a shipyard"* — and the vocabulary test checks the rendered
`CHART_LAYERS` hints rather than trusting the sweep, because anywhere else that
pluralises a facility label is the same bug waiting.

English is otherwise kind here: *barracks* takes a singular verb, so the
Almanac's generated sentence came out as *"a shipyard lays down hulls and a
barracks drills troops"* with nothing to fix. Confirmed on a live page rather
than assumed — the Buildings tab and the encyclopedia both read correctly, and
the built bundle contains no "Training Facilit" and no "barrackss".

### Two tables that were a day stale

`docs/rebellion-terms.md` is the table Sean's own Rebellion vocabulary is read
against, and section 9 of the world bible is the conversion packet. Both said
**Training Facility | Kept** — and both still listed the **Construction Yard**
as kept too, a day after it was cut. Fixed together, because a translation table
that is wrong is worse than no table.

Section 9 also turned up a name collision worth recording: **Marine Barracks**
was reserved there for the *Advanced* Training Facility, the 2× speed tier. That
tier does not exist in this game — Craft grade does the upgrading — so the plain
Barracks takes the word and the reserved name is retired rather than left to
collide with it later.

## Errand goes back to Mission

Sean, 21 September: *"I don't like errands. Mission is the word we want to
use."* That reverses the 17 September ruling, which had retired *mission* in
favour of *errand* — and it is the second reversal in four days, after Company
became Troop on the 19th.

Two reversals is enough to say what the rule actually is. It is **one word per
idea**, not *this particular word forever*. So the thing to optimise is not
picking the right word first time; it is making a change of mind cost almost
nothing.

### Why it was cheap

Because the 17 September pass had been careful about exactly this. It took
*mission* out of the **labels** and deliberately left it everywhere it was
code — `MissionType`, `on_mission`, the `'mission'` event kind,
`missionsOffered`, the `missions` chart-layer id, `missions.ts`,
`MissionChoiceSheet.tsx` — on the stated grounds that none of it is read by
anybody, and that renaming the layer id alone would have broken saved filter
orders.

That judgement is what made this reversal a morning's work rather than a
refactor. The code never stopped saying mission, so turning the word round cost
a value in `terms.json`, a direction in the test, and the sentences a player
reads. **Retire words from prose, never from identifiers** — now written into
CLAUDE.md, because it is the reason this was easy and the reason the next one
will be.

The keys `errand` and `errands` stay in `terms.json` for the same reason. A key
is code. It reads a little odd — `terms.errand === 'Mission'` — and that is the
correct trade: an honest mismatch in one file beats renaming a key across forty.

### The method: invert the guard, let it find the sites

Rather than grep for "errand" and judge 300 hits by hand, I inverted
`vocabulary.test.ts` first — it now forbids *errand* in player text — and used
its own extraction rules to list the sites. That filters comments automatically,
which matters here: the files are full of Sean's memos quoted back at the code,
and the test's own doc note says rewording those *"would be falsifying the
record of why the code is the way it is."* Thirteen real sites, all prose.

Sean's button by name: **Assign Mission**, replacing *Send on errand*.

### Two holes the reversal exposed

Both were in the guard itself, and both had been there since the vocabulary
pass was written.

**1. A one-word label looks exactly like an identifier.** The sweep skipped any
quoted string matching `/^[A-Za-z_]\w*$/` as code. So it walked straight past
the encyclopedia's own section heading — `title: 'Errands'` — and the entry
named `'Errand'` directly beneath it. A whole Glossary page about the retired
word, invisible to the guard written to retire it. The rule now skips a
**lower-case** single word as an id and checks a **capitalised** one as a label.

**2. The sim was never swept at all.** `vocabulary.test.ts` read `src/ui` and
`src/data` and nothing else. But player-facing prose lives in `src/sim` too:
Reyne's power blurb — *"Any errand he leads makes the passage in half the
time"* — is in `constants.ts`. The file already half-knew this, because it
checked the chart filters through `CHART_LAYERS` one at a time, which is the
shape of an exception that should have been a rule. There is a `simSources()`
sweep now, with its own non-vacuity check.

Neither hole was about *errand*. They were both waiting for any future word.

### Verified

798 tests green. The built bundle contains no player-visible "errand" — every
remaining occurrence is a key or a property that renders **Mission**. On a live
page the chart filter chip reads **Missions**.

`doctrine.json` prose was updated too. It is the opponent's rulebook and is
never rendered, but it ships in the bundle and describes the same rules, so
leaving it saying *errand* would have made it the next person's puzzle.

## Attack actions, named and first

Sean, 21 September, on a squadron lying off an enemy island: *"Change these
terms — Attack Actions: Bombardment, Invasion. Put this at top."*

The two buttons read **"Shell the town — 30 a day"** and **"Land 2 against 2
ashore"**, and they sat *under* Set sail. Two problems in one screenshot: the
orders described the act instead of naming it, and the two that decide a war
were the two furthest down the list.

Now there is an **Attack actions** heading, and under it **Bombardment** and
**Invasion**, above Set sail and Break off. The heading only renders when there
is something to head — a squadron with no troops lying off an island it already
holds has neither order and gets no row.

### The numbers were not the problem

A rate of fire and a balance of troops are the whole of what you are deciding,
so they stayed — they moved to a second line under the name, muted:

```
Bombardment
the town · 10 a day

Invasion
4 against 2 ashore
```

What went is the *sentence* around them. The wall/town distinction survives as
that second line, because it is a real rule and priced like one: while a wall
stands the guns are on the wall, and past that they are on the town, which is
the shot the whole world hears about.

### The button was the odd one out, not the encyclopedia

Worth noting, because it makes this a smaller change than it looks:
**Bombardment was already the word.** It is a ship stat in the Almanac, a
Glossary entry, and a heading in the rules. Only the order itself was saying
something else.

The other half was not: the Glossary called it **Landing**. That entry is
**Invasion** now, so the encyclopedia and the order agree. *Landing* survives in
the sentence under it — "no landing can be made while a Fortress still stands" —
which is the standing rule: a label uses the agreed word, and prose keeps its
voice.

### Verified on a built state, not by clicking around

A fleet lying off an enemy island with troops aboard is several minutes of play
away, and this project has no React render harness — its UI tests read source
as text. So the check was to build the state with the sim (`vite-node`: a Crown
squadron off Avermere, four troops against a garrison of two), write it to
`localStorage` under the real save key, and load it through the game's own
Continue path. The rendered order block:

```
section-title        :: ATTACK ACTIONS
btn orderbtn--stacked:: Bombardment / the town · 10 a day
btn btn--primary     :: Invasion / 4 against 2 ashore
btn                  :: Set sail
```

That is worth keeping as a technique. Any UI that only appears in a state the
opening does not contain can be reached this way in about a minute.

## The lore package, part two (21 September)

Picking up where the 20 September pass stopped. Parts A4, A5, A6 and the
nineteen staying-put notes of Part C were already in; this does the rest of
what the chart painting does not block.

### First, a conflict to state

Part C's island table names the Crown's seat **The Aldermain**, and Part E
lists "The Aldermain and Highwater" as already done. **That is superseded.**
Sean, 21 September: *"Aldermain is the big island not the port! Revert the port
back to the name Highwater."* The package is dated the 20th; the ruling is
newer, so the location is Highwater and the Aldermain is the landmass it
stands on. Nothing here reverts that.

### Part A 1 — Freeport, finished

The island was already renamed at runtime, but two things still said otherwise:
`hqLabel` was `"the meeting place"`, and the title screen opened *"You begin at
a meeting place beyond the Crown's charts."* Both say Freeport now. The phrase
survives in comments and test names, where it is description rather than a
label — Freeport **is** the meeting place.

### Part B — the three safe renames

Whalers' Reach → **Windward Reach**, and The Merchant Sea → **The Long Sea**.
Wreckers' → **Sunken Reach**. Cinder → **Mire Reach**. Plus the six in-place
island renames: Ashcombe → Starpath, Oakhanger → Chimehouse, Sawtry → Outrigger
Bay, Pitchcombe → Longreef, Tarmouth → Palmfall, Tamalu → Reedmoot, each with
the note Part C gives it.

Four files key off these names and all four had to move together:
`reaches.json`, `chart.json` (position lookup is `ReachName/IslandName`),
`island-art.json`, and the `LOOKS` archetype table — which is keyed by **sea**
name and exists in two copies, `galaxy.ts` and `scripts/island_art.py`, held in
sync by a test. Renaming the sea renamed a key in both.

Three consequences worth recording:

1. **`island-art.json` is generated, and the rename invalidated it.**
   `island_art.py` walks the islands *alphabetically* and spaces borrowed
   paintings so a screen of eight is not a wall of the same picture. Renaming
   six islands changed that order, so the solution went stale and the spacing
   test failed. Re-running the generator fixed it and improved it: worst
   8/8 distinct, mean 8.00.
2. **The Long Sea needed a new blurb.** The old one led on whale oil, and
   whaling belongs to the Urskin in the Far Sea — which is the reason the name
   was retired. The replacement is written from the package's own identity line
   for Windward Reach rather than invented.
3. **A test pinned the three Reach names** to check what *contested* means.
   That is a field on the data, so it asks the field now: renaming a Reach
   should never fail a test about roles.

**The archetypes did not change.** Windward Reach still draws the old Merchant
Sea's `port-city / jungle-isle / mining-isle`, so its islands do not yet *look*
like "open blue ocean and scattered atolls". The package gives that identity in
prose and names no archetypes, and the rule is not to invent — so this is
flagged rather than guessed.

### Part A 2 — Coralhome opens Crown-held

The founding wound, and now it is on the board: Crown-held on day one,
garrisoned six like a capital, support **12** — about as far from reconciled as
the scale goes — its reef already cleared, and its note the package's own words.

Four things had to be got right, and three of them were bugs found on the way:

- **The kilns go with the bed.** Stripping the coral deposits alone left seed
  501 opening with two Coral Kilns standing on a bed that no longer existed.
- **No beast.** Charting the island for the Crown put it in breach of the
  standing rule that nothing is ever placed in water a side has charted.
- **`beastSeen` is an invariant.** Setting it to `undefined` broke the save
  round-trip: `loadGame` fills one in for pre-creature saves, so the key
  vanished on write and came back on read and the states stopped matching. It
  is reset to `{empire: false, alliance: false}`, not removed. Only the
  persistence test caught this.
- **No makers.** Seed 17's Coralhome carried a **shipyard**, which `hold` would
  have handed to the Crown — a second slipway on day one, against the
  deliberate one-of-each opening, and *only on some seeds*. A hidden advantage
  is bad; one that depends on the dice is worse. Earners and walls stay; makers
  come off.

### What it costs the Crown, measured

Twenty wars, seeds 9000+, the Reach renames present in both runs so this
isolates Coralhome alone:

| | before | after |
|---|---|---|
| Crown — Confederacy | 6 — 14 | **4 — 16** |
| median length | 624 | **492** |
| Crown islands at end | 18.9 | 17.1 |
| Crown hulls at end | 25.6 | 21.2 |
| Lords taken | 0.90 | 0.70 |

Two wars in twenty, and a war a fifth shorter. That is a real handicap and it
is not a mis-tune: a deeply sullen island on the far side of the world, holding
six troops that cost upkeep and defend nothing, sitting in the Confederacy's
own frontier as the easiest prize on the board. The founding wound costs the
Crown something, which is thematically exactly right.

It is also a Crown nerf on a side that was already losing, so it **compounds**
the problem #125 describes rather than relieving it. Kept, because Sean asked
for it and it is canon; recorded, because the manhunt is now the more urgent
fix and not less.

### Still blocked, unchanged

The five cross-Reach moves and the six new islands still need the chart
repainted — the painted landmass is where the position comes from, so moving an
island between Reaches puts it in the wrong part of the sea, and a new island
has no land to stand on. Part A 3's coral-bed mechanic (a slipway on a bed
unlocking the reef hulls; the Crown able to clear one) is also still open, and
now partly overlaps Sean's later 20 September deposit model, which placed coral
by the 40/60/30/10 roll in Coral Reach rather than on "3 islands per game".
That overlap needs his call.

## Option B: six new islands on the paint we have (21 September)

Sean: *"B - work with paint we have."* And on coral: *"A3 is wrong. On the
coral reach anytime a forest would have appeared instead make it coral at game
start. That's it."*

### A3 is cut, and it was already built

His coral rule is exactly what `groundOf` does — `const staple = reef ? 'coral'
: 'forest'`, with `reef` true for Coral Reach only, at generation. So there is
no work: the slipway-on-a-bed unlock, the Crown clearing a bed, and the "3
islands per game" placement setting all go. Checked that nothing in the live
game promised the unlock — the reef hulls exist only in the new combat roster,
which is not wired in yet.

### The six islands fit, with room to spare

The detector finds far more painted landmasses than there are islands: it hands
each Reach's islands the biggest pieces in its group and the rest go unused.

| Reach | blobs | islands | spare |
|---|---|---|---|
| Rime | 47 | 6 | 41 |
| Windward | 27 | 9 | 18 |
| Sovereign | 37 | 15 | 22 |
| Sunken | 26 | 8 | 18 |
| Mire | 17 | 8 | 9 |
| Coral | 27 | 8 | 19 |
| Salt | 30 | 9 | 21 |

So option B is just: add the island to `reaches.json` and re-run
`chart_positions.py`, which asks the group for one more landmass and gets it.
Driftway and Nine Reefs to Windward, Singing Shallows to Coral, Keelhaven to
Rime, Cane Hollow to Mire, Belfry Shoal to Sunken. **Sixty-three islands to
sixty-nine.** The five cross-Reach moves stay dropped, as option B implies.

Belfry Shoal drew the smallest blob on the chart, `land: 0.007`, which is a
lucky accident: *"open water with one bell tower standing out of it"*.

New islands get seeds by the same sum-of-character-codes the frozen ones were
computed with — still the fallback in `galaxy.ts:591`.

### Three derived things, and one latent break

`chart.json` and `island-art.json` are both **generated**, and both had to be
re-run. The art spacer walks islands alphabetically, so six new names changed
the order; re-running kept it at worst 8/8 distinct, mean 8.00.

The latent break: `scripts/chart_positions.py` holds the seven Reach names in
its own hand-placed `SEEDS` table, and the renames earlier today had not
reached it. Nothing failed, because nobody regenerates the chart on an ordinary
day — it would have failed the next time the painting changed, with the reason
long forgotten. Fixed, and the table now says the names must match.

### Two bugs the new islands shook loose

Adding islands moves the RNG stream, which is a good fuzzer.

1. **`inProse` was never applied to people.** Seed 11 started signing on **The
   Widow Ashgrave** — the one character whose name wears an article — and the
   dispatch read *"put there by The Widow Ashgrave"*. The helper was documented
   as being about island names; it is about names. Two character sites fixed,
   plus `economy.ts`, where the march-ashore line I wrote this morning said
   *"onto The Kettles"*.
2. **A probabilistic rule asserted as a certainty.** The warm-island join test
   ran one world and one roll stream and expected a flip. Joining is a chance
   after a good meeting — Sean cut the old 80-and-it-flips arithmetic on
   purpose — so the test only ever held while seed 301 was lucky. It measures
   twelve worlds now and wants most, never all.

   Worth keeping: the first rewrite still read **3 of 12** where a played-out
   war gives 6 of 8, because `runDays` takes its own seed and I passed a
   constant — all twelve trials shared one dice sequence. One stream wearing
   twelve hats is not twelve trials.

### And the balance came back

Twenty wars, seeds 9000+:

| | before today | Coralhome only | + six islands |
|---|---|---|---|
| Crown — Confederacy | 6 — 14 | 4 — 16 | **9 — 11** |
| median length | 624 | 492 | 636 |
| Lords taken | 0.90 | 0.70 | **1.45** |

Coralhome on its own pushed the Crown down; the six islands more than gave it
back, and the war is the closest to even it has been. The Lords number is the
telling one — 0.70 to 1.45. More islands means more places to hide, which
should make the manhunt *harder*; instead the longer war gives the Crown the
time it never had. That is evidence about #125 worth keeping: the Crown's
problem is not that the Lords are well hidden, it is that the war ends before
it can look.

## Renames are cheap in the data and expensive in a save (21 September)

Sean, on a day-33 Crown game, minutes after the renames shipped: *"Whoa!!!!
All island broke in wrong spots now."* The chart showed **Cinder**,
**Whalers'** and **Wreckers'** as loose clusters of dots floating in open
water, while **Sovereign**, **Coral** and **Salt** sat correctly on their
painted land. That split is the whole diagnosis: the three that broke are
exactly the three that were renamed.

### What actually happened

A save carries its own `sectors[].name` and `systems[].name`. The chart is
`src/data/chart.json`, which ships **with the build**, and the interface looks
a position up by `ReachName/IslandName`:

```ts
ISLAND_PLACES.get(`${sector.name}/${system.chartName ?? system.name}`)
```

Rename either half of that key and every save written before it misses. There
is no error — `GalaxyMap` has a `fallbackSpot()` for a Reach the painting has
never heard of, which rings the chain around the middle of the sea. It is
designed for a new Reach on a bigger map and it did exactly what it says, to
half the world, silently.

Deploying is shipping here: pushing `claude/**` updates the Pages build under
a player mid-game.

### The fix, and where it belongs

On the **load**, with the other migrations `persist.ts` already carries —
fleets, craft, the Boom's removal, `beastSeen`. `loadGame` now maps old Reach
names, old sea names and old island names to current ones, including
`chartName`, which is the real chart key for Freeport since that island is
renamed at runtime and keeps its painted name there.

**The rule this establishes:** anything renamed on the chart goes in that
table, and stays there for as long as saves from before it might be opened.
A rename is a one-line data edit and a save-format change at the same time,
and only the first of those is visible while writing it.

### The test

`savenames.test.ts` builds a save the way the old build wrote one, loads it,
and asserts every Reach and every island resolves to a painted position — by
the exact key the interface uses, not an approximation of it. It also has a
non-vacuity case proving the fixture really is broken without the migration
(the three Reaches the chart cannot place are named), and a case proving a
current save round-trips untouched.

Confirmed in a browser on a day-33 save: every dot back on land, labels
reading Windward, Sunken and Mire.

## The name was the secret (21 September)

Sean, playing the Crown: *"Haha I just noticed something — if I play imperium
it tells me where free port is lol."* Opening any unexplored island in the
frontier put **Freeport** in the Location header. The one question the entire
Crown campaign is built on could be answered by tapping round the map: no hull,
no mission, no day spent.

### Why it happened

Freeport is a *real rename*. The generator draws an uncharted island each war,
calls it Freeport, and keeps the painted name in `chartName` so the chart can
still find its rock. That field has existed since the island was introduced —
but only for **position**: `GalaxyMap`, `ChainMap` and `ChartMark` all look up
`chartName ?? name` to find where to draw, and every one of them then printed
`name` as the label.

So the machinery to fix this was already there, pointed at the wrong half of
the problem. The chart knew the island by two names and told the player the
secret one.

### The rule

`chartedName(system, faction)` — an island you have not explored reads as the
charts have it. You learn what a place is *called* by going there, which is the
same rule as everything else about it: the Crown is told a meeting happened and
that islands are declaring, and has to find where.

It is the identity function on the other sixty-eight islands, which have no
`chartName`, and a test asserts exactly that so the helper can never quietly
start rewriting ordinary names.

Applied at four display sites: the unexplored Location sheet (the one in the
screenshot), the Reach map's island label, the Reach list row, and the mission
target sheet — Explore can be pointed at an uncharted island, so that picker
named it too.

**The coastline seed is deliberately left alone.** `islandPath(system.name)`
generates the drawn outline, and switching it to the charted name would make
the island visibly change shape the moment it was explored. A shape is not a
name, and a pop is worse than the tell.

### Verified on both sides, which is the part that matters

A fix that hides it from everybody would look identical in a Crown test. So:
as the **Crown**, the Reach map and the sheet read **Varrow**; as the
**Confederacy**, on the same seed, the same island reads **Freeport**. The
first browser pass looked like a pass and was not — the page had started a new
game on a random seed and landed on an island that happens to be called Varrow
anyway. Seeding the save is what made the check real.

## The missions cluster (21 September)

Four of Sean's notes were one piece of work, because the first two cut things
that the third needed somewhere to go.

### What came off the sheets

**The odds table, off the character sheet** (*"Cut this entire section. This
should be in rules not character block."*). It listed Parley 60% +12.0,
Incitement 99% −13.0, the Recruit range, the passage rule and the days ashore —
on the sheet of a person who might be sent on none of them. Those are the rules
of missions, identical for anyone with the same ratings.

**The Recruit explainer, off the island sheet** (*"Cut this section. This
should be simply in the encyclopedia section for missions."*). It taught the
whole rule — the loyalty floor, what a Recruiter does, how long the table
stands — on the Crew tab of every island you hold.

**The Favorable chip and the ± factors, off the mission cards** (*"Cut the
'favorable' etc from missions."*). Where you send somebody is the choice; a
verdict printed on the card does the choosing for you.

Each cut left dead code behind it — ten imports, a local `harborAt` fixture, the
`Marks` component, `standingFor` and the derived `party` — and all of it went
with them. A cut that leaves its machinery behind is half a cut.

### What they moved into

A **Missions page** in the encyclopedia, between Locations and Rules: how a
mission works, then every mission with its painting, what settles it and where
it can be pointed, then the Recruit rule.

Two things made it worth doing properly rather than as prose:

- **The blurbs are shared now.** `WHAT` lived in `MissionChoiceSheet`; it is
  `MISSION_WHAT` in the sim, read by both the sheet and the page. Two copies of
  a description is two descriptions, diverging the first time either is edited.
- **`MISSION_SETTLED_BY` is read off the code, not remembered.** Every line has
  a branch in `successChance` that proves it — sabotage is Espionage *and*
  Combat averaged, research is Espionage, incite is Leadership. I would have
  guessed at least two of those wrong.

### Research, while I was in there

Sean on "In the yards": *"This makes no sense: Just make research the mission.
And it applies to buildings, ships, and troops."*

The mission is **Research** now, and `effectiveSpec` no longer gates the craft
discount on hulls. It read:

```ts
if (!isShipClass(item)) return { costGold: spec.costGold, days: spec.days };
```

The reasoning for that line was legibility — one effect is easier to notice
than three. The cost was a mission worth **nothing at all** to a side that was
not building ships that month, which is most months. One grade now takes its
cut off a mine, a wall, a troop and a first-rate alike.

Measured over twenty wars: **8–12 against 9–11**, median 576 against 636. Inside
the noise on twenty, so the wider discount is not a balance change — it is the
same saving spread over more of what you buy.

## The purse, the fortnight, and one word for what an island earns

Three of Sean's notes that turn out to be one idea: the economy was being shown
in a unit nobody settles in, in more figures than anybody reads, under two
different names.

### Upkeep is a fortnight now (#130)

*"All places that show maintenance costs, change to fortnight cost instead of
per day. And you don't need to say how long. Just say 'Upkeep X' and gold
symbol. Keep it simple."*

The books still run per day — that is what `UPKEEP_PER_DAY` is and what the
settlement charges. But per-day is the wrong unit to *read*: the ledger pays
once a fortnight, so a figure per day is a number the player has to multiply by
fourteen before it means anything against the balance they were just shown.
`perFortnight()` in the sim, and `GoldFig` no longer prints a duration at all —
its `per` defaulted to `'day'`, so every call site that did not think about it
was saying `/day` by accident.

### The purse (#131)

*"This section needs cleaning up. ui is awkward. Let's make it just show gold
and the delta next to it. Then click on the gold and it expands."*

The rail was GOLD, IN, OUT and CLEAR — four figures fighting for a 393px phone,
and only one of them answers the question a player has at a glance. It is the
delta, by Sean's own earlier reasoning: *"do I want to use available land to
produce more income or build stuff... that decision should largely be based on
what's my maintenance deficit."*

So the rail is **what you have and which way it is going**, and the breakdown is
a tap away. Which also retires, rather than wins, the CSS specificity fight the
old ledger caused: the whole reason `.console .plaque--ledger { flex: none }`
had to exist was four figures that no longer compete for the room.

**The trap in the replacement**, and it is a subtler version of the same kind:
the panel is absolutely positioned, and the obvious ancestor is wrong.
`.console` scrolls sideways with `overflow-y: hidden`, so a panel anchored
there is clipped the instant it drops below the row. It hangs off `.topbar`.
The console test guards that now instead of the plaque it used to guard.

That test needed one more fix to be honest: `not.toContain('.plaque--ledger')`
caught the *comment* that records why the narrow-screen block sits where it
sits. A guard that cannot tell a rule from a comment about a rule would have
forced that history to be deleted to stay green, so it strips comments first.

### Production, not Income (#138)

Sean picked **Production** when shown that the chart filter said one thing and
the ledger said another for the same idea. Worth noting he picked against my
recommendation and against his own earlier wording: his sketch for this very
panel read *"Available Gold / Upkeep Cost / **Earnings** / Surplus"*, which was
a third word. One word per idea means one, even when the third is your own.

The chart filter reads `terms.income` now rather than a literal, and the
vocabulary guard forbids *income* and *earnings* in player text — over `src/sim`
as well as `src/ui`, which is the sweep added earlier today. It found exactly
one real site, in the Locations rules.

## The war ends on a screen now (#122, 21 September)

A war ended in eight words. `.verdict` — one bordered line, 13px, *"The Seven
Seas are yours. Victory."* — over the chart, and that was the whole of what
thirty-two months came to. Asked whether the closing screen should be the
dispatch or the tally, Sean: *"Both, stacked."*

So it is three things and the order is the argument. The **dispatch** is the
log's own closing line, in the world's voice. The **figures** are what each
side had left, which is the only place in the game the two columns are ever
set beside each other. The **deciding lines** are the three or four entries
that actually settled it. Told, shown, then given the evidence.

### Which lines decided it is not a judgement call

Nothing here scores events for drama. The two sides win differently and each
win condition names its own evidence, so the selection reads the win condition
backwards: the Confederacy wins by taking one island, so the thread is that
island's last days; the Crown wins by holding three people at once, so the
thread is the three captures.

### The bug that only a long war has

The log holds four hundred lines. Measured over twenty wars this session, a
spell in irons runs **138 days** — so in a war of a thousand days the capture
that decided it has scrolled out of the log before the war ends, and a closing
screen built on the log alone would have shown the Crown's victory with one
capture named and two missing. It is the kind of bug that passes every test
written against a short war.

`Character.takenOnDay` is the fix and it is one optional field: the day is the
fact, the log entry is the sentence, and they come apart on purpose. The day
is always there; the sentence is there when it is, and the screen writes its
own line when it is not. Cleared with `delete` rather than set to `undefined`
when somebody walks out of a cell — the beast-seen bug earlier today was
exactly that, a key that vanished on write and came back on read.

### What the screenshot caught that the tests could not

The larger figure of each pair was marked in the outcome accent. On a lost war
that accent is red — and the Crown ends most defeats **ahead on islands, hulls
and troops**, which is the story of the defeat. So the screen painted the
player's own advantages in the colour of losing. The mark means "more", which
is not a verdict and must not be coloured like one; it is weight and a faint
pill now. Nothing in a build, a type check or 818 tests says a word about it.

"In irons" went the same way: under a faction's column it reads as that side's
people in irons, and the figure is the opposite — how many of the *other*
side's it is holding. **Prisoners held.**

## The manhunt, measured (#125, 21 September)

Sean, on what to do about the three wars in forty that stall with the Crown
ahead and a Lord unfound: *"Let me measure first, then propose."* So
`lab/manhunt.ts` measures the manhunt rather than the war. Four things could be
wrong and they want different fixes — the Crown cannot *see* the Lords, cannot
*reach* them, never *tries*, or tries and *fails* — and only a measurement
tells them apart.

### Forty wars, seeds 9000–9039

| | |
|---|---|
| Crown — Confederacy | 17 — 23 |
| **never ended** | **0 of 40** |
| a Lord liftable by the Crown | 73% of days |
| a hunt running | 61% of days |
| liftable and nobody sent | 20% of days |
| world charted by the Crown | 75% |
| the Lord's own island charted | 64% of Lord-days |
| abductions sent | 9.7 a war |
| most Lords held at once | 1.9 of 3 |
| days holding two of three | 82 a war |
| freed out of the Crown's cells | 1.6 a war |
| a spell in irons | 120 days |

**The stall in the ticket is gone: none of forty.** Nothing was done about the
manhunt to make that happen — it is the map growing. Measured when Coralhome
and the six islands went in: Lords taken went 0.90 → 1.45, and the note then
said why. *"More islands means more places to hide, which should make the
manhunt harder; instead the longer war gives the Crown the time it never had."*

**And it is none of the four.** The Crown can see a Lord on three days in four
and has a hunt running on three days in five. It is not blind and it is not
idle. It reaches **two of three and holds it for eighty days**, and then 1.6
Lords a war walk back out of its cells. The wall is the third simultaneous
capture, which is not a bug in the hunt — it is the victory condition working
as designed.

### Tried and cut: three hunters

The one soft number is that a Lord is liftable and nobody is out after one on
**a fifth of all days**, which reads like `AI_HUNTERS = 2` doing it. It is not.

| | two (ships) | three |
|---|---|---|
| Crown — Confederacy | 10 — 10 | 9 — 11 |
| Lords taken a war | 1.50 | **1.35** |
| liftable, nobody sent | 18.6% | **21.4%** |

A third slot goes wherever the first two go: an officer is spent on whatever
`worth` rates highest that morning, and a Lord already outranks nearly
everything, so raising the cap moves people off parley and research and buys
no extra captures. Both the captures and the passed-over share got *worse*.
Recorded beside `AI_HUNTERS`.

### The proposal

**Nothing, and the reason is the measurement.** Do not build the Crown a way
to *find* Lords that scales with effort — the thing that was proposed when the
ticket was filed — because finding them is not what it is short of. That would
make the Crown stronger in the one dimension it is not weak in.

The dial that does move this is already found, already measured, and already
has a note saying not to turn it by accident: a rescue penalty specific to a
Lord. Ninety-six wars said nothing at −0.07, nothing at −0.11, and **56 — 37
with every war finished** at −0.15. *"Nothing, nothing, nothing, then the
game."* It is the right dial for a **difficulty setting** and the wrong one for
a balance change, and the war is 17 — 23 without touching it.

## Two lines, one game (21 September)

Sean has been running a second session against the same design docs, and sent
a twelve-patch series cut from the same commit this branch left. Both lines
had independently built the per-cannon engine and the live roster swap; each
had work the other had never seen.

**The series is the mainline where they overlap.** It was built with the
design docs to hand, and its own later patches stand on its versions of the
engine and the roster — keeping this branch's versions would have meant
rewriting three of its patches against them for no gain.

| | |
|---|---|
| superseded here | the roster swap, the round rewrite, the Blackwater placement, the 4:3 plate |
| kept from here | Freeport hidden until charted, the missions cluster, the purse, the closing screen, the manhunt measurement |
| new from the series | the siege as two ordered actions, overkill, bombardment odds shown before a tick is spent, result screens, the coral hulls retuned, and **two Crown principals to lose** |

### The series answered this morning's balance problem

Measured here at dawn: the Crown lost **2 — 9** while ending every war ahead
on ground, and the note above concluded the cause was the two ladders'
maintenance and left it for the next roster export. Sean's 0009 found the
better answer, and it is a design answer rather than a pricing one:

> *"the crown wins the map and loses the war. Let's give them two characters
> that need to be captured also."*

The two win conditions were never the same kind of thing — three people across
seven Reaches against one fleet reaching one island. Now both sides win by
holding people, and twelve wars read **Crown 7 — Confederacy 5**, all of them
finished, median 780 days, audit clean. The maintenance asymmetry is still
real and still on the sheet; it is no longer decisive.

### What the integration itself had to settle

- **`effectiveSpec` disagreed with its own comment.** The ground roster priced
  troops per island and left `if (!isShipClass(item)) return` above the craft
  cut, so the doc said research applies to a mine, a wall, a troop and a
  first-rate alike and the body applied it to hulls. Sean's ruling is the
  comment.
- **The closing screen was built on a rule that no longer exists.** It read
  the capital's last days as the evidence for a Confederate win. Both sides
  hold people now, so the evidence is symmetric — three captures and two — and
  it asks `isPrincipal` rather than `isLord`.
- **Both vocabulary rulings survived** in `terms.json`: the Defenses section
  and the Production/Income decision were appended to the same comment on
  either side.
- **The troop-role fix had to be re-applied**, since it lived in a merge
  commit the cherry-picks could not carry. The series carries the same
  regression: capital detection 143.1 against 100.5 before the ground roster.

### Worth saying plainly

Two sessions building the same features from the same docs cost a day of
duplicated work on the engine and the roster. Whichever line is canonical, it
is cheaper if only one of them builds a given thing.

## The economy goes to the sheet's own scale (21 September)

The thirteenth patch of the series, and the one that overturns the most. The
three divisors in `roster.ts` were a guess made to reconcile two scales that
turned out to be the same scale. Sean, asked directly, took them all away:

- **A build day is a game day.** *"If it's talking about the ships it's how
  many game days does it take for the ship to be completed and usable."* A
  Majestic is twelve hundred days, not a hundred.
- **A gold is a gold.** Island income of 9/6/3 a day is "about right", so the
  sheet and the island economy were always on one footing.
- **Upkeep is recomputed rather than divided**, from the sheet's own
  `maintenanceBands`: On Rate is 1% of build cost per day, and that is what
  every hull pays.

The days divisor is the one that looks alarming and is not, and the reason is
a rule already in the game: **build time divides by how many yards of that
kind stand on the island**, asked fresh every morning. A Majestic is 1,200
days at one slipway and 200 at six. So the roster's days are not a wait, they
are a price in shipyards — which is the decision Sean says the game is about:
*"are you building income producing facilities or are you building stuff that
makes you ships?"*

### What the integration had to settle

Two fallbacks now point in opposite directions in `troops.ts`, and left as
delivered the pair was a crash waiting for one bad data edit.

- **Mine:** a side with no *line* company it can raise yet posts its sailors.
  That is the Crown, whose Fensworn are behind R2.
- **Theirs:** a side whose *sailors* are behind research has none, and the
  roster falls back to the line company. That is the Confederacy, whose
  Brethren are behind R2 — a live bug, since every Confederate island with a
  slipway had been posting a company that does not exist yet, on day one.

Both behaviours are right and neither reaches the other today. But `lineOf`'s
fallback was a non-null assertion standing on a function that can now return
`undefined`. Both now read a shared `raisable(faction, role)`, so `lineOf`
never calls `sailorsOf` at all and could not deadlock even if a side were
missing both; and a side missing both throws a named error naming
`troops.json` rather than surfacing as `undefined.name` three files away.

**`game.test.ts` had pinned a seed for the third time**, and this time the
rewrite it should have had twice before. The Confederacy's victory condition
is no longer taking Highwater — since the Crown gained a second principal it
is both of them in irons at once, and the capital is merely how that usually
happens. Seed 2 now demonstrates the difference rather than the rule: at day
3,000 the Confederacy holds Highwater and has still not won, because the
Regent sailed the week before. The test finds a war the Confederacy wins and
asserts the condition it won on, so only the rule changing can move it.

**On the conflicts with this branch's own upkeep work**, the rule given was
"my numbers, your structure", and in the event the two agreed: their
`Math.round(n * FORTNIGHT)` and this branch's `perFortnight(n)` are the same
function, and `GoldFig`'s `per` already defaulted to `null` here. So their
prose and their per-unit troop price went in, expressed through the helper.
The glossary entry is theirs entire — it is the one place the two rings on the
date are explained, which is the whole point of leaving them unlabelled.

### Re-measured on the merged tree, and it does not match theirs

The patch reports twenty-four wars at **Crown 15 — Confederacy 8, one
unfinished**. On this branch, same harness, same twenty-four seeds:

```
Crown 9 — Confederacy 11 — unfinished 4
length: min 360  median 1368  max 2595
empire    at the end: 26.7 islands, 29.0 hulls,  3,195 gold, craft 6.2
alliance  at the end: 22.5 islands, 58.5 hulls, 23,477 gold, craft 4.9
Lords in irons at the end: 1.33 of 3
no rule broken in any war.
```

Four wars in twenty-four that never end, against their one. That is the
number, and it is not being tuned away: the divisors stay at one and upkeep
stays at the sheet's own On Rate, because the instruction on this patch was
explicit that a bad measurement is to be reported rather than dialled out.

**The likely cause is this branch's own troop-role fix**, which the series
does not carry. Crown Marines are `elite` here rather than `line`, so the
capital's watch is 124.0 where the series measures 143.1 — a 14% discount on
every covert operation against the Crown, which is exactly the side that has
to be operated against for the war to end. Re-measured after this patch the
figure is unchanged at 124.0, so the second barracks and the Crown's second
slipway moved nothing there:

```
Highwater's watch against the Confederacy, day one, 32 seeds:
  garrison   124.0 flat      idle  65.2 (55-118)
  commander    0.0           people 60.0 flat      total 249.2
```

`lab/capwatch.ts` is that harness, written because this figure has now moved
twice in two days for reasons that had nothing to do with covert play.

**The second finding is the gold, and it is #121 turned round.** The open
question was why the Crown hoards; on this tree it is the *Confederacy* that
ends on 23,477 gold with 58.5 hulls while the Crown spends down to 3,195 with
29. Nobody is short of money now that a gold is a gold — which is the patch's
own observation — so the constraint has moved to berths and yards, and #121
wants re-asking as "how many slipways does each side actually build" rather
than "who is sitting on gold".

## A UI read, and the seven of twenty-one that are done (21 September)

The other session went through every screen against the ℹ principle and came
back with twenty-one items. Its own recommendation was 1–5 first ("bugs or
near-bugs, maybe an afternoon"), then 6 to unlock the text cleanup, then 8 as
the smallest visible piece of it. That is what is built. **Items 7 and 9–21
are untouched and want Sean's numbers.**

### The worst one was invisible from the inside

Tapping outside a mission report *issued an order*. `onClose` was
`choose('return')` — the same call as the sheet's own "Set sail" button — so
the scrim and the ✕ recalled the officer irreversibly and spent the fortnight.
It is the first thing a new player does with a sheet they do not understand,
and it never looks like a bug: it looks like the game taking an order.

A `Sheet` can now declare that it **demands an answer**. Audited the other
fourteen: every other close handler is navigation, so this is the only one.

### The chrome fix had three wrong answers before the right one

Worth writing down, because each wrong answer looked finished:

1. **Chrome above the scrim.** Fixes the two-tap bug — and puts the chrome
   above the *sheets*, hiding the mission report's own orders behind the tab
   bar. Found by driving the app, not by reading it.
2. **Dispatch cards above the chrome.** Fixes that — and leaves a sheet
   painting 160px of its own colour over the tab bar, so the bar was present,
   tappable and invisible, which is worse than absent.
3. **Sheet stops at the tab bar.** The bar measures itself and publishes
   `--tabbar-h`; the sheet's underlay is deleted rather than moved, because
   the bar was already solving that for itself — its background fades into
   "the colour the canvas under a short app is painted".

The stack is now written down in one place in `styles.css`: scrims 10–12,
chrome 15, sheets 20–24, news 30–32, toast 60. A test pins the three
relations, because they live in three different rules and any one of them
alone reads as correct.

### What item 6 actually bought

`SectionHead` and `Info` were unexported inside the Almanac, so the ℹ
mechanism — built, wired through `lookUp`, and announced to the player in the
tutorial — was reachable from three screens out of about thirty. Moving two
functions to `components.tsx` is the whole of the unlock.

`EncPage` was also missing `'missions'`, so the one page in the reference
about *what you do* was the one page nothing could link to.

### Two things that could not simply be cut

- **The escort paragraph** was the only statement of that rule in the game.
  It had to land on the Missions page before the sheet could lose it.
- **`MISSION_WHAT`** is what the encyclopedia prints, so the cards got
  `MISSION_GIST` beside it rather than having the long form shortened
  underneath them.

The same will be true of item 11: the harbour panel's creature paragraph is
the only place creature mechanics are explained at all, and there is a live
bestiary on the Rules tab waiting for it.

### Anchors are checked now

An ℹ's anchor is a bare string at both ends and a mismatch drops the reader at
the top of a long page with no error anywhere. That has already happened once
and went unnoticed for days — every ship lookup landed at the top of the Ships
page from the moment the roster went in, because one end lower-cased the slug
and `getElementById` does not. `infolinks.test.ts` requires every literal
anchor a screen links to exist in the encyclopedia. It is the cheap half of
item 12 and catches the mistake that gets made.

## The floor that had research switched off (21 September)

Three more commits from the other session, and the middle one is the best find
either line has made this week.

`RESEARCH_MIN_SUPPORT` was **75**. An island a side holds drifts to
`HELD_SUPPORT_LEVEL`, which is **65**, and stops there. So the resting state of
every island anybody owned sat ten points below the bar its own shipyards
needed, and research only happened where something was actively pushing an
island upward — the Moot, or a parley nobody had a spare officer for. Measured
before the fix, the share of days a side had *anywhere at all* to research:
Confederacy 66%, **Crown 7%**.

`lab/ladder.ts` found it by watching `craftGrade` every morning rather than
reading it once at the end, and that is the whole reason it was found. A
harness that samples at the end sees a low number and calls it tuning. The
lesson is about harnesses, not about research.

The floor is now `SUPPORT_STEADY`, and the test pins the **invariant** rather
than the number: a side can always work the yards of an island that is simply,
quietly theirs. Re-measured here, Crown yard availability 73% and the
Confederacy's 90%. The ladder went the same way — three times too short, the
ceiling from 520 to 1,560 — and on this branch rung 8 lands on mean day 1,092
against Sean's target of 1,086.

## What twenty-four wars cannot tell you (21 September)

They suggested the floor bug is "almost certainly the real cause of the
maintenance asymmetry you diagnosed". Testing it properly produced something
more useful than a yes or a no, and it starts with me being wrong twice.

**The floor fix helps, and it is worth about two wars.** Same seeds as this
branch's own earlier number: Crown 9 — 11 with four stalls before, **Crown
11 — 11 with two** after.

**Then the hypothesis I had given Sean twice, measured and refuted.** I had
said this branch's troop-role fix — Crown Marines `elite` rather than `line` —
accounted for the gap against their tree. Flipping the roles back on the same
seeds:

| 24 wars, seeds 2000 | Crown | Conf. | unfinished | Lords taken |
|---|---|---|---|---|
| Marines `elite` (this branch) | 8 | 12 | 4 | 1.21 |
| Marines `line` (their shape) | 9 | 13 | 2 | 1.79 |
| their tree, as reported | 11 | 12 | 1 | — |

One win. The roles do **not** explain the win gap. What they do explain is the
*stalls*, and that half of the reasoning holds: a Crown whose every rock is
garrisoned by elites pays more for every covert operation and cannot close the
manhunt — 1.21 Lords in irons against 1.79, four unfinished wars against two.

**And then the finding that makes both of the above nearly pointless.** This
branch, unchanged, reads Crown 11 — 11 on seeds 9000 and Crown 8 — 12 on seeds
2000. Three wins apart on identical code. A side's win count is a coin flip
with standard deviation `sqrt(n)/2`, so at twenty-four wars that is 2.45 and a
three-win gap is noise.

Run at forty-eight: **Crown 17 — Confederacy 25, six unfinished**. Pooled with
the two smaller samples, eighty-four decided wars on this branch read Crown 36
— Confederacy 48, which is 1.31 standard deviations from even, *p* = 0.19.
**The sides may well be even and nothing here can say otherwise.** Their
15 — 8 to 11 — 12 swing is probably real at about 2.9 SD; their 11 — 12 against
this branch's 8 — 12 is not a difference at all.

The reasoning is now written into `lab/duel.ts` so nobody reads a 24-war win
table as decisive again, including me.

### What *is* measurable, and is the thing that matters

Wars that never end are a rate, not a coin flip, so they show up at sample
sizes the win table cannot use. Pooled over ninety-six wars this branch stalls
**12.5%** of the time (12 of 96) against the 4.2% their single run reports. If
their rate were the true one, twelve stalls in ninety-six is four standard
deviations out.

Their own instruction says it best — *"wars that end is the one thing a
strategy game cannot be relaxed about"* — and the role experiment points
straight at the mechanism: the Crown cannot finish the manhunt. Every stalled
war in every sample has the Crown ahead on ground with one Lord or none in
irons, which is #125 unchanged.

**So there is a decision for Sean, and it is a design one rather than a tuning
one.** Marines as `elite` is what the change order's own cards say and it is
the better reading of the fiction. It also costs roughly one war in ten that
never finishes. Putting them back to `line` buys those wars back and makes
every covert operation against the Crown 15% cheaper, which was the regression
the role fix existed to remove. The honest answer is that the manhunt needs a
fix of its own rather than that one of these two labels is right.

## The ship audit, and the one thing in it that was a bug (22 September)

The other session read all twenty-eight paintings against their stat blocks and
changed fifteen labels. That work is theirs and arrives as its own patch — the
fifteen renamings are not duplicated here.

**One item in it was a live bug on this branch and is fixed.** Five hulls drew
the placeholder silhouette in every fleet list and harbor while their paintings
sat in the art folder unused: the two Interceptors, the Brigantine, the
Reefwarden and the Coral-Class.

The cause is worth more than the fix. `roster.ts` maps every Ship ID to a slug
and exports `slugOf` to do it. `Almanac.tsx` kept a **second** table doing the
same job for the same twenty-eight hulls. Twenty-three agreed; five still
pointed at the filenames those paintings had before the roster renamed the
hulls. The second table is deleted rather than corrected.

**All three existing tests passed through the whole thing**, because all three
read the slug through the stale table they were supposed to be checking. The
replacement compares the live roster against the filenames on disk with nothing
in between, and names the leftovers rather than counting them — a new unused
painting is almost always one filed under the wrong name.

### The three questions it left for Sean, measured

They are size questions, and size is not cosmetic: `GUN_VS_SIZE` gives a
Gigantic target **+10** to an enemy's Long Gun hit chance and **+15** to a
Heavy, against 0 at Large. `lab/sizecost.ts` prices that.

**B — the Sovereign and the Justiciar at the same seventy-four guns.** Rounds
to sink under twenty enemy guns:

| | heavy guns | long guns | cost |
|---|---|---|---|
| Sovereign (Gigantic, 4,600 hull, armor 25) | 8.3 | 57.8 | 1,940 |
| Justiciar (Large, 4,200 hull, armor 22) | 9.0 | 49.1 | 850 |

So it is a real trade rather than a mistake: the Sovereign's size costs her
more than her extra hull and plate buy back **against heavy guns** — the
cheaper ship survives 8% longer — while against long guns she lasts 18%
longer. She is a line-of-battle ship and the Justiciar is a brawler. What is
hard to defend is the **price**: 2.3× for the same broadside, with the
survivability split. Worth Sean's eye as a pricing question rather than a
naming one.

**A — the Vanguard, Large at 28 guns and 1,900 hull.** Moving her to Medium
would take her from 3.8 rounds under heavy fire to 4.8, a 26% gain in
survivability for a hull that already costs only 275. That is a combat buff
dressed as an art fix, so it should be decided as one.

**C — the Tempest.** Medium, 26 guns, 1,500 hull, 295 gold, against a painting
of a great three-masted galleon. Her numbers sit her beside the Blackfin (29
guns, 1,400 hull) and well under the Reefwarden (44 guns, 3,400). The art
oversells her by about one size band. Either is fixable; only the stats one
touches combat.

## The build panel says nothing twice (22 September)

Sean sent back a screenshot of the ship order with five things struck through
in red and one line: *"all this red is unnecessary text."*

Two of the five had already gone in the two commits before it — the hull's
four-stat combat grid and the paragraph of flavour under it. The remaining
three are worth naming together, because they are one fault rather than three:

- **The subtitle**, "What, where, and when it will be ready". That sentence is
  the docstring at the top of `BuildSheet.tsx`, printed at the player. It
  describes the shape of the form to somebody who is looking at the form.
- **The BUILD label**, in brass small caps, directly under a title reading
  *Build Ships*. The same word twice in two lines, over a `<select>`, which is
  a control that announces itself.
- **The card's own name**, four lines under the same name in the picker with
  only the painting between them — *Wayfinder*, painting, *Wayfinder*.

Each repeats something the reader can see without scrolling. That is the fault
they share, and it is the useful thing to take away from the screenshot: the
panel had grown a habit of labelling its own parts.

**What the removals cost, and what paid for it.** The select loses its visible
label but keeps an accessible one, on `aria-label` — the pixels go, the screen
reader does not. The card loses its name but the ℹ link underneath still says
"More about the Wayfinder" on its way to the entry, so the name is never more
than a line away from where it was.

**Troops needed a different answer.** That page had no menu behind the BUILD
label at all, only a static box containing the word *Troop*, under a title
reading *Build Troops*. Stripping the label would have left an unlabelled box
with one value that cannot be changed, which is worse than either keeping it
or dropping it. So on that kind the picker goes entirely and the card is the
first thing on the sheet.

**Three CSS rules went with them** — `.unit__name`, `.unit__stats` and
`.field__static` each had exactly one caller and all three callers were in the
struck-through list. A test asserts their absence from the stylesheet, because
a dead rule is how a deleted component comes back.

And one thing the removals *exposed* rather than caused: the troop card's
110px glyph box had always sat flush left in a full-width card, with the name
underneath balancing it. With the name gone it read as a picture that had
failed to load, so the placeholder is centred now. That is the only change here
Sean did not ask for, and it is a margin.

### Two more passes on the same card (22 September)

**The link becomes a mark.** *"Don't put in 'more about wayfinder', just do an
ℹ️ button."* This is the 20 September ruling again — *"integrate each help link
into its section heading as a small info button"* — arriving at the one place
it had not been applied. The fault is the panel's house fault: the picker says
*Wayfinder*, the painting is of the Wayfinder, and the link said *Wayfinder* a
third time.

So `Info` now has two forms rather than two components. With children it is the
labelled row, which is right for a list of links where a column of identical
glyphs would be a column of guesses. Without them it is the same `.infodot` the
section headings carry, and the sentence moves to `label` — read by a screen
reader, shown on a long press. A bare glyph with no accessible name announces
itself as "button", so the label is not optional in practice even though the
prop is.

That invalidated a claim in this file's own docblock — *"a label rather than a
bare glyph, because a lone ℹ️ tells you there is something to read and not what
about"* — so the docblock is corrected rather than left to contradict the code
under it. The rule it states now is the one Sean has actually been applying:
not *always label*, but *never say it twice*.

**Upkeep moves above time.** *"Move time to completion below upkeep."* Worth
recording why it is better rather than just that he asked: the two money rows
now sit together, and what a thing costs to buy and what it costs to keep are
the same question asked twice. A player choosing between a Wayfinder at 140/20
and a Morningstar reads them as a pair. Time is the one figure that does not
answer *can I afford this*, so it goes last.

The test asserts the *order* — `[...BUILD.matchAll(/<dt>(.+?)<\/dt>/g)]` against
a three-element array — because three separate `toContain` calls pass no matter
how the rows are shuffled, and the order is the whole of the change.

All three marks were followed in Chromium rather than counted: ships lands on
the Wayfinder's entry, works on the Gold Mine's, troops on the Troops page.

### The banner that outlived its migration (22 September)

Sean, over the encyclopedia's Ships page: *"Cut this text at top. Not
necessary."*

It was a framed notice reading **This is the new fleet** — 28 hulls on the
locked combat rules — *"the war you are playing still sails the old fleet and
fights it the old way until the engine swap lands, so a name here may not be a
name in your harbor yet."*

Two things about it are worth keeping, and neither is the sentence.

**It was already false.** That banner was written on 18 September, when the
roster and the fleet the game sailed genuinely were different things. The
engine swap landed on the 21st. From that moment the notice was telling
players that the reference page under it could not be trusted — on the one
screen a player opens *because* they do not already know the answer. A banner
describing work in progress has an expiry date, and nothing in the build knows
when that date passes.

**It was already meant to be gone.** The task list has carried *"Cut the This
is the new fleet notice"* as **completed**, and `git log -S "This is the new
fleet"` returns exactly one commit: the one that added it. It was never
removed. The task was closed without the change landing, and four days of
screenshots went past with the banner in shot — mine included.

So the guard is a test rather than a comment, since a comment is what failed
last time. `encentry.test.ts` now strips the comments out of `Almanac.tsx` —
this file explains the banner at length, and a rule its own explanation trips
is a rule nobody can keep — and then asserts that none of four migration
phrases survives in anything rendered. The rule it encodes: **the reference
pages state what is true and never what is temporary.** If a fact needs a
migration notice beside it, the fact is not ready to be in the encyclopedia.

### The troops explainer moves to the Glossary, and takes a bug with it (22 September)

Sean, over the encyclopedia's Troops page and its four-paragraph *What troops
ashore do*: *"This explanation text is good in glossary. But not here."*

He is right about the placement — a rules essay under a grid of unit cards is
the reference page explaining itself instead of being looked at — and the
Glossary already had entries for three of the four paragraphs. So this is a
move, not a delete:

| The paragraph | Where it lives now |
|---|---|
| They hold the island | `Garrison`, with the one-troop rule and why a capital keeps its last |
| They keep it quiet | `Garrison`, the whole ladder read off `GARRISON_FOR_BAND` |
| They watch the back door | `Smuggling`, off `GARRISON_SMUGGLING_CUT` |
| They are the landing party | `Invasion`, with upkeep off `UPKEEP_PER_DAY` |

Every number is read off its constant rather than typed out. The ladder in
particular is four chances to disagree with the sim if written by hand, and
the mine's `Earns` line three days ago is what a hand-typed number looks like
when it drifts.

**And then the bug.** The block's last sentence read *"no landing at all is
possible while a seawall stands"*, and the Glossary's own `Invasion` entry
said *"none can be made while a Fortress still stands"*. Both describe a rule
that was **repealed on 20 September**. `resolveLanding` says so in as many
words:

> It used to be a comparison of two counts with a coin toss for the tie, and a
> standing fortress forbade the landing outright. That gate is repealed: you
> may always land, and the walls swell the defender's die instead.

A third copy sat on the Rules page — an island *"is taken by landing more
troops than are holding it"* — which was the same repealed head-count. And the
caption left under the troop grid promised the three unit stats would count
"when a landing counts them properly", when `resolveLanding` had been reading
`attack` and `invasionDefense` off them for two days, and `missions.ts` sums
`detection` for the watch.

Four pieces of reader-facing text, all describing the game as it was on the
19th. This is worse than the stale fleet banner cut an hour ago, and worth
saying why: a banner wastes a line, but *"a Fortress is a locked door"* is a
plan a player makes and loses a fleet to. They would bombard to open a landing
that was never shut, or leave a defended island alone because the encyclopedia
said it could not be touched.

**The guard.** `encentry.test.ts` now checks both `Almanac.tsx` and
`Glossary.tsx`, comments stripped, for four phrasings of the repealed gate. It
was confirmed to fail by putting the old sentence back — a guard nobody has
watched fail is a guard nobody knows works. The phrasings are pinned rather
than the idea, because the idea cannot be grepped; if a future rewrite trips it
on wording that is genuinely correct, the fix is to update the phrase list
*after* checking `resolveLanding`, not instead of.

The pattern across both of today's encyclopedia fixes: **prose in the reference
pages goes stale silently, because nothing links it to the rule it describes.**
Numbers do not have this problem — they are read off constants and move when
the constants move. Sentences about rules need either a test or a constant, and
"a comment saying keep this in sync" has now failed twice this week.

### The Buildings page becomes its two grids (22 September)

Sean: *"Same with all the text under buildings in encyclopedia. Cut it all.
Move it to glossary. That's where you can dump unlimited text."*

Four cards and about sixteen paragraphs stood under the pictures — *What is in
the ground*, *Settled ground and empty ground*, *How a thing gets built*,
*Standing defences* — on a page whose job is to let a player look at a building
and tap it. All four are gone; the page is the buildings grid, the deposits
grid, and nothing else.

**The last clause is the rule, and it is his.** The Glossary is the one screen
where length costs nothing, because it is a searchable list that nobody reads
end to end. Everything cut today landed there:

| Cut from Buildings | Now in Glossary |
|---|---|
| What is in the ground | `Deposit`, `Forest`, `Gold vein` |
| Settled and empty ground | `Worked ground` |
| How a thing gets built | `Works`, extended |
| Standing defences | `Fortress`, `Bombardment` extended, `Repair` |

Every figure reads off its constant — `FORT_INVASION_DEFENSE`,
`FORT_BOMBARD_DEFENSE`, `BOMBARD_TICKS_MAX`, `REPAIR_PER_DAY`,
`REPAIR_AT_A_YARD`, `GOLD_PER_DAY` — rather than being retyped on the way
across.

**And the move found the same bug again, a fourth time.** The cut paragraph
said *"a {Lumber Mill} can only be raised on a forest, and a {Gold Mine} only
on a vein"*. True when it was written, when those were the only two deposits.
Coral Reach's kiln and the silver seam arrived afterwards and nobody went back
to the sentence, so a player reading it would not learn that a Coral Kiln needs
coral or that silver earns twice what timber does.

So `Deposit` does not name the pairs — it builds the list out of `WORKS_ON`,
the table the sim decides by, and gains a pair on the day the sim does. That is
the general form of today's lesson, and it is cheaper than the test: **where a
sentence enumerates something the sim already enumerates, generate it.** A test
catches a stale sentence after somebody writes it; generation means nobody can.

One thing the cut *removed* that was correct, and is worth noting because it
is the exception: the Standing defences card was the only page in the game that
stated the landing rule properly — *"and you may always land. A standing wall
used to forbid it outright; now it only makes it dear."* Somebody updated that
one and none of the other three. It survives in `Fortress` and `Invasion`.

### The log gets one shape, and four smaller cuts (22 September)

Sean: *"I don't like the liberties you're taking with text. Too much fluff.
'Commodore-Elect Adaira Hale keeps an open table…' This is bad. Log should be
simple. Parley mission on [location] is [status]."*

He is right, and the fault was deliberate rather than careless, which makes it
worth naming. Twenty-odd call sites each wrote their own sentence in the
world's voice — *comes away empty-handed*, *finds no ear for it*, *the room
goes the other way*, *nobody worth the articles sits down at it*. Read one at a
time in a dispatch card that is good writing. Read as a list, which is what a
log **is**, it means every row has a different shape and the reader parses
prose to recover three facts that fit in a column: what, where, did it work.

CLAUDE.md already said which way this goes — *a label uses the agreed word;
prose keeps its voice*. The log is a label. The dispatch cards and the mission
reports are where the voice belongs, and they keep it.

So `missionLine(type, island, status, detail?)` is the only way a mission
writes a row now, and a ten-deep ternary of abandonment sentences collapsed
into `offReason`, a table of clauses. Two tables of prose went with it:
`ERRAND_PURPOSE`, which existed only to end the dispatch line, and the
`carries the room` / `sways` split, which was an adjective doing work the
figure beside it already did.

**What the template costs.** It drops the officer's name, and the log row is a
dot and a line of text with nothing else on it — so a player with six crew out
can no longer tell which of them the row is about. That is a real loss and it
is his call, not mine: the fix is one argument, either a `Hale — ` prefix or a
name chip off the `characterId` the event already carries.

**The capture guard caught its own blind spot.** `captures.test.ts` finds
capture events by matching prose, and the rescue line stopped saying *"out of
the cells"*. The sweep fell from five paths to four and the count assertion
failed — which is the only reason it was noticed. Without
`toBeGreaterThanOrEqual(5)` the suite would have gone on passing while
guarding one path fewer. A wording-based net needs a number under it.

### The fortnight ring, Fast, and the land filter

**The ring had no track.** *"The fortnight timer is hard to see. Also can you
make it flow smooth like the day timer?"* — one cause behind both. It was
already driven off the same fraction on the same tick as the day ring, so
nothing was ever jerky; an arc drawn on bare chrome with nothing behind it just
gives the eye no way to measure how far round it has gone, and a dial you
cannot read cannot be seen to move. The far side of the gradient is a faint
brass track now, the band is half again as wide, and it is drawn at nearly full
strength. Confirmed moving in the browser: 0.159 → 0.169 across 700ms.

**Fast is one second**, down from two. `CLOCK_TICK_MS` halves with it, to 50.
The constant's own comment recorded this happening once before — at two seconds
a day, 200ms moved the ring a tenth of a turn at a time — so the rule is now
written as the ratio rather than the number: the tick wants to be about a
fiftieth of the fastest day, or the ring stutters at the only speed anybody
watches it at.

**Available land is cut.** Being moved last on 19 September is what finished
it: a filter you swipe past every time to reach the ones you use is a filter
whose answer you did not want. The answer was already on the island's Buildings
tab, which is where you are standing when *where can I put this* comes up.
`ROOM_FAIR`, `ROOM_AMPLE` and `roomBand` went with it, and the suite that
covered it is replaced by one test pinning the strip's new last entry — because
removing the last item from `CHART_LAYERS` is exactly the edit that changes the
swipe order silently.

### Hull is a rating, condition is a state (22 September)

Sean, over the harbor list: *"say it's condition instead of hull strength
here."*

The tell was already in the file. The comment above that row had read
*"Condition only. What the class is… is a tap away in the encyclopedia"* since
the day the row was written, while the label under it said `hull`. One idea,
two words, and the reader was handed the wrong one — which is the exact
failure `terms.json` and the vocabulary test exist to catch, on a pair nobody
had thought to write down.

So they are two ideas now and both keep a word:

- **Hull** is what the class is *rated* at. The `1400` beside a Wayfinder in
  the encyclopedia. It never changes.
- **Condition** is what this particular hull has left this morning. It moves
  every day, it is what repair mends and what shot takes off.

Three screens show `current/max` and all three now say condition: the harbor
list, the ship sheet's sisters, and the battle sheet. The encyclopedia's
`Medium · 1400 hull` is untouched, because that one really is the rating.

The guard is in `vocabulary.test.ts` and matches on *shape* rather than on a
list of files — any `{a}/{b}` or `${a} of ${b}` followed within a short span of
markup by the word "hull" is a failure. It was confirmed to fail by putting
`hull` back on the harbor row. The non-vacuity half sweeps for the same shape
with the right word and requires the three rows to be there, so the test cannot
pass by matching nothing.

### Travel halved, and it fixed the stalls (22 September)

Sean: *"I think travel time is a little long. Let's make farthest points 150
instead — actually make it 100 days max."*

`TRAVEL_MAX_DAYS` is the whole of travel: `missions.ts` is one line,
`min(MAX, round(fractionOfWorld × MAX))`. So this halves every passage, not
only the long ones — neighbours in a Reach 3 days rather than 6, the length of
a Reach a week rather than a fortnight, corner to corner 100 rather than 200.

Measured rather than asserted, because passage time is the Confederacy's cover:
they have no fixed base and win by staying unfound, while the Crown wins by
reaching two capitals. Halving it helps whoever is hunting. Same 48 seeds
(3000), both sides machine-played, only the constant changed:

| | 200 days | 100 days |
|---|---|---|
| Crown — Confederacy | 17 — 25 | 22 — 24 |
| Wars that never ended | **6 of 48** (12.5%) | **2 of 48** (4.2%) |
| War length, median | 1188 days | **768 days** |
| War length, max | 2601 | 2292 |
| Lords taken, of 3 | 1.35 | **1.69** |

**The stalls are the finding, and they were the open bug.** Task #125 —
*"three wars in forty stall with the Crown ahead and one Lord unfound"* — has
been open since 21 September, and the diagnosis in it was that a Lord in a far
corner is not worth the voyage to hunt. Halving the voyage took the stall rate
from 12.5% to 4.2% and the Lords taken from 1.35 to 1.69, which is the same
finding read two ways. Both are rates rather than coin flips, so they are
visible at 48 wars where a win-table change would not be.

**The win split did not move, and I am not going to claim it did.** 17 — 25 to
22 — 24 looks like five wins toward the Crown; at 48 decided wars the standard
deviation is 3.46, and `lab/duel.ts`'s own rule is that a count within about
two of even is not a finding. 22 — 24 *is* within two of even. The honest
statement is that the war is markedly shorter and finishes far more often, and
that this run cannot see a balance change either way.

One thing the run shows that is not about travel: the Confederacy ends on
32,691 gold against the Crown's 8,072. That is #121, the gold hoard, still
open and now the largest unexplained number in the table.

**A test broke in an instructive way.** `missions.test.ts` walks seeds until
one produces a foiled agent, then checks the injury arc. It searched 60 seeds;
with passages halved there are fewer days in a cycle for the watch to catch
anybody, so none of the 60 produced a foil and the test failed on its own
search rather than on the thing it checks. Bound raised to 400. Worth noting
the asymmetry: had the search been wide enough to absorb it, a genuine drop in
the foil rate would have passed unnoticed — a search-until-found test reports
a balance change only when the change happens to exceed its budget.
