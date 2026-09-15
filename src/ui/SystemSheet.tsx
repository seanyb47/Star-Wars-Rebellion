import { useState } from 'react';
import terms from '../data/terms.json';
import factionData from '../data/factions.json';
import {
  recruitOn,
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
  type GameState,
  type System,
  beastOf,
  byRemembered,
  garrisonRoster,
  garrisonSummary,
  troopType,
  MISSION_LABEL,
  type PlayableFaction,
} from '../sim';
import {
  CharacterPortrait,
  CompanyIcon,
  CreaturePainting,
  FacilityIcon,
  FacilityThumb,
  IslandBanner,
  ShipIcon,
} from './art';
import { ChartMark } from './ChartMark';
import { useSideSwipe } from './LayerStrip';
import { ControlBadge, ListOpts, RoomBar, Sheet, Slot, SlotBoard, SupportBars } from './components';
import { usePrefs } from './prefs';
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
const TABS: Array<{ id: IslandTab; label: string }> = [
  { id: 'harbor', label: 'Harbor' },
  { id: 'crew', label: 'Crew' },
  { id: 'garrison', label: terms.garrison },
  { id: 'buildings', label: 'Buildings' },
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
    <p className="tiny muted" style={{ margin: '8px 0 0' }}>
      <b>{LOYALTY_BAND_LABEL[band]}.</b>{' '}
      {share === 0
        ? 'Nothing leaves this harbor but what you load.'
        : `${Math.round(share * 100)}% of what it ships goes out the back to the ${
            factionData[enemy].shortName
          }${lost > 0 ? `, ${lost.toFixed(1)} ${terms.gold.toLowerCase()} a day` : ''}.`}
      {!quiet && ' Word of what you keep here gets out, too.'}
    </p>
  );
}

/** One line explaining what a facility actually does for you right now. */
function facilityOutput(system: System, facility: Facility): string | null {
  const owner = facility.owner;
  if (owner !== 'empire' && owner !== 'alliance') return null;
  if (system.uprising) return `Idle — the island is in ${terms.mutiny.toLowerCase()}.`;
  if (system.control !== owner) return 'Idle — the island is not held by its owner.';
  const earning = GOLD_PER_DAY[facility.type];
  if (earning > 0) {
    const yieldNow = earning * supportMultiplier(system.support[owner]);
    return `Earns ${yieldNow.toFixed(1)} ${terms.gold.toLowerCase()} a day at this ${terms.allegiance.toLowerCase()}`;
  }
  const cost = UPKEEP_PER_DAY[facility.type];
  return cost > 0
    ? `${FACILITY_BLURB[facility.type]} Costs ${cost} ${terms.gold.toLowerCase()} a day.`
    : FACILITY_BLURB[facility.type];
}

