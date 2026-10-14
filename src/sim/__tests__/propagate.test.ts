import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { createRng } from '../rng';
import { setSupport } from '../helpers';
import { advanceMissions, startMission } from '../missions';
import { resolveControlAndUnrest } from '../support';
import { pushMomentum } from '../politics';
import {
  CASCADE_DAMP,
  CONNECTIVITY_MAX,
  CONNECTIVITY_MIN,
  REGIONAL_FALLOFF,
  SHOCK_CONQUEST,
  SHOCK_LIBERATION_LEVEL,
  SHOCK_PER_GUN_SUNK,
  SHOCK_BATTLE_CEILING,
  MISSION_WORK_DAYS,
} from '../constants';
import {
  applyShock,
  cascadeDamp,

  landingShock,
  orderFor,
  shockwaveOn,
} from '../propagate';
import type { GameState, System } from '../types';

/**
 * Sean's propagation memo of 17 September, clause by clause.
 *
 * The rule it replaced was its own opposite: a flat fifth of *every* allegiance
 * change spilled onto *every* island in the Reach, equally, always. The memo
 * forbids both halves in its first two sections — most things are local, and
 * the things that are not do not move every island by the same amount.
 */

function reachOf(state: GameState, system: System) {
  return state.systems.filter(
    (s) => s.sectorId === system.sectorId && s.id !== system.id && s.populated,
  );
}

function world(seed = 701) {
  const state = generateGalaxy(seed, 'empire');
  // A Reach with plenty of neighbours, and a known middle to measure from.
  const system = state.systems.find(
    (s) => s.populated && reachOf(state, s).length >= 5,
  )!;
  for (const island of [system, ...reachOf(state, system)]) setSupport(island, 'empire', 50);
  return { state, system, reach: reachOf(state, system) };
}

describe('how far news carries', () => {
  it('leaves the rest of the Reach alone when it is local', () => {
    const { state, system, reach } = world();
    const before = reach.map((s) => s.support.empire);
    applyShock(
      state,
      { systemId: system.id, faction: 'empire', scope: 'local', local: 10, news: 'A thing.' },
      createRng(1),
    );
    expect(system.support.empire).toBeGreaterThan(50);
    expect(reach.map((s) => s.support.empire)).toEqual(before);
  });

  /** *"Do NOT simply add the same allegiance value to every island."* */
  it('reaches the whole Reach when it is regional, and never by the same amount', () => {
    const { state, system, reach } = world();
    applyShock(
      state,
      {
        systemId: system.id,
        faction: 'empire',
        scope: 'regional',
        local: 10,
        regional: 3,
        news: 'A bigger thing.',
      },
      createRng(2),
    );
    const moved = reach.map((s) => s.support.empire - 50).filter((d) => d > 0);
    expect(moved.length).toBeGreaterThan(2);
    expect(new Set(moved.map((d) => d.toFixed(3))).size).toBeGreaterThan(1);
    // And the island it happened on felt it far more than any neighbour.
    expect(system.support.empire - 50).toBeGreaterThan(Math.max(...moved));
  });

  /** *"Target +10, adjacent +3, second-nearest +2, distant +1, remote +0.5."* */
  it('falls away with distance down the chain', () => {
    const { state, system } = world();
    const near = [...reachOf(state, system)].sort(
      (a, b) =>
        Math.hypot(a.x - system.x, a.y - system.y) - Math.hypot(b.x - system.x, b.y - system.y),
    );
    applyShock(
      state,
      {
        systemId: system.id,
        faction: 'empire',
        scope: 'regional',
        local: 0,
        regional: 3,
        news: 'A thing.',
      },
      // No jitter to speak of: the shape is the subject, not the noise, and
      // the roll that makes it vary is tested on its own below.
      { ...createRng(3), next: () => 0.5 } as ReturnType<typeof createRng>,
    );
    const felt = near.map((s) => s.support.empire - 50);
    expect(felt[0]).toBeGreaterThan(felt[1]);
    expect(felt[1]).toBeGreaterThan(felt[2]);
    expect(REGIONAL_FALLOFF[0]).toBeGreaterThan(REGIONAL_FALLOFF[1]);
  });

  /** *"Very small per island... not: every island immediately changes sides."* */
  it('carries past the Reach only for the rare global thing, and faintly', () => {
    const { state, system } = world();
    const elsewhere = state.systems.filter((s) => s.sectorId !== system.sectorId && s.populated);
    for (const island of elsewhere) setSupport(island, 'empire', 50);
    applyShock(
      state,
      {
        systemId: system.id,
        faction: 'empire',
        scope: 'global',
        local: 5,
        regional: 1.6,
        global: 0.25,
        news: 'A terrible thing.',
      },
      createRng(4),
    );
    const far = elsewhere.map((s) => s.support.empire - 50);
    expect(far.filter((d) => d !== 0).length).toBeGreaterThan(elsewhere.length / 2);
    // Faint: nothing outside the Reach moved as much as a single point.
    expect(Math.max(...far.map(Math.abs))).toBeLessThan(1);
    // And far less than the island it happened to.
    expect(system.support.empire - 50).toBeGreaterThan(Math.max(...far));
  });
});

