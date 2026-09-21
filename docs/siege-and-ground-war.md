MASTER OF THE SEVEN SEAS — SIEGE AND GROUND WAR
CONSOLIDATED CHANGE ORDER FOR CLAUDE CODE

20 Sep 2026. Sean's design. This single document supersedes the two earlier change orders
("Bombardment Rework" and "Invasion System + Troop Stats") — build from this one. Ship stats:
"Master of the Seven Seas — COMBAT MASTER v4.4.md" (Drive > 7 Seas > Naval Combat System).

WHAT CHANGES, IN ONE BREATH: a siege stops being a daily tick you wait out, becomes two dice-rolled
actions you order, and the walls stop being a gate you must pass before landing.

================================================================
0. THE ONE SHARED RULE — OVERKILL
================================================================
Bombardment and invasion use the SAME casualty rule. Teach it once.

  A roll that beats the other side produces a MARGIN. The margin is spent killing the loser's
  units, CHEAPEST FIRST, each costing the same stat that side rolled with. It keeps buying until
  nothing left is affordable. IT MAY KILL ALL OF THEM.

  YOU DIE BY THE NUMBER YOU FIGHT BY. A bombarding fleet rolls its Bombardment score; the island
  rolls Bombardment Defense, and its walls and troops die at that. An invader rolls Attack and its
  troops die at Attack; the defender rolls Invasion Defense and dies at Invasion Defense.

Nothing has hit points. Nothing takes partial damage. A thing is fine or it is gone.

CHEAPEST FIRST, not at random: the losing side gives up its weakest units before its best, which is
what a commander would do and what a wall does anyway. It is also deterministic, so a player can
read the result rather than wonder at it. Measured, it changes balance by under half a point
everywhere — it costs nothing and buys legibility.

WHY CASUALTIES USE THE SAME STAT THE SIDE ROLLED WITH: it makes every unit's own description true.
A unit that is good at a job is durable at that job and fragile at the other one, with no extra
rule. Measured, ~240 gold of each unit attacking four Marines behind a Fortress, then holding one
against six Marines:
    Urskin Berserkers 50/20 .... 99% attacking, 26% holding — "ask them to stand still and hold a
                                 wall and you have wasted them"
    The Brethren      32/12 .... 95% / 11% — "you will get the wall back in pieces with nobody
                                 standing on it"
    Bog Witches       20/32 ....  8% / 57% — "they do not fight so much as make a place expensive
                                 to be in"
    Shoal Wardens     12/16 .... 70% / 89% — the best holders in the game, which is what Wardens
                                 ought to be
    Crown Marines     30/30 .... 71% / 67% — balanced by the numbers and by the name
    Drowned Guard     44/40 .... 74% / 61% — the all-rounder

That rule is why elite units are worth their price. Measured under the alternative — one casualty
per exchange regardless of what it cost — four Drowned Guard (224 gold) attacking won 55% where ten
Island Militia (240 gold) won 88%, making the best troop in the game its worst buy. Spending the
margin reverses it: militia to 58%, Drowned Guard to 70%.

================================================================
1. BOMBARDMENT
================================================================
1. A FLEET ACTION, resolved the moment it is ordered. No standing order, no daily tick, no waiting.
2. ATTACK = 1d(fleet bombardment score) — the sum of Bombardment across ships afloat WITH TICKS LEFT.
3. ISLAND DEFENSE = the sum of Bombardment Defense of everything defending. Walls while any stand;
   once they are all rubble, the garrison.
4. If ATTACK beats ISLAND DEFENSE, spend the margin per section 0 against Bombardment Defense
   scores, CHEAPEST FIRST — killing walls while any stand, troops once none do.
5. KEEP ROLLING until a roll fails to beat the island total. Every wall destroyed lowers that total,
   so each successive roll is easier — a hot streak levels an island in one action.
