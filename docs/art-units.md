# Art prompts — every works and every company

*Sean, 16 September: “Give me art prompts for all facilities and garrisons.”*

One sheet for both, so there is a single place to look and nothing to keep in
sync with anything else. **Twenty-six prompts**: eight works painted twice, once
for each side, and ten companies.

**What already exists.** Five of the seven works are painted for both sides and
in the game: Camp, Mill, Construction Yard, Training Facility and Shipyard. They
are here because a set of prompts with holes in it is not a set — regenerate
them only if a delivery looks off against the rest. The ten companies are
written up in `troops.md` prose, but not one has arrived: every company on a
garrison board is still a drawn glyph.

**The Crown's Fortress and Heavy Fortress arrived on 16 September** and are
both in the game — the first works painted as standalone pictures rather than
sliced out of a contact sheet. The Fortress was delivered twice; the second take
is the one installed. Still missing: **both walls for the Confederacy, and the
Boom for both sides.**

**Eight prompts here, not seven.** The Heavy Fortress is a works in its own
right now — 45 guns and 150 of wall against a Fortress's 20 and 60, on the same
single plot — so it needs its own painting per side, and the Confederate one
has to read as the same building the Confederacy would have built: earthwork
and ships' timbers rather than cut stone, and more of it.

---

## Delivery

**Facilities.** One image per works per side — **eight works, sixteen images** —  PNG, **4:3 landscape (2048×1536
or larger)**, the works filling most of the frame. Name exactly as the file name
under each heading. Drive: `7 Seas / Art / buildings`. Install with
`npm run art:add -- <file> buildings/<works>-<side>` — for example
`buildings/fort-empire`.

*Changed 16 September, with the Crown Fort.* The older five were sliced out of a
contact sheet and are wide strips about four to one, installed under
`islands/facility-*`. Both shapes work — the game looks in `buildings/` first
and falls back to the strip — but a painting of its own at 4:3 is far better at
the size the boards now draw them, so anything new comes in this way. Every
works is shown in the same **16:10** band wherever it appears, so a 4:3 painting
loses a little sky and a strip shows its middle: the crop a player learns a
building by is the same crop on the island board, in the encyclopedia and on the
build card.

**Companies.** One image per unit, PNG, **4:5 (1024×1280 or larger)**, named
exactly as the file name. Drive: `7 Seas / Art / troops`, then
`npm run art:add -- <file> troops`.

Anything without a file keeps its drawn glyph, so these can arrive one at a
time and in any order.

**Style line**, repeated inside every prompt on purpose — paste the whole
prompt:

> cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

---

## 1. The works — 7 × 2 sides

The two sides are the point of doing each works twice. A Crown yard is cut
stone, squared off, paid for and kept up; a Confederate one is the same job done
out of salvage by people who are not waiting for permission. That contrast is
the clearest single statement of what the two factions are, and it is doing it
at 96 pixels wide, so it has to be in the *materials and the order of things*
rather than in any detail.

### Camp

*An extraction camp that cuts timber and ore out of the ground and sells it.*

**Crown Imperium** — `mine-empire.png`

> A Crown extraction camp: a cut stone quarry face with a timber gantry crane over it, ore carts on iron rails running down to a stone quay, sawn logs stacked in squared piles under numbered boards, an overseer with a tally book, gangs working in step. Crown Imperium — order, stability, trade, civilization, a brighter tomorrow: deep Imperial green and warm ivory, antique gold and brass, black iron, refined wood, cut grey stone, everything squared off, regulation and matching, kept up at expense; civilized and impressive, never sinister; no coral anywhere. 4:3 landscape, the works filling most of the frame, seen from the water a short way off and a little below, figures at work for scale, sky and water around it so the silhouette can breathe. The game crops this to a 16:10 band, so the building itself belongs in the middle of the height with nothing that matters in the top or bottom eighth, and it has to read at thirty pixels high: one clear subject, strong outline, no clutter along the edges. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

