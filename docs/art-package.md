# The art package: crew, troops, the opening, and what a Crown uniform is

Sean, 22 September, at the end of the crew brief:

> When we go to redo the artwork, because we will probably redo the artwork for
> all the crew, and we'll need to redo the artwork for all the troops, and we'll
> also need to give you an artwork package for the intro, full-page artwork...
> we also probably want to think about what do Imperium uniforms look like,
> what's the standard model, what are the different chevrons or indicators on
> them, what does an officer look like, what does a junior officer look like,
> what does an admiral look like.

Four deliveries, then. This is the plan for all four and the invented part —
the uniform system — is section 4, because it is the one that does not exist
yet and the other three keep asking it questions.

**Nothing here is painted.** It is a brief, a count and an order of work.

---

## 0. What the package is, in numbers

| Delivery | Pieces | Shape | Exists today |
|---|---|---|---|
| 1. Crew portraits | **40** | square, head-and-shoulders | some, inconsistent |
| 2. Troop cards | **12** | landscape unit card | none — all still drawn glyphs |
| 3. The opening | **16** | full-bleed, phone-portrait | none |
| 4. Uniform reference | **1 sheet + 6 plates** | flat reference, not scene art | none |

Sixty-nine pieces if all four land, and they should not all land at once. The
order that matters is **4 before 1 and 2**, because a Crown officer's portrait
and a Crown marine's unit card are both answers to "what does the Crown wear",
and painting forty of them before deciding is how a roster ends up with forty
different navies in it. That is the single most important sentence in this
document.

---

## 1. Crew portraits — forty

**Why redo rather than fill in.** The roster went from twenty-nine to forty on
22 September and, more to the point, every character now carries a **`look`**
line and a **`temper`** line in `src/data/characters.json`, written to be
painted. Sean's brief was explicit about what those lines are for:

> Differentiate the different officers — you got young and old, male and
> female, ugly and pretty... and also regional. They've got that kind of white
> English look to the main island, Aldermain, but it's a diverse peoples.

The existing portraits do not carry that spread because there was nothing in
the data to carry it. There is now, and Appendix A prints every one of them as
its own brief.

**Format.** Square crop, head and shoulders or upper torso, readable at 96
pixels, one person, no text and no border. That is `docs/peoples-art-guide-v1.md`'s
shared portrait language and there is no reason to change it — but read that
guide's warning header first, because three of its "canon foundation" lines are
lore that has since been cut.

**The three rules this delivery is actually for:**

1. **Age and sex across the fleet, not one token of each.** The Crown's
   fourteen run from a boy of fourteen to an admiral of seventy-one. Five are
   women and one of the five is an envoy of fifty-one in spectacles, which is
   the one nobody ever paints.
2. **Region shows on the face.** The Aldermain look — fair, English, Highwater
   gentry — is *a* Crown look and not *the* Crown look. Captain Lorne Neddam
   was born on a Glass Sea salt-island and Captain Sabra Veyle walked onto a
   recruiting hulk at fourteen to get off one. Both are dark-skinned, both are
   Crown to the bone, and the world explains why: the Salt Reach is poor and
   the Crown pays. Sean's own reasoning, and it belongs in the pictures rather
   than only in a bio.
3. **Reputation and temper are visible.** Godwin Thrale and Halvard Corvane are
   both elderly Crown flag officers with high combat and high leadership. One
   is a wrecker's son who enjoys himself and lost an ear; the other has not
   raised his voice since the Corsair Wars. If those two portraits could be
   swapped without anyone noticing, the delivery failed.

**Non-humans keep their anatomy rules** from the peoples guide — Urskin scale,
Reef-folk gill-slits and colour-shift, Shoal-folk eyes, Hushed silhouette — and
**gain a within-people spread**, which the guide does not currently have and
which Sean asked for by name: *"we probably want to have two or three good
Erskine characters with very different looks."* There are three Urskin and they
must not be one Urskin painted three times:

