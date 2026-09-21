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
