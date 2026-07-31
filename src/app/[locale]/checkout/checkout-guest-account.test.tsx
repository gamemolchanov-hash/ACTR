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
}));
const assign = vi.hoisted(() => vi.fn());
const query = vi.hoisted(() => ({ value: new URLSearchParams() }));
const cart = vi.hoisted(() => ({ items: [] as { productId: string; quantity: number }[] }));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
  useLocale: () => 'tr',
}));

vi.mock('next/navigation', () => ({ useSearchParams: () => query.value }));

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
  useCart: () => ({ items: cart.items, removeItem: vi.fn(), clearCart: vi.fn() }),
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
vi.mock('@/components/StripeEmbeddedCheckout', () => ({
  default: ({ clientSecret }: { clientSecret: string }) => (
    <div data-testid="stripe-embedded">{clientSecret}</div>
  ),
}));

import { readAccountNotice, readPendingOrder, saveAccountNotice } from '@/lib/checkout';
import CheckoutPage from './page';
import CheckoutSuccessPage from './success/page';

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
  query.value = new URLSearchParams();
  cart.items = [{ productId: 'dp1', quantity: 1 }];
  auth.value = { customer: null, token: null, loading: false };
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
  apiMock.fetchOrder.mockResolvedValue({
    data: { id: 'ord-1', number: 'N-1', total: 150, currency: 'TRY', status: { name: 'New' } },
  });
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

  it('explains a malformed email at the field instead of a dead Continue', async () => {
    // "ada@example" fills every other field, so without this the guest just sees
    // a Continue button that does nothing and no way to learn why.
    seedStep2({ email: 'ada@example' });
    sessionStorage.setItem('checkout_step', '1');
    render(<CheckoutPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDefined(),
    );
    expect(screen.getByText('checkout.errors.invalid_email')).toBeDefined();
    expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    // Fixing it clears the message and unlocks the step.
    const email = document.querySelector('input') as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'ada@example.com' } });
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    );
    expect(screen.queryByText('checkout.errors.invalid_email')).toBeNull();
  });

  it('requires an email from a member too, without the format scolding', async () => {
    // Email has always been mandatory for everyone; only the well-formedness
    // rule is guest-specific (ARM builds them an account from it).
    auth.value = {
      customer: { id: 'c1', name: 'Ada', email: '', phone: null },
      token: 'jwt-1',
      loading: false,
    };
    seedStep2({ email: '' });
    sessionStorage.setItem('checkout_step', '1');
    render(<CheckoutPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeDefined());
    expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    // An empty field is explained by its `*`, not by a format error.
    expect(screen.queryByText('checkout.errors.invalid_email')).toBeNull();

    fireEvent.change(document.querySelector('input') as HTMLInputElement, {
      target: { value: 'ada@example.com' },
    });
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    );
  });

  it('refuses to order without the üyelik consent', async () => {
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: false });

    fireEvent.click(proceedButton());

    await waitFor(() => expect(proceedButton().disabled).toBe(true));
    expect(apiMock.createOrder).not.toHaveBeenCalled();
  });

  it('does not treat a signed-in shopper with an unreachable profile as a guest', async () => {
    // `/auth/me` failed on the network: the token survives (only 401/403 drops
    // the session), so who this is stays undecided — not "guest".
    auth.value = { customer: null, token: 'jwt-1', loading: false };
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2();

    expect(boxLabelled('checkout.consent.uyelikPrefix')).toBeUndefined();
    expect(proceedButton().disabled).toBe(true);
    fireEvent.click(proceedButton());
    expect(apiMock.createOrder).not.toHaveBeenCalled();
  });

  it('refuses to order while the auth state is still resolving', async () => {
    auth.value = { customer: null, token: 'jwt-1', loading: true };
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

  it('hides it from a member, whose email is still required and still sent', async () => {
    auth.value = {
      customer: { id: 'c1', name: 'Ada', email: '', phone: null },
      token: 'jwt-1',
      loading: false,
    };
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2();

    expect(boxLabelled('checkout.consent.uyelikPrefix')).toBeUndefined();

    // Positive control: üyelik is not part of a member's gate, so this submits.
    fireEvent.click(proceedButton());
    await waitFor(() => expect(apiMock.createOrder).toHaveBeenCalledTimes(1));
    expect(apiMock.createOrder.mock.calls[0][0].customer.email).toBe('ada@example.com');
  });

  it('marks the email field required for a member as well', async () => {
    auth.value = {
      customer: { id: 'c1', name: 'Ada', email: '', phone: null },
      token: 'jwt-1',
      loading: false,
    };
    seedStep2({ email: 'ada@example.com' });
    sessionStorage.setItem('checkout_step', '1');
    render(<CheckoutPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeDefined());
    const emailLabel = Array.from(document.querySelectorAll('p')).find((el) =>
      el.textContent?.startsWith('Email'),
    );
    expect(emailLabel?.textContent).toContain('*');
  });
});

