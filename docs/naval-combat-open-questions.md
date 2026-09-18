# Naval combat v2.4 — unresolved mechanics

The data model, loader, validation and runtime state are built. **No damage
resolution is**, because the formulas do not exist yet and Sean's instruction
is explicit: *"Do not invent missing combat formulas... If a required mechanic
is undefined, create a clean interface or placeholder and document the
unresolved design question."*

This is that document. Each entry says what the design export establishes, what
it does not, and what the code does in the meantime.

---

## 1. Armor — the biggest gap

**Established:** every ship has an Armor figure from 0 to 95, banded T0–T4
(0 / 1–29 / 30–49 / 50–74 / 75+). The Bulwark is *"Armor-focused defensive
ship"*; the Reef-Class has *"living coral armor"*.

**Undefined:** what armor *does*. Every reading gives a different game:

- a flat reduction per hit (armor 95 makes light guns useless)
- a percentage reduction (armor 95 = 95% off, or 95/200, or something else)
- a threshold below which a gun does nothing at all
- different treatment per gun type — plausible, since the roster gives
  Interceptor II armor 65 with zero heavy guns, which reads like a ship meant
  to shrug off light fire

**Placeholder:** `ShipDefinition.armor` is loaded and validated. Nothing reads
it.

**The question:** what does a point of armor do, and is it the same against all
three kinds of gun?

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

## 3. First Strike

**Established:** the phrase, in one design rule, attached to Long Guns.

**Undefined:** what it is. Candidates: a free round before the exchange; a
round at a range the other side cannot answer; initiative ordering within a
round; a to-hit advantage.

This matters more than it looks. The current game resolves a round
**simultaneously** — every hull fires against the state at the start of the
round, so a ship that sinks still gets her shot off. First Strike is the first
thing in this design that would break that, and whether it does is a real
design decision rather than an implementation detail.

**Placeholder:** none. Nothing named First Strike exists in the code.

**The question:** what does First Strike do, and does it break simultaneous
resolution?

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

## 6. Ship Status thresholds

**Established:** five states — Healthy, Damaged, Heavily Damaged, Critically
Damaged, Destroyed — listed as a tier band T4 down to T0.

**Undefined:** the boundaries, and whether a status does anything mechanical.

**Placeholder — and the one assumption in the whole implementation:**
`HULL_STATUS_THRESHOLDS` in `navy.ts` puts them at even quarters (75% / 50% /
25%). This is a guess, it is labelled as one, and every function takes the
thresholds as an argument so nothing can come to depend on the particular
numbers. A test asserts that a different set of thresholds changes the answer.

**The questions:** where do the four boundaries fall? And does a damaged ship
fight worse, sail slower, or is the status a label for the player?

---

## 7. Boarding

**Established:** Troop Capacity, 0–14. The Freebooter is a *"boarding / troop
carrier"* with **no guns at all** and 6 troops — a ship that can only be for
boarding.

**Undefined:** any boarding rule whatsoever. The live game has none either:
troop capacity is used for landing companies on islands, and a ship is never
taken by boarders.

**Placeholder:** `NavyShip.troops`, `spareCapacity`, `liftCapacity`.

**The question:** is boarding a ship-to-ship action in v2.4, or is Troop
Capacity still only about putting companies ashore? If it is an action: what
decides it, and does the loser's hull change hands?

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
