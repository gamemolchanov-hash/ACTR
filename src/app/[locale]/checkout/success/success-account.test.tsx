/**
 * FBG-477 — the confirmation page tells the buyer what happened to their account.
 *
 * Two honest outcomes only:
 *  - `created` → an account was made; the "set your password" mail is promised
 *    ONLY when ARM actually sent it (`welcome_email_sent`);
 *  - `email_taken` → the order stayed a guest order and is NOT linked to the
 *    existing account, so the copy must not promise it will show up there.
 * A storefront without guest auto-registration sends no `account` at all — then
 * neither block may appear.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

const query = vi.hoisted(() => ({ value: new URLSearchParams() }));
const apiMock = vi.hoisted(() => ({ fetchOrder: vi.fn() }));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => query.value,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('@/providers/CartProvider', () => ({ useCart: () => ({ clearCart: vi.fn() }) }));
vi.mock('@/providers/CurrencyProvider', () => ({ useFormatLocale: () => 'tr-TR' }));
vi.mock('@/lib/api', () => ({ fetchOrder: apiMock.fetchOrder }));

import { readPendingOrder, saveAccountNotice, savePendingOrder } from '@/lib/checkout';
import CheckoutSuccessPage from './page';

const NOTICE = {
  orderId: 'ord-1',
  status: 'created' as const,
  welcomeEmailSent: true,
  email: 'ada@example.com',
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  query.value = new URLSearchParams('order=ord-1');
  apiMock.fetchOrder.mockResolvedValue({
    data: {
      id: 'ord-1',
      number: 'N-1',
      total: 100,
      currency: 'TRY',
      status: { name: 'New' },
    },
  });
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

const notice = () => screen.queryByTestId('account-notice');

describe('account notice on the confirmation page', () => {
  it('announces the created account with the address the mail went to', async () => {
    saveAccountNotice(NOTICE);
    render(<CheckoutSuccessPage />);
    await waitFor(() => expect(notice()).not.toBeNull());
    expect(notice()!.textContent).toContain('checkout.account.createdSent');
    expect(notice()!.textContent).toContain('ada@example.com');
  });

  it('does not promise a mail ARM could not send', async () => {
    saveAccountNotice({ ...NOTICE, welcomeEmailSent: false });
    render(<CheckoutSuccessPage />);
    await waitFor(() => expect(notice()).not.toBeNull());
    expect(notice()!.textContent).toContain('checkout.account.createdPending');
    expect(notice()!.textContent).not.toContain('checkout.account.createdSent');
  });

  it('for email_taken links to sign-in without tying this order to that account', async () => {
    saveAccountNotice({ ...NOTICE, status: 'email_taken', welcomeEmailSent: false });
    render(<CheckoutSuccessPage />);
    await waitFor(() => expect(notice()).not.toBeNull());
    expect(notice()!.textContent).toContain('checkout.account.emailTaken');
    const cta = notice()!.querySelector('a[href="/login"]');
    expect(cta).not.toBeNull();
    // The order is on a NEW shell, so no "created" copy may leak into this case.
    expect(notice()!.textContent).not.toContain('checkout.account.createdSent');
  });

  it('renders no block at all when the storefront sent no account status', async () => {
    render(<CheckoutSuccessPage />);
    await waitFor(() => expect(apiMock.fetchOrder).toHaveBeenCalled());
    expect(notice()).toBeNull();
  });

  it('renders no block for a different order than the stored one', async () => {
    saveAccountNotice({ ...NOTICE, orderId: 'ord-other' });
    render(<CheckoutSuccessPage />);
    await waitFor(() => expect(apiMock.fetchOrder).toHaveBeenCalled());
    expect(notice()).toBeNull();
  });

  it('survives a reload — the notice is not consumed by showing it', async () => {
    saveAccountNotice(NOTICE);
    const first = render(<CheckoutSuccessPage />);
    await waitFor(() => expect(notice()).not.toBeNull());
    first.unmount();

    render(<CheckoutSuccessPage />);
    await waitFor(() => expect(notice()).not.toBeNull());
    expect(notice()!.textContent).toContain('checkout.account.createdSent');
  });

  it('falls back to the stored order id when the provider dropped ?order=', async () => {
    query.value = new URLSearchParams();
    saveAccountNotice(NOTICE);
    render(<CheckoutSuccessPage />);
    await waitFor(() => expect(notice()).not.toBeNull());
    expect(apiMock.fetchOrder).toHaveBeenCalledWith('ord-1');
  });

  it('falls back for orders with no account notice at all', async () => {
    // ARM prefers its configured success_url over ours, so the query can be
    // missing for EVERY order — members, `linked`/`none`, storefronts without
    // guest auto-registration. The checkout's own marker names the order, and it
    // has to be read before this page clears the draft.
    query.value = new URLSearchParams();
    savePendingOrder({ orderId: 'ord-1', number: 'N-1', amountDue: 100, currency: 'TRY' });
    render(<CheckoutSuccessPage />);

    await waitFor(() => expect(apiMock.fetchOrder).toHaveBeenCalledWith('ord-1'));
    expect(notice()).toBeNull();
    // Still the terminal point: the marker does not survive the visit.
    await waitFor(() => expect(readPendingOrder()).toBe(null));
  });
});
