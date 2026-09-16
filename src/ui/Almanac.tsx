import { useState } from 'react';
import terms from '../data/terms.json';
import characterRoster from '../data/characters.json';
import reachData from '../data/reaches.json';
import {
  FACILITY_LABEL,
  GOLD_PER_DAY,
  MISSION_WORK_DAYS,
  TROOP_BUILD,
  UPKEEP_PER_DAY,
  UPRISING_END_SUPPORT,
  UPRISING_SUPPORT,
  FLIP_SUPPORT_MIN,
  GARRISON_FAIR,
  GARRISON_FOR_BAND,
  GARRISON_STRONG,
  PIRATE_LORDS,
  LORD_POWER_TEXT,
  SMUGGLED_SHARE,
  SUPPORT_FIRM,
  SUPPORT_STEADY,
  CAPTIVE_DAYS,
  YARD_BUILDS,
  type FacilityType,
  type GameState,
  CREATURES,
  troopsOf,
  BATTLE_ODDS_LABEL,
  BREAK_OFF_ODDS,
  FORT_GUNS,
  LONG_GUN_SHARE,
  shipsFor,
  shipSpec,
  FORT_STRENGTH,
  FORT_REPAIR_PER_DAY,
  REPAIR_PER_DAY,
  REPAIR_AT_A_YARD,
  BOOM_DEFENCE,
  GUN_DECKS,
  HULL_EASE,
  GUNNERY_ON_SMALL,
  BOMBARD_PER_COMPANY,
  CIVILIAN_LOYALTY_HIT,
  SUPPORT_FIRM as FIRM,
} from '../sim';
import {
  CategoryIcon,
  CharacterPortrait,
  FacilityThumb,
  CompanyIcon,
  ShipThumb,
  CompanyRow,
  CreaturePainting,
} from './art';
import { GoldFig, Sheet } from './components';

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
  'fort',
  'boom',
];

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
  { id: 'islands', label: 'Islands' },
  { id: 'rules', label: 'Rules' },
] as const;

type Page = (typeof PAGES)[number]['id'];

