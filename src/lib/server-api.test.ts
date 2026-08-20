/**
 * FBG-67 — server-side BFF fetchers used by generateMetadata / sitemap.
 *
 * Failure handling is the crux (FBG-67 review): a genuine 404 must read as
 * "absent" (→ null), while a transient/5xx/network failure must throw so the
 * caller never noindexes a live product or publishes a truncated sitemap.
 *
 * FBG-609: a transient blip (Cloudflare 522/503, dropped connection) is now
 * retried up to 3 attempts before that throw. Every test that drives a failing
 * BFF injects an instant `delay` so the suite never sleeps on the real backoff.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fetchProductServer,
  fetchCategoriesServer,
  fetchAllProductsServer,
  BffUnavailableError,
} from './server-api';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Instant retry backoff: keeps failing-BFF tests off the real ~1.2 s timer. */
const noDelay = async (): Promise<void> => {};

/** Instant backoff that records the requested pauses (FBG-609 budget assertions). */
function recordingDelay(): { waits: number[]; delay: (ms: number) => Promise<void> } {
  const waits: number[] = [];
  return { waits, delay: async (ms: number) => void waits.push(ms) };
}

/** Minimal `fetch` response stub. */
const respond = (status: number, body: unknown = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

describe('fetchProductServer', () => {
  it('returns product data and sends the tenant header to the storefront BFF', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { id: 'p1', price: '10.00', product: { name: 'BASE GEL' } } }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const product = await fetchProductServer('198');

    expect(product?.id).toBe('p1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/public/arm/storefront/products/198');
    expect((init.headers as Record<string, string>)['X-Tenant-ID']).toBeTruthy();
  });

  it('encodes the slug/id path segment', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ data: { id: 'x', price: '1.00', product: { name: 'X' } } }) }));
    vi.stubGlobal('fetch', fetchMock);
    await fetchProductServer('a/b c');
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain('/products/a%2Fb%20c');
  });

  // FBG-258: the SEO path (generateMetadata / JSON-LD) must request the same
  // localized content as the visible page — ?lang=<bcp47> threaded from the URL
  // locale. Guards the shared LOCALE_TO_BCP47 map after centralizing it.
  it('threads ?lang=tr-TR when locale=tr (localized SEO metadata)', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { id: 'p1', price: '10.00', product: { name: 'BAZ JEL' } } }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    await fetchProductServer('198', 'tr');
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain('lang=tr-TR');
  });

  it('sends no ?lang param when locale is omitted (locale-agnostic fetch)', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { id: 'p1', price: '10.00', product: { name: 'BASE GEL' } } }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    await fetchProductServer('198');
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).not.toMatch(/[?&]lang=/);
  });

  it('returns null on a genuine 404 (product absent → notFound())', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })),
    );
    expect(await fetchProductServer('missing')).toBeNull();
  });

  it('throws (not null) on a 5xx — a transient blip must never noindex', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })),
    );
    await expect(fetchProductServer('p1', undefined, noDelay)).rejects.toBeInstanceOf(
      BffUnavailableError,
    );
  });

  it('throws when fetch itself rejects (BFF down)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    );
    await expect(fetchProductServer('x', undefined, noDelay)).rejects.toBeInstanceOf(
      BffUnavailableError,
    );
  });

  // Phase 7 (DATA-01/D-06): X-Currency must be sent on the SSR product-detail
  // path. The flat fixture reused above makes armToProduct throw (pre-existing
  // Pitfall 3, unrelated) — fetch is invoked BEFORE the adapter runs, so the
  // captured init is valid regardless of the adapter throw (see 07-PATTERNS.md).
  it('sends X-Currency: TRY on the product-detail fetch (D-06)', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { id: 'p1', name: 'BASE GEL' } }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      await fetchProductServer('198');
    } catch {
      // armToProduct throws on this flat fixture — irrelevant to this assertion.
    }
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['X-Currency']).toBe('TRY');
  });
});

describe('fetchCategoriesServer', () => {
  it('returns the categories array', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [{ id: 'c1', slug: 'base_gel' }] }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const cats = await fetchCategoriesServer();
    expect(cats).toHaveLength(1);
    expect(cats[0].slug).toBe('base_gel');
    // Phase 7 (DATA-01/D-06): shared bffGet() init.headers seam — primary
    // assertion for the SSR X-Currency fix (this fixture resolves cleanly,
    // no armToProduct fixture bug to work around).
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['X-Currency']).toBe('TRY');
  });

  it('throws when the BFF errors (so the sitemap is not category-less)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })),
    );
    await expect(fetchCategoriesServer(noDelay)).rejects.toBeInstanceOf(BffUnavailableError);
  });
});

