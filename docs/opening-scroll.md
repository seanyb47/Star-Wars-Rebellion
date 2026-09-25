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

1. **One or two sentences a slide, one theme each.** Nine slides a side. Sean,
   22 September: *"I'm not married to the whole one sentence thing, but it
   should be just one little theme."* A player scrolls; an image sits behind
   each.
2. **Fifth-grade reading level.** Short declaratives, ordinary words, no clause
   a reader has to hold open. The Star Wars crawl is about eighty-five words
   total and names three things; ours names two — the Aldermain and Highwater.
3. **Each side makes its own case and only its own.** Sean's correction of 22
   September: *"we don't need to make the other side's case for them. So we
   don't need to say things like, they say this, we say that. We just take our
   stance on our side."* The Crown never mentions what the Confederacy wants.
   The Confederacy never repeats the Crown's argument about a golden age — it
   disavows them and moves on. The one thing both scrolls contain is the
   Drowning, because neither side disputes that it happened.
4. **The same fire is in both**, from opposite decks: *"pirates burned our
   greatest shipyard and named themselves enemies of the Crown"* against *"our
   first blow burned their greatest shipyard to the waterline."*
5. **The second-to-last slide is the objective.** It carries `objective: true`
   and is the only slide the screen may style differently.

## The objective slides now match the code

Settled 22 September. Sean: *"we can make the win condition capturing both the
grand admiral and the young imperator."* `CROWN_PRINCIPALS` is now the Imperator
and Grand Admiral Corvane, so the Confederate slide is literally true.

The Crown's slide says *"round up their leaders — all three of them, and all at
once"*, which is `allLordsTaken` in plain English. Freeport and the hidden port
are **not** win conditions and the scroll no longer implies they are.

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
