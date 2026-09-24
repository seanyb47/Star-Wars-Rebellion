import type { BuildKind } from './BuildSheet';
import { useState, type ReactNode } from 'react';
import terms from '../data/terms.json';
import factionData from '../data/factions.json';
import {
  ashoreAt,
  fleetsAt,
  isAtSea,
  otherFaction,
  reportOn,
  sightOf,
  type Sight,
  watchOn,
  type MissionType,
  FACILITY_LABEL,
  fortsOf,
  GOLD_PER_DAY,
  LEAK_CHANCE,
  LOYALTY_BAND_LABEL,
  SMUGGLED_SHARE,
  loyaltyBand,
  smuggledOff,
  ANY_GRADE,
  buildingRank,
  clearError,
  depositsLeft,
  RESOURCE_LABEL,
  RESOURCE_TYPES,
  daysToDeliver,
  buildLabel,
  idleFacilities,
  buildMenu,
  busyLine,
  islandBusy,
  type BuildLane,
  freeSlots,
  requiredGarrison,
  type Facility,
  type FacilityType,
  type Character,
  type Intel,
  type GameState,
  type Sector,
  type System,
  beastOf,
  byRemembered,
  companiesOn,
  garrisonSummary,
  MISSION_LABEL,
  isLord,
  type PlayableFaction,
  inProse,
  chartedName,
} from '../sim';
import {
  CharacterFace,
  CompanyIcon,
  CreaturePainting,
  FacilityIcon,
  ResourceIcon,
  IslandBanner,
  ShipIcon,
} from './art';
import { missionTint } from './missiontint';
import { ChartMark } from './ChartMark';
import { useSideSwipe } from './LayerStrip';
import { useLookUp } from './lookup';
import {
  ControlBadge,
  GoldFig,
  Info,
  RoomBar,
  Sheet,
  Slot,
  SlotBoard,
  SupportBars,
} from './components';
import { ShipsHere } from './FleetPanel';
import { IslandCommand } from './IslandCommand';
import { squadArt } from './troopart';
import { WorthMark } from './worth';
import { controlColour } from './ChainMap';

import type { IslandTab } from './IslandRow';

/** What to call an errand in a one-line note. The world's own words where it
 *  has them, and the shared list for the rest. */
function errandName(type: MissionType): string {
  if (type === 'incite') return terms.incite;
  if (type === 'sabotage') return terms.sabotage;
  if (type === 'survey') return terms.survey;
  if (type === 'diplomacy') return terms.parley;
  return MISSION_LABEL[type];
}

/**
 * One panel per island, holding everything the original spreads across four
 * clickable icons on the planet — ships, military, civilian, missions — folded
 * into the fewest tabs that keep like with like.
 *
 * Harbor opens first and is the ships lying at the island, plus the fixed
 * defences: a fort is a warship that cannot move, so it belongs beside the
 * ships rather than in with the mines. Crew and Garrison are split because
 * one is people you order about and the other is companies that hold ground.
 * Everything built sits in Buildings, earners and yards alike.
 */
/*
 * Sean's order, 19 September: *"change order to Harbor, Crew, Buildings,
 * Troops."*
 *
 * And the Lore tab is gone with it — *"Cut lore. Move to encyclopedia."* An
 * island's lore is the same paragraph every time you open the place, which is
 * a thing you read once; the encyclopedia is where a thing you read once
 * belongs.
 *
 * `garrison` keeps its id, because it is the tab a filter asks for and the
 * saved `initialTab`; only the word on it changed, from Garrison to Troops.
 */
const TABS: Array<{ id: IslandTab; label: string }> = [
  { id: 'harbor', label: 'Harbor' },
  { id: 'crew', label: 'Crew' },
  { id: 'buildings', label: 'Buildings' },
  /*
   * "Defenses", not "Troops", since 20 September. What holds an island is one
   * idea and the player should read it in one place: so many companies, so
   * many walls. The fortresses moved in with the rename.
   *
   * The unit is still a Troop — Sean's reversal of 19 September stands — so
   * "Troops" is not a retired word and still reads "3 Troops" inside the
   * panel. Only the section was renamed, which is why there is no entry for
   * it in the vocabulary test's retirement list: a blanket retirement would
   * fail the build on every legitimate use of the unit's own name.
   */
  { id: 'garrison', label: terms.defenses },
];

/**
 * What this island's allegiance is costing whoever holds it, today.
 *
 * The smugglers' cut is taken every day and announced on no day, so this is
 * where a player finds out why a Reach that looks held is not paying like it.
 */
function LoyaltyLine({ system }: { system: System }) {
  const holder = system.control;
  if (holder !== 'empire' && holder !== 'alliance') return null;
  const enemy = holder === 'empire' ? 'alliance' : 'empire';
  const band = loyaltyBand(system.support[holder], system.uprising);
  const share = SMUGGLED_SHARE[band];
  const lost = smuggledOff(system, holder);
  const quiet = LEAK_CHANCE[band] === 0 || system.explored[enemy];
  return (
    <p className="tiny muted" style={{ margin: 0 }}>
      <b>{LOYALTY_BAND_LABEL[band]}.</b>{' '}
      {share === 0 ? (
        'Nothing leaves this harbor but what you load.'
      ) : (
        <>
          {Math.round(share * 100)}% of what it ships goes out the back to the{' '}
          {factionData[enemy].shortName}
          {lost > 0 ? (
            <>
              {' — '}
              <GoldFig n={lost.toFixed(1)} tone="cost" />
            </>
          ) : null}
          .
        </>
      )}
      {!quiet && ' Word of what you keep here gets out, too.'}
    </p>
  );
}

/**
 * One island's works of a kind: the yards, the slipways or the drill grounds.
 *
 * A card per kind rather than per building, because that is now the unit the
 * rules work in. Sean's ruling, 16 September: *"only one thing can be produced
 * by a construction yard, a shipyard or a troop training facility at a time. If
 * you have multiples on the same island they work together and increase the
 * speed proportionally."* So three slipways are not three offers to build a
 * hull — they are one offer, three times as fast, and the card says so.
 */
/**
 * Which page of the build panel a works is a way into, if it is one.
 *
 * Undefined for a works that makes no units — a mine, a mill, a fort. Those
 * are things on the island rather than makers, so they get a card and no
 * button. `buildMenu` is the authority on what a works can lay down; this is
 * only the mapping from that to which page opens.
 */
function buildKindFor(type: FacilityType): BuildKind | undefined {
  if (type === 'shipyard') return 'ships';
  if (type === 'training_facility') return 'troops';
  return undefined;
}

/**
 * One thing on the island: its name on the left, its own business on the right.
 *
 * Sean, 22 September: *"it should just have like shipyard and then the
 * interface for what's going on in the shipyards next to it... lumber mill,
 * and then it can have the income that it's generating."*
 *
 * So the right-hand side is per kind and nothing else goes there:
 *
 * - a maker with an order shows the days and a way to cancel
 * - a maker with none shows the button that opens the build panel
 * - an earner shows what it brings in
 * - a wall shows nothing here; the Defenses tab is where its numbers live
 *
 * Icons are 28px rather than 64. His words: *"I think we can make the icons on
 * the buildings significantly smaller, so that there's less scrolling on the
 * page."* A developed island had a page and a half of tiles.
 */
