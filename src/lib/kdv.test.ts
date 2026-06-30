/**
 * Tests for kdvFromBrutto() — extract KDV (Turkish VAT) from KDV-inclusive prices.
 *
 * Covers:
 * - Standard 20% rate: 1000 TRY → 167 TRY KDV portion
 * - Zero amount returns zero
 * - Default rate is 0.20 (D-03)
 * - Custom rate override (e.g. 10%)
 */
import { describe, it, expect } from 'vitest';
import { kdvFromBrutto } from './kdv';

describe('kdvFromBrutto()', () => {
  it('extracts 20% KDV from 1000 TRY → 167', () => {
    // 1000 - 1000/1.20 = 1000 - 833.33... = 166.67 → round → 167
    expect(kdvFromBrutto(1000)).toBe(167);
  });

  it('returns 0 for zero amount', () => {
    expect(kdvFromBrutto(0)).toBe(0);
  });

  it('accepts custom rate (10%) → 91 for 1000', () => {
    // 1000 - 1000/1.10 = 1000 - 909.09... = 90.90... → round → 91
    expect(kdvFromBrutto(1000, 0.10)).toBe(91);
  });

  it('default rate is 0.20 — same result with explicit and implicit rate', () => {
    expect(kdvFromBrutto(500)).toBe(kdvFromBrutto(500, 0.20));
  });
});
