import { useMemo, useState } from 'react';
import manifest from '../../art-manifest.json';

/**
 * Every painting in the game, on one page, at the size it ships at.
 *
 * Sean, 19 September: *"Can you save all art to Google Drive also? So I can
 * view it when I want. All unit thumbnails."*
 *
 * The Drive half of that could not be done from here — the connector takes a
 * file only as base64 inline, and the tool channel truncates long output, so
 * anything past about a 20KB image cannot be round-tripped. Pushing 139 files
 * and 5MB through it was not on.
 *
 * This is the part that answers what he actually asked for, and it is better
 * than a folder would have been. It deploys with the game, so the URL is one
 * he already has and the page is never out of date: install a painting and it
 * is here on the next deploy, with no second copy to remember to update. The
 * files are the ones the game itself loads, at full shipped resolution.
 *
 *   ?art=paintings
 *
 * Not linked from the game. It is an instrument, like the `?art` contact
 * sheet it sits beside, and the game must never depend on it.
 */

/** Vite inlines the lot at build time — the same glob the game itself uses. */
const ALL = import.meta.glob('../art/**/*.{webp,png,jpg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

type Entry = {
  folder: string;
  slug: string;
  url: string;
  title: string;
  source: string;
  note: string;
  shipped: string;
  master: string;
  version: number;
};

const REGISTER = (manifest as { assets: Record<string, Record<string, unknown>> }).assets;

/**
 * Folder order, because A–Z would open on `buildings` and bury the ships.
 * Anything not named here still shows, after these, alphabetically — a new
 * folder appears on its own rather than being silently dropped.
 */
const FIRST = ['ships', 'faces', 'portraits', 'islands', 'creatures', 'missions', 'buildings', 'crests'];

function read(): Entry[] {
  return Object.entries(ALL).map(([path, url]) => {
    const parts = path.split('/');
    const folder = parts[parts.length - 2];
    const slug = parts[parts.length - 1].replace(/\.[a-z]+$/, '');
    const e = REGISTER[`${folder}/${slug}`] ?? {};
    const shipped = e.shipped as { w?: number; h?: number; bytes?: number } | undefined;
    const master = e.master as { w?: number; h?: number } | undefined;
    return {
      folder,
      slug,
      url,
      title: (e.title as string) || slug,
      source: (e.source as string) || '',
      note: (e.notes as string) || '',
      shipped: shipped ? `${shipped.w}×${shipped.h} · ${Math.round((shipped.bytes ?? 0) / 1024)}KB` : '',
      master: master ? `${master.w}×${master.h}` : '',
      version: (e.version as number) ?? 1,
    };
  });
}

export function PaintingGallery() {
  const all = useMemo(() => {
    const list = read();
    const rank = (f: string) => {
      const i = FIRST.indexOf(f);
      return i === -1 ? FIRST.length : i;
    };
    return list.sort(
      (a, b) =>
        rank(a.folder) - rank(b.folder) ||
        a.folder.localeCompare(b.folder) ||
        a.title.localeCompare(b.title),
    );
  }, []);

  const [q, setQ] = useState('');
  const [wide, setWide] = useState(false);
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? all.filter((e) =>
        `${e.folder} ${e.slug} ${e.title} ${e.source} ${e.note}`.toLowerCase().includes(needle),
      )
    : all;

  const folders: string[] = [];
  for (const e of shown) if (!folders.includes(e.folder)) folders.push(e.folder);

  return (
    <div className="pg">
      <header className="pg__bar">
        <div>
          <b>Master of the Seven Seas — every painting</b>
          <div className="pg__sub">
            {all.length} assets{shown.length !== all.length && ` · ${shown.length} shown`}. Tap one
            to open the file on its own.
          </div>
        </div>
        <input
          className="pg__find"
          type="search"
          value={q}
          placeholder="Find a painting"
          onChange={(e) => setQ(e.target.value)}
          aria-label="Find a painting"
        />
        <button className="pg__size" onClick={() => setWide((w) => !w)}>
          {wide ? 'Smaller' : 'Bigger'}
        </button>
      </header>

      {shown.length === 0 && <p className="pg__none">Nothing by that name.</p>}

      {folders.map((folder) => {
        const items = shown.filter((e) => e.folder === folder);
        return (
          <section key={folder}>
            <h2 className="pg__folder">
              {folder} <span>{items.length}</span>
            </h2>
            <div className={`pg__grid${wide ? ' pg__grid--wide' : ''}`}>
              {items.map((e) => (
                <a key={`${e.folder}/${e.slug}`} className="pg__cell" href={e.url} target="_blank" rel="noreferrer">
                  <img src={e.url} alt={e.title} loading="lazy" />
                  <b>{e.title}</b>
                  <span className="pg__meta">
                    {e.slug}
                    {e.version > 1 && ` · v${e.version}`}
                  </span>
                  <span className="pg__meta">
                    {e.shipped}
                    {e.master && ` · master ${e.master}`}
                  </span>
                  {e.source && <span className="pg__meta pg__meta--dim">{e.source}</span>}
                </a>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
