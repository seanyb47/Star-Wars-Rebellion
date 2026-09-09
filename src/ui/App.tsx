import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import factionData from '../data/factions.json';
import terms from '../data/terms.json';
import {
  SPEED_MS,
  advanceDay,
  cancelOrder,
  controlTally,
  loadGame,
  newGame,
  orderBuild,
  resolvePendingMission,
  saveGame,
  sendDiplomat,
  setSpeed,
  VICTORY_CONTROL_FRACTION,
  type BuildItem,
  type GameState,
  type PlayableFaction,
  type Speed,
} from '../sim';
import { Almanac } from './Almanac';
import { CharacterSheet } from './CharacterSheet';
import { CharactersScreen } from './CharactersScreen';
import { FeedScreen } from './FeedScreen';
import { GalaxyMap } from './GalaxyMap';
import { Narrator } from './Narrator';
import { ReachSheet } from './ReachSheet';
import { SeaSheet } from './SeaSheet';
import type { IslandTab } from './IslandRow';
import { SystemSheet } from './SystemSheet';
import { StartScreen } from './StartScreen';
import { TabBar, type Tab } from './TabBar';
import { TopBar } from './TopBar';
import { useAudio } from './useAudio';
import { FactionCrest } from './art';
import { ControlBadge, Sheet, Stat } from './components';

const SEEN_KEY = 'galactic-rebellion.lastSeenEvent.v1';

function readLastSeen(): number {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}

function eventOrder(id: string): number {
  return Number(id.split('-')[1]) || 0;
}