| | Torvik | Brannoc Tull | Vurn Kesk |
|---|---|---|---|
| Pelt | black | grey-white, thin at the shoulders | rust-red |
| Tusks | both, scrimshawed with the dead | one broken short, capped in bone | both filed flat, ringed in Crown silver |
| Build | nine feet, the biggest | older, half a head shorter | half a hand taller than Torvik |
| Reads as | muscle that loves somebody | a chief who decides who sails | a man for hire, in a good coat worn badly |

Same for the three Bog-folk who stayed and the one who went: Ivo Marsh and
Hessa Fen wear the Crown-green sash over swamp leathers, Tobias Renn wears the
sash and nothing else Crown at all, and Mother Bracken wears river-weed braided
in where the sash would be — *reclaimed, not decoration*, and that one detail is
the whole of the bog-folk schism in a single picture.

---

## 2. Troop cards — twelve

Every troop on a garrison board is still a drawn glyph. `docs/art-units.md`
already holds prompts for ten of them; the roster is twelve now and the stats
moved on 22 September, so the sheet wants a pass rather than a rewrite.

The twelve, with the one thing each picture has to say:

| Troop | Side | The one thing the picture says |
|---|---|---|
| **Crown Marines** | Crown | the white-coats — ivory faced deep sea-green, the exact inverse of the fleet, countable across a harbour |
| **Ship's Company** | Crown | sailors doing soldiers’ work, and better at noticing than at holding |
| **Fensworn** | Crown | Bog-folk in the Crown-green sash and nothing else issued, boots carried not worn |
| **The Hushed** | Crown | you are looking at the place they were standing |
| **Tidewrought** | Crown | brass and iron, walking up out of the water, seeing poorly |
| **The Drowned Guard** | Crown | the cold-baptism — wet men in good order who are not shivering |
| **Island Militia** | Confederacy | their own clothes, one red thing each |
| **Reefwalkers** | Confederacy | Shoal-folk scouts, kitted and deliberate — the elite half of that people, and must not be the Warden painted better |
| **The Brethren** | Confederacy | boarding party, all edge and no line |
| **Bog Witches** | Confederacy | river-weed braided in where the Crown-green sash would be — the schism, in one detail |
| **Shoal Wardens** | Confederacy | the same people with nothing at all: many, ragged, and shown in a group where the Reefwalker is shown alone |
| **Urskin Berserkers** | Confederacy | scale — they must break the frame next to any human unit |

**The rule for the set:** a troop card is read next to five others on a
garrison board at thumbnail size, so the *silhouette* carries the identity and
the face never does. Crown troops share the uniform system from section 4 and
differ by equipment; Confederate troops share nothing and differ by everything,
which is the point of them and is most of the work.

---

## 3. The opening — sixteen full-bleed pieces

`src/data/opening-scroll.json` already carries an `art` slug and a written
`brief` for every slide, and `docs/opening-flow.md` says what the three screens
are. Nine slides a side, two of them the same painting used twice, plus the
"war has begun" curtain per side.

| Piece | Used by | Note |
|---|---|---|
| `one-land` | **both** | deliberately the same painting on both scrolls: neither side disputes the Drowning |
| `the-drowning` | Crown | cold light |
| `the-climb` | Crown | |
| `highwater` | Crown | impressive, never sinister |
| `the-emperor` | Crown | ceremony, not slaughter |
| `the-boy` | Crown | sympathetic, not comic |
| `yarrow-minor` | Crown | the fire from a Crown deck |
| `the-warrant` | Crown | the objective slide |
| `crown-creed` | Crown | sigil card |
| `a-thousand-islands` | Confederacy | warm where the Crown's is cold |
| `many-peoples` | Confederacy | four hulls that share nothing |
| `the-writ` | Confederacy | |
| `the-articles` | Confederacy | |
| `yarrow-minor-sea` | Confederacy | **the same fire, from the water** |
| `the-fleet-comes` | Confederacy | |
| `the-wall` | Confederacy | the objective slide |
| `confederacy-creed` | Confederacy | mark on a patched red sail |

