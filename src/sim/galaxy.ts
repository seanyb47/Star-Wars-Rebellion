import factionData from '../data/factions.json';
import characterRoster from '../data/characters.json';
import reachData from '../data/reaches.json';
import chartData from '../data/chart.json';
import { createRng, mixSeed, type Rng } from './rng';
import {
  CONNECTIVITY_MAX,
  CONNECTIVITY_MIN,
  PEOPLE_ALLEGIANCE,
  PIRATE_LORDS,
  RECRUIT_LAST_DAY,
  RECRUITS_AT_START,
  RECRUITS_IN_PLAY,
  rollRating,
  watchOf,
  CAPITAL_WALLS,
  CROWN_PRINCIPALS,
  RESEARCH_ROLES,
  HOME_PORT_WALLS,
  CAPITAL_GARRISON,
  START_GARRISON_MAX,
  START_GARRISON_SPARE,
  CORAL_REACH,
  CORALHOME,
  CORALHOME_GARRISON,
  CORALHOME_SUPPORT,
  DEPOSIT_CHANCE,
  DEPOSIT_MIX,
  DEPOSIT_TILT,
  CLEAR_BERTHS,
  NEUTRAL_WORKS,
  NEUTRAL_WORKS_ONE,
  NEUTRAL_WORKS_TWO,
  SETTLED_WORKED_MIN,
  SETTLED_WORKED_MAX,
  WORKS_ON,
} from './constants';
import { shipClass } from './constants';
import { creature, creatureFor } from './creatures';

import type {
  Character,
  Facility,
  FacilityType,
  Faction,
  GameState,
  PlayableFaction,
  Sector,
  System,
  IslandArchetype,
  ShipClassId,
  Deposit,
  ResourceType,
} from './types';
import { recomputeLedger } from './economy';
import { inProse, requiredGarrison, setSupport } from './helpers';

/**
 * What each Sea's islands look like.
 *
 * The first entry is what a settled island there tends to be; the rest are the
 * variety. An empty island is bare rock or ice whatever Sea it is in, because
 * nobody has built anything on it to look at.
 *
 * This is the one place the world's character becomes a picture: the Far Sea is
 * ice and bare crag, the Amber Sea is reef and jungle, the Bone Sea is drowned
 * temples and water the Tide has reached. Seeded from the island's own name, so
 * a given island looks the same in every game.
 */
const LOOKS: Record<string, IslandArchetype[]> = {
  // The Crown Sea's ports are the three flagged on the great island; the rest
  // of the Reach is the country around them.
  'The Crown Sea': ['jungle-isle', 'rock-isle'],
  'The Long Sea': ['port-city', 'jungle-isle', 'mining-isle'],
  'The Amber Sea': ['reef-isle', 'jungle-isle', 'port-city'],
  'The Far Sea': ['ice-isle', 'rock-isle', 'mining-isle'],
  'The Sea of Storms': ['storm-isle', 'jungle-isle', 'mining-isle'],
  'The Glass Sea': ['mining-isle', 'drowned-isle', 'rock-isle'],
  'The Bone Sea': ['drowned-isle', 'tide-isle', 'free-harbor'],
};
const BARE: Record<string, IslandArchetype> = {
  'The Far Sea': 'ice-isle',
  'The Bone Sea': 'tide-isle',
  'The Glass Sea': 'rock-isle',
};

function looksLike(sea: string, populated: boolean, port: boolean, pick: number): IslandArchetype {
  if (port) return 'port-city';
  if (!populated) return BARE[sea] ?? 'rock-isle';
  const set = LOOKS[sea] ?? ['jungle-isle', 'rock-isle'];
  return set[pick % set.length];
}

type ReachRole = 'home' | 'contested' | 'open' | 'frontier';
const roleOf = (reach: { role: string }) => reach.role as ReachRole;

const INNER_REACHES = reachData.reaches.filter((r) => r.tier === 'inner');
const OUTER_REACHES = reachData.reaches.filter((r) => r.tier === 'outer');
const CORE_SECTOR_COUNT = INNER_REACHES.length;
const RIM_SECTOR_COUNT = OUTER_REACHES.length;
/** How many islands a Reach holds is the Reach's own business now. The small
 *  map runs from seven to ten, set by how many clearly separated islands each
 *  one's painted cluster can actually carry — see scripts/chart_positions.py. */

/** Galaxy coordinate space is a square box; sectors sit on two concentric rings. */
export const GALAXY_SIZE = 1200;
/** Radius of the drawn sector disc. Rings are spaced so no two discs overlap. */
export const SECTOR_RING_RADIUS = 118;
const GALAXY_CENTER = GALAXY_SIZE / 2;
const CORE_RING_RADIUS = 230;
const RIM_RING_RADIUS = 460;
/** Systems scatter inside a disc of this radius around their sector centre. */
const SECTOR_RADIUS = 105;
const MIN_SYSTEM_SEPARATION = 38;

/**
 * The opening, Rebellion's shape (docs/opening.md).
 *
 * Every Reach has a role. The Crown's home Reach holds the seat and the three
 * port cities of the great island; the Crown opens with the seat, one of the
 * other two ports and one more island there, and the Confederacy with one or
 * two. Three contested Reaches open with two islands a side and the rest
 * settled and nobody's — garrisoned, so taking them is a landing, not a
 * stroll. Three frontier Reaches — Rime, Salt and Windward — start unexplored
 * by everyone, a quarter of their islands settled behind the fog, and
 * Freeport, where the Lords signed the articles, is one island in one of the
 * three.
 *
 * Which three has moved twice. Coral went out past the charts on 20 September
 * and came back in on 21st, at Sean's word, and Windward went out in its
 * place. It is the better trade in both directions: Coralhome is the founding
 * wound and the Confederacy's whole reason for existing, which is worth more
 * as ground you can sail to on day one than as a rumour behind fog, and the
 * Long Sea — outriggers, lashed timber, a reef with one channel through it
 * only locals know — reads like somewhere the Crown's charts stop rather than
 * somewhere its shipwrights live. The count is what the opening is balanced
 * on, so the two swapped rather than one moving.
 */
const START_CONTESTED_PER_SIDE = 2;
const START_HOME_CONFEDERACY: [number, number] = [1, 2];
const FRONTIER_SETTLED_CHANCE = 0.25;
/**
 * How many islands of the unexplored Reaches have something in the water.
 *
 * Only those Reaches, and only some of them. A creature everywhere is a
 * creature nowhere, and one you can read about before you have sailed anywhere
 * is scenery — the whole value of the thing is that the boats find it.
 *
 * A quarter, at Sean's word: "monsters should start small". They are not meant
 * to be a feature of the frontier, they are meant to be the thing you did not
 * expect out there — and later in the war they stop staying put, which is
 * worth more than there being lots of them to begin with (see stirBeasts).
 */
const FRONTIER_BEAST_CHANCE = 0.25;
/** The least room an island a side opens holding is allowed to have. Above it
 *  the roll runs to ROOM_MAX, so a starting island is 8 to 12 berths whatever
 *  the painting made of its coastline. */
const START_ROOM_MIN = 8;
/** Companies a settled island that is nobody's opens with, by how far out it is. */
const NEUTRAL_GARRISON: Record<ReachRole, [number, number]> = {
  home: [1, 3],
  contested: [1, 3],
  open: [1, 2],
  frontier: [2, 4],
};
/**
 * Earners per side. Nine islands a side now, each with a garrison to feed, so
 * more than the old six-and-four opening carried. Measured across seeds to
 * leave both sides a clear surplus on day one and free ground everywhere.
 *
 * The Crown's went up on 18 September, and only because its navy did. Two
 * squadrons instead of one is thirteen gold a day more in upkeep, and the
 * Crown's opening ledger had about five in it — so Sean's *"powerful fleet on
 * Highwater and a medium fleet on another inner reach"*, dropped in on its own,
 * opened the war at minus eight a day against a hundred and fifty in the bank.
 * Broke in nineteen days, before the player had done anything wrong.
 *
 * A vein and five more mills puts it back where it was and no further:
 * measured over three seeds, plus three to plus eight a day against the plus
 * five it averaged before the second squadron existed. The fleet is the
 * change; this is what the fleet costs.
 *
 * It is not the balance dial, which is worth knowing before anybody reaches
 * for it. Three mills either way — a whole point of surplus a day — moved
 * forty measured wars by one: Crown 23-14 at twenty-four mills, Crown 23-13 at
 * twenty-three. What moved the war was the second squadron.
 *
 * The gap to the Confederacy's twenty-odd a day is not new and is not this
 * change's to close. The Crown pays for Highwater's ancient walls and a seat's
 * garrison, which is real and which the Confederacy has no equivalent of.
 */
