import troopData from '../data/troops.json';
import type { IslandArchetype, PlayableFaction, System } from './types';

/**
 * What a company actually is.
 *
 * A garrison used to be a number and ten identical pike figures, which said
 * everything about how many and nothing about who. Rebellion never does this:
 * a regiment there is a named thing with a picture and three numbers, and
 * "two Wookiee regiments on Kashyyyk" is a sentence about the world as well as
 * about the board.
 *
 * So a company here has a type. Three sorts of type, and the sort decides
 * where it turns up:
 *
 * - The **line** unit and the **sailors**, which a side has everywhere it has
 *   anything. Crown Regulars and Ship's Company; Island Militia and the same.
 * - The **native** units, which are a people rather than a purchase. The Reef
 *   Guard are not recruited on a reef island, they *are* the reef island; the
 *   Urskin are who lives in the ice. They appear where their people live and
 *   nowhere else, which is why an island of the Confederacy's out in the Far
 *   Sea defends differently from one in the Amber.
 * - The **made** units, Tidewrought and the Drowned Guard, which are the two
 *   the Crown manufactures rather than musters. Those are behind research and
 *   so appear nowhere yet.
 *
 * The numbers are not wired into combat. The sim still resolves a landing on
 * the count of companies, exactly as it did — see docs/troops.md, which says
 * what wiring them would mean. What is real today is who is standing there.
 */
export interface TroopType {
  id: string;
  faction: PlayableFaction;
  name: string;
  role: 'line' | 'sailors' | 'elite' | 'native' | 'made';
  people: string;
  /** What it is worth landing on somebody. The die an invasion rolls. */
  attack: number;
  /** What it is worth holding ground. The die a defence rolls. */
  invasionDefense: number;
  /** What it sees: the eyes that catch a saboteur or a boat in the dark. */
  detection: number;
  /** What it costs a ship's guns to break it once the walls are rubble. A much
   *  smaller scale than `defense`: a fleet rolls 1d32 where six troops roll
   *  1d180, so the two defences cannot share a number. */
  bombardDefense: number;
  /** Gold to raise, days to raise it, and gold a day to keep. */
  costGold: number;
  days: number;
  upkeep: number;
  /** "start", or the research tier that opens it: R2, R4, R6, R8. */
  unlock: string;
  blurb: string;
  /** Behind research, and so not in play. */
  research?: boolean;
  /** For a native unit, the sorts of island its people live on. */
  home?: IslandArchetype[];
}

export const TROOP_TYPES = troopData.types as TroopType[];

export function troopType(id: string): TroopType | undefined {
  return TROOP_TYPES.find((t) => t.id === id);
}

/** Everything a side could have ashore, research aside. */
export function troopsOf(faction: PlayableFaction): TroopType[] {
  return TROOP_TYPES.filter((t) => t.faction === faction);
}

/** Which rung of research opens a company, as a number. "start" is zero. */
export function troopUnlockGrade(t: TroopType): number {
  if (t.unlock === 'start') return 0;
  const rung = Number(t.unlock.slice(1));
  return Number.isFinite(rung) ? rung : 0;
}

/**
 * Why this island cannot raise this company, or null if it can.
 *
 * Two rules, and both fall out of the roster rather than being invented here.
 *
 * **Research.** A company behind R4 wants four grades of shipwright craft, the
 * same ladder that opens a hull. This is the half that was missing: until now
 * every researched company was filtered out of every garrison, so four rungs
 * on both sides bought units that could never stand anywhere. Measured over
 * six full wars, eight of the twelve companies never once appeared.
 *
 * **A people live where they live.** A `native` company is not recruited, it is
 * *mustered* — the Reef Guard are the reef island, the Urskin are who lives on
 * the ice — so it raises on its own `home` archetypes and nowhere else. That is
 * what makes the two sides feel different rather than mirrored: the Confederacy
 * musters whoever is already there, and the Crown's later companies are `made`
 * — Tidewrought out of brass and iron, the Drowned Guard out of men who were
 * human once — and a made thing can be made anywhere.
 *
 * **Sailors are not raised at all.** A ship's company comes off a hull; it is
 * ashore because hulls are, which is why an island with a slipway has one in
 * the square and one without does not. Ordering one would be ordering a crew
 * with no ship to take it off.
 */