**Free Confederacy** — `mine-alliance.png`

> A Confederate extraction camp: a raw cut in the hillside worked by hand, ore hauled in barrows along plank runs to a jetty of lashed spars, timber dragged out by oxen, a lean-to of sailcloth over the tools, everyone doing three jobs at once. Free Confederacy — freedom, opportunity, independence, brotherhood, a bolder tomorrow: crimson and rust red, black, salvaged ship's timbers and mismatched brass fittings, tar and rope and patched or dyed canvas, whalebone, nothing regulation and no two things alike, improvised and working; a red sash knotted somewhere as a colour; free-spirited, never villainous. 4:3 landscape, the works filling most of the frame, seen from the water a short way off and a little below, figures at work for scale, sky and water around it so the silhouette can breathe. The game crops this to a 16:10 band, so the building itself belongs in the middle of the height with nothing that matters in the top or bottom eighth, and it has to read at thirty pixels high: one clear subject, strong outline, no clutter along the edges. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

### Mill

*A works that turns timber and ore into something worth more — the best earner on any island.*

**Crown Imperium** — `refinery-empire.png`

> A Crown mill: a long white stone building with a great waterwheel on its flank, a chimney with clean smoke, sawn planks and pig iron stacked on a paved yard, barrels rolled to a jetty under a clerk's eye. Crown Imperium — order, stability, trade, civilization, a brighter tomorrow: deep Imperial green and warm ivory, antique gold and brass, black iron, refined wood, cut grey stone, everything squared off, regulation and matching, kept up at expense; civilized and impressive, never sinister; no coral anywhere. 4:3 landscape, the works filling most of the frame, seen from the water a short way off and a little below, figures at work for scale, sky and water around it so the silhouette can breathe. The game crops this to a 16:10 band, so the building itself belongs in the middle of the height with nothing that matters in the top or bottom eighth, and it has to read at thirty pixels high: one clear subject, strong outline, no clutter along the edges. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

**Free Confederacy** — `refinery-alliance.png`

> A Confederate mill: a mill built into the hull of a beached merchantman, its wheel turned by the tide race, a crooked chimney, planks and ingots stacked wherever there is room, rum barrels and salvaged rigging, smoke blowing sideways. Free Confederacy — freedom, opportunity, independence, brotherhood, a bolder tomorrow: crimson and rust red, black, salvaged ship's timbers and mismatched brass fittings, tar and rope and patched or dyed canvas, whalebone, nothing regulation and no two things alike, improvised and working; a red sash knotted somewhere as a colour; free-spirited, never villainous. 4:3 landscape, the works filling most of the frame, seen from the water a short way off and a little below, figures at work for scale, sky and water around it so the silhouette can breathe. The game crops this to a 16:10 band, so the building itself belongs in the middle of the height with nothing that matters in the top or bottom eighth, and it has to read at thirty pixels high: one clear subject, strong outline, no clutter along the edges. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

### Construction Yard

*The works that raises every other building — the island's own, or sent across the world.*

**Crown Imperium** — `construction-yard-empire.png`

> A Crown construction yard: a walled compound of cut stone and scaffolding, a treadwheel crane, dressed blocks laid out in rows with chalk marks on them, a drawing office with shutters open, engineers with rods and a plan table, a boat loading builders and their gear for another island. Crown Imperium — order, stability, trade, civilization, a brighter tomorrow: deep Imperial green and warm ivory, antique gold and brass, black iron, refined wood, cut grey stone, everything squared off, regulation and matching, kept up at expense; civilized and impressive, never sinister; no coral anywhere. 4:3 landscape, the works filling most of the frame, seen from the water a short way off and a little below, figures at work for scale, sky and water around it so the silhouette can breathe. The game crops this to a 16:10 band, so the building itself belongs in the middle of the height with nothing that matters in the top or bottom eighth, and it has to read at thirty pixels high: one clear subject, strong outline, no clutter along the edges. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

**Free Confederacy** — `construction-yard-alliance.png`

