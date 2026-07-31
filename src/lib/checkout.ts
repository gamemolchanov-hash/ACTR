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

/**
 * What ARM's refusal to open a payment session means for an order we have just
 * created. The BFF answers with `{ error, status }`:
 *  - 400 "Order is already paid" (storefront-api.ts) — the money is in; the
 *    buyer simply never landed on the confirmation page (reload/back before the
 *    return, or a storefront `success_url` that points elsewhere). Offering a
 *    retry would ask them to pay twice, and `GET /orders/:id` carries no
 *    `payment_status`, so the page cannot discover this on its own;
 *  - 404 for a guest — the ownership gate: the checkout phone belongs to a
 *    registered account, so only that account's JWT can pay (FBG-480);
 *  - 404 for a signed-in buyer — their token SHOULD have opened that gate, so
 *    this is a stale session or an order that isn't theirs. Retrying can't fix
 *    it either, but "sign in, it's someone's account" would be a lie;
 *  - any OTHER 4xx — the request or the storefront config is wrong, not the
 *    moment: `provider: none` answers 400 "No payment provider configured" on
 *    every attempt, so "press again" would loop forever;
 *  - 5xx / no response — transient; a retry is the right offer.
 */
export type PaymentSessionFailure =
  | 'already_paid'
  | 'owner_sign_in'
  | 'unreachable'
  | 'unavailable'
  | 'retry';

export function paymentSessionFailure(opts: {
  status: number | undefined;
  serverError: unknown;
  authState: CheckoutAuthState;
}): PaymentSessionFailure {
  const message = typeof opts.serverError === 'string' ? opts.serverError : '';
  if (opts.status === 400 && /already paid/i.test(message)) return 'already_paid';
  if (opts.status === 404) return opts.authState === 'member' ? 'unreachable' : 'owner_sign_in';
  if (opts.status !== undefined && opts.status >= 400 && opts.status < 500) return 'unavailable';
  return 'retry';
}

/** i18n key explaining a payment failure to the buyer. */
export function paymentFailureKey(failure: PaymentSessionFailure): string {
  switch (failure) {
    case 'owner_sign_in':
      return 'checkout.errors.ownerSignInRequired';
    case 'unreachable':
      return 'checkout.errors.orderUnreachable';
    case 'unavailable':
      return 'checkout.errors.paymentUnavailable';
    default:
      return 'checkout.errors.paymentSessionFailed';
  }
}

/** Failures a retry can never resolve — the button must stop offering one. */
export function paymentRetryHopeless(failure: PaymentSessionFailure | null): boolean {
  return failure === 'owner_sign_in' || failure === 'unreachable' || failure === 'unavailable';
}

/** Why the order can't be placed yet, in the order the user should fix it. */
export type CheckoutBlockReason =
  | 'submitting'
  | 'payment_blocked'
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
   * The last payment attempt failed in a way a retry cannot resolve (see
   * PaymentSessionFailure), so the button must stop firing the same doomed
   * request. The explanation is already on screen with its own way out.
   */
  paymentBlocked: boolean;
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
  if (opts.paymentBlocked) return 'payment_blocked';
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
 * transient, `shipping_rate` already has its own hint under the button, and
 * `payment_blocked` keeps the message the failed attempt put on screen — so
 * those stay silent.
 */
export function blockReasonKey(reason: CheckoutBlockReason | null): string | null {
  switch (reason) {
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
 * An order ARM has already booked but whose payment hasn't started yet. It lives
 * beside the `checkout_form` draft (same store, same lifetime) because React
 * state does not survive the reload a shopper reaches for when a payment fails —
 * and without it the next submit would place a SECOND order for the same basket,
 * with a live first one left behind.
 *
 * The amount travels with the id on purpose: from this point on the basket is no
 * longer what is being paid for. ARM booked a fixed total, and the shopper can
 * still change the cart from /basket or another tab — so any figure recomputed
 * from the live basket would contradict what the payment actually charges.
 */
const PENDING_ORDER_KEY = 'checkout_pending_order';

export interface PendingOrder {
  orderId: string;
  /** Human-readable number — what the buyer quotes to support if payment dies. */
  number: string;
  /**
   * What the payment will actually take: the booked order total minus whatever
   * ARM already debited from the Creator Club wallet. Storing the net (rather
   * than the order value) is deliberate — this figure sits directly above the
   * Stripe form, so it must be the same number the form charges.
   */
  amountDue: number;
  currency: string;
}

function isPendingOrder(value: unknown): value is PendingOrder {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.orderId === 'string' &&
    v.orderId.length > 0 &&
    typeof v.number === 'string' &&
    typeof v.amountDue === 'number' &&
    typeof v.currency === 'string'
  );
}

export function savePendingOrder(order: PendingOrder): void {
  try {
    sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(order));
  } catch {}
}

export function readPendingOrder(): PendingOrder | null {
  try {
    const raw = sessionStorage.getItem(PENDING_ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isPendingOrder(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Called at the terminal point of the checkout — see clearCheckoutDraft. */
export function clearPendingOrder(): void {
  try {
    sessionStorage.removeItem(PENDING_ORDER_KEY);
  } catch {}
}

/** sessionStorage keys of the checkout draft — one definition, two pages. */
export const CHECKOUT_FORM_KEY = 'checkout_form';
export const CHECKOUT_STEP_KEY = 'checkout_step';
export const CHECKOUT_PROMO_KEY = 'checkout_promo';

/**
 * Drop everything this checkout left behind. Called ONLY from the confirmation
 * page: creating a payment session is not paying for the order, and until the
 * buyer actually lands on success, returning to /checkout (provider cancel,
 * reload, back button) has to resume the booked order rather than look like a
 * fresh basket and place a second one.
 */
export function clearCheckoutDraft(): void {
  try {
    sessionStorage.removeItem(CHECKOUT_FORM_KEY);
    sessionStorage.removeItem(CHECKOUT_STEP_KEY);
    sessionStorage.removeItem(CHECKOUT_PROMO_KEY);
  } catch {}
  clearPendingOrder();
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
