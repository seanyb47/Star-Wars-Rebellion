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
 * - **Hale** and the Free Harbor. While she holds a posting, the Moot sits
 *   with her and the island comes round a point a day.
 * - **Jessup** and the Ironback. While he holds a posting, every fleet in that
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
import { CAPTIVE_DAYS, MOOT_SUPPORT_PER_DAY, PIRATE_LORDS, type PirateLord } from './constants';
import { getSystem, pushEvent } from './helpers';
import type { Character, GameState, LordPower } from './types';

export function lordOfName(name: string): PirateLord | undefined {
  return PIRATE_LORDS.find((l) => l.name === name);
}

export function isLord(character: Character): boolean {
  return lordOfName(character.name) !== undefined;
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

/**
 * The Moot, worked once a day wherever Hale is posted.
 *
 * It used to be "wherever the Free Harbor lies at anchor", which measured zero
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
 * A Lord comes home, exchanged or broken out.
 *
 * There is no ship to cut out of the Crown's harbor any more. They are put
 * ashore where the Confederacy keeps its books, and that is the whole of it.
 */
export function restoreLord(state: GameState, character: Character): void {
  if (!isLord(character)) return;
  const home = getSystem(state, state.factions.alliance.hqSystemId);
  character.locationSystemId = home.id;
  pushEvent(state, {
    kind: 'order',
    text: `${character.name} is back among the Brethren at ${home.name}.`,
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
export function syncHome(state: GameState): void {
  const held = state.systems
    .filter((s) => s.control === 'alliance' && !s.uprising)
    .sort((a, b) => b.support.alliance - a.support.alliance);
  if (held[0]) state.factions.alliance.hqSystemId = held[0].id;
}

/** Days a Lord spends in the Crown's cells before an exchange. */
export const LORD_CAPTIVE_DAYS = CAPTIVE_DAYS;

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