> A Confederate construction yard: an open yard of trestles and sheer legs under a sailcloth awning, block and tackle rigged from a standing mast, salvaged stone and ship's timber sorted into heaps, a shipwright chalking a plan straight onto a plank, a longboat loading tools and crew. Free Confederacy — freedom, opportunity, independence, brotherhood, a bolder tomorrow: crimson and rust red, black, salvaged ship's timbers and mismatched brass fittings, tar and rope and patched or dyed canvas, whalebone, nothing regulation and no two things alike, improvised and working; a red sash knotted somewhere as a colour; free-spirited, never villainous. 4:3 landscape, the works filling most of the frame, seen from the water a short way off and a little below, figures at work for scale, sky and water around it so the silhouette can breathe. The game crops this to a 16:10 band, so the building itself belongs in the middle of the height with nothing that matters in the top or bottom eighth, and it has to read at thirty pixels high: one clear subject, strong outline, no clutter along the edges. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

### Training Facility

*The ground where companies of marines and militia are drilled.*

**Crown Imperium** — `training-facility-empire.png`

> A Crown training facility: a walled parade ground of raked gravel above the harbor, ranks at drill with muskets shouldered in perfect line, a drummer, an officer pacing the front, a stone barrack block and an armoury with a sentry on the door. Crown Imperium — order, stability, trade, civilization, a brighter tomorrow: deep Imperial green and warm ivory, antique gold and brass, black iron, refined wood, cut grey stone, everything squared off, regulation and matching, kept up at expense; civilized and impressive, never sinister; no coral anywhere. 4:3 landscape, the works filling most of the frame, seen from the water a short way off and a little below, figures at work for scale, sky and water around it so the silhouette can breathe. The game crops this to a 16:10 band, so the building itself belongs in the middle of the height with nothing that matters in the top or bottom eighth, and it has to read at thirty pixels high: one clear subject, strong outline, no clutter along the edges. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

**Free Confederacy** — `training-facility-alliance.png`

> A Confederate training facility: a trampled shore-side yard with a palisade of ship's timber, a mixed company learning cutlass work in loose pairs, straw dummies and boarding nets rigged from a spar, muskets of four patterns in a rack, someone shouting and being half-listened to. Free Confederacy — freedom, opportunity, independence, brotherhood, a bolder tomorrow: crimson and rust red, black, salvaged ship's timbers and mismatched brass fittings, tar and rope and patched or dyed canvas, whalebone, nothing regulation and no two things alike, improvised and working; a red sash knotted somewhere as a colour; free-spirited, never villainous. 4:3 landscape, the works filling most of the frame, seen from the water a short way off and a little below, figures at work for scale, sky and water around it so the silhouette can breathe. The game crops this to a 16:10 band, so the building itself belongs in the middle of the height with nothing that matters in the top or bottom eighth, and it has to read at thirty pixels high: one clear subject, strong outline, no clutter along the edges. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

### Shipyard

*The slipway where hulls are laid down and sent to their station.*

**Crown Imperium** — `shipyard-empire.png`

> A Crown shipyard: a covered slip of dressed stone with a man-of-war's hull on the stocks, ribs bare and planking going on, a mast crane, tar coppers and coils of new cordage laid out in order, shipwrights on staging, the Tide's flag over the gate. Crown Imperium — order, stability, trade, civilization, a brighter tomorrow: deep Imperial green and warm ivory, antique gold and brass, black iron, refined wood, cut grey stone, everything squared off, regulation and matching, kept up at expense; civilized and impressive, never sinister; no coral anywhere. 4:3 landscape, the works filling most of the frame, seen from the water a short way off and a little below, figures at work for scale, sky and water around it so the silhouette can breathe. The game crops this to a 16:10 band, so the building itself belongs in the middle of the height with nothing that matters in the top or bottom eighth, and it has to read at thirty pixels high: one clear subject, strong outline, no clutter along the edges. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

