/**
 * FBG-427 — pre-launch: show "coming soon" instead of the price on the product
 * page (main price + the "recently viewed" mini-cards).
 *
 * While `PRELAUNCH` is on the price is replaced with the `prelaunch.comingSoon`
 * copy, and the per-unit / "KDV Dahil" labels (meaningless without a price) are
 * hidden. When the flag is flipped off at launch everything returns as before.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductDetail } from '../ProductDetail';
import { fetchProduct } from '@/lib/api';
import { fmtMoney } from '@/lib/money';
import type { Product } from '@/lib/api';

// Toggleable mock of the single PRELAUNCH constant (getter keeps ESM live-binding).
const prelaunch = vi.hoisted(() => ({ value: true }));
vi.mock('@/lib/prelaunch', () => ({
  get PRELAUNCH() {
    return prelaunch.value;
  },
}));

const product: Product = {
  id: 'p1',
  name: 'BASE GEL',
  sku: 'SKU-1',
  slug: 'base-gel',
  description: null,
  detail_text: null,
  usage_text: null,
  application_text: null,
  price: 1250,
  wholesale_price: null,
  weight: null,
  volume: null,
  length: null,
  width: null,
  height: null,
  bp_available: 5,
  category: null,
  images: [],
  date_created: '2026-01-01T00:00:00Z',
};

vi.mock('@/lib/api', () => ({ fetchProduct: vi.fn(async () => ({ data: product })) }));

vi.mock('@/providers/CartProvider', () => ({
  useCart: () => ({ addItem: vi.fn() }),
}));

// One "recently viewed" mini-card so its price site is exercised too.
vi.mock('@/lib/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({
    items: [
      {
        id: 'r1',
        slug: 'seen-item',
        categorySlug: null,
        name: 'SEEN ITEM',
        price: 500,
        image: null,
        images: [],
      },
    ],
    addViewed: vi.fn(),
  }),
}));

vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'TRY',
  useFormatLocale: () => 'tr-TR',
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'tr',
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));

function renderProductDetail() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProductDetail productId="p1" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(fetchProduct).mockClear();
});

afterEach(() => {
  cleanup();
});

describe('ProductDetail price — pre-launch gate (FBG-427)', () => {
  it('PRELAUNCH=true: main + recently-viewed prices become "coming soon", labels hidden', async () => {
    prelaunch.value = true;
    const { container } = renderProductDetail();

    await screen.findByText('BASE GEL');
    // Both the main price and the recently-viewed card show the coming-soon copy.
    expect(screen.getAllByText('prelaunch.comingSoon').length).toBeGreaterThanOrEqual(2);
    // No formatted amount, and no per-unit / KDV Dahil labels.
    expect(container.textContent).not.toContain('₺');
    expect(screen.queryByText('price.kdvDahil')).toBeNull();
    expect(screen.queryByText('product.perUnit')).toBeNull();
  });

  it('PRELAUNCH=false: shows formatted prices + per-unit/KDV labels, no "coming soon"', async () => {
    prelaunch.value = false;
    renderProductDetail();

    await screen.findByText('BASE GEL');
    expect(screen.getByText(fmtMoney(1250, 'TRY', 'tr-TR'))).toBeTruthy();
    expect(screen.getByText(fmtMoney(500, 'TRY', 'tr-TR'))).toBeTruthy();
    expect(screen.getByText('price.kdvDahil')).toBeTruthy();
    expect(screen.getByText('product.perUnit')).toBeTruthy();
    expect(screen.queryByText('prelaunch.comingSoon')).toBeNull();
  });
});