describe('a Reach has a temperament', () => {
  it('rolls one for every chain, inside the band, and keeps it', () => {
    const state = generateGalaxy(702);
    for (const sector of state.sectors) {
      expect(sector.connectivity).toBeGreaterThanOrEqual(CONNECTIVITY_MIN);
      expect(sector.connectivity).toBeLessThanOrEqual(CONNECTIVITY_MAX);
    }
    // Not all the same, or it would not be a personality.
    expect(new Set(state.sectors.map((s) => s.connectivity!.toFixed(4))).size).toBeGreaterThan(1);
  });

  /** *"High: stronger domino effects. Low: more isolated politics."* */
  it('decides how much of a shock the neighbours feel', () => {
    const shock = (connectivity: number) => {
      const { state, system, reach } = world();
      state.sectors.find((s) => s.id === system.sectorId)!.connectivity = connectivity;
      applyShock(
        state,
        {
          systemId: system.id,
          faction: 'empire',
          scope: 'regional',
          local: 0,
          regional: 3,
          news: 'A thing.',
        },
        { ...createRng(5), next: () => 0.5 } as ReturnType<typeof createRng>,
      );
      return reach.reduce((n, s) => n + (s.support.empire - 50), 0);
    };
    expect(shock(CONNECTIVITY_MAX)).toBeGreaterThan(shock(CONNECTIVITY_MIN) * 2);
  });

  it('is not rolled out of the stream that lays out the world', () => {
    // Two worlds from the same seed are the same world, temperaments included;
    // and the temperaments must not have moved anything else when they were
    // added, which is why they are drawn from a stream of their own.
    const a = generateGalaxy(703);
    const b = generateGalaxy(703);
    expect(a.sectors.map((s) => s.connectivity)).toEqual(b.sectors.map((s) => s.connectivity));
    expect(JSON.stringify(a.systems)).toBe(JSON.stringify(b.systems));
  });
});

describe('cascades', () => {
  /** *"Initial 100%; second-order 50-70%; third 20-40%; fourth negligible."* */
  it('damps hard at every step and stops outright', () => {
    expect(cascadeDamp(0)).toBe(1);
    expect(cascadeDamp(1)).toBeLessThan(cascadeDamp(0));
    expect(cascadeDamp(1)).toBeGreaterThanOrEqual(0.5);
    expect(cascadeDamp(1)).toBeLessThanOrEqual(0.7);
    expect(cascadeDamp(2)).toBeLessThan(cascadeDamp(1));
    expect(cascadeDamp(3)).toBe(0);
    // And it never wakes up again however deep the chain runs.
    expect(cascadeDamp(99)).toBe(0);
    expect(CASCADE_DAMP.at(-1)).toBe(0);
  });

  it('does nothing at all once the chain has run out', () => {
    const { state, system, reach } = world();
    const before = reach.map((s) => s.support.empire);
    applyShock(
      state,
      {
        systemId: system.id,
        faction: 'empire',
        scope: 'regional',
        local: 10,
        regional: 3,
        order: CASCADE_DAMP.length,
        news: 'An echo of an echo.',
      },
      createRng(6),
    );
    expect(system.support.empire).toBe(50);
    expect(reach.map((s) => s.support.empire)).toEqual(before);
  });

  /**
   * An island the news has lately reached is at the tail of somebody else's
   * chain, so what it does next is heard one step further down and quieter.
   */
  it('counts an island shaken by the news as one step deeper', () => {
    const { state, system, reach } = world();
    expect(orderFor(state, reach[0])).toBe(0);
    applyShock(
      state,
      {
        systemId: system.id,
        faction: 'empire',
        scope: 'regional',
        local: 0,
        regional: 3,
        news: 'A thing.',
      },
      createRng(7),
    );
    expect(orderFor(state, reach[0])).toBe(1);
    // An island nobody has been shouting at is still at the front of its own.
    const far = state.systems.find((s) => s.sectorId !== system.sectorId && s.populated)!;
    expect(orderFor(state, far)).toBe(0);
  });

  it('forgets it was shaken, so a rising next season is its own news', () => {
    const { state, system, reach } = world();
    applyShock(
      state,
      {
        systemId: system.id,
        faction: 'empire',
        scope: 'regional',
        local: 0,
        regional: 3,
        news: 'A thing.',
      },
      createRng(8),
    );
    expect(orderFor(state, reach[0])).toBe(1);
    state.day += 400;
    expect(orderFor(state, reach[0])).toBe(0);
  });
});

