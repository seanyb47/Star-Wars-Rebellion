# Naval combat v2.4 — rulings and remaining gaps

Sean ruled on five of these on 18 September. **What he settled is built**;
what is still open is below, unchanged in kind: named, placeheld, never
guessed at.

## Settled, and implemented

| Ruling | Where it lives |
|---|---|
| **Armor** is an ablative pool, damage to armor first then hull, one point absorbs one point, identical against all three gun kinds, no regeneration in combat | `applyDamage` in `navy.ts` — note it takes no gun kind at all, which is how the rule is enforced rather than remembered |
| **Repair** restores hull first, armor afterward | `repairDay` in `navy.ts` |
| **Status bands** 76–100 / 51–75 / 26–50 / 1–25 / 0, armor loss does not affect status, status is descriptive only | `HULL_STATUS_THRESHOLDS` and `statusOf` in `navy.ts`. Nothing reads a status to decide anything, deliberately |
| **First Strike**: Long Guns fire first and land immediately; a ship sunk there does not fire in the exchange; survivors fire Heavy and Light simultaneously against the post-First-Strike state; Long Guns do not fire twice | `resolveRound` in `navycombat.ts` |
| **Boarding** replaces the gun attack, targets only a live ship, resolves committed troops against defending troops, a win captures rather than destroys, a loss spends the committed companies | `resolveBoarding` in `navycombat.ts`, mirroring `resolveLanding`'s arithmetic |

Two notes on the implementation of those rulings.

**The status placeholder turned out to be right.** It had been even quarters,
labelled a guess; the ruling puts the bands at 76–100 / 51–75 / 26–50 / 1–25,
which is the same four boundaries. It is now documented as ruled rather than
assumed.

**Boarding duplicates `resolveLanding` rather than sharing with it.** The
ruling asks to reuse the land-troop rules, and the arithmetic is reused
exactly — larger force wins, a tie goes to a roll, both sides spend the smaller
number. It is written out a second time because extracting a shared helper
would mean editing live, tested combat code for the benefit of a system that
is not wired in. **When the two converge these should become one function**,
and the duplicate says so in a comment. The one thing not carried over is the
officer's Combat edge a landing gets: it reads a live `GameState` this system
does not have.

---

## The blocking gap the rulings created

### The triangle needs a size class, and the data has none

Sean's ruling: *"Use the project's existing ship-size classifications for the
triangle rather than inferring size from Hull during combat."* Right call —
and the v2.4 export has **no size column**. It has a free-text Role
(*"Fast scout / interceptor"*) and a Speed category, and nothing else that
could serve.

So `sizeOf()` in `navycombat.ts` reads an optional `sizeClass` field that no
ship currently has, and returns undefined for all 25. **Nothing guesses**, on
purpose: a made-up size class would silently decide every gunnery matchup in
the game.

The fix is one column in `combat-ships.json`. Here is a proposed assignment for
review — hull banding (≤200 small, 201–500 medium, 501+ large) with troop and
logistics hulls pulled out as transports. **It is a proposal in a document, not
a decision in the code.**

| Ship | Navy | Hull | Armor | Guns | Troops | Speed | Proposed |
|---|---|---|---|---|---|---|---|
| Wayfinder | Crown | 300 | 0 | 2 | 4 | Normal | transport |
| Interceptor I | Crown | 90 | 0 | 4 | 0 | Very Fast | small |
| Dreadnought | Crown | 650 | 40 | 6 | 0 | Slow | large |
| Sovereign | Crown | 900 | 65 | 12 | 6 | Slow | large |
| Vanguard | Crown | 150 | 20 | 10 | 0 | Normal | small |
| Resolute | Crown | 375 | 35 | 13 | 1 | Fast | medium |
| Long-Gun Line Ship | Crown | 450 | 40 | 15 | 0 | Normal | medium |
| Bulwark | Crown | 725 | 75 | 8 | 2 | Slow | large |
| Interceptor II | Crown | 90 | 65 | 17 | 0 | Very Fast | small |
| Wayfinder II | Crown | 300 | 20 | 5 | 6 | Normal | transport |
| Vanguard II | Crown | 500 | 55 | 19 | 0 | Normal | medium |
| Sovereign II | Crown | 1200 | 90 | 27 | 9 | Slow | large |
| Majestic | Crown | 1600 | 95 | 36 | 12 | Slow | large |
| Swift | Free | 70 | 0 | 0 | 0 | Very Fast | small |
| Brigantine | Free | 250 | 5 | 2 | 2 | Normal | transport |
| Freebooter | Free | 140 | 30 | 0 | 6 | Slow | transport |
| Cutlass | Free | 120 | 10 | 7 | 0 | Normal | small |
| Marauder | Free | 140 | 0 | 7 | 2 | Fast | small |
| Bonecutter | Free | 165 | 5 | 10 | 0 | Fast | small |
| Tempest | Free | 175 | 10 | 8 | 0 | Very Fast | small |
| Reefwalker | Free | 500 | 55 | 10 | 4 | Normal | medium |
| Frostback | Free | 800 | 70 | 14 | 8 | Slow | large |
| Reef-Class | Free | 900 | 90 | 19 | 4 | Normal | large |
| Urskin Whaler | Free | 1400 | 65 | 22 | 14 | Slow | large |
| Blackfin | Free | 250 | 20 | 7 | 10 | Fast | medium |

