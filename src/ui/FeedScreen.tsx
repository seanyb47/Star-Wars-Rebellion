import { canSee } from '../sim';
import { useEffect, useRef, useState } from 'react';
import type { EventKind, GameEvent, GameState } from '../sim';
import type { NarratorId } from './narrator/mood';
import { usePrefs, withKind } from './prefs';
import { narratorIdFor } from './narrator/assets';
import { previewNotification } from './useAudio';

/**
 * What each kind of news is, in the words the panel needs.
 *
 * The seven `EventKind`s are the taxonomy the log already sorts by — every
 * line in it is exactly one of these and its coloured mark is drawn from it —
 * so the notification settings use the same seven rather than inventing a
 * second list for the player to map onto the first.
 */
const KIND_LABEL: Record<EventKind, string> = {
  war: 'The war',
  flip: 'Islands changing hands',
  mutiny: 'Risings',
  battle: 'Actions at sea',
  mission: 'Missions',
  order: 'Orders finishing',
  loss: 'Losses',
};
/** In the order they are worth being interrupted for, loudest first. */
const KIND_ORDER: EventKind[] = ['war', 'flip', 'mutiny', 'battle', 'mission', 'order', 'loss'];

/**
 * Which news interrupts, which will make a sound, and which only goes to the
 * log.
 *
 * Sean, 22 September: *"there kind of should be three categories of alerts.
 * Ones that actually notify you on the top of the screen... and then there
 * should be ones that just make sounds... or you could uncheck both boxes and
 * have no notifications, and then the notification will just go to the log
 * itself, because there's a number on the log of unread."*
 *
 * So there are two checkboxes and the third category is both of them off —
 * which is the honest way to draw it, because "goes only to the log" is not a
 * thing you switch on, it is what is left when nothing else is switched on.
 * Everything reaches the log either way; these decide only how loudly.
 *
 * **Three columns since 22 September**, because Sean asked for the advisor to
 * be one of them: *"for notifications, we can also add 'Narrator'. we will
 * record each narrator saying various expressions like 'Informants have
 * provided information on [location, or 3 locations]' ... Sound just means the
 * notification or mission type."* That last clause is what separates the two:
 * **Sound** is a noise that says a thing of this kind happened, **Narrator** is
 * Marlow or Pennywhistle telling you what it was.
 *
 * **All three are live**, since Sean asked for the other two on 22 September:
 * *"Can you add sound effects for each notification? And voice also."* The
 * stingers were already written — the audio engine has sounded every kind
 * since it was built, and the guns for an action at sea were added with this —
 * so Sound is a switch on something that already happens. Narrator plays the
 * advisor's own recording of that kind of news, and is silent for a kind that
 * has none, which is every kind until the voice settings in the world bible
 * are filled in and `npm run voices` is run.
 *
 * All three default to on, stored as the exceptions. That is not a shrug: the
 * engine has always sounded everything, so an opt-in column would have taken
 * the sound away from everybody who has it and called it a feature. Whether
 * the game makes any noise at all is still the speaker in the top bar, which
 * is off until pressed.
 */
function Notifications({ who, onClose }: { who: NarratorId; onClose: () => void }) {
  const [prefs, setPrefs] = usePrefs();
  return (
    <div className="notify">
      <div className="notify__row notify__row--head tiny muted">
        <span className="notify__what">
          What happens
          {/* Sean, 23 September: *"In the notification log. There is no X to
              close tab."* The pill above toggles it, which is a thing you have
              to know; a panel that opened over the log should be closable the
              way everything else on screen is. */}
          <button className="notify__x" onClick={onClose} aria-label="Close notification settings">
            ✕
          </button>
        </span>
        <span className="notify__col">Pop-up</span>
        <span className="notify__col">Sound</span>
        <span className="notify__col">Narrator</span>
      </div>
      {KIND_ORDER.map((kind) => {
        const what = KIND_LABEL[kind].toLowerCase();
        /* Three columns, three lists, one shape: each holds the kinds that are
           switched *off*, so a box is ticked unless its kind is named. */
        const cols = [
          { on: !prefs.popupOff.includes(kind), what: 'Pop-up', key: 'popupOff' as const },
          { on: !prefs.soundOff.includes(kind), what: 'Sound', key: 'soundOff' as const },
          { on: !prefs.narratorOff.includes(kind), what: 'Narrator', key: 'narratorOff' as const },
        ];
        return (
          <div key={kind} className="notify__row">
            {/* Sean, 23 September: *"I don't hear unique chimes depending on
                type of log note."* Comparing two of them meant playing two
                wars, so the name of the row is a button: press it and that
                kind's sound plays and the advisor says a line of it. Both
                columns are ignored on purpose — you are pressing it to find
                out what it sounds like. */}
            <button
              className="notify__what notify__what--try"
              onClick={() => previewNotification(kind, who)}
              aria-label={`Hear ${what}`}
            >
              <span className={`event__kind event__kind--${kind}`} aria-hidden="true" />
              {KIND_LABEL[kind]}
              <span className="notify__try" aria-hidden="true">▸</span>
            </button>
            {cols.map((col) => (
              <button
                key={col.key}
                className={`notify__box${col.on ? ' notify__box--on' : ''}`}
                aria-pressed={col.on}
                aria-label={`${col.what} for ${what}`}
                onClick={() => setPrefs({ [col.key]: withKind(prefs[col.key], kind, !col.on) })}
              >
                {col.on ? '☑' : '☐'}
              </button>
            ))}
          </div>
        );
      })}
      <p className="tiny muted notify__foot">
        Press the name of a row to hear it. Everything reaches the log
        whichever of these is set, and none of them make a sound until the
        speaker in the top bar is on.
      </p>
    </div>
  );
}

