import { describe, expect, it } from 'vitest';
import { PEOPLE_ALLEGIANCE, mayServe } from '../constants';
import { recruitPool } from '../missions';
import { generateGalaxy } from '../galaxy';
import characterRoster from '../../data/characters.json';
import type { GameState } from '../types';

/**
 * Sworn peoples.
 *
 * Sean, 19 September: *"The bog folk are exclusively crown imperium and the
 * urskin are exclusively confederacy."* Not a preference — a rule, and the
 * kind that is easy to break silently by adding one character to the wrong
 * list months later. So it is checked against the shipped roster rather than
 * only against the helper.
 */
const world = (): GameState => generateGalaxy(11, 'empire');

const everyone = [
  ...characterRoster.empire.map((e) => ({ ...e, side: 'empire' as const })),
  ...characterRoster.alliance.map((e) => ({ ...e, side: 'alliance' as const })),
];

describe('the peoples who will only serve one side', () => {
  it('names the two, and only the two', () => {
    expect(PEOPLE_ALLEGIANCE).toEqual({ 'Bog-folk': 'empire', Urskin: 'alliance' });
  });

  it('lets anybody else serve either side', () => {
    expect(mayServe('Human', 'empire')).toBe(true);
    expect(mayServe('Human', 'alliance')).toBe(true);
    expect(mayServe('Reef-folk', 'empire')).toBe(true);
    expect(mayServe(undefined, 'empire')).toBe(true);
  });

  it('will not let an Urskin sign Crown articles, or a Bog-folk Confederate ones', () => {
    expect(mayServe('Urskin', 'alliance')).toBe(true);
    expect(mayServe('Urskin', 'empire')).toBe(false);
    expect(mayServe('Bog-folk', 'empire')).toBe(true);
    expect(mayServe('Bog-folk', 'alliance')).toBe(false);
  });

  it('has nobody on the shipped roster standing on the wrong side', () => {
    for (const person of everyone) {
      expect([person.name, mayServe(person.people, person.side)]).toEqual([person.name, true]);
    }
  });
});

describe('the recruit pool reads the rule', () => {
  it('offers each side a different pool, and neither the other side’s sworn', () => {
    const state = world();
    // Everybody unaligned, wherever they are in the arrival schedule.
    for (const c of state.characters) if (c.faction === 'neutral') c.appearsOnDay = 1;

    const crown = recruitPool(state, 'empire');
    const brethren = recruitPool(state, 'alliance');
    expect(crown.every((c) => c.people !== 'Urskin')).toBe(true);
    expect(brethren.every((c) => c.people !== 'Bog-folk')).toBe(true);
    // And the rule only removes the sworn: everyone else is on both lists.
    const unsworn = (n: string) => !PEOPLE_ALLEGIANCE[n];
    const open = state.characters.filter((c) => c.faction === 'neutral' && unsworn(c.people ?? ''));
    for (const c of open) {
      expect([c.name, crown.some((x) => x.id === c.id)]).toEqual([c.name, true]);
      expect([c.name, brethren.some((x) => x.id === c.id)]).toEqual([c.name, true]);
    }
  });

  it('still counts everybody unclaimed when no side is named', () => {
    const state = world();
    for (const c of state.characters) if (c.faction === 'neutral') c.appearsOnDay = 1;
    const all = recruitPool(state);
    expect(all.length).toBeGreaterThanOrEqual(recruitPool(state, 'empire').length);
    expect(all.length).toBeGreaterThanOrEqual(recruitPool(state, 'alliance').length);
  });
});
