/**
 * FBG-67 — storefront sitemap.xml route.
 *
 * I18N-04 (04-05): sitemap now emits per-locale entries (canonical = /en/,
 * alternates.languages for all supported locales). Existing tests updated;
 * new tests assert hreflang alternates coverage.
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

  it('emits canonical EN entries for static, category and product URLs', async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    // Canonical = /en/ prefix (I18N-04)
    expect(urls).toContain(`${SITE_URL}/en`); // home
    expect(urls).toContain(`${SITE_URL}/en/catalog`);
    expect(urls).toContain(`${SITE_URL}/en/delivery`);
    expect(urls).toContain(`${SITE_URL}/en/catalog/base_gel`); // category
    expect(urls).toContain(`${SITE_URL}/en/catalog/base_gel/198`); // product

    expect(urls.every((u) => u.startsWith(SITE_URL))).toBe(true);
    // No duplicates.
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('each entry has alternates.languages with en and tr URLs (I18N-04)', async () => {
    const entries = await sitemap();
    for (const entry of entries) {
      const langs = (entry as any).alternates?.languages as Record<string, string> | undefined;
      expect(langs, `entry ${entry.url} missing alternates.languages`).toBeDefined();
      expect(langs?.['en'], `entry ${entry.url} missing en alternate`).toBeDefined();
      expect(langs?.['tr'], `entry ${entry.url} missing tr alternate`).toBeDefined();
    }
  });

  it('alternates.languages en and tr URLs are correct for a product entry', async () => {
    const entries = await sitemap();
    const product = entries.find((e) => e.url.endsWith('/en/catalog/base_gel/198'));
    expect(product).toBeDefined();
    const langs = (product as any).alternates?.languages as Record<string, string>;
    expect(langs['en']).toBe(`${SITE_URL}/en/catalog/base_gel/198`);
    expect(langs['tr']).toBe(`${SITE_URL}/tr/catalog/base_gel/198`);
  });

  it('alternates.languages for home entry point to locale roots', async () => {
    const entries = await sitemap();
    const home = entries.find((e) => e.url === `${SITE_URL}/en`);
    expect(home).toBeDefined();
    const langs = (home as any).alternates?.languages as Record<string, string>;
    expect(langs['en']).toBe(`${SITE_URL}/en`);
    expect(langs['tr']).toBe(`${SITE_URL}/tr`);
  });

  it('sets lastModified for products from date_created', async () => {
    const entries = await sitemap();
    const product = entries.find((e) => e.url.endsWith('/en/catalog/base_gel/198'));
    expect(product?.lastModified).toBeInstanceOf(Date);
  });

  it('rethrows at runtime so a truncated sitemap is never published', async () => {
    delete process.env.NEXT_PHASE;
    (fetchAllProductsServer as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('BFF down'));
    await expect(sitemap()).rejects.toThrow('BFF down');
  });

  it('degrades to static EN URLs during the production build (BFF may be down)', async () => {
    const prev = process.env.NEXT_PHASE;
    process.env.NEXT_PHASE = 'phase-production-build';
    (fetchCategoriesServer as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('BFF down'));
    try {
      const entries = await sitemap();
      const urls = entries.map((e) => e.url);
      expect(urls).toContain(`${SITE_URL}/en`); // static home still present
      expect(urls).not.toContain(`${SITE_URL}/en/catalog/base_gel/198`); // catalog dropped, not erroring
    } finally {
      if (prev === undefined) delete process.env.NEXT_PHASE;
      else process.env.NEXT_PHASE = prev;
    }
  });
});
