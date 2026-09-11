import type { EventKind } from '../sim';
import {
  CategoryIcon,
  CharacterPortrait,
  CompanyIcon,
  CompanyRow,
  CompassRose,
  FacilityIcon,
  FactionCrest,
  IslandGlyph,
  IslandPortrait,
  NarratorFigure,
  NarratorPortrait,
  ShipIcon,
} from './art';
import { EventScene } from './EventScene';

/**
 * Every piece of art in the game, on one page.
 *
 * Not a screen of the game and never linked from one — open it with `?art`.
 * It exists because you cannot judge a set of drawings one screenshot at a
 * time: the problems that matter are the ones you only see side by side.
 * Every art bug found so far was found by accident, magnifying one render —
 * pips the colour of a faction, a crowd that read as tombstones, a glow that
 * drew as a dome. All three are obvious here in a second.
 *
 * Each thing is shown at the sizes it actually ships at, in every tint it can
 * take, on the ground it sits on. Anything that looks fine here and wrong in
 * the game means this page is lying — fix the page too.
 */

const FACTIONS = ['empire', 'alliance', 'neutral', 'none'] as const;
const PEOPLE = ['Human', 'Reef-folk', 'Urskin', 'The Hushed', 'Shoal-folk', 'Bog-folk'];
const NAMES = [
  'Adaira Hale',
  'Corvus Blackwater',
  'Anselm Torvik',
  'Sable',
  'Hesper Lyn',
  'Maren Quist',
];
const ISLES = ['Bysse', 'Coralhome', 'Fraytis', 'Wistrell', 'Highwater', 'Denby Cay'];
const EVENTS: EventKind[] = ['war', 'flip', 'mutiny', 'battle', 'loss', 'order', 'mission'];

function Row({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="artsheet__row">
      <h2 className="artsheet__label">
        {label}
        {note && <span className="artsheet__note"> — {note}</span>}
      </h2>
      <div className="artsheet__items">{children}</div>
    </section>
  );
}

function Item({ caption, ground, children }: { caption: string; ground?: string; children: React.ReactNode }) {
  return (
    <div className="artsheet__item">
      <div className="artsheet__stage" style={ground ? { background: ground } : undefined}>
        {children}
      </div>
      <span className="artsheet__caption">{caption}</span>
    </div>
  );
}

