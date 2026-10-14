# Missions, detection and running a blockade

Sean, 21 September, thinking aloud about what a siege is a *choice* between:

> Since each ship basically only gets five bombardments before it has to go
> back to a friendly shore, the question then is, do you maintain your blockade
> or do you bounce, go reset, and then come back — which gives the other side a
> chance to do other stuff. We haven't really gotten too much into mission
> stuff yet, like espionage or trying to move units across a blockade.

That last clause is the whole of this document. The bombardment magazine only
becomes a decision if leaving costs you something, and today it costs nothing,
because a blockade does not stop anything moving.

---

## 1. Detection — mostly built already

His sketch, in his words:

> Espionage missions is obviously against detection, right? So there's
> probably a base detection score. If they don't have any troops or any
> personnel on the island, then you're probably just going to be successful —
> maybe there's a minor threshold. Now, if there's troops on the island, those
> have detection. And if there are units on the island, then their espionage
> score should matter when it comes to detecting people. And then also the
> leadership of someone that you've put under command should affect the
> detection score.

Every one of those is in the game, in `watchOn` (`missions.ts`) and the
constants behind it. Written out against his list:

| What he asked for | Where it is | Today's number |
|---|---|---|
| Troops have detection | `garrisonRoster(system)` summed on `detection` | 10–40 per company, by type |
| A person's *espionage* feeds detection | `watchOf` | `espionage × 0.5` |
| …and their bearing | `watchOf` | `max(combat, leadership) × 0.25` |
| A commander under orders raises it | `watchOn` | `leadership × 0.9` |
| An empty island is nearly a free pass | `foilChance` floor | 3% |
| The island's own loyalty watches too | `watchOn` | up to 60, by how it feels about its holder |

And the roll is already two-stage, which is the part worth keeping: Espionage
gets you through the door (`foilChance` — the watch against your agent's
Espionage at 1.6 per point), and then the errand's own rating decides whether
you did the job (`successChance`). Getting in and doing it are different
questions, and a 90/20 is a fine spy and a poor saboteur.

**The one place his instinct and the code disagree** is the floor. He guessed
that an undefended island should still be somewhere around a 40–60% shot;
today it is 97%, because `FOIL_FLOOR` is 3%. That is a one-line dial and it is
his call which is right. The argument for 3% as it stands: an island with
nobody on it has literally nobody to notice you, and the interesting risk is
supposed to come from *what is standing there*, not from a die that goes
against you for no reason the player can see.

Only the crew who are **standing about** count. Somebody away on a mission is
not watching the quay — which is his rule and is also the good half of it: an
island whose officers are all out working is an island with its guard down.

## 2. What is missing — a blockade that blockades

Today `system.blockaded` does three things and all three are economic: the
island earns nothing, its shipyard stops working, and (since 21 September) a
squadron cannot refill its magazine there.

It stops **nothing from moving**. Fleets sail in and out freely, troops go
ashore freely, crew land and leave freely. So:

- The five-shot magazine is not a decision. Sailing home to resupply costs the
  attacker a few days and costs the defender nothing, because the defender
  could already do everything they wanted to do.
- A blockade is a tax rather than a siege. It is worth laying for the income
  it denies and for nothing else.

**What would make the magazine bite**, and what this document exists to
specify later:

1. **Running the blockade.** Moving a fleet *into* or *out of* a blockaded
   island should be a roll, not a given — and the natural shape is the one
   already in `retreat`: only guns that reach touch a hull under way, so a
   blockade of long-gunned ships is a real wall and a blockade of brigs is a
   formality.
2. **Reinforcement is the prize.** The thing the defender wants to do while
   the besieging fleet is away is land more troops and get a negotiator onto
   the island. That is the "chance to do other stuff" he is describing, and it
   is what turns "bounce and come back" into a gamble rather than a chore.
3. **Covert work across a blockade.** A boat carrying one person is not a
   squadron; a blockade should make a covert landing harder rather than
   impossible, probably as a modifier on `foilChance` rather than a new roll.

## 3. Open, and Sean's to settle

- The `FOIL_FLOOR` question above: 3% or something nearer half.
- Whether running a blockade is one roll for the fleet or a volley per hull.
- Whether a blockade should stop a *mission* landing at all, or only a fleet.
- Whether the defender's own squadron sitting in the harbor counts as having
  broken the blockade, or whether the blockade is about the water rather than
  about who is in it.

---

# The covert system, as Sean specified it on 22 September

His definition, and it is the useful one: **a covert op is any mission with an
espionage check in it.** That is Espionage, Incite, Sabotage, Abduct and
Rescue. Everything below follows from that one sentence.

## 1. Two rolls, never one

Every covert op is *two* rolls, and they answer different questions.

