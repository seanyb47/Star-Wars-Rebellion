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
  orderAshore,
  orderAssault,
  orderBoard,
  orderEmbark,
  orderSail,
  missionTypeFor,
  missionsOffered,
  type ChartLayer,
  sendDiplomat,
  setSpeed,
  type BuildItem,
  type GameState,
  type PlayableFaction,
  type Speed,
  orderFoundWorks,
  type MissionType,
} from '../sim';
import { Almanac } from './Almanac';
import { CharacterSheet } from './CharacterSheet';
import { BuildMenuSheet, BuildOrderSheet, firstItem, type BuildDraft } from './BuildSheet';
import { MissionChoiceSheet } from './MissionChoiceSheet';
import { CharactersScreen } from './CharactersScreen';
import { FeedScreen } from './FeedScreen';
import { GalaxyMap } from './GalaxyMap';
import { EventCards, isNotable } from './EventCard';
import { Narrator } from './Narrator';
import { moodForEvent } from './narrator/mood';
import { useAdvisorVoice } from './narrator/useAdvisorVoice';
import { ReachSheet } from './ReachSheet';
import { ReachListSheet } from './ReachListSheet';
import { tabForLayer, type IslandTab } from './IslandRow';
import { SystemSheet } from './SystemSheet';
import { StartScreen } from './StartScreen';
import { Tutorial, alreadyTaught } from './Tutorial';
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
  const [openSystemTab, setOpenSystemTab] = useState<IslandTab>('harbour');
  const [openReachId, setOpenReachId] = useState<string | null>(null);
  const [openListId, setOpenListId] = useState<string | null>(null);
  const [openCharacterId, setOpenCharacterId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [narratorOpen, setNarratorOpen] = useState(false);
  const voice = useAdvisorVoice();
  const [almanacOpen, setAlmanacOpen] = useState(false);
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  // An island that offers an officer more than one errand asks which.
  const [missionChoice, setMissionChoice] = useState<{ characterId: string; systemId: string } | null>(null);
  // The build flow: the three-button menu, the order being drafted, and
  // whether the chart is open to choose the island it lands on. The draft
  // outlives the trip to the chart so what you had chosen is still chosen.
  const [buildMenuOpen, setBuildMenuOpen] = useState(false);
  const [draft, setDraft] = useState<BuildDraft | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [choosingSite, setChoosingSite] = useState(false);
  // Which question the chart is answering. Not saved: it is a way of looking
  // at the war, not a fact about it, and it should start plain every session.
  const [layer, setLayer] = useState<ChartLayer>('allegiance');
  /** A fleet waiting to be told where to sail. Every island is a valid answer. */
  const [sailingFleetId, setSailingFleetId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** The opening lesson, offered once ever and only on a game you started. */
  const [teaching, setTeaching] = useState(false);
  const [lastSeen, setLastSeen] = useState(readLastSeen);
  /**
   * Dispatches the player has been shown a card for, so none is shown twice.
   *
   * Seeded with everything already in the log: a game resumed a hundred days
   * in has a hundred days of news in it, and none of it is news any more.
   * Only what happens from now on is worth stopping for.
   */
  const [toldOf, setToldOf] = useState<string[]>(() => state.events.map((e) => e.id));
  /** A card opened from the log, which is one event rather than a day's worth. */
  const [readingId, setReadingId] = useState<string | null>(null);

  const decision = state.pendingDecisions[0] ?? null;

  /**
   * News worth stopping for that the player has not been shown. Only the
   * notable kinds — an island changing hands, a rising, an action, the end of
   * the war. Orders finishing and crew reporting stay in the log, or the game
   * would interrupt itself every other day.
   */
  const dispatches = state.events.filter((e) => isNotable(e) && !toldOf.includes(e.id));
  // The log is capped, so the list of what has been read is capped with it.
  useEffect(() => {
    setToldOf((seen) =>
      seen.length > 500 ? seen.filter((id) => state.events.some((e) => e.id === id)) : seen,
    );
  }, [state.events]);
  const reading = readingId ? state.events.find((e) => e.id === readingId) : undefined;
  const cards = reading ? [reading] : dispatches;
  // Spec 2: any modal or panel holds the clock; closing it resumes.
  const panelOpen =
    openSystemId !== null ||
    openCharacterId !== null ||
    openReachId !== null ||
    openListId !== null ||
    menuOpen ||
    missionChoice !== null ||
    buildMenuOpen ||
    orderOpen ||
    cards.length > 0 ||
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
  const handleBuild = (facilityId: string, item: BuildItem, destinationId?: string) => {
    const result = orderBuild(state, facilityId, item, destinationId);
    if (result.error) flash(result.error);
    else if (destinationId) {
      const where = state.systems.find((s) => s.id === destinationId)!;
      flash(`Ordered for ${where.name}.`);
    }
    setState(result.state);
  };

  const handleCancel = (facilityId: string) => {
    setState(cancelOrder(state, facilityId).state);
  };

  const handleFound = (systemId: string) => {
    const result = orderFoundWorks(state, systemId);
    if (result.error) flash(result.error);
    setState(result.state);
  };

  const sendOfficer = (characterId: string, systemId: string, type?: MissionType) => {
    const result = sendDiplomat(state, characterId, systemId, type);
    if (result.error) {
      flash(result.error);
      return;
    }
    setState(result.state);
    setPickingFor(null);
    setMissionChoice(null);
    const island = state.systems.find((s) => s.id === systemId)!;
    const officer = state.characters.find((c) => c.id === characterId)!;
    const errand = type ?? missionTypeFor(state, island, officer.faction as PlayableFaction);
    flash(errand === 'incite' || errand === 'sabotage' || errand === 'abduct' || errand === 'rescue' ? 'Under way, quietly.' : 'Under way.');
  };

  const handleSelectSystem = (systemId: string) => {
    if (choosingSite) {
      const where = state.systems.find((s) => s.id === systemId)!;
      if (where.control !== state.player || where.uprising) {
        flash(where.uprising ? `${where.name} is in mutiny.` : `You do not hold ${where.name}.`);
        return;
      }
      setDraft((d) => (d ? { ...d, destinationId: systemId } : d));
      setChoosingSite(false);
      setOrderOpen(true);
      return;
    }
    if (sailingFleetId) {
      const result = orderSail(state, sailingFleetId, systemId);
      setSailingFleetId(null);
      if (result.error) {
        flash(result.error);
        return;
      }
      setState(result.state);
      flash('Weighing anchor.');
      return;
    }
    if (pickingFor) {
      const island = state.systems.find((s) => s.id === systemId)!;
      const officer = state.characters.find((c) => c.id === pickingFor)!;
      const offered = missionsOffered(state, island, officer.faction as PlayableFaction);
      if (offered.length > 1) {
        // More than one thing to do there: the original's mission menu.
        setOpenReachId(null);
        setOpenListId(null);
        setMissionChoice({ characterId: pickingFor, systemId });
        return;
      }
      sendOfficer(pickingFor, systemId);
      return;
    }
    setOpenSystemId(systemId);
    setOpenSystemTab(tabForLayer(layer));
  };

  /**
   * From the chain chart or a Reach's island list: open one of its islands — or, if a
   * crew member is waiting for a destination, send them there instead.
   *
   * Which tab it opens on is the filter's to say: with Idle yards on, a lit
   * island is a yard standing about, so the island opens on its Buildings.
   * With no filter it opens on the Harbour, as it always did, and the tabs
   * swipe from wherever it landed.
   */
  const openIslandTab = (systemId: string) => {
    setOpenReachId(null);
    setOpenListId(null);
    if (pickingFor || sailingFleetId || choosingSite) {
      handleSelectSystem(systemId);
      return;
    }
    setOpenSystemId(systemId);
    setOpenSystemTab(tabForLayer(layer));
  };

  const handleSail = (fleetId: string) => {
    // Choosing where to sail is the same gesture as choosing where to send a
    // crew member: close the panel, pick an island, and the order goes off.
    setOpenSystemId(null);
    setSailingFleetId(fleetId);
  };

  const handleEmbark = (fleetId: string, companies: number) => {
    const result = orderEmbark(state, fleetId, companies);
    if (result.error) return flash(result.error);
    setState(result.state);
  };

  const handleBoard = (fleetId: string, characterId: string) => {
    const result = orderBoard(state, fleetId, characterId);
    if (result.error) return flash(result.error);
    setState(result.state);
  };

  const handleAshore = (fleetId: string, characterId: string) => {
    const result = orderAshore(state, fleetId, characterId);
    if (result.error) return flash(result.error);
    setState(result.state);
  };

  const handleAssault = (fleetId: string) => {
    const result = orderAssault(state, fleetId);
    if (result.error) return flash(result.error);
    setState(result.state);
  };

  const jumpToSystem = (systemId: string) => {
    setTab('galaxy');
    setOpenSystemId(systemId);
    setOpenSystemTab('harbour');
  };

  const startNewGame = (player: PlayableFaction) => {
    setState(newGame(Date.now() >>> 0, player));
    setStarted(true);
    setTeaching(!alreadyTaught());
    setMenuOpen(false);
    setTab('galaxy');
    setOpenSystemId(null);
    setOpenCharacterId(null);
    setOpenReachId(null);
    setOpenListId(null);
    setPickingFor(null);
    setMissionChoice(null);
    setSailingFleetId(null);
    setBuildMenuOpen(false);
    setOrderOpen(false);
    setChoosingSite(false);
    setDraft(null);
    setToldOf([]);
    setReadingId(null);
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
            if (saved) {
              setState(saved);
              // Everything in a resumed game has already happened.
              setToldOf(saved.events.map((e) => e.id));
            }
            setStarted(true);
          }}
          onBegin={startNewGame}
        />
      </div>
    );
  }

  return (
    <div className="app" data-side={state.player}>
      {/* Waits for the war-begins dispatch to be read: two cards at once is
          nobody's idea of a clean start. */}
      {teaching && dispatches.length === 0 && !readingId && (
        <Tutorial side={state.player} onDone={() => setTeaching(false)} />
      )}
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
            pickingFor={
              pickingCharacter
                ? {
                    characterId: pickingCharacter.id,
                    faction: pickingCharacter.faction as PlayableFaction,
                  }
                : null
            }
            layer={layer}
            onLayerChange={setLayer}
            sailing={sailingFleetId !== null}
            choosing={choosingSite}
            onCancelPick={() => {
              setPickingFor(null);
              setSailingFleetId(null);
              if (choosingSite) {
                setChoosingSite(false);
                setOrderOpen(true);
              }
            }}
            onSelectReach={(sectorId: string) => setOpenReachId(sectorId)}
            onOpenIsland={(systemId: string) => {
              setOpenSystemId(systemId);
              setOpenSystemTab('buildings');
            }}
          />
        )}
        {tab === 'characters' && (
          <CharactersScreen state={state} onOpen={setOpenCharacterId} />
        )}
        {tab === 'feed' && (
          <FeedScreen
            state={state}
            lastSeen={lastSeen}
            onJumpToCharacter={(characterId) => {
              setTab('characters');
              setOpenCharacterId(characterId);
            }}
            onRead={setReadingId}
          />
        )}
      </main>

      {cards.length > 0 && (
        <EventCards
          state={state}
          events={cards}
          onShow={(event) => voice.say(event.text, moodForEvent(event, state))}
          onClose={() => {
            if (reading) setReadingId(null);
            else setToldOf((seen) => [...seen, ...dispatches.map((e) => e.id)]);
          }}
          onOpenIsland={(systemId) => {
            if (reading) setReadingId(null);
            else setToldOf((seen) => [...seen, ...dispatches.map((e) => e.id)]);
            setTab('galaxy');
            setOpenSystemId(systemId);
            setOpenSystemTab('harbour');
          }}
        />
      )}

      <TabBar
        tab={buildMenuOpen || orderOpen || choosingSite ? 'build' : tab}
        onChange={(next) => {
          // Build is a popup over whatever you are looking at, not a screen.
          if (next === 'build') setBuildMenuOpen(true);
          else setTab(next);
        }}
        unread={unread}
        player={state.player}
        onAskAdvisor={() => setNarratorOpen(true)}
        mood={voice.mood}
        talking={voice.talking}
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
          onClose={() => setOpenSystemId(null)}
          onBuild={handleBuild}
          onCancel={handleCancel}
          onFound={handleFound}
          onSail={handleSail}
          onEmbark={handleEmbark}
          onAssault={handleAssault}
          onBoard={handleBoard}
          onAshore={handleAshore}
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
          pickingFor={pickingCharacter ? (pickingCharacter.faction as PlayableFaction) : null}
          sailing={sailingFleetId !== null}
          choosing={choosingSite}
          layer={layer}
          onLayerChange={setLayer}
          onOpenList={(sectorId) => {
            // The chain as a list, in place of the chain as a map — not on top
            // of it.
            setOpenReachId(null);
            setOpenListId(sectorId);
          }}
        />
      )}

      {openListId && (
        <ReachListSheet
          state={state}
          sector={state.sectors.find((x) => x.id === openListId)!}
          onClose={() => setOpenListId(null)}
          onOpenIsland={openIslandTab}
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

      {buildMenuOpen && (
        <BuildMenuSheet
          onPick={(kind) => {
            setBuildMenuOpen(false);
            setDraft((d) =>
              d && d.kind === kind
                ? d
                : {
                    kind,
                    item: firstItem(kind, state.player),
                    destinationId: state.factions[state.player].hqSystemId,
                  },
            );
            setOrderOpen(true);
          }}
          onClose={() => setBuildMenuOpen(false)}
        />
      )}

      {orderOpen && draft && (
        <BuildOrderSheet
          state={state}
          draft={draft}
          onChange={setDraft}
          onChooseOnChart={() => {
            setOrderOpen(false);
            setOpenSystemId(null);
            setOpenReachId(null);
            setOpenListId(null);
            setOpenCharacterId(null);
            setChoosingSite(true);
            setTab('galaxy');
          }}
          onBuild={(facilityId, item, destinationId) => {
            handleBuild(facilityId, item, destinationId);
            setOrderOpen(false);
          }}
          onClose={() => setOrderOpen(false)}
        />
      )}

      {missionChoice && (
        <MissionChoiceSheet
          state={state}
          characterId={missionChoice.characterId}
          systemId={missionChoice.systemId}
          onChoose={(type) => sendOfficer(missionChoice.characterId, missionChoice.systemId, type)}
          onClose={() => setMissionChoice(null)}
        />
      )}

      {decision && <MissionDecisionSheet state={state} onResolve={setState} />}

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
          onHowToPlay={() => {
            setMenuOpen(false);
            setTeaching(true);
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
        {character.mission?.type === 'incite'
          ? decision.success
            ? `Word is spreading on ${system.name}. The governor's hold is slipping.`
            : `${system.name} will not be moved this time; the governor still has them.`
          : decision.success
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


function MenuSheet({
  state,
  onClose,
  onReturnToTitle,
  onOpenAlmanac,
  onHowToPlay,
}: {
  state: GameState;
  onClose: () => void;
  onReturnToTitle: () => void;
  onOpenAlmanac: () => void;
  onHowToPlay: () => void;
}) {
  const tally = controlTally(state);
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
        Highwater falling ends the Crown. All three Pirate Lords in irons at once ends the
        Confederacy.
      </p>

      <div className="section-title">Game</div>
      <div className="stack">
        <button className="btn btn--block" onClick={onHowToPlay}>
          How to play
        </button>
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
      <p className="tiny muted" style={{ marginTop: 14, textAlign: 'center' }}>
        Version {__APP_VERSION__}
      </p>
    </Sheet>
  );
}
