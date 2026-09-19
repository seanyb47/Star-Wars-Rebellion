import { createContext, useContext, type ReactNode } from 'react';

/** The encyclopedia's tabs, by the name the Almanac knows them by. */
export type EncPage =
  | 'people'
  | 'companies'
  | 'works'
  | 'ships'
  | 'islands'
  | 'glossary'
  | 'rules';

/**
 * Open the encyclopedia at a particular thing.
 *
 * Sean's: *"Units should be larger images and less text. They also should be
 * able to be clicked on and taken to the encyclopedia reference... We want
 * image and minimal possible text in gameplay screens. Click on them for
 * stats, lore, an even larger picture."*
 *
 * Every panel that draws a unit is three or four components deep inside a
 * sheet, and the encyclopedia is held open by the app at the top. Threading a
 * callback down every one of those was going to mean a prop on a dozen
 * components that only ever gets passed on, so it goes through context
 * instead: a screen asks to look something up and does not need to know who
 * answers.
 *
 * `entry` is a slug, matched against the anchors the Almanac puts on every
 * entry — a works type, a company id, a hull class, an officer's name. Leave
 * it out to land at the top of the page.
 */
export type LookUp = (page: EncPage, entry?: string) => void;

const LookUpContext = createContext<LookUp | undefined>(undefined);

export function LookUpProvider({ value, children }: { value: LookUp; children: ReactNode }) {
  return <LookUpContext.Provider value={value}>{children}</LookUpContext.Provider>;
}

/**
 * Ask for the encyclopedia. Undefined where nothing is providing it — the
 * style gallery, a test — and every caller treats that as "no lookup here"
 * rather than crashing.
 */
export function useLookUp(): LookUp | undefined {
  return useContext(LookUpContext);
}

/**
 * Which encyclopedia entry a hull in the water corresponds to.
 *
 * A bridge, and a temporary one. The Encyclopedia was rebuilt on the Fleet
 * Roster of 18 September and anchors its entries on that sheet's ship ids —
 * `CFS-TEM-R3-01` — while the hulls the game actually sails still carry the
 * old ones. Without this every `?` on a ship row would open the Ships page at
 * the top and look broken.
 *
 * Only the counterparts that are genuinely the same ship, or the same ship
 * renamed, are mapped. A hull with no counterpart in the new roster returns
 * undefined and lands the player at the top of the page, which is honest:
 * there is no entry for a Buccaneer because the new fleet does not have one.
 *
 * The whole map deletes itself the day the live roster swaps.
 */
const ENCYCLOPEDIA_SHIP: Record<string, string> = {
  // Same ship, same name.
  sovereign: 'CWN-SOV-S04',
  'sovereign-ii': 'CWN-SOV-R7-02',
  bulwark: 'CWN-BUL-R3-01',
  vanguard: 'CWN-VAN-R1-01',
  'vanguard-ii': 'CWN-VAN-R4-02',
  majestic: 'CWN-MAJ-R8-01',
  swift: 'CFS-SWI-S01',
  tempest: 'CFS-TEM-R3-01',
  cutlass: 'CFS-CUT-R2-01',
  marauder: 'CFS-MAR-R1-01',
  // Same ship, renamed by the new roster.
  kestrel: 'CWN-INT-S02', // → Interceptor I
  'kestrel-ii': 'CWN-INT-R5-02', // → Interceptor II
  fluyt: 'CWN-WAY-S01', // → Wayfinder
  brig: 'CFS-BRI-S02', // → Brigantine
  reef: 'CFS-COR-R8-01', // Reef-class → Coral-Class Dreadnaught
  reefwalker: 'CFS-REE-R4-01', // → Reefwarden
  // Razorback, Razorback II, Fluyt II and the Buccaneer have no counterpart:
  // the new roster cut them rather than renaming them, so they are left out
  // deliberately rather than pointed at the nearest thing.
  //
  // The Urskin Whaler was mapped here until 19 September and is now out for a
  // different reason: she is waiting for her counterpart rather than lacking
  // one. The hull she pointed at, the Gigantic 1,800-hull CFS-URW-R7-01, has
  // been renamed the Urskin Goliath, and the live Whaler is a Medium of 30
  // hull with a harpoon over the bow — sending a player from one to the other
  // would be worse than sending them nowhere. Sean is putting a real Urskin
  // Whaler into the roster sheet; she gets mapped the day she lands.
};

/** The entry to open for a hull, or nothing where the new roster has none. */
export function encyclopediaShip(classId: string): string | undefined {
  return ENCYCLOPEDIA_SHIP[classId];
}
