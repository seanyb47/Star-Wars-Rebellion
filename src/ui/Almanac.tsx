import { useEffect, useMemo, useState, type ReactNode } from 'react';
import terms from '../data/terms.json';
import characterRoster from '../data/characters.json';
import factionData from '../data/factions.json';
import shipFlavourData from '../data/ship-flavour.json';
import reachData from '../data/reaches.json';
import { GlossaryPage, glossaryAnchor, glossaryWords } from './Glossary';
import { IslandLore } from './IslandLore';
import {
  BASE_HIT_CHANCE,
  DAMAGE_DIE,
  EXCHANGE_STOP_SHARE,
  GUNS,
  GUN_VS_SIZE,
  GUN_VS_SPEED,
  HIT_CEILING,
  HIT_FLOOR,
} from '../sim/navycombat';
import {
  NAVY_FACTION_TO_PLAYABLE,
  ROSTER,
  SHIP_SIZES,
  type ShipSize,
} from '../sim/shipdefs';

/**
 * The fleet the Encyclopedia describes.
 *
 * Read off the Fleet Roster rather than off the hulls the live game sails:
 * Sean's instruction was to rebuild this around the new names and stats. The
 * live roster follows when the engine does.
 */
const SIZE_ORDER = SHIP_SIZES;
const SPEED_ORDER = ['Slow', 'Normal', 'Fast', 'Very Fast'] as const;

/** The heaviest armor anybody carries, read from the roster rather than fixed. */
const MAX_ARMOR = Math.max(...ROSTER.ships.map((s) => s.armor));

/**
 * `ShipThumb` draws its fallback silhouette from the old four roles, which the
 * locked rules replaced with four Sizes. One is not the other — a role said
 * what a hull was for and a Size says how hard she is to hit — but they line
 * up closely enough for a 140px drawing, and this is the only place the old
 * vocabulary survives.
 */
const LEGACY_ROLE: Record<ShipSize, 'small' | 'medium' | 'large' | 'transport'> = {
  Small: 'small',
  Medium: 'medium',
  Large: 'large',
  Gigantic: 'large',
};

/**
 * Which painting a hull uses.
 *
 * Most of the roster has art under its own name. The rest inherit from the
 * hull they replaced, which is a lineage rather than a guess — the Coral-Class
 * *is* the Reef-class grown up. One has nothing yet — the Blackfin — and
 * falls through to the drawn silhouette.
 *
 * An entry moves from a borrowed slug to its own the day it is painted: the
 * Wayfinder was on the Fluyt's and is not any more.
 */
const ART_SLUG: Record<string, string> = {
  'CFS-COR-R8-01': 'coral-class',
  'CFS-REE-R4-01': 'reefwalker',
  'CFS-BRI-S02': 'brig',
  'CWN-INT-S02': 'kestrel',
  'CWN-INT-R5-02': 'kestrel-ii',
  'CWN-WAY-S01': 'wayfinder',
  'CWN-MOR-S03': 'morningstar',
  'CWN-RES-R2-01': 'resolute',
  'CWN-JUS-R6-01': 'justiciar',
  'CWN-SOV-S04': 'sovereign',
  'CWN-SOV-R7-02': 'sovereign-ii',
  'CWN-MAJ-R8-01': 'majestic',
  'CWN-BUL-R3-01': 'bulwark',
  'CWN-VAN-R1-01': 'vanguard',
  'CWN-VAN-R4-02': 'vanguard-ii',
  'CFS-SWI-S01': 'swift',
  'CFS-TEM-R3-01': 'tempest',
  'CFS-CUT-R2-01': 'cutlass',
  'CFS-MAR-R1-01': 'marauder',
  'CFS-URG-R7-01': 'urskin-goliath',
  'CFS-CHI-S03': 'chimera',
  // Hers has been on disk since 16 September and was never wired up: the
  // slug was taken by the Gigantic hull until that was renamed the Goliath
  // on the 19th, and the mapping did not move back with the painting.
  'CFS-URW-R3-01': 'urskin-whaler',
  'CFS-TID-S04': 'tidestalker',
  'CFS-IRB-R5-01': 'ironback',
};

/** Counted from the data rather than remembered: the old figure said 71. */
const ISLAND_COUNT = reachData.reaches.reduce((n, r) => n + r.islands.length, 0);
import {
  atSea,
  isPlayable,
  sightOf,
  type Character,
  FACILITY_LABEL,
  GOLD_PER_DAY,
  TROOP_BUILD,
  UPKEEP_PER_DAY,
  FLIP_SUPPORT_MIN,
  GARRISON_FAIR,
  GARRISON_FOR_BAND,
  GARRISON_STRONG,
  PEOPLE_ALLEGIANCE,
  PIRATE_LORDS,
  LORD_POWER_TEXT,
  SMUGGLED_SHARE,
  SUPPORT_FIRM,
  SUPPORT_STEADY,
  YARD_BUILDS,
  type FacilityType,
  type GameState,
  CREATURES,
  SHIP_CLASSES,
  COMMAND_ROLES,
  RECRUITER_ROLE,
  TROOP_TYPES,
  FORT_GUNS,
  RESOURCE_LABEL,
  RESOURCE_BLURB,
  FORT_STRENGTH,
  FORT_REPAIR_PER_DAY,
  REPAIR_PER_DAY,
  REPAIR_AT_A_YARD,
  BOMBARD_PER_COMPANY,
  CIVILIAN_LOYALTY_HIT,
  SUPPORT_FIRM as FIRM,
  isWall,
  wallGuns,
  wallStrength,
  YARD_BUILDABLE,
} from '../sim';
import {
  CategoryIcon,
  CharacterFace,
  FacilityThumb,
  ResourceThumb,
  CompanyIcon,
  ShipThumb,
  CompanyRow,
  CreaturePainting,
  IslandBanner,
  FactionSigil,
} from './art';
import type { PlayableFaction } from '../sim';
import { GoldFig, Sheet } from './components';
import { useSideSwipe } from './LayerStrip';
import { useLookUp, type EncPage } from './lookup';

