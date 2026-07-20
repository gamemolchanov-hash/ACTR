import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Dedicated coverage config for the diff-coverage gate (tools/diff-cover.mjs, FBG-387).
//
// Mirrors the root vitest.config.ts (react plugin, `@` alias, jsdom, same test `include`)
// so the identical suite runs, but adds v8 coverage with `all: true`: every in-scope
// source file is instrumented — including ones no test touches — otherwise a brand-new
// untested module would be absent from the report and slip through the gate silently.
//
// Rooting at the repo (not this tools/ dir, which is where Vitest would otherwise root a
// config) is required so the `src/**` globs resolve against the repo, not tools/. The
// coverage include/exclude here MUST stay consistent with isInScope() in diff-cover.mjs:
// a file that isInScope but is excluded from coverage would be reported as unmeasurable
// (fail-closed, code 2). This config is invoked only by diff-cover — `npm test` is untouched.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  root: REPO_ROOT,
  // Next.js tsconfig sets "jsx": "preserve" — plugin-react compiles JSX for tests
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(REPO_ROOT, 'src'),
      // `server-only` is a Next build-time marker with no node_modules entry; under the
      // coverage `all: true` pass Vite must transform server modules that import it, so
      // point it at an empty stub. Without this, the import fails to resolve and the v8
      // remapper falls back to mis-parsing the raw TS (`export type` → "Unexpected token").
      'server-only': resolve(dirname(fileURLToPath(import.meta.url)), 'server-only-stub.mjs'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      all: true,
      reporter: ['json'],
      // Mirror isInScope: all app source, minus tests, __tests__ helpers and type decls.
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', '**/__tests__/**', '**/*.d.ts'],
    },
  },
});
