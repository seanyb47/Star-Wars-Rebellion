# The opening scroll

Sean, 22 September:

> Like how Star Wars has a text scroll at the beginning that sets up the world
> and the adventure. Let's do one for each side... one should sound like a
> Thomas Paine call to rebellion, another should be more of a nationalistic,
> imperialistic viewpoint... and the intro scroll should also include what the
> objectives are... I want to keep it as simple and good as possible. I should
> be able to come in with no knowledge. There's something about Star Wars — it's
> like a fifth grade reading level.

The copy lives in `src/data/opening-scroll.json`. The screen is not built.

## The rules the copy is written to

1. **One short sentence a slide.** Eight slides a side. A player scrolls; an
   image sits behind each line.
2. **Fifth-grade reading level.** Short declaratives, ordinary words, no clause
   a reader has to hold open. The Star Wars crawl is about eighty-five words
   total and names three things; ours names two — the Aldermain and Highwater.
3. **Both are skewed and neither lies.** Slides one to three are the same
   history in both mouths. The divergence starts at slide four, where the Crown
   says it is restoring a drowned country and the Confederacy shrugs at it.
4. **The same fire is in both**, at slide six: *"pirates burned the royal
   dockyard and called it freedom"* against *"three captains burned their
   dockyard, and we signed the articles a month later."*
5. **Slide seven is the objective**, phrased identically on both sides — *"hold
   them at the same time"* — because that is the actual victory condition and a
   new player needs it in one sentence. It carries `objective: true` and is the
   only slide the screen may style differently.

## What it must not say

- **The sea is not rising.** The Drowning finished long ago. A crawl that opens
  on the sea as a present danger is writing the Black Tide, which is cut.
- **Highwater is not a win on its own.** The Confederate slide says the two men
  are *in* Highwater, not that taking it ends the war, because it does not.
- **Neither faction is the villain.** The Crown's scroll is proud and makes a
  real argument; the Confederacy's is a Paine-style appeal to a way of life,
  not a grievance list.

## For whoever builds the screen

- Read the slides from `opening-scroll.json` by faction. Do not hard-code copy.
- Shown once after the faction pick, before day one, with a visible skip — and
  reachable again from the menu afterwards, the way "How to play" is.
- `art` is a slug under `src/art/scroll/`. Nothing is painted yet; fall back to
  the faction's drawn scene the way portraits and ships already do, so the
  screen ships before the art does.
- `brief` is the note for whoever paints it and is never shown to a player.
