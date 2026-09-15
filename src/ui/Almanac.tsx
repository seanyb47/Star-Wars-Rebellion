import terms from '../data/terms.json';
import characterRoster from '../data/characters.json';
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
} from '../sim';
import {
  CategoryIcon,
  CharacterPortrait,
  CompanyIcon,
  ShipThumb,
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
  'fort',
  'boom',
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
        A building either earns {terms.gold.toLowerCase()} or costs it, and every one of them
        takes one free berth on the island, whatever it is.
        Buildings are raised by a {FACILITY_LABEL.construction_yard} — the island's own, or the nearest of
        yours, whose builders sail over and add the passage to the clock. Companies and hulls are
        sent the same way: drilled or laid down where you have the ground for it, and delivered
        where you asked.
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
