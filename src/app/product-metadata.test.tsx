/**
 * FBG-67 — generateMetadata of the product detail route.
 *
 * Exercises the server path end-to-end and the failure handling from the
 * review: a real product → full SEO metadata; a genuine 404 → notFound();
 * a transient BFF failure → propagated (5xx), NEVER a noindex on a live page.
 * ProductDetail / next-navigation / the BFF fetcher are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Product } from '@/lib/api';

vi.mock('@/components/ProductDetail', () => ({ ProductDetail: () => null }));
vi.mock('@/lib/server-api', () => ({ fetchProductServer: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

import { generateMetadata } from './catalog/[slug]/[productSlug]/page';
import { fetchProductServer } from '@/lib/server-api';
import { notFound } from 'next/navigation';
import { SITE_URL } from '@/lib/seo';

const product: Product = {
  id: 'uuid-1',
  name: 'BASE GEL 15 ML',
  sku: 'AC-BG-15',
  slug: '198',
  description: 'Базовое покрытие для гель-лака.',
  price: 1100,
  wholesale_price: null,
  weight: null,
  volume: null,
  length: null,
  width: null,
  height: null,
  bp_available: 5,
  category: { id: 'c1', name: 'Базовые покрытия', slug: 'base_gel' },
  images: [{ id: 'i1', file_path: 'a.png', sort: 0 }],
  date_created: '2025-01-15T10:00:00Z',
};

describe('product page generateMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds title, canonical and OG image from the fetched product', async () => {
    (fetchProductServer as ReturnType<typeof vi.fn>).mockResolvedValue(product);

    const md = await generateMetadata({ params: { slug: 'base_gel', productSlug: '198' } });

    expect(fetchProductServer).toHaveBeenCalledWith('198');
    expect(md.title).toBe('BASE GEL 15 ML');
    expect((md.alternates as { canonical: string }).canonical).toBe(
      `${SITE_URL}/catalog/base_gel/198`,
    );
    const og = md.openGraph as { images?: { url: string }[] };
    expect(og.images?.[0].url).toBe(`${SITE_URL}/product-images/a.png`);
  });

  it('calls notFound() on a genuine 404 (no soft-404 / no noindex)', async () => {
    (fetchProductServer as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      generateMetadata({ params: { slug: 'x', productSlug: 'missing' } }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('propagates a transient BFF failure instead of emitting noindex', async () => {
    (fetchProductServer as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('BFF 503'));

    await expect(
      generateMetadata({ params: { slug: 'base_gel', productSlug: '198' } }),
    ).rejects.toThrow('BFF 503');
    // Crucially, a transient failure must NOT be turned into a 404/noindex.
    expect(notFound).not.toHaveBeenCalled();
  });
});