describe('order creation is not repeated after a failed payment session', () => {
  it('retries only the payment session — the order is placed exactly once', async () => {
    apiMock.createOrder.mockResolvedValue({
      data: {
        id: 'ord-1',
        number: 'N-1',
        total: 150,
        currency: 'TRY',
        account: { status: 'created', welcome_email_sent: true },
      },
    });
    apiMock.createPaymentSession.mockRejectedValueOnce(new Error('gateway down'));

    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: true });
    fireEvent.click(proceedButton());

    // The order is already booked — the copy must not invite a second one.
    await waitFor(() =>
      expect(screen.getByText('checkout.errors.paymentSessionFailed')).toBeDefined(),
    );
    expect(apiMock.createOrder).toHaveBeenCalledTimes(1);

    fireEvent.click(proceedButton());
    await waitFor(() => expect(assign).toHaveBeenCalled());

    expect(apiMock.createOrder).toHaveBeenCalledTimes(1);
    expect(apiMock.createPaymentSession).toHaveBeenCalledTimes(2);
    // Both attempts targeted the SAME order, so its notice survives intact.
    expect(apiMock.createPaymentSession.mock.calls[1][0]).toBe('ord-1');
    expect(readAccountNotice()).toEqual({
      orderId: 'ord-1',
      status: 'created',
      welcomeEmailSent: true,
      email: 'ada@example.com',
    });
  });

  it('still resumes the same order after the shopper reloads the page', async () => {
    apiMock.createOrder.mockResolvedValue({
      data: {
        id: 'ord-1',
        number: 'N-1',
        total: 150,
        currency: 'TRY',
        account: { status: 'created', welcome_email_sent: true },
      },
    });
    apiMock.createPaymentSession.mockRejectedValueOnce(new Error('gateway down'));

    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: true });
    fireEvent.click(proceedButton());
    await waitFor(() => expect(apiMock.createOrder).toHaveBeenCalledTimes(1));

    // F5: React state is gone, only sessionStorage survives — and the consent
    // boxes come back unticked, so the gate must not re-ask for them either.
    cleanup();
    render(<CheckoutPage />);
    await waitFor(() => expect(apiMock.fetchShippingRates).toHaveBeenCalled());
    await waitFor(() => expect(proceedButton().disabled).toBe(false));
    fireEvent.click(proceedButton());
    await waitFor(() => expect(assign).toHaveBeenCalled());

    expect(apiMock.createOrder).toHaveBeenCalledTimes(1);
    expect(apiMock.createPaymentSession).toHaveBeenCalledTimes(2);
    expect(apiMock.createPaymentSession.mock.calls[1][0]).toBe('ord-1');
  });
});

