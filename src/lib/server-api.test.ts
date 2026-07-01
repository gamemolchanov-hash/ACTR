/**
 * FBG-67 — server-side BFF fetchers used by generateMetadata / sitemap.
 *
 * Failure handling is the crux (FBG-67 review): a genuine 404 must read as
 * "absent" (→ null), while a transient/5xx/network failure must throw so the
 * caller never noindexes a live product or publishes a truncated sitemap.
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

describe('fetchProductServer', () => {
  it('returns product data and sends the tenant header to the storefront BFF', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { id: 'p1', name: 'BASE GEL' } }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const product = await fetchProductServer('198');

    expect(product?.id).toBe('p1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/public/oms/storefront/products/198');
    expect((init.headers as Record<string, string>)['X-Tenant-ID']).toBeTruthy();
  });

  it('encodes the slug/id path segment', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ data: { id: 'x' } }) }));
    vi.stubGlobal('fetch', fetchMock);
    await fetchProductServer('a/b c');
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain('/products/a%2Fb%20c');
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
    await expect(fetchProductServer('p1')).rejects.toBeInstanceOf(BffUnavailableError);
  });

  it('throws when fetch itself rejects (BFF down)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    );
    await expect(fetchProductServer('x')).rejects.toBeInstanceOf(BffUnavailableError);
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
    await expect(fetchCategoriesServer()).rejects.toBeInstanceOf(BffUnavailableError);
  });
});

describe('fetchAllProductsServer', () => {
  it('walks every page until totalPages and concatenates results', async () => {
    const page1 = {
      data: Array.from({ length: 100 }, (_, i) => ({ id: `p${i}` })),
      meta: { total: 150, page: 1, limit: 100, totalPages: 2 },
    };
    const page2 = {
      data: Array.from({ length: 50 }, (_, i) => ({ id: `q${i}` })),
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
    await expect(fetchAllProductsServer()).rejects.toBeInstanceOf(BffUnavailableError);
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
