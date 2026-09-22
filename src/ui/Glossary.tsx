import { useMemo, useState } from 'react';
import terms from '../data/terms.json';
import reachData from '../data/reaches.json';
import {
  FORT_INVASION_DEFENSE,
  GARRISON_FOR_BAND,
  GARRISON_SMUGGLING_CUT,
  LONG_GUN_SHARE,
  MISSION_WORK_DAYS,
  TRAVEL_MAX_DAYS,
  MOMENTUM_CAP,
  UPKEEP_PER_DAY,
  UPRISING_END_SUPPORT,
  UPRISING_SUPPORT,
} from '../sim';

/**
 * Every word the game uses, and what it means.
 *
 * Sean asked for this outright: *"add a glossary to the encyclopedia."* It
 * replaces the eleven-entry list that had been buried at the top of the Rules
 * page, where a player looking up a word had to already know the word was a
 * rule.
 *
 * Two things it is deliberately not. It is **not** a rules reference — a
 * glossary entry says what a word means and roughly what it does, and sends
 * you to the page that explains it properly; the moment an entry starts
 * listing modifiers it has become the Rules page with worse formatting. And it
 * is **not** a place to restate the fiction: the Lore tab does that.
 *
 * The grouping is the same one the vocabulary pass settled on — what you are
 * looking at, who you have, what you send them to do, what people think, what
 * things cost, and what happens when the guns go off — so the glossary and the
 * interface agree about which ideas are which.
 */
const ISLAND_COUNT = reachData.reaches.reduce((n, r) => n + r.islands.length, 0);

type Entry = readonly [word: string, meaning: string];
type Group = {
  title: string;
  entries: readonly Entry[];
  /**
   * Leave this group in the order it is written, because the order says
   * something. Only one group does: the views run outermost inward, and
   * sorting them gives *Location, Reach, Reach Map, Sea, Unexplored, World
   * Map*, which throws away the one thing that list is teaching.
   */
  keepOrder?: true;
};

