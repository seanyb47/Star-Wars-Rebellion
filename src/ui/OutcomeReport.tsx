import factionData from '../data/factions.json';
import type { DamageRow, ForceTally, Ledger, OperationReport, PersonRow, Verdict } from '../sim';
import { shipClass, VERDICT_WORD } from '../sim';
import { AssaultScene, FactionCrest, ShipThumb, SiegeScene } from './art';
import { EventScene } from './EventScene';

/**
 * What an operation came to, laid out three different ways.
 *
 * Sean's combat outcome specification, and the sentence that decides
 * everything here: *"LOSS and DRAW must have their own presentation logic, not
 * simply be the same screen with the word changed."*
 *
 * So the three do not share an order. A **victory** reads down the page the
 * way his §2 lays it out — what you brought, what they brought, who came
 * through it, what it settled. A **defeat** leads with the player's own losses,
 * because *"the player's losses should be presented first: they are the most
 * important consequence"*, and the figure that matters is drawn large instead
 * of sitting in a row of four. A **draw** leads with the thing a draw actually
 * is — *"no decisive control established"* — above any tally at all, because a
 * screen that opens with butcher's bills invites the player to add them up and
 * decide who won, which is exactly the reading a draw has to refuse.
 *
 * Under all three, the same rule from §13: the word at the top describes the
 * fighting and nothing else. Losses, people, control and politics are reported
 * as facts beside it, and where the word and the facts pull apart the sheet
 * says so in a line rather than letting the headline lie by omission.
 */
export function OutcomeReport({ report }: { report: OperationReport }) {
  const { verdict } = report;
  return (
    <div className={`outcome outcome--${verdict} outcome--${report.kind}`}>
      <div className="outcome__head">
        <span className="outcome__op">{report.operation}</span>
        <span className="outcome__where">{report.title}</span>
      </div>

      {/* The illustration is the first thing that tells a player which of the
          three this is, before a word is read. Each verdict gets its own
          scene — a victory's is the action, a defeat's and a draw's are the
          aftermath — which is §3's *"subdued aftermath illustration"* and §4's
          *"ambiguous aftermath: smoke, fleets separating, neither side clearly
          dominant"* done with what the game has. */}
      {/*
        A siege gets its own picture, and it is the picture that tells you what
        happened. Sean, 21 September: *"a thumbnail that is either a picture of
        the place that looks peaceful or a picture of a place that looks like
        bombarded. If you get the peaceful screen, then you know that you
        weren't successful."* So the bombardment scene reads the island rather
        than the verdict, and an assault gets a generic beach because the
        fighting looks the same whoever won it.
      */}
      {report.kind === 'bombardment' ? (
        <SiegeScene
          seed={report.systemId}
          hit={report.damage.some((r) => !r.civilian && /beaten|broken/i.test(r.label) && r.value > 0)}
          faction={report.ledger?.[0]?.faction ?? 'neutral'}
          height={84}
        />
      ) : report.kind === 'assault' ? (
        <AssaultScene seed={report.systemId} height={84} />
      ) : (
        <EventScene
          kind={verdict === 'victory' ? 'battle' : verdict === 'defeat' ? 'loss' : 'war'}
          tint={`var(--outcome)`}
          seed={`${report.systemId}-${verdict}`}
          height={84}
        />
      )}

      <div className="outcome__verdict">{report.headline || VERDICT_WORD[verdict]}</div>

      {/* §13, and the only line on the screen that is an opinion. It appears
          when the word and the consequences disagree and is absent otherwise,
          because a sheet that always editorialises is a sheet nobody reads. */}

      {/*
        A draw says what it is before it says what it cost.

        This is the structural difference §4 asks for, not a re-tinted victory.
        A draw's first fact is that nothing was settled; putting two columns of
        losses above that invites the player to total them and award somebody
        the win, which is the one reading the screen exists to prevent.
      */}
      {verdict === 'draw' && <Strategic report={report} lead />}

      {report.mine && (
        <Force
          tally={report.mine}
          mine
          /* A defeat draws the loss large. §3: *"the loss figure should be
             visually prominent."* On a victory the same number is one of
             four, because on a victory it is not the news. */
          hero={verdict === 'defeat' ? 'destroyed' : undefined}
        />
      )}
      {report.theirs && <Force tally={report.theirs} />}

      {report.ledger && report.ledger.length > 0 && <Standing ledger={report.ledger} />}
      {report.damage.length > 0 && <Damage rows={report.damage} />}

      {/* §2: *"only show this section when personnel status is relevant."* */}
      {report.people.length > 0 && <People rows={report.people} verdict={verdict} />}

      {report.control && (
        <div className="outcome__block">
          <div className="section-title">Control</div>
          <p className="outcome__control">{report.control}</p>
        </div>
      )}

      {verdict !== 'draw' && <Strategic report={report} />}

      {/* §2: *"the political consequences should be displayed only when
          something actually changed."* An empty list draws nothing — including
          on a draw, which §4 is careful to say is *not* automatically
          politically neutral, only sometimes so. */}
      {report.political.length > 0 && <Political report={report} />}
    </div>
  );
}

