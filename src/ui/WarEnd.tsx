import factionData from '../data/factions.json';
import terms from '../data/terms.json';
import type { GameState, WarReport, WarSide } from '../sim';
import { FactionCrest } from './art';
import { EventScene } from './EventScene';
import { Coin } from './components';

/**
 * The closing screen, stacked the way Sean asked for it.
 *
 * *"Both, stacked"* — the dispatch first, in the world's voice, then the
 * figures, then the lines that decided it. The three do different jobs and
 * the order is the argument: a player wants to be told they won before they
 * are shown a table, and wants the table before they are shown the evidence.
 *
 * This replaced one line of text over the chart. Everything on it is read off
 * `warReport`, which lives in the sim, because what decided a war is a fact
 * about the war and not about the screen it is printed on.
 */
export function WarEnd({ state, report }: { state: GameState; report: WarReport }) {
  const you = state.player;
  const them = you === 'empire' ? 'alliance' : 'empire';
  const won = report.outcome === 'victory';

  return (
    <div className={`warend warend--${report.outcome}`}>
      <EventScene
        kind={won ? 'battle' : 'loss'}
        tint="var(--warend)"
        seed={`warend-${report.winner}-${report.days}`}
        height={96}
      />

      <div className="warend__word">{won ? 'Victory' : 'Defeat'}</div>
      <p className="warend__dispatch serif">{report.dispatch}</p>
      <p className="warend__how tiny muted">
        {report.how} Day {report.days}.
      </p>

      <div className="section-title">What each side had left</div>
      <div className="warend__ledger">
        <div className="warend__names">
          <span />
          <span className="warend__col">
            <FactionCrest faction={you} size={20} />
            <b>{factionData[you].shortName}</b>
          </span>
          <span className="warend__col">
            <FactionCrest faction={them} size={20} />
            <b>{factionData[them].shortName}</b>
          </span>
        </div>
        <Line label={terms.islands} yours={report.sides[you]} theirs={report.sides[them]} pick={(s) => s.islands} />
        <Line label="Hulls" yours={report.sides[you]} theirs={report.sides[them]} pick={(s) => s.hulls} />
        <Line label={terms.troops} yours={report.sides[you]} theirs={report.sides[them]} pick={(s) => s.troops} />
        <Line
          label={terms.gold}
          yours={report.sides[you]}
          theirs={report.sides[them]}
          pick={(s) => s.gold}
          coin
        />
        <Line
          label="Craft"
          yours={report.sides[you]}
          theirs={report.sides[them]}
          pick={(s) => s.craft}
          render={(n) => (n === 0 ? '—' : `Grade ${n}`)}
        />
        <Line label={terms.crew} yours={report.sides[you]} theirs={report.sides[them]} pick={(s) => s.crew} />
        {/* Whose cells, not whose irons: the figure under a side is how many
            of the *other* side it is holding, and "In irons" read as the
            reverse on a screen where every other row is what that side has. */}
        <Line
          label="Prisoners held"
          yours={report.sides[you]}
          theirs={report.sides[them]}
          pick={(s) => s.captives}
        />
      </div>

      {report.deciding.length > 0 && (
        <>
          <div className="section-title">What decided it</div>
          <div className="stack">
            {report.deciding.map((line, i) => (
              <div className="card warend__line" key={line.eventId ?? `${line.day}-${i}`}>
                <span className="tiny muted warend__day">Day {line.day}</span>
                <span className="serif">{line.text}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Line({
  label,
  yours,
  theirs,
  pick,
  render,
  coin,
}: {
  label: string;
  yours: WarSide;
  theirs: WarSide;
  pick: (side: WarSide) => number;
  render?: (n: number) => string;
  coin?: boolean;
}) {
  const a = pick(yours);
  const b = pick(theirs);
  const show = (n: number) => (render ? render(n) : String(n));
  return (
    <div className="warend__row">
      <span className="tiny muted">{label}</span>
      {/* The winning column of each pair is marked rather than coloured: a
          screen that is already green or red all over cannot spend its accent
          on seven rows of it. A tie marks neither. */}
      <span className={`warend__cell${a > b ? ' warend__cell--up' : ''}`}>
        {coin && <Coin />}
        {show(a)}
      </span>
      <span className={`warend__cell${b > a ? ' warend__cell--up' : ''}`}>
        {coin && <Coin />}
        {show(b)}
      </span>
    </div>
  );
}
