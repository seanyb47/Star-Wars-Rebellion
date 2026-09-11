# Galactic Rebellion — Build Spec (Phase 1)

A real-time grand strategy game for the phone, modeled on the mechanics of
LucasArts' *Star Wars: Rebellion* (1998). Phase 1 delivers the galaxy map,
the real-time clock, the mine/refinery/maintenance economy, popular support
and control, and the officer missions of §4.5 (Diplomacy and Incite Uprising).
Everything else is roadmap.

**Personal project.** Ship with original faction/character/planet names.
Names live in data files so a private reskin is a one-file swap.

---

## 1. Tech decisions

- **Single-page web app**, mobile-first, installable as a PWA (add-to-home-screen).
- Plain **TypeScript + React + Vite**. No game engine. No backend.
- **All game state is one JSON object** (`GameState`). Save = serialize to
  localStorage. Load = parse. This also makes debugging trivial.
- **Pure simulation core** (`/sim`) with zero React imports. The UI only
  reads state and dispatches commands. This is the single most important
  architectural rule — it's what makes the AI opponent and testing easy later.
- Target: iPhone-sized viewport (~390px wide), portrait. Touch only.

## 2. The clock (real-time, pausable)

- Time advances in **days**. One tick = one day.
- Speeds: `paused | very_slow | slow | medium | fast` → tick every
  `∞ | 4000 | 2000 | 1000 | 400` ms.
- **Auto-pause** whenever a modal/panel is open. Resume when it closes.
- Every in-progress thing (build, mission, fleet move) stores `daysRemaining`.
  Each tick decrements it; at 0 it resolves and emits an **Event**.
- `advanceDay(state) → state` is a pure function. The UI calls it on a timer.

## 3. Data model

```ts
type Faction = 'empire' | 'alliance' | 'neutral' | 'none';

interface Sector { id: string; name: string; systemIds: string[]; x: number; y: number; }

interface System {
  id: string; name: string; sectorId: string;
  x: number; y: number;                 // position within sector
  explored: { empire: boolean; alliance: boolean };
  populated: boolean;
  isCore: boolean;
  control: Faction;                      // who can station troops / draw resources
  support: { empire: number; alliance: number }; // 0–100 each, loyalty of populace
  rawSlots: number;                      // max mines
  energySlots: number;                   // max refineries + facilities
  facilities: Facility[];
  garrison: number;                      // trooper regiments present
  uprising: boolean;
}

type FacilityType = 'mine' | 'refinery' | 'construction_yard' | 'training_facility' | 'shipyard';
interface Facility { id: string; type: FacilityType; owner: Faction; building?: BuildOrder; }
interface BuildOrder { item: FacilityType | 'troop'; daysRemaining: number; costRefined: number; }

interface Character {
  id: string; name: string; faction: Faction;
  diplomacy: number; espionage: number; combat: number; leadership: number; // 0–100
  locationSystemId: string;
  status: 'available' | 'on_mission' | 'injured' | 'captured';
  mission?: Mission;
}

interface Mission {
  type: 'diplomacy';                     // phase 1: only this
  targetSystemId: string;
  phase: 'travelling' | 'working';
  daysRemaining: number;
}

interface FactionState {
  raw: number; refined: number;
  maintenanceCapacity: number;           // 50 per matched mine/refinery pair
  maintenanceUsed: number;
  hqSystemId: string;
}

interface Event { day: number; text: string; systemId?: string; characterId?: string; }

interface GameState {
  day: number; speed: Speed; player: 'empire' | 'alliance';
  sectors: Sector[]; systems: System[]; characters: Character[];
  factions: { empire: FactionState; alliance: FactionState };
  events: Event[];
  rngSeed: number;
}
```

## 4. Rules — Phase 1 (implement exactly these)

### 4.1 Galaxy generation
- 10 sectors × 10 systems = 100 systems. Sectors arranged roughly in a
  ring: 4 core sectors in the middle, 6 rim sectors around them.
