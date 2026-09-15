import { useEffect, useState } from 'react';
import factionData from '../data/factions.json';
import terms from '../data/terms.json';
import {
  buildMenu,
  controlTally,
  freeSlots,
  requiredGarrison,
  smuggledOff,
  GARRISON_FOR_BAND,
  SMUGGLED_SHARE,
  SUPPORT_FIRM,
  SUPPORT_STEADY,
  type GameState,
  type System,
} from '../sim';
import { IslandGlyph } from './art';
import { Sheet } from './components';
import { AdvisorPortrait } from './narrator/AdvisorPortrait';
import { narratorIdFor, preloadClips } from './narrator/assets';
import type { NarratorMood } from './narrator/mood';
import { useAdvisorVoice } from './narrator/useAdvisorVoice';

/**
 * Your advisor. The world bible gives each side one: a sea-parrot the
 * Confederacy cannot get rid of, and the First Secretary of the Admiralty
 * — the Imperator's M, dry and exact and sarcastic in the way that means she
 * expected better. The player is the Imperator on one side and the
 * Captain-General of the Free on the other, and each advisor says so in
 * their own way (world bible §16.5).
 *
 * They answer a fixed set of questions from the live state and take you
 * straight to what they are talking about. They do not converse — see the
 * README for why that would need a backend this game does not have.
 */
export const NARRATOR = {
  empire: {
    name: 'Secretary Marlow',
    style: "dry, exact, sarcastic, entirely the Imperium's",
  },
  alliance: {
    name: 'Mr Pennywhistle',
    style: 'loud, rude, usually right',
  },
} as const;

type Answer = {
  id: string;
  question: string;
  /** Line the advisor says before the list. */
  reply: string;
  /** The face that goes with it (plan F2): the tone of the answer, not the
   *  state of a battle. */
  mood: NarratorMood;
  islands?: System[];
  crew?: Array<{ id: string; name: string; note: string }>;
};

