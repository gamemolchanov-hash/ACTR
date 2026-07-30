/**
 * FBG-469 review — the Creator Club launch gate must be enforced on the SERVER.
 *
 * Before this, both routes answered a plain GET with 200 + an empty body and
 * only navigated away after hydration, so bots and JS-less clients kept reaching
 * a page for a programme that has not launched. Both route layouts now redirect
 * from the server, and /rewards is additionally noindex while dormant.
 *
 * `@/lib/storefront-config` is `server-only`, so it is mocked wholesale (the real
 * module cannot be imported outside a React Server Component). `redirect` throws
 * like the real next-intl/Next implementation, proving rendering actually stops.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getStorefrontConfig = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
);

vi.mock('@/lib/storefront-config', () => ({ getStorefrontConfig }));
vi.mock('@/i18n/navigation', () => ({ redirect }));
vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));

import RewardsLayout, { generateMetadata } from './rewards/layout';
import AccountLoyaltyLayout from './account/loyalty/layout';

const params = Promise.resolve({ locale: 'tr' });

function config(loyaltyProgram: string | null) {
  getStorefrontConfig.mockResolvedValue({
    currency: 'TRY',
    country: 'TR',
    locale: 'tr-TR',
    loyaltyProgram,
  });
}

beforeEach(() => {
  redirect.mockClear();
  getStorefrontConfig.mockReset();
});

describe('/rewards — server dormant gate', () => {
  it('redirects to the home page (locale-aware) while the programme is dormant', async () => {
    config('points_discount');
    await expect(RewardsLayout({ children: 'page', params })).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith({ href: '/', locale: 'tr' });
  });

  it('redirects when /config carries no programme at all (BFF blip)', async () => {
    config(null);
    await expect(RewardsLayout({ children: 'page', params })).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith({ href: '/', locale: 'tr' });
  });

  it('renders the page once the cashback wallet programme is live', async () => {
    config('cashback_wallet');
    await expect(RewardsLayout({ children: 'page', params })).resolves.toBe('page');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('marks the route noindex while dormant and indexable once live', async () => {
    config('points_discount');
    expect(await generateMetadata({ params })).toMatchObject({
      robots: { index: false, follow: false },
    });

    config('cashback_wallet');
    expect((await generateMetadata({ params })).robots).toBeUndefined();
  });
});

describe('/account/loyalty — server dormant gate', () => {
  it('redirects to the account page while the programme is dormant', async () => {
    config('points_discount');
    await expect(AccountLoyaltyLayout({ children: 'page', params })).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect(redirect).toHaveBeenCalledWith({ href: '/account', locale: 'tr' });
  });

  it('renders the page once the cashback wallet programme is live', async () => {
    config('cashback_wallet');
    await expect(AccountLoyaltyLayout({ children: 'page', params })).resolves.toBe('page');
    expect(redirect).not.toHaveBeenCalled();
  });
});
