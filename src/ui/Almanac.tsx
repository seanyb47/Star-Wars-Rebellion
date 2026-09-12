import terms from '../data/terms.json';
import characterRoster from '../data/characters.json';
import {
  FACILITY_LABEL,
  GOLD_PER_DAY,
  MISSION_WORK_DAYS,
  TROOP_BUILD,
  TRAVEL_DAYS_CROSS_SECTOR,
  TRAVEL_DAYS_IN_SECTOR,
  UPKEEP_PER_DAY,
  UPRISING_END_SUPPORT,
  UPRISING_SUPPORT,
  FLIP_SUPPORT_MARGIN,
  FLIP_SUPPORT_MIN,
  VICTORY_CONTROL_FRACTION,
  YARD_BUILDS,
  type FacilityType,
  type GameState,
  CREATURES,
} from '../sim';
import {
  CategoryIcon,
  CharacterPortrait,
  CompanyRow,
  CreaturePainting,
  FacilityIcon,
} from './art';
import { Sheet } from './components';

/**
 * Everything in the game, in one place, read out of the same constants the
 * simulation runs on — so it cannot quietly go out of date the way a
 * hand-written manual would.
 */
const BUILD_ORDER: FacilityType[] = [
  'mine',
  'refinery',
  'construction_yard',
  'training_facility',
  'shipyard',
];

function GoldLine({ type }: { type: FacilityType }) {
  const earns = GOLD_PER_DAY[type];
  const costs = UPKEEP_PER_DAY[type];
  if (earns > 0) {
    return (
      <span className="almanac__earn">
        Earns {earns} {terms.gold.toLowerCase()} a day
      </span>
    );
  }
  if (costs > 0) {
    return (
      <span className="almanac__cost">
        Costs {costs} {terms.gold.toLowerCase()} a day
      </span>
    );
  }
  return <span className="muted">No running cost</span>;
}

