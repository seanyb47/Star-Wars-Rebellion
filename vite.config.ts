import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * GitHub Pages serves this repo from a subfolder, not the domain root, so the
 * built asset URLs need that prefix. The dev server still runs at `/` — a base
 * only applies to `vite build` and `vite preview`.
 */
const GITHUB_PAGES_BASE = '/Star-Wars-Rebellion/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? GITHUB_PAGES_BASE : '/',
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}) as any);