| | What it asks | What it decides |
|---|---|---|
| **Roll 1 — espionage** | Were we seen? | Whether the job happens at all, **and the only thing that can get anybody captured** |
| **Roll 2 — the job** | Did it work? | The outcome, on a stat that suits the mission |

Roll 2 never captures anybody. Sean is explicit: a landing party that fails its
combat roll walks home; only being *detected* takes an officer off the board.

The second roll's stat is per mission:

| Mission | Roll 2 | Against |
|---|---|---|
| Espionage | — (the espionage roll *is* the job) | |
| Incite | **Leadership** | the island — inverse parley, nudges loyalty their way |
| Abduct / Rescue | **Combat** | the island's defences (troops, walls) |
| Sabotage | TBD | the target's own rating — see §4 |

Incite taking *leadership* rather than parley is deliberate and surprising:
> "You'd think it was parlay, but it's actually leadership."

## 2. Four bands on the espionage roll

| Band | What happens |
|---|---|
| **Critical success** | Full intel on the target **and** on another enemy island, usually in the same Reach |
| **Success** | Full intel on the target: works, garrison, crew, what is building, what is at sea for it |
| **Failure** | Nothing. The officer sails home. No penalty but the time. |
| **Critical failure** | Captured |

**Success grants the intel on every covert op, not just Espionage.** Getting in
unseen is what buys the look around, whatever you came to do.

**The feel, which is the actual spec:**

> "Most players should get this feeling of: oh, my espionage failed. Okay, all
> I did was lose the time... What you don't want is, all of a sudden everyone's
> just getting captured nonstop. That's not fun."

So failure is the common outcome and costs only days. Both criticals need
**overwhelming odds** in their direction. Early game — three or fewer weak
troops, no leader — somebody at 75+ espionage should be getting away with it
routinely. Late game against a fortified island *with a commander on it*, the
capture chance climbs. Without a leader on the spot it stays low.

None of these numbers can be set from a desk. They come out of `lab/` runs and
playtests, and the target above is the pass/fail condition for the tuning.

## 3. Intel, and how else it arrives

Intel is stamped with the day it was taken and shown with its age — *"28 days
old"* — because a report is a memory, not a window.

Three ways to get it, in descending cost:

1. **An espionage check** that succeeds, on any covert op.
2. **A blockade.** Lying off an island gives you its intel outright — an
   automatic successful check, for as long as you are there.
3. **A leak.** Every fortnight, a chance per island driven by its loyalty:
   100% loyal leaks nothing, and the chance rises as loyalty falls. **Garrison
   detection reduces it**, which is a second reason to keep troops ashore.

`leakInformation` already does (3) on a loyalty band, but it currently reveals
only that an island *exists* — it sets `explored`. It needs to deliver the
intel packet instead, and to be reduced by detection.

## 4. Sabotage needs per-target difficulty

> "You don't want equal odds to blow up a Majestic as a Swift."

So every sabotageable thing carries its own rating, used only in sabotage: a
Heavy Fortress is harder than a lumber mill, a first-rate harder than a sloop.

**Sabotage against ships is explicitly parked.** It needs ships to carry an
inherent detection value of their own, plus whatever troops are aboard, and
Sean wants that designed separately.

## 5. Prisoners

- A captured officer shows on the enemy's side with **prison bars over the
  portrait**.
- Every fortnight a prisoner rolls to escape: **combat against the island's
  defences**. Low odds. A well-defended island holds people.
- Prisoners can be **moved**, but only escorted by another character — you
  select both. In transit the escape odds are much better, so escorting a
  high-combat prisoner wants several escorts.
- An escaped prisoner appears at **the nearest friendly shore**.

## 6. Two standing rules stated in passing

- **Everybody comes home to the nearest island you control**, whatever island
  they set out from. A failed mission across the world does not sail all the
  way back to where it started.
- **Explore is deleted.** Not retired from the labels — removed as a mission.
  > "That mission doesn't need to exist. You just need to send a boat over
  > there."

  Its job is done by sailing somewhere, and by the blockade rule in §3.

## 7. The log

Quiet by default, loud for the things that decide the war.

- The fortnightly leak is **one line**: *"Informants provide information."*
  followed by the islands it covered. Tap it to read; most players will not,
  and that is correct.
- A principal being seen or taken is **not** quiet. The narrator says it:
  *"Commodore-Elect Adaira Hale has been taken."* These are win conditions.

## 8. Not covert, but stated here because it came up

A fleet at sea is currently invisible to its own owner — order one to an enemy
island and it vanishes from the map until it arrives. It should be visible on
your own side of the board, sitting over its destination, with an obvious
at-sea treatment (Rebellion changes the background to hyperspace) and an
unmistakable "en route" state on the harbor screen. The enemy sees it only
through fog.