/**
 * The earners a side opens the war with.
 *
 * Almost all timber, and two veins apiece. A gold mine is worth four mills a
 * day now, so dealing out fifteen of them made the opening flush — 126 gold a
 * day against the old 63 — and a side that begins rich never has to make any
 * of the decisions the rest of the economy is about. Two is a prize to defend
 * and not a living.
 */
/**
 * How many earners each side *ends up with*, not how many it is handed.
 *
 * A side's opening islands are settled islands, so a third to two thirds of
 * their ground is already a mill or a mine before anybody deals anything —
 * and until 16 September those works flew nobody's colours and earned nobody
 * anything, so this list made up the whole opening income by itself. Now that
 * a dealt island comes with its works, dealing the same number on top of them
 * opened both sides twice as rich as they were tuned to be.
 *
 * So the deal fills a gap instead: whatever the ground is already working is
 * counted, and the difference is dealt. The opening is then the same size in
 * every world — which is what it has to be, because a world where the dice
 * left a side four mills short of its upkeep opens it insolvent.
 */
const START_EARNERS: Record<PlayableFaction, { mines: number; refineries: number }> = {
  empire: { mines: 3, refineries: 23 },
  alliance: { mines: 2, refineries: 17 },
};
/**
 * One of each maker, not two.
 *
 * Sean, 20 September: *"Let's start game with only 1 of each type of
 * construction facility instead of 2 each."* It had been two apiece since 14
 * September, which meant a side opened able to run two hulls, two companies
 * and two works at once and never had to choose which. One apiece makes the
 * second yard a decision rather than a fact — and it is the decision the
 * build-rate rule was written for, since a second slipway on the same island
 * halves the time on the hull already on the stocks.
 */
/**
 * Two barracks, and Sean reversed himself on it.
 *
 * On 20 September it was one of each maker — *"Let's start game with only 1 of
 * each type of construction facility instead of 2 each."* On the 21st, asked
 * what a side is meant to be able to *do* on day one: *"you get two barracks
 * and one shipyard in the game when you start... early on in the game you're
 * really just kind of training up a couple troops, deciding where you want to
 * put them, and you can start in on one ship."*
 *
 * Which is a better opening than either of the two before it, because the two
 * makers are not the same kind of thing. A troop is fast and a hull is slow,
 * so two barracks is two decisions a week and two slipways would be two
 * decisions a season. The second slipway stays a decision.
 */
const START_TRAINING = 2;
/**
 * And the Crown gets the second slipway, because the Crown is the navy.
 *
 * Sean: *"Maybe the Imperium starts with two shipyards. I mean, Imperium's
 * going to start with a head start."* It is a real head start and not a
 * cosmetic one, now that build time divides by how many yards stand on the
 * island: two slipways is a hull in half the days, for the whole war, on the
 * side whose hulls take longest.
 */
const START_SHIPYARDS: Record<PlayableFaction, number> = { empire: 2, alliance: 1 };
/**
 * The squadrons each side already has on the water, and where they lie.
 *
 * The board used to open with none at all, which meant the whole naval half of
 * the game was twenty-two days away — the time to build a slipway and then a
 * hull — and the first three weeks were a menu. Rebellion hands you a navy on
 * turn one and lets you find out what it is for.
 *
 * Sean's shape, 18 September: *"Imperium should start with a powerful fleet on
 * Highwater and a medium fleet on another inner reach. Confederacy fleet is its
 * Freeport only and it's medium sized. Should rival the medium fleet from
 * imperium."*
 *
 * Which is Rebellion's opening properly, and not only in weight. The Empire
 * begins with a navy in two places and a coastline to answer for; the Rebels
 * begin with one squadron in one harbor and nothing at all anywhere else. The
 * asymmetry is not that the Crown's hulls are better — it is that the Crown has
 * to be in two seas at once and the Confederacy does not. Sending the Home
 * Fleet out to hunt is a decision with a cost now, because the second squadron
 * is the only other thing on the water.
 *
 * The two mediums are deliberately matched and deliberately different: the
 * Crown's is two heavy frigates and a scout, the Confederacy's is a pack of
 * sloops around one bulk cruiser. Near enough the same weight of shot, and a
 * quite different thing to fight.
 */
interface StartSquadron {
  name: string;
  ships: ShipClassId[];
  /** Companies aboard, ready to take somewhere. */
  troops: number;
  /** Where she lies: the side's seat, or a holding out in a contested Reach. */
  berth: 'seat' | 'forward';
}
const START_FLEETS: Record<PlayableFaction, StartSquadron[]> = {
  empire: [
    // At Highwater: the ship of the line and two sloops.
    //
    // Sean, 23 September: *"Cut the starting wayfinder from fleet 1. Fleet
    // should be sovereign + interceptor x2. Fleet 2 should be a Morningstar +
    // Wayfinder."* It was a Sovereign, a Morningstar, one Interceptor and a
    // Wayfinder; the two-decker moves to the forward squadron and the survey
    // ship goes with it, which leaves the Crown's heavy fleet heavy and
    // nothing else. The Home Fleet cannot chart on its own any more — the
    // Wayfinder is the thing that finds the dark Reaches, and it is out at
    // the sharp end now, where finding things is what it is for.
    {
      name: 'Home Fleet',
      ships: ['sovereign', 'interceptor-i', 'interceptor-i'],
      troops: 2,
      berth: 'seat',
    },
    // And a small one forward, in a Reach the Crown does not own outright:
    // the two-decker and the survey ship, and nothing else. It cannot fight
    // the Confederate Home Fleet and is not meant to — it carries two
    // companies, it can take a lightly-held island, and it is the eyes.
    {
      name: 'Windward Squadron',
      ships: ['morningstar', 'wayfinder'],
      troops: 2,
      berth: 'forward',
    },
  ],
  alliance: [
    // Freeport, and nowhere else.
    //
    // Sean's shape of 18 September holds — *"Confederacy fleet is its
    // Freeport only and it's medium sized. Should rival the medium fleet
    // from imperium."* — and on the canonical roster it is three Chimeras,
    // a Tidestalker, the Brigantine and one Swift. Sean, 20 September: *"For
    // confederacy 1 swift is all the swifts you need."*
    //
    // "Rival" is now a measured thing rather than a gun count, and it had to
    // be: the per-cannon engine makes a fleet action close to deterministic,
    // so two fleets are either even or they are 100-0, with very little in
    // between. Measured over 150 seeds: this beats the Windward Squadron 51
    // times in a hundred and loses to it 49, which is as even as the engine
    // gets. Two Chimeras instead of three loses every single time — the
    // Morningstar's armor of 24 is a wall that only the Chimera's six Heavy
    // guns get through, and below a certain number of them the Confederacy
    // cannot kill it before it kills them.
    //
    // Against the Home Fleet it loses a hundred times in a hundred, which is
    // the other half of the rule and always was.
    {
      name: 'Home Fleet',
      ships: ['chimera', 'chimera', 'chimera', 'tidestalker', 'brigantine', 'swift'],
      troops: 2,
      berth: 'seat',
    },
  ],
};

/**
 * The garrison an island opens with: what its allegiance needs, plus a
 * margin, capped. Read off the same rule the uprising check uses, so the
 * opening is consistent with the game that follows — a sullen holding starts
 * with the companies that are actually keeping it, not a token two.
 */
