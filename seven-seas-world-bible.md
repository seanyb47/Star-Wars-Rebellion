# MASTER OF THE SEVEN SEAS — WORLD BIBLE
## v2.1 — **superseded 19 September 2026.** A non-canon idea pool.

> **Read `CANON.md` first, and `COMBAT-MASTER-v4.2.md` for anything about
> combat, ships or their art** — this file's ship material is superseded
> outright by the master.
>
> **Read `CANON.md` first.** Sean's canon document of 19 September 2026 demotes
> this file: *"The old world bible is a non-canon idea pool: raw material, not
> truth."* Nothing here is canon on its own account. Several of its load-bearing
> ideas have since been **cut outright** — the Black Tide, the Drowned Reach,
> and the Deep as a system with its Tidecaller ranks and Crown licensing — and
> this file has not been swept for them, so it still describes a world the game
> is leaving. Section 13's island tables are the exception worth keeping: they
> are the audit trail of which original planet each island was converted from,
> which is what the 19 September rename pass was checked against.
>
> What follows is the file as it stood, kept for the raw material.

> **Instruction to Claude Code (historical):** This file is the source of truth for names, lore, factions, and the map. Keep it on hand and reference it whenever you touch anything player-facing. When a name, mechanic, or lore fact changes during development, **update this file in the same commit** and add a line to the Changelog at the bottom. Sections 0–13 are the one-for-one conversion of the original game; Section 14 is new mechanics that go *beyond* the original and are scheduled for later phases.

**Tone:** Fantasy pirates, in the register of an adventure story rather than a grim one. Sea-magic is real and visible. The water is not always water. Ships are grown as often as built. Crews are not all human. Two sides who each believe themselves the decent one — the Imperium keeps the walls standing, the Confederacy keeps the sea open, and both are right — while something older than either moves underneath. **Different crews. The same horizon.**

The dark in this world is the Tide, the kraken and the drowned places, not the people. Neither faction is written as the villain and neither is written clean: every named character gets one admirable trait and one ugly one, and the ugly ones are overreach, appetite and stubbornness rather than atrocity.

**Purpose:** A one-for-one swap table so the existing Rebellion game logic (stats, research order, mission types, facility behavior) stays intact and only names, lore, and flavor change. Every original entity has exactly one replacement. Original mechanics are paraphrased from memory of the game, not from the manual text.

**Status:** v4.9 — living document. Names are placeholders and will change; IP screening is a later step. Expect this file to grow.

---

## 0. HOW TO USE THIS (for Claude Code)

1. Treat every row in the tables as `original_id → new_display_name`. Keep the original's stat block, cost, build time, research position, and capacity. Only display name, description text, and art hook change.
2. Where the original has a *mechanic that only makes sense in space*, the "Mechanic translation" column says what it means at sea.
3. Character stats: copy the original character's stat template exactly (diplomacy / espionage / combat / leadership / research type / can-recruit / can-hold-rank / Force-sensitive slot). Only names, species, and bios change.
4. Faction A = original Empire slot (fixed capital). Faction B = original Rebel slot (movable HQ).
5. Phase 1 needs no new mechanics. Every fantasy element below is *flavor on top of an existing rule*. Later phases can promote flavor to mechanics (marked ⚙ where an obvious hook exists).

---

## 1. THE WORLD

### The Seven Seas
An archipelago world with no continents. Seven Seas, each its own archipelago with its own water, its own weather, and its own idea of what is normal. The three Inner Seas behave like seas. The four Outer Seas do not always.

### The Black Tide
Beneath and between the Seven Seas moves something older than either faction: **the Black Tide** — a living, spreading water, thick as oil and black as a shut eye, that dissolves timber, sours fresh water, and drinks islands whole. Where it makes landfall, an island's forests rot and its springs turn brackish. When it recedes it sometimes leaves behind pearl-black ambergris and coral that grows into anything you carve it toward — the most valuable substance in the world, and the reason people keep going where they shouldn't.

Nobody knows what it is. Nobody controls it. Both factions claim to be the only thing standing between the islands and it.

- **The Imperium's story:** only seawalls, discipline, and licensed Tidemasters hold the Tide back. Every island that "goes free" is an island that stops maintaining its walls. Liberty is how the Tide gets in.
- **The Confederacy's story:** the Imperium's dredging fleets pull things up out of the deep that should stay there, and the Tide follows them. The Leviathan was *found* in the Black Tide, not built. The Crown is feeding the thing it says it fights.
- **Truth:** both have evidence. Neither is entirely right.

| Original | New | Mechanic translation |
|---|---|---|
| Galaxy | **The Seven Seas** | Whole map |
| Sector | **Reach** (an archipelago inside a Sea) | Same grouping as sectors. Seven Seas fixed; *number of Reaches per Sea* scales with map size. **On the small map there is one Reach per Sea, so a Sea and its archipelago are the same thing** (7 Reaches, 63 islands). Medium and large add second and third Reaches inside a Sea (→ ~150 / 200 islands). |
| Core sectors | **The Inner Seas** (3) | Rich, charted, Imperium-leaning |
| Outer Rim sectors | **The Outer Seas** (4) | Uncharted, strange, must be explored |
| System / planet | **Island** | One node |
| Uninhabited system | **Uncharted island** | Colonize with troops |
| Hyperspace travel | **Deepwater passage** | Fleet movement between islands |
| Hyperdrive-capable | **Deepwater hull** | Can cross open sea alone |
| No hyperdrive (carried) | **Reef craft** — carried on davits or towed | Small craft carried by larger ships |
| Shields (ship) | **Warding** — iron plate, coral-grown hull, or a Tidecaller's ward | Same damage-absorb layer |
| Hull | **Hull** | Same |
| Turbolasers | **Long guns** | Anti-ship |
| Laser cannons | **Swivels & carronades** | Anti-small-craft |
| Ion cannon | **Chain-shot / stilling shot** | Disabling fire |
| Detection rating | **Watch rating** | Same |
| Popular support | **Allegiance** | A two-way balance: an island's regard for the two factions always totals 100, so there is no undecided share to win over first |
| Raw materials | **Stores** (timber, iron, hemp, tar, reef-coral) | Mines produce |
| Refined materials | **Fittings** | Refineries produce |
| Maintenance capacity | **Upkeep** (crew & victuals) | Same |
| Energy | ~~Sweetwater~~ — withdrawn | An island has one pool of **room to build**: every building takes one berth of it, companies and hulls take none |
| Natural disaster (resources destroyed) | **Black Tide landfall** | Same event. ⚙ Later: show the black stain on the map. |
| New resources appear | **The Tide recedes** — ambergris and living coral left behind | Same event |
| Advisor droid (C-3PO / IMP-22) | **Mr. Pennywhistle**, a one-eyed talking sea-parrot the Confederacy can't get rid of / **Admiral Sabine Marlow**, Second Chair of the Admiralty — the Imperator's M | UI narrator |
| Player's rank | **Imperator** (Crown) / **Captain-General of the Free** (Confederacy) | How the advisors address you; see §16.5 |

---

## 2. THE FACTIONS

### Faction A — THE CROWN IMPERIUM (original Empire slot)
*The Sovereign Admiralty of the Crown Imperium.* Ruled from **Highwater**, a fortress-island whose seawalls are three hundred feet high and carved with the names of every island the Tide has taken. Governed by a Lord Regent in the name of a boy-king nobody has seen in eleven years.

**Creed:** Order · Stability · A brighter tomorrow.
**Motto:** *Through trade, duty, and discipline, a safer world.*

**What they say about themselves:** Before the Imperium, every Reach was its own corsair kingdom and the Tide ate a village a month. The Admiralty built the walls, charted the reefs, schooled the Tidemasters, standardized the coin and ran down the wreckers. The islands are still here because of the Crown.

**What their enemies say:** The walls keep people in as well as the Tide out. The conscription rolls fall hardest on the smallest islands, which have the fewest voices at court. Tidecraft licensing means a child born with the gift is schooled at Highwater whether the family agrees or not. And the Leviathan is not a wall. It is a mouth.

**Truth:** Both. Officers run from principled to overzealous, and the good ones spend their careers arguing with the rest.

**Aesthetic:** black iron, grey stone, white sailcloth, brass. Ships are built, then *grown over* with cultivated coral for warding. Names are virtues and titles. Everything is straight lines until you look closely.

**Strengths (mirror original):** better ships early, more skilled admirals/generals (leadership bonus when the Regent is at Highwater), can assassinate. **Weaknesses:** fixed capital, fewer diplomats and recruiters, weak early small craft.

### Faction B — THE FREE CONFEDERACY (original Rebel slot)
*The Free Confederacy of the Seven Seas* — "the Brethren" to friends, "the Confederacy of Thieves" to the Admiralty. A compact of pirate captains, smugglers, exiled nobles, Reef-folk clans, Urskin whaling fleets, and witch-islands that answer to nobody. Governed by an elected **Commodore** and a shouting-match council called the **Moot**. It has no capital and no base. It has **three Pirate Lords**, each bound to a ship, and wherever the *Free Harbor* lies at anchor the Moot is sitting. It has one place, **Freeport** — the island the articles were signed on, a different island every game. It flies Confederate colours and owes the Crown nothing, but it is a birthplace rather than a capital: nothing is lost by losing it.

**The three Pirate Lords.** The Confederacy was formed at a meeting on an island past the Crown's charts, and the three captains who called it are the Confederacy: take all three and there is nobody left to lead it.

A Lord is a ship when idle and a person on an errand. Left alone they are aboard, and what the ship does is what the Lord does for the cause. Sent ashore — to parley, to spy, to sign somebody on — they are an officer like any other: they can be found out, hurt, and carried off to Highwater in irons, and their ship lies where they left it, unable to sail, her power asleep, until they are back on her deck. That is the Confederacy's whole dilemma and it is meant to hurt: the three best people they have are also three of their best hulls, and early on there is nothing else to send.

| Lord | Ship | What she does |
|---|---|---|
| **Commodore-Elect Adaira Hale** | the ***Free Harbor*** — Corwin Calloway's old coral-grown three-decker, named for what he meant her to be: any deck of his was a free harbor to anyone the Crown wanted. Sailors who fled the licensing raids found a berth aboard her, then a flag, then a cause. Everyone saw her burn at the Broken Chain; the Reef-folk sang the coral closed over the char and brought her out of the smoke. | The Moot sails with her. Wherever she lies at anchor the island comes round to the Confederacy a point a day, and she is home to anyone coming back from a parley. Heaviest hull afloat. |
| **Captain Silas Reyne** | the ***Swallowtail*** — a coral-grown sloop that should not be as fast as she is. | Faster than anything on the water. The last thing in a harbor the enemy can hit: while another Confederate hull floats beside her, the shot finds that one. |
| **Admiral Dorian Jessup** | the ***Ironback*** — the Crown dreadnought he took with him when he left the Imperium's service. | The heaviest guns on the water, and every Confederate fleet lying in her harbor fights under the Admiral's command. |

A Lord's ship does not sink. When her hull gives she strikes her colours, is taken as a prize, and the Lord goes in irons to Highwater. Exchanged or broken out, the Lord comes home with the ship, cut out of the Crown's harbor the same night. Calloway, meanwhile, came out of the Black Tide as Admiral Corvus Blackwater and hunts his own old ship for the Crown.

**How the war ends.** One way each. The Confederacy wins the day it holds Highwater. The Crown wins the day all three Lords are in irons at once.

**Creed:** Freedom · Opportunity · No masters.
**Motto:** *A wider world for those bold enough to take it.*

**What they say about themselves:** No conscription. No licences. Every captain elected, every share counted on deck, every Tidecaller free to be what the sea made them. The Imperium calls it piracy when a village keeps its own fish.

**What their enemies say:** "Free" is armed robbery with a flag. Half the Moot are honest exiles; the other half are wreckers, opportunists and a few who signed the articles one step ahead of a warrant. Their elections are whoever has the most cutlasses that morning.

**Truth:** Both. Hale spends as much of her time managing her own worst captains as fighting the Crown.

**Aesthetic:** patched, painted, mismatched. Coral-grown hulls, whalebone masts, sails dyed with squid ink. Tamed sea-beasts in the small-craft squadrons. Names are jokes, threats, and dead lovers.

**Strengths (mirror original):** three Pirate Lords and their ships, no capital to lose, more diplomats and recruiters, better small craft all game. **Weaknesses:** outgunned early; lose all three Lords and the cause dies; cannot assassinate (the Moot forbids it — the Imperium finds this hilarious).

**Design rule for ambiguity:** every named character on both sides gets one admirable trait and one ugly one. No faction owns either.

---

## 3. PEOPLES (replaces alien species)

| Original species | New people | Where | Look / notes |
|---|---|---|---|
| Human | **Human** | Everywhere | Default |
| Mon Calamari | **Reef-folk** | Coralhome (Amber Sea) | Amphibious. Gill-slits at the throat, luminous eyes, skin that shifts color with mood. Grow their ships from living coral over years. The Confederacy's best admirals. Once bound to Imperium oar-benches under an old indenture the Crown quietly stopped enforcing and has never apologised for. **Confederacy only** — which the rules enforce from 19 September, having merely said it until then. |
| Sullustan | **Shoal-folk** | The Shoals (Amber Sea) | Small, webbed, night-eyed, chattering. Can hear a ship's hull creak a mile off. Best watchers in the world; cheap to arm because they arm themselves. |
| Wookiee | **Urskin** | Northreach (Far Sea) | Huge, shaggy, tusked sea-bear folk. Harpooners and whalers. Loyal to death, slow to anger, terrifying past it. Torvik is Urskin. **Confederacy only.** |
| Bothan | **The Rumor Guild** (human) | Hearsay Cay (Amber Sea) | A guild, not a people. Ink-stained, sharp, sells to both sides. |
| Noghri | **The Hushed** | The Drowned Reach (Bone Sea) | Pale, eel-thin, silent folk from half-drowned islands. Bound to the Crown by an old bargain. Nobody hears them coming. |
| Hutt | **The Fatmouths** | Fatmouth & Blackreef | Bloated harbor-kings who own the wharves, the warehouses and most of the debts. Nobody has seen Jubal's legs; there is a rumor he doesn't have any. |
| Droids (advisors, probes, espionage droids) | **Tidewrought** | Imperium yards | Brass-and-coral automata built by Lemmick, animated by a bound sliver of the Deep. Walk the seabed. See poorly. Never tire. |
| Dresselian (Orrimaarko) | **Bog-folk** | Sea of Storms swamps | Wrinkled, patient, amphibious irregulars who fight at night and from cover. **Imperium only** — the swamps were Crown ground before the Corsair Wars and the Bog-folk held them through it. Deliberately not the Dresselians' allegiance in the source. |
| Chiss (Thrawn) | **Outlander** | Beyond the Black Tide | Thorne came from *past* the Tide, where no chart goes. Blue-grey skin, red eyes. Nobody knows what's out there. He won't say. |

---

## 4. THE DEEP (replaces the Force)

Some people are born hearing the sea. **The Deep-touched** feel weather before it breaks, know a lie by its echo, and — trained — can do things with water that water shouldn't do. **Tidecraft** is what the trained gift is called; those who wield it are **Tidecallers**, and the rare masters are **Tidemasters**.

What it looks like, by rank:
- **Novice** — uncanny luck with weather. Knows when someone's lying.
- **Apprentice** — can feel currents, find a channel in fog, sense another Deep-touched in the room.
- **Journeyman** — can call a breeze into a sail, still a cup of water, hear a ship through the hull.
- **Tidecaller** — can turn a wind, flatten a swell around one ship, speak to reef-beasts.
- **Tidemaster** — can becalm a strait, raise a wave across a harbor mouth, or make the water around a fleet go flat, black, and silent.

There is no dark side. Tidecraft is neutral; the sea doesn't care. What a person does with it is the question. The Imperium licenses it and trains its Tidecallers cold and obedient. The Confederacy mostly lets its Deep-touched run wild, which produces geniuses and disasters in equal measure. The witch-island of **Hagsmoor** trains its own and answers to no one.

| Original | New |
|---|---|
| The Force | **The Deep** |
| Force-sensitive (latent) | **Deep-touched** |
| Jedi / Jedi Knight | **Tidecaller** |
| Jedi Master | **Tidemaster** |
| Jedi Student | **Journeyman** |
| Trainee | **Apprentice** |
| Novice | **Novice** |
| Jedi training | **Tidecraft instruction** |
| Force detects Force | Deep-touched sense each other — same foil mechanic |
| Yoda / Dagobah | **Old Hesper** on **Fogmire** (Bone Sea) — last of the wild Tidemasters, ancient, tiny, half-blind, lives in a hut on stilts over water that answers when she talks to it |

⚙ *Later phase hook:* a Tidecaller-rank admiral grants a small fleet speed bonus ("calls a wind"). A Tidemaster on an island counts as an extra watch unit. Neither is needed for phase 1.

**Scripted events (Luke chain):**
- *Dagobah* → Tam Calloway sails alone to Fogmire to train under Old Hesper (~100 days away; large Deep-score boost on return; he comes back quieter).
- *"I am your father"* → Tam meets Admiral Blackwater on a mission. The water goes black and flat between them. Blackwater reveals he was Corwin Calloway, the Confederacy captain everyone believes drowned at the Battle of the Broken Chain.
- *Leia's heritage* → Tam tells Ros Carrow they are twins, separated as infants when their mother fled Highwater.
- *Luke before the Emperor* → Blackwater brings Tam before the Lord Regent at Highwater. If Tam's Deep-score is high enough he turns his father and both are taken for the Confederacy.

**Scripted events (Han chain):**
- *Bounty hunters* → Silas Reyne owes a ruinous debt to **Jubal the Fat**, corsair-king of **Blackreef**; Jubal's collectors periodically try to take him.
- *Jabba's Palace* → Reyne is taken to Blackreef and hung in a cage over Jubal's pool. Tam, Ros, and Torvik automatically go after him.

---

## 5. CHARACTERS

Roster sizes match the original: 30 per side, 6 major (always available, cannot be killed) and 54 minor (recruited). **Copy the original's stat template exactly.** Role tags for lore/art only: DIPLOMAT, SPEC OPS, LEADER, RESEARCH-SHIPS / -TROOPS / -WORKS, WILDCARD-RESEARCH, RECRUITER, DEEP.

### 5A. THE CROWN IMPERIUM (Empire roster)

**Major characters:**

| # | Original | New name | People | Role | Bio |
|---|---|---|---|---|---|
| 1 | Emperor Palpatine | **Lord Regent Halvard Corvane**, "the Old Tide" | Human | DEEP (Tidemaster), LEADER, RECRUITER, capital-bound | Has not left the citadel of Highwater in eleven years. Can still the whole harbor by standing at a window. Believes — with real evidence — that he is the only thing between the islands and the Black Tide. *Admirable:* ended the Corsair Wars; his walls have saved more lives than anyone's. *Ugly:* keeps a ledger of every name the licensing took and every island the walls did not reach in time, and has never once thought the price was too high to pay again. |
| 2 | Darth Vader | **Admiral Corvus Blackwater**, "the Drowned Admiral" | Human (once) | DEEP (Tidemaster), LEADER (any rank), RECRUITER, SPEC OPS, DIPLOMAT | Born Corwin Calloway, the Confederacy's most beloved captain. Burned and drowned when his ship went up at the Broken Chain; pulled from the Black Tide by the Regent's surgeons and rebuilt with brass lungs and a black leather mask. Where his flagship sails, the water goes flat and black. Cannot research; can do everything else. *Admirable:* keeps every promise, even to enemies. *Ugly:* executes captains for failure and feels nothing. Father of Tam and Ros — a secret. |
| 3 | Firmus Piett | **Captain Fenwick Pryor** | Human | DIPLOMAT, LEADER | Careful, competent, survives Blackwater's flagship by never being the one blamed. Good at parley because he listens. |
| 4 | Tiaan Jerjerrod | **Governor Tiberius Jarrold** | Human | DIPLOMAT, LEADER | Oversees the Leviathan's "completion" at Greenholm. Charming at dinner; has stopped sleeping. |
| 5 | Lorth Needa | **Captain Lorne Neddam** | Human | SPEC OPS, LEADER | Boarding-action specialist. Honest to a fault, which will get him killed. |
| 6 | Kendal Ozzel | **Admiral Kendrick Ozmond** | Human | SPEC OPS, LEADER | Aristocrat, vain, better at raids than fleets. Blackwater despises him. |
| 7 | Maximilian Veers | **Colonel Maximilian Vierling** | Human | RESEARCH-TROOPS, LEADER (general) | Marine drillmaster; invented the Imperium's landing doctrine and the Drowned Guard's cold-baptism. Becomes a garrison general once research is done. |

(Capture targets for Faction B: **Corvane and Blackwater**, plus **Highwater**.)

**Minor characters:**

| # | Original | New name | People | Role | Bio |
|---|---|---|---|---|---|
| 8 | Amise Griff | **Admiral Ambrose Griffith** | Human | LEADER (admiral) | Old fleet admiral, blunt, loves a stern chase. |
| 9 | Bane Nothos | **Captain Baynard Nothe** | Human | LEADER (admiral) | Blockade specialist. Patient, thorough, unloved. |
| 10 | Brandei | **Lieutenant Brandt** | Human | SPEC OPS, LEADER | Young officer on the rise; loyalty tracks the winning side. (Can betray.) |
| 11 | Bevel Lemelisk | **Master Shipwright Bevil Lemmick** | Human | RESEARCH-SHIPS / RESEARCH-WORKS | Built the Tidewrought. Hulled over the thing that became the Leviathan. Brilliant, amoral, sleeps fine. |
| 12 | Bin Essada | **Lord Benedikt Essard** | Human | DIPLOMAT | Silver-tongued plantation lord; owns half the Sugar Reach. |
| 13 | Dorja | **Captain Doria Kell** | Human | LEADER (admiral) | Line-ship captain, by-the-book, unbreakable. |
| 14 | Freja Covell | **Colonel Freya Coville** | Human | RESEARCH-TROOPS, LEADER (general) | Siege-and-landing officer; second troop researcher. |
| 15 | Garindan | **Garron "Long-Nose" Dunn** | Human | SPEC OPS (espionage) | Hooded harbor informant. Sells to whoever pays. |
| 16 | Gilad Pellaeon | **Captain Gilead Pellman** | Human | DIPLOMAT, LEADER (admiral) | The decent one. Honorable, competent, quietly sick of his orders. |
| 17 | Grammel | **Captain Grammond** | Human | LEADER (commander) | Flotilla captain for the gunboat squadrons. |
| 18 | Labansat | **Laban Satterly** | Human | SPEC OPS | Ex-smuggler turned Crown agent; knows every hidden channel in the Bone Sea. |
| 19 | Menndo | **Menno Drecht** | Human | SPEC OPS | Marine sergeant. Cutlass, no imagination, no fear. |
| 20 | Natasi Daala | **Admiral Natalya Dahl** | Human | LEADER (admiral) | Brilliant, ambitious, furious at being posted to a backwater. |
| 21 | Niles Ferrier | **Niles Farrow** | Human | SPEC OPS (espionage), RESEARCH-SHIPS | Ship thief. Steals designs as readily as hulls. |
| 22 | Noval Garaint | **Captain Nowell Garant** | Human | LEADER (admiral) | Steady convoy commander. |
| 23 | Orlok | **Colonel Orlock** | Human | LEADER (general) | Garrison colonel. Hard on deserters, feeds his men better than the regulations require. |
| 24 | Pter Thanas | **Commander Piers Thane** | Human | DIPLOMAT | Prefers a treaty to a broadside. |
| 25 | Shenir Rix | **Sheridan Rix** | Human | SPEC OPS | Crown assassin-courier; leaves no witnesses. |
| 26 | Thrawn | **Grand Admiral Cassian Thorne** | Outlander | WILDCARD-RESEARCH, LEADER (admiral) | Came from beyond the Black Tide. Studies an enemy's figureheads and shanties to predict how they'll fight. Coldest mind in the Imperium; the Regent doesn't fully trust him and shouldn't. |
| 27 | Villar | **Captain Villiers** | Human | LEADER (admiral/general) | Reliable second-tier commander. |
| 28 | Zuggs | **Tobias Zeck** | Human | SPEC OPS | Gutter-born marine; saboteur and knife man. |
| 29 | Boba Fett | **Bastian Ferro** | Human? | SPEC OPS (combat/espionage) | Masked bounty hunter in a coat of riveted iron plate and coral. Has never been seen to eat. Works for coin, not flag. |
| 30 | Mara Jade | **Lyra Vesper**, "the Regent's Hand" | Human | DEEP, SPEC OPS | Corvane's personal blade, taken at six for licensing and raised in the citadel. A Tidecaller who can walk across a still harbor without a boat. Has a conscience she keeps locked in a chest. |

### 5B. THE FREE CONFEDERACY (Rebel roster)

**Major characters:**

