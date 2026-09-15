/**
 * Everything that must be true of a game state, checked every day of every
 * game. A violation here is a bug, not a balance opinion.
 */
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
  const crownSeat = s.systems.find((x) => x.id === s.factions.empire.hqSystemId);
  if (crownSeat && crownSeat.name !== 'Highwater') bad('crown-seat-moved', crownSeat.name);
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
    if (!sys.populated && sys.garrison > 0) bad('garrison-on-empty', `${sys.name} ${sys.garrison}`);
    if (sys.uprising && (sys.control === 'none' || sys.control === 'neutral')) bad('uprising-unheld', `${sys.name} ${sys.control}`);
    for (const fac of sys.facilities) {
      if (fac.building && (!num(fac.building.daysRemaining) || fac.building.daysRemaining < 0))
        bad('build-days-bad', `${sys.name} ${fac.building.item} ${fac.building.daysRemaining}`);
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
      if (['harbor', 'swallowtail', 'ironback'].includes(sh.classId))
        bad('legend-afloat', `${f.name} carries ${sh.classId}`);
  }
  const ghosts = s.fleets.filter((f) => f.ships.length === 0 && f.officerIds.length === 0 && f.troops === 0);
  if (ghosts.length > 0) bad('ghost-fleet', `${ghosts.length} empty`);
  const crewless = s.fleets.filter((f) => f.ships.length === 0 && (f.officerIds.length > 0 || f.troops > 0));
  if (crewless.length > 0) bad('people-on-no-hull', `${crewless.length} fleet(s) with no ships but crew/companies aboard`);

  if (s.battle && !systemIds.has(s.battle.systemId)) bad('battle-orphan', s.battle.systemId);
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

  if (s.events.length > 600) bad('log-unbounded', `${s.events.length} entries`);
  for (const e of s.events.slice(-30)) {
    if (!e.text || e.text.trim() === '') bad('empty-event', e.id);
    if (/undefined|NaN|\[object|\bnull\b/.test(e.text)) bad('event-text-broken', e.text.slice(0, 90));
    if (e.systemId && !systemIds.has(e.systemId)) bad('event-island-orphan', e.id);
  }

  return v;
}
