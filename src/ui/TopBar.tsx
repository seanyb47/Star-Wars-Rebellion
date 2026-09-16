import { useRef } from 'react';
import factionData from '../data/factions.json';
import terms from '../data/terms.json';
import { SPEED_LABEL, SPEED_ORDER, type GameState, type Speed } from '../sim';
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
function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.2c2.6-1 5.3-1 8 0v13.4c-2.7-1-5.4-1-8 0z" />
      <path d="M20 5.2c-2.6-1-5.3-1-8 0v13.4c2.7-1 5.4-1 8 0z" />
      <path d="M12 5.2v13.4" />
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
  onOpenAlmanac,
  onOpenMenu,
}: {
  state: GameState;
  autoPaused: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  onSetSpeed: (speed: Speed) => void;
  onOpenAlmanac: () => void;
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
        <div className="plaque plaque--gold">
          <CoinIcon />
          <span className="plaque__text">
            <span className="plaque__label">{terms.gold}</span>
            <b>{Math.floor(faction.gold)}</b>
          </span>
          <span className={`plaque__net${net < 0 ? ' plaque__net--over' : ''}`}>
            {net >= 0 ? '▲' : '▼'} {net >= 0 ? '+' : '−'}
            {Math.abs(net).toFixed(1)}
          </span>
        </div>
        <div className="plaque">
          <LedgerIcon />
          <span className="plaque__text">
            <span className="plaque__label">{terms.upkeep}</span>
            <b>{faction.upkeep}</b>
          </span>
        </div>
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
        <button className="iconbtn" onClick={onOpenAlmanac} aria-label="Encyclopedia">
          <BookIcon />
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
    </header>
  );
}