Four of these I am least sure of, and would not assign without a word:

- **Vanguard** (Crown R1) — 150 hull puts her with the sloops, but she is the
  *"general-purpose gunship"* and carries ten guns. Small or medium?
- **Freebooter** — called a transport here because she has no guns and six
  troops, but she is *"boarding / troop carrier"* and boarding wants her to
  survive closing with something. Transport makes her the easiest thing in the
  game to hit.
- **Interceptor II** — 90 hull and 65 armor. Small by hull, but more armored
  than a Dreadnought; the triangle would have heavy guns struggle to catch her
  *and* armor absorb what did.
- **Blackfin** — ten troops and fast, which reads transport, but 250 hull and
  seven guns put her with the mediums.

### A second, smaller conflict in the same ruling

Sean noted it himself: the art guide calls the Freebooter a *"heavy independent
combat"* cruiser and v2.4 makes her a slow, gunless boarding vessel, **and
ruled that v2.4 takes precedence for gameplay.** Recorded here because the art
brief and the roster now describe different ships, and whoever commissions art
for her should be told.

---

## Still unresolved


## 1. Armor — **RULED 18 September**, see the table above.


---

## 2. The three gun types

**Established:** *"The weapon system contains only Long Guns, Heavy Guns, and
Light Guns."* Each is a count, banded separately. Long Guns are *"a midgame
technology milestone; First Strike and pursuit role."*

**Undefined:** everything else. Heavy and Light have no stated difference at
all beyond their bands being scaled differently (Heavy T4 is 9+, Light T4 is
10+). The obvious reading — heavy hits big ships, light hits small ones — is
the live game's existing triangle and **is not stated anywhere in v2.4.**

**Placeholder:** `ShipArmament` keeps the three apart and sums nothing.

**The questions:** what does each gun type do, and to what? Does a gun count
mean shots, weight of fire, or both? Is there a targeting preference by hull
size, as the current game has?

---

## 3. First Strike — **RULED 18 September**, see the table above.


---

## 4. Pursuit

**Established:** Long Guns have a *"pursuit role."*

**Undefined:** whether pursuit prevents a withdrawal, punishes one, catches a
fleeing ship, or is about strategic chase on the map rather than tactical.

The live game already has a retreat rule with a `longGuns` boolean — a hull
with them fires at half weight into a fleet that is already running — and **no
hull sets the flag**, deliberately. v2.4 turns Long Guns into a count, which
suggests the old boolean rule is superseded rather than extended.

**Placeholder:** none.

**The question:** does v2.4's pursuit replace the existing retreat-fire rule,
or sit beside it?

---

## 5. Speed categories

**Established:** five categories — None, Slow, Normal, Fast, Very Fast.

**Undefined:** what they map to. The live game has two separate quantities
here, and the distinction was deliberate: `pace` (how long a crossing takes)
and `speed` (how fast a ship is out of gun range). One five-value category
cannot be both unless one is derived from the other.

**Placeholder:** `SpeedCategory` is a validated enum with no numeric meaning.

**The questions:** does a speed category set travel time, escape chance,
initiative, or several of these? What is "None" — a hull that cannot move
under its own sail? No ship in the roster has it.

---

## 6. Ship Status thresholds — **RULED 18 September**, see the table above.


---

## 7. Boarding — **RULED 18 September**, see the table above.


---

## 8. Combat sequence

**Established:** nothing.

**Undefined:** how many rounds a battle runs, what ends one, what ends a
battle, whether either side may break off and when, and what a victory is.

**Placeholder:** the `CombatResolver` interface in `navy.ts`, which takes two
squadrons and a seed and returns a result. It has no implementation. The seed
is in the signature because Sean asked for *"deterministic combat logic that
can be unit-tested and later seeded for simulations"* — `lab/duel.ts` needs to
replay a war exactly.

**The questions:** what is the sequence of a battle, and what ends it?

---

## 9. Repair conditions

**Established:** a per-ship Repair Rate, 1%–4% a day.

**Undefined:** when it applies. The live game repairs only in a friendly
harbour, at double rate with a shipyard, never at sea, and never a wreck.

**Placeholder:** `repairDay(ship, roster, canRepair)` takes the condition as an
argument and defaults to allowing it.

**The question:** do the live game's repair conditions carry over?

---

## 10. How the two rosters meet

