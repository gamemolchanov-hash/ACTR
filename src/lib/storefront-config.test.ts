/**
 * FBG-469 review — `getStorefrontConfig()` never throws, so it must say whether
 * what it returned is a storefront answer or a local fallback.
 *
 * Display defaults (TRY / null country) are harmless, but the Creator Club route
 * gates read `loyaltyProgram` from here: treating a 5xx or a dead BFF as "no
 * programme" would redirect shoppers away from a live page. `available` keeps
 * "confirmed dormant" and "could not ask" apart.
 *
 * (`server-only` is aliased to a stub in vitest.config.ts — Next resolves that
 * specifier itself, so Vitest cannot load this module without it.)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getStorefrontConfig } from './storefront-config';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe('getStorefrontConfig — available flag', () => {
  it('marks a successful answer available and reads the loyalty programme', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: {
          currency: 'TRY',
          country: 'TR',
          locale: 'tr-TR',
          loyalty_program: { program: 'cashback_wallet' },
        },
      }),
    );

    expect(await getStorefrontConfig()).toEqual({
      currency: 'TRY',
      country: 'TR',
      locale: 'tr-TR',
      loyaltyProgram: 'cashback_wallet',
      available: true,
    });
  });

  it('reports a storefront with no loyalty descriptor as available with a null programme', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { currency: 'TRY' } }));

    const cfg = await getStorefrontConfig();
    // A real answer that simply has no programme — callers may close the route.
    expect(cfg.available).toBe(true);
    expect(cfg.loyaltyProgram).toBeNull();
  });

  it.each([
    ['a 500 response', () => fetchMock.mockResolvedValue(jsonResponse({}, false, 500))],
    ['a 404 response', () => fetchMock.mockResolvedValue(jsonResponse({}, false, 404))],
    ['a network failure', () => fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))],
    ['an unparseable body', () =>
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('not json');
        },
      })],
    ['a non-object body', () => fetchMock.mockResolvedValue(jsonResponse('nope'))],
  ])('marks %s unavailable instead of "no programme"', async (_label, arrange) => {
    arrange();

    const cfg = await getStorefrontConfig();
    expect(cfg.available).toBe(false);
    expect(cfg.loyaltyProgram).toBeNull();
    // Display fallbacks still work so the storefront keeps rendering.
    expect(cfg.currency).toBeTruthy();
  });
});
