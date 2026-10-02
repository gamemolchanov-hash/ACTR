/**
 * Creator Club member checkout (port of ACRU c9b51ab, 02.10.2026): a discounted
 * category line is priced at the member price (list price struck), the summary
 * shows «Creator Club indirimi (−N%)» and the total is subtotal − club discount.
 * The checkout does not compute the figures — the line's member price and
 * `category_discount` come from `POST /cart/validate` (member JWT), the same
 * amount POST /orders takes off. Without it the order charged less than the
 * checkout (and its ÖBF / MSS) showed.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { fmtMoney } from '@/lib/money';

const auth = vi.hoisted(() => ({
  value: {
    customer: null as Record<string, unknown> | null,
    token: null as string | null,
    loading: false,
  },
}));
const apiMock = vi.hoisted(() => ({
  validateCart: vi.fn(),
  validatePromo: vi.fn(),
  fetchShippingRates: vi.fn().mockResolvedValue({ fedex_configured: true, rates: [] }),
  createOrder: vi.fn(),
  createPaymentSession: vi.fn(),
  fetchOrder: vi.fn(),
  fetchCountries: vi.fn(async () => [{ code: 'TR', name: 'Turkey' }]),
}));
const query = vi.hoisted(() => ({ value: new URLSearchParams() }));
const cart = vi.hoisted(() => ({ items: [] as { productId: string; quantity: number }[] }));

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key;
    t.rich = (key: string) => key;
    return t;
  },
  useLocale: () => 'tr',
}));
vi.mock('next/navigation', () => ({ useSearchParams: () => query.value }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ refreshProfile: async () => {}, ...auth.value }),
  useCustomerId: () => (auth.value.customer?.id as string | undefined) ?? null,
}));
vi.mock('@/lib/auth', () => ({
  getMyAddresses: vi.fn().mockResolvedValue({ data: [] }),
  deleteMyAddress: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/providers/CartProvider', () => ({
  useCart: () => ({ items: cart.items, removeItem: vi.fn(), clearCart: vi.fn() }),
}));
vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'TRY',
  useFormatLocale: () => 'tr-TR',
}));
vi.mock('@/lib/api', () => apiMock);
vi.mock('@/lib/prelaunch', () => ({ PRELAUNCH: false }));
vi.mock('@/components/WalletWidget', () => ({ default: () => null }));
vi.mock('@/components/StripeEmbeddedCheckout', () => ({ default: () => null }));

import CheckoutPage from './page';

const money = (n: number) => fmtMoney(n, 'TRY', 'tr-TR');

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  query.value = new URLSearchParams();
  cart.items = [
    { productId: 'canary', quantity: 1 },
    { productId: 'mint', quantity: 1 },
  ];
  auth.value = {
    customer: { id: 'c1', email: 'kk@example.com', name: 'Konstantin' },
    token: 'jwt',
    loading: false,
  };
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

const line = (productId: string, name: string, member?: number) => ({
  productId,
  sku: productId,
  name,
  quantity: 1,
  unitPrice: 950,
  ...(member != null ? { memberPrice: member } : {}),
  lineTotal: 950,
  valid: true,
});

describe('checkout — Creator Club member price', () => {
  it('member lines, «Creator Club indirimi (−3%)» and total 1 843 (AC-TR-000013: 1 900 − 57)', async () => {
    apiMock.validateCart.mockResolvedValue({
      data: {
        items: [line('canary', 'CANARY', 921.5), line('mint', 'MINT', 921.5)],
        subtotal: 1900,
        allValid: true,
        category_discount: 57,
      },
    });
    const { container } = render(<CheckoutPage />);

    const row = await screen.findByTestId('sf-checkout-category-discount');
    expect(row.textContent).toBe('checkout.categoryDiscount:{"pct":3}');
    expect(row.parentElement?.textContent).toContain(`−${money(57)}`);

    // The line is at the member price, the list price is struck next to it.
    const struck = container.querySelector('s');
    expect(struck?.textContent).toBe(money(950));
    await waitFor(() => expect(container.textContent).toContain(money(1843)));
  });

  it('a guest (no category_discount / memberPrice) — as before', async () => {
    auth.value = { customer: null, token: null, loading: false };
    apiMock.validateCart.mockResolvedValue({
      data: {
        items: [line('canary', 'CANARY'), line('mint', 'MINT')],
        subtotal: 1900,
        allValid: true,
        category_discount: 0,
      },
    });
    const { container } = render(<CheckoutPage />);
    await waitFor(() => expect(container.textContent).toContain(money(1900)));
    expect(screen.queryByTestId('sf-checkout-category-discount')).toBeNull();
    expect(container.querySelector('s')).toBeNull();
  });
});
