/**
 * FBG-469 review — the account menu is the third Creator Club link site (after
 * the header and the footer), so it obeys the same rule: link only to a
 * CONFIRMED live programme.
 *
 * "Unknown" covers the first render (descriptor still loading) and a failed
 * `/config` — in both cases the entry stays hidden rather than pointing at a
 * route that may redirect away.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

const fetchLoyaltyConfig = vi.hoisted(() => vi.fn());
const routerSpy = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string, params?: Record<string, unknown>) => {
    const full = namespace ? `${namespace}.${key}` : key;
    return params ? `${full} ${JSON.stringify(params)}` : full;
  },
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
  useRouter: () => routerSpy,
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ customer: { id: 'c1', name: 'Ada' }, loading: false, signOut: vi.fn() }),
}));

vi.mock('@/lib/loyalty', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/loyalty')>()),
  fetchLoyaltyConfig,
}));

import AccountPage from './page';

const loyaltyLinks = () =>
  Array.from(document.querySelectorAll('a')).filter(
    (a) => a.getAttribute('href') === '/account/loyalty',
  );

beforeEach(() => {
  fetchLoyaltyConfig.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('AccountPage — Creator Club entry gate', () => {
  it('shows the entry for a confirmed cashback wallet programme', async () => {
    fetchLoyaltyConfig.mockResolvedValue({ program: 'cashback_wallet', tiers: [], walletCap: null });
    render(<AccountPage />);

    await waitFor(() => expect(loyaltyLinks()).toHaveLength(1));
    expect(screen.getByText('account.loyalty')).toBeTruthy();
  });

  it.each([
    ['another programme', () => fetchLoyaltyConfig.mockResolvedValue({ program: 'points_discount', tiers: [], walletCap: null })],
    ['a failed /config request', () => fetchLoyaltyConfig.mockRejectedValue(new Error('BFF down'))],
  ])('hides the entry for %s', async (_label, arrange) => {
    arrange();
    render(<AccountPage />);

    await waitFor(() => expect(fetchLoyaltyConfig).toHaveBeenCalled());
    expect(loyaltyLinks()).toHaveLength(0);
    expect(screen.queryByText('account.loyalty')).toBeNull();
    // The rest of the menu is unaffected.
    expect(screen.getByText('account.myOrders')).toBeTruthy();
  });
});
