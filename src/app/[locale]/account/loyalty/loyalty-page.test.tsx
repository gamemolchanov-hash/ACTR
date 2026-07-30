/**
 * FBG-469 review — /account/loyalty must survive a failed `/config`.
 *
 * The descriptor request used to leave `program` at null on error, which the
 * render gate read as "not cashback_wallet" and blanked the page for ever, with
 * no way to retry. A failure is now an explicit state: the wallet figures from
 * `/me` still render, the tier ladder is replaced by a retry, and a *successful*
 * dormant answer still redirects to /account.
 *
 * next-intl is mocked to echo `namespace.key`, so copy is asserted by key name.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import type { LoyaltyConfig } from '@/lib/loyalty';

const fetchLoyaltyConfig = vi.hoisted(() => vi.fn());
const fetchLoyaltyLedger = vi.hoisted(() => vi.fn());
const routerSpy = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
const authState = vi.hoisted(() => ({
  customer: { id: 'c1', name: 'Ada' } as { id: string; name: string } | null,
  loyalty: null as Record<string, unknown> | null,
  loading: false,
}));

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

vi.mock('@/lib/auth-context', () => ({ useAuth: () => authState }));

vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'TRY',
  useFormatLocale: () => 'tr-TR',
}));

vi.mock('@/lib/loyalty', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/loyalty')>()),
  fetchLoyaltyConfig,
  fetchLoyaltyLedger,
}));

import LoyaltyPage from './page';

const ACTIVE: LoyaltyConfig = {
  program: 'cashback_wallet',
  walletCap: 0.4,
  tiers: [
    { code: 'welcome', name: 'Welcome', min_xp: 0, cashback_rate: 0.03 },
    { code: 'silver', name: 'Silver', min_xp: 100, cashback_rate: 0.05 },
  ],
};

beforeEach(() => {
  routerSpy.replace.mockReset();
  fetchLoyaltyConfig.mockReset();
  fetchLoyaltyLedger.mockReset().mockResolvedValue({ entries: [], totalPages: 1 });
  authState.customer = { id: 'c1', name: 'Ada' };
  authState.loyalty = { wallet_balance: 1250, xp_active: 150, tier_code: 'silver' };
  authState.loading = false;
});

afterEach(() => {
  cleanup();
});

describe('LoyaltyPage — /config failure', () => {
  it('keeps the page usable with a retry instead of blanking it', async () => {
    fetchLoyaltyConfig.mockRejectedValue(new Error('BFF down'));
    render(<LoyaltyPage />);

    // Wallet figures come from /me, so they survive a config outage.
    expect(await screen.findByText('loyalty.error')).toBeTruthy();
    expect(document.body.textContent).toContain('1.250,00');
    expect(screen.getByText('errors.retry')).toBeTruthy();
    expect(routerSpy.replace).not.toHaveBeenCalled();
    // The ledger below is a separate request and still renders its own state.
    expect(screen.getByText('loyalty.historyTitle')).toBeTruthy();
  });

  it('loads the tier ladder after a successful retry', async () => {
    fetchLoyaltyConfig.mockRejectedValueOnce(new Error('BFF down')).mockResolvedValue(ACTIVE);
    render(<LoyaltyPage />);

    fireEvent.click(await screen.findByText('errors.retry'));

    // The segmented ladder replaces the retry panel once the descriptor lands.
    expect(await screen.findByRole('progressbar')).toBeTruthy();
    expect(screen.getByText('Welcome')).toBeTruthy();
    expect(screen.queryByText('loyalty.error')).toBeNull();
  });
});

describe('LoyaltyPage — launch gate backstop', () => {
  it('redirects to /account when /config reports another programme', async () => {
    fetchLoyaltyConfig.mockResolvedValue({
      program: 'points_discount',
      tiers: [],
      walletCap: null,
    } satisfies LoyaltyConfig);
    const { container } = render(<LoyaltyPage />);

    await waitFor(() => expect(routerSpy.replace).toHaveBeenCalledWith('/account'));
    expect(container.firstChild).toBeNull();
  });

  it('renders the ladder for the live cashback programme', async () => {
    fetchLoyaltyConfig.mockResolvedValue(ACTIVE);
    render(<LoyaltyPage />);

    expect(await screen.findByText('Welcome')).toBeTruthy();
    expect(screen.queryByText('loyalty.error')).toBeNull();
    expect(routerSpy.replace).not.toHaveBeenCalled();
  });
});
