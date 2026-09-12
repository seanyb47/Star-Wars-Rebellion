# Painted art

Drop files here and they appear in the game. Nothing needs registering: the
globs in `src/ui/painted.ts` find whatever is present at build time, and any
subject without a file keeps its drawn cameo. The art can therefore arrive one
piece at a time without the game ever being half-finished.

## Naming

The file name is a slug of the subject, so `Anselm "Big" Torvik` becomes
`anselm-big-torvik.webp`. Quotes and punctuation are ignored.

| folder | named after | example |
|---|---|---|
| `portraits/` | the character's full name, title included | `admiral-corvus-blackwater.webp` |
| `ships/` | the ship role | `large.webp`, `transport.webp` |
| `islands/` | the island **archetype**, not the island | `jungle-isle.webp`, `port-city.webp` |
| `scenes/` | the dispatch event kind | `battle.webp`, `mutiny.webp` |

Islands are painted by archetype on purpose. There are a hundred of them and
they do not each need a painting; a dozen archetypes shared across the map is
both affordable and more coherent.

## Format

- **WebP**, quality ~82. Half the size of PNG at the same quality and supported
  everywhere this game runs.
- **Portraits: 512×512**, square, subject centred, head and shoulders. They are
  displayed inside a circle as small as 32px, so anything near a corner is lost
  and anything fine is a smudge.
- **Ships and islands: 768×512**, landscape.
- **Scenes: 1024×432**, the dispatch card's own proportion.
- Keep each file **under 120KB**. Twenty-six portraits at 120KB is 3MB, which is
  already thirty times the size of the entire game as it stands.

## Before adding a lot of these

The whole app is currently ~95KB gzipped and loads instantly on a phone. Bulk
painted art changes that, and the fix is lazy loading rather than restraint —
but it has to be built before the art lands, not after.