**Format, and it is not the format of anything else in the game.** These are
the only pictures a player sees edge to edge on a phone, so they are
**portrait, full-bleed, and composed for a screen with text over the lower
third**. Everything else shipped so far is square or landscape. Say this to
whoever paints them or half the deliveries will be landscape crops with the
subject exactly where the sentence goes.

**The two paired shots are the best thing in the set and the easiest to lose.**
`yarrow-minor` and `yarrow-minor-sea` are one night from two decks, and
`one-land` is literally the same file twice. Brief them as a pair, to one
painter, or they will not read as the same event.

---

## 4. What a Crown uniform is

The part that does not exist. Everything below is a proposal, and it is written
to be cheap to draw and instantly readable at thumbnail, because that is what it
has to survive.

### 4.1 The standard model

**Bottle green coat, warm ivory small-clothes, antique gold for rank.** The
fleet's palette is already fixed by the ships — *"warm-ivory sails with narrow
botanical-green edge bands"*, *"antique-gold edging"* — and the uniform is the
same three colours in the same proportions. A Crown squadron and a Crown
landing party should look like they came off the same painting, because they
did.

- **Coat.** Single-breasted, bottle green, cuffs and collar faced in ivory. Cut
  to the knee for officers, to the hip for everyone else.
- **Small-clothes.** Ivory waistcoat and breeches. Dirty on campaign; the
  Admiralty's view on this is unprintable and universally ignored.
- **Black.** Boots, belts, hat. Nothing decorative is black.
- **Gold.** *Rank only.* This is the load-bearing rule of the whole system: if
  a figure has gold on them, that gold means something, and the amount of it is
  the rank. Nobody wears gold for pretty. (Ozmond wears gold for pretty. That
  is characterisation, and everyone can tell.)

### 4.2 The ladder, in gold

Read the **cuff** first, the **shoulder** second, the **hat** last. One glance,
three answers, and the cuff alone is enough at thumbnail size.

| Rank | Cuff | Shoulder | Hat | Coat |
|---|---|---|---|---|
| **Rating** (sailor) | none | none | flat tarred hat, green ribbon | short green jacket, no facings |
| **Petty officer** | one narrow gold chevron, point up | none | as above, ribbon knotted | jacket with ivory cuffs |
| **Midshipman** | white collar patch, no gold at all | none | plain black bicorne | hip-length coat |
| **Lieutenant** (junior officer) | **one** gold band | one plain gold strap, right shoulder | black bicorne, gold edge to the front brim only | knee coat, ivory facings |
| **Captain** | **two** gold bands | one bullion epaulette, right shoulder | bicorne fully gold-edged | knee coat, ivory facings, gold buttons |
| **Commodore** | two bands and a gold star above them | bullion epaulettes, **both** shoulders | as captain | as captain |
| **Admiral** | **three** gold bands | heavy bullion epaulettes both shoulders, bullion fringe to the elbow | bicorne gold-edged with a green cockade | knee coat with gold frogging down the front |
| **Grand Admiral** | three bands and the Crown-and-anchor worked in gold above them | as admiral | as admiral, **worn athwart** rather than fore-and-aft | as admiral, plus a green sash |

**Chevrons mean trade, not rank, below the wardroom.** On a rating's sleeve a
chevron is what he *does* — crossed guns for a gunner, a fouled anchor for a
boatswain, a fouled anchor with a knot for a boatswain's mate — and the count
of chevrons is years of good service, not authority. This is why the Drowned
Guard and the Marines look different from the Ship's Company at a glance
without anybody having to paint a face.

**The Marines invert the coat on purpose, and this is already painted.** Crown
Marines are **the white-coats**: immaculate white coat faced deep sea-green,
tall black shako with a brass plate, crossbelts pipeclayed dead white. That is
canon, it is in `troops.json`, and `docs/art-units.md` already holds the prompt.
The uniform system has to be built *around* it rather than over it, and it works
perfectly: the fleet is green-with-ivory and the Marines are ivory-with-green,
so in any landing picture you can count the soldiers and the sailors from across
the harbour without reading a single face.

