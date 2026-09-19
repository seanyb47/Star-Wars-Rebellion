import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { version } from './package.json';

/**
 * A build id that changes every time, and a copy of it the app can fetch.
 *
 * Sean, 19 September: *"A previously-installed (PWA) session throws 404s on
 * load... Returning users could hit failed asset loads until a hard refresh."*
 * and *"Bump the version string each deploy — the menu still says v0.4.0 on a
 * new bundle."*
 *
 * There is no service worker in this project and never has been, so nothing is
 * precaching anything. What actually goes stale is the **document**: an
 * installed standalone app holds `index.html`, that HTML names asset files by
 * content hash, and a deploy deletes the hashes it was naming. The shell then
 * asks for files that are gone.
 *
 * Two things fix it, and both need an id that moves on its own rather than a
 * hand-bumped version anybody can forget:
 *
 *  - `__BUILD_ID__` is compiled into the bundle.
 *  - `build.json` is written beside it, **unhashed**, so it can be fetched
 *    with `cache: 'no-store'` and compared. A shell whose bundle disagrees
 *    with the server is a stale shell, and says so before anything 404s.
 */
const BUILD_ID = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);

function buildStamp(): Plugin {
  return {
    name: 'seven-seas-build-stamp',
    apply: 'build',
    // Rollup's own emit rather than `node:fs`: this project has no
    // @types/node, and an asset emitted here lands in `dist` with no
    // content hash, which is the whole point of it.
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'build.json',
        source: `${JSON.stringify({ version, build: BUILD_ID })}\n`,
      });
    },
  };
}

/**
 * GitHub Pages serves this repo from a subfolder, not the domain root, so the
 * built asset URLs need that prefix. `vite preview` serves those built files
 * and must use the same base, or it returns an index.html whose assets 404.
 * Only the dev server, which rewrites paths as it serves, stays at `/`.
 */
const GITHUB_PAGES_BASE = '/Star-Wars-Rebellion/';

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? GITHUB_PAGES_BASE : '/',
  plugins: [react(), buildStamp()],
  // Stamped into the menu so a phone can say which build it is running — and
  // which *build* of it, since a version alone cannot tell two deploys apart.
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}) as any);