| # | Original | New name | People | Role | Bio |
|---|---|---|---|---|---|
| 1 | Mon Mothma | **Commodore-Elect Adaira Hale** | Human | DIPLOMAT, RECRUITER, HQ-bound | Former Imperium magistrate who resigned over the licensing raids and has held a pack of pirates together for six years by force of argument. *Admirable:* incorruptible. *Ugly:* has looked away from what some captains do because she needs their hulls. |
| 2 | Luke Skywalker | **Tam Calloway** | Human | DEEP (Novice), SPEC OPS, LEADER, RECRUITER, DIPLOMAT | Fisher's boy from the Far Sea. The fish come to his boat. Old sailors cross themselves when he walks past. Raw, brave, and going to be either the greatest Tidecaller in a generation or dead by twenty-two. Blackwater's son. |
| 3 | Leia Organa | **Rosalind "Ros" Carrow** | Human | DIPLOMAT, RECRUITER, latent DEEP | Heir of the island of Carrow, which the Black Tide took while the Imperium's fleet "held position" a day's sail away. The Confederacy's best negotiator; tireless, sharp, running on grief. Tam's twin — neither knows. |
| 4 | Han Solo | **Captain Silas Reyne** | Human | SPEC OPS, RECRUITER, LEADER | Smuggler captain of the *Swallowtail* — a coral-grown sloop that shouldn't be as fast as it is (+50% speed carrying only named characters). Owes Jubal the Fat more than a ship is worth. Claims to be in it for the money; keeps proving otherwise. |
| 5 | Chewbacca | **Anselm "Big" Torvik** | Urskin | SPEC OPS | Reyne's first mate: a tusked, shaggy mountain who can throw a harpoon through a hull. Loyal past all reason. Surprisingly good at parley when Reyne shuts up. |
| 6 | Jan Dodonna | **Admiral Dorian Jessup** | Human | DIPLOMAT, LEADER (general) | Elderly ex-Imperium admiral; the Confederacy's grandfather figure and best early diplomat. |
| 7 | Wedge Antilles | **Wyatt Ansell** | Human | RESEARCH-SHIPS, LEADER (commander) | Young cutter-captain and self-taught shipwright who's learning to grow coral hulls from the Reef-folk. First click every game: send him to a slipway. |

(Capture targets for Faction A: **Calloway and Hale**, plus **the Free Harbor**.)

**Minor characters:**

| # | Original | New name | People | Role | Bio |
|---|---|---|---|---|---|
| 8 | Adar Tallon | **Adrian Tallow** | Human | LEADER (admiral) | Retired Imperium tactician living under a false name in the Glass Sea. |
| 9 | Afyon | **Captain Aphra Fenn** | Human | LEADER (admiral) | Cautious escort captain; keeps troopships alive. |
| 10 | Bren Derlin | **Major Brenna Durling** | Human | LEADER (general) | Ran the defense of the Far Sea forts. |
| 11 | Borsk Fey'lya | **Bartholomew Fenley** | Human (Rumor Guild) | DIPLOMAT | Merchant-politician on the Moot; persuasive, self-serving. (Can betray.) |
| 12 | Carlist Rieekan | **General Carsten Reike** | Human | LEADER (general) | Steady, grim, evacuates before it's too late. |
| 13 | Crix Madine | **Major Cormac Dane** | Human | SPEC OPS, RESEARCH-TROOPS | Former Crown Marine officer who defected after a cold-baptism went wrong; trains the Cutthroats. |
| 14 | Garm Bel Iblis | **Lord Garrin Beloise** | Human | DIPLOMAT, LEADER | Dissident Sugar Reach noble with a private squadron; clashes with Hale. |
| 15 | Gial Ackbar | **Admiral Halloran Quist** | Reef-folk | LEADER (admiral) | Once an Imperium slave-oarsman. The Confederacy's greatest fleet mind; his skin goes red when he's about to win. |
| 16 | Hiram Drayson | **Hiram Drace** | Human | LEADER (admiral) | Dependable convoy admiral. |
| 17 | Huoba Neva | **Huon Nevis** | Human | DIPLOMAT | Traveling preacher-diplomat who sways islands from a tavern table. |
| 18 | Judder Page | **Sergeant Jory Padgett** | Human | SPEC OPS | Leads the boarding parties; quiet, precise, lethal. |
| 19 | Kaiya Adrimetrum | **Kaia Adrienne** | Human | DIPLOMAT, LEADER | Island-council organizer; starts and calms mutinies with equal skill. |
| 20 | Lando Calrissian | **Lucian Fairweather** | Human | DIPLOMAT, SPEC OPS, LEADER | Gambler-governor of **Varrow**, the floating market. Sold Reyne out once; buying it back. |
| 21 | Mazer Rackus | **Mace Ruckley** | Human | SPEC OPS | Wrecker from the Scrap Reach; blows things up for a living. |
| 22 | Ma'w'shiye | **Marisol Shay** | Human | SPEC OPS | Knife-thrower and infiltrator from the Bone Sea havens. |
| 23 | Arhul Narra | **Arlen Nash** | Human | LEADER (commander) | Veteran wing-captain of the cutter squadrons; Ansell's mentor. |
| 24 | Orrimaarko | **Orrin Marsh** | Bog-folk | SPEC OPS | Held the swamps of his home island for the Imperium for a decade, against people who knew them nearly as well. |
| 25 | Roget Jiriss | **Roger Jarvis** | Human | SPEC OPS | Ex-harbor-watch captain who knows how the Crown's watches think. |
| 26 | Sarin Virgilio | **Serena Virgil** | Human | LEADER (admiral) | Young line-captain, aggressive, wins or sinks. |
| 27 | Syub Snunb | **Sybil Nunn** | Shoal-folk | LEADER (commander) | Scout-captain of the Reefwalker cutters; hears ships through fog. |
| 28 | Talon Karrde | **Tallis Kade** | Human | RESEARCH-WORKS, DIPLOMAT, LEADER | Information broker with a fleet of his own; neutral until the price is right. |
| 29 | Tura Raftican | **Thora Raftery** | Human | DIPLOMAT | Whaling-fleet matriarch; her word moves the Far Sea. |
| 30 | Vanden Willard | **Vance Willoughby** | Human | DIPLOMAT, LEADER (general) | Old Confederacy general; patient negotiator. |

**Wildcard researcher (Rebel side):** assign **Lucian Fairweather** if the stat template calls for one; otherwise keep the original's assignment.

**Event NPCs (not recruitable):**

| Original | New |
|---|---|
| Yoda | **Old Hesper** (Fogmire) |
| Jabba the Hutt | **Jubal the Fat**, Fatmouth corsair-king of Blackreef |
| Bounty hunters (event) | **Jubal's collectors** |

---

## 6. SHIPS

Design rule: Imperium ships are built straight and then warded with cultivated coral — black iron, white sail, brass fittings, names of virtues. Confederacy ships are grown, stolen, or patched — whalebone, squid-ink sail, coral hulls, tamed beasts on the flanks, names that are jokes or threats. Keep every ship's original stats, capacities, and research position.

### 6A. Crown Imperium fleet

| # | Original | New (class name) | Type | Notes / mechanic translation |
|---|---|---|---|---|
| 1 | Death Star | **The Leviathan** | Superweapon | Not built — *found*. A colossal sea-beast's carcass dredged from the Black Tide, hulled over in iron, its ribs for a keel. Its jaw, **the Maw**, is a gun the size of a cathedral that fires black water. "Destroy planet" → **the Maw drowns the island**: seawall shattered, springs soured, harbor dead. Node becomes a dead atoll (no facilities, no population, cannot be rebuilt). ⚙ Later: the drowned island's stain slowly spreads to neighbors' allegiance. |
| 2 | Imperial Dreadnaught | **Ironback** (old first-rate) | Capital | Pre-war ship of the line. Identical to the Confederacy's captured version. |
| 3 | Carrack Light Cruiser | **Kestrel** sloop-of-war | Escort | Early anti-small-craft; fast; good courier. |
| 4 | Galleon | **Fluyt** | Transport | Unarmed, 2 troops. |
| 5 | Escort Carrier | **Escort Barque** | Carrier | Carries small-craft squadrons on davits; light swivels. |
| 6 | Victory-class Star Destroyer | **Vengeance** bomb-galleon | Capital (bombardment) | Heavy mortars for shore bombardment. |
| 7 | Imperial-class Star Destroyer | **Sovereign** first-rate | Capital | Backbone of the fleet: 6 squadrons, 3 troops, no swivels. Coral-warded. |
| 8 | Lancer Frigate | **Harrier** chaser-frigate | Escort | Bristling with swivels; shreds small craft; no long guns. |
| 9 | Star Galleon | **Great Galleon** | Transport | 3 troops. |
| 10 | Assault Transport | **Courier** cutter | Transport | 1 troop; fastest Imperium hull; character taxi. |
| 11 | Interdictor Cruiser | **Stillwater** | Support | Carries a chained, licensed Tidecaller in its hold who **becalms the strait** — enemy fleets cannot flee (replaces gravity-well). Crews hate serving on them. |
| 12 | Victory II-class | **Retribution** bomb-galleon | Capital (bombardment) | Upgraded mortars. |
| 13 | Strike Cruiser | **Razorback** heavy frigate | Capital (light) | Cheap gun platform; 1 troop; no small craft. |
| 14 | Imperial II-class | **Dominion** first-rate | Capital | The Sovereign, refined. |
| 15 | Super Star Destroyer | **Colossus** — the *Sovereign's Wrath* | Capital (apex) | Triple-hulled iron monster grown over a whale-spine keel. Blackwater's flagship. The water around it is always flat. |

**Imperium small craft (squadrons; reef craft unless noted):**

| Original | New | Notes |
|---|---|---|
| TIE Fighter | **Wasp** gunboat | Cheap, weak, unwarded |
| TIE Bomber | **Mortar Launch** | Bombardment craft |
| TIE Interceptor | **Hornet** fast gig | Straight upgrade to Wasp |
| TIE Defender | **Dragonfly** — Tidewrought cutter | Crewed by brass automata; warded *and* deepwater-capable (the only Imperium small craft that can sail alone) |

### 6B. Free Confederacy fleet

| # | Original | New (class name) | Type | Notes / mechanic translation |
|---|---|---|---|---|
| 1 | Alliance Dreadnaught | **Ironback** (captured) | Capital | Same as Imperium's. |
| 2 | Alliance Escort Carrier | **Escort Barque** | Carrier | Same stats. |
| 3 | Bulk Cruiser | **Converted Merchantman** | Capital (poor) | A fat trader with guns bolted on. Bad. |
| 4 | Bulk Transport | **Whaler** troopship | Transport | 6 troops, unarmed. Urskin-built. |
| 5 | Medium Transport | **Brig** | Transport | 2 troops; colonizing/scouting. |
| 6 | Corellian Corvette | **Swift** schooner | Escort | Early anti-small-craft; iconic. |
| 7 | Nebulon-B Frigate | **Tempest** frigate | Capital | First unlock; carries 2 squadrons. |
| 8 | Mon Calamari Cruiser | **Reef-class** ship of the line | Capital | *Grown*, not built — a living coral hull the Reef-folk sing into shape over years. No two alike. 3 squadrons, 1 troop. |
| 9 | Corellian Gunship | **Sawfish** gun-schooner | Escort | Best Confederacy anti-small-craft. |
| 10 | CC-7700 Frigate | **Kraken-caller** | Support | A Reef-folk ship whose crew wakes something under the reef to hold the enemy fleet in place. Same mechanic as the Stillwater. |
| 11 | Assault Frigate | **Marauder** heavy frigate | Capital | Extra firepower, no capacity. |
| 12 | Liberator Cruiser | **Liberty** fast ship of the line | Capital | Heavy warding, 3 troops. |
| 13 | CC-9600 Frigate | **Razee** | Capital (light) | A cut-down ship of the line; cheaper Marauder. |
| 14 | Dauntless Cruiser | **Undaunted** great ship | Capital | Rough equal of a Dominion; 4 squadrons. |
| 15 | Bulwark Battlecruiser | **Bastion** great ship | Capital (apex) | Coral-grown over a leviathan rib the Reef-folk pulled from the Bone Sea. The Confederacy's answer to the Colossus. |
| — | Alliance headquarters | **the *Free Harbor*** | Unique (Lord) | Hale's ship, the Moot's deck. Never built, never replaced. See §2, Faction B. |
| — | Millennium Falcon | **the *Swallowtail*** | Unique (Lord) | Reyne's sloop. Fastest thing afloat; hit last. See §2, Faction B. |
| — | (none) | **the *Ironback*** | Unique (Lord) | Jessup's captured dreadnought. Heaviest guns; commands every Confederate fleet in her harbor. See §2, Faction B. |

**Confederacy small craft (all warded and deepwater-capable, mirroring "all Rebel fighters have shields and hyperdrive"):**

| Original | New | Notes |
|---|---|---|
| X-wing | **Sabre** armed cutter | All-rounder; build these forever |
| Y-wing | **Mule** bomb-launch | Slow bombardment craft |
| A-wing | **Ray-riders** | Reef-folk riding tamed giant rays; fastest thing on the water; anti-small-craft |
| B-wing | **Hammer** heavy mortar-launch | Late heavy bombardment craft |

### 6C. What each hull is good and bad against

Sean, 19 September: *"Delete the description text that repeats the stats... Replace it with 1-2 sentences of in-world flavor text per ship that tells the player what the ship is good and bad against, naturally."* These are the lines the ship sheet prints under the stat grid, and they are deliberately free of numbers — the grid is directly above them and says the numbers better. They live in `src/data/ship-flavour.json` rather than in `combat-ships.json`, because that file carries a standing instruction to be changed by re-reading the sheet and never by hand; a line written into it would be gone at the next import. A test fails if a hull has no line, or a line has no hull.

**Crown Imperium**

| R | Ship | What she is for, and what undoes her |
|---|---|---|
| S01 | **Wayfinder** | Two guns and a chart table. She finds islands and she settles them, and the only thing she beats is an empty anchorage — put her within sight of a warship and the troops in her belly go down with her. |
| S02 | **Interceptor I** | Nothing heavy can hold her in its sights, so she lives among the cutters and the couriers and cuts them up at leisure. One broadside from anything plated is all it has ever taken. |
| S03 | **Morningstar** | Her heavy guns go through plate and her own plate turns most of what comes back, so she breaks early frigates and harbor walls alike. She is far too slow to refuse a fight, and the long-gunned ships of the middle war shoot her to pieces before she is in range to answer. |
| S04 | **Sovereign** | She carries a small army and the guns to clear the beach for it, and nothing in the early war can stop her arriving. She has no long guns at all, so she takes the whole approach standing up. |
| R1 | **Vanguard** | Cheap for her size and a wall of shot against sloops, brigs and anything sailing unplated. Against a proper ship of the line she is a great deal of hull and not enough gun. |
| R2 | **Resolute** | Quick and cheap, made for running down a scout or a lone transport. Anything built for a line action will take her apart, and her one mercy is that she is fast enough to leave before it does. |
| R3 | **Bulwark** | Plated heavily enough that light shot rings off her, and long-gunned enough to open the argument before the other side can answer. She cannot catch anything, so a fast hull that keeps its distance will out-sail her all day. |
| R4 | **Vanguard II** | Everything the first Vanguard was, with plate that turns light shot and heavy guns that go through it. She still carries no long guns, so whoever does gets the first word and she has to stand and eat it. |
| R5 | **Interceptor II** | Too quick to be held in a sight and armed to open at distance: small craft never live to close with her. A single heavy broadside, the one time one lands, ends her. |
| R6 | **Justiciar** | Guns of all three kinds, so she is never carrying the wrong weapon for what she has met — a plated liner and a swarm of cutters go the same way. She is thin-hulled for her size and carries nobody, so she can win the water off an island and never take it. |
| R7 | **Sovereign II** | Heavy enough to break a line, plated enough to survive one, and quick enough for a ship of her bulk to choose her own fight. Short of a Majestic there is nothing afloat she ought to lose to. |
| R8 | **Majestic** | The heaviest battery and the heaviest plate in either navy, and an army in her hold besides: one to one there is nothing she cannot out-shoot. She is slow, so the choice of whether to fight her is never hers, and two lighter hulls at once is exactly what it takes. |

**Free Confederacy**

| R | Ship | What she is for, and what undoes her |
|---|---|---|
| S01 | **Swift** | A pair of eyes and a fast hull, and that is the whole of her. Anything at all will sink her, so the entire trick is never being where it is. |
| S02 | **Brigantine** | A merchantman with a pair of guns bolted on: she is for putting troops on a quiet beach. If there is anything in the anchorage built to fight, she does not arrive. |
| S03 | **Chimera** | Plated well past her size and cheap to keep, which makes her an infuriating thing to shift off a harbor mouth — light shot simply will not tell on her. She has almost nothing to shoot back with, so she wins by lasting rather than by hitting. |
| S04 | **Tidestalker** | She mends herself faster than a squadron can wear her down, which makes her the ship for a long season of small actions. Her plate is thin, and one heavy broadside undoes a fortnight of healing. |
| R1 | **Marauder** | Fast and cheap with two troops below: she is made for undefended harbors and merchantmen sailing alone. A warship of any size finishes her inside a single exchange. |
| R2 | **Cutlass** | Heavy guns on a hull that small have no business existing, and plated sloops have learned it the hard way. Her own plate is paper and she is not quick enough to leave when it turns against her. |
| R3 | **Tempest** | Long guns and good plate on a fast hull: she opens the action, hurts, and turns away most of the answer. There is very little behind that plate, and the second exchange is never hers. |
| R3 | **Urskin Whaler** | A whaler with gunports cut into her: thick-planked, patient, and armed well enough that a raider thinks twice about the troops she is carrying. She has no long guns and no turn of speed, so anything that wants the fight gets it on its own terms. |
| R4 | **Reefwarden** | A capital ship's battery on a hull costing a fraction of one — she goes through plate that ought to stop her, and lands troops afterwards. She is hollow for her size, so she wins in the first exchange or she does not win. |
| R5 | **Ironback** | All long guns: she opens the action a mile out and opens harbor walls from the same distance, and a ship without the reach to reply is beaten at her leisure. Let anything close and she has almost nothing left to fight with. |
| R6 | **Blackfin** | A storm of light shot, and against bare timber it is murder — she eats scouts, transports and unplated escorts. Put her in front of anything properly plated and every ball she fires rings off the iron. |
| R7 | **Urskin Goliath** | More hull than anything else afloat, guns that reach and guns that break plate, and an army in her hold. One of her will lose to a Majestic; two will not, and the Confederacy can afford two. |
| R8 | **Coral-Class Dreadnaught** | Plated like a fortress, armed for every kind of target, and she grows back between actions what you take off her. Only a Majestic out-shoots her, and even that is a long afternoon's work. |

---

## 7. GROUND FORCES

Keep original offense/defense/watch ratings and research positions.

### 7A. Crown Imperium

| Original | New | Notes |
|---|---|---|
| Army Regiment | **Crown Regulars** | Line infantry (watch 15) |
| Fleet Regiment | **Ship's Company** | Sailors put ashore (watch 20) |
| Stormtrooper Regiment | **Crown Marines** | The iconic white-coats; best starting troop (watch 25) |
| War Droid Regiment* | **Tidewrought** | Brass-and-coral automata that walk the seabed and climb out of the surf. Hit hard, see nothing (watch 5) |
| Dark Trooper Regiment* | **The Drowned Guard** | Marines who've been *cold-baptized* — held under the Deep until they stop struggling and brought back. Black plate, no fear, and something missing behind the eyes. Best Imperium troop (watch 30) |

### 7B. Free Confederacy

| Original | New | Notes |
|---|---|---|
| Army Regiment | **Island Militia** | Basic (watch 10) |
| Fleet Regiment | **Ship's Company** | Sailors ashore (watch 15) |
| Sullustan Regiment* | **Reefwalkers** | Shoal-folk scouts; cheap, quick, best watch in the game (35) |
| Mon Calamari Regiment* | **Reef Guard** | Reef-folk in coral plate; best defense (watch 20) |
| Wookiee Regiment* | **Urskin Berserkers** | Torvik's people with harpoons; best offense (watch 20) |

(*) must be researched.

---

## 8. SPECIAL FORCES

