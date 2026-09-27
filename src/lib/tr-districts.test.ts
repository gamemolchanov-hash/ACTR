/**
 * TR_DISTRICTS — the district (ilçe) select data, generated from the
 * FulfillmentTR "Delivery Zones" table (see tr-districts.ts).
 */
import { describe, it, expect } from 'vitest';
import { TR_PROVINCES } from './tr-provinces';
import { TR_DISTRICTS, districtsOf, matchDistrict } from './tr-districts';

describe('TR_DISTRICTS', () => {
  it('has a non-empty district list for each of the 81 provinces, and nothing else', () => {
    expect(Object.keys(TR_DISTRICTS).sort((a, b) => a.localeCompare(b, 'tr'))).toEqual([...TR_PROVINCES]);
    for (const p of TR_PROVINCES) expect(TR_DISTRICTS[p].length).toBeGreaterThan(0);
  });

  it('keeps every list Turkish-collated and free of duplicates', () => {
    for (const p of TR_PROVINCES) {
      const list = [...TR_DISTRICTS[p]];
      expect(list).toEqual([...list].sort((a, b) => a.localeCompare(b, 'tr')));
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it('uses Turkish title case, not the warehouse table upper case', () => {
    expect(TR_DISTRICTS['İstanbul']).toContain('Kadıköy');
    expect(TR_DISTRICTS['İstanbul']).toContain('Üsküdar');
    expect(TR_DISTRICTS['Ankara']).toContain('Çankaya');
    expect(TR_DISTRICTS['Adana']).toContain('Çukurova');
    expect(TR_DISTRICTS['Samsun']).toContain('19 Mayıs');
    for (const p of TR_PROVINCES) {
      for (const d of TR_DISTRICTS[p]) expect(d).not.toBe(d.toLocaleUpperCase('tr'));
    }
  });

  it('keeps one central district where the table lists "MERKEZ" and "<PROVINCE> MERKEZ"', () => {
    expect(TR_DISTRICTS['Denizli']).toContain('Merkez');
    expect(TR_DISTRICTS['Denizli']).not.toContain('Denizli Merkez');
    // Provinces the table lists only as "<PROVINCE> MERKEZ" keep that name.
    expect(TR_DISTRICTS['Antalya']).toContain('Antalya Merkez');
  });
});

describe('districtsOf', () => {
  it('returns the districts of a canonical province and [] otherwise', () => {
    expect(districtsOf('İzmir')).toBe(TR_DISTRICTS['İzmir']);
    expect(districtsOf('')).toEqual([]);
    expect(districtsOf(null)).toEqual([]);
    expect(districtsOf('Berlin')).toEqual([]);
  });
});

describe('matchDistrict', () => {
  it('folds case and diacritics onto the canonical district of that province', () => {
    expect(matchDistrict('İstanbul', 'kadikoy')).toBe('Kadıköy');
    expect(matchDistrict('İstanbul', ' KADIKÖY ')).toBe('Kadıköy');
    expect(matchDistrict('Ankara', 'cankaya')).toBe('Çankaya');
  });

  it('is null for a district of another province, free text or blanks', () => {
    expect(matchDistrict('Ankara', 'Kadıköy')).toBeNull();
    expect(matchDistrict('İstanbul', 'Istanbul')).toBeNull();
    expect(matchDistrict('İstanbul', '')).toBeNull();
    expect(matchDistrict('', 'Kadıköy')).toBeNull();
  });
});