export function raiseReason(
  t: TroopType,
  grade: number,
  system?: Pick<System, 'archetype'>,
): string | null {
  if (t.role === 'sailors') return "A ship's company comes off a hull, not out of a drill ground.";
  const wants = troopUnlockGrade(t);
  if (wants > grade) {
    return `${t.name} need ${wants} ${wants === 1 ? 'grade' : 'grades'} of shipwright craft.`;
  }
  if (t.home && system && !t.home.includes(system.archetype)) {
    return `${t.people} do not live on this sort of island.`;
  }
  return null;
}

/**
 * The same refusal with the name taken out, for a list that already shows it.
 *
 * `raiseReason` names the company because it answers a question asked about one
 * — an order refused, a button explaining itself. In the picker the name is the
 * option's own text, so the full sentence reads "Fensworn — Fensworn need 2
 * grades of shipwright craft" and says the word twice in six. Same rule, same
 * order, fewer words.
 */
export function raiseShort(
  t: TroopType,
  grade: number,
  system?: Pick<System, 'archetype'>,
): string | null {
  if (t.role === 'sailors') return 'comes off a hull';
  const wants = troopUnlockGrade(t);
  if (wants > grade) return `needs ${wants} ${wants === 1 ? 'grade' : 'grades'} of craft`;
  if (t.home && system && !t.home.includes(system.archetype)) return 'not their sort of island';
  return null;
}

/** Every company this side could raise here today, cheapest first. */
export function raisableTroops(
  faction: PlayableFaction,
  grade: number,
  system?: Pick<System, 'archetype'>,
): TroopType[] {
  return troopsOf(faction)
    .filter((t) => raiseReason(t, grade, system) === null)
    .sort((a, b) => a.costGold - b.costGold);
}

/**
 * A company this side can raise today, of this role, or nothing.
 *
 * `!t.research` is the whole of it, and it was a live bug rather than a
 * question. The Confederacy's sailors are The Brethren, who are behind R2 —
 * so every Confederate island with a slipway on it was posting a company that
 * does not exist yet, on day one, before anybody had researched anything. The
 * Crown's Ship's Company is a starting unit and was fine, which is why it went
 * unnoticed.
 */
const raisable = (faction: PlayableFaction, role: TroopType['role']) =>
  TROOP_TYPES.find((t) => t.faction === faction && t.role === role && !t.research);

/**
 * The company an island is garrisoned with when nothing better applies.
 *
 * It was simply "the one with role `line`", which held while both sides had a
 * cheap conscript company on day one. On the ground roster of 21 September the
 * Crown's line company is the **Fensworn, behind R2** — its only two starting
 * troops are Marines and a Ship's Company — so on day one it has none at all,
 * and the roster as delivered papered over that by calling the Marines `line`.
 *
 * Measured, that is not a label. Marines detect 24 where the Crown Regulars
 * they replaced detected 15, so **every rock the Crown holds was garrisoned by
 * elites** and the capital's detection went 100.5 to 143.1 over thirty-two
 * seeds — a 42% rise in the price of every covert operation against the Crown,
 * out of a change about ground combat. The rescue rate out of Highwater fell
 * from nine wars in thirty-two to one, and a side that cannot get its people
 * back is the stall `RESCUE_BASE`'s note is written about.
 *
 * So the Marines are `elite`, as the change order's own card has them —
 * *"CROWN MARINES — Human, elite, start"* and *"FENSWORN — Bog-folk clans,
 * line, R2"* — and a side with no line company it can raise yet posts its
 * sailors instead. Which is the rule the Crown's ports already followed from
 * the other end: it sends its best where it means to be seen, and everywhere
 * else it is whoever came off a hull.
 *
 * TWO FALLBACKS MEET HERE and they point opposite ways, which is worth saying
 * plainly because it reads like a loop and is not one. A side with no line
 * company it can raise yet posts its sailors (the Crown, whose Fensworn are
 * behind R2); a side whose *sailors* are behind research garrisons its yards
 * with the line company instead (the Confederacy, whose Brethren are). Today
 * neither side is missing both, so neither fallback ever asks the other for an
 * answer it does not have — and this function no longer calls `sailorsOf` at
 * all, so it could not deadlock even if one were.
 *
 * What it can still be is wrong data, and that is what the throw is for. A
 * side with nothing raisable in either role has no garrison at all, which
 * would have surfaced as `undefined.name` somewhere three files away. One bad
 * research flag in `troops.json` is all it would take, so it says so here.
 */
