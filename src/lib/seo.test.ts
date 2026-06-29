/**
 * FBG-67 — storefront SEO helpers.
 *
 * Verifies the structured-data / metadata builders produce correct, crawler-
 * ready output (title, description, canonical, OG images, schema.org Product
 * with price + availability) and that JSON-LD embedding is XSS-safe.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { Product } from './api';
import {
  SITE_URL,
  SITE_NAME,
  absoluteUrl,
  stripHtml,
  truncate,
  buildMetaDescription,
  productCanonicalUrl,
  productImageAbsoluteUrls,
  buildProductMetadata,
  buildProductJsonLd,
  jsonLdScript,
} from './seo';

const baseProduct: Product = {
  id: 'uuid-1',
  name: 'BASE GEL 15 ML',
  sku: 'AC-BG-15',
  slug: '198',
  description: 'Базовое покрытие для гель-лака. Надёжное сцепление.',
  price: 1100,
  wholesale_price: 770,
  weight: 0.03,
  volume: 0.000015,
  length: 80,
  width: 30,
  height: 30,
  bp_available: 150,
  category: { id: 'c1', name: 'Базовые покрытия', slug: 'base_gel' },
  images: [
    { id: 'i2', file_path: 'b.png', sort: 1 },
    { id: 'i1', file_path: 'a.png', sort: 0 },
  ],
  date_created: '2025-01-15T10:00:00Z',
};

describe('url + text helpers', () => {
  it('builds absolute URLs from the site origin', () => {
    expect(absoluteUrl('/catalog')).toBe(`${SITE_URL}/catalog`);
    expect(absoluteUrl('catalog')).toBe(`${SITE_URL}/catalog`);
  });

  it('strips HTML and collapses whitespace', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>\n\n  test')).toBe('Hello world test');
  });

  it('truncates long text with an ellipsis', () => {
    const long = 'word '.repeat(60).trim();
    const out = truncate(long, 40);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('productCanonicalUrl', () => {
  it('uses the category slug + product slug', () => {
    expect(productCanonicalUrl(baseProduct)).toBe(`${SITE_URL}/catalog/base_gel/198`);
  });

  it('falls back to "all" + id when category/slug are missing', () => {
    const p: Product = { ...baseProduct, category: null, slug: null };
    expect(productCanonicalUrl(p)).toBe(`${SITE_URL}/catalog/all/uuid-1`);
  });
});

describe('productImageAbsoluteUrls', () => {
  it('returns absolute URLs ordered by sort', () => {
    expect(productImageAbsoluteUrls(baseProduct)).toEqual([
      `${SITE_URL}/product-images/a.png`,
      `${SITE_URL}/product-images/b.png`,
    ]);
  });

  it('returns [] when the product has no images', () => {
    expect(productImageAbsoluteUrls({ ...baseProduct, images: [] })).toEqual([]);
  });
});

describe('buildMetaDescription', () => {
  it('prefers the product description, stripping any HTML', () => {
    const p: Product = { ...baseProduct, description: '<b>Стойкое</b> покрытие' };
    expect(buildMetaDescription(p)).toBe('Стойкое покрытие');
  });

  it('falls back to a generated sentence with name + price', () => {
    const p: Product = { ...baseProduct, description: null };
    const d = buildMetaDescription(p);
    expect(d).toContain('BASE GEL 15 ML');
    expect(d).toContain('₽'); // ru-RU price formatting (NBSP-grouped) is appended
    expect(d).toContain(SITE_NAME);
  });
});

describe('buildProductMetadata', () => {
  it('produces title, description, canonical and OG/Twitter cards', () => {
    const md = buildProductMetadata(baseProduct);
    expect(md.title).toBe('BASE GEL 15 ML');
    expect(typeof md.description).toBe('string');
    expect((md.alternates as { canonical: string }).canonical).toBe(
      `${SITE_URL}/catalog/base_gel/198`,
    );
    const og = md.openGraph as { url?: string; images?: { url: string }[]; siteName?: string };
    expect(og.url).toBe(`${SITE_URL}/catalog/base_gel/198`);
    expect(og.siteName).toBe(SITE_NAME);
    expect(og.images?.[0].url).toBe(`${SITE_URL}/product-images/a.png`);
    const tw = md.twitter as { card?: string; images?: string[] };
    expect(tw.card).toBe('summary_large_image');
    expect(tw.images?.[0]).toBe(`${SITE_URL}/product-images/a.png`);
  });
});

describe('buildProductJsonLd', () => {
  it('emits a schema.org Product with price and InStock availability', () => {
    const ld = buildProductJsonLd(baseProduct) as Record<string, any>;
    expect(ld['@type']).toBe('Product');
    expect(ld.name).toBe('BASE GEL 15 ML');
    expect(ld.sku).toBe('AC-BG-15');
    expect(ld.image).toEqual([
      `${SITE_URL}/product-images/a.png`,
      `${SITE_URL}/product-images/b.png`,
    ]);
    expect(ld.category).toBe('Базовые покрытия');
    expect(ld.offers.price).toBe('1100');
    expect(ld.offers.priceCurrency).toBe('RUB');
    expect(ld.offers.url).toBe(`${SITE_URL}/catalog/base_gel/198`);
    expect(ld.offers.availability).toBe('https://schema.org/InStock');
  });

  it('marks OutOfStock when bp_available is 0 or null', () => {
    expect(
      (buildProductJsonLd({ ...baseProduct, bp_available: 0 }) as any).offers.availability,
    ).toBe('https://schema.org/OutOfStock');
    expect(
      (buildProductJsonLd({ ...baseProduct, bp_available: null }) as any).offers.availability,
    ).toBe('https://schema.org/OutOfStock');
  });

  it('adds aggregateRating when there are approved reviews (FBG-69)', () => {
    const ld = buildProductJsonLd(baseProduct, { average: 4.5, count: 12 }) as Record<string, any>;
    expect(ld.aggregateRating).toEqual({
      '@type': 'AggregateRating',
      ratingValue: '4.5',
      reviewCount: 12,
      bestRating: '5',
      worstRating: '1',
    });
  });

  it('omits aggregateRating without reviews (no arg, zero count, or zero average)', () => {
    expect((buildProductJsonLd(baseProduct) as any).aggregateRating).toBeUndefined();
    expect(
      (buildProductJsonLd(baseProduct, { average: 0, count: 0 }) as any).aggregateRating,
    ).toBeUndefined();
    expect(
      (buildProductJsonLd(baseProduct, { average: 0, count: 3 }) as any).aggregateRating,
    ).toBeUndefined();
  });
});

describe('jsonLdScript (XSS-safe embedding)', () => {
  it('escapes "<" so a "</script>" in the product name cannot break out', () => {
    const ld = buildProductJsonLd({
      ...baseProduct,
      name: 'Evil</script><script>alert(1)</script>',
    });
    const serialized = jsonLdScript(ld);
    // No raw "<" survives — the only script-tag breakout vector.
    expect(serialized).not.toContain('<');
    expect(serialized).toContain('\\u003c');
    // Still valid JSON for crawlers, with the payload intact (escaped).
    const parsed = JSON.parse(serialized);
    expect(parsed.name).toBe('Evil</script><script>alert(1)</script>');
  });
});

describe('public/robots.txt artifact', () => {
  // cwd is the storefront root when run via its own config, or the autoCRM root
  // when run via the repo-level vitest — try both so the test is location-robust.
  const robotsPath = [
    resolve(process.cwd(), 'public/robots.txt'),
    resolve(process.cwd(), 'services/storefront/public/robots.txt'),
  ].find((p) => existsSync(p));
  const robots = robotsPath ? readFileSync(robotsPath, 'utf8') : '';

  it('allows crawling but disallows transactional areas and links the sitemap', () => {
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    for (const path of ['/account', '/basket', '/checkout', '/login']) {
      expect(robots).toContain(`Disallow: ${path}`);
    }
    expect(robots).toContain('Sitemap: https://american-creator.ru/sitemap.xml');
  });
});
