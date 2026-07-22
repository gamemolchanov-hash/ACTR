/**
 * FBG-427 — pre-launch: show "coming soon" instead of the price on catalog cards.
 *
 * While `PRELAUNCH` is on the card must render the `prelaunch.comingSoon` copy
 * (never a formatted amount) and hide the now-meaningless "KDV Dahil" line.
 * When the flag is flipped off at launch the price and KDV label return exactly
 * as before. Both branches are covered here.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ProductCard } from '../ProductCard';
import { fmtMoney } from '@/lib/money';
import type { Product } from '@/lib/api';

// Toggleable mock of the single PRELAUNCH constant. A getter keeps the ESM
// live-binding honest so the component reads the current value at render time.
const prelaunch = vi.hoisted(() => ({ value: true }));
vi.mock('@/lib/prelaunch', () => ({
  get PRELAUNCH() {
    return prelaunch.value;
  },
}));

// next-intl in tests returns the key itself (copy is asserted via key names).
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'TRY',
  useFormatLocale: () => 'tr-TR',
}));

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Test Product',
    sku: 'SKU-1',
    slug: 'test-product',
    description: null,
    price: 1000,
    wholesale_price: null,
    weight: null,
    volume: null,
    length: null,
    width: null,
    height: null,
    bp_available: 5,
    category: null,
    images: [{ id: 'img1', file_path: 'demo/photo.webp', sort: 0 }],
    date_created: '2026-01-01T00:00:00Z',
  };
}

afterEach(() => {
  cleanup();
});

describe('ProductCard price — pre-launch gate (FBG-427)', () => {
  it('PRELAUNCH=true: shows "coming soon", hides the price and KDV Dahil line', () => {
    prelaunch.value = true;
    const { container } = render(<ProductCard product={makeProduct()} />);

    expect(screen.getByText('prelaunch.comingSoon')).toBeTruthy();
    // No formatted amount anywhere (no ₺ symbol) and no KDV Dahil label.
    expect(container.textContent).not.toContain('₺');
    expect(screen.queryByText('price.kdvDahil')).toBeNull();
  });

  it('PRELAUNCH=false: shows the formatted price and KDV Dahil, no "coming soon"', () => {
    prelaunch.value = false;
    render(<ProductCard product={makeProduct()} />);

    expect(screen.getByText(fmtMoney(1000, 'TRY', 'tr-TR'))).toBeTruthy();
    expect(screen.getByText('price.kdvDahil')).toBeTruthy();
    expect(screen.queryByText('prelaunch.comingSoon')).toBeNull();
  });
});
