# The opening: three screens, all skippable

Sean, 22 September, and the first sentence is the design constraint:

> I hate being forced to listen to shit. Sometimes I just want to play the game.

So the opening is three stages, each one a **full-bleed screen, top to bottom,
nothing else showing**, and each one has a visible Skip. A veteran can go
Next — Skip — Skip and be playing in three taps.

```
  faction pick
       │
       ▼
  1. WAR HAS BEGUN        full screen · [Next]
       │
       ▼
  2. THE SCROLL           full screen · [Next ×9] [Skip]
       │
       ▼
  3. THE TUTORIAL         over the live game · [Next ×9] [Skip]
       │
       ▼
  day one, paused
```

## 1. War has begun

One card. The title, the faction's creed under it, and a Next. It is the
curtain going up and it should take one second to read. This is roughly what
the game does today; what changes is that it goes **full-bleed** rather than
sitting in a panel with the interface visible behind it.

No Skip on this one — there is nothing to skip, and a lone Next teaches the
player that this flow moves forward on a tap.

## 2. The scroll

Nine slides, from `src/data/opening-scroll.json`, keyed by the side they picked.
One or two sentences a slide, one theme each, an image behind. Full bleed.
**Skip is visible on every slide**, including the first — the whole point is
that a returning player never has to sit through it twice.

The slide with `objective: true` is the only one the screen may style
differently. It states the real victory condition and it is the one slide a
skipping player arguably should still see; a design worth trying is that Skip
from any slide jumps *to* the objective slide the first time and exits on the
second press. That is a suggestion, not a requirement.

## 3. The tutorial

**This is the stage that changes.** Sean:

> The tutorial basically takes you off the full screen imagery and replaces it
> with the actual game interface and walks you through the entire screen,
> highlighting each component, each thing you click on, the very very simple
> basics on how things work. And then where to go to the encyclopedia, the
> glossary, the rules.

So it is a **coach mark over the live game**, not a stack of cards about it.
The board is behind, real and in its day-one state; one element is highlighted
at a time; a small card near it says what that thing is. Next walks the tour.
Steps are in `src/data/tutorial.json`.

**What has to be built:**

- `data-tour` attributes on the elements the steps name — `map`, `tabbar`,
  `clock`, `island`, `crew`, `build`, `book`, `info`, `log`. Adding them is part
  of this job.
- A highlight: a cutout or ring around the target with the rest dimmed, and the
  card placed so it never covers its own target.
- **A step whose target is not in the DOM is skipped silently.** That way
  rearranging a screen degrades the tour instead of breaking it.
- Skip on every step, and it must be visible on the last step too — the current
  `Tutorial.tsx` renders an empty label there (`{last ? '' : 'Skip'}`) and
  leaves a live 44px button with nothing drawn in it.

**What to throw away:** the seven paragraph cards in `Tutorial.tsx`. They
explain where they should point, and one of them is actively wrong — the
"How you win" card still tells the player that taking or losing Highwater ends
the war that day. It has not since the two-principals rule, and it is the most
misleading sentence in the game. The corrected copy is the last step in
`tutorial.json`.

## Rules for all three

1. **Full bleed.** Top to bottom, no chrome, no tab bar, no top rail. Stages 1
   and 2 cover the game; stage 3 is deliberately transparent to it.
2. **Skip always works and always shows.** A skip at any stage drops you into
   day one, paused.
3. **Shown once**, on a first game, then never again unless asked for. The
   existing `localStorage` gate (`seven-seas.taught.v2`) is the right idea;
   bump the key when the flow changes so returning players see the new one once.
4. **Reachable afterwards.** All three from the menu, the way "How to play"
   already is. Somebody who skipped should be able to find what they skipped.
5. **Nothing in the flow may lie about a rule.** Every sentence about winning,
   losing or timing is checked against the code, because a tutorial is the one
   place a player has no way to know it is being told something stale.