function WorksRow({
  state,
  system,
  facility,
  onCancel,
  onOrderFrom,
}: {
  state: GameState;
  system: System;
  facility: Facility & { count: number; ids: string[]; days?: number };
  onCancel: (facilityId: string) => void;
  onOrderFrom: (systemId: string, kind: BuildKind) => void;
}) {
  const lookUp = useLookUp();
  const mine = facility.owner === state.player;
  const kind = buildKindFor(facility.type);
  const order = system.facilities.find((f) => facility.ids.includes(f.id) && f.building);
  const earns = GOLD_PER_DAY[facility.type] ?? 0;
  /*
   * Busy in *this works's own lane* — see `islandBusy`. A slipway waits on a
   * hull and a drill ground on a company, and neither waits on the other: one
   * ship, one building, one troop at a time, which is Sean's rule of 23
   * September and not the one-job-per-island it replaced.
   */
  const lane: BuildLane = facility.type === 'shipyard' ? 'ship' : facility.type === 'training_facility' ? 'troop' : 'works';
  const busy = mine ? islandBusy(system, state.player, lane) : null;

  return (
    <div className={`islandrow${facility.founding ? ' islandrow--going' : ''}`}>
      <span className="islandrow__icon" aria-hidden="true">
        <FacilityIcon type={facility.type} size={28} />
      </span>
      <button
        className="islandrow__name"
        onClick={() => lookUp?.('works', facility.type)}
        title={`What is a ${FACILITY_LABEL[facility.type]}?`}
      >
        {facility.count > 1 ? `${facility.count}× ` : ''}
        {FACILITY_LABEL[facility.type]}
        {facility.founding && <span className="tiny muted"> · going up</span>}
      </button>

      <span className="islandrow__right">
        {order?.building ? (
          <>
            {/* A works being laid down already says what it is on the left,
                so the right side is only the days. Anything else repeats the
                row's own name back at the player. */}
            <span className="tiny">
              {facility.founding ? '' : `${buildLabel(order.building.item)} · `}
              {facility.days ?? 0}d
            </span>
            {mine && (
              <button className="tiny btn--danger" onClick={() => onCancel(order.id)}>
                Cancel
              </button>
            )}
          </>
        ) : mine && kind && !facility.founding ? (
          <button
            className="btn islandrow__build"
            disabled={Boolean(busy)}
            title={busy ? busyLine(system, busy) : undefined}
            onClick={() => onOrderFrom(system.id, kind)}
          >
            {/* Sean: *"change build hull here to just build ships."* */}
            {kind === 'ships' ? 'Build ships' : 'Build troops'}
          </button>
        ) : earns > 0 ? (
          <span className="tiny islandrow__earn">
            +{earns * facility.count}/day
          </span>
        ) : facility.owner !== state.player ? (
          <ControlBadge faction={facility.owner} />
        ) : null}
      </span>
    </div>
  );
}

/**
 * A plot with nothing on it yet: unworked ground, or bare room.
 *
 * Sean: *"instead of a stat block, it's just a plus button and you can build.
 * And that's how you would build something on available land. Same thing with
 * a silver vein or a gold vein."* The button opens the build panel rather than
 * a menu of its own, because the panel is already the catalogue — which is why
 * the list of every works with its price could go.
 */
function PlotRow({
  icon,
  name,
  note,
  canBuild,
  why,
  onBuild,
  onLookUp,
}: {
  icon: ReactNode;
  name: string;
  note?: string;
  canBuild: boolean;
  why?: string | null;
  onBuild: () => void;
  onLookUp?: () => void;
}) {
  return (
    <div className="islandrow islandrow--plot">
      <span className="islandrow__icon" aria-hidden="true">
        {icon}
      </span>
      <button className="islandrow__name" onClick={onLookUp} disabled={!onLookUp}>
        {name}
        {note && <span className="tiny muted"> · {note}</span>}
      </button>
      <span className="islandrow__right">
        <button
          className="btn islandrow__plus"
          disabled={!canBuild}
          title={why ?? 'Build here'}
          aria-label={`Build on ${name}`}
          onClick={onBuild}
        >
          +
        </button>
      </span>
    </div>
  );
}

/**
 * Theirs, standing on this island, and what they have under way here.
 *
 * The half of the memo the game had no way to show. *"You can conduct
 * espionage on your own planets... if the Empire has sent agents to one of
 * your planets, an espionage mission can potentially identify those enemy
 * missions. You can then send abduction or sabotage against the actual mission
 * team."* Both of those errands already worked on anybody ashore — a
 * Confederate agent quietly inciting one of your islands has always been
 * standing there, abductable, for a fortnight. Nothing ever said so.
 *
 * Live where you can see for yourself, remembered where you were told, and on
 * your own ground it takes a report like anywhere else: an island of yours is
 * exactly the place you cannot see what somebody else has got working on it.
 */
/**
 * Who of theirs this island can be said to be carrying, and what they are up
 * to — live where you can see, off the report where you have one, nothing
 * where you have neither.
 *
 * Split out of `TheirsAshore` on 20 September so the tab strip can ask the
 * same question the component answers. A playtest found the Crew tab drawing
 * itself completely blank — no board, no sentence, nothing — on a neutral
 * island with nobody standing on it, because the tab was shown whenever the
 * island was not yours while every block inside it required the island to be
 * yours or the enemy's. A tab is the union of what it can say; working that
 * out from one negated case is how you get an empty one.
 */
interface TheirsHere {
  named: Character[];
  errands: Array<{ type: MissionType; byName: string; daysRemaining: number }>;
  /** True where this is a remembered report rather than something you can see. */
  fromReport: boolean;
}

function theirsHere(
  state: GameState,
  system: System,
  report: Intel | undefined,
  sight: Sight,
): TheirsHere {
  const theirs = otherFaction(state.player);
  // On your own island there is no `sight` gate to pass — it is always 'eyes',
  // because it is yours — so what shows there is the report or nothing. On
  // theirs, a squadron in the water or somebody ashore counts as looking.
  const mine = system.control === state.player;
  const aboard = new Set(state.fleets.flatMap((f) => f.officerIds));
  const live =
    !mine && sight === 'eyes'
      ? state.characters.filter(
          (c) =>
            c.faction === theirs &&
            c.locationSystemId === system.id &&
            c.status !== 'captured' &&
            !aboard.has(c.id) &&
            !(c.mission && c.mission.phase === 'travelling'),
        )
      : undefined;

  const people = live ?? report?.officerIds.map((id) => state.characters.find((c) => c.id === id));
  const errands = live
    ? state.characters
        .filter((c) => c.faction === theirs && c.mission?.targetSystemId === system.id && !c.escorting)
        .map((c) => ({ type: c.mission!.type, byName: c.name, daysRemaining: c.mission!.daysRemaining }))
    : report?.errands;

  return {
    named: (people ?? []).filter((c): c is NonNullable<typeof c> => Boolean(c)),
    errands: errands ?? [],
    fromReport: live === undefined,
  };
}

/** Whether the Crew tab would have anything of theirs to draw. */
function hasTheirs(state: GameState, system: System, report: Intel | undefined, sight: Sight): boolean {
  const { named, errands } = theirsHere(state, system, report, sight);
  return named.length > 0 || errands.length > 0;
}

function TheirsAshore({
  state,
  system,
  report,
  sight,
}: {
  state: GameState;
  system: System;
  report?: Intel;
  sight: Sight;
}) {
  const { named, errands, fromReport } = theirsHere(state, system, report, sight);
  if (named.length === 0 && errands.length === 0) return null;
  const mine = system.control === state.player;

  return (
    <>
      <div className="section-title">Theirs</div>
      {named.length > 0 && (
        <SlotBoard empty="">
          {named.map((character) => (
            <Slot
              key={character.id}
              art={
                <CharacterFace
                  name={character.name}
                  faction={character.faction}
                  people={character.people}
                  size={176}
                />
              }
              name={character.name}
              note={character.mission ? errandName(character.mission.type) : 'ashore'}
            />
          ))}
        </SlotBoard>
      )}
      {errands.length > 0 && (
        <p className="tiny muted" style={{ margin: '6px 0 10px' }}>
          <b>Against this island{fromReport ? `, as of day ${report!.day}` : ''}:</b>{' '}
          {errands
            .map((e) => `${e.byName}, ${errandName(e.type)}, ${e.daysRemaining}d`)
            .join(' · ')}
          .{' '}
          {mine &&
            'Anybody of theirs already ashore can be carried off — send someone on an abduction.'}
        </p>
      )}
    </>
  );
}

