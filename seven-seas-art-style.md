# Master of the Seven Seas — Art Style

**Direction set 2026-09-12, revised the same day against the faction style
guide. Supersedes the engraved-chart direction, which now governs only the
interface layer.**

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

**Register: heroic adventure, not grim.** The style guide's own cards settle
this. Skies are blue, water is turquoise, sunlight is warm, faces are appealing
rather than weathered, and one of the cards is a cat in a tiny hat. The 20%
fantasy is where the dark lives — the Kraken, a ghost ship, a drowned temple —
and it is restrained: teal, spectral green, moonlit violet, unnatural fog, no
gore and no horror. Everything else is an adventure story.

## 1a. The two factions

Not colour-coded sides. Two arguments about how to live, each of which believes
itself the decent one, and the art has to sell both.

|  | Crown Imperium | Free Confederacy |
|---|---|---|
| crest | gold crown over a waved shield | skull and crossed cutlasses on a starburst |
| creed | Order · Stability · A Brighter Tomorrow | Freedom · Opportunity · No Masters |
| motto | *Through trade, duty, and discipline, a safer world.* | *A wider world for those bold enough to take it.* |
| look | white stone, blue sky, immaculate uniforms, tall ships in line | lantern light, patched canvas, crowded quays, colour everywhere |

Footer of the guide, and the line the whole thing hangs on: **Different crews.
The same horizon.**

**Settled 2026-09-12: the guide wins, and the bible moved to it.** The world
bible was pitched grimmer — "order bought with cruelty", "half the Moot worth
hanging" — and has been retuned to this register, along with the faction blurbs
on the title screen.

What changed is pitch, not moral complexity. The bible's rule that every named
character carries one admirable trait and one ugly one is untouched, because it
says the same thing the guide's footer does: neither side is the villain. The
ugly halves are now overreach, appetite and stubbornness rather than atrocity —
conscription rolls that fall hardest on the smallest islands, not press gangs
emptying villages; captains who signed the articles one step ahead of a warrant,
not slavers.

**The darkness moved rather than left.** It now lives where this guide says it
should: the Black Tide, the kraken, the drowned temple, the ghost ship. A world
whose people are decent and whose sea is not is a better setting than one where
everybody is compromised, and it is the one the art is being made for.

## 1b. Faction palettes

Sampled from the guide's own swatch strips rather than eyeballed.

**Crown Imperium** — deep sea-greens, olive, cream, tarnished gold.

`#f0dbbe` cream · `#2f634d` sea-green · `#254b36` deep green · `#596840` olive ·
`#635d37` brass-olive · `#122f23` shadow green

**Free Confederacy** — a red ramp, coral down to near-black maroon.

`#ca6150` coral · `#a03832` red · `#772321` deep red · `#6b121e` crimson ·
`#5d292d` maroon · `#402e30` warm grey-brown

**These are illustration colours, not interface colours.** `#2f634d` is
handsome in a painting and nearly invisible as a 12px badge on a near-black
panel. The UI keeps brighter members of the same families (`--empire #3f9e58`,
`--alliance #d8483f`) so a status colour still reads at a glance. Same hue
family, different luminance, on purpose.

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

## 4. The card, which is the frame

The guide answers a question I had got wrong. I had written that paintings must
be dark-key, because the interface ground is near-black and bright art floats
off it. The guide's art is the opposite — blue skies, turquoise water, white
stone in sunlight — and it works, because **every image sits inside a card**.

That is the device, and it is not decoration. A bright painting on a dark page
looks like a hole cut in the page; the same painting inside a frame with a
title bar above it and a caption bar below it reads as an object lying on the
page. The frame is what buys the brightness.

**So the rule is reversed: paint it bright, and build the frame.** Four parts,
in the guide's own order:

1. **Crest badge**, top-left corner, overlapping the frame — the faction's, or
   a category mark for anything unaligned.
2. **Title bar** — the subject's name, small caps, on parchment.
3. **The painting**, with an italic line of the subject's own voice sitting at
   its foot: *"Discipline carries farther than the wind."*
4. **Type bar** — `TYPE · SUBTYPE` in small caps. Warship · Imperium. Island ·
   Natural. Creature · Mystical.

