/**
 * Usability audit of the sister storefront american-creator.store, 03.11.2026 — the
 * three checkout findings fixed there, ported here and mounted for real (same harness
 * as checkout-guest-account.test.tsx):
 *
 *  - REL-01: the delivery rate follows the basket — a line removed or a quantity
 *    changed while the shopper is on the delivery step asks for the rate again
 *    (the warehouse prices the parcel), keeping the service the shopper chose;
 *  - REL-02: a lost answer to POST /orders (timeout, dropped connection, a gateway
 *    page, a 2xx without the order) is explained, never shown as "Network Error",
 *    and the next press repeats the same attempt key — and the same body, legal
 *    snapshot included — so ARM returns the first order instead of a second one;
 *  - UX-02: every field is named by its caption and carries its autofill token;
 *    the remove button of a summary line and the basket buttons have names.
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
const cart = vi.hoisted(() => ({ items: [] as { productId: string; quantity: number }[] }));

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key;
    // Rich messages render as their key (tag renderers are not called).
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
vi.mock('@/providers/CartProvider', () => ({
  useCart: () => ({
    items: cart.items,
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
  }),
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
import BasketPage from '../basket/page';

const STANDARD = { id: 'standard', slug: 'standard', name: 'Standart', carrier: 'DHL', price: 144 };
const EXPRESS = { id: 'express', slug: 'express', name: 'Ekspres', carrier: 'DHL', price: 240 };

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

/** Step 2 with the rates in and the KVKK, Mesafeli and (guest) üyelik boxes ticked. */
async function arriveAtStep2() {
  const view = render(<CheckoutPage />);
  await waitFor(() => expect(boxLabelled('checkout.consent.uyelikPrefix')).toBeDefined());
  fireEvent.click(boxLabelled('checkout.consent.kvkkPrefix')!);
  fireEvent.click(boxLabelled('checkout.consent.mesafeliPrefix')!);
  fireEvent.click(boxLabelled('checkout.consent.uyelikPrefix')!);
  await waitFor(() => expect(apiMock.fetchShippingRates).toHaveBeenCalled());
  await waitFor(() => expect(radio('standard')).not.toBeNull());
  return view;
}