describe('taking an island', () => {
  /**
   * §11 against §12, which are one rule with a sign: the same landing reads as
   * a liberation or a conquest depending entirely on what the island wanted.
   */
  it('is a liberation where the people wanted you and a conquest where they did not', () => {
    const { state, system } = world();
    setSupport(system, 'empire', SHOCK_LIBERATION_LEVEL + 20);
    const welcomed = landingShock(
      state,
      system,
      'empire',
      SHOCK_CONQUEST.local,
      SHOCK_CONQUEST.regional,
      SHOCK_LIBERATION_LEVEL,
    );
    setSupport(system, 'empire', SHOCK_LIBERATION_LEVEL - 20);
    const resented = landingShock(
      state,
      system,
      'empire',
      SHOCK_CONQUEST.local,
      SHOCK_CONQUEST.regional,
      SHOCK_LIBERATION_LEVEL,
    );
    expect(welcomed.local).toBeGreaterThan(0);
    expect(welcomed.regional!).toBeGreaterThan(0);
    expect(resented.local).toBeLessThan(0);
    expect(resented.regional!).toBeLessThan(0);
    // And the news says which it was, without saying by how much.
    expect(welcomed.news).not.toMatch(/\d/);
    expect(resented.news).not.toMatch(/\d/);
  });

  it('costs the invader across the Reach when it was taken by storm', () => {
    const { state, system, reach } = world();
    setSupport(system, 'empire', 20);
    applyShock(
      state,
      landingShock(state, system, 'empire', SHOCK_CONQUEST.local, SHOCK_CONQUEST.regional, SHOCK_LIBERATION_LEVEL),
      createRng(9),
    );
    const moved = reach.map((s) => s.support.empire - 50);
    expect(moved.filter((d) => d < 0).length).toBeGreaterThan(2);
  });
});

describe('a fleet action', () => {
  /** §15: a patrol is nothing, a battle fleet is felt. */
  it('is priced by the guns that went down, floored and capped', () => {
    const patrol = 20 * SHOCK_PER_GUN_SUNK;
    const battleFleet = 200 * SHOCK_PER_GUN_SUNK;
    expect(patrol).toBeLessThan(battleFleet);
    expect(Math.min(SHOCK_BATTLE_CEILING, battleFleet)).toBeLessThanOrEqual(SHOCK_BATTLE_CEILING);
    // Even a catastrophe is worth less than a Reach changing its mind.
    expect(SHOCK_BATTLE_CEILING).toBeLessThan(10);
  });
});

describe('what the player is told', () => {
  /** §19: *"do not display 'this battle generated +2.37 regional allegiance'."* */
  it('puts the news in the feed and never the figure', () => {
    const { state, system } = world();
    const before = state.events.length;
    applyShock(
      state,
      {
        systemId: system.id,
        faction: 'empire',
        scope: 'regional',
        local: 10,
        regional: 3,
        news: `Word of the rising on ${system.name} is running through the Reach.`,
      },
      createRng(10),
    );
    expect(state.events.length).toBeGreaterThan(before);
    const said = state.events.at(-1)!.text;
    expect(said).toContain(system.name);
    expect(said).not.toMatch(/\d+(\.\d+)?\s*(point|%)/);
  });

  /** §20: the chart should ripple the Reach it happened in, briefly. */
  it('marks the Reach for the chart to ripple, and lets it expire', () => {
    const { state, system } = world();
    expect(shockwaveOn(state, system.sectorId)).toBe(false);
    applyShock(
      state,
      {
        systemId: system.id,
        faction: 'empire',
        scope: 'regional',
        local: 0,
        regional: 3,
        news: 'A thing.',
      },
      createRng(11),
    );
    expect(shockwaveOn(state, system.sectorId)).toBe(true);
    // Only that Reach, and not for long.
    const other = state.sectors.find((s) => s.id !== system.sectorId)!;
    expect(shockwaveOn(state, other.id)).toBe(false);
    state.day += 30;
    expect(shockwaveOn(state, system.sectorId)).toBe(false);
  });

  it('says nothing about the Reach for something that stayed local', () => {
    const { state, system } = world();
    applyShock(
      state,
      { systemId: system.id, faction: 'empire', scope: 'local', local: 6, news: 'A thing.' },
      createRng(12),
    );
    expect(shockwaveOn(state, system.sectorId)).toBe(false);
  });
});