/** The same rule `painted.ts` uses, so an id and an anchor are the same word. */
export function slugOf(name: string): string {
  return name
    .toLowerCase()
    .replace(/["'’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * A–Z, everywhere on this screen.
 *
 * Sean, 19 September: *"Put all encyclopedia entities in alphabetical order."*
 * Every list here had its own order and each had a reason — buildings in the
 * order a yard unlocks them, hulls by research grade, crew in roster order —
 * and every one of those reasons serves somebody writing the game rather than
 * somebody looking a thing up. A reference is for looking things up.
 *
 * The groups stay: Yours before Theirs, each navy together. Sorting *within* a
 * group is what a reference does, and flattening the Crown and the
 * Confederacy into one A–Z would lose the one distinction every entry on the
 * page turns on. Same call the glossary made on 17 September.
 */
const collate = (a: string, b: string) => a.localeCompare(b, 'en');

/**
 * People sort by the last word of their name, because a page of *Admiral*,
 * *Admiral*, *Captain*, *Captain* is not alphabetical order in any sense a
 * reader wants. Blackwater, Calloway, Carrow, Corvane — the way any book of
 * people does it.
 *
 * The cast makes this easy: nobody is a von or a de, the three mononyms
 * (Sable) are their own surname, and *The Widow Ashgrave* files under A, which
 * is right.
 */
export function surnameOf(name: string): string {
  const words = name.replace(/["'’]/g, '').trim().split(/\s+/);
  return words[words.length - 1] ?? name;
}
const byPerson = (a: { name: string }, b: { name: string }) =>
  collate(surnameOf(a.name), surnameOf(b.name)) || collate(a.name, b.name);
const byName = (a: { name: string }, b: { name: string }) => collate(a.name, b.name);

/**
 * Everything in the game, in one place, read out of the same constants the
 * simulation runs on — so it cannot quietly go out of date the way a
 * hand-written manual would.
 */
/**
 * A mark that says "there is more about this, and it is over there".
 *
 * Sean, 19 September: *"Goal is to keep game clean and minimize text blocks
 * but add ℹ️ info that links to encyclopedia or rules or glossary when needed
 * to explain finer points of game."*
 *
 * The whole point is that it costs a line and not a paragraph. Where a page
 * used to carry the explanation it carries one of these instead, and the
 * explanation lives once, on the Rules page, where somebody who wants it goes
 * looking. A label rather than a bare glyph, because a lone ℹ️ tells you there
 * is something to read and not what about.
 */
function Info({ to, at, children }: { to: EncPage; at?: string; children: ReactNode }) {
  const lookUp = useLookUp();
  if (!lookUp) return null;
  return (
    <button className="infolink" onClick={() => lookUp(to, at)}>
      <span aria-hidden="true">&#8505;</span>
      <span>{children}</span>
    </button>
  );
}

/**
 * The hull a Pirate Lord's stories are about, if this person is one.
 *
 * Three ships nothing builds, nothing sails and nothing fights. They used to
 * be a section at the foot of the Ships page, which put them among the things
 * a player lays down and then had to explain in a paragraph that they are not
 * that. A Lord's ship is a fact about the Lord, so it is read where the Lord
 * is read.
 */
export function loreShip(name: string) {
  const lord = PIRATE_LORDS.find((l) => l.name === name);
  if (!lord) return undefined;
  return SHIP_CLASSES.find((c) => c.id === lord.ship);
}

/** Everything a yard can lay down. The sim's order, sorted for the reader. */
const BUILD_ORDER: FacilityType[] = [...YARD_BUILDABLE].sort((a, b) =>
  collate(FACILITY_LABEL[a], FACILITY_LABEL[b]),
);

/**
 * A crew member's role tags, each one a way into the glossary.
 *
 * Sean, 19 September: *"make their role tags clickable to glossary term."*
 * The tags had been the tail of a grey line — `Human · Tidemaster, Leader,
 * Recruiter` — and eleven words the game never explained anywhere. Nine of
 * them got a glossary entry in the same pass, because a tag that opens the
 * glossary and lands on nothing is worse than a tag that does nothing.
 *
 * `glossaryWords` decides whether a tag is a link rather than a list kept
 * here: a role added to a character with no entry written for it renders as
 * plain text instead of a dead link, and a test fails so somebody writes one.
 */
function RoleTags({ roles }: { roles: readonly string[] }) {
  const lookUp = useLookUp();
  const known = glossaryWords();
  if (roles.length === 0) return null;
  return (
    <div className="roletags">
      {roles.map((role) =>
        lookUp && known.has(role.toLowerCase()) ? (
          <button
            key={role}
            type="button"
            className="roletag roletag--tap"
            onClick={() => lookUp('glossary', glossaryAnchor(role))}
            title={`What is a ${role}?`}
          >
            {role}
          </button>
        ) : (
          <span key={role} className="roletag">
            {role}
          </span>
        ),
      )}
    </div>
  );
}

/**
 * One thing the encyclopedia has an entry for.
 *
 * Carried as an id rather than the object, so that a game panel asking for
 * *the Majestic* and the reference's own list asking for *the Majestic* are
 * the same request and land on the same sheet.
 */
export type Subject =
  | { kind: 'person'; id: string }
  | { kind: 'ship'; id: string }
  | { kind: 'company'; id: string }
  | { kind: 'works'; id: FacilityType }
  | { kind: 'resource'; id: 'forest' | 'gold' }
  | { kind: 'island'; id: string };

/** The anchor a list cell carries, so closing an entry lands you back on it. */
function anchorOf(s: Subject): string {
  return `enc-${s.kind}-${slugOf(s.id)}`;
}

/**
 * Which entry a lookup means, from the slug a caller passed.
 *
 * Callers are all over the game and none of them know about `Subject` — a
 * fleet panel passes a hull's class id, an island panel passes a works type,
 * a crew card passes a name. Each id space is distinct enough to tell apart
 * by looking, so the guessing happens once, here.
 */
export function subjectFor(entry: string | undefined): Subject | null {
  if (!entry) return null;
  if (ROSTER.byId.has(entry)) return { kind: 'ship', id: entry };
  if (entry === 'forest' || entry === 'gold') return { kind: 'resource', id: entry };
  if (YARD_BUILDABLE.includes(entry as FacilityType)) return { kind: 'works', id: entry as FacilityType };
  if (TROOP_TYPES.some((t) => t.id === entry)) return { kind: 'company', id: entry };
  if (everyone().some((c) => slugOf(c.name) === slugOf(entry))) return { kind: 'person', id: slugOf(entry) };
  return null;
}

/**
 * Which of the bible's cast the opening draw actually seated.
 *
 * Seven a side in `characters.json`; four of the Crown's and five of the
 * Confederacy's are drawn into any one war, and the rest sit it out entirely —
 * they are not in the recruit pool either, so no amount of signing on will
 * produce them. Sean's playtest: *"The Encyclopedia lists Ros Carrow and 'Big'
 * Torvik under 'Yours,' but they never appear in the Crew roster."*
 *
 * The reference still lists the whole cast, which is what a reference is for.
 * It stops flying a flag over somebody who is not in the game.
 */
export function inThisWar(state: GameState): Set<string> {
  return new Set(state.characters.map((c) => c.name));
}

/** The whole cast, both navies and the recruit pool, in one list. */
export function everyone() {
  return [
    ...characterRoster.empire.map((c) => ({ ...c, side: 'empire' as const })),
    ...characterRoster.alliance.map((c) => ({ ...c, side: 'alliance' as const })),
    ...characterRoster.recruits.map((c) => ({ ...c, side: 'neutral' as const })),
  ];
}

function GoldLine({ type }: { type: FacilityType }) {
  const earns = GOLD_PER_DAY[type];
  const costs = UPKEEP_PER_DAY[type];
  if (earns > 0) return <GoldFig label="Earns" n={earns} tone="earn" />;
  if (costs > 0) return <GoldFig label={terms.upkeep} n={costs} tone="cost" />;
  return <span className="muted">No running cost</span>;
}

/**
 * What a hull is good and bad against, in the world's voice.
 *
 * Its own file rather than a column on the roster, because
 * `combat-ships.json` says in its own header to be changed by re-reading the
 * sheet and never by hand — a line written in there would be gone the next
 * time Sean rewrites the roster. Falls back to the roster's design notes,
 * which is what was shown before, so a hull added to the sheet without a line
 * still says something.
 */
export function shipFlavour(id: string): string {
  const written = (shipFlavourData.flavour as Record<string, string>)[id];
  return written ?? ROSTER.byId.get(id)?.designNotes ?? '';
}

/**
 * The highest anybody carries, per stat, read off the roster.
 *
 * The bars under the numbers are *relative* — a hull's armor means little
 * until you know somebody out there has thirty — so the scale has to be the
 * fleet's own and has to move when the fleet does. Computed once, from the
 * data, rather than typed in and left to rot the next time Sean rewrites the
 * sheet.
 */
const STAT_MAX = {
  hull: Math.max(...ROSTER.ships.map((s) => s.hull)),
  armor: Math.max(...ROSTER.ships.map((s) => s.armor)),
  repair: Math.max(...ROSTER.ships.map((s) => s.repairRatePerDay)),
  longGuns: Math.max(...ROSTER.ships.map((s) => s.guns.longGuns)),
  heavyGuns: Math.max(...ROSTER.ships.map((s) => s.guns.heavyGuns)),
  lightGuns: Math.max(...ROSTER.ships.map((s) => s.guns.lightGuns)),
  bombardment: Math.max(...ROSTER.ships.map((s) => s.bombardment)),
  troopCapacity: Math.max(...ROSTER.ships.map((s) => s.troopCapacity)),
  size: SHIP_SIZES.length - 1,
  speed: SPEED_ORDER.length - 1,
};

/**
 * One stat: its name, its figure, and a bar of how that figure sits against
 * the biggest in the game.
 *
 * `share` is separate from the text because two of these are words rather
 * than numbers — Size and Speed are ordered categories, so they get a bar off
 * their position in the order and a name in the figure. A stat with no bar to
 * draw (`share` left out) just prints.
 */
function Stat({ label, value, share }: { label: string; value: string | number; share?: number }) {
  return (
    <div className="shipstat">
      <i>{label}</i>
      <b>{value}</b>
      {share !== undefined && (
        <span className="shipstat__bar">
          <span style={{ width: `${Math.max(2, Math.min(100, share * 100))}%` }} />
        </span>
      )}
    </div>
  );
}

/**
 * One entry, opened out of the reference — everything the game knows about
 * one thing.
 *
 * Sean, 19 September: *"when you find the entry you want you click it for max
 * info in a single entry. And then in the game panels if you need to learn
 * about something you click it and it pops up the full max entry."* So this is
 * the bottom of the encyclopedia and it is also what a fleet panel or an
 * island panel opens directly — one destination, reached two ways, which is
 * the point of keying it by id rather than by whatever object the caller
 * happened to be holding.
 *
 * Nothing here is new information. It is what the list rows were carrying
 * before they were cut back to a picture and a name, plus the couple of facts
 * that were only ever stated in page-level prose and never on the thing they
 * were about.
 */
/**
 * Where a crew member is, in a line.
 *
 * Sean, 19 September: *"In the encyclopedia (just for crew) say 'Ashore at
 * [location]' / 'Commanding [fleet name / location name]' ... If en route say
 * 'Enroute to [location]'."* And, on the enemy half: *"With all enemy
 * information we always add a disclaimer it's either unknown whereabouts or it
 * says location and the days since last intelligence so we know the intel is
 * how many days old. Could be true maybe not."*
 *
 * So there are two rules here, not one.
 *
 * **Your own people are simply stated.** You know where your own crew are.
 *
 * **Anyone of theirs is dated.** Their whereabouts is the thing the espionage
 * errand exists to buy, so the line never states it flatly: either you can see
 * them from somewhere of yours this morning — *in sight* — or it is read off
 * the newest report of yours that had them on it and says how old that report
 * is, or you do not know and it says so. Where a report is what you have, the
 * island named is the *report's*, never the one they are actually standing on:
 * naming the true island and calling it twelve days old would be the leak
 * wearing a disclaimer.
 *
 * The unaligned get nothing, for a different reason than secrecy: signing on
 * is set against an island rather than against whoever happens to be standing
 * on it, so where a recruit is standing is not a fact the game means anything
 * by.
 *
 * On the one state Sean's list names that the simulation does not have: taking
 * a deck *is* the posting. `takePost` and `board` both put an officer in
 * `officerIds` and both relieve whatever they held before, so there is no
 * aboard-but-idle to tell apart from commanding — anybody on a ship has her.
 */
export function whereabouts(state: GameState, name: string): string | null {
  const who = state.characters.find((c) => c.name === name);
  if (!who || !isPlayable(who.faction)) return null;
  const at = (id: string) => state.systems.find((s) => s.id === id)?.name;
  if (who.faction !== state.player) return theirWhereabouts(state, who);

  if (who.status === 'captured') {
    // Sean: *"Don't say in irons. Just say Captured at location. If [I don't]
    // know just say captured."* The island is unknown where it was never
    // charted — a seat you have not found is a cell you cannot name.
    const cell = at(who.locationSystemId);
    return cell ? `Captured at ${cell}` : 'Captured';
  }

  // A companion carries no errand of their own; they are wherever the officer
  // leading it is.
  const errand = who.mission ?? state.characters.find((c) => c.id === who.escorting)?.mission;
  if (errand?.phase === 'travelling') return `Enroute to ${at(errand.targetSystemId) ?? 'somewhere'}`;

  const deck = state.fleets.find((f) => f.officerIds.includes(who.id));
  if (deck) {
    return deck.voyage
      ? `Commanding ${deck.name}, enroute to ${at(deck.voyage.targetSystemId) ?? 'somewhere'}`
      : `Commanding ${deck.name}`;
  }

  const chair = state.systems.find((s) => s.commanderId === who.id);
  if (chair) return `Commanding ${chair.name}`;

  // Ashore: on the island the errand is being worked on, or on the one they
  // are standing about on.
  return `Ashore at ${at(errand?.targetSystemId ?? who.locationSystemId) ?? 'somewhere'}`;
}

/** How old a report reads, in the line's own words. */
function intelAge(days: number): string {
  if (days <= 0) return 'reported today';
  return `report ${days} day${days === 1 ? '' : 's'} old`;
}

/**
 * One of theirs, and never without saying how well you know it.
 */
function theirWhereabouts(state: GameState, who: Character): string {
  const standing = atSea(state, who)
    ? undefined
    : state.systems.find((s) => s.id === who.locationSystemId);
  // Live: an island of yours, an unaligned one you have charted, or one you
  // have a hull or a person at. `sightOf` is the same rule the island sheet
  // runs on, so the two screens cannot disagree about what you can see.
  if (standing && sightOf(state, standing, state.player) === 'eyes') {
    const verb = who.status === 'captured' ? 'Captured at' : 'Ashore at';
    return `${verb} ${standing.name} · in sight`;
  }

  // Otherwise the newest report of yours that had them standing on it.
  let best: { island: string; day: number } | undefined;
  for (const report of Object.values(state.intel?.[state.player] ?? {})) {
    if (!report?.officerIds.includes(who.id)) continue;
    if (!best || report.day > best.day) best = { island: report.island.name, day: report.day };
  }
  if (!best) return 'Unknown whereabouts';
  return `Ashore at ${best.island} · ${intelAge(state.day - best.day)}`;
}

function EntrySheet({
  subject,
  state,
  you,
  onClose,
}: {
  subject: Subject;
  state: GameState;
  you: PlayableFaction;
  onClose: () => void;
}) {
  const body = (() => {
    switch (subject.kind) {
      case 'person': {
        const who = everyone().find((c) => slugOf(c.name) === subject.id);
        if (!who) return null;
        const roles: string[] = who.roles ?? [];
        const sworn = PEOPLE_ALLEGIANCE[who.people];
        const lord = PIRATE_LORDS.some((l) => l.name === who.name);
        // Four of the Crown's seven and five of the Confederacy's are seated
        // by the opening draw; the rest sit this war out and are not in the
        // recruit pool either. The entry says so rather than flying a flag
        // over somebody who is not in the game.
        const inPlay = inThisWar(state).has(who.name);
        const where = whereabouts(state, who.name);
        return {
          title: who.name,
          subtitle: `${who.people}${lord ? ` · ${terms.lord}` : ''}${
            inPlay ? '' : ' · not in this war'
          }`,
          emblem: inPlay ? <FactionSigil faction={who.side} size={26} /> : undefined,
          art: (
            <div className="encfull__art">
              <CharacterFace name={who.name} faction={who.side} people={who.people} />
            </div>
          ),
          content: (
            <>
              {/* Where they are, first, because on your own people it is the
                  one thing on the page that changes. */}
              {where && <div className="encfull__where">{where}</div>}
              <RoleTags roles={roles} />
              <div className="statgrid" style={{ marginTop: 10 }}>
                <span><i>{terms.parley}</i><b>{who.ratings.diplomacy}</b></span>
                <span><i>Espionage</i><b>{who.ratings.espionage}</b></span>
                <span><i>Combat</i><b>{who.ratings.combat}</b></span>
                <span><i>Leadership</i><b>{who.ratings.leadership}</b></span>
              </div>
              <p className="encfull__lore">{who.bio}</p>
              {/* And the hull the stories give them, which is where the three
                  legend ships live now. Sean, 19 September: *"Move the ships
                  of stories section in ship encyclopedia under the character
                  lore in the crew profile."* They were a section of their own
                  at the bottom of the Ships page, under a paragraph saying
                  nothing builds them and nothing sails them — which is true,
                  and is exactly why they do not belong on a page of things
                  you build and sail. A Lord's ship is a fact about the Lord.
                  The in-game character sheet has said it this way since the
                  Lords stopped being game pieces; the encyclopedia says it the
                  same way now. */}
              {loreShip(who.name) && (
                <div className="encfull__hull">
                  <ShipThumb
                    faction={loreShip(who.name)!.faction}
                    role={loreShip(who.name)!.role}
                    cls={loreShip(who.name)!.id}
                    size={116}
                  />
                  <div>
                    <b className="small">The {loreShip(who.name)!.name}</b>
                    <div className="tiny muted" style={{ marginTop: 4 }}>
                      {loreShip(who.name)!.blurb}
                    </div>
                  </div>
                </div>
              )}
              {/* The two things `roles` actually gates. They were written on
                  the Crew page in prose and nowhere on the person, so a
                  player had to hold the rule in their head while looking at
                  somebody to know whether it applied to them. */}
              <div className="section-title">What they may be sent to do</div>
              <div className="card small">
                <b>Any errand</b> is open to anybody — the rating decides how it goes.
                Two are not:
                <br />
                <br />
                <b>Recruitment.</b>{' '}
                {roles.includes(RECRUITER_ROLE)
                  ? 'Yes — they are a Recruiter and may keep an open table.'
                  : 'No. Only a Recruiter may lead one.'}
                <br />
                <b>Command of an island.</b>{' '}
                {roles.some((r) => (COMMAND_ROLES as readonly string[]).includes(r))
                  ? 'Yes — they may hold a place rather than visit it.'
                  : 'No. Only a Leader or a General may take a chair.'}
              </div>
              {sworn && (
                <div className="card small" style={{ marginTop: 8 }}>
                  <b>Sworn.</b> The {who.people} sail for the{' '}
                  {factionData[sworn].shortName} and nobody else
                  {sworn === you
                    ? ' — which is you, so they can be signed.'
                    : ', so no recruiter of yours will ever sign them however loyal the island.'}
                </div>
              )}
            </>
          ),
        };
      }
      case 'ship': {
        const cls = ROSTER.byId.get(subject.id);
        if (!cls) return null;
        const total = cls.guns.longGuns + cls.guns.heavyGuns + cls.guns.lightGuns;
        const side = NAVY_FACTION_TO_PLAYABLE[cls.faction];
        return {
          title: cls.name,
          // The crest says whose she is, so the subtitle does not have to.
          subtitle: cls.role,
          emblem: <FactionSigil faction={side} size={26} />,
          art: (
            <div className="encfull__art">
              <ShipThumb
                faction={side}
                role={LEGACY_ROLE[cls.size]}
                cls={ART_SLUG[cls.id] ?? cls.id}
                size={560}
              />
            </div>
          ),
          content: (
            <>
              {/*
                Cost, Build, Upkeep — three labelled chips, one row.

                They were three different shapes in three places: a research
                badge and a bare `650 · 130d` on one line, an upkeep line
                under it. Sean, 19 September, asked for one row of three, and
                he is right that they are one thing — what she costs you, in
                the three currencies a hull is paid for in.

                Research went with them. *"That stays back-end only. Players
                learn it by playing."* The ladder still exists and still gates
                the yards; the reference no longer recites it.
              */}
              <div className="shipcost">
                <div><i>Cost</i><b><GoldFig n={cls.goldToBuild} per={null} /></b></div>
                <div><i>Build</i><b>{cls.daysToBuild} days</b></div>
                <div><i>{terms.upkeep}</i><b><GoldFig n={cls.goldPerDayMaintenance} per="day" /></b></div>
              </div>

              {/*
                Three groups rather than one grid of ten.

                Defence, Handling, Firepower — which is how you think about a
                hull when you are deciding whether to build her, and which
                also fixes the empty cells: a flat ten-cell grid had to show
                `Carries —` on every warship that carries nobody. A stat with
                no value is left out of its group instead, and a group with
                nothing in it does not appear.
              */}
              <div className="row row--between">
                <div className="section-title">Defense</div>
                <Info to="rules" at="armor">What armor stops</Info>
              </div>
              <div className="shipstats">
                <Stat label="Hull" value={cls.hull} share={cls.hull / STAT_MAX.hull} />
                {cls.armor > 0 && (
                  <Stat label="Armor" value={cls.armor} share={cls.armor / STAT_MAX.armor} />
                )}
                {/* A word, never a percentage. v3 of the roster sheet:
                    *"Repair is a BETWEEN-BATTLES stat (never during combat)
                    and displays to players as Slow/Normal/Fast/Very Fast,
                    never a percentage."* It is the same rule the rest of the
                    back-end math already follows — tiers, hit chances and
                    pricing are all hidden — and this was the one number that
                    had leaked out. The bar still moves with the fraction, so
                    the ordering a player sees is the real ordering. */}
                <Stat
                  label="Repairs"
                  value={cls.repairDisplay}
                  share={cls.repairRatePerDay / STAT_MAX.repair}
                />
              </div>

              <div className="row row--between">
                <div className="section-title">Handling</div>
                <Info to="rules" at="size-speed">What size and speed do</Info>
              </div>
              <div className="shipstats">
                <Stat
                  label="Size"
                  value={cls.size}
                  share={(SIZE_ORDER.indexOf(cls.size) + 1) / (STAT_MAX.size + 1)}
                />
                <Stat
                  label="Speed"
                  value={cls.speed}
                  share={(SPEED_ORDER.indexOf(cls.speed as (typeof SPEED_ORDER)[number]) + 1) / (STAT_MAX.speed + 1)}
                />
                {cls.troopCapacity > 0 && (
                  <Stat
                    label="Carries"
                    value={cls.troopCapacity}
                    share={cls.troopCapacity / STAT_MAX.troopCapacity}
                  />
                )}
              </div>

              {total > 0 && (
                <>
                  <div className="row row--between">
                <div className="section-title">Firepower</div>
                <Info to="rules" at="cannon">The three cannon</Info>
              </div>
                  <div className="shipstats">
                    {cls.guns.longGuns > 0 && (
                      <Stat
                        label="Long guns"
                        value={cls.guns.longGuns}
                        share={cls.guns.longGuns / STAT_MAX.longGuns}
                      />
                    )}
                    {cls.guns.heavyGuns > 0 && (
                      <Stat
                        label="Heavy guns"
                        value={cls.guns.heavyGuns}
                        share={cls.guns.heavyGuns / STAT_MAX.heavyGuns}
                      />
                    )}
                    {cls.guns.lightGuns > 0 && (
                      <Stat
                        label="Light guns"
                        value={cls.guns.lightGuns}
                        share={cls.guns.lightGuns / STAT_MAX.lightGuns}
                      />
                    )}
                    {cls.bombardment > 0 && (
                      <Stat
                        label="Bombardment"
                        value={cls.bombardment}
                        share={cls.bombardment / STAT_MAX.bombardment}
                      />
                    )}
                  </div>
                </>
              )}

              {/*
                What she is good and bad against, rather than her stats read
                back. The roster's own Design Notes said *"Heavy Armor 22; 400
                Hull; 7 Long..."*, which is the grid above in a sentence.
              */}
              <p className="encfull__lore">{shipFlavour(cls.id)}</p>
            </>
          ),
        };
      }
      case 'company': {
        const type = TROOP_TYPES.find((t) => t.id === subject.id);
        if (!type) return null;
        return {
          title: type.name,
          subtitle: type.people,
          emblem: <FactionSigil faction={type.faction} size={26} />,
          art: (
            <div className="encfull__art encfull__art--figure">
              <CompanyIcon size={150} type={type.id} />
            </div>
          ),
          content: (
            <>
              <div className="statgrid" style={{ marginTop: 10 }}>
                <span><i>Attack</i><b>{type.offense}</b></span>
                <span><i>Hold</i><b>{type.defense}</b></span>
                <span><i>Watch</i><b>{type.watch}</b></span>
              </div>
              <p className="encfull__lore">{type.blurb}</p>
              <div className="card small">
                <b>{TROOP_BUILD.label}s cost the same whoever they are:</b>{' '}
                <GoldFig n={TROOP_BUILD.costGold} per={null} /> and {TROOP_BUILD.days}d at a{' '}
                {FACILITY_LABEL.training_facility}, then{' '}
                <GoldFig label={terms.upkeep} n={UPKEEP_PER_DAY.troop} tone="cost" /> a day.
                Which kind you get is the island, not the order.
                {type.research && (
                  <>
                    <br />
                    <br />
                    <b>Not yet built.</b> This troop has no way into the game until the
                    research that opens it is in.
                  </>
                )}
              </div>
            </>
          ),
        };
      }
      case 'works': {
        const type = subject.id;
        return {
          title: FACILITY_LABEL[type],
          subtitle: 'Buildings',
          emblem: <FactionSigil faction={state.player} size={26} />,
          art: (
            <div className="encfull__art">
              <FacilityThumb type={type} owner={state.player} fill />
            </div>
          ),
          content: (
            <>
              <div className="row row--between small" style={{ marginTop: 4 }}>
                <span className="tiny">
                  <GoldLine type={type} />
                </span>
                <span className="tiny muted">
                  <GoldFig n={YARD_BUILDS[type].costGold} per={null} /> · {YARD_BUILDS[type].days}d
                </span>
              </div>
              {isWall(type) && (
                <div className="statgrid" style={{ marginTop: 10 }}>
                  <span><i>Guns</i><b>{wallGuns(type)}</b></span>
                  <span><i>Wall</i><b>{wallStrength(type)}</b></span>
                </div>
              )}
              <p className="encfull__lore">{terms.facilityBlurbs[type]}</p>
              <div className="card small">
                <b>It takes a berth.</b> Every building takes one of the island's plots,
                whatever it is, and an island has only so many. Troops and hulls take none.
                <br />
                <br />
                <b>Several of a kind work together.</b> Three of these on one island finish a
                job in a third of the time, and one raised halfway through speeds up the job
                already running.
              </div>
            </>
          ),
        };
      }
      case 'island': {
        const island = state.systems.find((sy) => sy.id === subject.id);
        if (!island) return null;
        const reach = state.sectors.find((se) => se.id === island.sectorId);
        if (!reach) return null;
        return {
          title: island.name,
          subtitle: `${reach.name} · ${reach.sea}`,
          art: (
            <div className="encfull__art">
              <IslandBanner
                archetype={island.archetype}
                seed={island.name}
                faction={island.control}
                settled={island.populated}
                facilities={island.facilities.length}
                height={150}
              />
            </div>
          ),
          content: <IslandLore state={state} system={island} sector={reach} />,
        };
      }
      case 'resource': {
        const type = subject.id;
        return {
          title: RESOURCE_LABEL[type],
          subtitle: 'What is in the ground',
          art: (
            <div className="encfull__art">
              <ResourceThumb type={type} fill />
            </div>
          ),
          content: (
            <>
              <p className="encfull__lore">{RESOURCE_BLURB[type]}</p>
              <div className="card small">
                <b>It is rolled when the world is made and never changes.</b> A{' '}
                {type === 'forest' ? FACILITY_LABEL.refinery : FACILITY_LABEL.mine} can only be
                raised on one, and the works takes the deposit's own plot — so working ground you
                already have costs no room, and a full island can still work what is under it.
              </div>
            </>
          ),
        };
      }
    }
  })();

  if (!body) return null;
  return (
    <Sheet
      title={body.title}
      subtitle={body.subtitle}
      emblem={'emblem' in body ? body.emblem : undefined}
      onClose={onClose}
      top
      banner={body.art}
    >
      {body.content}
    </Sheet>
  );
}

/**
 * Six tabs, because Sean asked for one: *"an encyclopedia that has info and
 * stats on all units... personnel, garrisons, buildings (including defensive
 * structures), ships, islands. So a player can pause the game if they want and
 * research."* One scroll with everything on it was a manual; this is a
 * reference, and the tab is the question you came in with.
 */
/*
 * Sean's order, 19 September: *"Crew, Ships, Troops, Buildings, Locations,
 * Rules, Glossary."* Units first and biggest-first within them, then the
 * places, then the two reference pages — which is roughly how often each one
 * is opened, and puts the two that are all prose at the end where they do not
 * stand between the player and a picture.
 */
const PAGES = [
  { id: 'people', label: 'Crew' },
  { id: 'ships', label: 'Ships' },
  // The id is a route and half the game passes it; only the word changed.
  { id: 'companies', label: terms.troops },
  { id: 'works', label: 'Buildings' },
  { id: 'islands', label: terms.islands },
  { id: 'rules', label: 'Rules' },
  { id: 'glossary', label: 'Glossary' },
] as const;

type Page = (typeof PAGES)[number]['id'];

/** The pages that list units, and so the only ones an entry can open over. */
const UNIT_PAGES: Page[] = ['people', 'companies', 'works', 'ships'];

export function Almanac({
  state,
  onClose,
  page: opening = 'people',
  entry,
}: {
  state: GameState;
  onClose: () => void;
  /** Which page to open on, when something else sent the player here. */
  page?: Page;
  /**
   * A particular thing to land on, by slug — `crown-marines`, `shipyard`,
   * `forest`, a hull's class id, an officer's name. Tapping a unit anywhere in
   * the game opens this page at that unit rather than at the top of a long
   * one, which is the whole point of making the pictures tappable.
   */
  entry?: string;
}) {
  const you = state.player;
  /*
   * Who the draw actually seated this war.
   *
   * Seven a side in the bible, four and five of them in any one game, and the
   * rest never enter it at all — not even into the recruit pool. The people
   * page is a reference to the whole cast and says which of them are here.
   */
  const present = useMemo(() => inThisWar(state), [state]);
  const [page, setPage] = useState<Page>(opening);
  /*
   * The entry currently open on top of the reference.
   *
   * Seeded from `entry`, which is how a game panel gets what Sean asked for —
   * *"in the game panels if you need to learn about something you click it
   * and it pops up the full max entry"*. The list is behind it either way, so
   * closing the entry leaves you somewhere sensible rather than back in the
   * game.
   */
  /*
   * Only the four unit pages can deep-link to an entry. The glossary sends a
   * word — `spec-ops`, `in-irons` — and a word that happened to look like a
   * works type or somebody's name would otherwise pop that unit's sheet over
   * the glossary, which is a class of bug rather than a bug.
   */
  const [openEntry, setOpenEntry] = useState<Subject | null>(() =>
    UNIT_PAGES.includes(opening) ? subjectFor(entry) : null,
  );
  // A sideways drag moves along the tabs, the same gesture the chart and the
  // island panel already use for their rows.
  const swipe = useSideSwipe((step) => {
    const at = PAGES.findIndex((p) => p.id === page);
    const next = at + step;
    if (next < 0 || next >= PAGES.length) return;
    setPage(PAGES[next].id);
  });

  /*
   * Scroll the list to whatever sent us here, so closing the entry lands on
   * its cell rather than at the top of a long page.
   *
   * This used to be the whole answer to a lookup and it had never worked for
   * a hull: the cells were keyed `enc-CWN-MAJ-R8-01` and this looked for
   * `enc-${slugOf(entry)}`, which lower-cases — and `getElementById` does not.
   * Every ship lookup in the game has been landing at the top of the Ships
   * page since the roster went in. Both ends go through `anchorOf` now, so
   * they cannot drift apart again.
   */
  useEffect(() => {
    /*
     * A unit page resolves its slug through `subjectFor`; every other page
     * takes the slug as the anchor.
     *
     * The second half is new on 19 September and fixes something that had
     * never worked: the role tags on a crew member have called
     * `lookUp('glossary', glossaryAnchor(role))` since they were built, the
     * Glossary has put `enc-<anchor>` on every row to receive them, and this
     * effect bailed out before looking because `glossary` is not in
     * `UNIT_PAGES`. Every one of those taps opened the Glossary at the top of
     * a long page. The ℹ️ marks added today go to the Rules page the same way,
     * so it had to work before they were worth adding.
     */
    const subject = UNIT_PAGES.includes(page) ? subjectFor(entry) : null;
    const id = subject ? anchorOf(subject) : entry ? `enc-${entry}` : undefined;
    if (!id) return;
    const found = document.getElementById(id);
    if (!found) return;
    found.scrollIntoView({ block: 'center' });
    found.classList.add('is-landed');
    const off = window.setTimeout(() => found.classList.remove('is-landed'), 1600);
    return () => window.clearTimeout(off);
  }, [entry, page]);

  return (
    <>
    <Sheet
      title="Encyclopedia"
      onClose={onClose}
      stacked
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
      tabs={
        <div className="tabs" role="tablist">
          {PAGES.map((entry) => (
            <button
              key={entry.id}
              role="tab"
              aria-selected={page === entry.id}
              className={`tabs__tab${page === entry.id ? ' tabs__tab--on' : ''}`}
              onClick={() => setPage(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      }
    >
      {page === 'works' && (
        <>
      {/* Sean, 19 September: *"Cut the text at the beginning of each section...
          It's obvious what these are and if not they can read about them in
          the glossary and rules."* Every unit page opened with a paragraph
          explaining what the page was, which is a thing you read once and then
          scroll past for the rest of the game. The pictures start at the top
          now. The rules those paragraphs carried are on the Rules page and in
          the Glossary, which is where somebody who does not know goes. */}
      <div className="encgrid">
        {BUILD_ORDER.map((type) => {
          const subject: Subject = { kind: 'works', id: type };
          return (
            <button
              key={type}
              id={anchorOf(subject)}
              className="encmini"
              onClick={() => setOpenEntry(subject)}
            >
              <span className="encmini__art">
                <FacilityThumb type={type} owner={state.player} fill />
              </span>
              <b className="encmini__name">{FACILITY_LABEL[type]}</b>
              <span className="encmini__line">
                {YARD_BUILDS[type].costGold}g · {YARD_BUILDS[type].days}d
              </span>
            </button>
          );
        })}
      </div>

      {/* The rule that decides where half of these can go at all. */}
      <div className="section-title">What is in the ground</div>
      <div className="encgrid" style={{ marginBottom: 10 }}>
        {(['forest', 'gold'] as const).map((type) => {
          const subject: Subject = { kind: 'resource', id: type };
          return (
            <button
              key={type}
              id={anchorOf(subject)}
              className="encmini"
              onClick={() => setOpenEntry(subject)}
            >
              <span className="encmini__art">
                <ResourceThumb type={type} fill />
              </span>
              <b className="encmini__name">{RESOURCE_LABEL[type]}</b>
            </button>
          );
        })}
      </div>
      <div className="card small">
        <b>Every island has something in it, and that is what its earners are.</b>{' '}
        <b>Forests</b> are common — most islands carry two to five stands of timber. A{' '}
        <b>gold vein</b> is rare: about one island in four has any, and then only one or two.
        What an island holds is rolled when the world is made and never changes.
        <br />
        <br />
        <b>A {FACILITY_LABEL.refinery} can only be raised on a forest, and a{' '}
        {FACILITY_LABEL.mine} only on a vein.</b> The works takes the deposit's own plot — the
        forest becomes the mill — so working ground you have costs no room, and a full island can
        still cut its own trees. What it cannot do is invent ground it does not have.
        <br />
        <br />
        <b>A vein is worth {Math.round(GOLD_PER_DAY.mine / GOLD_PER_DAY.refinery)} mills a day</b>,
        and costs about twice as much to sink. An island with gold on it is a thing worth sailing
        a war across, which is the whole point of the rule: nobody can put a mine wherever they
        like and print money.
        <br />
        <br />
        <b>Burn a mill and the trees are still standing.</b> A deposit comes back when whatever was
        working it comes down, and a worked one never runs dry — resources do not deplete in this
        game. Builders can be sent across the world to work ground on an island that has no yard of
        its own.
        <br />
        <br />
        <b>Timber can be felled for anything, and felling destroys it.</b> A forest in the way of a
        slipway can be cleared to open its plot — it is the one order in the game that takes
        something out of the world for good, and nothing grows it back. A vein cannot be cleared:
        it is in the rock, and an island with gold and no room is a problem rather than a decision.
      </div>

      <div className="section-title">Settled ground and empty ground</div>
      <div className="card small">
        <b>A settled island opens with some of its ground already worked.</b> Some of it, never all
        — every island that has people on it is a going concern with mills already standing and
        something still left to do. That is what you are winning when you court an unaligned island
        or storm a held one: the works come with the island, and only what was half-built when the
        boats came in is lost.
        <br />
        <br />
        <b>An empty island has not been touched.</b> Every deposit on it is raw, and all of its
        worth is still in front of whoever settles it — which is the trade the frontier offers: no
        income on the day you land, and more of it later than a settled island of the same size has
        left to give.
      </div>

      <div className="section-title">How a thing gets built</div>
      <div className="card small">
        <b>One job of a kind at a time, per island.</b> A {FACILITY_LABEL.construction_yard.toLowerCase()}{' '}
        raises structures, a {FACILITY_LABEL.shipyard.toLowerCase()} lays down hulls, a{' '}
        {FACILITY_LABEL.training_facility.toLowerCase()} drills troops — so an island with all
        three can have three things on the go at once, and never a fourth.
        <br />
        <br />
        <b>More of a kind is speed, not volume.</b> Every works of that kind on the island puts its
        hands on the same job. Three yards finish a sixty-day building in twenty days; a fourth
        finished halfway through shortens what is left from that morning on, and a yard lost to a
        landing slows what it was working on the same way. The figure on the button is what{' '}
        <i>this</i> island will take, not the sticker price.
        <br />
        <br />
        <b>It does not have to be built where it is wanted.</b> Any order can name another island
        of yours: the work takes exactly as long, and then the thing is at sea for the length of
        the passage before it arrives. Builders sail to raise a seawall on an island that could
        never have built one; a hull comes off the stocks and joins the squadron lying wherever you
        sent it. The panel keeps the two apart — days to build, and days to deploy.
        <br />
        <br />
        <b>Gold goes at the order, and does not come back.</b> Cancelling stops the work and keeps
        nothing. An island in {terms.mutiny.toLowerCase()} builds nothing at all, and the clock
        simply stops until it is quiet.
      </div>

      {/* Sean's list asks for defensive structures by name, and they are the
          two that are not about money at all. */}
      <div className="section-title">Standing defences</div>
      <div className="card small">
        <b>A {FACILITY_LABEL.fort.toLowerCase()} is {FORT_GUNS} guns that answer a bombardment.</b>{' '}
        It does not fire at ships that are merely lying in its water — an enemy squadron can sit
        off a fortified harbor all year and never be shot at. Open on the walls and the whole
        battery answers, at full weight, for as long as it stands. It also does something no fleet
        can: while one stands, <i>no landing is possible</i>. An enemy who wants the island has to
        beat the wall down with shot first, which is the only thing that can touch it.
        <br />
        <br />
        <b>It has a condition, and its gunnery falls with it.</b> {FORT_STRENGTH} of strength; a
        wall at half is half a battery. Beaten to nothing it is rubble, and rubble does not come
        back — the island has to build a new one. Left alone it mends{' '}
        {Math.round(FORT_REPAIR_PER_DAY * 100)}% of itself a day, twice what a hull manages, which
        is why a siege that stops for a week has lost the week.
        <br />
        <br />
        <b>Hulls mend too, slowly.</b> {Math.round(REPAIR_PER_DAY * 100)}% of a hull a day at
        anchor, {Math.round(REPAIR_AT_A_YARD * 100)}% at an island of yours with a{' '}
        {FACILITY_LABEL.shipyard.toLowerCase()} on it that is not shut in. Nothing mends at sea.
      </div>

        </>
      )}

      {page === 'companies' && (
        <>
      <div className="card">
        <div className="row row--between">
          <b>{TROOP_BUILD.label}</b>
          <span className="tiny muted">
            <GoldFig n={TROOP_BUILD.costGold} per={null} /> · {TROOP_BUILD.days}d
          </span>
        </div>
        <div className="tiny" style={{ marginTop: 2 }}>
          <GoldFig label={terms.upkeep} n={UPKEEP_PER_DAY.troop} tone="cost" />
        </div>
        <div style={{ margin: '8px 0' }}>
          <CompanyRow present={3} />
        </div>
        <p className="tiny muted" style={{ margin: 0 }}>
          Drilled at a {FACILITY_LABEL.training_facility}. Troops hold an island quiet when its
          allegiance falls, and are the only thing that holds an uninhabited island at all.
        </p>
      </div>

      {/* Who those troops are. One line each, three numbers each, the way
          the original does a regiment: what it is worth landing, what it is
          worth holding, and how much it sees. */}
      {/* Both sides in one A-Z, the sigil saying whose. Same reasoning as
          the hulls: you look a name up because you do not already know it. */}
      <div className="encgrid">
        {TROOP_TYPES.slice()
          .sort(byName)
          .map((type) => {
          const subject: Subject = { kind: 'company', id: type.id };
          return (
            <button
              key={type.id}
              id={anchorOf(subject)}
              className="encmini"
              onClick={() => setOpenEntry(subject)}
            >
              <span className="encmini__art encmini__art--figure">
                <CompanyIcon size={92} type={type.id} />
              </span>
              <b className="encmini__name encmini__name--sigil">
                <FactionSigil faction={type.faction} />
                {type.name}
              </b>
              <span className="encmini__line">
                {type.offense} / {type.defense} / {type.watch}
                {type.research && ' · not yet built'}
              </span>
            </button>
          );
        })}
      </div>
      <p className="tiny muted" style={{ marginTop: 6 }}>
        Attack / hold / watch. A landing is still settled on how many troops
        are ashore, not on these — they say who is standing there, and what they
        will be worth when a landing counts them properly.
      </p>

      <div className="section-title">What troops ashore do</div>
      <div className="card small">
        <b>They hold the island.</b> One troop is enough to hold any island against its own
        opinion; an empty harbor is taken by whoever turns up with one. That is the first thing a
        garrison is for and the reason a capital never sends its last one away.
        <br />
        <br />
        <b>They keep it quiet.</b> An island firmly yours — {FIRM} and up — needs{' '}
        {GARRISON_FOR_BAND.firm === 0 ? 'none' : GARRISON_FOR_BAND.firm}. A steady one asks for{' '}
        {GARRISON_FOR_BAND.steady}, a thin one for {GARRISON_FOR_BAND.thin}, and under that it
        rises; {GARRISON_FOR_BAND.uprising} will face down a {terms.mutiny.toLowerCase()} whatever
        the island thinks of you.
        <br />
        <br />
        <b>They watch the back door.</b> Every troop takes a twentieth off what the smugglers are
        running. A hand on the problem, never an answer to it — twenty troops would close a
        harbor and nobody will ever keep twenty on one island.
        <br />
        <br />
        <b>They are the landing party.</b> Aboard a fleet they cost the same {UPKEEP_PER_DAY.troop}{' '}
        a day and go down with the hull carrying them, which is what makes a loaded transport worth
        escorting and worth sinking. A landing needs more troops than are holding the island,
        and no landing at all is possible while a seawall stands.
      </div>

        </>
      )}

      {page === 'people' && (
        <>
      {/* The whole cast in one A-Z, the sigil saying whose — and, for the
          twelve nobody has yet, no sigil at all, which is the plainest way to
          say unaligned. They were three lists before, and a reference you can
          only search by already knowing the answer is not one. */}
      <div className="encgrid">
        {everyone()
          .slice()
          .sort(byPerson)
          .map((who) => {
          const subject: Subject = { kind: 'person', id: slugOf(who.name) };
          const sworn = PEOPLE_ALLEGIANCE[who.people];
          /*
           * Whether this person is in *this* war.
           *
           * The bible has seven a side and the opening seats four and five of
           * them; the rest sit the war out entirely, and are not in the
           * recruit pool either. Sean's playtest: *"The Encyclopedia lists Ros
           * Carrow and 'Big' Torvik under 'Yours,' but they never appear in
           * the Crew roster."* The page stays a reference to the whole cast —
           * that is what a reference is for — but it stops flying a flag over
           * somebody who was never drawn.
           */
          const inPlay = present.has(who.name);
          return (
            <button
              key={who.name}
              id={anchorOf(subject)}
              className={`encmini${inPlay ? '' : ' encmini--absent'}`}
              onClick={() => setOpenEntry(subject)}
            >
              <span className="encmini__art">
                <CharacterFace name={who.name} faction={who.side} people={who.people} />
              </span>
              <b className="encmini__name encmini__name--sigil">
                {inPlay && <FactionSigil faction={who.side} />}
                {who.name}
              </b>
              {PIRATE_LORDS.some((l) => l.name === who.name) && (
                <span className="encmini__tag">{terms.lord}</span>
              )}
              <span className="encmini__line">
                {who.people}
                {!inPlay
                  ? ' · not in this war'
                  : sworn && sworn !== you
                    ? ' · sworn elsewhere'
                    : ''}
              </span>
            </button>
          );
        })}
      </div>

      {/* The teaching, under the pictures rather than over them.

          Sean: *"Within the encyclopedia you can look at pics and scroll."*
          Three paragraphs about what a rating is for had been standing
          between the tab and the first face, which is a page you read once
          and then scroll past twenty-six times. What a *particular* person
          may be sent to do is on their own entry now; this is the general
          rule, and the general rule can wait until after the roster. */}
      <div className="section-title">What a {terms.crewOne} is for</div>
      <div className="card small">
        <b>Four numbers, and each one is a different errand.</b>{' '}
        <b>{terms.parley}</b> wins islands over and stirs them up. <b>Espionage</b> is the quiet work —
        sabotage, and carrying somebody off a quay. <b>Combat</b> tells in a landing and keeps them
        alive when an errand goes wrong. <b>Leadership</b> is worth a hit chance to every gun in
        the squadron they sail with, and holds an island quiet when they are posted to it.
        <br />
        <br />
        <b>A posting is not an errand.</b> Put a {terms.crewOne} in command of an island and they stay:
        the island does not rise while they stand on it, and a stranger asking questions in its
        harbor is far likelier to be found out. They are not available for anything else until
        relieved, and leaving ends the posting.
        <br />
        <br />
        <b>They can be taken.</b> Anyone of yours standing on an island the enemy can reach can be
        carried off, and held. A prisoner stays in the cells until one of their own comes and gets them out — which
        is what makes the Crown's victory a window rather than a list, since it needs all three
        Lords in irons at the same moment.
      </div>


        </>
      )}

      {page === 'islands' && (
        <>
      {/*
        Every island you have charted, and its lore behind it.

        This is where the island panel's Lore tab went — Sean, 19 September:
        *"Cut lore. Move to encyclopedia."* The sea a place lies in and the
        kind of place it is do not change, so they were three paragraphs
        standing in a tab beside four you act on.

        Charted only, which is the one place this page does not show
        everything. Everywhere else the rule is that the reference holds the
        whole game whether or not you own it, because a hull's stats were
        never secret. An island you have never sent anybody to is different:
        what is in its water and what lives on it is exactly what the Explore
        errand is for, and printing it here would hand over the thing the
        errand buys.
      */}
      <div className="section-title">Charted</div>
      <div className="encgrid">
        {state.systems
          .filter((island) => island.explored[you])
          .slice()
          .sort(byName)
          .map((island) => {
            const subject: Subject = { kind: 'island', id: island.id };
            return (
              <button
                key={island.id}
                id={anchorOf(subject)}
                className="encmini"
                onClick={() => setOpenEntry(subject)}
              >
                <span className="encmini__art">
                  <IslandBanner
                    archetype={island.archetype}
                    seed={island.name}
                    faction={island.control}
                    settled={island.populated}
                    facilities={island.facilities.length}
                    height={104}
                  />
                </span>
                <b className="encmini__name">{island.name}</b>
                <span className="encmini__line">
                  {state.sectors.find((se) => se.id === island.sectorId)?.name}
                </span>
              </button>
            );
          })}
      </div>
      <div className="inforow">
        <Info to="rules" at="island">What an island is, and what it is worth</Info>
        <Info to="rules" at="chart">Reading the chart</Info>
        <Info to="rules" at="reaches">The seven {terms.reach}es</Info>
      </div>


        </>
      )}

      {page === 'glossary' && <GlossaryPage />}

      {page === 'rules' && (
        <>
      {/*
        How to win, first and large.
        Sean, 19 September: *"add at the top of rules in big box 'how to win'."*
        It was four fifths of the way down the page under a heading the same
        weight as "Not built yet", which is a strange place to keep the only
        thing in the game you are actually trying to do.
      */}
      <div className="card howtowin">
        <div className="howtowin__title">How to win</div>
        {/* Your own side first, whichever it is: the first line of the box is
            what you are trying to do, and the second is what to stop. */}
        {(you === 'empire'
          ? (['empire', 'alliance'] as const)
          : (['alliance', 'empire'] as const)
        ).map((side) => (
          <p key={side}>
            <b>{factionData[side].name}{side === you ? ' — you' : ''}:</b>{' '}
            {side === 'alliance' ? (
              <>hold Highwater. Take the Crown's capital and the war is over that day.</>
            ) : (
              <>
                have all three Pirate Lords — {PIRATE_LORDS.map((l) => l.name).join(', ')} — in
                irons at the same time. They are people, not ships, so you take one by carrying
                them off a quay the way anybody is taken. Nobody is let go for nothing, so this is
                a window rather than a list: hold two and go for the third before the first is
                broken out.
              </>
            )}
          </p>
        ))}
      </div>


      <div className="section-title">What is in the water</div>
      {(() => {
        /* Only what your own boats have found. Nothing lives in charted water;
           the three dark Reaches hold all of it, and until somebody of yours
           has stood on an island none of this page exists. A bestiary you can
           read on day one is a bestiary, and this is meant to be a log. */
        const seen = CREATURES.filter((beast) =>
          state.systems.some((s) => s.beast === beast.slug && s.beastSeen?.[state.player]),
        );
        return (
          <>
            <div className="card small muted" style={{ marginBottom: 14 }}>
              {seen.length === 0
                ? 'Nothing yet. Nothing lives in water the war has charted — what there is is out in the Reaches nobody has sailed, and it goes in here when your own boats come back from an island having seen it.'
                : 'None of this can be fought, built or counted. It is here because an island panel that mentions the thing in its waters ought to be able to tell you what it is. Only what your own crews have seen.'}
            </div>
            <div className="bestiary">
              {seen.map((beast) => (
                <div key={beast.slug} className="bestiary__entry">
                  <CreaturePainting slug={beast.slug} height={120} />
                  <h4 className="bestiary__name">{beast.name}</h4>
                  <p className="bestiary__where">
                    {state.systems
                      .filter((s) => s.beast === beast.slug && s.beastSeen?.[state.player])
                      .map((s) => s.name)
                      .join(' · ')}
                  </p>
                  <p className="bestiary__lore">{beast.lore}</p>
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {/* An action is the one place the game takes the wheel off the player
          for a moment, so the rules behind it had better be somewhere they can
          be read at leisure rather than at the moment of deciding. */}
        </>
      )}

      {page === 'ships' && (
        <>
      {/*
        The fleet on the locked combat model of 18 September.

        Read off `ROSTER` — the Fleet Roster sheet — rather than off the hulls
        the game currently sails, because Sean's instruction was to rebuild
        this around the new names and stats and scrap the old model. The live
        roster and the engine that fights it follow in the next pass; the note
        at the top says so rather than letting the reader find out.
      */}
      <div className="card small" style={{ borderColor: 'var(--warn, #b8863b)' }}>
        <b>This is the new fleet.</b> {ROSTER.ships.length} hulls on the locked combat
        rules — three kinds of cannon, armor, Size and Speed. The war you are
        playing still sails the old fleet and fights it the old way until the
        engine swap lands, so a name here may not be a name in your harbor
        yet.
      </div>

      {/*
        One list, both navies, A-Z. Sean, 19 September: *"Don't separate crown
        and confederate ships. Put them all in encyclopedia in ABC order. But
        put a mini sigil next to each."*

        Two lists meant you had to know whose a hull was before you could find
        it, which is backwards for a reference — you look a name up *because*
        you do not know. The sigil on the cell says whose it is in less room
        than a heading did, and says it on the cell you are actually looking
        at rather than a scroll-length away at the top of a section.
      */}
      <div className="encgrid">
        {ROSTER.ships
          .slice()
          .sort(byName)
          .map((cls) => {
          const subject: Subject = { kind: 'ship', id: cls.id };
          const side = NAVY_FACTION_TO_PLAYABLE[cls.faction];
          return (
            <button
              key={cls.id}
              id={anchorOf(subject)}
              className="encmini"
              onClick={() => setOpenEntry(subject)}
            >
              <span className="encmini__art">
                <ShipThumb
                  faction={side}
                  role={LEGACY_ROLE[cls.size]}
                  cls={ART_SLUG[cls.id] ?? cls.id}
                  size={280}
                />
              </span>
              {/* The sigil sits with the words, not over the painting.
                  Sean, 19 September: *"Move sigils out of the image box and
                  into the text box."* Laid over the art it was a badge stuck
                  on a picture — it covered the corner of whatever it was
                  labelling and had to carry its own dark disc to stay legible
                  against sky or sea. Beside the name it needs neither, and it
                  is where you are already reading. */}
              <b className="encmini__name encmini__name--sigil">
                <FactionSigil faction={side} />
                {cls.name}
              </b>
              <span className="encmini__line">
                {cls.size} · {cls.hull} hull
              </span>
            </button>
          );
        })}
      </div>
      <div className="inforow">
        <Info to="rules" at="cannon">
          How guns, armor and speed decide an action
        </Info>
        <Info to="rules" at="bombardment">
          Bombarding an island
        </Info>
      </div>


        </>
      )}


      {page === 'rules' && (
        <>
      {/* The three powers as rules, because they are rules. They used to live
          on three ship sheets, where a Crown player never saw them and a
          Confederate player only saw them by tapping a hull. */}
      {/*
        Everything below came off the Ships and Locations pages on 19
        September. Sean: *"Move all the ship game info stuff to glossary and
        rules sections... In locations in encyclopedia, same thing, cut all
        the rules text."* Those two pages are a shelf of pictures you scroll
        until you find the thing you came for; thirteen sections of rules
        between the pictures and the reader is a manual with a gallery in
        it. The rules did not get worse by moving — they got findable, and
        the pages they left are now the length of what they list.
      */}
      <div className="section-title" id="enc-cannon">The three cannon</div>
      <div className="card small">
        <b>A gun is the thing that acts, not a ship.</b> There is no single
        number for how hard a hull hits. Every individual cannon aboard her
        makes its own attack, with its own roll to hit and its own dice — ten
        guns are ten attacks — so a battery of many small guns and one great
        gun behave nothing alike even where they add to the same weight.
        <br />
        <br />
        <b>Light.</b> {GUNS.Light.dice}d{DAMAGE_DIE} a cannon, and the most
        accurate thing afloat at <b>+{GUNS.Light.accuracy}</b> to hit. It
        ignores no armor at all, which is the whole of its weakness: against a
        heavily plated hull most of what it lands is stopped dead.
        <br />
        <br />
        <b>Heavy.</b> {GUNS.Heavy.dice}d{DAMAGE_DIE} a cannon — twice a light
        gun's dice — and it halves the armor in front of it. It is also the
        worst-aimed gun in the world against anything small or quick.
        <br />
        <br />
        <b>Long.</b> {GUNS.Long.dice}d{DAMAGE_DIE} a cannon, and it takes a
        quarter off the armor in front of it rather than the half a heavy gun
        takes — opening a hull is the heavy gun's trade, not its. Two things
        are its own: it <b>fires first</b>, before any other gun on either
        side, and it is the <b>only</b> gun that reaches a fleet already
        running.
      </div>

      <div className="section-title" id="enc-armor">Armor</div>
      <div className="card small">
        <b>It is subtracted, not a chance to shrug.</b> A gun rolls its damage,
        the armor in front of it comes off the top, and what is left goes into
        the hull. Armor runs from nothing to {MAX_ARMOR}, and only the
        Majestic carries {MAX_ARMOR}.
        <br />
        <br />
        <b>Penetration takes some of it away.</b> A heavy gun faces half the
        armor and a long gun three quarters of it, rounded up; a light gun
        faces all of it. So against armor 25 a 25-damage light hit does{' '}
        <b>nothing</b>, a 26-damage light hit does <b>1</b>, the same roll from
        a long gun faces 19 and does <b>7</b>, and from a heavy gun it faces 13
        and does <b>13</b>.
        <br />
        <br />
        That one rule is most of why a fleet needs more than one kind of gun.
        Light guns cannot open a first-rate however many of them you bring.
      </div>

      <div className="section-title" id="enc-size-speed">Size, speed, and what can hit you</div>
      <div className="card small">
        <b>Size and speed change accuracy and nothing else.</b> A heavy gun
        firing at a sloop is not doing less damage — it is <i>missing</i>. The
        dice are the same dice whatever they are pointed at.
        <br />
        <br />
        Every shot starts at <b>{BASE_HIT_CHANCE}%</b> and is moved by what the
        gun is and what it is shooting at, then held between{' '}
        <b>{HIT_FLOOR}%</b> and <b>{HIT_CEILING}%</b>.
      </div>
      <div className="card small">
        <div className="tiny muted" style={{ marginBottom: 4 }}>
          Against a hull of this size:
        </div>
        <div className="statgrid">
          {SIZE_ORDER.map((sz) => (
            <span key={sz}>
              <i>{sz}</i>
              <b>
                {GUN_VS_SIZE.Light[sz] >= 0 ? '+' : ''}{GUN_VS_SIZE.Light[sz]} ·{' '}
                {GUN_VS_SIZE.Long[sz] >= 0 ? '+' : ''}{GUN_VS_SIZE.Long[sz]} ·{' '}
                {GUN_VS_SIZE.Heavy[sz] >= 0 ? '+' : ''}{GUN_VS_SIZE.Heavy[sz]}
              </b>
            </span>
          ))}
        </div>
        <div className="tiny muted" style={{ margin: '6px 0 4px' }}>
          Against a hull of this speed:
        </div>
        <div className="statgrid">
          {SPEED_ORDER.map((sp) => (
            <span key={sp}>
              <i>{sp}</i>
              <b>
                {GUN_VS_SPEED.Light[sp] >= 0 ? '+' : ''}{GUN_VS_SPEED.Light[sp]} ·{' '}
                {GUN_VS_SPEED.Long[sp] >= 0 ? '+' : ''}{GUN_VS_SPEED.Long[sp]} ·{' '}
                {GUN_VS_SPEED.Heavy[sp] >= 0 ? '+' : ''}{GUN_VS_SPEED.Heavy[sp]}
              </b>
            </span>
          ))}
        </div>
        <div className="tiny muted" style={{ marginTop: 6 }}>
          Light · long · heavy, in that order. A heavy gun is{' '}
          {GUN_VS_SIZE.Heavy.Small} against a small hull and{' '}
          {GUN_VS_SPEED.Heavy['Very Fast']} against a very fast one — put those
          together and it hits a small very fast hull <b>one time in ten</b>,
          which is why a first-rate alone is meat for a swarm and why a fleet
          of all one size is a fleet somebody can bring the wrong guns to.
        </div>
      </div>

      <div className="section-title" id="enc-action">An action at sea</div>
      <div className="card small">
        <b>Where it happens.</b> Wherever your hulls and theirs lie in the same
        water — nobody manoeuvres and there is no open sea to meet in. A
        creature is nobody's, so anchoring in its water is an action on its
        own. A fort is not: the walls answer a bombardment, not a fleet.
        <br />
        <br />
        <b>A round has two phases.</b> First every long gun on both sides fires
        — targets chosen, then dice — and anything sunk by them is gone before
        it can answer. Then every light and heavy gun on both sides fires as
        one solution, so a hull going down still gets her shot away and two
        ships can sink each other.
        <br />
        <br />
        <b>What you press is a Combat Exchange, not a round.</b> One press of
        Fight runs rounds until a side has lost{' '}
        <b>{Math.round(EXCHANGE_STOP_SHARE * 100)}%</b> of the hull it had when
        the Exchange opened, or a fleet is gone. Two fresh fleets trade several
        rounds before that; a battered one comes back to you almost at once.
        <br />
        <br />
        <b>Who is aboard still tells.</b> The best Leadership serving with a
        fleet adds to the hit chance of every cannon it fires.
        <br />
        <br />
        <b>Nothing mends mid-battle</b>, and damage stays on the hull when it
        ends, until she is repaired somewhere quiet.
      </div>

      <div className="section-title" id="enc-targeting">Choosing a target</div>
      <div className="card small">
        <b>Guns are laid before dice are rolled.</b> Each cannon is pointed at
        whichever enemy removes the most threat per shot it would take to
        remove her — her weight of guns divided by how many hits she has left
        in her.
        <br />
        <br />
        <b>They do not pile on.</b> Once enough fire is laid on a hull to
        expect her sunk, the rest of the battery looks elsewhere, so a fleet
        spreads instead of emptying itself into one wreck.
        <br />
        <br />
        <b>And nobody holds fire.</b> A cannon that could not get through a
        hull's armor scores nothing against her, so she comes last on its list
        and it shoots at anything else first — but if she is all there is, it
        fires at her anyway and achieves nothing. An unarmed transport is a
        target only when nothing armed is left.
      </div>

      <div className="section-title" id="enc-breaking-off">Breaking off</div>
      <div className="card small">
        <b>It always works.</b> There is no roll that keeps you in a fight you
        have decided to leave, and no further round once you have left.
        <br />
        <br />
        <b>What it costs is the long guns.</b> Nothing else reaches a fleet
        already under way. A pursuer with no long guns watches you leave and
        cannot touch you, which is the clearest single reason to build them.
        <br />
        <br />
        <b>And they fire four times, not once.</b> The pursuers rake you as you
        turn away, and your ships get clear in the order they can run: the
        fastest are gone after the first volley, and the slowest take all four.
        Speed is never worth more than it is on the day you decide to leave.
        <br />
        <br />
        <b>Armor is no help at all here.</b> Raking fire goes in at the stern,
        where the plate is not, so a wall of armor that makes a first-rate
        unkillable in line does nothing for her while she runs.
      </div>

      <div className="section-title" id="enc-bombardment">Bombardment</div>
      <div className="card small">
        <b>Against stone, never against ships.</b> Bombardment is its own
        rating and it contributes nothing to a fleet action — a hull can carry
        a siege train and be nearly harmless at sea, and the Ironback is
        exactly that.
        <br />
        <br />
        Shot goes at the walls while any stand; only when none do can it reach
        the garrison, and it takes {BOMBARD_PER_COMPANY} of weight to break one
        troop. The wall answers a bombardment at its full weight the whole
        time, which is what makes the first day of a siege the expensive one.
        Shot that goes looking for troops in a town finds the town: the
        island's regard falls {CIVILIAN_LOYALTY_HIT} a day, every island in the
        Reach hears of it, and each further day costs more than the last.
      </div>
      <div className="section-title" id="enc-island">What an island is</div>
      <div className="card small">
        <b>{ISLAND_COUNT} of them, and every one is the same four questions.</b> Who holds it. What it
        thinks of you, out of a hundred — and the two sides' shares always add to a hundred, so a
        point you win is a point they lose. How much room it has to build on. And how many
        troops are standing on it.
        <br />
        <br />
        <b>Room is one pool.</b> Between four and twelve berths; every building takes one, and
        troops and hulls take none. A starting island opens with eight to twelve. What is built
        is what the island is worth: two earners and a yard is a going concern, and an island with
        one berth left is a decision.
        <br />
        <br />
        <b>Control is the garrison first.</b> One troop ashore holds an island whatever it thinks
        of you. Allegiance only decides who holds it when nobody is standing there — an island of
        yours with an empty harbor and the enemy at {FLIP_SUPPORT_MIN} regard declares for them,
        and nobody argues.
      </div>

      <div className="section-title" id="enc-settled">Settled, empty, and dark</div>
      <div className="card small">
        <b>A settled island</b> has people on it who have an opinion. It earns, it can rise, and it
        is taken by landing more troops than are holding it — or by talking it round, if nobody
        has chosen a side.
        <br />
        <br />
        <b>An empty island</b> has nobody on it and belongs to nobody. There is nothing there to
        fight: put one troop on the beach and it is yours. Finish anything on it and it is
        settled, loyal to you outright, and worth its four to ten berths — which makes the frontier
        the cheapest capital in the game.
        <br />
        <br />
        <b>A dark island</b> is one your charts do not have. You cannot send anyone to it, or sail
        at it, until somebody has explored it. Three of the seven Reaches start dark, and what is
        in their water starts dark with them.
      </div>

      <div className="section-title" id="enc-reaches">The seven Reaches</div>
      <p className="tiny muted" style={{ marginTop: 0 }}>
        A chain of islands in one Sea. Allegiance won on one spills a fifth onto the rest of its
        chain, so a Reach is the unit a war is actually fought in.
      </p>
      <div className="stack">
        {[...reachData.reaches].sort(byName).map((reach) => (
          <div key={reach.name} className="card row row--between small">
            <span>
              <b>{reach.name}</b>
              <span className="tiny muted"> · {reach.sea}</span>
            </span>
            <span className="tiny muted">
              {reach.islands.length} {terms.islands.toLowerCase()} ·{' '}
              {reach.role === 'home'
                ? "the Crown's"
                : reach.role === 'contested'
                  ? 'two a side'
                  : reach.role === 'frontier'
                    ? 'uncharted'
                    : 'nobody\u2019s'}
            </span>
          </div>
        ))}
      </div>

      <div className="section-title" id="enc-island-faces">The three faces of an island</div>
      <div className="stack">
        {(
          [
            ['missions', 'Crew', 'Your crew standing on it, or sailing to it.'],
            ['military', 'Ashore', 'Troops ashore, whoever holds the island.'],
            ['facilities', 'Built', 'What is built there, and what you can raise.'],
          ] as const
        ).map(([kind, label, text]) => (
          <div key={kind} className="card row" style={{ gap: 10 }}>
            <span className="facility__icon">
              <CategoryIcon kind={kind} size={22} />
            </span>
            <div style={{ flex: 1 }}>
              <b className="small">{label}</b>
              <div className="tiny muted">{text}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="section-title" id="enc-chart">Reading the chart</div>
      <div className="card small">
        <b>One mark, three sizes.</b> Every island is a dot in the colour of whoever holds it, and
        the chart speaks by making that dot bigger or smaller — never by changing what it is. Two
        things are not dots: the <b>star</b>, which marks Highwater and wherever a Pirate Lord is
        standing and nothing else ever, and a <b>numeral</b> on the two filters whose answer is a
        figure you want exactly — Production and Idle crew.
        <br />
        <br />
        At rest, on Loyalty, the size is how firmly the island is held. Under a filter it is the
        answer: large if the island answers, small if it does not. Garrisons has three sizes of its
        own — {GARRISON_STRONG} troops or more is large, {GARRISON_FAIR} to{' '}
        {GARRISON_STRONG - 1} medium, under {GARRISON_FAIR} small.
      </div>

      <div className="section-title" id="enc-loyalty">What loyalty is worth</div>
      <div className="card small">
        <b>Three bands, and the chart draws them.</b> An island firmly yours — {SUPPORT_FIRM} and
        up — is a large dot and ships everything it makes to you. Steady, from {SUPPORT_STEADY},
        is a medium dot and loses{' '}
        {Math.round(SMUGGLED_SHARE.steady * 100)}% of its trade out the back door. Thin, below
        that, is a small dot and loses {Math.round(SMUGGLED_SHARE.thin * 100)}%, and an island in{' '}
        {terms.mutiny.toLowerCase()} pays you nothing and hands the enemy{' '}
        {Math.round(SMUGGLED_SHARE.uprising * 100)}%. Every coin the smugglers take is a coin the
        other side banks, so a Reach you have let go sour is paying for their fleet. A thin island
        talks, too: sooner or later it turns up on their charts with everything on it — its
        buildings, its troops, and any island of yours in the same chain they had not found.
        <br />
        <br />
        <b>Troops ashore answer both.</b> A firm island needs none; a steady one asks for{' '}
        {GARRISON_FOR_BAND.steady}; a thin one for {GARRISON_FOR_BAND.thin}, and under that it will
        rise; {GARRISON_FOR_BAND.uprising} will face down a {terms.mutiny.toLowerCase()} whatever
        the island still thinks of you. Every troop also takes a twentieth off what the
        smugglers move — a hand on the problem, not an answer to it.
      </div>

        </>
      )}

      {page === 'people' && (
        <>
      <div className="section-title">What the three Lords do</div>
      <div className="card small">
        Each of the three brings one thing nobody else in the war can. Two of them are paid for
        with a posting — put the Lord in command of an island and the power works there — so a
        power is somewhere you chose, costs you the officer, and can be seen and gone after.
        {PIRATE_LORDS.map((l) => (
          <span key={l.name}>
            <br />
            <br />
            <b>{l.name.split(' ').slice(-1)[0]}.</b> {LORD_POWER_TEXT[l.power]}
          </span>
        ))}
      </div>

        </>
      )}

      {page === 'rules' && (
        <>
      <div className="section-title">Not built yet</div>
      <div className="card small muted">
        Tidecraft, the Leviathan, and a research tree with things in it are designed but not in the
        game. Everything else the original had is: fleets and sea battles, and eight kinds of errand
        — {terms.parley.toLowerCase()}, stirring up trouble, recruiting, {terms.survey.toLowerCase()},
        {' '}{terms.sabotage.toLowerCase()}, abduction, command of an island in revolt, and the yards.
        You never pick one; the island decides.
      </div>
        </>
      )}

    </Sheet>
    {/* On top of the reference, and the thing a game panel opens directly. */}
    {openEntry && (
      <EntrySheet
        subject={openEntry}
        state={state}
        you={you}
        onClose={() => setOpenEntry(null)}
      />
    )}
    </>
  );
}