/**
 * How old what you are looking at is.
 *
 * Sits above the tabs on every one of them, because the staleness is a
 * property of the whole screen and not of the garrison tab: every number below
 * this line is what somebody wrote down on a particular day, and the island has
 * had every day since to change. Rebellion's espionage worked the same way —
 * *"a successful mission can reveal enemy characters, ground troops,
 * facilities, fleets"* — a report, once, not a subscription.
 */
function ReportAge({ state, report }: { state: GameState; report: Intel }) {
  const age = state.day - report.day;
  return (
    /*
     * Sean, 19 September: *"But info might not be accurate. Put a note — last
     * report and day! Or better yet 'last report x days ago'."* His second
     * phrasing, because a day number asks the reader to do the subtraction
     * against a date they would have to go and look up.
     *
     * It matters more now than it did: every tab stays on an enemy island,
     * so the panel shows a harbor and a garrison whether or not anybody has
     * looked lately, and this line is the whole difference between *empty*
     * and *not counted since*.
     */
    <p className="report-age tiny">
      <b>
        {age === 0
          ? 'Last report today'
          : age === 1
            ? 'Last report yesterday'
            : `Last report ${age} days ago`}
      </b>
      {' · '}
      {report.secondHand ? "somebody's dispatches" : `${report.byName}'s`}
      {age >= 45 && ' — old enough to be wrong'}
      {report.secondHand && '. Nobody of yours has actually been ashore here.'}
    </p>
  );
}

/**
 * What lay in the water, when somebody last looked.
 *
 * Not `ShipsHere`, which reads the live fleets and offers to sail them — none
 * of these are yours and none of them are necessarily still there. Counts and
 * names, and for anything that was at sea for the island, how far out it was on
 * the day of the report. That last part is the memo's early warning: *"units
 * currently travelling toward the system"*, which is the whole reason to spy on
 * your own ground as well as theirs.
 */
