MASTER OF THE SEVEN SEAS — COMBAT MASTER FILE (v3)
19 Sep 2026. THE single authoritative reference for the entire naval combat system: rules, formulas, pricing system, full ship roster, derived combat stats, encyclopedia and art direction, and simulation results. Supersedes all prior roster sheets, combat docs, and the v2.4 JSON. Everything below is locked and calibrated against a 5,000-trial Monte Carlo engine (full 25x25 matchup matrix plus fleet, swarm, and retreat scenarios). Spelling is "Armor" throughout.

================================================================================
PART 1 — COMBAT SYSTEM RULES AND FORMULAS
================================================================================

PURPOSE
Automated naval combat inspired by Star Wars: Rebellion's strategic combat. Combat is not tactical: the player never controls individual ships, targets, or movement. The player makes one decision at a time — FIGHT or FLEE — re-offered after every Combat Exchange.

1. CANNON MODEL
There is no ship-level Firepower stat. One attack per individual cannon; a 46-gun heavy battery makes 46 separate attacks. Hit: roll d100 against final hit chance.
- Light Gun: 2d20 damage, 0% armor penetration, +10 accuracy.
- Long Gun: 2d20 damage, 25% armor penetration, +0 accuracy. Fires in the first-strike phase; the ONLY guns that fire on a fleeing fleet.
- Heavy Gun: 4d20 damage, 50% armor penetration, +0 accuracy. Armor-cracking is Heavy's signature alone.
FORMULAS: Effective armor = CEILING(Target Armor x (1 - Penetration)). Damage taken = MAX(0, rolled damage - effective armor). Round effective armor up before subtracting.
Design consequences: Light Guns cannot meaningfully hurt Armor 21+ (brig swarms bounce off ships of the line); Armor 25 vs 29 differ little against Heavy Guns (hull carries capitals).

2. COMBAT STRUCTURE
Player chooses FIGHT: snapshot each side's total Hull, then resolve consecutive internal rounds until either side has lost at least 30% of that snapshot or a fleet is destroyed — that is one Combat Exchange. Display the Battle Report (cumulative damage, ships destroyed, surviving hull, and an assessment: OVERWHELMINGLY FAVORABLE / FAVORABLE / EVEN / UNFAVORABLE / DESPERATE — never exact probabilities), then offer FIGHT AGAIN or FLEE.
Each internal round:
- Phase 1 — Long Guns: assign all Long Gun targets, roll all attacks, apply all damage simultaneously (both sides). Ships sunk in Phase 1 are removed and do not fire Phase 2.
- Phase 2 — Light + Heavy: assign every surviving Light and Heavy Gun as one combined firing solution, roll, apply all damage simultaneously (both sides).
Targets are always assigned before dice are rolled. No repair during combat; damage persists between rounds and after the battle. Mutual destruction is recorded analytically; the player-facing UI shows Defeat if the player's fleet is gone.

3. ACCURACY
Base hit chance 75%, clamped 10-95%. FORMULA: Final = 75 + gun base modifier + gun-vs-Size + gun-vs-Speed.
Gun base: Light +10; Long 0; Heavy 0.
Gun-vs-Size (Small/Medium/Large/Gigantic): Light 0/0/0/0; Long -10/-5/0/+10; Heavy -30/-15/0/+15.
Gun-vs-Speed (Slow/Normal/Fast/Very Fast): Light +5/0/-10/-20; Long +5/0/-15/-25; Heavy +10/0/-20/-35.
Size is a manual ship property, separate from Hull and Armor.

4. TARGETING (automatic, internal, never a visible stat)
For each gun/target pair: expected damage per shot = hit chance x expected post-armor damage. Expected shots to kill = CEILING(remaining Hull / expected damage per shot). Target threat = the target's expected next-volley output from its surviving cannons. Priority = threat / expected shots to kill. Assign each cannon to its highest-priority target; stop assigning to a target once expected assigned damage covers a kill (overkill control), then recalculate. EVERY GUN ALWAYS FIRES at its highest-priority target; guns never hold fire (no "cannot penetrate" exclusion — hopeless targets simply rank last). Unarmed transports are targeted only after armed ships. Break ties randomly.

5. RETREAT (Stern Rake sequence)
FLEE never fails, and only enemy LONG GUNS fire on a fleeing fleet, in up to four sequential volleys with escapes between them:
- Volley 1 at ALL fleeing ships -> resolve damage -> update status (including Speed, once component damage exists) -> surviving Very Fast ships escape.
- Volley 2 -> resolve -> update -> surviving Fast ships escape.
- Volley 3 -> resolve -> update -> surviving Normal ships escape.
- Volley 4 -> resolve -> update -> surviving Slow ships escape.
Every surviving pursuing Long Gun fires in each volley; targets re-assigned among still-exposed ships each volley; normal Long Gun accuracy vs Size/Speed applies.
STERN RAKE: retreat attacks IGNORE ARMOR (100% penetration) — raking fire down the exposed stern. Simmed v3 costs: early game 0% (no Long Guns yet); mid-game fleet ~16% of fleet hull; late-game slow fleet ~15%; a lone fleeing Majestic ~41%. Fallback dial if playtests show retreat too punishing: 50% penetration on retreat fire instead of 100%.
Component-damage hook: the "update status" step is where component damage will land — a ship knocked down a Speed class mid-retreat is caught by additional volleys. Component damage itself is outside the current model.

6. REPAIR
A between-battles stat only; never applied during combat. Meaning: recovery time — a 4% ship is back to full in ~25 days, a 0.5% ship is out for months ("a fleet arrives a fortnight later: what is your status?"). PLAYER DISPLAY: never show percentages. Repair displays as Slow (below 1.0%/day) / Normal (1.0%) / Fast (1.1-2.0%) / Very Fast (above 2.0%), always labeled (e.g. "REPAIR: Fast") since the vocabulary matches Speed. On-rate repair benchmark: 1.0% of Hull per day.

7. RNG PHILOSOPHY AND DETERMINISM
RNG lives at the individual attack level, never one roll per battle. With historical gun counts (~100 guns per side late game), variance averages out: capital duels are near-deterministic and same-class mirror duels end in mutual destruction ~50% of the time. Accepted; if playtests ever want messier capital fights, the lever is initiative or crew quality — never hull or gun counts. Small-ship fights retain real variance.

8. BOMBARDMENT
A strategic siege rating used against fortifications and locations only. It NEVER contributes to ship-to-ship damage; specialized ordnance may justify Bombardment without matching naval batteries.

9. UI PRINCIPLE
Back-end mechanics (tier bands, hit/accuracy math, pricing formulas, targeting internals) stay hidden from players, who learn by playing. Ship strengths and weaknesses are conveyed through natural in-world flavor text ("good against...", "shrugs off small guns"). Faction emblem sits in a consistent spot on ship sheets.

10. SIMULATION STANDARD
5,000 trials per matchup, every ship vs every ship (Swift mirror N/A). Record win/loss/mutual rates, internal rounds, Combat Exchanges, surviving hull, destruction probability, damage inflicted, retreat survival, cost efficiency. v3 pacing: mirrors ~8 internal rounds; capital duels 7-10 rounds. Re-run the matrix after any stat change; preserve ship identity before tuning numbers.

================================================================================
PART 2 — RATINGS & PRICING SYSTEM (formulas)
================================================================================

HISTORICAL BASIS (v3): gun counts follow the Royal Navy rating system — 1st rate 100-120 guns / 2nd rate 90-98 / 3rd rate 64-80 (the 74) / 4th rate 48-60 / 5th-rate frigate 32-44 / 6th rate 20-28 / sloop-of-war 16-18 / gun-brig and cutter 6-14.

CAPABILITY TIER BANDS (v3):
Long Guns:  T0 0 / T1 1-6 / T2 7-13 / T3 14-24 / T4 25+
Heavy Guns: T0 0 / T1 1-3 / T2 4-13 / T3 14-27 / T4 28+
Light Guns: T0 0 / T1 1-6 / T2 7-16 / T3 17-27 / T4 28+
Armor:      T0 0 (None) / T1 1-10 (Light) / T2 11-20 (Medium) / T3 21-25 (Heavy) / T4 26-29 (Heavy+) / T4+ 30 (Maximum)
Hull (v3):  T0 0 / T1 1-999 / T2 1,000-1,999 / T3 2,000-4,499 / T4 4,500-9,999 / T4+ 10,000+
Bombardment: T0 0 / T1 1 / T2 2-3 / T3 4-6 / T4 7+
Troops:      T0 0 / T1 1-2 / T2 3-5 / T3 6-9 / T4 10+

