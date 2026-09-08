# Galactic Rebellion — Build Spec (Phase 1)

A real-time grand strategy game for the phone, modeled on the mechanics of
LucasArts' *Star Wars: Rebellion* (1998). Phase 1 delivers the galaxy map,
the real-time clock, the mine/refinery/maintenance economy, popular support
and control, and one mission type (Diplomacy). Everything else is roadmap.

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

### 4.2 Economy (per tick)
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
- Unpopulated system: controlled only while garrison ≥ 1. The moment you
  complete any facility there, it becomes populated with support 100/0 for you.

### 4.4 Building
- Construction yard builds: mine (cost 40 refined, 8 days), refinery (50, 10),
  construction_yard (120, 20), training_facility (80, 15), shipyard (150, 25).
- Training facility builds: troop regiment (25 refined, 5 days).
- A facility can hold one build order at a time. Refined is deducted at order time.
- Build targets must be a system you control; facilities need a free energy slot,
  mines need a free raw slot.

### 4.5 Diplomacy mission (the only mission in phase 1)
- Eligible target: neutral or friendly system, populated, not in uprising,
  not enemy-controlled.
- Travel time: 3 days within sector, 10 days across sectors.
- On arrival, mission "works" for 15 days, then resolves:
  - `successChance = 0.4 + diplomacy/200` (dip 50 → 65%; dip 90 → 85%)
  - Success: `support[you] += 8 + diplomacy/10`, `support[them] -= 4`.
  - Failure: no change.
  - **Foil check** (only on neutral systems): 10% base chance the mission is
    detected → character `injured` for 20 days.
- After resolving, the game asks: continue (another 15-day cycle) or return.
- Character ratings are hidden from the enemy; visible to you.

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

## 7. Roadmap (do NOT build yet)
- **Phase 2 — Fleets.** Capital ships, fighters, troop capacity, fleet
  movement, auto-resolved orbital combat with a summary card, assault to take
  systems by force (raises garrison requirement), blockades.
- **Phase 3 — Full missions & victory.** Espionage, Sabotage, Abduction,
  Incite/Subdue Uprising, Recruitment, Recon (probe units), Rescue, R&D.
  Foilers based on defending characters' espionage/combat. Command ranks
  (Admiral/General/Commander). Real victory: hold enemy HQ + capture two
  named leaders; Empire must *find* the hidden Alliance HQ.
- **Phase 4 — Polish & smarter AI.** Force-user tiers and training,
  superweapon, LLM-driven opponent via API, sound, animations.
