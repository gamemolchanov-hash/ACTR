/**
 * Consent + shipping gate logic tests for checkout step 2.
 *
 * Strategy: unit-test the gate predicates directly (pure functions) rather than
 * mounting the full checkout component (Stripe/next-intl/auth heavy). The
 * Proceed-to-Payment predicate is imported from @/lib/checkout — the SAME
 * function the page uses — so this mirror can't drift out of sync (FBG-393).
 * The observable submit behaviour of the page itself is covered separately by
 * checkout-guest-account.test.tsx (FBG-477).
 */
import { describe, it, expect } from 'vitest';
import {
  blockReasonKey,
  checkoutAuthState,
  checkoutBlockReason,
  guestEmailRequired,
  looksLikeEmail,
  paymentFailureKey,
  paymentRetryHopeless,
  paymentSessionFailure,
  proceedButtonDisabled,
  showUyelikConsent,
} from '@/lib/checkout';

/** Everything a member needs: both consents, a rate, auth resolved. */
const READY = {
  submitting: false,
  authState: 'member' as const,
  agreedKvkk: true,
  agreedMesafeli: true,
  agreedUyelik: false,
  email: '',
  selectedRateId: 'economy',
  orderPlaced: false,
  paymentBlocked: false,
};

/** Same, for a guest: üyelik accepted and an email typed in. */
const GUEST_READY = {
  ...READY,
  authState: 'guest' as const,
  agreedUyelik: true,
  email: 'ada@example.com',
};

describe('checkoutAuthState', () => {
  it('is pending before hydration — the SSR render must not claim "guest"', () => {
    // Server render / first client paint: no token read yet, loading false.
    expect(
      checkoutAuthState({ hydrated: false, authLoading: false, hasCustomer: false }),
    ).toBe('pending');
  });

  it('is pending while the profile request is in flight', () => {
    expect(checkoutAuthState({ hydrated: true, authLoading: true, hasCustomer: false })).toBe(
      'pending',
    );
    expect(checkoutAuthState({ hydrated: true, authLoading: true, hasCustomer: true })).toBe(
      'pending',
    );
  });

  it('is guest once hydrated with no customer', () => {
    expect(checkoutAuthState({ hydrated: true, authLoading: false, hasCustomer: false })).toBe(
      'guest',
    );
  });

  it('is member once hydrated with a customer', () => {
    expect(checkoutAuthState({ hydrated: true, authLoading: false, hasCustomer: true })).toBe(
      'member',
    );
  });
});

describe('guest-only UI predicates', () => {
  it('shows the üyelik consent to a guest only', () => {
    expect(showUyelikConsent('guest')).toBe(true);
    expect(showUyelikConsent('member')).toBe(false);
    expect(showUyelikConsent('pending')).toBe(false);
  });

  it('marks email required for a guest only', () => {
    expect(guestEmailRequired('guest')).toBe(true);
    expect(guestEmailRequired('member')).toBe(false);
    expect(guestEmailRequired('pending')).toBe(false);
  });
});

describe('looksLikeEmail', () => {
  it('accepts a normal address, trimming like the BFF does', () => {
    expect(looksLikeEmail(' ada@example.com ')).toBe(true);
  });

  it('rejects empty / malformed input', () => {
    expect(looksLikeEmail('')).toBe(false);
    expect(looksLikeEmail('   ')).toBe(false);
    expect(looksLikeEmail('abc')).toBe(false);
    expect(looksLikeEmail('ada@example')).toBe(false);
    expect(looksLikeEmail('ada @example.com')).toBe(false);
  });
});

