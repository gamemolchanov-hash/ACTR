// Empty stub for the `server-only` marker package (provided by Next at build time,
// absent from node_modules). Aliased in tools/vitest.diff-cover.config.mjs so the
// coverage `all: true` pass can transform server-only modules (e.g.
// src/lib/storefront-config.ts) instead of failing to resolve the import and then
// mis-parsing the raw TypeScript. Not used by the normal `npm test`.
export {};
