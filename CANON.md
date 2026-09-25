# MASTER OF THE SEVEN SEAS — CANON
## v4.1 — 25 Sep 2026

> **How this file got here.** Sean wrote it and handed it over on 19 September
> 2026. This is his text. Every edit since has been a **name catching up with
> the chart**, never a ruling: the islands renamed that same day read under
> their new names in §3, §7 and §11 — Kingsward, Minterne, Starcross, Leeward
> Keep, Hearsay Cay — the two items that rename settled are marked shipped, and
> in v4.1 the Reaches renamed on 21 September do the same in §3. Nothing here
> has been decided by anyone but Sean. It replaces `seven-seas-world-bible.md`
> as the source of truth — that file is now a non-canon idea pool and carries a
> header saying so. Where the two disagree, this one wins.
>
> **The rule of this document:** Nothing is canon until Sean confirms it.
> Everything below came from Sean directly, from the canonical Drive sources he
> designated, or from the live game's own data files (read 19 Sep 2026 at his
> direction). The old world bible is a **non-canon idea pool**: raw material,
> not truth. New lore gets drafted, confirmed by Sean, then added here with a
> changelog line.
>
> **What the code has caught up with, and what it has not.** The island rename
> and the Aldermain (§3, §12) shipped on 19 September, and the combat master
> landed on 20 September — its roster and its ship encyclopedia are in the game,
> held there by tests. The rest of v4.0 has not
> been swept into the game yet: the Black Tide and the Deep still appear in
> character bios and in `docs/lore.md`, Coralhome does not yet start Crown-held
> with its bed cleared, and coral beds (§5B) are not built. Those are tracked
> against the open questions in §11 rather than guessed at.

---

## 1. THE STORY (confirmed — Sean, 19 Sep 2026)

The **Crown Imperium** has risen and means to bring the whole of the Seven Seas under one crown. The **Free Confederacy** is the reaction: independent nations and independent peoples who intend to stay that way, uniting only to keep the Seas free. They are not one country and don't want to be. They are a confederacy of sovereigns fighting to prevent a world empire.