export function App() {
  // The game starts at the title, not mid-war: a save is only resumed when the
  // player asks for it, which is also what makes the autosave visible at all.
  // This has to be live state, not a snapshot taken at launch — otherwise a
  // game played and set down in this same session offers no way back into it.
  const [saved, setSaved] = useState<GameState | null>(() => loadGame());
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<GameState>(() => saved ?? newGame());
  const [tab, setTab] = useState<Tab>('galaxy');
  const [openSystemId, setOpenSystemId] = useState<string | null>(null);
  const [openSystemTab, setOpenSystemTab] = useState<IslandTab>('overview');
  const [openReachId, setOpenReachId] = useState<string | null>(null);
  const [openSea, setOpenSea] = useState<string | null>(null);
  const [openCharacterId, setOpenCharacterId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [worldsOpen, setWorldsOpen] = useState(false);
  const [narratorOpen, setNarratorOpen] = useState(false);
  const [almanacOpen, setAlmanacOpen] = useState(false);
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  const [focusSystemId, setFocusSystemId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState(readLastSeen);

  const decision = state.pendingDecisions[0] ?? null;
  // Spec 2: any modal or panel holds the clock; closing it resumes.
  const panelOpen =
    openSystemId !== null ||
    openCharacterId !== null ||
    openReachId !== null ||
    openSea !== null ||
    menuOpen ||
    worldsOpen ||
    narratorOpen ||
    almanacOpen ||
    decision !== null;

  // ---- The clock -------------------------------------------------------
  const running = started && !panelOpen && !state.winner && state.speed !== 'paused';
  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setState((current) =>
        current.speed === 'paused' || current.winner ? current : advanceDay(current),
      );
    }, SPEED_MS[state.speed]);
    return () => window.clearInterval(interval);
  }, [running, state.speed]);

  const sound = useAudio(state);

  // ---- Persistence -----------------------------------------------------
  const stateRef = useRef(state);
  stateRef.current = state;
  const startedRef = useRef(started);
  startedRef.current = started;
  useEffect(() => {
    if (!started) return;
    const timer = window.setTimeout(() => saveGame(state), 600);
    return () => window.clearTimeout(timer);
  }, [state, started]);
  useEffect(() => {
    const flush = () => {
      if (startedRef.current) saveGame(stateRef.current);
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);

  // ---- Unread feed badge ----------------------------------------------
  const newestEvent = state.events.length ? eventOrder(state.events.at(-1)!.id) : 0;
  const unread = state.events.filter((e) => eventOrder(e.id) > lastSeen).length;
  useEffect(() => {
    if (tab !== 'feed') return;
    setLastSeen(newestEvent);
    try {
      localStorage.setItem(SEEN_KEY, String(newestEvent));
    } catch {
      /* storage may be unavailable; the badge just resets next launch */
    }
  }, [tab, newestEvent]);

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 2600);
  }, []);

  // ---- Commands --------------------------------------------------------
  const handleBuild = (facilityId: string, item: BuildItem) => {
    const result = orderBuild(state, facilityId, item);
    if (result.error) flash(result.error);
    setState(result.state);
  };

  const handleCancel = (facilityId: string) => {
    setState(cancelOrder(state, facilityId).state);
  };

  const handleSelectSystem = (systemId: string) => {
    if (pickingFor) {
      const result = sendDiplomat(state, pickingFor, systemId);
      if (result.error) {
        flash(result.error);
        return;
      }
      setState(result.state);
      setPickingFor(null);
      flash('Under way.');
      return;
    }
    setOpenSystemId(systemId);
    setOpenSystemTab('overview');
  };

  /** From the Reach panel: open one of its islands straight onto a tab. */
  const openIslandTab = (systemId: string, islandTab: IslandTab) => {
    setOpenReachId(null);
    setOpenSea(null);
    setOpenSystemId(systemId);
    setOpenSystemTab(islandTab);
  };

  const jumpToSystem = (systemId: string) => {
    setTab('galaxy');
    setFocusSystemId(systemId);
    setOpenSystemId(systemId);
    setOpenSystemTab('overview');
  };

  const startNewGame = (player: PlayableFaction) => {
    setState(newGame(Date.now() >>> 0, player));
    setStarted(true);
    setMenuOpen(false);
    setTab('galaxy');
    setOpenSystemId(null);
    setOpenCharacterId(null);
    setOpenReachId(null);
    setOpenSea(null);
    setPickingFor(null);
    setLastSeen(0);
  };

  /** Back to the title screen, leaving the game where it stands to resume. */
  const returnToTitle = () => {
    saveGame(stateRef.current);
    setSaved(stateRef.current);
    setMenuOpen(false);
    setStarted(false);
  };

  const openSystem = useMemo(
    () => state.systems.find((s) => s.id === openSystemId) ?? null,
    [state.systems, openSystemId],
  );

  const openCharacter = useMemo(
    () => state.characters.find((c) => c.id === openCharacterId) ?? null,
    [state.characters, openCharacterId],
  );

  const openReach = useMemo(
    () => state.sectors.find((s) => s.id === openReachId) ?? null,
    [state.sectors, openReachId],
  );

  const pickingCharacter = pickingFor
    ? state.characters.find((c) => c.id === pickingFor) ?? null
    : null;

  if (!started) {
    return (
      <div className="app">
        <StartScreen
          hasSave={saved !== null}
          onContinue={() => {
            if (saved) setState(saved);
            setStarted(true);
          }}
          onBegin={startNewGame}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <TopBar
        state={state}
        autoPaused={panelOpen}
        soundOn={sound.on}
        onToggleSound={sound.toggle}
        onSetSpeed={(speed: Speed) => setState(setSpeed(state, speed))}
        onOpenMenu={() => setMenuOpen(true)}
      />

      {state.winner && (
        <div className="pad" style={{ paddingBottom: 0 }}>
          <div className={`banner banner--${state.winner === state.player ? 'win' : 'lose'}`}>
            {state.winner === state.player
              ? 'The Seven Seas are yours. Victory.'
              : `The ${factionData[state.winner].name} holds the Seven Seas. Defeat.`}
          </div>
        </div>
      )}

      <main className={`screen${tab === 'galaxy' ? ' screen--map' : ''}`}>
        {tab === 'galaxy' && (
          <GalaxyMap
            state={state}
            onSelectSystem={handleSelectSystem}
            focusSystemId={focusSystemId}
            pickingFor={
              pickingCharacter
                ? {
                    characterId: pickingCharacter.id,
                    faction: pickingCharacter.faction as PlayableFaction,
                  }
                : null
            }
            onCancelPick={() => setPickingFor(null)}
            onOpenWorlds={() => setWorldsOpen(true)}
            onSelectReach={(sectorId: string) => setOpenReachId(sectorId)}
            onSelectSea={setOpenSea}
          />
        )}
        {tab === 'characters' && (
          <CharactersScreen state={state} onOpen={setOpenCharacterId} />
        )}
        {tab === 'feed' && (
          <FeedScreen
            state={state}
            lastSeen={lastSeen}
            onJumpToSystem={jumpToSystem}
            onJumpToCharacter={(characterId) => {
              setTab('characters');
              setOpenCharacterId(characterId);
            }}
          />
        )}
      </main>

      <TabBar
        tab={tab}
        onChange={setTab}
        unread={unread}
        player={state.player}
        onAskAdvisor={() => setNarratorOpen(true)}
      />

      {notice && (
        <div className="chip chip--toast" style={{ position: 'absolute', left: 12, right: 12 }}>
          {notice}
        </div>
      )}

      {openSystem && (
        <SystemSheet
          key={`${openSystem.id}-${openSystemTab}`}
          state={state}
          system={openSystem}
          initialTab={openSystemTab}
          onClose={() => {
            setOpenSystemId(null);
            setFocusSystemId(null);
          }}
          onBuild={handleBuild}
          onCancel={handleCancel}
          onOpenCharacter={setOpenCharacterId}
          onOpenReach={(sectorId) => {
            setOpenSystemId(null);
            setOpenReachId(sectorId);
          }}
        />
      )}

      {openReach && (
        <ReachSheet
          state={state}
          sector={openReach}
          onClose={() => setOpenReachId(null)}
          onOpenIsland={openIslandTab}
        />
      )}

      {openSea && (
        <SeaSheet
          state={state}
          sea={openSea}
          onClose={() => setOpenSea(null)}
          onOpenIsland={openIslandTab}
          onOpenReach={(sectorId) => {
            setOpenSea(null);
            setOpenReachId(sectorId);
          }}
        />
      )}

      {/* Sits above the island panel, so tapping a name there does not lose your place. */}
      {openCharacter && (
        <CharacterSheet
          state={state}
          character={openCharacter}
          onClose={() => setOpenCharacterId(null)}
          onSendOnMission={() => {
            setOpenCharacterId(null);
            setOpenSystemId(null);
            setOpenReachId(null);
            setPickingFor(openCharacter.id);
            setTab('galaxy');
          }}
          onLocate={() => {
            setOpenCharacterId(null);
            jumpToSystem(openCharacter.locationSystemId);
          }}
        />
      )}

      {decision && <MissionDecisionSheet state={state} onResolve={setState} />}

      {worldsOpen && (
        <WorldsSheet
          state={state}
          onClose={() => setWorldsOpen(false)}
          onPick={(systemId) => {
            setWorldsOpen(false);
            jumpToSystem(systemId);
          }}
        />
      )}

      {narratorOpen && (
        <Narrator
          state={state}
          onClose={() => setNarratorOpen(false)}
          onOpenIsland={(systemId) => {
            setNarratorOpen(false);
            jumpToSystem(systemId);
          }}
          onOpenCharacter={(characterId) => {
            setNarratorOpen(false);
            setOpenCharacterId(characterId);
          }}
          onOpenAlmanac={() => {
            setNarratorOpen(false);
            setAlmanacOpen(true);
          }}
        />
      )}

      {almanacOpen && <Almanac state={state} onClose={() => setAlmanacOpen(false)} />}

      {menuOpen && (
        <MenuSheet
          state={state}
          onClose={() => setMenuOpen(false)}
          onReturnToTitle={returnToTitle}
          onOpenAlmanac={() => {
            setMenuOpen(false);
            setAlmanacOpen(true);
          }}
        />
      )}
    </div>
  );
}

