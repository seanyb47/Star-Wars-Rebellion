# Advanced buildings, and putting buildings on the research ladder

Sean, 22 September, thinking aloud about why nobody ever builds a Sovereign:

> The time that it takes to build those early game when you only have like one
> shipyard is not feasible to build those behemoth ships. What you really need
> is a place with a bunch of shipyards. You need multiple shipyards and you
> probably need to upgrade them. We haven't gotten into this yet, but one of the
> things we want to do is be able to upgrade facilities to advanced versions of
> themselves... facility research and development needs to be in there too. So
> like things like unlocking heavy fortress, unlocking advanced shipyards,
> advanced troop training facilities — those three items need to be in the
> roster.

This is the spec for that. Nothing below is built.

---

## 1. Half of it already exists, and it is worth knowing which half

**The gate exists.** `FACILITY_CRAFT` in `constants.ts` maps a building to the
craft grade it needs, and it has exactly one entry: `heavy_fort` at grade 1.
That came from Sean's 17 September ruling — *"Heavy Fortress needs to be gated
by Research mission"* — and it is the whole mechanism this spec needs. Adding
two more buildings to that record is a two-line change; the design work is
deciding which rung and what the building does.

**The second tier exists, twice.** `fort` → `heavy_fort` is already a
two-rung wall, and `mine` → `silver_mine` is already a two-rung earner (the
type's own comment calls silver *"the middle rung"*). So the roster already
knows how to have a better version of a thing.

**What does not exist** is an advanced shipyard, an advanced barracks, and any
statement about whether an upgrade replaces a building or stands beside it.

## 2. The one real design question: replace, or build alongside?

On **16 September** Sean ruled on this for the walls, and ruled the other way:

> One is a Fortress the other is an Advanced Fortress... Let's call them
> Fortress and Heavy Fortress.

and the implementation note records the consequence — *"a second tier rather
than an upgrade in place, which was his call."* The reasoning was the berth: an
island has a fixed number of plots, so a Heavy Fortress is a **decision about
land**, not a free improvement. Land-poor and rich, you build the heavy one.
Land-rich and thrifty, you build two ordinary ones.

On **22 September** he has said "upgrade facilities to advanced versions of
themselves", which reads as replacement in place.

**These can both be true and I think they should be.** The proposal:

- An advanced building is **a separate type that occupies one plot**, exactly as
  Heavy Fortress does today. The land decision survives.
- Raising one **on a plot that already holds its basic version** is an
  *upgrade*: it costs the difference in gold, takes the difference in days, and
  the old building keeps working until the day the new one is finished.
- Raising one **on an empty plot** is a *build*: full price, full time.

That gives him the word he used and keeps the decision the earlier ruling was
protecting. It also matters more than it sounds, because of the yard-count rule
below: an island with three slipways that can upgrade them one at a time never
has to stop building ships to improve its ability to build ships.

## 3. The three buildings

### Advanced Shipyard — the important one

Build time already divides by how many yards of that kind stand on the island,
asked fresh every morning. That rule is what makes the Majestic's twelve hundred
days a *price in shipyards* rather than a wait, and it is the reason Sean is
asking for this: a Sovereign at one slipway is seven hundred days and nobody is
ever going to do that.

So the mechanic writes itself. **An Advanced Shipyard counts as two slipways for
the divisor.** Not "halves the time" as a separate multiplier — it counts as
two, so it composes with everything already there and needs no new arithmetic.

An island with three advanced yards builds a Majestic in two hundred days
instead of four hundred, and a first rate stops being a thing you read about.

| | Shipyard | Advanced Shipyard |
|---|---|---|
| Cost | 150 | **400** |
| Days | 84 | **200** |
| Upkeep | 4 | **9** |
| Counts as | 1 slipway | **2 slipways** |
| Craft grade | — | **3** |

Priced deliberately worse than two ordinary yards on every axis except the one
that matters: it costs more than two slipways (400 against 300), takes longer
than two (200 against 168), and costs more to keep (9 against 8) — but it does
it **on one plot**. Same bargain as the Heavy Fortress, same reason.

### Advanced Barracks

A troop is fast and a hull is slow, so the barracks upgrade should not be about
speed. The two things worth buying are **what** you can raise and **how much
lift the island has**:

- It raises the island's native and elite companies where an ordinary barracks
  raises line and sailors. (`troopBuildAt` already asks the island what it can
  raise; this becomes the second thing it asks.)
- It counts as two barracks for the build divisor, as above.

| | Barracks | Advanced Barracks |
|---|---|---|
| Cost | 80 | **220** |
| Days | 56 | **130** |
| Upkeep | 2 | **5** |
| Craft grade | — | **4** |

### Heavy Fortress — already built, wrongly placed

It is gated at **craft grade 1**, and grade 1 used to be a hundred progress —
*"one officer, three or four cycles in your own yards"*. Since the ladder was
rescaled on 21 September to eight rungs and a 1,560 ceiling, **grade 1 is 120
progress and arrives on a median of day 110**. That is almost exactly where it
was, so nothing is broken — but it means the one building on the ladder sits on
its bottom rung, and the ladder now has eight.

Proposal: leave it at grade 1. It is the *first* thing research buys, it is
cheap, and having something arrive early is what makes a player believe the
ladder is worth climbing.

## 4. Where they sit on the ladder

Eight rungs, arriving on measured medians of day 110 / 174 / 243 / 300 / 390 /
465 / 675 / 945 for a side that keeps somebody in the yards from day one.

| Rung | Median day | What it buys |
|---|---|---|
| 1 | 110 | **Heavy Fortress** (already) |
| 2 | 174 | first ship unlocks |
| 3 | 243 | **Advanced Shipyard** |
| 4 | 300 | **Advanced Barracks** |

Advanced Shipyard at rung 3 is the load-bearing choice. It lands around day 240;
a yard raised then still has six or seven hundred days of war to pay itself
back, and it is early enough that "go and build the infrastructure first" is a
real opening rather than a thing you regret. Much later and the answer is always
"just build more hulls".

**The one thing to watch when this is built**: research is an officer standing
in a yard for fifteen days at a time, and these three buildings put a second
claim on the same ladder that the ships are on. Measure how the rung a side
reaches moves once buildings are competing with hulls for it. If both sides
simply arrive later at everything, the ladder wants widening rather than the
buildings wanting moving.

## 5. What this fixes, in Sean's own terms

> Realistically you're never going to make one. You could try, but like
> realistically, you're not. You're going to build other stuff.

That is true today and it should stay true **on day one**, and stop being true
by day five hundred. The Sovereign is not meant to be a ship you build; she is a
ship you *have*, and the lore now explains why — the Crown's royal dockyard at
Yarrow Minor was blown up the season the war started, which is exactly why the
Imperium opens with ships of the line and two slipways.

So the arc the three buildings are for is: **you start unable to replace what
you were given, and the way you earn the right to build behemoths is by
rebuilding the industry that made them.** That is a better first act than any
number on a hull.

## 6. Open, and Sean's to settle

1. Whether upgrading in place should refund or credit the old building at all,
   or simply cost the difference as proposed here.
2. Whether an advanced yard counting as two slipways should stack without limit
   — three advanced yards being six — or whether an island should cap out.
3. Whether the Confederacy gets the same three buildings or its own. The Crown
   standardises and the Confederacy improvises, and "advanced shipyard" is a
   very Crown sentence. A Confederate equivalent that grows hulls rather than
   building them faster would say more about the two sides than a shared list.
