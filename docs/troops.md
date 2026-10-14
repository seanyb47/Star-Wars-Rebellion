# Garrison companies — art and stats

*Written 15 September, at Sean's word: “Garrisons need images. We want to model
garrisons after SW Rebellion units but follow lore and races of our world. Can
you give them names, stats, and prompts for images.”*

The names and the watch column come out of the world bible §7, which took them
off Rebellion's ground units. Attack and hold are new here, set against what
the bible already claims about each one — “best defense”, “best offense”,
“best starting troop” — so the numbers and the prose cannot disagree. The data
is `src/data/troops.json`; a test holds the three superlatives true.

## The scale

Three numbers, the way a Rebellion regiment has three:

| | what it is |
|---|---|
| **attack** | what a company is worth landing on somebody |
| **hold** | what it is worth defending ground it is standing on |
| **watch** | what it sees: the eyes that catch a saboteur, an agitator, or a boat coming in at night |

15 is a militiaman. 50 is the worst thing either side can put on a beach. The
span is Rebellion's, roughly, and deliberately narrow: the difference between
the best company and the worst is about three to one, not ten, so numbers never
make a landing a foregone conclusion.

**What is wired in, and what is not.** Who is standing on an island is real and
in the game today: a garrison is a mix of named companies, seeded from the
island so it never reshuffles, and each one draws its own figure. The three
numbers are shown and not yet read — a landing is still settled on how many
companies are ashore, exactly as it was. Wiring them means typed companies in a
ship's hold as well as on an island, which is the next job and a real one; it
would also move the balance, so it is worth doing on purpose rather than as a
side effect of adding art.

## Who is where

The sort of unit decides where it turns up, which is the part that makes an
island in the Far Sea defend differently from one in the Amber:

- **Line** and **sailors** — Crown Regulars and Island Militia, and a Ship's
  Company apiece. Everywhere the side has anything; sailors only where there is
  a shipyard to have come off a hull at.
- **Native** — Reefwalkers, Reef Guard, Urskin Berserkers. Not a purchase, a
  people: they appear on the islands their people live on and nowhere else. The
  Reef Guard *are* the reef island.
- **Made** — Tidewrought and the Drowned Guard, the two the Crown manufactures
  rather than musters. Behind research, so nowhere yet.

**One deliberate divergence from the bible.** §7 stars all five non-basic units
as needing research, the original's way. The three native ones are not starred
here: a Reef-folk island is defended by Reef-folk whether or not anyone has
researched anything, and gating that made every Confederate island in the
opening look identical. The two made units keep their research gate, which is
the half of the rule that was doing work. Sean's call if he wants it back.

## Raising one — 22 September

Sean, over the Build Troops screen: *"Should give me option of which troop to
build right?"* It should, and until this it could not, for a reason worth
writing down because it was invisible.

A garrison was a **count**. `garrisonRoster` invented the mix from the island's
seed every time anybody asked, and it filtered every researched company out —
so **eight of the twelve companies could never stand in a garrison at all**.
Measured over six full wars with every garrison sampled every 25 days, only the
four day-one companies ever appeared. Four rungs of the research ladder on each
side bought a unit nobody could post anywhere, and the Shoal Wardens were
unreachable in the exact role they were written for.

So an island now keeps a **list of who is posted on it** (`System.companies`),
authoritative where it exists, with `garrison` staying as its length. The seeded
mix is still the answer for an island nobody has changed anything on, which is
why nothing had to be migrated.

Three rules decide what a drill ground will raise:

- **Research.** A company behind R4 wants four grades of shipwright craft, the
  same ladder as a hull.
- **A people live where they live.** A `native` company raises only on its own
  `home` archetypes. That is what makes the two sides differ rather than mirror:
  the Confederacy musters whoever is already there, while the Crown's later
  companies are *made* — brass and iron, and men who were human once — and a
  made thing can be made anywhere.
- **Sailors are not raised.** A ship's company comes off a hull.

### The seam this leaves

**A fleet counts its companies rather than listing them.** `fleet.troops` is a
number, so a company that embarks loses its name and comes ashore as the side's
landing troop — which is already who the sim says a side puts in boats, but it
does mean you cannot carry two Hushed to a landing and have them arrive as the
Hushed. Closing it means giving `Fleet` the same list the island now has and
teaching the landing to fight with it; the `invade` call already carries
per-company identities, so the combat half is done. Not started.

### What it cost the Crown, and why

Enforcing the sailors rule took something away that had been load-bearing. The
old generic order priced itself from `troopBuildAt`, which returns the island's
first roster entry — and on roughly a quarter of yard islands that was a
**Ship's Company at 26 gold** rather than Crown Marines at 42. The Crown was
garrisoning on the cheap with crews it had not raised.

With that closed, **the Crown has exactly one raisable company until R2**, at 42
gold and 0.4 a day, against the Confederacy's Island Militia at 24 and 0.2 — and
the Crown's R2 unit, the Fensworn, holds worse than the Marines it replaces, so
its ladder only pays at R6.

Ninety-six wars say this costs the Crown nothing it can measure — 46 — 50 pooled,
0.4 SD from even — so it is a lopsided menu rather than a balance problem. It is
still a design question for Sean: price Crown Marines nearer the militia, give
the Crown a cheap day-one garrison unit of its own, or move the Fensworn up so
R2 is worth reaching.

### And the menu is not the ladder — measured, 22 September

The ladder is the wrong thing to count, because a people's `home` means the
list a player actually sees is the ladder *intersected with the island they are
standing on*. `lab/menu.ts` reports both, over 200 worlds a side:

| rung | Crown menu | one choice or none | Confederate menu | one choice or none |
|---|---|---|---|---|
| R0 | 1.00 | 100% | 1.21 | 79% |
| R2 | 1.44 | 56% | 1.21 | 79% |
| R4 | 2.44 | 0% | 1.58 | 42% |
| R6 | 3.44 | 0% | 1.78 | 22% |
| R8 | 4.44 | 0% | 1.89 | 11% |

Which inverts the complaint. The Crown is thin on day one and never thin again
— by R4 every island it holds offers three, because the Hushed and everything
after them are *made* and a made thing goes anywhere. The Confederacy is never
as thin as the Crown's opening and never stops being somewhat thin: at R8, with
the whole ladder bought, an eighth of its islands still offer one line, because
four of its five are peoples and only the Island Militia are from everywhere.

That is the faction shape working exactly as `troops.json` says it should, so
neither number is a fault. It is worth knowing which way round it runs before
anybody prices the Crown's opening, because the fix for the Crown's day one
should not be a fix that also widens the Confederacy's endgame.

## The prompts

They live in [`art-units.md`](art-units.md), alongside the facility prompts, so
there is one sheet to hand to a generator and one place a wording change has to
land. This page is the design — what the numbers mean, who turns up where, and
what is wired in — and that page is the art order.
