/// <reference types="vite/client" />

/** The package version, stamped in by vite.config.ts. */
declare const __APP_VERSION__: string;

/**
 * The build, stamped in by vite.config.ts and written to `dist/build.json`
 * beside the bundle. A version tells you what was released; this tells two
 * deploys of the same version apart, which is what a stale shell needs.
 */
declare const __BUILD_ID__: string;