- Core systems: explored by both sides, populated, 2–4 raw slots,
  3–6 energy slots, some starting facilities.
- Rim systems: unexplored, ~70% unpopulated, 0–5 raw slots, 0–4 energy slots.
- Empire HQ on a fixed core capital system (100% empire support, control=empire).
- Alliance HQ on a random rim system (100% alliance support, control=alliance).
- Neutral core systems: control=neutral, random support split (e.g. 35/25).
- Each side starts with 7 characters at its HQ, ~8 mines, ~8 refineries,
  2 construction yards, 1 training facility spread across its systems.

### 4.2 Economy (per tick) — **SUPERSEDED, see the amendment at the end of this file**
1. Each mine on a system you control (not in uprising) produces `1 raw × supportMultiplier`.
   `supportMultiplier = 0.5 + support[you]/200` (50% loyal → 0.75×; 100% → 1.0×).
2. Each refinery converts up to 1 raw → 1 refined per tick.
3. `maintenanceCapacity = 50 × min(mines, refineries)` for that faction.
4. `maintenanceUsed = Σ maintenanceCost` of all non-mine/refinery facilities
   and units. Costs: construction_yard 20, training_facility 15, shipyard 30, troop 8.
5. If `used > capacity` for 5 consecutive days, scrap the newest unit/facility
   and emit an event. (Manual: "will begin to be scrapped.")
6. **Smuggling:** on controlled systems with your support < 50, each tick
   there's a `(50 − support)/200` chance the day's raw output goes to the enemy instead.

### 4.3 Popular support & control
- A neutral system flips to your control when `support[you] ≥ 60` and
  `support[you] − support[them] ≥ 25`. Emit event.
- A controlled system with `support[you] < 30` enters **uprising**
  (produces nothing, facilities unusable) unless `garrison ≥ requiredGarrison`,
  where `requiredGarrison = ceil((50 − support[you]) / 10)`.
- Uprising ends when support climbs back to ≥ 40.
- **Sector spillover:** any support change on a system applies 20% of that
  change to every other populated system in the same sector.
- **Drift (amended v4.10):** every populated island moves each faction's support
  0.25 points a day toward its natural level — 55 for whoever controls the
  island, 0 for everyone else. Support used to only ever ratchet upward, so one
  parley moved a whole chain permanently and the war was decided by whoever
  talked first. Drift never takes an island off you on its own; it means a hold
  has to be kept up.
- Unpopulated system: controlled only while garrison ≥ 1. The moment you
  complete any facility there, it becomes populated with support 100/0 for you.

### 4.4 Building
- Construction yard builds: mine (cost 40 refined, 8 days), refinery (50, 10),
  construction_yard (120, 20), training_facility (80, 15), shipyard (150, 25).
- Training facility builds: troop regiment (25 refined, 5 days).
- A facility can hold one build order at a time. Refined is deducted at order time.
- Build targets must be a system you control; facilities need a free energy slot,
  mines need a free raw slot.

### 4.5 Missions
The island decides which mission an officer sent ashore performs — there is no
menu. All kinds share travel, the 15-day work cycle, the continue-or-return
prompt, and the foil check.

**Precedence** when an island offers more than one: Recruitment, then Diplomacy,
then Incite. A person is scarce and permanent where an island can be worked
again next month.

**Precedence decides new missions only.** Whether an errand already under way is
still live is judged against *its own* type (`stillWorthDoing`), never against
what the island would now offer — otherwise somebody wandering ashore would
cancel a parley already fifteen days into its cycle.

**Diplomacy (parley).** Eligible target: neutral or friendly system, populated,
not in uprising, charted by you.
- Travel time: 3 days within sector, 10 days across sectors.
- On arrival, mission "works" for 15 days, then resolves:
  - `successChance = 0.4 + diplomacy/200` (dip 50 → 65%; dip 90 → 85%)
  - Success: `support[you] += 8 + diplomacy/10`, `support[them] -= 4`.
  - Failure: no change.
