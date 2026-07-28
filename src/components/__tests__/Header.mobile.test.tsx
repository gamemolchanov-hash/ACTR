/**
 * FBG-429 — mobile header: language switcher replaces Sign Out; Sign Out lives
 * in the burger Drawer; the Orders menu item is translated (no hardcoded English).
 *
 * next-intl is mocked to echo the key, so copy is asserted by key name — an
 * `account.myOrders` in the Drawer (never the literal "Orders") proves the
 * hardcode is gone. The temporary Drawer only mounts its content while open, so
 * the desktop row is the only Sign Out present until the burger is tapped.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

// Toggleable auth + spies, shared across the mocked hooks.
const authState = vi.hoisted(() => ({
  customer: null as { name?: string } | null,
  signOut: vi.fn(),
}));
const routerSpy = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
// FBG-395: locale switching now uses the raw Next router (so next-intl's client
// cookie sync never writes NEXT_LOCALE behind the consent gate).
const nextRouterSpy = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
  usePathname: () => '/',
  useRouter: () => routerSpy,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => nextRouterSpy,
}));

vi.mock('@/providers/CartProvider', () => ({
  useCart: () => ({ totalQuantity: 0 }),
}));

vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'TRY',
  useFormatLocale: () => 'tr-TR',
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => authState,
}));

vi.mock('@/lib/api', () => ({
  fetchProducts: vi.fn().mockResolvedValue({ data: [] }),
}));

import { Header } from '../Header';
import { buildConsentRecord, writeStoredConsent, CONSENT_STORAGE_KEY } from '@/lib/consent';

function openDrawer() {
  const icon = document.querySelector('[data-testid="MenuIcon"]');
  fireEvent.click(icon!.closest('button')!);
}

beforeEach(() => {
  authState.customer = null;
  authState.signOut.mockClear();
  routerSpy.replace.mockClear();
  routerSpy.push.mockClear();
  nextRouterSpy.replace.mockClear();
  nextRouterSpy.push.mockClear();
  document.cookie = 'NEXT_LOCALE=; max-age=0; path=/';
  localStorage.removeItem(CONSENT_STORAGE_KEY);
});

afterEach(() => {
  cleanup();
});

describe('Header — mobile language switcher & Drawer sign out (FBG-429)', () => {
  it('logged in: header shows a language switcher and no longer a mobile Sign Out', () => {
    authState.customer = { name: 'Alice Wonderland' };
    render(<Header />);

    // Mobile row adds a second EN/TR switcher next to the desktop one.
    expect(screen.getAllByText('lang.en').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('lang.tr').length).toBeGreaterThanOrEqual(2);

    // Only the (untouched) desktop row keeps a Sign Out; the mobile one is gone.
    expect(screen.getAllByText('common.signOut')).toHaveLength(1);
  });

  it('with functional consent: tapping a language button persists NEXT_LOCALE and switches locale', () => {
    // NEXT_LOCALE is a functional cookie (FBG-395) → only persisted with İşlevsel consent.
    writeStoredConsent(
      buildConsentRecord('custom', { functional: true, analytics: false, marketing: false }),
    );
    render(<Header />);

    fireEvent.click(screen.getAllByText('lang.tr')[0]);

    expect(document.cookie).toContain('NEXT_LOCALE=tr');
    // Raw-router navigation to the locale-prefixed URL (bypasses next-intl cookie sync).
    expect(nextRouterSpy.replace).toHaveBeenCalledWith('/tr');
  });

  it('without functional consent: switching language navigates but does NOT write NEXT_LOCALE', () => {
    render(<Header />);

    fireEvent.click(screen.getAllByText('lang.tr')[0]);

    expect(document.cookie).not.toContain('NEXT_LOCALE=');
    expect(nextRouterSpy.replace).toHaveBeenCalledWith('/tr');
  });

  it('logged in: Drawer shows the translated Orders item and a working Sign Out', () => {
    authState.customer = { name: 'Alice' };
    render(<Header />);
    openDrawer();

    // i18n: translated key present, hardcoded English gone.
    expect(screen.getByText('account.myOrders')).toBeTruthy();
    expect(screen.queryByText('Orders')).toBeNull();

    // Drawer adds a Sign Out (desktop + drawer = 2 while open).
    const signOuts = screen.getAllByText('common.signOut');
    expect(signOuts).toHaveLength(2);

    // The Drawer one (portaled last) triggers logout.
    fireEvent.click(signOuts[1]);
    expect(authState.signOut).toHaveBeenCalledTimes(1);
  });

  it('mobile logo is compacted so the xs row fits 320px; desktop logo untouched', () => {
    render(<Header />);
    const logos = screen.getAllByAltText('American Creator');

    // Mobile mark (width:auto) must stay small — regressing this re-clips cart/burger.
    const mobileLogo = logos.find((el) => (el as HTMLElement).style.width === 'auto');
    expect(mobileLogo).toBeTruthy();
    expect((mobileLogo as HTMLElement).style.height).toBe('24px');

    // Desktop logo (sm+) is not part of this change.
    const desktopLogo = logos.find((el) => (el as HTMLElement).style.width === '240px');
    expect(desktopLogo).toBeTruthy();
    expect((desktopLogo as HTMLElement).style.height).toBe('57px');
  });

  it('logged out: no Sign Out and no Orders anywhere, Sign In is offered', () => {
    render(<Header />);
    openDrawer();

    expect(screen.queryByText('common.signOut')).toBeNull();
    expect(screen.queryByText('account.myOrders')).toBeNull();
    expect(screen.getAllByText('common.signIn').length).toBeGreaterThanOrEqual(1);
  });
});
