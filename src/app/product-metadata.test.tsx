/**
 * FBG-67 — generateMetadata of the product detail route.
 *
 * Exercises the server path end-to-end and the failure handling from the
 * review: a real product → full SEO metadata; a genuine 404 → notFound();
 * a transient BFF failure → propagated (5xx), NEVER a noindex on a live page.
 * ProductDetail / next-navigation / the BFF fetcher are mocked.
 *
 * I18N-04 (04-05): asserts hreflang alternates.languages (en/tr) and OG locale.
 * I18N-03 (04-05): asserts fetchProductServer is called with locale param.
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
vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(() => Promise.resolve((key: string) => key)),
}));

import { generateMetadata } from './[locale]/catalog/[slug]/[productSlug]/page';
import { fetchProductServer } from '@/lib/server-api';
import { notFound } from 'next/navigation';
import { SITE_URL } from '@/lib/seo';

// Mirrors image-url.ts TENANT_ID fallback so the OG-image expectation is env-robust.
const TENANT = process.env.NEXT_PUBLIC_TENANT_ID || 'demo-tenant';

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

  it('builds title, canonical and OG image from the fetched product (EN)', async () => {
    (fetchProductServer as ReturnType<typeof vi.fn>).mockResolvedValue(product);

    const md = await generateMetadata({ params: Promise.resolve({ locale: 'en', slug: 'base_gel', productSlug: '198' }) });

    // I18N-03: fetchProductServer called with locale param
    expect(fetchProductServer).toHaveBeenCalledWith('198', 'en');
    expect(md.title).toBe('BASE GEL 15 ML');
    // Canonical now includes locale prefix (I18N-04)
    const alternates = md.alternates as { canonical: string; languages: Record<string, string> };
    expect(alternates.canonical).toBe(`${SITE_URL}/en/catalog/base_gel/198`);
    const og = md.openGraph as { images?: { url: string }[]; locale?: string };
    expect(og.images?.[0].url).toBe(`${SITE_URL}/api/storefront/images/${TENANT}/a.png?w=1200`);
    // OG locale for EN (I18N-04)
    expect(og.locale).toBe('en_US');
  });

  it('emits hreflang alternates.languages with en and tr (I18N-04)', async () => {
    (fetchProductServer as ReturnType<typeof vi.fn>).mockResolvedValue(product);

    const md = await generateMetadata({ params: Promise.resolve({ locale: 'en', slug: 'base_gel', productSlug: '198' }) });
    const alternates = md.alternates as { languages: Record<string, string> };
    expect(alternates.languages['en']).toBe(`${SITE_URL}/en/catalog/base_gel/198`);
    expect(alternates.languages['tr']).toBe(`${SITE_URL}/tr/catalog/base_gel/198`);
  });

  it('uses tr_TR OG locale and /tr/ canonical for tr locale (I18N-04)', async () => {
    (fetchProductServer as ReturnType<typeof vi.fn>).mockResolvedValue(product);

    const md = await generateMetadata({ params: Promise.resolve({ locale: 'tr', slug: 'base_gel', productSlug: '198' }) });
    // I18N-03: fetchProductServer called with tr locale
    expect(fetchProductServer).toHaveBeenCalledWith('198', 'tr');
    const alternates = md.alternates as { canonical: string; languages: Record<string, string> };
    expect(alternates.canonical).toBe(`${SITE_URL}/tr/catalog/base_gel/198`);
    const og = md.openGraph as { locale?: string };
    expect(og.locale).toBe('tr_TR');
  });

  it('calls notFound() on a genuine 404 (no soft-404 / no noindex)', async () => {
    (fetchProductServer as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      generateMetadata({ params: Promise.resolve({ locale: 'en', slug: 'x', productSlug: 'missing' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('propagates a transient BFF failure instead of emitting noindex', async () => {
    (fetchProductServer as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('BFF 503'));

    await expect(
      generateMetadata({ params: Promise.resolve({ locale: 'en', slug: 'base_gel', productSlug: '198' }) }),
    ).rejects.toThrow('BFF 503');
    // Crucially, a transient failure must NOT be turned into a 404/noindex.
    expect(notFound).not.toHaveBeenCalled();
  });
});
