/**
 * iyzico buyer return (22.09.2026): `/api/payments/iyzico/callback` takes the
 * token iyzico POSTs (form) or a `?token=` GET, hands it server-side to ARM
 * with the storefront key, and answers a 303 chosen by ARM's verdict:
 * paid / pending → success page with `?order=`, declined → checkout
 * `?payment=declined`, unknown / upstream failure → checkout `?payment=error`.
 * The token never reaches the client and a bad token is not forwarded at all.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

process.env.ARM_STOREFRONT_KEY = 'sf-key-test';
process.env.BFF_INTERNAL_URL = 'https://api.example.test';

const { POST, GET } = await import('../callback/route');
const { redirectPathFor, iyzicoReturnErrorKey, isPlausibleToken } = await import('@/lib/iyzico-return');

const TOKEN = '90aecbd9-1e8b-491a-934d-00bc9a6af200';

function armAnswer(data: unknown, status = 200) {
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ data }), { status, headers: { 'content-type': 'application/json' } }),
  );
}

function formPost(body: string, locale?: string): NextRequest {
  return new NextRequest('https://american-creator.tr/api/payments/iyzico/callback', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      ...(locale ? { cookie: `NEXT_LOCALE=${locale}` } : {}),
    },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/payments/iyzico/callback', () => {
  it('forwards the token to ARM with the storefront key and sends a paid buyer to the success page', async () => {
    armAnswer({ status: 'paid', orderId: 'order-1', orderNumber: 'ACTR-1' });
    const res = await POST(formPost(`token=${TOKEN}&locale=tr`, 'tr'));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('https://american-creator.tr/tr/checkout/success?order=order-1');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.example.test/public/arm/storefront/payment/iyzico/callback');
    expect(init.headers['X-Storefront-Key']).toBe('sf-key-test');
    expect(init.headers['X-Tenant-ID']).toBeTruthy();
    expect(JSON.parse(init.body)).toEqual({ token: TOKEN });
  });

  it('sends a declined payment back to the checkout with ?payment=declined (locale from the cookie)', async () => {
    armAnswer({ status: 'failed', orderId: 'order-1', message: 'Kart limiti yetersiz' });
    const res = await POST(formPost(`token=${TOKEN}`, 'en'));
    expect(res.headers.get('location')).toBe('https://american-creator.tr/en/checkout?payment=declined');
  });

  it('treats an ARM 404 / non-JSON / network failure as ?payment=error', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ code: 'not_found' }), { status: 404 }));
    expect((await POST(formPost(`token=${TOKEN}`))).headers.get('location')).toBe('https://american-creator.tr/tr/checkout?payment=error');
    mockFetch.mockRejectedValue(new TypeError('fetch failed'));
    expect((await POST(formPost(`token=${TOKEN}`))).headers.get('location')).toBe('https://american-creator.tr/tr/checkout?payment=error');
  });

  it('does not forward a malformed token', async () => {
    const res = await POST(formPost('token=<script>'));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toContain('payment=error');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('accepts a GET with ?token= (reload of the landing)', async () => {
    armAnswer({ status: 'pending', orderId: 'order-2' });
    const res = await GET(new NextRequest(`https://american-creator.tr/api/payments/iyzico/callback?token=${TOKEN}`));
    expect(res.headers.get('location')).toBe('https://american-creator.tr/tr/checkout/success?order=order-2');
  });
});

describe('iyzico-return helpers', () => {
  it('maps every verdict to a page and every flag to a message key', () => {
    expect(redirectPathFor('already_paid', 'o', 'en')).toBe('/en/checkout/success?order=o');
    expect(redirectPathFor('cancelled_refunded', null, 'tr')).toBe('/tr/checkout/success');
    expect(redirectPathFor('not_found', null, 'tr')).toBe('/tr/checkout?payment=error');
    expect(iyzicoReturnErrorKey('declined')).toBe('checkout.errors.paymentDeclined');
    expect(iyzicoReturnErrorKey('error')).toBe('checkout.errors.paymentReturnError');
    expect(iyzicoReturnErrorKey('nope')).toBeNull();
    expect(isPlausibleToken(TOKEN)).toBe(true);
    expect(isPlausibleToken('a b')).toBe(false);
  });
});