6. The whole cascade is ONE ACTION costing ONE TICK per participating ship, however many rolls it ran.
7. A ship may bombard FIVE TIMES before returning to a friendly port, where its ticks clear in full.
   A spent ship adds nothing to the fleet score but still blockades normally.
8. Every action carries a 5% chance of hitting civilian infrastructure. When it does, EVERY ISLAND
   IN THE REACH loses 5 loyalty. Rolled once per action, not once per roll.

THE RULE WORTH SHOWING THE PLAYER: to destroy a defender you must roll the island's total defense
PLUS that defender's own score. With N identical walls of defense D that is (N+1) x D. Because the
top of the die IS the fleet's bombardment score, a fleet under that number has ZERO chance rather
than poor odds — so say so before a tick is spent: "your squadron rolls at most 32; these walls
stand at 40."

WHAT ONE ACTION PRODUCES (20,000 trials): a Crown siege train (Majestic + Sovereign II + Sovereign +
Morningstar, 1d32) clears an island of one Fortress and four troops outright 33% of the time and
averages 3.5 rolls in the cascade. Three Fortresses takes two or three actions. Two Heavy Fortresses
costs most of a five-tick magazine and is out of reach of the Confederacy's best siege fleet.

SHIP BOMBARDMENT VALUES ARE UNCHANGED. Part 3 of the COMBAT MASTER stands as written; the wall
numbers were chosen to fit the roster rather than the reverse.

================================================================
2. INVASION
================================================================
THE OLD RULE IS REPEALED. "A single fortress on the island prevents the fleet from doing an assault"
(Sean, 15 Sep) is gone. You may always land. Standing walls instead add their Invasion Defense to
the garrison's, which makes storming them expensive rather than impossible — so bombardment becomes
softening, not a gate, and the two systems finally trade against each other.

1. ATTACK  = 1d(sum of Attack across every landed troop)
2. DEFENSE = 1d(sum of Invasion Defense across defending troops, PLUS every standing wall)
3. Both roll. A tie kills nobody. Otherwise the winner's margin is spent per section 0 against the
   loser — DEFENDERS die at their Invasion Defense, ATTACKERS die at their Attack — cheapest first,
   potentially wiping the whole force in one exchange.
4. Repeat with the new totals until one side has nothing left. If the defenders are wiped, the
   island and everything on it changes hands.
5. ONE ACTION, resolved immediately.

Walls are not units and cannot be killed by troops. They swell the defender's die and are captured
when the last defending troop falls. Breaking them is bombardment's job.

DOES BOMBARDING FIRST MATTER? Six Crown Marines against four Island Militia:
  Heavy Fortress standing 74%  |  Fortress standing 90%  |  walls in rubble 98%
Yes, and it is still optional.

TOTAL WIPES: 69% of first exchanges clear a small light garrison outright (six Berserkers against
four Shoal Wardens in the open); 55% for six Drowned Guard against four militia. Landings are
decisive, which is what makes escorting and garrisoning matter.

================================================================
3. TROOPS — SIX A SIDE, TWO TO START, FOUR BY RESEARCH
================================================================
CUT ENTIRELY: Crown Regulars, Reef Guard, the Confederacy's Ship's Company.
NEW: Fensworn, The Hushed, The Brethren, Bog Witches, Shoal Wardens.
Unlocks at R2 / R4 / R6 / R8 on both sides, matching the ships' even research tiers.

  CROWN IMPERIUM      Unlock  People             Atk  InvDef  Detect  BombDef  Gold  Days  Upkeep
  Crown Marines        start  Human               30    30      24       2      42    20    0.4
  Ship's Company       start  Human               16    16      20       2      26    12    0.3
  Fensworn             R2     Bog-folk clans      20    20      20       2      30    14    0.3
  The Hushed           R4     The Hushed          16    20      36       2      36    18    0.4
  Tidewrought          R6     Brass and iron      40    36       4       4      40    20    0.6
  The Drowned Guard    R8     Human (once)        44    40      30       4      56    28    0.8

  FREE CONFEDERACY    Unlock  People             Atk  InvDef  Detect  BombDef  Gold  Days  Upkeep
  Island Militia       start  Whoever lives there 16    20      10       1      24    12    0.2
  Reefwalkers          start  Shoal-folk          20    20      36       2      38    18    0.4
  The Brethren         R2     Mixed (pirates)     32    12      16       2      30    14    0.3
  Bog Witches          R4     Bog-folk conjure    20    32      40       2      46    22    0.6
  Shoal Wardens        R6     Shoal-folk          12    16      24       2      16     8    0.2
  Urskin Berserkers    R8     Urskin              50    20      20       2      44    22    0.4

