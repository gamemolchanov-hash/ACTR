/**
 * Creator Club landing (port of the ACRU/ACSTORE /rewards page, FBG-501/513).
 *
 * Two layers: the server page (programme live → landing; another programme →
 * 404 backstop; /config unreadable → error + retry, never a 404) and the landing
 * itself (hero → dark wallet card → progress with tier dots → tier cards with
 * the rules modal → member discount → steps → CTA). A guest sees zeros and the
 * first tier active; a member sees their balance, tier and progress.
 *
 * Rendered with the REAL en/tr catalogues and the TRY storefront currency, so
 * the assertions read like the page: figures prove they come from the programme
 * prop (no constants), money comes out of fmtMoney in lira.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import enFlat from '../../../../messages/en.json';
import trFlat from '../../../../messages/tr.json';
import { unflatten } from '@/i18n/request';
import { CurrencyProvider } from '@/providers/CurrencyProvider';
import { parseRewardsProgram, type RewardsProgram } from '@/lib/rewards';

const mocks = vi.hoisted(() => ({
  getLoyaltyProgramPublic: vi.fn(),
  fetchCategories: vi.fn(),
  refreshProfile: vi.fn(),
  routerRefresh: vi.fn(),
  customer: null as { id: string } | null,
  loyalty: null as Record<string, unknown> | null,
  authLoading: false,
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/lib/storefront-config', () => ({
  getLoyaltyProgramPublic: mocks.getLoyaltyProgramPublic,
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: { children?: ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ refresh: mocks.routerRefresh, replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchCategories: mocks.fetchCategories,
}));
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    customer: mocks.customer,
    loyalty: mocks.loyalty,
    loading: mocks.authLoading,
    refreshProfile: mocks.refreshProfile,
  }),
}));

import RewardsPage from './page';
import { RewardsView } from './RewardsView';

/** The live ACTR programme shape (07.10.2026), as the BFF sends it. */
const RAW = {
  program: 'cashback_wallet',
  tiers: [
    { code: 'base', min_xp: 0, cashback_rate: 0.05 },
    { code: 'silver', min_xp: 25000, cashback_rate: 0.15 },
    { code: 'gold', min_xp: 60000, cashback_rate: 0.25 },
  ],
  xp_ttl_days: 90,
  wallet_cap: 0.4,
  window_days: 90,
};
const PROGRAM = parseRewardsProgram(RAW);

const MESSAGES = {
  en: unflatten(enFlat as Record<string, string>),
  tr: unflatten(trFlat as Record<string, string>),
};

function renderView(program: RewardsProgram = PROGRAM, locale: 'en' | 'tr' = 'en') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Europe/Istanbul">
      <CurrencyProvider initialCurrency="TRY" initialFormatLocale="tr-TR">
        <QueryClientProvider client={queryClient}>
          <RewardsView program={program} />
        </QueryClientProvider>
      </CurrencyProvider>
    </NextIntlClientProvider>,
  );
}

/** textContent with non-breaking spaces normalised (Intl output). */
function textOf(el: HTMLElement | Document['body']): string {
  return (el.textContent ?? '').replace(/[  ]/g, ' ');
}

/** The tier the progress dots mark as current (the single `aria-current`). */
function activeTierText(container: HTMLElement): string {
  const nodes = container.querySelectorAll('[aria-current="step"]');
  expect(nodes.length).toBe(1);
  return nodes[0].textContent ?? '';
}

function asMember(loyalty: Record<string, unknown> | null) {
  mocks.customer = { id: 'cust-a' };
  mocks.loyalty = loyalty;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.customer = null;
  mocks.loyalty = null;
  mocks.authLoading = false;
  mocks.notFound.mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
  });
  mocks.getLoyaltyProgramPublic.mockResolvedValue({ program: RAW, available: true });
  mocks.fetchCategories.mockResolvedValue({
    data: [
      { id: 'cat-color-gel', name: 'Color Gel', slug: 'color_gel' },
      { id: 'cat-disguise', name: 'Disguise collection', slug: 'disguise_collection' },
      { id: 'cat-tools', name: 'Tools', slug: 'tools' },
    ],
  });
});