POINTS: T0 0 / T1 1 / T2 2 / T3 4 / T4 7 / T4+ 10.
GUN OUTPUT MULTIPLIERS on gun points: Light x1.0 / Long x1.25 / Heavy x2.5 (measured post-armor output per shot: Light 6.2, Long 6.2, Heavy 20.3 — Heavy pays for damage; Long's premium pays for first strike and retreat fire).
Speed points: None 0 / Slow 1 / Normal 2 / Fast 3 / Very Fast 5. Repair points: <0.5% 0 / 0.5-0.9% 1 / 1.0% 2 / 1.1-2.0% 3 / >2.0% 5.

PRICING PROCESS:
1. Weighted capability points x 25 gold = Base Reference Cost.
2. Add automatic synergies (+10% each, cap +50%): Mobile firepower (Fast/VF + a T3+ gun battery); Pursuit hunter (Fast/VF + T2+ Long); Fortress package (T3+ Armor and T3+ Hull); Regenerative defense (above-rate Repair + T2+ Armor or Hull); Independent raider (Fast/VF + Troops + Bombardment); Invasion package (T2+ Troops + T2+ Bombardment); Combined-arms battery (T2+ Long, Heavy, and Light); Broad utility (4+ meaningful T2+ capabilities incl. Fast+ speed or above-rate Repair); Capital concentration +20% (3+ T4/T4+ capabilities).
3. Subtract automatic weaknesses (cap -25%): Glass hull -15% (no Armor + T1 Hull); Slow without reach -10% (Slow + no Long Guns); Unscreened heavy hull -5% (T3+ Armor or Hull + no Light Guns); Poor recovery -10% (below-rate Repair on T3+ Armor or Hull). A zero stat alone is never a discount.
4. Capital scaling on UNWEIGHTED points: +20% at 30-39, +40% at 40-49, +60% at 50+. Round to nearest 5 gold.
5. Price Ratio = Actual Build Cost / Scaled Reference Cost. Ratings: S (Value Monster) <55% / A 55-74% / B 75-89% / C 90-110% / D 111-135% / F >135%.
Every ship keeps its confirmed v2 purchase-value letter by design; each S-tier carries a control valve (e.g. Marauder pays ~200% baseline upkeep).

ECONOMY BASELINES: Maintenance on-rate = ceil(1% of build gold) per day (maintenance controls fleet quantity). Build time on-rate = 1 day per gold. Gun sanity check: raw gun count x 50 gold remains a secondary armament-density check only.

================================================================================
PART 3 — SHIP ROSTER (v3): STATS, ECONOMY, RATINGS, SIM PERFORMANCE
================================================================================

THE THREE CROWNS — Hull: Urskin Goliath 14,000 (largest in the game). Armor: Majestic 30 (the game's only Maximum). Firepower: Coral-Class Dreadnaught (102 guns, broadside 3,192, highest in the game while leading no single category). Category crowns: Long = Majestic 30; Heavy = Sovereign II 52; Light = Blackfin 29.

--- WAYFINDER (CWN-WAY-S01) ---
Crown Imperium | Research S01 | Armed survey ship (8)
Speed Normal | Size Medium | Guns: 0 Long / 0 Heavy / 8 Light = 8 total | Armor 0 | Hull 1400
Bombardment 0 | Troops 4 | Repair 1.0% (displays: Normal) | Avg raw volley 168
Economy: 140 gold | 90 days to build | 2.2 gold/day maintenance | Reference cost 250 | Price ratio 56.0% | Rating A — Very Above Rate
Sim: mean 1v1 win rate 12.7% across the roster
Design note: Armed survey ship, 8 light guns, 4 troops. Low-threat strategic transport; its modest combat profile reduces targeting priority and protects embarked forces.

--- INTERCEPTOR I (CWN-INT-S02) ---
Crown Imperium | Research S02 | Cutter (10)
Speed Very Fast | Size Small | Guns: 0 Long / 0 Heavy / 10 Light = 10 total | Armor 0 | Hull 500
Bombardment 0 | Troops 0 | Repair 1.0% (displays: Normal) | Avg raw volley 210
Economy: 140 gold | 40 days to build | 2.0 gold/day maintenance | Reference cost 210 | Price ratio 66.7% | Rating A — Very Above Rate
Sim: mean 1v1 win rate 4.6% across the roster
Design note: 10-gun cutter, Very Fast, no armor. Cheap enough to swarm; the only early Crown hull fast enough to run down scouts.

--- MORNINGSTAR (CWN-MOR-S03) ---
Crown Imperium | Research S03 | 4th rate (50)
Speed Slow | Size Large | Guns: 0 Long / 26 Heavy / 24 Light = 50 total | Armor 24 | Hull 3300
Bombardment 6 | Troops 0 | Repair 0.5% (displays: Slow) | Avg raw volley 1596
Economy: 675 gold | 175 days to build | 20.0 gold/day maintenance | Reference cost 630 | Price ratio 107.1% | Rating C — On Rate
Sim: mean 1v1 win rate 66.6% across the roster
Design note: 50-gun fourth rate: 26 heavy, 24 light. Powerful, Slow, poor repair, brutal upkeep — deliberately inefficient.

--- SOVEREIGN (CWN-SOV-S04) ---
Crown Imperium | Research S04 | 3rd rate (74)
Speed Slow | Size Gigantic | Guns: 0 Long / 46 Heavy / 28 Light = 74 total | Armor 25 | Hull 4600
Bombardment 6 | Troops 6 | Repair 1.0% (displays: Normal) | Avg raw volley 2520
Economy: 1940 gold | 700 days to build | 48.5 gold/day maintenance | Reference cost 1815 | Price ratio 106.9% | Rating C — On Rate
Sim: mean 1v1 win rate 83.1% across the roster
Design note: 74-gun third rate: 46 heavy, 28 light, 6 troops, Bombardment 6. Rate decides: no frigate or brig swarm threatens it, and its price now says so.

--- VANGUARD (CWN-VAN-R1-01) ---
Crown Imperium | Research R1 | 6th rate (28)
Speed Normal | Size Large | Guns: 0 Long / 10 Heavy / 18 Light = 28 total | Armor 18 | Hull 1900
Bombardment 3 | Troops 0 | Repair 2.5% (displays: Very Fast) | Avg raw volley 798
Economy: 275 gold | 160 days to build | 9.2 gold/day maintenance | Reference cost 660 | Price ratio 41.7% | Rating S — Value Monster
Sim: mean 1v1 win rate 52.1% across the roster
Design note: 28-gun sixth rate: 10 heavy, 18 light. The efficient cruiser and proven screen.

--- RESOLUTE (CWN-RES-R2-01) ---
Crown Imperium | Research R2 | Sloop-of-war (18)
Speed Fast | Size Medium | Guns: 0 Long / 4 Heavy / 14 Light = 18 total | Armor 8 | Hull 1100
Bombardment 1 | Troops 1 | Repair 2.0% (displays: Fast) | Avg raw volley 462
Economy: 350 gold | 50 days to build | 8.2 gold/day maintenance | Reference cost 540 | Price ratio 64.8% | Rating A — Very Above Rate
Sim: mean 1v1 win rate 26.6% across the roster
Design note: 18-gun sloop-of-war. Fast multirole workhorse with rapid construction and inefficient upkeep.

--- BULWARK (CWN-BUL-R3-01) ---
Crown Imperium | Research R3 | 4th rate (50)
Speed Slow | Size Large | Guns: 12 Long / 38 Heavy / 0 Light = 50 total | Armor 25 | Hull 3600
Bombardment 3 | Troops 3 | Repair 0.5% (displays: Slow) | Avg raw volley 1848
Economy: 1140 gold | 340 days to build | 36.2 gold/day maintenance | Reference cost 890 | Price ratio 128.1% | Rating D — Below Rate
Sim: mean 1v1 win rate 76.3% across the roster
Design note: 50-gun defensive fourth rate: 12 long, 38 heavy, no lights. Holds narrow channels; introduces Crown Long Guns.

--- VANGUARD II (CWN-VAN-R4-02) ---
Crown Imperium | Research R4 | 5th rate frigate (44)
Speed Normal | Size Large | Guns: 0 Long / 19 Heavy / 25 Light = 44 total | Armor 24 | Hull 2900
Bombardment 4 | Troops 0 | Repair 3.0% (displays: Very Fast) | Avg raw volley 1323
Economy: 550 gold | 150 days to build | 12.0 gold/day maintenance | Reference cost 1070 | Price ratio 51.4% | Rating S — Value Monster
Sim: mean 1v1 win rate 62.5% across the roster
Design note: 44-gun heavy frigate: 19 heavy, 25 light, exceptional repair. Best frigate afloat — and still a frigate: it does not fight 74s.

--- INTERCEPTOR II (CWN-INT-R5-02) ---
Crown Imperium | Research R5 | Corvette (22)
Speed Very Fast | Size Small | Guns: 8 Long / 0 Heavy / 14 Light = 22 total | Armor 14 | Hull 1000
Bombardment 0 | Troops 0 | Repair 1.0% (displays: Normal) | Avg raw volley 462
Economy: 245 gold | 85 days to build | 11.2 gold/day maintenance | Reference cost 465 | Price ratio 52.7% | Rating S — Value Monster
Sim: mean 1v1 win rate 36.8% across the roster
Design note: 22-gun corvette: 8 long chase guns, 14 lights, Very Fast. Elite pursuit hunter; beats every raider and Blackfin.

--- JUSTICIAR (CWN-JUS-R6-01) ---
Crown Imperium | Research R6 | 3rd rate (74)
Speed Normal | Size Large | Guns: 21 Long / 25 Heavy / 28 Light = 74 total | Armor 22 | Hull 4200
Bombardment 3 | Troops 0 | Repair 2.0% (displays: Fast) | Avg raw volley 2079
Economy: 850 gold | 170 days to build | 23.5 gold/day maintenance | Reference cost 1555 | Price ratio 54.7% | Rating S — Value Monster
Sim: mean 1v1 win rate 74.7% across the roster
Design note: 74-gun fast third rate: 21 long, 25 heavy, 28 light. Offensive backbone; no troops, pure naval aggression.

--- SOVEREIGN II (CWN-SOV-R7-02) ---
Crown Imperium | Research R7 | 2nd rate (90)
Speed Normal | Size Gigantic | Guns: 20 Long / 52 Heavy / 18 Light = 90 total | Armor 28 | Hull 6100
Bombardment 8 | Troops 9 | Repair 1.5% (displays: Fast) | Avg raw volley 2982
Economy: 1450 gold | 495 days to build | 31.1 gold/day maintenance | Reference cost 2965 | Price ratio 48.9% | Rating S — Value Monster
Sim: mean 1v1 win rate 87.5% across the roster
Design note: 90-gun second rate carrying the game's largest heavy battery (52); 9 troops. Mobile assault super-capital.

--- MAJESTIC (CWN-MAJ-R8-01) ---
Crown Imperium | Research R8 | 1st rate (104)
Speed Slow | Size Gigantic | Guns: 30 Long / 46 Heavy / 28 Light = 104 total | Armor 30 | Hull 13900
Bombardment 12 | Troops 12 | Repair 1.0% (displays: Normal) | Avg raw volley 3150
Economy: 2610 gold | 1045 days to build | 52.2 gold/day maintenance | Reference cost 4215 | Price ratio 61.9% | Rating A — Very Above Rate
Sim: mean 1v1 win rate 99.4% across the roster
Design note: 104-gun first rate — ARMOR CROWN (Maximum 30, unique) and largest long-gun battery (30). Strongest single ship; any pair of Confederate capitals sinks it. 1,045 days and ruinous upkeep.

--- SWIFT (CFS-SWI-S01) ---
Free Confederacy | Research S01 | Dispatch schooner (0)
Speed Very Fast | Size Small | Guns: 0 Long / 0 Heavy / 0 Light = 0 total | Armor 0 | Hull 350
Bombardment 0 | Troops 0 | Repair 1.0% (displays: Normal) | Avg raw volley 0
Economy: 140 gold | 40 days to build | 0.5 gold/day maintenance | Reference cost 170 | Price ratio 82.4% | Rating B — Above Rate
Sim: mean 1v1 win rate 0.0% across the roster
Design note: Unarmed dispatch schooner. Pure reconnaissance and map control.

--- BRIGANTINE (CFS-BRI-S02) ---
Free Confederacy | Research S02 | Gun-brig (6)
Speed Fast | Size Medium | Guns: 0 Long / 0 Heavy / 6 Light = 6 total | Armor 0 | Hull 1100
Bombardment 0 | Troops 2 | Repair 1.5% (displays: Fast) | Avg raw volley 126
Economy: 250 gold | 45 days to build | 1.0 gold/day maintenance | Reference cost 275 | Price ratio 90.9% | Rating C — On Rate
Sim: mean 1v1 win rate 6.8% across the roster
Design note: 6-gun brig, retrofitted merchant. The Confederacy's starting trooper; superseded as a fighter once Marauder unlocks.

--- CHIMERA (CFS-CHI-S03) ---
Free Confederacy | Research S03 | Improvised 6th rate (20)
Speed Slow | Size Medium | Guns: 0 Long / 6 Heavy / 14 Light = 20 total | Armor 18 | Hull 1700
Bombardment 1 | Troops 0 | Repair 0.5% (displays: Slow) | Avg raw volley 546
Economy: 275 gold | 240 days to build | 5.4 gold/day maintenance | Reference cost 315 | Price ratio 87.3% | Rating B — Above Rate
Sim: mean 1v1 win rate 41.7% across the roster
Design note: 20-gun improvised sixth rate from salvage: 6 heavy, 14 light, Medium armor. Hard to sink, awful to maintain.

--- TIDESTALKER (CFS-TID-S04) ---
Free Confederacy | Research S04 | Sloop-of-war (18)
Speed Normal | Size Medium | Guns: 0 Long / 0 Heavy / 18 Light = 18 total | Armor 6 | Hull 1400
Bombardment 0 | Troops 0 | Repair 4.0% (displays: Very Fast) | Avg raw volley 378
Economy: 290 gold | 290 days to build | 3.5 gold/day maintenance | Reference cost 385 | Price ratio 75.3% | Rating B — Above Rate
Sim: mean 1v1 win rate 21.6% across the roster
Design note: 18-gun living-coral sloop, 4% regeneration. Wins by still being whole next fortnight.

--- MARAUDER (CFS-MAR-R1-01) ---
Free Confederacy | Research R1 | Raiding brig (14)
Speed Fast | Size Small | Guns: 0 Long / 0 Heavy / 14 Light = 14 total | Armor 0 | Hull 800
Bombardment 1 | Troops 2 | Repair 1.0% (displays: Normal) | Avg raw volley 294
Economy: 135 gold | 45 days to build | 2.3 gold/day maintenance | Reference cost 295 | Price ratio 45.8% | Rating S — Value Monster
Sim: mean 1v1 win rate 15.1% across the roster
Design note: 14-gun raiding brig, ALL light guns — brigs carry no heavy smashers. S-tier price with a 200% upkeep valve. Preys on transports and trade; cannot crack Armor 21+; raid, land troops, burn, flee.

--- CUTLASS (CFS-CUT-R2-01) ---
Free Confederacy | Research R2 | Corvette (20)
Speed Normal | Size Small | Guns: 0 Long / 6 Heavy / 14 Light = 20 total | Armor 7 | Hull 950
Bombardment 0 | Troops 0 | Repair 1.0% (displays: Normal) | Avg raw volley 546
Economy: 170 gold | 55 days to build | 5.0 gold/day maintenance | Reference cost 325 | Price ratio 52.3% | Rating S — Value Monster
Sim: mean 1v1 win rate 21.8% across the roster
Design note: 20-gun corvette: 6 heavy, 14 light. The Confederacy's conventional small warship.

--- TEMPEST (CFS-TEM-R3-01) ---
Free Confederacy | Research R3 | Light frigate (26)
Speed Fast | Size Medium | Guns: 12 Long / 5 Heavy / 9 Light = 26 total | Armor 18 | Hull 1500
Bombardment 3 | Troops 3 | Repair 1.0% (displays: Normal) | Avg raw volley 651
Economy: 295 gold | 75 days to build | 8.0 gold/day maintenance | Reference cost 845 | Price ratio 34.9% | Rating S — Value Monster
Sim: mean 1v1 win rate 50.7% across the roster
Design note: 26-gun light frigate: 12 long, 5 heavy, 9 light, Fast, 3 troops, Bombardment 3. Introduces Confederate Long Guns.

--- URSKIN WHALER (CFS-URW-R3-01) ---
Free Confederacy | Research R3 | Armed whaler (18)
Speed Normal | Size Medium | Guns: 0 Long / 6 Heavy / 12 Light = 18 total | Armor 16 | Hull 2200
Bombardment 1 | Troops 2 | Repair 1.0% (displays: Normal) | Avg raw volley 504
Economy: 445 gold | 120 days to build | 6.7 gold/day maintenance | Reference cost 475 | Price ratio 93.7% | Rating C — On Rate
Sim: mean 1v1 win rate 45.6% across the roster
Design note: 18-gun armed whaler on a broad working hull: 6 heavy, 12 light, iron-and-bone belt. Durable mixed-battery troop escort; harpoon ballistae are cultural deck gear, not naval guns.

--- REEFWARDEN (CFS-REE-R4-01) ---
Free Confederacy | Research R4 | Heavy frigate (44)
Speed Normal | Size Large | Guns: 0 Long / 28 Heavy / 16 Light = 44 total | Armor 24 | Hull 3400
Bombardment 0 | Troops 4 | Repair 2.5% (displays: Very Fast) | Avg raw volley 1512
Economy: 1025 gold | 730 days to build | 7.3 gold/day maintenance | Reference cost 1185 | Price ratio 86.5% | Rating B — Above Rate
Sim: mean 1v1 win rate 70.5% across the roster
Design note: 44-gun coral heavy frigate: 28 heavy, 16 light, Armor 24, strong repair. Beats Crown frigates 100-0; still a frigate — screens against, never hunts, the line.

--- IRONBACK (CFS-IRB-R5-01) ---
Free Confederacy | Research R5 | Razee siege ship (28)
Speed Slow | Size Large | Guns: 26 Long / 2 Heavy / 0 Light = 28 total | Armor 25 | Hull 3800
Bombardment 8 | Troops 0 | Repair 0.5% (displays: Slow) | Avg raw volley 630
Economy: 850 gold | 260 days to build | 24.0 gold/day maintenance | Reference cost 670 | Price ratio 126.9% | Rating D — Below Rate
Sim: mean 1v1 win rate 58.3% across the roster
Design note: Razee siege ship: 26 long guns on a cut-down captured two-decker, Bombardment 8. A fortress-cracker that loses at sea by design.

--- BLACKFIN (CFS-BLA-R6-01) ---
Free Confederacy | Research R6 | Carronade corvette (29)
Speed Fast | Size Medium | Guns: 0 Long / 0 Heavy / 29 Light = 29 total | Armor 5 | Hull 1400
Bombardment 0 | Troops 0 | Repair 1.5% (displays: Fast) | Avg raw volley 609
Economy: 500 gold | 80 days to build | 5.0 gold/day maintenance | Reference cost 480 | Price ratio 104.2% | Rating C — On Rate
Sim: mean 1v1 win rate 33.5% across the roster
Design note: 29-gun carronade corvette — LIGHT-GUN CROWN. One-rounds raiders and scouts; harmless against Heavy armor. Signature: the tall black mainsail.

--- URSKIN GOLIATH (CFS-URG-R7-01) ---
Free Confederacy | Research R7 | Leviathan conversion (64)
Speed Slow | Size Gigantic | Guns: 24 Long / 40 Heavy / 0 Light = 64 total | Armor 25 | Hull 14000
Bombardment 6 | Troops 9 | Repair 1.0% (displays: Normal) | Avg raw volley 2184
Economy: 1600 gold | 600 days to build | 16.0 gold/day maintenance | Reference cost 1640 | Price ratio 97.6% | Rating C — On Rate
Sim: mean 1v1 win rate 91.7% across the roster
Design note: 64-gun leviathan conversion on the game's LARGEST HULL (14,000): 24 long, 40 heavy, 9 troops, Bombardment 6. The Confederate brawler; no lights — screen it.

--- CORAL-CLASS DREADNAUGHT (CFS-COR-R8-01) ---
Free Confederacy | Research R8 | Living dreadnaught (102)
Speed Normal | Size Gigantic | Guns: 25 Long / 50 Heavy / 27 Light = 102 total | Armor 29 | Hull 11700
Bombardment 6 | Troops 4 | Repair 4.0% (displays: Very Fast) | Avg raw volley 3192
Economy: 2200 gold | 900 days to build | 18.0 gold/day maintenance | Reference cost 3165 | Price ratio 69.5% | Rating A — Very Above Rate
Sim: mean 1v1 win rate 95.9% across the roster
Design note: 102-gun living dreadnought — FIREPOWER CROWN (broadside 3,192, leading no category): 25 long, 50 heavy, 27 light, Armor 29, 4% regeneration, Normal speed. Beats Goliath 100-0; loses to Majestic; back to full in ~25 days.

================================================================================
PART 4 — ENCYCLOPEDIA & ART DIRECTION (verbatim from the Lore & Visual Identity tab)
================================================================================

Canon sources: Art Direction Guide v2.2, Naval Art Master v2.0, Faction Sigils guide, current lore document. Visual plausibility rule: every ship begins with recognizable Age-of-Sail naval engineering — one continuous keel, believable displacement and beam, coherent decks and gunports, physically supported masts and rigging, weapons that fit the hull. Fantasy comes from faction materials, culture, and Tidecraft. Never use Earth pirate iconography (no skull-and-crossbones / jolly roger); factions fly their own sigils. NOTE: encyclopedia entries below are canon flavor; where an entry names a specific stat or tier, the v3 roster in Part 3 is authoritative.

--- WAYFINDER ---
Encyclopedia: Wayfinders carry the people who make an Imperial claim real: chartmakers, engineers, clerks, marines and the brass-bound survey chests from which new harbors are measured. They are not glamorous ships, but an island that sees one at anchor knows that roads, tariffs and seawalls will follow. Their captains are chosen for patience rather than daring, and a Wayfinder’s broad decks often become the first orderly ground in an unfamiliar Reach.
Visual identity: A prosperous naval packet turned expeditionary troop caravan: welcoming at first glance, unmistakably administrative on the second.
Silhouette signature: Broad, high-sided three-masted packet with a long covered waist, square stern, paired boat cranes and a relatively small battery.
Construction & materials: Refined oak, black-iron knees, bright copper sheathing below the waterline and modular deckhouses built to regulation dimensions.
Sail plan & palette: Warm-ivory square sails with narrow botanical-green edge bands; one clear Crown emblem on the mainsail.
Signature detail: Paired brass survey lanterns and a stern gallery shaped like a chart cabinet.
Preferred art scene: Calm turquoise water approaching an uncharted island at clear morning light, launches ready but no battle.
Distinctness guardrail: Do not make it a war galleon or a humble merchant tub; its identity is organized exploration and troop carriage.

--- INTERCEPTOR I ---
Encyclopedia: The Interceptor began as an Admiralty answer to smugglers that could outrun every ship sent after them: remove everything that does not help the chase, then train crews to accept what remains. It carries no armor and almost no comfort. Hammocks are struck before action, meals are taken on deck, and the ship’s carpenters joke that the rigging is the strongest part of the hull. What it catches, it can harry; what catches it usually destroys it.
Visual identity: A regulation pursuit cutter pushed to the edge of safety—clean, elegant and visibly fragile.
Silhouette signature: Knife-thin low hull, sharply raked bow, two raked masts and an outsized spread of fore-and-aft canvas.
Construction & materials: Light selected timber, minimal bulwarks, exposed black-iron braces and only a narrow copper strip at the waterline.
Sail plan & palette: Ivory canvas with one green pursuit pennant and a small Crown emblem; no elite green sails.
Signature detail: A long brass speaking trumpet fixed beside the forward light-gun battery.
Preferred art scene: Heeled hard in bright wind while cutting across a smuggler’s wake; open sea and lots of breathing room.
Distinctness guardrail: Do not bulk up the hull or add heavy guns; it must look fast enough to be dangerous to its own crew.

--- MORNINGSTAR ---
Encyclopedia: Morningstars were laid down during an emergency rearmament, when Highwater demanded heavy guns sooner than its yards could design a proper ship around them. The result is brutally effective and famously inelegant: a deep hull, too much iron, too little sail and a battery that makes the whole vessel shudder like a struck bell. Sailors say dawn begins when a Morningstar fires, because every sleeping thing in the harbor wakes at once.
Visual identity: An overbuilt early-war weapons platform: formidable, expensive, slow and slightly ashamed of its own proportions.
Silhouette signature: Large, deep-bellied hull with a blunt bow, squat three-mast rig, low armored gun deck and unusually broad beam.
Construction & materials: Heavy oak frames, dense black-iron strapping, thick copper plates and practical fittings with little decorative work.
Sail plan & palette: Short warm-ivory sails with restrained green panels; one oversized Crown emblem compensating for the ungainly hull.
Signature detail: A starburst pattern of iron reinforcing bolts around the heavy-gun ports.
Preferred art scene: Firing a thunderous broadside at first light, smoke rolling low over orderly water.
Distinctness guardrail: Do not make it sleek, graceful or endgame-grand; its charm is that the Admiralty solved urgency with mass.

--- SOVEREIGN ---
Encyclopedia: A Sovereign is less a ship than a moving piece of government. Its troop decks carry marines, magistrates and enough stores to occupy a harbor before the ink on its surrender dries. Its high stern houses a chapel, signal room and the clerks who record every shell fired in the Crown’s name. Islanders fear its guns, but it is the rows of identical landing boats that tell them the Imperium intends to stay.
Visual identity: A ceremonial assault capital whose imposing symmetry turns conquest into administration.
Silhouette signature: Gigantic three-decker with a tall tiered stern, broad forecastle, three powerful masts and orderly rows of landing boats.
Construction & materials: First-rate oak, black iron, antique brass, broad copper sheathing and formal stern galleries built like Highwater civic architecture.
Sail plan & palette: Warm-ivory sail plan with deep-green lower panels and one prominent Crown emblem; not yet an elite all-green rig.
Signature detail: A perfectly aligned rack of identical green-and-ivory landing boats along both quarters.
Preferred art scene: Entering a fortified harbor under disciplined sail, marines mustering on deck in warm afternoon light.
Distinctness guardrail: Do not turn it into Majestic; Sovereign is heavier, older and more administrative, with a taller stern and less elegance.

--- VANGUARD ---
Encyclopedia: The Vanguard was the first Crown design to ask what a warship needed rather than what tradition expected it to carry. Shipwrights lowered the stern, simplified the galleries and put every saved ton into useful guns and stronger frames. Older admirals called it plain. Younger captains called it the first ship that answered the helm exactly as drawn. It became the standard by which later Imperial fighting ships were measured.
Visual identity: The Crown’s first modern general-purpose gunship: balanced, efficient and almost austere.
Silhouette signature: Long, low two-decker with a clean sheer line, modest stern, three evenly spaced masts and an uncluttered gun deck.
Construction & materials: Standardized oak sections, flush black-iron reinforcement, mature copper sheathing and repeatable fittings.
Sail plan & palette: Ivory sails, disciplined green accents and one medium Crown emblem centered on the mainsail.
Signature detail: A gold-painted measuring line running arrow-straight from bow to stern just below the rail.
Preferred art scene: Leading a small line of battle through clear blue water; the featured hull remains dominant.
Distinctness guardrail: Do not exaggerate any one feature; Vanguard’s recognizable feature is disciplined balance.

--- RESOLUTE ---
Encyclopedia: Resolutes are built in more yards, crewed by more islands and assigned more kinds of duty than any other Crown warship. A captain may escort merchants on Monday, chase raiders on Wednesday and deliver a governor by Sunday. Their ivory sails carry standardized green corner flashes so convoys can recognize help at a distance, while paired brass chronometers behind the stern windows are set together before every departure. Crews claim a Resolute is never late; it merely arrives before the Admiralty has finished explaining why it was needed. The class earned its name not through one famous battle, but by repeatedly reaching waters where the enemy believed a proper warship could not arrive in time.
Visual identity: A fast standardized frigate—the dependable working face of Imperial sea power.
Silhouette signature: Medium, fine-ended frigate with one continuous gun deck, long bowsprit, three raked masts and a low rounded stern.
Construction & materials: Lean oak framing, carefully faired copper bottom, compact black-iron armor plates and interchangeable spars.
Sail plan & palette: Ivory canvas with strong green diagonal corner flashes; one crisp Crown emblem.
Signature detail: Matching brass chronometers visible through paired stern windows, symbolizing punctuality.
Preferred art scene: Running fast beside a merchant convoy beneath a large blue sky and warm sunlight.
Distinctness guardrail: Do not make it a tiny interceptor or a heavy line ship; it is the fleet’s versatile middle weight.

--- BULWARK ---
Encyclopedia: Bulwarks are sent where the line must not move. Their heavy sides and long guns let them hold narrow channels while lighter ships maneuver behind them. They are miserable in a chase and vulnerable to small craft that slip under the great guns, facts their crews acknowledge with the fatalism of fixed-battery crews. A Bulwark at anchor lies so low and broad across the water that harbor pilots navigate around it like a breakwater.
Visual identity: A low floating naval battery with sails: broad, horizontal, brutally practical and built to own a piece of water.
Silhouette signature: Long slab-sided armored hull, extremely broad beam, low continuous weather deck, reduced rig, reinforced bow and stern, and four projecting corner gun casemates. No towers or castle architecture.
Construction & materials: Massive oak, overlapping black-iron armor bands, dark aged copper and thick brass gunport frames.
Sail plan & palette: A reduced, low-profile ivory rig with dark green reefing bands and one restrained Crown emblem.
Signature detail: Four long-gun casemates project directly from the hull corners, giving the ship overlapping fields of fire.
Preferred art scene: Anchored low across a narrow strait in clear natural daylight, with lighter Crown ships maneuvering behind it.
Distinctness guardrail: Keep every feature horizontal and naval. No towers, battlements, spires, palace windows or castle-like superstructure.

--- VANGUARD II ---
Encyclopedia: The second Vanguard keeps the proportions that made the original successful and replaces every compromise the first design accepted. The gun deck is stronger, the armor better fitted and the rig tuned by a generation of captains’ reports. To the public, its green sails announce progress. To a shipwright, the family resemblance is clearer in the unchanged run of the hull: the Admiralty improving a trusted answer rather than chasing novelty.
Visual identity: A visibly evolved Vanguard—same disciplined bones, now armored, elite and confidently refined.
Silhouette signature: The Vanguard’s long low two-decker silhouette, but with a clipped stern, heavier waist, finer bow and taller precisely balanced rig.
Construction & materials: Improved standardized frames, fitted armor plates, bright maintained copper and sophisticated brass-and-black-iron detailing.
Sail plan & palette: Deep botanical-green elite sails with antique-gold edging and exactly two subtle Crown emblems.
Signature detail: A narrow gold chevron repeated at bow and stern, marking the second-generation frame.
Preferred art scene: Cutting through rougher water at speed with the older Vanguard’s line unmistakable in its profile.
Distinctness guardrail: Do not invent a new family; the viewer must recognize Vanguard first and the upgrade second.

--- INTERCEPTOR II ---
Encyclopedia: The second Interceptor is what happens when the Admiralty refuses to choose between pursuit craft and warship. Its enlarged frame carries long chase guns, a dense light battery and just enough armor to survive the first answer. It remains brutally cramped and ruinously expensive to maintain. Green sails make it look aristocratic from shore; aboard, every passage is filled with ammunition and every meal is eaten beside a gun.
Visual identity: An elite pursuit predator: the knife shape of Interceptor I wrapped in brass, armor and far too many weapons.
Silhouette signature: Small but lengthened cutter-brig with the original knife bow, three sharply raked masts, towering green canvas and forward chase-gun housings.
Construction & materials: Fine timber over a compact armored spine, polished copper, black-iron gun rails and precise brass rigging hardware.
Sail plan & palette: Full deep-green elite sail plan, antique-gold trim and exactly two subtle Crown emblems.
Signature detail: Five long chase-gun muzzles grouped into the sharp bow like a formal dueling pistol case.
Preferred art scene: Exploding out of sea mist in hard sunlight, closing rapidly on a distant fleeing target.
Distinctness guardrail: Do not make it large or comfortable; despite elite fittings it must still read as a dangerously crowded interceptor.

--- JUSTICIAR ---
Encyclopedia: Justiciars carry no colonists, governors or comforting fiction about their purpose. Each is designed as a firing solution made into a ship. A narrow antique-gold Judgment Axis runs from the low armored command pavilion toward a stepped sequence of Long Guns, while Heavy Guns sit behind the black-framed central battery and Light Guns guard every quarter. Before opening fire, the crew strikes the bronze Verdict Bell once—the formal declaration that a target has been selected. The vessel carries no figurehead and offers its captain no ceremonial balcony. Even within the Crown, the class inspires unease: immaculate ivory sails with severe green stripes advance through the smoke, the bell sounds, and lawful procedure becomes overwhelming violence.
Visual identity: A pure offensive warship whose ordered geometry makes aggression look procedural.
Silhouette signature: Large long-hulled three-mast warship with stepped batteries, a low armored command pavilion and weapons visibly covering bow, beam and quarter.
Construction & materials: Dense but clean Imperial framing, fitted black-iron armor, copper bottom and minimal decorative sternwork.
Sail plan & palette: Ivory upper sails over dark green courses; one severe, simplified Crown emblem.
Signature detail: A straight antique-gold sighting rail runs along the centerline of the command deck.
Preferred art scene: Advancing through drifting battle smoke with all three weapon tiers visibly represented but physically plausible.
Distinctness guardrail: Do not add troop boats, cargo gear or palace-like galleries; Justiciar is a weapon, not a moving government.

--- SOVEREIGN II ---
Encyclopedia: The second Sovereign preserves the first class’s ability to carry an invasion, but abandons the towering architecture that made its ancestor slow. Its stern is lower, its run longer and its internal administration hidden behind armored bulkheads. It can arrive with the line rather than after it. Admiralty pamphlets call it proof that order can learn; old Sovereign captains call it a palace taught to hunt.
Visual identity: A mobile assault super-capital: recognizable Sovereign grandeur made lower, longer and more dangerous.
Silhouette signature: Gigantic three-decker with the Sovereign’s broad shoulders and landing-boat rhythm, but a streamlined stern, longer bow and four balanced masts.
Construction & materials: Elite fitted armor, refined oak, immaculate copper, black iron and extensive antique-gold command detailing.
Sail plan & palette: Deep botanical-green elite sails with gold edges and exactly two subtle Crown emblems.
Signature detail: Nine identical assault launches recessed behind flush green-and-gold side doors.
Preferred art scene: Leading an amphibious landing at golden hour while still under full sail.
Distinctness guardrail: Do not lose the Sovereign family’s troop-carrying identity or make it visually larger than Majestic.

--- MAJESTIC ---
Encyclopedia: Majestic is the Admiralty’s final argument made timber, iron and canvas: fortress, flagship, invasion carrier and national ceremony in a single immense hull. Its rare pale-golden masts are bound with gilded iron and carry Crowned Imperial Battle Sails found on no other vessel—luminous ivory canvas framed in botanical green, stitched with restrained gold and bearing only two small seals of authority. The rig is opulent because it is perfectly made, not because it abandons naval physics. Decks broad enough for formal parade conceal magazines, assault launches and batteries capable of erasing a harbor. Yet Majestic is not a floating palace. Every gallery, mast and ornament serves the ship, making overwhelming power look like the inevitable achievement of civilization.
Visual identity: The ultimate Crown ship: immense, cathedral-like in order rather than fantasy, and beautiful enough to make power persuasive.
Silhouette signature: Longest and tallest hull in the fleet, four stately masts, three disciplined battery tiers, sweeping bow and a broad symmetrical stern gallery.
Construction & materials: The finest Imperial oak, maximum fitted black-iron armor, luminous maintained copper and restrained architectural brasswork.
Sail plan & palette: Vast deep botanical-green sails with antique-gold edging and exactly two subtle Crown emblems, no extra heraldic clutter.
Signature detail: A monumental stern window shaped around the crown-anchor-star geometry without becoming a literal giant badge.
Preferred art scene: Crossing sunlit open water with smaller escort silhouettes establishing scale; bright heroic atmosphere.
Distinctness guardrail: Do not make it sinister, coral-grown, steampunk or physically impossible; Majestic wins through scale, proportion and discipline.

--- SWIFT ---
Encyclopedia: The Swift was designed by Shoal-folk who consider deep water an inconvenience and armed ships needlessly slow. It carries messages, scouts channels and vanishes through reefs where a square-rigger would leave its keel. There is no gun aboard because every pound of iron is a pound that cannot become sail. Crown officers dismiss it as a canoe until they discover it reported their fleet two days before their own lookouts saw land.
Visual identity: A reef-running scout that feels closer to a racing seabird than a conventional warship.
Silhouette signature: Very narrow single hull with light lateral outriggers, one dramatically canted mast, a tall crab-claw sail and almost no superstructure.
Construction & materials: Springy pale coastal timber, rope lashings, shell fittings and small patches of weathered brass; no armor and no coral hull.
Sail plan & palette: Cream and faded crimson triangular sail with one small Confederate pennant rather than a huge emblem.
Signature detail: Strings of tiny shell wind-chimes used by Shoal-folk navigators to read air shifts.
Preferred art scene: Skimming above turquoise reef water in brilliant daylight, spray lifting from the outriggers.
Distinctness guardrail: Do not add guns, armor, a bulky deck or a European square-rig; speed and cultural specificity are the whole design.

--- BRIGANTINE ---
Encyclopedia: Most Brigantines began as honest merchant vessels, although their captains disagree about when honesty ended. Cargo partitions have become troop berths, concealed ports hold a pair of light guns and every spare beam carries a pulley for loading whatever the next island needs. They are the Confederacy’s connective tissue: not heroic, rarely famous, and present at every uprising before the songs arrive.
Visual identity: A cheerful merchant brig retrofitted for rebellion—useful, crowded and visibly lived in.
Silhouette signature: Medium round-bellied twin-mast brig with high cargo hatches, mismatched yards, deck cranes and a slightly overloaded stern.
Construction & materials: Weathered merchant timber, patched repairs from several ports, rope fenders, brass salvaged from trade fittings and no armor plating.
Sail plan & palette: Mixed cream, faded crimson and sun-bleached tan canvas; one obvious Confederate flag at the mizzen.
Signature detail: A row of cargo labels painted over with new island names and revolutionary slogans.
Preferred art scene: Loading people and supplies at a lively golden-hour quay, with the full ship still dominant.
Distinctness guardrail: Do not make it a sleek raider or derelict wreck; it should look dependable, adaptable and loved.

--- CHIMERA ---
Encyclopedia: No two yards agree on what a Chimera originally was. Its pale patrol-ship bow, broad merchant waist and clipped Imperial stern meet along celebrated scarf joints reinforced with engraved bronze fishplates. Crews polish those seams rather than hide them; every join records a vessel the Crown abandoned, lost or failed to keep. When the first rebuilt Chimera entered Confederate service, its sailors had no time for proper heraldry. They painted the Confederacy sigil from memory across a crimson sail panel with a bucket of bone-white hull paint, leaving brushstrokes, drips and the ghost of an older Imperial mark beneath it. The symbol is imperfect but its meaning is exact: whatever these pieces were before, this ship belongs to us now.
Visual identity: A composite defensive warship whose charisma comes from visibly different parts made coherent by skilled hands.
Silhouette signature: Medium single-centerline hull with a fine foreign bow, broad merchant waist, clipped naval stern and an irregular but stable two-mast rig.
Construction & materials: Three visibly different woods, salvaged iron plates, leather seals, reused brass and carefully scarfed structural joints.
Sail plan & palette: One dark crimson sail, one cream patched sail and black storm canvas; one Confederate emblem on a repaired central panel.
Signature detail: A line of decorative metal joinery deliberately celebrates rather than hides every major splice.
Preferred art scene: In a sheltered cove undergoing one more ingenious repair while ready guns watch the entrance.
Distinctness guardrail: Do not twist the hull, add multiple bows or make it accidental junk; the geometry must remain seaworthy and intentional.

--- TIDESTALKER ---
Encyclopedia: Tidestalkers are sung into shape in shallow Reef-folk nurseries, then taught the deeper water as they grow. Their living hulls flex rather than creak and close small wounds with pale new growth between voyages. They hunt close to reefs, where their low profiles vanish against broken water. Below the surface, living coral keels and rhythmic reef vanes drive them silently against wind and current.
Visual identity: A sleek, windless living-coral ambush ship: quiet, watchful and unmistakably grown rather than built.
Silhouette signature: Medium low narrow hull with swept-back coral armor ridges, shallow draft, concealed gunports and submerged living propulsion vanes. No sails, masts or rigging.
Construction & materials: Smooth overlapping blood-red, muted ivory and dark reef coral armor over a minimal timber spine, with shell fittings and rope grown into natural channels.
Sail plan & palette: No sails or masts. Tidecraft propulsion comes from submerged fin-like coral keels and living reef vanes. One small Confederate pennant may be mounted directly to the hull.
Signature detail: Low swept coral ridges conceal a row of gunports until the vessel turns to strike.
Preferred art scene: Half-hidden beside a bright reef at midday, moving against the wind without wake from any sail.
Distinctness guardrail: Do not add sails, masts, towers, open coral arches or animal anatomy. It is a fast medium warship, not a creature or reef fortress.

--- MARAUDER ---
Encyclopedia: A Marauder belongs to its captain in a way an Imperial ship never can. Every rail carries a choice made during a raid: cut-down spars for speed, a captured heavy gun under the forecastle, light pieces wherever recoil will not tear the deck apart, and just enough room below for a boarding company and its loot. They are cheap because their crews build half the ship while sailing the other half.
Visual identity: A lean privateer schooner with one oversized punch and a deck crowded by opportunistic light weapons.
Silhouette signature: Small low schooner, two sharply raked masts, long overhanging stern, fine bow and a conspicuous single heavy-gun position.
Construction & materials: Fast-grown timber, tar-black repairs, scavenged brass, rope reinforcement and no armor.
Sail plan & palette: Dark rust-red gaff sails with black patches and one bold Confederate flag.
Signature detail: A captured heavy cannon lashed into an ornate wooden cradle that clearly came from another ship.
Preferred art scene: Bursting from behind a headland toward a fat prize in warm late-afternoon light.
Distinctness guardrail: Do not make it polished, armored or identical to Blackfin; Marauder is a boarding raider with one heavy surprise.

--- CUTLASS ---
Encyclopedia: The Cutlass is the closest thing the Confederacy has to a conventional fleet ship, which is why no two look entirely alike. The basic plan is simple enough to copy in small island yards: compact hull, useful armor and enough heavy guns to threaten something larger. Captains personalize the rig, but the rising curve of the bow remains. Seen in profile it resembles the guard of the weapon that gave the class its name.
Visual identity: A compact corsair warship—straightforward, aggressive and more disciplined than most Confederate hulls.
Silhouette signature: Small full-bodied sloop-of-war with a pronounced rising bow curve, two masts and a tight, powerful battery amidships.
Construction & materials: Dark local hardwood, light salvaged armor, brass edging and practical leather weather screens.
Sail plan & palette: Cream-and-crimson divided sails with black reef bands; one obvious Confederate emblem.
Signature detail: A curved brass cutwater brace echoes a cutlass guard without becoming a literal sword prow.
Preferred art scene: Crossing close in front of a larger enemy, guns run out and crew visible at the rail.
Distinctness guardrail: Do not make it as skeletal as Marauder or as fast-looking as Blackfin; it is the Confederacy’s compact conventional fighter.

--- TEMPEST ---
Encyclopedia: Tempests come from the Sea of Storms, where captains learned to carry sail in weather that sends other ships searching for shelter. Their hybrid rig can shift from long reaching canvas to tight storm triangles without striking a mast. Long guns open the fight before the ship races close enough to land troops beneath the squall. A Tempest is rarely painted against a calm horizon because nobody remembers seeing one there.
Visual identity: A fast storm-sea assault vessel with an exotic but plausible hybrid rig and forward long-gun emphasis.
Silhouette signature: Medium xebec-like hull, very long and low, three raked masts carrying a mix of lateen and square storm canvas, reinforced high bow.
Construction & materials: Dark flexible timber, medium salvaged armor, copper lightning straps, leather hatch covers and storm-blackened brass.
Sail plan & palette: Rust-crimson lateen sails mixed with small cream square topsails; one Confederate flag snapping rigid in the wind.
Signature detail: Copper weather vanes and conductor lines branch from every masthead like controlled lightning scars.
Preferred art scene: Charging out of a bright-edged squall, rain behind and sunlit water ahead.
Distinctness guardrail: Do not make it supernatural lightning magic or a tiny scout; the drama comes from mastered weather and assault purpose.

--- URSKIN WHALER ---
Encyclopedia: Before the war, Urskin Whalers followed leviathans through northern pack ice, carrying rendering gear, spare boats and provisions for months away from land. When the clans joined the Confederacy, those broad working hulls received patched iron armor, reinforced gun beds, two Heavy Guns and four Light Guns. The old harpoon ballistae remain hunting equipment rather than naval Long Guns, reminders that their crews learned courage against prey far larger than any warship. A dire-whale jaw reinforces the pointed bow, while iron-banded laminated oars can push through calm water and broken ice. A Whaler is neither elegant nor purpose-built for battle, but it is stubborn, practical and crewed by hunters who know precisely where a larger enemy is vulnerable.
Visual identity: A medium northern working whaler hurriedly converted for war—stout, practical and visibly built by the same giant people as the Goliath.
Silhouette signature: Broad deep-bellied two-mast whaler with a high ice-cutting bow, open working waist, stern boat davits, two oversized harpoon ballistae, a short orderly bank of heavy sweep-oars and a modest mixed cannon battery.
Construction & materials: Weather-dark gray timber, patched iron armor concentrated along the waterline and gun beds, structural whalebone knees, heavy rope, leather weather screens and fittings stained by smoke, salt and oil.
Sail plan & palette: Two practical square-rigged masts with broad weathered cream and gray sails, clan pennants and a small Confederate flag; the rig must remain correctly scaled and functional.
Signature detail: A dire-whale jaw reinforces the pointed bow while twin deck-mounted harpoon ballistae preserve the vessel’s original hunting identity.
Preferred art scene: Crossing cold blue water between distant icebergs beneath a pale break in the clouds, full hull and working deck clearly visible.
Distinctness guardrail: Do not make it a miniature Goliath, pirate caricature or fantasy monster. It is a believable medium Age-of-Sail whaler retrofitted with armor and guns; every bone, oar and weapon must have a practical mounting.

--- REEFWARDEN ---
Encyclopedia: Reefwardens were grown after Confederate captains learned that Imperial capital ships could not simply be outsailed forever. Their coral carapaces are thickest around the forward battery, allowing them to close with ships that would crush lighter raiders. Reef-folk marines shelter in cool chambers within the living hull until the moment of boarding. Submerged Tidecraft vanes drive the ship directly into the wind, giving its prey no safe angle of escape.
Visual identity: A windless coral-armored capital hunter with the blunt confidence of a reef predator.
Silhouette signature: Large broad-shouldered single-centerline hull, thick layered coral carapace, heavy wedge bow, jaw-like forward battery and submerged Tidecraft fins. No sails, masts or rigging.
Construction & materials: Dense ochre, blood-red and bone-white coral armor wrapped over a robust wooden frame, with brass fittings embedded into the living plates.
Sail plan & palette: No sails or masts. Powerful submerged coral keels and rhythmic living vanes provide propulsion. One small Confederate flag sits low on the aft armor ridge.
Signature detail: A massive overlapping coral brow protects the forward heavy-gun apertures like a closing armored jaw.
Preferred art scene: Closing head-on with a distant Imperial capital ship over deep blue water, moving directly into the wind in warm daylight.
Distinctness guardrail: Do not add sails, masts, buildings or delicate branching coral. Reefwarden is a muscular armored hunter, not a creature or floating city.

--- IRONBACK ---
Encyclopedia: Ironback was built with Imperial straight lines and taken out of Imperial service with Admiral Dorian Jessup still aboard. The Confederacy cut down its ornamental stern, reinforced the weather deck and turned its long guns toward the kind of siege the Crown once trained Jessup to conduct. Beneath the weathering, every frame remains unmistakably Admiralty work. That contradiction is the ship’s legend: discipline did not disappear when the flag changed; it chose another side.
Visual identity: A captured Crown dreadnought whose Imperial skeleton survives beneath a severe Confederate siege refit.
Silhouette signature: Large slab-sided former Crown hull, cut-down square rig, long low armored back, retained symmetrical gun decks and a visibly altered stern.
Construction & materials: Original Imperial oak, iron and aged copper beneath rough timber patches, crimson paint, new ropework and improvised long-gun mounts.
Sail plan & palette: Weathered cream sails overpainted with broad crimson panels; one obvious Confederate flag, with old Crown marks visibly removed.
Signature detail: A pale scar on the stern where the Crown emblem was hacked away rather than neatly covered.
Preferred art scene: Bombarding a sea fort from long range beneath cold northern light; full hull profile clearly readable.
Distinctness guardrail: Do not redesign the bones as a native pirate ship or add coral; captured Imperial construction is the entire point.

--- BLACKFIN ---
Encyclopedia: Blackfins are built around a simple Shoal-folk observation: a large gun is useless if it cannot turn quickly enough to find its target. Their decks bristle with small pieces on swivels and sliding carriages, each served by crews who communicate in whistles across the rigging. The tall black mainsail earned the class its name. Against capitals it is a nuisance; against small fast craft it is the thing waiting at the end of every escape route.
Visual identity: A fast anti-small combatant defined by a shark-fin sail and an improbable density of nimble light guns.
Silhouette signature: Medium narrow schooner with a towering triangular black gaff mainsail, clipped bow, low stern and clean open firing deck.
Construction & materials: Dark oiled hardwood, light coral-free reinforcement, brass swivel tracks and flexible rope-and-leather gun mounts.
Sail plan & palette: Squid-ink black mainsail with a crimson lower edge, smaller cream foresails and one Confederate emblem in bone-white.
Signature detail: Twelve small brass gun muzzles form a bright dotted line along the otherwise black hull.
Preferred art scene: Carving through whitecaps while surrounding a much smaller fleeing cutter, under clear energetic daylight.
Distinctness guardrail: Do not give it troops, heavy weapons, coral mass or Marauder’s scavenged clutter; Blackfin is a specialized light-gun machine.

--- URSKIN GOLIATH ---
Encyclopedia: An Urskin Goliath is a clan, foundry and winter town carried into battle on one immense keel. Built from the northern tradition of community whalers but designed for war from the first timber, its cavernous holds carry nine garrisons, powder and cannon shot sized for Urskin hands. A colossal dire-whale skeleton reinforces the icebreaking bow; massive deck ballistae and heavy batteries line the broad upper works. Its sweep-oars are laminated, iron-banded and long enough to bite beyond the hull’s shadow, while towering masts carry sails proportioned to move a vessel of such impossible weight. Southern sailors often mistake the tiny figures on deck for children until they realize each silhouette is an Urskin—and understand how large the ship truly is.
Visual identity: A gigantic northern great galley and community-whaler scaled for humongous Urskin crews—massive, practical, rough and culturally specific.
Silhouette signature: Longest and widest deep-bellied hull in the fleet, continuous icebreaking keel, two modest heavy masts, two orderly banks of enormous sweep-oars, low heavy battery, structural whalebone side braces and stern harpoon gantries.
Construction & materials: Tar-dark clinker-and-carvel timber, thick iron plates, enormous weathered whalebone ribs and jaw sections, leather weathering skirts and heavy brass darkened by oil smoke.
Sail plan & palette: Two modest oxblood and smoke-black square-rigged masts for cruising, plus mechanically aligned banks of giant sweep-oars for calm, ice and battle; one Confederate flag beneath clan pennants.
Signature detail: Enormous oars emerge through iron-bound ports beneath load-bearing whalebone arches, making the scale of the Urskin crew unmistakable.
Preferred art scene: Pushing through broken northern ice under rose-gold low sunlight, one full bank of giant oars biting the water while Urskin crew establish scale.
Distinctness guardrail: Build it as a plausible northern great galley scaled for giants. Do not make it sleek, coral-grown, cartoonish, skeletal or a monster; every bone and oar must have a clear structural or naval function.

--- CORAL-CLASS DREADNAUGHT ---
Encyclopedia: A Coral-Class Dreadnaught is not launched. Reef singers wake it beneath a guarded lagoon, and the armored hull rises only as far as battle requires. Most of its enormous hardwood keel and living coral mass travels below the surface, where coordinated Tidecraft vanes propel and steer it against wind and current. In action, waves wash over the low dorsal armor while gun apertures open just above the waterline. It is not a submarine or sea creature, but a warship deliberately grown to offer the enemy almost nothing to hit.
Visual identity: The ultimate semi-submerged coral dreadnaught: immense below the waterline, low and fierce above it, and armored like a living reef turned toward war.
Silhouette signature: Enormous broad single-centerline displacement hull with roughly two-thirds of its mass below water, a long low dorsal armor ridge, recessed waterline battery, small protected command hollow and colossal wedge-shaped reef ram. No sails, masts or towers.
Construction & materials: Dense hydrodynamic plates of blood-red, burgundy and bone-white living coral over deep hardwood keels, black sealable gun apertures, shell, brass and captured heavy guns.
Sail plan & palette: No sails, masts or rigging. Colossal submerged coral keels and rhythmic Tidecraft vanes provide propulsion, steering and controlled depth; the vessel can ride higher in harbor and deliberately lower itself for battle.
Signature detail: Living coral shutters seal the recessed heavy-gun ports as waves wash across the armored back, leaving only the reef-ram and low command ridge exposed.
Preferred art scene: Running semi-submerged out of a bright lagoon against the wind, sea washing over its dorsal armor while the massive underwater silhouette remains visible through turquoise water.
Distinctness guardrail: Do not depict a modern submarine, whale, monster, island, palace or shapeless reef. Preserve a clear bow, stern, keel and displacement hull while keeping the battle profile exceptionally low.

================================================================================
PART 5 — KEY SIMULATION RESULTS AND DOCTRINE (v3, 5,000 trials per matchup)
================================================================================

ENDGAME CONTRACT (verified): Majestic beats a lone Urskin Goliath 100/0 and a lone Coral-Class 85/1 (14% mutual). Coral-Class beats Goliath 100/0. Any pair of Confederate capitals defeats Majestic 100%.
RATE DECIDES: a 74 beats any frigate 100-0 (Sovereign > Justiciar > Vanguard II > Vanguard). Frigates live on speed, escort work, scouting, raiding, and price — never on fighting up a rate.
SWARMS: light guns cannot crack Armor 21+ — 14 Marauders lose 100-0 to one Sovereign at equal gold. Swarms rule trade lanes and the early game; the counter to a battle line is a battle line.
SPECIALISTS (verified): Reefwarden beats Vanguard II 100-0 (the Confederate answer to Crown frigates). Interceptor II beats Blackfin 83/4. Blackfin one-rounds raiders and scouts (100-0 vs Marauder) and is harmless against Heavy armor. Ironback loses 100-0 to Bulwark at sea — a pure siege tax whose value is fortress-cracking Bombardment 8.
PACING: mirror duels average ~8 internal rounds; capital duels 7-10 rounds; mirror mutual destruction ~50% is structural to simultaneous fire at ~100 guns a side (lever if ever needed: initiative, never stats).
RETREAT COSTS (Stern Rake): early game 0%; mid-game fleet ~16% of fleet hull with escapes for the fast; late slow fleet ~15%; a lone fleeing Majestic ~41%.
MEAN 1v1 WIN RATES (class hierarchy): Majestic 99.4, Coral-Class 95.9, Goliath 91.7, Sovereign II 87.5, Sovereign 83.1, Bulwark 76.3, Justiciar 74.7, Reefwarden 70.5, Morningstar 66.6, Vanguard II 62.5, Ironback 58.3, Vanguard 52.1, Tempest 50.7, Urskin Whaler 45.6, Chimera 41.7, Interceptor II 36.8, Blackfin 33.5, Resolute 26.6, Cutlass 21.8, Tidestalker 21.6, Marauder 15.1, Wayfinder 12.7, Brigantine 6.8, Interceptor I 4.6, Swift 0.0.
