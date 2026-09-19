import { useState, type ReactNode } from 'react';
import terms from '../data/terms.json';
import factionData from '../data/factions.json';
import {
  fleetsAt,
  isAtSea,
  otherFaction,
  recruitPool,
  canRecruitAt,
  RECRUIT_MIN_SUPPORT,
  reportOn,
  sightOf,
  type Sight,
  watchOn,
  type MissionType,
  FACILITY_BLURB,
  FACILITY_LABEL,
  GOLD_PER_DAY,
  LEAK_CHANCE,
  LOYALTY_BAND_LABEL,
  SMUGGLED_SHARE,
  loyaltyBand,
  smuggledOff,
  UPKEEP_PER_DAY,
  buildError,
  gradeOf,
  ANY_GRADE,
  buildingRank,
  clearError,
  depositsLeft,
  RESOURCE_LABEL,
  crewOn,
  daysToFinish,
  daysToDeliver,
  buildLabel,
  buildMenu,
  foundWorksError,
  YARD_BUILDS,
  buildSpec,
  effectiveSpec,
  isShipClass,
  shipClass,
  freeSlots,
  requiredGarrison,
  supportMultiplier,
  type BuildItem,
  type Facility,
  type FacilityType,
  type Intel,
  type GameState,
  type Sector,
  type System,
  beastOf,
  byRemembered,
  garrisonRoster,
  garrisonSummary,
  MISSION_LABEL,
  isLord,
  type PlayableFaction,
} from '../sim';
import {
  CharacterFace,
  CompanyIcon,
  CreaturePainting,
  FacilityIcon,
  FacilityThumb,
  facilityPainting,
  ResourceIcon,
  ResourceThumb,
  resourcePainting,
  IslandBanner,
  ShipIcon,
} from './art';
import { ChartMark } from './ChartMark';
import { useSideSwipe } from './LayerStrip';
import { useLookUp } from './lookup';
import {
  ControlBadge,
  GoldFig,
  RoomBar,
  Sheet,
  Slot,
  SlotBoard,
  SupportBars,
} from './components';
import { ShipsHere } from './FleetPanel';
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
  { id: 'garrison', label: terms.troops },
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