function groups(): Group[] {
  /*
   * A headword is the agreed label — Location, Reach Map — and the sentence
   * under it says *island*, because that is the vocabulary rule and because
   * the first draft of this file interpolated the label into the prose and
   * produced "the companies standing on an location".
   */
  return [
    {
      title: 'What you are looking at',
      keepOrder: true,
      entries: [
        [
          terms.worldMap,
          'Every island in the Seven Seas at once, as a dot in the colour of whoever holds it. The size of a dot is how firmly it is held. This is the tab you start on.',
        ],
        [
          terms.reachMap,
          `One chain opened up: where its islands lie in relation to each other, what each is worth and who is ashore. Tap a ${terms.reach} on the ${terms.worldMap} to get here.`,
        ],
        [
          terms.island,
          `One place, opened up — its harbor, your crew ashore, its garrison, what is built on it and its lore. There are ${ISLAND_COUNT} of them.`,
        ],
        [
          terms.reach,
          `A chain of seven to ten islands that trade with each other and hear each other's news. Word of a rising or a defection carries down a ${terms.reach}; an ordinary fortnight's work does not.`,
        ],
        [
          terms.sea,
          'The water a group of Reaches sits in. It names the weather and the paintings and nothing else — you cannot act on a Sea.',
        ],
        [
          terms.uncharted,
          'Nobody of yours has been. You can see that something is there and nothing about it — not who holds it, not what it is worth, not what is in the water off it. Charting it is the Explore mission.',
        ],
      ],
    },
    {
      title: 'Your people',
      entries: [
        [
          terms.crew,
          `Everybody who works for you by name. Each is rated for ${terms.parley}, Espionage, Combat and Leadership, and which rating matters depends entirely on what you send them to do.`,
        ],
        [
          'Negotiator',
          `A ${terms.crewOne} who is particularly good at talking a place round. It is a specialism and not a job: anybody may be sent to ${terms.parley.toLowerCase()}, and a Negotiator leading it is worth roughly a second envoy.`,
        ],
        [
          'Recruiter',
          `A ${terms.crewOne} who can keep an open table and sign people on. Only a Recruiter may lead a Recruitment, and both sides always have at least one.`,
        ],
        /*
         * The other nine role tags, added 19 September because Sean asked for
         * the tags to be tappable — *"make their role tags clickable to
         * glossary term"* — and a tag that opens the glossary and finds
         * nothing there is worse than one that does nothing.
         *
         * Each entry says plainly whether the tag is a rule or a label. Four
         * of them are read by the sim and five are not, and a player has no
         * way to tell which from the card.
         */
        [
          'Leader',
          `A ${terms.crewOne} fit to hold a place rather than visit it. A Leader or a General may be given Command of an island; nobody else may, whatever their Leadership.`,
        ],
        [
          'General',
          'Ground command. It does the same job as Leader for the one rule that reads it — either tag lets somebody take Command of an island — and marks somebody who fights ashore rather than afloat.',
        ],
        [
          'Spec Ops',
          `The quiet trades. A Spec Ops ${terms.crewOne} leading an ${terms.incite.toLowerCase()} is worth roughly a second agent, the same way a Negotiator is at a ${terms.parley.toLowerCase()}.`,
        ],
        [
          'Ship Design',
          'A shipwright. A label, not a rule: the Research mission is settled on ratings and anybody may be sent, so this says who ought to go rather than who may.',
        ],
        [
          'Drill Research',
          'The same for troops — who knows how a landing party should be trained. A label rather than a rule, like Ship Design.',
        ],
        /*
         * Deep-touched, Latent Deep-touched and Tidemaster stood here until
         * 20 September, when the lore package retired the Deep as a system:
         * *"No hard system, no ranks, no schools. Mystical, natural, almost
         * shamanistic... Not harnessed; no wizards casting spells. Largely
         * absent from the Imperium."* Three ranks of a trained gift, two of
         * them worn by Crown officers, were the system the canon says does
         * not exist. The role tags went with them.
         *
         * `Tidecraft` survives, but only as the ship-lore word for the
         * Reef-folk's coral vanes, which is a thing a hull has rather than a
         * rank a person holds.
         */
        [
          'Wing-Captain',
          'Commands the small craft that work off a larger hull. One person in the game holds the tag, and nothing reads it yet.',
        ],
        [
          terms.lord,
          'One of the three who signed the articles. Each commands a ship nobody else can sail and brings something nobody else has. Ashore they are ordinary crew, and can be found out, hurt or carried off like anybody.',
        ],
        [
          'In irons',
          'Taken, and held in a cell on the island where they were carried. Nobody is ever released by the clock — a prisoner stays until their own side sends somebody to break them out.',
        ],
      ],
    },
    {
      title: terms.errands,
      entries: [
        [
          terms.errand,
          `Anything you send a ${terms.crewOne} to do. The sail is as long as the distance — a week to the next island, a fortnight the length of a ${terms.reach}, months across open water and ${TRAVEL_MAX_DAYS} days corner to corner — and then ${MISSION_WORK_DAYS} days' work ashore before they report.`,
        ],
        [
          terms.parley,
          `Talking an island round: the mission for somewhere that has not chosen a side, or somewhere already yours that is cooling. Settled by the ${terms.parley} rating.`,
        ],
        [
          terms.incite,
          'The same trip to an island they hold, to turn its people against their governor. You do not win the place — you cost them their grip on it, and one pushed far enough rises on its own.',
        ],
        [
          'Espionage',
          'Going and looking. An enemy island tells you nothing from a distance; a spy who gets ashore and back brings a report of what stands there and who holds it, and it goes stale.',
        ],
        [
          terms.sabotage,
          'Burning what they have built. Dangerous, settled by Espionage, and the only way to take a works down without landing troops.',
        ],
        [
          'Research',
          'Shipwright work. Each grade reached opens better hulls at every shipyard you own and shortens the time they take to lay down.',
        ],
        [
          'Recruitment',
          `Keeping an open table at a loyal harbor of yours until somebody worth the articles signs on. Settled by Leadership, and the island's own allegiance is the other half of it.`,
        ],
        [
          'Command',
          `Putting a ${terms.crewOne} in the chair of an island or at the head of a squadron. They stay until relieved, and while they are there the place is harder to subvert and quicker to recover.`,
        ],
        [
          'Abduction',
          'Carrying one of theirs off a quay. What you get is a prisoner, not a corpse — and the same mission pointed the other way is a Rescue.',
        ],
        [
          terms.survey,
          'Charting an island nobody of yours has stood on. Until it is done the place can be sailed past and nothing else.',
        ],
      ],
    },
    {
      title: 'What people think',
      entries: [
        [
          terms.allegiance,
          `How much of an island's population is on your side, out of a hundred. Every point you win is a point the other side loses. It sets what the place earns you and whether it stays quiet.`,
        ],
        [
          'Unaligned',
          'An island that has not picked a side. There is no number at which it comes over: a meeting that goes well may end with it declaring for you, and the warmer it already is the likelier that is.',
        ],
        [
          'Standing',
          `What has lately been happening on an island, which makes the next mission there easier or harder. It builds with each success, runs out at ${MOMENTUM_CAP}, and fades if nobody keeps it up.`,
        ],
        [
          terms.mutiny,
          `An island can rise against you once its allegiance falls under ${UPRISING_SUPPORT} — not on any particular morning, and never while there are troops enough in the square. It earns nothing and builds nothing until allegiance climbs back to ${UPRISING_END_SUPPORT}.`,
        ],
        [
          'Smuggling',
          `On an island where your allegiance is under 50, some of the day's takings go to the enemy instead, and what stands there starts leaking to them. Every troop ashore takes ${Math.round(GARRISON_SMUGGLING_CUT * 100)}% off what the smugglers are running — a hand on the problem and never an answer to it, since ${Math.round(1 / GARRISON_SMUGGLING_CUT)} troops would close a harbor outright and nobody will ever keep ${Math.round(1 / GARRISON_SMUGGLING_CUT)} on one island.`,
        ],
        [
          // A headword is a bare noun, so it sorts where a reader looks for it:
          // "The watch" filed under T is a word nobody finds.
          'Watch',
          'How closely an island is being watched. Spies of theirs, a commander in the chair and loyal people all raise it, and everything covert has to get past it before it can even be attempted.',
        ],
        [
          'Word travels',
          `Most things move one island and no other. Big events — a defection, a rising, a landing, a town shelled — carry down the ${terms.reach} as well, falling off as they go, and one thing carries everywhere: shot that goes past the walls into the town.`,
        ],
      ],
    },
    {
      title: 'Money and building',
      entries: [
        [
          terms.gold,
          'The only currency. Buildings earn it, buildings cost it, and everything is bought with it.',
        ],
        [
          terms.upkeep,
          // The one place the fortnight is explained, and the reason the two
          // rings on the day badge need no label. Sean, 21 September: *"don't
          // really have to explain them — people will figure out what they
          // are, and the explanation can be in the upkeep glossary entry."*
          'What everything you own costs to keep. It is not charged daily: every fourteen days the books are settled, the game looks at what you have, and you pay for it — so a hull laid down the day after a settlement is free until the next one. The two rings around the date are the two clocks that matter: the inner one is the day turning, the outer one is how far through the fortnight you are. The figure at the top of the screen is what you make after upkeep.',
        ],
        [
          terms.space,
          'Berths to build on. Every building takes one and an island has only so many; troops and hulls take none.',
        ],
        [
          'Works',
          'What is built on an island. A building is raised on the island itself and takes no works to order it; a Shipyard lays down hulls and a Barracks raises troops, one job at a time each. Several of the same kind on one island work together — three Shipyards finish a hull in a third of the time, and one raised halfway through a job speeds up the job already running.',
        ],
        [
          'Craft',
          'Your shipwrights\' grade, raised by the Research mission. It opens better hulls and takes time off everything a shipyard lays down.',
        ],
      ],
    },
    {
      title: 'War',
      entries: [
        [
          terms.troop,
          'The ground unit. Troops hold what you have taken, storm what you have not, and are raised at a Barracks.',
        ],
        [
          terms.garrison,
          // The numbers are read off GARRISON_FOR_BAND rather than written
          // out, because this entry now carries the whole ladder and a
          // hand-typed ladder is four chances to disagree with the sim.
          `The troops standing on an island, and the first thing that decides who holds it: one is enough to hold any island against its own opinion, and an empty harbor goes to whoever turns up with one — which is why a capital never sends its last one away. They also keep the place quiet. A firm island asks for ${GARRISON_FOR_BAND.firm === 0 ? 'none' : GARRISON_FOR_BAND.firm}, a steady one ${GARRISON_FOR_BAND.steady}, a thin one ${GARRISON_FOR_BAND.thin}, and under that it rises; ${GARRISON_FOR_BAND.uprising} will face down a ${terms.mutiny.toLowerCase()} whatever the island thinks of you.`,
        ],
        [
          'Blockade',
          'Lying off an enemy harbor with a fleet. Nothing comes out and nothing it earns reaches them while you are there.',
        ],
        [
          'Bombardment',
          'Firing on an island from the water to bring its walls down. It either silences the harbor, knocks stones about without silencing it, or achieves nothing — and shot that goes past the walls into the town is the one thing the whole world hears about.',
        ],
        [
          // Sean named the two attack orders on 21 September — Bombardment and
          // Invasion — so the encyclopedia uses the word the order does.
          // Bombardment was already this entry's neighbour under that name;
          // this one was 'Landing', which is the act in prose and now the word
          // for it nowhere else.
          //
          // The rule in it was a day out of date on 22 September: this said
          // "none can be made while a Fortress still stands", which was true
          // until the 20th and then was not. `resolveLanding` says so in as
          // many words — "a standing fortress forbade the landing outright.
          // That gate is repealed" — and the walls swell the defender's die
          // instead. A reference page stating a repealed rule is worse than
          // one that says nothing, because a player plans around it.
          'Invasion',
          `Putting troops ashore to take an island. You may always land: what a wall does is fight you, not bar the door — a Fortress adds ${FORT_INVASION_DEFENSE.fort} to the defence and a Heavy Fortress ${FORT_INVASION_DEFENSE.heavy_fort}, on top of every troop standing there. That is what bombardment is for, and why it softens rather than unlocks. Troops aboard a fleet cost the same ${UPKEEP_PER_DAY.troop} a day and go down with the hull carrying them, which is what makes a loaded transport worth escorting and worth sinking. Taking a place is not the same as winning it: an island carried by storm is occupied and hostile.`,
        ],
        [
          'Long guns',
          `Heavy pieces that can reach a ship trying to break off. Fortresses have them; so do the hulls built to carry them, at about ${Math.round(LONG_GUN_SHARE * 100)}% of their weight of shot. They are the reason running away is not free.`,
        ],
        [
          'Drawn',
          'The third outcome, and a real one. Nobody was destroyed, nobody was driven off, and who holds that water is still unsettled. It is not a defeat with softer wording and does not cost you what one would.',
        ],
      ],
    },
  ];
}