function RememberedHarbor({ report, player }: { report: Intel; player: PlayableFaction }) {
  if (report.harbor.length === 0) {
    return (
      <p className="muted small" style={{ margin: 0 }}>
        Nothing in the water, the day it was counted.
      </p>
    );
  }
  return (
    <div className="stack">
      {report.harbor.map((f) => (
        <div key={f.id} className="card small row" style={{ gap: 10, alignItems: 'center' }}>
          <ShipIcon size={24} role="medium" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{f.name}</b>
            <div className="tiny muted">
              {f.faction === player ? 'Yours' : factionData[f.faction].shortName} ·{' '}
              {f.ships} sail
              {f.troops > 0 && ` · ${f.troops} aboard`}
            </div>
          </div>
          {f.inbound !== undefined && (
            <span className="badge badge--warn">{f.inbound}d out</span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * An island held against you that nobody of yours has looked at.
 *
 * What anyone can see from a deck passing: whose flag flies over it, and the
 * shape of the place, because you have been here before — that is what charted
 * means. What is behind the flag is somebody's business to go and find out.
 *
 * This is the screen espionage was built to be the answer to. Before it, every
 * charted island told you its companies, its commander, its works and its watch
 * for ever and for nothing, and the Espionage rating on a crew card was a
 * number that opened doors and never asked a question of its own.
 */
function NoReport({
  live,
  sector,
  state,
  onClose,
  onSail,
  onAssault,
  onBombard,
  onFlee,
  onOpenCharacter,
  onOrderShips,
  onOrderOfficers,
  onDetach,
}: {
  live: System;
  sector: Sector;
  state: GameState;
  onClose: () => void;
  onSail: (fleetId: string) => void;
  onAssault: (fleetId: string) => void;
  onBombard?: (fleetId: string) => void;
  onFlee?: (fleetId: string) => void;
  onOpenCharacter?: (characterId: string) => void;
  onOrderShips?: (fleetId: string, shipIds: string[], dir: -1 | 1) => void;
  onOrderOfficers?: (fleetId: string, characterIds: string[], dir: -1 | 1) => void;
  onDetach?: (fleetId: string, shipIds: string[], into?: string) => void;
}) {
  const holder = live.control === 'empire' || live.control === 'alliance' ? live.control : null;
  return (
    <Sheet
      title={live.name}
      eyebrow={terms.island}
      subtitle={`${sector.name} · ${holder ? factionData[holder].shortName : 'unaligned'}`}
      onClose={onClose}
      banner={
        <IslandBanner
          archetype={live.archetype}
          // The island's own name, not the chart's. Everywhere else
          // `chartName` is right because it is the *chart* asking — the mark,
          // the map position, the chain view. This is the banner, and Freeport
          // is the one island where the two disagree: `galaxy.ts` overrides its
          // archetype to `free-harbor` precisely so it looks like Freeport
          // rather than like the island it took over, and asking by chart name
          // here would have undone that the moment Freeport got a painting of
          // its own. The panel below this already says which island the charts
          // still call it.
          seed={live.name}
          faction={live.control}
          settled={live.populated}
          facilities={0}
        />
      }
    >
      <p className="muted small" style={{ textAlign: 'center', margin: '4px 0 0' }}>
        No report. {holder ? factionData[holder].shortName : 'Somebody'} holds it and nobody of
        yours has been ashore to count what is on it — not its troops, not who has the chair,
        not what stands in its yards, and not what a quiet mission against it would have to get
        past.
      </p>
      <p className="muted small" style={{ textAlign: 'center', margin: '10px 0 0' }}>
        Send someone on {MISSION_LABEL.espionage}, or put a squadron in its water and look for
        yourself.
      </p>
      {(() => {
        // Anybody of yours already on their way there, on any errand. Worth
        // saying, because the commonest reason to open this panel twice is
        // having forgotten you sent somebody.
        const coming = state.characters.filter(
          (c) =>
            c.faction === state.player &&
            c.mission?.targetSystemId === live.id &&
            c.mission.phase === 'travelling',
        );
        if (coming.length === 0) return null;
        return (
          <p className="tiny muted" style={{ textAlign: 'center', margin: '10px 0 0' }}>
            {coming
              .map(
                (c) =>
                  `${c.name}, ${errandName(c.mission!.type)}, ${c.mission!.daysRemaining}d out`,
              )
              .join(' · ')}
          </p>
        );
      })()}
      {/*
        And your own squadrons, here or on their way here.

        Sean, 24 September: *"When my fleet is en route to an island — friendly
        neutral or foe — I should see the icon above the island and also be able
        to click on it and see it."* This screen was the half of it that had
        nowhere to click *to*. An island with no report has no tabs — there is
        nothing to put on them — so a fleet of yours bound for it had no card
        anywhere in the game, even though you had given the order yourself and
        the panel two paragraphs up was already listing inbound *crew* for
        exactly that reason.

        `minesOnly` is what keeps this honest: your own hulls, live, because you
        know where you sent them, and not one word about theirs. Their order of
        battle is what the paragraph above tells you to go and find out.
      */}
      <div style={{ marginTop: 14 }}>
        <ShipsHere
          state={state}
          systemId={live.id}
          minesOnly
          onSail={onSail}
          onAssault={onAssault}
          onBombard={onBombard}
          onFlee={onFlee}
          onOpenCharacter={onOpenCharacter}
          onOrderShips={onOrderShips}
          onOrderOfficers={onOrderOfficers}
          onDetach={onDetach}
        />
      </div>
    </Sheet>
  );
}

export function SystemSheet({
  state,
  system: live,
  initialTab = 'harbor',
  onClose,
  onCancel,
  onClear,
  onBreakUp,
  onOrderFrom,
  onOpenCharacter,
  onOpenReach,
  onSail,
  onAssault,
  onBombard,
  onFlee,
  onOrderShips,
  onOrderOfficers,
  onDetach,
  onOrderGarrison,
  onOrderCrew,
  onPutAboard,
}: {
  state: GameState;
  system: System;
  initialTab?: IslandTab;
  onClose: () => void;
  onCancel: (facilityId: string) => void;
  /** Fell a forest to open its plot. Destroys it. */
  onClear: (systemId: string) => void;
  /** Open the list of things on this island that could be broken up. */
  onBreakUp: (systemId: string) => void;
  /**
   * Order from one of this island's makers.
   *
   * The island does not lay anything down itself — it opens the build panel
   * on that maker's page with this island already chosen, which is the same
   * panel the Build tab opens and therefore the same one order flow. See the
   * note on the button in `WorksCard`.
   */
  onOrderFrom: (systemId: string, kind: BuildKind) => void;
  onSail: (fleetId: string) => void;
  onAssault: (fleetId: string) => void;
  onBombard?: (fleetId: string) => void;
  onFlee?: (fleetId: string) => void;
  onOrderShips?: (fleetId: string, shipIds: string[], dir: -1 | 1) => void;
  onOrderOfficers?: (fleetId: string, characterIds: string[], dir: -1 | 1) => void;
  onDetach?: (fleetId: string, shipIds: string[], into?: string) => void;
  onOrderGarrison?: (systemId: string, typeIds: string[], dir: -1 | 1) => void;
  /**
   * Put companies from this island aboard a squadron lying in its harbor.
   *
   * Sean, 24 September: *"I should be able to click on any troop and move any
   * number of them into a fleet up to fleet troop limit."* So the tile's tap
   * is the order and the lookup moves to its corner mark, which is `Slot`'s
   * own rule for a tile that has a job: *"the picture keeps that job and a
   * small corner mark carries the lookup, because the two are different
   * questions."*
   */
  onPutAboard?: (systemId: string) => void;
  onOrderCrew?: (characterIds: string[], dir: -1 | 1) => void;
  onOpenCharacter?: (characterId: string) => void;
  onOpenReach?: (sectorId: string) => void;
}) {
  const [tab, setTab] = useState<IslandTab>(initialTab);
  const lookUp = useLookUp();
  const sector = state.sectors.find((s) => s.id === live.sectorId)!;
  const explored = live.explored[state.player];

  if (!explored) {
    return (
      <Sheet
        // The charts' name, not the island's own: you learn what a place is
        // called by going to it. See `chartedName` — this header was how the
        // Crown could find Freeport without leaving harbor.
        title={chartedName(live, state.player)}
        eyebrow={terms.island}
        subtitle={`${sector.name} · ${terms.uncharted}`}
        onClose={onClose}
      >
        <div className="isle-banner isle-banner--chart" style={{ height: 118 }}>
          <ChartMark name={live.chartName ?? live.name} width={362} height={118} className="isle-banner__chart" />
          <span className="isle-banner__fade" />
        </div>
        <p className="muted small" style={{ textAlign: 'center' }}>
          Charted, never explored. Nobody of yours has set foot here, so whether anyone lives
          on it, and whether a garrison landed would be enough to claim it, is rumour until
          someone goes and looks.
        </p>
        {/*
          And your own squadrons, bound for it. The same rule as `NoReport`
          below and for the same reason — Sean, 24 September: *"When my fleet
          is en route to an island — friendly neutral or foe — I should see the
          icon above the island and also be able to click on it and see it."*
          An island nobody has landed on has no tabs, so without this the sail
          on the chart pointed at a screen with no ship on it.

          This is the screen you reach *before* the one below: charted and
          never visited, rather than held against you and never looked at. Both
          are places you can be sailing to.
        */}
        <div style={{ marginTop: 14 }}>
          <ShipsHere
            state={state}
            systemId={live.id}
            minesOnly
            onSail={onSail}
            onAssault={onAssault}
            onBombard={onBombard}
            onFlee={onFlee}
            onOpenCharacter={onOpenCharacter}
            onOrderShips={onOrderShips}
            onOrderOfficers={onOrderOfficers}
            onDetach={onDetach}
          />
        </div>
      </Sheet>
    );
  }

  /**
   * What this island is allowed to tell you, and the island it tells you about.
   *
   * On your own ground and on nobody's, the two are the same object and this
   * whole block is a no-op — which is most of the chart, most of the time. On
   * ground the enemy holds, an island you cannot see for yourself is either the
   * one your last spy described, stamped with the day they described it, or a
   * name and a flag and nothing else.
   *
   * Everything below reads `system`, so a remembered island runs through the
   * same readings a live one does: its garrison roster off a remembered count,
   * its shortfall off a remembered loyalty, its room off remembered works. That
   * was the whole reason to carry the island whole in the report rather than
   * summarise it into fields — one screen, not two.
   */
  const sight = sightOf(state, live, state.player);
  /**
   * The report and the remembered view are two different things, and conflating
   * them cost the memo's best trick.
   *
   * `filed` is simply whether a report exists. `report` is whether the screen
   * should be *reading* it, which is only where there is nothing better — an
   * island of your own is always 'eyes', so its numbers are live and its report
   * is worth exactly one thing: what the other side has got working on it.
   * Asking one question for both meant a report on your own ground was written,
   * stored, and never shown to anybody.
   */
  const filed = reportOn(state, live, state.player);
  const report = sight === 'report' ? filed : undefined;
  if (sight === 'none') {
    return (
      <NoReport
        live={live}
        sector={sector}
        state={state}
        onClose={onClose}
        onSail={onSail}
        onAssault={onAssault}
        onBombard={onBombard}
        onFlee={onFlee}
        onOpenCharacter={onOpenCharacter}
        onOrderShips={onOrderShips}
        onOrderOfficers={onOrderOfficers}
        onDetach={onDetach}
      />
    );
  }
  const system = report ? report.island : live;

  const holder =
    system.control === 'empire' || system.control === 'alliance' ? system.control : null;
  const needed = requiredGarrison(holder ? system.support[holder] : 50, system.uprising);
  // Standing on the island, not filed under it. Sean's playtest: *"After
  // Fleet 2 sailed from Vagrano, Isolde Marrow still showed as available at
  // Vagrano."* She was aboard and under way; `ashoreAt` leaves her off.
  const crew = ashoreAt(state, system.id, state.player);
  const inbound = state.characters.filter(
    (c) =>
      c.faction === state.player &&
      c.mission?.targetSystemId === system.id &&
      c.mission.phase === 'travelling',
  );
  /*
   * Which tabs this island actually has.
   *
   * Sean, 19 September: *"Can we make the Harbor tab only appear when there
   * is something there or on route? Otherwise it just goes to next tab? Same
   * with crew."* An empty tab is a tap that teaches you nothing, and on a
   * quiet island of yours three of the four were empty.
   *
   * **On an island of theirs every tab stays**, which he asked for in the
   * same breath: *"When I click on enemy locations I should see all tabs. No
   * tabs hidden."* Hiding a tab there would say *nothing is in the harbor*
   * when what you mean is *nobody of yours has looked* — and those are
   * opposite facts. The report line at the top of the panel says how old the
   * looking is.
   */
  const mine = live.control === state.player;
  const hullsHere = fleetsAt(state, live.id).length > 0;
  const hullsBound = state.fleets.some((f) => isAtSea(f) && f.voyage?.targetSystemId === live.id);
  const hasHarbor = !mine || hullsHere || hullsBound;
  const hasCrew =
    crew.length > 0 ||
    inbound.length > 0 ||
    // Your own settled island: the recruiting card has something to say about
    // whether you could keep an open table here.
    (mine && live.populated) ||
    // Theirs: whoever you can see or have been told about.
    hasTheirs(state, live, filed, sight);
  const tabs = TABS.filter(
    (entry) =>
      (entry.id !== 'harbor' || hasHarbor) && (entry.id !== 'crew' || hasCrew),
  );
  // If the tab we were sent to is not on this island, fall through to the
  // next one that is rather than showing a panel with nothing selected.
  const live_tab = tabs.some((entry) => entry.id === tab) ? tab : tabs[0].id;
  const swipe = useSideSwipe((step) => {
    const at = tabs.findIndex((entry) => entry.id === live_tab);
    const next = Math.min(tabs.length - 1, Math.max(0, at + step));
    if (next !== at) setTab(tabs[next].id);
  });

  // The island's makers, folded by kind: one card per kind, because one kind
  // does one job at a time however many of them stand here.
  const producers = (() => {
    const byKind = new Map<FacilityType, Facility[]>();
    for (const f of system.facilities) {
      if (f.owner !== state.player || f.founding || buildMenu(f, ANY_GRADE).length === 0) continue;
      byKind.set(f.type, [...(byKind.get(f.type) ?? []), f]);
    }
    return [...byKind]
      .map(([type, facilities]) => ({ type, facilities }))
      // Whatever is waiting for an order first: that is what the player came
      // to this tab to find, and on Sean's Firewatch it was second.
      .sort(
        (a, b) =>
          Number(idleFacilities(system, state.player, b.type) > 0) -
          Number(idleFacilities(system, state.player, a.type) > 0),
      );
  })();
  // Who is actually ashore, company by company. Same length as the garrison
  // count the rest of the game runs on; this only says what they are.
  // The ground, folded by kind. Three rows at most, and usually one.
  const ground = RESOURCE_TYPES
    .map((type) => ({ type, count: depositsLeft(system, type) }))
    .filter((entry) => entry.count > 0);
  const roster = companiesOn(system);
  // Folded into kinds, in the order the player put them, for the grouped view.
  const garrison = byRemembered(garrisonSummary(system), (e) => e.type.id, system.garrisonOrder);
  // The walls, for the Defenses panel. Whoever holds the ground holds them.
  const walls = fortsOf(system);
  /*
   * Who has the chair here, for the Defenses panel.
   *
   * Sean, 24 September: *"Only things I care here are troops + if there is a
   * commander."* It was on this screen only as arithmetic — one term inside
   * the watch's breakdown, *"3 from the chair"* — which answers how much
   * harder a quiet mission is and does not answer the question he was asking,
   * which is *is somebody holding this place*. On a remembered island the
   * commander comes out of the report with everything else, so this reads
   * `system`, which is the report's island when there is one.
   */
  const chair = system.commanderId
    ? state.characters.find((c) => c.id === system.commanderId)
    : undefined;
  // Anything of yours lying here with holds to fill — what makes a troop tile
  // an order rather than an encyclopedia link.
  const boatsHere = state.fleets.some(
    (f) => f.faction === state.player && !f.voyage && f.systemId === system.id,
  );
  /**
   * What stands here, as rows. Grouped, two mines of the same owner are one
   * line with a count.
   *
   * A works that is *making* something used to be kept out of its own group,
   * on the reasoning that "2× Mill, 14d" is a lie about both of them. It is
   * not a lie about yards any more: all three of an island's yards are on the
   * same job, so splitting the one carrying the order out of the row read as
   * two separate sets of buildings. So: a works being *laid down* still stands
   * alone, because it is genuinely not the same thing as a finished one; a
   * finished works with an order on it folds in with its fellows, and the row
   * carries the days.
   */
  const works = (() => {
    const out: Array<Facility & { count: number; ids: string[]; days?: number }> = [];
    for (const facility of system.facilities) {
      // Always folded, never by choice. Sean, 16 September: buildings do not
      // need reordering and should always be grouped — the two toggles were a
      // decision the player had to make once per island about something with
      // one right answer.
      const fold =
        !facility.founding &&
        out.find((f) => f.type === facility.type && f.owner === facility.owner && !f.founding);
      if (fold) {
        fold.count += 1;
        fold.ids.push(facility.id);
        if (facility.building) fold.days = daysToDeliver(system, facility);
      } else {
        out.push({
          ...facility,
          count: 1,
          ids: [facility.id],
          ...(facility.building ? { days: daysToDeliver(system, facility) } : {}),
        });
      }
    }
    // And in the one order every island uses: makers, then the defences, then
    // the earners. `BUILDING_ORDER` is the whole of it.
    out.sort((a, b) => buildingRank(a.type) - buildingRank(b.type));
    return out;
  })();

  /**
   * Why you cannot start something here, or null if you can.
   *
   * Sean, 22 September: *"let's also make it to where you can only build one
   * thing at a time on an island. So if you're building a ship, you can't
   * build a building. If you're building a building, you can't build a
   * ship."* `islandBusy` is the sim's answer to that and the build panel
   * refuses on it; this is the same question asked early so the row can grey
   * its own button out and say why, rather than letting a player open the
   * panel to be told no.
   */
  /*
   * The Raise button on the island's own Buildings tab puts up a *works*, so
   * it asks the works lane and nothing else: a Sovereign on the stocks no
   * longer stops a mill going up beside it.
   */
  const busyHere = mine ? islandBusy(system, state.player, 'works') : null;
  const buildBlocked = !mine ? 'Not your island.' : busyHere ? busyLine(system, busyHere) : null;

  return (
    <Sheet
      eyebrow={terms.island}
      title={system.name}
      titleMark={
        <WorthMark
          system={system}
          size={18}
          colour={controlColour(system, state.player)}
          className="sheet__worth"
        />
      }
      subtitle={
        <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {onOpenReach ? (
            <button className="linkish" onClick={() => onOpenReach(sector.id)}>
              {sector.name}
            </button>
          ) : (
            <span>{sector.name}</span>
          )}
          <ControlBadge faction={system.control} />
          {system.uprising && <span className="badge badge--warn">{terms.mutiny}</span>}
          {system.blockaded && <span className="badge badge--warn">Blockaded</span>}
          {!system.populated && <span className="badge badge--none">{terms.uninhabited}</span>}
        </span>
      }
      onClose={onClose}
      {...swipe}
      /*
       * One scroll, and the painting goes with it.
       *
       * The banner was pinned here on purpose — four tabs about one place, and
       * letting the place scroll away meant looking at a garrison with no idea
       * whose garrison it was. Sean's island-command brief of 24 September
       * reverses that: *"The large island image sits below a compact title and
       * status badges; it scrolls away naturally with the rest of the content.
       * Do not pin the image while the user scrolls."* And *"one natural
       * vertical scroll; avoid nested vertical scroll containers."*
       *
       * `flow` is the mode the encyclopedia already used for exactly this, and
       * it answers the objection the pinning existed for: once the full header
       * has gone past, a compact bar fades in carrying the name and the way
       * out, so there is always a label on what you are reading. The tabs move
       * into the column with everything else, which is what the prototype
       * does — they sit under the orders, not over the art.
       */
      flow
    >
      {/* The island itself, and the line that says how it leans. */}
      <div className="isle-head">
        <IslandBanner
          archetype={system.archetype}
          seed={system.name}
          faction={system.control}
          settled={system.populated}
          facilities={system.facilities.length}
          facilityTypes={system.facilities.map((f) => f.type)}
          mutiny={system.uprising}
          height={104}
        />
        {/* Allegiance, with the painting rather than inside the Garrison tab.
            It is the number the rest of the island is read off — what it earns
            you, how many troops hold it quiet, how much goes out the back — so
            asking for it meant a tab change from wherever you happened to
            be. */}
        {system.populated && <SupportBars system={system} slim />}
      </div>

      {/* What I have here, what is ashore, and the two orders — above the
          tabs, because the brief's first viewport has to answer those without
          anybody opening a ship to find them. See `IslandCommand`. */}
      <IslandCommand
        state={state}
        system={system}
        report={report}
        onBombard={onBombard}
        onAssault={onAssault}
      />

      <div className="tabs" data-tour="island-tabs" role="tablist">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            role="tab"
            aria-selected={live_tab === entry.id}
            className={`tabs__tab${live_tab === entry.id ? ' tabs__tab--on' : ''}`}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
            {entry.id === 'buildings' && producers.length > 0 && (
              <span className="tabs__dot" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>

      {report && <ReportAge state={state} report={report} />}

      {live_tab === 'harbor' && (
        <>
          {/* The harbor is the ships in it. Allegiance and room used to sit
              above them, and both are on the chain view before you ever open
              this panel — so the first thing under the painting is now the
              thing you came to look at. Allegiance moved to the Garrison tab,
              where holding an island is the subject; room leads the Buildings
              tab already. */}
          {/* No heading. Sean, 19 September: *"Cut the at harbor. If nothing
              is there, nothing is there."* The tab is called Harbor and the
              ships are the first thing under it; "At anchor" was a label on
              the only thing it could have been labelling. */}
          {/*
            Yours first and live, theirs second and remembered.

            This was an either/or — the live harbor on your own island, the
            last report on theirs — and a squadron of yours lying off an enemy
            island fell down the gap: not in their report, and their report was
            the whole tab. Sean, 23 September: *"I moved my fleet to an enemy
            island. It disappears."*

            You always know where your own ships are, so they are always live.
            What you do not know is what is in their harbor today, so that
            stays a report, and `minesOnly` is the line between the two.
          */}
          <ShipsHere
            state={state}
            systemId={system.id}
            minesOnly={Boolean(report)}
            onSail={onSail}
            onAssault={onAssault}
            onBombard={onBombard}
            onFlee={onFlee}
            onOpenCharacter={onOpenCharacter}
            onOrderShips={onOrderShips}
            onOrderOfficers={onOrderOfficers}
            onDetach={onDetach}
          />
          {report && <RememberedHarbor report={report} player={state.player} />}

          {system.blockaded && (
            <p className="tiny" style={{ color: 'var(--bad)', margin: '8px 0 0' }}>
              Enemy sail is lying off this island. Nothing is getting out of the harbor, so it
              earns you nothing today — and still costs you its upkeep. Drive them off and the
              trade resumes.
            </p>
          )}

          {(() => {
            /* What is in the water off this island, if your own boats have
               been in it. Nothing charted holds anything; out in the three
               dark Reaches some islands do, and the block only appears once
               somebody of yours has made landfall and seen it. Last on the
               tab and never in the way: it changes nothing you can act on. */
            const beast = beastOf(system, state.player);
            if (!beast) return null;
            // Anything with guns is a card at the top of this tab among the
            // ships, because that is what it is to you: a thing lying in the
            // harbor you have to get past. This block is what is left —
            // the turtles and the cats, which are scenery and stay scenery.
            if (beast.guns > 0) return null;
            return (
              <div className="waters">
                <div className="section-title">These waters</div>
                <CreaturePainting slug={beast.slug} height={96} />
                <span className="waters__name">{beast.name}</span>
                <p className="waters__line">{beast.sighting}</p>
              </div>
            );
          })()}
        </>
      )}

      {live_tab === 'buildings' && (
        <>
          {/*
            One list, in the order Sean gave on 22 September: what is working,
            then what is standing, then what is earning, then the ground, then
            the room.

            > "All your built shit is first... things that can go idle should
            > be at the top. Then fortress, which is a passive thing. Then
            > income producing stuff... then raw materials after that. And then
            > the last thing should be available land, and next to available
            > land is build."

            `BUILDING_ORDER` already sorts the built things exactly that way —
            shipyard, training facility, heavy fort, fort, then the earners —
            so the list is that order with the unworked ground appended and a
            row for the room at the foot.

            Each row is its name on the left and *its own business* on the
            right: a maker shows its order or a way to give one, an earner
            shows what it brings in, a deposit and a plot show a button. Sean:
            *"it should just have like shipyard and then the interface for
            what's going on in the shipyards next to it."*

            What went, and it is most of what was here: the board of 64px
            tiles, the "Order something built" section under it, and the whole
            "Raise a building" list of every works with its price. Three
            places to look at one island's buildings, and the third was a
            catalogue the build panel already is.

            Also gone, at his word: *"it says seven of 12 berths built. What
            the fuck's a berth? Two standing in the ground, three open. You
            don't need that — the bar already tells you that."* The bar stays;
            the sentence explaining the bar does not.
          */}
          <RoomBar system={system} />

          <div className="islandlist">
            {works.map((facility) => (
              <WorksRow
                key={facility.id}
                state={state}
                system={system}
                facility={facility}
                onCancel={onCancel}
                onOrderFrom={onOrderFrom}
              />
            ))}

            {/* The ground, after what stands on it. A deposit is a plot doing
                nothing yet, so it reads as a thing you could build on rather
                than a thing you have. */}
            {ground.map((entry) => (
              <PlotRow
                key={entry.type}
                icon={<ResourceIcon type={entry.type} size={28} />}
                name={
                  entry.count > 1
                    ? `${entry.count}× ${RESOURCE_LABEL[entry.type]}`
                    : RESOURCE_LABEL[entry.type]
                }
                note="unworked"
                canBuild={mine && buildBlocked === null}
                why={buildBlocked}
                onBuild={() => onOrderFrom(system.id, 'facilities')}
                onLookUp={() => lookUp?.('works', entry.type)}
              />
            ))}

            {/* And the room itself, last, with the one button that raises
                anything. No catalogue: the build panel is the catalogue. */}
            {mine && freeSlots(system) > 0 && (
              <PlotRow
                icon={<span className="islandrow__plot" aria-hidden="true" />}
                name={`${freeSlots(system)} open ${freeSlots(system) === 1 ? 'plot' : 'plots'}`}
                canBuild={buildBlocked === null}
                why={buildBlocked}
                onBuild={() => onOrderFrom(system.id, 'facilities')}
              />
            )}
          </div>

          {/* Sean's rule: a forest can be cleared for anything, not only a
              mill — and clearing destroys it. Offered under the list rather
              than on the row, because it is a decision about the island and
              not about one stand of trees, and because a destructive button on
              a small row is a button somebody taps by accident. */}
          {system.control === state.player && depositsLeft(system, 'forest') > 0 && (
            <div className="row row--between clearline">
              <p className="tiny muted" style={{ margin: 0, flex: 1 }}>
                {freeSlots(system) === 0
                  ? 'No plot open. Timber can be felled to make room for anything — it does not grow back.'
                  : 'Timber can be felled to make room for anything other than a mill. It does not grow back.'}
              </p>
              <button
                className="tiny btn--danger"
                disabled={clearError(state, system.id, state.player) !== null}
                title={clearError(state, system.id, state.player) ?? undefined}
                onClick={() => onClear(system.id)}
              >
                Fell timber
              </button>
            </div>
          )}

          {/* The other end of the same decision. Sean, on scrap: *"a great way
              to clear old things to make room for new things."* */}
          {system.control === state.player && (
            <div className="row row--between clearline">
              <p className="tiny muted" style={{ margin: 0, flex: 1 }}>
                Anything of yours can be broken up for half its price, and you stop paying to keep
                it.
              </p>
              <button className="tiny btn--danger" onClick={() => onBreakUp(system.id)}>
                Break up
              </button>
            </div>
          )}
        </>
      )}

      {live_tab === 'garrison' && (
        <>
          {/*
            What you have in the water off this island, before what is standing
            on it.

            Sean, 17 September: *"How do I see my garrisons aboard a fleet when
            it's stationed in an enemy harbor?"* You could not, on this tab.
            Troops aboard were a line inside the Harbor tab's fleet card,
            which is the right place to load and unload them and the wrong
            place to go looking — a player about to storm an island opens the
            Garrison tab, because that is the tab about who holds the ground,
            and read the enemy's troops with no sight of their own landing
            force to set against them. So the two numbers now sit on the same
            screen: what is ashore, and what you have brought to take it off
            them. Only your own, only fleets actually lying here, and the block
            simply is not there when you have nothing in the water.
          */}
          {(() => {
            const riding = state.fleets.filter(
              (f) => f.faction === state.player && !f.voyage && f.systemId === system.id && f.troops > 0,
            );
            if (riding.length === 0) return null;
            const aboard = riding.reduce((n, f) => n + f.troops, 0);
            const theirs =
              system.control === state.player ? 0 : (report ? report.island.garrison : system.garrison);
            return (
              <div className="card small" style={{ marginBottom: 10 }}>
                <div className="row row--between">
                  <b>
                    {aboard} {aboard === 1 ? 'troop' : 'troops'} aboard, off this island
                  </b>
                  <span className="tiny muted">
                    {riding.length === 1 ? riding[0].name : `${riding.length} squadrons`}
                  </span>
                </div>
                <p className="tiny muted" style={{ margin: '4px 0 0' }}>
                  {system.control === state.player
                    ? 'Yours already — land them from the Harbor tab whenever you want them ashore.'
                    : theirs > 0
                      ? `${theirs} ${theirs === 1 ? 'troop holds' : 'troops hold'} the island${report ? ', the day it was counted' : ''}. The landing is ordered from the Harbor tab.`
                      : `Nothing of theirs is standing ashore${report ? ', the day it was counted' : ''}. The landing is ordered from the Harbor tab.`}
                </p>
              </div>
            );
          })()}
          {/* What the island thinks of its holder, where it belongs: how many
              troops it asks for and how much of its trade goes out the back
              are both read off this number. */}
          {system.populated ? (
            /* The bar itself is above the tabs now; what stays here is the
               reading of it, which is garrison and trade business. */
            <div style={{ marginBottom: 10 }}>
              <LoyaltyLine system={system} />
            </div>
          ) : (
            <p className="muted small" style={{ margin: '0 0 10px' }}>
              Nobody lives here. Held only while a troop remains ashore; finish any building and
              the island settles under your flag.
            </p>
          )}
          {/*
            What the island sees.
            
            Sean's rule, 17 September: troops, officers standing idle, a
            commander in the chair and the island's own loyalty all add up to
            one number, and that number is what every quiet mission against this
            island has to get past. It is read off the island rather than
            written on it, so this is the only place a player can find out why
            a raid on a loyal capital is a different proposition from a raid on
            a sullen frontier — and why softening one first is worth the
            fortnight.
          */}
          {(() => {
            const mine = system.control === state.player;
            /*
             * Whose side the watch is arrayed against, which flips with whose
             * island it is. On one of theirs the number a player wants is the
             * one standing against *them*; on one of your own it is what an
             * agent of theirs would face. Asking it the same way on both — as
             * the first cut of this did — reads an enemy island's watch with
             * its own people left out of it and its own officers counted as
             * watchers for you.
             */
            const seen = watchOn(state, system, mine ? otherFaction(state.player) : state.player);
            /*
             * On a remembered island the number is the one the spy came back
             * with, not one worked out now. `watchOn` would read the live
             * characters standing on the island today and the remembered
             * companies from the report, which is a number that was never true
             * on any day. The report's own total was true on one.
             */
            if (report) {
              return (
                <p className="tiny muted" style={{ margin: '0 0 8px' }}>
                  <b>The watch was {report.watch}.</b> Troops, officers ashore, whoever had
                  the chair, and how the island felt about them — as of the report. Get past it
                  with Espionage, or bring it down first by stirring the island up.
                </p>
              );
            }
            if (seen.total === 0) return null;
            const parts = [
              seen.garrison > 0 && `${seen.garrison} from the troops`,
              seen.people > 0 && `${seen.people} from its people`,
              seen.commander > 0 && `${seen.commander} from the chair`,
              seen.idle > 0 && `${seen.idle} from crew standing idle ashore`,
            ].filter(Boolean) as string[];
            return (
              <p className="tiny muted" style={{ margin: '0 0 8px' }}>
                <b>The watch: {seen.total}.</b>{' '}
                {parts.join(', ')}.{' '}
                {mine
                  ? 'What anybody working quietly against this island has to get past.'
                  : 'Get past it with Espionage, or bring it down first by stirring the island up.'}
              </p>
            );
          })()}
          <div className="row row--between" style={{ marginBottom: 8 }}>
            <span className="tiny muted">
              {system.garrison} ashore
              {needed > 0 ? ` · ${needed} needed` : ''}
            </span>
            {system.uprising ? (
              <span className="badge badge--warn">{terms.mutiny}</span>
            ) : (
              <span className="badge badge--good">Held</span>
            )}
          </div>
          {/* Empty slots here are the shortfall: troops the island wants
              and has not got. That is worth drawing.

              Every troop now says what it is. A garrison used to be ten
              identical pike figures, which answered "how many" and nothing
              else — and who is standing there is the more interesting half:
              the Reef Guard are the reef island, and an Urskin troop on the
              ice is who lives on the ice. */}
          {/* Grouped, a kind of troop is one tile with a count; ungrouped,
              every troop is its own. The kinds can be put in an order —
              a troop has no identity of its own to move, so what is
              remembered is which kind comes first. */}
          {/*
            The walls, above the companies.

            Sean, 20 September: *"rename the troops tab to 'defenses' on all
            locations. And move fortresses there. Troops can move islands but
            fortresses can't."* So this is the one screen that answers "what
            would it take to get this island off them", and the two halves of
            the answer sit one above the other. The rows are deliberately not
            selectable, which is the whole of how the panel says a wall does
            not embark: a troop tile can be reordered for the boats and a
            battery has no controls on it at all.
          */}
          {/*
            Who has the chair, and what stands on the walls — in that order,
            and in that much detail.

            Sean, 24 September: *"Only things I care here are troops + if there
            is a commander. Don't need hulls or guns listed."* The tab was
            carrying a table: a row per battery, each with its own two numbers,
            *6 against a landing · 4 against shot*, under a paragraph of siege
            rules. Those numbers are constants — every fort in the game has the
            same pair — so the table said the same thing on every island that
            has ever had a fort, in twelve lines, and the one figure that
            changes island to island is **how many**. That is a count, not a
            list, and it is what is left.

            The commander is the addition. It was on this screen only as a term
            inside the watch's arithmetic — *"3 from the chair"* — which is a
            different question. The siege rules went to the encyclopedia, where
            the rules live, behind the ℹ: the same move as the odds block off
            the character sheet on 21 September.
          */}
          {(chair || walls.length > 0) && (
            <div className="card small" style={{ marginBottom: 10 }}>
              {chair && (
                <div className="row row--between">
                  <b>{chair.name} has the chair.</b>
                  <span className="tiny muted">In command</span>
                </div>
              )}
              {walls.length > 0 && (
                <div className="row row--between" style={{ marginTop: chair ? 6 : 0 }}>
                  <b className="row" style={{ gap: 6 }}>
                    <FacilityIcon type={walls[0].type} size={18} />
                    {walls.length} {walls.length === 1 ? 'battery' : 'batteries'} standing
                  </b>
                  <Info to="rules" at="bombardment">
                    What a battery costs a landing
                  </Info>
                </div>
              )}
            </div>
          )}
          <SlotBoard
            ghosts={Math.max(0, needed - system.garrison)}
            empty={`No troops are ashore on ${inProse(system.name)}.`}
          >
            {/* Always folded, since 19 September: a troop is a troop, so the
                ungrouped list was ten identical tiles saying the same thing
                ten times. Ships keep the toggle because four Kestrels are
                four different amounts of damage. */}
            {garrison.map((e) => ({ ...e, key: e.type.id })).map(
              (entry, i, all) => (
                <Slot
                  key={entry.key}
                  /* A squad painting goes through `art` rather than `icon`, so
                     it gets the tile's width instead of standing 64px tall in
                     the middle of it. Measured on the page: the icon box gave
                     a 4:5 painting 51x64 inside a 165px tile, which is legible
                     and not remotely the dominant thing on it. A unit with no
                     squad art yet keeps the glyph, which the icon box is the
                     right shape for. */
                  {...(squadArt(entry.type.id)
                    ? {
                        art: (
                          <span className="slot__art--squad">
                            <CompanyIcon type={entry.type.id} fill />
                          </span>
                        ),
                      }
                    : { icon: <CompanyIcon size={64} type={entry.type.id} /> })}
                  name={
                    entry.count > 1
                      ? `${entry.count}× ${entry.type.name}`
                      : entry.type.name
                  }
                  // What a company is now lives in the encyclopedia, which
                  // holds the same numbers with the room to say what they
                  // mean — so the tile is a picture and a name, and tapping it
                  // goes there rather than unfolding a card under the board.
                  onLookUp={() => lookUp?.('companies', entry.type.id)}
                  // Only on ground you hold, and only when something of yours
                  // is lying here to put them on: a tap that opens a sheet
                  // saying "nothing to load onto" is a tap wasted.
                  onClick={
                    onPutAboard && system.control === state.player && boatsHere
                      ? () => onPutAboard(system.id)
                      : undefined
                  }
                  /* And everything else, on a press and hold. Only where there
                     is more than one thing to offer — a menu of one is a
                     second tap for nothing. */
                  actions={
                    onPutAboard && system.control === state.player && boatsHere
                      ? [
                          {
                            label: 'Put aboard',
                            hint: 'Into a squadron lying in this harbor',
                            onPick: () => onPutAboard(system.id),
                          },
                          {
                            label: 'Encyclopedia',
                            hint: 'What this troop is, and what it is for',
                            onPick: () => lookUp?.('companies', entry.type.id),
                          },
                        ]
                      : undefined
                  }
                  label={`${entry.type.name} — ${entry.type.people}`}
                  order={
                    all.length > 1 && onOrderGarrison
                      ? {
                          up:
                            i === 0
                              ? undefined
                              : () => onOrderGarrison(system.id, [entry.type.id], -1),
                          down:
                            i === all.length - 1
                              ? undefined
                              : () => onOrderGarrison(system.id, [entry.type.id], 1),
                        }
                      : undefined
                  }
                />
              ),
            )}
          </SlotBoard>
          {roster.length > 0 && (
            <p className="tiny muted" style={{ marginTop: 6 }}>
              Tap a troop to read what it is.
            </p>
          )}
          <p className="tiny muted" style={{ marginTop: 8 }}>
            {needed > 0
              ? `Allegiance here is low enough that ${needed} ${needed === 1 ? 'troop holds' : 'troops hold'} the island quiet. Fewer and it rises.`
              : 'Allegiance is high enough that no troops are needed to keep order.'}
          </p>
        </>
      )}


      {live_tab === 'crew' && (
        <>
          {/*
           * The Recruit explainer that stood here is gone, at Sean's word of
           * 21 September: *"Cut this section. This should be simply in the
           * encyclopedia section for missions."*
           *
           * It taught the whole rule on the Crew tab of any island of yours —
           * the loyalty floor, what a Recruiter does, how long the table
           * stands, what makes somebody worth having sit down at it — which is
           * the rule of the Recruit mission and identical on every island. It
           * lives in the encyclopedia's Missions section now. The island tab
           * is for what is true of *this* island.
           */}
          <TheirsAshore state={state} system={system} report={filed} sight={sight} />

          {/* Two words apiece, at Sean's word: *"Same with crew. Cut all the
              text. Ashore / underway. Only add if distinction is necessary."*
              The empty sentences went with the headings — a board with
              nothing on it is already saying nobody is there, at greater
              length than the sentence did. */}
          {crew.length > 0 && (
            <>
          <div className="section-title">Ashore</div>
          <SlotBoard>
            {crew.map((character, i) => (
              <Slot
                key={character.id}
                art={
                  <CharacterFace
                    name={character.name}
                    faction={character.faction}
                    people={character.people}
                    size={176}
                    dim={character.status !== 'available'}
                  />
                }
                name={character.name}
                /*
                 * What they are doing, or failing that, what they are.
                 *
                 * The brass rim says a Lord is not an ordinary officer; this
                 * says which kind of not-ordinary. Second to the errand on
                 * purpose — an officer three days from a raid is a fact about
                 * today and their rank is a fact about the whole war — so the
                 * line only appears when there is nothing happening to report,
                 * which on a quay full of idle Lords is exactly when it is
                 * wanted.
                 */
                /* An errand is its own treatment now — rim, smaller face and
                   a two-line label — so `note` is left to the things that are
                   not one. See `Slot`'s `mission` prop. */
                mission={
                  character.mission
                    ? {
                        label: errandName(character.mission.type),
                        tint: missionTint(character.mission.type),
                        days: character.mission.daysRemaining,
                      }
                    : undefined
                }
                note={
                  character.status !== 'available'
                    ? character.status.replace('_', ' ')
                    : isLord(character)
                      ? terms.lord
                      : undefined
                }
                tone={
                  character.status === 'injured'
                    ? 'warn'
                    : isLord(character)
                      ? 'lord'
                      : undefined
                }
                onClick={() => onOpenCharacter?.(character.id)}
                /* Hold for the rest. The tap opens their sheet, which is where
                   an order is given; this is the shortcut past it and the way
                   to the encyclopedia, which the tap used to own. */
                actions={[
                  {
                    label: 'Open their sheet',
                    hint: 'Orders, ratings and what they have done',
                    onPick: () => onOpenCharacter?.(character.id),
                  },
                  {
                    label: 'Encyclopedia',
                    hint: 'Who they are, in the book',
                    onPick: () => lookUp?.('people', character.id),
                  },
                ]}
                order={
                  crew.length > 1 && onOrderCrew
                    ? {
                        up: i === 0 ? undefined : () => onOrderCrew([character.id], -1),
                        down:
                          i === crew.length - 1
                            ? undefined
                            : () => onOrderCrew([character.id], 1),
                      }
                    : undefined
                }
              />
            ))}
          </SlotBoard>
            </>
          )}

          {inbound.length > 0 && (
            <>
          <div className="section-title">Underway</div>
          <SlotBoard>
            {inbound.map((character) => (
              <Slot
                key={character.id}
                art={
                  <CharacterFace
                    name={character.name}
                    faction={character.faction}
                    people={character.people}
                    size={176}
                  />
                }
                name={character.name}
                note={`${character.mission?.daysRemaining ?? 0}d out`}
                onClick={() => onOpenCharacter?.(character.id)}
              />
            ))}
          </SlotBoard>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}


/**
 * What this place is, as against what it is doing for you.
 *
 * Sean's: a full Lore tab on the far right rather than one italic line at the
 * top of the Harbor tab, where it was the first thing in the way of the thing
 * you opened the panel for.
 *
 * Every island has something true to say here, not only the eleven the world
 * bible names. Three sources, widest to narrowest: the Sea it lies in, the
 * kind of place it is, and then its own line where it has one. The creature
 * comes last and only once your own boats have seen it — a bestiary you can
 * read on day one is a bestiary, and this is meant to be a log.
 */
/*
 * `IslandLore` stood here and lives in `IslandLore.tsx` now.
 *
 * Sean, 19 September: *"Cut lore. Move to encyclopedia."* The sea an island
 * lies in and the kind of place it is do not change, so it was three
 * paragraphs you read once and swiped past for the rest of the game. This
 * panel is four tabs of things you can act on; the lore is an encyclopedia
 * entry.
 */