COST AND TIME track total capability (Attack + Invasion Defense + Detection). Upkeep is the Part 2B
benchmark of 1% of cost per day, except Tidewrought, the Drowned Guard and the Bog Witches, which
pay above rate — brass and iron, whatever the Drowned Guard needs, and the offerings, the same valve
the Witchlight pays at sea. THE SHOAL WARDENS ARE DELIBERATELY UNDER-PRICED at 16 gold and eight
days, below what their capability is worth: that under-pricing is what "mass producible" means
mechanically, the same way an S-tier hull is priced below rate. Nothing else trains in eight days.
The standing rule survives — the slowest troop trains faster than the fastest hull.

BOMBARDMENT DEFENSE is deliberately not flat. Flesh is 2; militia, who are men in a town with
whatever was in the shed, are 1; Tidewrought and the Drowned Guard are 4, for the brass and for
whatever is left of them.

WHY IT IS A SEPARATE NUMBER FROM INVASION DEFENSE, since the two look redundant on a card: the
dice they answer are on completely different scales. A bombarding siege train rolls 1d32; six Crown
Marines invading roll 1d180. Roughly a sixfold gap, so their defence numbers have to differ by
about as much — troop Invasion Defense runs 12-44, troop Bombardment Defense 1-4. Merging them
would mean multiplying every ship's Bombardment by ten (which reopens Part 3 of the COMBAT MASTER,
the pricing formula's Bombardment tier bands, and every bombardment figure in section 1) or
dividing every troop's Attack by ten (which reopens the whole ground game). Either way the price is
a full rebalance and the prize is one fewer number.

They are also measuring genuinely different things — how hard you are to hit from a ship's deck at
half a mile, against how hard you are to kill with a cutlass in a street. A militia company is easy
to shell and respectable in the alleys; brass automata are the reverse.

THE REAL COMPLAINT, though, is card clutter, and that has a cheaper fix: do not print Bombardment
Defense on the troop card at all. It only ever matters in one narrow case — shelling a garrison
after every wall is already rubble — so it can live in the siege screen like the ships' rating
letters live in the back end, seen by the system and never by the player.

WHAT THE ROSTER ACHIEVES
  - THE BOG-FOLK FIGHT ON BOTH SIDES — Fensworn clans for the Crown, conjure-women against it,
    mirroring the Fenrunner and the Witchlight at sea. The split-family lore now runs through the
    infantry as well as the fleet.
  - THE CROWN HAS AN ARC, NOT A ROSTER. It opens with its own people, WINS the clans at R2 and the
    Hushed at R4, then stops needing allies and starts MAKING soldiers at R6 and R8. The rebellion
    recruits all the way to the end. The Confederate unlock copy should read as recruitment, never
    as invention.
  - EVERY STAT IS EVEN, closing the clean-numbers gap left over from v4.4.
  - Crowns split: Confederacy keeps attack (Berserkers 50) and detection (Bog Witches 40); the
    Crown takes the raw defence stat (Drowned Guard 40) — though per gold the witches hold better.