export function ArtSheet() {
  return (
    <div className="artsheet">
      <header className="artsheet__head">
        <h1>The whole set</h1>
        <p className="muted">
          Every drawing in the game, at the sizes it ships at. Judge it as one thing: does a ship
          look like it comes from the same hand as an island, and does anything shout that should
          whisper?
        </p>
      </header>

      {/* --- The palette, first. Most incoherence is colour, not drawing. --- */}
      <Row label="Tokens" note="every colour that has a name">
        {[
          'bg',
          'bg-raised',
          'bg-sunken',
          'border',
          'text',
          'muted',
          'brass',
          'water-deep',
          'water',
          'shallow',
          'land',
          'land-bare',
          'empire',
          'alliance',
          'neutral',
          'unknown',
          'good',
          'bad',
        ].map((token) => (
          <div className="artsheet__item" key={token}>
            <div className="artsheet__swatch" style={{ background: `var(--${token})` }} />
            <span className="artsheet__caption">{token}</span>
          </div>
        ))}
      </Row>

      <Row label="Islands" note="the chart mark, at map size and panel size">
        {ISLES.slice(0, 4).map((seed) =>
          FACTIONS.map((faction) => (
            <Item key={`${seed}-${faction}`} caption={`${seed} · ${faction}`}>
              <IslandGlyph seed={seed} faction={faction} settled={faction !== 'none'} size={30} />
            </Item>
          )),
        )}
      </Row>

      <Row label="Island portraits" note="the big one, with and without works ashore">
        {ISLES.map((seed, i) => (
          <Item key={seed} caption={seed}>
            <IslandPortrait
              seed={seed}
              faction={FACTIONS[i % FACTIONS.length]}
              settled={i !== 5}
              facilities={i}
              facilityTypes={['mine', 'shipyard', 'training_facility'].slice(0, i % 4)}
              mutiny={i === 2}
              size={96}
            />
          </Item>
        ))}
      </Row>

      <Row label="Ships" note="four roles, the only thing that says what a hull is">
        {(['small', 'medium', 'large', 'transport'] as const).map((role) =>
          [30, 44].map((size) => (
            <Item key={`${role}-${size}`} caption={`${role} ${size}`}>
              <ShipIcon role={role} size={size} />
            </Item>
          )),
        )}
      </Row>

      <Row label="Buildings" note="at 30, which is where they have to work">
        {(['mine', 'refinery', 'construction_yard', 'training_facility', 'shipyard'] as const).map(
          (type) =>
            [30, 44].map((size) => (
              <Item key={`${type}-${size}`} caption={`${type.replace(/_/g, ' ')} ${size}`}>
                <FacilityIcon type={type} size={size} />
              </Item>
            )),
        )}
      </Row>

      <Row label="Companies" note="one figure, and the row that counts them">
        <Item caption="icon 30">
          <CompanyIcon size={30} />
        </Item>
        <Item caption="icon 44">
          <CompanyIcon size={44} />
        </Item>
        <Item caption="2 of 5">
          <CompanyRow present={2} needed={3} max={5} />
        </Item>
        <Item caption="5 of 5">
          <CompanyRow present={5} needed={3} max={5} />
        </Item>
        <Item caption="0 of 5">
          <CompanyRow present={0} needed={2} max={5} />
        </Item>
      </Row>

      <Row label="Category marks" note="the three things an island has">
        {(['missions', 'military', 'facilities'] as const).map((kind) =>
          [30, 44].map((size) => (
            <Item key={`${kind}-${size}`} caption={`${kind} ${size}`}>
              <CategoryIcon kind={kind} size={size} />
            </Item>
          )),
        )}
      </Row>

      <Row label="People" note="the same faces at 32, 44 and 68 — most portraits only work at one">
        {NAMES.map((name, i) =>
          [32, 44, 68].map((size) => (
            <Item key={`${name}-${size}`} caption={`${name.split(' ')[0]} ${size}`}>
              <CharacterPortrait
                name={name}
                faction={FACTIONS[i % FACTIONS.length]}
                people={PEOPLE[i % PEOPLE.length]}
                size={size}
              />
            </Item>
          )),
        )}
      </Row>

      <Row label="People, dimmed" note="away at sea or laid up">
        {NAMES.slice(0, 4).map((name, i) => (
          <Item key={name} caption={name.split(' ')[0]}>
            <CharacterPortrait
              name={name}
              faction={FACTIONS[i % 2]}
              people={PEOPLE[i]}
              size={44}
              dim
            />
          </Item>
        ))}
      </Row>

      <Row label="Crests and rose" note="the set pieces">
        <Item caption="empire 96">
          <FactionCrest faction="empire" size={96} />
        </Item>
        <Item caption="alliance 96">
          <FactionCrest faction="alliance" size={96} />
        </Item>
        <Item caption="empire 44">
          <FactionCrest faction="empire" size={44} />
        </Item>
        <Item caption="alliance 44">
          <FactionCrest faction="alliance" size={44} />
        </Item>
        <Item caption="rose 96">
          <CompassRose size={96} />
        </Item>
        <Item caption="rose 44">
          <CompassRose size={44} showLetters={false} />
        </Item>
      </Row>

      <Row label="The advisor" note="portrait in the tab bar, figure when they speak">
        <Item caption="empire portrait">
          <NarratorPortrait faction="empire" size={44} />
        </Item>
        <Item caption="alliance portrait">
          <NarratorPortrait faction="alliance" size={44} />
        </Item>
        <Item caption="empire figure">
          <NarratorFigure faction="empire" size={56} />
        </Item>
        <Item caption="alliance figure">
          <NarratorFigure faction="alliance" size={56} />
        </Item>
      </Row>

      {/* Scenes last: they are the biggest thing and would dominate above. */}
      <Row label="Dispatch scenes" note="each kind, in each side's colour">
        {EVENTS.map((kind) =>
          (['--empire', '--alliance'] as const).map((tint) => (
            <div className="artsheet__scene" key={`${kind}-${tint}`}>
              {/* Seed must differ per tint: EventScene derives its gradient id
                  from kind+seed, and two identical ids on one page means the
                  second gradient is dropped and both scenes paint with the
                  first one's colour. The game shows one card at a time so it
                  never hits this — the sheet does, and did. */}
              <EventScene kind={kind} tint={`var(${tint})`} seed={`${kind}-${tint}`} height={118} />
              <span className="artsheet__caption">
                {kind} · {tint.replace('--', '')}
              </span>
            </div>
          )),
        )}
      </Row>

      <Row label="Scene variation" note="the same kind on four seeds — if these match, the seed is wasted">
        {['a', 'b', 'c', 'd'].map((seed) => (
          <div className="artsheet__scene" key={seed}>
            <EventScene kind="battle" tint="var(--alliance)" seed={seed} height={118} />
            <span className="artsheet__caption">battle · {seed}</span>
          </div>
        ))}
      </Row>
    </div>
  );
}
