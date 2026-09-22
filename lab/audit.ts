/**
 * Everything that must be true of a game state, checked every day of every
 * game. A violation here is a bug, not a balance opinion.
 */
import factionData from '../src/data/factions.json';
import { fleetCapacity } from '../src/sim/fleets';
import { TROOP_TYPES } from '../src/sim/troops';
import type { GameState } from '../src/sim/types';

export interface Violation { rule: string; detail: string; day: number; }

export function audit(s: GameState): Violation[] {
  const v: Violation[] = [];
  const bad = (rule: string, detail: string) => v.push({ rule, detail, day: s.day });
  const num = (n: unknown) => typeof n === 'number' && Number.isFinite(n);

  const systemIds = new Set(s.systems.map((x) => x.id));
  const charIds = new Set(s.characters.map((c) => c.id));

  for (const side of ['empire', 'alliance'] as const) {
    const f = s.factions[side];
    if (!num(f.gold)) bad('gold-nan', `${side} gold=${f.gold}`);
    if (!num(f.income)) bad('income-nan', `${side} income=${f.income}`);
    if (!num(f.upkeep)) bad('upkeep-nan', `${side} upkeep=${f.upkeep}`);
    if (!num(f.craft) || f.craft < 0) bad('craft-bad', `${side} craft=${f.craft}`);
    if (!systemIds.has(f.hqSystemId)) bad('hq-orphan', `${side} hq=${f.hqSystemId}`);
  }
  // Read from the data rather than written down here, and that is the whole
  // point of it. This rule used to name the seat in the source: it said
  // 'Highwater' after the 19 September rename moved the seat to the Aldermain,
  // and so fired on every day of every war — twenty-nine thousand times over
  // forty wars — which is worse than useless, because a harness that always
  // reports a broken rule is a harness nobody reads when one actually breaks.
  // The seat went back to being Highwater on 21 September and this needed no
  // edit, which is the argument for never writing a name down twice.
  /*
   * The roster and the count must agree.
   *
   * An island's companies became a real list on 22 September, with `garrison`
   * kept as its length because thirty readers ask how many and none ask who.
   * Two numbers for one fact is exactly the shape that drifts, and the drift
   * would be silent: `companiesOn` treats a list out of step with the count as
   * absent and quietly falls back to the seeded mix, so a garrison would go on
   * reading plausibly while the player's choices were being thrown away every
   * time somebody looked at it. This is the rule that makes that loud.
   */
  for (const system of s.systems) {
    const posted = system.companies;
    if (posted && posted.length !== system.garrison) {
      bad('companies-adrift', `${system.name}: ${posted.length} listed, garrison ${system.garrison}`);
    }
    if (posted?.some((id) => !TROOP_TYPES.some((t) => t.id === id))) {
      bad('companies-unknown', `${system.name}: ${posted.filter((id) => !TROOP_TYPES.some((t) => t.id === id)).join(', ')}`);
    }
  }

  const crownSeat = s.systems.find((x) => x.id === s.factions.empire.hqSystemId);
  if (crownSeat && crownSeat.name !== factionData.empire.capitalIslandName) {
    bad('crown-seat-moved', crownSeat.name);
  }
  const confedSeat = s.systems.find((x) => x.id === s.factions.alliance.hqSystemId);
  // Only a violation while somewhere safe exists. With every populated island
  // in Crown hands there is nowhere to point home at, which is a design
  // question (see 'the dead war' in the report) rather than a broken rule.
  const anywhereSafe = s.systems.some((x) => x.populated && x.control !== 'empire');
  if (confedSeat && confedSeat.control === 'empire' && anywhereSafe)
    bad('confed-home-on-crown-isle', confedSeat.name);

  for (const sys of s.systems) {
    const a = sys.support.alliance, e = sys.support.empire;
    if (!num(a) || !num(e)) bad('support-nan', `${sys.name} ${e}/${a}`);
    // An island nobody lives on has no opinion: 0/0 is correct there.
    else if (sys.populated) {
      if (Math.abs(a + e - 100) > 0.01) bad('support-sum', `${sys.name} ${e.toFixed(2)}+${a.toFixed(2)}`);
      if (a < -0.01 || a > 100.01 || e < -0.01 || e > 100.01) bad('support-range', `${sys.name} ${e.toFixed(2)}/${a.toFixed(2)}`);
    }
    if (!num(sys.garrison) || sys.garrison < 0) bad('garrison-bad', `${sys.name} ${sys.garrison}`);
    if (!num(sys.slots) || sys.slots < 0) bad('slots-bad', `${sys.name} ${sys.slots}`);
    if (sys.facilities.length > sys.slots) bad('over-built', `${sys.name} ${sys.facilities.length}/${sys.slots}`);
    if (sys.commanderId && !charIds.has(sys.commanderId)) bad('commander-orphan', `${sys.name} -> ${sys.commanderId}`);
    if (sys.commanderId) {
      const who = s.characters.find((c) => c.id === sys.commanderId)!;
      if (who.locationSystemId !== sys.id) bad('commander-elsewhere', `${who.name} posted to ${sys.name}, standing elsewhere`);
      if (who.status === 'captured') bad('captive-in-command', `${who.name} holds ${sys.name}`);
    }
    // An island nobody lives on is held by the company standing on it and
    // nothing else, so companies there are the rule rather than a fault.
    if (sys.uprising && (sys.control === 'none' || sys.control === 'neutral')) bad('uprising-unheld', `${sys.name} ${sys.control}`);
    for (const fac of sys.facilities) {
      if (
        fac.building &&
        (!num(fac.building.workLeft) ||
          fac.building.workLeft < 0 ||
          !num(fac.building.travelLeft) ||
          fac.building.travelLeft < 0 ||
          fac.building.workLeft > fac.building.work)
      )
        bad('build-days-bad', `${sys.name} ${fac.building.item} ${fac.building.workLeft}/${fac.building.work} +${fac.building.travelLeft}`);
    }
    if (sys.beastDamage !== undefined && (!num(sys.beastDamage) || sys.beastDamage < 0))
      bad('beast-damage-bad', `${sys.name} ${sys.beastDamage}`);
    if (sys.beastSlain && !sys.beast) bad('slain-no-beast', sys.name);
  }

  const aboard = new Map<string, string>();
  for (const f of s.fleets) for (const id of f.officerIds) {
    if (aboard.has(id)) bad('officer-two-decks', `${id} on two fleets`);
    aboard.set(id, f.id);
  }
  for (const c of s.characters) {
    // The top is deliberately uncapped for a stranger — a ninety can come out
    // at a hundred and ten — so this only catches nonsense, not excellence.
    for (const r of ['diplomacy', 'espionage', 'combat', 'leadership'] as const) {
      if (!num(c[r]) || c[r] < 1 || c[r] > 140) bad('rating-range', `${c.name} ${r}=${c[r]}`);
    }
    if (!systemIds.has(c.locationSystemId)) bad('person-orphan', `${c.name} at ${c.locationSystemId}`);
    if (c.status === 'injured' && (c.injuredDays === undefined || c.injuredDays < 0))
      bad('injury-days-bad', `${c.name} ${c.injuredDays}`);
    if (c.status === 'available' && c.mission) bad('available-with-errand', `${c.name} ${c.mission.type}`);
    if (c.status === 'captured' && c.mission) bad('captive-with-errand', c.name);
    if (c.status === 'captured' && aboard.has(c.id)) bad('captive-aboard', c.name);
    if (c.mission) {
      if (!systemIds.has(c.mission.targetSystemId)) bad('errand-orphan', `${c.name} -> ${c.mission.targetSystemId}`);
      if (!num(c.mission.daysRemaining) || c.mission.daysRemaining < 0)
        bad('errand-days-bad', `${c.name} ${c.mission.daysRemaining}`);
      for (const m of c.mission.party ?? []) if (!charIds.has(m)) bad('party-orphan', `${c.name} party`);
    }
    if (c.escorting) {
      if (!charIds.has(c.escorting)) bad('escort-orphan', c.name);
      else {
        const lead = s.characters.find((x) => x.id === c.escorting)!;
        if (!lead.mission) bad('escort-no-errand', `${c.name} with ${lead.name}, who has none`);
      }
    }
    if (c.status === 'on_mission' && aboard.has(c.id)) bad('errand-aboard', c.name);
    // Ashore means ashore *there*. A working phase anywhere but the island the
    // errand names would make every rule that reads a location wrong at once —
    // who can be lifted off a quay, who is caught when an island falls, who a
    // foil chance is measured against.
    if (c.mission?.phase === 'working' && c.locationSystemId !== c.mission.targetSystemId)
      bad('working-elsewhere', `${c.name} working ${c.mission.type} but standing elsewhere`);
    // The opponent gives up on an errand after four spells; nobody should be
    // carrying a tally that says otherwise.
    if (c.mission && c.mission.cycles !== undefined && (!num(c.mission.cycles) || c.mission.cycles < 1))
      bad('errand-cycles-bad', `${c.name} ${c.mission.cycles}`);
  }
  const byId = new Set<string>();
  for (const c of s.characters) { if (byId.has(c.id)) bad('duplicate-person', c.id); byId.add(c.id); }

  const shipIds = new Set<string>();
  for (const f of s.fleets) {
    if (!systemIds.has(f.systemId)) bad('fleet-orphan', `${f.name} at ${f.systemId}`);
    if (!num(f.troops) || f.troops < 0) bad('troops-bad', `${f.name} ${f.troops}`);
    if (f.voyage) {
      if (!systemIds.has(f.voyage.targetSystemId)) bad('voyage-orphan', `${f.name}`);
      if (!num(f.voyage.daysRemaining) || f.voyage.daysRemaining < 0)
        bad('voyage-days-bad', `${f.name} ${f.voyage.daysRemaining}`);
    }
    for (const o of f.officerIds) if (!charIds.has(o)) bad('crew-orphan', f.name);
    for (const sh of f.ships) {
      if (shipIds.has(sh.id)) bad('duplicate-hull', sh.id);
      shipIds.add(sh.id);
      if (!num(sh.damage) || sh.damage < 0) bad('damage-bad', `${f.name} ${sh.classId} ${sh.damage}`);
    }
    for (const sh of f.ships)
      if (['harbor', 'swallowtail', 'adamant'].includes(sh.classId))
        bad('legend-afloat', `${f.name} carries ${sh.classId}`);
    // Every hull carries companies now, at Sean's word, so berths are a real
    // number and a squadron must never be over them.
    if (f.troops > fleetCapacity(f))
      bad('over-berthed', `${f.name} ${f.troops} companies in ${fleetCapacity(f)} berths`);
  }
  const ghosts = s.fleets.filter((f) => f.ships.length === 0 && f.officerIds.length === 0 && f.troops === 0);
  if (ghosts.length > 0) bad('ghost-fleet', `${ghosts.length} empty`);
  const crewless = s.fleets.filter((f) => f.ships.length === 0 && (f.officerIds.length > 0 || f.troops > 0));
  if (crewless.length > 0) bad('people-on-no-hull', `${crewless.length} fleet(s) with no ships but crew/companies aboard`);

  if (s.battle && !systemIds.has(s.battle.systemId)) bad('battle-orphan', s.battle.systemId);
  // A battle sheet is a question for the player. Watching, there is nobody to
  // ask, and one that nobody can answer stops the clock for the rest of the
  // war — which is exactly what it did before 17 September.
  if (s.observing && s.battle) bad('sheet-with-no-player', s.battle.systemId);
  // Nor a report nobody will answer, for the same reason.
  if (s.observing && s.pendingDecisions.length > 0)
    bad('reports-with-no-player', `${s.pendingDecisions.length} waiting`);
  // A side with no island has nowhere to put anybody: everyone of theirs is
  // taken the same evening, and the war ends on the victory check.
  for (const side of ['empire', 'alliance'] as const) {
    if (s.systems.some((x) => x.control === side)) continue;
    const loose = s.characters.filter((c) => c.faction === side && c.status !== 'captured');
    if (loose.length > 0)
      bad('landless-at-large', `${side}: ${loose.length} still out with no ground to stand on`);
  }
  const seenDecisions = new Set<string>();
  for (const d of s.pendingDecisions) {
    if (!charIds.has(d.characterId)) bad('decision-orphan', d.characterId);
    else {
      const who = s.characters.find((c) => c.id === d.characterId)!;
      if (who.status === 'captured') bad('decision-for-captive', who.name);
    }
    if (seenDecisions.has(d.characterId)) bad('duplicate-decision', d.characterId);
    seenDecisions.add(d.characterId);
  }
  if (s.pendingDecisions.length > 12) bad('decision-pileup', `${s.pendingDecisions.length} waiting`);

  /**
   * Espionage reports. Three ways one can go wrong and all three are quiet:
   * a report about an island that no longer exists, one dated after today —
   * which would read as "filed tomorrow" and is how a clock bug announces
   * itself — and one filed under a different island than the one it describes,
   * which would show the player somebody else's garrison.
   */
  for (const side of ['empire', 'alliance'] as const) {
    for (const [id, report] of Object.entries(s.intel?.[side] ?? {})) {
      if (!systemIds.has(id)) bad('report-orphan', `${side}: ${id}`);
      if (report.island.id !== id) bad('report-mislabelled', `${side}: ${id} holds ${report.island.id}`);
      if (report.day > s.day) bad('report-from-the-future', `${side}: ${id} day ${report.day}`);
      if (!charIds.has(report.byId)) bad('report-by-nobody', `${side}: ${id}`);
    }
  }

  if (s.events.length > 600) bad('log-unbounded', `${s.events.length} entries`);
  for (const e of s.events.slice(-30)) {
    if (!e.text || e.text.trim() === '') bad('empty-event', e.id);
    if (/undefined|NaN|\[object|\bnull\b/.test(e.text)) bad('event-text-broken', e.text.slice(0, 90));
    if (e.systemId && !systemIds.has(e.systemId)) bad('event-island-orphan', e.id);
  }

  return v;
}