describe('fetchAllProductsServer', () => {
  it('walks every page until totalPages and concatenates results', async () => {
    const page1 = {
      data: Array.from({ length: 100 }, (_, i) => ({ id: `p${i}`, price: '1.00', product: { name: `P${i}` } })),
      meta: { total: 150, page: 1, limit: 100, totalPages: 2 },
    };
    const page2 = {
      data: Array.from({ length: 50 }, (_, i) => ({ id: `q${i}`, price: '1.00', product: { name: `Q${i}` } })),
      meta: { total: 150, page: 2, limit: 100, totalPages: 2 },
    };
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url.includes('page=1') ? page1 : page2),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const all = await fetchAllProductsServer();

    expect(all).toHaveLength(150);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('stops on an empty page', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchAllProductsServer()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws on a transient page failure instead of returning a partial list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 502, json: async () => ({}) })),
    );
    await expect(fetchAllProductsServer(noDelay)).rejects.toBeInstanceOf(BffUnavailableError);
  });

  // Phase 7 (DATA-01/D-06): X-Currency must be sent on the all-products walk
  // (sitemap path). Uses the same flat-fixture-throws-in-adapter workaround as
  // the fetchProductServer case above — fetch is invoked before armToProduct runs.
  it('sends X-Currency: TRY on the all-products walk (D-06)', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [{ id: 'p1', name: 'BASE GEL' }],
        meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      await fetchAllProductsServer();
    } catch {
      // armToProduct throws on this flat fixture — irrelevant to this assertion.
    }
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['X-Currency']).toBe('TRY');
  });
});

/**
 * FBG-609 — a single Cloudflare 522 (edge↔origin blip, prod 17.08 / 19.08) must not
 * turn into a 500 for the visitor: idempotent GETs are retried up to 3 attempts.
 * Only transport-level failures are retried — a 4xx (incl. 404) and a 500
 * (application error in the BFF) are final on the first response.
 */
describe('bffGet retry on a transient BFF failure (FBG-609)', () => {
  const PRODUCT_BODY = { data: { id: 'p1', price: '10.00', product: { name: 'BASE GEL' } } };

  it('survives a 522 → 522 → 200 sequence and returns the product', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond(522))
      .mockResolvedValueOnce(respond(522))
      .mockResolvedValue(respond(200, PRODUCT_BODY));
    vi.stubGlobal('fetch', fetchMock);
    const { waits, delay } = recordingDelay();

    const product = await fetchProductServer('198', 'tr', delay);

    expect(product?.id).toBe('p1');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // Each retry must be a NEW request: Next memoizes GET responses per render by
    // url + headers, so a byte-identical replay would be answered with the cached
    // 522 instead of reaching the BFF.
    const headersOf = (call: number) =>
      (fetchMock.mock.calls[call] as unknown as [string, RequestInit])[1].headers as Record<
        string,
        string
      >;
    expect(headersOf(0)['X-Retry-Attempt']).toBeUndefined();
    expect(headersOf(1)['X-Retry-Attempt']).toBe('1');
    expect(headersOf(2)['X-Retry-Attempt']).toBe('2');
    // The tenant/currency contract is untouched by the retry.
    expect(headersOf(2)['X-Currency']).toBe('TRY');
    expect(headersOf(2)['X-Tenant-ID']).toBeTruthy();
    // Backoff stays inside the ~1.5 s budget the SSR render can afford.
    expect(waits).toHaveLength(2);
    expect(waits.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(1500);
    expect(waits[0]).toBeGreaterThanOrEqual(300);
    expect(waits[1]).toBeGreaterThan(waits[0]);
  });

  it('gives up after 3 attempts and throws the original status (522)', async () => {
    const fetchMock = vi.fn(async () => respond(522));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchProductServer('198', undefined, noDelay)).rejects.toMatchObject({
      name: 'BffUnavailableError',
      status: 522,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries a rejected fetch (dropped connection) and succeeds on the retry', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue(respond(200, PRODUCT_BODY));
    vi.stubGlobal('fetch', fetchMock);

    const product = await fetchProductServer('198', undefined, noDelay);

    expect(product?.id).toBe('p1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry a 404 — absent product still resolves to null at once', async () => {
    const fetchMock = vi.fn(async () => respond(404));
    vi.stubGlobal('fetch', fetchMock);
    const { waits, delay } = recordingDelay();

    expect(await fetchProductServer('missing', undefined, delay)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(waits).toHaveLength(0);
  });

  it('does NOT retry a 500 (application error in the BFF) nor a 403', async () => {
    for (const status of [500, 403]) {
      const fetchMock = vi.fn(async () => respond(status));
      vi.stubGlobal('fetch', fetchMock);

      await expect(fetchProductServer('p1', undefined, noDelay)).rejects.toMatchObject({ status });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it('retries the sitemap fetchers too (categories 503, products page 522)', async () => {
    const categoriesMock = vi
      .fn()
      .mockResolvedValueOnce(respond(503))
      .mockResolvedValue(respond(200, { data: [{ id: 'c1', slug: 'base_gel' }] }));
    vi.stubGlobal('fetch', categoriesMock);
    expect(await fetchCategoriesServer(noDelay)).toHaveLength(1);
    expect(categoriesMock).toHaveBeenCalledTimes(2);

    const productsMock = vi
      .fn()
      .mockResolvedValueOnce(respond(522))
      .mockResolvedValue(
        respond(200, {
          data: [{ id: 'p1', price: '1.00', product: { name: 'P1' } }],
          meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
        }),
      );
    vi.stubGlobal('fetch', productsMock);
    expect(await fetchAllProductsServer(noDelay)).toHaveLength(1);
    expect(productsMock).toHaveBeenCalledTimes(2);
  });
});