function startGarrison(support: number, capital: boolean): number {
  const needed = requiredGarrison(support) + START_GARRISON_SPARE + (capital ? 1 : 0);
  return Math.min(START_GARRISON_MAX, Math.max(1, needed));
}
/**
 * Who is in the war on day one.
 *
 * Sean's numbers, 15 September: four for the Crown, five for the Confederacy —
 * its three Lords and two others. It had been the whole roster, seven a side,
 * which made the opening cast the same cast every game and left nothing for
 * recruiting to be *for*.
 *
 * The three Lords are not optional and never drawn: they are the Confederacy's
 * losing condition and three of its hulls at once, so a war missing one is a
 * different game rather than a varied one. Everyone else on both sides is
 * drawn, which is where the variety goes now that the principals' ratings are
 * fixed — you always know exactly what Hale is worth, and not whether you have
 * her.
 */
/*
 * Tried and cut, 22 September: **six and seven**, on the grounds that the bags
 * had just grown to fourteen and eleven and any one officer was down to about
 * a war in six — Blackwater, whose reveal is that he is Corwin Calloway, in
 * 20% of them.
 *
 * Measured over the same 24 wars as the four-and-five baseline, both sides
 * played: **Crown 9 — Confederacy 14, one war unfinished**, against 11 — 13
 * and none unfinished. A wider opening bench is worth more to the Confederacy
 * than to the Crown, and the reason is legible once it is on the page: the
 * extra hands are spec ops and abductions before they are anything else, and
 * the Confederacy wins by taking people. So the seen-cast problem is real and
 * this is not the fix for it; the fix, if Sean wants one, is which officers
 * are bound rather than how many are drawn.
 */
export const START_CHARACTERS: Record<PlayableFaction, number> = { empire: 4, alliance: 5 };

function openingCast(faction: PlayableFaction, rng: Rng) {
  const roster = characterRoster[faction];
  // Who is in every war on this side: the three Lords for the Confederacy, the
  // Regent and Blackwater for the Crown. Knowing your cast is knowledge worth
  // having, and it only is if the cast is actually there — and since 21
  // September all five of them are victory conditions, which makes it a rule
  // rather than a courtesy. A war that can be won by default because somebody
  // was never dealt is not a war.
  const bound = roster.filter(
    (e) => PIRATE_LORDS.some((l) => l.name === e.name) || CROWN_PRINCIPALS.includes(e.name),
  );
  const rest = roster.filter((e) => !bound.includes(e));
  const want = Math.max(0, START_CHARACTERS[faction] - bound.length);
  /*
   * One of the drawn can research, guaranteed.
   *
   * Sean, 23 September: *"Only a small number of units should be able to
   * research. Like 4 max in game."* Nine of the forty carry a research role
   * and none of the bound five do, so a straight draw of two left **54% of
   * sides with nobody who could research at all** — measured over 300 worlds
   * before this line went in. A side that cannot research never builds a
   * better hull, never raises a research troop and never puts up a Heavy
   * Fortress, for the whole war, because of the shuffle.
   *
   * That is not a small number, it is a coin flip on whether a third of the
   * game exists. So the first seat goes to somebody who can, and the rest are
   * drawn as before: one on day one, two when the draw is kind, and four once
   * the recruits have had a war to arrive in. Which is the number he asked
   * for, and it is a ceiling rather than a lottery.
   */
  const bag = rng.shuffle(rest);
  const scholar = bag.find((e) => (e.roles ?? []).some((r) => RESEARCH_ROLES.includes(r as never)));
  const drawn =
    want > 0 && scholar
      ? [scholar, ...bag.filter((e) => e !== scholar)].slice(0, want)
      : bag.slice(0, want);
  const taken = new Set([...bound, ...drawn].map((e) => e.name));
  // Back into the bible's order afterwards, so the crew list reads as a roster
  // and not as the order they happened to come out of the bag.
  return roster.filter((e) => taken.has(e.name));
}
/**
 * Enough to set every works you own to work on the first morning.
 *
 * Sean, 17 September: *"I should have enough starting gold to build in each of
 * my available facilities... early game, shouldn't be terribly constrained by
 * gold."* At 150 it was: measured across eight worlds, giving each opening
 * works even its *cheapest* legal job costs 140 to 220, so a Crown opening in
 * the wrong seed could not fill its own yards on day one, and a player's first
 * decision was which of their buildings to leave idle. That is the wrong first
 * decision. Sean's list of what early game should be waiting on is explicit —
 * things building, officers finishing errands, islands coming over — and coin
 * is on none of it.
 *
 * 450 is measured rather than picked: a *middling* job in every works costs
 * 420 to 440 across the same eight worlds. So the opening covers a real job
 * everywhere with a little to spare, and still does not cover the dearest job
 * everywhere (650), which is where the choosing starts.
 */
export const START_GOLD = 450;

/** Scatter points inside the sector disc, rejecting anything too close. */
function scatterSystems(rng: Rng, count: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  while (points.length < count) {
    let placed = false;
    for (let attempt = 0; attempt < 60 && !placed; attempt++) {
      const angle = rng.next() * Math.PI * 2;
      const radius = Math.sqrt(rng.next()) * SECTOR_RADIUS;
      const p = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      const clash = points.some(
        (q) => Math.hypot(q.x - p.x, q.y - p.y) < MIN_SYSTEM_SEPARATION,
      );
      if (!clash) {
        points.push(p);
        placed = true;
      }
    }
    if (!placed) {
      // Fall back to a ring position so generation always terminates.
      const angle = (points.length / count) * Math.PI * 2;
      points.push({
        x: Math.cos(angle) * SECTOR_RADIUS,
        y: Math.sin(angle) * SECTOR_RADIUS,
      });
    }
  }
  return points;
}

/**
 * `owner` is a `Faction` rather than a side, because an unaligned island's own
 * works belong to the unaligned island. They change hands with it the day
 * somebody wins it over.
 */
function makeFacility(id: string, type: FacilityType, owner: Faction): Facility {
  return { id, type, owner };
}

/**
 * Build a fresh archipelago: seven Reaches, one for each Sea, three inner and
 * four outer, holding sixty-three islands between them.
 *
 * It used to be ten Reaches of ten. The cut is not a simplification for its own
 * sake — the chart is a painting now, and three of the ten sat on clusters the
 * painting could not chart clearly: two crowded against a neighbour and one
 * drawn on islets too small to hit. Each of the three shared a Sea with a Reach
 * that survives, so nothing about the world is lost; they are held back for the
 * larger maps beside Scrap Reach, exactly as the bible already holds that one.
 *
 * A Sea and a Reach are therefore the same thing at this size, which is why the
 * chart can name the Seas and the panels can name the Reaches without either
 * one lying.
 */
/**
 * How much of the chart around each island's mark is painted land, 0 to 1,
 * measured by scripts/chart_positions.py. Room follows the look of the chart:
 * a rock in open water has nowhere to build, a harbor with the great island
 * at its back has room for a city.
 */
const LAND_ON_THE_CHART = new Map<string, number>(
  chartData.reaches.flatMap((r) => r.islands.map((i) => [i.name, i.land] as const)),
);

/** The most an island can hold. */
export const ROOM_MAX = 12;
/** The least: a rock with a jetty and room to put something on it. Sean
 *  raised this from three on 15 September — a three-berth island was a place
 *  you built one thing on and never opened again. */
export const ROOM_MIN = 4;
/**
 * The length every room bar is drawn against, so that a bar is a quantity
 * and not a ratio: twelve berths fills it, six fills half of it, and three
 * fills a quarter. Thirteen because the three port cities on the great
 * island get the flagged port's extra berth on top of the chart's twelve.
 */
export const ROOM_TRACK = ROOM_MAX + 1;

/**
 * An island's room, from the land around its mark. Square-rooted so a
 * quarter-land coast is not a quarter of a city: 4 on a bare rock, 6 or 7
 * on an ordinary island, 12 where the great island fills the frame.
 */
