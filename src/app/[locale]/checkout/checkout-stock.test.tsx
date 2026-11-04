/**
 * A basket line without stock on the checkout (04.11.2026, port of ACRU d16418a). The .tr
 * checkout hid such a line from "Your order" (₺0.00 summary when it was the only one) but
 * sent it with the order, and POST /orders answered 400 `insufficient_stock` in English.
 * Now: the line shows with a note, a warning above the button names it with "Remove and
 * continue", "Proceed to Payment" stays disabled, and the basket is checked again right
 * before the order. The page is mounted for real (harness of checkout-usability-audit).
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

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
  fetchShippingRates: vi.fn(),
  createOrder: vi.fn(),
  createPaymentSession: vi.fn(),
  fetchOrder: vi.fn(),
  fetchCountries: vi.fn(async () => [{ code: 'TR', name: 'Turkey' }]),
}));
const assign = vi.hoisted(() => vi.fn());
// One reference for every render — the page's effects on `items` must not loop.
const cart = vi.hoisted(() => ({
  value: {
    items: [
      { productId: 'gel', quantity: 2 },
      { productId: 'coffee', quantity: 1 },
    ],
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key;
    t.rich = (key: string) => key;
    return t;
  },
  useLocale: () => 'tr',
}));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ refreshProfile: async () => {}, ...auth.value }),
}));
vi.mock('@/lib/auth', () => ({
  getMyAddresses: vi.fn().mockResolvedValue({ data: [] }),
  deleteMyAddress: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/providers/CartProvider', () => ({ useCart: () => cart.value }));
vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'TRY',
  useFormatLocale: () => 'tr-TR',
}));
vi.mock('@/lib/api', () => apiMock);
vi.mock('@/lib/prelaunch', () => ({ PRELAUNCH: false }));
vi.mock('@/components/WalletWidget', () => ({ default: () => null }));
vi.mock('@/components/StripeEmbeddedCheckout', () => ({ default: () => null }));

import CheckoutPage from './page';

const STANDARD = { id: 'standard', slug: 'standard', name: 'Standart', carrier: 'DHL', price: 144 };

const DRAFT = {
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'Testov',
  phone: '+905321234567',
  country: 'TR',
  province: 'İstanbul',
  city: 'Kadıköy',
  neighbourhood: 'Caferağa Mah.',
  street: 'Moda Cad.',
  building: '12',
  block: '',
  apartment: '3',
  zip: '34710',
};

const GEL = {
  productId: 'gel',
  sku: 'AC-TR-BG-030',
  name: 'BASE GEL',
  quantity: 2,
  unitPrice: 950,
  lineTotal: 1900,
  available: 120,
  valid: true,
};
const COFFEE_OUT = {
  productId: 'coffee',
  sku: 'AC-TR-CG-087',
  name: 'COFFEE',
  quantity: 1,
  unitPrice: 925,
  lineTotal: 925,
  available: 0,
  valid: false,
  error: 'insufficient_stock',
};
const COFFEE_OK = { ...COFFEE_OUT, available: 9, valid: true, error: null };

const validation = (items: Record<string, unknown>[]) => ({
  data: {
    items,
    subtotal: items.filter((i) => i.valid).reduce((s, i) => s + Number(i.lineTotal), 0),
    allValid: items.every((i) => i.valid),
    category_discount: 0,
  },
});

function seedDraft(step: 1 | 2) {
  sessionStorage.setItem('checkout_form', JSON.stringify(DRAFT));
  sessionStorage.setItem('checkout_step', String(step));
}

const proceedButton = () =>
  screen.getByRole('button', { name: 'checkout.proceedToPayment' }) as HTMLButtonElement;
const radio = (id: string) =>
  document.querySelector(`input[type="radio"][value="${id}"]`) as HTMLInputElement;
const boxLabelled = (fragment: string) =>
  (Array.from(document.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[]).find((el) =>
    (el.closest('label')?.textContent ?? '').includes(fragment),
  );

/** Step 2 with the rate chosen and the KVKK, Mesafeli and (guest) üyelik boxes ticked. */
async function arriveAtStep2() {
  seedDraft(2);
  const view = render(<CheckoutPage />);
  await waitFor(() => expect(boxLabelled('checkout.consent.uyelikPrefix')).toBeDefined());
  fireEvent.click(boxLabelled('checkout.consent.kvkkPrefix')!);
  fireEvent.click(boxLabelled('checkout.consent.mesafeliPrefix')!);
  fireEvent.click(boxLabelled('checkout.consent.uyelikPrefix')!);
  await waitFor(() => expect(radio('standard')).not.toBeNull());
  fireEvent.click(radio('standard'));
  await waitFor(() => expect(radio('standard').checked).toBe(true));
  return view;
}

/** ARM refuses the order after api.ts took the attempt key (as the real createOrder does). */
function createOrderRefused(status: number, data: Record<string, unknown>) {
  apiMock.createOrder.mockImplementationOnce(
    async (payload: unknown, opts?: { attemptKey?: (body: string) => string }) => {
      opts?.attemptKey?.(JSON.stringify(payload));
      throw {
        isAxiosError: true,
        message: `Request failed with status code ${status}`,
        response: { status, data },
      };
    },
  );
}

