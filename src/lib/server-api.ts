/**
 * Server-side storefront data fetchers (FBG-67).
 *
 * Used by server components / route handlers that run before hydration
 * (`generateMetadata`, `sitemap.ts`) where the browser-only axios client and
 * its relative `/api/storefront` rewrite are unavailable. Talks to the BFF
 * directly over the internal URL with the tenant header, mirroring how the
 * Next.js rewrite proxies `/api/storefront/* → ${BFF}/public/oms/storefront/*`.
 *
 * Failure handling deliberately distinguishes two cases (FBG-67 review):
 *   - genuine 404 (resource absent)        → `null`  → caller renders notFound()
 *   - transient/5xx/network (BFF blip)     → throws  → caller surfaces 5xx and
 *                                                       NEVER emits noindex
 * Collapsing both into `null` would noindex live products during a BFF blip and
 * silently truncate the sitemap, which is the opposite of the SEO goal.
 */

import type { Product, Category, PaginatedResponse } from './api';
import type { ReviewAggregate } from './seo';

const BFF_INTERNAL_URL = (process.env.BFF_INTERNAL_URL || 'http://localhost:4000').replace(
  /\/+$/,
  '',
);
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'tenant_snailmarket';
const STOREFRONT_BASE = `${BFF_INTERNAL_URL}/public/oms/storefront`;

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
 * @returns parsed body on 2xx, `null` on a genuine 404.
 * @throws {BffUnavailableError} on network failure or any other non-2xx status.
 */
async function bffGet<T>(path: string): Promise<T | null> {
  let res: Response;
  try {
    // `next.revalidate` is added to fetch options by the Next runtime; typed via
    // an intersection so plain `tsc` (no Next augmentation) still compiles.
    const init: RequestInit & { next?: { revalidate?: number } } = {
      headers: { 'X-Tenant-ID': TENANT_ID },
      next: { revalidate: REVALIDATE_SECONDS },
    };
    res = await fetch(`${STOREFRONT_BASE}${path}`, init);
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
 * @returns the product, or `null` when the BFF reports a genuine 404.
 * @throws {BffUnavailableError} on a transient BFF failure.
 */
export async function fetchProductServer(idOrSlug: string): Promise<Product | null> {
  const res = await bffGet<{ data: Product }>(`/products/${encodeURIComponent(idOrSlug)}`);
  return res?.data ?? null;
}

/**
 * Aggregate rating (approved reviews) for a product, for the server-rendered
 * `aggregateRating` in the Product JSON-LD (FBG-69). Reviews are non-critical
 * SEO enrichment, so any failure (404 / BFF blip) resolves to `null` and the
 * product page still renders — unlike catalog data, a missing rating must
 * never break metadata or 5xx the page.
 */
export async function fetchProductReviewAggregateServer(
  productId: string,
): Promise<ReviewAggregate | null> {
  try {
    const res = await bffGet<{ meta?: { total?: number; average?: number } }>(
      `/reviews?product=${encodeURIComponent(productId)}&limit=1`,
    );
    const total = res?.meta?.total ?? 0;
    const average = res?.meta?.average ?? 0;
    if (total <= 0) return null;
    return { average, count: total };
  } catch {
    return null;
  }
}

/**
 * All storefront categories.
 * @throws {BffUnavailableError} on any failure — callers (sitemap) must not
 * publish a category-less result, so a 404 here is treated as a failure too
 * (the endpoint returns `200 + []` when there are genuinely no categories).
 */
export async function fetchCategoriesServer(): Promise<Category[]> {
  const res = await bffGet<{ data: Category[] }>('/categories');
  if (res === null) {
    throw new BffUnavailableError(404, 'Storefront BFF responded 404 for /categories');
  }
  return res.data ?? [];
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
    const res = await bffGet<PaginatedResponse<Product>>(`/products?limit=${limit}&page=${page}`);
    if (res === null) {
      throw new BffUnavailableError(404, `Storefront BFF responded 404 for /products page ${page}`);
    }
    if (!res.data?.length) break;
    all.push(...res.data);
    const totalPages = res.meta?.totalPages ?? page;
    if (page >= totalPages) break;
  }

  return all;
}
