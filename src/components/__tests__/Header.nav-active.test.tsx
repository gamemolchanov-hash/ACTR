/**
 * Nav highlight bug: usePathname() (next-intl) never carries the query
 * string, so "Catalog" (/catalog) and "New Arrivals" (/catalog?sort=-date_created)
 * were indistinguishable — Catalog always won the highlight, even on the
 * New Arrivals page. Fixed via an invisible CatalogSortWatcher that reads
 * ?sort= through useSearchParams and feeds it into the nav's isActive check.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const navState = vi.hoisted(() => ({ pathname: '/catalog', search: '' }));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
  usePathname: () => navState.pathname,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navState.search),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/providers/CartProvider', () => ({
  useCart: () => ({ totalQuantity: 0 }),
}));

vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'TRY',
  useFormatLocale: () => 'tr-TR',
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ customer: null, signOut: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  fetchProducts: vi.fn().mockResolvedValue({ data: [] }),
}));

import { Header } from '../Header';

afterEach(() => {
  cleanup();
});

describe('Header — Catalog vs New Arrivals highlight', () => {
  it('on /catalog (no sort): Catalog is marked current, New Arrivals is not', () => {
    navState.pathname = '/catalog';
    navState.search = '';
    render(<Header />);

    expect(screen.getAllByText('nav.catalog')[0].closest('a')?.getAttribute('aria-current')).toBe(
      'page',
    );
    expect(
      screen.getAllByText('nav.new')[0].closest('a')?.getAttribute('aria-current'),
    ).toBeNull();
  });

  it('on /catalog?sort=-date_created: New Arrivals is marked current, Catalog is not', () => {
    navState.pathname = '/catalog';
    navState.search = 'sort=-date_created';
    render(<Header />);

    expect(screen.getAllByText('nav.new')[0].closest('a')?.getAttribute('aria-current')).toBe(
      'page',
    );
    expect(
      screen.getAllByText('nav.catalog')[0].closest('a')?.getAttribute('aria-current'),
    ).toBeNull();
  });

  it('on a catalog subcategory page: Catalog stays current, New Arrivals does not', () => {
    navState.pathname = '/catalog/hoodies';
    navState.search = '';
    render(<Header />);

    expect(screen.getAllByText('nav.catalog')[0].closest('a')?.getAttribute('aria-current')).toBe(
      'page',
    );
    expect(
      screen.getAllByText('nav.new')[0].closest('a')?.getAttribute('aria-current'),
    ).toBeNull();
  });
});
