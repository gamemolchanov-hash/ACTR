/**
 * GAP 3 (COMP-01): KDV row is informational — kdvAmount must NOT appear in
 * finalTotal or totalWithShipping computation lines.
 *
 * Source-invariant test: reads checkout/page.tsx, extracts the const definition
 * lines for finalTotal and totalWithShipping, then asserts 'kdvAmount' is absent
 * from those lines.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('checkout KDV row is informational (COMP-01)', () => {
  const checkoutSrc = fs.readFileSync(
    path.resolve(__dirname, 'page.tsx'),
    'utf-8',
  );

  it('finalTotal const definition does not include kdvAmount', () => {
    const line = checkoutSrc
      .split('\n')
      .find((l) => /const finalTotal\s*=/.test(l));
    expect(line).toBeDefined();
    expect(line).not.toMatch(/kdvAmount/);
  });

  it('totalWithShipping const definition does not include kdvAmount', () => {
    const line = checkoutSrc
      .split('\n')
      .find((l) => /const totalWithShipping\s*=/.test(l));
    expect(line).toBeDefined();
    expect(line).not.toMatch(/kdvAmount/);
  });
});
