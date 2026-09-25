/**
 * How news travels, and how far.
 *
 * Sean's memo of 17 September: *"the political world should behave like a
 * connected population, not a collection of isolated islands."* Three scopes,
 * and the hierarchy is the whole design —
 *
 *   LOCAL     only the island it happened on. Nearly everything.
 *   REGIONAL  the island hard, and its Reach a little. Major political events.
 *   GLOBAL    the whole archipelago, faintly. Only a catastrophe.
 *
 * What it replaced is worth stating plainly, because it was the opposite rule.
 * `applySupportChange` spilled a flat fifth of *every* allegiance change onto
 * *every* island in the Reach, equally, always. So a routine fortnight's
 * parley moved nine islands, and moved the far end of the chain exactly as
 * much as the island next door. Sean's memo opens by forbidding both halves of
 * that: *"do not make every allegiance change affect the region"*, and *"do
 * NOT simply add the same allegiance value to every island."*
 *
 * So the spill is gone from the ordinary case, and what is here instead is a
 * shock: raised by name, at named moments, with an effect that falls off with
 * distance, varies from island to island, is scaled by how connected the Reach
 * is, and is damped hard at each step of a cascade so that one good meeting
 * can start something and can never sweep a world.
 *
 * The player is never shown any of it as a figure. They get the news — *"word
 * of the rising on Cald is running down the Kettle Reach"* — and then they
 * watch the dots move.
 */
import {
  CASCADE_DAMP,
  CASCADE_MEMORY,
  CONNECTIVITY_MAX,
  CONNECTIVITY_MIN,
  GLOBAL_JITTER,
  REGIONAL_FALLOFF,
  REGIONAL_JITTER,
  SHOCKWAVE_DAYS,
} from './constants';
import { applyLocalSupport, pushEvent } from './helpers';
import type { Rng } from './rng';
import type { GameState, PlayableFaction, System } from './types';

/** How far the news carries. */
export type Scope = 'local' | 'regional' | 'global';

/**
 * Something that happened, and who it makes look good.
 *
 * `local` is in allegiance points on the island itself. `regional` is what the
 * *nearest* other island in the Reach feels; everything further feels less.
 * `global` is what one island somewhere else entirely feels, and is almost
 * always absent.
 */
export interface Shock {
  systemId: string;
  /** Who the news favours. The other side loses what this side gains. */
  faction: PlayableFaction;
  scope: Scope;
  local: number;
  regional?: number;
  global?: number;
  /**
   * How deep in a cascade this is. Zero is something that happened; one is
   * something that happened *because* of something that happened. Each step
   * carries much less than the last — see `CASCADE_DAMP`.
   */
  order?: number;
  /** One line for the feed, in words. Never a figure. */
  news: string;
}

/**
 * How connected a Reach's politics are.
 *
 * Sean: *"each sector should have a Political Connectivity value. High: stronger
 * domino effects, faster political spread, more responsive population. Low:
 * weaker political spillover, more isolated politics, more resistant to outside
 * influence. This gives different parts of the world distinct political
 * personalities."*
 *
 * Rolled once per Reach at worldgen and never changed, so a player learns their
 * world: the Kettles talk to each other and Rime does not, and that is a fact
 * about the map worth knowing before you spend a diplomat.
 */
export function connectivityOf(state: GameState, sectorId: string): number {
  const sector = state.sectors.find((s) => s.id === sectorId);
  return sector?.connectivity ?? (CONNECTIVITY_MIN + CONNECTIVITY_MAX) / 2;
}

/**
 * The islands of a Reach, nearest the epicentre first.
 *
 * Sean's §5 asks for the effect to diminish with *political* distance and says
 * *"strategic adjacency is more important than physical distance"*. A Reach is
 * already the game's unit of strategic adjacency — a chain of islands that
 * trade with each other, share a Sea and share a painting — so the ordering
 * inside one is the only thing left to decide, and there it really is the
 * water between them: a harbor hears about its neighbour before it hears about
 * the far end of the chain.
 */
