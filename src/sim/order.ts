/**
 * Putting things in the order you want them.
 *
 * Sean: "I want to be able to rearrange ships as I want, order them within the
 * page. This goes for crew and garrisons too. Same with facilities. By default
 * it's what's been there longest."
 *
 * The default falls out for free, because every one of these lists is an array
 * the game pushes onto: a hull laid down goes on the end of `fleet.ships`, a
 * building raised goes on the end of `system.facilities`. Oldest first is what
 * the array already says. So reordering is not a parallel index kept beside the
 * game — it is the array itself, which means it saves with the game, survives a
 * reload, and cannot drift out of step with what is actually there.
 *
 * One move at a time, up or down, rather than a drag. A drag on a phone is a
 * fight with the scroll underneath it; two arrows are a thumb's width each and
 * always hit.
 */

/**
 * Move every item matching `picked` one place up (-1) or down (1), keeping
 * them together.
 *
 * A block rather than a single item, because a grouped row is several hulls
 * wearing one line: moving "4 Kestrels" has to move all four. They are usually
 * already next to each other — grouping reads the array in order, so a row's
 * hulls only interleave if the player put them that way before turning
 * grouping on — and a block that was scattered comes out in one piece on the
 * side it was sent, which is the useful half of the promise.
 *
 * Returns the list unchanged when there is nowhere to go — the top of the
 * list, the bottom of it, or a selection that is the whole list.
 */
export function moveBlock<T>(list: T[], picked: (item: T) => boolean, dir: -1 | 1): T[] {
  const chosen = list.filter(picked);
  if (chosen.length === 0 || chosen.length === list.length) return list;
  const rest = list.filter((item) => !picked(item));
  const first = list.findIndex(picked);
  const last = list.length - 1 - [...list].reverse().findIndex(picked);

  if (dir === -1) {
    // The nearest thing above the block that is not part of it. The block goes
    // in front of that, so one tap passes one neighbour however the array is
    // interleaved.
    const above = list.slice(0, first).filter((item) => !picked(item)).pop();
    if (above === undefined) return list;
    const at = rest.indexOf(above);
    return [...rest.slice(0, at), ...chosen, ...rest.slice(at)];
  }

  const below = list.slice(last + 1).find((item) => !picked(item));
  if (below === undefined) return list;
  const at = rest.indexOf(below) + 1;
  return [...rest.slice(0, at), ...chosen, ...rest.slice(at)];
}

/**
 * Sort by a remembered order, with anything the order has never heard of on
 * the end in the order it already had.
 *
 * For lists whose members have no identity to reorder — a garrison is a count
 * and a roster derived from it, not four objects — so what is remembered is
 * the order of the *kinds*, and a kind nobody has moved keeps its place.
 */
export function byRemembered<T>(list: T[], keyOf: (item: T) => string, order: string[] | undefined): T[] {
  if (!order || order.length === 0) return list;
  const rank = new Map(order.map((key, i) => [key, i]));
  return [...list].sort((a, b) => {
    const ra = rank.get(keyOf(a)) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(keyOf(b)) ?? Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });
}
