# Master of the Seven Seas — Art Style

**Direction set 2026-09-12. Supersedes the engraved-chart direction below it,
which now governs only the interface layer.**

## 1. The direction

> Cinematic stylized historical realism — hand-painted trading-card
> illustration, authentic late-17th/18th-century maritime detail, strong
> readable silhouettes, dramatic natural lighting, textured brushwork, rich but
> weathered colours, romantic adventure atmosphere; approximately 80%
> historical realism and 20% dark nautical fantasy. Supernatural elements use
> restrained teal, spectral green, moonlit violet and unnatural fog. Never
> photorealistic, cartoonish, steampunk, high-fantasy, or overly magical.

That is the authoritative wording. It is repeated verbatim at the head of every
prompt in `art-prompts.md` so that images generated weeks apart still match.

## 2. Two layers

The game used to have one art system. It now has two, and the line between them
is not subject matter but **whether the thing has to change**.

**The painted layer** — portraits, ships, islands, dispatch scenes. Raster
illustration, made outside the repo, dropped into `src/art/`. This is what the
player looks *at*.

**The interface layer** — the chart, island marks, facility and ship icons,
allegiance bars, capacity pips, buttons, badges. Still drawn as SVG in code,
and staying that way, because every one of these has to do something a painting
cannot: tint by faction, seed itself from a name, scale from 30px to 96px, dim
when unreachable, light up under an overlay, and show state that changes every
day of the war. This is what the player *reads*.

A painting is a fixed image. Anything that must respond to the simulation stays
drawn. That rule decides every case, and it is the reason the map will never be
painted even though the islands on its panels will be.

## 3. They coexist, permanently

`src/ui/painted.ts` finds whatever is in `src/art/` at build time. A subject
with a painting uses it; a subject without keeps its drawn cameo. No manifest,
no registration, no flag day. The art arrives in whatever order it is made and
the game is never half-finished in between.

This is not a migration with an end date. Twenty-six portraits will be painted;
the twenty-seventh character added after that will have a drawn cameo the day
they are added, and may keep it. Both layers are permanent.

## 4. The frame

Painted art does not sit on white. It sits inside the interface the title
screen already establishes, and it has to belong there:

| | |
|---|---|
| ground | `#06161d` — deep water, near-black |
| raised | `#0d222c` — panels and cards |
| rule | `#1c3b48` |
| brass | `#c9a227` — instruments, accents, anything notable |
| Imperium | `#3f9e58` green · **Confederacy** `#d8483f` red · **unaligned** `#5aa2e0` |

Consequences for the paintings, all of them load-bearing:

- **Dark key.** Art that is bright overall floats off the page. Low sun, night,
  overcast, lantern light.
- **Faction colour belongs in the subject.** An Imperial coat is sea-green and a
  Confederate sash is red, because the interface reads allegiance by colour and
  a painting that ignores it fights the panel around it.
- **Portraits are cropped to a circle** as small as 32px. Head large in frame,
  nothing important near a corner.
- **Dispatch scenes get a quiet sky.** The card tints itself in the colour of
  whichever side the news concerns; a strong sky of its own will fight the tint.

## 5. What survives from the drawn direction

These were written for the flat style and still hold, for both layers:

1. **The silhouette test.** Flat black, at ship size, side by side. If two
   things are not tellable apart, they are not finished. This is why the prompts
   ask for strong readable silhouettes — it is the same requirement in a
   different medium.
2. **Faction colour means faction.** Never decoration, never status.
3. **Draw it at the size it ships at.** A 512px portrait judged at 512px will
   disappoint at 32px. Judge at 32.
4. **Ship silhouettes differ by hull, not mast count.** At 32px a mast is one
   pixel. The contact sheet found this in the drawn ships; painting them does
   not fix it, so the prompts say so explicitly.
5. **Variation is seeded, never hand-placed** — for the drawn layer. A painting
   is fixed by definition, which is why islands are painted by archetype and
   shared rather than one per island.

## 6. What is retired

These governed the flat style and **do not apply to painted assets**. They still
govern the interface layer.

- ~~Flat, no gradients on objects~~ — painted art is rendered by definition.
- ~~Two fills inside an outline, maximum~~ — interface only.
- ~~No facial features~~ — this was right for procedural cameos, where features
  land in the uncanny valley, and it is wrong for painted portraits, where a
  face is the whole point. The drawn cameos keep the rule.
- ~~One light source that never moves~~ — replaced by "dramatic natural
  lighting" for paintings. The interface keeps upper-left.

## 7. The ink ramp (interface layer)

Five inks. Every drawn thing uses only these, plus the faction hues and brass.

| name | hex | what it is |
|---|---|---|
| `ink-black` | `#0a1116` | outlines, night, the darkest thing on screen |
| `ink-dark` | `#1d2b33` | shadow side, hats, recesses |
| `ink-mid` | `#5c7078` | rope, rigging, anything structural |
| `ink-pale` | `#a9bcc2` | lit planes |
| `ink-bone` | `#e8e2d1` | sail, skin, paper, the brightest thing |

**A colour comes from a token. Always.** There are still 44 ad-hoc hexes in the
UI against 14 named ones; that is the outstanding cleanup.

## 8. Files and weight

Naming, folders and formats are in `src/art/README.md`. Prompts for all 51
subjects are in `art-prompts.md`, in the order worth making them: scenes,
islands, ships, then portraits.

**Sizes.** Portraits 512×512 · ships and islands 768×512 · scenes 1024×432.
WebP, quality ~82, **under 120KB each**.

**The budget is the real constraint.** The whole game is ~95KB gzipped and
loads instantly on a phone. Fifty-one paintings at 100KB is roughly 5MB — fifty
times the game. Lazy loading has to be built before the portrait batch lands,
not after, and that is the one piece of engineering this direction actually
requires.

## 9. Lessons already paid for

Rules that exist because something was drawn wrong once. All still true.

- **CSS overrides SVG presentation attributes.** A `stroke-width` in the
  stylesheet beats one on the element.
- **A linear gradient across an ellipse leaves a hard rim** and draws as a dome.
  Glows are radial.
- **A head needs a real gap from its shoulders**, or a crowd reads as a row of
  tombstones.
- **Put the thing in the hand, not beside it.**
- **A sky that is already a colour leaves no room for the colour that means
  something.** The dispatch tint did nothing for months because the sky faded to
  a saturated teal. This is now a rule for the painted scenes too (§4).
- **Two identical SVG gradient ids on one page means the second is dropped.**
- **An empty socket must be visible against what is behind it.**
- **A bitmap written as strings gets no type checking.** One stray letter paints
  a pixel in `undefined`, which renders black and looks deliberate.
- **Judge art at 200%, not only at ship size.** Four separate portrait faults —
  a moustache that read as a grin, spectacles that read as eyes, tusks that read
  as a skull, epaulettes that read as sticky notes — were all invisible in a
  44px grid and obvious when magnified.

## 10. Where to look

| page | what it shows |
|---|---|
| `?art` | the contact sheet — every drawn asset, at every size, on the real ground |
| `?art=style` | three inkings of the flat style (historical; the direction moved on) |
| `?art=gallery` | four whole style families on a person, a ship and an island (historical) |

The last two are kept rather than deleted: they record why the flat styles were
considered and what each looked like, which is worth more than the disk space
if the painted direction ever has to be reconsidered.