**Recruitment (amended v4.11).** Eligible target: any populated, charted island
with one of the unaligned standing on it — whoever holds the island, your own
ground included.
- `RECRUITS_IN_PLAY` (8) of a larger pool are seeded onto settled islands that
  are not either seat, one apiece. `RECRUITS_AT_START` (2) are ashore on day 1;
  the rest arrive spread over the first `RECRUIT_LAST_DAY` (420) days, so
  finding the errand late is not finding it too late.
- Same travel and 15-day cycle. `chance = (0.4 + diplomacy/200) × (1 −
  quality/200)`, where `quality` is the recruit's best rating: somebody worth
  having knows it.
- Success: they join your faction permanently, where they stand. There is no
  support bar to nudge — it either happens or it does not.
- They are `faction: 'neutral'` until signed, so no roster, reach tally or
  crew list counts them for either side.

**Incite Uprising (amended v4.10).** Eligible target: a populated, charted
island the *enemy* controls that is not already in revolt.
- Same travel and 15-day cycle.
- `successChance = (0.4 + diplomacy/200) × 0.75` — harder than a parley.
- Success: `support[holder] -= 9 + diplomacy/10`, and 35% of that amount comes
  to you. You do not win the island; you cost them their grip. Push the holder
  under the uprising threshold of 30 and the island rises on its own, which
  stops everything being built, loaded or landed there.
- Failure: no change.

**Foil check (amended v4.10).** Run on both kinds, after the outcome:
- No risk at all on an island you control.
- Base 10% on neutral ground, 30% on an island the enemy holds.
- `+ 30% × (best enemy espionage on the island / 100)` — their officers do the
  watching, so where they leave their people matters.
- `× (1 − 0.6 × your officer's espionage/100)` — craft cuts the risk but never
  to nothing. Capped at 85%.
- Detected → character `injured` for 20 days.

- A mission whose island no longer matches its type is stood down, checked both
  on landfall and at the end of each cycle, so nobody works a cycle for nothing.
- After resolving, the game asks: continue (another 15-day cycle) or return.
- Character ratings are hidden from the enemy; visible to you.

