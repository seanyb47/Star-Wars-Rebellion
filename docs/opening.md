# The opening

(Seven Reaches, 60 islands, chosen by where the painting has its best harbours and islands rather than a quota per chain: Sovereign 15, Whalers' 9, Wreckers' 8, Rime 6, Cinder 8, Salt 9, Coral 5. Rime is the northern chain and three bergs of the ice; Whalers' is the long chain down the west.)

Sean's rules, 14 September 2026, implemented in `src/sim/galaxy.ts` and
tested in `src/sim/__tests__/galaxy.test.ts` and `defences.test.ts`. Every
Reach carries a `role` in `src/data/reaches.json`; the three port cities of
the great island carry `port: true`.

**Frontier — Salt Reach and Rime Reach.** Always start
unexplored, for everyone. Each island has a 25% chance of being settled and
held by neutral forces, behind the fog. The Confederacy's base is one random
island in one of these two Reaches; the Confederacy knows that Reach and
nothing else out here; its Home Fleet lies at the base.

**Home — Sovereign Reach.** Highwater is a port city and always the Crown's
seat, with the Home Fleet there. The great island has three ports: Highwater,
Gorley and Ballmoor. The Crown opens with Highwater, one of the other two
ports, and one more island in the Reach (that one sullen: allegiance in the
thirties and forties, held by the garrison). The Confederacy opens with one
or two islands in the Reach. The rest are settled and nobody's.

**Contested — Wreckers' Reach, Whalers' Reach, Cinder Reach.** Each side
opens with two islands; the rest are settled, nobody's, and garrisoned.

**Open — Coral Reach.** Charted, settled, nobody's.

**Neutral forces.** A settled island that is nobody's opens with a garrison
(one to three companies near the war, two to four on the frontier). A landing
has to beat it; a parley has to win it over. Nobody pays for it.

**Economy.** Nine islands a side is twice the garrison upkeep of the old
six-and-four opening, so the Crown opens with fifteen camps and fifteen
mills and the Confederacy with fourteen of each. Measured across eleven
seeds: both sides clear a surplus of thirteen to twenty a day on day one.

**Chart.** Highwater must be painted as a port on the great island's coast,
not on its mountain; Gorley and Ballmoor as the other two ports on that
coast. This is in the chart prompt (scratch `chart-prompt.txt`, and below).