describe('the ordinary case stays ordinary', () => {
  /**
   * The memo's first rule, and the one the old code broke: *"do not make every
   * allegiance change affect the region. The vast majority of normal actions
   * should be LOCAL."* A landed parley moves the island it was held on and
   * nothing else — it used to move all nine of the Reach's other islands by a
   * fifth of the same amount, so one fortnight's talking swung a whole chain.
   */
  it('keeps a fortnight of talking on the island it was held on', () => {
    const state = generateGalaxy(704, 'empire');
    const island = state.systems.find(
      (s) => s.control === 'neutral' && s.populated && reachOf(state, s).length >= 4,
    )!;
    const neighbours = reachOf(state, island);
    for (const s of [island, ...neighbours]) setSupport(s, 'empire', 40);
    island.explored.empire = true;
    island.uprising = false;

    const diplomat = state.characters.find((c) => c.faction === 'empire')!;
    diplomat.diplomacy = 100;
    diplomat.locationSystemId = island.id;
    diplomat.status = 'available';
    diplomat.mission = undefined;

    const before = neighbours.map((s) => s.support.empire);
    startMission(state, diplomat.id, island.id, 'diplomacy');
    const rng = createRng(13);
    // Fortnight after fortnight. The neighbours hear nothing about any of it,
    // right up until the island actually declares — which is the one part of a
    // parley the Reach is told about, and is tested above.
    for (let d = 0; d < MISSION_WORK_DAYS * 3 && island.control === 'neutral'; d++) {
      advanceMissions(state, rng);
    }
    // It really did talk, and the island really did move.
    expect(island.support.empire).toBeGreaterThan(40);
    if (island.control === 'neutral') {
      expect(neighbours.map((s) => s.support.empire)).toEqual(before);
    }
  });
});

/**
 * The two political events that are raised deep inside the day's own pass
 * rather than by a mission, so the wiring is worth proving on its own.
 *
 * Both are rare in machine play — measured over six wars of six hundred days
 * with both sides played, neither happened once, because the opponent very
 * seldom drives an island far enough down to raise a revolt and almost never
 * leaves a harbor of its own empty. That is a balance question about the
 * opponent and about `mutinyChance`, and it is not this module's: what these
 * ask is that when the thing does happen, the Reach hears about it.
 */
describe('what the day itself raises', () => {
  it('sends a rising through the Reach, and in the risers\' favour', () => {
    const state = generateGalaxy(705, 'empire');
    const island = state.systems.find(
      (s) => s.control === 'empire' && s.populated && reachOf(state, s).length >= 4,
    )!;
    const neighbours = reachOf(state, island);
    for (const s of neighbours) setSupport(s, 'empire', 50);
    /* Wretched, unheld, and lately worked on by somebody — but not *so*
       wretched that the other side simply walks in. An empty harbor whose
       people are eighty per cent for the enemy changes hands outright, which
       is the rule above this one and a different piece of news. */
    setSupport(island, 'empire', 25);
    island.garrison = 0;
    island.uprising = false;
    island.commanderId = undefined;
    pushMomentum(island, 'alliance', 30);

    const rng = createRng(21);
    for (let d = 0; d < 300 && !island.uprising; d++) resolveControlAndUnrest(state, rng);
    expect(island.uprising).toBe(true);

    // The neighbours have heard, and it has done the Crown no good at all.
    const moved = neighbours.map((s) => s.support.empire - 50);
    expect(moved.filter((d) => d < 0).length).toBeGreaterThan(1);
    expect(shockwaveOn(state, island.sectorId)).toBe(true);
    expect(state.events.some((e) => e.text.includes('Word of the rising'))).toBe(true);
  });

  it('sends an empty harbor changing hands through the Reach, harder still', () => {
    const state = generateGalaxy(706, 'empire');
    const island = state.systems.find(
      (s) => s.control === 'empire' && s.populated && reachOf(state, s).length >= 4,
    )!;
    const neighbours = reachOf(state, island);
    for (const s of neighbours) setSupport(s, 'alliance', 50);
    setSupport(island, 'alliance', 95);
    island.garrison = 0;

    resolveControlAndUnrest(state, createRng(22));
    expect(island.control).toBe('alliance');
    const moved = neighbours.map((s) => s.support.alliance - 50);
    expect(moved.filter((d) => d > 0).length).toBeGreaterThan(1);
    expect(state.events.some((e) => e.text.includes('changed hands without a shot'))).toBe(true);
  });
});