| Original | New | Missions |
|---|---|---|
| **Imperium** | | |
| Imperial Probe Droid | **Tidewrought Picket** | A brass walker dropped overboard to walk the seabed and report. Exploration; build in tens late to hunt the Free Harbor |
| Espionage Droid | **Crown Informants** | Spying |
| Imperial Commandos | **Crown Raiders** | Sabotage, incite/suppress mutiny |
| Noghri Death Commandos | **The Hushed** | Abduction, assassination, rescue |
| **Confederacy** | | |
| Y-wing Longprobe | **Scout Sloop** | Exploration |
| Bothan Spies | **Rumor Guild** agents | Spying (espionage 70 vs Informants' 60) |
| Infiltrators | **Cutthroats** | Abduction, rescue, sabotage |
| Guerillas | **Agitators** | Incite/suppress mutiny only |

---

## 9. FACILITIES

| Original | New | Notes |
|---|---|---|
| Construction Yard | *(cut 20 September)* | No such building: a building is raised on the island it stands on |
| Advanced Construction Yard | *(cut with it)* | |
| Orbital Shipyard | **Shipyard** | Builds ships and small craft |
| Advanced Shipyard | **Dry Dock** (Imperium) / **Coral Bed** (Confederacy) | 2× speed; same stats, different art |
| Training Facility | **Barracks** | Troops and special forces. Renamed 20 September |
| Advanced Training Facility | *(not built)* | The second tier does not exist; **Marine Barracks** is retired as a name, the plain Barracks having taken the word |
| Mine | **Camp** (timber / iron / hemp / coral-bed — art varies by island) | Produces Stores |
| Refinery | **Mill** (sawmill / foundry / ropewalk / coral-kiln) | Stores → Fittings; each Camp+Mill pair adds 50 Upkeep |
| GenCore Level I | **Seawall** | Blocks bombardment; two block landings. Also what keeps the Black Tide out — flavor only |
| GenCore Level II | **Warded Seawall** | Coral-grown and Tidecaller-warded; 2× strength, less upkeep |
| LNR Series I | **Shore Battery** | Fires on bombarding ships |
| LNR Series II | **Fortress Guns** | Heavier; with a general present can sink anything |
| KDY-150 Ion Cannon | **Fireship Battery** | Launches fire-ships to cover an escape through a blockade |
| Death Star Shield (Imperium only) | **The Leviathan's Cage** | Chain-and-coral boom that prevents attack runs on the Leviathan |

Energy → **Sweetwater**: every facility needs one unit; Camps also need one unit of Stores capacity.

---

## 10. MISSIONS & RANKS

| Original | New | Notes |
|---|---|---|
| Assassination (Empire only) | **Assassination** (Imperium only) | The Moot forbids it |
| Abduction | **Kidnap** | |
| Espionage | **Spying** | |
| Incite Uprising | **Incite Mutiny** | |
| Subdue Uprising | **Put Down Mutiny** | |
| Sabotage | **Sabotage / Scuttling** | |
| Death Star Sabotage (Rebel only) | **Scuttle the Leviathan** | Confederacy only |
| Recruitment | **Recruitment** | |
| Facility / Troop / Starship Design Research | **Works / Drill / Ship Design** | |
| Diplomacy | **Parley** | |
| Rescue | **Jailbreak** | |
| Jedi Training | **Tidecraft Instruction** | Requires a Tidecaller or better |

Admiral → **Admiral**. General → **General**. Commander → **Wing-Captain** (small craft and ray-riders).

---

## 11. FLAVOR & UI STRINGS

### One word per idea

Sean's word of 17 September, and the rule the whole interface is held to: a
**label** uses the agreed word, and **prose keeps its voice**. In a sentence a
location is still an island, because in this world it is one; what is forbidden
is a second word for the same idea in a label. All of these live in
`src/data/terms.json`, and a test fails the build if one of the retired words
reaches the player.

| Idea | The word | Retired |
|---|---|---|
| A person of yours | **Crew** (one of them, a *crew member*) | officer, personnel |
| Talking a place round | **Parley** | diplomacy |
| A crew member who is good at it | **Negotiator** | diplomat |
| The whole archipelago, opened | **World Map** | the chart, the Seas |
| One Reach, opened | **Reach Map** | the chain view |
| One island, opened | **Location** | island, port, harbor |

The three views name themselves in the same place every time: the World Map is
what the tab bar calls itself, and a Reach sheet and an island sheet each carry
a small **eyebrow** above the title saying which of the three you are looking
at.

| Original | New |
|---|---|
| Credits | **Crowns** (Imperium) / **Shares** (Confederacy) — cosmetic |
| Opening crawl | A ship's log entry / a Moot proclamation, read over black water |
| "Rebel scum" / "Imperial dogs" | "Brethren" / "Crown dogs"; "pirates" / "pressmen" |
| Hyperspace jump | Sails filling, fleet clearing the harbor mouth; a Tidecaller's ship leaves a flat wake |
| Space battle screen | Sea battle; wind direction as a visual only in phase 1 |
| Planet destroyed | Island drowned — seawall shattered, black water in the harbor, node greys out |
| Natural disaster popup | "The Black Tide has made landfall at [island]." |
| Resource discovery popup | "The Tide has receded from [island], leaving ambergris." |

---

## 12. OPEN QUESTIONS

1. Leviathan: *sink* the island (node removed) or *drown* it (node stays, dead)? Draft assumes drown.
2. Should the Black Tide ever be a *mechanic* (spreading stain, allegiance drag) or stay pure flavor on the existing disaster event? Draft: flavor in phase 1, hook noted.
3. Tidecraft in battle (⚙ hooks) — phase 2 or never?
4. Naming register: Imperium reads English/Dutch, Confederacy mixed, Far Sea Norse. Shift any of them?
5. ~~**Reach count on the small map.**~~ **Settled 2026-09-12.** The small map is now **seven Reaches, one per Sea** — three Inner and four Outer, as the bible always wanted. Sugar goes back to the medium map and Whalers' and Mirage join it, because the chart is a painting now and those three clusters could not be charted clearly. See §13.
6. ~~**Tallow Cay as the Confederacy's known start.**~~ **Settled 2026-09-15.** There is no base, but there is a **place**: the island the articles were signed on is called **Freeport**, and a different island wears the name every game. One uncharted island in Salt or Rime Reach takes it, keeping the position, outline and room the painting gave it. Freeport opens a hundred per cent Confederate, as Highwater opens a hundred per cent Imperium, with a seat's garrison and the three Lords' ships lying there. It is a landmark, not a capital: nothing is lost by losing it.
7. **Section 14 data-model hooks.** No hidden `loyalty` field has been added to characters yet — an unused field that nothing reads or writes is dead weight until 14.2 is built. Neutral-owned islands with garrisons already exist, so 14.1 needs no groundwork.

---

## 13. THE MAP — SEAS, REACHES, AND THE ISLANDS

**Structure:** Sea (region, 7 fixed) → Reach (an archipelago, 7–12 islands) → Island (= original system). Each island keeps its original planet's slot stats (fresh-water/energy, Stores capacity, facility slots, starting owner, starting loyalty, starting facilities). Only the name changes.

**On the small map there are seven Reaches, one for each Sea.** A Sea and its
archipelago are the same thing at this size, which is why the chart can name
the Seas and an island panel can name the Reach without either of them lying
about what you are looking at. Larger maps put a second and third archipelago
inside a Sea; the Sea count never changes, because it is in the title.

**Map sizes.** `small` Reaches appear on every map; `medium` are added on the
medium map; `large` on the large map.

| Map | Inner (core) Reaches | Outer (rim) Reaches | Islands |
|---|---|---|---|
| Small (7) | Sovereign, Shipwrights', Coral | Rime, Cinder, Salt, Wreckers' | 62 |
| Medium (15) | + Sugar, Grey | + Whalers', Mirage, Scrap, Monsoon, Still, Drowned, Witch | ~150 |
| Large (20) | + Lantern | + Quarry, Last, Rice | ~200 |

**Island counts are not uniform, and that is deliberate.** A Reach holds
between seven and twelve islands, set by how many its painted cluster on the
chart can show as separate places at a 48-unit spacing: Sovereign and Cinder
and Salt and Wreckers' are crowded archipelagos, Coral and Rime are small ones.
Seventy-one islands rather than a hundred, and the chain view can lay every one
of them out clearly, which the flat ten could not.

**What was cut, and why it is not a loss.** The small map used to carry ten
Reaches. **Whalers'**, **Sugar** and **Mirage** are now held back for the medium
map alongside **Scrap**. Each shared a Sea with a Reach that survives — Whalers'
with Rime in the Far Sea, Sugar with Coral in the Amber, Mirage with Salt in the
Glass — so every Sea keeps its place, its character and its named islands in the
fiction. What went is a second archipelago inside three Seas, and each of the
three sat on a painted cluster the chart could not show cleanly: Whalers' on
islets too small to hit, Sugar and Mirage running together with their neighbours
down the right-hand side.

**This also settles open question 5.** The bible wanted three Inner Reaches and
the generator was making four, because Sugar had been promoted to fill it.
Sugar is now held back, and the small map is three Inner and four Outer as
written.

**Rendering suggestion:** draw each Sea as its own archipelago with a distinct water color and island silhouette style. Highwater is drawn oversized with a walled harbor but is still one node.

### The Crown Sea (Inner Sea)
*Temperate, grey, fortified. Stately names. Seat of the Imperium.*

**Sovereign Reach** (orig. Sesswenna sector — `small` map; **10 islands charted**)

| Original | Island | Notes |
|---|---|---|
| Averam | **Avermere** |  |
| Balmorra | **Ballmoor** | foundries — arms island |
| Bortras | **Bracton** |  |
| Chandrila | **Chandler's Rest** | Hale's birthplace; quietly Confederacy-leaning |
| Corsin | **Corsham Head** |  |
| Coruscant | **Highwater** | IMPERIUM CAPITAL — fixed HQ, 100% loyal |
| Ghorman | **Gorley** | site of an old massacre; hates the Crown |
| Svivren | **Sievern** |  |
| Uvena | **Ulverne** |  |
| Yaga Minor | **Yarrow Minor** | royal dockyard |

**Grey Reach** (orig. Dolomar sector — `large` map)

| Original | Island | Notes |
|---|---|---|
| Balfron | **Belfrey** |  |
| Caprionril | **Capperil** |  |
| Kamparas | **Kempsley** |  |
| Ketaris | **Ketterly** |  |
| Omwat | **Ombwick** |  |
| Pantolomin | **Pantlow** |  |
| Phorliss | **Forliss** |  |
| Sarka | **Sarkholm** |  |
| Tangrene | **Tanglewick** |  |
| Wor Tandell | **Wortendale** |  |

### The Merchant Sea (Inner Sea)
*Mediterranean: sun, terraced harbors, guild towns, the best slipways. Italian/Iberian-flavored names.*

**Whalers' Reach** (orig. Corellian sector — `small` map; **16 islands charted** — the long chain down the west; called Shipwrights' Reach until v5.8)

| Original | Island | Notes |
|---|---|---|
| Commenor | **Ashcombe** |  |
| Corellia | **Wrightsport** | shipwright capital of the Seven Seas; Reyne's home port |
| Corfai | **Oakhanger** |  |
| Drall | **Sawtry** |  |
| Duros | **Starcross** | old seafaring people; navigators |
| Selonia | **Pitchcombe** |  |
| Talus | **Tarmouth** |  |
| Tralus | **Ropley** |  |
| Vagran | **Wainfleet** |  |
| Xyquine | **Ciquina** |  |

**Lantern Reach** (orig. Fakir sector — `large` map)

| Original | Island | Notes |
|---|---|---|
| Ando | **Andoro** | fisherfolk; rough |
| Berchest | **Berquessa** |  |
| Bimmisaari | **Chepstow** | market island |
| Carida | **Kingsward** | the Imperium's naval academy |
| Delaya | **Delaira** | sister-island of drowned Carrow; Ros Carrow's exile home |
| Halowan | **Halowar** |  |
| Mrisst | **Marista** |  |
| Obroa-skai | **Cartmel** | the Great Library; charts and archives |
| Palanhi | **Marlbury** |  |
| Ralltiir | **Minterne** | banking houses |

### The Amber Sea (Inner Sea)
*Tropical / Caribbean: plantations, sugar, reefs, hurricanes, old money with divided loyalties.*

**Coral Reach** (orig. Sluis sector — `small` map; **8 islands charted**, and uncharted at the start — the spiral atoll in the south-east, which is where a reef belongs)

| Original | Island | Notes |
|---|---|---|
| Bothawui | **Hearsay Cay** | home of the Rumor Guild (Guild Spies) |
| Bpfassh | **Hawksbill Bay** |  |
| Denab | **Denby Cay** |  |
| Kothlis | **Cothlis Cay** | Guild outpost |
| Mon Calamari | **Coralhome** | the Reef people; builds Reef-class ships; Quist's home |
| Orto | **Ortovale** |  |
| Praesitlyn | **Preston's Reach** | signal-tower island |
| Sluis Van | **Graving Bay** | the great civilian dockyards |
| Sullust | **The Shoals** | home of the Reefwalkers |
| Umgul | **Newmarket** | gambling and racing island |

**Sugar Reach** (orig. Farfin sector — `medium` map)

| Original | Island | Notes |
|---|---|---|
| Bilbringi | **Bilbrin** | Imperium dockyard |
| Byss | **Bysse** |  |
| Charmath | **Charmouth** |  |
| Firro | **Ferrol Key** |  |
| Khomm | **Komm Cay** |  |
| Kinyen | **Kinyon** |  |
| Phraetiss | **Fraytis** |  |
| Rishi | **Rishi Bank** |  |
| Taanab | **Tanab** | breadbasket; farms |
| Wistril | **Wistrell** |  |

### The Far Sea (Outer Sea)
*Arctic / Norse: ice, fjords, whalers, the last free people. Norse-flavored names.*

**Rime Reach, the ice** (orig. Churba sector — folded into the Reach above in v5.8: Rime Island, Frostwick, Rishi Bank and Varrow stay on the chart; the rest are held back for larger maps)

| Original | Island | Notes |
|---|---|---|
| Allyuen | **Alyvik** |  |
| Anoat | **Annat Fjord** | polluted mining fjord |
| Bespin | **Varrow** | Fairweather's floating market — a city of lashed-together hulks |
| Deyer | **Deyr** | fishing; all water |
| Gentes | **Frostwick** |  |
| Hoth | **Rime Island** | frozen rock; classic second Free Harbor |
| Lelmra | **Lelmar** |  |
| New Cov | **Nykov** |  |
| Storthus | **Storthavn** |  |
| Tokmia | **Tokmaa** |  |

