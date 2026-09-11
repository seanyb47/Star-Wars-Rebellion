# Master of the Seven Seas — Art Style

The rules the drawings follow. Short on purpose: a style is a list of things
you refuse to break, not a mood board.

The name for it is **engraved chart**. Woodcut and scrimshaw are two hundred
years old and still legible — bold shapes, few inks, no rendering. It suits
the fiction, it is cheap to draw, and it cannot date, because it already did
and survived.

Everything is SVG generated in code. There are no image files and no audio
files, and that is not changing for anything that tints, seeds, or repeats.

---

## 1. Two registers, decided by distance

The single most important rule, and the one that explains every apparent
inconsistency in the game's art.

**Far register** — dispatch scenes, the chart, anything behind or around.
One ink, solid shapes, no interior detail, no outline. Silhouettes against a
lit sky. This is atmosphere: it should read in a glance and never ask to be
looked at.

**Near register** — portraits, icons, marks, anything you can tap.
Heavy dark outline, two flat fills inside it, faction colour carried in the
fill rather than in a ring around it. This is identity: it has to survive at
32px on a phone in daylight.

A thing is drawn in the register of its distance, never of its type. The same
ship is a silhouette on the horizon of a dispatch card and an inked mark in a
harbour list, and that is correct.

## 2. The ink ramp

Five inks. Every drawing uses only these, plus the three faction hues and
brass. Nothing else gets a colour.

| name | hex | what it is |
|---|---|---|
| `ink-black` | `#0a1116` | outlines, night, the darkest thing on screen |
| `ink-dark` | `#1d2b33` | shadow side, hats, recesses |
| `ink-mid` | `#5c7078` | rope, rigging, anything structural |
| `ink-pale` | `#a9bcc2` | lit planes |
| `ink-bone` | `#e8e2d1` | sail, skin, paper, the brightest thing |

Faction hues stay as they are: `--empire` green, `--alliance` red, `--neutral`
light blue, `--brass` for anything interactive or notable.

**A colour comes from a token. Always.** The game currently has 44 ad-hoc
hexes against 14 named ones; that is the drift this rule exists to stop.

## 3. The rules

1. **Flat.** No gradients on objects, ever. Gradients are for atmosphere only —
   a sky, a glow, a reflection — and never for shading a thing.
2. **One light source, and it never moves.** Upper left. A set of drawings lit
   from different directions stops looking like a set.
3. **Two fills inside an outline, maximum.** A third is rendering, and
   rendering is what dates.
4. **The outline is `ink-black`, and it is heavy** — 3 units at a 64 viewBox.
   Never a hairline, never pure `#000`.
5. **Faction colour means faction.** Never decoration, never status. `--good`
   and `--bad` stay clear of the faction hues so a badge never reads as news.
6. **Draw it at the size it ships at.** A drawing designed at 200px and shrunk
   is a smudge. If it ships at 30, it is designed at 30.
7. **No facial features.** No eyes, no mouths, no expressions. Identity lives
   in the outline. This is the rule that makes 26 portraits affordable and the
   one most likely to be broken by accident.
8. **Variation is seeded, never hand-placed.** The same name always draws the
   same person.

## 4. The acceptance test

**Flat black, at ship size, side by side.** If two things are not tellable
apart as pure silhouettes, they are not finished — no amount of shading above
will rescue them. Old sprite sets built a television segment out of this test;
it is not a joke, it is the whole method.

The contact sheet (`?art`) has a row for it. Nothing ships without passing.

## 5. Portrait vocabulary

Three inputs, and nothing is random that could be meaningful:

**People decides the body.** Build, head shape, and whatever the head has on
it that a human's does not.

| people | build | head |
|---|---|---|
| Human | 1.0 | plain |
| Human (once) | 0.95 | plain, and unnaturally still — no hair, high collar |
| Urskin | 1.45 | broad, tusks, ears set wide |
| Reef-folk | 1.05 | swept crest of three fins |
| The Hushed | 0.7 | narrow, hooded, eel-thin neck |
| Shoal-folk | 0.75 | small, large round ears |
| Bog-folk | 1.1 | heavy brow, wrapped throat |
| The Rumor Guild | 0.95 | plain, with a scholar's flat cap |

**Rank decides the headgear**, read from the title in the name.

| title | headgear |
|---|---|
| Lord Regent, Governor | coronet and a high standing collar |
| Admiral, Commodore | bicorne, worn athwart |
| Captain | tricorn |
| Colonel | shako |
| Doctor | bare, with a scholar's collar |
| The Widow | veil |
| no title | seeded: bandana, watch cap, or bare |

**The name decides the rest** — hair mass, beard, collar, one accessory —
seeded from a hash so it is stable for the life of a save.

## 6. Lessons already paid for

Rules that exist because something was drawn wrong once. Each cost a bug.

- **CSS overrides SVG presentation attributes.** A `stroke-width` in the
  stylesheet beats one on the element. Put chart sizes in the stylesheet or
  set them inline, and never assume an attribute won a fight it did not.
- **A linear gradient across an ellipse leaves a hard rim** and the whole
  thing draws as a dome. Glows are radial.
- **A head needs a real gap from its shoulders.** Drawn any closer, a figure
  merges into a rounded block and a crowd reads as a row of tombstones.
- **Put the thing in the hand, not beside it.** If an arm is raised, work out
  where it ends and draw there.
- **A sky that is already a colour leaves no room for the colour that means
  something.** The dispatch tint did nothing for months because the sky faded
  to a saturated teal.
- **Two identical SVG gradient ids on one page means the second is dropped.**
  Derive ids from everything that varies, tint included.
- **An empty socket must be visible against what is behind it.** Capacity pips
  were invisible over water until they were given their own dark fill.
