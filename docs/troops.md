# Garrison companies — art and stats

*Written 15 September, at Sean's word: “Garrisons need images. We want to model
garrisons after SW Rebellion units but follow lore and races of our world. Can
you give them names, stats, and prompts for images.”*

The names and the watch column come out of the world bible §7, which took them
off Rebellion's ground units. Attack and hold are new here, set against what
the bible already claims about each one — “best defense”, “best offense”,
“best starting troop” — so the numbers and the prose cannot disagree. The data
is `src/data/troops.json`; a test holds the three superlatives true.

## The scale

Three numbers, the way a Rebellion regiment has three:

| | what it is |
|---|---|
| **attack** | what a company is worth landing on somebody |
| **hold** | what it is worth defending ground it is standing on |
| **watch** | what it sees: the eyes that catch a saboteur, an agitator, or a boat coming in at night |

15 is a militiaman. 50 is the worst thing either side can put on a beach. The
span is Rebellion's, roughly, and deliberately narrow: the difference between
the best company and the worst is about three to one, not ten, so numbers never
make a landing a foregone conclusion.

**What is wired in, and what is not.** Who is standing on an island is real and
in the game today: a garrison is a mix of named companies, seeded from the
island so it never reshuffles, and each one draws its own figure. The three
numbers are shown and not yet read — a landing is still settled on how many
companies are ashore, exactly as it was. Wiring them means typed companies in a
ship's hold as well as on an island, which is the next job and a real one; it
would also move the balance, so it is worth doing on purpose rather than as a
side effect of adding art.

## Who is where

The sort of unit decides where it turns up, which is the part that makes an
island in the Far Sea defend differently from one in the Amber:

- **Line** and **sailors** — Crown Regulars and Island Militia, and a Ship's
  Company apiece. Everywhere the side has anything; sailors only where there is
  a shipyard to have come off a hull at.
- **Native** — Reefwalkers, Reef Guard, Urskin Berserkers. Not a purchase, a
  people: they appear on the islands their people live on and nowhere else. The
  Reef Guard *are* the reef island.
- **Made** — Tidewrought and the Drowned Guard, the two the Crown manufactures
  rather than musters. Behind research, so nowhere yet.

**One deliberate divergence from the bible.** §7 stars all five non-basic units
as needing research, the original's way. The three native ones are not starred
here: a Reef-folk island is defended by Reef-folk whether or not anyone has
researched anything, and gating that made every Confederate island in the
opening look identical. The two made units keep their research gate, which is
the half of the rule that was doing work. Sean's call if he wants it back.

## Delivery

One image per unit, one file per image, **PNG, 4:5 (1024×1280 or larger)**,
named exactly as the file name under each heading. Save to Google Drive
`7 Seas / Art / troops`, then `npm run art:add -- <file> troops`. A unit without
a file keeps its drawn figure, so these can arrive one at a time.

Style line, for reference: cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, 80% historical realism and 20% dark nautical fantasy; never photorealistic, cartoonish, steampunk, high-fantasy or overly magical

---

### Crown Regulars — Crown Imperium

attack / hold / watch: **20 / 20 / 15**

`crown-regulars.png`

> A line infantryman of the Crown's own regiments. Sea-green coat with cream facings and pipeclayed crossbelts, black tricorn, musket shouldered, a rolled blanket and a cartridge box. Nothing about him is remarkable and there are a great many of him. Weary, competent, entirely ordinary. Crown Imperium — order, stability, a brighter tomorrow: deep sea-green and cream, tarnished gold braid, high collars, everything regulation and everything matching. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, 80% historical realism and 20% dark nautical fantasy; never photorealistic, cartoonish, steampunk, high-fantasy or overly magical

### Ship's Company (Crown) — Crown Imperium

attack / hold / watch: **15 / 15 / 20**

`crown-ships-company.png`

> A sailor of a Crown ship put ashore to hold something. Striped slops and a short blue jacket, tarred hat or knotted head-cloth, cutlass in hand and a boarding pistol in his belt, no pack and no drill. He is looking sideways at something off the beach rather than standing to attention. Crown Imperium — order, stability, a brighter tomorrow: deep sea-green and cream, tarnished gold braid, high collars, everything regulation and everything matching. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, 80% historical realism and 20% dark nautical fantasy; never photorealistic, cartoonish, steampunk, high-fantasy or overly magical

### Crown Marines — Crown Imperium

attack / hold / watch: **30 / 30 / 25**

`crown-marines.png`

> The white-coats: the Imperium's marines, and the best thing on any beach on day one. Immaculate white coat faced deep sea-green, tall black shako with a brass plate, crossbelts pipeclayed dead white, musket and fixed bayonet held ready. Very straight, very still, visibly better at this than anybody around him. Crown Imperium — order, stability, a brighter tomorrow: deep sea-green and cream, tarnished gold braid, high collars, everything regulation and everything matching. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, 80% historical realism and 20% dark nautical fantasy; never photorealistic, cartoonish, steampunk, high-fantasy or overly magical

### Tidewrought — Crown Imperium

attack / hold / watch: **40 / 35 / 5**

`tidewrought.png`