function MissionDecisionSheet({
  state,
  onResolve,
}: {
  state: GameState;
  onResolve: (state: GameState) => void;
}) {
  const decision = state.pendingDecisions[0];
  const character = state.characters.find((c) => c.id === decision.characterId);
  const system = state.systems.find((s) => s.id === decision.systemId);
  if (!character || !system) return null;

  const choose = (choice: 'continue' | 'return') => {
    onResolve(resolvePendingMission(state, character.id, choice).state);
  };

  return (
    <Sheet
      title={`${character.name} reports`}
      subtitle={`${system.name} · Day ${state.day}`}
      onClose={() => choose('return')}
      actions={
        <>
          <button className="btn btn--flex" onClick={() => choose('return')}>
            Weigh anchor
          </button>
          <button className="btn btn--flex btn--primary" onClick={() => choose('continue')}>
            Stay 15 more days
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0 }}>
        {decision.success
          ? `The talks on ${system.name} went well. Opinion has shifted your way.`
          : `The talks on ${system.name} went nowhere this time.`}
      </p>
      <div className="card row" style={{ gap: 18 }}>
        <Stat label={factionData.empire.shortName} value={Math.round(system.support.empire)} />
        <Stat label={factionData.alliance.shortName} value={Math.round(system.support.alliance)} />
        <Stat label="Control" value={<ControlBadge faction={system.control} />} />
      </div>
    </Sheet>
  );
}