**Free Confederacy** — `shipyard-alliance.png`

> A Confederate shipyard: a hidden cove slipway roofed with sailcloth and palm, a hull on the stocks built of salvage with three colours of timber in her planking, spars lashed into a crane, a fire under a tar pot, shipwrights of four peoples working at once. Free Confederacy — freedom, opportunity, independence, brotherhood, a bolder tomorrow: crimson and rust red, black, salvaged ship's timbers and mismatched brass fittings, tar and rope and patched or dyed canvas, whalebone, nothing regulation and no two things alike, improvised and working; a red sash knotted somewhere as a colour; free-spirited, never villainous. 4:3 landscape, the works filling most of the frame, seen from the water a short way off and a little below, figures at work for scale, sky and water around it so the silhouette can breathe. The game crops this to a 16:10 band, so the building itself belongs in the middle of the height with nothing that matters in the top or bottom eighth, and it has to read at thirty pixels high: one clear subject, strong outline, no clutter along the edges. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

### Fortress

*A battery on the harbor wall: it fires in every action in its water, and no landing can be made while it stands. 100 gold, 18 days, 20 guns, 60 of wall, one plot.*

**Crown Imperium** — `fort-empire.png` — **delivered 16 September and in the game.** Kept here for the set; do not regenerate.

> A Crown fort: a white stone bastion on the harbor wall, embrasures in a neat row, heavy brass guns run out over the water, shot piled in pyramids, a powder magazine with a sentry, gunners in Imperial-green and warm ivory at drill, the harbor mouth beyond. Crown Imperium — order, stability, trade, civilization, a brighter tomorrow: deep Imperial green and warm ivory, antique gold and brass, black iron, refined wood, cut grey stone, everything squared off, regulation and matching, kept up at expense; civilized and impressive, never sinister; no coral anywhere. 4:3 landscape, the works filling most of the frame, seen from the water a short way off and a little below, figures at work for scale, sky and water around it so the silhouette can breathe. The game crops this to a 16:10 band, so the building itself belongs in the middle of the height with nothing that matters in the top or bottom eighth, and it has to read at thirty pixels high: one clear subject, strong outline, no clutter along the edges. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

**Free Confederacy** — `fort-alliance.png`

> A Confederate fort: an earthwork battery faced with gabions and ships' timbers, guns of four different patterns on improvised carriages, powder kegs under sailcloth, a lookout in a crow's nest lashed to a spar, a mixed crew at the pieces, the harbor mouth beyond. Free Confederacy — freedom, opportunity, independence, brotherhood, a bolder tomorrow: crimson and rust red, black, salvaged ship's timbers and mismatched brass fittings, tar and rope and patched or dyed canvas, whalebone, nothing regulation and no two things alike, improvised and working; a red sash knotted somewhere as a colour; free-spirited, never villainous. 4:3 landscape, the works filling most of the frame, seen from the water a short way off and a little below, figures at work for scale, sky and water around it so the silhouette can breathe. The game crops this to a 16:10 band, so the building itself belongs in the middle of the height with nothing that matters in the top or bottom eighth, and it has to read at thirty pixels high: one clear subject, strong outline, no clutter along the edges. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

### Heavy Fortress

*The same wall built twice over, on the one plot: more than twice the guns and two and a half times the stone. 250 gold, 32 days, 45 guns, 150 of wall, one plot.*

It has to read against the Fortress at a glance and at thumbnail size: **the same building with more of everything.** Not a different architecture, not a fantasy keep — more gundecks, more bastions stepped down to the water, heavier pieces, deeper walls. A player glancing at an island should be able to tell which of the two is standing there without reading the name.

**Crown Imperium** — `heavy-fort-empire.png` — **delivered 16 September and in the game.** Kept here for the set; do not regenerate.

