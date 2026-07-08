/**
 * Server-side storefront data fetchers (FBG-67).
 *
 * Used by server components / route handlers that run before hydration
 * (`generateMetadata`, `sitemap.ts`) where the browser-only axios client and
 * its relative `/api/storefront` rewrite are unavailable. Talks to the BFF
 * directly over the internal URL with the tenant header, mirroring how the
 * Next.js rewrite proxies `/api/storefront/* → ${BFF}/public/arm/storefront/*`.
 *
 * Failure handling deliberately distinguishes two cases (FBG-67 review):
 *   - genuine 404 (resource absent)        → `null`  → caller renders notFound()
 *   - transient/5xx/network (BFF blip)     → throws  → caller surfaces 5xx and
 *                                                       NEVER emits noindex
 * Collapsing both into `null` would noindex live products during a BFF blip and
 * silently truncate the sitemap, which is the opposite of the SEO goal.
 *
 * I18N-03 (04-05): fetchProductServer accepts locale → threads ?lang=<bcp47> to
 * the BFF so server-rendered SEO metadata (generateMetadata, JSON-LD) reflects
 * the active locale. The BFF requires full BCP-47 (e.g. tr-TR not tr).
 */

import {
  ENDPOINTS,
  ARM_STOREFRONT_BASE_PATH,
  LOCALE_TO_BCP47,
  currencyHeader,
  tenantHeader,
} from './arm-contract';
import type { Product, Category } from './domain-types';
import { armToProduct, armToCategory } from './arm-adapter';
import type { ArmDistributorProduct, ArmCategory, ArmPaginated } from './arm-types';

const BFF_INTERNAL_URL = (process.env.BFF_INTERNAL_URL || 'http://localhost:4000').replace(
  /\/+$/,
  '',
);
const STOREFRONT_KEY = process.env.ARM_STOREFRONT_KEY || '';
const STOREFRONT_BASE = `${BFF_INTERNAL_URL}${ARM_STOREFRONT_BASE_PATH}`;

// Catalog data is cached at the BFF/CDN already; re-fetch server-side at most
// every 5 min so metadata/sitemap stay fresh without hammering the BFF.
const REVALIDATE_SECONDS = 300;

/** Thrown when the BFF is unreachable or returns a non-404 error (transient). */
export class BffUnavailableError extends Error {
  constructor(
    readonly status: number,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'BffUnavailableError';
  }
}

/**
 * GET a storefront BFF endpoint.
 * @param path - BFF path (e.g. `/products/slug-123`)
 * @param lang - Optional BCP-47 code (e.g. `tr-TR`); appended as `?lang=` when provided.
 * @returns parsed body on 2xx, `null` on a genuine 404.
 * @throws {BffUnavailableError} on network failure or any other non-2xx status.
 */
async function bffGet<T>(path: string, lang?: string): Promise<T | null> {
  let res: Response;
  try {
    const fullUrl = new URL(`${STOREFRONT_BASE}${path}`);
    if (lang) fullUrl.searchParams.set('lang', lang);

    // `next.revalidate` is added to fetch options by the Next runtime; typed via
    // an intersection so plain `tsc` (no Next augmentation) still compiles.
    const init: RequestInit & { next?: { revalidate?: number } } = {
      headers: {
        ...tenantHeader(),
        ...(STOREFRONT_KEY ? { 'X-Storefront-Key': STOREFRONT_KEY } : {}),
        ...currencyHeader(),
      },
      next: { revalidate: REVALIDATE_SECONDS },
    };
    res = await fetch(fullUrl.toString(), init);
  } catch (err) {
    throw new BffUnavailableError(0, `Storefront BFF request failed: ${path}`, { cause: err });
  }

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new BffUnavailableError(res.status, `Storefront BFF responded ${res.status}: ${path}`);
  }
  return (await res.json()) as T;
}

/**
 * Single product by slug or UUID (mirrors the client `fetchProduct`).
 *
 * I18N-03: when `locale` is provided, threads `?lang=<bcp47>` to the BFF so
 * server-rendered SEO metadata reflects the active locale. Product name/description
 * are returned in the requested language if translations exist in the tenant;
 * otherwise the default-language content is returned (graceful fallback).
 *
 * @param idOrSlug - product slug or UUID
 * @param locale   - 'en' | 'tr' (optional; omit for locale-agnostic fetch)
 * @returns the product, or `null` when the BFF reports a genuine 404.
 * @throws {BffUnavailableError} on a transient BFF failure.
 */
export async function fetchProductServer(
  idOrSlug: string,
  locale?: string,
): Promise<Product | null> {
  const lang = locale ? (LOCALE_TO_BCP47[locale] || 'en-US') : undefined;
  const res = await bffGet<{ data: ArmDistributorProduct }>(
    ENDPOINTS.product(encodeURIComponent(idOrSlug)),
    lang,
  );
  return res?.data ? armToProduct(res.data) : null;
}

/**
 * All storefront categories.
 * @throws {BffUnavailableError} on any failure — callers (sitemap) must not
 * publish a category-less result, so a 404 here is treated as a failure too
 * (the endpoint returns `200 + []` when there are genuinely no categories).
 */
export async function fetchCategoriesServer(): Promise<Category[]> {
  const res = await bffGet<{ data: ArmCategory[] }>(ENDPOINTS.categories);
  if (res === null) {
    throw new BffUnavailableError(404, 'Storefront BFF responded 404 for /categories');
  }
  return (res.data ?? []).map(armToCategory);
}

/**
 * Every active storefront product, walking the paginated catalog endpoint.
 * Hard-capped to 100 pages (10k products) so a misbehaving `meta` can't loop.
 * @throws {BffUnavailableError} on any failure — never returns a partial list
 * (an empty/short list would silently truncate the sitemap).
 */
export async function fetchAllProductsServer(): Promise<Product[]> {
  const all: Product[] = [];
  const limit = 100;
  const MAX_PAGES = 100;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await bffGet<ArmPaginated<ArmDistributorProduct>>(
      `${ENDPOINTS.products}?limit=${limit}&page=${page}`,
    );
    if (res === null) {
      throw new BffUnavailableError(404, `Storefront BFF responded 404 for /products page ${page}`);
    }
    if (!res.data?.length) break;
    all.push(...res.data.map(armToProduct));
    const totalPages = res.meta?.totalPages ?? page;
    if (page >= totalPages) break;
  }

  return all;
}
