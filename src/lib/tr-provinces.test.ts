/**
 * TR_PROVINCES + normalize/format helpers — see tr-provinces.ts for the "why"
 * (FulfillmentTR order API wants province = il / city = ilçe).
 */
import { describe, it, expect } from 'vitest';
import {
  TR_PROVINCES,
  normalizeProvince,
  isTrProvince,
  formatDistrictProvince,
} from './tr-provinces';

describe('TR_PROVINCES', () => {
  it('has exactly 81 unique entries', () => {
    expect(TR_PROVINCES.length).toBe(81);
    expect(new Set(TR_PROVINCES).size).toBe(81);
  });

  it('is already in Turkish-collated order', () => {
    const sorted = [...TR_PROVINCES].sort((a, b) => a.localeCompare(b, 'tr'));
    expect([...TR_PROVINCES]).toEqual(sorted);
  });

  it('starts with Adana and ends with Zonguldak', () => {
    expect(TR_PROVINCES[0]).toBe('Adana');
    expect(TR_PROVINCES[TR_PROVINCES.length - 1]).toBe('Zonguldak');
  });

  it('contains the well-known Turkish-letter provinces', () => {
    for (const name of ['İstanbul', 'Ankara', 'İzmir', 'Afyonkarahisar', 'Şanlıurfa', 'Iğdır', 'Düzce']) {
      expect(TR_PROVINCES).toContain(name);
    }
  });

  it('round-trips every canonical name through upper/lower-case folding', () => {
    for (const p of TR_PROVINCES) {
      expect(normalizeProvince(p.toLocaleUpperCase('tr'))).toBe(p);
      expect(normalizeProvince(p.toLocaleLowerCase('tr'))).toBe(p);
    }
  });
});

describe('normalizeProvince', () => {
  it('folds a lowercase ASCII spelling to the canonical Turkish name', () => {
    expect(normalizeProvince('istanbul')).toBe('İstanbul');
  });

  it('trims and folds an all-caps spelling with surrounding whitespace', () => {
    expect(normalizeProvince('  ISTANBUL  ')).toBe('İstanbul');
  });

  it('folds a mixed-case ASCII spelling', () => {
    expect(normalizeProvince('Istanbul')).toBe('İstanbul');
  });

  it('folds a dotless-ı-less ASCII spelling of an accented province', () => {
    expect(normalizeProvince('sanliurfa')).toBe('Şanlıurfa');
  });

  it('keeps an unknown value as trimmed, whitespace-collapsed raw text', () => {
    expect(normalizeProvince('Anadolu  Yakası')).toBe('Anadolu Yakası');
  });

  it('returns empty string for blank/nullish input', () => {
    expect(normalizeProvince('')).toBe('');
    expect(normalizeProvince('   ')).toBe('');
    expect(normalizeProvince(null)).toBe('');
    expect(normalizeProvince(undefined)).toBe('');
  });
});

describe('isTrProvince', () => {
  it('accepts only an exact canonical name', () => {
    expect(isTrProvince('İstanbul')).toBe(true);
  });

  it('rejects a non-canonical spelling, even a foldable one', () => {
    expect(isTrProvince('istanbul')).toBe(false);
  });

  it('rejects blank/nullish/non-string input', () => {
    expect(isTrProvince('')).toBe(false);
    expect(isTrProvince(null)).toBe(false);
    expect(isTrProvince(undefined)).toBe(false);
  });
});

describe('formatDistrictProvince', () => {
  it('joins a district and a canonical province with " / "', () => {
    expect(formatDistrictProvince('Kadıköy', 'İstanbul')).toBe('Kadıköy / İstanbul');
  });

  it('normalizes a non-canonical province before joining', () => {
    expect(formatDistrictProvince('Kadıköy', 'istanbul')).toBe('Kadıköy / İstanbul');
  });

  it('drops a missing province', () => {
    expect(formatDistrictProvince('Kadıköy', null)).toBe('Kadıköy');
  });

  it('drops a missing district', () => {
    expect(formatDistrictProvince('', 'İzmir')).toBe('İzmir');
  });

  it('returns empty string when both are missing', () => {
    expect(formatDistrictProvince(null, undefined)).toBe('');
  });
});