**The authoritative Phase 3 mission set**, in the order agreed: Recruitment,
Diplomacy (friendly/neutral) and Incite Uprising (enemy-controlled) — all
*built*;
Espionage; Abduction; R&D; Command (assign an officer over an island or fleet,
boosting its output in proportion to leadership and the other core ratings —
the fleet half already exists as ships' officers); Sabotage.

### 4.6 Victory (phase 1 placeholder)
- Win: control 60% of populated systems. Lose: the opponent does.
  (Real HQ-and-capture conditions come in Phase 3.)

### 4.7 Opponent AI (phase 1, dumb on purpose)
- Every 5 days: if refined ≥ cost, build a mine or refinery (whichever it has
  fewer of) at the controlled system with the most free slots.
- Every 10 days: send its highest-diplomacy available character on Diplomacy
  to the neutral system in the same sector where its support is highest.

## 5. UI — four screens, one bottom tab bar

1. **Galaxy** (home). Zoomable/pannable map. Sectors as clusters; systems as
   dots colored by control (grey unexplored, blue neutral, red empire, gold
   alliance). Small support bar under each explored populated system. Tap a
   system → System sheet slides up from bottom (auto-pauses).
2. **System sheet.** Name, sector, control, support bars, raw/energy slots,
   facilities list with build buttons, garrison, uprising badge.
3. **Characters.** List with ratings and status. Tap → "Send on Diplomacy"
   → pick target system on the map.
4. **Feed.** Reverse-chronological events. Tap an event → jumps to that
   system/character. Unread badge on the tab.

Persistent top bar: Day counter, speed control (tap to cycle, long-press
to pause), raw / refined / maintenance (used/cap).

## 6. Definition of done for Phase 1
- New game generates a 100-system galaxy in < 100 ms.
- Clock runs at all speeds; auto-pauses on any sheet.
- A player can build mines/refineries, watch maintenance grow, send a
  character on Diplomacy, and flip a neutral system.
- The AI does the same and the game can be won or lost.
- Save/load survives a page refresh.
- 20+ unit tests on `/sim` (economy, support flip, uprising, mission resolve)
  using a seeded RNG so results are deterministic.

## 7. Roadmap
- **Phase 2 — Fleets. BUILT (v4.0–4.1).** Hulls, troop capacity, fleet
  movement, auto-resolved combat, assault to take islands by force, blockades.
  **Fighters are cut from the design, not deferred**: a small craft is just a
  small ship, so instead of a second combat layer the fleet is a range of sizes
  — small, medium, large, plus the transport — and each is good and bad at
  something, with passage time as the trade-off. Command ranks stay in phase 3
  as written, though the fleet is already shaped to hold them.
- **Phase 2 (not yet built).** The battle summary *card*. An action reports as
  an event line for now, because a card is the same job as the event cards
  still outstanding for the whole feed.
- **All four ratings are live as of v4.8.** Diplomacy decides a parley;
  Leadership an action at sea; Combat a landing; Espionage how much of a chain
  a fleet charts when it makes landfall. The phase-3 missions below will give
  Espionage a second use, but it is no longer decoration.
- **Phase 3 — Full missions & victory.** Recruitment and Incite Uprising are
  built (§4.5). Outstanding: Espionage as a mission, Abduction, R&D, Command
  over an island, Sabotage. Then Recon (probe units) and Rescue.
  Foilers based on defending characters' espionage/combat. Command ranks
  (Admiral/General/Commander). Real victory: hold enemy HQ + capture two
  named leaders; Empire must *find* the hidden Alliance HQ.
- **Phase 4 — Polish & smarter AI.** Force-user tiers and training,
  superweapon, LLM-driven opponent via API, sound, animations.


---

## AMENDMENTS

Changes to the rules above, agreed after playtesting. Where an amendment
conflicts with a numbered section, the amendment wins and the section is
marked superseded.

### A1 (2026-09-09) — One currency, replacing §4.2

The two-resource economy (raw → refined, plus a maintenance *capacity*) tested
badly: the resource names meant nothing to a player and the capacity ceiling
was the least intuitive part of the original. It is replaced by a single
currency, **Gold**, on this rule: *a building either earns gold, or it costs
gold.*

1. **Earners.** A Camp earns 2 gold a day; a Mill earns 3. Both are scaled by
   `supportMultiplier = 0.5 + allegiance/200`, exactly as production was.
2. **Costs.** A Works costs 3 gold a day, a Drill Ground 2, a Slipway 4, and
   each company ashore 1. Camps and Mills cost nothing to keep.
3. An island in mutiny, or not held by the owner of its buildings, earns
   nothing. Unchanged from §4.2.
4. **Smuggling** is unchanged in shape: on a held island where your allegiance
   is under 50, there is a `(50 − allegiance)/200` chance a day that the
   island's takings go to the enemy instead.
5. **Shortfall.** Upkeep is paid out of the treasury each day. If it cannot be
   paid in full, the treasury empties and there is a
   `min(1, shortfall/upkeep)` chance that day that one thing you own, chosen at
   random from everything that costs upkeep, breaks down and is lost. Small
   shortfalls decay slowly, large ones quickly, and the ledger walks itself
   back to equilibrium instead of collapsing at once. There is no five-day
   grace period and no "scrap the newest" rule; both are withdrawn.
6. Build costs are now in gold: mine 40, mill 60, works 120, drill ground 80,
   slipway 150, company 25. A new game starts with 150 gold.
7. Slot names in the UI are **Ground** (what a mine needs) and **Water** (what
   everything else needs). The underlying `rawSlots` / `energySlots` fields are
   unchanged.

Verified: full games still resolve in roughly 670-730 days, the same as under
§4.2, so the pacing this spec was balanced for is preserved.

### A2 (2026-09-11) — Incitement, an opponent that uses its officers, and support drift

Building Incite Uprising (§4.5) turned up two things that had been hiding
behind each other. Recorded here because the second one moves a number this
spec was balanced against.

1. **The opponent was barely playing its officers.** It picked its single best
   diplomat, left the other four on the quay for the whole war, and ranked
   targets with a +200 bonus for its own reach — large enough that it would
   sail to a neighbouring island at 5% sympathy in preference to one across the
   map it could actually win. It now sends up to `AI_MISSION_PARTIES` (2)
   officers at a time, weighs a parley and an incitement on one scale, and uses
   a much smaller proximity bonus (25). Every order still goes through the same
   checks a player's does.

2. **Nothing in the game ever took support away.** Combined with the 20% sector
   spillover of §4.3, one successful parley moved a whole chain and moved it
   permanently: support only ratcheted upward, and the war went to whoever
   talked first. Diplomacy, not the fleet or the ledger, decided everything.
   §4.3 now has **drift**: 0.25 points a day toward 55 for the holder and 0 for
   everyone else.

**The pacing number in A1 is superseded.** The 670-730 day figure was measured
against an opponent making both of the mistakes above; it described a weak AI,
not a balanced game. Measured across the same eight seeds with an idle player:

| | mean days |
|---|---|
| A1, as measured (one officer, no drift) | 686 |
| Competent AI, no drift | 250 |
| Competent AI, drift 0.25 (shipped) | **565** |

565 days is roughly 9.5 minutes at Medium. Drift of 0.28 restores the old mean
(664) but sits on a knife edge — single seeds swing between 464 and 824 days —
so 0.25 was taken for its much tighter spread (514-629). **The band for future
balance work is 520-630 days, not 670-730.**

Incitement is used and matters: across four measured games the opponent opened
63 of them, landed 68 cycles, and set 35 islands alight.

### A3 (2026-09-11) — Recruitment, and what the idle-player benchmark is worth

Recruitment (§4.5) adds people to the world who belong to neither side. Two
notes on it, and one on the number this spec keeps quoting.

1. **Precedence is for choosing, not for cancelling.** Signing someone on
   outranks a parley when deciding where to send an officer. Applying the same
   rule to a mission already under way meant a stranger wandering onto an
   island cancelled a parley thirteen days into its cycle. An errand in
   progress is now judged against its own type. Regression-tested.

2. **Officer upkeep was tried and rejected.** Officers are the one thing in the
   game that neither earns gold nor costs it, against A1's central rule. Adding
   1 gold a day moved the war from 449 days to 461; 2 a day moved it to 453 and
   cut the opening net from +12.3 to +5.3. It does not touch the pacing because
   missions cost nothing to run — gold was never the opponent's constraint on
   them. Worth doing one day to make a large roster a commitment; not worth
   doing as a balance lever, and not done.

**The idle-player benchmark is running out of road.** Measured across the same
eight seeds:

| | mean days |
|---|---|
| A2 as shipped (no recruitment) | 565 |
| Recruitment, all 8 ashore on day 1 | 352 |
| Recruitment, arrivals spread (shipped) | **449** |

The pattern to notice is not the number, it is the direction: every feature
added so far has made the *opponent* better at playing, while a player who does
nothing stays exactly as bad. A2 already had to withdraw one pacing target for
this reason. Spreading arrivals over the war recovered ~100 days and is right on
its own merits — eight strangers waiting on eight quays on day one is a
collection task, not a war — but it does not change the direction of travel.

Treat 449 as a measurement, not a target, and do not tune a good mechanic down
to protect it. What is actually needed before the next pacing decision is a
benchmark that plays the player's side with a simple policy, so the number
means "a fair fight" rather than "how fast a competent side beats an inert one".
That is the outstanding balance work.
