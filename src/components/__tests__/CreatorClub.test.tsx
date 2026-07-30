/**
 * FBG-469 — the shared Creator Club visuals.
 *
 * The dark wallet card must show real figures to a member and NO figures to a
 * guest (a signed-out visitor on the public /rewards page), and the segmented
 * tier bar must be built from whatever tier array `/config` returns — two tiers
 * or four, with no hardcoded ladder.
 *
 * next-intl is mocked to echo `key {params}`, so copy is asserted by key name.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { LoyaltyTier } from '@/lib/loyalty';

// Tier names resolve through `loyalty.tierNames.<code>` when the catalogue has
// the key; `translatedTiers` lets a test switch that on for a given code.
const translatedTiers = vi.hoisted(() => new Set<string>());

vi.mock('next-intl', () => {
  const t = (key: string, params?: Record<string, unknown>) =>
    params ? `${key} ${JSON.stringify(params)}` : key;
  t.has = (key: string) => translatedTiers.has(key);
  return { useTranslations: () => t };
});

vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'TRY',
  useFormatLocale: () => 'tr-TR',
}));

import { CreatorTierBar, CreatorWalletCard } from '../CreatorClub';

const TIERS: LoyaltyTier[] = [
  { code: 'welcome', name: 'Welcome', min_xp: 0, cashback_rate: 0.03 },
  { code: 'silver', name: 'Silver', min_xp: 100, cashback_rate: 0.05 },
  { code: 'gold', name: 'Gold', min_xp: 300, cashback_rate: 0.08 },
];

afterEach(() => {
  cleanup();
  translatedTiers.clear();
});

// The BFF sends no display name, only a code — a TR shopper must not read
// "Silver"/"Gold" derived from it (FBG-469 review).
describe('tier names are localised', () => {
  it('renders the catalogue name for a configured tier code', () => {
    translatedTiers.add('loyalty.tierNames.silver').add('loyalty.tierNames.gold');
    render(<CreatorTierBar tiers={TIERS} xpActive={150} tierCode="silver" />);

    expect(screen.getByText('loyalty.tierNames.silver')).toBeTruthy();
    expect(screen.queryByText('Silver')).toBeNull();
    // ...including inside the interpolated "next tier" caption.
    expect(document.body.textContent).toContain('"tier":"loyalty.tierNames.gold"');
  });

  it('falls back to the derived label for a tier code the catalogue does not know', () => {
    translatedTiers.add('loyalty.tierNames.silver');
    render(<CreatorTierBar tiers={TIERS} xpActive={0} />);

    // 'welcome' has no key here → the /config-derived label still renders.
    expect(screen.getByText('Welcome')).toBeTruthy();
    expect(screen.getByText('loyalty.tierNames.silver')).toBeTruthy();
  });
});

describe('CreatorWalletCard', () => {
  it('shows the balance, active XP, tier and cashback badge for a member', () => {
    render(
      <CreatorWalletCard balance={1250} xpActive={480} tierName="Silver" cashbackPct={5} />,
    );

    expect(document.body.textContent).toContain('1.250,00');
    expect(document.body.textContent).toContain('480');
    expect(screen.getByText('Silver')).toBeTruthy();
    expect(document.body.textContent).toContain('loyalty.cashback {"rate":"5"}');
  });

  it('shows a fractional cashback rate verbatim, in the storefront number format', () => {
    // 3.5% must not be advertised as 4% (FBG-469 review); tr-TR uses a comma.
    render(<CreatorWalletCard balance={0} xpActive={0} tierName="Silver" cashbackPct={3.5} />);
    expect(document.body.textContent).toContain('loyalty.cashback {"rate":"3,5"}');
  });

  it('shows a promo line and no figures for a guest (balance === null)', () => {
    render(<CreatorWalletCard balance={null} xpActive={null} />);

    expect(screen.getByText('rewards.guestWalletHint')).toBeTruthy();
    expect(screen.queryByText('loyalty.xpActiveLabel')).toBeNull();
    // No money and no tier row for a visitor who has no account yet.
    expect(document.body.textContent).not.toContain('₺');
    expect(document.body.textContent).not.toContain('loyalty.tierLabel');
  });

  it('renders the expiring-XP badge only when XP is actually lapsing', () => {
    const { rerender } = render(
      <CreatorWalletCard balance={0} xpActive={0} expiring={{ xp: 120, days: 14 }} />,
    );
    expect(document.body.textContent).toContain('loyalty.expiringBadge {"xp":"120","days":14}');

    rerender(<CreatorWalletCard balance={0} xpActive={0} expiring={null} />);
    expect(document.body.textContent).not.toContain('loyalty.expiringBadge');
  });

  it('survives a profile with no tier/cashback (non-cashback storefront fields absent)', () => {
    render(<CreatorWalletCard balance={0} xpActive={0} />);
    expect(document.body.textContent).toContain('loyalty.walletLabel');
    expect(document.body.textContent).not.toContain('loyalty.tierLabel');
  });
});

describe('CreatorTierBar', () => {
  it('renders one segment per configured tier with the member progress caption', () => {
    render(<CreatorTierBar tiers={TIERS} xpActive={150} tierCode="silver" />);

    for (const name of ['Welcome', 'Silver', 'Gold']) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    // 150 XP → welcome full, silver a quarter, gold empty → (100+25+0)/3 ≈ 42.
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('42');
    expect(document.body.textContent).toContain('loyalty.nextTier {"xp":"150","tier":"Gold"}');
  });

  it('says "top tier" instead of a next-tier hint at the top of the ladder', () => {
    render(<CreatorTierBar tiers={TIERS} xpActive={900} />);
    expect(document.body.textContent).toContain('loyalty.maxTier');
    expect(document.body.textContent).not.toContain('loyalty.nextTier');
  });

  it('renders an empty preview with no progress caption for a guest', () => {
    render(<CreatorTierBar tiers={TIERS} xpActive={null} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
    expect(document.body.textContent).not.toContain('loyalty.nextTier');
    expect(document.body.textContent).not.toContain('loyalty.maxTier');
  });

  // Acceptance criterion 3 — the same component must serve any configured ladder.
  it('renders a 2-tier programme', () => {
    const two: LoyaltyTier[] = [
      { code: 'base', name: 'Base', min_xp: 0 },
      { code: 'pro', name: 'Pro', min_xp: 50, cashback_rate: 0.1 },
    ];
    render(<CreatorTierBar tiers={two} xpActive={25} />);
    expect(screen.getByText('Base')).toBeTruthy();
    expect(screen.getByText('Pro')).toBeTruthy();
    expect(screen.queryByText('Gold')).toBeNull();
    expect(document.body.textContent).toContain('loyalty.cashback {"rate":"10"}');
  });

  it('renders a 4-tier programme', () => {
    const four: LoyaltyTier[] = [
      { code: 'a', name: 'Alpha', min_xp: 0 },
      { code: 'b', name: 'Beta', min_xp: 100 },
      { code: 'c', name: 'Gamma', min_xp: 200 },
      { code: 'd', name: 'Delta', min_xp: 400 },
    ];
    render(<CreatorTierBar tiers={four} xpActive={300} />);
    for (const name of ['Alpha', 'Beta', 'Gamma', 'Delta']) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    // (100 + 100 + 50 + 0) / 4 = 62.5 → 63.
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('63');
  });

  it('renders nothing when the programme has no usable tiers', () => {
    const { container } = render(<CreatorTierBar tiers={[]} xpActive={0} />);
    expect(container.firstChild).toBeNull();
  });
});