Bog-folk in Crown service wear the **Crown-green sash** over their own swamp
leathers and nothing else issued — no coat, no shako, boots carried rather than
worn. It is the cheapest possible uniform and it is deliberate on both sides of
the arrangement: the Admiralty pays for the swamps in silence and latitude, and
what it gets back is a people who will wear one green thing. Mother Bracken, who
went south, wears river-weed braided in where the sash would be.

### 4.3 What an officer actually looks like, in three plates

Sean asked the question three times in one sentence, so it gets three pictures
rather than a table:

1. **The junior officer.** Lieutenant Cordelia Vance, twenty-two. One gold band,
   one plain strap, a coat that fits because somebody had it made for her, and a
   sword four inches too long because it was her father's. *A junior officer is
   someone whose kit is better than their service.*
2. **The officer.** Captain Sabra Veyle, twenty-seven. Two bands, one bullion
   epaulette, immaculate, and paid for herself. *An officer is someone whose kit
   is exactly equal to their service and who knows the difference.*
3. **The admiral.** Grand Admiral Halvard Corvane, seventy-one. Three bands, the
   Crown-and-anchor, full dress at every hour of the day, and the Corsair Wars
   ribbon and nothing else he did not earn. *An admiral is someone whose kit
   stopped being about them a long time ago.*

Paint those three side by side before anything else in delivery 1. They are the
uniform sheet's proof, and if the ladder does not read across those three it
does not read at all.

### 4.4 The Confederacy does not have one

Worth writing down so nobody tries to give them one. The Confederacy's visual
rule is **red and patched and nothing standard**: a red headscarf, a red sash, a
patched red sail, and otherwise whatever that island wears. A Confederate is
identified by **one red thing** on an otherwise unrelated person, and that is
the entire system.

The exceptions are where the interest is. Adaira Hale still wears a Crown
magistrate's plain black because she has not found a reason to change, and
Dorian Jessup wears a Crown coat with the facings unpicked rather than
replaced — two people who used to be the other thing, wearing the proof of it,
on the side that has no uniform at all.

---

## 5. Order of work

1. **The uniform sheet and its three plates** (section 4). Small, and it unlocks
   both of the big deliveries.
2. **The three Urskin and the four Bog-folk**, as two sets, to one painter each.
   They are the deliveries most likely to come back looking like one person
   painted twice, and they are the proof that the within-people spread works.
3. **The opening sixteen**, with the two paired shots briefed together. This is
   the delivery a player sees first and the only one they see full-bleed.
4. **The rest of the crew portraits**, in roster order.
5. **The twelve troop cards**, last, because they are the only set that has a
   working stand-in today.

---

## Appendix A — every crew brief, from the roster

Generated from `src/data/characters.json`. The `look` line is the brief; the
`temper` line is what the face has to do. Do not edit here — edit the roster.

### The Crown Imperium — fourteen

**Imperator Cassian Thorne** — Human, 14. Highwater, the Aldermain.

> Fair, thin-wristed, hair the colour of wet straw. State robes cut for a grown man and taken in twice. His father's signet worn on a cord because it does not fit his hand.

*Face has to do:* Watchful and over-polite. Hates being carried.

**Grand Admiral Halvard Corvane** — Human, 71. Highwater, the Aldermain.

> Tall and gaunt, white side-whiskers, a face like weathered oak. Full dress at every hour of the day: admiral's double bullion, the Corsair Wars ribbon, no decoration he did not earn.

*Face has to do:* Immovable, courteous, cold. Has not raised his voice since the Corsair Wars and has not needed to.

**Admiral Corvus Blackwater** — Human, 48. unrecorded — Far Sea, by his vowels.

> Black leather half-mask, a brass lung-cage worn over the chest and audible in a quiet room. No hair. Salt-scarred to the collar.

*Face has to do:* Exact and unhurried. Keeps every promise, including the ones enemies would rather he forgot.

**Captain Fenwick Pryor** — Human, 44. the Aldermain — minor gentry, third son.