export function FeedScreen({
  state,
  lastSeen,
  focusId,
  onJumpToCharacter,
  onRead,
}: {
  state: GameState;
  /** Highest event ordinal the player has already read. */
  lastSeen: number;
  /**
   * The entry the log was opened at, from a line in the running report.
   *
   * A log is a long page and the thing you tapped is somewhere down it. It is
   * scrolled to and marked rather than filtered to, because what you usually
   * want next is what happened *around* it.
   */
  focusId?: string | null;
  onJumpToCharacter: (characterId: string) => void;
  /** Open the card for a dispatch worth seeing as a picture. */
  onRead: (eventId: string) => void;
}) {
  /*
   * Only what this side could actually know.
   *
   * The log used to print `state.events` whole, which is both sides' orders in
   * one list: a do-nothing Crown game showed 111 of 145 events belonging to
   * the Confederacy, named — who sailed where and what for, who took command
   * of which island, when their troops finished drilling. `lab/leak.ts` is the
   * measurement and `canSee` is Sean's rule of 22 September, which is
   * `sightOf` applied to where the event happened.
   */
  const events = [...state.events].filter((e) => canSee(state, e, state.player)).reverse();
  const focus = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (focusId) focus.current?.scrollIntoView({ block: 'center' });
  }, [focusId]);

  if (events.length === 0) {
    return (
      <div className="pad">
        <LogHead who={narratorIdFor(state.player)} />
        <div className="empty">The log is empty. Start the clock.</div>
      </div>
    );
  }

  const order = (event: GameEvent) => Number(event.id.split('-')[1]) || 0;

  // One heading a day, the way a log is kept, rather than the day repeated
  // down the margin of every line.
  const days: Array<{ day: number; events: GameEvent[] }> = [];
  for (const event of events) {
    const last = days[days.length - 1];
    if (last && last.day === event.day) last.events.push(event);
    else days.push({ day: event.day, events: [event] });
  }

  return (
    <div className="pad">
      <LogHead who={narratorIdFor(state.player)} />
      {days.map(({ day, events: entries }) => (
        <section key={day} className="logday">
          <h3 className="logday__head serif">Day {day}</h3>
          {entries.map((event) => (
            <button
              key={event.id}
              ref={event.id === focusId ? focus : undefined}
              className={`event event--${event.kind}${
                order(event) > lastSeen ? ' event--unread' : ''
              }${event.id === focusId ? ' event--focus' : ''}`}
              // Every dispatch has a card, and the card has a way through to the
              // island. Being *notable* decides only whether the game stops you for
              // it unasked — not whether it is worth a picture when you go looking.
              onClick={() => {
                if (event.characterId && !event.systemId) onJumpToCharacter(event.characterId);
                else onRead(event.id);
              }}
            >
              <span className="event__kind" aria-hidden="true" />
              <span className="event__text">{event.text}</span>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

/**
 * The log's one control: a way to the notification settings.
 *
 * Folded away rather than standing open, because it is a thing you set once
 * and then read the log past for the rest of the war. Closed it is one line;
 * open it is the panel.
 */
function LogHead({ who }: { who: NarratorId }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="loghead">
      <button
        className={`listopt${open ? ' listopt--on' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((up) => !up)}
      >
        Notifications
      </button>
      {open && <Notifications who={who} onClose={() => setOpen(false)} />}
    </div>
  );
}