function byNearness(state: GameState, epicentre: System): System[] {
  return state.systems
    .filter((s) => s.sectorId === epicentre.sectorId && s.id !== epicentre.id && s.populated)
    .sort(
      (a, b) =>
        Math.hypot(a.x - epicentre.x, a.y - epicentre.y) -
        Math.hypot(b.x - epicentre.x, b.y - epicentre.y),
    );
}

/** What a shock at this depth of a cascade is still worth. */
export function cascadeDamp(order: number): number {
  return CASCADE_DAMP[Math.min(order, CASCADE_DAMP.length - 1)];
}

/**
 * What one island felt, for the report to lay out.
 *
 * Sean's outcome specification asks a combat screen to show the political
 * consequence island by island — *"Port Royal: −2 Crown, Kingston: +1 Crown"* —
 * and *"only when something actually changed"*. So a shock hands back what it
 * actually moved rather than the caller guessing from the constants, and the
 * sign is toward the faction the news favoured.
 */
export interface Ripple {
  systemId: string;
  name: string;
  faction: PlayableFaction;
  /** Signed toward `faction`, and never rounded: the sheet rounds it. */
  delta: number;
  /** The island it happened on, rather than one that merely heard about it. */
  epicentre?: true;
}

/**
 * Let a piece of news out into the world.
 *
 * Returns what every island felt, so a caller can report it and so a cascade
 * can look at what moved. It does not re-derive control itself — that is one
 * call a day and one place, and a shock raised mid-tick must not start rolling
 * for mutinies.
 */
export function applyShock(state: GameState, shock: Shock, rng: Rng): Ripple[] {
  const epicentre = state.systems.find((s) => s.id === shock.systemId);
  if (!epicentre) return [];
  const damp = cascadeDamp(shock.order ?? 0);
  if (damp <= 0) return [];

  const moved: Ripple[] = [];
  const felt = (island: System, delta: number, here?: true) => {
    const real = applyLocalSupport(island, shock.faction, delta);
    if (real === 0) return;
    moved.push({
      systemId: island.id,
      name: island.name,
      faction: shock.faction,
      delta: real,
      ...(here ? { epicentre: here } : {}),
    });
  };

  // The island it happened on. Local, and nothing here spills anywhere.
  if (shock.local !== 0) felt(epicentre, shock.local * damp, true);
  if (shock.scope !== 'local' && shock.regional) {
    const reach = byNearness(state, epicentre);
    const connectivity = connectivityOf(state, epicentre.sectorId);
    for (const [rank, island] of reach.entries()) {
      /*
       * Falls off with distance and runs out. Sean's worked example — target
       * +10, adjacent +3, second +2, distant +1, remote +0.5 — is this table,
       * and past the end of it the news simply has not reached anybody who
       * cares.
       */
      const falloff = REGIONAL_FALLOFF[Math.min(rank, REGIONAL_FALLOFF.length - 1)];
      if (falloff <= 0) continue;
      // *"The exact effect can vary slightly. The objective is to create
      // political momentum without guaranteeing a cascade."*
      const jitter = 1 + (rng.next() * 2 - 1) * REGIONAL_JITTER;
      const delta = shock.regional * falloff * connectivity * damp * jitter;
      if (Math.abs(delta) < 0.05) continue;
      felt(island, delta);
      shake(state, island, shock.order ?? 0);
    }
  }

  if (shock.scope === 'global' && shock.global) {
    /*
     * *"A true global event should affect core sectors, outer sectors, remote
     * islands, neutral territory, enemy territory, friendly territory."* So it
     * ignores the Reach boundary entirely — including the Reach it happened
     * in, whose islands have already had the regional share and get this on
     * top, because they heard it first and loudest.
     */
    for (const island of state.systems) {
      if (!island.populated || island.id === epicentre.id) continue;
      const jitter = 1 + (rng.next() * 2 - 1) * GLOBAL_JITTER;
      const delta = shock.global * damp * jitter;
      if (Math.abs(delta) < 0.05) continue;
      felt(island, delta);
    }
  }

  /*
   * And the news itself, which is all the player gets. Sean's §19: do not
   * print *"this battle generated +2.37 regional allegiance"* — say what
   * happened and where it is being talked about, and let the dots say the
   * rest.
   */
  pushEvent(state, {
    kind: shock.scope === 'local' ? 'mission' : 'flip',
    text: shock.news,
    systemId: epicentre.id,
  });
  if (shock.scope !== 'local') markShockwave(state, epicentre.sectorId);
  return moved;
}

