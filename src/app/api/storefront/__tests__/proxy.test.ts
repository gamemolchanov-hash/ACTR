/**
 * ARM storefront proxy — ?lang BCP-47 injection contract (D-08 / I18N-03).
 *
 * Guards: lang=<bcp47> is injected ONLY on product-detail
 * (path.length===2 && path[0]==='products'), NOT on the products list or any
 * other endpoint. Short locale codes (en/tr) never reach BFF — only full BCP-47
 * (en-US/tr-TR). Existing ?lang param is never overwritten.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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

  it('defaults to lang=en-US on product detail when no NEXT_LOCALE cookie', async () => {
    const req = makeReq('products/some-slug');
    await GET(req, makeCtx(['products', 'some-slug']));
    const [calledUrl] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain('lang=en-US');
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

describe('ARM storefront proxy — client IP forwarding (FBG-385)', () => {
  it('forwards both CF-Connecting-IP and X-Forwarded-For when both are present', async () => {
    const req = new NextRequest('http://localhost:3000/api/storefront/products', {
      headers: { 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
    });
    await GET(req, makeCtx(['products']));
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const h = init.headers as Record<string, string>;
    expect(h['CF-Connecting-IP']).toBe('203.0.113.7');
    expect(h['X-Forwarded-For']).toBe('203.0.113.7, 10.0.0.1');
  });

  it('cross-fills CF-Connecting-IP from the first X-Forwarded-For hop', async () => {
    const req = new NextRequest('http://localhost:3000/api/storefront/products', {
      headers: { 'x-forwarded-for': '198.51.100.9, 10.0.0.1' },
    });
    await GET(req, makeCtx(['products']));
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const h = init.headers as Record<string, string>;
    expect(h['CF-Connecting-IP']).toBe('198.51.100.9');
    expect(h['X-Forwarded-For']).toBe('198.51.100.9, 10.0.0.1');
  });

  it('cross-fills X-Forwarded-For from CF-Connecting-IP when XFF is absent', async () => {
    const req = new NextRequest('http://localhost:3000/api/storefront/products', {
      headers: { 'cf-connecting-ip': '192.0.2.44' },
    });
    await GET(req, makeCtx(['products']));
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const h = init.headers as Record<string, string>;
    expect(h['CF-Connecting-IP']).toBe('192.0.2.44');
    expect(h['X-Forwarded-For']).toBe('192.0.2.44');
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