describe('a booked order cannot be stranded by editing the basket', () => {
  const placeOrderThenFailPayment = async () => {
    apiMock.createOrder.mockResolvedValue({
      data: { id: 'ord-1', number: 'N-1', total: 150, currency: 'TRY' },
    });
    apiMock.createPaymentSession.mockRejectedValueOnce(new Error('gateway down'));
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: true });
    fireEvent.click(proceedButton());
    await waitFor(() => expect(apiMock.createOrder).toHaveBeenCalledTimes(1));
  };

  /** The summary's "Edit" link (the breadcrumb to /basket is plain navigation). */
  const editBasketLink = () =>
    Array.from(document.querySelectorAll('a[href="/basket"]')).find(
      (a) => a.textContent === 'Edit',
    ) ?? null;

  it('hides the basket edit affordances once ARM has booked the order', async () => {
    render(<CheckoutPage />);
    await waitFor(() => expect(apiMock.validateCart).toHaveBeenCalled());
    // Before the order: the shopper may still change the basket.
    await waitFor(() =>
      expect(document.querySelector('[data-testid="DeleteOutlineIcon"]')).not.toBeNull(),
    );
    expect(editBasketLink()).not.toBeNull();
    cleanup();

    await placeOrderThenFailPayment();

    expect(document.querySelector('[data-testid="DeleteOutlineIcon"]')).toBeNull();
    expect(editBasketLink()).toBeNull();
  });

  it('still offers the payment when the basket was emptied elsewhere', async () => {
    await placeOrderThenFailPayment();

    // Cleared from /basket or another tab, then back to checkout.
    cleanup();
    cart.items = [];
    render(<CheckoutPage />);

    // Not the "your cart is empty" dead end — the order exists and is unpaid.
    await waitFor(() => expect(screen.getByText('checkout.pendingOrder.notice')).toBeDefined());
    expect(screen.queryByText(/Your cart is empty/)).toBeNull();

    apiMock.createPaymentSession.mockResolvedValue({ data: { type: 'manual' } });
    await waitFor(() => expect(proceedButton().disabled).toBe(false));
    fireEvent.click(proceedButton());
    await waitFor(() => expect(assign).toHaveBeenCalled());

    expect(apiMock.createOrder).toHaveBeenCalledTimes(1);
    expect(apiMock.createPaymentSession.mock.calls.at(-1)![0]).toBe('ord-1');
  });

  it('quotes the booked total, not the basket, and explains the freeze', async () => {
    // The shopper can still change the basket from /basket or another tab; the
    // payment charges what ARM booked, so that is the only figure shown.
    apiMock.createOrder.mockResolvedValue({
      data: { id: 'ord-1', number: 'N-1', total: 999, currency: 'TRY' },
    });
    apiMock.createPaymentSession.mockRejectedValueOnce(new Error('gateway down'));
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: true });
    fireEvent.click(proceedButton());
    await waitFor(() => expect(apiMock.createOrder).toHaveBeenCalledTimes(1));

    // Cart is NOT empty here — the basket-derived summary must be gone anyway.
    cleanup();
    render(<CheckoutPage />);
    await waitFor(() => expect(screen.getByText('checkout.pendingOrder.notice')).toBeDefined());
    expect(document.body.textContent).toContain('999');
    expect(screen.queryByText('Your Order')).toBeNull();
  });

  it('quotes what the card will be charged, not the gross order value', async () => {
    // ARM debits the Creator Club wallet at order creation and the session then
    // charges `total − walletApplied`. Naming the gross total right above the
    // Stripe form would promise a price the form does not ask for.
    apiMock.createOrder.mockResolvedValue({
      data: { id: 'ord-1', number: 'N-1', total: 150, walletApplied: 50, currency: 'TRY' },
    });
    apiMock.createPaymentSession.mockRejectedValueOnce(new Error('gateway down'));
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: true });
    fireEvent.click(proceedButton());

    await waitFor(() => expect(screen.getByText('checkout.pendingOrder.notice')).toBeDefined());
    expect(readPendingOrder()?.amountDue).toBe(100);
    expect(document.body.textContent).toContain('100');
    expect(document.body.textContent).not.toContain('150');
  });

  it('renders the embedded Stripe form instead of a dead retry button', async () => {
    apiMock.createPaymentSession.mockResolvedValue({
      data: { sessionId: 'cs_1', clientSecret: 'cs_secret_1', publishableKey: 'pk_test' },
    });
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: true });
    fireEvent.click(proceedButton());

    await waitFor(() => expect(screen.getByTestId('stripe-embedded')).toBeDefined());
    expect(screen.getByTestId('stripe-embedded').textContent).toBe('cs_secret_1');
    // Embedded checkout is not a redirect, and the retry button that would spawn
    // further payment sessions is gone.
    expect(assign).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Proceed to Payment' })).toBeNull();
    expect(apiMock.createPaymentSession).toHaveBeenCalledTimes(1);
  });

  it('drops the abandoned order\'s payment session when starting a new one', async () => {
    // Otherwise the next order's pending screen re-renders the OLD order's Stripe
    // form under the NEW order's total: the buyer pays order A and leaves B
    // unpaid.
    apiMock.createOrder.mockResolvedValue({
      data: { id: 'ord-A', number: 'N-A', total: 150, currency: 'TRY' },
    });
    apiMock.createPaymentSession.mockResolvedValue({
      data: { sessionId: 'cs_A', clientSecret: 'cs_secret_A', publishableKey: 'pk_test' },
    });
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: true });
    fireEvent.click(proceedButton());
    await waitFor(() => expect(screen.getByTestId('stripe-embedded')).toBeDefined());

    fireEvent.click(screen.getByText('checkout.pendingOrder.startNew'));
    await waitFor(() => expect(screen.queryByTestId('stripe-embedded')).toBeNull());

    // Order B is placed, but its payment session fails.
    apiMock.createOrder.mockResolvedValue({
      data: { id: 'ord-B', number: 'N-B', total: 999, currency: 'TRY' },
    });
    apiMock.createPaymentSession.mockRejectedValue(new Error('gateway down'));
    fireEvent.click(proceedButton());

    await waitFor(() => expect(readPendingOrder()?.orderId).toBe('ord-B'));
    // No Stripe form at all — and certainly not order A's.
    expect(screen.queryByTestId('stripe-embedded')).toBeNull();
    expect(document.body.textContent).not.toContain('cs_secret_A');
    expect(document.body.textContent).toContain('999');
  });

  it('drops a payment session that arrives after the order was abandoned', async () => {
    let resolveSession: (value: unknown) => void = () => {};
    apiMock.createPaymentSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve;
        }),
    );
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: true });
    fireEvent.click(proceedButton());
    await waitFor(() => expect(readPendingOrder()?.orderId).toBe('ord-1'));

    // Abandoned while the session request is still in flight.
    fireEvent.click(screen.getByText('checkout.pendingOrder.startNew'));
    await waitFor(() => expect(screen.queryByText('checkout.pendingOrder.notice')).toBeNull());

    // The session for the abandoned order finally lands. Applying it would
    // navigate this fresh checkout to the OLD order's confirmation page.
    resolveSession({ data: { type: 'manual' } });
    await waitFor(() => expect(proceedButton().disabled).toBe(false));
    expect(assign).not.toHaveBeenCalled();
    expect(screen.queryByTestId('stripe-embedded')).toBeNull();
    // …and the shopper is back on an ordinary checkout, free to order again.
    expect(readPendingOrder()).toBe(null);
  });

  it('keeps the draft and the pending marker until the buyer reaches success', async () => {
    apiMock.createOrder.mockResolvedValue({
      data: { id: 'ord-1', number: 'N-1', total: 150, currency: 'TRY' },
    });
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: true });
    fireEvent.click(proceedButton());
    await waitFor(() => expect(assign).toHaveBeenCalled());

    // A payment session is not a payment: cancelling at the provider brings the
    // shopper back here, and a wiped draft would look like a fresh checkout.
    expect(readPendingOrder()?.orderId).toBe('ord-1');
    expect(sessionStorage.getItem('checkout_form')).not.toBeNull();

    cleanup();
    render(<CheckoutPage />);
    await waitFor(() => expect(proceedButton().disabled).toBe(false));
    fireEvent.click(proceedButton());
    await waitFor(() => expect(apiMock.createPaymentSession).toHaveBeenCalledTimes(2));
    expect(apiMock.createOrder).toHaveBeenCalledTimes(1);
  });
});

