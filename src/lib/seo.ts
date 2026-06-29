/**
 * SEO helpers for the storefront (FBG-67).
 *
 * Pure (network-free) builders for product `<metadata>`, canonical URLs and
 * JSON-LD structured data. Kept separate from `server-api.ts` so they can be
 * unit-tested without mocking `fetch`, and reused by both `generateMetadata`
 * and the `sitemap.ts` route.
 */

import type { Metadata } from 'next';
import type { Product } from './api';

export const SITE_NAME = 'American Creator';

/**
 * Public site origin used for canonical / OG / sitemap absolute URLs.
 * Overridable per-environment; defaults to the production domain.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://american-creator.ru').replace(
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

const formatRub = (price: number) => `${new Intl.NumberFormat('ru-RU').format(price)} ₽`;

/**
 * Meta / OG description for a product. Prefers the short `description`, falls
 * back to a generated sentence with name + price so every product page still
 * ships a non-empty, useful description.
 */
export function buildMetaDescription(product: Product): string {
  const base = product.description ? stripHtml(product.description) : '';
  if (base) return truncate(base, 200);
  const priceSuffix = product.price ? ` — ${formatRub(product.price)}` : '';
  return truncate(
    `${product.name}${priceSuffix}. Купить в интернет-магазине ${SITE_NAME}: профессиональная продукция для nail-мастеров.`,
    200,
  );
}

/** Canonical storefront URL for a product (absolute). */
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

/** Build Next.js `Metadata` (title/description/canonical/OG/Twitter) for a product. */
export function buildProductMetadata(product: Product): Metadata {
  const description = buildMetaDescription(product);
  const url = productCanonicalUrl(product);
  const images = productImageAbsoluteUrls(product);
  const ogTitle = `${product.name} — ${SITE_NAME}`;

  return {
    // The layout title template appends " — American Creator".
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title: ogTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'ru_RU',
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
 * Aggregate review rating for a product, used to emit `aggregateRating` in the
 * Product JSON-LD (FBG-69). `average` is the mean of approved reviews and
 * `count` is how many there are.
 */
export interface ReviewAggregate {
  average: number;
  count: number;
}

/**
 * Build schema.org Product JSON-LD (price + availability from `bp_available`).
 * When `reviews` carries at least one approved review, an `aggregateRating` is
 * added so search engines can render star snippets (FBG-69). A zero-count
 * aggregate is intentionally omitted — Google flags `aggregateRating` with no
 * reviews as invalid structured data.
 */
export function buildProductJsonLd(
  product: Product,
  reviews?: ReviewAggregate | null,
): Record<string, unknown> {
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
      priceCurrency: 'RUB',
      price: String(product.price),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  if (images.length) jsonLd.image = images;
  if (description) jsonLd.description = description;
  if (product.category?.name) jsonLd.category = product.category.name;
  if (reviews && reviews.count > 0 && reviews.average > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(reviews.average),
      reviewCount: reviews.count,
      bestRating: '5',
      worstRating: '1',
    };
  }

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
