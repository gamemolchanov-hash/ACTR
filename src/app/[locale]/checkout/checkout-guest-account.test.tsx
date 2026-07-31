/**
 * FBG-477 — guest checkout submit, mounted for real.
 *
 * The pure gate helpers (checkout-consent.test.tsx) stay green even if the page
 * forgets to call them, so this file drives the actual component: a guest must
 * not be able to place an order without an email and the üyelik consent, the
 * block must be gated in the HANDLER (not only by a disabled button), a member
 * must see neither of the two, and whatever ARM reports about the buyer's
 * account must reach the confirmation page.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

const auth = vi.hoisted(() => ({
  value: { customer: null as Record<string, unknown> | null, loading: false },
}));
const apiMock = vi.hoisted(() => ({
  validateCart: vi.fn(),
  validatePromo: vi.fn(),
  fetchShippingRates: vi.fn(),
  createOrder: vi.fn(),
  createPaymentSession: vi.fn(),
}));
const assign = vi.hoisted(() => vi.fn());

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'tr',
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('@/lib/auth-context', () => ({ useAuth: () => auth.value }));
vi.mock('@/lib/auth', () => ({
  getMyAddresses: vi.fn().mockResolvedValue({ data: [] }),
  deleteMyAddress: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/providers/CartProvider', () => ({
  useCart: () => ({ items: [{ productId: 'dp1', quantity: 1 }], removeItem: vi.fn() }),
}));
vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'TRY',
  useFormatLocale: () => 'tr-TR',
}));

vi.mock('@/lib/api', () => apiMock);
// The module flag defaults to ON: without this the page renders PrelaunchNotice
// and every negative assertion below would pass vacuously.
vi.mock('@/lib/prelaunch', () => ({ PRELAUNCH: false }));
vi.mock('@/components/WalletWidget', () => ({ default: () => null }));

import { readAccountNotice, saveAccountNotice } from '@/lib/checkout';
import CheckoutPage from './page';

const RATE = {
  id: 'economy',
  slug: 'economy',
  name: 'Economy',
  carrier: 'FedEx',
  estimated_days_min: 2,
  estimated_days_max: 4,
  price: 50,
};

/** A step-1 draft that only lacks whatever the individual test is about. */
const DRAFT = {
  email: '',
  name: 'Ada Yılmaz',
  phone: '+905000000000',
  country: 'TR',
  city: 'Istanbul',
  street: 'Istiklal Cad',
  building: '1',
  block: '',
  apartment: '',
  zip: '34000',
};

function seedStep2(form: Partial<typeof DRAFT> = {}) {
  sessionStorage.setItem('checkout_form', JSON.stringify({ ...DRAFT, ...form }));
  sessionStorage.setItem('checkout_step', '2');
}

const checkboxes = () =>
  Array.from(document.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];

const boxLabelled = (fragment: string) =>
  checkboxes().find((el) => (el.closest('label')?.textContent ?? '').includes(fragment));

const proceedButton = () =>
  screen.getByRole('button', { name: 'Proceed to Payment' }) as HTMLButtonElement;

/** Reach step 2 with the shipping rate loaded and the compliance boxes ticked. */
async function arriveAtStep2({ uyelik = false }: { uyelik?: boolean } = {}) {
  render(<CheckoutPage />);
  await waitFor(() => expect(boxLabelled('checkout.consent.kvkkPrefix')).toBeDefined());
  fireEvent.click(boxLabelled('checkout.consent.kvkkPrefix')!);
  fireEvent.click(boxLabelled('checkout.consent.mesafeliPrefix')!);
  if (uyelik) fireEvent.click(boxLabelled('checkout.consent.uyelikPrefix')!);
  await waitFor(() => expect(apiMock.fetchShippingRates).toHaveBeenCalled());
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  auth.value = { customer: null, loading: false };
  apiMock.validateCart.mockResolvedValue({
    data: {
      items: [
        {
          productId: 'dp1',
          sku: 'SKU1',
          name: 'Tee',
          quantity: 1,
          unitPrice: 100,
          lineTotal: 100,
          valid: true,
        },
      ],
      subtotal: 100,
      allValid: true,
    },
  });
  apiMock.fetchShippingRates.mockResolvedValue({ fedex_configured: true, rates: [RATE] });
  apiMock.createOrder.mockResolvedValue({
    data: { id: 'ord-1', number: 'N-1', total: 150, currency: 'TRY' },
  });
  apiMock.createPaymentSession.mockResolvedValue({ data: { type: 'manual' } });
  Object.defineProperty(window, 'location', {
    value: { origin: 'https://american-creator.tr', assign },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe('guest submit gate', () => {
  it('refuses to order without an email and sends the guest back to the field', async () => {
    seedStep2({ email: '' });
    await arriveAtStep2({ uyelik: true });

    // The email lives on step 1, so the button stays live — the handler is what
    // must refuse, and it has to say why.
    fireEvent.click(proceedButton());

    await waitFor(() =>
      expect(screen.getByText('checkout.consent.emailRequired')).toBeDefined(),
    );
    expect(apiMock.createOrder).not.toHaveBeenCalled();
    // Back on step 1, where the email field is.
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDefined();
  });

  it('refuses to order without the üyelik consent', async () => {
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: false });

    fireEvent.click(proceedButton());

    await waitFor(() => expect(proceedButton().disabled).toBe(true));
    expect(apiMock.createOrder).not.toHaveBeenCalled();
  });

  it('refuses to order while the auth state is still resolving', async () => {
    auth.value = { customer: null, loading: true };
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: false });

    fireEvent.click(proceedButton());

    expect(proceedButton().disabled).toBe(true);
    expect(apiMock.createOrder).not.toHaveBeenCalled();
  });

  it('places the order once a guest gave an email and both extra consents', async () => {
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: true });

    fireEvent.click(proceedButton());

    await waitFor(() => expect(apiMock.createOrder).toHaveBeenCalledTimes(1));
    const payload = apiMock.createOrder.mock.calls[0][0];
    expect(payload.customer.email).toBe('ada@example.com');
    // The welcome mail is addressed with this raw tag.
    expect(payload.locale).toBe('tr');
  });
});