describe('what ARM says about the failed payment decides what is offered', () => {
  const armError = (status: number, error: string) =>
    Object.assign(new Error(error), { response: { status, data: { error, status } } });

  /** A member has no üyelik box to tick — the gate doesn't ask them for one. */
  const placeOrderWith = async (failure: Error) => {
    apiMock.createPaymentSession.mockRejectedValue(failure);
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: !auth.value.customer });
    fireEvent.click(proceedButton());
    await waitFor(() => expect(apiMock.createOrder).toHaveBeenCalledTimes(1));
  };

  it('sends an already-paid order to its confirmation instead of asking to pay again', async () => {
    // The buyer paid in the embedded form and never reached the success page.
    await placeOrderWith(armError(400, 'Order is already paid'));

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        'https://american-creator.tr/tr/checkout/success?order=ord-1',
      ),
    );
    expect(screen.queryByText(/checkout\.errors\.paymentSessionFailed/)).toBeNull();
  });

  it('does not tell a signed-in buyer to sign in when their own order 404s', async () => {
    auth.value = {
      customer: { id: 'c1', name: 'Ada', email: '', phone: null },
      token: 'jwt-1',
      loading: false,
    };
    await placeOrderWith(armError(404, 'Order not found'));

    await waitFor(() =>
      expect(screen.getByText(/checkout\.errors\.orderUnreachable/)).toBeDefined(),
    );
    expect(screen.queryByText(/checkout\.errors\.ownerSignInRequired/)).toBeNull();
    // Retrying cannot fix a stale session either — the button stops firing.
    expect(proceedButton().disabled).toBe(true);
    fireEvent.click(proceedButton());
    expect(apiMock.createPaymentSession).toHaveBeenCalledTimes(1);
  });

  it('keeps offering a retry for a transient failure', async () => {
    await placeOrderWith(armError(500, 'Failed to create payment session'));

    await waitFor(() =>
      expect(screen.getByText(/checkout\.errors\.paymentSessionFailed/)).toBeDefined(),
    );
    expect(proceedButton().disabled).toBe(false);
  });

  it('does not advise signing in when the storefront simply has no acquirer', async () => {
    await placeOrderWith(armError(400, 'No payment provider configured'));

    await waitFor(() =>
      expect(screen.getByText(/checkout\.errors\.paymentUnavailable/)).toBeDefined(),
    );
    // A login cannot conjure a payment provider — only the way out is honest.
    expect(document.querySelector('a[href="/login"]')).toBeNull();
    expect(screen.getByText('checkout.pendingOrder.startNew')).toBeDefined();
  });

  it('still advises signing in when ARM refused on identity grounds', async () => {
    await placeOrderWith(armError(404, 'Order not found'));

    await waitFor(() =>
      expect(screen.getByText(/checkout\.errors\.ownerSignInRequired/)).toBeDefined(),
    );
    expect(document.querySelector('a[href="/login"]')).not.toBeNull();
  });

  it('stops retrying a storefront with no payment provider configured', async () => {
    // `provider: none` answers this 400 on every attempt — "press again" would
    // loop forever.
    await placeOrderWith(armError(400, 'No payment provider configured'));

    await waitFor(() =>
      expect(screen.getByText(/checkout\.errors\.paymentUnavailable/)).toBeDefined(),
    );
    expect(screen.queryByText(/checkout\.errors\.paymentSessionFailed/)).toBeNull();
    expect(proceedButton().disabled).toBe(true);
    fireEvent.click(proceedButton());
    expect(apiMock.createPaymentSession).toHaveBeenCalledTimes(1);
  });

  it('offers a way out of the pending screen at any time', async () => {
    // The basket is frozen, the empty-cart screen is suppressed and step 1 is
    // out of reach while this screen is up — a shopper who cancelled at the
    // provider (its cancelUrl lands here) needs a way out even when the payment
    // itself never failed.
    apiMock.createOrder.mockResolvedValue({
      data: {
        id: 'ord-1',
        number: 'N-1',
        total: 150,
        currency: 'TRY',
        account: { status: 'created', welcome_email_sent: true },
      },
    });
    apiMock.createPaymentSession.mockRejectedValue(new Error('gateway down'));
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: true });
    fireEvent.click(proceedButton());
    // A plain retryable failure — the button still works, and the way out is
    // offered next to it.
    await waitFor(() =>
      expect(screen.getByText(/checkout\.errors\.paymentSessionFailed/)).toBeDefined(),
    );
    expect(proceedButton().disabled).toBe(false);
    await waitFor(() => expect(screen.getByText('checkout.pendingOrder.startNew')).toBeDefined());

    fireEvent.click(screen.getByText('checkout.pendingOrder.startNew'));

    // Back to an ordinary checkout: the claim on the old order is dropped, the
    // typed address survives, and a new order can be placed.
    await waitFor(() => expect(readPendingOrder()).toBe(null));
    expect(screen.queryByText('checkout.pendingOrder.notice')).toBeNull();
    expect(sessionStorage.getItem('checkout_form')).not.toBeNull();
    // The account notice described the abandoned order too.
    expect(readAccountNotice()).toBe(null);
  });

  it('shows the order number so a stuck buyer has something to quote', async () => {
    await placeOrderWith(armError(500, 'Failed to create payment session'));
    await waitFor(() => expect(screen.getByText('checkout.pendingOrder.notice')).toBeDefined());
    expect(document.body.textContent).toContain('N-1');
  });
});