/**
 * Where the chart should ripple, and until when.
 *
 * Sean's §20: *"use a short visual propagation animation... the effect should
 * visually travel outward from the original event."* The rule cannot draw, so
 * it leaves a note of which Reach was shaken and on what day; the chart reads
 * it and runs the ripple. It expires on its own so a saved game does not
 * reopen mid-animation.
 */
export function markShockwave(state: GameState, sectorId: string): void {
  state.shockwave = { sectorId, day: state.day };
}

/** Whether the chart should be rippling this Reach right now. */
export function shockwaveOn(state: GameState, sectorId: string): boolean {
  const wave = state.shockwave;
  return Boolean(wave && wave.sectorId === sectorId && state.day - wave.day < SHOCKWAVE_DAYS);
}

/**
 * How a conquest is heard about, which depends entirely on who the island
 * wanted.
 *
 * Sean's §11 and §12 are one rule with a sign. Taking an island whose people
 * were against you is a conquest, and *"nearby islands become somewhat less
 * supportive of the invader"* — the political cost of doing it. Taking one
 * whose people were already yours is a liberation, and the Reach is pleased.
 * The line between them is the island's own regard for the attacker, so the
 * same landing on two islands a day apart can be either.
 */
export function landingShock(
  state: GameState,
  system: System,
  taker: PlayableFaction,
  local: number,
  regional: number,
  freeing: number,
): Shock {
  const welcome = system.support[taker];
  const liberated = welcome >= freeing;
  const name = state.sectors.find((s) => s.id === system.sectorId)?.name ?? 'the Reach';
  return {
    systemId: system.id,
    faction: taker,
    scope: 'regional',
    local: liberated ? local : -local,
    regional: liberated ? regional : -regional,
    news: liberated
      ? `${system.name} is taken, and the harbor cheers the boats in. Word of it is running through ${name}.`
      : `${system.name} is taken at the point of a bayonet. ${name} has heard how it was done.`,
  };
}

/**
 * How deep in a cascade an event on this island counts as.
 *
 * Sean's §6: a shock moves a neighbour, the neighbour reaches a critical state,
 * the neighbour defects, and *that* sends its own shock onward. The chain is
 * emergent rather than scripted — nothing here decides that an island will
 * fall, it only decides how loudly it is heard from when it does.
 *
 * So an island the news has lately reached remembers that it was reached, and
 * at what depth. When it later declares for somebody or rises, its own shock
 * goes out one step deeper and much quieter (§7: *"each subsequent event
 * should have diminishing regional impact"*). An island that nobody has been
 * shouting at is at depth zero and is heard in full.
 */
export function orderFor(state: GameState, system: System): number {
  const shaken = system.shaken;
  if (!shaken || state.day - shaken.day > CASCADE_MEMORY) return 0;
  return shaken.order + 1;
}

/** Remember that the news reached here, and how far down the chain it was. */
function shake(state: GameState, system: System, order: number): void {
  // The loudest thing it has lately heard wins: an island shaken at depth one
  // and then again at depth zero is at the front of a new chain, not the tail
  // of an old one.
  if (system.shaken && state.day - system.shaken.day <= CASCADE_MEMORY) {
    system.shaken = { day: state.day, order: Math.min(system.shaken.order, order) };
    return;
  }
  system.shaken = { day: state.day, order };
}
