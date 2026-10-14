# Battle thumbnails — the combat screen

**These are thumbnails, not paintings.** They are shown small, read in about a
second, and their entire job is to make the outcome obvious before anybody has
read the headline. Every prompt below says so to the model, in those words,
because the first draft of this file asked for three ships a side and boats
picking men out of the sea — which at the size the game draws it is brown mush.

The rule for all six: **one subject, very large, at most two objects in the
frame.** If the image cannot survive being reduced to a black shape on white,
it is the wrong image.

## How many you need: six, not ten

The flow has five states, and one per side gives ten. **Four of those are the
same picture twice.** *Victory!* for the Crown and *Defeat* for the
Confederacy are one event — a Crown ship standing, a Confederate ship going
down — and at thumbnail size there is no room for the camera to take a side.
Same for the two flee endings.

| Painting | Serves |
|---|---|
| 1. **The hail, Crown** | the opening screen, Crown player |
| 2. **The hail, Confederacy** | the opening screen, Confederate player |
| 3. **Crown triumphant** | *Victory!* (Crown) and *Defeat* (Confederacy) |
| 4. **Confederacy triumphant** | *Victory!* (Confederacy) and *Defeat* (Crown) |
| 5. **Crown running** | *You have fled* (Crown) and *Your enemy has fled* (Confederacy) |
| 6. **Confederacy running** | *You have fled* (Confederacy) and *Your enemy has fled* (Crown) |

Six paintings can each be better than ten can, and at this size the extra four
would buy nothing a player would ever notice.

## The slot

A new art folder, `battles`, at **768 × 432** — sixteen by nine, because this
is the one image in the game that fills the screen instead of sitting in a card
or a strip. Add it to `FOLDERS` in `scripts/art.py` beside `creatures` before
running `art:add`.

---

## 1. The hail — Crown Imperium

*the opening screen, Crown player*

`battles/hail-crown.png`

> A single Crown Imperium warship bearing down, three-quarter bow view, very large and filling the frame, sails full and every gunport open along her side. Far off on the horizon, one small crimson sail — the enemy, and nothing else. Clean sky, open water, no other ships. The meaning is: **we are about to fight**. Crown livery: warm-ivory sails, deep Imperial-green accents, antique brass, black iron; clean, symmetrical, regulation; one gold crown over a fouled anchor with a compass star. No coral anywhere. One longitudinal centreline per hull: keel, bow, stern and bowsprit aligned, masts plausible. THIS IS A THUMBNAIL, NOT A PAINTING. It is shown small and read in about one second, so it must say what it means instantly. One subject, very large in the frame, filling most of the height. At most two objects in the whole image. No crowds, no boats, no floating debris, no background detail, no incidental storytelling. Strip out anything that is not the one thing this image is about. A viewer who cannot read the title must still know what happened. Silhouette first: if you reduce the image to a black shape on white it should still be obvious. 16:9 landscape; nothing that matters in the outer eighth, since the game prints a title across the top and a button across the bottom. No borders or text. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish.

## 2. The hail — Free Confederacy

*the opening screen, Confederate player*

`battles/hail-confederacy.png`

> A single Free Confederacy ship bearing down, three-quarter bow view, very large and filling the frame, patched sails full and her crew visible at the rail. Far off on the horizon, one small ivory-and-green sail — the enemy, and nothing else. Clean sky, open water, no other ships. The meaning is: **we are about to fight**. Confederate livery: crimson and rust red, black, weathered wood, brass and cream; patched or dyed sails, unusual rigging, nothing standardized, never villainous; one skull in a red headscarf over crossed cutlasses with a compass star. One longitudinal centreline per hull: keel, bow, stern and bowsprit aligned, masts plausible. THIS IS A THUMBNAIL, NOT A PAINTING. It is shown small and read in about one second, so it must say what it means instantly. One subject, very large in the frame, filling most of the height. At most two objects in the whole image. No crowds, no boats, no floating debris, no background detail, no incidental storytelling. Strip out anything that is not the one thing this image is about. A viewer who cannot read the title must still know what happened. Silhouette first: if you reduce the image to a black shape on white it should still be obvious. 16:9 landscape; nothing that matters in the outer eighth, since the game prints a title across the top and a button across the bottom. No borders or text. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish.

## 3. Crown triumphant

*Victory! (Crown) · Defeat (Confederacy)*

`battles/victory-crown.png`

> One Crown Imperium warship standing whole and upright in the foreground, very large, colours flying, her sails holed and her side scarred. Directly behind her, one Confederate ship going down — heeled right over, masts falling, crimson sails collapsing into the water, burning. Two ships and nothing else: no wreckage, no boats, no third vessel. The meaning is: **the Crown has destroyed the Confederate fleet** — and read the standing ship as battered, because winning costs. Crown livery: warm-ivory sails, deep Imperial-green accents, antique brass, black iron; clean, symmetrical, regulation; one gold crown over a fouled anchor with a compass star. No coral anywhere. The sinking ship is Confederate: crimson, rust red, patched sails. One longitudinal centreline per hull: keel, bow, stern and bowsprit aligned, masts plausible. THIS IS A THUMBNAIL, NOT A PAINTING. It is shown small and read in about one second, so it must say what it means instantly. One subject, very large in the frame, filling most of the height. At most two objects in the whole image. No crowds, no boats, no floating debris, no background detail, no incidental storytelling. Strip out anything that is not the one thing this image is about. A viewer who cannot read the title must still know what happened. Silhouette first: if you reduce the image to a black shape on white it should still be obvious. 16:9 landscape; nothing that matters in the outer eighth, since the game prints a title across the top and a button across the bottom. No borders or text. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish.