describe('order linked to a registered account (phone match)', () => {
  /** ARM answers 404 to anyone without the owner's JWT — retrying is futile. */
  const ownership404 = Object.assign(new Error('Order not found'), {
    response: { status: 404, data: { error: 'Order not found' } },
  });

  beforeEach(() => {
    apiMock.createOrder.mockResolvedValue({
      data: {
        id: 'ord-1',
        number: 'N-1',
        total: 150,
        currency: 'TRY',
        account: { status: 'linked', welcome_email_sent: false },
      },
    });
    apiMock.createPaymentSession.mockRejectedValue(ownership404);
  });

  it('tells the guest to sign in and stops repeating the doomed request', async () => {
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: true });
    fireEvent.click(proceedButton());

    await waitFor(() =>
      expect(screen.getByText(/checkout\.errors\.ownerSignInRequired/)).toBeDefined(),
    );
    // No false "press again", and no second order.
    expect(screen.queryByText('checkout.errors.paymentSessionFailed')).toBeNull();
    expect(apiMock.createOrder).toHaveBeenCalledTimes(1);

    expect(proceedButton().disabled).toBe(true);
    fireEvent.click(proceedButton());
    expect(apiMock.createPaymentSession).toHaveBeenCalledTimes(1);

    // The way out is offered right there.
    expect(document.querySelector('a[href="/login"]')).not.toBeNull();
  });

  it('lets the same order be paid once the buyer has signed in', async () => {
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: true });
    fireEvent.click(proceedButton());
    await waitFor(() =>
      expect(screen.getByText(/checkout\.errors\.ownerSignInRequired/)).toBeDefined(),
    );

    // Signed in and back on this page: the retry now carries the owner's token.
    auth.value = {
      customer: { id: 'c1', name: 'Ada', email: '', phone: null },
      token: 'jwt-1',
      loading: false,
    };
    apiMock.createPaymentSession.mockResolvedValue({ data: { type: 'manual' } });
    cleanup();
    render(<CheckoutPage />);
    await waitFor(() => expect(proceedButton().disabled).toBe(false));
    fireEvent.click(proceedButton());
    await waitFor(() => expect(assign).toHaveBeenCalled());

    expect(apiMock.createOrder).toHaveBeenCalledTimes(1);
    expect(apiMock.createPaymentSession.mock.calls.at(-1)![0]).toBe('ord-1');
  });
});

