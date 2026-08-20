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
 *
 * FBG-609: these GETs are idempotent, so a transport-level blip is retried before
 * that throw (see `bffGet`) — on 17.08 and 19.08 a single Cloudflare 522 between
 * the edge and the origin turned into a 500 on the product page.
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

/**
 * Statuses worth a second try (FBG-609): the request never reached the application,
 * so replaying it can only help. 502/503/504 = gateway/origin unavailable, 522/524 =
 * Cloudflare could not connect to / timed out on the origin. A 500 is deliberately
 * absent — that is the BFF's own application error, identical on every replay — and
 * so is every 4xx (404 → `null`, 401/403 → final).
 */
const RETRYABLE_STATUSES = new Set([502, 503, 504, 522, 524]);

/** Backoff before retry #1 and #2; +25% jitter keeps the total under ~1.5 s. */
const RETRY_BACKOFF_MS = [300, 900] as const;

/** Pause between retries; injected in tests so the suite never sleeps. */
export type RetryDelay = (ms: number) => Promise<void>;

const sleep: RetryDelay = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** Backoff for the given attempt (0-based), spread by jitter so parallel renders don't sync up. */
function backoffMs(attempt: number): number {
  return Math.round(RETRY_BACKOFF_MS[attempt] * (1 + Math.random() * 0.25));
}

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
 *
 * The GET is idempotent, so a transport-level failure is replayed: up to 3 attempts
 * (original + 2 retries, ~300 ms / ~900 ms backoff) on a `fetch` exception or a
 * 502/503/504/522/524. Everything else is answered on the first response — a 4xx
 * (404 → `null`) and a 500 (the BFF's own application error) gain nothing from a
 * replay. Once the attempts are spent the caller sees the very same
 * `BffUnavailableError` with the last status, so the FBG-67 contract is unchanged.
 *
 * @param path  - BFF path (e.g. `/products/slug-123`)
 * @param lang  - Optional BCP-47 code (e.g. `tr-TR`); appended as `?lang=` when provided.
 * @param delay - Backoff pause (test seam; defaults to a real `setTimeout`).
 * @returns parsed body on 2xx, `null` on a genuine 404.
 * @throws {BffUnavailableError} on network failure or any other non-2xx status.
 */
async function bffGet<T>(
  path: string,
  lang?: string,
  delay: RetryDelay = sleep,
): Promise<T | null> {
  const headers: Record<string, string> = {
    ...tenantHeader(),
    ...(STOREFRONT_KEY ? { 'X-Storefront-Key': STOREFRONT_KEY } : {}),
    ...currencyHeader(),
  };

  let url: string;
  try {
    const fullUrl = new URL(`${STOREFRONT_BASE}${path}`);
    if (lang) fullUrl.searchParams.set('lang', lang);
    url = fullUrl.toString();
  } catch (err) {
    // Malformed base/path — not transient, so no retry.
    throw new BffUnavailableError(0, `Storefront BFF request failed: ${path}`, { cause: err });
  }

  for (let attempt = 0; ; attempt++) {
    const canRetry = attempt < RETRY_BACKOFF_MS.length;
    let res: Response;

    // `next.revalidate` is added to fetch options by the Next runtime; typed via
    // an intersection so plain `tsc` (no Next augmentation) still compiles.
    // A retry must carry a header the first attempt did not: Next memoizes GET
    // responses per render by url + headers (`dedupe-fetch`), so an identical
    // replay would be answered with the memoized failed response and the backoff
    // would buy nothing. Only 200s reach the data cache, so nothing else changes.
    const init: RequestInit & { next?: { revalidate?: number } } = {
      headers: attempt === 0 ? headers : { ...headers, 'X-Retry-Attempt': String(attempt) },
      next: { revalidate: REVALIDATE_SECONDS },
    };

    try {
      res = await fetch(url, init);
    } catch (err) {
      if (!canRetry) {
        throw new BffUnavailableError(0, `Storefront BFF request failed: ${path}`, { cause: err });
      }
      console.warn(
        `[server-api] retrying ${path} after a network failure (attempt ${attempt + 1})`,
      );
      await delay(backoffMs(attempt));
      continue;
    }

    if (res.status === 404) return null;
    if (!res.ok) {
      if (!canRetry || !RETRYABLE_STATUSES.has(res.status)) {
        throw new BffUnavailableError(
          res.status,
          `Storefront BFF responded ${res.status}: ${path}`,
        );
      }
      console.warn(`[server-api] retrying ${path} after ${res.status} (attempt ${attempt + 1})`);
      await delay(backoffMs(attempt));
      continue;
    }
    return (await res.json()) as T;
  }
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
 * @param delay    - retry backoff (test seam, see `bffGet`)
 * @returns the product, or `null` when the BFF reports a genuine 404.
 * @throws {BffUnavailableError} on a transient BFF failure that outlived the retries.
 */
export async function fetchProductServer(
  idOrSlug: string,
  locale?: string,
  delay?: RetryDelay,
): Promise<Product | null> {
  const lang = locale ? (LOCALE_TO_BCP47[locale] || 'en-US') : undefined;
  const res = await bffGet<{ data: ArmDistributorProduct }>(
    ENDPOINTS.product(encodeURIComponent(idOrSlug)),
    lang,
    delay,
  );
  return res?.data ? armToProduct(res.data) : null;
}

/**
 * All storefront categories.
 * @param delay - retry backoff (test seam, see `bffGet`)
 * @throws {BffUnavailableError} on any failure — callers (sitemap) must not
 * publish a category-less result, so a 404 here is treated as a failure too
 * (the endpoint returns `200 + []` when there are genuinely no categories).
 */
export async function fetchCategoriesServer(delay?: RetryDelay): Promise<Category[]> {
  const res = await bffGet<{ data: ArmCategory[] }>(ENDPOINTS.categories, undefined, delay);
  if (res === null) {
    throw new BffUnavailableError(404, 'Storefront BFF responded 404 for /categories');
  }
  return (res.data ?? []).map(armToCategory);
}

/**
 * Every active storefront product, walking the paginated catalog endpoint.
 * Hard-capped to 100 pages (10k products) so a misbehaving `meta` can't loop.
 * @param delay - retry backoff (test seam, see `bffGet`)
 * @throws {BffUnavailableError} on any failure — never returns a partial list
 * (an empty/short list would silently truncate the sitemap). A page that stays
 * down aborts the whole walk after its 3 attempts, so the retries cost at most
 * ~1.5 s once, not per page.
 */
export async function fetchAllProductsServer(delay?: RetryDelay): Promise<Product[]> {
  const all: Product[] = [];
  const limit = 100;
  const MAX_PAGES = 100;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await bffGet<ArmPaginated<ArmDistributorProduct>>(
      `${ENDPOINTS.products}?limit=${limit}&page=${page}`,
      undefined,
      delay,
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