## 4. Confederacy triumphant

*Victory! (Confederacy) · Defeat (Crown)*

`battles/victory-confederacy.png`

> One Free Confederacy ship standing whole and upright in the foreground, very large, colours flying, her patched sails holed and her side scarred. Directly behind her, one Crown Imperium warship going down — heeled right over, masts falling, ivory sails collapsing into the water, burning. Two ships and nothing else: no wreckage, no boats, no third vessel. The meaning is: **the Confederacy has destroyed the Crown fleet** — and read the standing ship as battered, because winning costs. Confederate livery: crimson and rust red, black, weathered wood, brass and cream; patched or dyed sails, unusual rigging, nothing standardized, never villainous; one skull in a red headscarf over crossed cutlasses with a compass star. The sinking ship is Crown: warm ivory sails, deep Imperial green, antique brass. One longitudinal centreline per hull: keel, bow, stern and bowsprit aligned, masts plausible. THIS IS A THUMBNAIL, NOT A PAINTING. It is shown small and read in about one second, so it must say what it means instantly. One subject, very large in the frame, filling most of the height. At most two objects in the whole image. No crowds, no boats, no floating debris, no background detail, no incidental storytelling. Strip out anything that is not the one thing this image is about. A viewer who cannot read the title must still know what happened. Silhouette first: if you reduce the image to a black shape on white it should still be obvious. 16:9 landscape; nothing that matters in the outer eighth, since the game prints a title across the top and a button across the bottom. No borders or text. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish.

## 5. Crown running

*You have fled (Crown) · Your enemy has fled (Confederacy)*

`battles/flee-crown.png`

> One Crown Imperium warship seen from directly astern, very large and filling the frame, under a full press of ivory canvas and heeled hard over, driving away from the viewer. Far behind her and small, one Confederate ship firing after her, with a single white splash of shot falling short in the open water between them. She is whole and fast — not sinking, not burning. The meaning is: **the Crown fleet is running away and getting out**. Crown livery: warm-ivory sails, deep Imperial-green accents, antique brass, black iron; clean, symmetrical, regulation; one gold crown over a fouled anchor with a compass star. No coral anywhere. One longitudinal centreline per hull: keel, bow, stern and bowsprit aligned, masts plausible. THIS IS A THUMBNAIL, NOT A PAINTING. It is shown small and read in about one second, so it must say what it means instantly. One subject, very large in the frame, filling most of the height. At most two objects in the whole image. No crowds, no boats, no floating debris, no background detail, no incidental storytelling. Strip out anything that is not the one thing this image is about. A viewer who cannot read the title must still know what happened. Silhouette first: if you reduce the image to a black shape on white it should still be obvious. 16:9 landscape; nothing that matters in the outer eighth, since the game prints a title across the top and a button across the bottom. No borders or text. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish.

## 6. Confederacy running

*You have fled (Confederacy) · Your enemy has fled (Crown)*

`battles/flee-confederacy.png`

> One Free Confederacy ship seen from directly astern, very large and filling the frame, under a full press of patched crimson and dun canvas and heeled hard over, driving away from the viewer. Far behind her and small, one Crown warship firing after her, with a single white splash of shot falling short in the open water between them. She is whole and fast — not sinking, not burning. The meaning is: **the Confederate fleet is running away and getting out**. Confederate livery: crimson and rust red, black, weathered wood, brass and cream; patched or dyed sails, unusual rigging, nothing standardized, never villainous; one skull in a red headscarf over crossed cutlasses with a compass star. One longitudinal centreline per hull: keel, bow, stern and bowsprit aligned, masts plausible. THIS IS A THUMBNAIL, NOT A PAINTING. It is shown small and read in about one second, so it must say what it means instantly. One subject, very large in the frame, filling most of the height. At most two objects in the whole image. No crowds, no boats, no floating debris, no background detail, no incidental storytelling. Strip out anything that is not the one thing this image is about. A viewer who cannot read the title must still know what happened. Silhouette first: if you reduce the image to a black shape on white it should still be obvious. 16:9 landscape; nothing that matters in the outer eighth, since the game prints a title across the top and a button across the bottom. No borders or text. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish.

---

## What the six have to carry

1. **Who won reads before the headline does.** One ship standing, one ship
   going down, and the livery of each unmistakable at a glance.
2. **A flee is not a defeat.** The running ship is whole, fast and under full
   sail, with the enemy far off and the shot falling short. Nothing in 5 or 6
   may read as a ship dying, or the player will think they lost.
3. **Winning costs.** The standing ship in 3 and 4 is holed and scarred. The
   combat system lets a battle be won badly, and an unmarked victor would lie
   about that every time.

## Two gaps worth knowing about

- **Retreat fire has no image of its own.** A slow ship caught by Long Guns
  while running is carried by 5 and 6. If that moment wants its own thumbnail —
  one heavy hull taking a hit as she runs — it is a seventh.
- **The between-rounds screen has no art at all**, and it is the most-seen
  screen in the whole system. The core loop is FIGHT → report → *FIGHT AGAIN or
  FLEE*, which happens more often than any ending. A seventh painting — two
  battered ships still in it, smoke between them, nothing decided — would earn
  its place faster than anything else on this list.