/**
 * The anchor id a glossary row carries, from the word itself.
 *
 * One function rather than the same `replace` written in two places: the row
 * renders it and anything linking to a word computes it, so a link cannot
 * drift from its target.
 */
export function glossaryAnchor(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * Every headword in the glossary, lower-cased.
 *
 * Exported so a screen can ask *is this a word the glossary explains?* before
 * offering to open it — which is how the crew role tags decide whether to be
 * a link or plain text. A test walks the cast against this and fails if
 * somebody is given a role tag nothing defines.
 */
export function glossaryWords(): Set<string> {
  return new Set(groups().flatMap((g) => g.entries.map(([word]) => word.toLowerCase())));
}

export function GlossaryPage() {
  /*
   * A–Z inside each group, asked and answered on 17 September: *"should
   * glossary be in ABC order?"*
   *
   * Not as a whole — the filter box above already serves the player who knows
   * the word they want, and a flat A–Z would scatter Parley, Incitement and
   * Sabotage over six screens when they are the same kind of thing. But the
   * order *inside* a group had been the order the entries were written, which
   * is no order at all to scan by. Sorted here rather than in the source, so
   * adding an entry never means finding its place first.
   */
  const all = useMemo(
    () =>
      groups().map((g) =>
        g.keepOrder
          ? g
          : { ...g, entries: [...g.entries].sort(([a], [b]) => a.localeCompare(b)) },
      ),
    [],
  );
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? all
        .map((g) => ({
          ...g,
          entries: g.entries.filter(
            ([word, meaning]) =>
              word.toLowerCase().includes(needle) || meaning.toLowerCase().includes(needle),
          ),
        }))
        .filter((g) => g.entries.length > 0)
    : all;

  return (
    <>
      <input
        className="input"
        type="search"
        value={q}
        placeholder="Find a word"
        style={{ margin: '0 0 6px' }}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Find a word"
      />
      {shown.length === 0 && (
        <p className="muted small" style={{ marginTop: 14 }}>
          Nothing by that name.
        </p>
      )}
      {shown.map((group) => (
        <div key={group.title}>
          <div className="section-title">{group.title}</div>
          <dl className="glossary">
            {group.entries.map(([word, meaning]) => (
              <div key={word} className="glossary__row" id={`enc-${glossaryAnchor(word)}`}>
                <dt>{word}</dt>
                <dd>{meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </>
  );
}
