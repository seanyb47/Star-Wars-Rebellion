/**
 * The Pirate Lords: three people who between them are the Confederacy.
 *
 * **Rewritten 15 September, night, at Sean's word.** They used to be a person
 * and a ship at once — idle they were a hull in the water, on an errand they
 * were an officer on a quay, and their ship could not sail without them. The
 * lore was right and the mechanic was not. From sixteen measured wars: their
 * powers moved zero allegiance, a Lord was off their ship on one per cent of
 * days, and the opponent was hard-coded never to send one anywhere, because a
 * thing that is two things at once is a thing no rule can reason about. Every
 * file had a special case for them.
 *
 * So: personnel. The ships are lore — named in their bios, on their sheets,
 * never on the water. What a Lord brings is what they can do, and each brings
 * one thing nobody else has, after Rebellion's habit of hiding a real rule
 * inside a piece of character:
 *
 * - **Reyne** and the Swallowtail. Any errand he leads makes the passage in
 *   half the time. Han Solo's trick, and the one Sean asked for by name.
 * - **Hale** and the Open Deck. While she holds a posting, the Moot sits
 *   with her and the island comes round a point a day.
 * - **Jessup** and the Adamant. While he holds a posting, every fleet in that
 *   harbor fights under the Admiral's command.
 *
 * Two of the three hang off Command, which is already a mission and already
 * asks who may take it — so the powers cost an officer's time, are placed
 * somewhere on purpose, and can be seen by the other side.
 *
 * And they can be taken. A Lord is abducted off a quay like anybody else now,
 * which is what makes them a losing condition worth defending: the Crown's war
 * becomes a manhunt rather than a search for three hulls.
 */
import { MOOT_SUPPORT_PER_DAY, PIRATE_LORDS, CROWN_PRINCIPALS, type PirateLord } from './constants';
import { getSystem, inProse, pushEvent } from './helpers';
import type { Character, GameState, LordPower } from './types';

export function lordOfName(name: string): PirateLord | undefined {
  return PIRATE_LORDS.find((l) => l.name === name);
}

export function isLord(character: Character): boolean {
  return lordOfName(character.name) !== undefined;
}

/**
 * Anybody whose capture is a victory condition: the three Lords, and the
 * Crown's two.
 *
 * `isLord` is about who leads the Confederacy and what powers they carry.
 * This is about who ends the war, which since 21 September is a question with
 * an answer on both sides — and the opponent's targeting has to ask the
 * second question rather than the first. It was asking the first: the bounty
 * on a mark read `isLord`, so a Confederate agent standing in the same harbor
 * as the Lord Regent had no more reason to lift him than to lift a harbour
 * master, and the Confederacy's own victory condition could only ever have
 * been met by accident.
 */
export function isPrincipal(character: Character): boolean {
  return isLord(character) || CROWN_PRINCIPALS.includes(character.name);
}

/** The characters who are Lords, in the bible's order. */
export function lords(state: GameState): Character[] {
  return PIRATE_LORDS.map((l) => state.characters.find((c) => c.name === l.name)).filter(
    (c): c is Character => c !== undefined,
  );
}

/** What this person brings that nobody else does, if they are a Lord. */
export function powerOf(character: Character): LordPower | undefined {
  return lordOfName(character.name)?.power;
}

/**
 * A Lord holding a posting on this island, with this power.
 *
 * Posted, not merely standing there. A posting is a deliberate thing — it
 * spends an officer indefinitely and the island says whose it is — so the
 * power is somewhere the player put it on purpose, and somewhere the other
 * side can see and go after.
 */
export function lordPowerAt(
  state: GameState,
  systemId: string,
  power: LordPower,
): Character | undefined {
  const system = state.systems.find((s) => s.id === systemId);
  if (!system?.commanderId) return undefined;
  const held = state.characters.find((c) => c.id === system.commanderId);
  if (!held || held.status !== 'available') return undefined;
  return powerOf(held) === power ? held : undefined;
}

/**
 * How much of the usual passage an errand takes, given who is leading it.
 *
 * The Swallowtail is the fastest thing afloat and Reyne is aboard her whenever
 * he goes anywhere, so anywhere he goes, he is there in half the time. It is
 * the one power that is not a posting: it is about the man travelling, which
 * is the only way a ship that is not on the water can still be felt.
 */
export function passageShare(character: Character): number {
  return powerOf(character) === 'runner' ? 0.5 : 1;
}

/** Whether every Lord is in irons at once — the Crown's victory. */
export function allLordsTaken(state: GameState): boolean {
  const held = lords(state);
  return held.length === PIRATE_LORDS.length && held.every((c) => c.status === 'captured');
}

/** The Crown's own two, the same way. */
export function crownPrincipals(state: GameState): Character[] {
  return state.characters.filter((c) => CROWN_PRINCIPALS.includes(c.name));
}

