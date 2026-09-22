/**
 * Verimor webhook relay (22.09.2026): raw body, `X-Verimor-Signature` and the
 * `token` query go to ARM `/public/arm/iys/webhooks/verimor/<tenant>` unchanged;
 * ARM's status and text come back to Verimor. A BFF outage answers 502 so
 * Verimor retries later.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
process.env.BFF_INTERNAL_URL = 'https://api.example.test';

const { POST } = await import('../route');

const BODY = JSON.stringify({ iys_campaign_id: 1234, report_date: '2026-09-21', source_addr: 'KIZILKALINA' });

function post(url = 'https://american-creator.tr/api/webhooks/verimor?token=tok-abc', headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: BODY,
  });
}

beforeEach(() => vi.clearAllMocks());

describe('POST /api/webhooks/verimor', () => {
  it('relays body, token query, signature header and ARM answer', async () => {
    mockFetch.mockResolvedValue(new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }));
    const res = await POST(post(undefined, { 'x-verimor-signature': 'sha256=abc' }));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"ok":true}');
    expect(res.headers.get('content-type')).toBe('application/json');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toMatch(/^https:\/\/api\.example\.test\/public\/arm\/iys\/webhooks\/verimor\/[^/?]+\?token=tok-abc$/);
    expect(init.body).toBe(BODY);
    expect(init.headers['x-verimor-signature']).toBe('sha256=abc');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('relays ARM rejection (401) verbatim; no token → upstream URL without query', async () => {
    mockFetch.mockResolvedValue(new Response('Invalid webhook token', { status: 401 }));
    const res = await POST(post('https://american-creator.tr/api/webhooks/verimor'));
    expect(res.status).toBe(401);
    expect(await res.text()).toBe('Invalid webhook token');
    expect(mockFetch.mock.calls[0][0]).not.toContain('?token=');
  });

  it('answers 502 when ARM is unreachable so Verimor retries', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await POST(post());
    expect(res.status).toBe(502);
  });
});