function buildAnswers(state: GameState): Answer[] {
  const you = state.player;
  const held = state.systems.filter((s) => s.control === you);
  const fs = state.factions[you];
  const net = fs.income - fs.upkeep;
  const tally = controlTally(state);
  const theirs = tally[you === 'empire' ? 'alliance' : 'empire'];
  const voice = you === 'empire';

  const canBuild = held.filter(
    (s) =>
      !s.uprising &&
      s.facilities.some((f) => f.owner === you && buildMenu(f).length > 0) &&
      freeSlots(s) > 0,
  );
  const idle = state.characters.filter((c) => c.faction === you && c.status === 'available');
  const restless = held.filter(
    (s) => s.uprising || (s.populated && s.garrison < requiredGarrison(s.support[you], s.uprising)),
  );
  // What allegiance is costing today, worst first, and what is undermanned.
  const leaky = [...held]
    .filter((s) => s.populated && smuggledOff(s, you) > 0)
    .sort((a, b) => smuggledOff(b, you) - smuggledOff(a, you))
    .slice(0, 5);
  const short = held
    .filter((s) => s.populated && s.garrison < requiredGarrison(s.support[you], s.uprising))
    .slice(0, 5);
  const targets = state.systems
    .filter((s) => s.control === 'neutral' && s.populated && s.explored[you])
    .sort((a, b) => b.support[you] - a.support[you])
    .slice(0, 6);

  return [
    {
      id: 'build',
      question: 'Where can I build?',
      reply:
        canBuild.length === 0
          ? voice
            ? 'Nowhere. Every construction yard you own is on an island with no room left, or no yard at all. I did mention this.'
            : "Nowhere! Not a scrap of room left, and you've no construction yard to build with anyway."
          : voice
            ? `${canBuild.length} of your islands have a construction yard and room to use it. I would start, Imperator.`
            : `${canBuild.length} islands with room and a construction yard to fill it. Get on with it, General.`,
      mood: 'neutral',
      islands: canBuild,
    },
    {
      id: 'crew',
      question: 'Who is free to sail?',
      reply:
        idle.length === 0
          ? voice
            ? 'Nobody. All of them at sea or laid up — which is where you sent them, Imperator.'
            : "Nobody! They're all out. You sent them, General, remember."
          : voice
            ? `${idle.length} idle. The best negotiator is listed first; the rest are waiting to be noticed.`
            : `${idle.length} of them sitting about. Best talker's at the top.`,
      mood: 'neutral',
      crew: [...idle]
        .sort((a, b) => b.diplomacy - a.diplomacy)
        .map((c) => ({
          id: c.id,
          name: c.name,
          note: `Diplomacy ${c.diplomacy} · ashore at ${
            state.systems.find((s) => s.id === c.locationSystemId)?.name ?? 'unknown'
          }`,
        })),
    },
    {
      id: 'trouble',
      question: 'Where is the trouble?',
      reply:
        restless.length === 0
          ? voice
            ? "None. Every island you hold is quiet and garrisoned. Enjoy it; it won't last."
            : 'Nothing! Quiet as a chapel. Enjoy it.'
          : voice
            ? `${restless.length} islands in mutiny, or too thinly held to prevent one. I would attend to those before luncheon.`
            : `${restless.length} islands about to go up, or already have. Land some companies, General.`,
      mood: restless.length === 0 ? 'neutral' : 'grave',
      islands: restless,
    },
    {
      id: 'targets',
      question: 'Who might come over to us?',
      reply:
        targets.length === 0
          ? voice
            ? 'No unaligned island is charted. Send someone out to look. Preferably today.'
            : "Can't court what you haven't found. Go and look."
          : voice
            ? 'The unaligned islands most sympathetic to us, in order. The top of the list will not stay there.'
            : 'These lot like us best. Send a talker before the other side does.',
      mood: targets.length > 0 && targets[0].support[you] >= 50 ? 'encouraged' : 'neutral',
      islands: targets,
    },
    {
      id: 'ledger',
      question: 'How am I doing?',
      reply: voice
        ? `${Math.floor(fs.gold)} ${terms.gold.toLowerCase()} in hand, ${
            net >= 0 ? `up ${net.toFixed(1)}` : `down ${Math.abs(net).toFixed(1)}`
          } a day. You hold ${tally[you]} settled islands; they hold ${theirs}. The arithmetic is not complicated, Imperator.`
        : `${Math.floor(fs.gold)} in the chest and ${
            net >= 0 ? `${net.toFixed(1)} a day coming in` : `${Math.abs(net).toFixed(1)} a day going out`
          }. ${tally[you]} islands to their ${theirs}, General.`,
      mood: net < 0 ? 'grave' : tally[you] >= theirs ? 'encouraged' : 'neutral',
    },
    {
      // The rules, in the advisor's mouth. Smuggling takes its cut quietly
      // every day and a player who never finds out why the gold is short is
      // playing a different game from the one being simulated.
      id: 'loyalty',
      question: 'How does allegiance work?',
      reply: voice
        ? `Every island's regard for us and for them adds up to a hundred: what you win, they lose. At ${SUPPORT_FIRM} and over an island is firm and ships us everything. From ${SUPPORT_STEADY} it is steady and ${Math.round(
            SMUGGLED_SHARE.steady * 100,
          )}% of its trade goes out the back to them. Under that it is thin — ${Math.round(
            SMUGGLED_SHARE.thin * 100,
          )}%, and it starts telling them what we have here and in the rest of the chain. An island in ${terms.mutiny.toLowerCase()} pays us nothing and pays them half. These are the islands costing us most, Imperator.`
        : `Nobody's half in love with both of us — every island's hundred points are split between us and the Crown, so a point we take is a point off them. Firm at ${SUPPORT_FIRM} and the harbor's honest. Steady at ${SUPPORT_STEADY} and ${Math.round(
            SMUGGLED_SHARE.steady * 100,
          )} in every hundred slips out the back. Thin, and it's ${Math.round(
            SMUGGLED_SHARE.thin * 100,
          )}% away plus a loose tongue. In ${terms.mutiny.toLowerCase()}? They get half and we get nothing. These are the leaky ones, General.`,
      mood: leaky.length > 2 ? 'grave' : leaky.length > 0 ? 'neutral' : 'encouraged',
      islands: leaky,
    },
    {
      id: 'garrisons',
      question: `What are ${terms.garrison.toLowerCase()}s for?`,
      reply: voice
        ? `Order, and the customs books. A firm island needs nobody; a steady one wants ${GARRISON_FOR_BAND.steady}; a thin one wants ${GARRISON_FOR_BAND.thin} or it will rise; ${GARRISON_FOR_BAND.uprising} companies will face down a ${terms.mutiny.toLowerCase()} whatever the island thinks of us. And every company ashore takes a twentieth off what the smugglers move, which is a hand on it rather than a cure. These are short of what they are asking for.`
        : `Keeping the peace and watching the wharf. Firm island, nobody. Steady, ${GARRISON_FOR_BAND.steady}. Thin, ${GARRISON_FOR_BAND.thin} or it goes up. ${GARRISON_FOR_BAND.uprising} will sit on a ${terms.mutiny.toLowerCase()} till it stops shouting. Every company takes a twentieth off the smugglers too — it helps, it doesn't fix it. These are undermanned, General.`,
      mood: short.length > 2 ? 'grave' : short.length > 0 ? 'neutral' : 'encouraged',
      islands: short,
    },
  ];
}