const lineOf = (faction: PlayableFaction): TroopType => {
  const found = raisable(faction, 'line') ?? raisable(faction, 'sailors');
  if (!found) {
    throw new Error(
      `${faction} has no line or sailors company it can raise on day one, so its ` +
        `islands cannot be garrisoned. Every side needs at least one company of ` +
        `either role with no research flag in troops.json.`,
    );
  }
  return found;
};

/**
 * And the sailors, who may genuinely not exist yet.
 *
 * Undefined until the Brethren are recruited, and `garrisonRoster` falls back
 * to the line company. Which is what "behind R2" is supposed to mean: until
 * then, a Confederate yard is held by whoever lives there.
 */
const sailorsOf = (faction: PlayableFaction) => raisable(faction, 'sailors');

/**
 * The unit an island's own people make, if they make one.
 *
 * Reef-folk on the reefs, Urskin in the ice and on bare rock, Shoal-folk in the
 * ports. The Crown has no native unit — its people are the Crown's people
 * everywhere — so its ports post Marines instead, which is the same idea from
 * the other end: the Crown sends its best where it means to be seen.
 */
function localOf(faction: PlayableFaction, system: Pick<System, 'archetype'>): TroopType | undefined {
  // A people behind research is not standing in anybody's square yet, so the
  // local company has to be one the side can actually raise today. Without the
  // `research` test the Bog Witches and the Shoal Wardens would turn up in
  // starting garrisons on their home islands years before they join the war.
  const native = TROOP_TYPES.find(
    (t) =>
      t.faction === faction &&
      t.role === 'native' &&
      !t.research &&
      t.home?.includes(system.archetype),
  );
  if (native) return native;
  if (faction === 'empire' && (system.archetype === 'port-city' || system.archetype === 'free-harbor')) {
    return TROOP_TYPES.find((t) => t.id === 'crown-marines');
  }
  return undefined;
}

/**
 * Who is ashore, company by company.
 *
 * Length is the garrison, so this never disagrees with the number the rest of
 * the game runs on — it says what those companies are, not how many there are.
 * Seeded from the island's own name, so the same island has the same companies
 * in every game and a garrison does not reshuffle itself when one is lost.
 */
export function garrisonRoster(
  system: Pick<System, 'name' | 'seed' | 'archetype' | 'control' | 'garrison' | 'facilities'>,
): TroopType[] {
  if (system.control !== 'empire' && system.control !== 'alliance') return [];
  const faction = system.control;
  const line = lineOf(faction);
  const sailors = sailorsOf(faction);
  const local = localOf(faction, system);
  // Sailors come off hulls, so they are ashore where hulls are: an island with
  // a shipyard has a ship's company in the square and one without does not.
  const hasYard = system.facilities.some((f) => f.type === 'shipyard' && !f.building);
  const seed = system.seed ?? [...system.name].reduce((n, c) => n + c.charCodeAt(0), 0);

  const out: TroopType[] = [];
  for (let i = 0; i < system.garrison; i++) {
    const turn = (seed + i) % 4;
    if (local && turn === 1) out.push(local);
    else if (sailors && hasYard && turn === 2) out.push(sailors);
    else out.push(line);
  }
  return out;
}

/**
 * Who is posted here — the list if there is one, the seeded mix if not.
 *
 * `garrisonRoster` invents a mix from the island's seed, and that is still the
 * right answer for an island nobody has raised anything on: a starting
 * garrison, a neutral island, a save written before companies had names. But
 * once the player has *chosen* — raised a Fensworn, landed Shoal Wardens —
 * the choice is the truth and inventing over the top of it would throw it away.
 *
 * So the list wins where it exists, and the count still governs its length. A
 * list that has fallen out of step with the count is treated as absent rather
 * than trusted, because a wrong roster is worse than a guessed one and this is
 * the one place that can notice.
 */
export function companiesOn(
  system: Pick<System, 'name' | 'seed' | 'archetype' | 'control' | 'garrison' | 'facilities' | 'companies'>,
): TroopType[] {
  const listed = system.companies;
  if (listed && listed.length === system.garrison) {
    const named = listed.map((id) => troopType(id));
    if (named.every((t): t is TroopType => Boolean(t))) return named;
  }
  return garrisonRoster(system);
}

