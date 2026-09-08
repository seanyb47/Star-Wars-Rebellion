import { useRef } from 'react';
import { SPEED_LABEL, SPEED_ORDER, type GameState, type Speed } from '../sim';

const RUNNING_SPEEDS: Speed[] = SPEED_ORDER.filter((s) => s !== 'paused');

/** Little visual meter for the current speed: ▸ ▸▸ ▸▸▸ ▸▸▸▸ */
function speedDots(speed: Speed): string {
  const index = RUNNING_SPEEDS.indexOf(speed);
  return index < 0 ? '॥' : '▸'.repeat(index + 1);
}

export function TopBar({
  state,
  autoPaused,
  onSetSpeed,
  onOpenMenu,
}: {
  state: GameState;
  autoPaused: boolean;
  onSetSpeed: (speed: Speed) => void;
  onOpenMenu: () => void;
}) {
  const longPress = useRef<{ timer: number; fired: boolean }>({ timer: 0, fired: false });
  const last = useRef<Speed>('slow');
  const faction = state.factions[state.player];
  const overCapacity = faction.maintenanceUsed > faction.maintenanceCapacity;

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
      <div className="topbar__row">
        <div className="topbar__day">Day {state.day}</div>
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
        <button className="iconbtn" onClick={onOpenMenu} aria-label="Menu">
          ⋯
        </button>
      </div>
      <div className="topbar__stats">
        <span className="topbar__stat">
          Raw <b>{Math.floor(faction.raw)}</b>
        </span>
        <span className="topbar__stat">
          Refined <b>{Math.floor(faction.refined)}</b>
        </span>
        <span className={`topbar__stat${overCapacity ? ' topbar__stat--over' : ''}`}>
          Upkeep{' '}
          <b>
            {faction.maintenanceUsed}/{faction.maintenanceCapacity}
          </b>
        </span>
      </div>
    </header>
  );
}