const ARM_STOCK_REFUSAL = {
  code: 'insufficient_stock',
  error: 'There is not enough stock for one of the products in your cart.',
  productId: 'coffee',
  available: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  auth.value = { customer: null, token: null, loading: false };
  apiMock.fetchShippingRates.mockResolvedValue({ fedex_configured: true, rates: [STANDARD] });
  apiMock.createPaymentSession.mockResolvedValue({ data: { type: 'manual' } });
  Object.defineProperty(window, 'location', {
    value: { origin: 'https://american-creator.tr', href: 'https://american-creator.tr/tr/checkout', assign },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe('checkout — a basket line without stock', () => {
  it('step 1: the warning names the item, the line stays in "Your order" with a note, the button removes it', async () => {
    apiMock.validateCart.mockResolvedValue(validation([GEL, COFFEE_OUT]));
    seedDraft(1);
    render(<CheckoutPage />);

    const alert = await screen.findByTestId('sf-checkout-stock');
    expect(alert.textContent).toContain('checkout.stock.title:{"count":1}');
    expect(screen.getByTestId('sf-checkout-stock-item').textContent).toBe('COFFEE — basket.stock.out');
    expect(alert.textContent).toContain('checkout.stock.hint:{"count":1}');
    // Not hidden from "Your order" any more — shown with "Out of stock".
    expect(screen.getAllByTestId('sf-checkout-item-name').map((n) => n.textContent)).toEqual([
      'BASE GEL',
      'COFFEE',
    ]);
    expect(screen.getByTestId('sf-stock-note').textContent).toBe('basket.stock.out');
    expect(document.body.textContent).not.toContain('insufficient_stock');

    fireEvent.click(screen.getByTestId('sf-checkout-stock-fix'));
    expect(cart.value.removeItem).toHaveBeenCalledWith('coffee');
    expect(cart.value.removeItem).toHaveBeenCalledTimes(1);
    expect(cart.value.updateQuantity).not.toHaveBeenCalled();
  });

  it('step 2: while the line is in the basket "Proceed to Payment" is disabled', async () => {
    apiMock.validateCart.mockResolvedValue(validation([GEL, COFFEE_OUT]));
    await arriveAtStep2();

    await screen.findByTestId('sf-checkout-stock');
    expect(proceedButton().disabled).toBe(true);
    fireEvent.click(proceedButton());
    expect(apiMock.createOrder).not.toHaveBeenCalled();
  });

  it('part in stock — "Only N left in stock", the button shrinks the line to the stock', async () => {
    apiMock.validateCart.mockResolvedValue(validation([GEL, { ...COFFEE_OUT, quantity: 3, available: 2 }]));
    seedDraft(1);
    render(<CheckoutPage />);

    const item = await screen.findByTestId('sf-checkout-stock-item');
    expect(item.textContent).toBe('COFFEE — basket.stock.short:{"count":2}');
    fireEvent.click(screen.getByTestId('sf-checkout-stock-fix'));
    expect(cart.value.updateQuantity).toHaveBeenCalledWith('coffee', 2);
    expect(cart.value.removeItem).not.toHaveBeenCalled();
  });

  it('the basket is checked again before the order: the stock ran out — no order, the warning', async () => {
    apiMock.validateCart
      .mockResolvedValueOnce(validation([GEL, COFFEE_OK]))
      .mockResolvedValue(validation([GEL, COFFEE_OUT]));
    await arriveAtStep2();
    await waitFor(() => expect(proceedButton().disabled).toBe(false));
    expect(screen.queryByTestId('sf-checkout-stock')).toBeNull();

    fireEvent.click(proceedButton());

    await screen.findByTestId('sf-checkout-stock');
    expect(apiMock.createOrder).not.toHaveBeenCalled();
    expect(apiMock.validateCart).toHaveBeenCalledTimes(2);
    expect(proceedButton().disabled).toBe(true);
  });

  it('400 insufficient_stock after the check — the warning with the item, not ARM English; a new attempt next', async () => {
    apiMock.validateCart
      .mockResolvedValueOnce(validation([GEL, COFFEE_OK]))
      .mockResolvedValueOnce(validation([GEL, COFFEE_OK]))
      .mockResolvedValue(validation([GEL, COFFEE_OUT]));
    createOrderRefused(400, ARM_STOCK_REFUSAL);
    await arriveAtStep2();
    await waitFor(() => expect(proceedButton().disabled).toBe(false));

    fireEvent.click(proceedButton());

    await screen.findByTestId('sf-checkout-stock');
    expect(apiMock.createOrder).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toContain('There is not enough stock');
    expect(apiMock.createPaymentSession).not.toHaveBeenCalled();
    // ARM refused the order for its content: the next press is a new order (REL-02).
    expect(sessionStorage.getItem('checkout_order_attempt')).toBeNull();
  });

  it('400 insufficient_stock, but the re-check finds the stock back — localized text, not ARM English', async () => {
    apiMock.validateCart.mockResolvedValue(validation([GEL, COFFEE_OK]));
    createOrderRefused(400, ARM_STOCK_REFUSAL);
    await arriveAtStep2();
    await waitFor(() => expect(proceedButton().disabled).toBe(false));

    fireEvent.click(proceedButton());

    expect(await screen.findByText('checkout.errors.insufficient_stock')).toBeTruthy();
    expect(document.body.textContent).not.toContain('There is not enough stock');
    expect(screen.queryByTestId('sf-checkout-stock')).toBeNull();
  });
});