describe('checkoutBlockReason', () => {
  it('blocks while a submit is already in flight', () => {
    expect(checkoutBlockReason({ ...READY, submitting: true })).toBe('submitting');
  });

  it('blocks while auth has not resolved, even with everything else filled', () => {
    expect(checkoutBlockReason({ ...GUEST_READY, authState: 'pending' })).toBe('auth_pending');
  });

  it('reports the compliance consents before the guest-only ones', () => {
    expect(checkoutBlockReason({ ...GUEST_READY, agreedKvkk: false })).toBe('consent');
    expect(checkoutBlockReason({ ...GUEST_READY, agreedMesafeli: false })).toBe('consent');
    // KVKK missing AND üyelik missing → the compliance consent wins.
    expect(
      checkoutBlockReason({ ...GUEST_READY, agreedKvkk: false, agreedUyelik: false }),
    ).toBe('consent');
  });

  it('blocks a guest who did not accept the üyelik agreement', () => {
    expect(checkoutBlockReason({ ...GUEST_READY, agreedUyelik: false })).toBe('uyelik');
  });

  it('blocks a guest without a usable email', () => {
    expect(checkoutBlockReason({ ...GUEST_READY, email: '' })).toBe('guest_email');
    expect(checkoutBlockReason({ ...GUEST_READY, email: 'abc' })).toBe('guest_email');
  });

  it('accepts a guest email with surrounding whitespace', () => {
    expect(checkoutBlockReason({ ...GUEST_READY, email: ' a@b.co ' })).toBe(null);
  });

  it('blocks when no shipping rate is selected (server zero-cost guard mirror)', () => {
    expect(checkoutBlockReason({ ...READY, selectedRateId: '' })).toBe('shipping_rate');
  });

  it('lets a member through without the üyelik box and without an email', () => {
    expect(checkoutBlockReason(READY)).toBe(null);
  });

  it('lets a fully-consenting guest through', () => {
    expect(checkoutBlockReason(GUEST_READY)).toBe(null);
  });

  it('stops re-checking preconditions once the order is booked', () => {
    // After a reload the consent boxes come back unticked (they are deliberately
    // not persisted) while the order is — re-asking would strand the shopper
    // with an unpaid order and a permanently disabled button.
    const placed = {
      ...GUEST_READY,
      orderPlaced: true,
      agreedKvkk: false,
      agreedMesafeli: false,
      agreedUyelik: false,
      email: '',
      authState: 'pending' as const,
    };
    expect(checkoutBlockReason(placed)).toBe(null);
    expect(proceedButtonDisabled(placed)).toBe(false);
    // …but a submit already in flight still wins over it.
    expect(checkoutBlockReason({ ...placed, submitting: true })).toBe('submitting');
  });

  it('stops offering a retry ARM can never satisfy', () => {
    const blocked = { ...GUEST_READY, orderPlaced: true, paymentBlocked: true };
    expect(checkoutBlockReason(blocked)).toBe('payment_blocked');
    expect(proceedButtonDisabled(blocked)).toBe(true);
    // The failed attempt already put its own explanation on screen — the gate
    // must not overwrite it with a generic one.
    expect(blockReasonKey('payment_blocked')).toBe(null);
  });
});

describe('proceedButtonDisabled', () => {
  it('is disabled when both consents unchecked', () => {
    expect(
      proceedButtonDisabled({ ...READY, agreedKvkk: false, agreedMesafeli: false }),
    ).toBe(true);
  });

  it('is disabled when only KVKK checked', () => {
    expect(proceedButtonDisabled({ ...READY, agreedMesafeli: false })).toBe(true);
  });

  it('is disabled when only mesafeli checked', () => {
    expect(proceedButtonDisabled({ ...READY, agreedKvkk: false })).toBe(true);
  });

  it('is disabled when no shipping rate is selected', () => {
    expect(proceedButtonDisabled({ ...READY, selectedRateId: '' })).toBe(true);
  });

  it('is disabled for a guest missing the üyelik consent (the box is on this step)', () => {
    expect(proceedButtonDisabled({ ...GUEST_READY, agreedUyelik: false })).toBe(true);
  });

  it('stays live for a guest missing the email — that field is on step 1', () => {
    // A dead button here would leave the shopper with nothing to click; the
    // handler refuses and sends them back to the field instead.
    expect(proceedButtonDisabled({ ...GUEST_READY, email: '' })).toBe(false);
    expect(checkoutBlockReason({ ...GUEST_READY, email: '' })).toBe('guest_email');
  });

  it('is enabled (not disabled) when consents given, a rate selected, not submitting', () => {
    expect(proceedButtonDisabled(READY)).toBe(false);
    expect(proceedButtonDisabled(GUEST_READY)).toBe(false);
  });

  it('treats a selected free rate (price 0 / is_free) as a valid selection', () => {
    // A free rate still has a non-empty id; the gate keys off the id, not price.
    expect(proceedButtonDisabled({ ...READY, selectedRateId: 'economy-free' })).toBe(false);
  });

  it('is disabled when submitting even with consents + rate', () => {
    expect(proceedButtonDisabled({ ...READY, submitting: true })).toBe(true);
  });
});