export function Narrator({
  state,
  onClose,
  onOpenIsland,
  onOpenCharacter,
  onOpenAlmanac,
}: {
  state: GameState;
  onClose: () => void;
  onOpenIsland: (systemId: string) => void;
  onOpenCharacter: (characterId: string) => void;
  onOpenAlmanac: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const advisor = NARRATOR[state.player];
  const answers = buildAnswers(state);
  const open = answers.find((a) => a.id === openId) ?? null;
  const advisorId = narratorIdFor(state.player);
  const voice = useAdvisorVoice();

  // Plan F5: warm the cache for every clip that exists, the moment the sheet
  // mounts, so a mood change never waits on a download.
  useEffect(() => preloadClips(advisorId), [advisorId]);

  return (
    <Sheet
      title={advisor.name}
      subtitle={`${factionData[state.player].shortName} · ${advisor.style}`}
      onClose={onClose}
      stacked
    >
      <div className="row" style={{ gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
        <AdvisorPortrait id={advisorId} mood={open?.mood ?? 'neutral'} talking={voice.talking} width={120} />
        <p className="small" style={{ margin: 0, flex: 1 }}>
          {open
            ? open.reply
            : state.player === 'empire'
              ? 'Ask, Imperator. The ledgers are open.'
              : "Well? Ask, General. I haven't got all day."}
        </p>
      </div>

      <div className="stack">
        {answers.map((answer) => (
          <button
            key={answer.id}
            className={`btn btn--block${open?.id === answer.id ? ' btn--primary' : ''}`}
            style={{ justifyContent: 'flex-start' }}
            onClick={() => {
              const next = open?.id === answer.id ? null : answer.id;
              setOpenId(next);
              if (next) voice.say(answer.reply, answer.mood);
              else voice.hush();
            }}
          >
            {answer.question}
          </button>
        ))}
      </div>

      {open?.islands && open.islands.length > 0 && (
        <>
          <div className="section-title">Tap to go there</div>
          <div className="stack">
            {open.islands.map((system) => (
              <button
                key={system.id}
                className="card card--tap row"
                style={{ gap: 10, width: '100%', textAlign: 'left' }}
                onClick={() => onOpenIsland(system.id)}
              >
                <IslandGlyph
                  seed={system.name}
                  faction={system.control}
                  settled={system.populated}
                  size={30}
                />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="small" style={{ fontWeight: 600 }}>
                    {system.name}
                  </span>
                  <span className="tiny muted" style={{ display: 'block' }}>
                    {system.uprising
                      ? terms.mutiny
                      : `${terms.allegiance} ${Math.round(system.support[state.player])}`}
                  </span>
                </span>
                <span className="muted" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </>
      )}

      {open?.crew && open.crew.length > 0 && (
        <>
          <div className="section-title">Tap to give orders</div>
          <div className="stack">
            {open.crew.map((member) => (
              <button
                key={member.id}
                className="card card--tap row"
                style={{ gap: 10, width: '100%', textAlign: 'left' }}
                onClick={() => onOpenCharacter(member.id)}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="small" style={{ fontWeight: 600 }}>
                    {member.name}
                  </span>
                  <span className="tiny muted" style={{ display: 'block' }}>
                    {member.note}
                  </span>
                </span>
                <span className="muted" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="section-title">Still lost?</div>
      <button className="btn btn--block" onClick={onOpenAlmanac}>
        Open the Almanac
      </button>
    </Sheet>
  );
}
