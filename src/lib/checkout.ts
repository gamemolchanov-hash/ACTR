/**
 * Pure checkout gate + shipping helpers shared between the checkout page and its
 * tests (FBG-393). Keeping the predicate in one module stops the test mirror from
 * drifting out of sync with the button's real disabled condition.
 */

import type { ArmGuestAccountStatus, ArmShippingUnavailableReason } from './arm-types';

/**
 * Runtime list of the shipping-unavailable reasons. ARM sends the first three in
 * the shipping response `error` field; the storefront synthesizes `not_configured`
 * (`fedex_configured:false`) and `network` (request threw). Each maps to an honest,
 * reason-specific message. `satisfies` keeps this list in lockstep with the ARM
 * union (single source of truth), so the two can't silently drift apart.
 */
export const SHIPPING_UNAVAILABLE_REASONS = [
  'invalid_postal_code',
  'unsupported_destination',
  'rate_request_failed',
  'not_configured',
  'network',
] as const satisfies readonly ArmShippingUnavailableReason[];

/** Alias of the ARM union — the type itself lives in arm-types (no duplicate). */
export type ShippingUnavailableReason = ArmShippingUnavailableReason;

const REASON_SET = new Set<string>(SHIPPING_UNAVAILABLE_REASONS);

/**
 * i18n key for a shipping-unavailable reason. A known reason maps to its own
 * message; anything unknown/absent falls back to a generic line so a raw reason
 * string never reaches the screen.
 */
export function shippingErrorKey(reason: unknown): string {
  return typeof reason === 'string' && REASON_SET.has(reason)
    ? `checkout.shipping.${reason}`
    : 'checkout.shipping.unavailable_generic';
}

export type ShippingPanelState = 'pending' | 'error' | 'rates';

/**
 * Which block the step-2 shipping panel renders. The pre-fetch window (no rates
 * yet AND no error — first paint of step 2 before the effect fires) and an
 * in-flight request both resolve to `'pending'` (spinner); only a *resolved*
 * failure shows the alert. This stops entering step 2 from flashing a false
 * "unavailable" alert before any request has run (FBG-393 review).
 */
export function shippingPanelState(opts: {
  loading: boolean;
  hasError: boolean;
  ratesCount: number;
}): ShippingPanelState {
  if (opts.loading || (!opts.hasError && opts.ratesCount === 0)) return 'pending';
  if (opts.hasError) return 'error';
  return 'rates';
}

/**
 * Who the checkout is serving right now (FBG-477). `pending` is the honest
 * third state: the server render and the first client render BOTH look like a
 * guest to `useAuth()` (SSR has no token; the client has just read one from
 * localStorage and is still validating it), so keying the guest-only UI off
 * `!customer` alone would render one markup on the server and another on the
 * client. `hydrated` is the storefront's existing client-ready signal — until it
 * flips, and while the profile request is in flight, the answer is `pending`:
 * the same markup on both sides, and a closed submit gate.
 */
export type CheckoutAuthState = 'pending' | 'guest' | 'member';

export function checkoutAuthState(opts: {
  hydrated: boolean;
  authLoading: boolean;
  hasCustomer: boolean;
}): CheckoutAuthState {
  if (!opts.hydrated || opts.authLoading) return 'pending';
  return opts.hasCustomer ? 'member' : 'guest';
}

/** The üyelik (account-creation) consent is a guest-only box. */
export function showUyelikConsent(state: CheckoutAuthState): boolean {
  return state === 'guest';
}

/**
 * Email is mandatory only for a guest: ARM turns a guest checkout into a
 * claimable account, and without an address there is nothing to claim. A member
 * already has an account, so their email stays optional (as before).
 */
export function guestEmailRequired(state: CheckoutAuthState): boolean {
  return state === 'guest';
}

/**
 * Same shape of "looks like an email" the BFF applies (`z.string().email()` over
 * the trimmed value). Not a stricter validator — anything that slips through
 * still comes back as a localized `invalid_email` from ARM.
 */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** Why the order can't be placed yet, in the order the user should fix it. */
export type CheckoutBlockReason =
  | 'submitting'
  | 'owner_sign_in'
  | 'auth_pending'
  | 'consent'
  | 'uyelik'
  | 'guest_email'
  | 'shipping_rate';

export interface CheckoutGateOpts {
  submitting: boolean;
  authState: CheckoutAuthState;
  agreedKvkk: boolean;
  agreedMesafeli: boolean;
  agreedUyelik: boolean;
  email: string;
  selectedRateId: string;
  /**
   * ARM has already answered 201 for this checkout. Everything below was
   * validated when the order was created and the inputs are frozen since, so
   * only the payment session is still outstanding — re-checking the consents
   * would strand the shopper after a reload (the boxes are deliberately not
   * persisted, but the order is).
   */
  orderPlaced: boolean;
  /**
   * ARM refuses to open a payment session for this order without its owner's
   * JWT (the checkout phone belongs to a registered account — `linked`), so
   * repeating the request is pointless until the shopper signs in.
   */
  ownerSignInRequired: boolean;
}

/**
 * The single source of truth for both the Proceed button and the submit handler
 * in checkout/page.tsx (D-04/COMP-02 "gate the handler, not only the button").
 * The order can be placed only when:
 *  - no request is already in flight (`submitting`),
 *  - the auth state has resolved — a `pending` state must not be read as "guest"
 *    (it would let a member through) nor as "member" (it would skip the üyelik
 *    consent for a guest),
 *  - both compliance consents are checked (KVKK + mesafeli),
 *  - a guest also accepted the üyelik agreement and gave a usable email, and
 *  - a concrete shipping rate is selected.
 * The last clause mirrors the ARM server guard that rejects a zero shipping cost
 * (`Shipping cost cannot be zero`). A free rate (`price:0`/`is_free`) still has a
 * non-empty id, so it counts as a valid selection — the gate keys off "a rate is
 * chosen", not "cost > 0".
 */
