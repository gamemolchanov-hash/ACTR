/**
 * FBG-67 — storefront sitemap.xml route.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Product, Category } from '@/lib/api';

vi.mock('@/lib/server-api', () => ({
  fetchAllProductsServer: vi.fn(),
  fetchCategoriesServer: vi.fn(),
}));

import sitemap from './sitemap';
import { fetchAllProductsServer, fetchCategoriesServer } from '@/lib/server-api';
import { SITE_URL } from '@/lib/seo';

const products: Product[] = [
  {
    id: 'uuid-1',
    name: 'BASE GEL',
    sku: 'AC-BG',
    slug: '198',
    description: null,
    price: 1100,
    wholesale_price: null,
    weight: null,
    volume: null,
    length: null,
    width: null,
    height: null,
    bp_available: 5,
    category: { id: 'c1', name: 'Base', slug: 'base_gel' },
    images: [],
    date_created: '2025-01-15T10:00:00Z',
  },
];

const categories: Category[] = [{ id: 'c1', name: 'Base', slug: 'base_gel' }];

describe('sitemap()', () => {
  beforeEach(() => {
    (fetchAllProductsServer as ReturnType<typeof vi.fn>).mockResolvedValue(products);
    (fetchCategoriesServer as ReturnType<typeof vi.fn>).mockResolvedValue(categories);
  });

  it('emits absolute static, category and product URLs', async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls).toContain(SITE_URL); // home
    expect(urls).toContain(`${SITE_URL}/catalog`);
    expect(urls).toContain(`${SITE_URL}/delivery`);
    expect(urls).toContain(`${SITE_URL}/catalog/base_gel`); // category
    expect(urls).toContain(`${SITE_URL}/catalog/base_gel/198`); // product

    expect(urls.every((u) => u.startsWith(SITE_URL))).toBe(true);
    // No duplicates.
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('sets lastModified for products from date_created', async () => {
    const entries = await sitemap();
    const product = entries.find((e) => e.url.endsWith('/catalog/base_gel/198'));
    expect(product?.lastModified).toBeInstanceOf(Date);
  });

  it('rethrows at runtime so a truncated sitemap is never published', async () => {
    delete process.env.NEXT_PHASE;
    (fetchAllProductsServer as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('BFF down'));
    await expect(sitemap()).rejects.toThrow('BFF down');
  });

  it('degrades to static URLs during the production build (BFF may be down)', async () => {
    const prev = process.env.NEXT_PHASE;
    process.env.NEXT_PHASE = 'phase-production-build';
    (fetchCategoriesServer as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('BFF down'));
    try {
      const entries = await sitemap();
      const urls = entries.map((e) => e.url);
      expect(urls).toContain(SITE_URL); // static still present
      expect(urls).not.toContain(`${SITE_URL}/catalog/base_gel/198`); // catalog dropped, not erroring
    } finally {
      if (prev === undefined) delete process.env.NEXT_PHASE;
      else process.env.NEXT_PHASE = prev;
    }
  });
});
