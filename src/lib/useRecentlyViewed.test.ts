import { describe, it, expect } from 'vitest';
import { isArmRecentlyViewed, sanitizeStoredItems } from './useRecentlyViewed';

const armEntry = {
  id: '46ec47fd-40e9-4a6b-bc58-bb081d2849a2',
  slug: 'base-gel-15-ml',
  categorySlug: 'base_gel',
  name: 'Base Gel 15 ml',
  price: 1100,
  bp_available: 6669,
  image: 'f28ee7e6-0353-4ef5-99be-fa794ed8b1e6/a4b740a203c748ca99e4aec5d29ee224.jpg',
  images: ['f28ee7e6-0353-4ef5-99be-fa794ed8b1e6/a4b740a203c748ca99e4aec5d29ee224.jpg'],
};

// Запись старой витрины OMS под тем же ключом localStorage (до cutover 06.09.2026).
const omsEntry = {
  id: '774f4a20-3f48-4a09-adde-36f13d672e18',
  slug: 'acrylate-gel-rhinestone',
  categorySlug: 'acrylate_gel',
  name: 'Acrylate Gel RHINESTONE',
  price: '1800.00',
  bp_available: 12,
  image: 'iblock/ce2/wgk3uic39qtexwlvwp7zu6w5863a26t6.jpeg',
  images: ['iblock/ce2/wgk3uic39qtexwlvwp7zu6w5863a26t6.jpeg'],
};

describe('recently viewed: stale OMS entries', () => {
  it('keeps ARM entries', () => {
    expect(isArmRecentlyViewed(armEntry)).toBe(true);
    expect(isArmRecentlyViewed({ ...armEntry, image: null, images: [] })).toBe(true);
  });

  it('drops OMS entries by string price or iblock image path', () => {
    expect(isArmRecentlyViewed(omsEntry)).toBe(false);
    expect(isArmRecentlyViewed({ ...armEntry, price: '1100.00' })).toBe(false);
    expect(isArmRecentlyViewed({ ...armEntry, images: ['iblock/807/x.jpg'] })).toBe(false);
  });

  it('sanitizes a mixed stored list, tolerating garbage', () => {
    expect(sanitizeStoredItems([armEntry, omsEntry, null, 'x', 42])).toEqual([armEntry]);
    expect(sanitizeStoredItems('not an array')).toEqual([]);
    expect(sanitizeStoredItems({ id: 'x' })).toEqual([]);
  });
});
