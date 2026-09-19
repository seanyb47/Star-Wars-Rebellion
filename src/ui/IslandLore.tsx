import terms from '../data/terms.json';
import loreData from '../data/lore.json';
import { creature, type GameState, type Sector, type System } from '../sim';

/**
 * What an island *is*, as against what is on it.
 *
 * This was the fifth tab of the island panel until 19 September, when Sean
 * cut it: *"Cut lore. Move to encyclopedia."* He is right that it does not
 * belong beside the four tabs you act on — the sea it lies in and the kind of
 * place it is do not change, so it is three paragraphs you read the first
 * time you open an island and swipe past every time after.
 *
 * It is the same component, rendered from the encyclopedia's Locations page
 * instead. Kept in its own file rather than left in `SystemSheet` so that the
 * encyclopedia does not have to import the island panel to show a paragraph.
 */
export function IslandLore({
  state,
  system,
  sector,
}: {
  state: GameState;
  system: System;
  sector: Sector;
}) {
  const sea = (loreData.seas as Record<string, string>)[sector.sea];
  const kind = (loreData.archetypes as Record<string, string>)[system.archetype];
  const beast = system.beast ? creature(system.beast) : undefined;
  const seen = beast && system.beastSeen?.[state.player];
  return (
    <>
      {system.chartName && system.chartName !== system.name && (
        <p className="tiny muted" style={{ margin: '0 0 10px' }}>
          The charts still call this island {system.chartName}.
        </p>
      )}

      {system.note && <p className="portrait__note serif">{system.note}</p>}

      <div className="section-title">{sector.sea}</div>
      <p className="lore__body">{sea ?? `${sector.name} lies in ${sector.sea}.`}</p>
      <p className="tiny muted" style={{ margin: '4px 0 0' }}>
        {sector.name} · {sector.systemIds.length} {terms.islands.toLowerCase()}
      </p>

      <div className="section-title">The island</div>
      <p className="lore__body">{kind}</p>

      {seen && beast && (
        <>
          <div className="section-title">In the water</div>
          <p className="lore__body">
            <b>{beast.name}</b>. {beast.lore}
          </p>
          {system.beastSlain && (
            <p className="tiny muted" style={{ margin: '4px 0 0' }}>
              Killed, and the water off {system.name} is only water now.
            </p>
          )}
        </>
      )}
    </>
  );
}
