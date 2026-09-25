import { describe, expect, it } from 'vitest';
import { PEOPLE_ALLEGIANCE, RECRUIT_LAST_DAY, mayServe } from '../constants';
import { hasArrived, recruitPool } from '../missions';
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
  /**
   * Five now.
   *
   * Sean, 19 September: *"Move all reef folk and urskin to confederacy only
   * crew."* The Urskin already were. The Reef-folk were the gap, and the
   * bible had been saying otherwise for a week — §3 calls them the
   * Confederacy's best admirals and says the Crown held them on oar-benches
   * under an indenture it has never apologised for, while the rule happily
   * let a Crown recruiter sign Maren Quist out of the pool.
   *
   * The lore package of 20 September adds two more: **The Hushed** are the
   * Crown's, bound by an old bargain whose terms are still undecided, and the
   * **Shoal-folk** are the Confederacy's. Both were unnamed here, which meant
   * either side could sign them — the same defect the Reef-folk line closed.
   */
  it('names the five, and only the five', () => {
    expect(PEOPLE_ALLEGIANCE).toEqual({
      'Bog-folk': 'empire',
      Urskin: 'alliance',
      'Reef-folk': 'alliance',
      'The Hushed': 'empire',
      'Shoal-folk': 'alliance',
    });
  });

  it('lets anybody else serve either side', () => {
    expect(mayServe('Human', 'empire')).toBe(true);
    expect(mayServe('Human', 'alliance')).toBe(true);
    // A people nobody has sworn. Shoal-folk stood here until 20 September.
    expect(mayServe('Rumor Guild', 'empire')).toBe(true);
    expect(mayServe(undefined, 'empire')).toBe(true);
  });

  it('will not let the Hushed sign Confederate articles, or a Shoal-folk Crown ones', () => {
    expect(mayServe('The Hushed', 'empire')).toBe(true);
    expect(mayServe('The Hushed', 'alliance')).toBe(false);
    expect(mayServe('Shoal-folk', 'alliance')).toBe(true);
    expect(mayServe('Shoal-folk', 'empire')).toBe(false);
  });

  it('will not let an Urskin or a Reef-folk sign Crown articles, or a Bog-folk Confederate ones', () => {
    expect(mayServe('Urskin', 'alliance')).toBe(true);
    expect(mayServe('Urskin', 'empire')).toBe(false);
    expect(mayServe('Reef-folk', 'alliance')).toBe(true);
    expect(mayServe('Reef-folk', 'empire')).toBe(false);
    expect(mayServe('Bog-folk', 'empire')).toBe(true);
    expect(mayServe('Bog-folk', 'alliance')).toBe(false);
  });

  it('has nobody on the shipped roster standing on the wrong side', () => {
    for (const person of everyone) {
      expect([person.name, mayServe(person.people, person.side)]).toEqual([person.name, true]);
    }
  });
});

/**
 * The two who swore for themselves.
 *
 * Sean, 22 September: *"I do want to have one Urskin, called like the Betrayer
 * or something, that is a late recruit on the Imperium side"*, and on the bog
 * folk, *"probably only like one bog witch on the Confederacy side."* Both cut
 * straight across the rule above, and that is the point of them — a bounty man
 * is only worth a name because no Urskin takes Crown coin, and Mother Bracken
 * is defined by the name she gave back.
 *
 * So the rule keeps its teeth and the exception is per person, in `sworn`. The
 * count is pinned: an exception that is not rare is not an exception, and the
 * way this goes wrong quietly is a third one three months from now.
 */