describe('guest-only UI', () => {
  it('shows the üyelik consent linking to the membership agreement', async () => {
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2();
    const box = boxLabelled('checkout.consent.uyelikPrefix');
    expect(box).toBeDefined();
    expect(
      box!.closest('label')!.querySelector('a[href="/legal/uyelik-sozlesmesi"]'),
    ).not.toBeNull();
  });

  it('hides it from a member, who can also order without an email', async () => {
    auth.value = { customer: { id: 'c1', name: 'Ada', email: '', phone: null }, loading: false };
    seedStep2({ email: '' });
    await arriveAtStep2();

    expect(boxLabelled('checkout.consent.uyelikPrefix')).toBeUndefined();

    fireEvent.click(proceedButton());
    await waitFor(() => expect(apiMock.createOrder).toHaveBeenCalledTimes(1));
    expect(apiMock.createOrder.mock.calls[0][0].customer.email).toBeUndefined();
  });
});

describe('account notice hand-off to the confirmation page', () => {
  const submitAsGuest = async () => {
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: true });
    fireEvent.click(proceedButton());
    await waitFor(() => expect(assign).toHaveBeenCalled());
  };

  it('stores a created-account notice with the address ARM used', async () => {
    apiMock.createOrder.mockResolvedValue({
      data: {
        id: 'ord-1',
        number: 'N-1',
        total: 150,
        currency: 'TRY',
        account: { status: 'created', welcome_email_sent: true },
      },
    });
    await submitAsGuest();

    expect(readAccountNotice()).toEqual({
      orderId: 'ord-1',
      status: 'created',
      welcomeEmailSent: true,
      email: 'ada@example.com',
    });
    expect(assign).toHaveBeenCalledWith(
      'https://american-creator.tr/checkout/success?order=ord-1',
    );
  });

  it('stores an email_taken notice', async () => {
    apiMock.createOrder.mockResolvedValue({
      data: {
        id: 'ord-1',
        number: 'N-1',
        total: 150,
        currency: 'TRY',
        account: { status: 'email_taken', welcome_email_sent: false },
      },
    });
    await submitAsGuest();

    expect(readAccountNotice()).toEqual({
      orderId: 'ord-1',
      status: 'email_taken',
      welcomeEmailSent: false,
      email: 'ada@example.com',
    });
  });

  it('clears a stale notice when this order has nothing to announce', async () => {
    saveAccountNotice({
      orderId: 'ord-old',
      status: 'created',
      welcomeEmailSent: true,
      email: 'old@example.com',
    });
    apiMock.createOrder.mockResolvedValue({
      data: {
        id: 'ord-1',
        number: 'N-1',
        total: 150,
        currency: 'TRY',
        account: { status: 'linked', welcome_email_sent: false },
      },
    });
    await submitAsGuest();

    expect(readAccountNotice()).toBe(null);
  });

  it('clears a stale notice on a storefront that reports no account at all', async () => {
    saveAccountNotice({
      orderId: 'ord-old',
      status: 'created',
      welcomeEmailSent: true,
      email: 'old@example.com',
    });
    await submitAsGuest();

    expect(readAccountNotice()).toBe(null);
  });
});