describe('blockReasonKey', () => {
  it('maps the fixable blocks to their message', () => {
    expect(blockReasonKey('consent')).toBe('checkout.consent.required');
    expect(blockReasonKey('uyelik')).toBe('checkout.consent.uyelikRequired');
    expect(blockReasonKey('guest_email')).toBe('checkout.consent.emailRequired');
  });

  it('stays silent for transient blocks and for the rate hint', () => {
    expect(blockReasonKey('submitting')).toBe(null);
    expect(blockReasonKey('auth_pending')).toBe(null);
    expect(blockReasonKey('shipping_rate')).toBe(null);
    expect(blockReasonKey(null)).toBe(null);
  });
});

describe('paymentSessionFailure', () => {
  const guest = { authState: 'guest' as const };
  const member = { authState: 'member' as const };

  it('recognises an order ARM says is already paid', () => {
    // The buyer paid but never landed on the confirmation page. Asking them to
    // "press again" would be asking them to pay twice — and GET /orders/:id
    // carries no payment_status, so this answer is the only signal there is.
    expect(
      paymentSessionFailure({ status: 400, serverError: 'Order is already paid', ...guest }),
    ).toBe('already_paid');
    expect(
      paymentSessionFailure({ status: 400, serverError: 'Order is already paid', ...member }),
    ).toBe('already_paid');
  });

  it('does not read every 400 as already-paid', () => {
    expect(
      paymentSessionFailure({ status: 400, serverError: 'Shipping cost cannot be zero', ...guest }),
    ).toBe('unavailable');
  });

  it('reads a guest 404 as the ownership gate', () => {
    expect(paymentSessionFailure({ status: 404, serverError: 'Order not found', ...guest })).toBe(
      'owner_sign_in',
    );
    expect(
      paymentSessionFailure({ status: 404, serverError: 'Order not found', authState: 'pending' }),
    ).toBe('owner_sign_in');
  });

  it('does not tell a signed-in buyer their own order belongs to someone else', () => {
    // Their token should have opened the ownership gate; a 404 here means a
    // stale session or a foreign order, not "sign in to the account that owns it".
    expect(paymentSessionFailure({ status: 404, serverError: 'Order not found', ...member })).toBe(
      'unreachable',
    );
  });

  it('treats any other 4xx as unavailable — a retry would loop forever', () => {
    // `provider: none` answers this on every single attempt.
    expect(
      paymentSessionFailure({
        status: 400,
        serverError: 'No payment provider configured',
        ...guest,
      }),
    ).toBe('unavailable');
    expect(paymentSessionFailure({ status: 403, serverError: 'Forbidden', ...member })).toBe(
      'unavailable',
    );
  });

  it('keeps a retry only for the transient failures', () => {
    expect(paymentSessionFailure({ status: 500, serverError: 'boom', ...guest })).toBe('retry');
    expect(paymentSessionFailure({ status: 502, serverError: 'bad gateway', ...guest })).toBe(
      'retry',
    );
    // No response at all (network) — worth another press.
    expect(paymentSessionFailure({ status: undefined, serverError: undefined, ...guest })).toBe(
      'retry',
    );
  });

  it('maps each failure to its own message, and only hopeless ones block', () => {
    expect(paymentFailureKey('owner_sign_in')).toBe('checkout.errors.ownerSignInRequired');
    expect(paymentFailureKey('unreachable')).toBe('checkout.errors.orderUnreachable');
    expect(paymentFailureKey('unavailable')).toBe('checkout.errors.paymentUnavailable');
    expect(paymentFailureKey('retry')).toBe('checkout.errors.paymentSessionFailed');

    expect(paymentRetryHopeless('owner_sign_in')).toBe(true);
    expect(paymentRetryHopeless('unreachable')).toBe(true);
    expect(paymentRetryHopeless('unavailable')).toBe(true);
    expect(paymentRetryHopeless('retry')).toBe(false);
    expect(paymentRetryHopeless(null)).toBe(false);
  });
});
