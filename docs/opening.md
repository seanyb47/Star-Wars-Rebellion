# The opening

(Seven Reaches, 60 islands, chosen by where the painting has its best harbours and islands rather than a quota per chain: Sovereign 15, Whalers' 9, Wreckers' 8, Rime 6, Cinder 8, Salt 9, Coral 5. Rime is the northern chain and three bergs of the ice; Whalers' is the long chain down the west.)

Sean's rules, 14 September 2026, implemented in `src/sim/galaxy.ts` and
tested in `src/sim/__tests__/galaxy.test.ts` and `defences.test.ts`. Every
Reach carries a `role` in `src/data/reaches.json`; the three port cities of
the great island carry `port: true`.

**Frontier — Salt Reach and Rime Reach.** Always start
unexplored, for everyone. Each island has a 25% chance of being settled and
held by neutral forces, behind the fog. The Confederacy has no base: its three
Pirate Lords met on one random island in one of these two Reaches and their
ships — the *Free Harbor*, the *Swallowtail*, the *Ironback* — lie there on
day one with the Home Fleet and the rest of the Confederacy's people aboard the
*Free Harbor*. The island is nobody's. The Confederacy knows that island and
nothing else out here.

**Home — Sovereign Reach.** Highwater is a port city and always the Crown's
seat, with the Home Fleet there. The great island has three ports: Highwater,
Gorley and Ballmoor. The Crown opens with Highwater, one of the other two
ports, and one more island in the Reach (that one sullen: allegiance in the
thirties and forties, held by the garrison). The Confederacy opens with one
or two islands in the Reach, never on the great island itself. The rest are
settled and nobody's.

**Room.** What an island can hold follows the chart, not the dice. The chart
script measures how much painted land lies within forty units of each mark
(`land` in `src/data/chart.json`, lagoons and peaks counted as land) and the
game turns that into room: 3 slots on a bare rock, 6 or 7 on an ordinary
island, 12 where the great island fills the frame, split about 45/55 between
ground and water, with one more berth on the water at a flagged port. The same
island has the same room in every game. A starting island keeps the chart's
room; the opening only ever widens it by the one spare slot of each kind that
lets it build on day one.

**Won over.** When an island runs up a side's colours, the companies that held
it stand down to one under the new flag. It used to hand over the whole
militia, and an opponent that talked twenty islands round inherited forty
companies' wages and went broke with nothing built.

**Contested — Wreckers' Reach, Whalers' Reach, Cinder Reach.** Each side
opens with two islands; the rest are settled, nobody's, and garrisoned.

**Open — Coral Reach.** Charted, settled, nobody's.

**Neutral forces.** A settled island that is nobody's opens with a garrison
(one to three companies near the war, two to four on the frontier). A landing
has to beat it; a parley has to win it over. Nobody pays for it.

**Economy.** Nine islands a side is twice the garrison upkeep of the old
six-and-four opening, so the Crown opens with fifteen camps and fifteen
mills and the Confederacy with fourteen of each. Measured across eight
seeds after the makers below went in: both sides clear a surplus of eight
to fourteen a day on day one.

**Makers.** Two of each production facility a side — two construction
yards, two training facilities, two shipyards — dealt at random across
the side's starting islands, so a seed may double them up on one island
and leave another with none. Earners still go round in order so every
island opens with something to pay its way.

**How the war ends.** The Confederacy wins the day it holds Highwater. The
Crown wins the day all three Lords are in irons at once: a Lord never leaves
their ship, so that means finding the ships and taking them.

**Loyalty is a balance.** Every inhabited island's regard for the two sides
adds up to a hundred: there is no undecided middle, so a point won is a point
taken. Unaligned islands open as a lean rather than a blank — forty to sixty
Crown in the home and contested Reaches, forty-five to fifty-five further out
— and come over at a flat eighty, which is three or four parleys' work from
level.

**Loyalty.** Three bands, and they cost money. Firm at ninety and up: the
island ships everything to you. Steady from sixty: a seventh of its trade goes
out the back to the other side. Thin below sixty: a quarter. In revolt: half,
and you get none of the rest. A governed island settles at sixty-five, inside
the steady band, so the middle rate is the resting state and both ends are
earned. A thin island also talks — the enemy may chart it without ever sailing
there.

**Chart.** Highwater must be painted as a port on the great island's coast,
not on its mountain; Gorley and Ballmoor as the other two ports on that
coast. This is in the chart prompt (scratch `chart-prompt.txt`, and below).