export function Almanac({ state, onClose }: { state: GameState; onClose: () => void }) {
  const roster = characterRoster[state.player];

  return (
    <Sheet
      title="Almanac"
      subtitle="Everything in the game, and what the words mean"
      onClose={onClose}
      stacked
    >
      <div className="section-title">Buildings</div>
      <p className="tiny muted" style={{ marginTop: 0 }}>
        A building either earns {terms.gold.toLowerCase()} or costs it. A camp needs free{' '}
        {terms.ground.toLowerCase()}; everything else needs free {terms.water.toLowerCase()}.
        Buildings are raised by a {FACILITY_LABEL.construction_yard} standing on the same island.
      </p>
      <div className="stack">
        {BUILD_ORDER.map((type) => (
          <div key={type} className="card row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <span className="facility__icon">
              <FacilityIcon type={type} size={30} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row row--between">
                <b>{FACILITY_LABEL[type]}</b>
                <span className="tiny muted">
                  {YARD_BUILDS[type].costGold} {terms.gold.toLowerCase()} · {YARD_BUILDS[type].days}d
                </span>
              </div>
              <div className="tiny" style={{ marginTop: 2 }}>
                <GoldLine type={type} />
              </div>
              <div className="tiny muted" style={{ marginTop: 2 }}>
                {terms.facilityBlurbs[type]}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="section-title">Companies</div>
      <div className="card">
        <div className="row row--between">
          <b>{TROOP_BUILD.label}</b>
          <span className="tiny muted">
            {TROOP_BUILD.costGold} {terms.gold.toLowerCase()} · {TROOP_BUILD.days}d
          </span>
        </div>
        <div className="tiny almanac__cost" style={{ marginTop: 2 }}>
          Costs {UPKEEP_PER_DAY.troop} {terms.gold.toLowerCase()} a day
        </div>
        <div style={{ margin: '8px 0' }}>
          <CompanyRow present={3} />
        </div>
        <p className="tiny muted" style={{ margin: 0 }}>
          Drilled at a {FACILITY_LABEL.training_facility}. Companies hold an island quiet when its
          allegiance falls, and are the only thing that holds an uninhabited island at all.
        </p>
      </div>

      <div className="section-title">Your crew</div>
      <div className="stack">
        {roster.slice(0, 7).map((entry) => (
          <div key={entry.id} className="card row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <CharacterPortrait
              name={entry.name}
              faction={state.player}
              people={entry.people}
              size={40}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b className="small">{entry.name}</b>
              <div className="tiny muted" style={{ marginTop: 1 }}>
                {entry.people} · {entry.roles.join(', ')}
              </div>
              <div className="tiny muted" style={{ marginTop: 4 }}>
                {entry.bio}
              </div>
            </div>
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

      <div className="section-title">The words</div>
      <dl className="glossary">
        {(
          [
            [terms.gold, 'The only currency. Buildings earn it, buildings cost it, and everything is bought with it.'],
            [terms.upkeep, 'What everything you own costs to keep, per day. If you cannot pay, something breaks.'],
            [terms.allegiance, `How much of an island's population is on your side, out of 100. It sets what the island earns you and whether it stays quiet.`],
            [terms.ground, 'How many camps an island has room for.'],
            [terms.water, 'Fresh water. Every building except a camp needs some.'],
            [terms.island, 'One place on the chart. A hundred of them.'],
            [terms.reach, 'A cluster of ten islands. Allegiance won on one spills 20% onto the rest.'],
            [terms.sea, 'One of the seven regions. Three Inner, four Outer.'],
            [terms.mutiny, `An island whose allegiance falls under ${UPRISING_SUPPORT} rises unless enough companies hold it. It earns nothing and builds nothing until allegiance climbs back to ${UPRISING_END_SUPPORT}.`],
            [terms.parley, `Sending a crew member to talk an island round, where nobody has chosen a side or the island is already yours. ${TRAVEL_DAYS_IN_SECTOR} days' sail inside a ${terms.reach}, ${TRAVEL_DAYS_CROSS_SECTOR} beyond, then ${MISSION_WORK_DAYS} days' work before they report.`],
            [terms.incite, `The same trip to an island they hold, to turn it against its governor. You do not win the island — you cost them their grip on it, and an island pushed far enough rises on its own, which stops everything being built or loaded there. Dangerous work: their officers are watching, and yours can be hurt.`],
            ['Unaligned', `An island that has not picked a side. It comes over to you at ${FLIP_SUPPORT_MIN} allegiance with a ${FLIP_SUPPORT_MARGIN}-point lead.`],
            ['Smuggling', 'On an island where your allegiance is under 50, the day’s takings may go to the enemy instead.'],
          ] as const
        ).map(([word, meaning]) => (
          <div key={word} className="glossary__row">
            <dt>{word}</dt>
            <dd>{meaning}</dd>
          </div>
        ))}
      </dl>

      <div className="section-title">What is in the water</div>
      <div className="card small muted" style={{ marginBottom: 14 }}>
        None of this can be fought, built or counted. It is here because an island panel that
        mentions the thing in its waters ought to be able to tell you what it is.
      </div>
      <div className="bestiary">
        {CREATURES.map((beast) => (
          <div key={beast.slug} className="bestiary__entry">
            <CreaturePainting slug={beast.slug} height={120} />
            <h4 className="bestiary__name">{beast.name}</h4>
            <p className="bestiary__where">
              {beast.waters.map((w) => w.replace(/-isle$/, '').replace(/-/g, ' ')).join(' · ')}
            </p>
            <p className="bestiary__lore">{beast.lore}</p>
          </div>
        ))}
      </div>

      <div className="section-title">How the war is won</div>
      <div className="card small">
        Hold {Math.round(VICTORY_CONTROL_FRACTION * 100)}% of the settled islands. Left alone, the
        enemy gets there in roughly 700 days.
      </div>

      <div className="section-title">Not built yet</div>
      <div className="card small muted">
        Tidecraft, the Leviathan, and a research tree with things in it are designed but not in the
        game. Everything else the original had is: fleets and sea battles, and eight kinds of errand
        — {terms.parley.toLowerCase()}, stirring up trouble, signing on, {terms.survey.toLowerCase()},
        {' '}{terms.sabotage.toLowerCase()}, abduction, command of an island in revolt, and the yards.
        You never pick one; the island decides.
      </div>
    </Sheet>
  );
}
