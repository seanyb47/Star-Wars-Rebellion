import { useRef, useState } from 'react';
import factionData from '../data/factions.json';
import terms from '../data/terms.json';
import { perFortnight, SPEED_LABEL, SPEED_ORDER, type GameState, type Speed } from '../sim';
import { FactionCrest } from './art';
import { paintedIsland } from './painted';

const RUNNING_SPEEDS: Speed[] = SPEED_ORDER.filter((s) => s !== 'paused');

/** Little visual meter for the current speed: ▸ ▸▸ ▸▸▸ ▸▸▸▸ */
function speedDots(speed: Speed): string {
  const index = RUNNING_SPEEDS.indexOf(speed);
  return index < 0 ? '॥' : '▸'.repeat(index + 1);
}

/** The painting behind each side's banner: the Crown's seat, the rebels' harbor. */
const BANNER: Record<'empire' | 'alliance', string> = {
  empire: 'port-city',
  alliance: 'free-harbor',
};

function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="var(--metal)" stroke="var(--metal-lo)" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="var(--metal-lo)" strokeWidth="0.9" opacity="0.7" />
      <path d="M12 7.5v9M9.6 10.2c0-1.3 1-2 2.4-2s2.4.7 2.4 1.8c0 2.2-4.8 1.6-4.8 3.9 0 1.2 1 1.9 2.4 1.9s2.4-.7 2.4-2" fill="none" stroke="var(--metal-lo)" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function LedgerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M6 4h10a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2z" fill="#3b2a1a" stroke="var(--metal)" strokeWidth="1.2" />
      <path d="M8 4v14" stroke="var(--metal)" strokeWidth="1" opacity="0.7" />
      <path d="M10.5 9h5M10.5 12h5M10.5 15h3" stroke="var(--metal-hi)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M12 3.5l1.6 2.2 2.6-.7.7 2.6 2.2 1.6-1.4 2.3 1.4 2.3-2.2 1.6-.7 2.6-2.6-.7L12 20.5l-1.6-2.2-2.6.7-.7-2.6-2.2-1.6 1.4-2.3-1.4-2.3 2.2-1.6.7-2.6 2.6.7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/**
 * The encyclopedia, on the rail beside the clock.
 *
 * Sean: *"add to the utility panel an encyclopedia that has info and stats on
 * all units... so a player can pause the game if they want and research."* It
 * was reachable only through the menu, which is where you go to quit, not to
 * look something up mid-war.
 */
/**
 * Two bars, or a triangle.
 *
 * Sean, 17 September: *"How do I pause game? I see speed but we need a pause
 * button next to it."* Pausing was a 450ms hold on the speed button and had
 * been since the clock was built — which is a gesture nobody discovers, and
 * the one control a strategy game must never hide. The speed button still
 * cycles and still holds to pause; this is the same thing said out loud.
 */
function PauseIcon({ paused }: { paused: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
      {paused ? (
        <path d="M8 5.5v13l11-6.5z" />
      ) : (
        <>
          <rect x="7.5" y="5.5" width="3.6" height="13" rx="1" />
          <rect x="12.9" y="5.5" width="3.6" height="13" rx="1" />
        </>
      )}
    </svg>
  );
}

/** An eye: shut while you are playing, open while you are watching. */
function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      {open ? (
        <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.3" />
      ) : (
        <path d="M4 4l16 16" />
      )}
    </svg>
  );
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z" fill="currentColor" fillOpacity="0.25" />
      {on ? <path d="M15 9.2a4 4 0 0 1 0 5.6M17.6 6.8a7.5 7.5 0 0 1 0 10.4" /> : <path d="M15 9l5 6M20 9l-5 6" />}
    </svg>
  );
}

