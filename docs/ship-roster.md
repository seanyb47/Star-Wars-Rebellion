# SHIP ROSTER — narrative & design specification

A descriptive extraction for the team assigning numerical statistics. Nothing
here is invented: every claim is traceable to a source in this repository, and
anything the sources do not settle is filed under **Unknown** rather than
guessed at.

## Sources, and how they are cited

| Tag | File | What it is | Authority |
|---|---|---|---|
| **S1** | `src/data/ships.json` | The implemented roster: one entry per hull, with its prose blurb and any stats stated on the class | **Canonical.** This is what the game builds and sails |
| **S2** | `src/sim/constants.ts` | `SHIP_ROLES` (the four size defaults), and the design commentary on hit chance, gun decks, bombardment and retreat | **Canonical** for anything S1 leaves unstated |
| **S3** | `docs/lore.md` §6 | Roster design notes, two art rules, the Pirate Lords' ships, the captured-ship rule, and stat tables | Canonical for prose; **its stat tables are stale** (see below) |
| **S4** | `docs/art-batch-2.md` / `art-prompts.md` | Commissioning prompts, which carry the only physical descriptions that exist | Canonical for appearance, but **covers only 8 of 24 hulls** |
| **S5** | `seven-seas-world-bible.md` §6 | The original *Star Wars: Rebellion* translation table | **Largely unimplemented.** See the warning below |

### Warning 1 — the world bible's ship list is not the game's ship list

S5 §6 lists roughly thirty vessels (the Leviathan, Colossus, Bastion,
Stillwater, Kraken-caller, Escort Barque, four classes of small craft per side,
and others). **Most of these do not exist in the implemented game.** S5 is a
translation exercise written before the roster was built; the roster that
shipped is S1, and it is 24 entries.

Where S5 describes a hull that *does* exist, I have quoted it as supporting
evidence and marked it as such. Where S5 describes a hull that does not exist,
it is listed separately at the end under **Designed but not implemented** —
do not assign statistics to those.

