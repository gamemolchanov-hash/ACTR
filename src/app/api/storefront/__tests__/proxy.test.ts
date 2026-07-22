/**
 * ARM storefront proxy — ?lang BCP-47 injection contract (D-08 / I18N-03).
 *
 * Guards: lang=<bcp47> is injected ONLY on product-detail
 * (path.length===2 && path[0]==='products'), NOT on the products list or any
 * other endpoint. Short locale codes (en/tr) never reach BFF — only full BCP-47
 * (en-US/tr-TR). Existing ?lang param is never overwritten.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Stub global fetch BEFORE importing the route so the module picks it up.
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// @ts-ignore — dynamic route directory with bracket name; valid FS path
import { GET } from '../[...path]/route';

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
});

/**
 * Build a NextRequest for the /api/storefront/* route.
 * @param pathStr  path fragment after /api/storefront/ (e.g. 'products/some-slug')
 * @param locale   optional NEXT_LOCALE cookie value
 * @param query    optional raw query string (without leading '?')
 */
function makeReq(pathStr: string, locale?: string, query?: string): NextRequest {
  const qs = query ? `?${query}` : '';
  const url = `http://localhost:3000/api/storefront/${pathStr}${qs}`;
  const headers: Record<string, string> = {};
  if (locale) headers['Cookie'] = `NEXT_LOCALE=${locale}`;
  return new NextRequest(url, { headers });
}

function makeCtx(pathParts: string[]) {
  // Next 15: route-handler context params are async (a Promise).
  return { params: Promise.resolve({ path: pathParts }) };
}

describe('ARM storefront proxy — ?lang injection (D-08, I18N-03)', () => {
  it('injects lang=tr-TR on product detail when locale=tr', async () => {
    const req = makeReq('products/some-slug', 'tr');
    await GET(req, makeCtx(['products', 'some-slug']));
    const [calledUrl] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain('lang=tr-TR');
  });

  it('injects lang=en-US on product detail when locale=en', async () => {
    const req = makeReq('products/some-slug', 'en');
    await GET(req, makeCtx(['products', 'some-slug']));
    const [calledUrl] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain('lang=en-US');
  });

  it('defaults to lang=tr-TR on product detail when no NEXT_LOCALE cookie (site default TR, FBG-425)', async () => {
    const req = makeReq('products/some-slug');
    await GET(req, makeCtx(['products', 'some-slug']));
    const [calledUrl] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain('lang=tr-TR');
    // The old EN default must no longer leak through for cookieless requests.
    expect(calledUrl).not.toContain('lang=en-US');
  });

  it('does NOT inject lang on /products list (path.length===1)', async () => {
    const req = makeReq('products', 'tr');
    await GET(req, makeCtx(['products']));
    const [calledUrl] = mockFetch.mock.calls[0];
    expect(calledUrl).not.toMatch(/[?&]lang=/);
  });

  it('does NOT inject lang on non-products endpoints (e.g. /categories)', async () => {
    const req = makeReq('categories', 'tr');
    await GET(req, makeCtx(['categories']));
    const [calledUrl] = mockFetch.mock.calls[0];
    expect(calledUrl).not.toMatch(/[?&]lang=/);
  });

  it('does NOT inject lang on /config endpoint', async () => {
    const req = makeReq('config', 'tr');
    await GET(req, makeCtx(['config']));
    const [calledUrl] = mockFetch.mock.calls[0];
    expect(calledUrl).not.toMatch(/[?&]lang=/);
  });

  it('does NOT overwrite an existing ?lang on product detail', async () => {
    const req = makeReq('products/some-slug', 'tr', 'lang=xx-YY');
    await GET(req, makeCtx(['products', 'some-slug']));
    const [calledUrl] = mockFetch.mock.calls[0];
    // Original lang is preserved
    expect(calledUrl).toContain('lang=xx-YY');
    // tr-TR is NOT injected on top
    expect(calledUrl).not.toContain('lang=tr-TR');
  });

  it('only sends full BCP-47 codes — never short codes like "en" or "tr"', async () => {
    const req = makeReq('products/slug-1', 'tr');
    await GET(req, makeCtx(['products', 'slug-1']));
    const [calledUrl] = mockFetch.mock.calls[0];
    // Must not contain plain short codes as the lang value
    expect(calledUrl).not.toMatch(/[?&]lang=en(?:[^-]|$)/);
    expect(calledUrl).not.toMatch(/[?&]lang=tr(?:[^-]|$)/);
    // Must contain the full BCP-47 code
    expect(calledUrl).toContain('lang=tr-TR');
  });
});