export function checkoutBlockReason(opts: CheckoutGateOpts): CheckoutBlockReason | null {
  if (opts.submitting) return 'submitting';
  if (opts.ownerSignInRequired) return 'owner_sign_in';
  if (opts.orderPlaced) return null;
  if (opts.authState === 'pending') return 'auth_pending';
  if (!opts.agreedKvkk || !opts.agreedMesafeli) return 'consent';
  if (showUyelikConsent(opts.authState) && !opts.agreedUyelik) return 'uyelik';
  if (guestEmailRequired(opts.authState) && !looksLikeEmail(opts.email)) return 'guest_email';
  if (!opts.selectedRateId) return 'shipping_rate';
  return null;
}

/**
 * Whether "Proceed to Payment" is disabled — the button face of the same gate.
 * Every block disables it EXCEPT `guest_email`: that field lives on step 1, so a
 * greyed-out button would strand the shopper with nothing to click and no way to
 * learn what is missing. The handler keeps refusing that case (and says so),
 * which is also what makes the handler gate observable rather than decorative.
 */
export function proceedButtonDisabled(opts: CheckoutGateOpts): boolean {
  const reason = checkoutBlockReason(opts);
  return reason !== null && reason !== 'guest_email';
}

/**
 * i18n key explaining a block to the shopper. `submitting`/`auth_pending` are
 * transient and `shipping_rate` already has its own hint under the button, so
 * those stay silent.
 */
export function blockReasonKey(reason: CheckoutBlockReason | null): string | null {
  switch (reason) {
    case 'owner_sign_in':
      return 'checkout.errors.ownerSignInRequired';
    case 'consent':
      return 'checkout.consent.required';
    case 'uyelik':
      return 'checkout.consent.uyelikRequired';
    case 'guest_email':
      return 'checkout.consent.emailRequired';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Placed-order marker (FBG-477 review)
// ---------------------------------------------------------------------------

/**
 * UUID of an order ARM has already booked but whose payment session hasn't been
 * created yet. It lives beside the `checkout_form` draft (same store, same
 * lifetime) because React state does not survive the reload a shopper reaches
 * for when a payment fails — and without it the next submit would place a
 * SECOND order for the same basket, with a live first one left behind.
 */
const PENDING_ORDER_KEY = 'checkout_pending_order';

export function savePendingOrderId(orderId: string): void {
  try {
    sessionStorage.setItem(PENDING_ORDER_KEY, orderId);
  } catch {}
}

export function readPendingOrderId(): string | null {
  try {
    return sessionStorage.getItem(PENDING_ORDER_KEY) || null;
  } catch {
    return null;
  }
}

/** Called once the order has moved on — a session exists, or payment started. */
export function clearPendingOrderId(): void {
  try {
    sessionStorage.removeItem(PENDING_ORDER_KEY);
  } catch {}
}

// ---------------------------------------------------------------------------
// Account notice hand-off, checkout → success (FBG-477)
// ---------------------------------------------------------------------------

/**
 * `POST /orders` is the ONLY place that reports what happened to the buyer's
 * account, and the shopper leaves the page through a full navigation (Stripe
 * redirect or `location.assign`), so React state can't carry it. `GET /orders/:id`
 * doesn't return `account` either — hence a sessionStorage hand-off, the same
 * class of data (and lifetime) as the `checkout_form` draft next to it.
 */
const ACCOUNT_NOTICE_KEY = 'checkout_account_notice';

export interface AccountNotice {
  /** Order the notice belongs to — guards against showing a previous one. */
  orderId: string;
  status: Extract<ArmGuestAccountStatus, 'created' | 'email_taken'>;
  welcomeEmailSent: boolean;
  /** Address ARM mailed / matched. Never travels through the URL. */
  email: string;
}

function isAccountNotice(value: unknown): value is AccountNotice {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.orderId === 'string' &&
    (v.status === 'created' || v.status === 'email_taken') &&
    typeof v.welcomeEmailSent === 'boolean' &&
    typeof v.email === 'string'
  );
}

export function saveAccountNotice(notice: AccountNotice): void {
  try {
    sessionStorage.setItem(ACCOUNT_NOTICE_KEY, JSON.stringify(notice));
  } catch {}
}

/**
 * Read without consuming. The success page may mount twice (React Strict Mode)
 * or be reloaded (F5) — a destructive read would blank the notice on the second
 * pass. Staleness is handled on the write side instead: every order clears or
 * overwrites the slot, and the reader still checks the order id.
 */
export function readAccountNotice(): AccountNotice | null {
  try {
    const raw = sessionStorage.getItem(ACCOUNT_NOTICE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isAccountNotice(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Idempotent — called after every order whose status has nothing to announce. */
export function clearAccountNotice(): void {
  try {
    sessionStorage.removeItem(ACCOUNT_NOTICE_KEY);
  } catch {}
}

/**
 * Which notice (if any) the success page should show. An empty `orderId` means
 * the payment provider sent the shopper to its own configured `success_url`
 * without our query (ARM prefers `paymentConfig.success_url` over the URL we
 * pass) — the stored notice is then the only thing identifying the order, so it
 * is trusted. A DIFFERENT id means the page is showing another order: no notice.
 */
export function resolveAccountNotice(
  stored: AccountNotice | null,
  orderIdFromQuery: string,
): AccountNotice | null {
  if (!stored) return null;
  if (!orderIdFromQuery) return stored;
  return stored.orderId === orderIdFromQuery ? stored : null;
}
