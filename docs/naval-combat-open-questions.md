# Naval combat — the authoritative system, and what is left open

**Source of truth for the fighting: *7 Seas — Naval Combat System*** (Google
Doc, read from Drive 18 September).

**Source of truth for the ships: *Master of the Seven Seas — Fleet Roster***
(Google Sheet, read from Drive 18 September, revision 07:13). Sean rewrote the
fleet himself after the v2.4 exports landed, so v2.4 is superseded outright —
not merely demoted. The sheet says so in its own words: *"Combat-resolution
rules remain defined in the separate Naval Combat System document."*

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
roster has three gun columns, a Hull, a Speed *category* and an Armor figure.
**Firepower is explicitly not the three gun columns added up**, and Speed 1–10
is not the five categories.

Nothing in the repo derives one from the other, on purpose: `CombatStats` is a
separate shape from `ShipDefinition` so the conversion has to be real design
work rather than something an adapter could quietly fake.

Sean's revision of the sheet on 18 September rebuilt the fleet — twenty-four
hulls, a symmetric ladder, four new ships — but **did not add a Firepower
column or a 1–10 Speed**. So the blocking item is exactly where it was, and
now against a roster worth converting.

**This is the next fleet-design task and everything downstream waits on it.**

### 1a. What the revision changed, for whoever does the conversion

| | Before (v2.4) | Now |
|---|---|---|
| Hulls | 25 | 24 |
| Ladders | Crown S01–S04 + R1–R9; Confederacy S01–S04 + R1, R5–R11 | four starts and R1–R8 a side, no gaps |
| Crown | — | Dreadnought → **Morningstar**; **Justiciar** new at R6; Long-Gun Line Ship and Wayfinder II cut |
| Confederacy | — | **Chimera** and **Tidestalker** new as starts; Freebooter and Swallowtail/Bonecutter cut; Cutlass demoted to R2; Reefwalker → **Reefwarden**; Reef-Class → **Coral-Class Dreadnaught** |
| Endgame | Majestic heaviest at everything | split three ways: Majestic the heaviest guns, Urskin Whaler the largest hull in the game (1,800), Coral-Class the heaviest armor (110) |

Two rules in the sheet now agree with the combat doc rather than contradicting
it, which is worth knowing because the v2.4 table did not: *"Long Guns do not
grant First Strike in normal combat"*, and bombardment *"never contributes to
ship-to-ship damage"*.

### 1b. Ironback — settled, the other way round

The R5 Confederate siege ship is called **Ironback**, and so was Admiral Dorian
Jessup's legend hull. Sean settled it on 18 September by **renaming the legend**:
Jessup's dreadnought is the ***Adamant*** now, throughout the live game, the art
and the lore. The roster ship keeps Ironback, as his sheet has it, and nothing
in the data was touched to make that work.

So the name is used once again, and the **Swallowtail** collision resolved
itself the same day — that v2.4 ship was cut, so the name is Reyne's alone.

Two places still say Ironback on purpose, and neither is a ship: the world
bible's S5 dreadnought *class* rows, and the Ghost Fleet's *"2–3 old
Ironbacks"* in `lore.md`. Both mean a type of hull rather than a named one,
which the Fleet Roster now makes true rather than false.

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