describe('ARM storefront proxy — X-Currency forwarding (D-07 regression guard)', () => {
  it('forwards inbound X-Currency header to the BFF unchanged', async () => {
    const req = new NextRequest('http://localhost:3000/api/storefront/products', {
      headers: { 'x-currency': 'TRY' },
    });
    await GET(req, makeCtx(['products']));
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['X-Currency']).toBe('TRY');
  });

  it('does not add an X-Currency header when the inbound request has none', async () => {
    const req = makeReq('categories');
    await GET(req, makeCtx(['categories']));
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['X-Currency']).toBeUndefined();
  });
});

describe('ARM storefront proxy — client IP forwarding (FBG-385, narrowed by FBG-388)', () => {
  // CF-Connecting-IP is Cloudflare-reserved: an inbound request carrying it into
  // the forza-brava.com zone is rejected at the edge with 403 "error code: 1000"
  // (any method). Sending it took down the entire client-side API in prod.
  it('NEVER forwards CF-Connecting-IP upstream, even when the visitor request has one', async () => {
    const req = new NextRequest('http://localhost:3000/api/storefront/products', {
      headers: { 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
    });
    await GET(req, makeCtx(['products']));
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const h = init.headers as Record<string, string>;
    expect(h['CF-Connecting-IP']).toBeUndefined();
    expect(Object.keys(h).map((k) => k.toLowerCase())).not.toContain('cf-connecting-ip');
    expect(h['X-Forwarded-For']).toBe('203.0.113.7, 10.0.0.1');
  });

  it('forwards X-Forwarded-For unchanged (CF appends its own hop — safe)', async () => {
    const req = new NextRequest('http://localhost:3000/api/storefront/products', {
      headers: { 'x-forwarded-for': '198.51.100.9, 10.0.0.1' },
    });
    await GET(req, makeCtx(['products']));
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const h = init.headers as Record<string, string>;
    expect(h['X-Forwarded-For']).toBe('198.51.100.9, 10.0.0.1');
    expect(h['CF-Connecting-IP']).toBeUndefined();
  });

  it('fills X-Forwarded-For from the inbound CF-Connecting-IP when XFF is absent', async () => {
    const req = new NextRequest('http://localhost:3000/api/storefront/products', {
      headers: { 'cf-connecting-ip': '192.0.2.44' },
    });
    await GET(req, makeCtx(['products']));
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const h = init.headers as Record<string, string>;
    expect(h['X-Forwarded-For']).toBe('192.0.2.44');
    expect(h['CF-Connecting-IP']).toBeUndefined();
  });

  it('never fabricates an IP when neither header is present', async () => {
    const req = makeReq('products');
    await GET(req, makeCtx(['products']));
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const h = init.headers as Record<string, string>;
    expect(h['CF-Connecting-IP']).toBeUndefined();
    expect(h['X-Forwarded-For']).toBeUndefined();
  });
});

describe('ARM storefront proxy — per-visitor rate-limit headers (FBG-390)', () => {
  // The BFF trusts a visitor IP only when it arrives with BOTH the shared proxy
  // secret AND the client-IP header from our server-side proxy. The IP is taken
  // from cf-connecting-ip ONLY (set by the american-creator.tr CF zone; a client
  // cannot spoof it). An inbound X-Storefront-Client-IP is ignored. cf-connecting-ip
  // itself is still never forwarded (FBG-388 regression).
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('(а) sends X-Storefront-Client-IP + X-Storefront-Proxy-Secret when secret is set and cf-connecting-ip is present', async () => {
    vi.stubEnv('STOREFRONT_PROXY_SECRET', 'test-proxy-secret');
    const req = new NextRequest('http://localhost:3000/api/storefront/auth/register', {
      method: 'POST',
      headers: { 'cf-connecting-ip': '1.2.3.4', 'content-type': 'application/json' },
      body: '{}',
    });
    await GET(req, makeCtx(['auth', 'register']));
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const h = init.headers as Record<string, string>;
    expect(h['X-Storefront-Client-IP']).toBe('1.2.3.4');
    expect(h['X-Storefront-Proxy-Secret']).toBe('test-proxy-secret');
  });

  it('(б) ignores an inbound client-supplied X-Storefront-Client-IP — never passthrough', async () => {
    vi.stubEnv('STOREFRONT_PROXY_SECRET', 'test-proxy-secret');
    // Attacker sends their own X-Storefront-Client-IP but no cf-connecting-ip.
    const req = new NextRequest('http://localhost:3000/api/storefront/products', {
      headers: { 'x-storefront-client-ip': '9.9.9.9' },
    });
    await GET(req, makeCtx(['products']));
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const h = init.headers as Record<string, string>;
    // No cf-connecting-ip → nothing to trust; the forged value must not leak through.
    expect(h['X-Storefront-Client-IP']).toBeUndefined();
    expect(h['X-Storefront-Proxy-Secret']).toBeUndefined();
    expect(Object.values(h)).not.toContain('9.9.9.9');
  });

  it('(б′) prefers the CF-derived IP over a forged inbound X-Storefront-Client-IP', async () => {
    vi.stubEnv('STOREFRONT_PROXY_SECRET', 'test-proxy-secret');
    const req = new NextRequest('http://localhost:3000/api/storefront/products', {
      headers: { 'cf-connecting-ip': '1.2.3.4', 'x-storefront-client-ip': '9.9.9.9' },
    });
    await GET(req, makeCtx(['products']));
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const h = init.headers as Record<string, string>;
    expect(h['X-Storefront-Client-IP']).toBe('1.2.3.4');
  });

  it('(в) sends neither header when the proxy secret is not configured', async () => {
    // No stubEnv → STOREFRONT_PROXY_SECRET is unset (local dev / secret absent).
    const req = new NextRequest('http://localhost:3000/api/storefront/products', {
      headers: { 'cf-connecting-ip': '1.2.3.4' },
    });
    await GET(req, makeCtx(['products']));
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const h = init.headers as Record<string, string>;
    expect(h['X-Storefront-Client-IP']).toBeUndefined();
    expect(h['X-Storefront-Proxy-Secret']).toBeUndefined();
  });

  it('does not send X-Storefront-Proxy-Secret alone when cf-connecting-ip is absent (local dev)', async () => {
    vi.stubEnv('STOREFRONT_PROXY_SECRET', 'test-proxy-secret');
    const req = makeReq('products');
    await GET(req, makeCtx(['products']));
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const h = init.headers as Record<string, string>;
    expect(h['X-Storefront-Client-IP']).toBeUndefined();
    expect(h['X-Storefront-Proxy-Secret']).toBeUndefined();
  });

  it('(г) never forwards cf-connecting-ip upstream, even while emitting the FBG-390 headers', async () => {
    vi.stubEnv('STOREFRONT_PROXY_SECRET', 'test-proxy-secret');
    const req = new NextRequest('http://localhost:3000/api/storefront/products', {
      headers: { 'cf-connecting-ip': '1.2.3.4' },
    });
    await GET(req, makeCtx(['products']));
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const h = init.headers as Record<string, string>;
    expect(Object.keys(h).map((k) => k.toLowerCase())).not.toContain('cf-connecting-ip');
    // The visitor IP still reaches the BFF via the dedicated header, not cf-*.
    expect(h['X-Storefront-Client-IP']).toBe('1.2.3.4');
  });
});