> A Crown heavy fortress: a great stone sea-battery in tiers, eight and more heavy guns run out over the water on two levels of bastion, shot piled in pyramids and powder barrels behind the pieces, sentry turrets at the angles, a walled keep rising behind, the whole works stepped down to the rocks and the surf. Visibly the same fortress as the lesser one and half again as much of it. Crown Imperium — order, stability, trade, civilization, a brighter tomorrow: deep Imperial green and warm ivory, antique gold and brass, black iron, refined wood, cut grey stone, everything squared off, regulation and matching, kept up at expense; civilized and impressive, never sinister; no coral anywhere. 4:3 landscape, the works filling most of the frame, seen from the water a short way off and a little below, figures at work for scale, sky and water around it so the silhouette can breathe. The game crops this to a 16:10 band, so the building itself belongs in the middle of the height with nothing that matters in the top or bottom eighth, and it has to read at thirty pixels high: one clear subject, strong outline, no clutter along the edges. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

**Free Confederacy** — `heavy-fort-alliance.png`

> A Confederate heavy fortress: a great tiered battery of earthwork, gabions and ships' timbers, eight and more guns of half a dozen different patterns run out over the water on two improvised levels, powder under sailcloth, a lookout in a crow's nest lashed to a spar, hulks sunk as a breakwater below it, the whole thing built up out of what the sea gave them and plainly twice the works of their lesser battery. Free Confederacy — freedom, opportunity, independence, brotherhood, a bolder tomorrow: crimson and rust red, black, salvaged ship's timbers and mismatched brass fittings, tar and rope and patched or dyed canvas, whalebone, nothing regulation and no two things alike, improvised and working; a red sash knotted somewhere as a colour; free-spirited, never villainous. 4:3 landscape, the works filling most of the frame, seen from the water a short way off and a little below, figures at work for scale, sky and water around it so the silhouette can breathe. The game crops this to a 16:10 band, so the building itself belongs in the middle of the height with nothing that matters in the top or bottom eighth, and it has to read at thirty pixels high: one clear subject, strong outline, no clutter along the edges. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

### Boom

*A chain across the harbor mouth: a landing has to cut it first, and it is found by a blockade as well as by boats.*

**Crown Imperium** — `boom-empire.png`

> A Crown boom: a massive iron chain slung between two white stone towers across the harbor mouth, a capstan house with the links coming up dripping, a guard boat at the gap, orderly and immovable. Crown Imperium — order, stability, trade, civilization, a brighter tomorrow: deep Imperial green and warm ivory, antique gold and brass, black iron, refined wood, cut grey stone, everything squared off, regulation and matching, kept up at expense; civilized and impressive, never sinister; no coral anywhere. 4:3 landscape, the works filling most of the frame, seen from the water a short way off and a little below, figures at work for scale, sky and water around it so the silhouette can breathe. The game crops this to a 16:10 band, so the building itself belongs in the middle of the height with nothing that matters in the top or bottom eighth, and it has to read at thirty pixels high: one clear subject, strong outline, no clutter along the edges. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

**Free Confederacy** — `boom-alliance.png`

> A Confederate boom: a chain of salvaged anchor cable floated on lashed barrels and two sunken hulks between timber towers, a lantern on each, a crew hauling on a windlass, improvised and entirely effective. Free Confederacy — freedom, opportunity, independence, brotherhood, a bolder tomorrow: crimson and rust red, black, salvaged ship's timbers and mismatched brass fittings, tar and rope and patched or dyed canvas, whalebone, nothing regulation and no two things alike, improvised and working; a red sash knotted somewhere as a colour; free-spirited, never villainous. 4:3 landscape, the works filling most of the frame, seen from the water a short way off and a little below, figures at work for scale, sky and water around it so the silhouette can breathe. The game crops this to a 16:10 band, so the building itself belongs in the middle of the height with nothing that matters in the top or bottom eighth, and it has to read at thirty pixels high: one clear subject, strong outline, no clutter along the edges. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

---

## 2. The companies — 10

Three numbers each, and the numbers are the brief: a 50-attack Urskin and a
15-attack militiaman should not be able to be mistaken for one another in
silhouette at thirty pixels.

