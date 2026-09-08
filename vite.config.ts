import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * GitHub Pages serves this repo from a subfolder, not the domain root, so the
 * built asset URLs need that prefix. `vite preview` serves those built files
 * and must use the same base, or it returns an index.html whose assets 404.
 * Only the dev server, which rewrites paths as it serves, stays at `/`.
 */
const GITHUB_PAGES_BASE = '/Star-Wars-Rebellion/';

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? GITHUB_PAGES_BASE : '/',
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}) as any);