The frame is an **interface** component, drawn in code, not part of the
painting. That keeps it tintable, keeps every card identical, and means a
painting that has not arrived yet can be framed exactly like one that has.

### The taxonomy the type bar reads from

The guide implies a card system the game does not have yet, and it is worth
adopting because it makes the art self-describing.

| type | subtypes seen |
|---|---|
| Warship, Ship | Imperium · Confederacy · Supernatural |
| Leader, Character | Imperium · Confederacy |
| Facility | Imperium · Confederacy · Resource |
| Island, Port City, Location | Natural · Imperium · Confederacy · Mystical · Supernatural |
| Creature | Natural · Companion · Mystical |

### Portraits: one painting, two crops

The guide's characters are **three-quarter figures with a background** — Admiral
Ellis at the rail, Drake with a parrot, Rynn with a spyglass. The game shows
portraits in a **circle at 32–44px**, where a three-quarter figure is a smudge.

Both are right, so the painting serves both: it is made as card art, and the
medallion crops to the head. That works only if the head is placed for it, so
it is a requirement on every character prompt — **head and shoulders in the
upper 45% of the frame, horizontally centred, nothing important behind them
there.** The medallion takes that band; the card shows the whole figure.

### What the interface still demands of the art

- **Faction colour in the subject.** Imperial coats sea-green, Confederate
  sashes red. The interface reads allegiance by colour and a painting that
  ignores it fights the panel around it.
- **Dispatch scenes keep a quiet sky.** These are the one thing that is *not*
  framed as a card — they run full-bleed across the top of the dispatch, and the
  card tints itself in the colour of whichever side the news concerns. A strong
  sky of its own will fight the tint.
- **Strong silhouette, always.** It is in the direction line for a reason: it is
  what survives being shrunk to a thumbnail.

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
- ~~Dark key; art that is bright overall floats off the page~~ — **written by me
  and wrong.** It was a correct reading of a bright painting dropped straight
  onto a near-black page, and the wrong conclusion: the fix is the card frame,
  not a darker painting. See §4.
- ~~Portraits are head-and-shoulders, cropped to a circle~~ — they are
  three-quarter figures, cropped to a circle *at the head*. See §4.

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

Naming, folders and formats are in `src/art/README.md`. Prompts for all 66
subjects are in `art-prompts.md`, in the order worth making them: scenes,
islands, creatures, ships, facilities, then portraits.

The guide adds two subject classes the game did not have. **Creatures** — a sea
turtle, a ship's cat, a young sea dragon, a kraken, a ghost ship — give the
Seven Seas a natural world as well as two navies, and set the register faster
than anything else on the list. **Facilities get faction variants**: the same
five buildings, built twice, because a Crown shipyard under a covered slip and
a Confederate one in a hidden cove are the clearest single statement of what
the two sides are.

**Sizes.** Characters 640×896 (three-quarter figure) · ships, islands,
facilities and creatures 768×512 · dispatch scenes 1024×432. WebP, quality ~82,
**under 120KB each**.

**Do not paint borders, frames or text.** The card frame is an interface
component (§4). A painting with its own frame baked in cannot be reframed,
retinted or resized.

**On weight, a correction.** I wrote earlier that sixty-six paintings would be
6.5MB "against a 95KB game", and that lazy loading was needed to stop the first
load collapsing. Building it showed that was wrong in an important way.

Vite emits the paintings as **separate asset files**, not bundled into the
JavaScript — the bundle only carries their URLs. Nothing is downloaded until
something on screen references an image, so the initial load was never going to
be 6.5MB and the app still starts in ~95KB however much art exists.

The real cost is narrower and still worth paying for: **one screen that renders
the whole cast at once.** The crew list asks for twenty-six paintings in a
single go, which on a slow connection is megabytes for a list you are about to
scroll past. So portraits now load only when their medallion comes near the
screen, and the drawn cameo is the placeholder until then — right size, right
shape, already correct, no blank boxes and no layout shift.

Per-screen thrift, not bundle thrift. Keep files **under 120KB** anyway: it is
the difference between a card appearing and a card arriving.

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