describe('checkout → confirmation page, end to end', () => {
  /** Place a guest order and follow the redirect the page actually issued. */
  const placeOrderAndFollowRedirect = async () => {
    seedStep2({ email: 'ada@example.com' });
    await arriveAtStep2({ uyelik: true });
    fireEvent.click(proceedButton());
    await waitFor(() => expect(assign).toHaveBeenCalled());

    const target = new URL(assign.mock.calls[0][0] as string);
    // `localePrefix: 'always'`: without /tr the middleware would resolve the
    // confirmation page to the default locale and answer an EN buyer in Turkish.
    expect(target.pathname).toBe('/tr/checkout/success');
    query.value = target.searchParams;
    cleanup();
    render(<CheckoutSuccessPage />);
  };

  const notice = () => screen.queryByTestId('account-notice');

  it('shows the created-account block with the address ARM mailed', async () => {
    apiMock.createOrder.mockResolvedValue({
      data: {
        id: 'ord-1',
        number: 'N-1',
        total: 150,
        currency: 'TRY',
        account: { status: 'created', welcome_email_sent: true },
      },
    });
    await placeOrderAndFollowRedirect();

    await waitFor(() => expect(notice()).not.toBeNull());
    expect(notice()!.textContent).toContain('checkout.account.createdSent');
    expect(notice()!.textContent).toContain('ada@example.com');
    // Terminal point: the draft and the duplicate guard are cleared only here.
    await waitFor(() => expect(readPendingOrder()).toBe(null));
    expect(sessionStorage.getItem('checkout_form')).toBeNull();
    expect(sessionStorage.getItem('checkout_step')).toBeNull();
  });

  it('shows the email_taken block with a standalone sign-in link', async () => {
    apiMock.createOrder.mockResolvedValue({
      data: {
        id: 'ord-1',
        number: 'N-1',
        total: 150,
        currency: 'TRY',
        account: { status: 'email_taken', welcome_email_sent: false },
      },
    });
    await placeOrderAndFollowRedirect();

    await waitFor(() => expect(notice()).not.toBeNull());
    expect(notice()!.textContent).toContain('checkout.account.emailTaken');
    expect(notice()!.querySelector('a[href="/login"]')).not.toBeNull();
    expect(notice()!.textContent).not.toContain('checkout.account.createdSent');
  });

  it.each(['none', 'linked'] as const)(
    'shows no block for account.status = %s, clearing a previous order notice',
    async (status) => {
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
          account: { status, welcome_email_sent: false },
        },
      });
      await placeOrderAndFollowRedirect();

      await waitFor(() => expect(apiMock.fetchOrder).toHaveBeenCalled());
      expect(readAccountNotice()).toBe(null);
      expect(notice()).toBeNull();
    },
  );

  it('shows no block on a storefront that reports no account at all', async () => {
    saveAccountNotice({
      orderId: 'ord-old',
      status: 'created',
      welcomeEmailSent: true,
      email: 'old@example.com',
    });
    await placeOrderAndFollowRedirect();

    await waitFor(() => expect(apiMock.fetchOrder).toHaveBeenCalled());
    expect(readAccountNotice()).toBe(null);
    expect(notice()).toBeNull();
  });
});
