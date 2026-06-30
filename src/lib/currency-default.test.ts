/**
 * GAP 2 regression: API currency default must be TRY, not USD.
 * Root cause: `|| 'USD'` in currencyHeader() caused cart/validate product_not_found
 * for TRY-priced products.
 *
 * Two complementary assertions:
 *  1. Source-invariant: no `|| 'USD'` literal in any non-test source file.
 *  2. Runtime: currencyHeader() returns TRY when env var is unset.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ---- source-invariant check ----

function findSourceFiles(dir: string, results: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      findSourceFiles(full, results);
    } else if (
      entry.isFile() &&
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.test\.(ts|tsx)$/.test(entry.name)
    ) {
      results.push(full);
    }
  }
  return results;
}

describe('API currency default — TRY not USD', () => {
  it('no source file contains `|| "USD"` or `|| \'USD\'` regression marker', () => {
    const srcRoot = path.resolve(__dirname, '../../src');
    const files = findSourceFiles(srcRoot);
    const offenders = files.filter((f) => {
      const content = fs.readFileSync(f, 'utf-8');
      return /\|\|\s*['"]USD['"]/.test(content);
    });
    expect(offenders).toEqual([]);
  });

  // ---- runtime check ----

  const ORIG = process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY;
    // Re-import the module fresh each time (vitest caches modules; use dynamic import)
  });

  afterEach(() => {
    if (ORIG !== undefined) process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY = ORIG;
    else delete process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY;
  });

  it('currencyHeader() returns TRY when NEXT_PUBLIC_STOREFRONT_CURRENCY is unset', async () => {
    // Dynamic import so env is read at call time within the cached module.
    // currencyHeader reads process.env at call time (not at module init), so this works.
    const { currencyHeader } = await import('./api');
    const header = currencyHeader();
    expect(header['X-Currency']).toBe('TRY');
  });

  it('currencyHeader() honours explicit env override', async () => {
    process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY = 'EUR';
    const { currencyHeader } = await import('./api');
    const header = currencyHeader();
    expect(header['X-Currency']).toBe('EUR');
  });
});
