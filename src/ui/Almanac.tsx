import { useEffect, useState } from 'react';
import terms from '../data/terms.json';
import characterRoster from '../data/characters.json';
import factionData from '../data/factions.json';
import reachData from '../data/reaches.json';
import { GlossaryPage, glossaryAnchor, glossaryWords } from './Glossary';
import {
  BASE_HIT_CHANCE,
  DAMAGE_DIE,
  EXCHANGE_STOP_SHARE,
  GUNS,
  GUN_VS_SIZE,
  GUN_VS_SPEED,
  HIT_CEILING,
  HIT_FLOOR,
  hitChance,
} from '../sim/navycombat';
import {
  NAVY_FACTIONS,
  NAVY_FACTION_TO_PLAYABLE,
  ROSTER,
  SHIP_SIZES,
  fleetOf,
  type NavyFaction,
  type ShipSize,
} from '../sim/shipdefs';

/**
 * The fleet the Encyclopedia describes.
 *
 * Read off the Fleet Roster rather than off the hulls the live game sails:
 * Sean's instruction was to rebuild this around the new names and stats. The
 * live roster follows when the engine does.
 */
const ROSTER_SIDES: Array<{ faction: NavyFaction; label: string }> = NAVY_FACTIONS.map((f) => ({
  faction: f,
  label: f,
}));

const SIZE_ORDER = SHIP_SIZES;
const SPEED_ORDER = ['Slow', 'Normal', 'Fast', 'Very Fast'] as const;

/** The heaviest armour anybody carries, read from the roster rather than fixed. */
const MAX_ARMOUR = Math.max(...ROSTER.ships.map((s) => s.armor));

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
 * Most of the twenty-four have art under their own name. The rest inherit from
 * the hull they replaced, which is a lineage rather than a guess — the
 * Coral-Class *is* the Reef-class grown up. Six have nothing yet
 * (Resolute, Justiciar, Chimera, Tidestalker, Blackfin, Ironback) and fall
 * through to the drawn silhouette.
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
};

/** Counted from the data rather than remembered: the old figure said 71. */
const ISLAND_COUNT = reachData.reaches.reduce((n, r) => n + r.islands.length, 0);
import {
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
  troopsOf,
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
} from './art';
import type { PlayableFaction } from '../sim';
import { GoldFig, Sheet } from './components';
import { useSideSwipe } from './LayerStrip';
import { useLookUp } from './lookup';

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

function GoldLine({ type }: { type: FacilityType }) {
  const earns = GOLD_PER_DAY[type];
  const costs = UPKEEP_PER_DAY[type];
  if (earns > 0) return <GoldFig label="Earns" n={earns} tone="earn" />;
  if (costs > 0) return <GoldFig label={terms.upkeep} n={costs} tone="cost" />;
  return <span className="muted">No running cost</span>;
}

/**
 * Six tabs, because Sean asked for one: *"an encyclopedia that has info and
 * stats on all units... personnel, garrisons, buildings (including defensive
 * structures), ships, islands. So a player can pause the game if they want and
 * research."* One scroll with everything on it was a manual; this is a
 * reference, and the tab is the question you came in with.
 */
const PAGES = [
  { id: 'people', label: 'Crew' },
  { id: 'companies', label: 'Companies' },
  { id: 'works', label: 'Buildings' },
  { id: 'ships', label: 'Ships' },
  { id: 'islands', label: terms.islands },
  { id: 'glossary', label: 'Glossary' },
  { id: 'rules', label: 'Rules' },
] as const;