/** One side's four figures, and what is left of it. */
function Force({
  tally,
  mine,
  hero,
}: {
  tally: ForceTally;
  mine?: boolean;
  hero?: 'destroyed';
}) {
  return (
    <div className={`outcome__block outcome__force${mine ? ' outcome__force--mine' : ''}`}>
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        <FactionCrest faction={tally.faction} size={22} />
        <b className="outcome__force-name">{tally.name}</b>
      </div>

      {hero === 'destroyed' ? (
        <>
          <div className="outcome__hero">
            <b>{tally.destroyed}</b>
            <span>
              {tally.destroyed === 1 ? 'lost' : 'lost'} of {tally.committed}
            </span>
          </div>
          <div className="outcome__figs outcome__figs--rest">
            <Fig label="Damaged" value={tally.damaged} />
            <Fig label="Still afloat" value={tally.surviving} />
          </div>
        </>
      ) : (
        <div className="outcome__figs">
          <Fig label="Committed" value={tally.committed} />
          <Fig label="Destroyed" value={tally.destroyed} bad={tally.destroyed > 0 && mine} />
          <Fig label="Damaged" value={tally.damaged} />
          <Fig label="Surviving" value={tally.surviving} />
        </div>
      )}

      {/* §2: *"show surviving ships as individual game thumbnails."* What came
          through it, rather than a number that came through it. */}
      {tally.roster.length > 0 && (
        <div className="outcome__hulls">
          {tally.roster.map((row) => (
            <span key={row.classId} className="outcome__hull" title={shipClass(row.classId).name}>
              <ShipThumb
                faction={tally.faction}
                role={shipClass(row.classId).role}
                cls={row.classId}
                size={34}
              />
              {row.count > 1 && <span className="outcome__hull-n">×{row.count}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Fig({ label, value, bad }: { label: string; value: number; bad?: boolean }) {
  return (
    <span className={`outcome__fig${bad ? ' outcome__fig--bad' : ''}`}>
      <b>{value}</b>
      <span className="tiny muted">{label}</span>
    </span>
  );
}

/**
 * The damage table, with military and civilian kept apart.
 *
 * §5: *"the political consequences must clearly distinguish military targets
 * from civilian infrastructure."* They are priced completely differently by
 * the political rules — one is a small credit, the other is the only thing in
 * the game the whole world hears about — so they are never in the same column.
 */
/**
 * What is still there, and what is not.
 *
 * Sean asked for it in those words — *"two columns, right? What's still there
 * and what blew up"* — and the shape is worth keeping literal. One block per
 * side, two columns each, and a column that is empty says so in a word rather
 * than being left blank, because a blank column reads as missing data and
 * "Nothing" reads as good news or bad depending on which side you are.
 */
function Standing({ ledger }: { ledger: Ledger[] }) {
  return (
    <div className="outcome__block">
      {ledger.map((side) => (
        <div key={side.side} style={{ marginBottom: 10 }}>
          <div className="section-title">{side.side}</div>
          <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
            {(
              [
                ['Still standing', side.standing],
                ['Destroyed', side.lost],
              ] as const
            ).map(([title, rows]) => (
              <div key={title} style={{ flex: 1, minWidth: 0 }}>
                <div className="tiny muted" style={{ marginBottom: 2 }}>
                  {title}
                </div>
                {rows.length === 0 ? (
                  <div className="tiny">Nothing</div>
                ) : (
                  rows.map((row) => (
                    <div key={row.label} className="outcome__row">
                      <span className="muted">{row.label}</span>
                      <b>{row.count}</b>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Damage({ rows }: { rows: DamageRow[] }) {
  const military = rows.filter((r) => !r.civilian);
  const civilian = rows.filter((r) => r.civilian);
  return (
    <div className="outcome__block">
      <div className="section-title">Military damage</div>
      <div className="outcome__rows">
        {military.map((row) => (
          <div key={row.label} className="outcome__row">
            <span className="muted">{row.label}</span>
            <b>{row.value}</b>
          </div>
        ))}
      </div>
      {civilian.length > 0 && (
        <>
          <div className="section-title">Civilian damage</div>
          <div className="outcome__rows">
            {civilian.map((row) => (
              <div
                key={row.label}
                className={`outcome__row${row.value > 0 ? ' outcome__row--civilian' : ''}`}
              >
                <span className="muted">{row.label}</span>
                <b>{row.value > 0 ? 'Yes' : 'None'}</b>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const FATE_WORD: Record<PersonRow['fate'], string> = {
  survived: 'Survived',
  escaped: 'Got away',
  wounded: 'Wounded',
  captured: 'Taken',
  lost: 'Lost',
};

/**
 * Who came through it.
 *
 * §3: *"if a commander was killed, captured, or otherwise removed from the
 * strategic map, that result should be prominently displayed."* Anybody taken
 * is drawn apart from the list rather than in it, because a name in a row of
 * names reads as a footnote and losing an officer is not a footnote.
 */
function People({ rows, verdict }: { rows: PersonRow[]; verdict: Verdict }) {
  const gone = rows.filter((r) => r.grave);
  const rest = rows.filter((r) => !r.grave);
  return (
    <div className="outcome__block">
      <div className="section-title">{verdict === 'draw' ? 'Aboard' : 'Crew'}</div>
      {gone.map((row) => (
        <div key={row.id} className="outcome__gone">
          <b>{row.name}</b>
          <span>{FATE_WORD[row.fate]}</span>
        </div>
      ))}
      <div className="outcome__rows">
        {rest.map((row) => (
          <div key={row.id} className="outcome__row">
            <span>{row.name}</span>
            <b className="tiny muted">{FATE_WORD[row.fate]}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

/** What it settled, and what it did not. */
function Strategic({ report, lead }: { report: OperationReport; lead?: boolean }) {
  return (
    <div className={`outcome__block${lead ? ' outcome__block--lead' : ''}`}>
      <div className="section-title">
        {report.verdict === 'draw' ? 'Nothing settled' : 'What it settled'}
      </div>
      <ul className="outcome__bullets">
        {report.strategic.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Island by island, and only what moved.
 *
 * The one place in the game a political figure is shown at all, and it is a
 * *change* rather than a standing — Sean's §19 forbids the formula and his §2
 * asks for exactly this table. Rounded to a point, because the underlying
 * number has three decimal places and none of them are anybody's business.
 */
function Political({ report }: { report: OperationReport }) {
  const rows = report.political
    .map((r) => ({ ...r, shown: Math.round(r.delta) }))
    .filter((r) => r.shown !== 0)
    .sort((a, b) => Math.abs(b.shown) - Math.abs(a.shown));
  if (rows.length === 0) return null;
  return (
    <div className="outcome__block">
      <div className="section-title">
        {report.kind === 'bombardment' ? 'Political consequences' : 'Allegiance'}
      </div>
      <div className="outcome__rows">
        {rows.map((row) => (
          <div key={row.systemId} className="outcome__row">
            <span className="muted">
              {row.name}
              {row.epicentre ? '' : ' · heard of it'}
            </span>
            <b className={row.shown > 0 ? 'outcome__up' : 'outcome__down'}>
              {row.shown > 0 ? '+' : '−'}
              {Math.abs(row.shown)} {factionData[row.faction].shortName}
            </b>
          </div>
        ))}
      </div>
    </div>
  );
}