> Sandy, going soft at the jaw, a good coat kept a year too long and brushed every morning.

*Face has to do:* Careful, agreeable, a genuinely good listener. Nobody's favourite and nobody's enemy, which is exactly why he is alive.

**Governor Tiberius Jarrold** — Human, 57. Greenholm, Whalers' Reach.

> Heavy and florid and magnificent at a dinner table. Ink on the cuffs, grey under the eyes, a hand that has begun to shake at the third glass.

*Face has to do:* Charming at a table and frightened away from one. Has stopped sleeping and will not say why.

**Captain Lorne Neddam** — Human, 33. the Salt Reach — born on a Glass Sea salt-island, took Crown pay at fifteen.

> Dark brown skin, close-shaved head, a boarder's forearms, a nose broken twice and set badly both times. Working rig; he owns one good coat and keeps it aboard.

*Face has to do:* Blunt, cheerful, physically unable to lie. The men would follow him anywhere and the Admiralty will never promote him.

**Admiral Kendrick Ozmond** — Human, 39. the Aldermain — old money, older debts.

> Beautiful and knows it. Powdered, ringed, a coat that cost more than a gun, and a sword that has never been drawn in anger.

*Face has to do:* Vain and quick and spiteful when slighted. Brilliant on a raid and wasteful with other people's crews.

**Colonel Maximilian Vierling** — Human, 62. Cinder Reach garrison stock, three generations of it.

> Grey bristle, parade-ground voice, the ramrod posture of a man who has never once sat back in a chair.

*Face has to do:* Relentless and literal. No cruelty in him and no mercy either; the Drowned Guard call him father and the islands call him the cold-baptiser.

**Envoy Adelia Marchmont** — Human, 51. the Aldermain — Admiralty clerk-caste, four generations.

> Small and grey in a plain coat, spectacles on a chain, a document case that is never further than her arm.

*Face has to do:* Unhurried, unmoved, faintly kind. Has never broken her word and has never given one that cost the Crown anything.

**Captain Sabra Veyle** — Human, 27. the Salt Reach — a Glass Sea salt-island, left at fourteen.

> Tall, dark brown skin, hair braided close under the hat. A uniform kept immaculate at her own expense because nobody issued her one that fitted.

*Face has to do:* Earnest, tireless, and allergic to irony. Takes every insult to the Crown personally and none to herself at all.

**Captain-of-Scouts Ivo Marsh** — Bog-folk, 51. the Cinder Reach swamps.

> Wrinkled grey-green hide, webbed hands, an eye that closes sideways. Swamp leathers under a Crown-green sash, boots carried and not worn.

*Face has to do:* Patient, literal, unamused. Owes the Crown a debt he considers unpaid and would find the question insulting.

**Quill** — The Hushed, age unknown. the Drowned Reach.

> Eel-thin and paper-pale, eyes with no white in them. An oiled dark wrap, bare feet, nothing on her that catches light or makes a sound.

*Face has to do:* Silent, exact, entirely without hurry. Not cruel — the word does not apply to her any more than it applies to weather.

**Rear-Admiral Godwin Thrale** — Human, 64. Wreckers' Reach — three generations of salvage men.

> A barrel of a man gone white, one ear gone above the lobe, an old coat and a newer scar. Never wears the second-best of anything.

*Face has to do:* Loud, decisive, and enjoying himself. There is no malice in him, which somehow makes the accounts worse rather than better.

**Lieutenant Cordelia Vance** — Human, 22. the Aldermain — Admiralty family, both sides of it.

> Small and freckled, red hair pinned hard under the hat, wearing her father's sword, which is four inches too long for her and which she will not have shortened.

*Face has to do:* Grave and quick and terrified of being pitied. Will take any posting nobody else wants, for exactly that reason.

### The Free Confederacy — eleven

**Commodore-Elect Adaira Hale** — Human, 46. the Aldermain — Crown magistrate until she resigned.

> Severe, greying, still in a magistrate's plain black at sea because she has not found a reason to change.

