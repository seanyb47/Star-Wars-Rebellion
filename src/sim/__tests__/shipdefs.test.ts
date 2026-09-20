import { describe, expect, it } from 'vitest';
import rosterData from '../../data/combat-ships.json';
import {
  NAVY_FACTIONS,
  ROSTER,
  RosterError,
  SHIP_STATUSES,
  type ShipDefinition,
  SPEED_CATEGORIES,
  fleetOf,
  loadRoster,
  nextUnlock,
  startingHulls,
  validateRoster,
} from '../shipdefs';

/**
 * The roster loads, and refuses anything it should refuse.
 *
 * These tests are about the *data contract*, not about balance: they check
 * that the export can be read, that a corrupted one is caught rather than
 * silently half-loaded, and that the design rules the export states about
 * itself still hold. Nothing here asserts that a number is correct — Sean's
 * instruction is that this pass does not rebalance anything.
 */

/** A deep copy, so a test that breaks a field cannot break another test. */
function corrupt(mutate: (doc: Record<string, unknown>) => void): unknown {
  const doc = JSON.parse(JSON.stringify(rosterData)) as Record<string, unknown>;
  mutate(doc);
  return doc;
}
function ships(doc: unknown): Array<Record<string, unknown>> {
  return (doc as Record<string, unknown>).ships as Array<Record<string, unknown>>;
}