afterEach(cleanup);

describe('/rewards — server page', () => {
  it('renders the landing when the programme is live', async () => {
    const el = await RewardsPage();
    expect(el.type).toBe(RewardsView);
    expect(el.props.program).toEqual(PROGRAM);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it('answers 404 when the storefront confirms another programme (layout redirect backstop)', async () => {
    mocks.getLoyaltyProgramPublic.mockResolvedValue({ program: { program: 'points_discount' }, available: true });
    await expect(RewardsPage()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('answers 404 when the storefront has no programme at all', async () => {
    mocks.getLoyaltyProgramPublic.mockResolvedValue({ program: null, available: true });
    await expect(RewardsPage()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  // A failed read is not a dormant answer: shoppers must get a retry, not a 404
  // or a bounce home (FBG-469 review).
  it('shows an error with a retry — never a 404 — when /config is unreadable', async () => {
    mocks.getLoyaltyProgramPublic.mockResolvedValue({ program: null, available: false });
    const el = await RewardsPage();
    expect(mocks.notFound).not.toHaveBeenCalled();

    render(
      <NextIntlClientProvider locale="en" messages={MESSAGES.en} timeZone="Europe/Istanbul">
        {el}
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(enFlat['loyalty.error'])).toBeTruthy();
    expect(screen.queryByText(enFlat['rewards.subtitle'])).toBeNull();
    fireEvent.click(screen.getByText(enFlat['errors.retry']));
    expect(mocks.routerRefresh).toHaveBeenCalled();
  });
});

describe('RewardsView — composition', () => {
  it('hero and steps are in place; step figures come from the programme', () => {
    renderView();

    expect(screen.getByText('Loyalty programme')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('CREATOR CLUB');
    expect(screen.getByText(enFlat['rewards.subtitle'])).toBeTruthy();

    expect(screen.getByText('01')).toBeTruthy();
    expect(screen.getByText('02')).toBeTruthy();
    expect(screen.getByText('03')).toBeTruthy();
    expect(screen.getByText('Earn XP')).toBeTruthy();
    expect(screen.getByText('Get cashback')).toBeTruthy();
    expect(screen.getByText('Pay with your wallet')).toBeTruthy();
    // 1 XP per lira — the unit is the storefront currency, not a constant.
    expect(textOf(document.body)).toContain('Every ₺1 spent on products in a paid order = 1 XP.');
    // Wallet cap in step 03 comes from the programme.
    expect(textOf(document.body)).toContain('cover up to 40% of an order');
  });

  it('sections follow the ACRU order: hero → wallet → progress → levels → steps → CTA', () => {
    const { container } = renderView();
    const text = textOf(container);
    const order = [
      'Loyalty programme',
      'CREATOR CLUB',
      'Wallet balance',
      'To the Silver level',
      'Your levels',
      'How it works',
      'Earn XP',
      'Join Creator Club',
    ].map((marker) => {
      const at = text.indexOf(marker);
      expect(at, `no "${marker}" in the markup`).toBeGreaterThan(-1);
      return at;
    });
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('tier dots and tier cards carry the configured names, rates and thresholds', () => {
    renderView();

    expect(screen.getAllByText('Base').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Silver').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gold').length).toBeGreaterThan(0);
    // "5% cashback" also sits on the wallet chip (guest on the first tier).
    expect(screen.getAllByText('5% cashback').length).toBe(2);
    expect(screen.getByText('15% cashback')).toBeTruthy();
    expect(screen.getByText('25% cashback')).toBeTruthy();

    const cards = screen.getAllByTestId('sf-rewards-tier-card');
    expect(cards.map((c) => c.getAttribute('data-tier'))).toEqual(['base', 'silver', 'gold']);
    expect(textOf(cards[0])).toContain('0 XP');
    expect(textOf(cards[0])).toContain('5%');
    // Thresholds use the storefront format locale (tr-TR: 25.000).
    expect(textOf(cards[1])).toContain('25.000 XP');
    expect(textOf(cards[1])).toContain('15%');
    expect(textOf(cards[2])).toContain('60.000 XP');
    expect(textOf(cards[2])).toContain('25%');
    // Locked tiers carry the lock marker.
    expect(screen.getAllByLabelText(enFlat['rewards.lockedLabel']).length).toBe(2);
  });

  it('tier modal: programme rules with the figures from the prop', async () => {
    renderView();

    fireEvent.click(screen.getByRole('button', { name: 'More about the Gold level' }));

    await waitFor(() => expect(screen.getByText('How to earn')).toBeTruthy());
    expect(screen.getByText('How to spend')).toBeTruthy();
    expect(textOf(document.body)).toContain('Collect 60.000 XP to reach this level.');
    expect(screen.getByText('25% cashback on every order')).toBeTruthy();
    expect(screen.getByText('1 XP for every ₺1')).toBeTruthy();
    expect(screen.getByText(/XP earned in the last 90 days/)).toBeTruthy();
    expect(screen.getByText(/valid for 90 days after it is earned/)).toBeTruthy();
    expect(screen.getByText('Pay with your wallet — up to 40% of the order total')).toBeTruthy();
    expect(screen.getByText(/If an order is cancelled or returned/)).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Close'));
    await waitFor(() => expect(screen.queryByText('How to earn')).toBeNull());
  });

  it('the first tier needs no XP — no bogus "collect 0 XP" rule', async () => {
    renderView();

    fireEvent.click(screen.getByRole('button', { name: 'More about the Base level' }));
    expect(await screen.findByText(enFlat['rewards.earnUnlockStart'])).toBeTruthy();
    expect(textOf(document.body)).not.toContain('Collect 0 XP');
  });
});

describe('RewardsView — guest', () => {
  it('sees a zero wallet in lira, the first tier active and the join CTA', () => {
    const { container } = renderView();

    expect(screen.getByTestId('sf-rewards-balance').textContent).toBe('₺0,00');
    expect(textOf(screen.getByTestId('sf-rewards-xp'))).toBe('0 XP');
    expect(activeTierText(container)).toContain('Base');
    expect(screen.queryByText(enFlat['rewards.historyLink'])).toBeNull();

    const cta = screen.getByTestId('sf-rewards-cta');
    expect(cta.textContent).toContain('Join Creator Club');
    expect(cta.getAttribute('href')).toBe('/login/register');
    expect(screen.getByText('Sign in').getAttribute('href')).toBe('/login');
    expect(textOf(container)).toContain('Already a member? Sign in to see your balance.');
    expect(textOf(container)).toContain('To the Silver level — 25.000 XP');
  });
});

describe('RewardsView — session still being validated', () => {
  it('shows neither the CTA nor figures until the token is checked', () => {
    mocks.authLoading = true;
    renderView();

    expect(screen.queryByTestId('sf-rewards-cta')).toBeNull();
    expect(screen.queryByText('Sign in')).toBeNull();
    expect(screen.queryByTestId('sf-rewards-balance')).toBeNull();
    // The page frame is still there.
    expect(screen.getByText('Your levels')).toBeTruthy();
  });
});

describe('RewardsView — member', () => {
  it('sees their balance, tier and progress; Silver is active', async () => {
    asMember({
      wallet_balance: 1250.5,
      tier_code: 'silver',
      cashback_rate: 0.15,
      xp_active: 30600,
      xp_expiring_soon: null,
    });
    const { container } = renderView();

    expect(screen.getByTestId('sf-rewards-balance').textContent).toBe('₺1.250,50');
    expect(textOf(screen.getByTestId('sf-rewards-xp'))).toBe('30.600 XP');
    expect(screen.getAllByText('15% cashback').length).toBe(2);
    expect(textOf(container)).toContain('To the Gold level — 29.400 XP');
    expect(activeTierText(container)).toContain('Silver');
    expect(screen.getByText('You')).toBeTruthy();
    expect(screen.getByText(enFlat['rewards.historyLink']).getAttribute('href')).toBe('/account/loyalty');
    // The CTA sends a member shopping, not to registration.
    expect(screen.getByTestId('sf-rewards-cta').textContent).toContain('Go to the catalog');
    expect(screen.queryByText('Sign in')).toBeNull();
  });

  it('re-reads the /me snapshot on entry (a balance spent at checkout must not linger)', () => {
    asMember({ wallet_balance: 10, tier_code: 'base', xp_active: 0 });
    renderView();
    expect(mocks.refreshProfile).toHaveBeenCalled();
  });

  it('a member without Creator Club fields sees the zero card, not a spinner', () => {
    asMember(null);
    renderView();

    expect(screen.getByTestId('sf-rewards-balance').textContent).toBe('₺0,00');
    expect(screen.getByTestId('sf-rewards-cta').textContent).toContain('Go to the catalog');
  });

  it('at the top tier says so instead of a next-level target', () => {
    asMember({ wallet_balance: 0, tier_code: 'gold', cashback_rate: 0.25, xp_active: 70000 });
    renderView();

    expect(screen.getByText(enFlat['loyalty.maxTier'])).toBeTruthy();
    expect(screen.queryByTestId('sf-rewards-progress')).toBeNull();
  });
});

describe('RewardsView — programme edge cases', () => {
  // wallet_cap: 0 is a real answer — spending is off; it must not read as a percent.
  it('says wallet spending is off when the server caps it at 0', async () => {
    renderView(parseRewardsProgram({ ...RAW, wallet_cap: 0 }));

    expect(screen.getByText(enFlat['rewards.step3DescNoSpend'])).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'More about the Base level' }));
    expect(await screen.findByText(enFlat['rewards.spendWalletNoSpend'])).toBeTruthy();
    expect(textOf(document.body)).not.toContain('0% of');
  });

  it('drops the percent when the server sends no wallet cap', () => {
    renderView(parseRewardsProgram({ ...RAW, wallet_cap: undefined }));
    expect(screen.getByText(enFlat['rewards.step3DescNoCap'])).toBeTruthy();
  });

  it('advertises fractional rates verbatim (0.035 → 3,5 in tr-TR format, never 4)', () => {
    renderView(
      parseRewardsProgram({
        ...RAW,
        tiers: [{ code: 'base', min_xp: 0, cashback_rate: 0.035 }],
        wallet_cap: 0.325,
      }),
    );
    expect(screen.getAllByText('3,5% cashback').length).toBeGreaterThan(0);
    expect(textOf(document.body)).toContain('up to 32,5%');
  });

  it('renders any tier count, and an unknown tier code by its derived name', () => {
    renderView(
      parseRewardsProgram({
        ...RAW,
        tiers: [...RAW.tiers, { code: 'platinum', min_xp: 100000, cashback_rate: 0.3 }],
      }),
    );
    const cards = screen.getAllByTestId('sf-rewards-tier-card');
    expect(cards).toHaveLength(4);
    expect(textOf(cards[3])).toContain('Platinum');
    expect(cards[3].querySelector('img')?.getAttribute('src')).toMatch(/^\/images\/rewards\/tier-/);
  });

  it('without XP window/lifetime in the config the modal does not invent days', async () => {
    renderView(parseRewardsProgram({ ...RAW, window_days: undefined, xp_ttl_days: undefined }));
    fireEvent.click(screen.getByRole('button', { name: 'More about the Silver level' }));
    expect(await screen.findByText(enFlat['rewards.ruleXpDescNoTerms'])).toBeTruthy();
    expect(textOf(document.body)).not.toContain('0 days');
  });
});

describe('RewardsView — Turkish', () => {
  it('reads in Turkish with the percent sign first and lira money', () => {
    asMember({ wallet_balance: 640, tier_code: 'silver', cashback_rate: 0.15, xp_active: 30600 });
    const { container } = renderView(PROGRAM, 'tr');

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('CREATOR CLUB');
    expect(screen.getByText('Sadakat programı')).toBeTruthy();
    expect(screen.getByTestId('sf-rewards-balance').textContent).toBe('₺640,00');
    expect(screen.getAllByText('%15 para iadesi').length).toBe(2);
    expect(textOf(container)).toContain('Altın seviyesine 29.400 XP kaldı');
    expect(textOf(container)).toContain('Ödemesi tamamlanan siparişte ürünlere harcanan her ₺1 = 1 XP.');
    expect(screen.getByText('Siz')).toBeTruthy();
    expect(textOf(screen.getAllByTestId('sf-rewards-tier-card')[2])).toContain('%25');
  });
});

// ── Member discount on categories (FBG-600) ──────────────────────────────────

const WITH_CATEGORY_DISCOUNTS = {
  ...RAW,
  category_discounts: {
    category_ids: ['cat-color-gel', 'cat-disguise'],
    rates: { base: 0.03, silver: 0.05, gold: 0.07 },
  },
};

describe('RewardsView — member discount on categories', () => {
  it('shows the tier rates and the category names from the config', async () => {
    const { container } = renderView(parseRewardsProgram(WITH_CATEGORY_DISCOUNTS));

    expect(await screen.findByText('Member discount')).toBeTruthy();
    const block = screen.getByTestId('sf-rewards-category-discount');
    expect(textOf(block)).toContain('−3%');
    expect(textOf(block)).toContain('−5%');
    expect(textOf(block)).toContain('−7%');
    // Names come from the category list, joined by the locale's list format.
    await waitFor(() =>
      expect(textOf(container)).toContain(
        'Products in the Color Gel and Disguise collection categories are available',
      ),
    );
    expect(textOf(container)).not.toContain('Tools');
    expect(screen.getByText(enFlat['rewards.categoryDiscountLink']).getAttribute('href')).toBe('/catalog');
  });

  it('Turkish: list joined with "ve", percent sign first', async () => {
    const { container } = renderView(parseRewardsProgram(WITH_CATEGORY_DISCOUNTS), 'tr');

    await waitFor(() =>
      expect(textOf(container)).toContain('Color Gel ve Disguise collection kategorilerindeki ürünler'),
    );
    expect(textOf(screen.getByTestId('sf-rewards-category-discount'))).toContain('−%7');
  });

  it('a single category links straight to it and reads in the singular', async () => {
    const { container } = renderView(
      parseRewardsProgram({
        ...WITH_CATEGORY_DISCOUNTS,
        category_discounts: { category_ids: ['cat-color-gel'], rates: { base: 0.04, silver: 0.06, gold: 0.09 } },
      }),
    );

    await waitFor(() => expect(textOf(container)).toContain('Products in the Color Gel category are available'));
    expect(textOf(container)).toContain('−4%');
    expect(textOf(container)).toContain('−9%');
    expect(textOf(container)).not.toContain('−3%');
    expect(screen.getByText(enFlat['rewards.categoryDiscountLink']).getAttribute('href')).toBe(
      '/catalog/color_gel',
    );
  });

  it('draws no block (and reads no categories) while the mechanic is off', async () => {
    renderView();

    await waitFor(() => expect(screen.getByText('Your levels')).toBeTruthy());
    expect(screen.queryByText('Member discount')).toBeNull();
    expect(mocks.fetchCategories).not.toHaveBeenCalled();
  });

  it('keeps the rates without names when the category list is unavailable', async () => {
    mocks.fetchCategories.mockRejectedValue(new Error('bff down'));
    const { container } = renderView(parseRewardsProgram(WITH_CATEGORY_DISCOUNTS));

    expect(await screen.findByText('Member discount')).toBeTruthy();
    await waitFor(() => expect(mocks.fetchCategories).toHaveBeenCalled());
    expect(textOf(container)).toContain('−7%');
    expect(textOf(container)).toContain(enFlat['rewards.categoryDiscountTextGeneric']);
    expect(textOf(container)).not.toContain('Color Gel');
  });
});
