# Naval combat — the authoritative system, and what is left open

**Source of truth: *7 Seas — Naval Combat System*** (Google Doc, read from
Drive 18 September). The v2.4 fleet table and spreadsheet are **legacy
ship-design data and do not define combat mechanics**.

A day of earlier instructions is superseded, and this document keeps the record
of what was removed so nobody re-adds it by accident. Each removal has a test
in `navycombat.test.ts` that proves the absence.

## Built, from the authoritative doc

| § | Rule | Where |
|---|---|---|
| 1 | Three stats: Firepower, Hull, Speed | `CombatStats` |
| 2 | Long Guns are a **property**, not a fourth number | `hasLongGuns` |
| 3 | FIGHT resolves **one round**, then the player decides again | `fightRound`, `encounter.ts` phase `round` |
| 4 | 75% to hit; `damage = round(Firepower × random(0.85, 1.15))` | `standardGunnery` |
| 5 | RNG per attack, never one roll for the battle | every attack rolls separately |
| 6 | 70% best target / 30% random; prefer warships; spread fire | `standardTargeting` |
| 7 | Damage direct to Hull, and it persists after the battle | `damage`, hull on the instance |
| 8 | Fleet strength emerges from surviving Firepower and Hull | `fightingStrength` |
| 9 | **Flee always succeeds** — no roll, no further round | `resolveFlee` |
| 10 | Retreat exposure by Speed, 10 → 0 attacks, 1 → 3–4 | `RETREAT_EXPOSURE` |
| 11 | Retreat fire at 75%, Long Gun Firepower = 50% of normal | `LONG_GUN_SHARE` |
| 16 | Five assessment bands, no number shown | `standardAssessment` |

## Removed, and proven gone

Armor · the size-class weapon triangle · Heavy vs Light interaction · First
Strike · ship-to-ship boarding · automatic run to annihilation · retreat
probability.

§17 lists these among the mechanics not to add: *"Armor stat, Range stat,
Accuracy stat, Reload stat, Formation mechanics, Individual weapon targeting,
Tactical movement, Boarding combat, Retreat probability, Fleet control score,
Engagement score, Morale system."*

Armor, Heavy Guns, Light Guns, Bombardment and Troop Capacity remain in the
**roster data** — they are ship-design and strategic-layer values. Nothing in
`navycombat.ts` reads any of them.

---

## Open

### 1. The roster is not converted — the blocking item

The combat engine needs `Firepower`, `Hull`, `Speed 1–10`, `hasLongGuns`. The
v2.4 roster has three gun columns, a Hull, a Speed *category* and an Armor
figure. **Firepower is explicitly not the three gun columns added up**, and
Speed 1–10 is not the five categories.

Nothing in the repo derives one from the other, on purpose: `CombatStats` is a
separate shape from `ShipDefinition` so the conversion has to be real design
work rather than something an adapter could quietly fake. The Fleet Roster
sheet in Drive (read 18 September) is still the legacy columns plus an art-card
layout; no Firepower column exists yet.

**This is the next fleet-design task and everything downstream waits on it.**

### 2. Assessment thresholds — inferred

§16 gives five bands and says they come from *"relative surviving combat
strength"*. It does not give the cut points. `ASSESSMENT_CUTS` compares the
product of surviving Firepower and surviving Hull at 2.0 / 1.25 / 0.8 / 0.4,
and is labelled an inference. One constant, one place.

**Also: the doc contradicts itself here.** §15's worked example prints
*"Assessment: Dangerous"*, and "Dangerous" is not one of §16's five bands
(OVERWHELMINGLY FAVORABLE / FAVORABLE / EVEN / UNFAVORABLE / DESPERATE). The
five-band list is implemented; the stray word is not.

### 3. Target priority — the formula is inferred

§6 says priority *"should consider Firepower, Remaining Hull, and Ship
importance/value"* and gives no arithmetic. `threatOf` is threat removed per
point of damage spent removing it, which is the shape the live game already
uses. Ship importance/value has no input yet, because nothing in the data
expresses it.

### 4. Enemy retreat, beyond DESPERATE

Ruled: the enemy evaluates at the same point as the player and flees only on
`DESPERATE`. Mission-specific fight-to-the-death behaviour is explicitly out of
the base engine. Nothing else is open here — recorded so the simplicity is
visible as a decision rather than an omission.

### 5. How this meets the live game

`navycombat.ts` is not imported by `advanceDay`, `fleets.ts` or any UI file,
and `shipdefs.ts`/`navy.ts` are still off the `src/sim/index.ts` barrel. The
live 24-hull roster and its combat are untouched. When the converted roster
exists, the open question is what happens to saved games, which store `classId`
strings from the live roster.
