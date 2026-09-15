import { BATTLE_ODDS_LABEL, battleView, type BattleSide, type BattleView } from '../sim';
import factionData from '../data/factions.json';
import { EventScene } from './EventScene';
import { FactionCrest, ShipIcon } from './art';
import type { BattleOutcome, GameState, PlayableFaction } from '../sim/types';

/**
 * The action, fought a broadside at a time.
 *
 * Rebellion stops the game dead when your ships meet theirs, prints what both
 * sides have, tells you in two words how it looks, and asks one question. This
 * is that, and the question is the only one worth asking at sea: fight on, or
 * run.
 *
 * The first broadside has already been fired by the time this opens — you met
 * them, shots were exchanged, and that is what the day's clock did. What the
 * sheet is for is every round after it. Which is also why there is no close
 * button: an action is left by finishing it or by running from it, and a third
 * door marked "ignore" would make both of those pointless.
 */
export function BattleSheet({
  state,
  onFight,
  onBreakOff,
  onClose,
}: {
  state: GameState;
  onFight: () => void;
  onBreakOff: () => void;
  onClose: () => void;
}) {
  const view = battleView(state);
  if (!view) return null;
  const me = state.player;
  const them: PlayableFaction = me === 'empire' ? 'alliance' : 'empire';

  return (
    <>
      <div className="scrim scrim--stacked" />
      <div className="dispatch dispatch--battle" role="dialog" aria-label={`Action off ${view.system.name}`}>
        <div className="dispatch__head">
          <span className="dispatch__title">Action off {view.system.name}</span>
          <span className="tiny muted">{ordinal(view.rounds)} broadside</span>
        </div>

        <EventScene kind="battle" tint={`var(--${me})`} seed={view.system.id} height={126} />

        {/* Two words, before any of the arithmetic. A player who has to add up
            columns of guns to decide whether to run is being handed sums
            instead of a decision. */}
        <div className={`odds odds--${view.odds}`}>{BATTLE_ODDS_LABEL[view.odds]}</div>

        <div className="tally">
          <Side faction={me} side={view.mine} label="Yours" lost={lostBy(view, me)} />
          <Side faction={them} side={view.theirs} label={factionData[them].shortName} lost={lostBy(view, them)} />
        </div>

        {view.beast && (
          <div className="battle__beast">
            <b>{view.beast.name}</b> is in the water, and it is nobody's.{' '}
            {view.beast.damage > 0
              ? `${view.beast.damage} of ${view.beast.hull} in it.`
              : 'Not a mark on it yet.'}
          </div>
        )}

        {view.shore > 0 && (
          <p className="tiny muted battle__line">
            The harbor's own guns — {view.shore} — fire{' '}
            {view.shoreIsMine ? 'for you' : `for the ${factionData[them].shortName}`}.
          </p>
        )}

        {view.last && !view.settled && (
          <p className="tiny muted battle__line">{roundLine(view, me, them)}</p>
        )}

        {view.settled ? (
          <>
            <p className="dispatch__text serif battle__verdict">{verdict(view, view.settled, them)}</p>
            <div className="dispatch__foot">
              <span className="tiny muted">Day {state.day}</span>
              <button className="btn btn--primary" onClick={onClose}>
                Very well
              </button>
            </div>
          </>
        ) : (
          <div className="dispatch__foot dispatch__foot--choice">
            <button
              className="btn"
              onClick={onBreakOff}
              disabled={view.fleeable.length === 0}
              title={view.fleeBlockedBecause ?? undefined}
            >
              Break off
            </button>
            <button className="btn btn--primary" onClick={onFight}>
              Fight on
            </button>
          </div>
        )}

        {view.fleeable.length === 0 && !view.settled && (
          <p className="tiny muted battle__line">
            {view.fleeBlockedBecause ?? 'There is nowhere to run to.'}
          </p>
        )}
      </div>
    </>
  );
}

/** One side's board: crest, hulls, guns, and how much of it is still whole. */
function Side({
  faction,
  side,
  label,
  lost,
}: {
  faction: PlayableFaction;
  side: BattleSide;
  label: string;
  lost: number;
}) {
  const whole = side.whole > 0 ? side.left / side.whole : 0;
  return (
    <div className={`tally__side tally__side--${faction}`}>
      <FactionCrest faction={faction} size={34} />
      <div className="tally__body">
        <div className="tally__name">{label}</div>
        <div className="tally__row">
          <ShipIcon role="medium" size={16} />
          <span>
            <b>{side.hulls}</b> {side.hulls === 1 ? 'hull' : 'hulls'} · <b>{side.guns}</b> guns
          </span>
        </div>
        {/* Condition, because hull count alone hides the thing that decides the
            next round: three hulls at a quarter each is not three hulls. */}
        <div className="bar battle__cond">
          <div className="bar__fill" style={{ width: `${Math.round(whole * 100)}%` }} />
        </div>
        <div className={`tally__row${lost > 0 ? ' tally__row--loss' : ''}`}>
          {lost > 0 ? (
            <span>
              <b>{lost}</b> {lost === 1 ? 'hull' : 'hulls'} lost
            </span>
          ) : (
            <span className="muted">Nothing lost</span>
          )}
        </div>
      </div>
    </div>
  );
}

function lostBy(view: BattleView, faction: PlayableFaction): number {
  return view.last ? view.last[faction] : 0;
}

function roundLine(view: BattleView, me: PlayableFaction, them: PlayableFaction): string {
  const last = view.last!;
  if (last[me] === 0 && last[them] === 0) {
    return last.hurt > 0
      ? `Shot traded and nothing sunk: ${last.hurt} taken across the water.`
      : 'Shot traded, and neither side has anything to show for it.';
  }
  const tell = (n: number) => `${n} ${n === 1 ? 'hull' : 'hulls'}`;
  return `That broadside: you lose ${tell(last[me])}, the ${factionData[them].shortName} ${tell(last[them])}.`;
}

/** What the sheet says once it is over. */
function verdict(view: BattleView, outcome: BattleOutcome, them: PlayableFaction): string {
  const where = view.system.name;
  switch (outcome) {
    case 'won':
      return `The water off ${where} is yours. What was flying their colours is on the bottom or gone.`;
    case 'lost':
      return `Nothing of yours is left afloat off ${where}.`;
    case 'they-fled':
      return `The ${factionData[them].shortName} has had enough and is running. ${where} is yours to lie off.`;
    case 'you-fled':
      return `You are away and standing for the nearest island of yours. They keep ${where}.`;
    case 'beast-slain':
      return `${view.beast?.name ?? 'The creature'} is killed off ${where}. The water there is only water now.`;
  }
}

function ordinal(n: number): string {
  const names = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth'];
  return names[n - 1] ?? `${n}th`;
}