/**
 * Write the seeded mix out as a real list, so it can then be added to.
 *
 * Every writer below calls this first. Until something changes, an island's
 * companies stay implied — which is what keeps this change from having to
 * migrate seventy islands a war and every save in existence.
 */
export function materialiseCompanies(system: System): string[] {
  if (!system.companies || system.companies.length !== system.garrison) {
    system.companies = garrisonRoster(system).map((t) => t.id);
  }
  return system.companies;
}

/** Post `n` companies of one kind. The count follows the list. */
export function postCompanies(system: System, typeId: string, n = 1): void {
  const list = materialiseCompanies(system);
  for (let i = 0; i < n; i++) list.push(typeId);
  system.garrison = list.length;
}

/**
 * Take `n` companies off the island, and say which went.
 *
 * Who goes matters, because these are the ones that embark. A player who
 * raised the Hushed to hold an island does not want them taken for the boats
 * ahead of the militia standing beside them, so the *weakest defender* goes
 * first and what is left behind is what the island most wanted kept.
 */
export function takeCompanies(system: System, n: number): string[] {
  const list = materialiseCompanies(system);
  const order = list
    .map((id, at) => ({ id, at, hold: troopType(id)?.invasionDefense ?? 20 }))
    .sort((a, b) => a.hold - b.hold || a.at - b.at)
    .slice(0, Math.max(0, Math.min(n, list.length)));
  const going = new Set(order.map((e) => e.at));
  system.companies = list.filter((_, at) => !going.has(at));
  system.garrison = system.companies.length;
  return order.map((e) => e.id);
}

/** What survived a fight, in the order the fight left them. */
export function setCompanies(system: System, ids: string[]): void {
  system.companies = [...ids];
  system.garrison = ids.length;
}

/** The garrison as "3 Crown Regulars · 1 Crown Marines", in posting order. */
export function garrisonSummary(
  system: Parameters<typeof companiesOn>[0],
): Array<{ type: TroopType; count: number }> {
  const out: Array<{ type: TroopType; count: number }> = [];
  for (const type of companiesOn(system)) {
    const seen = out.find((e) => e.type.id === type.id);
    if (seen) seen.count += 1;
    else out.push({ type, count: 1 });
  }
  return out;
}

/**
 * Who a side puts in the boats.
 *
 * A fleet carries a number of companies rather than a list of them, which was
 * fine while a landing was settled on counting them and is not fine now that
 * each one rolls its Attack. So the number needs a *kind*, and this is it: the
 * best attacker the side has unlocked.
 *
 * That is a design decision the change order does not make, and it is made
 * this way for one reason — it is the answer that makes the research ladder
 * mean something on land. A Crown that has reached R8 lands the Drowned Guard;
 * one that has not lands Marines. The alternative, a fixed line company for
 * ever, would leave four of the six troops a side never setting foot on an
 * enemy beach.
 *
 * `grade` is the side's shipwright craft, which is the same ladder the troop
 * unlocks are written against: "R2", "R4", "R6", "R8".
 */
export function landingTroop(faction: PlayableFaction, grade: number): TroopType {
  const unlocked = troopsOf(faction).filter((t) => {
    if (t.unlock === 'start') return true;
    const rung = Number(t.unlock.slice(1));
    return Number.isFinite(rung) && grade >= rung;
  });
  return unlocked.reduce((best, t) => (t.attack > best.attack ? t : best), unlocked[0]);
}

/**
 * What raising one company on this island costs, and how long it takes.
 *
 * Per-troop economics, which the change order asks for in its section 5: the
 * flat 25 gold and seven days are gone and both come from the type. What makes
 * that affordable to implement is that an island already knows who it raises —
 * `garrisonRoster` has said so since the troops got names — so this is a
 * lookup rather than a new decision for the player to make.
 *
 * It is also the whole of section 3B, which is the reason the Shoal Wardens
 * exist. Blanketing ten sour islands costs 640 gold in Shoal-folk against
 * 1,680 in Crown Marines, and an island that drops into revolt can be answered
 * in eight days rather than twenty. That ladder only bites if the price
 * follows the unit, and until now it did not.
 */
export function troopBuildAt(system: System, faction: PlayableFaction): TroopType | undefined {
  const roster = garrisonRoster({ ...system, control: faction, garrison: 1 });
  return roster[0];
}
