/**
 * iyzico Merchant Notification relay (22.09.2026): the raw body and the
 * `X-IYZ-SIGNATURE-V3` header go to ARM `/public/arm/webhooks/iyzico/<tenant>`
 * unchanged; ARM's status and text come back to iyzico. A BFF outage answers
 * 502 so iyzico retries later.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
process.env.BFF_INTERNAL_URL = 'https://api.example.test';

const { POST } = await import('../route');

const BODY = JSON.stringify({ iyziEventType: 'CHECKOUT_FORM_AUTH', token: 't', status: 'SUCCESS' });

function post(): NextRequest {
  return new NextRequest('https://american-creator.tr/api/webhooks/iyzico', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-iyz-signature-v3': 'abc123' },
    body: BODY,
  });
}

beforeEach(() => vi.clearAllMocks());

describe('POST /api/webhooks/iyzico', () => {
  it('relays body, signature and ARM answer', async () => {
    mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));
    const res = await POST(post());
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('OK');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toMatch(/^https:\/\/api\.example\.test\/public\/arm\/webhooks\/iyzico\/.+/);
    expect(init.body).toBe(BODY);
    expect(init.headers['x-iyz-signature-v3']).toBe('abc123');
  });

  it('forwards every x-iyz-* header and warns when none arrived', async () => {
    mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await POST(
      new NextRequest('https://american-creator.tr/api/webhooks/iyzico', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-iyz-signature': 'v1', 'x-iyz-signature-v2': 'v2' },
        body: BODY,
      }),
    );
    expect(mockFetch.mock.calls[0][1].headers).toMatchObject({ 'x-iyz-signature': 'v1', 'x-iyz-signature-v2': 'v2' });
    expect(warn).not.toHaveBeenCalled();
    await POST(
      new NextRequest('https://american-creator.tr/api/webhooks/iyzico', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: BODY,
      }),
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no x-iyz-* header'), expect.stringContaining('content-type'));
    warn.mockRestore();
  });

  it('relays a 400 (bad signature) verbatim and answers 502 when ARM is down', async () => {
    mockFetch.mockResolvedValue(new Response('invalid signature', { status: 400 }));
    expect((await POST(post())).status).toBe(400);
    mockFetch.mockRejectedValue(new TypeError('fetch failed'));
    expect((await POST(post())).status).toBe(502);
  });
});
