/**
 * Play a full game headless, auditing every day and counting what the rules
 * actually do. One game in, one row of facts out.
 */
import { advanceDay } from '../src/sim/advanceDay';
import { generateGalaxy } from '../src/sim/galaxy';
import { continueMission, endMission } from '../src/sim/missions';
import { orderFightRound, orderBreakOff, orderCloseBattle } from '../src/sim/commands';
import { lords, powerOf } from '../src/sim/lords';
import { audit, type Violation } from './audit';
import { pilot, type PilotTally } from './pilot';
import type { GameState, PlayableFaction } from '../src/sim/types';

export type Answer = 'carry-on' | 'come-home' | 'mixed';

export interface Run {
  seed: number;
  player: PlayableFaction;
  winner?: PlayableFaction;
  days: number;
  violations: Violation[];
  /** How many days the player's side was the one the AI was NOT playing. */
  counts: Record<string, number>;
  /** Peaks and ends, for the economy. */
  goldEnd: Record<PlayableFaction, number>;
  goldPeak: Record<PlayableFaction, number>;
  goldBrokeDays: Record<PlayableFaction, number>;
  islandsEnd: Record<PlayableFaction, number>;
  hullsPeak: Record<PlayableFaction, number>;
  /** Wall-clock ms for the whole game, and the worst single day. */
  ms: number;
  worstDayMs: number;
}

const KINDS = [
  'flip', 'mutiny', 'battle', 'loss', 'order', 'mission', 'war',
] as const;