BALANCE (20,000 trials each)
  Opening, three of each starter vs four defenders behind a Fortress:
    Crown take a militia island 77%   |   Confederacy take a Ship's Company island 66%
  Gold-matched ATTACK, ~240g against 4 Crown Marines behind a Fortress:
    Berserkers 99 | Brethren 95 | Drowned Guard 74 | Marines 71 | Shoal Wardens 70
    Militia 51 | Bog Witches 8
  Gold-matched DEFENCE, holding a Fortress vs 6 Marines (the % is how often they HOLD):
    Shoal Wardens 89 | Marines 67 | Drowned Guard 61 | Bog Witches 57 | Berserkers 26 | Brethren 11
  Specialists asked to do the wrong job lose badly and should. Every unit is now durable at the job
  it is good at and fragile at the other, which is the whole point of the shared casualty rule.
  TIERING HOLDS: six Berserkers crush a mid-tier garrison (99%) but only manage 84% against four
  Drowned Guard behind a Heavy Fortress. Raising wall values was tested as a brake and rejected —
  Fortress 50 / Heavy 100 barely touched the Berserkers (99 to 97) while dragging the opening down
  to 59/46. Walls stay at 30/60.

ENCYCLOPEDIA CARDS — name, people, role, unlock, the seven numbers, blurb. Existing blurbs are
canon and kept; changes are marked.

CROWN MARINES — Human, elite, start. The white-coats. Drilled to go over a gunwale or up a beach and
to keep going, and posted where the Crown means to be seen keeping order. [CHANGED, since they no
longer sit alone at the top] The best thing the Crown can land before it starts making soldiers that
were never born.

SHIP'S COMPANY — Human, sailors, start. Sailors put ashore with cutlasses and told to hold something.
Worse at it than soldiers and better at noticing a boat that should not be there, which is the trade
you are making.

FENSWORN — Bog-folk clans, line, R2. Clansmen who came out of the swamps when the Crown broke the
slavers and have not gone back. They are not clever soldiers and the Admiralty's drillmasters have
stopped saying so; they hold ground the way they hold a grudge. Every one of them knows a cousin
under the other flag, and none of them will be the first to raise a musket at her.

THE HUSHED — The Hushed, R4. They serve under an old bargain whose terms neither side discusses, and
they do not discuss anything else either. A Hushed picket does not challenge, does not signal and
does not sleep; the first the enemy knows of them is that the boat they sent has not come back. Post
them where you cannot afford a surprise, and do not ask what became of the crew.

TIDEWROUGHT — Brass and iron, made, R6. Automata of brass and black iron that walk in over the
seabed and come out of the surf already advancing. They hit like a falling spar and they see nothing
at all; a troop of them will march past a saboteur standing still. [ADDED] Shot does less to them
than it does to men, which is the other half of what the Admiralty paid for.

THE DROWNED GUARD — Human (once), made, R8. Marines who have been cold-baptised: held under the Deep
until they stop struggling, and brought back. Black plate, no fear, and something missing behind the
eyes. The worst thing the Crown can put on a beach, and the Admiralty does not discuss how they are
made. [ADDED] They do not break under bombardment because there is nothing left in them to break.

ISLAND MILITIA — Whoever lives there, line, start. The island's own, with whatever was in the shed.
They will not take anything off anybody, and on their own ground they are a great deal harder to
shift than their drill suggests.

REEFWALKERS — Shoal-folk, native, start. Shoal-folk scouts, small and webbed and night-eyed, who can
hear a hull creak a mile out. The best watch in the world: nothing lands on an island they are on
without the island knowing first.

THE BRETHREN — Mixed, pirates, R2. A boarding party that has run out of ship. They come up a beach
the way they come over a gunwale — fast, loud, and entirely uninterested in what happens after the
third minute. Nothing this cheap hits this hard and nothing this cheap dies this fast: ask them to
hold a wall and you will get the wall back in pieces with nobody standing on it.