function WorldsSheet({
  state,
  onClose,
  onPick,
}: {
  state: GameState;
  onClose: () => void;
  onPick: (systemId: string) => void;
}) {
  const held = state.systems.filter((s) => s.control === state.player);
  return (
    <Sheet title="My islands" subtitle={`${held.length} held`} onClose={onClose}>
      <div className="stack">
        {held.map((system) => {
          const sector = state.sectors.find((s) => s.id === system.sectorId);
          const building = system.facilities.filter((f) => f.building).length;
          return (
            <button
              key={system.id}
              className="card card--tap"
              style={{ display: 'block', width: '100%', textAlign: 'left' }}
              onClick={() => onPick(system.id)}
            >
              <div className="row row--between">
                <span style={{ fontWeight: 600 }}>{system.name}</span>
                {system.uprising ? (
                  <span className="badge badge--warn">{terms.mutiny}</span>
                ) : (
                  <span className="tiny muted">
                    {Math.round(system.support[state.player])} {terms.allegiance.toLowerCase()}
                  </span>
                )}
              </div>
              <div className="tiny muted" style={{ marginTop: 3 }}>
                {sector?.name} · {system.facilities.length} built · {system.garrison} ashore
                {building > 0 ? ` · ${building} building` : ''}
              </div>
            </button>
          );
        })}
        {held.length === 0 && <div className="empty">You hold nothing at all.</div>}
      </div>
    </Sheet>
  );
}

function MenuSheet({
  state,
  onClose,
  onReturnToTitle,
  onOpenAlmanac,
}: {
  state: GameState;
  onClose: () => void;
  onReturnToTitle: () => void;
  onOpenAlmanac: () => void;
}) {
  const tally = controlTally(state);
  const needed = Math.ceil(tally.populated * VICTORY_CONTROL_FRACTION);
  return (
    <Sheet
      title={factionData.gameTitle}
      subtitle={`Playing the ${factionData[state.player].name}`}
      onClose={onClose}
    >
      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        <FactionCrest faction={state.player} size={56} />
        <p className="small muted" style={{ margin: 0 }}>
          {factionData[state.player].blurb}
        </p>
      </div>

      <div className="section-title">The war</div>
      <div className="card row" style={{ gap: 18 }}>
        <Stat label={`${terms.settled} islands`} value={tally.populated} />
        <Stat label={factionData.empire.shortName} value={tally.empire} />
        <Stat label={factionData.alliance.shortName} value={tally.alliance} />
      </div>
      <p className="tiny muted" style={{ marginTop: 6 }}>
        {needed} settled islands takes the Seven Seas.
      </p>

      <div className="section-title">Game</div>
      <div className="stack">
        <button className="btn btn--block" onClick={onOpenAlmanac}>
          Almanac — what everything is
        </button>
        <button className="btn btn--block" onClick={onReturnToTitle}>
          Save and return to title
        </button>
      </div>
      <p className="tiny muted" style={{ marginTop: 10 }}>
        Your game saves itself constantly — after every order and whenever you switch away from
        the app — so you can close it at any point and pick the war back up from the title screen.
      </p>
    </Sheet>
  );
}
