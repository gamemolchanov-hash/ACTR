/**
 * SEO helpers for the storefront (FBG-67).
 *
 * Pure (network-free) builders for product `<metadata>`, canonical URLs and
 * JSON-LD structured data. Kept separate from `server-api.ts` so they can be
 * unit-tested without mocking `fetch`, and reused by both `generateMetadata`
 * and the `sitemap.ts` route.
 *
 * I18N-04 (04-05): locale-aware metadata (OG locale, hreflang alternates, TRY).
 */

import type { Metadata } from 'next';
import type { Product } from './api';
import { fmtMoney } from './money';

export const SITE_NAME = 'American Creator';

/**
 * Public site origin used for canonical / OG / sitemap absolute URLs.
 * Set NEXT_PUBLIC_SITE_URL per-environment (the TR prod domain at go-live).
 * Falls back to a neutral localhost origin — NEVER the RU domain
 * (american-creator.ru), which would mis-attribute every canonical/OG/sitemap
 * URL for this standalone TR storefront (CR-01).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003').replace(
  /\/+$/,
  '',
);

/** Join the public site origin with an app-relative path. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Strip HTML tags and collapse whitespace (admin rich-text → plain meta text). */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Truncate to `max` chars on a word boundary, appending an ellipsis. */
export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  const slice = input.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
}

/** Map locale segment to BCP-47 for currency formatting. */
const LOCALE_TO_BCP47: Record<string, string> = {
  en: 'en-US',
  tr: 'tr-TR',
};

/**
 * Meta / OG description for a product. Prefers the short `description`, falls
 * back to a generated sentence with name + price so every product page still
 * ships a non-empty, useful description.
 *
 * @param locale - 'en' (default) or 'tr' — controls price formatting locale.
 */
export function buildMetaDescription(product: Product, locale: string = 'en'): string {
  const base = product.description ? stripHtml(product.description) : '';
  if (base) return truncate(base, 200);
  const bcp47 = LOCALE_TO_BCP47[locale] || 'en-US';
  const currency = process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY';
  const priceSuffix = product.price ? ` — ${fmtMoney(product.price, currency, bcp47)}` : '';
  return truncate(
    `${product.name}${priceSuffix}. Shop ${SITE_NAME}: professional products for nail professionals.`,
    200,
  );
}

/** Canonical storefront URL for a product (absolute, locale-less path). */
export function productCanonicalUrl(product: Product): string {
  const categorySlug = product.category?.slug ?? 'all';
  const productSlug = product.slug ?? product.id;
  return absoluteUrl(`/catalog/${categorySlug}/${productSlug}`);
}

/** Absolute product image URLs, ordered by `sort` (full-res originals). */
export function productImageAbsoluteUrls(product: Product): string[] {
  if (!product.images?.length) return [];
  return [...product.images]
    .sort((a, b) => a.sort - b.sort)
    .map((img) => absoluteUrl(`/product-images/${img.file_path}`));
}

/**
 * Build Next.js `Metadata` (title/description/canonical/OG/Twitter) for a product.
 *
 * I18N-04: canonical includes locale prefix; alternates.languages provides hreflang
 * en and tr; openGraph.locale is locale-aware (en_US / tr_TR).
 *
 * @param locale - 'en' (default) or 'tr'
 */
export function buildProductMetadata(product: Product, locale: string = 'en'): Metadata {
  const description = buildMetaDescription(product, locale);
  const categorySlug = product.category?.slug ?? 'all';
  const productSlug = product.slug ?? product.id;
  const productPath = `/catalog/${categorySlug}/${productSlug}`;
  const url = absoluteUrl(`/${locale}${productPath}`);
  const images = productImageAbsoluteUrls(product);
  const ogTitle = `${product.name} — ${SITE_NAME}`;

  return {
    // The layout title template appends " — American Creator".
    title: product.name,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: absoluteUrl(`/en${productPath}`),
        tr: absoluteUrl(`/tr${productPath}`),
      },
    },
    openGraph: {
      type: 'website',
      title: ogTitle,
      description,
      url,
      siteName: SITE_NAME,
      // I18N-04: OG locale derived from active locale (not hardcoded ru_RU)
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      images: images.length ? images.map((u) => ({ url: u })) : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: images.length ? images : undefined,
    },
  };
}

/**
 * Build schema.org Product JSON-LD (price + availability from `bp_available`).
 *
 * I18N-04: priceCurrency uses NEXT_PUBLIC_STOREFRONT_CURRENCY (TRY) not RUB.
 */
export function buildProductJsonLd(product: Product): Record<string, unknown> {
  const url = productCanonicalUrl(product);
  const images = productImageAbsoluteUrls(product);
  const inStock = (product.bp_available ?? 0) > 0;
  const description = buildMetaDescription(product);

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      url,
      // I18N-04: TRY not RUB; sourced from env (T-04-11: hardcoded constant, not user input)
      priceCurrency: process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY',
      price: String(product.price),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  if (images.length) jsonLd.image = images;
  if (description) jsonLd.description = description;
  if (product.category?.name) jsonLd.category = product.category.name;

  return jsonLd;
}

/**
 * Serialize JSON-LD for embedding via `dangerouslySetInnerHTML`.
 *
 * Escapes every `<` to the `<` JSON escape so an admin-controlled product
 * name containing `</script>` cannot break out of the `<script>` tag (stored XSS).
 * The result is still valid JSON, so structured-data crawlers parse it fine.
 * DOMPurify is intentionally NOT used here: this payload is JSON, not HTML —
 * sanitizing it as HTML would corrupt the structured data, while the `<` escape
 * already neutralizes the only injection vector for a script-tag text node.
 */
export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
