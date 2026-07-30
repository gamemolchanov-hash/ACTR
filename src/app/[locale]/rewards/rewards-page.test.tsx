/**
 * FBG-469 — the public Creator Club page.
 *
 * Covers the launch gate (the page must not exist while the storefront runs a
 * program other than cashback_wallet, including when /config is unreadable), the
 * guest vs member views, the config-driven tier cards (any tier count) and the
 * per-tier rules modal.
 *
 * next-intl is mocked to echo `key {params}`, so copy is asserted by key name and
 * interpolated figures prove the numbers come from /config, not from constants.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import type { LoyaltyConfig } from '@/lib/loyalty';

const fetchLoyaltyConfig = vi.hoisted(() => vi.fn());
const routerSpy = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
const authState = vi.hoisted(() => ({
  customer: null as { id: string; name: string } | null,
  loyalty: null as Record<string, unknown> | null,
  loading: false,
}));

// Tier names resolve through `loyalty.tierNames.<code>` when the catalogue has
// the key; `translatedTiers` lets a test switch that on for a given code.
const translatedTiers = vi.hoisted(() => new Set<string>());

vi.mock('next-intl', () => {
  const t = (key: string, params?: Record<string, unknown>) =>
    params ? `${key} ${JSON.stringify(params)}` : key;
  t.has = (key: string) => translatedTiers.has(key);
  return { useTranslations: () => t };
});

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
}));

import RewardsPage from './page';

const ACTIVE: LoyaltyConfig = {
  program: 'cashback_wallet',
  walletCap: 0.4,
  tiers: [
    { code: 'welcome', name: 'Welcome', min_xp: 0, cashback_rate: 0.03 },
    { code: 'silver', name: 'Silver', min_xp: 100, cashback_rate: 0.05 },
    { code: 'gold', name: 'Gold', min_xp: 300, cashback_rate: 0.08 },
  ],
};

function asMember(loyalty: Record<string, unknown> | null) {
  authState.customer = { id: 'c1', name: 'Ada' };
  authState.loyalty = loyalty;
}

beforeEach(() => {
  routerSpy.replace.mockReset();
  fetchLoyaltyConfig.mockReset();
  authState.customer = null;
  authState.loyalty = null;
  authState.loading = false;
});

afterEach(() => {
  cleanup();
  translatedTiers.clear();
});

describe('RewardsPage — launch gate', () => {
  it('redirects home and renders nothing while the programme is dormant', async () => {
    fetchLoyaltyConfig.mockResolvedValue({ program: 'points_discount', tiers: [], walletCap: null });
    const { container } = render(<RewardsPage />);

    await waitFor(() => expect(routerSpy.replace).toHaveBeenCalledWith('/'));
    expect(container.firstChild).toBeNull();
    expect(document.body.textContent).not.toContain('rewards.');
  });

  // A failed request is not a dormant answer: the server layout already proved
  // the programme is live, so the visitor must be able to retry, not be thrown
  // out (FBG-469 review).
  it('offers a retry — and never redirects — when the /config request fails', async () => {
    fetchLoyaltyConfig.mockRejectedValue(new Error('BFF down'));
    render(<RewardsPage />);

    expect(await screen.findByText('loyalty.error')).toBeTruthy();
    expect(screen.getByText('errors.retry')).toBeTruthy();
    expect(routerSpy.replace).not.toHaveBeenCalled();
  });

  it('renders the programme after a successful retry', async () => {
    fetchLoyaltyConfig.mockRejectedValueOnce(new Error('BFF down')).mockResolvedValue(ACTIVE);
    render(<RewardsPage />);

    fireEvent.click(await screen.findByText('errors.retry'));

    expect(await screen.findByText('rewards.tiersTitle')).toBeTruthy();
    expect(screen.queryByText('loyalty.error')).toBeNull();
    expect(routerSpy.replace).not.toHaveBeenCalled();
  });

  it('renders nothing (and does not redirect) while the session is still loading', async () => {
    authState.loading = true;
    fetchLoyaltyConfig.mockResolvedValue(ACTIVE);
    const { container } = render(<RewardsPage />);

    await waitFor(() => expect(fetchLoyaltyConfig).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
    expect(routerSpy.replace).not.toHaveBeenCalled();
  });
});

describe('RewardsPage — guest', () => {
  it('shows the promo wallet card with no figures and a registration CTA', async () => {
    fetchLoyaltyConfig.mockResolvedValue(ACTIVE);
    render(<RewardsPage />);

    expect(await screen.findByText('rewards.guestWalletHint')).toBeTruthy();
    const cta = screen.getByText('rewards.ctaGuest').closest('a');
    expect(cta?.getAttribute('href')).toBe('/login/register');
    expect(document.body.textContent).not.toContain('₺');
    expect(document.body.textContent).not.toContain('rewards.ctaMember');
    expect(routerSpy.replace).not.toHaveBeenCalled();
  });

  it('still lists every configured tier so the programme can be evaluated', async () => {
    fetchLoyaltyConfig.mockResolvedValue(ACTIVE);
    render(<RewardsPage />);

    await screen.findByText('rewards.guestWalletHint');
    for (const name of ['Welcome', 'Silver', 'Gold']) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });
});

describe('RewardsPage — member', () => {
  it('shows the wallet balance, XP, tier and a catalog CTA', async () => {
    fetchLoyaltyConfig.mockResolvedValue(ACTIVE);
    asMember({ wallet_balance: 1250, xp_active: 150, tier_code: 'silver', cashback_rate: 0.05 });
    render(<RewardsPage />);

    await screen.findByText('rewards.programLabel');
    expect(document.body.textContent).toContain('1.250,00');
    expect(document.body.textContent).toContain('150');
    expect(document.body.textContent).toContain('loyalty.cashback {"rate":"5"}');
    const cta = screen.getByText('rewards.ctaMember').closest('a');
    expect(cta?.getAttribute('href')).toBe('/catalog');
    // The member's tier is flagged on the ladder.
    expect(screen.getByText('rewards.youBadge')).toBeTruthy();
  });

  it('renders a member whose Creator Club fields are absent without crashing', async () => {
    fetchLoyaltyConfig.mockResolvedValue(ACTIVE);
    asMember(null);
    render(<RewardsPage />);

    await screen.findByText('rewards.programLabel');
    expect(document.body.textContent).toContain('0,00');
    expect(screen.getByText('rewards.ctaMember')).toBeTruthy();
  });

  // wallet_cap: 0 is a valid server answer — it must read as "spending is off",
  // not as the vague "covers part of the order" line (FBG-469 review).
  it('says wallet spending is off when the server caps it at 0', async () => {
    fetchLoyaltyConfig.mockResolvedValue({
      program: 'cashback_wallet',
      walletCap: 0,
      tiers: [{ code: 'base', name: 'Base', min_xp: 0, cashback_rate: 0.03 }],
    } satisfies LoyaltyConfig);
    asMember({ wallet_balance: 500, xp_active: 0 });
    render(<RewardsPage />);

    await screen.findByText('rewards.tiersTitle');
    expect(screen.getByText('rewards.step3DescNoSpend')).toBeTruthy();
    expect(document.body.textContent).not.toContain('rewards.step3Desc {');
    expect(screen.queryByText('rewards.step3DescNoCap')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Base' }));
    expect(await screen.findByText('rewards.spendWalletNoSpend')).toBeTruthy();
    expect(document.body.textContent).not.toContain('rewards.spendWalletDesc {');
  });

  it('renders the page when the programme has no tiers at all', async () => {
    fetchLoyaltyConfig.mockResolvedValue({ program: 'cashback_wallet', tiers: [], walletCap: null });
    asMember({ wallet_balance: 10, xp_active: 0 });
    render(<RewardsPage />);

    await screen.findByText('rewards.programLabel');
    expect(screen.queryByText('rewards.tiersTitle')).toBeNull();
    // No wallet cap in config → the copy drops the percent instead of inventing one.
    expect(screen.getByText('rewards.step3DescNoCap')).toBeTruthy();
  });
});

describe('RewardsPage — tier cards and rules modal', () => {
  it('builds the cards from /config (4 tiers here) and marks locked ones', async () => {
    fetchLoyaltyConfig.mockResolvedValue({
      program: 'cashback_wallet',
      walletCap: 0.25,
      tiers: [
        { code: 'a', name: 'Alpha', min_xp: 0, cashback_rate: 0.02 },
        { code: 'b', name: 'Beta', min_xp: 100 },
        { code: 'c', name: 'Gamma', min_xp: 200 },
        { code: 'd', name: 'Delta', min_xp: 400 },
      ],
    } satisfies LoyaltyConfig);
    asMember({ wallet_balance: 0, xp_active: 250, tier_code: 'c' });
    render(<RewardsPage />);

    await screen.findByText('rewards.tiersTitle');
    for (const name of ['Alpha', 'Beta', 'Gamma', 'Delta']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    // Delta is still out of reach → shown with the lock marker.
    expect(screen.getByLabelText('rewards.lockedLabel')).toBeTruthy();
    // The advertised cap comes from wallet_cap (0.25), not a hardcoded 40%.
    expect(document.body.textContent).toContain('rewards.step3Desc {"percent":"25"}');
  });

  it('opens the earn/spend rules modal for the clicked tier and closes it again', async () => {
    fetchLoyaltyConfig.mockResolvedValue(ACTIVE);
    asMember({ wallet_balance: 0, xp_active: 0 });
    render(<RewardsPage />);

    await screen.findByText('rewards.tiersTitle');
    expect(screen.queryByText('rewards.earnTitle')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Gold' }));

    expect(await screen.findByText('rewards.earnTitle')).toBeTruthy();
    expect(screen.getByText('rewards.spendTitle')).toBeTruthy();
    // Rules are the clicked tier's own numbers, straight from /config.
    expect(document.body.textContent).toContain('rewards.earnShoppingDesc {"rate":"8"}');
    expect(document.body.textContent).toContain('rewards.earnUnlockDesc {"xp":"300"}');
    expect(document.body.textContent).toContain('rewards.spendWalletDesc {"percent":"40"}');

    fireEvent.click(screen.getByLabelText('rewards.close'));
    await waitFor(() => expect(screen.queryByText('rewards.earnTitle')).toBeNull());
  });

  it('advertises fractional config rates verbatim (0.035 → 3,5%, never 4%)', async () => {
    fetchLoyaltyConfig.mockResolvedValue({
      program: 'cashback_wallet',
      walletCap: 0.325,
      tiers: [{ code: 'base', name: 'Base', min_xp: 0, cashback_rate: 0.035 }],
    } satisfies LoyaltyConfig);
    render(<RewardsPage />);

    await screen.findByText('rewards.tiersTitle');
    expect(document.body.textContent).toContain('loyalty.cashback {"rate":"3,5"}');
    expect(document.body.textContent).toContain('rewards.step3Desc {"percent":"32,5"}');

    fireEvent.click(screen.getByRole('button', { name: 'Base' }));
    expect(await screen.findByText('rewards.earnTitle')).toBeTruthy();
    expect(document.body.textContent).toContain('rewards.earnShoppingDesc {"rate":"3,5"}');
    expect(document.body.textContent).toContain('rewards.spendWalletDesc {"percent":"32,5"}');
  });

  // Tier codes are the only thing the BFF sends — the page must show the
  // localised catalogue name everywhere it prints one (FBG-469 review).
  it('shows localised tier names on the cards, the modal and the wallet card', async () => {
    translatedTiers.add('loyalty.tierNames.silver');
    fetchLoyaltyConfig.mockResolvedValue(ACTIVE);
    asMember({ wallet_balance: 0, xp_active: 150, tier_code: 'silver' });
    render(<RewardsPage />);

    await screen.findByText('rewards.tiersTitle');
    // Card + wallet card both read the catalogue name, never the derived "Silver".
    expect(screen.getAllByText('loyalty.tierNames.silver').length).toBeGreaterThan(1);
    expect(screen.queryByText('Silver')).toBeNull();
    // Untranslated codes still render (a newly configured tier is not blank).
    expect(screen.getAllByText('Welcome').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'loyalty.tierNames.silver' }));
    expect(await screen.findByText('rewards.earnTitle')).toBeTruthy();
  });

  it('tells a visitor the first tier needs no XP (no bogus "0 XP" rule)', async () => {
    fetchLoyaltyConfig.mockResolvedValue(ACTIVE);
    render(<RewardsPage />);

    await screen.findByText('rewards.tiersTitle');
    fireEvent.click(screen.getByRole('button', { name: 'Welcome' }));

    expect(await screen.findByText('rewards.earnUnlockStart')).toBeTruthy();
    expect(document.body.textContent).not.toContain('rewards.earnUnlockDesc');
  });
});