> An automaton of brass and cultivated coral that walks in over the seabed and comes out of the surf still advancing. Man-shaped but wrong: too square, riveted brass plate crusted with live coral and barnacle, seawater running out of the joints, a blank slotted faceplate with no eyes behind it. Heavy arms, no weapon — the arms are the weapon. Understated and industrial, never a robot and never magical. Crown Imperium — order, stability, a brighter tomorrow: deep sea-green and cream, tarnished gold braid, high collars, everything regulation and everything matching. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, 80% historical realism and 20% dark nautical fantasy; never photorealistic, cartoonish, steampunk, high-fantasy or overly magical

### The Drowned Guard — Crown Imperium

attack / hold / watch: **45 / 40 / 30**

`drowned-guard.png`

> A marine who has been cold-baptised: held under the Deep until he stopped struggling, and brought back. Black lacquered plate over a sodden sea-green coat, a closed helm with a narrow brow slit, boarding pike held upright, water still coming off him. Nothing supernatural on show — the wrongness is that he is too still and stands slightly wrong, and whatever is behind the slit is not looking at you. Crown Imperium — order, stability, a brighter tomorrow: deep sea-green and cream, tarnished gold braid, high collars, everything regulation and everything matching. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, 80% historical realism and 20% dark nautical fantasy; never photorealistic, cartoonish, steampunk, high-fantasy or overly magical

### Island Militia — Free Confederacy

attack / hold / watch: **15 / 20 / 10**

`island-militia.png`

> An islander defending her own island with whatever was in the shed. Homespun and a canvas apron over it, bare head, a boarding axe and an old fowling piece slung, a red rag tied round one arm because that is the whole of the uniform. Not a soldier, standing where she means to go on standing. Free Confederacy — freedom, opportunity, no masters: weathered red sashes, mismatched salvaged finery, worn leather, nothing regulation and no two alike. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, 80% historical realism and 20% dark nautical fantasy; never photorealistic, cartoonish, steampunk, high-fantasy or overly magical

### Ship's Company (Confederacy) — Free Confederacy

attack / hold / watch: **15 / 15 / 15**

`brethren-ships-company.png`

> A pirate crew put ashore. Red sash, salvaged finery over slops, gold in one ear, cutlass and a brace of pistols on a shoulder belt, a bottle in the other hand. Every one of them has been on the other end of a landing and none of them has been drilled for this one. Free Confederacy — freedom, opportunity, no masters: weathered red sashes, mismatched salvaged finery, worn leather, nothing regulation and no two alike. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, 80% historical realism and 20% dark nautical fantasy; never photorealistic, cartoonish, steampunk, high-fantasy or overly magical

### Reefwalkers — Free Confederacy

attack / hold / watch: **20 / 20 / 35**

`reefwalkers.png`

> A Shoal-folk scout: small, slight, webbed hands and huge dark night-eyes, a wide flat nose, quick. Light oiled leathers in reef colours, bare feet, a long glass raised to one eye and a short bow across the back. Half the height of the others in the set. He has heard something the rest of the island has not. Free Confederacy — freedom, opportunity, no masters: weathered red sashes, mismatched salvaged finery, worn leather, nothing regulation and no two alike. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, 80% historical realism and 20% dark nautical fantasy; never photorealistic, cartoonish, steampunk, high-fantasy or overly magical

### Reef Guard — Free Confederacy

attack / hold / watch: **20 / 45 / 20**

`reef-guard.png`

> A Reef-folk warrior in coral plate grown to the wearer over years: amphibious, gill-slits at the throat, luminous eyes, skin shifting colour. The armour is living coral, pale and ridged and organic rather than forged, with a great rounded coral shield that covers most of the body. Braced, planted, immovable. Almost all shield from the front — that is the silhouette. Free Confederacy — freedom, opportunity, no masters: weathered red sashes, mismatched salvaged finery, worn leather, nothing regulation and no two alike. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, 80% historical realism and 20% dark nautical fantasy; never photorealistic, cartoonish, steampunk, high-fantasy or overly magical

### Urskin Berserkers — Free Confederacy

attack / hold / watch: **50 / 20 / 20**

`urskin-berserkers.png`

> An Urskin harpooner coming up a beach: a huge shaggy tusked sea-bear person, heavy-browed, whaler-built, half again the mass of a man and twice the shoulders. Sealskin and harness, scrimshaw at the belt, a long barbed whaling harpoon held overhand. Mid-stride and committed. Nothing in the world hits harder going forward. Free Confederacy — freedom, opportunity, no masters: weathered red sashes, mismatched salvaged finery, worn leather, nothing regulation and no two alike. One figure, standing, full length, facing the viewer three-quarters on, centred with room above the head and below the feet. Plain flat neutral ground with nothing at all behind the figure — no landscape, no other figures, no props on the floor — so the figure can be cut out. The whole reason for the pose is the outline: this is drawn at thirty pixels high in a slot on a panel, so the shape of the weapon and the shape of the head have to be recognisable with everything else gone. No borders, frames, text or watermarks. cinematic stylized historical realism, hand-painted trading-card illustration, authentic late-17th/18th-century maritime detail, strong readable silhouette, dramatic natural lighting, textured painterly brushwork, rich colours, romantic adventure atmosphere, 80% historical realism and 20% dark nautical fantasy; never photorealistic, cartoonish, steampunk, high-fantasy or overly magical

