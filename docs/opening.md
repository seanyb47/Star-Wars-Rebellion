# The opening

(Seven Reaches, 63 islands, chosen by where the painting has its best harbors and islands rather than a quota per chain: Sovereign 15, Whalers' 9, Wreckers' 8, Rime 6, Cinder 8, Salt 9, Coral 8. Rime is the northern chain and three bergs of the ice; Whalers' is the long chain down the west; Coral is the spiral atoll in the south-east, which gained three islands when it went frontier — the painting had more land in that ring than five names were using.)

Sean's rules, 14 September 2026, implemented in `src/sim/galaxy.ts` and
tested in `src/sim/__tests__/galaxy.test.ts` and `defences.test.ts`. Every
Reach carries a `role` in `src/data/reaches.json`; the three port cities of
the great island carry `port: true`.

**Frontier — Salt, Rime and Coral Reaches.** Always start
unexplored, for everyone. Each island has a 25% chance of being settled and
held by neutral forces, behind the fog. The Confederacy has no base: its three
Pirate Lords signed the articles on one random island in one of these three
Reaches, and that island is called **Freeport** for the rest of the game. It
is a different island every game — the name is laid over whichever the dice
pick, and that island keeps the position, the outline and the room the
painting gave it, held in `chartName` so the chart can still find its coast.
Freeport answers to the Confederacy the way Highwater answers to the Crown:
a hundred to nothing on day one, with a seat's two companies ashore. It is
still not a base in the sense that matters — losing it loses nothing, because
the Crown wins by taking the three Lords and by nothing else — and it is dealt
none of the opening's camps, mills or yards, because the articles were signed
on it a week ago rather than settled on. The three ships — the *Free Harbor*, the *Swallowtail*, the
*Ironback* — and the Home Fleet lie there on day one. The Confederacy knows
Freeport and nothing else out here; the Crown knows only that a meeting took
place.

**Home — Sovereign Reach.** Highwater is a port city and always the Crown's
seat, with the Home Fleet there. The great island has three ports: Highwater,
Gorley and Ballmoor. The Crown opens with Highwater, one of the other two
ports, and one more island in the Reach (that one sullen: allegiance in the
thirties and forties, held by the garrison). The Confederacy opens with one
or two islands in the Reach, never on the great island itself. The rest are
settled and nobody's.

**Room, and how it is drawn.** What an island can hold mostly follows the chart, not the dice. The chart
script measures how much painted land lies within forty units of each mark
(`land` in `src/data/chart.json`, lagoons and peaks counted as land) and the
game turns that into room: 3 slots on a bare rock, 6 or 7 on an ordinary
island, 12 where the great island fills the frame, with one more berth at a
flagged port. It is one pool: every building takes one berth whatever it is,
and companies and hulls take none. The same island has the same room in every
game. A starting island keeps the chart's room; the opening only ever widens it
by the one spare berth that lets it build on day one.

Two figures override the painting, both Sean's, 15 September. The least any
island can hold is **four** berths — three was a place you built one thing on
and never opened again. And every island a side **opens the war holding** has
**eight to twelve**, rolled, over whatever the chart gave it: a starting island
is one you should be able to make something of. Nothing else moves; the chart
still decides the other fifty-odd islands, and it still wins where it was more
generous, so the great island's ports keep their thirteen.

Everywhere room is drawn — the island panel, the Reach list, the chain view —
it is drawn against one track of thirteen, the largest room in the game, so
the bar's *length* is the island's room and its colour is what is spent:
twelve berths fills the track, six reaches halfway, three stops a quarter
along, and the berths an island does not have are not drawn at all. **Available
land** is a chart filter too: islands of yours with room still open, a large
dot at five free or more, medium at two to four, small at one.

**Won over.** When an island runs up a side's colours, the companies that held
it stand down to one under the new flag. It used to hand over the whole
militia, and an opponent that talked twenty islands round inherited forty
companies' wages and went broke with nothing built.

**Contested — Wreckers' Reach, Whalers' Reach, Cinder Reach.** Each side
opens with two islands; the rest are settled, nobody's, and garrisoned.

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

**Where the people are.** Nobody opens in a heap. The Regent has not left the
citadel in eleven years and stands at Highwater; the rest of the Admiralty is
posted about the Crown's other holdings. The three Lords are aboard their own
ships at Freeport — a Lord never goes ashore and never changes hull, so a Lord
is the only Confederate aboard anything on day one — with one or two other
Confederates on the quay beside them, and the rest out on the islands that
have already declared.

**How the war ends.** The Confederacy wins the day it holds Highwater. The
Crown wins the day all three Lords are in irons at once — which now has two
roads to it, because a Lord is a ship when idle and a person on an errand.
Left aboard they are taken only with their hull. Sent ashore to parley, spy or
sign somebody on, they are an officer like any other and can be carried off a
quay. While one is away their ship cannot sail and its power sleeps, so every
errand is a squadron out of the war and a third of the losing condition
standing on somebody else's beach.

**Loyalty is a balance.** Every inhabited island's regard for the two sides
adds up to a hundred: there is no undecided middle, so a point won is a point
taken. Unaligned islands open as a lean rather than a blank — forty to sixty
Crown in the home and contested Reaches, forty-five to fifty-five further out
— and come over at a flat eighty, which is three or four parleys' work from
level.

**Garrisons.** What an island asks for follows its band: none when firm, one
when steady, four when thin, six in revolt — and six ashore will end a revolt
on its own. Every company also takes a twentieth off the smugglers' share. Starting
garrisons are the requirement plus one, capped at six, so a loyal island opens
with two companies and a sullen one with five.

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
