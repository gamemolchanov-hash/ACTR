/**
 * Tests for fmtMoney() — locale-aware currency formatting.
 *
 * Covers:
 * - TRY locale formatting (WR-05: was defaulting to USD)
 * - USD/en-US formatting
 * - Fallback to TRY when no currency/locale args and env not set (WR-05)
 * - Unknown currency code doesn't throw
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fmtMoney } from './money';

describe('fmtMoney()', () => {
  beforeEach(() => {
    // Clear env so fallback tests are deterministic
    delete process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats TRY amount with tr-TR locale (contains ₺)', () => {
    const result = fmtMoney(1234, 'TRY', 'tr-TR');
    expect(result).toContain('₺');
  });

  it('formats USD amount with en-US locale', () => {
    const result = fmtMoney(9.99, 'USD', 'en-US');
    expect(result).toBe('$9.99');
  });

  it('falls back to TRY (not USD) when no currency arg and env not set (WR-05)', () => {
    // NEXT_PUBLIC_STOREFRONT_CURRENCY is not set (cleared in beforeEach)
    const result = fmtMoney(1000);
    // Must NOT be USD — it should be TRY (shows as 'TRY' in en-US locale, '₺' in tr-TR)
    expect(result).not.toContain('$');
    expect(result).not.toContain('USD');
    // In en-US locale with TRY currency, Intl shows 'TRY' as the symbol
    expect(result).toMatch(/TRY|₺/);
  });

  it('uses NEXT_PUBLIC_STOREFRONT_CURRENCY env when set', () => {
    process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY = 'EUR';
    const result = fmtMoney(100);
    expect(result).toContain('€');
  });

  it('does not throw on unknown currency code — returns number + code fallback', () => {
    // 'ABCD' is 4 chars — not a valid ISO 4217 code, will throw inside try and fall back
    expect(() => fmtMoney(100, 'ABCD', 'en-US')).not.toThrow();
    const result = fmtMoney(100, 'ABCD', 'en-US');
    expect(result).toContain('100');
    expect(result).toContain('ABCD');
  });

  it('uses en-US formatting when no locale arg', () => {
    const result = fmtMoney(1234.5, 'USD', undefined);
    expect(result).toBe('$1,234.50');
  });
});