describe('the two who swore against their own people', () => {
  const defectors = characterRoster.recruits.filter(
    (e): e is typeof e & { sworn: 'empire' | 'alliance' } => 'sworn' in e,
  );

  it('is two of them, by name', () => {
    expect(defectors.map((e) => [e.name, e.people, e.sworn])).toEqual([
      ['Mother Bracken', 'Bog-folk', 'alliance'],
      ['Vurn Kesk', 'Urskin', 'empire'],
    ]);
  });

  it('puts each of them on exactly the side their people will not serve', () => {
    for (const who of defectors) {
      expect([who.name, PEOPLE_ALLEGIANCE[who.people]]).not.toEqual([who.name, who.sworn]);
      expect([who.name, mayServe(who.people, who.sworn, who.sworn)]).toEqual([who.name, true]);
      const other = who.sworn === 'empire' ? 'alliance' : 'empire';
      expect([who.name, mayServe(who.people, other, who.sworn)]).toEqual([who.name, false]);
    }
  });

  it('lets the Crown sign the Betrayer and nobody else, in a real world', () => {
    const state = world();
    for (const c of state.characters) if (c.faction === 'neutral') c.appearsOnDay = 1;
    const crown = recruitPool(state, 'empire');
    const brethren = recruitPool(state, 'alliance');
    // Named rather than counted: whether either is dealt into a given war is
    // the draw's business, but if they are, they are on one list only.
    const on = (pool: typeof crown, name: string) => pool.some((c) => c.name === name);
    if (state.characters.some((c) => c.name === 'Vurn Kesk')) {
      expect([on(crown, 'Vurn Kesk'), on(brethren, 'Vurn Kesk')]).toEqual([true, false]);
    }
    if (state.characters.some((c) => c.name === 'Mother Bracken')) {
      expect([on(crown, 'Mother Bracken'), on(brethren, 'Mother Bracken')]).toEqual([false, true]);
    }
  });

  it('keeps the Betrayer out of the opening — he is a late find', () => {
    const notBefore = (characterRoster.recruits.find((e) => e.name === 'Vurn Kesk') as {
      notBefore: number;
    }).notBefore;
    expect(notBefore).toBeGreaterThan(300);
    expect(notBefore).toBeLessThanOrEqual(RECRUIT_LAST_DAY);
    for (const seed of [3, 11, 55, 101, 203, 501]) {
      const state = generateGalaxy(seed, 'empire');
      const him = state.characters.find((c) => c.name === 'Vurn Kesk');
      if (him) expect([seed, him.appearsOnDay! >= notBefore]).toEqual([seed, true]);
    }
  });
});

/**
 * And the other half of the same problem: the two ashore on the first morning
 * are drawn from the unsworn, so neither side opens with the mission greyed
 * out and no way to find out why. Before the pool grew this was luck.
 */
describe('the opening pair', () => {
  it('gives both sides somebody they could actually sign on day one', () => {
    for (const seed of [3, 11, 55, 101, 203, 321, 501]) {
      const state = generateGalaxy(seed, 'empire');
      const ashore = state.characters.filter((c) => c.faction === 'neutral' && hasArrived(state, c));
      expect([seed, ashore.length]).toEqual([seed, 2]);
      for (const side of ['empire', 'alliance'] as const) {
        expect([seed, side, recruitPool(state, side).length]).toEqual([seed, side, 2]);
      }
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
    /*
     * A people's rule, and the two people who are the exception to it.
     *
     * `sworn` overrides `PEOPLE_ALLEGIANCE` and is the whole point of the pair
     * who carry it: Vurn Kesk is called the Betrayer *because* an Urskin does
     * not sign Crown articles, and Mother Bracken gave her name back over the
     * same rule the other way. So the assertion is "no Urskin **unsworn to the
     * Crown**", not "no Urskin".
     *
     * It read the absolute form until 25 September and passed on luck: only
     * eight of the unaligned are drawn into a war, and the seed this file uses
     * had not been drawing the Betrayer. Cutting the opening to six islands a
     * side moved the rng stream, he turned up, and the test caught the rule
     * working exactly as written.
     */
    expect(crown.every((c) => c.people !== 'Urskin' || c.sworn === 'empire')).toBe(true);
    expect(crown.every((c) => c.people !== 'Reef-folk' || c.sworn === 'empire')).toBe(true);
    expect(brethren.every((c) => c.people !== 'Bog-folk' || c.sworn === 'alliance')).toBe(true);
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
