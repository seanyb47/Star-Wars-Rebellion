# Island art — which painting went where

Thirty-two paintings arrived in four packs on 20 September 2026. They are
installed as **per-island** art: `src/art/isles/<slug>.webp`, which
`paintedIsle()` checks *before* an island's archetype, so a named island wears
its own painting and every other island keeps the archetype banner it had.

Nothing was replaced. The ten archetype paintings in `src/art/islands/` are
untouched and still cover the rest.

**Reassigning one is a rename.** `scripts/art.py retire isles/<old-slug>` then
`scripts/art.py add <master> isles/<new-slug>`; the masters are kept at full
resolution in `art-masters/isles/`, so no painting has to be asked for twice.

The packs are wide panoramas (about 2000 x 760) and their own README asks for
the central horizontal band, so every crop is full width, centred vertically,
down to the 768 x 204 the island banner uses. The crop box is recorded per
painting in `art-manifest.json`.

| Island | Reach | Painting | What the pack calls it | Why |
|---|---|---|---|---|
| **Brimstone Cay** | Cinder Reach | Grayfall | agricultural volcanic colony | An ash-season volcanic colony for a volcanic cay. |
| **Firewatch** | Cinder Reach | Cinderstep | terraced agricultural island | A volcanic island for the active volcano. |
| **Greenholm** | Cinder Reach | Verdant Bastion | frontier naval station | A Crown naval station in forest, for the forested island that is heavily patrolled. |
| **Leeward Keep** | Cinder Reach | Thunderhead Isle | caldera settlement | A caldera in the storm belt, for Blackwater's fortress in the Sea of Storms. |
| **Sorrowhead** | Cinder Reach | Blackreed | raised swamp settlement | A blackwater swamp, which is where the Bog-folk of the Sea of Storms live. |
| **Coralhome** | Coral Reach | Luminous Shoals | Reef-folk settlement | The pack's Reef-folk settlement, for the Reef-folk homeland. |
| **Graving Bay** | Coral Reach | Embercut Yard | major shipyard | A major shipyard for the great civilian dockyards. |
| **Hawksbill Bay** | Coral Reach | Pearlhaven | pearl-diving civilization | A pearl-diving lagoon for the island of amber and turtle-shell. |
| **Hearsay Cay** | Coral Reach | Thousand Teeth | pillar archipelago city | A karst city of pillars for the island that sells to both sides. |
| **The Shoals** | Coral Reach | Rootwater | root-and-stilt settlement | A root-and-stilt settlement in the shallows, for the Shoal-folk. |
| **Northreach** | Rime Reach | Frostgate | fortress port | A polar fortress port for the Urskin homeland. |
| **Tallow Cay** | Rime Reach | Boneharbor | whaling refuge | An Urskin whaling refuge for the whale-oil island. |
| **Blackreef** | Salt Reach | Knifewater Cove | hidden free port | A hidden Confederate free port for Jubal the Fat's corsair haven. |
| **Saltgrave** | Salt Reach | Sunscar | desert trade harbor | A hot arid trade harbor for the salt-slave island under a hard white sun. |
| **The Terraces** | Salt Reach | Cloudfall | terraced waterfall civilization | A terraced waterfall civilization for the rice breadbasket. |
| **The White Flats** | Salt Reach | Whitewake | salvage settlement | A salt coast for the salt flats. The names even agree. |
| **Ballmoor** | Sovereign Reach | Steamcrown | hot-spring harbor | A geothermal hot-spring harbor — steam and forges — for the foundries. |
| **Cartmel** | Sovereign Reach | Amber Abbey | monastery port | A monastery port for the Great Library. |
| **Chandler's Rest** | Sovereign Reach | Heatherwake | fishing and wool port | A quiet moorland fishing port for Hale's birthplace. |
| **Chepstow** | Sovereign Reach | Sevenmouth | trade metropolis | A trade metropolis for the market island. |
| **Corsham Head** | Sovereign Reach | Highmere | cliff city | A cliff city for a headland. |
| **Gorley** | Sovereign Reach | Windscar Steppe | pastoral island port | A windswept maritime steppe for the island that hates the Crown. |
| **Kingsward** | Sovereign Reach | Lowtide Crown | ancient causeway settlement | An ancient causeway settlement, crown in its name, for the naval academy. |
| **Minterne** | Sovereign Reach | Tidemarble | tidal marble city | A tidal marble city for the banking houses. |
| **The Aldermain** | Sovereign Reach | Aureate Haven | capital harbor | The Crown capital harbor painting, for the Crown capital. |
| **Yarrow Minor** | Sovereign Reach | Rainforge | water-powered arsenal port | A water-powered arsenal port for the royal dockyard. |
| **Starcross** | Whalers' Reach | Skyglass | mountain lake-port | A high clear-sky lake port for the island of the best navigators alive. |
| **Wrightsport** | Whalers' Reach | Veilwood | cedar archipelago settlement | A cedar archipelago — boat timber — for the shipwright capital. |
| **Anchorite Rock** | Wreckers' Reach | The Drowned Observatory | ancient ruin | An ancient ruin for the hermit island, in a Sea of drowned temples. |
| **Gibbet Rock** | Wreckers' Reach | Maelstrom Reach | split-island fortress settlement | A split-island fortress for the Imperium prison. |
| **The Kettles** | Wreckers' Reach | Lantern Deep | bioluminescent cavern harbor | A bioluminescent cavern harbor for the prison mines inside a leviathan's skull. |
| **Freeport** | — (runtime name) | Redwake | free port | The pack's own free port, for the island the articles were signed on. |

## Still on their archetype banner

These 32 keep the painting of the kind of place they are, which is still the right answer for an island with no note and no role of its own:

Ashcombe, Avermere, Basilisk Rock, Bracton, Chaswell, Coffinswell, Denby Cay, Frostwick, Gardenholm, Marlbury, Newmarket, Noonday Rock, Oakhanger, Pitchcombe, Powder Isle, Preston's Reach, Ravenscar, Rime Island, Ropley, Salthouse, Sawtry, Scaldwell, Sharpness, Sievern, Slaughden, Tamalu, Tarmouth, Tundvik, Ulverne, Varrow, Wainfleet, Wrackham.
