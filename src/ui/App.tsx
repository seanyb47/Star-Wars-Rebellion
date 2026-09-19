import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import factionData from '../data/factions.json';
import terms from '../data/terms.json';
import {
  CHART_LAYERS,
  CLOCK_TICK_MS,
  SPEED_MS,
  advanceDay,
  cancelOrder,
  controlTally,
  loadGame,
  newGame,
  orderBuild,
  missionReport,
  resolvePendingMission,
  saveGame,
  orderFlee,
  orderRelieve,
  reorderCrew,
  reorderGarrison,
  reorderOfficers,
  reorderShips,
  orderAssault,
  orderBombard,
  orderCeaseFire,
  orderBreakOff,
  orderCloseBattle,
  orderDetach,
  orderFightRound,
  orderSail,
  sailError,
  isCovert,
  missionTypeFor,
  missionsOffered,
  type ChartLayer,
  sendCrew,
  setObserving,
  setSpeed,
  type BuildItem,
  type GameState,
  type PlayableFaction,
  type Speed,
  orderClearForest,
  orderFoundWorks,
  type MissionType,
} from '../sim';
import { Almanac } from './Almanac';
import { LookUpProvider, type EncPage } from './lookup';
import { CharacterSheet } from './CharacterSheet';
import { BuildMenuSheet, BuildOrderSheet, firstItem, type BuildDraft } from './BuildSheet';
import { MissionChoiceSheet } from './MissionChoiceSheet';
import { SailConfirmSheet } from './SailConfirmSheet';
import { FeedScreen } from './FeedScreen';
import { Dispatches } from './Dispatches';
import { GalaxyMap } from './GalaxyMap';
import { BattleSheet } from './BattleSheet';
import { EventCards, isNotable } from './EventCard';
import { Narrator } from './Narrator';
import { moodForEvent } from './narrator/mood';
import { useAdvisorVoice } from './narrator/useAdvisorVoice';
import { ReachSheet } from './ReachSheet';
import { ReachListSheet } from './ReachListSheet';
import { tabForLayer, type IslandTab } from './IslandRow';
import { ShipSheet } from './ShipSheet';
import { SystemSheet } from './SystemSheet';
import { StartScreen } from './StartScreen';
import { Tutorial, alreadyTaught } from './Tutorial';
import { TabBar, type Tab } from './TabBar';
import { TopBar } from './TopBar';
import { useAudio } from './useAudio';
import { FactionCrest } from './art';
import { ControlBadge, Sheet, Stat } from './components';
import { orderedLayers, usePrefs } from './prefs';

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
  const [openSystemTab, setOpenSystemTab] = useState<IslandTab>('harbor');
  const [openReachId, setOpenReachId] = useState<string | null>(null);
  const [openListId, setOpenListId] = useState<string | null>(null);
  const [openCharacterId, setOpenCharacterId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [narratorOpen, setNarratorOpen] = useState(false);
  const voice = useAdvisorVoice();
  // The encyclopedia, and where in it. `at` is set when a unit somewhere in
  // the game was tapped to get here, so the page opens on that entry rather
  // than at the top of a page of thirty.
  /*
   * `nth` counts lookups, and its only job is to be the encyclopedia's React
   * key.
   *
   * Without it a lookup made *from inside* the encyclopedia did nothing: the
   * Almanac holds its open tab in `useState` seeded from the `page` prop, so
   * a new prop on an already-mounted sheet never moved it. That never showed
   * while every lookup came from a game screen with the sheet shut — the
   * first one that did not was the crew role tags of 19 September, which land
   * on the Glossary tab from the Crew tab. Asking for the same page and entry
   * twice running had the same problem for the same reason.
   *
   * Counting makes every request distinct, so the sheet remounts at what was
   * asked for. Losing the scroll position is correct here: a lookup means
   * take me to this thing.
   */
  const [almanac, setAlmanac] = useState<{ page: EncPage; at?: string; nth: number } | null>(null);
  const almanacOpen = almanac !== null;
  const lookUp = useCallback(
    (page: EncPage, at?: string) =>
      setAlmanac((prev) => ({ page, at, nth: (prev?.nth ?? 0) + 1 })),
    [],
  );
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

  // The canvas behind the page wears the same side's colours. An iPhone lays
  // the page out shorter than the glass, reserving the strip the home
  // indicator sits over, and nothing inside the page can paint there — what
  // fills it is the canvas. In the console's own dark it reads as the bottom
  // of the console instead of a band of sea under it. Above every early
  // return, because hooks are.
  useEffect(() => {
    document.body.dataset.side = state.player;
  }, [state.player]);
  /** A voyage the player has picked a destination for but not yet ordered. */
  const [sailPlan, setSailPlan] = useState<{ fleetId: string; systemId: string } | null>(null);
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
  /** The entry the log was opened at, from a line in the running report. */
  const [focusEventId, setFocusEventId] = useState<string | null>(null);

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
  /*
   * What holds the clock, and what no longer does.
   *
   * Two passes to get here. Every panel used to hold it — island sheet, crew,
   * Reach, build menu, almanac, the menu itself — which is most of what a
   * player does, so the war ran only while you stared at the chart touching
   * nothing. Sean cut that: a sub-screen is somewhere you went to look at
   * something, and the world does not stop for that.
   *
   * I then kept the hold for two more things, a dispatch raised over whatever
   * you were doing and a decision waiting on an answer, on the grounds that
   * both had stopped *you*. Sean's answer: *"combat is only clock pause.
   * Unless player pauses."* So they go too, and the rule is now one line
   * instead of a judgement call — the clock stops when your ships are in
   * action, and otherwise when you say so.
   *
   * What that changes downstream, and why neither needed guarding. A dispatch
   * no longer freezes the world while it is up, so more news can arrive behind
   * it; the card stack already pages through a list and says "3 of 7". And an
   * unanswered continue-or-return no longer freezes it either — the officer
   * stands on the island doing nothing until you answer, which costs you their
   * time, which is the honest price of not deciding.
   */
  /**
   * Everything notable that has happened *by the time you dismiss*, not by the
   * time the card was drawn.
   *
   * Sean's dev report, the highest-impact bug in it: *"the event/dispatch modal
   * doesn't fully clear. Dismissing reveals an identical copy queued behind it,
   * and while any copy is mounted, taps on the world map do nothing."*
   *
   * One cause, two symptoms. Dismissal used to mark the `dispatches` array
   * captured in the render that drew the card — and the clock deliberately
   * keeps running while a card is up, so at Fast (a day and a half a second)
   * more notable news lands behind it constantly. Those arrivals were never in
   * the list being marked, so the moment the card closed another opened,
   * looking identical because it often *was* the same kind of event.
   *
   * The dead map follows from that rather than from any pointer-events fault:
   * every card brings a full-screen scrim whose job is to dismiss on tap, so a
   * card that instantly replaces itself eats the next tap, and the next. Hence
   * "had to hit the × 2–3 times."
   *
   * `stateRef` is already kept current for the autosave, so reading the log
   * through it marks what is actually there at the moment of the tap.
   */
  const markRead = useCallback(() => {
    setToldOf((seen) => {
      const now = stateRef.current.events.filter(isNotable).map((e) => e.id);
      return now.length === 0 ? seen : [...new Set([...seen, ...now])];
    });
  }, []);

  /*
   * And a dispatch holds it again — which reverses the line above, so it says
   * why here rather than quietly.
   *
   * Sean's rule of 18 September was *"combat is only clock pause. Unless
   * player pauses."* His playtest of the 19th: *"The clock keeps running
   * behind pop-ups. Days pass while a report dialog is open (Day 30 became
   * Day 34 on one dialog)."* The later word wins, and the earlier one was
   * given against a version of the card stack that could not have carried it:
   * dismissal used to mark only the dispatches captured in the render that
   * drew the card, so at Fast a card replaced itself endlessly and a clock
   * held by one would have been a clock held for good. Dismissal marks the
   * whole log as of the tap now, so one tap clears the queue and the war
   * starts again.
   *
   * Three things hold it, and nothing else: an action your ships are in, a
   * dispatch that interrupted you, and an errand waiting on your answer. A
   * card you opened yourself out of the log does not — that is somewhere you
   * went to look at something, which is Sean's own distinction and the reason
   * no sub-screen holds the clock either.
   */
  const clockHeld =
    state.battle !== undefined || decision !== null || (!reading && dispatches.length > 0);


  // ---- The clock -------------------------------------------------------
  //
  // This used to be a `setInterval` of one day's length, torn down and rebuilt
  // whenever the game stopped. That throws away whatever the day had behind
  // it, which at four seconds a day was invisible and at thirty is not: being
  // held for a dispatch twenty seconds into a day would cost those twenty
  // seconds, every time.
  //
  // So the clock counts real elapsed time into a running total instead, and
  // the total survives the stop. Whatever the day had behind it when the
  // dispatch went up is still there when you dismiss it.
  const running = started && !clockHeld && !state.winner && state.speed !== 'paused';
  /** Milliseconds of this game day already served. Kept across pauses. */
  const servedRef = useRef(0);
  useEffect(() => {
    // How far through the day we are, published as a custom property rather
    // than as React state: this moves ten times a second, and re-rendering
    // the chart at that rate to turn a ring a few degrees would be absurd.
    const show = (fraction: number) =>
      document.documentElement.style.setProperty('--day-progress', fraction.toFixed(3));
    if (!running) return;
    let last = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      servedRef.current += now - last;
      last = now;
      const dayLength = SPEED_MS[state.speed];
      if (servedRef.current < dayLength) {
        show(servedRef.current / dayLength);
        return;
      }
      // One day per crossing, never a burst: a tab left in the background
      // should not come back and run a fortnight in one frame.
      servedRef.current = 0;
      show(0);
      setState((current) =>
        current.speed === 'paused' || current.winner ? current : advanceDay(current),
      );
    }, CLOCK_TICK_MS);
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

  /**
   * Fell a forest. The one thing in the game that cannot be undone, so it
   * asks first — a tapped-by-accident stand of timber is income gone for the
   * rest of the war.
   */
  const handleClear = (systemId: string) => {
    const island = state.systems.find((s) => s.id === systemId);
    const ok = window.confirm(
      `Fell the timber on ${island?.name ?? 'this island'}?\n\n` +
        'It opens the plot for anything you like. The forest is destroyed and does not grow back.',
    );
    if (!ok) return;
    const result = orderClearForest(state, systemId);
    if (result.error) flash(result.error);
    setState(result.state);
  };

  const handleFound = (systemId: string) => {
    const result = orderFoundWorks(state, systemId);
    if (result.error) flash(result.error);
    setState(result.state);
  };

  const sendOfficer = (
    characterId: string,
    systemId: string,
    type?: MissionType,
    companionIds: string[] = [],
    /** Which squadron a Command posting is for, when it is not the island. */
    fleetId?: string,
  ) => {
    const result = sendCrew(state, characterId, systemId, type, companionIds, fleetId);
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
    // The covert list, asked of the rules rather than spelled out again here —
    // it had already fallen a mission behind once and would have again.
    flash(errand && isCovert(errand) ? 'Under way, quietly.' : 'Under way.');
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
      // Picking the island proposes the voyage; it does not order it. A
      // crossing costs days the player cannot get back and cannot recall a
      // fleet from, so the number goes in front of the decision.
      const stop = sailError(state, sailingFleetId, systemId, state.player);
      if (stop) {
        setSailingFleetId(null);
        flash(stop);
        return;
      }
      setOpenReachId(null);
      setOpenListId(null);
      setSailPlan({ fleetId: sailingFleetId, systemId });
      return;
    }
    if (pickingFor) {
      // Every errand goes through the same sheet, even where the island
      // offers only one: it is the screen that says how far the sail is and
      // how long the work takes, and an officer sent by accident is a
      // fortnight gone. An island with nothing to do on it never gets that
      // far — sending is what would have failed, so say so and keep the
      // officer in hand.
      const island = state.systems.find((s) => s.id === systemId)!;
      const officer = state.characters.find((c) => c.id === pickingFor)!;
      if (missionsOffered(state, island, officer.faction as PlayableFaction, officer).length === 0) {
        flash(`Nothing for ${officer.name} to do on ${island.name}.`);
        return;
      }
      setOpenReachId(null);
      setOpenListId(null);
      setMissionChoice({ characterId: pickingFor, systemId });
      return;
    }
    setOpenSystemId(systemId);
    setOpenSystemTab(tabForLayer(layer));
  };

  /**
   * From the chain chart or a Reach's island list: open one of its islands — or, if a
   * crew member is waiting for a destination, send them there instead.
   *
   * Which tab it opens on is the filter's to say: with Idle buildings on, a lit
   * island is a yard standing about, so the island opens on its Buildings.
   * With no filter it opens on the Harbor, as it always did, and the tabs
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

  /** Take hulls out of a squadron: into one lying here, or into a new one. */
  const handleDetach = (fleetId: string, shipIds: string[], into?: string) => {
    const result = orderDetach(state, fleetId, shipIds, into);
    if (result.error) return flash(result.error);
    setState(result.state);
    flash(into ? 'Hulls change squadron.' : 'A new squadron.');
  };

  /** Break off a fight: take the parting volley, run for the nearest holding. */
  /** Open fire on the island, and keep firing until told otherwise. */
  const handleBombard = (fleetId: string) => {
    const result = orderBombard(state, fleetId);
    if (result.error) return flash(result.error);
    setState(result.state);
    flash('The guns open.');
  };
  const handleCeaseFire = (fleetId: string) => {
    const result = orderCeaseFire(state, fleetId);
    if (result.error) return flash(result.error);
    setState(result.state);
  };

  const handleFlee = (fleetId: string) => {
    const result = orderFlee(state, fleetId);
    if (result.error) return flash(result.error);
    setState(result.state);
  };

  /** Give up a post: off a deck, or out of an island's chair. */
  const handleRelieve = (characterId: string) => {
    const result = orderRelieve(state, characterId);
    if (result.error) return flash(result.error);
    setState(result.state);
  };

  /** Which hull's sheet is open, if any. */
  const [openShip, setOpenShip] = useState<{ fleetId: string; shipId: string } | null>(null);
  /**
   * Anything the player opened, which the running report defers to.
   *
   * A sheet is anchored to the bottom and runs to 82% of the screen, so it
   * stops just short of where the report strip hangs — near enough that a
   * report would sit on its top edge, and a report you tap while a sheet is
   * open would take you to the log behind the sheet. Neither is right: a
   * report is news arriving, not an interruption, and it waits.
   *
   * It waits rather than expiring. Lines only age while they are on the
   * screen (see `Dispatches`), so a long look at an island costs no news.
   */
  const panelOpen =
    Boolean(openSystemId) ||
    Boolean(openCharacterId) ||
    Boolean(openReachId) ||
    Boolean(openListId) ||
    Boolean(openShip) ||
    Boolean(missionChoice) ||
    Boolean(sailPlan) ||
    menuOpen ||
    narratorOpen ||
    almanacOpen ||
    buildMenuOpen ||
    orderOpen ||
    teaching;

  /**
   * Putting a list in the order the player wants it.
   *
   * All four move the game's own array, so the order saves with the game
   * rather than being a view's opinion of it.
   */
  const handleOrderShips = (fleetId: string, shipIds: string[], dir: -1 | 1) => {
    const result = reorderShips(state, fleetId, shipIds, dir);
    if (result.error) return flash(result.error);
    setState(result.state);
  };
  const handleOrderOfficers = (fleetId: string, characterIds: string[], dir: -1 | 1) => {
    const result = reorderOfficers(state, fleetId, characterIds, dir);
    if (result.error) return flash(result.error);
    setState(result.state);
  };
  const handleOrderGarrison = (systemId: string, typeIds: string[], dir: -1 | 1) => {
    const result = reorderGarrison(state, systemId, typeIds, dir);
    if (result.error) return flash(result.error);
    setState(result.state);
  };
  const handleOrderCrew = (characterIds: string[], dir: -1 | 1) => {
    const result = reorderCrew(state, characterIds, dir);
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
    setOpenSystemTab('harbor');
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

  /**
   * The island the officer is already standing on, offered as a one-tap
   * answer.
   *
   * Sean: *"Many missions will be on same place so it makes it faster."* He
   * is right about the shape of it — yard work, a posting and signing someone
   * on are all errands for where you already are, and each one cost a tap
   * into the chain, a tap on the island, and the chain sheet in the way.
   *
   * Offered only when there is genuinely something to do there, because the
   * alternative is a button whose whole job is to tell you it was the wrong
   * button. Nothing for the build flow: its destination is already set and
   * Back keeps it, so "here" would be a second word for the same thing. And
   * nothing for a fleet, which cannot sail to the harbor it is lying in.
   */
  const pickHere = (() => {
    if (!pickingCharacter) return null;
    const at = state.systems.find((sy) => sy.id === pickingCharacter.locationSystemId);
    if (!at) return null;
    const offered = missionsOffered(
      state,
      at,
      pickingCharacter.faction as PlayableFaction,
      pickingCharacter,
    );
    return offered.length > 0 ? { systemId: at.id, name: at.name } : null;
  })();

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
    <LookUpProvider value={lookUp}>
    <div className="app" data-side={state.player}>
      {/* Watching. Said plainly across the top, because every order is refused
          while it is on and a silent lock is a bug report. */}
      {state.observing && (
        <div className="watchbar">
          Observing — the machine has both sides. Your orders are locked; the clock is still yours.
        </div>
      )}
      {/* Waits for the war-begins dispatch to be read: two cards at once is
          nobody's idea of a clean start. */}
      {teaching && dispatches.length === 0 && !readingId && (
        <Tutorial side={state.player} onDone={() => setTeaching(false)} />
      )}
      <TopBar
        state={state}
        autoPaused={clockHeld}
        soundOn={sound.on}
        onToggleSound={sound.toggle}
        onSetSpeed={(speed: Speed) => setState(setSpeed(state, speed))}
        onToggleObserving={() => setState(setObserving(state, !state.observing))}
        onOpenMenu={() => setMenuOpen(true)}
      />

      {/* What has just gone into the log, said on the screen. Under the
          utility bar and over everything below it, at Sean's ask: "a running
          place where messages post... you can click on it to open the log to
          that entry." Silent while an action or a dispatch card is up — those
          own the screen, and a card is already the louder telling. */}
      <Dispatches
        state={state}
        hidden={Boolean(state.battle) || cards.length > 0 || panelOpen}
        onOpen={(eventId) => {
          setFocusEventId(eventId);
          setTab('feed');
        }}
      />

      {state.winner && (
        <div className="pad" style={{ paddingBottom: 0 }}>
          <div className={`verdict verdict--${state.winner === state.player ? 'win' : 'lose'}`}>
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
            pickHere={pickHere}
            onPickHere={handleSelectSystem}
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
        {tab === 'feed' && (
          <FeedScreen
            state={state}
            lastSeen={lastSeen}
            focusId={focusEventId}
            /* The crew screen this used to switch to is gone, and the sheet
               was always the thing worth arriving at: it opens over the log,
               and closing it puts you back where you were reading. */
            onJumpToCharacter={(characterId) => setOpenCharacterId(characterId)}
            onRead={setReadingId}
          />
        )}
      </main>

      {/* Above everything, including the dispatches: while your ships are in
          action, that is the only thing on the screen. */}
      {state.battle && (
        <BattleSheet
          state={state}
          onFight={() => setState(orderFightRound(state).state)}
          onBreakOff={() => {
            const result = orderBreakOff(state);
            if (result.error) return flash(result.error);
            setState(result.state);
          }}
          onClose={() => setState(orderCloseBattle(state).state)}
        />
      )}

      {cards.length === 0 || state.battle ? null : (
        <EventCards
          state={state}
          events={cards}
          onShow={(event) => voice.say(event.text, moodForEvent(event, state))}
          onClose={() => {
            if (reading) setReadingId(null);
            else markRead();
          }}
          onOpenIsland={(systemId) => {
            if (reading) setReadingId(null);
            else markRead();
            setTab('galaxy');
            setOpenSystemId(systemId);
            setOpenSystemTab('harbor');
          }}
        />
      )}

      <TabBar
        tab={buildMenuOpen || orderOpen || choosingSite ? 'build' : tab}
        onChange={(next) => {
          // Build is a popup over whatever you are looking at, not a screen.
          if (next === 'build') setBuildMenuOpen(true);
          else {
            // The mark on a log entry belongs to one visit. Coming back to the
            // log later should show it as a log, not still pointing at
            // whatever was tapped an hour ago.
            if (next !== 'feed') setFocusEventId(null);
            setTab(next);
          }
        }}
        unread={unread}
        player={state.player}
        onAskAdvisor={() => setNarratorOpen(true)}
        onOpenAlmanac={() => lookUp('people')}
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
          onClear={handleClear}
          onSail={handleSail}
          onAssault={handleAssault}
          onBombard={handleBombard}
          onCeaseFire={handleCeaseFire}
          onFlee={handleFlee}
          onOpenShip={(fleetId, shipId) => setOpenShip({ fleetId, shipId })}
          onOrderShips={handleOrderShips}
          onDetach={handleDetach}
          onOrderOfficers={handleOrderOfficers}
          onOrderGarrison={handleOrderGarrison}
          onOrderCrew={handleOrderCrew}
          onOpenCharacter={setOpenCharacterId}
          onOpenReach={(sectorId) => {
            setOpenSystemId(null);
            setOpenReachId(sectorId);
          }}
        />
      )}

      {/* A hull's own sheet, over the island's: tapped from the list in the
          harbor, and stacked so it sits on top of the panel it came from
          rather than behind it. */}
      {openShip && (() => {
        const fleet = state.fleets.find((f) => f.id === openShip.fleetId);
        if (!fleet) return null;
        return (
          <ShipSheet
            state={state}
            fleet={fleet}
            shipId={openShip.shipId}
            onClose={() => setOpenShip(null)}
          />
        );
      })()}

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
          onRelieve={handleRelieve}
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

      {sailPlan && (
        <SailConfirmSheet
          state={state}
          fleetId={sailPlan.fleetId}
          targetSystemId={sailPlan.systemId}
          onClose={() => {
            // "Don't sail" means what it says: the order is off and the
            // chart stops waiting for a destination. Leaving the fleet in
            // hand read as a cancel that had not cancelled — the next island
            // you touched was taken for a second attempt at the voyage
            // instead of opening.
            setSailPlan(null);
            setSailingFleetId(null);
          }}
          onConfirm={() => {
            const result = orderSail(state, sailPlan.fleetId, sailPlan.systemId);
            setSailPlan(null);
            setSailingFleetId(null);
            if (result.error) {
              flash(result.error);
              return;
            }
            setState(result.state);
            flash('Weighing anchor.');
          }}
        />
      )}

      {missionChoice && (
        <MissionChoiceSheet
          state={state}
          characterId={missionChoice.characterId}
          systemId={missionChoice.systemId}
          onChoose={(type, companionIds, fleetId) =>
            sendOfficer(
              missionChoice.characterId,
              missionChoice.systemId,
              type,
              companionIds,
              fleetId,
            )
          }
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
            lookUp('people');
          }}
        />
      )}

      {almanac && (
        <Almanac
          key={almanac.nth}
          state={state}
          page={almanac.page}
          entry={almanac.at}
          onClose={() => setAlmanac(null)}
        />
      )}

      {menuOpen && (
        <MenuSheet
          state={state}
          onClose={() => setMenuOpen(false)}
          onReturnToTitle={returnToTitle}
          onOpenAlmanac={() => {
            setMenuOpen(false);
            lookUp('people');
          }}
          onHowToPlay={() => {
            setMenuOpen(false);
            setTeaching(true);
          }}
        />
      )}
    </div>
    </LookUpProvider>
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
            Set sail
          </button>
          <button className="btn btn--flex btn--primary" onClick={() => choose('continue')}>
            Stay 15 more days
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0 }}>
        {missionReport(
          character.mission?.type ?? 'diplomacy',
          decision.success,
          system.name,
        )}
      </p>
      {/* The allegiance row belongs to the two errands that move allegiance.
          On a sabotage or a survey it was three numbers that had not changed
          and had nothing to do with what the officer just did. */}
      {(character.mission?.type === 'diplomacy' || character.mission?.type === 'incite') && (
        <div className="card row" style={{ gap: 18 }}>
          <Stat label={factionData.empire.shortName} value={Math.round(system.support.empire)} />
          <Stat label={factionData.alliance.shortName} value={Math.round(system.support.alliance)} />
          <Stat label="Control" value={<ControlBadge faction={system.control} />} />
        </div>
      )}
    </Sheet>
  );
}


