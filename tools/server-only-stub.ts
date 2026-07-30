/**
 * Test stub for the `server-only` import guard.
 *
 * Next.js resolves `server-only` internally (the package is not in
 * node_modules), so Vitest cannot load a module that imports it — e.g.
 * `src/lib/storefront-config.ts`. vitest.config.ts aliases the specifier here so
 * such modules can be unit-tested; the guard still works in the real build,
 * which is the only place it matters.
 */
export {};