function FacilityCard({
  state,
  system,
  facility,
  onBuild,
  onCancel,
}: {
  state: GameState;
  system: System;
  facility: Facility;
  onBuild: (facilityId: string, item: BuildItem) => void;
  onCancel: (facilityId: string) => void;
}) {
  const menu = buildMenu(facility);
  const mine = facility.owner === state.player;
  const order = facility.building;
  const output = facilityOutput(system, facility);

  return (
    <div className="card">
      <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
        <span className="facility__thumb">
          <FacilityThumb type={facility.type} owner={facility.owner} width={96} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row row--between">
            <div style={{ fontWeight: 600 }}>{FACILITY_LABEL[facility.type]}</div>
            {facility.owner !== state.player && <ControlBadge faction={facility.owner} />}
          </div>
          {output && (
            <div className="tiny muted" style={{ marginTop: 2 }}>
              {output}
            </div>
          )}
        </div>
      </div>

      {order && (
        <div className="row row--between small muted" style={{ marginTop: 6 }}>
          <span>
            Building {buildLabel(order.item)} —{' '}
            {order.daysRemaining}d left
            {system.uprising ? ' (halted)' : ''}
          </span>
          {mine && (
            <button className="tiny btn--danger" onClick={() => onCancel(facility.id)}>
              Cancel
            </button>
          )}
        </div>
      )}

      {mine && !order && menu.length > 0 && (
        <div className="buildgrid" style={{ marginTop: 8 }}>
          {menu.map((item) => {
            // What it costs this side today, not the sticker price: research
            // takes gold and days off a hull, and a button that keeps quoting
            // the old figure makes the whole errand invisible.
            const spec = { ...buildSpec(item), ...effectiveSpec(state, facility.owner as PlayableFaction, item) };
            const error = buildError(state, facility.id, item);
            return (
              <button
                key={item}
                className="build"
                disabled={error !== null}
                onClick={() => onBuild(facility.id, item)}
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
                    {error ?? `${spec.costGold} ${terms.gold.toLowerCase()} · ${spec.days}d`}
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

export function SystemSheet({
  state,
  system,
  initialTab = 'harbor',
  onClose,
  onBuild,
  onCancel,
  onFound,
  onOpenCharacter,
  onOpenReach,
  onSail,
  onEmbark,
  onAssault,
  onOpenShip,
  onOrderShips,
  onOrderOfficers,
  onOrderFacilities,
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
  onSail: (fleetId: string) => void;
  onEmbark: (fleetId: string, companies: number) => void;
  onAssault: (fleetId: string) => void;
  onOpenShip?: (fleetId: string, shipId: string) => void;
  onOrderShips?: (fleetId: string, shipIds: string[], dir: -1 | 1) => void;
  onOrderOfficers?: (fleetId: string, characterIds: string[], dir: -1 | 1) => void;
  onOrderFacilities?: (systemId: string, facilityIds: string[], dir: -1 | 1) => void;
  onOrderGarrison?: (systemId: string, typeIds: string[], dir: -1 | 1) => void;
  onOrderCrew?: (characterIds: string[], dir: -1 | 1) => void;
  onOpenCharacter?: (characterId: string) => void;
  onOpenReach?: (sectorId: string) => void;
}) {
  const [tab, setTab] = useState<IslandTab>(initialTab);
  /** A company the player has tapped to read about, on the Garrison tab. */
  const [companyId, setCompany] = useState<string | undefined>();
  const [prefs] = usePrefs();
  // Five tabs and a thumb: sliding between them beats aiming at them.
  const swipe = useSideSwipe((step) => {
    const at = TABS.findIndex((entry) => entry.id === tab);
    const next = Math.min(TABS.length - 1, Math.max(0, at + step));
    if (next !== at) setTab(TABS[next].id);
  });
  const sector = state.sectors.find((s) => s.id === system.sectorId)!;
  const explored = system.explored[state.player];

  if (!explored) {
    return (
      <Sheet
        title={system.name}
        subtitle={`${sector.name} · ${terms.uncharted}`}
        onClose={onClose}
      >
        <div className="isle-banner isle-banner--chart" style={{ height: 118 }}>
          <ChartMark name={system.chartName ?? system.name} width={362} height={118} className="isle-banner__chart" />
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

  const holder =
    system.control === 'empire' || system.control === 'alliance' ? system.control : null;
  const needed = requiredGarrison(holder ? system.support[holder] : 50, system.uprising);
  const crew = state.characters.filter(
    (c) => c.faction === state.player && c.locationSystemId === system.id,
  );
  const loose = recruitOn(state, system, state.player);
  const inbound = state.characters.filter(
    (c) =>
      c.faction === state.player &&
      c.mission?.targetSystemId === system.id &&
      c.mission.phase === 'travelling',
  );
  const slots = system.slots;
  const producers = system.facilities.filter(
    (f) => f.owner === state.player && !f.founding && buildMenu(f).length > 0,
  );
  // Who is actually ashore, company by company. Same length as the garrison
  // count the rest of the game runs on; this only says what they are.
  const roster = garrisonRoster(system);
  // Folded into kinds, in the order the player put them, for the grouped view.
  const garrison = byRemembered(garrisonSummary(system), (e) => e.type.id, system.garrisonOrder);
  /**
   * What stands here, as rows. Grouped, two mines of the same owner are one
   * line with a count; a building still going up is never folded in with a
   * finished one, because "2x Mine, 14d" would be a lie about both of them.
   */
  const works = (() => {
    const out: Array<Facility & { count: number; ids: string[] }> = [];
    for (const facility of system.facilities) {
      const fold =
        prefs.group &&
        !facility.building &&
        out.find((f) => f.type === facility.type && f.owner === facility.owner && !f.building);
      if (fold) {
        fold.count += 1;
        fold.ids.push(facility.id);
      } else {
        out.push({ ...facility, count: 1, ids: [facility.id] });
      }
    }
    return out;
  })();
  const company = companyId ? troopType(companyId) : undefined;

  return (
    <Sheet
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
        </div>
      }
      tabs={
        <div className="tabs" role="tablist">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              role="tab"
              aria-selected={tab === entry.id}
              className={`tabs__tab${tab === entry.id ? ' tabs__tab--on' : ''}`}
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
      {tab === 'harbor' && (
        <>
          {system.note && <p className="portrait__note serif">{system.note}</p>}

          {/* The harbor is the ships in it. Allegiance and room used to sit
              above them, and both are on the chain view before you ever open
              this panel — so the first thing under the painting is now the
              thing you came to look at. Allegiance moved to the Garrison tab,
              where holding an island is the subject; room leads the Buildings
              tab already. */}
          <div className="section-title">At anchor</div>
          <ShipsHere
            state={state}
            systemId={system.id}
            onSail={onSail}
            onEmbark={onEmbark}
            onAssault={onAssault}
            onOpenCharacter={onOpenCharacter}
            onOpenShip={onOpenShip}
            onOrderShips={onOrderShips}
            onOrderOfficers={onOrderOfficers}
          />

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

      {tab === 'buildings' && (
        <>
          {/* Room first, at one length: a bar that is the width of the panel
              on every island, so two islands are compared by how full they
              are. The board under it holds what actually stands — an empty
              berth is a space on the bar, not a box in a grid that grew
              longer the more room an island had. */}
          <RoomBar system={system} />
          <p className="tiny muted" style={{ margin: '6px 0 10px' }}>
            {system.facilities.length} of {slots} berths taken
            {freeSlots(system) > 0 ? `, ${freeSlots(system)} free` : ', and no room left'}.
          </p>
          {system.facilities.length > 1 && <ListOpts />}
          <SlotBoard
            empty={`Nothing stands on ${system.name}${slots > 0 ? ' yet' : ', and there is nowhere to put anything'}.`}
          >
            {works.map((facility, i) => (
              <Slot
                key={facility.id}
                icon={<FacilityIcon type={facility.type} size={30} />}
                name={
                  facility.count > 1
                    ? `${facility.count}× ${FACILITY_LABEL[facility.type]}`
                    : FACILITY_LABEL[facility.type]
                }
                note={facility.building ? `${facility.building.daysRemaining}d` : undefined}
                tone={facility.owner !== state.player ? 'dim' : undefined}
                order={
                  prefs.reorder && works.length > 1 && onOrderFacilities
                    ? {
                        up:
                          i === 0
                            ? undefined
                            : () => onOrderFacilities(system.id, facility.ids, -1),
                        down:
                          i === works.length - 1
                            ? undefined
                            : () => onOrderFacilities(system.id, facility.ids, 1),
                      }
                    : undefined
                }
              />
            ))}
          </SlotBoard>

          {producers.length > 0 && <div className="section-title">Order something built</div>}
          <div className="stack">
            {producers.map((facility) => (
              <FacilityCard
                key={facility.id}
                state={state}
                system={system}
                facility={facility}
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
                        {founding.building?.daysRemaining} days to go.
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

      {tab === 'garrison' && (
        <>
          {/* What the island thinks of its holder, where it belongs: how many
              companies it asks for and how much of its trade goes out the back
              are both read off this number. */}
          {system.populated ? (
            <div style={{ marginBottom: 10 }}>
              <SupportBars system={system} />
              <LoyaltyLine system={system} />
            </div>
          ) : (
            <p className="muted small" style={{ margin: '0 0 10px' }}>
              Nobody lives here. Held only while a company remains ashore; finish any building and
              the island settles under your flag.
            </p>
          )}
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
          {/* Empty slots here are the shortfall: companies the island wants
              and has not got. That is worth drawing.

              Every company now says what it is. A garrison used to be ten
              identical pike figures, which answered "how many" and nothing
              else — and who is standing there is the more interesting half:
              the Reef Guard are the reef island, and an Urskin company on the
              ice is who lives on the ice. */}
          <ListOpts />
          {/* Grouped, a kind of company is one tile with a count; ungrouped,
              every company is its own. The kinds can be put in an order —
              a company has no identity of its own to move, so what is
              remembered is which kind comes first. */}
          <SlotBoard
            ghosts={Math.max(0, needed - system.garrison)}
            empty={`No companies are ashore on ${system.name}.`}
          >
            {(prefs.group
              ? garrison.map((e) => ({ ...e, key: e.type.id }))
              : roster.map((type, i) => ({ type, count: 1, key: `${type.id}-${i}` }))
            ).map(
              (entry, i, all) => (
                <Slot
                  key={entry.key}
                  icon={<CompanyIcon size={30} type={entry.type.id} />}
                  name={
                    prefs.group && entry.count > 1
                      ? `${entry.count}× ${entry.type.name}`
                      : entry.type.name
                  }
                  note={`${entry.type.offense}/${entry.type.defense}/${entry.type.watch}`}
                  onClick={() => setCompany(entry.type.id)}
                  label={`${entry.type.name} — ${entry.type.people}`}
                  order={
                    prefs.reorder && prefs.group && all.length > 1 && onOrderGarrison
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
              Attack / hold / watch. Tap a company to read what it is.
            </p>
          )}
          {company && (
            <div className="card row" style={{ gap: 10, alignItems: 'flex-start', marginTop: 8 }}>
              <span className="facility__icon">
                <CompanyIcon size={34} type={company.id} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row row--between">
                  <b className="small">{company.name}</b>
                  <button className="linkish tiny" onClick={() => setCompany(undefined)}>
                    Close
                  </button>
                </div>
                <div className="tiny muted" style={{ marginTop: 1 }}>
                  {company.people} · attack {company.offense} · hold {company.defense} · watch{' '}
                  {company.watch}
                </div>
                <div className="tiny muted" style={{ marginTop: 4 }}>{company.blurb}</div>
              </div>
            </div>
          )}
          <p className="tiny muted" style={{ marginTop: 8 }}>
            {needed > 0
              ? `Allegiance here is low enough that ${needed} ${needed === 1 ? 'company holds' : 'companies hold'} the island quiet. Fewer and it rises.`
              : 'Allegiance is high enough that no companies are needed to keep order.'}
          </p>
        </>
      )}

      {tab === 'crew' && (
        <>
          {/* Somebody the war has not claimed. First, because it is the one
              thing on this tab you can act on that will not wait — the other
              side is looking for them too. */}
          {loose && (
            <>
              <div className="section-title">On the quay</div>
              <div className="card small row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <CharacterPortrait
                  name={loose.name}
                  faction="neutral"
                  people={loose.people}
                  size={40}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{loose.name}</b>
                  {loose.people && <div className="tiny muted">{loose.people}</div>}
                  {loose.blurb && (
                    <p className="tiny muted" style={{ margin: '4px 0 0' }}>
                      {loose.blurb}
                    </p>
                  )}
                </div>
              </div>
              <p className="muted tiny" style={{ marginTop: 6 }}>
                Send one of your own here to put it to them. They belong to
                nobody yet, and will not wait for you.
              </p>
            </>
          )}

          <div className="section-title">Ashore here</div>
          {crew.length > 1 && <ListOpts />}
          <SlotBoard empty={`Nobody of yours is on ${system.name}.`}>
            {crew.map((character, i) => (
              <Slot
                key={character.id}
                icon={
                  <CharacterPortrait
                    name={character.name}
                    faction={character.faction}
                    people={character.people}
                    size={32}
                    dim={character.status !== 'available'}
                  />
                }
                name={character.name}
                note={
                  character.mission
                    ? `${errandName(character.mission.type)} ${character.mission.daysRemaining}d`
                    : character.status === 'available'
                      ? undefined
                      : character.status.replace('_', ' ')
                }
                tone={character.status === 'injured' ? 'warn' : undefined}
                onClick={() => onOpenCharacter?.(character.id)}
                order={
                  prefs.reorder && crew.length > 1 && onOrderCrew
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

          <div className="section-title">Under way to here</div>
          <SlotBoard empty={`Nobody of yours is sailing for ${system.name}.`}>
            {inbound.map((character) => (
              <Slot
                key={character.id}
                icon={
                  <CharacterPortrait
                    name={character.name}
                    faction={character.faction}
                    people={character.people}
                    size={32}
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
    </Sheet>
  );
}
