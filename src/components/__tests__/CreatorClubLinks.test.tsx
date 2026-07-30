/**
 * FBG-469 — chrome links to the public /rewards page are gated on the live
 * loyalty programme.
 *
 * The storefront runs `points_discount` until the owner launches Creator Club,
 * and a visible link to a dormant programme is the bug class FBG-384 was
 * reopened for. The programme comes from `LoyaltyProgramProvider` (an uncached
 * `/config` read — a 5-minute cached value kept advertising a switched-off
 * programme, FBG-469 review), so the header/footer render the link ONLY for
 * `cashback_wallet` — never while it is unknown.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
  usePathname: () => '/',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/providers/CartProvider', () => ({ useCart: () => ({ totalQuantity: 0 }) }));
vi.mock('@/providers/CookieConsentProvider', () => ({
  useConsent: () => ({ openPreferences: vi.fn() }),
}));
vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'TRY',
  useFormatLocale: () => 'tr-TR',
}));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ customer: null, signOut: vi.fn() }) }));
vi.mock('@/lib/api', () => ({ fetchProducts: vi.fn().mockResolvedValue({ data: [] }) }));

// The chrome reads the LIVE programme through the provider (uncached /config),
// not a cached server value — see LoyaltyProgramProvider.
const program = vi.hoisted(() => ({ value: null as string | null }));
vi.mock('@/providers/LoyaltyProgramProvider', () => ({
  useLoyaltyProgram: () => program.value,
}));

import { Header } from '../Header';
import { Footer } from '../Footer';

const rewardsLinks = () =>
  Array.from(document.querySelectorAll('a')).filter((a) => a.getAttribute('href') === '/rewards');

afterEach(() => {
  cleanup();
  program.value = null;
});

describe.each([
  ['Header', () => <Header />],
  ['Footer', () => <Footer />],
])('%s — /rewards link gate', (_name, renderChrome) => {
  it('links to /rewards when the cashback wallet programme is live', () => {
    program.value = 'cashback_wallet';
    render(renderChrome());
    expect(rewardsLinks().length).toBeGreaterThan(0);
    expect(screen.getAllByText('rewards.navLabel').length).toBeGreaterThan(0);
  });

  it('renders no /rewards link for the dormant points_discount programme', () => {
    program.value = 'points_discount';
    render(renderChrome());
    expect(rewardsLinks()).toHaveLength(0);
    expect(screen.queryByText('rewards.navLabel')).toBeNull();
  });

  it('renders no /rewards link while the programme is unknown (loading / failed)', () => {
    program.value = null;
    render(renderChrome());
    expect(rewardsLinks()).toHaveLength(0);
  });
});