/**
 * What is under an island, plot by plot.
 *
 * Sean's math of 20 September: every plot of available land has a **40%
 * chance** of carrying something, and what it carries is 60% timber, 30%
 * silver, 10% gold — see `DEPOSIT_CHANCE` and `DEPOSIT_MIX` for why one roll
 * per plot is a better model than three shares over the island.
 *
 * In Coral Reach the timber is living coral instead, which is his rule and
 * also the only one that makes sense: an atoll ring has no forest on it.
 */
function groundOf(
  rng: Rng,
  archetype: IslandArchetype,
  slots: number,
  makeId: (prefix: string) => string,
  /**
   * A place people live has something worth working.
   *
   * A roll per plot can come up empty on a small island — that is the model
   * working, not failing — but a settled island with nothing under it is an
   * island you can parley for and get a garrison and no reason.
   */
  populated = false,
  /** Coral Reach, where the timber is living coral. */
  reef = false,
): Deposit[] {
  // The mix this island's look asks for, normalised back to one so the tilt
  // can never change how often a plot carries anything — only what.
  const tilt = DEPOSIT_TILT[archetype] ?? {};
  const kinds = ['forest', 'silver', 'gold'] as const;
  const weights = kinds.map((k) => DEPOSIT_MIX[k] * (tilt[k] ?? 1));
  const total = weights.reduce((a, b) => a + b, 0);
  const staple: ResourceType = reef ? 'coral' : 'forest';

  const pick = (): ResourceType => {
    let n = rng.next() * total;
    for (let i = 0; i < kinds.length; i += 1) {
      n -= weights[i];
      if (n <= 0) return kinds[i] === 'forest' ? staple : kinds[i];
    }
    return staple;
  };

  const out: Deposit[] = [];
  for (let plot = 0; plot < slots; plot += 1) {
    if (rng.next() >= DEPOSIT_CHANCE) continue;
    out.push({ id: makeId('dep'), type: pick() });
  }
  if (populated && out.length === 0) out.push({ id: makeId('dep'), type: staple });

  // One berth kept clear whatever the roll, so an island can always put a
  // yard down and work what it has. Richest first if anything has to go,
  // though at two fifths density it almost never does.
  const room = Math.max(0, slots - CLEAR_BERTHS);
  if (out.length <= room) return out;
  const byWorth = (type: ResourceType) => out.filter((d) => d.type === type);
  return [...byWorth('gold'), ...byWorth('silver'), ...byWorth(staple)].slice(0, room);
}

/**
 * A settled island's ground, part of it already worked.
 *
 * The two sides' own islands are dealt their opening works by `seedHoldings`
 * and are skipped here; this is for everywhere else that has people on it —
 * the unaligned islands, which used to open as bare ground with a population
 * on it and nothing else. Courting one now brings in a working island rather
 * than an empty one, which is what a settled island ought to be worth.
 */
/** The works that belongs on each kind of ground — the inverse of `WORKS_ON`. */
const WORKS_FOR: Record<ResourceType, FacilityType> = {
  forest: 'refinery',
  coral: 'coral_kiln',
  silver: 'silver_mine',
  gold: 'mine',
};

function workTheGround(
  system: System,
  rng: Rng,
  makeId: (prefix: string) => string,
): void {
  const ground = system.deposits ?? [];
  if (ground.length === 0) return;
  const share = SETTLED_WORKED_MIN + rng.next() * (SETTLED_WORKED_MAX - SETTLED_WORKED_MIN);
  // At least one, never all: a settled island is working and unfinished.
  //
  // Except on an island that rolled a single deposit, where the two halves of
  // that rule cannot both hold and "at least one" is the half worth keeping.
  // It used to fall the other way and leave the island bare, which read as an
  // unsettled rock with people on it; it only ever showed up on four islands
  // in forty worlds, so the test that says no settled island is bare had been
  // passing on the luck of the draw rather than on the rule.
  const take =
    ground.length === 1
      ? 1
      : Math.min(ground.length - 1, Math.max(1, Math.round(ground.length * share)));
  if (take < 1) return;
  const worked = ground.slice(0, take);
  system.deposits = ground.slice(take);
  for (const deposit of worked) {
    system.facilities.push(
      makeFacility(makeId('fac'), WORKS_FOR[deposit.type], system.control),
    );
  }
}

/**
 * And what a settled island nobody owns has built for itself.
 *
 * Sean, 20 September: *"Neutral islands also should have infrastructure.
 * Should have a 20% chance of having 1 of each starting (non research
 * dependent) structure, including fortress (standard not heavy) and a 5%
 * chance of having 2."*
 *
 * `workTheGround` above already gives an unaligned island the mines and mills
 * its own ground will carry; this is everything a yard can raise anywhere —
 * the two building yards, the slipway, and the wall. Which makes courting an
 * island a different proposition from settling an empty one: a parley can
 * bring in a working town with a slipway already on it, and a landing on an
 * island that rolled a Fortress has to knock the Fortress down first.
 *
 * The four rolls come off a stream of this island's own rather than the
 * world's generator. That is the same device the island rename needed on 19
 * September and it is here for the same reason: four extra draws per settled
 * island taken from the shared stream would have re-rolled every terrain,
 * deposit, creature and garrison downstream of them, so a change that is
 * supposed to add a slipway would silently have dealt everybody a different
 * world. This way the only difference between a world before this change and
 * after it is the works.
 *
 * The stream is keyed on the island *and* the world. Keyed on the island
 * alone — which is what the first cut did, since the per-island seed is
 * frozen — every world gave the Terraces the same shipyard, because there are
 * only sixty-one islands and a frozen seed apiece. It measured as a rate that
 * would not settle no matter how many worlds were sampled, which is what
 * sixty-one answers counted over and over looks like.
 *
 * Every roll is taken whether or not there is room for what it wins, so the
 * stream is a fact about the island rather than about how much of its ground
 * happened to be spoken for.
 */
function settleWorks(
  system: System,
  world: number,
  makeId: (prefix: string) => string,
): void {
  const island = system.seed ?? [...system.name].reduce((n, c) => n + c.charCodeAt(0), 0);
  const rng = createRng(mixSeed(Math.imul(island, 0x9e37_79b1) ^ mixSeed(world)));
  // And warmed, for the reason `mixSeed` gives: the first draws off a fresh
  // stream are the ones most like its neighbours'.
  rng.next();
  rng.next();
  const wanted = NEUTRAL_WORKS.map((type) => {
    const roll = rng.next();
    if (roll < NEUTRAL_WORKS_TWO) return { type, count: 2 };
    if (roll < NEUTRAL_WORKS_TWO + NEUTRAL_WORKS_ONE) return { type, count: 1 };
    return { type, count: 0 };
  });
  for (const { type, count } of wanted) {
    for (let i = 0; i < count; i++) {
      const taken = system.facilities.length + (system.deposits?.length ?? 0);
      // The ground the works is standing on, plus the clear berth every
      // island keeps.
      //
      // Measured before this line went in, the odds came out at nine to
      // twelve per cent instead of Sean's twenty-five: a settled island is
      // already carrying its deposits and the mills on them, so on most of
      // them the roll was won and then thrown away for want of a plot. The
      // opening deal makes the same allowance for the two sides' own islands
      // and for the same reason — an island that has built a slipway for
      // itself has the ground the slipway stands on.
      system.slots = Math.max(system.slots, taken + 1 + CLEAR_BERTHS);
      system.facilities.push(makeFacility(makeId('fac'), type, system.control));
    }
  }
}

export function roomFor(name: string): number {
  const land = LAND_ON_THE_CHART.get(name) ?? 0.2;
  return Math.max(ROOM_MIN, Math.min(ROOM_MAX, Math.round(1 + 11 * Math.sqrt(land))));
}

