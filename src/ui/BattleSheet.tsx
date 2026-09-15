import {
  BATTLE_ODDS_LABEL,
  battleView,
  shipClass,
  type BattleHulls,
  type BattleSide,
  type BattleView,
} from '../sim';
import factionData from '../data/factions.json';
import { EventScene } from './EventScene';
import { FactionCrest, ShipThumb } from './art';
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
 *
 * Both sides are laid out in full, hull by hull, with who is handling them and
 * what is aboard. "Two hulls, sixty guns" and "two ships of the line" are the
 * same fact, and only one of them tells you that breaking off is the sensible
 * thing to do — which is the decision this sheet exists to put in front of the
 * player.
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
      <div
        className="dispatch dispatch--battle"
        role="dialog"
        aria-label={`Action off ${view.system.name}`}
      >
        <div className="dispatch__head">
          <span className="dispatch__title">Action off {view.system.name}</span>
          <span className="tiny muted">{ordinal(view.rounds)} broadside</span>
        </div>

        {/* The one scrolling part. Head and foot are pinned, so the two words
            of assessment and the two buttons are always on the screen however
            many hulls are in the water. */}
        <div className="battle__body">
          <EventScene kind="battle" tint={`var(--${me})`} seed={view.system.id} height={92} />

          {/* Two words, before any of the arithmetic. A player who has to add
              up columns of guns to decide whether to run is being handed sums
              instead of a decision. */}
          <div className={`odds odds--${view.odds}`}>{BATTLE_ODDS_LABEL[view.odds]}</div>

          <Side
            faction={me}
            side={view.mine}
            label="Yours"
            lost={view.last ? view.last[me] : 0}
            shore={view.shoreIsMine ? view.shore : 0}
          />
          <Side
            faction={them}
            side={view.theirs}
            label={factionData[them].shortName}
            lost={view.last ? view.last[them] : 0}
            shore={view.shoreIsMine ? 0 : view.shore}
          />

          {view.beast && (
            <div className="battle__side battle__side--beast">
              <div className="battle__side-head">
                <b className="battle__side-name">{view.beast.name}</b>
                <span className="battle__side-sum">
                  <b>{view.beast.guns}</b> guns · nobody's
                </span>
              </div>
              <div className="tiny battle__note">
                {view.beast.damage > 0
                  ? `${view.beast.damage} of ${view.beast.hull} in it, and it is firing on both of you.`
                  : 'Not a mark on it yet, and it is firing on both of you.'}
              </div>
            </div>
          )}

          {view.last && !view.settled && (
            <p className="tiny muted battle__line">{roundLine(view, me, them)}</p>
          )}

          {view.settled && (
            <p className="dispatch__text serif battle__verdict">
              {verdict(view, view.settled, them)}
            </p>
          )}

          {!view.settled && view.fleeable.length === 0 && (
            <p className="tiny muted battle__line">
              No breaking off:{' '}
              {(view.fleeBlockedBecause ?? 'there is nowhere to run to.').toLowerCase()}
            </p>
          )}
        </div>

        {view.settled ? (
          <div className="dispatch__foot">
            <span className="tiny muted">Day {state.day}</span>
            <button className="btn btn--primary" onClick={onClose}>
              Very well
            </button>
          </div>
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
      </div>
    </>
  );
}

/**
 * One side's board: the totals, then every hull it has, then who is handling
 * it and what is aboard.
 */
function Side({
  faction,
  side,
  label,
  lost,
  shore,
}: {
  faction: PlayableFaction;
  side: BattleSide;
  label: string;
  lost: number;
  /** Harbor guns firing for this side, if any. */
  shore: number;
}) {
  const whole = side.whole > 0 ? side.left / side.whole : 0;
  return (
    <div className={`battle__side battle__side--${faction}`}>
      <div className="battle__side-head">
        <FactionCrest faction={faction} size={24} />
        <b className="battle__side-name">{label}</b>
        <span className="battle__side-sum">
          <b>{side.hulls}</b> {side.hulls === 1 ? 'hull' : 'hulls'} · <b>{side.guns}</b> guns
        </span>
      </div>

      {/* Condition, because a hull count hides the thing that decides the next
          round: three hulls at a quarter each are not three hulls. */}
      <div className="bar battle__cond">
        <div className="bar__fill" style={{ width: `${Math.round(whole * 100)}%` }} />
      </div>

      {side.roster.length > 0 ? (
        <div className="battle__roster">
          {side.roster.map((row) => (
            <HullRow key={row.classId} faction={faction} row={row} />
          ))}
        </div>
      ) : (
        <div className="tiny muted battle__note">Nothing left afloat here.</div>
      )}

      <div className="battle__notes">
        {shore > 0 && (
          <span className="tiny battle__note">
            Harbor guns <b>{shore}</b>
          </span>
        )}
        {side.officers.length > 0 && (
          <span className="tiny battle__note">
            {side.officers[0].name}
            {side.officers.length > 1 ? ` +${side.officers.length - 1}` : ''} · leadership{' '}
            <b>{side.officers[0].leadership}</b>
            {side.edge > 1.01 ? ` (+${Math.round((side.edge - 1) * 100)}%)` : ''}
          </span>
        )}
        {side.troops > 0 && (
          <span className="tiny battle__note">
            <b>{side.troops}</b> {side.troops === 1 ? 'company' : 'companies'} aboard
          </span>
        )}
        {lost > 0 && (
          <span className="tiny battle__note battle__loss">
            <b>{lost}</b> lost
          </span>
        )}
      </div>
    </div>
  );
}

/** One class of hull, however many of them are in the water. */
function HullRow({ faction, row }: { faction: PlayableFaction; row: BattleHulls }) {
  const cls = shipClass(row.classId);
  const hurt = row.whole - row.left;
  return (
    <div className="battle__hull">
      <ShipThumb faction={faction} role={cls.role} size={24} />
      <span className="battle__hull-name">
        {row.count > 1 && <b>{row.count}× </b>}
        {cls.name}
      </span>
      <span className="battle__hull-stats">
        <span className={hurt > 0 ? 'battle__hurt' : undefined}>
          {row.left}/{row.whole}
        </span>
        <span className="muted"> hull · </span>
        {row.guns}
        <span className="muted"> guns</span>
      </span>
    </div>
  );
}

function roundLine(view: BattleView, me: PlayableFaction, them: PlayableFaction): string {
  const last = view.last!;
  if (last[me] === 0 && last[them] === 0) {
    return last.hurt > 0
      ? `Shot traded and nothing sunk: ${last.hurt} taken across the water.`
      : 'Shot traded, and neither side has anything to show for it.';
  }
  const tell = (n: number) => `${n} ${n === 1 ? 'hull' : 'hulls'}`;
  return `That broadside: you lose ${tell(last[me])}, the ${factionData[them].shortName} ${tell(
    last[them],
  )}.`;
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
