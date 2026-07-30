/**
 * FBG-469 review — the two `/config` readers and what they promise.
 *
 * `getStorefrontConfig()` serves display settings to every route, so it stays on
 * the 5-minute data cache. `getLoyaltyProgram()` GATES a route, so it must skip
 * that cache: with the shared cached read a switched-off programme stayed
 * reachable (and linked) for up to five minutes, and a launch was delayed by the
 * same window.
 *
 * Neither throws, so both report `available`: a 5xx or a dead BFF is "could not
 * ask", never "the programme is off".
 *
 * (`server-only` is aliased to a stub in vitest.config.ts — Next resolves that
 * specifier itself, so Vitest cannot load this module without it.)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getLoyaltyProgram, getStorefrontConfig } from './storefront-config';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe('getStorefrontConfig — display settings', () => {
  it('marks a successful answer available', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { currency: 'TRY', country: 'TR', locale: 'tr-TR' } }),
    );

    expect(await getStorefrontConfig()).toEqual({
      currency: 'TRY',
      country: 'TR',
      locale: 'tr-TR',
      available: true,
    });
  });

  it('stays on the shared 5-minute data cache (it runs on every route)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { currency: 'TRY' } }));
    await getStorefrontConfig();

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ next: { revalidate: 300 } });
  });

  it('falls back to display defaults and reports unavailable when /config fails', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const cfg = await getStorefrontConfig();
    expect(cfg.available).toBe(false);
    // Display fallbacks still work so the storefront keeps rendering.
    expect(cfg.currency).toBeTruthy();
  });

  it('no longer exposes the loyalty programme (a cached gate value is a footgun)', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { currency: 'TRY', loyalty_program: { program: 'cashback_wallet' } } }),
    );

    expect(await getStorefrontConfig()).not.toHaveProperty('loyaltyProgram');
  });
});

describe('getLoyaltyProgram — launch gate read', () => {
  it('reads the programme with NO data cache, so the gate follows the ARM switch', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { loyalty_program: { program: 'cashback_wallet' } } }),
    );

    expect(await getLoyaltyProgram()).toEqual({ program: 'cashback_wallet', available: true });
    const init = fetchMock.mock.calls[0][1];
    expect(init).toMatchObject({ cache: 'no-store' });
    expect(init).not.toHaveProperty('next');
  });

  it('reports a storefront with no descriptor as available with a null programme', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { currency: 'TRY' } }));

    // A real answer that simply has no programme — callers may close the route.
    expect(await getLoyaltyProgram()).toEqual({ program: null, available: true });
  });

  it.each([
    ['a 500 response', () => fetchMock.mockResolvedValue(jsonResponse({}, false, 500))],
    ['a 404 response', () => fetchMock.mockResolvedValue(jsonResponse({}, false, 404))],
    ['a network failure', () => fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))],
    [
      'an unparseable body',
      () =>
        fetchMock.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error('not json');
          },
        }),
    ],
    ['a non-object body', () => fetchMock.mockResolvedValue(jsonResponse('nope'))],
  ])('marks %s unavailable instead of "no programme"', async (_label, arrange) => {
    arrange();

    expect(await getLoyaltyProgram()).toEqual({ program: null, available: false });
  });
});