export function generateGalaxy(seed: number, player: PlayableFaction = 'empire'): GameState {
  const rng = createRng(seed);

  const sectors: Sector[] = [];
  /*
   * A stream of its own for the Reaches' political temperaments.
   *
   * Drawn from the same seed and therefore just as reproducible, but kept off
   * the main worldgen stream on purpose: taking seven draws out of `rng` in
   * the middle of laying out the map moved every island, deposit and garrison
   * rolled after them, and a world is a thing players share by its number. A
   * feature added on Tuesday should not reshuffle Monday's world.
   */
  const politics = createRng(seed * 31 + 7);
  const systems: System[] = [];
  let idCounter = 0;
  const makeId = (prefix: string) => `${prefix}-${++idCounter}`;

  const reaches = [...INNER_REACHES, ...OUTER_REACHES];

  for (let s = 0; s < reaches.length; s++) {
    const reach = reaches[s];
    const isCoreSector = reach.tier === 'inner';
    const indexInRing = isCoreSector ? s : s - CORE_SECTOR_COUNT;
    const ringCount = isCoreSector ? CORE_SECTOR_COUNT : RIM_SECTOR_COUNT;
    const radius = isCoreSector ? CORE_RING_RADIUS : RIM_RING_RADIUS;
    // Offset the core ring by half a step so core and rim clusters interleave.
    const angle =
      (indexInRing / ringCount) * Math.PI * 2 + (isCoreSector ? Math.PI / ringCount : 0);

    const sector: Sector = {
      id: makeId('sec'),
      name: reach.name,
      sea: reach.sea,
      systemIds: [],
      x: GALAXY_CENTER + Math.cos(angle) * radius,
      y: GALAXY_CENTER + Math.sin(angle) * radius,
    };

    // Islands take the positions in the order the bible lists them, so a
    // named island always sits in its own Reach.
    const count = reach.islands.length;
    const points = scatterSystems(rng, count);
    for (let i = 0; i < count; i++) {
      const island = reach.islands[i];
      const role = roleOf(reach);
      // Frontier islands are settled a quarter of the time, and nobody knows
      // which until somebody lands. Everywhere else is settled and charted.
      const populated = role === 'frontier' ? rng.chance(FRONTIER_SETTLED_CHANCE) : true;
      const charted = role !== 'frontier';
      const port = 'port' in island && Boolean(island.port);
      const system: System = {
        id: makeId('sys'),
        name: island.name,
        note: 'note' in island ? (island.note as string) : undefined,
        sectorId: sector.id,
        x: points[i].x,
        y: points[i].y,
        explored: { empire: charted, alliance: charted },
        seed: island.seed,
        archetype: looksLike(
          sector.sea,
          populated,
          port,
          // The island's own frozen seed, so it looks the same in every game
          // and goes on looking the same through a rename. See System.seed.
          island.seed,
        ),
        populated,
        isCore: isCoreSector,
        control: 'none',
        support: { empire: 0, alliance: 0 },
        // Room follows the painting, not the dice: the same island has the
        // same room in every game. A port keeps one berth more.
        slots: roomFor(island.name) + (port ? 1 : 0),
        facilities: [],
        deposits: [],
        garrison: 0,
        uprising: false,
        blockaded: false,
        beastSeen: { empire: false, alliance: false },
      };
      // What is under it. Before anything is placed, because the starting
      // works are put *on* deposits rather than beside them.
      system.deposits = groundOf(
        rng,
        system.archetype,
        system.slots,
        makeId,
        populated,
        // Sean's bracket: the staple is living coral in the one Reach that is
        // an atoll ring, and timber everywhere else.
        sector.name === CORAL_REACH,
      );
      // Something in the water, and only out where nobody has been. The roll
      // is taken for every frontier island so the RNG stream does not depend
      // on what the archetype happened to be.
      if (role === 'frontier' && rng.chance(FRONTIER_BEAST_CHANCE)) {
        system.beast = creatureFor(system)?.slug;
      }
      if (populated) {
        // Any inhabited island that has not picked a side is neutral, and can
        // be courted. The home and contested Reaches are closer to the war and
        // more polarised than the settlements out on the open sea and beyond.
        system.control = 'neutral';
        // Which way it leans, and how far. Near the war an island has heard
        // the arguments and has opinions; out on the open sea and beyond it
        // is barely off level. Never far enough to come over on its own.
        setSupport(
          system,
          'empire',
          role === 'home' || role === 'contested' ? rng.range(40, 60) : rng.range(45, 55),
        );
        // Settled and nobody's means somebody is holding it. A landing has to
        // beat these companies; a parley has to win them over.
        const [lo, hi] = NEUTRAL_GARRISON[role];
        system.garrison = rng.range(lo, hi);
        // And part of its ground already worked, which is what makes it a
        // settled island rather than a populated rock. The two sides' own
        // holdings are dealt theirs below and are not touched here.
        workTheGround(system, rng, makeId);
        system.slots = Math.max(
          system.slots,
          system.facilities.length + (system.deposits?.length ?? 0),
        );
      }
      sector.systemIds.push(system.id);
      systems.push(system);
    }
    sectors.push(sector);
  }

  /*
   * And how much each chain talks to itself.
   *
   * Sean's propagation memo, §9: *"this gives different parts of the world
   * distinct political personalities."* Rolled once, never touched again, so
   * it is a fact about the world a player can learn — a Reach where one
   * defection is felt down the whole chain is worth a diplomat that a Reach of
   * nine strangers is not.
   */
  for (const sector of sectors) {
    sector.connectivity =
      CONNECTIVITY_MIN + politics.next() * (CONNECTIVITY_MAX - CONNECTIVITY_MIN);
  }

  const byId = new Map(systems.map((s) => [s.id, s] as const));
  const reachOf = (sector: Sector) => reaches.find((r) => r.name === sector.name)!;
  const islandsOf = (sector: Sector) => sector.systemIds.map((id) => byId.get(id)!);
  const homeSector = sectors.find((sec) => roleOf(reachOf(sec)) === 'home')!;
  const contestedSectors = sectors.filter((sec) => roleOf(reachOf(sec)) === 'contested');
  const frontierSectors = sectors.filter((sec) => roleOf(reachOf(sec)) === 'frontier');

  // Allegiance is a balance: an island's regard for its holder is the only
  // number an opening needs to state, and the other side has the rest.
  const hold = (system: System, owner: PlayableFaction, support: number) => {
    system.control = owner;
    system.populated = true;
    setSupport(system, owner, support);
    // And what already stands here comes with it.
    //
    // A settled island has some of its ground worked before anybody deals it
    // to a side, and those works were being left flying nobody's colours — so
    // both capitals opened with three mills that earned their holder nothing
    // and sat on the board as a second, greyed-out group of the same building.
    // Taking an island in play has always meant taking what is on it; the
    // opening has to mean the same thing.
    //
    // Written out rather than calling `handOver`, which now needs the state to
    // put a half-built works's ground back — and the state does not exist yet
    // when the opening is dealt. Nothing is half-built at the opening either,
    // so the two halves of `handOver` that matter here are the two below.
    system.facilities = system.facilities.map((facility) => ({ ...facility, owner }));
  };
  const loyal = () => rng.range(65, 85);

  // --- The Crown's seat: Highwater, the port city the world bible marks. ---
  const capital =
    systems.find((system) => system.name === factionData.empire.capitalIslandName) ??
    byId.get(homeSector.systemIds[0])!;
  hold(capital, 'empire', 100);

  // --- Home Reach: the seat, one of the other two ports, one more island. ---
  const empireSystems: System[] = [capital];
  const homeIslands = islandsOf(homeSector).filter((s) => s.id !== capital.id);
  const flaggedPorts = new Set(
    reachOf(homeSector)
      .islands.filter((i) => 'port' in i && Boolean(i.port))
      .map((i) => i.name),
  );
  const otherPorts = homeIslands.filter((s) => flaggedPorts.has(s.name));
  const secondPort = rng.pick(otherPorts.length > 0 ? otherPorts : homeIslands);
  hold(secondPort, 'empire', loyal());
  empireSystems.push(secondPort);
  const third = rng.pick(homeIslands.filter((s) => s.id !== secondPort.id));
  // Held, not loved: allegiance in the thirties and forties, above the
  // uprising line and under the garrison's boot. The island the Confederacy
  // will come for first, which is the point.
  hold(third, 'empire', rng.range(32, 45));
  empireSystems.push(third);

  // The Confederacy has a foothold in the Crown's own Reach: one island, or
  // two — never on the great island itself. Its three ports are the Crown's
  // ground whoever holds them at the start; the rebels begin on an outlying
  // island of the chain.
  const allianceSystems: System[] = [];
  const homeLeft = rng.shuffle(
    homeIslands.filter((s) => s.control === 'neutral' && !flaggedPorts.has(s.name)),
  );
  for (const system of homeLeft.slice(0, rng.range(...START_HOME_CONFEDERACY))) {
    hold(system, 'alliance', loyal());
    allianceSystems.push(system);
  }

  // --- Contested Reaches: two islands a side, the rest nobody's. ---
  //
  // Coralhome is never in the deal. It is handed to the Crown by name further
  // down, and was safe from this loop only while its Reach was frontier — the
  // day Coral came inside the charts, the shuffle could deal the founding
  // wound to the Confederacy and then have it taken back by the block below,
  // leaving the island Crown-held but standing in `allianceSystems`, where the
  // opening puts Confederate crew and counts Confederate holdings.
  for (const sector of contestedSectors) {
    const picks = rng
      .shuffle(islandsOf(sector).filter((s) => s.name !== CORALHOME))
      .slice(0, START_CONTESTED_PER_SIDE * 2);
    for (const [index, system] of picks.entries()) {
      const owner: PlayableFaction = index < START_CONTESTED_PER_SIDE ? 'empire' : 'alliance';
      hold(system, owner, loyal());
      (owner === 'empire' ? empireSystems : allianceSystems).push(system);
    }
  }

  // --- Freeport: where the articles were signed. ---
  //
  // Still not a base: losing it loses nothing, because the Crown wins by
  // taking the three Lords and nothing else. But it is the island the
  // Confederacy was declared on, and it answers to the Confederacy the way
  // Highwater answers to the Crown — a hundred to nothing on day one, by
  // Sean's rule of 15 September. It could not have been left merely fond of
  // them: anything over eighty runs up a neutral island's colours on the next
  // tick, so a warm Freeport would have flipped on day one anyway and
  // announced it in the log as news. It is a different island every game —
  // one out in the unexplored Reaches takes the name, keeping the position,
  // the outline and the room the painting gave it.
  const baseSector = rng.pick(frontierSectors);
  const allianceHq = rng.pick(islandsOf(baseSector));
  allianceHq.chartName = allianceHq.name;
  allianceHq.name = 'Freeport';
  allianceHq.archetype = 'free-harbor';
  allianceHq.note =
    'Where the articles were signed: three Lords, one table, and no Crown within three hundred miles.';
  hold(allianceHq, 'alliance', 100);
  // A seat's garrison, the same as Highwater's: firm islands ask for none at
  // all, so both of these are the spare company that keeps the harbor plus
  // the one a seat is worth. It is still dealt none of the opening's camps or
  // mills — the articles were signed on it a week ago, not settled on — but
  // since 20 September it is dealt a construction yard, by name, like
  // Highwater: a seat that cannot build on day one is a bad first screen.
  allianceHq.garrison = startGarrison(100, true);
  // A seat gets a seat's room, like every other island a side opens holding.
  allianceHq.slots = Math.max(allianceHq.slots, rng.range(START_ROOM_MIN, ROOM_MAX));

  /**
   * `seat` is the side's capital, and it is handed the first construction
   * yard by name rather than taking its chances in the deal. For the Crown
   * that is `owned[0]`; for the Confederacy it is Freeport, which is not in
   * `owned` at all — it is dealt none of the opening's camps or mills, because
   * the articles were signed on it a week ago rather than settled on. A yard
   * is the one exception now, so the side can build where it stands.
   */
  const seedHoldings = (owner: PlayableFaction, owned: System[], seat: System) => {
    for (const [index, system] of owned.entries()) {
      // Room is the painting's to give, not the opening's: a starting island
      // keeps the ground the chart shows it. The deal below only ever widens
      // an island by the one spare slot that lets it build on day one.
      system.garrison = startGarrison(system.support[owner], owner === 'empire' && index === 0);
      system.explored[owner] = true;
      // Sean's rule, 15 September: an island you open the war holding has
      // room to make something of. The chart still decides every other
      // island, and it still decides this one where it was already more
      // generous — a port city does not shrink to twelve because the dice
      // said so.
      system.slots = Math.max(system.slots, rng.range(START_ROOM_MIN, ROOM_MAX));
    }
    // What the side's ground is already working, which counts against the
    // target rather than adding to it.
    const already = (type: FacilityType) =>
      owned.reduce((n, s) => n + s.facilities.filter((f) => f.type === type).length, 0);
    const short = (type: FacilityType, want: number) => Math.max(0, want - already(type));
    const plan: FacilityType[] = [
      ...Array<FacilityType>(short('mine', START_EARNERS[owner].mines)).fill('mine'),
      ...Array<FacilityType>(short('refinery', START_EARNERS[owner].refineries)).fill('refinery'),
      ...Array<FacilityType>(START_TRAINING).fill('training_facility'),
      ...Array<FacilityType>(START_SHIPYARDS[owner]).fill('shipyard'),
    ];
    // Sean's rule, 14 September: two of each maker a side, dealt at random
    // across the side's starting islands — doubling up on one island is
    // fine. Earners still go round the table.
    /** Make sure an island has a spare berth for a works that stands on no deposit. */
    const clearBerth = (system: System) => {
      system.slots = Math.max(
        system.slots,
        system.facilities.length + (system.deposits?.length ?? 0) + 1,
      );
    };
    // The seat used to be given a construction yard here, by name and before
    // anything else, because nothing could be built on an island without one.
    // The yard is cut, so the seat is no longer a special case.
    for (const [index, type] of plan.entries()) {
      const maker = type === 'training_facility' || type === 'shipyard';
      // An earner goes where the ground will carry it. A mill wants a forest
      // and a mine wants a vein, and the island that has one takes the works
      // — going round the table only among the islands that can hold it.
      const want = WORKS_ON[type];
      const able = want ? owned.filter((s) => (s.deposits ?? []).some((d) => d.type === want)) : owned;
      const system = maker
        ? rng.pick(owned)
        : able.length > 0
          ? able[index % able.length]
          : owned[index % owned.length];
      // The works stands on the deposit and takes its berth, so the island
      // needs no extra room for it. Where the side rolled no ground of that
      // kind at all, the war still opens with what it is meant to open with
      // and the island is given the deposit to stand it on.
      if (want) {
        const held = system.deposits ?? [];
        const at = held.findIndex((d) => d.type === want);
        if (at >= 0) held.splice(at, 1);
        else clearBerth(system);
        system.deposits = held;
      } else {
        clearBerth(system);
      }
      system.facilities.push(makeFacility(makeId('fac'), type, owner));
    }
    // One spare berth on every starting island. An opening with no room left
    // is a worse opening than a thin surplus, because the answer to a thin
    // surplus is to build.
    for (const system of [...owned, seat]) clearBerth(system);
  };
  seedHoldings('empire', empireSystems, capital);
  seedHoldings('alliance', allianceSystems, allianceHq);

  // And what the islands nobody took have built for themselves.
  //
  // After the deal, not during it, and that is the whole of why it is down
  // here: every island is briefly unaligned while the world is being made, so
  // running this in the generation loop put yards and walls on the eight or
  // ten islands the two sides were about to be dealt. Measured, that opened
  // both sides insolvent — the Crown's upkeep went from 75 to 91 against an
  // unchanged income of 83 — because a side was paying to keep works it had
  // never chosen to build. Sean's rule is about *neutral* islands, and an
  // island is only neutral once the dealing is over.
  for (const system of systems) {
    if (system.populated && system.control === 'neutral') settleWorks(system, seed, makeId);
  }

  /**
   * The seawalls of Highwater, which are older than the Imperium.
   *
   * The world bible says so and the map did not: measured over forty worlds
   * the Crown's capital opened with two companies and no wall in every single
   * one, and a played Crown that moved its Home Fleet lost the war on day
   * forty-eight to one squadron with three companies aboard.
   *
   * With the siege rules it is the one island that must open fortified. A
   * capital whose fall ends the war is a siege, not a gift — you beat the
   * walls down over days under their guns, and only then do the boats go in.
   */
  const seat = capital;
  seat.slots = Math.max(seat.slots, seat.facilities.length + (seat.deposits?.length ?? 0) + CAPITAL_WALLS + 1);
  for (let i = 0; i < CAPITAL_WALLS; i++) {
    seat.facilities.push({ ...makeFacility(makeId('fac'), 'fort', 'empire'), ancient: true });
  }
  // And a garrison worth landing against once they are down.
  seat.garrison = Math.max(seat.garrison, CAPITAL_GARRISON);

  // The great island's other Crown port gets a battery of its own, so the
  // Home Fleet is not the only thing standing between the Reach and whoever
  // sails into it. A fleet that has to stay moored to hold the ground it is
  // moored on is not a fleet, it is a second garrison.
  for (const port of systems) {
    if (port.id === seat.id) continue;
    if (port.sectorId !== seat.sectorId) continue;
    if (port.control !== 'empire' || port.archetype !== 'port-city') continue;
    port.slots = Math.max(port.slots, port.facilities.length + (port.deposits?.length ?? 0) + HOME_PORT_WALLS + 1);
    for (let i = 0; i < HOME_PORT_WALLS; i++) {
      port.facilities.push({ ...makeFacility(makeId('fac'), 'fort', 'empire'), ancient: true });
    }
  }

  // The Confederacy knows the island it met on and nothing else out here;
  // the frontier Reaches are otherwise a blank to both sides.
  allianceHq.explored.alliance = true;
  // Freeport is renamed and re-painted above, and the creature was picked off
  // the name and the painting this island had before all that — so ask again
  // now the island is what it is going to be, or a kraken ends up hanging
  // about a free harbor. Whether it has one at all does not change.
  if (allianceHq.beast) allianceHq.beast = creatureFor(allianceHq)?.slug;
  // And nothing dangerous: they chose this island to meet on and they are
  // moored in it on the morning of day one. A side losing hulls to a kraken
  // in its own birthplace before it has given an order is not an opening, it
  // is a coin toss. A harmless one can stay — a free harbor full of cats is
  // exactly right.
  if (allianceHq.beast && (creature(allianceHq.beast)?.guns ?? 0) > 0) {
    allianceHq.beast = undefined;
  }
  // They signed the articles standing on it, so whatever is in its water is
  // not news to them. It is still news to the Crown.
  if (allianceHq.beastSeen) allianceHq.beastSeen.alliance = true;

  /*
   * --- Coralhome: the founding wound, and the Crown still holds it. ---
   *
   * Canon, and Part A 2 of the lore package. The Crown chartered this island,
   * cleared the living coral bed the Reef-folk had been singing hulls out of
   * for generations, and built a proper harbor on it. The Admiralty lists it
   * as a completed works project. It is the reason the Confederacy exists.
   *
   * Which makes it the one island in the world the opening should never deal
   * at random: it is Crown-held on day one, garrisoned like a capital, its
   * reef already gone, and its people about as far from reconciled as the
   * scale goes. It is kept out of the contested shuffle above for that reason
   * and dealt here by name, so the shuffle cannot hand the founding wound to
   * the side the wound created.
   */
  const coralhome = systems.find((s) => s.name === CORALHOME);
  if (coralhome) {
    hold(coralhome, 'empire', CORALHOME_SUPPORT);
    coralhome.garrison = CORALHOME_GARRISON;
    coralhome.explored.empire = true;
    // The bed was cleared to build the harbor, so the ground it stood on is
    // ordinary ground now. This is the one island that starts that way.
    //
    // And the kilns go with it. Stripping the deposits alone left seed 501
    // opening with two Coral Kilns standing on a bed that no longer existed —
    // works with nothing under them, which is a state the rest of the game
    // takes care never to produce.
    coralhome.deposits = (coralhome.deposits ?? []).filter((d) => d.type !== 'coral');
    coralhome.facilities = coralhome.facilities.filter((f) => f.type !== 'coral_kiln');
    /*
     * And no makers. The island keeps its earners and its walls — it is a
     * built-up Crown harbor and should look like one — but a slipway or a
     * barracks standing here on day one would hand the Crown a second of
     * something the opening deliberately deals one of, and only on the seeds
     * where this island happened to be dealt one. Seed 17 did: a shipyard,
     * which is how this was found.
     *
     * A hidden advantage is bad; a hidden advantage that depends on the dice
     * is worse, because the opening is then stronger for a reason the player
     * cannot see and cannot plan around.
     */
    coralhome.facilities = coralhome.facilities.filter(
      (f) => f.type !== 'shipyard' && f.type !== 'training_facility',
    );
    // Nothing in the water, by the standing rule rather than as an exception:
    // a creature is never put where a side has already charted, and the Crown
    // charts this one the moment it garrisons it.
    coralhome.beast = undefined;
    // Reset rather than removed. `loadGame` guarantees every system carries a
    // `beastSeen` — it fills one in for saves older than creatures — so a
    // system without it does not survive a round trip: the save drops the key
    // and the load puts it back, and the two states stop matching. Setting it
    // to undefined here failed the persistence test and nothing else, which is
    // the only reason it was noticed.
    coralhome.beastSeen = { empire: false, alliance: false };
  }

  // --- Characters: the world bible's seven majors per side, spread about. ---
  //
  // They used to start in one heap on one island, which made the first move of
  // every game the same move: open the seat, pick a name, send them. Scattered
  // over the side's own holdings, who is near what becomes a question, and the
  // crew screen is a map rather than a list.
  const characters: Character[] = [];
  const makeCharacters = (
    faction: PlayableFaction,
    where: (name: string, index: number) => string,
  ) => {
    // Each rating is rolled inside that character's band, so Hale is always a
    // formidable negotiator and Torvik is always the one you send aboard,
    // while no two games give quite the same numbers.
    for (const [index, entry] of openingCast(faction, rng).entries()) {
      const roll = (base: number) => rollRating(rng, base, entry.major);
      characters.push({
        id: makeId('chr'),
        name: entry.name,
        people: entry.people,
        blurb: 'bio' in entry ? (entry.bio as string) : undefined,
        epithet: 'epithet' in entry ? (entry.epithet as string) : undefined,
        roles: 'roles' in entry ? (entry.roles as string[]) : undefined,
        faction,
        diplomacy: roll(entry.ratings.diplomacy),
        espionage: roll(entry.ratings.espionage),
        combat: roll(entry.ratings.combat),
        leadership: roll(entry.ratings.leadership),
        // The fifth rating follows from the four above unless the bible names
        // one, so nobody has to keep a second set of numbers in step.
        watch: watchOf({
          espionage: roll(entry.ratings.espionage),
          combat: roll(entry.ratings.combat),
          leadership: roll(entry.ratings.leadership),
          watch: (entry.ratings as { watch?: number }).watch,
        }),
        locationSystemId: where(entry.name, index),
        status: 'available',
      });
    }
  };
  // The Regent has not left the citadel in eleven years; the rest of the
  // Admiralty is posted about the Crown's holdings.
  makeCharacters('empire', (_name, index) => (index === 0 ? capital.id : rng.pick(empireSystems).id));
  // The three Lords are at Freeport where they signed, and one or two of the
  // others are there with them. The rest are out on the islands that have
  // already declared.
  const atFreeport = rng.range(1, 2);
  let ashore = 0;
  makeCharacters('alliance', (name) => {
    // A Lord is at the table where the articles were signed.
    if (PIRATE_LORDS.some((l) => l.name === name)) return allianceHq.id;
    ashore += 1;
    return ashore <= atFreeport || allianceSystems.length === 0
      ? allianceHq.id
      : rng.pick(allianceSystems).id;
  });

  // --- The unaligned: people the war has not claimed yet. ---
  // Scattered over settled islands that are not anybody's seat, so signing
  // someone on is a reason to sail somewhere you had no other reason to go.
  // Which of the pool turn up, and where, changes with the seed.
  const openIslands = rng.shuffle(
    systems.filter(
      (s) => s.populated && s.id !== capital.id && s.id !== allianceHq.id && s.control !== 'alliance',
    ),
  );
  const inPlay = Math.min(RECRUITS_IN_PLAY, openIslands.length);
  /*
   * Who is ashore on the first morning, and why it is not simply the first two
   * out of the bag.
   *
   * The two at the front of this list land on day one, and the reason they do
   * is that recruiting has to be *discoverable* — a player who never sees the
   * mission offered never learns it exists. But the pool is not one pool: an
   * Urskin will not sign Crown articles and a Bog-folk will not sign
   * Confederate ones, so two sworn strangers on two quays can leave one side
   * with the mission greyed out for a third of the war and no way to know why.
   * That was luck rather than design before the pool grew; it is now a draw
   * you can lose.
   *
   * So the opening two are taken from the people nobody has sworn, who are on
   * both sides' lists by definition, and the sworn go into the drift behind
   * them. The bag is still shuffled and the pair is still different every war
   * — it is only *which two are ashore first* that is steered, and steered
   * towards the one property the opening needs them to have.
   */
  const bag = rng.shuffle(characterRoster.recruits).slice(0, inPlay);
  const unsworn = (e: (typeof bag)[number]) =>
    !('sworn' in e) && PEOPLE_ALLEGIANCE[e.people] === undefined;
  const ashoreFirst = [...bag.filter(unsworn), ...bag.filter((e) => !unsworn(e))];
  for (const [index, entry] of ashoreFirst.entries()) {
    const roll = (base: number) => rollRating(rng, base, entry.major);
    // A couple are ashore on day one so the errand is discoverable; the rest
    // are spread over the war, evenly with a little jitter so they do not
    // arrive on a drumbeat.
    const later = index - RECRUITS_AT_START;
    const spread = Math.max(1, inPlay - RECRUITS_AT_START);
    characters.push({
      id: makeId('chr'),
      name: entry.name,
      people: entry.people,
      // The same field the named cast reads. The unaligned used to carry a
      // one-line pitch here instead, which read as a caption on a page the
      // game gives a whole panel to.
      blurb: entry.bio,
      epithet: entry.epithet,
      // Carried over like the named cast's, because `roles` is a rule now and
      // not a caption: a stranger you sign on can only be posted to hold an
      // island if they are a Leader or a General, and the field was being
      // dropped on the way in.
      roles: 'roles' in entry ? (entry.roles as string[]) : undefined,
      // One person's own allegiance, where they have one. Two of the pool do
      // — the Betrayer and the bog witch — and dropping it here would put an
      // Urskin bounty man into the Confederacy's pool, which is the one place
      // he must never be.
      sworn: 'sworn' in entry ? (entry.sworn as PlayableFaction) : undefined,
      faction: 'neutral',
      diplomacy: roll(entry.ratings.diplomacy),
      espionage: roll(entry.ratings.espionage),
      combat: roll(entry.ratings.combat),
      leadership: roll(entry.ratings.leadership),
      watch: watchOf({
        espionage: roll(entry.ratings.espionage),
        combat: roll(entry.ratings.combat),
        leadership: roll(entry.ratings.leadership),
        watch: (entry.ratings as { watch?: number }).watch,
      }),
      locationSystemId: openIslands[index].id,
      status: 'available',
      // `notBefore` is a floor on the draw, not a replacement for it: Sean
      // asked for the Betrayer as *"a late recruit on the Imperium side"*, and
      // a person whose whole idea is that he turns up once the war has gone
      // long is no good turning up in the first fortnight.
      appearsOnDay: Math.max(
        'notBefore' in entry ? (entry.notBefore as number) : 0,
        index < RECRUITS_AT_START
          ? 1
          : Math.round((later + 1) * (RECRUIT_LAST_DAY / spread)) + rng.range(-12, 12),
      ),
    });
  }

  const state: GameState = {
    day: 1,
    speed: 'paused',
    player,
    sectors,
    systems,
    characters,
    fleets: [],
    factions: {
      empire: { gold: START_GOLD, income: 0, upkeep: 0, hqSystemId: capital.id, craft: 0 },
      alliance: { gold: START_GOLD, income: 0, upkeep: 0, hqSystemId: allianceHq.id, craft: 0 },
    },
    events: [],
    pendingDecisions: [],
    rngSeed: rng.seed,
    nextId: idCounter,
  };

  // --- The fleet already at sea. ---
  //
  // Built here rather than through addShip because that lives in fleets.ts and
  // would import back into this file; the shape is small enough to write out.
  //
  // A forward berth is a holding of that side's out in a contested Reach — not
  // the seat, and not the seat's own Reach. Drawn rather than fixed, so the
  // Crown's second squadron is somewhere different every war and the
  // Confederacy has to find it; it falls back to the seat on the impossible
  // world where the side holds nothing outside its own water.
  const berthFor = (faction: PlayableFaction, kind: StartSquadron['berth']) => {
    const seat = faction === 'empire' ? capital : allianceHq;
    if (kind === 'seat') return seat;
    const forward = (faction === 'empire' ? empireSystems : allianceSystems).filter(
      (sys) => sys.sectorId !== seat.sectorId && sys.control === faction,
    );
    return forward.length > 0 ? rng.pick(forward) : seat;
  };
  for (const [faction, squadrons] of Object.entries(START_FLEETS) as Array<
    [PlayableFaction, StartSquadron[]]
  >) {
    for (const squadron of squadrons) {
      state.fleets.push({
        id: `flt-${++state.nextId}`,
        name: squadron.name,
        faction,
        systemId: berthFor(faction, squadron.berth).id,
        ships: squadron.ships.map((classId) => ({
          id: `shp-${++state.nextId}`,
          classId,
          damage: 0,
        })),
        troops: squadron.troops,
        officerIds: [],
      });
    }
  }
  // No Lord's ship goes on the water. The three of them are people standing
  // at Freeport with the rest of the Brethren, and their ships live in their
  // bios — which is Sean's call, 15 September: a thing that is a person and a
  // hull at once is a thing no rule can reason about.

  recomputeLedger(state);
  const meeting = allianceHq.name;
  const lordLine = PIRATE_LORDS.map((l) => `${l.name} of the ${shipClass(l.ship).name}`).join(', ');
  /**
   * The first card of the war, and the only warning either side gets.
   *
   * Sean, on the Confederate opening: *"kinda like how in SW Rebellion the
   * rebels all start on Yavin 4 but the game tells you the empire will be
   * looking for you."* The three Lords sign the articles standing in the same
   * harbor, and the Crown wins by holding all three at once — so on day one
   * the entire Confederate victory condition is on one quay, and one landing
   * there ends the war in an afternoon. Measured over a hundred wars with
   * both sides played by the machine, two of them ended before day ninety
   * exactly that way: the Home Fleet found the meeting place and stormed it
   * with all three Lords ashore.
   *
   * That is a fine way to lose a game you were told about and a miserable way
   * to lose one you were not. So the card says it plainly, and says what to do
   * about it — the answer is the player's to carry out, not the game's.
   */
  state.events.push({
    id: `evt-${++state.nextId}`,
    day: 1,
    kind: 'war',
    text:
      player === 'alliance'
        ? `The ${factionData.alliance.name} is formed at ${meeting}, beyond the Crown's charts, under three Pirate Lords: ${lordLine}. Several islands have already declared for it. Take ${inProse(capital.name)} and the Crown falls. Let the Crown hold all three Lords at the same time and the cause dies with them — and all three are standing on this one quay tonight. The Imperium will come looking for ${meeting}. Get them to sea, and keep them apart.`
        : `Word reaches ${inProse(capital.name)}: a meeting has taken place in uncharted waters, and the ${factionData.alliance.name} has been formed under three Pirate Lords. Several islands have openly declared for it. Find where they met, take all three of them alive and hold them at the same time, and the rebellion is over — and hold ${inProse(capital.name)}, whatever else.`,
    systemId: player === 'alliance' ? allianceHq.id : capital.id,
  });
  return state;
}