**Rime Reach** (orig. Sumitra sector — `small` map; **15 islands charted** — the dark northern chain and a few bergs of the pack ice above it; the Far Sea's one Reach since v5.8)

| Original | Island | Notes |
|---|---|---|
| Alk'lellish III | **Alkellish** |  |
| Boordii | **Boordvik** |  |
| Flax | **Flaxholm** |  |
| Geedon V | **Gedon** |  |
| Kashyyyk | **Northreach** | Torvik's homeland; source of Berserkers |
| Linuri | **Linnur** |  |
| Qat Chrystac | **Kristak** |  |
| Tierfon | **Sharpness** | cutter base |
| Woostri | **Vustri** |  |
| Yavin | **Tallow Cay** | CONFEDERACY KNOWN START ISLAND |

**Quarry Reach** (orig. Atrivis sector — `large` map)

| Original | Island | Notes |
|---|---|---|
| Despayre | **Despair Rock** | prison-quarry where the Leviathan was dredged up and first hulled |
| Fedje | **Fjedd** |  |
| Generis | **Gennaris** |  |
| Moltok | **Moltak** |  |
| Nam'ta | **Namta** |  |
| Spefik | **Spevik** |  |
| Tibrin | **Tibrinn** |  |
| Togoria | **Togar** |  |
| Trammis | **Trammes** |  |
| Zeffliffl | **Zeffel** |  |

**Last Reach** (orig. Xappyh sector — `large` map)

| Original | Island | Notes |
|---|---|---|
| Ambria | **Ambrey** |  |
| G'rho | **Grohn** |  |
| Kirdo III | **Kirdholm** |  |
| Neelgaimon | **Nilgamon** |  |
| Norulac | **Norlak** |  |
| Ruuria | **Ruur** |  |
| Stic | **Stikk** |  |
| Thanta Zilbra | **Thanta Isle** |  |
| Thila | **Tilla** |  |
| Tund | **Tundvik** | edge of the charts |

### The Sea of Storms (Outer Sea)
*Monsoon belt: typhoons, volcanoes, rice terraces, jungle. Islands here are rich but hard to hold.*

**Cinder Reach** (orig. Moddell sector — `small` map; **10 islands charted**)

| Original | Island | Notes |
|---|---|---|
| Adega | **Tamalu** |  |
| Agrilat | **Sorrowhead** |  |
| Annaj | **Brimstone Cay** |  |
| Basilisk | **Basilisk Rock** |  |
| Endor | **Greenholm** | forested island where the Leviathan is being finished |
| Gandolo IV | **Gandolo Spit** |  |
| Hozrel XI | **Firewatch** | active volcano |
| Khuiumin | **Kuimin** |  |
| Pzob | **Emberfall** |  |
| Vjun | **Leeward Keep** | Admiral Blackwater's private fortress |

**Monsoon Reach** (orig. Kanchen sector — `medium` map)

| Original | Island | Notes |
|---|---|---|
| Culroon III | **Kulrun** |  |
| Davnar | **Rainhaven** |  |
| Derra IV | **Derramoor** |  |
| Mindar | **Mindaro** |  |
| Munto Codru | **Munto** |  |
| Nal Hutta | **Fatmouth** | harbor-kings' port; Jubal's kin |
| Smarteel | **Tarrowick** |  |
| Spuma | **Spume Reef** |  |
| Vodran | **Vodrani** |  |
| Xa Fel | **Sulphur Cay** |  |

**Rice Reach** (orig. Abrion sector — `large` map)

| Original | Island | Notes |
|---|---|---|
| Abregado | **Abrigado** |  |
| Cathar | **Catshead** |  |
| Da Soocha | **Dasucha** |  |
| Galpos II | **Galpos** |  |
| Garban | **Garvan** |  |
| Hefi | **Heff Island** |  |
| Hishyim | **Hishim** |  |
| Intuci | **Intusca** |  |
| Tieos | **Tio Isle** |  |
| Ukio | **The Terraces** | rice breadbasket of the Outer Seas |

### The Glass Sea (Outer Sea)
*WEIRD: the water goes flat and holds sound for miles; islands appear at noon and are gone by dusk; salt flats that were harbors last year. Ships row, or wait for a Tidecaller. The Imperium keeps a Stillwater here and nobody knows why. Sun-bleached names.*

**Salt Reach** (orig. Orus sector — `small` map; **10 islands charted**)

| Original | Island | Notes |
|---|---|---|
| Bakura | **The White Flats** |  |
| Chazwa | **Chaswell** |  |
| Daltar | **Scaldwell** |  |
| Joiol | **Noonday Rock** |  |
| Kimanan | **Salthouse** |  |
| Lafra | **Lafray** |  |
| Mantessa | **Mantissa** |  |
| Poderis | **Powder Isle** | saltpetre — powder works |
| Ryloth | **Saltgrave** | salt-slave island; one side never sees dusk |
| Tatooine | **Blackreef** | Jubal the Fat's corsair haven |

**Mirage Reach** (orig. Mayagil sector — `medium` map)

| Original | Island | Notes |
|---|---|---|
| Anchoron | **Ankerholm** |  |
| Chalcedon | **Chalcedon** |  |
| Clak'dor VII | **Clatter Rock** |  |
| Cona | **Conna** |  |
| Dantooine | **Dantoon** | abandoned old Confederacy base |
| H'nemthe | **Nemthe** |  |
| Kabal | **Cabal Rock** |  |
| Oetrago | **Otrago** |  |
| Triton | **Triton Shoal** |  |
| Urdur | **Erdur** |  |

**Still Reach** (orig. Jospro sector — `medium` map)

| Original | Island | Notes |
|---|---|---|
| Azbian | **Asbey** |  |
| Cardooine | **Cardoon** |  |
| Chrondre | **Crondre** |  |
| Dar'Or | **Darrow** |  |
| Douglas III | **Douglass Rock** |  |
| Engira | **Engiry** |  |
| Jomark | **Anchorite Rock** | hermit island |
| Kiffex | **Kiffey** |  |
| Trogan | **Troggan** |  |
| Waskiro | **Wastiro** |  |

### The Bone Sea (Outer Sea)
*WEIRD: the islands are the bones of dead leviathans, reef-grown over. The water glows at night. Wrecks outnumber ships. Corsair havens, witch-islands, and a permanent whirlpool. Fogmire (Old Hesper) is here but is an event location, not a node.*

**Wreckers' Reach** (orig. Calaron sector — `small` map; **9 islands charted** — the long chain down the right edge, an Inner Reach beside the Crown)

| Original | Island | Notes |
|---|---|---|
| Akrit'tar | **Gibbet Rock** | Imperium prison |
| F'tral | **Ravenscar** |  |
| Fwillsving | **Wrackham** |  |
| Ithor | **Gardenholm** | sacred green island; no cutting of trees |
| Jerijador | **Slaughden** |  |
| Kessel | **The Kettles** | prison mines cutting ambergris out of a dead leviathan's skull |
| Kubindi | **Coffinswell** |  |
| Morvogodine | **Morvogine** |  |
| Norval II | **Norvell** |  |
| Skor II | **Skorra** |  |

**Scrap Reach** (orig. Dufilvan sector — `medium` map)

| Original | Island | Notes |
|---|---|---|
| Algarian | **Algary** |  |
| Filve | **Filby** |  |
| Gamorr | **Gammer** | brute mercenaries |
| Klatooine | **Klatoon** |  |
| Ord Mantell | **Mantle** | the great wreck-scrapyard; Ruckley's home |
| Ord Pardon | **Pardon** |  |
| Ord Trasi | **Trassey** |  |
| Toprawa | **Topraw** |  |
| Womrik | **Wormrick** |  |
| Zebitrope IV | **Zebbet** |  |

**Drowned Reach** (orig. Glythe sector — `medium` map)

| Original | Island | Notes |
|---|---|---|
| Altarrn | **Altarn** |  |
| Arkania | **Arkane** |  |
| Elrood | **Elrod** |  |
| Fef | **Feffle** |  |
| Fornax | **Furnace Rock** |  |
| Nentan | **Nentane** |  |
| Sedri | **Sedry** | half-drowned stilt town; home of the Hushed |
| Valrar | **Valraye** |  |
| Vortex | **The Maelstrom** | permanent whirlpool; the Reef-folk say something lives at the bottom |
| Yag'Dhul | **Yagdool** |  |

**Witch Reach** (orig. Quelli sector — `medium` map)

| Original | Island | Notes |
|---|---|---|
| Amorris | **Amorrow** |  |
| Corstris | **Corstry** |  |
| Dathomir | **Hagsmoor** | witch-island of wild Tidecallers; nobody governs it and both factions want it |
| Kirrek | **Kirrick** |  |
| Pil Diller | **Pilditch** |  |
| Rafa | **Raffay** |  |
| Selaggis | **Sellagus** |  |
| Thrakia | **Thrake** |  |
| Varn | **Varne** |  |
| Vinsoth | **Vinsoath** |  |

*Total: 200 islands across 20 Reaches in 7 Seas.*

---

## 14. NEW MECHANICS (beyond the original — later phases)

These two systems are Sean's additions. Neither exists in the original game. Both are designed to bolt onto existing systems rather than replace them. Do not build these in phase 1; do keep the data model open for them (hidden per-character fields, neutral-owned nodes with garrisons).

### 14.1 Mythic Isles — the exploration race

**Concept.** In the original, neutral islands are harmless: no troops, no defenses, they never fight back. Mythic Isles are the exception. Each game, **2–3 Mythic Isles** are generated at random in the Outer Seas (never the Inner Seas, never in the same Sea twice, never within one Reach of either side's start). Each is a small neutral *faction*: a guardian, its own garrison, its own defenses, and a hoard. Both players are incentivized to find them first, which creates early-game races and mid-game battles over specific nodes.

**Placement rules.**
1. Pick 2–3 distinct Outer Seas at random. Add one Mythic Isle to a random Reach in each (it is an extra node — the 200 base islands are unchanged).
2. Mythic Isles start uncharted like any Outer Sea island. When either side charts one, **both** sides get a notification ("Sailors speak of a [name] in the [Reach]") — the race is public.
3. A Mythic Isle is never a legal Free Harbor spawn.

**Two ways to win one.**

| Path | How | Result |
|---|---|---|
| **Conquest** | Blockade and assault. The guardian fights alongside its garrison as a powerful defensive unit; Seawalls and batteries as generated. Bombardment works but destroys part of the hoard. | Island and its Stores/Sweetwater/slots are yours. Guardian dies. Reach-wide allegiance shock against you (you killed the local legend). |
| **Parley** | Diplomacy missions against a very high threshold, with modifiers: Deep-touched characters get a large bonus; some isles only listen to certain peoples (a Reef-folk envoy at the Singing Reef, an Urskin at Wyrmroost). Espionage first reveals what the guardian wants. | Island turns to you with everything intact **and the guardian becomes a unique unit under your command** for the rest of the game. |

**Balance rules** (the goal: a Mythic Isle is a *choice*, not a must-have).
- Total cost to take one (ships, troops, character-days) should roughly equal taking 4–5 ordinary Outer Sea islands. Tune by garrison size and parley threshold.
- The guardian unit is strong but **unique and permanent-death**: no rebuild, high Upkeep, and it cannot be moved between fleets faster than any other unit. It is a trump card, not an army.
- Parley is slower than conquest but cheaper in blood; conquest is faster but forfeits the guardian and costs allegiance. Neither path should be strictly dominant.
- The hoard (bonus Stores/Fittings on capture) is front-loaded and one-time so it doesn't snowball.
- The opponent can contest: a fleet in orbit interrupts parley (same rule as blockading a diplomacy mission).

**Seed pool** (game picks 2–3 per session; each is tied to a Sea's flavor):

| Isle | Sea | Guardian | Garrison flavor | Parley key | Guardian as a unit |
|---|---|---|---|---|---|
| **Wyrmroost** | Sea of Storms | A sea-dragon that nests in a live volcano | Dragon-cult islanders, fire-hardened | Urskin envoy or a Tidecaller; it wants its eggs left alone | Capital-class unit: bombardment, terrifies small craft (enemy squadrons launch slower) |
| **The Singing Reef** | Bone Sea | A kraken the Reef-folk call "Grandmother" | Reef-folk hermits, coral shore batteries | Reef-folk envoy; it wants the Black Tide kept away | Fleet-trap unit: acts as a mobile Kraken-caller / Stillwater |
| **The Sunken Court** | Glass Sea | A drowned king who still holds court beneath still water | The Drowned Guard's original — a regiment of the dead | Any Tidecaller; it wants its name spoken at Highwater | Troop unit: elite garrison that never loses watch rating |
| **The Iron Shoal** | Bone Sea | A Tidewrought colossus older than the Imperium, half-buried | Lesser automata that wake when disturbed | A Works researcher (Lemmick, Kade); it wants to be repaired | Troop/siege unit: brutal offense, terrible watch |
| **The Witch-Mother's Isle** | Glass or Bone Sea | The coven-mother of Hagsmoor's exiles | Wild Tidecallers | Deep-touched woman envoy; she wants a promise the coven can hold you to | Character-like unit: a Tidecaller who can train your Deep-touched (a second Old Hesper) |
| **The White Whale's Ground** | Far Sea | An ancient albino whale the Urskin refuse to hunt | Urskin holdouts, whaling forts | Urskin envoy; it wants the hunt ended in its waters | Transport/ram unit: carries troops and rams ships of the line |
| **The Ghost Fleet** | Far Sea | An admiral who never surrendered and never died | Ships of a war two centuries gone, crewed by the frozen | Imperium diplomat (it thinks the old war is still on) or a Confederacy one (it thinks it's the true Crown) | Fleet: 2–3 old Ironbacks under a permanent admiral bonus |

**UI.** Mythic Isles get a distinct map glyph once charted. Hovering shows what's known (garrison reveals through spying, like any island).

### 14.2 Double Agents — the turncoat mechanic

**Concept.** The original has traitors: a minor character can turn against you when the war is going badly, only Force-users can detect it, and the only fix is to retire them. Here the traitor **doesn't leave** — they stay under your command and quietly leak everything to the other side. The opponent knows; you don't, until you catch them.

**Rules.**
1. **Only minor characters can turn.** Major characters (the 6 per side) are immune, same as the original.
2. Every minor character carries a **hidden Loyalty score** (0–100), rolled at recruitment (most 70–95, a few lower). Loyalty drifts down when the war goes badly for you (same trigger the original uses) and up on successful missions and when you're winning. Certain characters have a low starting range (Brandt, Fenley — the ones the original flags as likely traitors).
3. When Loyalty crosses the turn threshold, the character becomes a **double agent**. The *opponent* gets a notification: "[Name] has turned double agent." The owner gets nothing.
4. **What the opponent gains while the agent is alive and undetected:**
   - Full live visibility of the agent's current location — the island or fleet: units, facilities, build queues, characters present, arrivals and departures. It updates in real time, unlike a spying mission's one-time snapshot.
   - A Reach-wide informant bonus: spying missions in the agent's Reach get a large success bonus, and a periodic free intel drip on the other islands in that Reach.
   - The opponent can see where the agent is at all times (they know where their leak is).
5. **Detection.** Every game-day the agent is co-located with a Deep-touched character of the owner's side, roll to detect (same as the original's Force-user traitor check, with higher rank → higher chance). A spying mission run by the owner *against their own island* also has a chance to reveal an agent there. A general on the island adds a small chance.
6. **Once caught**, the owner chooses:
   - **Retire** (the original's only option) — the character is out of the game.
   - **Imprison** — the character is captured on your own prison island; the opponent can attempt a jailbreak.
   - **Turn them back** (later phase, ⚙) — keep the agent in place and feed false information: the opponent's view of that location shows a decoy fleet or build queue you define. Costs a diplomacy or espionage character parked with the agent.
7. **Balance.**
   - At most one active double agent per side at a time; a second can't turn until the first is resolved.
   - A double agent still performs missions for you normally (their stats don't change), so losing one hurts.
   - Turn threshold and drift rate are tuning knobs; start conservative (a turn is a mid-game event, not an early one).
   - Deep-touched characters become more valuable as counter-intelligence, which the original already gestures at.

**UI.** For the opponent: an eye glyph on the agent's location; the location panel opens as if it were their own island. For the owner: nothing, until detection, then a popup with the three choices.

---

## 16. NARRATOR VOICES & PORTRAITS

The build plan is `docs/narrator-build.md`; its checklist says what is done.
This section holds the three things the plan says must live in the bible so
that art and voice generated months apart still match. Claude Code reads
them from here and nowhere else.

### 16.1 Visual descriptions (plan step A1 — Sean)

One paragraph each: build, face, clothing or plumage, one signature detail,
and what the viewer should feel. These are pasted into every image prompt.

_Locked 2026-09-13; the Crown's advisor replaced the same evening. These
are pasted verbatim into every portrait prompt._

**Secretary Sabine Marlow.** A small woman of sixty-one, straight-backed, seated at a desk as if the chair were an afterthought. Iron-grey hair cropped short, no wig. A face lined by forty-five years of reading other people's dispatches by lamplight, and grey, level eyes amused at something she is not going to share. She wears the Admiralty's civil dress in the Imperium's colours: a deep sea-green coat with cream facings and a narrow gold edge at collar and cuff — no epaulettes, no braid, no sword, the uniform of the staff and not the fleet — a high white collar and a black stock, with ink on the first two fingers of the right hand. At her throat, one small brass clasp holding three plain mourning rings on a short chain: a husband and two sons, all captains, all lost at sea, none of them discussed. Half-moon reading spectacles, on her nose or in her hand, and a black cane with a plain brass head leaning against the desk, which she does not need and does not explain. She should make the viewer feel briefed, judged, and — if they have earned it — trusted.

_Who she is._ First Secretary of the Admiralty: the permanent official. Admirals come and go, Lord Regents come and go, and the Secretary reads every dispatch before the Imperator does. Born to a clerk's family on Highwater, she entered the Admiralty at sixteen as a copyist and has outlasted four Regents and eleven First Sea Lords without ever once going to sea. She married a frigate captain, Aurel Marlow, lost with his ship at the Narrows holding the strait for the Crown. Their two sons went to sea after him and rose fast — Tobias, the elder, a post-captain at twenty-six, taken with all hands by the Black Tide off Whalers' Reach; Hal, the younger, commanding a sloop-of-war, driven onto the Wreckers' coast in the great gale and drowned getting his people ashore. Three of the Imperium's best officers, all hers, all lost in its service. She has never taken a day's leave for any of it, never asked the Crown for anything on their account, and has never once let it shake her faith in the thing they died for. Her work is managing big men with big ships and bigger opinions, which is why she is the only person in the Imperium who will tell the Imperator, to their face, that they are wrong — and why the Imperator keeps her.

**Secretary Crane** — _retired from the advisor's chair 2026-09-13, kept for
later: he may stand behind her, silent, writing it all down._ A tall, narrow man held perfectly straight, as if
hung from a hook rather than standing. A long face the grey of wet slate,
no colour in the lips, and eyes so pale they are almost the colour of the
whites — set wide, lashless, and never once closing. Iron-grey hair combed
flat to the skull with something that has dried hard. He wears the
Admiralty's black: a high-collared coat buttoned to the throat, a white
stock beneath it starched to a blade, one brass button at the collar bearing
the Crown's fouled anchor, and a thin brass chain running from the collar
to a pocket ledger he is never seen to open. The signature detail: along
the seam of one collar-wing a fine white coral has grown, the warding kind
the Crown grows over its hulls, spreading across the black cloth like frost
— the only thing on him that is visibly alive, and it is not him. He should
make the viewer sit up straighter and feel that whatever they are about to
say has already been written down.

**Mr Pennywhistle.** A big, battered sea-parrot, salt-stiff and heavier
than a parrot has any right to be, perched on a length of whalebone lashed
to a stanchion. Plumage in the Confederacy's own patchwork: a rust-red body
faded to pink at the breast, a mantle of squid-ink blue-black across the
shoulders, wing coverts that look dyed rather than grown, and a ragged tail
with two feathers missing. The beak is a big grey hook with a chip out of
the upper edge. One eye — the left — is a hard yellow ring around a black
pupil that is fixed on the viewer and does not wander; where the right eye
was there is a puckered scar under a tiny square of leather stitched on
with sailmaker's thread and finished with a bone button. The signature
detail: a brass ring on one leg with three links of snapped chain still
hanging from it. Somebody owned him once. He is leaning forward off the
perch, weight on one foot, head cocked to bring the good eye round. He
should make the viewer want to laugh and know that he is about to make it
worse.

### 16.2 Art direction, three words (plan step A2 — Sean)

**the game's own style line, verbatim, plus its register** — _relocked 2026-09-13, night._ Three words were not enough: "painterly, weathered, cinematic" produced dim, cold, near-photographic portraits against a game that is blue sky, warm sunlight and appealing faces. Every advisor prompt now carries the one-line style from `art-prompts.md` word for word, the register paragraph, and three of the game's own portraits as reference images. Drawn from the house style in `seven-seas-art-style.md`
§1 (hand-painted, textured brushwork, rich but weathered colours, dramatic
natural lighting). "Cinematic" is the word that keeps the portraits from
going flat: Crane lit cold from the left in a dim formal interior,
Pennywhistle in the same light on his perch. If a different third word is
wanted, "lamplit" pulls warmer and "muted" pulls quieter; both fit the
house style.

### 16.3 Locked voice settings (plan step E2 — Sean, recorded here)

`scripts/render_voicelines.py` reads this block. A character whose block has
any empty field is skipped, with a message, until it is filled. Once a line
has been rendered with these numbers it is never rendered again, so change
them only for a character who has no rendered lines yet.

<!-- narrator-voices -->
```json
{
  "marlow": {
    "engine": "elevenlabs",
    "voice_id": "",
    "model_id": "",
    "stability": null,
    "similarity_boost": null,
    "style": null,
    "use_speaker_boost": true,
    "note": "older woman, contralto, dry; medium-high stability, a little style"
  },
  "pennywhistle": {
    "engine": "elevenlabs",
    "voice_id": "",
    "model_id": "",
    "stability": null,
    "similarity_boost": null,
    "style": null,
    "use_speaker_boost": true,
    "note": "pitched up, low stability, let it wobble"
  }
}
```

### 16.4 Speaking voice (for the audition, the lines, and every bark after)

_Drafted by Claude Code 2026-09-13 from the register the Narrator sheet
already uses; Sean to edit. This is the brief for E1 (audition) and E3
(the lines), and the check every later batch is read against._

The two are opposites in every register. Crane is a held breath;
Pennywhistle is the thing that makes you let it out. If a line could be
said by either of them, it is wrong for both.

#### Secretary Sabine Marlow

- **Sound.** Contralto, clipped, quiet — quiet the way people are who have
  never once needed to shout to be obeyed. Close-miked, unhurried, dry as
  gunpowder. Almost no volume change across a line; the emphasis is done
  with a pause, or with one word pronounced very precisely. A faint rasp of
  forty years of weather. Breath audible only when she has decided to let
  you hear it.
- **Tone.** The one person in the Imperium permitted to lecture the
  Imperator, and she uses it — briefly, precisely, and only when it is
  deserved. Exact, economical, and sarcastic in the M way:
  understatement, the raised eyebrow you can hear, the compliment that is
  also a warning. "How novel." "I'll alert the fleet." "Do try to keep up,
  Imperator." She is never cruel and never wastes a barb on something that
  does not matter; the sarcasm is how she tells you she expected better.
  Underneath it is complete loyalty — to the Imperium first, and to you
  exactly as far as you serve it. She has managed four Regents and eleven
  First Sea Lords; the Imperator is the fifth big personality of her career,
  not the first.
- **Diction.** Full sentences, no slang, precise numbers, the Admiralty's
  vocabulary — dispatches, ledgers, establishments, the List — used
  correctly and without ornament; she has never been to sea and does not
  pretend to have. Contractions allowed; she is not a
  machine. Addresses the player as **"Imperator"** — with exactly the
  deference the title demands and not one grain more, so that how carefully
  she pronounces it is where the sarcasm lives. Never "sir". Once, late,
  when it has been earned, "well done" with nothing after it.
- **Tics.** Takes off her spectacles before the line that matters. Ends a
  bad report with the next order rather than sympathy: "Good. Now the next
  thing." The withdrawn warmth — one degree kinder, then immediately
  business. Occasionally a line that is only a name and a full stop:
  "Highwater." meaning: look at it.
- **Never.** Never shouts. Never flatters. Never says "I think" — she says
  what is so, and "if I'm wrong, it will be the first time this month."
  Never jokes about the dead, and never mentions her own. Never uses Crane's flatness: she is entirely
  alive, and the game should feel it.
- **By mood.** *Neutral:* the above. *Grave:* the sarcasm drops out
  completely, which is how you know it is bad — shorter lines, longer
  pauses, the spectacles come off and stay off. *Encouraged:* one degree
  warmer, a dry near-smile in the voice, and the withdrawal — "Good. Don't
  let it go to your head."
- **In the game.** "Nowhere. Every works you own is on an island with no
  room left, or no works at all. I did mention this." / "Nobody. All of them
  at sea or laid up — which is where you sent them, Imperator." / "None.
  Every island you hold is quiet and garrisoned. Enjoy it; it won't last."
- **Accent.** English, received pronunciation, of the older, clipped
  kind — Judi Dench's M is the reference and everyone will know it. Not
  regional, not aristocratic-drawling, not American in any syllable.
  Consonants finished, vowels short, the "r" dropped at the end of a word.
  The audition should reject any voice that could not deliver "Do try to
  keep up, Imperator" as a complete put-down in five words.
- **TTS direction.** A British English voice, older woman, RP. Medium-high
  stability, a little style, similarity high; speed normal or a touch
  under. Weight in it; if the engine makes her sound kindly or
  grandmotherly it is the wrong voice, and if it makes her sound like a
  villain it is also the wrong voice.

#### Secretary Crane (retired; kept for a silent cameo)

- **Sound.** Low baritone, dry, close-miked and quiet — a voice for a
  reading room, never a deck. No breath in it: he does not audibly inhale,
  and sentences end without a fall or a lift. Slight rasp on sibilants, as
  if the mouth were not quite damp enough. Pace slow and perfectly even;
  the same speed whether the news is a lost island or a quiet day. Almost
  no dynamic range: nothing rises, nothing drops. The flatness is the tell
  that something in him is not alive, and it is the whole performance.
- **Tone.** Courteous, exact, and faintly disappointed in you. He never
  raises his voice, never jokes, never reassures. Bad news is delivered as a
  correction to the record; good news as a fact he expected. He does not
  say "I think" — he says what is so.
- **Diction.** Full sentences, formal vocabulary, no contractions
  ("it is", never "it's"). Numbers stated precisely. Titles used: "the
  Regent", "the Admiralty", "your fleet". Addresses the player as "sir" or
  by rank, rarely, and only at the end of a line. Favours the passive and
  the impersonal: "It has been noted." "That will not be necessary."
- **Tics.** A pause before the worst word, as if checking it against the
  ledger. Occasionally finishes with a short flat afterthought: "Nowhere."
  "As expected." "I had written as much."
- **Never.** Never exclaims. Never uses slang or nautical colour. Never
  laughs, sighs, or clears his throat. Never apologises. Never uses a
  metaphor that could not appear in a minute of a meeting.
- **By mood.** *Neutral:* the above. *Grave:* slower still, quieter still,
  more pauses — the record is being amended. *Encouraged:* exactly the same
  voice; the words allow it — "Satisfactory." "That will do." — and the
  fact that nothing else changes is the joke.
- **In the game today.** "Nowhere. Every works you own is on an island
  with no room left, or no works at all." / "Nobody. Every one of them is
  at sea or laid up." / "None. Every island you hold is quiet and
  adequately garrisoned." Keep to that.
- **TTS direction.** High stability, low style, similarity high; speed a
  touch under normal. If the engine adds warmth or lilt, it is the wrong
  voice. Kokoro's flatter voices may suit him better than anything
  expressive; try him there first.

#### Mr Pennywhistle

- **Sound.** Pitched up, hoarse, and loud — a parrot who learnt to talk in
  a tavern and has never once been asked to lower his voice. Sharp attacks
  on consonants, a squawk that breaks into the vowels when he pushes, a
  wobble in the pitch that a good take keeps and a bad take smooths away.
  Pace fast and staccato: short bursts, then a beat, then the point. Wide
  dynamic range — he can drop to a rasped aside and come back up to a
  shout in one line. Breath is audible and part of it.
- **Tone.** Rude, delighted, and usually right. He talks to the player as
  an equal who is slower than he is. Bad news is a chance to be proved
  correct; good news he takes credit for. He is never afraid and never
  reverent, of the Tide, the Crown, or the captain.
- **Diction.** Contractions, dropped words, nautical slang: "the other
  lot", "a talker", "get on with it", "you sent them, remember". Short
  sentences. Exclamations that are a whole line: "Nowhere!" "Nobody!"
  "Nothing!" Calls the player "captain" — never "sir" — and sometimes
  nothing at all. Repeats a word when he likes it. Insults are affectionate
  and specific.
- **Tics.** Opens on the loud one-word answer, then explains. A squawk-laugh
  when the news is bad for the Crown. Interrupts himself: "Storm's — no,
  wait — storm's brewing west." Occasionally a parrot noise where a word
  should be, as if he has forgotten he can talk.
- **Never.** Never formal. Never gentle. Never uses a title with respect.
  Never delivers a line evenly — if it came out smooth, it is Crane's.
  Never says the data (island names, counts): the on-screen text does that;
  he says what he thinks of it.
- **By mood.** *Neutral:* the above. *Grave:* lower and hunched — the
  volume drops but the edge stays, the words get shorter, the laugh goes.
  *Encouraged:* bobbing, bright, faster, the laugh back and louder, ends
  lines high.
- **In the game today.** "Nowhere! Not a scrap of room left, and you've no
  works to build with anyway." / "Nobody! They're all out. You sent them,
  remember." / "Nothing! Quiet as a chapel. Enjoy it." / "Can't court what
  you haven't found. Go and look." Keep to that.
- **TTS direction.** Low stability, style up, let it wobble; pitch above
  the default if the engine allows; speed above normal. Bark-length lines
  only — over about twelve words the wobble reads as a glitch instead of a
  character. If a take sounds like a calm narrator doing a funny voice, it
  is the wrong take.

#### Mr Pennywhistle, addressing the player

He calls the player **"General"** — short for Captain-General, the Moot's
title, which he refuses to say in full because it takes too long — and
**"Cap'n"** when he is pleased, which is rarer. Never "Captain-General",
never anything respectful, never the Crown's word.

### 16.5 Forms of address

The player is the highest rank on their side by a long way; every named
character, Corvane and Hale included, answers to them.

- **Crown: Imperator.** The Imperator commands the war; the Lord Regent
  keeps the civil Crown in the Imperator's name; the Admirals command
  fleets. Marlow says it with precision. Everyone else says it with fear.
- **Confederacy: Captain-General of the Free.** Elected by the Moot for
  the duration of the war, above the Commodore-Elect, who commands the
  fleet. The Brethren chose a title that sounds like an army because they
  do not have one; it is half a joke and wholly obeyed. Pennywhistle says
  "General". Hale says "Captain-General" and means it.

`factions.json` carries `playerTitle` for each side; the tutorial's first
card and the advisors use it. Nothing else in the interface addresses the
player directly.

#### The rule for every line, both of them

A line is a complete thought that would still be right tomorrow. It carries
the personality; the screen carries the facts. No island names, no numbers,
no player name. If a line needs a variable to make sense, it is a caption,
not a bark, and it goes in the text.

---

## 15. CHANGELOG

- **2026-09-21 v9.45** — **The lore package, part two: three Reaches renamed and Coralhome on the board.** **Windward Reach** (The Long Sea) replaces Whalers' / The Merchant Sea, **Sunken Reach** replaces Wreckers', **Mire Reach** replaces Cinder, and six islands take their new names in place — Starpath, Chimehouse, Outrigger Bay, Longreef, Palmfall, Reedmoot. **Freeport** is finished: the label and the title screen say it now, not "the meeting place". **Coralhome opens Crown-held** — the founding wound, garrisoned six like a capital, its people at twelve, its reef already cleared — which cost the Crown two wars in twenty and a fifth of the war's length, measured against the same seeds. That is a real handicap and the right one: an island held against its people, far from home, defending nothing. It compounds the Crown's existing deficit rather than relieving it. Four things had to be got right and three were bugs: the kilns go with the bed, nothing lives in water a side has charted, `beastSeen` is an invariant the save format depends on, and Coralhome's makers come off so the Crown does not get a second slipway on the seeds that happened to deal it one. **Not done, and why:** the five cross-Reach moves and six new islands need the chart repainted, because a painted landmass is where an island's position comes from. Windward Reach also still draws the old Merchant Sea's archetypes, so it does not yet look like open ocean and atolls — the package gives that identity in prose and names no archetypes, and the rule is not to invent. **Superseded:** the package's Part C names the seat The Aldermain; Sean's 21 September ruling makes the port Highwater and the Aldermain the great island it stands on, and that is what ships. No rules changed beyond Coralhome.

- **2026-09-21 v9.44** — **Attack actions, named and first.** Sean: *"Change these terms — Attack Actions: Bombardment, Invasion. Put this at top."* A squadron lying off an enemy island offered *"Shell the town — 30 a day"* and *"Land 2 against 2 ashore"*, under Set sail: the orders described the act rather than naming it, and the two that decide a war were the two furthest down. There is an **Attack actions** heading now, with **Bombardment** and **Invasion** above Set sail, and it only appears when one of them is available. The numbers stayed — a rate of fire and a balance of troops are the whole of what you are deciding — but moved to a muted second line under the name, which also keeps the wall/town distinction that prices the two shots differently. **Bombardment was already the word** everywhere else: a ship stat, a Glossary entry, a rules heading — only the order was saying something else. The landing was not, so the Glossary's **Landing** entry is **Invasion** now and the encyclopedia agrees with the button; *landing* stays in the sentence beneath it, since a label takes the agreed word and prose keeps its voice. No rules changed.

- **2026-09-21 v9.43** — **An errand is a Mission again.** Sean: *"I don't like errands. Mission is the word we want to use"* — reversing the 17 September ruling, four days after Company became Troop. The order on a crew member's sheet reads **Assign Mission**, the chart filter reads **Missions**, and the encyclopedia section is Missions. The reversal cost a value in `terms.json`, a direction in one test and thirteen sentences, because the pass that retired the word had only ever taken it out of the *labels* and left it everywhere it was code — which is now written into CLAUDE.md as the rule: **retire words from prose, never from identifiers.** Two holes in the guard turned up on the way, neither of them about this word. A one-word label is indistinguishable from an identifier by shape, so the sweep had been skipping the encyclopedia's own **Errands** heading and the **Errand** entry under it — a whole page about the retired word, invisible to the test written to retire it; a capitalised single word is checked now and a lower-case one skipped. And `src/sim` was never swept at all, though player-facing prose lives there — Reyne's power blurb among it — which is why the chart filters had been checked one at a time as an exception. Both are closed. No rules changed.

- **2026-09-21 v9.42** — **The Crown's seat is Highwater again.** Sean: *"Aldermain is the big island not the port! Revert the port back to the name Highwater."* The 19 September rename had given the *location* the landmass's name, which left the island's own note reading "Highwater, the Crown's walled capital, stands on it" — the chart naming the island and the note naming the port, for the same dot. The location is Highwater now, on every screen: chart, Reach map, Location sheet, the victory line and the tutorial. **The Aldermain is not retired** — it is the one great island, far larger than anything else, that Highwater and the other two ports stand on, and it keeps that job in prose. The island's `seed` is written down in the data rather than derived from its name, so the rename moved a word and nothing else: same terrain, same deposits, same creature, audit clean. Two things the change caught: the isle painting is filed by the island's own slugified name (unlike building art, which is keyed on the type id), so it moved with its island; and the test pinning the capital's slug by hand broke, and now asks the data what the capital is called. No rules changed.

- **2026-09-20 v9.41** — **The Training Facility is a Barracks.** Sean: *"Change 'Training Facilities' to 'Barracks' across game."* One label, changed in `terms.json` and carried everywhere the interface reads it, plus three sentences that had spelled the old name out by hand — the Glossary's two and the tutorial's build card. The key stays `training_facility`, the way `refinery` stays the key for the Lumber Mill and `mine` for the Gold Mine: an id is code, and renaming this one would have renamed a type, two art slugs and the files on disk behind them for a word nobody reads. The register's titles and the two conversion tables — `docs/rebellion-terms.md` and section 9 here — say Barracks now, and both were also still listing the Construction Yard as kept, a day after it was cut. One thing the rename nearly broke and the vocabulary test now pins: **Barracks is already plural in form**, so the idle-buildings filter, which built its hint by sticking an `s` on the label, would have read *barrackss*; it names the works singular instead. Worth recording that **Marine Barracks** was the name section 9 had reserved for the Advanced Training Facility — a second tier that does not exist here, Craft grade doing the upgrading, so the plain Barracks takes the word and the reserved one is retired. No lore changed.

- **2026-09-20 v9.40** — **The Construction Yard is cut. You build where you stand.** Sean: *"Cut construction yards completely. Anyone can build on any available land... That way buildings are never traveling... Well just increase their time to build. So gold becomes building constraint not the yard."* A building is now raised on the island itself from its Buildings tab — yours, not in mutiny, a berth free, the ground under it if it wants ground, and the gold to pay for it — and the whole notion of a fort *in transit* leaves the game with the yard. Only two things still need a works to make them: a troop off a Training Facility floor and a hull off a Shipyard slip. A building raised in place has one pair of hands on it rather than a crew, so **every build time is doubled** (mine 40 days, silver mine 32, mill and kiln 24, fortress 60, training facility 56, shipyard 84, heavy fortress 108). Measured over forty wars the median war **halved, 1,210 days to 672**, and the last two that ran out the clock now finish. Balance moved with it, 20–18 to **16–24**, and the reason is structural rather than a mis-tune: the yard was 26% of all upkeep in the game, and the Confederacy spent that windfall on the strike fleet it could never previously afford, while the Crown's win condition — all three Lords at once, scattered across an unexplored chart — is the one thing gold cannot buy. The Crown still wins the ground war 19.8 islands to 8.6 and still loses. Build time is a weak lever on that (×1.5 and ×2.5 both tried and cut), so the manhunt is the next thing to fix, not the clock. Three bugs came out of the measurement, one of them visible only as a dispatch that never arrived. No lore changed.

- **2026-09-20 v9.39** — **The Silver Mine painted**, as the Gold Mine's twin: the same mine head, winch drum and ore cart, with pale crystalline ore and silver in the rock. The crop was a matching job rather than a fresh decision — frame, width and subject copied from the Gold Mine, with only the vertical moved so the cart rim lands in the same place on both cards. That is the point of the pair: the two now differ only in the colour of the ore, so a player who has seen one knows the other is the same kind of thing a rung down, before reading the label. The Coral Kiln is the last works still drawing a glyph. No lore changed.

- **2026-09-20 v9.38** — **The Training Facility repainted**: a drill yard with straw pells, men working a musket through the drill, the armoury behind and a rack of muskets at the side. The whole width is the crop, and for once the natural one won — six boxes rendered at both windows and none of the tighter ones beat it, because a yard is already the shape a wide band wants. Six of the seven buildings now carry new art; the Construction Yard is the last from the original contact sheet and the last whose art carries a painted faction banner, so looking the same whoever holds it is the rule now rather than the exception. The Silver Mine and Coral Kiln still draw glyphs. No lore changed.

- **2026-09-20 v9.37** — **Both fortresses repainted, and the Confederacy gets walls.** A single rampart with four guns for the Fortress and a tiered mass with ten in two rows for the Heavy, so the rule the two carry — more than twice the guns and two and a half times the stone on one plot — is legible from the card. No crop decisions this time: forts live in the buildings folder as whole 4:3 pictures rather than in the islands band, and both deliveries are exactly 4:3, which is also why their cards are taller than the mine's and the mill's. It closes a gap nobody had reported: only Crown fort art existed and the alliance lookup has no fall-back, so **a Confederate-held Fortress had been drawing a glyph** on a building the Confederacy raises as often as the Crown. Both now ship to both sides. Five of the seven buildings now carry new art; the Construction Yard and Training Facility are the last from the original contact sheet. No lore changed.

- **2026-09-20 v9.36** — **The Shipyard repainted.** A hull on the stocks, its frames standing in a row with sky between them and the planking started below. Cropped with the rule learned on the Lumber Mill already in hand: eleven boxes rendered at both the encyclopedia card's middle 42.5% and the slot tile's middle 64% before choosing. The card decides it, being the least forgiving — a crop across the planking reads as a wooden wall and one across the stern as a single curved beam, and only sky between the frames reads as a ship being built. Like the mine and the mill it ships one painting to both sides. Three of the seven buildings now carry new art and all three are close on the work, where the four untouched ones are wide scenes with figures and banners — a split worth naming. The Silver Mine and Coral Kiln still draw glyphs. No lore changed.

- **2026-09-20 v9.35** — **The Lumber Mill repainted**, and the crop rule behind it written down. A water-powered sawmill replaces the old flagged mill scenes. The shipped crop is the log on its carriage with sawn boards behind it rather than the painting's waterwheel, because a 768×204 band cannot hold a circle: centring the wheel gives a thin slice across the hub that reads as spokes and an axle. The first crop looked right as a band and was wrong on the page — the encyclopedia card showed a stone pier — which turned up something nobody had written down: **the band is three quarters decoration.** The island panel's slot tile shows only its middle 64% and the encyclopedia's building card only its middle 42.5%, both centred and both covering, so a subject that is not dead centre is one the player never sees. That is now recorded on the islands folder in the art tool. Like the Gold Mine, the mill ships one painting to both sides. No lore changed.

- **2026-09-20 v9.34** — **The Gold Mine repainted.** A timber mine head, a winch drum and an ore cart heaped with gold, in place of the old pair of wide quarry scenes that read as white stone. The crop is a close-up rather than the establishing shot every other building card uses, and deliberately: the band shows only its middle two thirds on a slot board, and the middle of this painting is a dark tunnel mouth — six boxes were rendered as the tile actually draws them before one was picked. The delivery carries no faction marks, so it ships to both sides and the Gold Mine is now the one works that looks the same whoever holds it; the owner is still named by the emblem in the sheet header. The flagged Crown and Confederate quarries are retired, not deleted. No lore changed.

- **2026-09-20 v9.33** — **One roll per plot, and coral lands.** Sean replaced the share model with a cleaner one: *"For each of available land there is a 40% chance it has a resource. Now of that 40% chance — 60% chance of forest / living coral (coral reef only), 30% chance silver vein, 10% chance gold vein."* Every plot is asked the same question once, which cannot overshoot an island's room and is its own variance, so two of the old model's three fudge factors are gone. Measured over twenty worlds the mix lands within a point and a half of 60/30/10; the density runs 37.8% against 40% for a reason that predates the model and is now written down rather than papered over. An island's look still tilts the **mix** — a mining isle turns up metal where a jungle turns up timber — but never the 40%, so no island is richer than another outright, only different. **Living coral is in**, and his bracket settles what it is: not a fourth kind of ground but what the staple is called in the one Reach where nothing grows. Coral Reach rolls coral wherever anywhere else rolls timber, it earns what a mill earns, and a **Coral Kiln** works it. Fully worked the world now pays 1.71 a plot against 1.95, the leanest the ground has been. No lore changed.

- **2026-09-20 v9.32** — **The resource paintings.** Sean's silver set, promised when the ladder went in, arrived with three more: a reef, and new paintings for gold and standing timber. All four installed through the art register at the islands folder's 768×204 band, masters kept at full resolution and the replaced gold and forest masters retired rather than deleted. The crops are chosen against what a slot board actually shows — it draws the band at 96/40 and covers, so only the middle two thirds is ever on screen — which puts the bright metal in the centre of the strip rather than merely somewhere in it. Gold and silver now read as the same rock with different metal in it, so an island's rung is legible from the tile before the label. The drawn glyphs stay as the fallback. **Coral is installed and deliberately not wired**: it is still not a resource in the sim, because replacing Coral Reach's timber with a deposit nothing can work would leave that Reach unable to earn from two fifths of its ground, and what works coral is Sean's call. No lore changed.

- **2026-09-20 v9.31** — **Three rungs in the ground: gold 3x, silver 2x, timber 1x.** Sean: *"Gold vein >> 3x, Silver vein >> 2x, Forrest >> mill 1x."* **Silver** is a new deposit and the **Silver Mine** a new works, sitting between the two that were there — which turns one staple and one prize into a ladder, and makes a plot a thing you give up as well as a thing you gain. His ground rule is untouched: half an island's plots are deposits, four parts timber to one part metal. The ladder is cut out of the metal rather than added beside it, so the tenth that was all gold is now seven parts silver and three gold — gold pays triple, so gold is the scarce one. Measured over twenty worlds: deposits still cover 49.7% of the ground and the world is nine per cent richer, all of it in where the money lands. The silver vein and mine draw with generated glyphs until the paintings arrive. Adding them also broke a fifteen-hundred-day deadlock loose: the Confederacy could take forty islands and then never finish the war, because it spent every penny of income on garrisons and walls and could never afford the hulls to storm Highwater. A side that cannot win the war it is in now stops building anything with a wage that is not a ship — idle players beaten in five wars of six rather than one, and the median war a third shorter. No lore changed.

- **2026-09-20 v9.30** — **Break something up: the scrap list, and a top bar that fits.** The fortnight could sell your side down but you could not sell it down yourself, which is half of the mechanic. A **Break up** line under an island's Buildings board now opens everything standing there that could be pulled down — its works, its garrison, and any hull of yours in the harbor — each row saying what it raises, what it saves a day, and whether the plot comes back. One list rather than a button on every tile, for the reason felling timber already gives: a destructive button on a small tile is one somebody taps by accident. What the player may order is narrower than what a shortfall may take: no ancient wall, no order half-run, no island in mutiny, and no hull in open water or in the middle of an action. And a real bug behind it — on a 393px phone the top bar's **CLEAR** was being cut off by its own border, because two narrow-screen rules were written above the rules they had to beat and lost on source order. Fixed, and a test now reads the stylesheet's order rather than trusting it. No lore changed.

- **2026-09-20 v9.29** — **The ledger settles once a fortnight, and anything of yours can be broken up for half its price.** Sean's economy spec, dictated in one go. Income and upkeep no longer move every morning: fourteen days of each are reckoned and paid on one day, so the banner's figures hold still between settlements — *"otherwise what's going to end up happening is that people are going to be looking at it like a stock chart."* The banner is rebuilt to match, with gold held beside a ledger reading **In / Out / Clear**, and the third column turning to a red **Short** when the fortnight will not balance; it is the deficit rather than the treasury that answers whether to raise another earner or another wall. **Scrap** is new: destroy anything of your own and take half its price back, and stop paying to keep it. An earner is free to raise, so half of nothing is nothing and the ground under it is the whole reason to pull it down. A settlement that cannot be paid sells the side down at random until it can, one line in the log rather than one per thing — *"you can either actively do it or the game's going to do it for you."* Breaking up a hull puts the troops it was carrying ashore into the garrison, if it is lying in a harbor of yours; at sea they go the way of a sinking. Measured over forty wars against the same seeds: 18–21 from 23–16, median length 1,380 from 1,512, and one war in forty running out the clock rather than three. No lore changed.

- **2026-09-20 v9.28** — **Both seats can build on day one, and the war got five hundred days longer for it.** Sean, after a playtest opened Freeport and found its Buildings tab reading *"NOTHING TO BUILD WITH"*: *"I think Freeport and Highwater should have construction yards at start... 1 at home base and 1 randomly on their other starting locations. Keep shipyards and troop training to 1."* Freeport was the harder half, because it is dealt none of the opening's camps or mills at all — the articles were signed on it a week ago rather than settled on — so it now takes a yard by name, before the deal starts, and the second goes round the table among the side's other islands. Measured over the same forty worlds, **balance is untouched** (20–19 before, 20–18 after) and **the median war ran 731 days to 1,248**. The surprise is where that came from: the second yard costs 132 days, and *moving the first one onto the seat* costs 385. A capital is the roomiest and most loyal island a side owns, so a yard standing there builds walls and garrisons at the one island the war has to be decided at, and both seats get harder to take at once. Kept, because the first screen of the game should not say your capital cannot build — and recorded, because it makes war length an economy question rather than an opening one. Music is working again, so the item left open on 20 September is closed. No rules changed.

- **2026-09-20 v9.27** — **Played, both sides, to the end of a war — and six things did not work.** Sean: *"Play both sides. Play it through to completion. Explore every button and options. See what works and what doesn't and adjust."* Fifty-seven islands opened on an iPhone-sized screen with every tab on each, the whole utility bar driven, an errand sent, a squadron sailed, and two machine-played wars run to an outcome — the Crown's on day 972, the Confederacy's on day 1368. **Closing a Location** dropped you to the World Map instead of the Reach Map you came from, so reading a chain island by island cost two taps each time; the sheet remembers now. **Three retired words were still on screen**: the build card counted a landing as *"1 co."*, `terms.json` itself said a Training Facility drills *companies*, and a Pirate Lord's one order read **Send on mission** under a heading reading *On a mission*, with *Missions* as the chart filter — *errand* had been the agreed word since 17 September and had never reached the vocabulary file at all. **Two chart filters were blind to your own orders**: send somebody on Explore, the one errand that only ever goes to an island nobody has charted, and the Errands filter lit nothing; sail the Home Fleet on day one and the Fleets filter read nought. Where your own people and hulls are going is not news you have to buy, so both now count them; theirs at sea stay invisible, which is what the watch is for. **The errand sheet asked who was going before it said what the job was** — its own copy says *take who the work needs*, which you cannot do until you have seen the work. And the war ends with **one line of text you cannot see**: the dispatch strip floats over the top of the chart and sits directly on top of it, so you win a thirty-two-month war and what is on screen is three captures. The strip goes quiet once the war is won. There is still **no end-of-war screen**, which is now the largest open item — the three outcome screens are battle outcomes, not the war's. One number out of the two wars worth keeping: the Crown finished on 1,359 gold with nineteen works standing idle and the Confederacy on 249 with two, so the gold hoard is a Crown problem rather than a general one. No rules changed.

- **2026-09-20 v9.26** — **COMBAT MASTER v4.2 folded in, the reef-ship lore corrected, and four more paintings.** v4.2 carries the v4.1 equal-gold tuning with it, and the roster re-imports to exactly the six changes its header lists and nothing else: **Resolute** Troops 1 → 3 (the Crown's fast early trooper), **Majestic** Repair 1.0 → 0.8% so she now displays **Slow** (only the royal dockyard at Yarrow Minor can mend her — a wounded flagship is out for four months), **Tidestalker** upkeep 3.5 → 2.5, **Blackfin** repriced 500 → 375 and C → B, **Urskin Goliath** upkeep 16 → 28 as a valve on the strongest gold-for-gold ship in the game, and **Coral-Class** build 900 → **1,300 days, the longest in the game**. Part 2B, an Economy Doctrine for pricing future ships, is new. **Sean's lore correction**: *"I know the reef stuff is sung into existence but these ships are still made in shipyards and require them. The coral is part of them. It's a mix of ship making and magic."* Corrected in the master wherever the text read grown-not-built — Part 2B, Tidestalker, Reefwarden, Coral-Class — so a reef hull is now laid down in a yard and the coral sung up over a framed timber spine, which is also what the game has always done mechanically. **The Stern Rake check stops guessing.** v3 named the costs but not the pursuits, so on 19 September four plausible ones were searched for and found; v4.2 publishes the fleets, and four of the six land on the sheet's own scenarios — mid-game 24.7 against ~25, late 21.2 against ~21, a lone Majestic **26.6 against ~27**, which retroactively shows the old 41% target was v3's and the earlier two-pursuer guess had been right before it was "corrected". The two the sheet leaves unnamed share one pursuit: three Interceptor IIs put the Marauder on 62.9 against ~63 and the Witchlight on 33.5 against ~34. **And four paintings**: the Majestic, who wins through scale, proportion and discipline exactly as her guardrail demands; the **Brigantine**, who was the last hull in the game still showing a 234×174 slice off the original contact sheet, which is why she looked wrong beside twenty-seven commissions; the Cutlass, whose rising bow curve is the loudest line in her new painting; and the Tempest, carrying sail in the weather nobody remembers seeing her out of.

- **2026-09-20 v9.25** — **The two Confederate capitals repainted, and a count I had been getting wrong corrected.** New art for the **Coral-Class Dreadnaught** and the **Urskin Goliath**, both replacing a v1. The Coral-Class gets the hard half right: two thirds of her mass under the water and legible through it, a low armored back with the sea washing over it, recessed gun bays just clear of the waterline behind a colossal wedge ram, and no sails or masts — a warship, not a submarine, a creature or an island. The Goliath's structural half is exact, including her signature detail drawn as written: two banks of enormous sweep-oars coming out through iron-bound ports beneath load-bearing whalebone arches, with heavy crew on deck to establish the scale. Divergences recorded rather than re-cut: a stepped spired superstructure on the Coral-Class where the sheet wants no towers, and on the Goliath four masts where it wants two, bone-and-slate canvas where it wants oxblood and smoke-black, and a kraken device where it wants the Confederate flag. **And the fleet was never thirteen paintings short.** I had been reporting it that way for two days off the **PAINTED** markers in `docs/ship-art-direction.md`, which are hand-written, where `art-manifest.json` is written by the tool that installs the art — the doc had fallen thirteen hulls behind and nothing in the build compared the two. Every one of the twenty-eight has had art throughout. The markers are mirrored from the register now, the register is named in the file as the authority, and `shipart.test.ts` fails the build if they disagree; run against the stale doc it names exactly the thirteen hulls I had misreported.

- **2026-09-20 v9.24** — **The ship entry, built to Sean's mockup, with symbols.** He sent a rendering of the Cutlass and a sheet of eighteen line symbols — *"here is sample of what it should look like… and here are symbols you can use"* — and the entry is now that. The symbols are redrawn as inline SVG to the sheet's own spec (24×24, `currentColor`, round caps, nothing filled), so one icon serves the brass of a stat tile and the red of a section rule without a second copy. The painting runs **edge to edge** with no gutter, which is what makes it a plate rather than a thumbnail in a card. Under it, a rule, a compass star, a rule, and a line of small caps saying **what she is and what she is for** — *ARMORED CORVETTE · HEAVY-GUN HUNTER*. That line is **derived from each hull's own numbers**, not written twenty-eight times, so it can never drift from the stats printed an inch below it; and the derivation weights guns by what they throw rather than by how many there are, which is the whole trick, because the Cutlass carries six heavy against fourteen light and counting barrels makes her a close-quarters raider when her own entry says *"enough heavy guns to threaten something larger"*. A heavy throws twice a light by the combat master's own table, and weighting by that lands her exactly where the mockup has her. **The bars are gone** — the morning's instruction took them off the categorical stats, the mockup takes them off Hull and Armor too — and every tile now carries its symbol beside the label instead. The help mark moves to the far right of its rule, where the mockup puts it. **And the crest comes back as a class emblem**, which was the other half of his earlier sentence: brass where the ✕ is red, a line drawing where the ✕ is a stroke, answering *what kind of ship is this* rather than *whose* — so the two cannot be confused the way the crossed-cutlass faction sigil was.

- **2026-09-20 v9.23** — **An encyclopedia entry is one scroll now, and the art goes with it.** Sean: *"when I scroll down for more, the image should scroll not stay static… if I scroll down I want it to scroll with me."* The banner sat outside the scrolling body, pinned there on purpose — an island sheet has four tabs about one place, and letting the place scroll away meant reading a garrison with no idea whose it was. An entry has no tabs and is read top to bottom, so there the same rule was a picture that would not get out of the way. In **flow** mode the header and the banner move inside the body: one column, one scrollbar, and the art leaves the screen completely with no spacer behind it. What stays is a compact bar — name, class, close — that fades in as the full header goes past, laid over the top so it reserves no room and nothing jumps when it arrives. The ship's plate is **40vh** with `object-fit: cover`, scoped to hulls so a square crew portrait is not cropped to fit. The stats are re-cut into **Economy · Defense · Handling · Firepower · Lore**, each heading carrying its own help as a small round info button instead of a sentence-long link beside it, and the **bars come off the categorical stats** — Repairs, Size and Speed are names of bands, and a bar under them was an index into a list dressed up as a measurement. The ten tiles and their order are unchanged, so every card still has the same outline. **And the crest comes out of the entry header.** Sean: *"Remove the redundant close-like crossed-swords control… The × should be the only close control."* He is describing the Confederacy's sigil, which is crossed cutlasses — at header size, in the faction's red, at the far end of the row from a grey ✕, it reads as the brighter of two close buttons. Shrinking and dimming it was tried first and photographed: still two crossed strokes. So the entry says whose she is in words — *Conjure sloop · Confederacy* — and the ✕ is the only mark in the header. Every in-game sheet keeps its crest. Verified at 393×852: art exactly 40vh, both header and art fully offscreen at the foot of the scroll, the collapsed bar up, the sheet itself unmoved, the page behind it not scrolled, and the last lore paragraph clearing the bottom edge by 30px.

- **2026-09-20 v9.22** — **The chart was giving away what espionage is sold as buying.** Sean, with a screenshot: *"When I look at map it says imperium fleet in the wreckers reach but when I click on the island it says no reports."* Both screens were telling the truth about their own source, which is the tell — the island sheet has gone dark on unreported enemy ground since the watch went in, and the chart's **Fleets** layer was counting every hull lying off every island, live, for both sides. The Crown's Windward Squadron was legible on the World Map from day one without a report ever being written. Fixed at the layer, so the World Map and the Reach Map are both covered: your own hulls always, theirs live where you can see for yourself, theirs as the report left them where you have one — dated and *not* updating, so a squadron that has since sailed is still shown lying there until somebody looks again — and nothing at all where you have neither. **Production leaked the same way and was not reported**: an island earns what its works earn, works are the first thing the sheet stops showing, so a number on the chart adding them up answered the question without the errand. Whose flag flies is public and stays public; what stands on the island is now read through `knownIsland`, which was written for exactly this and carries the note that it is *"the one call anything outside the island sheet should be making"* — the chart had simply never been wired to it. The test is written as the general rule rather than the reported case (no layer lights an island with something `sightOf` says this side cannot see), and it was checked against the unfixed code first: three failures, the first of them the Crown's whole six-hull Home Fleet readable at the Aldermain on day one.

- **2026-09-20 v9.21** — **Six from a play session: the drag rebuilt, the opening halved, and the unaligned islands given something worth taking.** **The hold-and-drag now actually drags.** Three things were wrong and all three were the same mistake, which was counting travel instead of looking at where the finger was: every orderable tile carried `touch-action: none`, so on a board that is almost all tiles there was nowhere left to scroll a long list by (`pan-y` now, with the page pinned only for the life of a drag); nothing followed the finger, so the tile grew six per cent and stayed put while the list rearranged itself underneath (it is lifted and carried now); and a two-across grid was treated as a line, so dragging a tile straight down one row moved it one place and landed it in the wrong column (the target comes off the neighbours' real rectangles). Two defects only a driven gesture would have found: pointer capture **does not survive** React moving the node, so the tile stepped once and then went deaf and stayed lifted on the board — everything listens on the document now; and dropping a tile on another tile opened *that* tile, so the click after a real drag is swallowed once at the document. **One of each yard at the opening, not two**, and **one Swift in the Confederate Home Fleet, not four** — re-weighed as one Swift, two Tempests and the Brig, thirty-nine guns in four hulls against the Windward's forty-four in four. **Settled islands nobody owns now carry works of their own**: a fifth of them with one of each of the two building yards, the slipway and the Fortress, a twentieth with two, and the Fortress *fires* — `fortGuns` had refused any island the two sides did not hold, which was fine while only they could build, and makes a wall that cannot shoot otherwise. So a parley can bring in a working town, and a landing on an island that rolled a Fortress has to knock it down first. **Measured over the same forty machine-played wars before and after: Crown 17 — Confederacy 23, unchanged.** Wars run about a quarter longer (median 612 to 756 days) and both sides end richer — the Confederacy on 1,840 gold against 757 — because there are half as many places to spend it. **And the research-locked hulls are out of the Build menu**, which is where Sean saw them: nothing a side opens with ever needed research, but the menu listed every hull the side has designs for and refused them on the way out.

- **2026-09-19 v9.20** — **Second playtest pass: captures carded properly, the stale-shell 404s diagnosed and fixed, and a version that cannot go stale.** **Reyne's quoted sail was already correct** and is now pinned: measured before touching anything — preview 50, booked 50, anybody else 100 — so the preview and the order agree exactly, and the regression test is *"the preview equals the booking for every officer"* rather than *"Reyne is halved"*, because the bug was two functions disagreeing. I cannot reproduce what Sean saw and say so. **Silent captures: two of five paths had been done and three had not** — taken when an island is stormed, taken up when a side has no harbor left, and freed by a landing, which is the rescue half he also asked for. All three carry the flag now, and the test reads the sim's own source for every `pushEvent` about somebody changing hands rather than sweeping wars, because three 600-day machine-played wars produced zero captures between them (the opponent takes people when a *human* leaves officers standing about; the machine does not). **The 404s are not a service worker** — there is none in the project and never has been. What goes stale is the document: an installed app holds `index.html`, that HTML names its assets by content hash, and a deploy deletes the hashes it names. Fixed twice over: an inline script that reloads once when a script or stylesheet fails to load, and an unhashed `build.json` fetched with `no-store` so a shell older than the server reloads itself before anything 404s — both guarded against loops. **And the version is 0.5.0 with a bundler-stamped build id beside it** (`Version 0.5.0 · build 202609192152`), so two deploys can never look alike in the menu however often the version is forgotten.

- **2026-09-19 v9.19** — **The Blackfin lands, and the fleet is painted.** The last of the twenty-five: a low knife-lean corvette under a tall black mainsail, white foresails beside it, both rails crowded end to end with small crewed guns on carriages and not a gunport anywhere — which is what 29 light guns should look like, and she carries more of them than anything else afloat. The silhouette guardrail held, which is the whole point of having written one. Two notes did not land and are recorded rather than re-cut: the guns read as brass cannon rather than stubby iron carronades, and the cloth is red rather than turquoise-and-bone; her mainsail also carries the Confederacy crest rather than being plain, which contradicts her own exception but not the standing rule, since the crest is theirs. **Every hull on the roster now has a painting** — verified in the browser rather than off the register, 25 cells and 25 photographs — and the drawn silhouette becomes a fallback nothing reaches, kept for the next ship added.

- **2026-09-19 v9.18** — **Enemy whereabouts are dated, never stated; and the Ironback gets her painting.** Sean, on the crew line added an hour earlier: *"Don't say in irons. Just say Captured at location. If [I don't] know just say captured"* — so *Captured at Highwater*, or bare *Captured* where the island was never charted. And: *"With all enemy information we always add a disclaimer it's either unknown whereabouts or it says location and the days since last intelligence so we know the intel is how many days old. Could be true maybe not."* That reverses the morning's call to leave enemy crew blank, and it is the better rule — the fog is the interesting part and should be shown as fog. An enemy line now always carries one of three: **`· in sight`** where you can see them for yourself (read through `sightOf`, the same function the island sheet uses, so the two screens cannot disagree), **`· report 12 days old`** off the newest report of yours that had them on it, or **`Unknown whereabouts`**. The half that matters: where a report is what you have, the island named is the **report's**, never the one they are actually standing on — naming the true island and hanging an age off it would be the leak wearing a disclaimer, and there is a test that moves an officer to an uncharted island and asserts the line does not contain its name. The unaligned stay blank for a different reason than secrecy: signing on is set against an island rather than against whoever stands on it. **The Ironback is painted** — a captured Imperial two-decker plated over in bolted iron, a great bow chaser, long barrels reaching past her side, shelling a clifftop fortress; her flag came back as the Confederacy's own crest rather than a stock Jolly Roger, which is the skull carve-out working rather than the ban failing. One hull is left on a drawn silhouette: the Blackfin.

- **2026-09-19 v9.17** — **A crew member's entry says where they are.** Sean: *"In the encyclopedia (just for crew) say 'Ashore at [location]' / 'Commanding [fleet name / location name]' ... If en route say 'Enroute to [location]'."* One brass line at the top of the entry, above the role tags — the only thing on an encyclopedia page that is about today rather than about the world. It reads *In irons at* for a prisoner (the row he did not name, added because the fallback would otherwise have said *Ashore at Highwater* about somebody in a cell), *Enroute to* while an errand is on passage or a squadron is under way, *Commanding* for a chair or a deck, and *Ashore at* for everybody else; a companion reads the errand of whoever is leading the boat. **Drawn for your own crew and nobody else**, which is not a detail: an enemy officer's whereabouts is what the espionage errand exists to buy, and a reference page printing it beside every Crown name would hand over the whole enemy disposition for free and permanently. Measured on a fresh Confederacy game: five entries carry the line, twenty-one do not. One state on Sean's list has no counterpart in the simulation — *"Aboard [fleet name] if idle"* — because `takePost` and `board` both seat an officer on the deck and both relieve whatever they held before: **taking a deck is the posting**, nobody rides along, so anyone on a ship reads *Commanding*. A genuine passenger state would be a rules change, not a copy change.

- **2026-09-19 v9.16** — **The crew tab comes off the console.** Sean: *"Cut the 'crew' tab from the bottom utility bar. Now that I think about it 'Idle Crew' is already best way to view crew anyway."* Four buttons now — World Map, Build, Book, Log — and the Idle crew filter sits directly above the bar it was cut from with its own count on it. Everything the roster screen was for is reachable closer to the work: the filter lights islands with somebody standing about on them, an island's Crew tab says who is there, the advisor answers "who is free" with a tappable list, and the encyclopedia holds the whole cast A-Z. The crew *sheet* is untouched and still opens over whatever you are looking at. `CharactersScreen.tsx` is deleted rather than left unreachable, and the `tabs.characters` label goes with it, since a label for a tab that does not exist is a word the vocabulary file promises and the game never says. **What it costs, noted rather than hidden:** there is no longer one view of everyone of yours *including the busy ones* — a captured crew member or one a fortnight into an errand is found through the Log or the advisor now. If that bites, the answer is a "crew, anywhere" filter on the chart rather than the tab back.

- **2026-09-19 v9.15** — **Naval Combat System v3: the rules doc, and four rules that move.** A new Google Doc beside the v3 roster, superseding the Sep 15 combat document entirely. **Long Guns fall from 50% to 25% penetration** — *"Armor-cracking is Heavy's signature alone"* — which stops first strike, full reach and armor-cracking being one purchase; against Armor 25 a 26-damage roll goes from 13 through to 7. That turned out to be a correction rather than a change: the engine reproduced v3's ten published 5,000-trial matchups to within 2.2 points at 50% and reproduces them to **1.4** at 25%, so the sheet and the engine had quietly disagreed and now do not. **Guns never hold fire**: the targeting algorithm's "cannot penetrate" exclusion is gone, because a hopeless target scores zero and ranks last on its own — the exclusion differed in exactly one case, sending a gun to a hull already marked for death rather than to the one it cannot hurt. **Breaking off becomes the Stern Rake**, the biggest change: four sequential volleys instead of one, releasing Very Fast, then Fast, then Normal, then Slow, so a slow hull is shot at four times and a fast one once — and the fire **ignores armor entirely**, raking down the exposed stern, so the plate that makes a first-rate unkillable in line does nothing for her while she runs. Damage lands between volleys rather than at the end, which is the doc's named hook for component damage: a ship knocked down a Speed class is simply released a volley later. **Repair's bands** are pinned to the doc's exact wording, where Normal is the single value 1.0% and anything below it is Slow. **And the duration standard I flagged this morning is withdrawn** — I measured mirrors at 4.69 Exchanges against a stated 1-3, and v3 §11 replaces that line with *"mirrors average ~8 internal rounds; capital duels 7-10; evenly matched battles resolve in a handful of Exchanges."* Measured against the standard that now applies: 7.6 internal rounds, 4.77 Exchanges. Mutual destruction in mirrors is likewise stated as intended and accepted. Not verifiable: the doc's retreat-cost figures name the costs but not the fleets, and retreat damage is near-linear in the pursuer's Long Gun count, so only the early-game 0% reproduces exactly.

- **2026-09-19 v9.14** — **Fleet Roster v3: the guns become real rates, the hulls grow with them, and the engine does not move.** A *new* sheet rather than an edit to the old one, and it says so: *"Supersedes v1/v2. Gun counts rebased on the historical Royal Navy rating system (1st rate 100-120 / 2nd 90-98 / 3rd 64-80 / 4th 48-60 / 5th-rate frigate 32-44 / 6th rate 20-28 / sloop 16-18 / gun-brig & cutter 6-14)."* Every one of the 25 hulls changed — the Majestic from 36 guns to a 1st rate's 104, the Sovereign from 11 to a 3rd rate's 74, hulls rescaled four- to ninefold (Majestic 1,600 to 13,900), and gold, build days and maintenance rebalanced on two stated rules: maintenance is 1% of build gold a day and build time is a day per gold. A **Class** column names the rate and becomes each hull's Role, so the Majestic reads *1st rate*. **Speed, Size, Armor, Bombardment, Troop Capacity and Repair Rate are untouched, and so is the combat engine**: the accuracy matrices, the gun dice, the armor formula, the phase order and the 30% Exchange stop are not in v3 and still match `navycombat.ts` exactly, which was verified rather than assumed — the Combat Derived Stats cross-check passed on the new table without an engine edit. Checked three ways before it was trusted: the sheet's own arithmetic (gun columns sum to the rate in the class name, gold over Ref Cost gives the stated ratio, the ratio gives the stated letter), that derived-stats cross-check, and **v3's ten published 5,000-trial matchups against a new `lab/v3check.ts`, which reproduces all ten inside 2.2 percentage points**. **Repair stops being a percentage** at the sheet's word — *"a BETWEEN-BATTLES stat (never during combat) [that] displays to players as Slow/Normal/Fast/Very Fast, never a percentage"* — closing the one place back-end math had leaked onto a player-facing screen; the bar still moves with the fraction so the ordering is real, and the loader warns if a word and its number disagree. Two things fell out on the way: **the Urskin Whaler's painting has never been wired to her entry** (the slug was held by the Gigantic hull until that became the Goliath, and the mapping did not follow the picture back), and the **Sovereign now trips the Early-game power warning** — a 3rd rate among the Crown's four starting hulls, top-tier in Heavy Guns, Light Guns and Hull at once, with Slow speed, 1,940 gold and 700 days on the stocks as the counterweights the rule asks for. **Open, and Sean's to rule on:** the rebase grew the hulls harder than the guns, so mirror duels went from a mean of 3.22 Combat Exchanges to 4.69 against a stated standard of 1-3. Every published matchup still lands where the sheet says, so the stats are as intended; it is the pace that drifted, and the lever for it is the Exchange stop share.

- **2026-09-19 v9.13** — **Nine from the Confederacy playtest: whose news it is, an empty island, who is at sea, and a pool that had not run out.** *"Dispatches written from the wrong side's point of view"* (#3) was three writers making one mistake: one log serves both sides, so anything in the second person has to ask whose news it is. A Crown settlement read *"they are yours"*; a leak out of a Crown island was filed as the player's **loss** in the third person when it was the player's own **intelligence**; and an action against a creature alone drew a full crest for the faction that never sailed, which reads as an enemy fleet standing off untouched — the dispatch card carries the creature now, as the battle sheet already did. **An island with nobody on it** (#5) was three symptoms of one flag: a landing set `uprising` from whether it left the garrison a *populated* island would demand, so Coralhome came up in mutiny, was reported as *"the people did not want this"*, and dropped off the build picker — which hides islands in mutiny, taking the rock off the list of places you can settle, the one thing you take a rock for. **Crew were filed under the port they left** (#6): `locationSystemId` only moves when a boat touches a beach, so for the whole of a passage somebody aboard a squadron still stood, on paper, in the harbor it sailed from — in its crew list, its idle count and its Reach tally, offered as a companion and catchable if it fell. Fleets were already right; people were not. The badge was the same mistake one level up (#8) — an errand is a passage *and* a fortnight ashore, and it printed the passage's word over both. **The recruit pool had not run out** (#11, and Sean's two balance notes about the verb dying): the notice read the unaligned who are *ashore*, and the roster arrives across the whole war — measured over six seeds, eight of them on roughly days 1, 1, 70, 135, 205, 275, 350 and 425 — so it announced the end of the world's people on day 80 with five still to come, and signing on then correctly reappeared when the next one landed. **Two boats on one errand** (#12) are warned rather than blocked, plainly for the five where a second is simply wasted. **The encyclopedia stopped flying your flag** over the three Crown and two Confederate names the opening draw did not seat (#9) — they are in no war, not even in the pool. **A Reach is counted as charted** (#10): Yours / Unaligned / Theirs / Ashore, the mutiny badge and the mean allegiance were taken over every island in the chain, so Coral Reach could report an unaligned harbor in water no boat had entered; a line now says how many are left unknown. **And a dispatch holds the clock again** (#7), which reverses *"combat is only clock pause"* of the day before — the earlier rule was given against a card stack that replaced itself endlessly at Fast, where a hold would have been permanent; that was fixed first, so the hold is safe. Three things stop the clock and nothing else: an action your ships are in, a dispatch that interrupted you, and an errand waiting on your answer.

- **2026-09-19 v9.12** — **The roster sheet re-read: one new hull, and a cross-check against the sheet's own arithmetic.** Diffed before touching anything — all 24 hulls matched the sheet field for field, and the locked Combat Simulation Rules tab matches `navycombat.ts` exactly, so the damage calculations needed no edit. The change is the 25th hull: **CFS-URW-R3-01, the Urskin Whaler**, a Medium retrofit at Confederacy R3 — the ship Sean said he would invest when the Gigantic hull was renamed the Goliath to free the name, and her painting has been on disk since. The import overturned two things the code had assumed: **two hulls may share a research rung** (an error until now, from an inference the sheet contradicts on purpose — *"research order establishes progression, not strict replacement"* — and a warning from here, since an accidental collision looks exactly like a deliberate pair), and **the navies are no longer the same length**, thirteen Confederate hulls to the Crown's twelve, which is the sheet's stated asymmetry rather than a slip. **And the sheet's new Combat Derived Stats tab is now a test**: copied verbatim to `src/data/combat-derived.json` and compared hull by hull — 25 ships × 3 gun types of accuracy, every volley column, every combatant type — which is the one check that is not the engine marking its own homework. Nudging a single matrix cell by one point fails it.

- **2026-09-19 v9.11** — **The reference stops being a manual.** Thirteen rules sections moved off the Ships and Locations pages onto Rules: both are a shelf of pictures you scroll, and a manual between the pictures and the reader is a manual with a gallery in it. Ships is now a grid and nothing else; **Locations is a list of every charted island with its thumbnail**, at Sean's word. In their place an **ℹ️ mark** — one labelled line, not a block — points at the rule that explains it, on both pages and beside each stat group on a hull's entry. That needed a fix first: a lookup at a particular entry only ever scrolled on the four unit pages, so the role tags on a crew member have been landing at the top of the Glossary since they were built. **The Rules page opens with How to win**, brass-bordered and large, with your own side stated first — it had been four fifths of the way down under a heading the same weight as "Not built yet". **Reef-folk are Confederacy only** and the rules now enforce it; §3 had said as much for a week while a Crown recruiter could sign Maren Quist out of the pool. (The Hushed are described as Crown-bound and still are not enforced — named, not fixed.) **Garrisons counts and grades nothing**, like Production: the size band was saying vaguely what the numeral says exactly. **And the tutorial is seven cards, down from twelve** — open an island, send somebody, build something, start the clock, read the Log; the last card says where the rest is rather than being it.

- **2026-09-19 v9.10** — **The Idle buildings count was right; the island could not say which works it meant.** Sean, on an island marked with a 1: *"This construction yard is making something so it's not idle."* Swept 15,726 island-days for a working yard being counted idle and found none, then rebuilt the island by hand: with the yard at work its whole kind drops to zero, and the 1 was the slipway standing empty beside it. (A blockade was checked too — it stops an island earning, not building, so a slipway behind one still wants an order.) The real fault is that a mark can say how many and never which, and the panel listed the busy works first. So an idle works now carries an **Idle** tag and sorts to the top of *Order something built* — and the tag asks the same function the chart mark calls rather than re-deriving idleness, since a tag that disagreed with the chart would be worse than none. Pinned by a test that searches seeds for an island holding both a yard and a slipway rather than skipping when the map deals none.

- **2026-09-19 v9.9** — **The errand sheet says what the errand is, and stops quoting odds.** Sean: *"Recruit / Command [location] / Command [Fleet1, Fleet 2...] / Espionage. Cut % chance."* *Signing on* becomes **Recruit** — the in-world phrase stays in prose, where an island still keeps an open table and people still sign the articles, but a label beside Espionage and Command wants the word for the job; renamed in `MISSION_LABEL`, so the log, the crew card and the island's own section moved with it. *Command the island* becomes **Command Freeport**, and the fleet lines drop their article to match — one per squadron in the harbor, which is how it already worked. **And the two percentages are gone:** the chance of passing the island's watch unseen and the chance of the work coming off. The reasoning for showing them holds — a raid on a loyal capital is a bad idea because of the getting in and out, not the work — but it is a rule to feel rather than a number to read off before spending a crew member. The parley bands stay, being judgements rather than percentages. The sim is untouched: both figures still settle every errand.

- **2026-09-19 v9.8** — **Distance costs what distance should.** Sean: *"Travel time is still way too fast. Traveling to island should be proportional to their distance on map with 200 days being longest travel distance."* Measured first: over 9,765 island pairs the longest passage in the game was **37 days** and the median 19, so a fleet could be anywhere it liked inside a month and where it stood barely constrained what it could do next. It is one line of arithmetic now — how far apart two islands are as a fraction of the width of the world, times two hundred — replacing a day per 36 units of water, a two-day cast-off and a four-day toll for leaving your own Sea. Both extras are gone rather than added on top, since either would put the longest voyage past the two hundred asked for; **the open-sea toll is the loss worth naming**, as crossing between Reaches now costs the same as the same distance inside one. Neighbours are 7 to 9 days, the length of a Reach a fortnight, the next Sea over five or six weeks, corner to corner the full two hundred — and the ceiling is on the distance, not the voyage, so `fleetPace` still makes a ship of the line slower than that and a sloop quicker. **Measured, twelve seeds both sides machine-played:** wars run about a quarter longer (median 527 → 659 days), and two of the twelve no longer settle at all where twelve of twelve did. The mechanism is plain — the opponent will not commit a fleet to a six-month passage, so it never comes for Highwater and an unplayed Crown eats the map. Teaching the planner to mount a long offensive is the fix and is left as a deliberate tuning change rather than smuggled in with the rescaling.

- **2026-09-19 v9.7** — **The frames come off the crew.** Sean: *"This screen is still showing way too small of images. Cut the frames and just show me the crew please."* Crew were the last unit kind on a Location board still drawn as a ringed medallion — an ornate frame taking most of the tile with the face a circle inside it — while every hull, troop and works is a painting run full width across the top. Crew are now the same, at 166px against the 50-odd the ring's opening allowed. This is the second run at the complaint: the first answer tucked the face under the ring's bevel and kept the frame. The rings are not deleted, but with `RING_MIN` at 80px and every remaining portrait in play at 44, they are now worn nowhere a player looks — only in the art gallery. **And the app can no longer be scrolled:** the 160px of filler a sheet paints below itself, added to cover the maroon strip, made `.app` a scroll container under `overflow: hidden`, so anything scrolling an element into view took the topbar off the top and the console off the bottom. `overflow: clip` paints the same and cannot scroll.

- **2026-09-19 v9.6** — **A Lord's ship moves in with the Lord, and a painting stops being cut to fit.** The three legend hulls left the foot of the Ships page — where they sat under a paragraph explaining that nothing builds them, sails them or fights them — and are a card under the bio in each Pirate Lord's encyclopedia entry, matching the in-game character sheet. A test pins the join both ways, since the Lord is now the only route to the hull. **And works art keeps its own shape:** the box was fixed at 1.6, the band the five sliced strips were cut for, so the two 4:3 fortress paintings were losing their sky and their water to it. A whole commission is drawn at 4:3 and a sliced strip keeps its band, in the encyclopedia, on the island board and on the build card; the strips will fill a 4:3 box the day they are repainted, with no further code, and the art briefs no longer tell the artist to keep the subject clear of the top and bottom eighth. Card captions are pushed to the foot of the tile so a row of different-shaped paintings still reads as a row. **Armor is one spelling** at last — the earlier pass renamed the constant and left eight *armour*s in the Rules page a player reads.

- **2026-09-19 v9.5** — **The Location screen loses what it was only repeating, and every hull gets a line of its own.** Tabs on your island appear only when there is something behind them — Harbor when a hull is in the roads or standing for the place, Crew when somebody is ashore or on passage — and the order is Harbor, Crew, Buildings, Troops. On **their** island all four show whatever the fog says, because a hidden tab would be the fog telling the player a lie shaped like a fact; the age of the report carries the doubt instead (*"Last report 6 days ago"*). "At anchor" is gone, Ashore and Underway appear only when both do, and the glossary's section intros — each a sentence explaining what a list of ships is — are cut. **Grouping stops being a question:** every board folds alike units together always, and only hulls keep the toggle, because four Kestrels are four different amounts of damage and ten Marines are not. Reordering is a press and hold and a drag, built on the one-step up/down the lists already had; the arrows stay in the page for the keyboard but are not drawn until one is focused. **Lore left the Location screen** for the encyclopedia, where the room is. **And the ship sheet says what a ship is for:** the Design Notes column was the stat grid in a sentence, printed under the stat grid, so all twenty-four hulls have a line naming what they beat and what beats them — kept in `src/data/ship-flavour.json` rather than in the roster, which is re-imported from the sheet and would lose them, and reproduced as §6C here from that same file.

- **2026-09-19 v9.4** — **A ground unit is a Troop, and the chart filters are the player's to arrange.** Six notes at once. **The vocabulary reverses:** *"rename 'company' to 'troop(s)' through game when talking about ground units"* undoes the 17 September ruling that made it a Company and retired *troops*, so the table in the working notes turns round with it. `terms.troop` was already the single source, so the flip is one line and the work was the hundred-odd places that spelled it out — 62 string literals and 48 stretches of raw JSX. One exemption: **Ship's Company** is a unit's proper name and a real naval idiom for the crew of a vessel, not the category, so it stands. Ids did not move: `crown-ships-company` is a key and a painting on disk. **And the rename found a hole in the guard** — `vocabulary.test.ts` only ever read quoted strings, so every retired word has gone unchecked in the text *between* the tags since the pass was written, which is where 48 of these were. It reads both now. **Three idle filters became one:** *"Consolidate idle yards, training, shipyards into 'Idle Buildings'"* — three swipes to ask one question, and the answer is the same either way. **Available land moved last**, pinned by a test because the array order *is* the swipe order. **Garrisons and Available land show their number** as well as their size; the numeral takes the band's size, because a numeral replaces the dot and adding it would otherwise have thrown away the banding asked for in the same breath. **The dot ladder is now one rule:** under three small, three to five medium, six and up large — which a garrison has done since 14 September, so the change was open ground, from 2 and 5 to the same 3 and 6. **And the strip has an order the player sets**, in the menu, saved to the device with grouping rather than to the war, stored as ids and reconciled at read time so a filter added or dropped between builds cannot strand anybody.

- **2026-09-19 v9.3** — **The encyclopedia splits into a browse layer and an entry layer.** Sean: *"I feel like on the encyclopedia you're trying to do too much... Within the encyclopedia you can look at pics and scroll. But when you find the entry you want you click it for max info in a single entry. And then in the game panels if you need to learn about something you click it and it pops up the full max entry."* Every row had been carrying its whole subject — art, stats, hit chances, lore — and twenty-six of those is a document you scroll past rather than a reference you look things up in. **The list is now a grid of pictures**, two to a row, each with a name and the single line you would choose by; a dozen hulls fit on a screen where one and a half did. **The entry is a sheet of its own** on a third layer, holding everything the rows used to plus the facts that had only been stated in page-level prose — a person's entry now answers whether *they* may recruit or hold an island, instead of leaving the player to carry the rule. **The same sheet is what a game panel opens**: it is keyed by id rather than by the object a caller happens to hold, so tapping a crew card on the Crew screen and tapping a face in the reference are one request with one destination. The guessing that maps an id to an entry happens once, and a test walks all five id spaces and fails if any two ever collide. **And it turned up a second silent bug:** landing on an entry had never worked for a hull, because the cells were keyed `enc-CWN-MAJ-R8-01` while the effect looked for a lower-cased slug and `getElementById` is case-sensitive — every ship lookup since the roster landed had been going to the top of the page. Both ends share one function now.

- **2026-09-19 v9.2** — **The encyclopedia gets its house in order, and the art gets a gallery.** Six notes from Sean in one go. **The crew heads were being cut by the crop, not the CSS** — the face crops are square and so is the box, so nothing was being trimmed at render time; matching each 124px face master back against the portrait it came from showed all twenty-six anchored at y=6 out of a portrait only ~200 tall, cutting the Widow Ashgrave's hat, Blackwater's hair and Isolde Marrow's crown, with four also well off the head sideways. Recut at 154px from the top edge and centred on the head, the centres read off a ruler overlay rather than detected, because the cast includes a sea-bear, a goblin, a fish-person and a Bog-folk and no detector here handles four of twenty-six. **The 40% reduction also makes the picture sharp for the first time**: it had been the card's full 384px from a 256px source, so the biggest version was the softest, and 60% lands under the source. The entry is four bands now — head beside the name, the four ratings in the column that was empty, role chips, then the life — which is how the other tabs have always read. **Everything is A–Z within its group**, people by surname, because a page of *Admiral, Admiral, Captain, Captain* is not alphabetical in any sense a reader wants; the groups stay, as the glossary settled on 17 September. **The eleven role tags are links now, and nine of them had never been defined anywhere** — Leader, General, Spec Ops, Ship Design, Drill Research, Deep-touched, Latent Deep-touched, Tidemaster, Wing-Captain — so they were written first, each saying whether the tag is a rule or a label, which turns out to be a four/five split a player could not have guessed: Recruiter gates Recruitment, Leader and General gate Command, Negotiator and Spec Ops are worth +12 at the errand they suit, and the other five are read by nothing. A chip is brass when it opens something and flat when it does not. **A real bug fell out of it:** a lookup made from inside the open encyclopedia did nothing, because the Almanac seeds its tab from a prop into `useState` — the role tags are the first lookup in the game to fire from inside the sheet. Lookups are counted now and the count is the React key. **Google Drive could not take the art**: the connector needs every byte inline as base64 and the channel truncates past about 20KB, so 139 files and 5MB were never going through it. Drive gets the written index; the art gets `?art=paintings`, a gallery that ships with the game — all 139 at shipped resolution, grouped and searchable, and incapable of going stale, which a folder of copies would have done the first time a painting was replaced.

- **2026-09-19 v9.1** — **The Urskin Goliath, and a Whaler that will actually be a whaler.** Sean, with two paintings: *"Change its name to Urskin Goliath. I am gonna invest a new ship called the Urskin Whaler... The big one is the Goliath small one is whaler."* This splits a name that had quietly been doing two jobs. **Two ships were called the Urskin Whaler and they were nothing like each other:** the live roster's is a Medium of 30 hull, *"a northern whaling hull with the ice-frames still in her and a harpoon battery over the bow"*, while the locked roster's is a Gigantic of 1,800 — the largest hull in the game, filed as a colossal invasion dreadnaught. Sixtyfold apart under one name, and it had not bitten only because the two rosters never meet. The dreadnaught is the **Goliath** now, which is what she always was, and the Whaler goes back to being a whaler. **Her Ship ID moved with her**, `CFS-URW-R7-01` → `CFS-URG-R7-01`, so that URW is free for the hull Sean is entering into the sheet; that part was decided here rather than read off the sheet and is flagged as such, but leaving the Goliath on URW guarantees a collision the moment the real whaler is entered. **The id collision would have been caught; the name collision would not have been** — nothing checked that two hulls were called different things, which is exactly the state the game had been in all day. The roster validator now rejects a repeated name the way it rejects a repeated id, and that guard is worth more than the rename that prompted it. **No number changed** — same Gigantic, same 1,800 hull, same 7 Long and 13 Heavy, and the 5,000-trial endgame table comes back identical to the decimal, which is the proof this was a rename and not an edit. The big painting moves to `ships/urskin-goliath`: bone hull, whale-skull figurehead, three gun decks, bone spars out over the ice. The new one takes the Whaler's slug — same ice and same Urskin hand, but two masts, one gun deck and a harpoon run out over the bow, the live roster's own blurb made visible. One mapping was **unhooked rather than repointed**: the encyclopedia link from the live 30-hull Whaler, because sending a player from her to a 1,800-hull dreadnaught is worse than sending them nowhere. She is remapped the day the real Whaler lands in the sheet.

- **2026-09-19 v9.0** — **Two peoples pick a side, and one of them changes sides to do it.** Sean: *"The bog folk are exclusively crown imperium and the urskin are exclusively confederacy."* The Urskin half was already true and only needed writing down — Torvik is Urskin and §2's compact already reads *"pirate captains, smugglers, exiled nobles, Reef-folk clans, Urskin whaling fleets."* The Bog-folk half is a **reversal**, and worth flagging as one: both Bog-folk in the bible were written as amphibious guerrillas who fought the Imperium out of the Storm swamps, after the Dresselians they translate. They are the Crown's now, the swamps were Crown ground before the Corsair Wars, and Orrin Marsh and Tobias Renn both *held* them rather than raided them. The roster is better for it. The Imperium was the only faction in the game with no people but Human, which quietly made the Confederacy the side with all the texture and the Crown a wall of naval officers; now each has a people of its own and the Confederacy keeps the Reef-folk besides. **Mechanically it is a rule, not flavour.** `PEOPLE_ALLEGIANCE` is read by the recruit pool, so the two sides no longer draw from the same twelve: an Urskin standing on a Crown island can never be signed by the Crown however loyal the island or however good the recruiter, and a Bog-folk is closed to the Brethren the same way. The encyclopedia says so on the entry — *"Will only serve the Imperium"* — rather than letting a player work it out from a wasted voyage. Six tests hold it, including one that walks the shipped roster and fails if anybody is ever added on the wrong side.

- **2026-09-18 v8.9** — **The combat system is locked, and there is no Firepower stat.** Sean rewrote the Fleet Roster sheet a second time, and the ship table is now the smaller half of it: it also carries a Ratings & Pricing system that prices every hull from its capabilities, a **Combat Rules** tab marked LOCKED, and a Combat Derived Stats table of per-ship hit chances and average volleys. The rules open with the sentence the whole model hangs on — *"There is no ship-level Firepower stat. Every individual cannon makes its own attack using the rules for its gun type"* — which **dissolves the blocking item rather than answering it.** Every naval document since that morning had said nothing downstream could move until the roster was converted to Firepower and a 1–10 Speed; there was never a Firepower number to derive. The three gun columns *are* the combat inputs and the roster now feeds the engine with no adapter at all. The model: one d100 and its own damage dice per cannon, Light 2d20 with no penetration and +10 accuracy, Heavy 4d20 at 50% penetration, Long 2d20 at 50%; **armor is back** as a flat subtraction after penetration and rescaled from 0–110 to **0–30**, so Armor 25 stops a 25-damage Light hit dead and takes 13 off the same roll from a Heavy; **First Strike is back** and is now the shape of the round rather than a flag, since a hull the Long Gun phase sinks never fires its own Light and Heavy guns at all. A new manual **Size** property (Small/Medium/Large/Gigantic) joins Speed in deciding accuracy, and the two change accuracy *only* — a Heavy Gun against a sloop is not doing less damage, it is missing, at 10% against 95% at a slow giant. One press of Fight is a **Combat Exchange**: internal rounds until a side has lost 30% of the hull it started with. Boarding, morale, formation, retreat probability and a size-class damage triangle stay gone. **Built and measured** with the 5,000-trial engine the sheet names as the next step, every hull against every hull: **his endgame rule lands on the nose with nothing tuned to make it** — one Urskin Whaler or one Coral-Class loses to a Majestic 100% of the time, while two Whalers or one of each beat her 100% and two Coral-Class 98.3%. The accuracy model is checked against his own published hit-chance table, sixteen hulls and both clamps. **One target is missed:** evenly matched battles average 3.30 Exchanges against a stated 1–3, because the 30% stop is proportional and the most even pairings are the armored ones where each cannon gets least through — the roster at large sits at 2.10 and 82.5% inside the target. Nothing was changed to chase it; the dial is his. None of it is wired into the live game.

- **2026-09-18 v8.8** — **Harbor guns answer a bombardment and nothing else.** Sean sent a screenshot of an action off Highwater — five of his hulls, the Imperium with *zero* hulls and forty harbor guns, a hull lost that round, and a heading calling it the first broadside — and said it made no sense: *"it's not a broadside bc one fleet... guns should be anti bombardment only."* A fort was a combatant in the fleet action with an infinite hull that shot and could not be shot at, so a squadron lying off a fortified island was ground down for ever by a building it had not attacked and could not touch. The rule was already written the other way: his own order of operations is *their fleet, then the blockade, then the walls, then the landing*, and the walls come **after** their fleet. So the wall is out of the fleet action entirely — out of the odds, out of the battle sheet, out of the log card — and one shared test decides whether the battery is live, which is: is this fleet bombarding it? **The fort is not weaker.** It still refuses a landing outright while it stands, still has to be beaten down with shot, and still answers that shot at full weight — now against a fleet that can hit it back. **Measured over 24 wars against the same 24 before: every war finishes.** Four used to run to the 3,000-day cap and all four were Crown-ahead; all four became Crown wins, and the Confederacy still wins exactly seven, so the head-to-head balance did not move — the wars that could never close now close the way they were already leaning. The stalemate was the fort: fronts froze because a fleet could not sit off a fortified island long enough to do anything to it. **The bill is pace:** the median war halves, 876 days to 420, which is the number to look at first if the new speed feels wrong. The Confederacy also stops hoarding (8,157 gold at the end becomes 1,152), which was an open item and was downstream of the same thing. With the fort out of it the only one-fleet action left is a creature, and a creature makes a pass rather than firing a broadside, so the heading now says which it is.

- **2026-09-18 v8.7** — **Jessup's dreadnought is the *Adamant*.** She was the *Ironback* from the start, and stayed the *Ironback* through the Pirate Lords pivot. The Fleet Roster Sean rewrote on 18 September names a buildable Confederate siege ship Ironback, so one name was doing two jobs — a unique legend hull in the live game and a class anyone can lay down in the design roster. Renaming the buildable ship was tried first and rejected: the roster is his own and a legend is one field, so the legend moved instead. *Adamant* keeps the iron without the word, reads as the Crown first-rate she is, and says something about a man who left rather than bent. Jessup's power is now **He fights a harbor the *Adamant's* way** and does exactly what it did. The §2 and §6 tables below still say *Ironback*, as they still say *Free Harbor* for Hale's ship: they are the record of what was designed, not of what shipped. Where they name a dreadnought *class* they are now right rather than wrong.

- **2026-09-17 v8.6** — **Three build speeds, and a glossary.** At Sean's word — *"construction is happening too fast... ships take forever, facilities medium, troops generally fast"* — the three classes stop overlapping. They had almost completely: ships ran 8 to 38 days and buildings 5 to 32, so a ship of the line and a Shipyard cost about the same fortnight. Now a **company is a week**, a **building is two to eight weeks** (Lumber Mill 12, Gold Mine 20, Training Facility 28, Fortress 30, Construction Yard 34, Shipyard 42, Heavy Fortress 54), and a **ship is a season**: a sloop 24 to 33 days, a frigate 48 to 58, a ship of the line 79 to 137. All of that is for one works — the original's rule, and already this game's, is that time divides by how many works of that kind are on the island, so three Shipyards lay down a first-rate in forty-six days rather than a hundred and thirty-seven. **Measured over forty wars** against the same forty before: the Confederacy doubles the ground it ends holding (9.8 islands to 19.4) because a Crown with four fewer hulls cannot police sixty-three islands, and gold stops being the constraint (the Crown ends on 4,431 rather than 561), which is what the September memo asked for. **The bill is decisiveness:** one war in five now runs to the cap rather than one in ten. A gentler slowdown was tried to buy that back and bought nothing — nine unfinished against eight, and a *longer* median — so the exact multiplier is noise and the slower one ships. The cause is the fork the last tuning run found and nobody has yet chosen between: the Crown's corps collapse is what ends long wars, so anything that thins its fleet thins its manhunt. Beside all this, the Encyclopedia gains a **Glossary** tab — about forty entries grouped the way the vocabulary pass groups the ideas, with a filter — replacing eleven entries buried at the top of the Rules page, and it corrects the old claim that there are seventy-one islands. There are 63.
- **2026-09-17 v8.5** — **One word per idea.** A vocabulary pass at Sean's word, at the depth he picked: every label, filter, tab, tooltip and errand name uses the agreed word, and prose keeps its voice. A person of yours is **crew** and never an officer or personnel; talking a place round is a **parley** and never diplomacy; the person who is good at it is a **Negotiator** and never a diplomat; and the three things you can be looking at are the **World Map**, a **Reach Map** and a **Location**, each of which now says so above its own title — a player could not previously tell a Reach sheet from an island sheet, since both opened with a name in the same type. In a sentence a location is still an island, because in this world it is one. `src/data/terms.json` was already the vocabulary file and mostly what this found were the places that had gone round it. A test now reads every interface file, strips the comments and the interpolations, and fails on any of the retired words — it caught the tutorial's very first card saying *"ships, officers and islands of its own"* and the advisor's roster note reading *"Diplomacy 78 · ashore at Highwater"*, and a screenshot caught the last two: the Reach's map view counted *15 locations* while its list view counted *15 islands*, and the island panel a player actually sees was a third render path that never got the eyebrow the other two did. No rules changed.
- **2026-09-17 v8.4** — **The Crown gets a second Recruiter, and nobody spends their last officer cheaply.** A tuning run traced every stalled war to the same thing, and it was invisible in the win table: the Crown's corps collapses. In the wars that ran long it ended with **one officer at large against the Confederacy's thirteen**, and had no Recruiter free at every late sample point in every war — both of its Recruiters are exactly the people worth abducting, and a side that cannot recruit cannot replace the officers it needs to rescue the officer who would let it recruit. In one war the last free Pirate Lord stood on a single island, liftable, with a garrison of two, for **1,802 consecutive days**, and the Crown ran four hundred raids at her with one officer and never took her. So: **Admiral Blackwater is a Recruiter too**, making it two against four, which is the asymmetry the original had rather than a single point of failure; and both sides now price a quiet errand by how many hands they have left, so a side down to its last officers stops throwing them into harbors it cannot get out of. Measured over eighty wars: the stalemate rate halves, officer-days spent idle fall to **11%** from a third, and all ten errands are in use. Four other fixes were tried and cut for measuring worse, and they rhymed: *every symmetric improvement to how well the machine plays is worth more to the side with more to play with* — so the Crown's edge widens whenever both sides get better, and closing it needs something asymmetric.
- **2026-09-17 v8.3** — **Victory, defeat and a draw, and the three do not share a screen.** Every action, bombardment and landing now resolves into one of three outcomes rather than two, and a draw is a real third result rather than a defeat with softer wording: breaking off at sea is *drawn* — nobody was destroyed, nobody was driven off, and who owns that water is unresolved. A bombardment either silences the harbor, knocks stones about without silencing it, or achieves nothing at all, and the last of those is **failed** rather than lost. A landing thrown back with companies still in the boats is **inconclusive**; thrown back with nothing left aboard, it is **repulsed**. What each screen shows differs in shape and not only in colour: a **victory** reads down the ordinary layout; a **defeat** leads with the player's own losses and draws the loss as one large figure, with anybody taken off the map boxed out of the list rather than listed in it; a **draw** leads with *"no decisive control established"* above any tally at all, because a screen that opens with two columns of losses invites you to total them and award somebody the win. Every report ends the same way — who holds the objective, what it settled, and island by island what it moved politically, only where something actually moved. An island carried by storm says who holds it and, separately, that its people are hostile: **military capture is not political allegiance**. And the word at the top describes the fighting and nothing else, so a victory that cost more than it was worth says so, and so does a defeat that left the enemy wrecked.
- **2026-09-17 v8.2** — **News travels, and not all news travels equally far.** Three scopes, replacing a rule that was their opposite: a flat fifth of *every* allegiance change used to spill onto *every* island in the Reach, equally, always. **Local** is nearly everything now and means it — a parley, an incitement, a commander taking a chair and the daily drift all move one island and no other. **Regional** is raised at ten named moments, and only those: an unaligned island declaring, an empty harbor changing hands, an island rising, a landing (which reads as a *liberation* where the people already wanted you and a *conquest* where they did not, and costs you across the Reach in the second case), the walls coming down with the town untouched, an action won by a clear margin of guns, and a Pirate Lord taken or broken out. **Global** is one thing only: shot that goes past the walls looking for the garrison, which is a large loss on the island, a moderate one through the Reach and a very faint one everywhere a ship goes. Four things make sure no two islands ever feel the same shock — it **falls off** down the chain (Sean's own example: target +10, next door +3, then +2, +1, +0.5), it **varies** by up to forty per cent per island, each Reach has its own **political connectivity** rolled once at worldgen (0.45 to 1.45, so some chains are a family and some are nine strangers), and a **cascade damps hard** at every step and stops dead at the fourth, so one good meeting can start something and can never sweep a world. The player is never shown a figure: the feed says what happened and where it is being talked about, the chart ripples the Reach for two or three days, and the loyalty dots do the rest. **Measured, 24 wars both sides played:** the Crown's share of decided wars falls from 78% to **67%**, the best it has been; wars run about half as long again (median 489 → 732 days) and three in twenty-four now reach the cap, which is the price of allegiance no longer moving nine islands at a time. **One thing this found and did not fix:** across six six-hundred-day wars, *no island rose in mutiny at all*. A held island sits around 67 allegiance with three companies ashore, and the revolt chance reads zero on every island every day; agitators now get the same patience a courting diplomat gets, but the opponent rarely sends one. The end of the chain — espionage, sabotage, incitement, then diplomacy — is built, tested, and still out of reach in machine play.
- **2026-09-17 v8.1** — **Signing on stops being a manhunt, and four smaller answers.** A **Recruiter** of yours keeps an open table at any harbor you hold that is loyal enough, and officers the war has not claimed sign the articles there; **Leadership** settles it and the island's allegiance is the other half. No more sailing to wherever a particular stranger happens to be standing, and the chart's **To sign on** filter is gone with the manhunt it served. Only a Recruiter may lead one — the Crown has exactly one, the Regent; the Confederacy has four — and both sides always have at least one, because the draw guarantees it. Beside it: a **pause button** of its own next to the clock (pausing had been an undiscoverable 450ms hold since the clock was built); the **Gold Mine and Lumber Mill cost nothing** to raise, since a mine still needs a vein, a mill a forest, and the berth and the days are the real price; the **Heavy Fortress** is the first building in the game to wait on the research errand, at one grade of shipwright craft; the opening purse is **450 gold** rather than 150, measured so that every works you start the war holding can be given a real job on the first morning; and the companies aboard your ships now show on an island's Garrison tab, where a player about to storm the place is actually looking.
- **2026-09-17 v8.0** — **An island decides; it does not fill a bar.** The eighty-point line is gone, and with it the last certainty in the political layer. A parley no longer adds a fixed amount every fortnight and an unaligned island no longer runs its colours up the morning a number crosses a threshold. A fortnight ashore is now a roll: it lands or it does not, what it wins varies from a couple of points to eighteen, and a landed one asks the island whether it will declare — at a chance that climbs with how warm it is and never reaches certainty at any number, a hundred included. Four things decide every political roll: **who is in the boat** (the best hand whole, the second three quarters, the third a half, the fourth a quarter, so four envoys are worth two and a half and never a guarantee), **what the island already thinks**, **political security** — companies ashore and an officer in the chair, which buy quiet and never affection, so they are the whole of what stands against an incitement and appear nowhere in a parley — and **momentum**, what has lately been happening there, which builds with each success, is capped, and fades if nobody keeps it up. **Mutiny loses its trigger** too: thirty is a warning and not a line, and a revolt is a small daily chance weighed out of allegiance, agitators' work, companies and the officer holding the chair. A sullen island with the square full may never rise; the same island stripped to hold somewhere else will, within a month, and nobody can say which morning. **What the player is told** is deliberately not a percentage: a parley or an incitement reads *Very difficult* through *Very favorable*, with the terms behind it drawn as pluses and minuses — *Your envoy ++, What the island already thinks +, Recent standing here +++* — so the question is who to send and where, not what the arithmetic comes to. Measured over six wars with both sides played: **sabotage is used for the first time in the project's history** (0 errands → 35) and incitement stops being a curiosity (4 → 77), because pricing a political errand by how likely it is to come off stopped a flat preference for unaligned ground from vetoing everything else. Over forty wars the Confederacy now ends holding twice the ground it used to (3.6 islands → 7.7) and the Crown's share of decided wars falls from 90% to 85% — still lopsided, and still the open question.
- **2026-09-15 v7.9** — **The console reaches the glass.** The dead band under the tab bar, measured off a screenshot at last: 164 device pixels of perfectly flat page colour below the last row of console wood, which is 55 points of app not reaching the bottom rather than anything the tab bar was padding. The app's height is now the largest of every figure the browser gives for the glass rather than the most authoritative one, because too tall hides itself and too short shows. The page also wears the console's wood, so any sliver that survives on an unseen device reads as console rather than a void. No rules changed.
- **2026-09-15 v7.8** — **The harbor is a list; lists can be grouped and ordered.** Ships at an island are one row per class — how many, hull left, guns — with everything else behind a tap on the row (a new ship sheet: stats, blurb, a Lord's power, damage hull by hull). Two checkboxes over any list you own: **group alike** into a count, and **reorder**, which moves the game's own array so the order saves with the game and defaults to what has been there longest. Ships, crew, buildings and the garrison's kinds all move. *Weigh anchor* is **Set sail**. Loading companies is one stepper row rather than two buttons. Picking a mission target now drops every island to a small allegiance dot and pulses only the island the officer is standing on.
- **2026-09-15 v7.7** — **Monsters start small, then start moving.** A quarter of frontier islands hold one, not a third (5.6 a world). Nothing moves for two hundred days. After that each has a slow chance of waking: **rumours spread through its Sea** — public, and naming the Sea — and from then on it hunts, moving about that Sea weekly, going where ships lie at anchor, and **taking a fleet in open water** when it finds none. Hurt past half its hull it **breaks off and runs**, but only to water with no ships in it; when every island in the Sea has ships or another creature, it is **cornered and stands and fights**, which a player can bring about on purpose by spreading hulls through a Sea. Measured: 2.1 rumours a game, first wake day 200, median 260. War balance unchanged at 8–8 over sixteen games, median 493 days.
- **2026-09-15 v7.6** — **The clock slows to the original's pace.** At Sean's reference: a game day is **150 seconds at Very Slow, 75 at Slow, 30 at Medium, 15 at Fast**, about thirty-seven times slower than before. A war of a few hundred days is therefore a couple of hours at Fast and an evening or more below it — a thing left running and come back to, which is how Rebellion is played. Two consequences built with it: the clock now carries its progress through a pause instead of restarting the day whenever a panel opens (which at these lengths would have stopped the date moving at all for anyone who taps about), and the day badge wears a ring of how far through the day it is, since a date unchanged for two and a half minutes is indistinguishable from a frozen game. A paused clock restarts at Medium rather than Slow. No rules changed.
- **2026-09-15 v7.5** — **Harbor, and one log.** The British spelling goes at Sean's word: *harbor* throughout, matching the *Free Harbor* and the `free-harbor` archetype, which were always American. The island panel loses its Log tab and is four tabs — Harbor, Crew, Garrison, Buildings; the Log screen is the log.
- **2026-09-15 v7.4** — **A creature is a neutral hostile, not a caption.** At Sean's word the things in the water are something to fight: each carries **guns** and **hulls**, belongs to nobody, fires on every fleet lying in its harbor whoever it belongs to, and is fired on by all of them. It does not heal, so a second attempt carries on from where the first left off, and killing it clears the island's water for good. Measured: **The Kraken** (10 guns, 8 hulls) kills a lone sloop on day one every time and dies on day three to a squadron of the size either side opens the war with, costing it one or two hulls; the **Sea Dragon** (6/5) two days; **The Derelict** (4/3) one and nothing, which suits a ship every captain has written off rather than fought. The **Reef Turtle** and the **Ship's Cat** keep no guns and stay scenery. An action against a creature is logged whether or not a hull goes down — it can chew a squadron for a week without sinking anything. Freeport never draws a dangerous one: the Confederacy is moored in that harbor on day one. War balance unchanged at 8–8 over sixteen games with the AI in each seat, median 589 days.
- **2026-09-15 v7.3** — **A company is somebody.** §7's ground units are built: ten types in `src/data/troops.json`, each with **attack / hold / watch** and a figure of its own, and a garrison is now a roster of named companies rather than a count drawn as ten identical pikes. The watch column and the names are §7's; attack and hold are set against §7's own claims, so **Urskin Berserkers** are the hardest thing on a beach (50), **Reef Guard** the hardest to shift (45), **Reefwalkers** the best eyes in the world (35), and **Crown Marines** the best company either side can land on day one. Where a company turns up is decided by what sort it is: line and sailors everywhere (sailors only where a shipyard stands), the three **native** units on their own people's islands and nowhere else, and the two the Crown **makes** — Tidewrought and the Drowned Guard — behind research. *One divergence from §7:* the three native units are not research-gated. A Reef-folk island is defended by Reef-folk whether or not anyone has researched anything, and gating it made every Confederate island in the opening identical. The numbers are shown and not yet read — a landing is still settled on the count of companies. Art prompts in `docs/troops.md`.
- **2026-09-15 v7.2** — **Nothing lives in charted water.** The creature on an island stops being a line derived from its name on every island in the game and becomes something found. Only the three unexplored Reaches — Rime, Salt and Coral — hold anything, roughly one island in three of those whose waters could, which is three to fifteen in a world; it is written down at worldgen and never changes. It is invisible to a side until one of their hulls comes to anchor off the island or a boat rows an officer in: **charting an island does not reveal what is off it**, so a spy opening half a chain from the masthead learns nothing about any of it. Each creature gained a line for the day the boats find it. Freeport's own is known to the Confederacy from the start — they signed the articles standing on it. The Almanac's bestiary is now a log of what your own crews have seen, naming the islands they saw it at, and it opens empty. No other rules changed.
- **2026-09-15 v7.1** — **Each side has a shape.** Roster averages now say what each faction is: the **Crown commands** (leadership 78.9 against 68.1), the **Brethren talk and creep** (diplomacy 69.1 against 58.0, espionage 67.4 against 56.6), and **neither out-fights the other** (combat 66.9 against 67.7). These are averages and nothing else — Blackwater is the second-best spy in the world on the side that is worst at it, and Jessup and Hale out-lead most of the Admiralty. Measured consequences on day one: the Brethren's best parley lands 94% against the Crown's 84%, incite 71% against 63%, sabotage 68% against 58%; the Crown's best restores order at 95% against 90%.
- **2026-09-15 v7.0** — **A base per ability, and a swing per game.** Every character now carries one base figure per ability in `characters.json`, set by their lore and by what the game needs of them, instead of a min-max band. A game rolls each ability within a swing of its base: **twenty either way for a major character** — the fourteen named principals, marked `major: true` — and **ten for a minor one**, the unaligned. The roll is deliberately not capped at a hundred: a high base can come out at 101 or 112, and an officer having the game of their life is allowed to be better than anyone has a right to be. The floor is 1. Measured over 80 worlds: ratings run 12 to 112, majors span forty, minors twenty, and nobody lands further from their base than their swing allows.
- **2026-09-15 v6.9** — **A Lord is a ship when idle and a person on an errand.** Sean's rule: the three Lords can be sent on missions — recruitment, espionage, parley — and ashore they are ordinary officers who can be found out, hurt, or taken in irons. Their ship cannot sail without them and its power sleeps while they are away; a hull that strikes with nobody aboard is a prize and not a capture. Ratings retuned to the brief: **Hale** a master diplomat and recruiter, **Reyne** amazing at combat and espionage and a recruiter, **Jessup** amazing at combat, all three good leaders. **Land** also redistributed: the least an island can hold is four berths, not three, and every island a side opens the war holding has eight to twelve.
- **2026-09-15 v6.8** — **Freeport opens at a hundred.** The island the articles were signed on answers to the Confederacy the way Highwater answers to the Crown: a hundred to nothing, Confederate colours, a seat's two companies ashore. It had been left merely fond of them, which could not stand — anything over eighty runs a neutral island's colours up on the next tick, so a warm Freeport flipped on day one anyway and announced it in the log as though it were news. It still carries none of the opening's camps, mills or yards, and losing it still loses nothing.
- **2026-09-15 v6.7** — **Coral Reach goes dark.** The atoll was the one charted, settled, nobody's Reach, and nobody had a reason to sail to it. It is now the third frontier Reach — uncharted by both sides, a quarter of it settled behind the fog, and a third place the articles might have been signed, so Freeport can fall in Coral as readily as in Salt or Rime. Three of the bible's Coral islands join the chart with it: **The Shoals**, **Hawksbill Bay** and **Denby Cay**. Sixty-three islands. No other rules changed.
- **2026-09-15 v6.6** — **Freeport.** The island where the articles were signed now has a name and a place on the chart: one uncharted island in Salt or Rime Reach is renamed Freeport each game and keeps the painting's position, outline and room (`chartName` holds what the painting calls it). It is nobody's. The opening also spreads out — the Regent alone at Highwater and the Admiralty about the Crown's holdings; the three Lords aboard their ships at Freeport with one or two Confederates ashore beside them and the rest on the islands that have declared. A Lord is now the only Confederate aboard anything on day one. Room is drawn against one thirteen-berth track everywhere, so a bar's length is an island's room rather than how full it is, and **Available land** joins the chart filters.
- **2026-09-19 v9.21** — **The last Star Wars names come off the chart.** Thirty-one islands renamed, audited against this file's own section 13 tables, which name the original planet beside every island: the five Sean flagged (Obroa Scala, Caridad, Raltiera, Bimisario, Bakuran Flats) plus twenty-six more, among them the whole of Whalers' Reach, which was the Corellian system almost intact — Duroso←Duros, Dralla←Drall, Selona←Selonia, Talusa←Talus, Tralosa←Tralus. The new names are English and Anglo-nautical, matched to each island's role and Reach. **The great island of Sovereign Reach is now the Aldermain**, and Highwater is the walled capital city standing on it. An island's terrain seed is written down in `reaches.json` rather than computed from its name, so the rename moved names and nothing else — verified island-for-island against the pre-rename world across five seeds.
- **2026-09-15 v6.5** — Companies take a **twentieth** off the smugglers apiece, not a tenth: a hand on disloyalty rather than a cure. A leaking island now gives away what stands on it, how many hold it, and any island of yours in the same chain the enemy had not charted.
- **2026-09-15 v6.4** — **One pool of room.** Ground and Water are withdrawn as separate slot types, for the reason Sweetwater was withdrawn before them: two numbers per island to answer one question. An island has room to build, every building takes one berth of it whatever the building is, and companies and hulls take none. Saves bump to v4.
- **2026-09-15 v6.3** — **Garrisons answer to allegiance.** What an island asks for is set by its band — none when firm, one steady, four thin, six in revolt — and six companies ashore will face down a revolt whatever the island thinks. Every company also takes a tenth off the smugglers' share, so ten shut the back door. Both advisors will now explain allegiance and garrisons on request, and name the islands it is costing.
- **2026-09-15 v6.2** — **Allegiance is a balance.** Every inhabited island's loyalty to the two factions adds up to a hundred; there is no undecided share. A point one side wins is a point the other loses, so a parley no longer takes a separate bite out of the enemy and an incitement hands the inciter everything it strips from the governor. An unaligned island comes over at a flat eighty — a supermajority — rather than sixty with a lead.
- **2026-09-14 v6.1** — **Loyalty is worth money.** Allegiance now reads in three bands — firm at 90, steady at 60, thin below — and the chart draws them as one dot at three sizes (the star stays exclusive to Highwater and the Lords' ships). Each band sets the share of an island's trade that smugglers run to the other faction: nothing, a seventh, a quarter, and half in a revolt, where the holder gets nothing at all. It is a transfer, so a sour Reach of yours pays for their fleet. A thin island also leaks word of itself onto the enemy's charts. A governed island now settles at 65 rather than 55, so steady is the resting state.
- **2026-09-14 v6.0** — **No base. Three Pirate Lords.** Sean's call: the Confederacy has no seat at all. It has three Lords — Hale, Reyne, Jessup — each bound to a ship with a power of its own (§2 Faction B, §6B). They start together at a random uncharted Outer island where the Confederacy was formed; the Crown hears only that a meeting took place and that islands are declaring. One way to win each: the Confederacy takes Highwater; the Crown takes all three Lords, which means finding and taking their ships. The 60% attrition rule is gone. The star on the chart now marks exactly two things — Highwater and wherever a Lord's ship lies — and nothing else.
- **2026-09-14 v5.9** — Sixty islands, not a hundred. The chart's sixty best sites — the biggest landmasses' harbors and the clearest islands, ranked by the painting itself, with no quota per chain — and the names that carry a note or a character keep their places. Sovereign 15, Whalers' 9, Wreckers' 8, Rime 6 (three on the chain, three bergs), Cinder 8, Salt 9, Coral 5. Everything dropped goes back on the shelf for the larger maps.
- **2026-09-14 v5.9** — **The Free Harbor is a ship.** The Confederacy's seat is Corwin Calloway's old three-decker, not an anchorage: the Moot sits on her quarterdeck, captives are held in her cells, and officers come home to whichever island she is lying off. She sails like any fleet; the opponent keeps her out of sight and runs when the Crown charts her island; the Crown takes the Confederacy's seat by sinking her. §2 Faction B carries the lore of the ship and the captain, §6B lists her, open question 6 is settled.
- **2026-09-14 v5.8** — Reach names follow the chart. **Rime Reach** is the dark northern chain plus four bergs of the pack ice (Rime Island, Frostwick, Rishi Bank, Varrow); the Far Sea has one Reach. The long chain down the west is **Whalers' Reach**; the name Shipwrights' Reach is retired. Seven Reaches, still 100 islands: Pantlow and Forliss (Grey) join Whalers', Delaira (Lantern) joins Coral, Galpos (Rice) joins Salt, Ambrey (Last) joins Cinder. The frontier is Rime and Salt; the Confederacy's base is in one of the two.
- **2026-09-14 v5.7** — The small map goes to 100 islands. Twenty-nine promoted from the Reaches held back for larger maps, each into the surviving Reach of its Sea: Lantern's civic islands (Kingsward, Minterne, Cartmel, Chepstow, Marlbury) into Sovereign Reach and its fisherfolk (Andoro, Berquessa, Marista) into Coral; Grey Reach's timber islands (Belfrey, Capperil, Kempsley, Ketterly, Ombwick) into Shipwrights'; Still Reach's Anchorite Rock, Douglass Rock and Crondre into Wreckers'; Last Reach's Thanta Isle, Tundvik and Kirdholm into Cinder; Rice Reach's The Terraces, Catshead, Heff Island and Tio Isle into Salt; Sugar's Ferrol Key and Rishi Bank into Rime; Whalers' own Linnur, Kristak and Vustri plus Sugar's Bilbrin into Whalers'. Their notes travel with them. On the chart a big island's mark is its port on the coast and a small island is the island; the great island of Sovereign Reach carries Highwater, Gorley and Ballmoor on its shore.
- **2026-09-13 v5.6** — Marlow's dead: husband and both sons, all captains, all lost in the Crown's service — the Narrows, the Black Tide, the Wreckers' coast — and her faith unshaken. Her accent locked: English RP, Judi Dench's M.
- **2026-09-13 v5.5** — Marlow is a **Secretary**, not an admiral: First Secretary of the Admiralty, the permanent official who has never been to sea, widow of one captain and mother of two more, the only person permitted to lecture the Imperator. Look and history revised in §16.1.
- **2026-09-13 v5.4** — The Crown's advisor is **Sabine Marlow**, the Imperator's M: sarcastic, exact, entirely the Imperium's. Secretary Crane retires to a possible silent cameo. The player is the **Imperator** (Crown) and the **Captain-General of the Free** (Confederacy); §16.5. Marlow's look in §16.1, her voice in §16.4.
- **2026-09-13 v5.3** — §16.4: how each advisor sounds — timbre, pace, tone, diction, tics, what each never does, how the three moods change the voice, and the TTS direction for the audition. Anchored on the lines the Narrator sheet already says.
- **2026-09-13 v5.2** — Section 16 added for the advisors' portraits and voices: slots for the two visual paragraphs, the three-word art direction and the locked ElevenLabs settings, which `scripts/render_voicelines.py` reads. The plan itself is `docs/narrator-build.md`. Moods locked to neutral / grave / encouraged in `src/ui/narrator/mood.ts`.
- **2026-09-08 v1.0** — First conversion packet: factions, 60 characters, ships, troops, special forces, facilities, missions, key islands.
- **2026-09-08 v1.1** — Added Sea → Reach → Island structure and all 200 islands with map-size tags.
- **2026-09-08 v2.0** — Fantasy tone pass: the Black Tide, visible Tidecraft, peoples, grown ships, Leviathan as a dredged carcass, weird Outer Seas.
- **2026-09-08 v2.1** — Reframed as living world bible for Claude Code. Added Section 14: Mythic Isles and Double Agents. Section 12 open questions still open.
- **2026-09-11 v4.8** — **Espionage clears the fog, and ships become how you find things.** The last dead rating is wired. Sixty of the hundred islands start dark and an island you have not charted cannot be parleyed with, so the map was closed to you unless the war happened to open it. A spy serving with a fleet now charts the water around a landfall: one further island of that chain per 25 points of Espionage, nearest first, so a rating of 100 opens four beyond the one you actually anchored at. It never reaches outside the chain the fleet is in, and never re-charts what is already known. That makes a fleet the way you *discover* as well as the way you take — build a ship, put a spy aboard, sail into the dark, and come back with parley targets. The opponent signs its most useful crew member on to each fleet for the same reason, or all three ratings would have been the player's alone; over a war it charts half the map. The fleet card states all three: Charts, Command and Companies. Balance unchanged at 674 days mean.
- **2026-09-11 v4.7** — **The ratings do something.** Until now Espionage, Combat and Leadership were rolled for every character, drawn with bars and numbers on every sheet, and read by nothing at all: only Diplomacy affected the game. Crew can now be **signed on to a fleet**, which is what section 10's command ranks are for and what the fleet was always shaped to hold. The best **Leadership** aboard makes the fleet's guns tell harder in an action; the best **Combat** aboard carries a landing that would otherwise be a coin toss. A rating of 100 is worth a quarter again — enough to tip a close fight, not to win one against the odds. Officers travel with the ship, come ashore where she lies if she is sunk rather than drowning quietly, and cannot be signed on while away at a parley. **Espionage is still read by nothing**, and will be until the phase-3 missions it belongs to exist; the build spec now says so rather than leaving it to be discovered. Balance unchanged at 674 days mean.
- **2026-09-11 v4.6** — **Dispatches.** The war is told rather than logged. Anything notable — an island changing hands, a rising, an action at sea, the war beginning or ending — stops the game with a card: a headline, a painting and one plain sentence, with arrows to page through the rest of the day, exactly as the original does it. The paintings are drawn in code like everything else: a flag going up over a cheering crowd, the same crowd with torches and nobody in charge, two ships close enough to hurt each other, a hull going down by the head, a boat pulling for a lit quay. Each is lit from the horizon in the colour of the side the news concerns, so a card reads as good or bad before a word of it is read. The log is still the log and still the place to look something up — but every line in it now opens its card, because being *notable* decides only whether the game stops you unasked, not whether a thing is worth a picture. A resumed game shows no cards for news that is a hundred days old.
- **2026-09-11 v4.5** — **The opponent can actually build a navy now, and boards scroll.** A review of the whole simulation turned up a defect in what v4.0 shipped: the opponent's build order queued nothing but mines and refineries, so it never raised a Slipway, never put a hull in the water, and never drilled a company past the eight it started with. Measured over a 700-day war it finished with zero ships — every naval rule it had been given was unreachable, and the war was one-sided in a way nothing on screen admitted. Its build order now has a priority: companies first, wherever a drilling island is below what holds it quiet plus a small pool; then the buildings it lacks entirely, a second drill ground and a Slipway; then the economy as before. It ends a war with one or two Slipways, four to seven hulls and thirteen companies. The war still runs 614–727 days, mean 674. Crew, Garrison and Buildings boards now show three rows and scroll past that, saying how many there are in all. A **shut harbor** leads the idle-producer strip in red, because a blockade costing you a day's takings deserves to be on screen and not only inside a panel.
- **2026-09-11 v4.4** — **The chart is painted by loyalty.** Out at chart scale an island takes the colour of the side most of its people lean toward, not of whoever is flying a flag over it — so you can watch sympathy move before an island changes hands. The chain's tally of islands held is gone from its label: the islands say it themselves. The averaged bar under each chain, cut in v4.3, is back, and the per-island bars inside the opened chain are gone instead — one bar under a whole chain reads; ten small ones under ten islands were a row of smears, and the island's own colour already carries it. Inside a chain the island's **body** is its loyalty and its **name** is who holds it, so an island the Crown holds whose people have gone over reads as a red island with a green name. An **idle-producer strip** sits on the chart at all times, after the original's "Idle Construction Yards" nag: how many Works, Drill Grounds and Slipways of yours are standing with no order on them, each one a tap to the island it is on. A yard building nothing is gold you are not spending. The advisor is half again as large.
- **2026-09-11 v4.3** — **Slotted boards, and loyalty by size.** Crew, Garrison and Buildings are framed boards that fill with icons rather than lists that collapse to one line when empty, after the original's personnel and regiment windows. Where an empty slot means something real it is drawn: Buildings shows one slot per slot the island *has*, so what is built and what is still free read as the same picture, and Garrison draws the shortfall against what the island needs. Crew has no cap, so its board is simply the size it is. The **averaged loyalty of a chain and of a Sea is cut** — a mean across ten islands describes none of them, and every island carries its own. And the allegiance bar's rule is simpler: **largest share first, left to right**, with the undecided remainder sorted in among them. Who holds the island no longer leads the bar; the same two numbers now always draw the same way. One bug fixed on the way, caught by its own test: the two support figures are independent 0–100 numbers and nothing stops both being high, so a bar could run past its end. Over 100 it now shows the balance between the sides, scaled to fit.
- **2026-09-11 v4.1** — **No fighters, ever.** Small craft are cut from the design rather than deferred: a fighter is just a small ship, so the fleet is a range of *sizes* and each size is genuinely good and genuinely bad at something. Four classes a side now — **Sovereign**/**Reef-class** (large: most guns, toughest, slowest, dearest), **Razorback**/**Tempest** (medium: the compromise), **Kestrel**/**Swift** (small: fastest on the water, cheapest, first to sink), **Fluyt**/**Brig** (transport: no guns at all, carries more than a first-rate). Passage time is the trade-off that makes a sloop worth keeping: a fleet sails at the pace of its slowest hull, so a squadron of sloops crosses a chain in two days where one ship of the line drags the same squadron to four. Section 6's small-craft tables are now flavour only and describe nothing the game builds.
- **2026-09-11 v4.2** — **Faction colours and one rule for the allegiance bar.** The Crown Imperium is **green**, the Free Confederacy **red**, and **light blue** is nobody — the share of a population that has not chosen a side. The bar is now one bar rather than two: **the faction holding the island fills from the left**, the other side follows it, and the undecided remainder finishes it in blue. Where nobody holds the island the larger share leads. One helper draws it everywhere — chart, chain chart, island rows, island panel, chain and sea panels — so the six places cannot drift apart, and it is unit-tested. (Note for the record: the original uses green for the Alliance and red for the Empire, the opposite way round. This is deliberate here.)
- **2026-09-11 v4.0** — **Fleets.** Phase 2 of the build spec, and the first thing beyond phase 1. Three hull classes a side from section 6 need no research and can be laid down at a Slipway: **Sovereign**/**Tempest** (first-rates, the guns), **Kestrel**/**Swift** (sloop and schooner, cheap and quick), **Fluyt**/**Brig** (transports, unarmed, carry companies). Their numbers are keyed by role rather than by class, so the two fleets are balanced identically and differ only in name and character — giving one side better ships is a tuning decision to take deliberately later, not a side effect of adding them. A fleet is a container, as in the original: hulls, the companies aboard them, and one status in plain words. Hulls cost gold a day to keep, and so do the companies aboard them, wherever they are. **Sailing** between islands takes the same time a crew member's passage does — three days within a chain, ten across. **Battle** happens wherever two sides lie in the same harbor: one day's exchange of fire per day rather than one fight to the death, so a fleet can still withdraw, and every roll comes from the state's own seed. Companies drown with the transport that carried them. **Blockade**: enemy guns lying off an island you hold stop anything leaving the harbor, so it earns you nothing and still costs its upkeep. **Assault**: companies put ashore against a garrison, numbers deciding it, and an island carried by storm is held but sullen rather than loyal. The opponent does all of this too, under exactly the same checks — it has no private rules. Measured over eight seeds the war still runs 587–727 days, mean 686, against the 670–730 it has always run.
- **2026-09-09 v3.3** — One panel per island, and the counts stop being buttons. The original hangs four clickable icons off a planet — ships in orbit, military, civilian, missions — and those are now folded into the fewest tabs that keep like with like: **Harbor** (what is moored, and the fixed defences, because a fort is a warship that cannot weigh anchor), **Crew**, **Garrison**, **Buildings** (every kind, earners and yards alike) and **Log**. An island opens on its Harbor. The three counts on an island — Crew, Ashore, Built — are indicators only: the whole island is one tap and everything they pointed at is a tab inside. Islands you cannot parley with dim while you are choosing a destination, the way chains already did, so you no longer find out by tapping and being refused.
- **2026-09-09 v3.2** — Tapping an island chain now opens it as **a chart of that chain**, not a list of rows — the original's sector view. The islands are drawn where they lie, each carrying the marks that say what is happening on it: its coastline and name coloured by who holds it, a mark and a count for buildings that **earn gold** (Camps, Mills) and separately for **works and yards** (Works, Drill Grounds, Slipways), a mark for companies ashore, a mark for your crew standing on it, the allegiance bar, and one pip per slot showing reserves used against reserves free. Unsettled rocks carry none of it, so the eye goes to the islands that matter. The marks are indicators rather than buttons: the original hangs three clickable icons off every planet, which needs a mouse — three 44px targets across ten islands does not fit a phone — so the whole island is one target and opens its panel, where the same three are tabs. The chain keeps the shape the simulation scattered it in, relaxed only enough that no two islands crowd each other's labels.
- **2026-09-09 v3.1** — The chart no longer zooms or pans, superseding v2.9. Three levels of zoom was fiddly and was rejected on sight; there is now one view and one thing to tap. The whole archipelago is on screen at once as ten **island chains**, and tapping a chain opens it as a panel listing its islands — about 78px across on a phone, against the four pixels a single island would be. Islands are drawn on the chart but not tapped: there they are the picture of the chain, and they become targets in the panel. Sending a crew member follows the same path — the chains offering a destination light up and the island is chosen inside one. The chart is also laid out for a phone held upright rather than in the square box the simulation scatters its chains in, and chains of the same Sea are placed side by side; this is allowed because the coordinates are decoration, since travel time depends on whether two islands share a chain and never on how far apart they are drawn. Sea names are off the chart, where they landed on the chain labels, and a Sea now opens from its name on the chain's panel. Capacity pips moved with the same logic: off the chart, onto the island rows, beneath the allegiance bar, where the original prints the same two things under every planet.
- **2026-09-09 v3.0** — Reference shots of the original are now checked into `reference/rebellion/` with a written reading of each, because they settle questions the spec is silent on. Two changes follow from them. The advisor no longer waits behind a button on the chart: Secretary Crane and Mr Pennywhistle are drawn as standing figures and stand at the end of the tab bar on every screen, which is where the original keeps its droid — on the console at the foot of the frame. And every island now shows its **capacity** as well as its allegiance: one pip per slot beneath the allegiance bar, pale stone where something is built, a dark socket where nothing is, drawn only once the chart is zoomed in. The original shows the same three things under every planet, and "resources and loyalty below each sector" meant both.
- **2026-09-09 v2.9** — The chart now works at three levels rather than two. Zoomed out, islands are too small to aim at, so they stop taking taps and the chart becomes a chart of Seas: the seven names on open water, each opening a panel of all its islands grouped by Reach. Zoomed in, islands and Reaches take taps as before. No boundaries are drawn between Seas because a tap goes to the nearest one and a ring would imply a border that does not exist.
- **2026-09-09 v2.8** — Sound, all synthesised in the browser so nothing is downloaded. Events have their own short sounds keyed to a new `kind` field on every event. The ambient bed is generated and never repeats. Off by default, behind a speaker in the top bar. Per-Sea tuning was built and then withdrawn the same day: retuning as the player panned made the music lurch every few seconds, because a player moves around the chart and opens panels constantly. There is one steady bed, which only darkens while islands are in revolt.
- **2026-09-09 v2.7** — The narrators from section 1 are now in the game. Secretary Crane and Mr Pennywhistle sit on the chart and answer five questions from the live state — where you can build, who is free, where the trouble is, who might come over, how the war goes — each with a tappable list. Each speaks in their own register. Added an Almanac covering every building, company, crew member and term, generated from the simulation's own constants.
- **2026-09-09 v2.6** — Vocabulary and economy, after playtesting. Stores and Fittings are withdrawn: they were invented words that told a player nothing. There is now one currency, **Gold**, on the rule that a building either earns gold or costs gold — Camps and Mills earn, Works, Drill Grounds, Slipways and companies cost. Sweetwater is withdrawn from the UI in favour of **Ground** and **Water** for the two slot types, for the same reason. Character ratings are spelled out rather than abbreviated. See amendment A1 in the build spec for the rules.
- **2026-09-09 v2.5** — Added the Reach panel, after the original's sector view: a Reach's islands listed with three icons each (missions, military, facilities), over a summary of what the Reach earns and the mean allegiance across its settled islands. The island panel's tabs were re-cut to match those three — Overview / Missions / Military / Facilities / Log — so an icon on the Reach panel opens the island straight onto the matching tab.
- **2026-09-09 v2.4** — Unit art. Every building type has its own glyph (Camp a cut hillside and pick, Mill a waterwheel, Works a shear-legs crane, Drill Ground a rack of pikes, Slipway a hull on the stocks), shown on the Build tab, on the build buttons and as marks on the island portrait. Garrisons are drawn as companies of pike figures, with the shortfall to the needed garrison greyed in. Characters have cameo portraits cut from their own names — hat, beard, epaulettes and collar vary, and Urskin are visibly not human. `Character.people` is now carried through from the roster so the portrait can read it.
- **2026-09-13 v5.1** — **Names follow latitude; eight Reaches, still seven Seas.** The top of the chart is north, and Coral Reach had been sitting at the same latitude as Rime. So the names moved to the clusters they describe: the dark forested diagonal in the north-east is **Whalers' Reach** (Far Sea — the name cut at v5.0 comes back, seven islands), the long chain down the right edge is **Wreckers' Reach** (Bone Sea, now an Inner Reach beside the Crown), and the spiral atoll in the south-east is **Coral Reach** (Amber Sea, nine islands, Hawksbill Bay and Denby Cay restored) — because an atoll ring is a reef and that is where Coralhome belongs. Sugar Reach, which stood in for the empty chain for one deploy, returns to the medium map. Seventy-one islands; three Inner Reaches, five Outer. No rules changed.
- **2026-09-12 v5.0** — **Seven Reaches, one for each Sea.** The small map was ten Reaches of ten islands; it is now seven of seven to twelve, sixty-two in all. The reason is the chart: it is a painting now, and three of the ten sat on clusters it could not show clearly — Whalers' on islets too small to hit, Sugar and Mirage running together with their neighbours down the right-hand side. All three shared a Sea with a Reach that survives, so every Sea keeps its place, its character and its islands in the fiction; what moved to the medium map is a second archipelago inside three Seas, beside Scrap Reach which was already held back. Island counts are no longer uniform: a Reach holds as many islands as its painted cluster can show as separate places at a 48-unit spacing, which is what lets the chain view lay every island out clearly instead of stacking them. A Sea and a Reach are the same thing at this size, so the chart names the Seas and the panels name the Reaches and neither is lying. Settles open question 5 — three Inner and four Outer, as written. No rules changed.
- **2026-09-12 v4.9** — Tone retuned to the faction style guide. The register is now heroic adventure rather than grimdark: both sides believe themselves the decent one and neither is written as the villain. Added each faction's creed and motto (Order · Stability · A brighter tomorrow / Freedom · Opportunity · No masters) and put the creed on the title screen's faction cards. Softened the ugly halves throughout — conscription rolls rather than press gangs emptying villages, opportunists rather than slavers, the Fatmouths as harbor-kings rather than slaver-kings, Corvane's ledger as tragic conviction rather than cruelty. The rule that every named character carries one admirable and one ugly trait is unchanged; it says the same thing the guide's "different crews, the same horizon" does. **The darkness moved rather than left** — it is now the Black Tide, the kraken and the drowned places, not the people. No rules changed.
- **2026-09-08 v2.3** — Presentation pass. Added a title screen (faction choice with crests, strengths and weaknesses drawn from section 2; difficulty shown but only Normal exists). Replaced the space-era chrome with an admiralty-chart look: deep-water palette, brass accents, chart lettering, rhumb lines and a compass rose. Islands are now drawn as generated coastlines rather than dots, sized by their slots, and each island's bible note appears on its panel. The island panel gained Overview / Build / Garrison / Log tabs. Faction crests and the app icon are SVG drawn in code. No rules changed.
- **2026-09-08 v2.2** — Applied to the phase 1 build. Sections 1, 2, 5 (majors only), 9, 10, 11 and 13 are now live in `src/data/`: factions, the seven majors a side with rating bands, the ten small-map Reaches and their 100 islands, facility names and the UI vocabulary. Sections 6, 7, 8 and the minor characters wait on the phases that add ships, ground forces and recruitment. Section 14 deliberately not built. Added open questions 5–7 for the three decisions this conversion forced.
