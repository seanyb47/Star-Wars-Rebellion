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

## The prompts

They live in [`art-units.md`](art-units.md), alongside the facility prompts, so
there is one sheet to hand to a generator and one place a wording change has to
land. This page is the design — what the numbers mean, who turns up where, and
what is wired in — and that page is the art order.
