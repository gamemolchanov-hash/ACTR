/**
 * FBG-67 — storefront SEO helpers.
 *
 * Verifies the structured-data / metadata builders produce correct, crawler-
 * ready output (title, description, canonical, OG images, schema.org Product
 * with price + availability) and that JSON-LD embedding is XSS-safe.
 *
 * I18N-04: locale-aware OG locale, hreflang alternates, TRY currency (04-05).
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
    const p: Product = { ...baseProduct, description: '<b>Durable</b> gel coating' };
    expect(buildMetaDescription(p)).toBe('Durable gel coating');
  });

  it('falls back to a generated sentence with name + price (EN, no Cyrillic)', () => {
    const p: Product = { ...baseProduct, description: null };
    const d = buildMetaDescription(p); // default locale 'en'
    expect(d).toContain('BASE GEL 15 ML');
    expect(d).toContain(SITE_NAME);
    // Must not contain Russian ruble symbol or Cyrillic
    expect(d).not.toContain('₽');
  });

  it('falls back to a generated sentence with TRY price for tr locale', () => {
    const p: Product = { ...baseProduct, description: null };
    const d = buildMetaDescription(p, 'tr');
    expect(d).toContain('BASE GEL 15 ML');
    // TRY currency should appear (₺ symbol) for tr-TR locale
    expect(d).toMatch(/₺|TRY/);
    expect(d).toContain(SITE_NAME);
    expect(d).not.toContain('₽');
  });
});

describe('buildProductMetadata', () => {
  it('produces title, description, locale-aware canonical and OG/Twitter cards (EN)', () => {
    const md = buildProductMetadata(baseProduct); // default locale 'en'
    expect(md.title).toBe('BASE GEL 15 ML');
    expect(typeof md.description).toBe('string');
    // Canonical now includes locale prefix
    const alternates = md.alternates as { canonical: string; languages: Record<string, string> };
    expect(alternates.canonical).toBe(`${SITE_URL}/en/catalog/base_gel/198`);
    // hreflang alternates (I18N-04)
    expect(alternates.languages['en']).toBe(`${SITE_URL}/en/catalog/base_gel/198`);
    expect(alternates.languages['tr']).toBe(`${SITE_URL}/tr/catalog/base_gel/198`);
    const og = md.openGraph as { url?: string; images?: { url: string }[]; siteName?: string; locale?: string };
    expect(og.url).toBe(`${SITE_URL}/en/catalog/base_gel/198`);
    expect(og.siteName).toBe(SITE_NAME);
    expect(og.images?.[0].url).toBe(`${SITE_URL}/product-images/a.png`);
    // OG locale for EN (I18N-04)
    expect(og.locale).toBe('en_US');
    const tw = md.twitter as { card?: string; images?: string[] };
    expect(tw.card).toBe('summary_large_image');
    expect(tw.images?.[0]).toBe(`${SITE_URL}/product-images/a.png`);
  });

  it('uses tr_TR OG locale and /tr/ canonical for tr locale (I18N-04)', () => {
    const md = buildProductMetadata(baseProduct, 'tr');
    const alternates = md.alternates as { canonical: string; languages: Record<string, string> };
    expect(alternates.canonical).toBe(`${SITE_URL}/tr/catalog/base_gel/198`);
    expect(alternates.languages['en']).toBe(`${SITE_URL}/en/catalog/base_gel/198`);
    expect(alternates.languages['tr']).toBe(`${SITE_URL}/tr/catalog/base_gel/198`);
    const og = md.openGraph as { locale?: string };
    expect(og.locale).toBe('tr_TR');
  });

  it('hreflang alternates exist for both en and tr in all locale calls', () => {
    for (const locale of ['en', 'tr'] as const) {
      const md = buildProductMetadata(baseProduct, locale);
      const alternates = md.alternates as { languages: Record<string, string> };
      expect(Object.keys(alternates.languages)).toContain('en');
      expect(Object.keys(alternates.languages)).toContain('tr');
    }
  });
});

describe('buildProductJsonLd', () => {
  it('emits a schema.org Product with price and InStock availability, priceCurrency TRY (I18N-04)', () => {
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
    // Must be TRY, not RUB (I18N-01, I18N-04)
    expect(ld.offers.priceCurrency).toBe('TRY');
    expect(ld.offers.priceCurrency).not.toBe('RUB');
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

  it('omits aggregateRating (reviews feature removed — always absent)', () => {
    expect((buildProductJsonLd(baseProduct) as any).aggregateRating).toBeUndefined();
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
    expect(robots).toContain('Sitemap: /sitemap.xml');
  });
});