export function TopBar({
  state,
  autoPaused,
  soundOn,
  onToggleSound,
  onSetSpeed,
  onToggleObserving,
  onOpenMenu,
}: {
  state: GameState;
  autoPaused: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  onSetSpeed: (speed: Speed) => void;
  /** Hand your side to the opponent, or take it back. */
  onToggleObserving: () => void;
  onOpenMenu: () => void;
}) {
  const longPress = useRef<{ timer: number; fired: boolean }>({ timer: 0, fired: false });
  /* What the first tap on a paused clock starts at, and what a hold-to-pause
     comes back to. Medium, not Slow: a day is thirty seconds there against
     seventy-five, and the first minute of a new game should not be spent
     watching a date that has not changed yet. */
  const last = useRef<Speed>('medium');
  const faction = state.factions[state.player];
  const side = factionData[state.player];
  const net = faction.income - faction.upkeep;
  const [purseOpen, setPurseOpen] = useState(false);
  const banner = paintedIsland(BANNER[state.player]);

  const cycle = () => {
    if (state.speed === 'paused') {
      onSetSpeed(last.current);
      return;
    }
    const next = RUNNING_SPEEDS[(RUNNING_SPEEDS.indexOf(state.speed) + 1) % RUNNING_SPEEDS.length];
    last.current = next;
    onSetSpeed(next);
  };

  const startPress = () => {
    longPress.current.fired = false;
    longPress.current.timer = window.setTimeout(() => {
      longPress.current.fired = true;
      if (state.speed !== 'paused') last.current = state.speed;
      onSetSpeed('paused');
    }, 450);
  };
  const endPress = () => {
    window.clearTimeout(longPress.current.timer);
    if (!longPress.current.fired) cycle();
  };

  const running = state.speed !== 'paused' && !autoPaused && !state.winner;
  const observing = Boolean(state.observing);

  return (
    <header className="topbar">
      {/* The banner: the side's painting, crest, name and creed, and the day. */}
      <div className="banner" style={banner ? { backgroundImage: `url(${banner})` } : undefined}>
        <div className="banner__scrim" />
        <div className="banner__crest">
          <FactionCrest faction={state.player} size={40} />
        </div>
        <div className="banner__text">
          <div className="banner__name">{side.name}</div>
          <div className="banner__creed">{side.creed}</div>
        </div>
        <div className="banner__day" aria-label={`Day ${state.day}`}>
          <span className="banner__daylabel">Day</span>
          <b>{state.day}</b>
        </div>
      </div>

      {/* The console: the ledger and the clock, on a wooden rail. */}
      <div className="console">
        {/*
          * Four figures, not two.
          *
          * Sean, 20 September: *"there should be, like, how much you actually
          * have in gold. Then next to it should probably be your gold per day
          * rating. And then there should also be a maintenance per day. And
          * then there should probably be a delta next to that."* And the
          * reason, which is the part that decides the layout: *"if I was a
          * player managing my economy and deciding, do I want to use available
          * land to produce more income or build stuff that is going to make me
          * more — that decision should largely be based on what's my
          * maintenance deficit."*
          *
          * So the delta is the last thing on the rail and the one thing given
          * a colour, because it is the figure the decision actually turns on.
          * The two rates are per day and are read at the fortnightly
          * settlement, so they hold still between one and the next.
          */}
        {/*
          * Gold, the delta, and everything else behind a tap.
          *
          * Sean, 21 September: *"This section needs cleaning up. ui is
          * awkward. Let's make it just show gold and the delta next to it.
          * Then click on the gold and it expands into Available Gold / Upkeep
          * Cost / Production / Surplus-Deficit."*
          *
          * The old rail was two plaques and four figures — GOLD, IN, OUT,
          * CLEAR — all shouting at once on a 393px phone, and only one of them
          * answers the question a player actually has at a glance. That is the
          * delta, by his own reasoning: *"do I want to use available land to
          * produce more income or build stuff... that decision should largely
          * be based on what's my maintenance deficit."*
          *
          * So the rail is what you have and which way it is going. The
          * breakdown is one tap away, and only there because the numbers
          * behind a delta are worth reading *sometimes* — not every second of
          * every day at the top of the screen.
          *
          * `Production` rather than Income or Earnings, at his ruling the same
          * day: one word per idea, and the chart filter already had it.
          */}
        <button
          className={`plaque plaque--gold plaque--tap${purseOpen ? ' plaque--open' : ''}`}
          onClick={() => setPurseOpen((was) => !was)}
          aria-expanded={purseOpen}
          aria-label={`${Math.floor(faction.gold)} ${terms.gold.toLowerCase()}, ${
            net >= 0 ? 'a surplus of' : 'a deficit of'
          } ${Math.abs(perFortnight(net))} a fortnight. Tap for the breakdown.`}
        >
          <CoinIcon />
          <span className="plaque__text">
            <span className="plaque__label">{terms.gold}</span>
            <b>{Math.floor(faction.gold)}</b>
          </span>
          <span className={`purse__delta${net < 0 ? ' purse__delta--short' : ''}`}>
            {net >= 0 ? '+' : '−'}
            {Math.abs(perFortnight(net))}
          </span>
        </button>
        <span className="topbar__spacer" />
        <button
          className={`speed${running ? ' speed--running' : ''}`}
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerLeave={() => window.clearTimeout(longPress.current.timer)}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={`Speed: ${SPEED_LABEL[state.speed]}. Tap to cycle, hold to pause.`}
        >
          <span className="speed__dots">{speedDots(state.speed)}</span>
          <span>{autoPaused && state.speed !== 'paused' ? 'Held' : SPEED_LABEL[state.speed]}</span>
        </button>
        {/* And the pause, its own button, right of the clock. It shows what
            the next tap does rather than what the clock is doing: two bars
            while the day is moving, a triangle while it is not. Coming off a
            pause returns to the speed you were last running at, which is the
            same memory the hold-to-pause gesture uses. */}
        <button
          className={`iconbtn${state.speed === 'paused' ? ' iconbtn--on' : ''}`}
          onClick={() => {
            if (state.speed === 'paused') {
              onSetSpeed(last.current);
              return;
            }
            last.current = state.speed;
            onSetSpeed('paused');
          }}
          aria-pressed={state.speed === 'paused'}
          aria-label={state.speed === 'paused' ? 'Start the clock' : 'Pause the clock'}
          title={state.speed === 'paused' ? 'Start the clock' : 'Pause'}
        >
          <PauseIcon paused={state.speed === 'paused'} />
        </button>
        {/* Right of the clock, as asked. The one control that is still yours
            while observing is the clock, so the switch belongs beside it. */}
        <button
          className={`iconbtn${observing ? ' iconbtn--watching' : ''}`}
          onClick={onToggleObserving}
          aria-pressed={observing}
          aria-label={observing ? 'Take your side back' : 'Watch the machine play both sides'}
          title={observing ? 'Take your side back' : 'Observe: hand your side over and watch'}
        >
          <EyeIcon open={observing} />
        </button>
        <button
          className={`iconbtn${soundOn ? ' iconbtn--on' : ''}`}
          onClick={onToggleSound}
          aria-pressed={soundOn}
          aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
        >
          <SoundIcon on={soundOn} />
        </button>
        <button className="iconbtn" onClick={onOpenMenu} aria-label="Menu">
          <GearIcon />
        </button>
      </div>
      {/* The four figures, once asked for. A fortnight of each, because
          that is the span the ledger settles in and the span the delta
          above is in — a breakdown in a different unit from the figure it
          breaks down would be worse than no breakdown. */}
      {purseOpen && (
        <div className="purse" role="region" aria-label="The books">
          <div className="purse__row">
            <LedgerIcon />
            <span className="purse__name">Available {terms.gold.toLowerCase()}</span>
            <b>{Math.floor(faction.gold)}</b>
          </div>
          <div className="purse__row">
            <span className="purse__name">{terms.income}</span>
            <b className="purse__earn">+{perFortnight(faction.income)}</b>
          </div>
          <div className="purse__row">
            <span className="purse__name">{terms.upkeep}</span>
            <b className="purse__cost">−{perFortnight(faction.upkeep)}</b>
          </div>
          <div className="purse__row purse__row--net">
            <span className="purse__name">{net >= 0 ? 'Surplus' : 'Deficit'}</span>
            <b className={net < 0 ? 'purse__cost' : 'purse__earn'}>
            {net >= 0 ? '+' : '−'}
            {Math.abs(perFortnight(net))}
            </b>
          </div>
        </div>
      )}
    </header>
  );
}