/**
 * Both of the Crown's principals in irons at once, which is how the
 * Confederacy wins from 21 September.
 *
 * Written exactly as `allLordsTaken` is, including the length check: two of
 * two, so a war in which one of them was never dealt cannot be won by
 * default. They are both bound into every opening for that reason.
 */
export function crownTaken(state: GameState): boolean {
  const held = crownPrincipals(state);
  return held.length === CROWN_PRINCIPALS.length && held.every((c) => c.status === 'captured');
}

/**
 * The Moot, worked once a day wherever Hale is posted.
 *
 * It used to be "wherever the Open Deck lies at anchor", which measured zero
 * over a whole war: the ship never moved, because she was also the Confederacy's
 * seat and the opponent would not commit her, and she sat on an island already
 * at a hundred. A posting is chosen, so it is somewhere it can do something.
 *
 * It works on the Crown's islands too. That was forbidden before and it was the
 * wrong call — the one power the Confederacy has that can be aimed had nothing
 * to aim at. Sailing an argument into their water is the Confederacy's answer
 * to a wall it cannot storm.
 */
export function holdTheMoot(state: GameState): void {
  for (const system of state.systems) {
    if (!lordPowerAt(state, system.id, 'moot')) continue;
    const from = system.support.empire;
    system.support.alliance = Math.min(100, system.support.alliance + MOOT_SUPPORT_PER_DAY);
    system.support.empire = 100 - system.support.alliance;
    if (system.support.empire === from) continue;
  }
}

/**
 * A Lord comes home, cut out of the cells by one of their own.
 *
 * There is no ship to cut out of the Crown's harbor any more. They are put
 * ashore where the Confederacy keeps its books, and that is the whole of it.
 */
export function restoreLord(state: GameState, character: Character): void {
  if (!isLord(character)) return;
  // Worked out here rather than read off the faction's `hqSystemId`, which is
  // a day-old answer: an island can fall in the evening, after home was last
  // chosen, and putting a freed Lord ashore on ground the Crown took that
  // afternoon hands them straight back.
  const home = getSystem(state, confederateHome(state));
  character.locationSystemId = home.id;
  pushEvent(state, {
    kind: 'order',
    text: `${character.name} is back among the Brethren at ${inProse(home.name)}.`,
    systemId: home.id,
    characterId: character.id,
  });
}

/**
 * Where the Confederacy goes home to.
 *
 * It has no seat and now has no flagship either, so it is the island that
 * loves it best — which is what the old rule fell back to once every Lord's
 * ship was gone, and is now simply the rule. Never an island the Crown holds.
 */
/**
 * Where the Confederacy's people go home to, as of right now.
 *
 * The island of theirs that loves them best; failing that — they hold nothing
 * — the friendliest water the Crown does not hold. Never an island the Crown
 * holds, which is the whole point of the second clause.
 */
export function confederateHome(state: GameState): string {
  const held = state.systems
    .filter((s) => s.control === 'alliance' && !s.uprising)
    .sort((a, b) => b.support.alliance - a.support.alliance);
  if (held[0]) return held[0].id;
  const friendly = state.systems
    .filter((s) => s.populated && s.control !== 'empire')
    .sort((a, b) => b.support.alliance - a.support.alliance);
  return friendly[0]?.id ?? state.factions.alliance.hqSystemId;
}

export function syncHome(state: GameState): void {
  const held = state.systems
    .filter((s) => s.control === 'alliance' && !s.uprising)
    .sort((a, b) => b.support.alliance - a.support.alliance);
  if (held[0]) {
    state.factions.alliance.hqSystemId = held[0].id;
    return;
  }
  // Holding nothing at all. The old rule simply kept whatever it had, which
  // over a losing war meant home stayed on an island that had since gone to
  // the Crown — and a Lord cut out of irons was put ashore *inside*
  // their harbor, to be taken again the same week. With no ground of their
  // own, home is the friendliest water the Crown does not hold.
  const friendly = state.systems
    .filter((s) => s.populated && s.control !== 'empire')
    .sort((a, b) => b.support.alliance - a.support.alliance);
  if (friendly[0]) state.factions.alliance.hqSystemId = friendly[0].id;
}


/**
 * The islands a Lord is standing on, for the chart's star.
 *
 * The star used to follow the three hulls. There are no hulls, so it follows
 * the three people, which is what it was always pointing at: here is a third
 * of the Confederacy, come and take it. Anyone in irons or at sea is nowhere
 * in particular and gets no mark.
 */
export function lordIslands(state: GameState): Set<string> {
  const at = new Set<string>();
  for (const lord of lords(state)) {
    if (lord.status === 'captured') continue;
    at.add(lord.locationSystemId);
  }
  return at;
}