/**
 * The chart's filters, in the order this player wants them.
 *
 * Sean, 19 September: *"Add in settings ability to change default order of
 * game filters. That would be cool."*
 *
 * The same up-and-down arrows the harbor and the garrison already use, for
 * the same reason and with the same shape, so it is a control the player has
 * met rather than a new one. Loyalty and None are in the list like everything
 * else: somebody who never uses None should be able to push it to the end.
 *
 * Saved to the device rather than the game — see `Prefs`. Reset puts the
 * build's own order back, which is the order the strip ships in and the one
 * every hint and tutorial card assumes.
 */
function FilterOrder() {
  const [prefs, setPrefs] = usePrefs();
  const layers = orderedLayers(CHART_LAYERS, prefs.layerOrder);
  const move = (at: number, step: number) => {
    const next = at + step;
    if (next < 0 || next >= layers.length) return;
    const ids = layers.map((l) => l.id);
    [ids[at], ids[next]] = [ids[next], ids[at]];
    setPrefs({ layerOrder: ids });
  };
  return (
    <>
      <div className="section-title">Filter order</div>
      <p className="tiny muted" style={{ margin: '0 0 8px' }}>
        The strip under the chart, and the order a sideways swipe moves through
        it. Kept on this device, so it holds across every war you start.
      </p>
      <div className="stack">
        {layers.map((l, i) => (
          <div key={l.id} className="card row row--between small" style={{ gap: 8 }}>
            <span style={{ minWidth: 0 }}>{l.label}</span>
            {/* The same arrows the harbor and the garrison use, so this is
                a control the player has already met. */}
            <span className="shiprow__order">
              <button
                className="orderbtn"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`Move ${l.label} up`}
              >
                ▲
              </button>
              <button
                className="orderbtn"
                onClick={() => move(i, 1)}
                disabled={i === layers.length - 1}
                aria-label={`Move ${l.label} down`}
              >
                ▼
              </button>
            </span>
          </div>
        ))}
      </div>
      {prefs.layerOrder.length > 0 && (
        <button
          className="btn btn--block"
          style={{ marginTop: 8 }}
          onClick={() => setPrefs({ layerOrder: [] })}
        >
          Back to the default order
        </button>
      )}
    </>
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

      <FilterOrder />

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