*Face has to do:* Cold and reasonable and unbending. The Confederacy's conscience, and its most convenient excuse.

**Tam Calloway** — Human, 19. the Far Sea — a fishing island with no name on any chart.

> Skinny, sunburnt, salt-bleached hair, bare feet on any deck, a fisher's knife and nothing else worth taking.

*Face has to do:* Open, reckless, easily hurt and slow to show it.

**Rosalind "Ros" Carrow** — Human, 19. Carrow, in the Amber Sea — taken, and not retaken.

> Sharp-featured, dark hair cut short with a knife and kept that way, still in mourning grey a year on.

*Face has to do:* Relentless. Funny when she is too tired to be angry, which is not often.

**Captain Silas Reyne** — Human, 34. the Amber Sea, no fixed island and no intention of getting one.

> Lean and brown, a good beard badly kept, a coat won at cards off a man who could afford it.

*Face has to do:* Glib and generous and entirely unwilling to discuss the debt. Claims to be in it for money; keeps proving otherwise.

**Anselm "Big" Torvik** — Urskin, 40. Northreach, in the Rime Reach.

> Nine feet of black pelt, both tusks whole and scrimshawed with the names of his dead, a whaler's harpoon he carries one-handed. Wears what fits, which is very little.

*Face has to do:* Slow and warm and catastrophic when it finally goes. Loyal past all reason.

**Admiral Dorian Jessup** — Human, 68. the Aldermain — forty years of Admiralty before he walked.

> White beard, ruined knees, and a Crown coat with the facings unpicked rather than replaced.

*Face has to do:* Gentle, stubborn, sad. The only man in three Seas both fleets will sit down with.

**Wyatt Ansell** — Human, 24. born Whalers' Reach, apprenticed to the Coral Reach.

> Freckled, sawdust in his hair and everything else, hands scarred white by coral.

*Face has to do:* Absorbed to the point of rudeness, shy with people and sharp about hulls. Too young to be listened to and usually right.

**Meret of Low Water** — Shoal-folk, 38. Low Water, in the Shoals.

> Small and webbed and night-eyed, in a coat sewn from eleven mismatched island cloths, one from every harbour that took her in.

*Face has to do:* Warm, apologetic, unkillably patient. Welcome everywhere and trusted nowhere important.

**Nerine Vask** — Reef-folk, 60. Coralhome, in the Coral Reach.

> Luminous eyes and gill-slits at the throat, skin going slate to bronze with her temper. A coral gorget grown rather than made, and a coat over it out of courtesy to the humans.

*Face has to do:* Formal, forgiving, and immovable on exactly one subject. Has forgiven the Crown personally and will not forgive it politically.

**Kitto of the Nine Shoals** — Shoal-folk, 17. the Shoals, in the Coral Reach.

> The smallest person on any deck, webbed, with night eyes that take up half his face. A crow's nest built to his size and a permanent bundle of somebody else's blanket.

*Face has to do:* Chattering, anxious, never off watch. Frightened of the water, which he will deny.

**Rafferty Coyne** — Human, 55. Freeport — born over the harbour office and never left it.

> Enormous and bald and aproned, a pistol belt under it, and a ledger on a chain at his waist that he has never once handed to anybody.

*Face has to do:* Jovial and mercenary. Keeps his word to the letter and not one word further, and says so up front, which most people mistake for a joke.

### The unaligned — fifteen

**Maren Quist** — Reef-folk, 44. Coralhome, in the Coral Reach.

> Luminous eyes, gill-slits at the throat, skin that goes slate when she is thinking and stays slate now.

*Face has to do:* Quiet in a way that was not always the case. Reads a sea the way other people read a page.

**Pellam Voss** — Human, 63. the Aldermain — forty years of Admiralty gundecks.

> Squat, deaf in the near ear, powder-burnt to the elbow, and disinclined to shout about it.

*Face has to do:* Plain-spoken to the point of career suicide, which is how he came to be available.

**Sable** — The Hushed, age unknown. the Drowned Reach — listed on no roll in either fleet.