/** What api.ts does with the option: the key of the JSON body it sends. */
const sentKeys: string[] = [];
function createOrderAs(...outcomes: Array<() => unknown>) {
  for (const outcome of outcomes) {
    apiMock.createOrder.mockImplementationOnce(
      async (payload: unknown, opts?: { attemptKey?: (body: string) => string }) => {
        sentKeys.push(opts?.attemptKey?.(JSON.stringify(payload)) ?? '');
        return outcome();
      },
    );
  }
}
const lostAnswer = (message: string) => () => {
  throw { isAxiosError: true, message };
};
const armRefused = (status: number, data: Record<string, unknown>) => () => {
  throw { isAxiosError: true, message: `Request failed with status code ${status}`, response: { status, data } };
};
const booked = () => ({ data: { id: 'ord-1', number: 'N-1', total: 2044, currency: 'TRY' } });
/** Let the clock move between two presses, as it does for a shopper. */
const aMomentLater = () => new Promise((resolve) => setTimeout(resolve, 15));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  sentKeys.length = 0;
  cart.items = [{ productId: 'dp1', quantity: 2 }];
  auth.value = { customer: null, token: null, loading: false };
  apiMock.validateCart.mockResolvedValue({
    data: {
      items: [
        { productId: 'dp1', sku: 'AC-TR-CAN-015', name: 'CANARY', quantity: 2, unitPrice: 950, lineTotal: 1900, valid: true },
      ],
      subtotal: 1900,
      allValid: true,
    },
  });
  apiMock.fetchShippingRates.mockResolvedValue({ fedex_configured: true, rates: [STANDARD, EXPRESS] });
  apiMock.createPaymentSession.mockResolvedValue({ data: { type: 'manual' } });
  Object.defineProperty(window, 'location', {
    // `href`: the iyzico-return effect parses it on every mount.
    value: { origin: 'https://american-creator.tr', href: 'https://american-creator.tr/tr/checkout', assign },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe('REL-01 — the delivery rate follows the basket', () => {
  it('asks again when the basket changes on the delivery step and keeps the chosen service', async () => {
    seedDraft(2);
    const view = await arriveAtStep2();
    fireEvent.click(radio('express'));
    await waitFor(() => expect(radio('express').checked).toBe(true));

    // Another tab (or the bin of the summary) changes the basket: 2 → 3 units.
    cart.items = [{ productId: 'dp1', quantity: 3 }];
    apiMock.fetchShippingRates.mockResolvedValue({
      fedex_configured: true,
      rates: [{ ...STANDARD, price: 180 }, { ...EXPRESS, price: 300 }],
    });
    view.rerender(<CheckoutPage />);

    await waitFor(() => expect(apiMock.fetchShippingRates).toHaveBeenCalledTimes(2));
    expect(apiMock.fetchShippingRates.mock.calls[1][0].items).toEqual([{ productId: 'dp1', quantity: 3 }]);
    await waitFor(() => expect(radio('express').checked).toBe(true));

    // The order goes out at the rate quoted for THIS basket, not the previous one.
    createOrderAs(booked);
    fireEvent.click(proceedButton());
    await waitFor(() => expect(apiMock.createOrder).toHaveBeenCalledTimes(1));
    const shipping = apiMock.createOrder.mock.calls[0][0].shipping;
    expect(shipping.method).toBe('express');
    expect(shipping.cost).toBe(300);
  });

  it('does not ask again for the same basket re-rendered', async () => {
    seedDraft(2);
    const view = await arriveAtStep2();
    cart.items = [{ productId: 'dp1', quantity: 2 }]; // a new array, the same basket
    view.rerender(<CheckoutPage />);
    await new Promise((r) => setTimeout(r, 50));
    expect(apiMock.fetchShippingRates).toHaveBeenCalledTimes(1);
  });
});

describe('REL-02 — a lost answer to the order', () => {
  it('explains the timeout instead of showing it, and the next press repeats the same key and body', async () => {
    seedDraft(2);
    await arriveAtStep2();
    createOrderAs(lostAnswer('timeout of 30000ms exceeded'), booked);

    fireEvent.click(proceedButton());
    await waitFor(() => expect(screen.getByText('checkout.errors.connectionLost')).toBeDefined());
    expect(screen.queryByText(/timeout of 30000ms/)).toBeNull();

    await aMomentLater();
    fireEvent.click(proceedButton());
    await waitFor(() =>
      expect(apiMock.createPaymentSession).toHaveBeenCalledWith('ord-1', expect.any(String), expect.any(String)),
    );
    expect(sentKeys).toHaveLength(2);
    expect(sentKeys[0]).not.toBe('');
    expect(sentKeys[1]).toBe(sentKeys[0]);
    // The legal snapshot keeps the stamps of the first press: ARM compares the whole
    // body with the one it may have booked, and refuses the key for any other (422).
    const [first, second] = apiMock.createOrder.mock.calls.map((call) => call[0]);
    expect(second.legal.acceptedAt).toBe(first.legal.acceptedAt);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    // Booked: the attempt is over — a next order gets its own key and stamps.
    expect(sessionStorage.getItem('checkout_order_attempt')).toBeNull();
    expect(sessionStorage.getItem('checkout_order_attempt_moments')).toBeNull();
  });

  it('treats a dropped connection the same way', async () => {
    seedDraft(2);
    await arriveAtStep2();
    createOrderAs(lostAnswer('Network Error'));
    fireEvent.click(proceedButton());
    await waitFor(() => expect(screen.getByText('checkout.errors.connectionLost')).toBeDefined());
    expect(screen.queryByText('Network Error')).toBeNull();
  });

  it('treats a 2xx without the order as a lost answer, not as an order', async () => {
    seedDraft(2);
    await arriveAtStep2();
    createOrderAs(() => ({}));
    fireEvent.click(proceedButton());
    await waitFor(() => expect(screen.getByText('checkout.errors.connectionLost')).toBeDefined());
    expect(screen.queryByText(/Cannot read properties/)).toBeNull();
    expect(apiMock.createPaymentSession).not.toHaveBeenCalled();
  });

  it('says the first press is still being placed when ARM answers order_in_progress, and keeps the key', async () => {
    seedDraft(2);
    await arriveAtStep2();
    createOrderAs(armRefused(409, { error: 'busy', code: 'order_in_progress' }), booked);
    fireEvent.click(proceedButton());
    await waitFor(() => expect(screen.getByText('checkout.errors.order_in_progress')).toBeDefined());

    await aMomentLater();
    fireEvent.click(proceedButton());
    await waitFor(() => expect(apiMock.createPaymentSession).toHaveBeenCalled());
    expect(sentKeys[1]).toBe(sentKeys[0]);
  });

  it('still shows what ARM itself said about a refused order — and the next press is a new attempt', async () => {
    seedDraft(2);
    await arriveAtStep2();
    createOrderAs(armRefused(400, { error: 'Only 1 left in stock' }), booked);
    fireEvent.click(proceedButton());
    await waitFor(() => expect(screen.getByText('Only 1 left in stock')).toBeDefined());
    // Nothing was booked: no key and no stamps are kept for this order.
    expect(sessionStorage.getItem('checkout_order_attempt')).toBeNull();
    expect(sessionStorage.getItem('checkout_order_attempt_moments')).toBeNull();

    fireEvent.click(proceedButton());
    await waitFor(() => expect(apiMock.createPaymentSession).toHaveBeenCalled());
    expect(sentKeys[1]).not.toBe(sentKeys[0]);
  });

  it('drops a key ARM says belongs to another order', async () => {
    seedDraft(2);
    await arriveAtStep2();
    createOrderAs(armRefused(422, { error: 'mismatch', code: 'idempotency_key_mismatch' }), booked);
    fireEvent.click(proceedButton());
    await waitFor(() => expect(screen.getByText('checkout.errors.idempotency_key_mismatch')).toBeDefined());

    fireEvent.click(proceedButton());
    await waitFor(() => expect(apiMock.createPaymentSession).toHaveBeenCalled());
    expect(sentKeys[1]).not.toBe(sentKeys[0]);
  });
});

describe('UX-02 — fields and buttons a screen reader and the browser can name', () => {
  it('names each field by its caption and gives it an autofill token', async () => {
    seedDraft(1);
    render(<CheckoutPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'checkout.continue' })).toBeDefined());

    const email = screen.getByLabelText(/checkout\.form\.email/) as HTMLInputElement;
    expect(email.getAttribute('type')).toBe('email');
    expect(email.getAttribute('autocomplete')).toBe('email');
    expect(email.getAttribute('inputmode')).toBe('email');
    expect(email.getAttribute('name')).toBe('email');
    expect(email.required).toBe(true);
    // The `*` is not read out — the field itself says it is required.
    expect(document.querySelector('label[for="checkout-email"] [aria-hidden="true"]')?.textContent).toBe('*');
    // Ad + Soyad: two fields, two tokens.
    expect(screen.getByLabelText(/checkout\.form\.firstName/).getAttribute('autocomplete')).toBe('given-name');
    expect(screen.getByLabelText(/checkout\.form\.lastName/).getAttribute('autocomplete')).toBe('family-name');
    const phone = screen.getByLabelText(/checkout\.form\.phone/);
    expect(phone.getAttribute('autocomplete')).toBe('tel');
    expect(phone.getAttribute('inputmode')).toBe('tel');
    expect(screen.getByLabelText(/checkout\.form\.street/).getAttribute('autocomplete')).toBe('address-line1');
    expect(screen.getByLabelText(/checkout\.form\.apartment/).getAttribute('autocomplete')).toBe('address-line2');
    // The building number and the block have no token of their own — a name and a caption.
    expect(screen.getByLabelText(/checkout\.form\.building/).getAttribute('name')).toBe('building');
    expect(screen.getByLabelText(/checkout\.form\.block/).getAttribute('name')).toBe('block');
    // The postal code, first in a TR address.
    const zip = screen.getByLabelText(/checkout\.form\.postalCode/) as HTMLInputElement;
    expect(zip.id).toBe('checkout-zip');
    expect(zip.getAttribute('autocomplete')).toBe('postal-code');
    expect(zip.required).toBe(true);
    // Mahalle — the Autocomplete's input: address-level3 instead of its own `off`.
    const mahalle = screen.getByLabelText(/checkout\.form\.neighbourhood/) as HTMLInputElement;
    expect(mahalle.getAttribute('autocomplete')).toBe('address-level3');
    expect(mahalle.getAttribute('name')).toBe('neighbourhood');
    expect(mahalle.required).toBe(true);
  });

  it('names the selects by their captions; il and ilçe carry their tokens', async () => {
    seedDraft(1);
    render(<CheckoutPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'checkout.continue' })).toBeDefined());

    expect(
      screen.getByRole('combobox', { name: 'checkout.form.country' }).getAttribute('aria-labelledby'),
    ).toBe('checkout-country-label');
    expect(
      screen.getByRole('combobox', { name: 'checkout.form.province' }).getAttribute('aria-labelledby'),
    ).toBe('checkout-province-label');
    expect(
      screen.getByRole('combobox', { name: 'checkout.form.district' }).getAttribute('aria-labelledby'),
    ).toBe('checkout-city-label');
    // On MUI's hidden native input of each select — the one the browser's autofill fills.
    expect((document.querySelector('input[autocomplete="address-level1"]') as HTMLInputElement).value).toBe('İstanbul');
    expect((document.querySelector('input[autocomplete="address-level2"]') as HTMLInputElement).value).toBe('Kadıköy');
  });

  it('gives the remove button of a summary line its name', async () => {
    seedDraft(2);
    await arriveAtStep2();
    expect(screen.getByRole('button', { name: 'basket.removeItem:{"name":"CANARY"}' })).toBeDefined();
  });

  it('names −, +, the bin of each basket line and the promo removal', async () => {
    apiMock.validatePromo.mockResolvedValue({
      data: { valid: true, code: 'YAZ10', discount_type: 'percent', discount_value: 10, discount_amount: 190 },
    });
    render(<BasketPage />);

    // The desktop table and the phone list both carry them.
    await waitFor(() =>
      expect(screen.getAllByLabelText('basket.removeItem:{"name":"CANARY"}')).toHaveLength(2),
    );
    expect(screen.getAllByLabelText('basket.decreaseQty:{"name":"CANARY"}')).toHaveLength(2);
    expect(screen.getAllByLabelText('basket.increaseQty:{"name":"CANARY"}')).toHaveLength(2);

    fireEvent.change(screen.getByPlaceholderText('basket.promoPlaceholder'), { target: { value: 'YAZ10' } });
    fireEvent.click(document.querySelector('[data-testid="ArrowForwardIcon"]')!.closest('button')!);
    expect(await screen.findByLabelText('basket.removePromo')).toBeDefined();
  });
});