**Neither side is evil.** Both are neutral powers with incompatible worldviews, and that difference is *why* they are at war. (Writer's shorthand, never used in-game: the Imperium is lawful neutral, the Confederacy is chaotic neutral.) The natural conflict is **law against freedom**. There is no third force in the war.

### The Crown's agenda
The Crown has a vision for the world and is bringing it in. This is an **age of imperialism**: one law, one coin, one chart, garrisons and Admiralty ports everywhere, and the Crown deciding how people should live, trade, dress and govern themselves.

It does not come from malice. It comes from sincere conviction: the Crown truly believes it knows what is best for the world and that it is ushering in a better age. **It is often right.** The harbors do get safer and the trade does flow. The cost is that the people it improves stop being themselves. It is controlling, but it never sees itself that way.

### The founding wound — Coralhome
The Crown chartered **Coralhome**, home of the Reef-folk, to make it a proper Admiralty port. To do that it **cleared the living coral bed**, the nursery where the Reef-folk sing their ships into being. Generations of growing hulls and the living reef were gone in a season, cleared by men who genuinely believed they were building something better. No massacre and no villain: the Admiralty still lists it as a completed works project.

This is the spark that turned scattered resistance into the Confederacy. The Reef-folk carried the story to the outer isles, and every free island heard the same thing in it: *this is what the Crown's improvement looks like when it arrives at your harbor.*

**Faction creeds (from the game):**

- Crown Imperium: *Order · Stability · Trade · Civilization · A brighter tomorrow.* Motto: "Through trade, duty, and discipline, a safer world." Player title: **Imperator**.
- Free Confederacy: *Freedom · Opportunity · Independence · Brotherhood · A bolder tomorrow.* Motto: "Free seas. Free peoples. Always." Player title: **Captain-General**. Every captain elected, every share counted on deck, and the **Moot** argues about everything else.
- **Unaligned Isles**: islands that have not picked a side, and would rather not.

## 2. THE WAR & HOW IT ENDS (confirmed — Sean, 19 Sep 2026)

- **Three Pirate Lords** signed the articles and declared the Confederacy at **Free Harbor**.
- **Free Harbor** is a randomly selected, unexplored outer island, different every game. Its default name is replaced with *Free Harbor*. It is hidden: this is where the Confederacy begins, and the Crown does not know where it is.
- **Imperium victory:** hold all three Pirate Lords in irons **at the same time**. They are ordinary crew ashore; they can be found out, hurt, or carried off.
- **Confederacy victory:** take **Highwater**. The Crown's capital falls and the war ends that day.
- Each Lord commands a ship nobody else can sail and brings something nobody else has:

| Lord | Ship | What they bring |
|---|---|---|
| Commodore-Elect Adaira Hale | *Open Deck* | The Moot sails with her; her posting pulls that island toward the Confederacy a point a day |
| Captain Silas Reyne | *Swallowtail* | Never off her; any errand he leads makes the passage in half the time |
| Admiral Dorian Jessup | *Adamant* | Every fleet in his harbor fights the Adamant's way |

## 3. THE KNOWN WORLD (confirmed — Sean + game data)

The known world is a series of island chains: **7 Seas → Reaches → islands**, one node per island. Each Sea currently holds exactly one Reach. A Sea names the weather and the paintings and nothing else; you cannot act on a Sea.

| Reach | Sea | Tier / role |
|---|---|---|
| Sovereign Reach | The Crown Sea | inner — Imperium home |
| Windward Reach | The Long Sea | inner — contested |
| Sunken Reach | The Bone Sea | inner — contested |
| Rime Reach | The Far Sea | outer — frontier |
| Mire Reach | The Sea of Storms | outer — contested |
| Salt Reach | The Glass Sea | outer — frontier |
| Coral Reach | The Amber Sea | outer — frontier |

**The great island: the Aldermain.** One island is far larger than anything else in the world, with the best ground and the best resources. The Imperium holds it, and it is the seat of their power. The Crown's capital, **Highwater**, is the walled city on it. *Aldermain* = "alder" (eldest) + "main" (the mainland, as in the Spanish Main): what sailors call the one great land.
> Data change for Claude Code: the island in Sovereign Reach currently named Highwater becomes **the Aldermain**; Highwater stays as the capital city standing on it. *(Done 19 Sep 2026; **reverted for the island entry on 21 Sep** — Sean: "Aldermain is the big island not the port! Revert the port back to the name Highwater". The chart entry is Highwater again and the Aldermain is the landmass it stands on, which is what this paragraph says and what the rename briefly stopped being true. `persist.ts` migrates saves written in between.)*

**Coralhome** (Coral Reach) is the Reef-folk homeland. **It starts every game Crown-held and heavily garrisoned, with its coral bed already cleared.** Retaking it restores nothing, and that is the point. See section 5B.

**Seawalls.** A high stone harbor wall that keeps enemy fleets out. It is the Fortress building in the game (Sean's own design: a harbor battery, so a fleet does not have to sit at home to hold its capital). Highwater has two, three hundred feet high.

**Named islands of note (game data):** Ballmoor (foundries — the Crown's arms), Gorley (site of an old massacre; hates the Crown), Chandler's Rest (Hale's birthplace, quietly Confederacy-leaning), Yarrow Minor (royal dockyard), Kingsward (naval academy), Minterne (banking houses — half the war is paid for here), Wrightsport (shipwright capital; Reyne's home port), Starcross (the best navigators alive), Gibbet Rock (Imperium prison; the name is not a metaphor), Gardenholm (sacred and green — no tree ever cut), The Kettles (prison mines cutting ambergris from a dead leviathan's skull), Northreach (Urskin whalers), Varrow (Fairweather's floating market of lashed-together hulks), Greenholm (something large is being finished here), Firewatch (active volcano), Leeward Keep (Blackwater's private fortress), Powder Isle (saltpetre; every gun owes this rock), Blackreef (Jubal the Fat's corsair haven), Coralhome (the Reef-folk), The Shoals (the Shoal-folk), Hearsay Cay (the Rumor Guild).

## 4. TONE & PLAUSIBILITY RULES (confirmed — Sean, 19 Sep 2026)

- Roughly **17th-century Age of Sail** with fantasy elements: about **80% Age of Sail, 20% dark fantasy**.
- Fantasy creatures allowed. A little magic allowed. Keep it **subtle**.
- **Plausibility is the law.** Exaggeration is fine, ridiculous is not. Ships may be bigger than real 17th-century ships, but nothing may look implausible, especially visually.
- *Pirates of Dark Water* was an inspiration for the vibe, but this is not that.
- **The Crown keeps no slaves.** Galley slavery can exist in the world's past, but it belonged to a power the Crown conquered, never to the Crown itself.
- Keep lore light. This is a video game; depth goes where it helps play.

## 5. MAGIC (confirmed — Sean, 19 Sep 2026)

- **There is no hard magic system.** No ranks, no schools, no rules to learn. Magic is mystical, and it appears where the story places it.
- Magic is **not harnessed**. No wizards casting spells.
- Natural, spiritual, almost shamanistic: **voodoo / Cajun / merfolk** in flavor.
- **Magic is largely absent from the Imperium.** The Crown runs on discipline, charts and cannon. Magic lives at the edges of the world and among its older peoples.
- The clearest example is the Reef-folk and their living coral (section 5A).
- **Retired 19 Sep 2026:** the Deep as a system (Deep-touched / Tidecaller / Tidemaster ranks) and Crown **licensing** of the gift. These were a slot-for-slot conversion of the Force from the old conversion packet. See Open Questions for what this touches in the game.

## 5A. THE REEF-FOLK AND THE LIVING CORAL (confirmed — Sean, 19 Sep 2026)

The Reef-folk are one of the **headline peoples** of the world, alongside humans and the Urskin. The coral fleet is theirs.

**Home:** Coralhome, in Coral Reach.

**Look:**
- Tall, poised, amphibious humanoids, roughly 5 ft 5 to 6 ft 7.
- **Gill slits** at the throat; open or split collars so the gills work.
- **Luminous eyes.**
- **Subtle webbing** on the hands (not flippers).
- A **backswept fin or coral-like crest** on the skull, which gives them their silhouette at a distance.

**Mood-color:** their skin shifts color with emotion. This is not magic. It is an **evolved form of expression** from life underwater, where a face does not carry. It does for them what facial expressions do for humans, and like a human keeping a straight face, a Reef-folk can **mask** it. The shift is subtle, not dramatic, moving along a spectrum from **blue** (calm, thoughtful) through **teal** to **coral red** (alarm, anger), with **gold** for joy. A Reef-folk envoy at a parley table is working as hard at hiding their color as a human is at hiding their face, and both sides know it.

**Coral-singing:** the Reef-folk **sing** living coral into shape. The **coral is a living organism and it holds the magic**; the Reef-folk have an **affinity** with it. Shaping a hull is a combination of the coral's own life and the singers' emotion. They use **shell horns**, and their voices are beautiful, with something of the **siren** to them. It is emotional magic, not spellcasting. How many singers a project takes depends on the project.

Coral carapace armor regenerates. Tidestalkers are sung into being in shallow nurseries; **Reef singers** wake a Coral-Class Dreadnaught beneath a guarded lagoon.

**Why they are Confederacy:** the Crown's agenda has no version of them in it. The Crown does not want to hurt them; it wants to improve them: charter the reef, regulate the singing, make Coralhome a proper port. They would survive it, but they would no longer be Reef-folk. Then the Crown cleared Coralhome's bed (section 1), and the argument was over.

## 5B. CORAL BEDS — GAME MECHANIC (confirmed — Sean, 19 Sep 2026)

- **Coral beds** are a permanent resource on **three islands** each game, like a forest or a gold vein.
- **Confederacy:** cannot clear a coral bed. Building a **slipway** on the bed unlocks the **Reef-folk coral ships**. The cost is the land the bed occupies, which cannot be used for anything else.
- **Imperium:** can **clear** a coral bed when it holds the island, freeing the land for any building.
- The choice says everything about both factions: one side sees a nursery, the other sees an unimproved slot.
- **Coralhome** starts Crown-held and garrisoned, its bed already cleared (section 3).

## 6. FACTION CHARACTER (confirmed — canonical sheets + Sean)

- **Crown Imperium** — standardized progression, disciplined combined fleets, dominant capital ships. Run through an **Admiralty**; conquest arrives as administration (chartmakers, clerks, magistrates, tariffs, seawalls). Driven by the agenda in section 1.
- **Free Confederacy** — asymmetric specialists, retrofits, raiders, living-coral vessels, captured Imperial hulls. What the Crown standardizes, the Confederacy improvises, grows, or takes. Born in response to the Crown's agenda; declared at Free Harbor.

**Sail rule (confirmed — Sean, 19 Sep 2026):** green sails mark a **V2 ship**, not an elite one. **V1 ships get white sails.** This is a version tier, not a rank.

## 7. PEOPLES (confirmed — canonical ship lore + game data + Sean)

Faction leanings in the game: **Urskin** and **Reef-folk** lean Confederacy; **Bog-folk** lean Imperium.

- **Humans** — live throughout the Seven Seas.
- **The Reef-folk** — headline people; see section 5A.
- **The Urskin** — giants of the far north, tusked and shaggy. Whaling clans who followed leviathans through pack ice for months; a tradition of enormous community vessels ("a clan, foundry and winter town carried into battle on one immense keel"). Cannon shot sized for Urskin hands. Ships: Urskin Whaler, Urskin Goliath. Home: Northreach.
- **The Shoal-folk** — webbed, night-eyed, the best watchers in the world; shallow-water islanders who consider deep water an inconvenience and armed ships needlessly slow. Navigators who read air shifts with strings of shell wind-chimes. Ships: Swift, Blackfin. Home: The Shoals.
- **The Bog-folk** — swamp people of the Sea of Storms, Imperium-leaning; patient irregular fighters who consider a battle fought in daylight to be a battle somebody else arranged.
- **The Hushed** — bound to the Crown by an old bargain. Not heard arriving. **Origin: to be decided** (their old origin, the Drowned Reach, was cut).
- **The Rumor Guild** — not a people but a power: sells to both sides, openly, off a price list. Home: Hearsay Cay.

## 8. NAMED CHARACTERS (confirmed — game data, 19 Sep 2026)

Entries marked ⚠ reference lore cut today and need a rewrite (see Open Questions).

**Crown Imperium**

| Name | Epithet | In a line |
|---|---|---|
| Lord Regent Halvard Corvane ⚠ | the Old Tide | Hasn't left the citadel in eleven years. Ended the Corsair Wars. Keeps a ledger of every hanging, and has never thought the number too high. |
| Admiral Corvus Blackwater ⚠ | the Drowned Admiral | The man who signs the orders nobody else will sign. Keeps every promise, even to enemies. |
| Captain Fenwick Pryor | the Survivor | Survives Blackwater's flagship by never being the one blamed. Good at parley because he listens. |
| Governor Tiberius Jarrold | the Sleepless | Oversees the Leviathan's completion at Greenholm. Charming at dinner; has stopped sleeping. |
| Captain Lorne Neddam | First Over the Rail | Boarding specialist. Honest to a fault, which will get him killed. |
| Admiral Kendrick Ozmond | the Peacock | Vain aristocrat, better at raids than fleets. Blackwater despises him. |
| Colonel Maximilian Vierling | the Drillmaster | Invented the landing doctrine and the Drowned Guard's cold-baptism. |

**Free Confederacy**

| Name | Epithet | In a line |
|---|---|---|
| Commodore-Elect Adaira Hale ⚠ | the Magistrate | **Pirate Lord.** Ex-Imperium magistrate who resigned from the Crown's service; has held a pack of pirates together for six years by force of argument. Incorruptible, and looks away from what some of her captains do because she needs their hulls. |
| Captain Silas Reyne | the Swallowtail | **Pirate Lord.** Smuggler captain of a coral-grown sloop that has no business being that fast. Owes Jubal the Fat more than a ship is worth. Claims to be in it for the money; keeps proving otherwise. |
| Admiral Dorian Jessup | the Grandfather | **Pirate Lord.** Elderly ex-Imperium admiral; the Confederacy's grandfather figure and its steadiest voice at a parley table. |
| Tam Calloway ⚠ | the Fisher's Boy | Fish come to his boat and old sailors cross themselves. |
| Rosalind "Ros" Carrow ⚠ | of Carrow | Heir of the island of Carrow. Best negotiator in the Confederacy; running on grief. |
| Anselm "Big" Torvik | Big Torvik | Urskin. Reyne's first mate; can throw a harpoon through a hull. Loyal past all reason. |
| Wyatt Ansell | the Shipwright | Young cutter-captain learning to grow coral hulls from the Reef-folk. |

**Unaligned recruits (12, scattered across the isles):** Maren Quist *the Coralwright* (Reef-folk), Pellam Voss *the Master Gunner*, Sable *no other name* (The Hushed) ⚠, Hesper Lyn *the Price List* (Rumor Guild), Brannoc Tull *the Harpoon* (Urskin), Wren Tally *the Ear* (Shoal-folk), Doctor Ambrose Kell *the Tide Doctor*, Captain Isolde Marrow *the Even Hand*, The Widow Ashgrave, Tobias Renn *the Swampcat* (Bog-folk), Silvaine Crow *the Quiet Hand* ⚠, Jory Halloran *the Understudy*.

**Other powers named but unseen:** Jubal the Fat (corsair lord of Blackreef, holds Reyne's debt), Fairweather (floating market at Varrow).

## 9. THE ADVISORS (confirmed — Sean, 19 Sep 2026)

Two advisor characters, one per faction, each at their faction's end of the tab bar; tapping opens the Narrator sheet, where they answer five questions from live game state in their own voice.

- **Crown:** **Secretary Marlow**, the Regent's grey, unblinking private secretary who may not be alive. Style: dry, exact, sarcastic, entirely the Imperium's. "Secretary Crane" is retired and must not be used.
- **Confederacy:** **Mr Pennywhistle**, the one-eyed talking sea-parrot. Style: loud, rude, usually right.

## 10. CANONICAL SOURCES (live documents — canon without duplication here)

> **Combat canon is [`COMBAT-MASTER-v4.3.md`](COMBAT-MASTER-v4.3.md), in this repo.**
> Sean supplied it on 20 September 2026 and it says so itself: *"THE single
> authoritative reference for the entire naval combat system… Supersedes v3
> (19 Sep 2026) and all prior roster sheets, combat docs, and the v2.4 JSON."* It folds sources 1–3
> below into one file — Part 1 the rules, Parts 2–3 the pricing and the roster,
> Part 4 the Lore & Visual Identity tab, Part 5 the simulation results — and
> none of those three is in Drive any more; the 19 September cleanup trashed
> them. Use the master.
>
> **v4 landed 20 September** and takes the roster to 28 — fourteen a side. It
> adds the Fenrunner and the Wraith to the Crown and the Witchlight to the
> Confederacy, rewrites the Blackfin's visual identity to the twin-hulled war
> canoe her painting turned out to be, and writes *"crew are Shoal-folk, never
> human sailors"* into the Swift's guardrail. **No existing ship's stats
> changed**; the only figures that moved are the simulated win rates, recomputed
> over a 28×28 matrix. Parts 1 and 2 — the rules and the pricing — are byte for
> byte identical to v3.
>
> Verified rather than assumed: `src/data/combat-ships.json`,
> `src/data/ship-lore.json` and `src/data/combat-derived.json` are all parses of
> the master by `scripts/import_roster.py`, the derived table is now *computed*
> from Part 1's formula and reproduces the old hand-transcribed one exactly, and
> `lab/v4check.ts` reproduces all nineteen published matchups — the three new
> hulls included, untuned — to within 2.2 percentage points.

1. ~~**Master of the Seven Seas — Fleet Roster** (Sheet)~~ — gone from Drive; now **Part 3** of the master.
2. ~~**7 Seas — Naval Combat System** (Doc)~~ — gone from Drive; now **Part 1** of the master.
3. ~~**Ship Lore & Visual Identity tab**~~ — gone from Drive; now **Part 4**, parsed into `src/data/ship-lore.json` and laid out in `docs/ship-art-direction.md`.
4. **The live game's own data files**: `src/data/*.json` at seanyb47/Star-Wars-Rebellion, as shipped at https://seanyb47.github.io/Star-Wars-Rebellion/. Canon for characters, islands, reaches, and in-game encyclopedia text, **except where it conflicts with a ruling in this document**.

**Not a canon source:** *Peoples Art Guide v1*. It treats the world bible as canon. Its Reef-folk section is superseded by section 5A; its other peoples' traits are proposals until Sean confirms them.

Standing presentation rules (canon): spelling is **Armor**; back-end math stays hidden from players; ship strengths are conveyed through in-world flavor text; Repair and Speed display as Slow / Normal / Fast / Very Fast.

## 11. OPEN QUESTIONS — awaiting Sean

1. **The Hushed** — new origin, now that the Drowned Reach is gone. (Next up.)
2. **Remaining peoples from the art guide** — Bog-folk (amphibious? wrinkled?), Shoal-folk (sail-like ears?), Urskin (height; sea-bear look and muzzle?).
3. **Characters built on cut lore:**
   - **Corvane** and **Blackwater** are Tidemasters, and "can still a harbor" / "the water below Leeward Keep is always flat" are magic. Keep them as rare mystical exceptions, or make the Crown fully mundane?
   - **Blackwater**'s backstory was his island drowning under the Tide. He needs a new one.
   - **Hale** resigned over the licensing raids. What did she resign over instead?
   - **Ros Carrow**'s island was taken by the Tide. What happened to Carrow?
   - **Tam Calloway** and **Silvaine Crow** are Deep-touched. Keep as mystical individuals, or rework?
   - **Sable** comes "out of the Drowned Reach." Waits on question 1.
4. **Coralhome and the three beds** — is Coralhome's cleared bed one of the three, or are there three live beds plus Coralhome?
5. **The Leviathan at Greenholm** — its bible origin was dredged from the Black Tide. Keep it with a new origin, or cut it?

## 12. RESOLVED (kept for the record)

- **Map structure** — confirmed canon (Sean, 19 Sep 2026).
- **Sails** — green = V2, white = V1. Not an elite marker (Sean, 19 Sep 2026).
- **Advisors** — confirmed canon; the Crown's is **Secretary Marlow**, not Crane (Sean, 19 Sep 2026).
- **Star Wars leftover island names** — approved for renaming (Sean, 19 Sep 2026). **Shipped 19 Sep 2026:** thirty-one islands renamed; the audit and the reasoning are in `PLAN.md`.
- **The Aldermain** — confirmed as the great island's name (Sean, 19 Sep 2026). **Shipped 19 Sep 2026**, and the island *entry* reverted to Highwater on 21 Sep at Sean's word: the Aldermain is the landmass, Highwater the port on it, and the chart names the port.
- **Seawalls** — canon, Sean's own design idea: a harbor battery (the Fortress / Heavy Fortress building). Highwater has two, three hundred feet high.
- **The Black Tide** — **cut entirely** (Sean, 19 Sep 2026). The war needs no third force; the conflict is law against freedom.
- **The Drowned Reach** — **cut entirely** (Sean, 19 Sep 2026). The articles are signed at Free Harbor instead.
- **The Deep as a system, and licensing** — retired (Sean, 19 Sep 2026). Magic is mystical, with no hard system.
- **Reef-folk** — confirmed in full (section 5A). The "enslaved Imperium oarsmen" history is rejected: the Crown keeps no slaves.

## CHANGELOG

- **v4.1 (25 Sep 2026)** — No new lore. The map table in §3 is corrected to the chart the game actually draws: the Reaches were renamed on 21 September and this document was not swept, so three of its seven rows named Reaches that do not exist — Whalers' is **Windward Reach** (and the Merchant Sea the **Long Sea**), Wreckers' is **Sunken Reach**, Cinder is **Mire Reach**. The same miss had left ten crew entries in `src/data/characters.json` giving a home in a Reach off no chart; they now read Windward, Sunken, Mire and the Long Sea, and Jarrold's Greenholm is in Mire Reach, which is where the island is. Quill and Sable no longer come from the **Drowned Reach**, cut in v4.0 (§12): their entries name no place at all until §11 Q1 is answered. §10's link pointed at a `COMBAT-MASTER-v4.2.md` the repo does not carry; it is v4.3. `src/sim/__tests__/placenames.test.ts` fails the build if a name in this table, an island in §3, a link in this file, or a place named in shipped data goes stale again.
- **v4.0 (19 Sep 2026)** — Black Tide and Drowned Reach cut. Crown's agenda added: sincere imperialism, a vision for the world, often right. The Confederacy's founding wound is the clearing of Coralhome's coral bed. Articles signed at Free Harbor, a random hidden outer island each game. Magic stripped of any hard system; the Deep and licensing retired; magic largely absent from the Imperium. Reef-folk confirmed in full: look, mood-color as masked expression, coral-singing with shell horns and siren voices, the coral holding the magic. Coral beds added as a three-island mechanic. Coralhome starts Crown-held with its bed cleared. The Crown keeps no slaves. Characters built on cut lore flagged ⚠ for rewrite.
- v3.0 (19 Sep 2026) — The Black Tide rebuilt as a plain rising sea and made the central conflict; seawalls and Blackwater simplified to match; the Aldermain and the Drowned Reach confirmed. *(Tide and Drowned Reach reversed in v4.0.)*
- v2.1 (19 Sep 2026) — Crown advisor is Secretary Marlow (Crane retired); Star Wars leftover island names approved for renaming; seawalls documented as Sean's design idea.
- v2.0 (19 Sep 2026) — Folded the live game's data into canon: map, Pirate Lords, character roster, the Deep, four more peoples. Sail rule corrected.
- v1.1 (19 Sep 2026) — Canonical sources point to the latest version of each Drive file.
- v1.0 (19 Sep 2026) — Doc created from Sean's dictated story, world, tone and magic rules plus the canonical Fleet Roster ship lore; old world bible demoted.