S5 also refers throughout to *squadrons* and *swivels* — carried small craft,
and a light anti-small-craft weapon. **Neither concept exists in the
implemented game.** There are no fighters in these waters (S3: *"There are no
fighters in these waters. A small craft is just a small ship"*). Any S5 line
reading "6 squadrons, 3 troops, no swivels" is describing a mechanic that was
cut. Do not convert it.

### Warning 2 — S3's stat tables are out of date

`docs/lore.md` §6 carries two stat tables. Their **Gold, Guns, Hull, Wall and
Craft columns still agree with S1**, but the **Days column does not**: it
predates a build-rate change and understates every figure by roughly a factor
of three (it lists the Bulwark at 18 days; S1 says 58). Its **Lift column is
also stale** — it shows 0 for several hulls that in fact carry one company.
**Take build time and capacity from S1 and S2, never from S3.**

### Warning 3 — an internal inconsistency in build time

The seven day-one hulls that do not state their own `days` inherit it from the
role default in S2, and those defaults were not moved when the per-class
figures were. The result, in the live data:

| Hull | Build days | Source of the figure |
|---|---|---|
| Sovereign (first-rate) | 22 | inherited role default |
| Vanguard II (cruiser) | 94 | stated on the class |
| Majestic (first-rate) | 137 | stated on the class |

A Sovereign is a first-rate of the line that lays down in **less than a quarter**
of the time a Majestic takes, and less than a third of a Vanguard II. This is
an unintended inconsistency in the source, not a design statement. It affects
**Kestrel, Razorback, Sovereign, Fluyt, Swift, Tempest and Brig** (Reef-class
states its own and is unaffected). Flag it before encoding, or the derived
statistics will inherit the error.

### Warning 4 — there is now a *second* roster, and it is not this one

Since this document was written, a **Fleet Roster** sheet has appeared in Drive
and been imported to `src/data/combat-ships.json` (Sean's own revision of 18
September, twenty-four hulls, four starts and eight research unlocks a side).
It is the design roster for the rebuilt naval combat system, which runs
alongside the live game and is wired into nothing.

**It is not S1 and it does not describe the ships this document describes.**
The two disagree on names, on ladders and on numbers, and neither is wrong —
they are different rosters at different stages. This document extracts the
*live* game. Where the two share a name, check which one you are holding:

- **Ironback.** Here she is Jessup's single legend hull. In the Fleet Roster
  she is a buildable R5 Confederate siege ship. The collision is recorded in
  `_notes` in the data and is unresolved. (Warning 1's point about S5's
  "Ironback" is the same hazard, twice over now.)
- **Swallowtail.** Reyne's, here and now everywhere: the v2.4 warship that
  shared the name has been cut from the Fleet Roster.
- **Reef-class, Reefwalker, Freebooter, Dreadnought.** All renamed or cut in
  the Fleet Roster (Coral-Class Dreadnaught, Reefwarden, — and Morningstar).
  The live hulls in this document keep their names.

Warning 3's build-time inconsistency is a bug in the **live** data and is still
unfixed; the Fleet Roster has nothing to do with it either way.

### What counts as a weapon in this game

This matters for the weapons section of every entry, so it is stated once:

- **`guns`** — weight of fire in a ship-to-ship action. The only offensive
  statistic used against other vessels.
- **`bombard`** — what the hull throws at stone rather than at another ship.
  S2: *"deliberately on a much steeper curve than `guns`: a first-rate is under
  twice a frigate in a fleet action and fourteen times a sloop against a wall...
  heaving a shot up onto a battery is a different job from hitting something
  that moves."* A transport does not bombard at all.
- **Gun decks** — how many separate targets a hull engages per round, by size:
  small 1, medium 2, large 3, transport 1. Total weight is unchanged, it is
  *divided*. S2: *"A ship of the line has gun decks and a sloop has a gun."*
- **Long guns** — *"Guns that reach. A hull without them cannot touch a fleet
  that is already running; a hull with them fires at half weight into one that
  is."* A per-class flag exists. **No hull in the game sets it**, and S2 says
  this is deliberate: *"Nothing has them yet, which is the point — early retreat
  is nearly free, and the day the first long-gunned hull is launched is the day
  breaking off starts to cost. Set per class, so the arc is a design decision
  rather than a property of being large."* Fortifications have them; ships do
  not, yet.

**There are no "Heavy Guns" or "Light Guns" as distinct weapon types in the
source.** Do not create them. The only weapon distinctions the source makes are
the four above, plus two *named* pieces of ordnance that appear in prose and
nowhere in the rules: the Urskin Whaler's **harpoon battery** and the Leviathan's
**Maw** (the latter belonging to an unimplemented vessel).

### Two other terms used throughout

- **Pace** — a multiplier on how many days a crossing takes. **Lower is
  faster.** A fleet sails at the pace of its slowest hull.
- **Speed** — a separate 1–12 band for how quickly a hull gets out of gun range
  when breaking off; **higher is better**. S2 is explicit that these are not the
  same thing: *"pace is how long a crossing takes and speed is how fast she is
  out of gun-range, which a sloop is good at and a first-rate is not."*

### The design rules that govern every hull

From S5 §6: *"Imperium ships are built straight and then warded with cultivated
coral — black iron, white sail, brass fittings, names of virtues. Confederacy
ships are grown, stolen, or patched — whalebone, squid-ink sail, coral hulls,
tamed beasts on the flanks, names that are jokes or threats."*

From S3 §6, two rules from the Naval Art Master: *"A ship has one longitudinal
centreline, and keel, hull, gundecks, bow, stern and bowsprit all align to
it."* And: *"a player should know a ship by her silhouette before reading her
name: strip the colour, the flags and the name away and hull, bow, stern,
masts, sail plan and signature structure should still say which one she is."*

And the shape of the two fleets, from S3: *"The Crown improves families it
already trusts — a II is the same design taken further, and she announces
herself with deep Imperial-green sails — so its ladder is long and ends very
high: three ships at the top grade, one of them the largest thing either navy
can build. The Confederacy has no II programme by rule, so it opens broader
instead. It is the only side with a superheavy on day one, and where the Crown
refines, it finds another answer... One long climb against one broad start."*

---

## SHIP ROSTER

# THE CROWN IMPERIUM

---

## KESTREL

**Ship ID:** `kestrel` · **Faction:** Crown Imperium · **Class:** Sloop-of-war,
small · **Tier:** Day one (no research grade) · **Standard or special:** Standard
line hull, the Crown's opening small · **Role:** Scout / picket / cheap blockade

### Physical Description
Explicitly: *"Light, low, single-masted"* (S4). A sloop-of-war. One mast is the
only mast count established for any hull in the game. Crown livery applies:
white or warm-ivory sails, deep Imperial-green accents, antique brass, black
iron, clean and symmetrical, one Crown emblem, *"No coral anywhere"* (S4).
Nothing states her length, her deck count or her gunport arrangement.

### Speed & Maneuverability
The fastest hull the Crown possesses: *"The fastest thing the Crown puts to
sea"* (S1). S5 corroborates: *"fast; good courier."* Her `speed` band — how
quickly she clears gun range when breaking off — is the role default for a
small hull, which S2 describes as the thing *"a sloop is good at and a
first-rate is not."* No statement about acceleration or turning circle exists.

### Weapons
The role's `guns` figure only; nothing named, and nothing stated on the class.
She carries the role's minimal `bombard`, which S2 characterises as a sloop
*"simply not carrying the weight"* to lift shot onto a battery. **One gun deck**
— one target a round. No long guns.

### Combat Role
Scout and cheap blockading hull, stated outright: *"Good for closing a harbor
cheaply"* (S1). S5 files her as an **Escort**: *"Early anti-small-craft; fast;
good courier."* The blockade role follows from the rules rather than from her
armament — lying off an enemy harbor stops its trade regardless of what the
hull carries, so the cheapest hull that can sit there is the right one.

### Survivability
The worst in the Crown's fleet and it is stated plainly: *"the first to
sink"* (S1). Offset by the one defensive property a small hull has, from S2:
she is the hardest class to hit — *"a sloop lands nine shots in ten on a
first-rate, and a first-rate lands three in ten on a sloop."* Hard to hit,
trivial to kill.

### Troop / Boarding Capacity
Carries the role minimum. S2 is explicit that this is a floor, not a design
intent: *"One company is not a landing force; it is enough to take ground
nobody is holding."* Troop transport is not her purpose. No boarding
characteristics are described.

### Bombardment / Siege
Minimal and deliberately so. S2: four sloops *"throw four at a seawall that
patches over one, so the swarm is still no answer to a fortress."* She cannot
meaningfully besiege anything.

### Construction & Logistics
The cheapest and quickest Crown hull; buildable from the first morning with no
research. No special facility beyond a Shipyard is described. **Her build time
is affected by the inconsistency in Warning 3.**

### Maintenance
The role's minimum upkeep. Nothing narrative about crew requirements or
difficulty of upkeep.

### Upgrades
Superseded by the **Kestrel II** at craft grade 1, which is explicitly the same
hull rebuilt rather than a new class. See that entry.

### Special Abilities
None.

### Relative Comparisons
Faster than every other Crown hull. Slower than the Confederacy's **Swift** and
**Reefwalker** (both state faster figures than hers). More fragile than
anything else the Crown builds. Less armed than a Razorback. Harder to hit than
any medium or large hull. Particularly vulnerable to **medium hulls** — S2 gives
frigates the best gunnery against small craft of any class. Particularly
effective as a cheap blockader and against nothing in particular offensively.

### Source Evidence
- S1: *"A sloop-of-war. The fastest thing the Crown puts to sea and the first
  to sink. Good for closing a harbor cheaply."*
- S4: *"A sloop-of-war. The fastest thing the Crown puts to sea and the first to
  sink. Light, low, single-masted."*
- S5 §6A #3: *"Kestrel sloop-of-war | Escort | Early anti-small-craft; fast;
  good courier."*

### Known
Sloop-of-war; single-masted; light and low; fastest Crown hull; most fragile
hull in the fleet; cheap harbour closure is her stated use; day-one
availability; Crown livery with no coral. *Existing numeric data in source:*
every statistic is inherited from the `small` role default — the class states
none of its own.

### Implied
That being single-masted and *"light, low"* implies a shallow draught and a
small crew, though neither is stated. That "good courier" (S5) implies a
character-carrying role, but the implemented game has no courier mechanic.

### Unknown
Length; deck count; number and calibre of guns as fiction (only the abstract
`guns` figure exists); hull construction and timber; whether she is
coral-warded (S5's design rule says Imperium ships are *"warded with cultivated
coral"* but the art brief says *"No coral anywhere"* — these two sources
conflict and neither is decisive); crew complement; turning and acceleration.

---

## RAZORBACK

**Ship ID:** `razorback` · **Faction:** Crown Imperium · **Class:** Heavy
frigate, medium · **Tier:** Day one · **Standard or special:** Standard ·
**Role:** General-purpose gun platform

### Physical Description
*"Workmanlike, well-kept, quick enough to be useful"* (S4). A heavy frigate in
Crown livery. Mast count, deck count, length and gunport arrangement are all
unstated.

### Speed & Maneuverability
*"Quick enough to be useful"* (S1, S4) — a qualified statement, not a claim to
speed. She holds the role default pace and speed band for a medium hull:
slower than a sloop, faster than anything of the line.

### Weapons
States her own `guns` figure, above the medium role default. **Two gun decks** —
two targets a round. Role-default bombardment. No long guns, no named ordnance.

### Combat Role
The Crown's workhorse: enough battery to matter, not enough hull to stand in a
line. S5 files her as **Capital (light)**: *"Cheap gun platform; 1 troop; no
small craft."* S2's combat triangle gives the medium class its defining
purpose — *"a frigate is built for exactly this work and is better at it than
anything"* — meaning **frigates are the best anti-sloop hulls in the game**.

### Survivability
Explicitly the weak half of the bargain: *"outmatched by anything of the
line"* (S1). She states a hull figure below her own gun figure, which S2's
design commentary treats as unusual — the roster's baseline is hull about one
and a half times firepower.

### Troop / Boarding Capacity
One company, the role default. S5 corroborates *"1 troop."* Minor purpose.

### Bombardment / Siege
Role default for a medium — real but modest. S2 places a frigate at roughly a
fourteenth of a first-rate's weight against stone... no: at a figure a
first-rate exceeds *"under twice"* in a fleet action and far more against a
wall. Minor role.

### Construction & Logistics
Cheap for her battery — *"Cheap for what it carries"* (S1). Day one, no
research. **Affected by Warning 3.**

### Maintenance
Role default. Nothing narrative.

### Upgrades
Superseded by **Razorback II** at craft 2, explicitly *"The Razorback family,
refined."* See that entry.

### Special Abilities
None.

### Relative Comparisons
Slower than a Kestrel, faster than a Sovereign. More heavily armed than a
Kestrel, far less than any ship of the line. *"Outmatched by anything of the
line"* — stated. Thinner-hulled than the **Bulwark**, which S1 describes by
direct comparison as having *"Fewer guns than a Razorback and half again the
hull."* Particularly effective against small hulls (S2's triangle).
Particularly vulnerable to ships of the line.

### Source Evidence
- S1: *"A heavy frigate. Cheap for what it carries, quick enough to be useful,
  and outmatched by anything of the line."*
- S2: *"frigates take sloops · sloops take ships of the line · ships of the line
  take frigates."*
- S5 §6A #13: *"Razorback heavy frigate | Capital (light) | Cheap gun platform;
  1 troop; no small craft."*

### Known
Heavy frigate; workmanlike and well-kept; cheap for her armament; moderately
quick; outmatched by ships of the line; day one; states her own gun and hull
figures.

### Implied
That "heavy frigate" implies a single continuous gun deck in period terms,
though the game gives the medium class two gun decks abstractly. That
"workmanlike" implies plain construction without ornament.

### Unknown
Length; masts; decks; timber; crew; whether she is coral-warded; turning and
acceleration; any named weapon.

---

## SOVEREIGN

**Ship ID:** `sovereign` · **Faction:** Crown Imperium · **Class:** First-rate
ship of the line, large · **Tier:** Day one · **Standard or special:** Standard
capital ship, described as the backbone of the fleet · **Role:** Ship of the
line

### Physical Description
The most fully described hull in the game. *"A first-rate of the line, built
straight and coppered to the waterline"* (S1). S4 expands: *"sheathed in milled
copper along the waterline, green with verdigris where the sea has had at it.
Massive, deep-hulled, three gundecks, immaculate and slow."* **Three gun decks
is an explicit physical statement**, and the only deck count established for any
hull. *"Built straight"* places her squarely in the Imperium shipwright
tradition of S5's design rule. S5 adds *"Coral-warded."*

### Speed & Maneuverability
Slow, stated twice: *"Slow to arrive anywhere"* (S1), *"immaculate and slow"*
(S4). She carries a high pace figure (long crossings) and a low speed band —
S2's *"a first-rate takes four [days] where a sloop reaches a threatened harbor
in two,"* and a first-rate is precisely what S2 means by a hull that is not
*"good at"* getting out of gun range. She cannot run from anything.

### Weapons
The heaviest battery available on day one: *"Nothing afloat hits harder"* (S1) —
a claim true only of the opening roster, since Vanguard II, Sovereign II,
Majestic and Buccaneer all exceed her later. **Three gun decks**, so she
engages three separate targets a round rather than emptying herself into one.
Substantial bombardment weight. No long guns.

### Combat Role
Ship of the line, and S5 names her *"Backbone of the fleet."* She holds water
rather than chasing: her whole design is standing in a line and absorbing what
a line absorbs. S2's triangle makes her **the answer to frigates** and
**vulnerable to massed sloops** — *"Four sloops... take her apart, which is the
vulnerability a fleet of nothing but ships of the line is supposed to have."*

### Survivability
The toughest hull in the opening roster: *"takes more killing"* than anything
afloat (S1). *"Deep-hulled"* and copper-sheathed (S4). Her weakness is
explicit and structural rather than incidental: she is the **easiest class in
the game to hit** (S2 calls a first-rate *"a barn door"*), and heavy guns
*"cannot train round fast enough"* to answer small quick hulls.

### Troop / Boarding Capacity
Two companies, the large-role default. S5 claims *"3 troops"* — **this conflicts
with the implemented figure of two**; S1/S2 govern. A secondary purpose; she is
not a troopship, but a line of them lands a real force.

### Bombardment / Siege
Major. A first-rate carries serious weight against stone, and S2 puts the large
class at roughly fourteen times a sloop against a wall. She is a siege asset as
well as a battle line.

### Construction & Logistics
Expensive and slow relative to the rest of the day-one roster, but requiring no
research grade — the Crown can lay one down on the first morning. **Her build
time is the most badly affected by Warning 3**: she inherits the role default
and therefore builds far faster than the research-gated capitals that are
supposed to be her successors.

### Maintenance
The highest upkeep of the day-one Crown hulls (role default for large).
Nothing narrative about crew.

### Upgrades
Two separate successors, and they are different kinds of thing:
- **Sovereign II** (craft 3) is *"Not a new class: the Sovereign, taken as far
  as the Highwater yards can take her"* — a refit of this design.
- **Majestic** (craft 3) is a larger design outright, not of this family.
The **Vanguard** line is explicitly *not* her successor: it is a hunting
cruiser built to a different brief.

### Special Abilities
None.

### Relative Comparisons
Hits harder and survives longer than anything else on day one — stated.
Slower to arrive than any other Crown hull. Thicker in the side than a
**Vanguard**, by direct statement in that ship's own blurb: *"Thinner in the
side than a Sovereign, and it shows the moment she has to stand."* Less
heavily armed than **Sovereign II** and **Majestic**. Throws less at a seawall
than the Confederacy's **Reef-class** — that ship *"throws more iron at a
seawall than anything the Crown has"* at day one. Particularly vulnerable to
massed small hulls. Particularly effective against frigates.

### Source Evidence
- S1: *"A first-rate of the line, built straight and coppered to the waterline.
  Nothing afloat hits harder or takes more killing. Slow to arrive anywhere."*
- S4: *"Massive, deep-hulled, three gundecks, immaculate and slow."*
- S5 §6A #7: *"Sovereign first-rate | Capital | Backbone of the fleet:
  6 squadrons, 3 troops, no swivels. Coral-warded."*

### Known
First-rate ship of the line; three gun decks; massive and deep-hulled; copper
sheathing to the waterline, verdigrised; built straight; slow; hardest-hitting
and hardest-killing hull of the opening roster; day one; carries two companies.

### Implied
That *"coppered to the waterline"* implies anti-fouling and therefore better
sustained sailing than an uncoppered hull, though the game gives her the
slowest pace regardless. That three gun decks implies a very large crew.

### Unknown
Length; tonnage; mast and sail configuration (never stated for any large hull);
gun count as fiction; crew complement; whether S5's *"coral-warded"* is current
— the art brief for the Crown says *"No coral anywhere"*, and the two conflict.

---

## FLUYT

**Ship ID:** `fluyt` · **Faction:** Crown Imperium · **Class:** Merchantman,
transport · **Tier:** Day one · **Standard or special:** Transport, pressed
into service rather than purpose-built · **Role:** Troop transport

### Physical Description
*"Fat-bellied, blunt, high-sterned, no gunports"* (S4). *"An unarmed
merchantman pressed into service"* (S1). **No gunports is an explicit physical
statement** and the only one of its kind in the roster.

### Speed & Maneuverability
Role default pace and speed for a transport — middling on both. Nothing
narrative claims either quickness or slowness. She is not described as able to
escape anything.

### Weapons
**None whatsoever.** *"Cannot defend itself at all"* (S1); S5 records
*"Unarmed."* Zero guns and zero bombardment. One gun deck notionally, with
nothing on it.

### Combat Role
Transport only. She has no combat role and the source is emphatic about it.

### Survivability
Role-default hull for a transport, which is modest, and she is among the
easier classes to hit. With no armament she cannot deter or answer an attacker.
The stated weakness is total defencelessness rather than fragility as such.

### Troop / Boarding Capacity
**Her entire purpose.** *"Carries more companies than anything else"* (S1) — a
claim true at day one; the **Fluyt II** later exceeds her. S5 says *"2 troops"*,
which **conflicts** with the implemented three. No boarding capability is
described; she carries people, she does not fight them onto a deck.

### Bombardment / Siege
None. *"A transport does not bombard at all"* (S2).

### Construction & Logistics
Cheap; day one; no research. Described as a pressed merchantman, implying no
naval yard specialisation is needed. **Affected by Warning 3.**

### Maintenance
Role default, low. Nothing narrative.

### Upgrades
**Fluyt II** at craft 2, explicitly a redesign rather than a refit: *"built for
the service from the keel up rather than pressed into it."*

### Special Abilities
None.

### Relative Comparisons
Carries more companies than any other day-one hull — stated. Carries fewer than
**Fluyt II**. Less able to defend itself than any hull in the game, including
the Reefwalker, which at least mounts something. Particularly vulnerable to
everything; she is the one hull with no answer to any attacker.

### Source Evidence
- S1: *"An unarmed merchantman pressed into service. Carries more companies than
  anything else and cannot defend itself at all."*
- S4: *"Fat-bellied, blunt, high-sterned, no gunports."*
- S5 §6A #4: *"Fluyt | Transport | Unarmed, 2 troops."*

### Known
Unarmed merchantman; pressed into naval service; fat-bellied, blunt,
high-sterned; no gunports; highest troop capacity at day one; defenceless; day
one availability.

### Implied
That *"fat-bellied"* and *"high-sterned"* imply large hold volume and poor
windward performance, neither stated. That a pressed merchantman implies a
civilian crew, not stated.

### Unknown
Length; masts; decks; crew; whether she can be escorted in any special way; S5's
troop figure conflicts with the implemented one.

---

## BULWARK

**Ship ID:** `bulwark` · **Faction:** Crown Imperium · **Class:** Armoured
frigate, medium · **Tier:** Craft grade 1 · **Standard or special:** A
specialist variant, not an upgrade of an existing family · **Role:**
Line-holding medium

### Physical Description
The most physically specific of the research-gated hulls: *"broad, deep, high
in the freeboard"* (S1). *"Armoured"* is used of her and of no other hull in the
game. **No art brief exists for her**, so masts, decks, length and livery are
unestablished beyond the general Crown rule; note however that every craft-1+
Crown hull that mentions livery mentions **green sails**, and she is not one of
the ones that does.

### Speed & Maneuverability
Slower than her role's baseline — she states a pace figure above the medium
default. She states a speed band below it as well. The blurb makes this the
design rather than a defect: *"built to stand in a line and not move."*

### Weapons
Fewer guns than a plain Razorback, stated by direct comparison: *"Fewer guns
than a Razorback and half again the hull, which is the whole of the argument
for her"* (S1). Slightly above-default bombardment. Two gun decks. No long guns.

### Combat Role
A medium hull built to do a large hull's job: stand in the line. This is unusual
in the roster and is stated outright. She trades the frigate's defining
advantage — S2's anti-sloop gunnery — for endurance she is not sized for.

### Survivability
Her whole argument. *"Half again the hull"* of a Razorback (S1), on a medium
frame. *"High in the freeboard"* and *"broad, deep"* support it. She is the
toughest medium hull the Crown has and among the toughest in the game, matched
in class only by the **Urskin Whaler**.

### Troop / Boarding Capacity
Role default, one company. Minor. No boarding characteristics.

### Bombardment / Siege
Slightly above a frigate's baseline. Minor role; she is not a siege hull.

### Construction & Logistics
First research grade. More expensive and far slower to build than a Razorback.
Requires a Shipyard and craft grade 1.

### Maintenance
Above the medium role default. Nothing narrative.

### Upgrades
**None.** She is a terminal design: no Bulwark II exists, and she is not
superseded within her own family. She sits alongside the Razorback line rather
than in it.

### Special Abilities
None.

### Relative Comparisons
Fewer guns and much more hull than a **Razorback** — stated directly. Slower
than a Razorback. Tougher than any other Crown medium. Less armed than
**Razorback II**, which arrives a grade later with both more guns and more hull
than the original Razorback. Particularly effective at absorbing fire in a line;
particularly poorly used as a pursuit or raiding hull, by her own description.

### Source Evidence
- S1: *"An armoured frigate: broad, deep, high in the freeboard and built to
  stand in a line and not move. Fewer guns than a Razorback and half again the
  hull, which is the whole of the argument for her."*
- S2 (on the role system): *"a Bulwark is a medium with half again the hull and
  four fewer guns."*

### Known
Armoured frigate; broad, deep, high freeboard; built to stand and not move;
fewer guns and substantially more hull than a Razorback; craft grade 1; states
her own pace, speed, guns, hull, cost, build time, upkeep and bombardment.

### Implied
That *"armoured"* implies something beyond ordinary scantlings — doubled
timber, iron, or the Imperium's coral warding — but **the source never says
what the armour is**. That *"high in the freeboard"* implies a dry gun deck in a
seaway and a worse roll.

### Unknown
What her armour actually consists of; masts; decks; length; appearance (no art
brief); crew; whether she carries green sails like her craft-tier siblings.

---

## KESTREL II

**Ship ID:** `kestrel-ii` · **Faction:** Crown Imperium · **Class:**
Sloop-of-war, small · **Tier:** Craft grade 1 · **Standard or special:**
**Refit** — explicitly the same hull rebuilt · **Role:** Scout / picket

### Physical Description
*"The Kestrel with her frames doubled and her rig re-cut"* (S1) — two specific
physical modifications, and the clearest upgrade statement in the roster.
*"Green sails"* marks her as a craft-tier Crown hull. Still single-masted by
inheritance from the Kestrel, though this is implied rather than restated.

### Speed & Maneuverability
Faster than the original on both measures: she states a lower pace (quicker
crossings) and a higher speed band (better at breaking off) than the Kestrel's
role defaults. *"Her rig re-cut"* is the stated reason. She is the second-fastest
hull in the game by speed band, behind only the Reefwalker.

### Weapons
More guns than a Kestrel. One gun deck. Role-default bombardment — the refit
did not make her a siege hull. No long guns.

### Combat Role
Unchanged from the Kestrel: *"Still the first thing the Crown sends to look at
something"* (S1). Scout and picket. What changed is survival, not purpose.

### Survivability
Materially improved, and it is the point of her: *"no longer the first thing
lost doing it"* (S1). *"Frames doubled"* is the stated mechanism. She keeps the
small class's hard-to-hit advantage.

### Troop / Boarding Capacity
Role default, one company. Unchanged. Minor.

### Bombardment / Siege
Negligible, as the Kestrel. Not a siege hull.

### Construction & Logistics
Craft grade 1; more expensive and much slower to build than a Kestrel.

### Maintenance
Role default for a small hull — **the refit did not raise her upkeep**.

### Upgrades
She *is* the upgrade. No Kestrel III exists. She is the Crown's final word on
small hulls.

### Special Abilities
None.

### Relative Comparisons
Faster, better armed and tougher than the **Kestrel** in every stated respect —
a strict improvement. Faster (by speed band) than every Crown hull. Slower than
the Confederate **Reefwalker**. Still far more fragile than any medium.
Particularly vulnerable to frigates, per S2's triangle.

### Source Evidence
- S1: *"The Kestrel with her frames doubled and her rig re-cut. Still the first
  thing the Crown sends to look at something, and no longer the first thing lost
  doing it. Green sails."*
- S3: *"a II is the same design taken further, and she announces herself with
  deep Imperial-green sails."*

### Known
A refit of the Kestrel, not a new class; frames doubled; rig re-cut; green
sails; faster, better armed and tougher than the original; same scouting role;
craft 1.

### Implied
That *"frames doubled"* means doubled futtocks or sister frames — period
practice for strengthening a hull — though the source does not elaborate. That
she remains single-masted, since only the rig's *cut* is said to change.

### Unknown
Length; decks; exact rig; crew; appearance beyond the sail colour (no art brief).

---

## VANGUARD

**Ship ID:** `vanguard` · **Faction:** Crown Imperium · **Class:** Cruiser,
large · **Tier:** Craft grade 2 · **Standard or special:** A **new family**, not
a Sovereign derivative · **Role:** Hunting cruiser / pursuit capital

### Physical Description
Described by what she is not: *"Thinner in the side than a Sovereign, and it
shows the moment she has to stand"* (S1). A large hull built light. No art
brief; masts, decks and length unestablished.

### Speed & Maneuverability
The defining feature. *"A hull that can catch what it is shooting at"* (S1).
She states a pace well below the large-role default and a speed band well above
it — she crosses faster and disengages better than any other ship of the line
on either side. She is built *"to hunt rather than to hold."*

### Weapons
*"Nearly a first-rate's broadside"* (S1) — stated by comparison rather than
absolutely. Three gun decks, as all large hulls. Substantial bombardment,
though below a Sovereign's. No long guns.

### Combat Role
Pursuit capital: a ship of the line's battery on a hull that can run down what
it fires at. The blurb draws the contrast explicitly — *"built to hunt rather
than to hold."* Her weakness is stated in the same sentence: she is not a hull
for a stand-up line action.

### Survivability
The weak point, and stated as such: thinner-sided than a Sovereign, *"and it
shows the moment she has to stand."* She is less durable than a Sovereign
despite being a grade above her. Like all large hulls she is the easiest class
to hit.

### Troop / Boarding Capacity
Two companies, the role default. Secondary.

### Bombardment / Siege
Real but not her purpose — below a Sovereign's weight. Secondary role.

### Construction & Logistics
Craft grade 2, and expensive. A long build.

### Maintenance
Same as a Sovereign's upkeep. Nothing narrative.

### Upgrades
**Vanguard II** at craft 3, described as *"The hunter perfected"* — the same
brief carried further.

### Special Abilities
None.

### Relative Comparisons
Faster than a **Sovereign** and than every other large hull except her own
successor. Thinner-sided and less durable than a Sovereign — stated. Less armed
than a Sovereign; *"nearly"* her broadside. More heavily armed than any medium.
Particularly effective at catching hulls that would otherwise break off;
particularly vulnerable in a sustained line action.

### Source Evidence
- S1: *"A cruiser built to hunt rather than to hold: nearly a first-rate's
  broadside on a hull that can catch what it is shooting at. Thinner in the side
  than a Sovereign, and it shows the moment she has to stand."*

### Known
Cruiser; built to hunt rather than hold; near-first-rate battery; faster than a
Sovereign; thinner-sided and less durable than a Sovereign; craft 2.

### Implied
That a *"cruiser"* in this setting means a large hull built for independent
operation rather than the line — consistent with her stated brief, but the game
never defines the term.

### Unknown
Length; masts; decks; construction and timber; appearance (no art brief);
crew; whether she carries green sails.

---

## RAZORBACK II

**Ship ID:** `razorback-ii` · **Faction:** Crown Imperium · **Class:** Heavy
frigate, medium · **Tier:** Craft grade 2 · **Standard or special:** **Refit**
of the Razorback family · **Role:** General-purpose medium

### Physical Description
*"The Razorback family, refined: a heavier battery on a better-framed hull"*
(S1). *"Green sails."* No art brief; nothing else physical is established.

### Speed & Maneuverability
*"And quick with it"* (S1). She states a pace slightly below the medium default
— faster crossings than the original Razorback — and keeps the role's speed
band.

### Weapons
Heavier than the original in the stated comparison, and she states a gun figure
above it. Two gun decks. Role-default bombardment — unchanged from the original.
No long guns.

### Combat Role
The Crown's general answer in the middle of the roster: *"The Admiralty's answer
to everything between a sloop and a ship of the line"* (S1). As a medium she
inherits S2's anti-small-craft gunnery advantage.

### Survivability
*"Better-framed"* than the original, and she states a higher hull figure. Still
a frigate: nothing suggests she can stand against a ship of the line.

### Troop / Boarding Capacity
One company, role default. Minor.

### Bombardment / Siege
Role default; unchanged from the Razorback. Minor.

### Construction & Logistics
Craft grade 2; costlier and much slower to build than a Razorback.

### Maintenance
Same upkeep as a Bulwark, above the medium default.

### Upgrades
She **is** the upgrade, and the family ends with her.

### Special Abilities
None.

### Relative Comparisons
Better armed, better framed and quicker than the **Razorback** — a strict
improvement, stated. More guns and less hull than a **Bulwark**, which took the
opposite trade from the same starting point. Particularly effective against
small hulls; still outmatched by ships of the line.

### Source Evidence
- S1: *"The Razorback family, refined: a heavier battery on a better-framed
  hull, and quick with it. The Admiralty's answer to everything between a sloop
  and a ship of the line. Green sails."*

### Known
Refined Razorback; heavier battery; better-framed hull; quicker; green sails;
craft 2; the Crown's general-purpose medium.

### Implied
That *"better-framed"* is the same kind of structural improvement as the Kestrel
II's *"frames doubled"*, though it is not spelled out.

### Unknown
Length; masts; decks; appearance; crew; how much of the hull is new versus
refitted.

---

## FLUYT II

**Ship ID:** `fluyt-ii` · **Faction:** Crown Imperium · **Class:** Purpose-built
naval transport · **Tier:** Craft grade 2 · **Standard or special:** A **new
design** replacing a pressed civilian hull · **Role:** Troop transport

### Physical Description
*"A merchantman built for the service from the keel up rather than pressed into
it: more hold, more frame"* (S1). *"Green sails."* The from-the-keel-up phrasing
is an explicit statement that she is a new build and not a refit — unusual among
the Crown's II designs. No art brief.

### Speed & Maneuverability
*"Fast enough to keep up with the fleet she is feeding"* (S1) — and the rule
makes this matter, since a fleet sails at the pace of its slowest hull. She
states a pace below the transport default.

### Weapons
**None.** Unarmed, as the Fluyt. Zero guns, zero bombardment.

### Combat Role
None. Transport only.

### Survivability
*"More frame"* than a Fluyt, and she states a higher hull figure. Still
unarmed and still unable to answer an attacker.

### Troop / Boarding Capacity
**The highest capacity in the game** — she states a figure above the transport
role default, which is itself the highest of the four roles. Her whole purpose.

### Bombardment / Siege
None.

### Construction & Logistics
Craft grade 2. More expensive and far slower to build than a Fluyt.

### Maintenance
Above the transport default, below a frigate's.

### Upgrades
She is the upgrade; the family ends with her.

### Special Abilities
None — but note her pace is functionally an ability at fleet level, since one
slow hull slows an entire squadron.

### Relative Comparisons
Carries more companies, has more hull and crosses faster than the **Fluyt** — a
strict improvement, stated. Carries more than any other hull in either fleet.
Still defenceless, like every transport. Particularly vulnerable to any armed
hull.

### Source Evidence
- S1: *"A merchantman built for the service from the keel up rather than pressed
  into it: more hold, more frame, and fast enough to keep up with the fleet she
  is feeding. Green sails."*
- S2: *"A fleet sails at the pace of its slowest hull."*

### Known
Purpose-built naval transport, not a pressed merchantman; more hold and more
frame than a Fluyt; fast enough to keep station with a fleet; green sails;
craft 2; unarmed; highest troop capacity in the game.

### Implied
That "built for the service from the keel up" implies naval scantlings and
possibly the option of armament she nonetheless does not carry.

### Unknown
Length; masts; decks; appearance; crew; whether she has gunports (the Fluyt
explicitly has none; this is not restated for her).

---

## VANGUARD II

**Ship ID:** `vanguard-ii` · **Faction:** Crown Imperium · **Class:** Cruiser,
large · **Tier:** Craft grade 3 · **Standard or special:** **Refit/refinement**
of the Vanguard · **Role:** Hunting cruiser, perfected

### Physical Description
*"Green sails, gold at the rail"* (S1) — the only hull in the roster given a
second livery mark, which S3's ladder framing suggests denotes a top-grade
design. No other physical description exists; no art brief.

### Speed & Maneuverability
The stated centre of her design: *"sails like a frigate"* (S1). She states a
pace at the medium-role baseline — a large hull crossing at a frigate's rate —
and a speed band above the Vanguard's. The claim made for her is absolute:
*"there is nothing on the water that can both beat her and catch her."*

### Weapons
*"She carries a first-rate's weight"* (S1) — an upgrade from the Vanguard's
*"nearly"* a first-rate's broadside. Three gun decks. Bombardment above the
Vanguard's. No long guns.

### Combat Role
Pursuit capital, with the Vanguard's compromise largely resolved. She is the
Crown's answer to a hull that would otherwise break off and escape.

### Survivability
Improved over the Vanguard — she states a higher hull figure — but **still
below a Sovereign's**, and well below Sovereign II and Majestic. The family's
thin-sidedness is reduced, not eliminated. Like all large hulls, the easiest
class to hit.

### Troop / Boarding Capacity
Two companies, role default. Secondary.

### Bombardment / Siege
Above the Vanguard, below the Sovereign II and far below the Majestic. A
capable secondary siege hull.

### Construction & Logistics
Craft grade 3 — the top of the Crown's research ladder. Expensive; a long build.

### Maintenance
High, above a Sovereign's.

### Upgrades
Terminal. The Vanguard family ends here.

### Special Abilities
None mechanically. The blurb's claim — *"nothing on the water that can both
beat her and catch her"* — is a description of her stat profile, not a rule.

### Relative Comparisons
Faster than the **Vanguard**, better armed and better framed — a strict
improvement, stated. Faster than **Sovereign II** and **Majestic**. Less
armed and much less durable than either. Carries a first-rate's weight of
metal on a cruiser's hull. Particularly effective in pursuit; particularly
vulnerable, relative to her grade, in a prolonged line action.

### Source Evidence
- S1: *"The hunter perfected. She carries a first-rate's weight and sails like a
  frigate, and there is nothing on the water that can both beat her and catch
  her. Green sails, gold at the rail."*

### Known
Perfected Vanguard; first-rate's weight of guns; frigate-like sailing; faster,
better armed and tougher than the Vanguard; green sails with gold at the rail;
craft 3.

### Implied
That *"gold at the rail"* is a mark of a top-grade design, since only she
carries it; the source does not say so directly.

### Unknown
Length; masts; decks; appearance; crew; what physically changed from the
Vanguard beyond the aggregate improvement.

---

## SOVEREIGN II

**Ship ID:** `sovereign-ii` · **Faction:** Crown Imperium · **Class:**
First-rate ship of the line, large · **Tier:** Craft grade 3 · **Standard or
special:** **Refit, explicitly not a new class** · **Role:** Ship of the line

### Physical Description
*"Not a new class: the Sovereign, taken as far as the Highwater yards can take
her. More gundeck, more frame, more of everything the first one already had too
much of"* (S1). **"More gundeck" and "more frame" are explicit physical
changes.** *"Deep Imperial-green sails."* **Highwater — the Crown's capital — is
named as the yard that builds her**, the only such statement in the roster,
though it is not established as a mechanical requirement.

### Speed & Maneuverability
Slower than the original Sovereign: she states a pace below the large-role
default, but the class inherits the default speed band, so she is no better at
breaking off. She is a slow ship made slightly less slow to arrive, and no
quicker to escape.

### Weapons
Heavier than the Sovereign — she states a higher gun figure. Three gun decks.
Considerably heavier bombardment than the Sovereign. No long guns.

### Combat Role
Ship of the line, unchanged in kind from the Sovereign and greater in degree.
She is the Crown's durability answer rather than its firepower answer — the
Majestic exceeds her on guns, she exceeds the Majestic on nothing except
cost-efficiency.

### Survivability
Very high — above every hull in the game except the Majestic. *"More frame"* is
the stated mechanism. The large class's vulnerability to small quick hulls
still applies in full.

### Troop / Boarding Capacity
Two companies, role default — **unchanged from the Sovereign**, and notably not
increased despite being larger in every other respect.

### Bombardment / Siege
Major, and substantially above a Sovereign's. One of the three best siege hulls
in the game, alongside the Majestic and the Reef-class.

### Construction & Logistics
Craft grade 3. Very expensive; a very long build. *"As far as the Highwater
yards can take her"* implies the limit of Crown shipbuilding for this family.

### Maintenance
High — above every Crown hull but the Majestic.

### Upgrades
Terminal. The Sovereign family ends here. The **Majestic** is a different and
larger design, not a Sovereign III.

### Special Abilities
None.

### Relative Comparisons
More guns, more hull, more bombardment and slower to arrive than the
**Sovereign** — stated. Less armed, less durable, cheaper and quicker to build
than the **Majestic**. More durable and more heavily armed than **Vanguard II**,
and far slower. Particularly effective in a line and against fortifications;
particularly vulnerable to massed small hulls.

### Source Evidence
- S1: *"Not a new class: the Sovereign, taken as far as the Highwater yards can
  take her. More gundeck, more frame, more of everything the first one already
  had too much of. Deep Imperial-green sails."*

### Known
A refit and explicitly not a new class; more gundeck; more frame; deep
Imperial-green sails; built at Highwater; heavier, tougher and slower than the
Sovereign; craft 3; troop capacity unchanged.

### Implied
That *"more gundeck"* means either a longer deck or an additional one — the
source does not say which, and the Sovereign's established three decks makes
either reading possible. That Highwater may be required to build her, though
**no such rule exists**.

### Unknown
Length; exact deck count; appearance; crew; whether the Highwater reference is
mechanical or flavour.

---

## MAJESTIC

**Ship ID:** `majestic` · **Faction:** Crown Imperium · **Class:** First-rate
ship of the line, large · **Tier:** Craft grade 3 · **Standard or special:**
**The Crown's apex hull** — a new and larger design, not a refit · **Role:**
Ship of the line / siege capital

### Physical Description
*"The largest thing the Crown knows how to build"* (S1). No other physical
description exists; no art brief. That one phrase is the whole of what is
established about her appearance.

### Speed & Maneuverability
The slowest Crown hull and, jointly with the Reef-class, the slowest in the
game: she states the highest pace figure in the roster and the lowest speed band
of any Crown ship. *"Arrives after the argument is over"* (S1). She cannot
pursue and cannot escape.

### Weapons
**The heaviest battery in the game.** Three gun decks. **The heaviest
bombardment weight in the game.** No long guns. The blurb's claim is absolute:
*"nothing that has ever been in front of her is still there."*

### Combat Role
Apex ship of the line and the Crown's premier siege instrument. Her role is
decided by her inability to arrive quickly: she is a hull you commit in advance
to a place you intend to break.

### Survivability
**The highest hull figure in the game.** She absorbs more than anything else
afloat. The large class's weakness to small quick hulls applies, and applies to
her most of all — she is the largest target in the roster.

### Troop / Boarding Capacity
Three companies — **the highest of any warship**, and equal to a Fluyt. She
states this above the large-role default. A meaningful secondary purpose: she
can carry a landing force as well as break the wall in front of it.

### Bombardment / Siege
**Major, and the best in the game.** Combined with her troop capacity, she is
the only hull that can reduce a fortification and land the companies that take
it.

### Construction & Logistics
The most expensive and the longest build in the game, stated in prose: *"She
takes a season to lay down, a fortune to keep"* (S1). Craft grade 3.

### Maintenance
**The highest upkeep in the game**, stated narratively as well as numerically:
*"a fortune to keep."*

### Upgrades
Terminal, and the top of the Crown's ladder. Nothing supersedes her.

### Special Abilities
None mechanically.

### Relative Comparisons
Larger, better armed, tougher, slower and more expensive than every other Crown
hull — stated and consistent across every figure. Heavier bombardment than the
Confederate **Reef-class**, which holds that title only at day one. More
heavily armed than the **Buccaneer**, the Confederacy's apex. Carries more
companies than any warship on either side. Particularly effective against
fortifications and in a line; particularly vulnerable to massed small hulls and
to being in the wrong place, since she cannot redeploy.

### Source Evidence
- S1: *"The largest thing the Crown knows how to build. She takes a season to
  lay down, a fortune to keep, and arrives after the argument is over — but
  nothing that has ever been in front of her is still there."*
- S3: *"three ships at the top grade, one of them the largest thing either navy
  can build."*

### Known
Largest hull the Crown can build; largest in either navy; heaviest guns and
heaviest bombardment in the game; highest hull strength; highest troop capacity
of any warship; slowest; most expensive; longest build; highest upkeep; craft 3.

### Implied
That being the largest implies more than three gun decks, since a Sovereign has
three — but **the source never states her deck count**.

### Unknown
Everything physical: length, decks, masts, appearance, construction, crew. She
is the least visually described hull in the Crown roster despite being its
flagship class.

---

# THE FREE CONFEDERACY

---

## SWIFT

**Ship ID:** `swift` · **Faction:** Free Confederacy · **Class:** Schooner,
small · **Tier:** Day one · **Standard or special:** Standard — a stolen and
re-rigged civilian hull · **Role:** Scout / courier / cheap blockade

### Physical Description
*"A schooner, stolen and re-rigged"* (S1). *"Rakish, over-canvassed, comes apart
if anything touches it"* (S4). **"Over-canvassed" is an explicit sail-plan
statement** — more sail than the hull is built to carry, which is the stated
source of her speed and of her fragility. Confederate livery: crimson and rust
red, black, weathered wood, mismatched salvaged fittings, *"nothing regulation
and no two alike."*

### Speed & Maneuverability
**The fastest crossing hull in the game**: she states the lowest pace figure of
any hull except the Reefwalker, and a very high speed band. *"Outruns everything
on the water"* (S1) — a claim contradicted in detail by the Reefwalker, which
states a better speed band and a lower pace, and by the legendary Swallowtail,
which is *"the fastest thing afloat"* by rule. Take the blurb as a day-one claim.

### Weapons
The lightest armed hull in either fleet that mounts anything: she states a gun
figure below the small-role default. One gun deck. Role-default bombardment,
which is negligible. No long guns.

### Combat Role
Scout, courier and cheap blockade, as the Kestrel. S5 files her as an
**Escort**: *"Early anti-small-craft; iconic."*

### Survivability
The weakest in the game: she states a hull figure below the small-role default,
the lowest of any vessel. *"Comes apart if anything catches it"* (S1);
*"comes apart if anything touches it"* (S4). She keeps the small class's
hard-to-hit advantage, which is her only protection.

### Troop / Boarding Capacity
One company, role default. Minor.

### Bombardment / Siege
Negligible.

### Construction & Logistics
Cheapest tier with the Kestrel; day one, no research. **Affected by Warning 3.**

### Maintenance
Role default. Nothing narrative.

### Upgrades
**None.** The Confederacy has no II programme (S3). Her successors in role are
the **Cutlass** and **Reefwalker** at craft 1 — different designs with different
briefs, not refits of her.

### Special Abilities
None.

### Relative Comparisons
Faster than the **Kestrel** and every Crown hull. Slower than the
**Reefwalker**. More fragile than any hull in the game, including the
Reefwalker. Less armed than the Kestrel. Particularly vulnerable to frigates
and, frankly, to everything; particularly effective as a scout and a cheap
blockade.

### Source Evidence
- S1: *"A schooner, stolen and re-rigged. Outruns everything on the water and
  comes apart if anything catches it."*
- S4: *"Rakish, over-canvassed, comes apart if anything touches it."*
- S5 §6B #6: *"Swift schooner | Escort | Early anti-small-craft; iconic."*

### Known
Schooner; stolen and re-rigged; rakish and over-canvassed; fastest day-one
hull; most fragile hull in the game; lightest armament of any armed hull; day
one; Confederate salvaged livery.

### Implied
That a schooner implies two masts in period terms — **not stated**, and the only
explicit mast count in the game belongs to the Kestrel. That "stolen" implies no
standard pattern and variation between hulls.

### Unknown
Length; masts; decks; crew; what she was stolen from.

---

## TEMPEST

**Ship ID:** `tempest` · **Faction:** Free Confederacy · **Class:** Frigate,
medium · **Tier:** Day one · **Standard or special:** Standard — a composite
hull built from wrecks · **Role:** General-purpose medium

### Physical Description
*"A frigate patched together out of three others"* (S1). *"Mismatched timber,
visible repairs, not pretty, holds its own"* (S4). **Composite construction
from three separate hulls is explicit**, and is the clearest statement of the
Confederate shipwright tradition in the roster.

### Speed & Maneuverability
Role default pace and speed for a medium. Nothing narrative claims either.

### Weapons
Slightly below the medium role default — she states a gun figure under it. Two
gun decks. Role-default bombardment. No long guns.

### Combat Role
The Confederacy's day-one workhorse, mirroring the Razorback. S5 files her as
**Capital** and *"First unlock"*. As a medium she carries S2's anti-small-craft
gunnery advantage.

### Survivability
Slightly above the medium default — she states a hull figure over it, and above
the Razorback's. *"Holds its own against anything short of a ship of the
line"* (S1), which sets her ceiling precisely.

### Troop / Boarding Capacity
One company, role default. Minor.

### Bombardment / Siege
Role default; minor.

### Construction & Logistics
Day one, no research, cheap. Her construction from three wrecks implies
salvage rather than new timber, though no rule reflects this.
**Affected by Warning 3.**

### Maintenance
Role default.

### Upgrades
None directly. The **Marauder** and **Urskin Whaler** at craft 2 are the
Confederacy's later mediums, and neither is a Tempest refit.

### Special Abilities
None.

### Relative Comparisons
Tougher and slightly less armed than the **Razorback**, its Crown counterpart.
Explicitly outclassed by any ship of the line. More durable than a **Marauder**,
less than an **Urskin Whaler**. Particularly effective against small hulls;
particularly vulnerable to ships of the line.

### Source Evidence
- S1: *"A frigate patched together out of three others. Not pretty. Holds its
  own against anything short of a ship of the line."*
- S4: *"Mismatched timber, visible repairs, not pretty."*
- S5 §6B #7: *"Tempest frigate | Capital | First unlock; carries 2 squadrons."*

### Known
Frigate; built from three other hulls; mismatched timber and visible repairs;
holds her own below the line; slightly tougher and slightly less armed than the
medium baseline; day one.

### Implied
That composite construction implies inconsistency between individual ships,
though no rule models it.

### Unknown
Length; masts; decks; crew; which three hulls, or whether it differs per ship.

---

## BRIG

**Ship ID:** `brig` · **Faction:** Free Confederacy · **Class:** Hauler,
transport · **Tier:** Day one · **Standard or special:** Standard transport ·
**Role:** Troop transport

### Physical Description
*"A blunt-nosed hauler"* (S1, S4). Nothing further. All stats inherited from
the transport role — she is, with the Kestrel, one of only two hulls that state
nothing of their own.

### Speed & Maneuverability
Role default. Nothing narrative.

### Weapons
*"No guns worth the name"* (S1) — and mechanically, none at all: zero guns,
zero bombardment. Note the phrasing differs from the Fluyt's *"unarmed"*,
implying something aboard, but the rules give her nothing.

### Combat Role
None. Transport only. S5 adds a second use: *"colonizing/scouting."*

### Survivability
Transport role default. Undefended.

### Troop / Boarding Capacity
Her purpose: *"it lands companies where they are wanted"* (S1). Three companies,
role default — the same as the Fluyt. S5 says *"2 troops"*, which **conflicts**
with the implemented figure.

### Bombardment / Siege
None.

### Construction & Logistics
Cheap, day one, no research. **Affected by Warning 3.**

### Maintenance
Role default, low.

### Upgrades
**None** — and this is a real asymmetry worth flagging to whoever assigns
statistics: **the Confederacy has no transport above day one.** The Crown gets
the Fluyt II at craft 2; the Confederacy's late-game lift comes from warships
that carry companies (Cutlass, Urskin Whaler, Buccaneer) rather than from a
dedicated hull.

### Special Abilities
None.

### Relative Comparisons
Identical in every implemented statistic to the **Fluyt**. Carries less than a
**Fluyt II**, which has no Confederate equivalent. Particularly vulnerable to
everything.

### Source Evidence
- S1: *"A blunt-nosed hauler. No guns worth the name, but it lands companies
  where they are wanted."*
- S5 §6B #5: *"Brig | Transport | 2 troops; colonizing/scouting."*

### Known
Blunt-nosed hauler; effectively unarmed; lands companies; day one; every
statistic inherited from the transport role.

### Implied
That *"no guns worth the name"* implies some light armament in fiction that the
rules do not model.

### Unknown
Length; masts; decks; appearance beyond "blunt-nosed"; crew.

---

## REEF-CLASS

**Ship ID:** `reef` · **Faction:** Free Confederacy · **Class:** Grown coral
ship of the line, large · **Tier:** Day one — **the only superheavy available
on the first morning to either side** · **Standard or special:** **Special** —
grown rather than built, and no two alike · **Role:** Siege capital

### Physical Description
The most distinctive hull in the game. *"Grown, not built — a living coral hull
the Reef-folk sing into shape over years. No two alike, enormous"* (S1). S4:
*"Organic, ridged, faintly luminous at the waterline. The one place the fantasy
is allowed to show."* S5 corroborates the growing process. S3's character notes
establish the practice generally: Maren Quist *"Grew her own hull over nine
years the way the Reef-folk do, singing coral into shape a season at a time."*

**Nine years is the only construction duration stated in narrative for any hull
in the game**, though it describes a personal hull rather than this class.

### Speed & Maneuverability
**The slowest hull in the game**, stated outright: *"in no hurry: she is the
slowest thing either side puts to sea"* (S1). She states the highest pace figure
in the roster (tied with the Majestic) and the lowest speed band of any
Confederate hull. She cannot pursue and cannot escape.

### Weapons
Role-default guns for a large hull. Three gun decks. **Her bombardment is her
weapon**: *"she throws more iron at a seawall than anything the Crown has"* (S1)
— true on day one, and later exceeded by the Sovereign II and the Majestic. No
long guns.

### Combat Role
**Siege capital, stated explicitly:** *"If a Confederate siege train exists, she
is it"* (S1). She exists to reduce fortifications. She is also a competent ship
of the line by her role-default battery, but that is not her brief.

### Survivability
Very high — she states a hull figure well above the large-role default, higher
than a Sovereign's. Living coral is the stated material. She is the easiest
class to hit, as all large hulls are.

### Troop / Boarding Capacity
Two companies, role default. S5 says *"1 troop"*, which **conflicts** with the
implemented figure. Secondary purpose.

### Bombardment / Siege
**Major, and her defining role.** At day one she is the best siege hull in the
game by a wide margin, and the Confederacy's only one until craft 2.

### Construction & Logistics
The strategic oddity of the roster: **a superheavy with no research requirement**
(S3: *"It is the only side with a superheavy on day one"*). She costs the same
as a Sovereign and takes substantially longer to build — and unlike the other
day-one hulls she **states her own build time**, so she is *not* affected by
Warning 3. Narratively she is grown over years by Reef-folk, which implies a
resource and a people rather than a yard, though **no special facility is
required by any rule**.

### Maintenance
Role default for a large hull — notably, no premium despite her size or
strangeness.

### Upgrades
None. No Reef-class II exists.

### Special Abilities
**None mechanically.** The living hull, the singing, the luminescence and the
no-two-alike variation are all flavour; no rule reads any of them. This is worth
stating plainly, because the narrative implies capability that the game does
not grant.

### Relative Comparisons
Slowest hull in the game, tied with the **Majestic**. Tougher than a
**Sovereign**, and less heavily gunned than one at the same price. Throws more
at a seawall than any Crown hull available on day one. Less bombardment than a
**Sovereign II** or a **Majestic** once those arrive. Particularly effective
against fortifications; particularly vulnerable to massed small hulls and to
needing to be anywhere quickly.

### Source Evidence
- S1: *"Grown, not built — a living coral hull the Reef-folk sing into shape
  over years. No two alike, enormous, and in no hurry: she is the slowest thing
  either side puts to sea and she throws more iron at a seawall than anything
  the Crown has. If a Confederate siege train exists, she is it."*
- S4: *"Organic, ridged, faintly luminous at the waterline. The one place the
  fantasy is allowed to show."*
- S5 §6B #8: *"Reef-class ship of the line | Capital | Grown, not built — a
  living coral hull the Reef-folk sing into shape over years. No two alike.
  3 squadrons, 1 troop."*
- S3: *"It is the only side with a superheavy on day one."*

### Known
Grown living coral, not built; sung into shape by Reef-folk over years; no two
alike; enormous; organic and ridged; faintly luminous at the waterline; slowest
hull in the game; best day-one siege weight; available without research;
tougher than a Sovereign; states her own build time and cost.

### Implied
That a living hull might self-repair, or resist damage differently from timber —
**strongly implied by the fiction and modelled nowhere.** That "no two alike"
implies stat variation between individual ships, which the game does not
implement.

### Unknown
Length; masts; deck count (S5 implies a ship of the line's, but does not say);
crew; whether Reef-folk are required to build or sail her; what "living" means
mechanically; whether she can be built at any Shipyard or only certain islands.

---

## CUTLASS

**Ship ID:** `cutlass` · **Faction:** Free Confederacy · **Class:** Corvette,
small · **Tier:** Craft grade 1 · **Standard or special:** **Special** — built
around the boarding action · **Role:** Boarding / assault small

### Physical Description
No art brief and no physical description beyond her type. *"A corvette"* (S1).
The one physical claim is implicit in *"a hold full of people"* — unusual
capacity for her size.

### Speed & Maneuverability
Below the small-role baseline: she states a pace above the Swift's and
Reefwalker's, and inherits the small speed band. She is the slowest small hull
in the Confederate roster, which fits a hull carrying people and iron.

### Weapons
**Exceptional for her size**, and stated as such: *"carrying nearly twice the
iron her size has any business with"* (S1). She states a gun figure far above
the small-role default — higher than the Kestrel II's. One gun deck, so all of
that weight goes into a single target each round. Above-default bombardment for
a small hull, though still slight. No long guns.

### Combat Role
**Boarding and assault**, stated outright: *"Built around the boarding action...
and is no use at all in a line"* (S1). She is the only hull in the game whose
blurb names boarding as its design purpose. Her role is to arrive, fire heavily
once, and put people on a deck or a beach.

### Survivability
Poor, and the stated trade: she carries a hull figure at the small-role
baseline while carrying a medium's armament and double the capacity. She is
*"no use at all in a line"* — she cannot sustain an engagement.

### Troop / Boarding Capacity
**Her purpose, and remarkable for her size:** *"a hold full of people who mean
to be on your deck... she lands more companies than a frigate does"* (S1). She
states double the small-role default — **the same capacity as a large hull**.

### Bombardment / Siege
Slight but non-zero, above the small baseline. Minor role.

### Construction & Logistics
Craft grade 1. More expensive than a Swift; a short build by the roster's
standards.

### Maintenance
Above the small-role default — she costs more to keep than her size suggests,
consistent with a full hold.

### Upgrades
None.

### Special Abilities
**None mechanically.** The boarding action is described in her blurb but the
game has no boarding rule: her capacity is ordinary troop capacity, used for
landings. Whoever assigns statistics should know that *"built around the
boarding action"* currently has no mechanical expression.

### Relative Comparisons
Far more heavily armed than any other small hull on either side. Carries more
companies than any medium hull, and as many as a ship of the line. Slower than
the **Swift** and the **Reefwalker**. More fragile than a **Kestrel II** despite
being a grade-mate. Explicitly *"no use at all in a line."* Particularly
effective delivering companies under fire; particularly vulnerable in any
sustained action.

### Source Evidence
- S1: *"A corvette carrying nearly twice the iron her size has any business
  with, and a hold full of people who mean to be on your deck. Built around the
  boarding action: she lands more companies than a frigate does and is no use at
  all in a line."*

### Known
Corvette; roughly twice the armament her size warrants; carries a hold of
fighting people; lands more companies than a frigate; useless in a line; craft
1; double the small-role troop capacity; higher upkeep than her size implies.

### Implied
That her hold volume comes at the cost of stores or sailing qualities, implied
by her poor pace but not stated. That the "boarding action" implies a crew of
fighters rather than sailors.

### Unknown
Length; masts; decks; appearance (no art brief); crew; whether boarding is ever
intended to become a rule.

---

## REEFWALKER

**Ship ID:** `reefwalker` · **Faction:** Free Confederacy · **Class:**
Shoal-folk cutter, small · **Tier:** Craft grade 1 · **Standard or special:**
**Special** — a shallow-draught scout built by a specific people · **Role:**
Scout

### Physical Description
*"A Shoal-folk cutter: tiny, quiet, and drawing so little water she works reefs
a sloop would open herself on"* (S1). **Draught is explicitly established** —
the only hull for which it is. *"Tiny"* makes her the smallest vessel in the
game. *"Quiet"* is stated and has no mechanical expression. No art brief.

### Speed & Maneuverability
**The fastest hull in the game on both measures**: she states the lowest pace
figure in the roster and the highest speed band. Her shallow draught lets her
sail water other hulls cannot — narratively; **no rule models reefs or
draught.**

### Weapons
**The lightest armed hull that mounts anything**, below the Swift. One gun deck.
**Her bombardment is explicitly zero** — she is the only armed hull in the game
that states zero against stone. No long guns.

### Combat Role
Pure scout. *"She sees everything and survives nothing"* (S1). She is not a
combat hull in any sense.

### Survivability
Second-worst in the game, above only the Swift. *"Survives nothing"*, stated.
She keeps the small class's hard-to-hit property, which is her only defence.

### Troop / Boarding Capacity
One company, and she states it explicitly rather than inheriting it. Minor —
enough, per S2, *"to take ground nobody is holding."*

### Bombardment / Siege
**Explicitly none.** Zero.

### Construction & Logistics
Craft grade 1. The **cheapest and quickest** hull in the game to build, and by
a clear margin.

### Maintenance
**The lowest upkeep in the game** — below the small-role default.

### Upgrades
None.

### Special Abilities
**None mechanically**, and this is the largest gap between fiction and rules in
the roster. *"Draws so little water she works reefs a sloop would open herself
on"*, *"quiet"*, and *"sees everything"* all suggest capabilities — shallow-water
access, stealth, enhanced scouting range — and **none of the three is
implemented**. She is mechanically a very fast, very cheap, very weak hull.

### Relative Comparisons
Faster than every hull in the game, including the **Swift**. Cheaper and
quicker to build than anything. Lower upkeep than anything. More fragile than
everything except the Swift. Less armed than everything that is armed. The only
armed hull with no bombardment at all. Particularly effective as a scout and a
cheap picket; particularly vulnerable to any armed hull that manages to hit her.

### Source Evidence
- S1: *"A Shoal-folk cutter: tiny, quiet, and drawing so little water she works
  reefs a sloop would open herself on. She sees everything and survives
  nothing."*

### Known
Shoal-folk cutter; tiny; quiet; very shallow draught; fastest hull in the game;
cheapest and quickest to build; lowest upkeep; near-worthless in combat; zero
bombardment; carries one company; craft 1.

### Implied
That a "cutter" implies a single mast in period terms — not stated. That being
built by the Shoal-folk implies a crew of them, not stated.

### Unknown
Length; masts; decks; appearance; crew; whether her draught, quietness or
scouting are ever to become rules.

---

## MARAUDER

**Ship ID:** `marauder` · **Faction:** Free Confederacy · **Class:** Heavy
frigate / raider, medium · **Tier:** Craft grade 2 · **Standard or special:**
Standard raiding medium · **Role:** Raider / strike hull

### Physical Description
*"Low, fast, and all of it forward"* (S1). **"All of it forward" is a weapons
disposition statement** — the only one in the roster — implying her battery is
concentrated in the bow rather than in broadside. No art brief.

### Speed & Maneuverability
Fast for a medium: she states a pace below the medium default and a speed band
well above it — the highest of any medium in the game. Escaping is part of her
design: *"she is never there for it."*

### Weapons
Heavy for her class — she states a gun figure well above the medium default,
the highest of any Confederate medium. *"Hits like a frigate on the way in"*
(S1). Two gun decks. **Below-default bombardment**, lower than a Tempest's.
No long guns.

### Combat Role
**Raider.** The blurb is a complete statement of doctrine: *"A raider that hits
like a frigate on the way in and cannot take the answer, which is why she is
never there for it."* She strikes and withdraws; her high speed band is what
makes that possible. S5 files her as *"Assault Frigate → Marauder heavy frigate
| Capital | Extra firepower, no capacity."*

### Survivability
**Poor for a medium** — she states a hull figure below the medium default, lower
than a Tempest's and barely above a Cutlass's. *"Cannot take the answer"*,
stated. Her defence is not being present.

### Troop / Boarding Capacity
One company, role default. S5's *"no capacity"* is directionally right but
conflicts with the implemented figure. Minor.

### Bombardment / Siege
**Below the medium baseline** and explicitly not her role.

### Construction & Logistics
Craft grade 2. Cheaper than a Tempest per gun; a moderate build.

### Maintenance
Standard for a Confederate medium.

### Upgrades
None.

### Special Abilities
None.

### Relative Comparisons
Faster and more heavily armed than a **Tempest**; markedly less durable.
Roughly a mirror of the Crown's **Bulwark** taken in the opposite direction —
where the Bulwark trades guns for hull, the Marauder trades hull for guns and
speed. Much less durable than an **Urskin Whaler**, her grade-mate. Particularly
effective striking and withdrawing, and against small hulls per S2's triangle;
particularly vulnerable to anything that pins her.

### Source Evidence
- S1: *"Low, fast, and all of it forward. A raider that hits like a frigate on
  the way in and cannot take the answer, which is why she is never there for
  it."*
- S5 §6B #11: *"Marauder heavy frigate | Capital | Extra firepower, no
  capacity."*

### Known
Low and fast; armament concentrated forward; raider doctrine; heaviest-armed
Confederate medium; poor hull for her class; best speed band of any medium;
below-baseline bombardment; craft 2.

### Implied
That *"all of it forward"* implies chase guns or a bow battery rather than a
conventional broadside — **strongly implied, never confirmed**, and the combat
rules make no distinction between bow and broadside fire.

### Unknown
Length; masts; decks; appearance; crew; whether her forward disposition is
meant to have a mechanical consequence.

---

## URSKIN WHALER

**Ship ID:** `urskin-whaler` · **Faction:** Free Confederacy · **Class:**
Converted whaling hull, medium · **Tier:** Craft grade 2 · **Standard or
special:** **Special** — a working whaler pressed into war, built by a specific
people · **Role:** Assault medium / tough siege support

### Physical Description
*"A northern whaling hull with the ice-frames still in her"* (S1). **Ice-frames
are an explicit structural feature** and the stated source of her toughness —
the clearest cause-and-effect physical statement in the roster. No art brief.
S3 establishes the Urskin as an arctic whaling people of Northreach.

### Speed & Maneuverability
Slow for a medium: she states a pace above the medium default and a low speed
band — the worst of any Confederate medium. She is a working hull, not a
warship.

### Weapons
**The only named weapon on any buildable hull in the game:** *"a harpoon
battery over the bow big enough to take a mast out"* (S1). Mounted **over the
bow**. Its stated effect is dismasting — **which no rule models; the game has no
rigging or mast damage.** Her aggregate gun figure is at the medium default —
average — so the harpoon battery is flavour on an ordinary battery. Two gun
decks. **Well above-default bombardment**, nearly double a Tempest's. No long
guns.

### Combat Role
A durable assault hull: she survives the approach, throws real weight at a wall,
and lands the people who finish the job — *"she carries the people to finish it
ashore"* (S1). Closest thing the Confederacy has to a medium-weight siege and
landing hull.

### Survivability
**The toughest medium in the game**, and tougher than several large hulls: she
states a hull figure far above the medium default, above the Bulwark's.
*"Enormously hard to kill"* (S1), with the ice-frames as the stated reason.

### Troop / Boarding Capacity
Two companies — double the medium default, matching a ship of the line. A
**major** secondary purpose, stated in the blurb.

### Bombardment / Siege
Substantial for a medium — well above any other frigate on either side, and
approaching light-capital weight. A meaningful siege contributor, which
combined with her capacity and toughness makes her a complete small-scale
assault package.

### Construction & Logistics
Craft grade 2. The most expensive Confederate medium. A long build for her size.

### Maintenance
Standard for a Confederate medium — **no premium despite her size and
toughness**.

### Upgrades
None.

### Special Abilities
**None mechanically.** The harpoon battery's mast-taking is not implemented, and
the ice-frames are expressed only as a high hull figure.

### Relative Comparisons
Far tougher and far slower than a **Marauder**, her grade-mate — the two are
opposite answers to the same tier. Tougher than the Crown's **Bulwark**, which
is the Crown's equivalent idea. Carries as many companies as a ship of the line.
Throws more at a wall than any other medium. Particularly effective as a
survivable assault hull; particularly vulnerable to being outrun or outmanoeuvred.

### Source Evidence
- S1: *"A northern whaling hull with the ice-frames still in her and a harpoon
  battery over the bow big enough to take a mast out. Slow, enormously hard to
  kill, and she carries the people to finish it ashore."*
- S5 §6B #4 (an adjacent, unimplemented design): *"Whaler troopship | Transport
  | 6 troops, unarmed. Urskin-built."*

### Known
Northern whaling hull; ice-frames retained; harpoon battery mounted over the
bow, capable of dismasting; slow; toughest medium in the game; carries two
companies; heavy bombardment for her class; craft 2; Urskin-built.

### Implied
That "northern" and "ice-frames" imply she came from the Rime Reach or
Northreach, consistent with S3's placement of the Urskin. That a whaling hull
implies large hold volume, supporting her troop capacity.

### Unknown
Length; masts; decks; appearance; crew; whether the harpoon battery is intended
to become a rule; how many harpoons.

---

## BUCCANEER

**Ship ID:** `freebooter` *(note: the class id and the display name differ)* ·
**Faction:** Free Confederacy · **Class:** Great cruiser, large · **Tier:**
Craft grade 3 · **Standard or special:** **Special** — bespoke, cut to an
individual captain's taste, no two alike · **Role:** Apex capital

### Physical Description
*"A great human-built cruiser, no two alike, the upper works cut to one
person's taste"* (S1). **"Human-built" is a deliberate contrast with the
Reef-class's grown coral** — the Confederacy's two large hulls come from
entirely different traditions. *"The upper works cut to one person's taste"*
establishes bespoke superstructure. No art brief.

### Speed & Maneuverability
Fast for a large hull: she states a pace below the large default and a speed
band above it. Slower than a **Vanguard II** but faster than every other ship of
the line on either side.

### Weapons
**The heaviest Confederate battery** — she states a gun figure above every hull
in the game except the Majestic. Three gun decks. Substantial bombardment,
below a Reef-class's. No long guns.

### Combat Role
The Confederacy's apex capital and its answer to a first-rate — with the
distinction drawn explicitly: *"The Confederacy's answer to a first-rate, and it
is not a copy of one"* (S1). A cruiser rather than a line ship: she is faster
and less durable than the Crown's heaviest, and more heavily gunned than
anything the Crown fields below the Majestic.

### Survivability
High — above the large-role default, tougher than a Vanguard II, but below a
Sovereign II, a Majestic and a Reef-class. She is the third-toughest hull the
Confederacy can field, behind the Reef-class and, for its class, the Urskin
Whaler.

### Troop / Boarding Capacity
Two companies, role default. Secondary.

### Bombardment / Siege
Substantial — second among Confederate hulls, behind the Reef-class. A capable
siege hull but not the Confederacy's primary one.

### Construction & Logistics
Craft grade 3. **The most expensive Confederate hull**, and among the longest
builds in the game. *"What a Confederate yard builds when a captain has the gold
to ask for everything"* (S1) — expense is explicit in the fiction as well as the
numbers.

### Maintenance
High, matching a Sovereign II's.

### Upgrades
Terminal, and the top of the Confederate ladder.

### Special Abilities
**None mechanically.** "No two alike" and the bespoke upper works are flavour;
no per-ship variation is implemented.

### Relative Comparisons
More heavily armed than every hull in the game except the **Majestic**. Faster
than every ship of the line except **Vanguard II**. Less durable than
**Sovereign II**, **Majestic** and **Reef-class**. Throws less at a wall than a
**Reef-class**. Explicitly *not* a copy of a first-rate. Particularly effective
as a fast heavy cruiser; particularly vulnerable to massed small hulls, as all
large hulls are.

### Source Evidence
- S1: *"What a Confederate yard builds when a captain has the gold to ask for
  everything: a great human-built cruiser, no two alike, the upper works cut to
  one person's taste. The Confederacy's answer to a first-rate, and it is not a
  copy of one."*
- S3: *"where the Crown refines, it finds another answer: a corvette built round
  a boarding action, a whaler with the ice-frames still in her, a cruiser cut to
  one captain's taste."*

### Known
Great human-built cruiser; bespoke upper works; no two alike; the Confederacy's
apex hull and its answer to a first-rate; heaviest Confederate battery; fast for
her size; most expensive Confederate hull; craft 3.

### Implied
That "human-built" distinguishes her from Reef-folk and Urskin construction, and
implies conventional timber — consistent with S5's faction rule but not stated
in her own entry.

### Unknown
Length; masts; decks; appearance; crew; why the class id is `freebooter` and the
name "Buccaneer" (this is a naming inconsistency in the data, not a design fact).

---

# THE PIRATE LORDS' SHIPS — LEGEND HULLS

**Read this before assigning anything.** These three are flagged `legend: true`
in S1 and **must not receive combat statistics.** S2 defines the flag: *"Lore
only. A legend is a ship the stories tell about — the three the Pirate Lords are
named for — and it is never put on the water: nothing builds it, nothing sails
it, nothing fights it. It is here so a name on a bio resolves to something with
prose attached."*

S3 records why: *"When the Lords became people rather than ships, their ships
became lore."* The Lords are crew members now. What each ship represents is
delivered as a **character power**, not as a hull — so the correct target for
any numerical work here is the power, and the powers already exist.

They carry a nominal `role` (large, small, large) purely so the data shape is
valid. **That role is not a size claim to be converted.**

---

## OPEN DECK

**Ship ID:** `harbor` *(id and name differ)* · **Faction:** Free Confederacy ·
**Class:** Grown coral three-decker · **Tier:** N/A — legend · **Role:** The
Confederacy's floating parliament

### Physical Description
*"Corwin Calloway's old coral-grown three-decker"* (S1) — grown coral like the
Reef-class, and **three decks explicitly**. S3 adds her history: *"Everyone saw
her burn at the Broken Chain; the Reef-folk sang the coral closed over the char
and brought her out of the smoke."*

### Everything else
Unestablished, and deliberately so: *"the hull was never the point, and nobody
has seen it in years"* (S1). No speed, weapons, survivability, capacity,
bombardment, construction or maintenance information exists, and none should be
invented.

### Special Abilities
Delivered as Adaira Hale's character power, **The Moot sails with her**: *"The
Moot sits where she does. While she holds a posting, that island comes round to
the Confederacy a point a day — their own ground, unaligned ground, or the
Crown's."* This is an allegiance effect attached to a person holding a Command
posting; it is not a ship capability.

### Source Evidence
- S1: *"Commodore-Elect Adaira Hale's ship: Corwin Calloway's old coral-grown
  three-decker, named for what he meant her to be, since any deck of his stood
  open to anyone the Crown wanted. The Moot was called on her quarterdeck and
  has been the Moot ever since. Where Hale is, the Moot sits — the hull was
  never the point, and nobody has seen it in years."*
- S3: *"(She was the Free Harbor until 17 September, when Sean pointed out that
  a ship and the Confederacy's meeting place should not be near-homophones.)"*

### Known
Coral-grown; three decks; formerly Corwin Calloway's; burned at the Broken
Chain and regrown by Reef-folk; the Moot's meeting place; never built, never
sailed, never fought; renamed from *Free Harbor*.

### Implied
That as a coral three-decker she would resemble a Reef-class, though nothing
says she is of that class.

### Unknown
Everything mechanical. By design.

---

## SWALLOWTAIL

**Ship ID:** `swallowtail` · **Faction:** Free Confederacy · **Class:**
Grown coral sloop · **Tier:** N/A — legend · **Role:** Captain Silas Reyne's
personal ship

### Physical Description
*"A coral-grown sloop, which should not be as fast as she is"* (S1, S3). Coral
construction and sloop rig are the only physical facts.

### Speed
**The one legend hull with a speed claim**, and it is superlative and
unexplained: *"has never once been caught"*, *"a week's sail in half a week,
every time, and no explanation offered"* (S1). S5 calls her *"Fastest thing
afloat; hit last."*

### Everything else
Unestablished. No weapons, survivability, capacity, bombardment, construction or
maintenance information exists.

### Special Abilities
Delivered as Silas Reyne's character power, **He is never off the Swallowtail**:
*"The Swallowtail is the fastest thing afloat and he is never off her. Any
errand he leads makes the passage in half the time."* S3 records the intent
plainly: *"Han Solo's trick, and the one Sean asked for by name."* It halves
travel time on any errand he leads — a character power, not a hull statistic.

### Source Evidence
- S1: *"Captain Silas Reyne's coral-grown sloop, which should not be as fast as
  she is and has never once been caught... a week's sail in half a week, every
  time, and no explanation offered."*
- S5 §6B: *"the Swallowtail | Unique (Lord) | Reyne's sloop. Fastest thing
  afloat; hit last."*

### Known
Coral-grown sloop; unexplainedly and superlatively fast; never caught; Reyne is
never off her; never built, sailed or fought as a hull.

### Implied
That her speed has a supernatural or Deep-related cause — *"no explanation
offered"* invites it without asserting it.

### Unknown
Everything mechanical, and deliberately the cause of her speed. S5's *"hit
last"* refers to a cut targeting mechanic and should not be converted.

---

## IRONBACK

**Ship ID:** `ironback` · **Faction:** Free Confederacy (Crown-built) ·
**Class:** Dreadnought / first-rate · **Tier:** N/A — legend · **Role:**
Admiral Dorian Jessup's captured flagship

### Physical Description
The best-documented legend hull, because she carries a design rule. S3: *"She is
the captured-ship rule made flesh: **Imperial bones, visibly** — the hull, the
gundecks and the stern are Highwater's work and always will be — under
Confederate weathering, crimson accents and a decade of improvised
modification."*

The rule itself, from S3: *"A prize keeps the structural DNA of whoever built
her and takes on the visible modifications of whoever holds her now. She is
never repainted into the other side's shipwright tradition, because the
tradition is in the timber."*

### Everything else
Unestablished. S5 notes she was *"Pre-war ship of the line"* and that the
Crown's and Confederacy's versions are *"Identical"* — but S5's Ironback is a
**buildable class**, and the implemented Ironback is **a single legend ship**.
Do not merge the two.

### Special Abilities
Delivered as Dorian Jessup's character power, **He fights a harbor the
Ironback's way**: *"While he holds a posting, every fleet lying in that harbor
fights under the Admiral's command."* Mechanically this applies his leadership
edge to every friendly fleet at that island whether or not he is aboard one.

### Source Evidence
- S1: *"The Crown dreadnought Admiral Dorian Jessup took with him when he left
  the Imperium's service, and fought the Crown's own line with for nine years.
  What he learned aboard her he teaches to whatever squadron is lying in the
  harbor he is posted to, which is worth more to the Confederacy now than the
  ship ever was."*
- S3: *"Imperial bones, visibly — the hull, the gundecks and the stern are
  Highwater's work and always will be."*

### Known
Crown-built dreadnought; taken by Jessup when he defected; fought the Crown's
line for nine years; Imperial hull, gundecks and stern retained permanently;
Confederate weathering, crimson accents, a decade of improvised modification;
never built, sailed or fought as a hull in the implemented game.

### Implied
That as a Crown dreadnought she resembles a Sovereign in construction — implied
by the captured-ship rule, not stated.

### Unknown
Everything mechanical. S5's buildable "Ironback" class is a different, cut
design.

---

# CONSOLIDATED TABLE

Qualitative only, exactly as the sources support. "Relative" columns are ranks
within the 21 buildable hulls. The three legend hulls are listed last and carry
no comparative entries, because the source establishes none.

| Ship | Faction | Class | Relative Size | Relative Speed | Armor Description | Weapon Description | Combat Role | Troop Role | Bombardment Role | Technology Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| Kestrel | Crown | Sloop-of-war | Smallest Crown hull; light, low, single-masted | Fastest Crown day-one hull; slower than Swift | *"The first to sink"*; hardest class to hit | Light; one gun deck; unnamed | Scout, picket, cheap blockade | Minimal — role floor | Negligible | Day one |
| Razorback | Crown | Heavy frigate | Medium; workmanlike | Quick enough to be useful | Below the roster's hull-to-gun baseline; outmatched by the line | Above-baseline battery; two gun decks | General gun platform; best class against small hulls | Minor — one company | Minor | Day one |
| Sovereign | Crown | First-rate of the line | Massive, deep-hulled, three gun decks | *"Slow to arrive anywhere"* | *"Takes more killing"* than anything at day one; coppered to the waterline; easiest class to hit | Heaviest day-one battery; three gun decks | Ship of the line; backbone of the fleet | Secondary — two companies | Major | Day one |
| Fluyt | Crown | Merchantman | Fat-bellied, blunt, high-sterned | Unremarkable | Undefended; **no gunports** | **None** | None | **Primary** — highest day-one lift | None | Day one |
| Bulwark | Crown | Armoured frigate | Medium; broad, deep, high freeboard | Slower than her class; *"built to stand and not move"* | *"Half again the hull"* of a Razorback; toughest Crown medium | **Fewer** guns than a Razorback; two gun decks | Line-holding medium | Minor | Minor | Craft 1 |
| Kestrel II | Crown | Sloop-of-war | Small; frames doubled, rig re-cut | Faster than the Kestrel; second-fastest in the game | Materially tougher than the Kestrel; still fragile | Better armed than the Kestrel; one gun deck | Scout, picket | Minimal | Negligible | Craft 1 |
| Vanguard | Crown | Cruiser | Large | Fast for her size; *"can catch what it is shooting at"* | **Thinner in the side than a Sovereign** | *"Nearly a first-rate's broadside"*; three gun decks | Hunting cruiser / pursuit capital | Secondary | Secondary | Craft 2 |
| Razorback II | Crown | Heavy frigate | Medium | Quicker than the Razorback | *"Better-framed"* than the Razorback | Heavier battery than the Razorback; two gun decks | General-purpose medium | Minor | Minor | Craft 2 |
| Fluyt II | Crown | Naval transport | Larger hold and frame than a Fluyt | Fast enough to keep fleet station | More frame than a Fluyt; still undefended | **None** | None | **Primary** — highest lift in the game | None | Craft 2 |
| Vanguard II | Crown | Cruiser | Large | *"Sails like a frigate"*; fastest large hull | Tougher than a Vanguard; still below a Sovereign | *"A first-rate's weight"*; three gun decks | Pursuit capital, perfected | Secondary | Secondary | Craft 3 |
| Sovereign II | Crown | First-rate of the line | *"More gundeck, more frame"* than a Sovereign | Slower to arrive than a Sovereign | Second-toughest in the game | Heavier than a Sovereign; three gun decks | Ship of the line | Secondary — unchanged | Major | Craft 3 |
| Majestic | Crown | First-rate of the line | **Largest hull either navy can build** | **Slowest Crown hull**; *"arrives after the argument is over"* | **Toughest hull in the game** | **Heaviest battery in the game**; three gun decks | Apex ship of the line and siege capital | **Major** — highest of any warship | **Major — best in the game** | Craft 3 |
| Swift | Confederacy | Schooner | Small; rakish, over-canvassed | *"Outruns everything on the water"* (day-one claim) | **Most fragile hull in the game** | Lightest armed hull; one gun deck | Scout, courier, cheap blockade | Minimal | Negligible | Day one |
| Tempest | Confederacy | Frigate | Medium; mismatched timber | Unremarkable | Above the medium baseline; *"holds its own short of a ship of the line"* | Slightly below baseline; two gun decks | General-purpose medium | Minor | Minor | Day one |
| Brig | Confederacy | Hauler | Blunt-nosed | Unremarkable | Undefended | *"No guns worth the name"* — none in rules | None | **Primary** | None | Day one |
| Reef-class | Confederacy | Grown coral ship of the line | **Enormous**; organic, ridged, luminous at the waterline | **Slowest hull in the game** | Living coral; tougher than a Sovereign | Baseline large battery; three gun decks | **Siege capital** — *"If a Confederate siege train exists, she is it"* | Secondary | **Major** — best at day one | **Day one** (the only superheavy without research) |
| Cutlass | Confederacy | Corvette | Small, with a full hold | Slowest Confederate small | Poor; *"no use at all in a line"* | *"Nearly twice the iron her size has any business with"*; one gun deck | **Boarding / assault** | **Major** — lands more than a frigate | Slight | Craft 1 |
| Reefwalker | Confederacy | Shoal-folk cutter | **Smallest in the game**; very shallow draught | **Fastest hull in the game** | *"Survives nothing"* | Lightest armed; one gun deck | Pure scout | Minimal | **Explicitly none** | Craft 1 |
| Marauder | Confederacy | Heavy frigate / raider | Medium; low, *"all of it forward"* | Fastest medium in the game | **Poor for a medium**; *"cannot take the answer"* | Heaviest Confederate medium battery, disposed forward; two gun decks | **Raider** — strike and withdraw | Minor | **Below baseline** | Craft 2 |
| Urskin Whaler | Confederacy | Converted whaler | Medium; ice-frames retained | **Slowest medium** | **Toughest medium in the game**; *"enormously hard to kill"* | Baseline battery plus a **harpoon battery over the bow**; two gun decks | Durable assault medium | **Major** — two companies | Heavy for a medium | Craft 2 |
| Buccaneer | Confederacy | Great cruiser | Large; bespoke upper works | Fast for a ship of the line | High, below the Crown's heaviest | **Second-heaviest battery in the game**; three gun decks | Apex capital; *"answer to a first-rate, and not a copy of one"* | Secondary | Substantial | Craft 3 |
| **Open Deck** | Confederacy | Grown coral three-decker | Three decks | — | — | — | **Legend — not sailed.** Hale's Moot power | — | — | N/A |
| **Swallowtail** | Confederacy | Grown coral sloop | Sloop | *"Fastest thing afloat"* | — | — | **Legend — not sailed.** Reyne's half-passage power | — | — | N/A |
| **Ironback** | Confederacy (Crown-built) | Dreadnought | Dreadnought | — | Imperial hull, gundecks and stern, permanently | — | **Legend — not sailed.** Jessup's fleet-command power | — | — | N/A |

---

# APPENDIX A — Existing numeric data

Included because the brief permits numbers that **already exist in the source**,
and withholding them would risk the next stage re-deriving figures that are
already settled. **Nothing here is invented.** A `·` marks a value the class
does not state and inherits from its size role in S2.

**`days` figures marked ⚠ are affected by Warning 3** — they are role defaults
that were not updated with the rest.

| Ship | Role | Craft | Gold | Days | Upkeep | Guns | Hull | Carries | Pace | Speed | Bombard |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Kestrel | small | — | 45· | 8·⚠ | 2· | 8· | 9· | 1· | 0.7· | 9· | 1· |
| Razorback | medium | — | 85· | 14·⚠ | 3· | 18 | 17 | 1· | 1· | 6· | 5· |
| Sovereign | large | — | 150· | 22·⚠ | 5· | 30· | 32· | 2· | 1.35· | 3· | 14· |
| Fluyt | transport | — | 55· | 10·⚠ | 2· | 0· | 14· | 3· | 1· | 5· | 0· |
| Bulwark | medium | 1 | 110 | 58 | 4 | 14 | 28 | 1· | 1.15 | 5 | 6 |
| Kestrel II | small | 1 | 65 | 30 | 2· | 11 | 13 | 1· | 0.62 | 10 | 1· |
| Vanguard | large | 2 | 165 | 79 | 5 | 28 | 26 | 2· | 1.05 | 5 | 10 |
| Razorback II | medium | 2 | 115 | 54 | 4 | 23 | 22 | 1· | 0.95 | 6· | 5· |
| Fluyt II | transport | 2 | 80 | 39 | 3 | 0· | 20 | 4 | 0.92 | 5· | 0· |
| Vanguard II | large | 3 | 200 | 94 | 6 | 35 | 31 | 2· | 1.0 | 6 | 12 |
| Sovereign II | large | 3 | 230 | 108 | 7 | 38 | 42 | 2· | 1.3 | 3· | 18 |
| Majestic | large | 3 | 300 | 137 | 9 | 46 | 55 | 3 | 1.6 | 2 | 24 |
| Swift | small | — | 45· | 8·⚠ | 2· | 7 | 8 | 1· | 0.6 | 11 | 1· |
| Tempest | medium | — | 85· | 14·⚠ | 3· | 16 | 19 | 1· | 1· | 6· | 5· |
| Brig | transport | — | 55· | 10·⚠ | 2· | 0· | 14· | 3· | 1· | 5· | 0· |
| Reef-class | large | — | 150 | 86 | 5· | 30 | 38 | 2· | 1.6 | 2 | 18 |
| Cutlass | small | 1 | 70 | 33 | 3 | 14 | 11 | 2 | 0.75 | 9· | 2 |
| Reefwalker | small | 1 | 50 | 24 | 1 | 5 | 7 | 1 | 0.55 | 12 | 0 |
| Marauder | medium | 2 | 105 | 48 | 4 | 22 | 16 | 1· | 0.85 | 8 | 4 |
| Urskin Whaler | medium | 2 | 120 | 58 | 4 | 18 | 30 | 2 | 1.2 | 4 | 9 |
| Buccaneer | large | 3 | 235 | 108 | 7 | 40 | 40 | 2 | 1.15 | 4 | 16 |

**Size role defaults** (S2), applied wherever a class states nothing:

| Role | Gold | Days | Upkeep | Guns | Hull | Carries | Pace | Speed | Bombard | Gun decks | Hull ease | Gunnery vs small |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| small | 45 | 8 | 2 | 8 | 9 | 1 | 0.7 | 9 | 1 | 1 | 0.8 | 1.0 |
| medium | 85 | 14 | 3 | 17 | 18 | 1 | 1.0 | 6 | 5 | 2 | 1.0 | 1.55 |
| large | 150 | 22 | 5 | 30 | 32 | 2 | 1.35 | 3 | 14 | 3 | 1.15 | 0.75 |
| transport | 55 | 10 | 2 | 0 | 14 | 3 | 1.0 | 5 | 0 | 1 | 1.1 | 1.0 |

---

# APPENDIX B — Designed but NOT implemented

From S5 §6. **Do not assign statistics to any of these.** They are recorded so
that a reader who encounters the names knows where they came from and that they
are not part of the game.

**Crown Imperium, unimplemented:** The Leviathan (a superweapon — a sea-beast's
carcass hulled over in iron, whose jaw *"the Maw"* drowns an island); Escort
Barque (carrier); Vengeance and Retribution (bomb-galleons with heavy mortars);
Harrier (chaser-frigate *"bristling with swivels... no long guns"*); Great
Galleon (transport); Courier cutter; Stillwater (carries a chained Tidecaller
who becalms a strait so enemy fleets cannot flee); Dominion (first-rate);
Colossus / *Sovereign's Wrath* (triple-hulled apex, Blackwater's flagship).

**Confederacy, unimplemented:** Converted Merchantman; Whaler troopship
(*"6 troops, unarmed. Urskin-built"* — distinct from the implemented Urskin
Whaler); Sawfish gun-schooner; Kraken-caller (wakes something under the reef to
hold an enemy fleet); Liberty (fast ship of the line); Razee; Undaunted; Bastion
(apex, *"Coral-grown over a leviathan rib"*).

**All small craft, both sides, unimplemented:** Wasp, Mortar Launch, Hornet,
Dragonfly; Sabre, Mule, Ray-riders, Hammer. S3 is explicit that the concept was
dropped: *"There are no fighters in these waters. A small craft is just a small
ship."*

Note also that S5's names for several implemented hulls differ from what
shipped — S5's "Ironback" is a buildable class rather than a legend, and the
Marauder, Razorback, Sovereign, Reef-class, Swift, Tempest, Brig, Fluyt and
Kestrel survived while the classes listed around them did not.

---

# APPENDIX C — Gaps the next stage should expect

Ranked by how much trouble they will cause when assigning numbers.

1. **Thirteen of twenty-one buildable hulls have no physical description at
   all.** Art briefs exist only for the eight day-one hulls. Every craft-gated
   hull — including the Majestic, the Crown's flagship class — has no
   established length, mast count, deck count, silhouette or appearance beyond
   what its one-sentence blurb implies.
2. **No hull in the game has an established length, tonnage or crew
   complement.** Not one.
3. **Deck counts exist for exactly two vessels:** the Sovereign (three) and the
   Open Deck (three). The abstract "gun decks" figure is a rules quantity by
   size, not a physical claim.
4. **Mast counts exist for exactly one vessel:** the Kestrel (single-masted).
   Sail configuration is otherwise unestablished except for the Swift's
   *"over-canvassed"*.
5. **Named weapons exist for exactly one buildable hull:** the Urskin Whaler's
   harpoon battery. Every other armament in the game is an abstract weight of
   fire.
6. **Long guns are defined and unused.** The flag exists, the retreat rule
   reads it, no hull sets it. This is deliberate and is an open design decision,
   not an oversight.
7. **Several ships' stated fiction has no mechanical expression:** the
   Reefwalker's draught, quietness and scouting; the Reef-class's living hull
   and per-ship variation; the Cutlass's boarding action; the Urskin Whaler's
   dismasting harpoons; the Buccaneer's bespoke variation. If any of these are
   meant to become rules, that is new design, not extraction.
8. **S5 conflicts with S1 on troop capacity** for the Sovereign (3 vs 2), Fluyt
   (2 vs 3), Brig (2 vs 3) and Reef-class (1 vs 2). **S1 governs.**
9. **The Confederacy has no transport above day one**, where the Crown has the
   Fluyt II. Deliberate or not, it is asymmetric and worth a decision.
10. **Warning 3's build-time inconsistency** affects seven hulls and will
    produce nonsense if encoded as-is.