describe('loading the roster', () => {
  it('reads every ship in the export', () => {
    // Twenty-eight since COMBAT MASTER v4 on 20 September, which added three
    // small hulls and squared the navies at fourteen apiece: the Fenrunner and
    // the Wraith for the Crown, the Witchlight for the Confederacy.
    expect(ROSTER.ships).toHaveLength(28);
    expect(ROSTER.byId.size).toBe(28);
    for (const faction of NAVY_FACTIONS) expect(fleetOf(faction)).toHaveLength(14);
  });

  it('finds no errors in the shipped data', () => {
    expect(validateRoster(rosterData).filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('converts a percentage repair rate into a fraction', () => {
    // '1%' and '1.5%' in the export; 0.01 and 0.015 here, so a caller can
    // multiply rather than remembering to divide by a hundred.
    expect(ROSTER.byId.get('CWN-MAJ-R8-01')!.repairRatePerDay).toBeCloseTo(0.01);
    expect(ROSTER.byId.get('CFS-BRI-S02')!.repairRatePerDay).toBeCloseTo(0.015);
    expect(ROSTER.byId.get('CFS-COR-R8-01')!.repairRatePerDay).toBeCloseTo(0.04);
    // And a fraction of a percent, which is the one a naive parse gets wrong.
    expect(ROSTER.byId.get('CFS-IRB-R5-01')!.repairRatePerDay).toBeCloseTo(0.005);
  });

  it('parses the research ladder into a kind and an order', () => {
    const wayfinder = ROSTER.byId.get('CWN-WAY-S01')!;
    expect(wayfinder.research).toEqual({ kind: 'start', order: 1, raw: 'S01' });
    const goliath = ROSTER.byId.get('CFS-URG-R7-01')!;
    expect(goliath.research).toEqual({ kind: 'research', order: 7, raw: 'R7' });
  });

  it('keeps the three gun kinds apart', () => {
    // A 1st rate of 104 guns since v3 rebased the counts on the Royal Navy's
    // rating system. The three columns have to add to the rate, which is the
    // one thing a transcription slip would break.
    const majestic = ROSTER.byId.get('CWN-MAJ-R8-01')!;
    expect(majestic.guns).toEqual({ longGuns: 30, heavyGuns: 46, lightGuns: 28 });
    expect(Object.values(majestic.guns).reduce((a, b) => a + b)).toBe(104);
  });

  it('only ever uses names it knows', () => {
    for (const ship of ROSTER.ships) {
      expect(NAVY_FACTIONS).toContain(ship.faction);
      expect(SPEED_CATEGORIES).toContain(ship.speed);
      expect(SHIP_STATUSES).toContain(ship.launchStatus);
      expect(ship.role.length).toBeGreaterThan(0);
    }
  });
});

describe('refusing bad data', () => {
  it('catches a duplicate ship id', () => {
    const doc = corrupt((d) => {
      const list = d.ships as Array<Record<string, unknown>>;
      list[1]['Ship ID'] = list[0]['Ship ID'];
    });
    expect(() => loadRoster(doc)).toThrow(RosterError);
    expect(validateRoster(doc).some((i) => /Duplicate ship id/.test(i.message))).toBe(true);
  });

  it('catches two hulls under one name', () => {
    // The near miss this came from: the Gigantic CFS-URW-R7-01 and the live
    // roster's 30-hull medium were both the 'Urskin Whaler' until Sean
    // renamed the big one the Goliath on 19 September, and the sheet would
    // have accepted the real whaler beside her without a word. Ids are the
    // key the code uses; the name is the one the player reads.
    const doc = corrupt((d) => {
      const list = d.ships as Array<Record<string, unknown>>;
      list[1]['Ship'] = list[0]['Ship'];
    });
    expect(validateRoster(doc).some((i) => /which is already/.test(i.message))).toBe(true);
    // Case and stray spacing are the same collision, not a different one.
    const sloppy = corrupt((d) => {
      const list = d.ships as Array<Record<string, unknown>>;
      list[1]['Ship'] = `  ${String(list[0]['Ship']).toUpperCase()} `;
    });
    expect(validateRoster(sloppy).some((i) => /which is already/.test(i.message))).toBe(true);
  });

  it('is happy with the names the sheet actually ships', () => {
    const names = ROSTER.ships.map((s) => s.name.trim().toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    /*
     * Both Urskins, and the distinction that made the duplicate-name check
     * worth writing in the first place.
     *
     * The Gigantic hull was renamed to Goliath on 19 September precisely so
     * that *"Urskin Whaler"* would be free for the ship Sean said he was going
     * to invest, and this test asserted her absence until he did. He has: she
     * is a Medium retrofit at R3, not the R7 monster, and the two names now
     * both exist and must stay distinct.
     */
    expect(ROSTER.byId.get('CFS-URG-R7-01')!.name).toBe('Urskin Goliath');
    expect(ROSTER.byId.get('CFS-URW-R3-01')!.name).toBe('Urskin Whaler');
    expect(ROSTER.byId.get('CFS-URW-R3-01')!.size).toBe('Medium');
  });

  it('catches an unknown enum value', () => {
    const speed = corrupt((d) => {
      ships(d)[0]['Speed'] = 'Brisk';
    });
    const faction = corrupt((d) => {
      ships(d)[0]['Faction'] = 'The Admiralty';
    });
    const status = corrupt((d) => {
      ships(d)[0]['Status'] = 'Fine';
    });
    for (const doc of [speed, faction, status]) expect(() => loadRoster(doc)).toThrow(RosterError);
  });

  it('catches a missing required field', () => {
    const doc = corrupt((d) => {
      delete ships(d)[3]['Ship'];
    });
    expect(() => loadRoster(doc)).toThrow(/Missing name/);
  });

  it('catches numbers out of range', () => {
    const negative = corrupt((d) => {
      ships(d)[0]['Armor'] = -5;
    });
    const fractional = corrupt((d) => {
      ships(d)[0]['Hull'] = 300.5;
    });
    const noHull = corrupt((d) => {
      ships(d)[0]['Hull'] = 0;
    });
    for (const doc of [negative, fractional, noHull]) expect(() => loadRoster(doc)).toThrow(RosterError);
  });

  it('allows a fractional maintenance cost, because most ships have one', () => {
    // A whole-number rule here would reject the shipped roster. It used to be
    // two ships; v3 sets maintenance at 1% of build gold, so most of the
    // roster is fractional and the property is asserted rather than a pair of
    // numbers that move every time Sean reprices a hull.
    const fractional = ROSTER.ships.filter((s) => !Number.isInteger(s.goldPerDayMaintenance));
    expect(fractional.length).toBeGreaterThan(2);
    expect(ROSTER.byId.get('CFS-SWI-S01')!.goldPerDayMaintenance).toBe(0.5);
  });

  it('catches a malformed percentage', () => {
    const doc = corrupt((d) => {
      ships(d)[0]['Repair Rate'] = '1 percent';
    });
    expect(() => loadRoster(doc)).toThrow(/Repair Rate/);
  });

  it('notes two hulls on the same rung of one ladder without refusing them', () => {
    /*
     * A warning since 19 September, and the demotion is the finding.
     *
     * This was an error on the reasoning that the research errand would have
     * nothing to choose between two hulls on one rung. That was inferred from
     * a roster where it happened to hold; the sheet has now done it on purpose
     * — the Whaler at Confederacy R3 beside the Tempest — and its own Roster
     * structure note says *"research order establishes progression, not strict
     * replacement"*. A rung that unlocks two is a choice, not a contradiction.
     *
     * It stays a warning rather than going silent because a collision typed by
     * accident looks exactly like a pair placed on purpose, and only the sheet
     * knows which it is.
     */
    const doc = corrupt((d) => {
      const list = ships(d);
      const crown = list.filter((s) => s['Faction'] === 'Crown Imperium');
      crown[1]['Research Order'] = crown[0]['Research Order'];
    });
    expect(() => loadRoster(doc)).not.toThrow();
    // v4 shares three Crown rungs of its own (R1 Vanguard/Fenrunner, R5
    // Interceptor II/Wraith), so the corruption is counted as one *more* than
    // the roster already reports rather than as the only one.
    const sharedNow = (d: unknown) =>
      validateRoster(d).filter((i) => /is shared with/.test(i.message) && i.shipId?.startsWith('CWN-'));
    const shared = sharedNow(doc);
    expect(shared.length).toBe(sharedNow(rosterData).length + 1);
    for (const item of shared) expect(item.severity).toBe('warning');
  });

  it('allows the two navies the same rung as each other', () => {
    // Both open at S01 and both unlock an R1, which is correct: the ladders are
    // per faction, so no warning may ever pair a Crown hull with a Confederate
    // one. The shared rungs v4 does have are all *within* a navy.
    for (const item of validateRoster(rosterData).filter((i) => /is shared with/.test(i.message))) {
      const [mine, theirs] = [item.shipId!.slice(0, 3), /\b(C[A-Z]{2})-/.exec(item.message)?.[1]];
      expect(theirs, item.message).toBe(mine);
    }
  });

  it('reports everything wrong at once rather than the first thing', () => {
    const doc = corrupt((d) => {
      const list = ships(d);
      list[0]['Speed'] = 'Brisk';
      list[1]['Armor'] = -1;
      delete list[2]['Role'];
    });
    expect(validateRoster(doc).filter((i) => i.severity === 'error').length).toBeGreaterThanOrEqual(3);
  });
});

/** Every gun a hull carries, of whichever kind. Bombardment is never in it. */
const gunsOf = (s: ShipDefinition) => s.guns.longGuns + s.guns.heavyGuns + s.guns.lightGuns;

/** The one hull in the whole roster with the most of something. */
const heaviest = (of: (s: ShipDefinition) => number): ShipDefinition =>
  ROSTER.ships.reduce((a, b) => (of(b) > of(a) ? b : a));

describe('the design rules the export states about itself', () => {
  it('gives each navy exactly four starting hulls', () => {
    // 'Each faction has four starting ships and eight research unlocks.'
    expect(startingHulls('Crown Imperium').map((s) => s.name)).toEqual([
      'Wayfinder',
      'Interceptor I',
      'Morningstar',
      'Sovereign',
    ]);
    expect(startingHulls('Free Confederacy').map((s) => s.name)).toEqual([
      'Swift',
      'Brigantine',
      'Chimera',
      'Tidestalker',
    ]);
  });

  it('makes the Vanguard and the Marauder each navy\'s first unlock', () => {
    expect(nextUnlock('Crown Imperium', 0)!.name).toBe('Vanguard');
    expect(nextUnlock('Free Confederacy', 0)!.name).toBe('Marauder');
    expect(nextUnlock('Crown Imperium', 99)).toBeUndefined();
  });

  it('walks each ladder in unlock order, eight rungs and no gaps', () => {
    /*
     * Eight rungs each, still — but a rung may now hold more than one hull.
     *
     * The Whaler arrived at Confederacy R3 on 19 September beside the Tempest,
     * so "the nth unlock" and "the step called Rn" have parted company again
     * on that ladder, and `nextUnlock` walks hulls rather than steps. Both
     * facts are worth pinning: every step from 1 to 8 is present on both
     * ladders with no gaps, and the sequence `nextUnlock` hands out is the
     * ladder in order however many hulls sit on a step.
     */
    const order = ['Marauder', 'Cutlass', 'Witchlight', 'Tempest', 'Urskin Whaler', 'Reefwarden'];
    order.forEach((name, i) => expect(nextUnlock('Free Confederacy', i)!.name).toBe(name));

    for (const faction of NAVY_FACTIONS) {
      const ladder = fleetOf(faction).filter((s) => s.research.kind === 'research');
      const steps = ladder.map((s) => s.research.order);
      expect([...new Set(steps)]).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      // Non-decreasing: a ladder that jumped about would make `nextUnlock`
      // hand out a later hull before an earlier one.
      expect(steps).toEqual([...steps].sort((a, b) => a - b));
      ladder.forEach((ship, i) => expect(nextUnlock(faction, i)!.id).toBe(ship.id));
    }
    // Rungs holding more than one hull, which v4 made the norm rather than the
    // exception: Confederacy R2 and R3, Crown R1 and R5.
    expect(fleetOf('Free Confederacy').filter((s) => s.research.raw.startsWith('R2'))).toHaveLength(2);
    expect(fleetOf('Free Confederacy').filter((s) => s.research.raw.startsWith('R3'))).toHaveLength(2);
    expect(fleetOf('Crown Imperium').filter((s) => s.research.raw.startsWith('R1'))).toHaveLength(2);
    expect(fleetOf('Crown Imperium').filter((s) => s.research.raw.startsWith('R5'))).toHaveLength(2);
  });

  it('gives the Majestic the heaviest guns of any one ship, and not the heaviest everything', () => {
    // 'Majestic remains the strongest individual ship.' Asserted on the one
    // figure the roster still gives her outright, not on a combat model.
    //
    // The locked revision states it outright: *'Majestic remains the strongest
    // individual ship and the only Maximum Armor 30 hull. Urskin Goliath keeps
    // the greatest hull and Heavy Gun mass.'* So she tops guns and armor, and
    // the one thing she does not top is hull — the Goliath's 1,800 to her 1,600.
    // Pinned because a roster that stops being lopsided by accident and one
    // that stops on purpose look identical in a diff.
    const majestic = ROSTER.byId.get('CWN-MAJ-R8-01')!;
    for (const other of ROSTER.ships) {
      if (other.id === majestic.id) continue;
      expect(gunsOf(other)).toBeLessThan(gunsOf(majestic));
    }
    expect(heaviest((s) => s.armor).id).toBe('CWN-MAJ-R8-01');
    expect(majestic.armor).toBe(30);
    expect(heaviest((s) => s.hull).id).toBe('CFS-URG-R7-01');
    // And the Goliath's Heavy Guns are the Confederacy's greatest, not the
    // game's: the Majestic's sixteen still beat her thirteen.
    expect(majestic.guns.heavyGuns).toBeGreaterThan(ROSTER.byId.get('CFS-URG-R7-01')!.guns.heavyGuns);
  });

  it('lets a Coral-Class and an Urskin Goliath out-gun and out-hull a Majestic', () => {
    // 'Together they exceed a lone Majestic.' Guns and hull only: whether the
    // pair actually beats her is a question for a combat model, and the roster
    // is not one.
    const coral = ROSTER.byId.get('CFS-COR-R8-01')!;
    const goliath = ROSTER.byId.get('CFS-URG-R7-01')!;
    const majestic = ROSTER.byId.get('CWN-MAJ-R8-01')!;
    expect(gunsOf(coral) + gunsOf(goliath)).toBeGreaterThan(gunsOf(majestic));
    expect(coral.hull + goliath.hull).toBeGreaterThan(majestic.hull);
  });

  it('gives the Goliath the hull and the three crowns to whom v3 says', () => {
    /*
     * v3 states its own crowns in the sheet header, which is better than
     * inferring them: *"Hull: Urskin Goliath 14,000 (largest). Armor: Majestic
     * 30 (the game's only Maximum)... Category crowns: Long = Majestic 30;
     * Heavy = Sovereign II 52; Light = Blackfin 29."*
     *
     * The Goliath keeps the hull and the Confederacy's troop capacity, which
     * is what the Endgame design rule asks of her. She no longer leads Heavy
     * Guns even within her own navy — the Coral-Class carries 50 to her 40 —
     * so the old assertion about her Heavy Gun mass is retired rather than
     * loosened, and the crowns the sheet actually claims are pinned instead.
     */
    const most = (ships: typeof ROSTER.ships, of: (s: ShipDefinition) => number) =>
      ships.reduce((a, b) => (of(b) > of(a) ? b : a)).id;
    const confederacy = fleetOf('Free Confederacy');
    expect(most(confederacy, (s) => s.hull)).toBe('CFS-URG-R7-01');
    expect(most(confederacy, (s) => s.troopCapacity)).toBe('CFS-URG-R7-01');

    const all = ROSTER.ships;
    expect(most(all, (s) => s.hull)).toBe('CFS-URG-R7-01');
    expect(most(all, (s) => s.armor)).toBe('CWN-MAJ-R8-01');
    expect(most(all, (s) => s.guns.longGuns)).toBe('CWN-MAJ-R8-01');
    expect(most(all, (s) => s.guns.heavyGuns)).toBe('CWN-SOV-R7-02');
    expect(most(all, (s) => s.guns.lightGuns)).toBe('CFS-BLA-R6-01');
    /*
     * And the broadside. The header's wording is exact and worth reading
     * twice: *"Coral-Class 102 guns, highest broadside (3,192) while leading
     * no single category."* The crown is the 3,192 — average damage thrown —
     * not the gun count, which the Majestic wins 104 to 102 while throwing
     * 3,150. Heavy guns are 4d20 against everything else's 2d20, so a hull
     * can be out-gunned and still out-shoot.
     */
    expect(most(all, gunsOf)).toBe('CWN-MAJ-R8-01');
    const broadside = (s: ShipDefinition) =>
      (s.guns.longGuns * 2 + s.guns.heavyGuns * 4 + s.guns.lightGuns * 2) * 10.5;
    expect(most(all, broadside)).toBe('CFS-COR-R8-01');
    expect(broadside(ROSTER.byId.get('CFS-COR-R8-01')!)).toBe(3192);
    expect(broadside(ROSTER.byId.get('CWN-MAJ-R8-01')!)).toBe(3150);
  });

  it('keeps bombardment off the list of things a ship shoots at a ship', () => {
    // 'Bombardment: Only affects fortifications/locations, never ship-to-ship.'
    // The guarantee is structural: bombardment is not part of `guns`, so no
    // armament total can pick it up by accident.
    const morningstar = ROSTER.byId.get('CWN-MOR-S03')!;
    expect(morningstar.bombardment).toBeGreaterThan(0);
    expect(Object.keys(morningstar.guns)).toEqual(['longGuns', 'heavyGuns', 'lightGuns']);
  });

  it('keeps the two navies mechanically asymmetric', () => {
    // 'The Crown favors standardized progression... The Confederacy favors
    // asymmetric specialists.' The ladders used to be different lengths and are
    // not any more — the revision of 18 September gave both navies four starts
    // and eight unlocks on purpose — so the asymmetry is measured where it now
    // lives: no two hulls across the two navies are statistically identical.
    const crown = fleetOf('Crown Imperium');
    const confederacy = fleetOf('Free Confederacy');
    // Equal in number again since v4 — fourteen apiece — so the asymmetry is
    // nowhere in the counts and entirely in the hulls. Which is the stronger
    // form of the sheet's claim, not a weaker one.
    expect(confederacy.length).toBe(crown.length);
    const fingerprint = (s: (typeof crown)[number]) =>
      [s.speed, s.guns.longGuns, s.guns.heavyGuns, s.guns.lightGuns, s.armor, s.hull].join('/');
    const crownPrints = new Set(crown.map(fingerprint));
    for (const ship of confederacy) expect(crownPrints.has(fingerprint(ship))).toBe(false);
  });
});

describe('what the shipped data is warned about', () => {
  /**
   * Warnings are design observations, not failures. They are asserted here so
   * that the set cannot change without somebody noticing — if a future export
   * clears one or adds one, this test says so.
   */
  it('flags the shared rungs and the Sovereign, and nothing else', () => {
    const warnings = validateRoster(rosterData).filter((i) => i.severity === 'warning');
    // Five now, and every one deliberate. v4 turned a shared rung from an
    // exception into a habit: the Fenrunner stands on the Vanguard's R1, the
    // Witchlight on the Cutlass's R2, the Wraith on the Interceptor II's R5,
    // and the Whaler is still on the Tempest's R3. Pinned so that a sixth
    // cannot appear unnoticed.
    expect(warnings.map((w) => `${w.shipId}/${w.field}`).sort()).toEqual([
      'CFS-URW-R3-01/Research Order',
      'CFS-WIT-R2-02/Research Order',
      'CWN-FEN-R1-02/Research Order',
      'CWN-SOV-S04/Early-game power',
      'CWN-WRA-R5-03/Research Order',
    ]);
    /*
     * The Whaler stands on the Tempest's rung, which the sheet allows on
     * purpose: *"research order establishes progression, not strict
     * replacement."*
     *
     * The Sovereign is new with v3 and is the rule working rather than the
     * rule tripping. She is a 3rd rate of 74 guns among the four hulls the
     * Crown opens with, so she sits top-tier in Heavy Guns, Light Guns and
     * Hull at once — and the design rule asks for *"major drawbacks such as
     * poor efficiency, fragility, Slow speed... or production constraints"*
     * against exactly that. She has three of them: Slow, 1,940 gold, and 700
     * days on the stocks, which is the second-longest build in the game. The
     * validator can see the capabilities and cannot see the counterweights,
     * so it says so and a reader decides.
     */
    const sovereign = ROSTER.byId.get('CWN-SOV-S04')!;
    expect(sovereign.speed).toBe('Slow');
    expect(sovereign.daysToBuild).toBeGreaterThan(500);
    expect(sovereign.goldToBuild).toBeGreaterThan(1500);
  });

  it('would flag a starting ship given two top-tier stats', () => {
    const doc = corrupt((d) => {
      // The Chimera is a starting hull with nothing top-tier about her.
      // Armor 30 is T4+ and a hull of 14,000 is T4+, so this is the smallest
      // change that gives a starting ship two of them.
      const chimera = ships(d).find((s) => s['Ship ID'] === 'CFS-CHI-S03')!;
      chimera['Armor'] = 30;
      chimera['Hull'] = 14000;
    });
    const warnings = validateRoster(doc).filter((i) => i.severity === 'warning');
    expect(warnings.some((w) => w.field === 'Early-game power')).toBe(true);
  });

  it('warns rather than throws when a value leaves its tier bands', () => {
    const doc = corrupt((d) => {
      ships(d)[0]['Armor'] = 999; // past T4+'s 30, so outside every band
    });
    const issues = validateRoster(doc);
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(issues.some((i) => i.severity === 'warning' && /tier band/.test(i.message))).toBe(true);
    expect(() => loadRoster(doc)).not.toThrow();
  });
});