| | attack | hold | watch |
|---|---|---|---|
| Crown Regulars (Crown) | 20 | 20 | 15 |
| Ship's Company (Crown) | 15 | 15 | 20 |
| Crown Marines (Crown) | 30 | 30 | 25 |
| Tidewrought (Crown) | 40 | 35 | 5 |
| The Drowned Guard (Crown) | 45 | 40 | 30 |
| Island Militia (Confederacy) | 15 | 20 | 10 |
| Ship's Company (Confederacy) | 15 | 15 | 15 |
| Reefwalkers (Confederacy) | 20 | 20 | 35 |
| Reef Guard (Confederacy) | 20 | 45 | 20 |
| Urskin Berserkers (Confederacy) | 50 | 20 | 20 |

### Crown Regulars — Crown Imperium

attack / hold / watch: **20 / 20 / 15**

`crown-regulars.png`

> A line infantryman of the Crown's own regiments. Sea-green coat with cream facings and pipeclayed crossbelts, black tricorn, musket shouldered, a rolled blanket and a cartridge box. Nothing about him is remarkable and there are a great many of him. Weary, competent, entirely ordinary. Crown Imperium — order, stability, trade, civilization, a brighter tomorrow: deep Imperial green and warm ivory, antique gold and brass braid, black iron, high collars, everything regulation and everything matching; civilized and impressive, never sinister; no coral anywhere. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

### Ship's Company — Crown Imperium

attack / hold / watch: **15 / 15 / 20**

`crown-ships-company.png`

> A sailor of a Crown ship put ashore to hold something. Striped slops and a short blue jacket, tarred hat or knotted head-cloth, cutlass in hand and a boarding pistol in his belt, no pack and no drill. He is looking sideways at something off the beach rather than standing to attention. Crown Imperium — order, stability, trade, civilization, a brighter tomorrow: deep Imperial green and warm ivory, antique gold and brass braid, black iron, high collars, everything regulation and everything matching; civilized and impressive, never sinister; no coral anywhere. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

### Crown Marines — Crown Imperium

attack / hold / watch: **30 / 30 / 25**

`crown-marines.png`

> The white-coats: the Imperium's marines, and the best thing on any beach on day one. Immaculate white coat faced deep sea-green, tall black shako with a brass plate, crossbelts pipeclayed dead white, musket and fixed bayonet held ready. Very straight, very still, visibly better at this than anybody around him. Crown Imperium — order, stability, trade, civilization, a brighter tomorrow: deep Imperial green and warm ivory, antique gold and brass braid, black iron, high collars, everything regulation and everything matching; civilized and impressive, never sinister; no coral anywhere. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

### Tidewrought — Crown Imperium

attack / hold / watch: **40 / 35 / 5**  ·  *not yet buildable — research*

`tidewrought.png`

> An automaton of brass and black iron, man-shaped and a head taller than a man. Salt-stained brass plate over a riveted iron frame, barnacles and weed still on its legs from walking in over the seabed, no face to speak of — a blank brass mask with a single slit — and a long boarding axe held in both hands. Water running off it. It sees nothing at all. Uncanny and heavy, never comic, never a robot. Crown Imperium — order, stability, trade, civilization, a brighter tomorrow: deep Imperial green and warm ivory, antique gold and brass braid, black iron, high collars, everything regulation and everything matching; civilized and impressive, never sinister; no coral anywhere. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

### The Drowned Guard — Crown Imperium

attack / hold / watch: **45 / 40 / 30**  ·  *not yet buildable — research*

`drowned-guard.png`

> A marine who has been cold-baptised: held under the Deep until he stopped struggling, and brought back. Black lacquered plate over a sea-green coat gone almost black, a closed helmet with a grille, kelp and salt crusted in the joints, a straight sword point-down in both hands. Absolutely still. Something missing behind the eye-slit. Understated wrongness and never a monster. Crown Imperium — order, stability, trade, civilization, a brighter tomorrow: deep Imperial green and warm ivory, antique gold and brass braid, black iron, high collars, everything regulation and everything matching; civilized and impressive, never sinister; no coral anywhere. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

