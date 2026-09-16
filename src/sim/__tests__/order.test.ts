import { describe, expect, it } from 'vitest';
import { byRemembered, moveBlock } from '../order';
import { generateGalaxy } from '../galaxy';
import { reorderCrew, reorderShips } from '../commands';

const ids = (xs: Array<{ id: string }>) => xs.map((x) => x.id);

describe('putting a list in order', () => {
  const list = ['a', 'b', 'c', 'd'];
  const only = (want: string[]) => (item: string) => want.includes(item);

  it('moves one item one place, either way', () => {
    expect(moveBlock(list, only(['c']), -1)).toEqual(['a', 'c', 'b', 'd']);
    expect(moveBlock(list, only(['b']), 1)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('stops at the ends rather than wrapping', () => {
    expect(moveBlock(list, only(['a']), -1)).toEqual(list);
    expect(moveBlock(list, only(['d']), 1)).toEqual(list);
  });

  it('moves a block of neighbours together, one place', () => {
    expect(moveBlock(list, only(['b', 'c']), 1)).toEqual(['a', 'd', 'b', 'c']);
    expect(moveBlock(list, only(['b', 'c']), -1)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('gathers a block that was not together to begin with', () => {
    // A grouped row is several hulls on one line, and nothing stops a player
    // from having interleaved them before turning grouping on. Where exactly
    // a scattered block lands is not worth pinning down; that it ends up in
    // one piece, and on the side it was sent, is.
    const down = moveBlock(list, only(['a', 'c']), 1);
    expect(down.filter((x) => x === 'a' || x === 'c')).toEqual(['a', 'c']);
    expect(down.indexOf('a')).toBe(down.indexOf('c') - 1);
    expect(down.indexOf('a')).toBeGreaterThan(list.indexOf('a'));

    const up = moveBlock(list, only(['b', 'd']), -1);
    expect(up.indexOf('b')).toBe(up.indexOf('d') - 1);
    expect(up.indexOf('d')).toBeLessThan(list.indexOf('d'));
  });

  it('does nothing when the block is everything', () => {
    expect(moveBlock(list, () => true, -1)).toEqual(list);
    expect(moveBlock(list, () => true, 1)).toEqual(list);
  });

  it('sorts by a remembered order and leaves strangers on the end', () => {
    const kinds = [{ k: 'x' }, { k: 'y' }, { k: 'z' }];
    expect(byRemembered(kinds, (e) => e.k, ['z', 'x']).map((e) => e.k)).toEqual(['z', 'x', 'y']);
    // No order remembered is the order it came in.
    expect(byRemembered(kinds, (e) => e.k, undefined).map((e) => e.k)).toEqual(['x', 'y', 'z']);
  });
});

describe('the commands that use it', () => {
  it('reorders a fleet, and the order is the game state', () => {
    const state = generateGalaxy(501, 'empire');
    const fleet = state.fleets.find((f) => f.faction === 'empire' && f.ships.length > 2)!;
    const before = ids(fleet.ships);
    const moved = reorderShips(state, fleet.id, [before[2]], -1);
    expect(moved.error).toBeUndefined();
    const after = ids(moved.state.fleets.find((f) => f.id === fleet.id)!.ships);
    expect(after).toEqual([before[0], before[2], before[1], ...before.slice(3)]);
    // And the state it came from is untouched: commands never edit in place.
    expect(ids(state.fleets.find((f) => f.id === fleet.id)!.ships)).toEqual(before);
  });

  it('reorders crew, and says so when the thing is not there', () => {
    const state = generateGalaxy(501, 'empire');
    const crew = state.characters.filter((c) => c.faction === 'empire');
    const shifted = reorderCrew(state, [crew[1].id], -1);
    expect(shifted.error).toBeUndefined();
    const order = shifted.state.characters.map((c) => c.id);
    expect(order.indexOf(crew[1].id)).toBeLessThan(order.indexOf(crew[0].id));

    expect(reorderShips(state, 'nofleet', ['x'], 1).error).toBe('No such fleet.');
  });
});