BOG WITCHES — Bog-folk conjure-folk, R4. The conjure-women who did not follow the clans to the Crown,
and who have long memories about it. They do not fight so much as make a place expensive to be in:
water that will not boil, sentries who hear their own names called from the treeline, a fever that
takes the officers first. Nothing gets onto an island they are on without the island being told.

SHOAL WARDENS — Shoal-folk, native, R6. Shoal-folk off the shallow islands, slight and webbed and
without number. Any one of them is worth very little and all of them know it; they come in the
quantity the sea sends them, cost almost nothing to raise, and are replaced before anybody has
finished counting the ones who did not come back. Set them in the tideline and they are the hardest
thing in the game to shift — not because any one of them will not move, but because there is always
another one behind her.

URSKIN BERSERKERS — Urskin, native, R8. Torvik's people, tusked and shaggy and eight feet of them,
coming up a beach with the harpoons they use on things bigger than boats. Nothing in the game hits
harder going forward. Ask them to stand still and hold a wall and you have wasted them.

================================================================
3B. WHY A MASS-PRODUCIBLE TROOP EXISTS — THE GARRISON LADDER
================================================================
The Shoal Wardens are not a combat decision, they are an OCCUPATION decision, and the rule that
makes them matter is already in the game. GARRISON_FOR_BAND asks for troops by loyalty band:

    firm 0   |   steady 1   |   thin 4   |   IN REVOLT 6

So an empire holding sour ground needs bodies by the dozen, and what it pays for them decides
whether it can afford to hold anything at all.

  unit                gold   to garrison ten thin islands (40)   upkeep/day   days to raise one
  Shoal Wardens         16                 640                       8.0              8
  Island Militia        24                 960                       8.0             12
  Ship's Company        26               1,040                      12.0             12
  Crown Marines         42               1,680                      16.0             20

Blanketing ten sour islands costs 640 gold in Shoal-folk against 1,680 in Crown Marines, and an
island that drops into revolt can be answered in eight days rather than twenty. THAT is the reason
the unit exists, and it is why under-pricing them below their capability is correct rather than
sloppy: you are not buying a fighter, you are buying the ability to hold what you have taken.

THE LORE DOES THE REST. The Shoal-folk are the people everyone likes — slight, webbed, soft-spoken,
on every shore and at war with nobody. A Shoal-folk company standing in a market square does not
read to the islanders as an occupation, which is precisely why the Confederacy can smother an
uprising with them where a Crown garrison would deepen it. The rebellion holds ground by being
welcome. The empire holds it by being present. Same mechanic, opposite meaning.

OPTIONAL, ONE CONSTANT: if that idea should bite mechanically rather than only explain, let a
Shoal-folk company take a larger cut of smuggling than GARRISON_SMUGGLING_CUT's flat 5% — neighbours
do not run cargo against neighbours. It needs no new system and no new screen. Not specified here;
Sean's call.

================================================================
3C. TWO NEGOTIATORS
================================================================
Added to the cast in characters.json, one a side, both major (which takes the named principals from
fourteen to sixteen). Fields match the existing schema exactly. Vocabulary note: the ROLE is
"Negotiator" per terms.json — the retired word is "diplomat" — while the RATING key stays
`diplomacy`, which is back-end and never shown.

  FREE CONFEDERACY
  id        meret
  name      Meret of Low Water
  epithet   the Welcome
  people    Shoal-folk
  roles     Negotiator, Recruiter
  major     true
  ratings   diplomacy 92 | espionage 40 | combat 20 | leadership 55
  bio       Has never been turned away from a harbour, including two that were at war with her at
            the time. Speaks eleven island dialects and apologises for her accent in all of them.
            The Crown has put a price on her three times and quietly withdrawn it twice, on the
            grounds that arresting her would cost more goodwill than she is worth.

  CROWN IMPERIUM
  id        marchmont
  name      Envoy Adelia Marchmont
  epithet   the Paper Tide
  people    Human
  roles     Negotiator, Recruiter
  major     true
  ratings   diplomacy 88 | espionage 58 | combat 18 | leadership 62
  bio       Arrives with the treaty already drafted and the signatures already witnessed, and then
            waits. Has never raised her voice in a negotiation and has never needed to; the
            Admiralty's terms are not an opening position. Islands that have signed describe the
            experience as being told the weather.