> Eel-thin, paper-pale, eyes with no white in them. Oiled dark wrap, bare feet, nothing that catches light.

*Face has to do:* Not heard arriving. Nobody has worked out what binds her, including the Crown.

**Hesper Lyn** — The Rumor Guild, 41. Hearsay Cay, in the Coral Reach.

> Ink-stained fingers, spectacles pushed up into black hair, three rings and a very good coat.

*Face has to do:* Entirely open about the arrangement. There is a price list; both sides are on it.

**Brannoc Tull** — Urskin, 58. Northreach, in the Rime Reach.

> Grey-white pelt gone thin at the shoulders, one tusk broken off short and capped in scrimshawed bone, an ice-scar across the muzzle. Older and smaller than Torvik and does not need to be told so.

*Face has to do:* Slow, exact, and listened to. Forty winters of deciding which boats go out and which stay in, in front of the families of both.

**Wren Tally** — Shoal-folk, 26. the Shoals — nine years on towers nobody thought mattered.

> Small, webbed, huge night eyes, a coat too big for her because it was somebody else's.

*Face has to do:* Frightened of weather, officers and the dark below the waterline, and has never once left a post.

**Doctor Ambrose Kell** — Human, 52. no port for long — struck off in the Crown Sea.

> Thin, stooped, spectacles mended with wire, a bag that is all he kept.

*Face has to do:* Careful, curious, and incapable of not saying the thing that costs him the licence.

**Captain Isolde Marrow** — Human, 37. the Merchant Sea — a letter of marque nobody will admit to signing.

> Weather-brown, a long plait pinned up, a plain coat and a very well-kept signal gun.

*Face has to do:* Keeps her crew and keeps her word, in that order. Has resigned from both sides in writing.

**The Widow Ashgrave** — Human, 64. a witch-island in the Glass Sea that nobody charts twice.

> Black, immaculate, three widow's rings worn together, and a smile she uses like a hand of cards.

*Face has to do:* Brokers passage, marriages and truces. Being owed is the point.

**Tobias Renn** — Bog-folk, 49. the Cinder Reach swamps — Crown ground, and his.

> Wrinkled grey-green hide, webbed hands, a nictitating eye that closes sideways. Swamp leathers under a Crown-green sash that is the only Crown thing on him.

*Face has to do:* Patient well past what most people mean by the word. Considers a battle fought in daylight to be a battle somebody else arranged.

**Silvaine Crow** — Human, 35. the Crown Sea — a governor's household, for nine years.

> Neat, forgettable on purpose, grey gloves she does not take off.

*Face has to do:* Knows a lie by its echo and does not always say so.

**Jory Halloran** — Human, 19. a revenue station in the Merchant Sea, and desperate to leave it.

> Scrawny, eager, a borrowed coat with the cuffs turned, and boots he is proud of.

*Face has to do:* Adequate at everything, remarkable at nothing, and perfectly aware that this is the problem.

**Mother Bracken** — Bog-folk, 66. the Cinder Reach swamps, until she left them.

> Wrinkled grey-green hide gone pale with age, webbed hands, an eye that closes sideways, and river-weed braided in — reclaimed, not decoration.

*Face has to do:* Dry, unsentimental, and done explaining herself. Has been asked to come home once and did not reply.

**Vurn Kesk** — Urskin, 37. Northreach — struck from the whaling articles.

> Half a hand taller than Torvik and rust-red where Torvik is black. Both tusks filed flat and ringed in Crown silver, one for each name he has brought in. Wears good coats badly.

*Face has to do:* Cheerful, talkative, and entirely for sale. Will tell you what he costs before you ask, and has never yet failed to deliver.

**Hessa Fen** — Bog-folk, 29. the Cinder Reach swamps.

> Young for her hide, grey-green going darker at the shoulders, webbed, and never above the waterline when she can help it. Blacked face, blacked blade, and the green sash worn under the leathers where it will not catch light.

*Face has to do:* Quiet, fierce, and openly devoted to the Crown in a way that embarrasses actual Crown officers.