export function playGame(
  seed: number,
  player: PlayableFaction,
  opts: { maxDays?: number; answer?: Answer; auditEvery?: number; play?: boolean } = {},
): Run {
  const maxDays = opts.maxDays ?? 3000;
  const answer = opts.answer ?? 'carry-on';
  const auditEvery = opts.auditEvery ?? 1;
  let state = generateGalaxy(seed, player);
  const violations: Violation[] = [];
  const seenRule = new Set<string>();
  const counts: Record<string, number> = Object.create(null);
  const bump = (k: string, n = 1) => { counts[k] = (counts[k] ?? 0) + n; };
  const other: PlayableFaction = player === 'empire' ? 'alliance' : 'empire';
  const goldPeak = { empire: 0, alliance: 0 } as Record<PlayableFaction, number>;
  const goldBrokeDays = { empire: 0, alliance: 0 } as Record<PlayableFaction, number>;
  const hullsPeak = { empire: 0, alliance: 0 } as Record<PlayableFaction, number>;

  // By id, not by index: the log is capped and trimmed from the front, so an
  // index into it skips everything new once a long game hits the cap.
  const seenEvents = new Set<string>();
  const started = Date.now();
  let worstDayMs = 0;
  let decisionCoin = 0;
  const orders: PilotTally = Object.create(null);

  for (let d = 0; d < maxDays && !state.winner; d++) {
    const t0 = Date.now();
    state = advanceDay(state);
    const spent = Date.now() - t0;
    if (spent > worstDayMs) worstDayMs = spent;

    // The player's side of an action: fight it out, breaking off when it
    // looks hopeless, which is what the sheet asks for.
    let guard = 0;
    while (state.battle && guard++ < 40) {
      bump('player-battle-rounds');
      if (state.battle.settled) {
        bump(`battle-${state.battle.settled}`);
        state = orderCloseBattle(state).state;
        break;
      }
      const next = orderFightRound(state);
      state = next.state;
    }
    if (guard >= 40) bump('battle-runaway');

    // Somebody at the wheel, if this run has one. Every order goes through
    // the same command layer the UI uses.
    if (opts.play && state.day % 3 === 0) {
      const before = state.day;
      state = pilot(state, orders);
      if (state.day !== before) bump('pilot-moved-the-clock');
    }

    // The player's errands report in; answer them.
    for (const p of [...state.pendingDecisions]) {
      bump('player-decisions');
      const home =
        answer === 'come-home' ||
        (answer === 'mixed' && (decisionCoin = (decisionCoin * 1103515245 + 12345) & 0x7fffffff) % 2 === 0);
      if (home) { endMission(state, p.characterId); bump('answered-home'); }
      else { continueMission(state, p.characterId); bump('answered-carry-on'); }
    }

    // What the day put in the log.
    for (const e of state.events) {
      if (seenEvents.has(e.id)) continue;
      seenEvents.add(e.id);
      bump(`event-${e.kind}`);
      if (/taken .* off the quay|carried off|in irons/i.test(e.text)) bump('text-abduction');
      if (/strikes her colours|struck/i.test(e.text)) bump('text-strike');
      if (/mutiny|rises|risen/i.test(e.text)) bump('text-rising');
      if (/sabotage|wrecked|burns the/i.test(e.text)) bump('text-sabotage');
      if (/creature|kraken|leviathan|serpent|beast/i.test(e.text)) bump('text-creature');
      if (/breaks .* out|broken out|freed|rescue/i.test(e.text)) bump('text-rescue');
      if (/exchang/i.test(e.text)) bump('text-exchange');
      if (/survey|charted/i.test(e.text)) bump('text-survey');
      if (/research|craft|shipwright/i.test(e.text)) bump('text-research');
      if (/recruit|signs on|signed on/i.test(e.text)) bump('text-recruit');
      if (/blockad/i.test(e.text)) bump('text-blockade');
    }

    for (const side of ['empire', 'alliance'] as const) {
      const g = state.factions[side].gold;
      if (g > goldPeak[side]) goldPeak[side] = g;
      if (g < 0) goldBrokeDays[side]++;
      const hulls = state.fleets
        .filter((f) => f.faction === side)
        .reduce((n, f) => n + f.ships.length, 0);
      if (hulls > hullsPeak[side]) hullsPeak[side] = hulls;
    }
    for (const sys of state.systems) if (sys.uprising) bump('uprising-days');
    for (const c of state.characters) {
      if (c.status === 'captured') bump('captive-days');
      if (c.status === 'injured') bump('injured-days');
      if (c.status === 'available' && !state.systems.some((s) => s.commanderId === c.id)) bump('idle-days');
    }
    for (const l of lords(state)) {
      if (state.systems.some((s) => s.commanderId === l.id)) bump(`lord-posted-${powerOf(l)}`);
      if (l.mission?.phase === 'travelling' && powerOf(l) === 'runner') bump('runner-days');
    }
    for (const sys of state.systems) if (sys.beastSlain) bump('beast-slain-days');
    for (const f of state.fleets) if (f.voyage) bump('fleet-at-sea-days');
    for (const sys of state.systems) if (sys.blockaded) bump('blockade-days');
    // The dead war: one side holding no ground at all, and the clock running on.
    const isles = { empire: 0, alliance: 0 };
    for (const sys of state.systems) if (sys.control === 'empire' || sys.control === 'alliance') isles[sys.control]++;
    if (isles.alliance === 0) bump('confederacy-landless-days');
    if (isles.empire === 0) bump('crown-landless-days');
    if (isles.alliance === 0 && !state.systems.some((x) => x.populated && x.control !== 'empire'))
      bump('no-safe-ground-days');

    if (d % auditEvery === 0) {
      for (const v of audit(state)) {
        // One example per rule per game keeps the report readable.
        const key = `${v.rule}`;
        bump(`violation-${v.rule}`);
        if (!seenRule.has(key)) { seenRule.add(key); violations.push(v); }
      }
    }
  }

  const islands = (side: PlayableFaction) => state.systems.filter((s) => s.control === side).length;
  void KINDS; void other;
  for (const [k, n] of Object.entries(orders)) counts[`order-${k}`] = n;
  return {
    seed,
    player,
    winner: state.winner,
    days: state.day,
    violations,
    counts,
    goldEnd: { empire: state.factions.empire.gold, alliance: state.factions.alliance.gold },
    goldPeak,
    goldBrokeDays,
    islandsEnd: { empire: islands('empire'), alliance: islands('alliance') },
    hullsPeak,
    ms: Date.now() - started,
    worstDayMs,
  };
}
