# Naval combat — the locked system

**Source of truth: the Combat Rules, Combat Derived Stats and Ratings &
Pricing tabs of *Master of the Seven Seas — Fleet Roster*** (Google Sheet,
read from Drive 18 September, revision 21:48). Sean marks the combat
specification **LOCKED**.

It supersedes the *7 Seas — Naval Combat System* Google Doc of the same
morning, which in turn superseded the v2.4 export of the morning before. Three
specifications in one day; this is the one that stands, and the two reversals
it makes are deliberate rather than a drift back.

---

## The sentence the model hangs on

> *"There is no ship-level Firepower stat. Every individual cannon makes its
> own attack using the rules for its gun type."*

**This dissolves the blocking item rather than answering it.** Every version of
this document since the morning of 18 September opened by saying that nothing
downstream could move until the roster was converted to `Firepower`, `Hull`,
`Speed 1–10` and `hasLongGuns`, and that Firepower was explicitly *not* the
three gun columns added up.

There was never a Firepower number to derive. Speed stays a category, the three
gun columns **are** the combat inputs, and `ShipDefinition` satisfies
`CombatStats` structurally — so the roster feeds the guns with no conversion,
no adapter and no design work outstanding. The conversion is cancelled, not
completed.

## What is built

| § | Rule | Where |
|---|---|---|
| 1 | One attack per individual cannon; ten guns are ten attacks | `assignTargets`, `internalRound` |
| 1 | d100 a cannon, hits at or below the final chance | `fireCannon` |
| 1 | Light 2d20 / 0% pen / +10 acc · Heavy 4d20 / 50% / ±0 · Long 2d20 / 50% / ±0 | `GUNS` |
| 1 | `effective = ceil(armor × (1 − pen))`, `damage = max(0, rolled − effective)` | `effectiveArmor`, `fireCannon` |
| 2 | Phase 1 Long Guns resolve first; what they sink never fires | `internalRound` |
| 2 | Phase 2 Light and Heavy as one simultaneous solution | `internalRound` |
| 2 | A Combat Exchange runs internal rounds until a side loses 30% of its snapshot | `combatExchange`, `EXCHANGE_STOP_SHARE` |
| 2 | No repair inside combat; damage persists after it | nothing repairs in `navycombat.ts` |
| 2 | Mutual destruction recorded as its own result | `ExchangeReport.outcome` |
| 3 | `CLAMP(75 + gun base + gun-vs-Size + gun-vs-Speed, 10, 95)` | `hitChance` |
| 3 | Size is a manual property: Small / Medium / Large / Gigantic | `SHIP_SIZES`, roster `Size` column |
| 4 | Priority = target threat ÷ expected shots to kill, with overkill control | `assignTargets` |
| 4 | Unarmed transports considered only after armed targets | `assignTargets` |
| 4 | Ties broken randomly | `assignTargets` |
| 5 | Flee never fails; only surviving Long Guns get a parting volley | `resolveFlee` |
| 6 | 5,000 trials a matchup, every ship against every ship | `lab/navyduel.ts` |

## The two reversals

Both were removed on the morning of 18 September and both are back, because
this specification is newer and is marked locked.

**Armor.** Gone from the morning model — *"damage goes straight to Hull"* —
and now the thing the whole gun triangle is about. It is also **rescaled**,
from 0–110 to **0–30**, with four gameplay classes (None / Light / Medium /
Heavy) and two pricing sub-bands inside Heavy (Heavy+ 26–29, Maximum 30). The
Majestic is the only Maximum 30 hull in the game.

**First Strike.** Removed as a flag in the morning; back as the *shape of the
round*. Long Guns are Phase 1 and a hull they sink is removed before Phase 2,
so it never fires its Light and Heavy guns at all. That is a much stronger
version of first strike than the flag ever was, and it is most of why Long Guns
are a midgame milestone.

## Still gone, and not by omission

Boarding · morale · formation · tactical movement · retreat probability ·
fleet control score · engagement score · a ship-level Firepower stat · a
size-class **damage** triangle.