/** One line explaining what a facility actually does for you right now. */
function facilityOutput(system: System, facility: Facility): ReactNode {
  const owner = facility.owner;
  if (owner !== 'empire' && owner !== 'alliance') return null;
  if (system.uprising) return `Idle — the island is in ${terms.mutiny.toLowerCase()}.`;
  if (system.control !== owner) return 'Idle — the island is not held by its owner.';
  const earning = GOLD_PER_DAY[facility.type];
  if (earning > 0) {
    const yieldNow = earning * supportMultiplier(system.support[owner]);
    return (
      <>
        <GoldFig label="Earns" n={yieldNow.toFixed(1)} tone="earn" /> at this{' '}
        {terms.allegiance.toLowerCase()}
      </>
    );
  }
  const cost = UPKEEP_PER_DAY[facility.type];
  return cost > 0 ? (
    <>
      {FACILITY_BLURB[facility.type]} <GoldFig label={terms.upkeep} n={cost} tone="cost" />
    </>
  ) : (
    FACILITY_BLURB[facility.type]
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
function WorksCard({
  state,
  system,
  type,
  facilities,
  onBuild,
  onCancel,
}: {
  state: GameState;
  system: System;
  type: FacilityType;
  facilities: Facility[];
  onBuild: (facilityId: string, item: BuildItem) => void;
  onCancel: (facilityId: string) => void;
}) {
  // The one holding the order speaks for the island; failing that, the first.
  const holder = facilities.find((f) => f.building) ?? facilities[0];
  // The real grade: a shipyard offers what this side's shipwrights can draw.
  const menu = buildMenu(holder, gradeOf(state, state.player));
  const mine = holder.owner === state.player;
  const order = holder.building;
  const hands = crewOn(system, type, holder.owner);
  const output = facilityOutput(system, holder);
  const bound =
    order?.destinationId && order.destinationId !== system.id
      ? state.systems.find((s) => s.id === order.destinationId)
      : undefined;
  const build = daysToFinish(system, holder);
  const deploy = daysToDeliver(system, holder);
  // Where the bar is: the work first, then the passage, as one journey from
  // ordered to arrived. A hull three days from the stocks with a fortnight's
  // sailing ahead of it is not nearly finished, and a bar that said so by
  // work alone would be lying about when it turns up.
  const whole = order ? order.work + order.travel : 1;
  const done = order ? order.work - order.workLeft + (order.travel - order.travelLeft) : 0;

  return (
    <div className="card">
      <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
        <span className="facility__thumb">
          <FacilityThumb type={type} owner={holder.owner} width={96} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row row--between">
            <div style={{ fontWeight: 600 }}>
              {facilities.length > 1 ? `${facilities.length}× ` : ''}
              {FACILITY_LABEL[type]}
            </div>
            {holder.owner !== state.player && <ControlBadge faction={holder.owner} />}
          </div>
          {output && (
            <div className="tiny muted" style={{ marginTop: 2 }}>
              {output}
            </div>
          )}
          {hands > 1 && (
            <div className="tiny works__crew" style={{ marginTop: 2 }}>
              {hands} of them, working together — {hands}× the pace on one job at a time.
            </div>
          )}
        </div>
      </div>

      {order && (
        <div className="works__order">
          <div className="row row--between small">
            <b>{buildLabel(order.item)}</b>
            {mine && (
              <button className="tiny btn--danger" onClick={() => onCancel(holder.id)}>
                Cancel
              </button>
            )}
          </div>

          <div
            className={`workbar${system.uprising ? ' workbar--halted' : ''}`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={whole}
            aria-valuenow={done}
            aria-label={`${buildLabel(order.item)}, ${deploy} days from delivery`}
          >
            <span style={{ width: `${Math.min(100, Math.max(2, (done / whole) * 100))}%` }} />
            {order.travel > 0 && (
              <i className="workbar__mark" style={{ left: `${(order.work / whole) * 100}%` }} />
            )}
          </div>

          {/* The two numbers Sean asked for, kept apart: when it is finished,
              and when it is *there*. Identical when it is being made where it
              is wanted, and then only one of them is worth the line. */}
          <div className="tiny works__clock">
            {system.uprising ? (
              <span className="works__halted">
                Halted — the island is in {terms.mutiny.toLowerCase()}.
              </span>
            ) : order.workLeft > 0 ? (
              <span>
                <b>{build}d</b> to build
              </span>
            ) : (
              <span>
                <b>Built</b>, at sea
              </span>
            )}
            {bound && (
              <>
                <span className="works__dot">·</span>
                <span>
                  <b>{deploy}d</b> to deploy
                </span>
                <span className="works__dot">·</span>
                <span className="works__to">bound for {bound.name}</span>
              </>
            )}
          </div>
        </div>
      )}

      {mine && !order && menu.length > 0 && (
        <div className="buildgrid" style={{ marginTop: 8 }}>
          {menu.map((item) => {
            // What it costs this side today, not the sticker price: research
            // takes gold and days off a hull, and a button that keeps quoting
            // the old figure makes the whole errand invisible. And what it
            // takes *here*, which is the sticker days over however many of
            // these are standing on the island.
            const spec = { ...buildSpec(item), ...effectiveSpec(state, holder.owner as PlayableFaction, item) };
            const days = Math.ceil(spec.days / hands);
            const error = buildError(state, holder.id, item);
            return (
              <button
                key={item}
                className="build"
                disabled={error !== null}
                onClick={() => onBuild(holder.id, item)}
                title={error ?? undefined}
              >
                <span className="build__icon">
                  {item === 'troop' ? (
                    <FacilityIcon type="training_facility" size={22} />
                  ) : isShipClass(item) ? (
                    <ShipIcon role={shipClass(item).role} size={22} />
                  ) : (
                    <FacilityIcon type={item} size={22} />
                  )}
                </span>
                <span className="build__text">
                  <span className="build__name">{spec.label}</span>
                  <span className="build__meta">
                    {error ?? (
                      <>
                        <GoldFig n={spec.costGold} per={null} /> · {days}d
                      </>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
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

  const named = (people ?? []).filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (named.length === 0 && (errands ?? []).length === 0) return null;

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
      {(errands ?? []).length > 0 && (
        <p className="tiny muted" style={{ margin: '6px 0 10px' }}>
          <b>Against this island{live ? '' : `, as of day ${report!.day}`}:</b>{' '}
          {(errands ?? [])
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
}: {
  live: System;
  sector: Sector;
  state: GameState;
  onClose: () => void;
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
          seed={live.chartName ?? live.name}
          faction={live.control}
          settled={live.populated}
          facilities={0}
        />
      }
    >
      <p className="muted small" style={{ textAlign: 'center', margin: '4px 0 0' }}>
        No report. {holder ? factionData[holder].shortName : 'Somebody'} holds it and nobody of
        yours has been ashore to count what is on it — not its troops, not who has the chair,
        not what stands in its yards, and not what a quiet errand against it would have to get
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
    </Sheet>
  );
}

export function SystemSheet({
  state,
  system: live,
  initialTab = 'harbor',
  onClose,
  onBuild,
  onCancel,
  onFound,
  onClear,
  onOpenCharacter,
  onOpenReach,
  onSail,
  onAssault,
  onBombard,
  onCeaseFire,
  onFlee,
  onOpenShip,
  onOrderShips,
  onOrderOfficers,
  onDetach,
  onOrderGarrison,
  onOrderCrew,
}: {
  state: GameState;
  system: System;
  initialTab?: IslandTab;
  onClose: () => void;
  onBuild: (facilityId: string, item: BuildItem) => void;
  onCancel: (facilityId: string) => void;
  onFound: (systemId: string) => void;
  /** Fell a forest to open its plot. Destroys it. */
  onClear: (systemId: string) => void;
  onSail: (fleetId: string) => void;
  onAssault: (fleetId: string) => void;
  onBombard?: (fleetId: string) => void;
  onCeaseFire?: (fleetId: string) => void;
  onFlee?: (fleetId: string) => void;
  onOpenShip?: (fleetId: string, shipId: string) => void;
  onOrderShips?: (fleetId: string, shipIds: string[], dir: -1 | 1) => void;
  onOrderOfficers?: (fleetId: string, characterIds: string[], dir: -1 | 1) => void;
  onDetach?: (fleetId: string, shipIds: string[], into?: string) => void;
  onOrderGarrison?: (systemId: string, typeIds: string[], dir: -1 | 1) => void;
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
        title={live.name}
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
    return <NoReport live={live} sector={sector} state={state} onClose={onClose} />;
  }
  const system = report ? report.island : live;

  const holder =
    system.control === 'empire' || system.control === 'alliance' ? system.control : null;
  const needed = requiredGarrison(holder ? system.support[holder] : 50, system.uprising);
  const crew = state.characters.filter(
    (c) => c.faction === state.player && c.locationSystemId === system.id,
  );
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
  const hasCrew = !mine || crew.length > 0 || inbound.length > 0;
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

  const slots = system.slots;
  // The island's makers, folded by kind: one card per kind, because one kind
  // does one job at a time however many of them stand here.
  const producers = (() => {
    const byKind = new Map<FacilityType, Facility[]>();
    for (const f of system.facilities) {
      if (f.owner !== state.player || f.founding || buildMenu(f, ANY_GRADE).length === 0) continue;
      byKind.set(f.type, [...(byKind.get(f.type) ?? []), f]);
    }
    return [...byKind].map(([type, facilities]) => ({ type, facilities }));
  })();
  // Who is actually ashore, company by company. Same length as the garrison
  // count the rest of the game runs on; this only says what they are.
  // The ground, folded by kind. Two rows at most, and usually one.
  const ground = (['forest', 'gold'] as const)
    .map((type) => ({ type, count: depositsLeft(system, type) }))
    .filter((entry) => entry.count > 0);
  const inTheGround = ground.reduce((n, entry) => n + entry.count, 0);
  const roster = garrisonRoster(system);
  // Folded into kinds, in the order the player put them, for the grouped view.
  const garrison = byRemembered(garrisonSummary(system), (e) => e.type.id, system.garrisonOrder);
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
      banner={
        /* The island itself, above the tabs rather than inside the first one.
           Four tabs are all about this place; it should not go off screen the
           moment you look at its garrison.

           The painting and nothing else. It is shorter than it was, and the
           line of lore that used to sit under it has gone back into the
           Harbor tab: everything up here is paid for on all five tabs and
           out of the height the tab itself has to work in, so only the thing
           that is actually about the place on every one of them earns a
           place. The picture does. Two lines of prose about seawalls does
           not. */
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
          {/* Allegiance, up here with the painting rather than inside the
              Garrison tab. It is the number the rest of the island is read
              off — what it earns you, how many troops hold it quiet, how
              much goes out the back — so asking for it meant a tab change
              from wherever you happened to be. Slim, because everything above
              the tabs is paid for out of every tab's height. */}
          {system.populated && <SupportBars system={system} slim />}
        </div>
      }
      tabs={
        <div className="tabs" role="tablist">
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
      }
    >
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
          {report ? (
            <RememberedHarbor report={report} player={state.player} />
          ) : (
          <ShipsHere
            state={state}
            systemId={system.id}
            onSail={onSail}
            onAssault={onAssault}
            onBombard={onBombard}
            onCeaseFire={onCeaseFire}
            onFlee={onFlee}
            onOpenCharacter={onOpenCharacter}
            onOpenShip={onOpenShip}
            onOrderShips={onOrderShips}
            onOrderOfficers={onOrderOfficers}
            onDetach={onDetach}
          />
          )}

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
          {/* Room first, at one length: a bar that is the width of the panel
              on every island, so two islands are compared by how full they
              are. The board under it holds what actually stands — an empty
              berth is a space on the bar, not a box in a grid that grew
              longer the more room an island had. */}
          <RoomBar system={system} />
          <p className="tiny muted" style={{ margin: '6px 0 10px' }}>
            {system.facilities.length} of {slots} berths built
            {inTheGround > 0 ? `, ${inTheGround} standing in the ground` : ''}
            {freeSlots(system) > 0 ? `, ${freeSlots(system)} open` : ', and no plot open'}.
          </p>

          <SlotBoard
            empty={`Nothing stands on ${system.name}${slots > 0 ? ' yet' : ', and there is nowhere to put anything'}.`}
          >
            {/* What is in the ground, before what has been built on it. A
                deposit holds a berth until something works it, so it belongs
                on the same board as the buildings and not in a list of its
                own — the question the board answers is what this island's
                plots are doing. */}
            {ground.map((entry) => (
              <Slot
                key={entry.type}
                icon={<ResourceIcon type={entry.type} size={64} />}
                art={
                  resourcePainting(entry.type) ? (
                    <ResourceThumb type={entry.type} fill />
                  ) : undefined
                }
                name={
                  entry.count > 1
                    ? `${entry.count}× ${RESOURCE_LABEL[entry.type]}`
                    : RESOURCE_LABEL[entry.type]
                }
                note="unworked"
                tone="dim"
                onLookUp={() => lookUp?.('works', entry.type)}
              />
            ))}
            {works.map((facility) => (
              <Slot
                key={facility.id}
                icon={<FacilityIcon type={facility.type} size={64} />}
                // The board is where a player actually looks to see what
                // stands on an island, and it was drawing line glyphs at works
                // that have had paintings since the first art batch.
                art={
                  facilityPainting(facility.type, facility.owner) ? (
                    <FacilityThumb type={facility.type} owner={facility.owner} fill />
                  ) : undefined
                }
                name={
                  facility.count > 1
                    ? `${facility.count}× ${FACILITY_LABEL[facility.type]}`
                    : FACILITY_LABEL[facility.type]
                }
                note={facility.days !== undefined ? `${facility.days}d` : undefined}
                tone={facility.owner !== state.player ? 'dim' : undefined}
                onLookUp={() => lookUp?.('works', facility.type)}
              />
            ))}
          </SlotBoard>

          {/* Sean's rule: a forest can be cleared for anything, not only a
              mill — and clearing destroys it. Offered under the board rather
              than on the tile, because it is a decision about the island and
              not about one stand of trees, and because a destructive button
              on a small tile is a button somebody taps by accident. */}
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

          {producers.length > 0 && <div className="section-title">Order something built</div>}
          <div className="stack">
            {producers.map((works) => (
              <WorksCard
                key={works.type}
                state={state}
                system={system}
                type={works.type}
                facilities={works.facilities}
                onBuild={onBuild}
                onCancel={onCancel}
              />
            ))}
          </div>
          {system.control === state.player && producers.length === 0 && (
            <>
              <div className="section-title">Nothing to build with</div>
              {(() => {
                const founding = system.facilities.find(
                  (f) => f.owner === state.player && f.founding,
                );
                if (founding) {
                  return (
                    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                      <p className="muted tiny" style={{ margin: 0, flex: 1 }}>
                        A {terms.facilities.construction_yard.toLowerCase()} is being laid down —{' '}
                        {daysToDeliver(system, founding)} days to go.
                      </p>
                      <button className="tiny btn--danger" onClick={() => onCancel(founding.id)}>
                        Cancel
                      </button>
                    </div>
                  );
                }
                const why = foundWorksError(state, system.id, state.player);
                return (
                  <>
                    <p className="muted tiny" style={{ margin: '0 0 8px' }}>
                      Everything is raised by a {terms.facilities.construction_yard.toLowerCase()}{' '}
                      standing on the same island. Lay one down and this island can build.
                    </p>
                    <button
                      className="btn btn--block btn--primary"
                      disabled={why !== null}
                      onClick={() => onFound(system.id)}
                    >
                      Lay down a {terms.facilities.construction_yard.toLowerCase()} ·{' '}
                      {YARD_BUILDS.construction_yard.costGold} gold ·{' '}
                      {YARD_BUILDS.construction_yard.days} days
                    </button>
                    {why && (
                      <p className="muted tiny" style={{ marginTop: 6 }}>
                        {why}
                      </p>
                    )}
                  </>
                );
              })()}
            </>
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
            one number, and that number is what every quiet errand against this
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
          <SlotBoard
            ghosts={Math.max(0, needed - system.garrison)}
            empty={`No troops are ashore on ${system.name}.`}
          >
            {/* Always folded, since 19 September: a troop is a troop, so the
                ungrouped list was ten identical tiles saying the same thing
                ten times. Ships keep the toggle because four Kestrels are
                four different amounts of damage. */}
            {garrison.map((e) => ({ ...e, key: e.type.id })).map(
              (entry, i, all) => (
                <Slot
                  key={entry.key}
                  icon={<CompanyIcon size={64} type={entry.type.id} />}
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
            Whether this is a harbor you could grow your corps out of.

            There used to be a card here naming the unaligned officer standing
            on this particular quay, because that was how signing on worked:
            find the person, sail to the person. Since Sean's memo of 17
            September there is no person to find — you keep an open table at a
            harbor of your own that is loyal enough, and see who comes. So what
            this tab says is whether *this* is such a harbor, which is the
            question a player who wants more officers is actually asking, and
            it says it on your own islands only, where the answer can be acted
            on. It is also the one place the game explains the rule, which
            matters: nothing on the chart points at recruiting any more.
          */}
          {system.control === state.player && system.populated && (() => {
            const pool = recruitPool(state).length;
            const here = canRecruitAt(state, system, state.player);
            const loyalty = Math.round(system.support[state.player]);
            return (
              <>
                <div className="section-title">Signing on</div>
                <p className="muted tiny" style={{ margin: '0 0 10px' }}>
                  {pool === 0 ? (
                    <>
                      There is nobody left in the Seven Seas to sign. Whoever you have is whoever
                      you will have.
                    </>
                  ) : here ? (
                    <>
                      This place is loyal enough ({loyalty}) to sign hands on. Send a{' '}
                      <b>Recruiter</b> of yours here and they will keep an open table for a
                      fortnight: the better they lead and the more this island loves you, the
                      likelier somebody worth having sits down at it.
                    </>
                  ) : system.uprising ? (
                    <>
                      Nobody signs articles on an island in {terms.mutiny.toLowerCase()}. Put this
                      one back in order first.
                    </>
                  ) : (
                    <>
                      Allegiance here is {loyalty}, and it wants {RECRUIT_MIN_SUPPORT} before
                      anybody will sign with you on it. Parley this island up, or recruit from a
                      more devoted one — a secure, well-loved island is worth keeping for exactly
                      this.
                    </>
                  )}
                </p>
              </>
            );
          })()}

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
                note={
                  character.mission
                    ? `${errandName(character.mission.type)} ${character.mission.daysRemaining}d`
                    : character.status !== 'available'
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
