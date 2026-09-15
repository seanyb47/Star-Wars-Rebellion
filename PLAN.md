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
| **Phase 1 — the war** | Built. 60 islands, seven Reaches — one for each Sea — economy, support, control, unrest, building, the day clock. |
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