export function Almanac({
  state,
  onClose,
  page: opening = 'people',
}: {
  state: GameState;
  onClose: () => void;
  /** Which page to open on, when something else sent the player here. */
  page?: Page;
}) {
  const roster = characterRoster[state.player];
  const [page, setPage] = useState<Page>(opening);

  return (
    <Sheet
      title="Encyclopedia"
      subtitle="Every unit in the game, with the numbers the rules actually use"
      onClose={onClose}
      stacked
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
          <div key={type} className="card row" style={{ gap: 10, alignItems: 'flex-start' }}>
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
        <b>A {FACILITY_LABEL.fort.toLowerCase()} is {FORT_GUNS} guns that cannot weigh anchor.</b>{' '}
        It fires in every action fought in its water, on the side of whoever holds the island. It
        also does something no fleet can: while one stands, <i>no landing is possible</i>. An
        enemy who wants the island has to beat the wall down with shot first, which is the only
        thing that can touch it.
        <br />
        <br />
        <b>It has a condition, and its gunnery falls with it.</b> {FORT_STRENGTH} of strength; a
        wall at half is half a battery. Beaten to nothing it is rubble, and rubble does not come
        back — the island has to build a new one. Left alone it mends{' '}
        {Math.round(FORT_REPAIR_PER_DAY * 100)}% of itself a day, twice what a hull manages, which
        is why a siege that stops for a week has lost the week.
        <br />
        <br />
        <b>A {FACILITY_LABEL.boom.toLowerCase()} is a chain across the harbor mouth.</b> Worth{' '}
        {BOOM_DEFENCE} companies to the defence of a landing, and it is found by a blockade as
        well as by boats.
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
      <div className="stack">
        {troopsOf(state.player).map((type) => (
          <div key={type.id} className="card row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <span className="facility__icon">
              <CompanyIcon size={32} type={type.id} />
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
      <div className="section-title">What an officer is for</div>
      <div className="card small">
        <b>Four numbers, and each one is a different errand.</b>{' '}
        <b>Diplomacy</b> wins islands over and stirs them up. <b>Espionage</b> is the quiet work —
        sabotage, and carrying somebody off a quay. <b>Combat</b> tells in a landing and keeps them
        alive when an errand goes wrong. <b>Leadership</b> is worth a hit chance to every gun in
        the squadron they sail with, and holds an island quiet when they are posted to it.
        <br />
        <br />
        <b>A posting is not an errand.</b> Put an officer in command of an island and they stay:
        the island does not rise while they stand on it, and a stranger asking questions in its
        harbor is far likelier to be found out. They are not available for anything else until
        relieved, and leaving ends the posting.
        <br />
        <br />
        <b>They can be taken.</b> Anyone of yours standing on an island the enemy can reach can be
        carried off, and held. Captives come back in an exchange after {CAPTIVE_DAYS} days — which
        is what makes the Crown's victory a window rather than a list, since it needs all three
        Lords in irons at the same moment.
      </div>

      <div className="section-title">Your crew</div>
      <div className="stack">
        {roster.map((entry) => (
          <div key={entry.id} className="card">
            <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
              <CharacterPortrait
                name={entry.name}
                faction={state.player}
                people={entry.people}
                size={44}
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
            <div className="statgrid">
              <span><i>Diplomacy</i><b>{entry.ratings.diplomacy}</b></span>
              <span><i>Espionage</i><b>{entry.ratings.espionage}</b></span>
              <span><i>Combat</i><b>{entry.ratings.combat}</b></span>
              <span><i>Leadership</i><b>{entry.ratings.leadership}</b></span>
            </div>
          </div>
        ))}
      </div>

        </>
      )}

      {page === 'islands' && (
        <>
      <div className="section-title">What an island is</div>
      <div className="card small">
        <b>Seventy-one of them, and every one is the same four questions.</b> Who holds it. What it
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
        at it, until somebody has surveyed it. Three of the seven Reaches start dark, and what is
        in their water starts dark with them.
      </div>

      <div className="section-title">The seven Reaches</div>
      <p className="tiny muted" style={{ marginTop: 0 }}>
        A chain of islands in one Sea. Allegiance won on one spills a fifth onto the rest of its
        chain, so a Reach is the unit a war is actually fought in.
      </p>
      <div className="stack">
        {reachData.reaches.map((reach) => (
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

      {page === 'rules' && (
        <>
      <div className="section-title">The words</div>
      <dl className="glossary">
        {(
          [
            [terms.gold, 'The only currency. Buildings earn it, buildings cost it, and everything is bought with it.'],
            [terms.upkeep, 'What everything you own costs to keep, per day. If you cannot pay, something breaks.'],
            [terms.allegiance, `How much of an island's population is on your side, out of 100. It sets what the island earns you and whether it stays quiet.`],
            [terms.space, 'Berths to build on. Every building takes one; companies and hulls take none.'],
            [terms.island, 'One place on the chart. Seventy-one of them.'],
            [terms.reach, 'A chain of seven to ten islands. Allegiance won on one spills 20% onto the rest.'],
            [terms.mutiny, `An island whose allegiance falls under ${UPRISING_SUPPORT} rises unless enough companies hold it. It earns nothing and builds nothing until allegiance climbs back to ${UPRISING_END_SUPPORT}.`],
            [terms.parley, `Sending a crew member to talk an island round, where nobody has chosen a side or the island is already yours. The sail is as long as the distance — a few days inside a ${terms.reach}, a fortnight or more across open sea — then ${MISSION_WORK_DAYS} days' work before they report.`],
            [terms.incite, `The same trip to an island they hold, to turn it against its governor. You do not win the island — you cost them their grip on it, and an island pushed far enough rises on its own, which stops everything being built or loaded there. Dangerous work: their officers are watching, and yours can be hurt.`],
            ['Unaligned', `An island that has not picked a side. Every island's regard for the two of you adds up to a hundred, so a point you win is a point they lose; at ${FLIP_SUPPORT_MIN} it runs up your colours.`],
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
      {/* The whole class, every number the rules read. Sean asked for stats on
          all units and this was the one category with none: the hulls were
          four lines under the battle rules and the cost, the upkeep, the lift
          and the weight against a wall were nowhere at all. */}
      <div className="section-title">The four hulls</div>
      <div className="stack">
        {shipsFor(state.player).map((cls) => {
          const spec = shipSpec(cls.id);
          return (
            <div key={cls.id} className="card">
              <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <ShipThumb faction={state.player} role={cls.role} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row row--between">
                    <b>{cls.name}</b>
                    <span className="tiny muted">
                      <GoldFig n={spec.costGold} per={null} /> · {spec.days}d
                    </span>
                  </div>
                  <div className="tiny" style={{ marginTop: 2 }}>
                    <GoldFig label={terms.upkeep} n={spec.upkeep} tone="cost" />
                  </div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>{cls.blurb}</div>
                </div>
              </div>
              <div className="statgrid">
                <span><i>Guns</i><b>{spec.guns || '—'}</b></span>
                <span><i>Hull</i><b>{spec.hull}</b></span>
                <span><i>Against a wall</i><b>{spec.bombard || '—'}</b></span>
                <span><i>Carries</i><b>{spec.carries || '—'}</b></span>
                <span>
                  <i>Pace</i>
                  <b>{spec.pace < 1 ? 'Fast' : spec.pace > 1 ? 'Slow' : 'Steady'}</b>
                </span>
                <span><i>Getting clear</i><b>{spec.speed}/10</b></span>
                <span><i>Broadsides</i><b>{GUN_DECKS[cls.role]}</b></span>
                <span>
                  <i>Long guns</i>
                  <b>{spec.longGuns ? 'Yes' : 'No'}</b>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="section-title">Which hull beats which</div>
      <div className="card small">
        <b>It goes round, not up.</b> Frigates take sloops, sloops take ships of the line, ships of
        the line take frigates. A fleet of one kind has a hole in it the other side can aim at, and
        no weight of sloops opens a fortified harbor.
        <br />
        <br />
        <b>Three things make it turn.</b> A bigger hull is an easier target — a first-rate is hit{' '}
        {Math.round(HULL_EASE.large * 100)}% as often as the dice say against a sloop's{' '}
        {Math.round(HULL_EASE.small * 100)}%. A frigate's guns are handy against something small
        and quick ({GUNNERY_ON_SMALL.medium.toFixed(2)}× on a sloop) where a first-rate's are not
        ({GUNNERY_ON_SMALL.large.toFixed(2)}×). And weight is spread over decks: a ship of the line
        fires {GUN_DECKS.large} broadsides of a third her weight rather than one great shot, so she
        is not wasting thirty damage on a nine-hull sloop.
        <br />
        <br />
        <b>Measured by the purse</b>, even gold a side: two frigates beat four sloops, four sloops
        beat a first-rate, two first-rates beat three frigates.
      </div>

      <div className="section-title">Shot against the land</div>
      <div className="card small">
        A hull's weight against a wall is a different number from her guns, and a transport has
        none of it. Shot goes at the walls while any stand; only when none do can it reach the
        garrison, and it takes {BOMBARD_PER_COMPANY} of weight to break one company. Shot that goes
        looking for companies in a town finds the town: the island's regard falls{' '}
        {CIVILIAN_LOYALTY_HIT} a day, every island in the Reach hears of it, and each further day
        costs more than the last.
      </div>

      <div className="section-title">An action at sea</div>
      <div className="card small">
        <b>Where it happens.</b> Wherever your hulls and theirs lie in the same
        water — nobody manoeuvres and there is no open sea to meet in. A fort on
        the wall is a warship that cannot weigh anchor, so lying off a fortified
        harbor is an action whether or not a fleet comes out; and a creature is
        nobody's, so anchoring in its water is an action on its own.
        <br />
        <br />
        <b>How it runs.</b> The day you meet, one broadside is fired and the
        clock stops. After that it is yours: fight on a round at a time, or
        break off. Everyone fires at once each round, worked out against the
        state at the start of it, so a hull that goes down still got its shot
        away. Most actions are decided in two or three.
        <br />
        <br />
        <b>What you are told.</b> Two words over the sheet, off the guns still
        firing on both sides with the wall counted for whoever holds it and the
        creature counted against everybody:{' '}
        {(['overwhelming', 'favorable', 'even', 'unfavorable', 'desperate'] as const)
          .map((band) => BATTLE_ODDS_LABEL[band])
          .join(' · ')}
        . Under it, every hull in the water on both sides and what it has left.
        <br />
        <br />
        <b>Breaking off.</b> Always works — there is no roll that keeps you in a
        fight you have decided to leave. What it costs is the run. Only guns
        that reach can touch a fleet already under way: the wall can, a creature
        always can, and a hull only if she carries long guns, at{' '}
        {Math.round(LONG_GUN_SHARE * 100)}% of her weight. How many shots you
        eat on the way out is your speed, which is why a first-rate is an
        expensive thing to have to withdraw and a sloop is nearly free. You run
        for the nearest island you hold; with nowhere to run, or companies of
        yours ashore, you stay.
        <br />
        <br />
        <b>They break off too</b>, once the guns still firing against them are{' '}
        {BREAK_OFF_ODDS} times their own and there is somewhere to run — never
        on the first exchange. It is a rule rather than a judgement, which means
        you can bait it.
        <br />
        <br />
        <b>Who is aboard.</b> The best Leadership with a fleet is worth a hit
        chance to every gun in it. Companies aboard go down with the hull
        carrying them, which is what makes a loaded transport worth escorting
        and worth sinking. A fort is {FORT_GUNS} guns.
      </div>

      {/* The four hulls as a table, because the decision the battle sheet asks
          for is made of exactly these numbers. */}
      <div className="stack" style={{ marginTop: 10 }}>
        {shipsFor(state.player).map((cls) => {
          const spec = shipSpec(cls.id);
          return (
            <div key={cls.id} className="card row" style={{ gap: 10, alignItems: 'center' }}>
              <ShipThumb faction={state.player} role={cls.role} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row row--between">
                  <b className="small">{cls.name}</b>
                  <span className="tiny muted">
                    {spec.guns} guns · {spec.hull} hull
                    {spec.longGuns ? ' · long guns' : ''}
                  </span>
                </div>
                <div className="tiny muted" style={{ marginTop: 1 }}>
                  {spec.guns === 0
                    ? 'Cannot fight. Carries more than anything else afloat.'
                    : `Speed ${spec.speed} — ${
                        spec.speed >= 8
                          ? 'slips away under fire'
                          : spec.speed >= 5
                            ? 'gets clear at a price'
                            : 'pays dearly to withdraw'
                      }.`}
                </div>
              </div>
            </div>
          );
        })}
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
        way anyone is taken. Captives are exchanged after {CAPTIVE_DAYS} days, so the Crown's is a
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