That last one is worth stating precisely, because the locked rules do have a
size matrix and it is easy to mistake for the triangle that was cut. **Size and
Speed change accuracy only.** A Heavy Gun firing at a sloop is not doing
reduced damage; it is missing — 10% to hit against Small and Very Fast, against
95% at a Slow Gigantic. The dice are the same dice whatever it is pointed at,
and a test holds that.

---

## Measured

`npx vite-node lab/navyduel.ts 5000 1` — every hull against every hull, one
against one, fought to annihilation. `--matrix` prints the full 24×24 grid.

### The endgame rule holds exactly

The sheet states the target outright:

> *"One of either Confederate capital loses to Majestic, while two of either —
> or one of each — should defeat it reliably."*

| Confederacy fielding | Beats a Majestic |
|---|---|
| 1 Urskin Goliath | **0%** |
| 1 Coral-Class | **0%** |
| 2 Urskin Goliaths | **100%** |
| 2 Coral-Class | **~99%** |
| 1 of each | **100%** |

**The Gigantic hull in that table was called the Urskin Whaler until 19
September.** Sean renamed her the **Urskin Goliath** and is putting a genuine
Urskin Whaler — a far smaller working hull — into the sheet in her place. Her
Ship ID moved with her, `CFS-URW-R7-01` → `CFS-URG-R7-01`, so that URW is free
for the whaler; that part was decided here rather than read off the sheet, and
the sheet overrules it on the next import. Nothing else about her changed, so
every figure below is the same hull under a new name.

Nothing was tuned to make that true. It falls out of the roster's own numbers
against the locked rules, which is the strongest evidence available that both
the roster and my reading of the rules are right.

### The accuracy model is his, not my reading of it

The sheet publishes a **Combat Derived Stats** table — every hull's Light,
Long and Heavy hit chances and average volleys, worked out by Sean. Sixteen of
those hulls are asserted in `navycombat.test.ts` against the engine, including
both clamps (Interceptor I floors a Heavy Gun at 10%, the Majestic ceilings one
at 95%), and the average raw volleys besides. If my reading of either matrix
were wrong, one of them would miss.

---

## Open

### 1. The duration target is not met — the one thing off

> *"Evenly matched battles should usually resolve in 1–3 player-visible Combat
> Exchanges."*

They do not, quite. See the run in `PLAN.md` for the figures. The cause is
structural rather than a bug: the 30% stop is proportional, so two hulls that
are hard to sink trade many short Exchanges instead of a few decisive ones, and
the pairings that are *most* evenly matched are exactly the armored ones where
each cannon gets least through.

Two dials could move it and **both are Sean's**, because the rules are locked:
raise the stop share above 30%, or leave it and accept that a close fight
between two capitals is a long conversation. Nothing has been changed to chase
the target.

### 2. Assessment thresholds — still inferred

The sheet says an Exchange ends by displaying *"the new battle assessment"* and
never says what the bands are. Five bands come from the superseded document,
which named them and likewise gave no cut points. `ASSESSMENT_CUTS` compares
the product of each side's surviving volley and surviving hull at 2.0 / 1.25 /
0.8 / 0.4 and is labelled an inference. One constant, one place.

### 3. Overkill fallback — one inference in the targeting

The rule says to stop assigning to a target once an expected kill is covered,
*"then recalculate"*. It does not say what happens when **every** target is
covered and there are still cannons to point. They fire anyway, at the covered
targets, because the alternative is guns that do not shoot. Marked in the code.

### 4. Special damage — explicitly out

> *"Special infrastructure or component damage has not yet been defined in the
> roster and is excluded from the initial simulator."*

Recorded so the absence reads as a decision.

### 5. How this meets the live game

It still does not. `navycombat.ts` is imported by no UI file and by nothing in
`advanceDay`; `shipdefs.ts` and `navy.ts` are still off the `src/sim/index.ts`
barrel. The live 24-hull roster in `src/data/ships.json` and its own combat in
`fleets.ts` are untouched and are a different fleet with different numbers.

Wiring the two together is a real piece of work and has not been asked for. It
would mean: the live roster adopting Size and the 0–30 armor scale, saved games
carrying `classId` strings that no longer resolve, and the battle sheet
learning to show an Exchange rather than a broadside. Worth doing deliberately,
not as a side effect.
