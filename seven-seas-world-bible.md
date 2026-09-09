# MASTER OF THE SEVEN SEAS — WORLD BIBLE
## v2.1 — Living reference for Claude Code

> **Instruction to Claude Code:** This file is the source of truth for names, lore, factions, and the map. Keep it on hand and reference it whenever you touch anything player-facing. When a name, mechanic, or lore fact changes during development, **update this file in the same commit** and add a line to the Changelog at the bottom. Sections 0–13 are the one-for-one conversion of the original game; Section 14 is new mechanics that go *beyond* the original and are scheduled for later phases.

**Tone:** Fantasy pirates. Sea-magic is real and visible. The water is not always water. Ships are grown as often as built. Crews are not all human. Nothing is clean: the Imperium is order bought with cruelty, the Confederacy is freedom paid for in plunder, and something old in the sea is hungrier than either.

**Purpose:** A one-for-one swap table so the existing Rebellion game logic (stats, research order, mission types, facility behavior) stays intact and only names, lore, and flavor change. Every original entity has exactly one replacement. Original mechanics are paraphrased from memory of the game, not from the manual text.

**Status:** v2.1 — first full draft. Names are placeholders and will change; IP screening is a later step. Expect this file to grow.

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
| Sector | **Reach** (~10 islands inside a Sea) | Same grouping as sectors. Seven Seas fixed; *number of Reaches per Sea* scales with map size (10 / 15 / 20 Reaches → ~100 / 150 / 200 islands). |
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
| Popular support | **Allegiance** | Same |
| Raw materials | **Stores** (timber, iron, hemp, tar, reef-coral) | Mines produce |
| Refined materials | **Fittings** | Refineries produce |
| Maintenance capacity | **Upkeep** (crew & victuals) | Same |
| Energy | **Sweetwater** (fresh water that hasn't been soured) | Every facility needs one unit |
| Natural disaster (resources destroyed) | **Black Tide landfall** | Same event. ⚙ Later: show the black stain on the map. |
| New resources appear | **The Tide recedes** — ambergris and living coral left behind | Same event |
| Advisor droid (C-3PO / IMP-22) | **Mr. Pennywhistle**, a one-eyed talking sea-parrot the Confederacy can't get rid of / **Secretary Crane**, the Regent's grey, unblinking private secretary who may not be alive | UI narrator |

---

## 2. THE FACTIONS

### Faction A — THE CROWN IMPERIUM (original Empire slot)
*The Sovereign Admiralty of the Crown Imperium.* Ruled from **Highwater**, a fortress-island whose seawalls are three hundred feet high and carved with the names of every island the Tide has taken. Governed by a Lord Regent in the name of a boy-king nobody has seen in eleven years.

**What they say about themselves:** Before the Imperium, every Reach was its own corsair kingdom and the Tide ate a village a month. The Admiralty built the walls, charted the reefs, licensed the Tidemasters, standardized the coin, and hanged the wreckers. The islands are still here because of the Crown.

**What their enemies say:** The walls keep people in as well as the Tide out. Press gangs empty fishing villages to crew the line ships. Tidecraft "licensing" means any child born with the gift is taken to Highwater and returned — if at all — as something colder. And the Leviathan is not a wall. It is a mouth.

**Truth:** Both. Individual officers range from decent to monstrous, and the decent ones know it.

**Aesthetic:** black iron, grey stone, white sailcloth, brass. Ships are built, then *grown over* with cultivated coral for warding. Names are virtues and titles. Everything is straight lines until you look closely.

**Strengths (mirror original):** better ships early, more skilled admirals/generals (leadership bonus when the Regent is at Highwater), can assassinate. **Weaknesses:** fixed capital, fewer diplomats and recruiters, weak early small craft.

### Faction B — THE FREE CONFEDERACY (original Rebel slot)
*The Free Confederacy of the Seven Seas* — "the Brethren" to friends, "the Confederacy of Thieves" to the Admiralty. A compact of pirate captains, smugglers, exiled nobles, Reef-folk clans, Urskin whaling fleets, and witch-islands that answer to nobody. Governed by an elected **Commodore** and a shouting-match council called the **Moot**. Headquartered at **the Free Harbor**, a hidden anchorage that moves when found.

**What they say about themselves:** No press gangs. No licenses. Every captain elected, every share counted on deck, every Tidecaller free to be what the sea made them. The Imperium calls it piracy when a village keeps its own fish.

**What their enemies say:** "Free" is armed robbery with a flag. Half the Moot are honest exiles; the other half are wreckers, slavers, and Black-Tide-cultists who joined because the Crown was hanging them. Their elections are whoever has the most cutlasses that morning.

**Truth:** Both. Hale spends as much of her time managing her own worst captains as fighting the Crown.

**Aesthetic:** patched, painted, mismatched. Coral-grown hulls, whalebone masts, sails dyed with squid ink. Tamed sea-beasts in the small-craft squadrons. Names are jokes, threats, and dead lovers.

**Strengths (mirror original):** movable HQ, more diplomats and recruiters, better small craft all game. **Weaknesses:** outgunned early; cannot assassinate (the Moot forbids it — the Imperium finds this hilarious).

**Design rule for ambiguity:** every named character on both sides gets one admirable trait and one ugly one. No faction owns either.

---

## 3. PEOPLES (replaces alien species)

| Original species | New people | Where | Look / notes |
|---|---|---|---|
| Human | **Human** | Everywhere | Default |
| Mon Calamari | **Reef-folk** | Coralhome (Amber Sea) | Amphibious. Gill-slits at the throat, luminous eyes, skin that shifts color with mood. Grow their ships from living coral over years. The Confederacy's best admirals. Once enslaved as Imperium oarsmen. |
| Sullustan | **Shoal-folk** | The Shoals (Amber Sea) | Small, webbed, night-eyed, chattering. Can hear a ship's hull creak a mile off. Best watchers in the world; cheap to arm because they arm themselves. |
| Wookiee | **Urskin** | Northreach (Far Sea) | Huge, shaggy, tusked sea-bear folk. Harpooners and whalers. Loyal to death, slow to anger, terrifying past it. Torvik is Urskin. |
| Bothan | **The Rumor Guild** (human) | Bothaway (Amber Sea) | A guild, not a people. Ink-stained, sharp, sells to both sides. |
| Noghri | **The Hushed** | The Drowned Reach (Bone Sea) | Pale, eel-thin, silent folk from half-drowned islands. Bound to the Crown by an old bargain. Nobody hears them coming. |
| Hutt | **The Fatmouths** | Fatmouth & Blackreef | Bloated slaver-kings. Nobody has seen Jubal's legs; there is a rumor he doesn't have any. |
| Droids (advisors, probes, espionage droids) | **Tidewrought** | Imperium yards | Brass-and-coral automata built by Lemmick, animated by a bound sliver of the Deep. Walk the seabed. See poorly. Never tire. |
| Dresselian (Orrimaarko) | **Bog-folk** | Sea of Storms swamps | Wrinkled, patient, amphibious guerrillas |
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
| 1 | Emperor Palpatine | **Lord Regent Halvard Corvane**, "the Old Tide" | Human | DEEP (Tidemaster), LEADER, RECRUITER, capital-bound | Has not left the citadel of Highwater in eleven years. Can still the whole harbor by standing at a window. Believes — with real evidence — that he is the only thing between the islands and the Black Tide. *Admirable:* ended the Corsair Wars; his walls have saved more lives than anyone's. *Ugly:* keeps a ledger of every hanging and every child taken for licensing, and has never once thought the number was too high. |
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
| 23 | Orlok | **Colonel Orlock** | Human | LEADER (general) | Garrison colonel. Hangs deserters, feeds his men well. |
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
| 24 | Orrimaarko | **Orrin Marsh** | Bog-folk | SPEC OPS | Fought the Imperium from the swamps of his home island for a decade. |
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

**Confederacy small craft (all warded and deepwater-capable, mirroring "all Rebel fighters have shields and hyperdrive"):**

| Original | New | Notes |
|---|---|---|
| X-wing | **Sabre** armed cutter | All-rounder; build these forever |
| Y-wing | **Mule** bomb-launch | Slow bombardment craft |
| A-wing | **Ray-riders** | Reef-folk riding tamed giant rays; fastest thing on the water; anti-small-craft |
| B-wing | **Hammer** heavy mortar-launch | Late heavy bombardment craft |

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
| Construction Yard | **Works** | Builds facilities and shore defenses |
| Advanced Construction Yard | **Master Works** | 2× speed |
| Orbital Shipyard | **Slipway** | Builds ships and small craft |
| Advanced Shipyard | **Dry Dock** (Imperium) / **Coral Bed** (Confederacy) | 2× speed; same stats, different art |
| Training Facility | **Drill Ground** | Troops and special forces |
| Advanced Training Facility | **Marine Barracks** (Imperium) / **War-Lodge** (Confederacy) | 2× speed |
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
5. **Reach count on the small map.** The bible's small map is 3 Inner + 7 Outer; the phase 1 simulation generates 4 core + 6 rim. The build kept the simulation's shape and promoted **Sugar Reach** to Inner, holding **Scrap Reach** back for the larger maps. This happens to put all seven Seas on the small map. Change the generator to 3 + 7, or leave it?
6. **Tallow Cay as the Confederacy's known start.** Phase 1 spawns the Free Harbor on a *random* Outer island, so no island can honestly be labelled the start. The island notes for Tallow Cay and Rime Island were written neutrally rather than promising something the game does not do. Fix by making the spawn fixed, or leave the hidden-harbour hunt to phase 3?
7. **Section 14 data-model hooks.** No hidden `loyalty` field has been added to characters yet — an unused field that nothing reads or writes is dead weight until 14.2 is built. Neutral-owned islands with garrisons already exist, so 14.1 needs no groundwork.

---

## 13. THE MAP — SEAS, REACHES, AND ALL 200 ISLANDS

**Structure:** Sea (region/archipelago, 7 fixed) → Reach (= original sector, ~10 islands) → Island (= original system). Each island keeps its original planet's slot stats (fresh-water/energy, Stores capacity, facility slots, starting owner, starting loyalty, starting facilities). Only the name changes.

**Map sizes** (mirrors original 10 / 15 / 20 sectors): `small` Reaches appear on every map; `medium` are added on the medium map; `large` on the large map. Inner Seas always hold the core Reaches; Outer Seas hold the rim Reaches and the possible Free Harbor spawn.

| Map | Inner (core) Reaches | Outer (rim) Reaches |
|---|---|---|
| Small (10) | Sovereign, Shipwrights', Coral | Rime, Whalers', Cinder, Salt, Mirage, Wreckers', Scrap |
| Medium (15) | + Sugar | + Monsoon, Still, Drowned, Witch |
| Large (20) | + Grey, Lantern | + Quarry, Last, Rice |

**Rendering suggestion:** draw each Sea as its own archipelago with a distinct water color and island silhouette style; Reaches are loose clusters within it. Highwater is drawn oversized with a walled harbor but is still one node.

### The Crown Sea (Inner Sea)
*Temperate, grey, fortified. Stately names. Seat of the Imperium.*

**Sovereign Reach** (orig. Sesswenna sector — `small` map)

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

**Shipwrights' Reach** (orig. Corellian sector — `small` map)

| Original | Island | Notes |
|---|---|---|
| Commenor | **Comenara** |  |
| Corellia | **Wrightsport** | shipwright capital of the Seven Seas; Reyne's home port |
| Corfai | **Corfino** |  |
| Drall | **Dralla** |  |
| Duros | **Duroso** | old seafaring people; navigators |
| Selonia | **Selona** |  |
| Talus | **Talusa** |  |
| Tralus | **Tralosa** |  |
| Vagran | **Vagrano** |  |
| Xyquine | **Ciquina** |  |

**Lantern Reach** (orig. Fakir sector — `large` map)

| Original | Island | Notes |
|---|---|---|
| Ando | **Andoro** | fisherfolk; rough |
| Berchest | **Berquessa** |  |
| Bimmisaari | **Bimisario** | market island |
| Carida | **Caridad** | the Imperium's naval academy |
| Delaya | **Delaira** | sister-island of drowned Carrow; Ros Carrow's exile home |
| Halowan | **Halowar** |  |
| Mrisst | **Marista** |  |
| Obroa-skai | **Obroa Scala** | the Great Library; charts and archives |
| Palanhi | **Palanca** |  |
| Ralltiir | **Raltiera** | banking houses |

### The Amber Sea (Inner Sea)
*Tropical / Caribbean: plantations, sugar, reefs, hurricanes, old money with divided loyalties.*

**Coral Reach** (orig. Sluis sector — `small` map)

| Original | Island | Notes |
|---|---|---|
| Bothawui | **Bothaway** | home of the Rumor Guild (Guild Spies) |
| Bpfassh | **Passh Bay** |  |
| Denab | **Denby Cay** |  |
| Kothlis | **Cothlis Cay** | Guild outpost |
| Mon Calamari | **Coralhome** | the Reef people; builds Reef-class ships; Quist's home |
| Orto | **Ortovale** |  |
| Praesitlyn | **Preston's Reach** | signal-tower island |
| Sluis Van | **Sluysvaan** | the great civilian dockyards |
| Sullust | **The Shoals** | home of the Reefwalkers |
| Umgul | **Umgulla** | gambling and racing island |

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

**Rime Reach** (orig. Churba sector — `small` map)

| Original | Island | Notes |
|---|---|---|
| Allyuen | **Alyvik** |  |
| Anoat | **Annat Fjord** | polluted mining fjord |
| Bespin | **Varrow** | Fairweather's floating market — a city of lashed-together hulks |
| Deyer | **Deyr** | fishing; all water |
| Gentes | **Gentnes** |  |
| Hoth | **Rime Island** | frozen rock; classic second Free Harbor |
| Lelmra | **Lelmar** |  |
| New Cov | **Nykov** |  |
| Storthus | **Storthavn** |  |
| Tokmia | **Tokmaa** |  |

**Whalers' Reach** (orig. Sumitra sector — `small` map)

| Original | Island | Notes |
|---|---|---|
| Alk'lellish III | **Alkellish** |  |
| Boordii | **Boordvik** |  |
| Flax | **Flaxholm** |  |
| Geedon V | **Gedon** |  |
| Kashyyyk | **Northreach** | Torvik's homeland; source of Berserkers |
| Linuri | **Linnur** |  |
| Qat Chrystac | **Kristak** |  |
| Tierfon | **Tjerfon** | cutter base |
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

**Cinder Reach** (orig. Moddell sector — `small` map)

| Original | Island | Notes |
|---|---|---|
| Adega | **Tamalu** |  |
| Agrilat | **Sorrowhead** |  |
| Annaj | **Anaja** |  |
| Basilisk | **Basilisk Rock** |  |
| Endor | **Greenholm** | forested island where the Leviathan is being finished |
| Gandolo IV | **Gandolo Spit** |  |
| Hozrel XI | **Firewatch** | active volcano |
| Khuiumin | **Kuimin** |  |
| Pzob | **Emberfall** |  |
| Vjun | **Vejun Keep** | Admiral Blackwater's private fortress |

**Monsoon Reach** (orig. Kanchen sector — `medium` map)

| Original | Island | Notes |
|---|---|---|
| Culroon III | **Kulrun** |  |
| Davnar | **Rainhaven** |  |
| Derra IV | **Derramoor** |  |
| Mindar | **Mindaro** |  |
| Munto Codru | **Munto** |  |
| Nal Hutta | **Fatmouth** | slaver-port; Jubal's kin |
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

**Salt Reach** (orig. Orus sector — `small` map)

| Original | Island | Notes |
|---|---|---|
| Bakura | **Bakuran Flats** |  |
| Chazwa | **Chaswell** |  |
| Daltar | **Dalter** |  |
| Joiol | **Joyol** |  |
| Kimanan | **Kimmen** |  |
| Lafra | **Lafray** |  |
| Mantessa | **Mantissa** |  |
| Poderis | **Powder Isle** | saltpetre — powder works |
| Ryloth | **Rylo Salt** | salt-slave island; one side never sees dusk |
| Tatooine | **Blackreef** | Jubal the Fat's corsair haven |

**Mirage Reach** (orig. Mayagil sector — `small` map)

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
| Jomark | **Jomarrow** | hermit island |
| Kiffex | **Kiffey** |  |
| Trogan | **Troggan** |  |
| Waskiro | **Wastiro** |  |

### The Bone Sea (Outer Sea)
*WEIRD: the islands are the bones of dead leviathans, reef-grown over. The water glows at night. Wrecks outnumber ships. Corsair havens, witch-islands, and a permanent whirlpool. Fogmire (Old Hesper) is here but is an event location, not a node.*

**Wreckers' Reach** (orig. Calaron sector — `small` map)

| Original | Island | Notes |
|---|---|---|
| Akrit'tar | **Gibbet Rock** | Imperium prison |
| F'tral | **Fetral** |  |
| Fwillsving | **Fillsving** |  |
| Ithor | **Gardenholm** | sacred green island; no cutting of trees |
| Jerijador | **Jerrador** |  |
| Kessel | **The Kettles** | prison mines cutting ambergris out of a dead leviathan's skull |
| Kubindi | **Cubbin** |  |
| Morvogodine | **Morvogine** |  |
| Norval II | **Norvell** |  |
| Skor II | **Skorra** |  |

**Scrap Reach** (orig. Dufilvan sector — `small` map)

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

## 15. CHANGELOG

- **2026-09-08 v1.0** — First conversion packet: factions, 60 characters, ships, troops, special forces, facilities, missions, key islands.
- **2026-09-08 v1.1** — Added Sea → Reach → Island structure and all 200 islands with map-size tags.
- **2026-09-08 v2.0** — Fantasy tone pass: the Black Tide, visible Tidecraft, peoples, grown ships, Leviathan as a dredged carcass, weird Outer Seas.
- **2026-09-08 v2.1** — Reframed as living world bible for Claude Code. Added Section 14: Mythic Isles and Double Agents. Section 12 open questions still open.
- **2026-09-09 v2.5** — Added the Reach panel, after the original's sector view: a Reach's islands listed with three icons each (missions, military, facilities), over a summary of what the Reach earns and the mean allegiance across its settled islands. The island panel's tabs were re-cut to match those three — Overview / Missions / Military / Facilities / Log — so an icon on the Reach panel opens the island straight onto the matching tab.
- **2026-09-09 v2.4** — Unit art. Every building type has its own glyph (Camp a cut hillside and pick, Mill a waterwheel, Works a shear-legs crane, Drill Ground a rack of pikes, Slipway a hull on the stocks), shown on the Build tab, on the build buttons and as marks on the island portrait. Garrisons are drawn as companies of pike figures, with the shortfall to the needed garrison greyed in. Characters have cameo portraits cut from their own names — hat, beard, epaulettes and collar vary, and Urskin are visibly not human. `Character.people` is now carried through from the roster so the portrait can read it.
- **2026-09-08 v2.3** — Presentation pass. Added a title screen (faction choice with crests, strengths and weaknesses drawn from section 2; difficulty shown but only Normal exists). Replaced the space-era chrome with an admiralty-chart look: deep-water palette, brass accents, chart lettering, rhumb lines and a compass rose. Islands are now drawn as generated coastlines rather than dots, sized by their slots, and each island's bible note appears on its panel. The island panel gained Overview / Build / Garrison / Log tabs. Faction crests and the app icon are SVG drawn in code. No rules changed.
- **2026-09-08 v2.2** — Applied to the phase 1 build. Sections 1, 2, 5 (majors only), 9, 10, 11 and 13 are now live in `src/data/`: factions, the seven majors a side with rating bands, the ten small-map Reaches and their 100 islands, facility names and the UI vocabulary. Sections 6, 7, 8 and the minor characters wait on the phases that add ships, ground forces and recruitment. Section 14 deliberately not built. Added open questions 5–7 for the three decisions this conversion forced.