### Island Militia — Free Confederacy

attack / hold / watch: **15 / 20 / 10**

`island-militia.png`

> Whoever lives on the island, holding it. Working clothes — canvas trousers, a patched shirt, a straw hat or a knotted scarf — a red sash at the waist as the only uniform thing about them, a fowling piece or a boarding pike, and a powder horn on a cord. Not a soldier and standing their ground anyway. Free Confederacy — freedom, opportunity, independence, brotherhood, a bolder tomorrow: crimson and rust red, black, weathered wood, worn leather, brass and cream, mismatched salvaged finery, nothing regulation and no two alike; free-spirited, never villainous. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

### Ship's Company — Free Confederacy

attack / hold / watch: **15 / 15 / 15**

`brethren-ships-company.png`

> A sailor of the Brethren put ashore to hold something. Salvaged finery over slops — a stolen officer's coat with the braid cut off, mismatched boots — a red sash, cutlass and pistol, a gold ring and a hard look. Loose, capable, entirely unimpressed. Free Confederacy — freedom, opportunity, independence, brotherhood, a bolder tomorrow: crimson and rust red, black, weathered wood, worn leather, brass and cream, mismatched salvaged finery, nothing regulation and no two alike; free-spirited, never villainous. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

### Reefwalkers — Free Confederacy

attack / hold / watch: **20 / 20 / 35**

`reefwalkers.png`

> A Shoal-folk scout of the Free Confederacy: webbed hands and night-eyes, smooth dark skin patterned like a reef fish, the best watcher in the world. Light wrapped cloth and a net bag, a long fishing spear held low, barefoot, head turned and listening. Alien in build and entirely a person — never a fish-monster. Free Confederacy — freedom, opportunity, independence, brotherhood, a bolder tomorrow: crimson and rust red, black, weathered wood, worn leather, brass and cream, mismatched salvaged finery, nothing regulation and no two alike; free-spirited, never villainous. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

### Reef Guard — Free Confederacy

attack / hold / watch: **20 / 45 / 20**

`reef-guard.png`

> A Reef-folk defender of the Free Confederacy: broad and slow-moving, skin like living coral gone hard, grown armour across chest and shoulders in pale pink and bone. A great shield of grown coral held ready and a heavy club. Planted, immovable, patient. Grown rather than made — never plate armour, never a golem. Free Confederacy — freedom, opportunity, independence, brotherhood, a bolder tomorrow: crimson and rust red, black, weathered wood, worn leather, brass and cream, mismatched salvaged finery, nothing regulation and no two alike; free-spirited, never villainous. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

### Urskin Berserkers — Free Confederacy

attack / hold / watch: **50 / 20 / 20**

`urskin-berserkers.png`

> An Urskin harpooner of the far ice: enormous, shaggy, bear-like in build and unmistakably a person. Whale-hide and furs over scarred skin, bone ornaments, a whaling harpoon in one hand and a boarding axe in the other, breath steaming. Coming forward. The worst thing on any beach and visibly delighted about it. Free Confederacy — freedom, opportunity, independence, brotherhood, a bolder tomorrow: crimson and rust red, black, weathered wood, worn leather, brass and cream, mismatched salvaged finery, nothing regulation and no two alike; free-spirited, never villainous. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, approximately 70% historical swashbuckling adventure, 20% nautical fantasy and mysticism, 10% whimsy; never photorealistic, steampunk, grimdark, chibi, childish, generic high fantasy, futuristic or excessively cartoonish

---

## What each one is standing in for

The facility strip is read beside a name on a panel and the company figure is
read at thirty pixels in a slot, so both are silhouette problems before they are
painting problems. If a delivery is beautiful and unreadable at that size it is
the wrong picture, and the fix is almost always to throw away the background and
make one shape bigger.