Not a combat formula, but the largest open question of all. v2.4 is a
**replacement roster**: 9 current hulls disappear, 10 are new, and 15 keep a
name while becoming a different ship. Hull figures move from 7–55 to 70–1,600;
gold from 45–300 to 25–2,500.

Sean's ruling of 18 September was to build this **in parallel** and change
nothing live until the formulas exist and measure well. So:

- `src/data/combat-ships.json` is the v2.4 roster. `src/data/ships.json` is the
  live one. Neither knows about the other.
- `src/sim/shipdefs.ts` and `src/sim/navy.ts` are **not exported from
  `src/sim/index.ts`**, on purpose: the barrel is imported by every UI file,
  and `ROSTER` validates at module load, so barrel-exporting it would make the
  whole app validate the roster on boot. Import them by path.
- Nothing in `advanceDay`, `fleets.ts` or the UI references either new file.

**The question to answer before any of this ships:** once the combat model
exists and measures well, does the v2.4 roster replace the live one wholesale
— and what happens to saved games, which store `classId` strings that would no
longer resolve?

---

## 11. The attack and the flee sequences — MISSING

Sean's combat order of 18 September ends with two pointers: *"attack sequence:
in docs"* and *"flee sequence: in docs"*. **Neither document is in the
repository.** Searched: `docs/`, every markdown file at the root, the v2.4
JSON and the v2.4 spreadsheet (which carry tier bands, the 25 ships, ten
design rules and a session-changes list, and nothing else), and the upload
directory, which has had nothing new since the two v2.4 files.

Until they arrive nothing decides a battle. `src/sim/encounter.ts` is the
flow around them — which screen is up, what may be pressed, what the player is
shown — and it takes the resolution as a function handed in.

## 12. Four endings or three verdicts?

Sean's order names four endings: **Victory!** (*"you destroyed everything they
had"*), **Defeat** (*"you lost everything"*), **You have fled the battle**,
**Your enemy has fled the battle!**

The game already has a three-verdict outcome model, built to his own
specification on 17 September, and the two do not line up:

| | 17 September model | 18 September order |
|---|---|---|
| Enemy driven off the water | **victory** | *they-fled* — a separate ending |
| Neither side destroyed or driven off | **draw** — *"no decisive control established"* | no equivalent |
| Everything of theirs sunk | victory | **victory**, and only this |
| You broke off | **draw** | *you-fled* |

Two real questions in that table. **Does the draw survive?** It exists because
of his own ruling that *"LOSS and DRAW must have their own presentation logic"*
and that a draw must not carry a defeat's consequences. And **does victory now
require annihilation?** If it does, most battles end in somebody fleeing, and
the political consequences attached to a decisive action (`SHOCK_BATTLE_FLOOR`
and the rest) need rethinking.

## 13. When may a player break off?

The order puts **Flee** on the opening hail, before a shot: the player looks at
both fleets and decides. The current game puts it after the first exchange, on
purpose — *"Breaking off is a decision taken after you have seen what the other
fellow's broadside does, not before."*

The new flow is the stronger one for a player who can scout, and it changes
what scouting is worth. Worth confirming it is deliberate, because it reverses
a rule that was argued for explicitly.

## 14. Fog of war on an enemy's people

*"Enemy crew on ships are behind fog of war, unless you knew already."*
Implemented as a `scouted` flag: hulls always visible, who is aboard them only
when known. What is **not** settled is what "knew already" means — an espionage
report on the island they sailed from, a report on the fleet itself, a
freshness window? The existing espionage layer reports on islands, not on
fleets at sea, so there is nothing to read yet.

---

## Data observations, reported and not corrected

Per Sean's instruction to report suspected errors rather than fix them.

1. **The Free Confederacy has no R2, R3 or R4.** Crown runs R1–R9 unbroken;
   the Confederacy is R1 then R5–R11. If the numbering is a shared timeline
   across both navies this is meaningful; if each navy has its own ladder, the
   gap means the Confederacy's second unlock is called R5.
2. **Long Guns arrive before the Long Gun milestone.** The Resolute (Crown R2)
   carries 2 Long Guns; the *"Long-Gun Line Ship"* milestone is R3. The
   Confederacy does not get them until R7.
3. **The Sovereign is a starting ship with a top-tier stat** — Hull 900 is T4,
   alongside T3 in five others. It does not trip the "multiple top-tier"
   warning, and its own design note says it was already reduced.
4. **Two ships were renamed on import**, recorded in `_localChanges` in the
   data file: the v2.4 Confederacy R5 gunboat *Swallowtail* → **Bonecutter**,
   and the R8 heavy warship *Ironback* → **Frostback**. Both names belong to
   Pirate Lords' legend hulls in this game and are named in character powers.
   The new names are provisional — one field each, read by nothing.
5. **The JSON and the spreadsheet agree exactly**: 25 ships × 19 fields, 13
   tier bands, 10 design rules, zero differences.
