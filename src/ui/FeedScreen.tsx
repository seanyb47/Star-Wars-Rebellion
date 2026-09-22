import { canSee } from '../sim';
import { useEffect, useRef, useState } from 'react';
import type { EventKind, GameEvent, GameState } from '../sim';
import { usePrefs, withKind } from './prefs';

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
 * **Both of them are disabled and stay that way for now.** *"We can add sound
 * files later. You can just gray that one out for now, just leave a spot for it
 * and we'll develop that later."* — and the advisor's lines are not recorded
 * yet either. The columns are real, the preferences are real and saved, and
 * nothing reads either of them.
 */
function Notifications() {
  const [prefs, setPrefs] = usePrefs();
  return (
    <div className="notify">
      <div className="notify__row notify__row--head tiny muted">
        <span className="notify__what">What happens</span>
        <span className="notify__col">Pop-up</span>
        <span className="notify__col">Sound</span>
        <span className="notify__col">Narrator</span>
      </div>
      {KIND_ORDER.map((kind) => {
        const pops = !prefs.popupOff.includes(kind);
        return (
          <div key={kind} className="notify__row">
            <span className="notify__what">
              <span className={`event__kind event__kind--${kind}`} aria-hidden="true" />
              {KIND_LABEL[kind]}
            </span>
            <button
              className={`notify__box${pops ? ' notify__box--on' : ''}`}
              aria-pressed={pops}
              aria-label={`Pop-up for ${KIND_LABEL[kind].toLowerCase()}`}
              onClick={() => setPrefs({ popupOff: withKind(prefs.popupOff, kind, !pops) })}
            >
              {pops ? '☑' : '☐'}
            </button>
            <button className="notify__box" disabled aria-label="Sound, not yet built">
              ☐
            </button>
            <button
              className="notify__box"
              disabled
              aria-label="Narrator, not yet recorded"
            >
              ☐
            </button>
          </div>
        );
      })}
      <p className="tiny muted notify__foot">
        Everything reaches the log whichever of these is set. Sounds are not built
        yet, and the advisor's lines are not recorded yet.
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
        <LogHead />
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
      <LogHead />
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
function LogHead() {
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
      {open && <Notifications />}
    </div>
  );
}
