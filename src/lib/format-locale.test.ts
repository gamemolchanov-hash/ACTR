/**
 * Tests for formatLocaleFromCountry() — derives the CANONICAL format locale
 * (number separators, currency-symbol position/form) from a BFF-provided
 * ISO-3166-1 alpha-2 country code, independent of UI language (D1/D2/D3).
 */
import { describe, it, expect } from 'vitest';
import { formatLocaleFromCountry } from './format-locale';

describe('formatLocaleFromCountry()', () => {
  it('TR -> canonical Turkish locale (starts with "tr")', () => {
    const result = formatLocaleFromCountry('TR');
    expect(result.toLowerCase().startsWith('tr')).toBe(true);
  });

  it('US -> canonical English locale (starts with "en")', () => {
    const result = formatLocaleFromCountry('US');
    expect(result.toLowerCase().startsWith('en')).toBe(true);
  });

  it('null country + fallbackLocale -> uses the fallback', () => {
    expect(formatLocaleFromCountry(null, 'tr-TR')).toBe('tr-TR');
  });

  it('null country + no fallback -> default en-US', () => {
    expect(formatLocaleFromCountry(null)).toBe('en-US');
  });

  it('non-2-letter country code is guarded to the fallback', () => {
    expect(formatLocaleFromCountry('TUR', 'en-GB')).toBe('en-GB');
  });
});