They are a matched pair on purpose: one is loved and one is inevitable, and they are the two ways
this war gets won without a shot. WORTH CONSIDERING: Meret would sit just as well in the `recruits`
list as in the Confederate cast, since a Shoal-folk negotiator everybody likes is exactly the sort
of person either side might land. Left Confederate here; say the word to move her.

================================================================
4. FORTS
================================================================
                        Fortress   Heavy Fortress
  Gold                     100          250
  Days                      30           54
  Upkeep/day                 2            5
  Bombardment Defense        4            8        (new)
  Invasion Defense          30           60        (new)

Gold, days and upkeep are unchanged from the existing build data. A Heavy Fortress costs two and a
half Fortresses and is worth two in both defences — no bulk discount, which is right, because one
big wall is harder to cascade through than two small ones.

================================================================
4B. THE LOCATION SCREEN — "DEFENSES" REPLACES "TROOPS"
================================================================
A location's Troops section becomes DEFENSES, and fortresses move into it. What holds an island is
one idea, not two, and the player should read it in one place: so many companies, so many walls.

  1. RENAME. "Troops" -> "Defenses" wherever a location lists what holds it. Per house rules the
     word lives in `src/data/terms.json`, not in the components, and the retired word must be
     registered so `src/ui/__tests__/vocabulary.test.ts` fails the build if "Troops" reaches the
     player as a section heading. NOTE the word "Troop" itself is NOT retired — it is still the unit
     (Sean's reversal of 19 Sep) and still reads "3 Troops" inside the panel. Only the SECTION is
     renamed.

  2. FORTRESSES LIST THERE, alongside troops, showing Invasion Defense and Bombardment Defense so
     the player can read the island's whole defensive weight in one column.

  3. TROOPS MOVE, FORTRESSES DO NOT. Troops embark and sail; a wall is where it was built and stays
     there until it is rubble. The Defenses panel should make that plain — a troop row is
     draggable/selectable for embarkation, a fortress row never is.

  4. A FORTRESS TAKES A BUILD SLOT. Likely already true and worth confirming rather than
     implementing: `System.slots` is already the single "room to build" pool ("There used to be two
     pools... One number answers it") and fortresses are ordinary Facility records, so they should
     already consume a berth like a shipyard or a mine. VERIFY, and if they are somehow exempt,
     make them count. The consequence is the interesting part and should be surfaced in the UI: a
     heavily walled island is a poor earner, because every berth spent on stone is a berth not
     spent on a mine or a mill. That is the trade-off that stops a player fortifying everything,
     and it wants to be visible at the moment of building, not discovered later.

================================================================
5. DELETIONS
================================================================
1. The daily standing-order loop in fleets.ts ("Every squadron under standing orders to bombard
   fires once") and the `fleet.bombarding` flag with it.
2. FORT_REPAIR_PER_DAY and the nightly wall-patch loop. With walls binary there is nothing to
   repair, and it was the cause of a silent bug: because the patch was a percentage and bombardment
   a flat subtraction, any fleet under 1.2 bombard could never scratch a Fortress and nothing ever
   said so — a lone Chimera would besiege an island forever.
3. FORT_GUNS, HEAVY_FORT_GUNS, wallGuns(), fortGuns() and underTheWall(). They existed only to let a
   wall shoot back during a bombardment round, and per Sean's 18 Sep rule ("guns should be anti
   bombardment only") were already silent at any fleet not firing. With rounds and ship damage both
   gone they have no trigger and no target. Also strip fort guns from the defender-strength readout
   in fleets.ts and the AI's capital threat estimate in ai.ts. A fort is now an obstacle, never a
   danger.
4. `system.shelled`, CIVILIAN_STACK and CIVILIAN_STACK_MAX. The escalating civilian penalty is
   replaced by the flat 5% / 5-point rule. (This also fixes a real bug: `shelled` was write-only —
   incremented, never decremented, never cleared by handOver — so a town's penalty latched at its
   cap permanently under either flag.)
5. The flat TROOP_BUILD { costGold: 25, days: 7 } and the flat troop upkeep of 1/day in
   UPKEEP_PER_DAY. Both now come from the troop type.
6. The "cannot assault while a fortress stands" check, wherever it lives.

================================================================
6. CODE
================================================================
  types.ts      Ship gains `bombardTicks?: number`. Facility gains `bombardDefense` and
                `invasionDefense`.
  troops.json   Rebuild. Rename offense/defense/watch to attack/invasionDefense/detection; add
                bombardDefense, costGold, days, upkeep, unlock. Delete crown-regulars, reef-guard,
                brethren-ships-company. Add fensworn, the-hushed, the-brethren, bog-witches,
                shoal-wardens.
  constants.ts  Add BOMBARD_TICKS_MAX 5, FORT/HEAVY bombardDefense 4/8, FORT/HEAVY invasionDefense
                30/60. Remove everything in section 5.
  fleets.ts     `fleetBombard` counts only ships afloat AND with ticks left — graceful degradation
                and correct reinforcement for free. `bombardError` gains "this squadron is out of
                shot" and "nothing here to fire on" as NAMED refusals; neither is a defeat and
                neither may read as one (§6). Replace `bombardRound` with the roll-and-cascade loop.
                Ticks +1 per ship per action, cleared on arrival in a friendly port.
  NEW           An invasion resolver beside the bombardment one, sharing the section 0 margin
                helper. One report per action listing losses on both sides.
  ai.ts         Must check `fleetBombard >= island_defense + smallest_defender` before starting a
                siege it cannot finish, compare landing Attack against defenders' Invasion Defense
                plus walls before committing, prefer bombarding first when it has the shot, and
                understand bombardment is now optional. Remove the `fleet.bombarding` early-return;
                `AI_SIEGE_DAYS` and `siegeWeightFor` assume a daily grind and need rework.
  UI            Five pips per ship for the magazine, never a number. Before committing, show whether
                the fleet can do anything at all. One report per action.

KEEP: the sequence gate in `bombardError` (their fleet, then the blockade, then the walls, then the
landing); rubble does not mend; and the political model — military fire cheap and local
(SHOCK_MILITARY_FIRE), civilian fire expensive and global. Conquest-versus-liberation stays
situational (SHOCK_LIBERATION_LEVEL 55) rather than hardcoded by faction, so the Crown is punished
for shelling a town that liked it, not for being the Crown.

================================================================
7. OPEN
================================================================
1. TROOP UPKEEP DROPS ABOUT FOURFOLD. Today every troop costs a flat 1 gold/day against a 25-gold
   price — 4% a day. These numbers put them on the 1% benchmark, so a militiaman goes from 1.0 to
   0.2 and standing armies get much cheaper to hold. If armies should stay expensive to hoard,
   double every upkeep figure in section 3.
2. THE ROSTER SCALE. Section 1's odds assume the CANONICAL ship roster. The live game still runs the
   legacy one in src/data/ships.json, where Majestic bombards at 24 rather than 12 and Cutlass at 2
   rather than 0 — so every fleet rolls roughly double and all the bombardment odds are wrong. The
   roster swap (directive 1 of the game audit) and these constants must land together.
3. NONE OF THIS IS IN THE COMBAT MASTER YET. Bombardment, invasion and troops all want new Parts,
   and Drive is still on v4.4.