type Page = (typeof PAGES)[number]['id'];

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
  const them: PlayableFaction = you === 'empire' ? 'alliance' : 'empire';
  /*
   * Both navies, the player's own first — and everything else besides.
   *
   * Sean, 18 September: *"encyclopedia should have all units not just what is
   * in the game, so i should see all crew for example."* It had been showing
   * one side of everything: seven of the twenty-six people, one navy's hulls,
   * one navy's companies. A reference that only lists what you happen to own
   * is a roster, and the game already has one of those on the Crew screen.
   *
   * Fog of war is not the reason any of it was hidden — an enemy hull's stats
   * were never secret, only which of them are in the water — so nothing here
   * gives away anything a player could not read off a ship sheet.
   */
  const sides: Array<{ faction: PlayableFaction; label: string }> = [
    { faction: you, label: 'Yours' },
    { faction: them, label: factionData[them].name },
  ];
  const [page, setPage] = useState<Page>(opening);
  // A sideways drag moves along the tabs, the same gesture the chart and the
  // island panel already use for their rows.
  const swipe = useSideSwipe((step) => {
    const at = PAGES.findIndex((p) => p.id === page);
    const next = at + step;
    if (next < 0 || next >= PAGES.length) return;
    setPage(PAGES[next].id);
  });

  // Land on the thing that sent us here. Done after paint, because the page
  // it lives on may only have just been rendered.
  useEffect(() => {
    if (!entry) return;
    const found = document.getElementById(`enc-${slugOf(entry)}`);
    if (!found) return;
    found.scrollIntoView({ block: 'center' });
    found.classList.add('is-landed');
    const off = window.setTimeout(() => found.classList.remove('is-landed'), 1600);
    return () => window.clearTimeout(off);
  }, [entry, page]);

  return (
    <Sheet
      title="Encyclopedia"
      subtitle="Every unit in the game, with the numbers the rules actually use"
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
      <div className="section-title">Buildings</div>
      <p className="tiny muted" style={{ marginTop: 0 }}>
        A building either earns {terms.gold.toLowerCase()} or costs it, and every one of them
        takes one free berth on the island, whatever it is.
        Buildings are raised by a {FACILITY_LABEL.construction_yard} — the island's own, or
        whichever of yours would have it there soonest, whose builders sail over and add the
        passage after the work. Companies and hulls are sent the same way: drilled or laid down
        where you have the ground for it, and delivered where you asked.
      </p>
      <div className="stack">
        {BUILD_ORDER.map((type) => (
          <div key={type} id={`enc-${slugOf(type)}`} className="card row" style={{ gap: 10, alignItems: 'flex-start' }}>
            {/* The painting, not the glyph. Every works but the two defences
                has one, and an encyclopedia of what things are is the last
                place that should be showing a line drawing instead. */}
            <span className="facility__thumb">
              <FacilityThumb type={type} owner={state.player} width={84} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row row--between">
                <b>{FACILITY_LABEL[type]}</b>
                <span className="tiny muted">
                  <GoldFig n={YARD_BUILDS[type].costGold} per={null} /> · {YARD_BUILDS[type].days}d
                </span>
              </div>
              <div className="tiny" style={{ marginTop: 2 }}>
                <GoldLine type={type} />
                {isWall(type) && (
                  <span className="muted">
                    {' · '}
                    {wallGuns(type)} guns · {wallStrength(type)} wall
                  </span>
                )}
              </div>
              <div className="tiny muted" style={{ marginTop: 2 }}>
                {terms.facilityBlurbs[type]}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* The rule that decides where half of these can go at all. */}
      <div className="section-title">What is in the ground</div>
      <div className="stack" style={{ marginBottom: 10 }}>
        {(['forest', 'gold'] as const).map((type) => (
          <div key={type} id={`enc-${type}`} className="card row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <span className="facility__thumb">
              <ResourceThumb type={type} width={84} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{RESOURCE_LABEL[type]}</b>
              <div className="tiny muted" style={{ marginTop: 3 }}>{RESOURCE_BLURB[type]}</div>
            </div>
          </div>
        ))}
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
        {FACILITY_LABEL.training_facility.toLowerCase()} drills companies — so an island with all
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
      <div className="section-title">Companies</div>
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
          Drilled at a {FACILITY_LABEL.training_facility}. Companies hold an island quiet when its
          allegiance falls, and are the only thing that holds an uninhabited island at all.
        </p>
      </div>

      {/* Who those companies are. One line each, three numbers each, the way
          the original does a regiment: what it is worth landing, what it is
          worth holding, and how much it sees. */}
      <p className="tiny muted" style={{ margin: '10px 0 6px' }}>
        A company is one of these. Which you get is the island: the line
        companies are everywhere, sailors come ashore where hulls are built, and
        the rest are a people rather than a purchase — they are on their own
        islands and nowhere else.
      </p>
      {sides.map(({ faction, label }) => (
      <div key={faction}>
      <div className="section-title">{label}</div>
      <div className="stack">
        {[...troopsOf(faction)].sort(byName).map((type) => (
          <div key={type.id} id={`enc-${type.id}`} className="card row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <span className="company__thumb">
              <CompanyIcon size={76} type={type.id} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row row--between">
                <b className="small">{type.name}</b>
                <span className="tiny muted">
                  {type.offense} / {type.defense} / {type.watch}
                </span>
              </div>
              <div className="tiny muted" style={{ marginTop: 1 }}>
                {type.people}
                {type.research && ' · not yet built'}
              </div>
              <div className="tiny muted" style={{ marginTop: 4 }}>{type.blurb}</div>
            </div>
          </div>
        ))}
      </div>
      </div>
      ))}
      <p className="tiny muted" style={{ marginTop: 6 }}>
        Attack / hold / watch. A landing is still settled on how many companies
        are ashore, not on these — they say who is standing there, and what they
        will be worth when a landing counts them properly.
      </p>

      <div className="section-title">What companies ashore do</div>
      <div className="card small">
        <b>They hold the island.</b> One company is enough to hold any island against its own
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
        <b>They watch the back door.</b> Every company takes a twentieth off what the smugglers are
        running. A hand on the problem, never an answer to it — twenty companies would close a
        harbor and nobody will ever keep twenty on one island.
        <br />
        <br />
        <b>They are the landing party.</b> Aboard a fleet they cost the same {UPKEEP_PER_DAY.troop}{' '}
        a day and go down with the hull carrying them, which is what makes a loaded transport worth
        escorting and worth sinking. A landing needs more companies than are holding the island,
        and no landing at all is possible while a seawall stands.
      </div>

        </>
      )}

      {page === 'people' && (
        <>
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

      {[
        ...sides.map((side) => ({
          ...side,
          people: characterRoster[side.faction as 'empire' | 'alliance'],
          art: side.faction,
        })),
        /*
         * And the ones nobody has yet. The recruit pool is twelve people the
         * Recruitment errand draws from — half the cast, and until now not
         * visible anywhere in the game until one of them signed on.
         */
        {
          faction: 'neutral' as const,
          label: 'Unaligned',
          people: characterRoster.recruits,
          art: 'neutral' as const,
        },
      ].map(({ faction, label, people, art }) => (
      <div key={faction}>
      <div className="section-title">{label}</div>
      <div className="stack">
        {[...people].sort(byPerson).map((entry) => (
          <div key={entry.name} id={`enc-${slugOf(entry.name)}`} className="card enccrew">
            {/*
              Head, name, tags, numbers, life — in that order, and each one in
              its own band rather than three of them run together in a line of
              grey text.

              Sean, 19 September: *"Crew images are too big now. Reduce by
              40%... Overall ui for encyclopedia needs some work. Looks a
              little messy."* The art was the full 384px width of the card,
              which is where a 256px face crop is upscaled half again and goes
              soft. At 60% it is about 230px — under the source for the first
              time, so it is also the first time this picture has been sharp.

              It sits beside the name now rather than above it, which is what
              buys the tidying: the header is one band, the tags are one band,
              the numbers are one band. Companies, buildings and hulls on the
              other tabs have read art-left-text-right all along, so the crew
              page had been the odd one out as well as the loud one.
            */}
            <div className="enccrew__head">
              <div className="enccrew__art">
                <CharacterFace name={entry.name} faction={art} people={entry.people} />
              </div>
              <div className="enccrew__who">
                {/* The same quiet rank the crew screen wears, for the same
                    reason: three of the names on this page are the
                    Confederacy's victory condition and nothing distinguished
                    them from a purser. */}
                {PIRATE_LORDS.some((l) => l.name === entry.name) && (
                  <div className="crewcard__rank">{terms.lord}</div>
                )}
                <b className="enccrew__name">{entry.name}</b>
                <div className="tiny muted">{entry.people}</div>
                {/* A sworn people. Worth saying on the Unaligned list above
                    all: an Urskin standing on one of your islands is somebody
                    the Crown can never sign, and a recruiter sent for them is
                    a wasted voyage. */}
                {PEOPLE_ALLEGIANCE[entry.people] && (
                  <div className="enccrew__sworn">
                    {PEOPLE_ALLEGIANCE[entry.people] === you
                      ? 'Will only serve you'
                      : `Only serves the ${factionData[PEOPLE_ALLEGIANCE[entry.people]!].shortName}`}
                  </div>
                )}
                {/* The four numbers, stacked beside the head rather than in a
                    band under it. Two things at once: it fills a column that
                    was mostly empty for anybody without a rank or a sworn
                    people, and it puts the ratings level with the face, which
                    is the pairing you actually read — who they are and what
                    they are worth. */}
                <dl className="enccrew__ratings">
                  <div><dt>{terms.parley}</dt><dd>{entry.ratings.diplomacy}</dd></div>
                  <div><dt>Espionage</dt><dd>{entry.ratings.espionage}</dd></div>
                  <div><dt>Combat</dt><dd>{entry.ratings.combat}</dd></div>
                  <div><dt>Leadership</dt><dd>{entry.ratings.leadership}</dd></div>
                </dl>
              </div>
            </div>
            <RoleTags roles={entry.roles} />
            <p className="enccrew__bio">{entry.bio}</p>
          </div>
        ))}
      </div>
      </div>
      ))}

        </>
      )}

      {page === 'islands' && (
        <>
      <div className="section-title">What an island is</div>
      <div className="card small">
        <b>{ISLAND_COUNT} of them, and every one is the same four questions.</b> Who holds it. What it
        thinks of you, out of a hundred — and the two sides' shares always add to a hundred, so a
        point you win is a point they lose. How much room it has to build on. And how many
        companies are standing on it.
        <br />
        <br />
        <b>Room is one pool.</b> Between four and twelve berths; every building takes one, and
        companies and hulls take none. A starting island opens with eight to twelve. What is built
        is what the island is worth: two earners and a yard is a going concern, and an island with
        one berth left is a decision.
        <br />
        <br />
        <b>Control is the garrison first.</b> One company ashore holds an island whatever it thinks
        of you. Allegiance only decides who holds it when nobody is standing there — an island of
        yours with an empty harbor and the enemy at {FLIP_SUPPORT_MIN} regard declares for them,
        and nobody argues.
      </div>

      <div className="section-title">Settled, empty, and dark</div>
      <div className="card small">
        <b>A settled island</b> has people on it who have an opinion. It earns, it can rise, and it
        is taken by landing more companies than are holding it — or by talking it round, if nobody
        has chosen a side.
        <br />
        <br />
        <b>An empty island</b> has nobody on it and belongs to nobody. There is nothing there to
        fight: put one company on the beach and it is yours. Finish anything on it and it is
        settled, loyal to you outright, and worth its four to ten berths — which makes the frontier
        the cheapest capital in the game.
        <br />
        <br />
        <b>A dark island</b> is one your charts do not have. You cannot send anyone to it, or sail
        at it, until somebody has explored it. Three of the seven Reaches start dark, and what is
        in their water starts dark with them.
      </div>

      <div className="section-title">The seven Reaches</div>
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

      <div className="section-title">The three faces of an island</div>
      <div className="stack">
        {(
          [
            ['missions', 'Crew', 'Your crew standing on it, or sailing to it.'],
            ['military', 'Ashore', 'Companies ashore, whoever holds the island.'],
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

        </>
      )}

      {page === 'glossary' && <GlossaryPage />}

      {page === 'rules' && (
        <>

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
        <b>This is the new fleet.</b> Twenty-four hulls on the locked combat
        rules — three kinds of cannon, armour, Size and Speed. The war you are
        playing still sails the old fleet and fights it the old way until the
        engine swap lands, so a name here may not be a name in your harbour
        yet.
      </div>

      <div className="section-title">Every hull</div>
      <p className="tiny muted" style={{ margin: '0 0 8px' }}>
        Four a side from the first morning, then eight the shipwrights open in
        order: put a {terms.crewOne} on research at a loyal island with a yard,
        and each grade of craft draws what the grade before could not. The
        Crown improves families it already trusts — a <b>II</b> is the same
        design taken further — and the Confederacy, which has no such
        programme, answers with different ships instead.
      </p>
      {ROSTER_SIDES.map(({ faction, label }) => (
      <div key={faction}>
      <div className="section-title">{label}</div>
      <div className="stack">
        {[...fleetOf(faction)].sort(byName).map((cls) => {
          const total = cls.guns.longGuns + cls.guns.heavyGuns + cls.guns.lightGuns;
          return (
            <div key={cls.id} id={`enc-${cls.id}`} className="card">
              <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <ShipThumb
                  faction={NAVY_FACTION_TO_PLAYABLE[faction]}
                  role={LEGACY_ROLE[cls.size]}
                  cls={ART_SLUG[cls.id] ?? cls.id}
                  size={140}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row row--between">
                    <b>{cls.name}</b>
                    <span className="tiny muted">
                      <GoldFig n={cls.goldToBuild} per={null} /> · {cls.daysToBuild}d
                    </span>
                  </div>
                  <div className="row row--between">
                    <span className="tiny">
                      {cls.research.kind === 'start' ? (
                        <span className="muted">Buildable from day one</span>
                      ) : (
                        <b className="enc-craft">Research {cls.research.raw}</b>
                      )}
                    </span>
                    <span className="tiny muted">{cls.role}</span>
                  </div>
                  <div className="tiny" style={{ marginTop: 2 }}>
                    <GoldFig label={terms.upkeep} n={cls.goldPerDayMaintenance} tone="cost" />
                  </div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>{cls.designNotes}</div>
                </div>
              </div>
              {/* Guns are counts of individual cannon, each of which makes its
                  own attack. There is no total worth showing as a stat, so the
                  three are shown as three. */}
              <div className="statgrid">
                <span><i>Size</i><b>{cls.size}</b></span>
                <span><i>Speed</i><b>{cls.speed}</b></span>
                <span><i>Hull</i><b>{cls.hull}</b></span>
                <span><i>Armour</i><b>{cls.armor || '—'}</b></span>
                <span><i>Long guns</i><b>{cls.guns.longGuns || '—'}</b></span>
                <span><i>Heavy guns</i><b>{cls.guns.heavyGuns || '—'}</b></span>
                <span><i>Light guns</i><b>{cls.guns.lightGuns || '—'}</b></span>
                <span><i>Bombardment</i><b>{cls.bombardment || '—'}</b></span>
                <span><i>Carries</i><b>{cls.troopCapacity || '—'}</b></span>
                <span><i>Repairs</i><b>{(cls.repairRatePerDay * 100).toFixed(1)}%/day</b></span>
              </div>
              {/* What she is actually hit by, which is the thing Size and
                  Speed are for and the thing no column of stats shows. */}
              <div className="tiny muted" style={{ marginTop: 6 }}>
                Hit by a light gun <b>{hitChance('Light', cls)}%</b> · a long gun{' '}
                <b>{hitChance('Long', cls)}%</b> · a heavy gun <b>{hitChance('Heavy', cls)}%</b>
                {total > 0 && <> · she throws <b>{total}</b> {total === 1 ? 'cannon' : 'cannon'} a round</>}
              </div>
            </div>
          );
        })}
      </div>
      </div>
      ))}

      <div className="section-title">The three cannon</div>
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
        ignores no armour at all, which is the whole of its weakness: against a
        heavily plated hull most of what it lands is stopped dead.
        <br />
        <br />
        <b>Heavy.</b> {GUNS.Heavy.dice}d{DAMAGE_DIE} a cannon — twice a light
        gun's dice — and it halves the armour in front of it. It is also the
        worst-aimed gun in the world against anything small or quick.
        <br />
        <br />
        <b>Long.</b> {GUNS.Long.dice}d{DAMAGE_DIE} a cannon and halves armour
        like a heavy gun. Two things are its own: it <b>fires first</b>, before
        any other gun on either side, and it is the <b>only</b> gun that
        reaches a fleet already running.
      </div>

      <div className="section-title">Armour</div>
      <div className="card small">
        <b>It is subtracted, not a chance to shrug.</b> A gun rolls its damage,
        the armour in front of it comes off the top, and what is left goes into
        the hull. Armour runs from nothing to {MAX_ARMOUR}, and only the
        Majestic carries {MAX_ARMOUR}.
        <br />
        <br />
        <b>Penetration halves it.</b> A heavy or long gun faces half the
        armour, rounded up; a light gun faces all of it. So against armour 25 a
        25-damage light hit does <b>nothing</b>, a 26-damage light hit does{' '}
        <b>1</b>, and a 26-damage heavy hit faces 13 and does <b>13</b>.
        <br />
        <br />
        That one rule is most of why a fleet needs more than one kind of gun.
        Light guns cannot open a first-rate however many of them you bring.
      </div>

      <div className="section-title">Size, speed, and what can hit you</div>
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

      <div className="section-title">An action at sea</div>
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

      <div className="section-title">Choosing a target</div>
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
        <b>And they know what they cannot hurt.</b> A cannon that could not get
        through a hull's armour will not be pointed at her while anything else
        floats. An unarmed transport is a target only when nothing armed is
        left.
      </div>

      <div className="section-title">Breaking off</div>
      <div className="card small">
        <b>It always works.</b> There is no roll that keeps you in a fight you
        have decided to leave, and no further round once you have left.
        <br />
        <br />
        <b>What it costs is the long guns.</b> Every surviving long gun in the
        pursuing fleet gets one shot at you as you go, at its ordinary dice and
        penetration — and nothing else reaches. A pursuer with no long guns
        watches you leave and cannot touch you, which is the clearest single
        reason to build them.
      </div>

      <div className="section-title">Bombardment</div>
      <div className="card small">
        <b>Against stone, never against ships.</b> Bombardment is its own
        rating and it contributes nothing to a fleet action — a hull can carry
        a siege train and be nearly harmless at sea, and the Ironback is
        exactly that.
        <br />
        <br />
        Shot goes at the walls while any stand; only when none do can it reach
        the garrison, and it takes {BOMBARD_PER_COMPANY} of weight to break one
        company. The wall answers a bombardment at its full weight the whole
        time, which is what makes the first day of a siege the expensive one.
        Shot that goes looking for companies in a town finds the town: the
        island's regard falls {CIVILIAN_LOYALTY_HIT} a day, every island in the
        Reach hears of it, and each further day costs more than the last.
      </div>
      {/*
        The three the stories are about, and nothing builds.
        `shipsFor` drops them because nothing can be laid down; an
        encyclopedia is exactly where they belong.
      */}
      <div className="section-title">Ships of the stories</div>
      <p className="tiny muted" style={{ margin: '0 0 6px' }}>
        Named in the Pirate Lords' own bios and never put on the water. Nothing
        builds them, nothing sails them, nothing fights them.
      </p>
      <div className="stack">
        {SHIP_CLASSES.filter((c) => c.legend).map((cls) => (
          <div key={cls.id} id={`enc-${cls.id}`} className="card row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <ShipThumb faction={cls.faction} role={cls.role} cls={cls.id} size={76} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b className="small">{cls.name}</b>
              <div className="tiny muted" style={{ marginTop: 4 }}>{cls.blurb}</div>
            </div>
          </div>
        ))}
      </div>

        </>
      )}

      {page === 'islands' && (
        <>
      <div className="section-title">Reading the chart</div>
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
        own — {GARRISON_STRONG} companies or more is large, {GARRISON_FAIR} to{' '}
        {GARRISON_STRONG - 1} medium, under {GARRISON_FAIR} small.
      </div>

      <div className="section-title">What loyalty is worth</div>
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
        buildings, its companies, and any island of yours in the same chain they had not found.
        <br />
        <br />
        <b>Companies ashore answer both.</b> A firm island needs none; a steady one asks for{' '}
        {GARRISON_FOR_BAND.steady}; a thin one for {GARRISON_FOR_BAND.thin}, and under that it will
        rise; {GARRISON_FOR_BAND.uprising} will face down a {terms.mutiny.toLowerCase()} whatever
        the island still thinks of you. Every company also takes a twentieth off what the
        smugglers move — a hand on the problem, not an answer to it.
      </div>

        </>
      )}

      {page === 'rules' && (
        <>
      <div className="section-title">How the war is won</div>
      <div className="card small">
        <b>One way each.</b> The Confederacy wins the day it holds Highwater. The Crown wins the
        day all three Pirate Lords — {PIRATE_LORDS.map((l) => l.name).join(', ')} — are in irons
        at once. They are people, not ships: you take one by carrying them off a quay, the same
        way anyone is taken. Nobody is let go for nothing, so the Crown's is a
        window, not a list.
      </div>

      {/* The three powers as rules, because they are rules. They used to live
          on three ship sheets, where a Crown player never saw them and a
          Confederate player only saw them by tapping a hull. */}
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
        — {terms.parley.toLowerCase()}, stirring up trouble, signing on, {terms.survey.toLowerCase()},
        {' '}{terms.sabotage.toLowerCase()}, abduction, command of an island in revolt, and the yards.
        You never pick one; the island decides.
      </div>
        </>
      )}

    </Sheet>
  );
}
